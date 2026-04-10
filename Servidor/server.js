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

// --- MODELOS (SCHEMAS) ---

const Cliente = mongoose.model('Cliente', {
  nome: String, cpf: String, telefone: String, endereco: String, observacoes: String
});

const Venda = mongoose.model('Venda', {
  cliente: String, cpf: String, produto: String, valorTotal: Number,
  listaParcelas: Array, dataVenda: String, metodoPagamento: String
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, valor: Number, categoria: String, vencimento: String, paga: Boolean
});

// --- ROTAS API ---

// CLIENTES
app.get('/api/clientes', async (req, res) => res.json(await Cliente.find()));
app.post('/api/clientes', async (req, res) => res.json(await new Cliente(req.body).save()));

app.put('/api/clientes/:cpf', async (req, res) => {
  try {
    const atualizado = await Cliente.findOneAndUpdate({ cpf: req.params.cpf }, req.body, { new: true });
    res.json(atualizado);
  } catch (err) { res.status(500).json({ error: "Erro ao editar cliente" }); }
});

app.delete('/api/clientes/:cpf', async (req, res) => {
  await Cliente.deleteOne({ cpf: req.params.cpf });
  res.json({ message: "Removido" });
});

// VENDAS
app.get('/api/vendas', async (req, res) => res.json(await Venda.find()));
app.post('/api/vendas', async (req, res) => res.json(await new Venda(req.body).save()));

app.patch('/api/vendas/:id', async (req, res) => {
  try {
    const venda = await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(venda);
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar venda" }); }
});

app.delete('/api/vendas/:id', async (req, res) => {
  try {
    await Venda.findByIdAndDelete(req.params.id);
    res.json({ message: "Venda excluída" });
  } catch (err) { res.status(500).json({ error: "Erro ao excluir venda" }); }
});

// --- BAIXA DE PARCELA COM LÓGICA DE CASCATA ---
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

    // --- CASO 1: ESTORNO (paga === false) ---
    if (paga === false) {
      const parcelaFilhaIndex = novasParcelas.findIndex(p => p.numero === (numAtual + 0.5));
      if (parcelaFilhaIndex !== -1) {
        const somaRecomposta = Number(novasParcelas[index].valor) + Number(novasParcelas[parcelaFilhaIndex].valor);
        novasParcelas[index].valor = parseFloat(somaRecomposta.toFixed(2));
        novasParcelas.splice(parcelaFilhaIndex, 1);
      }
      novasParcelas[index].paga = false;
      novasParcelas[index].dataPagamento = null;
    } 
    
    // --- CASO 2: PAGAMENTO (COM LÓGICA DE CASCATA) ---
    else {
      let saldoRestante = Number(valorPago || novasParcelas[index].valor);

      for (let i = index; i < novasParcelas.length; i++) {
        if (saldoRestante <= 0) break;

        let parcela = novasParcelas[i];
        
        // Pula parcelas que já estão pagas (exceto a que iniciou a ação se for parcial)
        if (parcela.paga && i !== index) continue;

        const valorDevidoNaParcela = Number(parcela.valor);

        if (saldoRestante >= valorDevidoNaParcela) {
          // Saldo quita a parcela inteira
          parcela.paga = true;
          parcela.dataPagamento = dataPagamento;
          saldoRestante = parseFloat((saldoRestante - valorDevidoNaParcela).toFixed(2));
        } else {
          // Saldo paga apenas parte da parcela: cria a divisão (sobra)
          const valorPagoNesta = saldoRestante;
          const valorSobra = parseFloat((valorDevidoNaParcela - valorPagoNesta).toFixed(2));

          parcela.valor = valorPagoNesta;
          parcela.paga = true;
          parcela.dataPagamento = dataPagamento;

          // Cria a residual (.5)
          const novaParcelaSobra = {
            ...parcela,
            numero: parcela.numero + 0.5,
            valor: valorSobra,
            paga: false,
            dataPagamento: null,
            observacao: `Restante da parc. ${parcela.numero}`
          };

          novasParcelas.push(novaParcelaSobra);
          saldoRestante = 0; 
        }
      }
    }

    // Reordena e salva
    novasParcelas.sort((a, b) => a.numero - b.numero);
    venda.listaParcelas = novasParcelas;
    venda.markModified('listaParcelas');
    await venda.save();
    
    res.json(venda);
  } catch (err) {
    console.error("Erro na parcela:", err);
    res.status(500).json({ error: "Erro ao processar pagamento em cascata" });
  }
});

// DESPESAS
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