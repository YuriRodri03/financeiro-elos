const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// --- AJUSTE DE LIMITE PARA FOTOS ---
// Aumentamos para 50mb para que o Base64 das fotos passe sem erros
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MONGO_URI = process.env.MONGODB_URI; 

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Banco MongoDB da Ótica Elos Conectado!");
    atualizarVendasAntigas(); 
  })
  .catch(err => console.error("❌ Erro na conexão:", err));

// --- MODELOS (SCHEMAS) ATUALIZADOS ---

const Cliente = mongoose.model('Cliente', {
  nome: String, 
  cpf: String, 
  telefone: String, 
  email: String, 
  endereco: String, 
  observacoes: String,
  foto: String // ADICIONADO: Foto do perfil/cadastro
});

const Venda = mongoose.model('Venda', {
  numeroPedido: Number, 
  cliente: String, 
  cpf: String, 
  produto: String, 
  itensCarrinho: Array, 
  valorTotal: Number,
  valorEntrada: Number, 
  desconto: Number, 
  parcelas: Number, 
  listaParcelas: Array, 
  dataVenda: String, 
  metodoPagamento: String,
  dataPrevisaoPagamento: String,
  observacoes: String, // ADICIONADO: Detalhes técnicos da venda
  foto: String        // ADICIONADO: Foto da receita/venda
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, 
  valor: Number, 
  categoria: String, 
  vencimento: String, 
  paga: Boolean
});

// --- SCRIPT DE ATUALIZAÇÃO PARA VENDAS ANTIGAS ---
const atualizarVendasAntigas = async () => {
  try {
    const vendasSemNumero = await Venda.find({ numeroPedido: { $exists: false } }).sort({ dataVenda: 1 });
    if (vendasSemNumero.length > 0) {
      console.log(`🔢 Numerando ${vendasSemNumero.length} vendas antigas...`);
      for (let i = 0; i < vendasSemNumero.length; i++) {
        vendasSemNumero[i].numeroPedido = 2000 + i;
        await vendasSemNumero[i].save();
      }
      console.log("✅ Vendas antigas atualizadas com sucesso!");
    }
  } catch (err) {
    console.error("Erro ao atualizar vendas antigas:", err);
  }
};

// --- ROTAS API: CLIENTES ---
app.get('/api/clientes', async (req, res) => res.json(await Cliente.find()));
app.post('/api/clientes', async (req, res) => res.json(await new Cliente(req.body).save()));

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const clienteAtualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clienteAtualizado) return res.status(404).json({ error: "Cliente não encontrado" });
    await Venda.updateMany({ cpf: clienteAtualizado.cpf }, { $set: { cliente: clienteAtualizado.nome } });
    res.json(clienteAtualizado);
  } catch (err) { res.status(500).json({ error: "Erro ao editar cliente" }); }
});

app.delete('/api/clientes/:cpf', async (req, res) => {
  await Cliente.deleteOne({ cpf: req.params.cpf });
  res.json({ message: "Removido" });
});

// --- ROTAS API: VENDAS ---
app.get('/api/vendas', async (req, res) => res.json(await Venda.find()));

app.post('/api/vendas', async (req, res) => {
  try {
    const ultimaVenda = await Venda.findOne().sort({ numeroPedido: -1 });
    const proximoNumero = ultimaVenda && ultimaVenda.numeroPedido ? ultimaVenda.numeroPedido + 1 : 2000;
    const novaVenda = new Venda({ ...req.body, numeroPedido: proximoNumero });
    res.json(await novaVenda.save());
  } catch (err) { res.status(500).json({ error: "Erro ao salvar venda" }); }
});

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

// --- BAIXA E ESTORNO DE PARCELA ---
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
            novasParcelas.splice(i, 1); i--; 
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
        novasParcelas.push({ ...novasParcelas[index], numero: numAtual + 0.5, valor: valorSobra, paga: false, dataPagamento: null, observacao: `Restante da parc. ${numAtual}` });
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
  } catch (err) { res.status(500).json({ error: "Erro ao processar parcela" }); }
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