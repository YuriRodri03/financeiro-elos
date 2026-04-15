const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Banco MongoDB da Ótica Elos Conectado!"))
  .catch(err => console.error("❌ Erro na conexão:", err));

// --- MODELOS (SCHEMAS) ATUALIZADOS ---

const Cliente = mongoose.model('Cliente', {
  nome: String, 
  cpf: String, 
  telefone: String, 
  email: String, // ADICIONADO para o novo PDF
  endereco: String, 
  observacoes: String
});

const Venda = mongoose.model('Venda', {
  cliente: String, 
  cpf: String, 
  produto: String, // String resumida (Item A + Item B)
  itensCarrinho: Array, // ADICIONADO: Para salvar preços individuais dos itens
  valorTotal: Number,
  valorEntrada: Number, // ADICIONADO
  desconto: Number, // ADICIONADO
  parcelas: Number, // ADICIONADO
  listaParcelas: Array, 
  dataVenda: String, 
  metodoPagamento: String,
  dataPrevisaoPagamento: String // ADICIONADO: Para a função "Dar Prazo"
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, 
  valor: Number, 
  categoria: String, // Aceita qualquer texto agora
  vencimento: String, 
  paga: Boolean
});

// --- ROTAS API: CLIENTES ---

app.get('/api/clientes', async (req, res) => res.json(await Cliente.find()));

app.post('/api/clientes', async (req, res) => res.json(await new Cliente(req.body).save()));

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const clienteAtualizado = await Cliente.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!clienteAtualizado) return res.status(404).json({ error: "Cliente não encontrado" });

    // Atualização em cascata (CPF é a chave de ligação)
    await Venda.updateMany(
      { cpf: clienteAtualizado.cpf }, 
      { $set: { cliente: clienteAtualizado.nome } }
    );
    res.json(clienteAtualizado);
  } catch (err) { 
    res.status(500).json({ error: "Erro ao editar cliente" }); 
  }
});

app.delete('/api/clientes/:cpf', async (req, res) => {
  await Cliente.deleteOne({ cpf: req.params.cpf });
  res.json({ message: "Removido" });
});

// --- ROTAS API: VENDAS ---

app.get('/api/vendas', async (req, res) => res.json(await Venda.find()));

// Rota POST atualizada para calcular as parcelas automaticamente se necessário
app.post('/api/vendas', async (req, res) => {
  try {
    const novaVenda = new Venda(req.body);
    // Se o front não enviar a lista pronta, o banco salva o que vier
    res.json(await novaVenda.save());
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar venda" });
  }
});

// PATCH para atualização geral (usado para salvar a Previsão de Pagamento)
app.patch('/api/vendas/:id', async (req, res) => {
  try {
    const venda = await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(venda);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar venda" });
  }
});

app.delete('/api/vendas/:id', async (req, res) => {
  try {
    await Venda.findByIdAndDelete(req.params.id);
    res.json({ message: "Venda excluída" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir venda" });
  }
});

// --- BAIXA E ESTORNO DE PARCELA (MANTIDA LÓGICA DE AMORTIZAÇÃO) ---
app.patch('/api/vendas/:id/parcela/:numero', async (req, res) => {
  try {
    const { id, numero } = req.params;
    const { paga, dataPagamento, valorPago } = req.body;
    
    const venda = await Venda.findById(id);
    if (!venda) return res.status(404).json({ error: "Venda não encontrada" });

    const numAtual = parseFloat(numero);
    let novasParcelas = JSON.parse(JSON.stringify(venda.listaParcelas));
    
    const index = novasParcelas.findIndex(p => p.numero === numAtual);
    if (index === -1) return res.status(404).json({ error: "Parcela não encontrada" });

    if (paga === false) {
      const proximoNumero = numAtual + 0.5;
      const parcelaFilhaIndex = novasParcelas.findIndex(p => p.numero === proximoNumero);
      if (parcelaFilhaIndex !== -1 && !Number.isInteger(proximoNumero)) {
        const somaRecomposta = Number(novasParcelas[index].valor) + Number(novasParcelas[parcelaFilhaIndex].valor);
        novasParcelas[index].valor = parseFloat(somaRecomposta.toFixed(2));
        novasParcelas.splice(parcelaFilhaIndex, 1);
      }
      novasParcelas[index].paga = false;
      novasParcelas[index].dataPagamento = null;
    } else {
      let valorInformado = Number(valorPago || novasParcelas[index].valor);
      let valorOriginalDaParcela = Number(novasParcelas[index].valor);

      if (valorInformado > valorOriginalDaParcela) {
        let excesso = parseFloat((valorInformado - valorOriginalDaParcela).toFixed(2));
        for (let i = index + 1; i < novasParcelas.length; i++) {
          if (excesso <= 0) break;
          if (novasParcelas[i].paga) continue;
          let valorDaProxima = Number(novasParcelas[i].valor);
          if (excesso >= valorDaProxima) {
            novasParcelas[index].valor = parseFloat((Number(novasParcelas[index].valor) + valorDaProxima).toFixed(2));
            excesso = parseFloat((excesso - valorDaProxima).toFixed(2));
            novasParcelas.splice(i, 1); 
            i--; 
          } else {
            novasParcelas[i].valor = parseFloat((valorDaProxima - excesso).toFixed(2));
            novasParcelas[index].valor = parseFloat((Number(novasParcelas[index].valor) + excesso).toFixed(2));
            excesso = 0;
          }
        }
        novasParcelas[index].paga = true;
        novasParcelas[index].dataPagamento = dataPagamento;
      } else if (valorInformado < valorOriginalDaParcela) {
        const valorSobra = parseFloat((valorOriginalDaParcela - valorInformado).toFixed(2));
        novasParcelas[index].valor = valorInformado;
        novasParcelas[index].paga = true;
        novasParcelas[index].dataPagamento = dataPagamento;
        novasParcelas.push({
          ...novasParcelas[index],
          numero: numAtual + 0.5,
          valor: valorSobra,
          paga: false,
          dataPagamento: null,
          observacao: `Restante da parc. ${numAtual}`
        });
      } else {
        novasParcelas[index].paga = true;
        novasParcelas[index].dataPagamento = dataPagamento;
      }
    }

    novasParcelas.sort((a, b) => a.numero - b.numero);
    venda.listaParcelas = novasParcelas;
    venda.markModified('listaParcelas');
    await venda.save();
    res.json(venda);
  } catch (err) {
    res.status(500).json({ error: "Erro ao processar parcela" });
  }
});

// --- ROTAS API: DESPESAS ---

app.get('/api/despesas', async (req, res) => res.json(await Despesa.find()));
app.post('/api/despesas', async (req, res) => res.json(await new Despesa(req.body).save()));
app.patch('/api/despesas/:id', async (req, res) => {
  try {
    const despesa = await Despesa.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(despesa);
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar" }); }
});
app.delete('/api/despesas/:id', async (req, res) => {
  try {
    await Despesa.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluída" });
  } catch (err) { res.status(500).json({ error: "Erro ao excluir" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor da Ótica rodando na porta ${PORT}`));