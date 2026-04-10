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
  nome: String, 
  cpf: String, 
  telefone: String, 
  endereco: String, 
  observacoes: String
});

const Venda = mongoose.model('Venda', {
  cliente: String, 
  cpf: String, 
  produto: String, 
  valorTotal: Number,
  listaParcelas: Array, 
  dataVenda: String, 
  metodoPagamento: String
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, 
  valor: Number, 
  categoria: String, 
  vencimento: String, 
  paga: Boolean
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

// --- BAIXA E ESTORNO DE PARCELA (COM LOGICA DE RECOMPOSIÇÃO) ---
app.patch('/api/vendas/:id/parcela/:numero', async (req, res) => {
  try {
    const { id, numero } = req.params;
    const { paga, dataPagamento, valorPago } = req.body;
    
    const venda = await Venda.findById(id);
    if (!venda) return res.status(404).json({ error: "Venda não encontrada" });

    const numAtual = parseFloat(numero);
    const index = venda.listaParcelas.findIndex(p => p.numero === numAtual);
    if (index === -1) return res.status(404).json({ error: "Parcela não encontrada" });

    // --- CASO 1: ESTORNO (paga === false) ---
    // Se estornar, vamos ver se existe uma parcela "sobra" (ex: 1.5) e somar de volta
    if (paga === false) {
      const parcelaFilhaIndex = venda.listaParcelas.findIndex(p => p.numero === (numAtual + 0.5));
      
      if (parcelaFilhaIndex !== -1) {
        // Recupera o valor da sobra e soma na parcela original
        venda.listaParcelas[index].valor += venda.listaParcelas[parcelaFilhaIndex].valor;
        // Remove a parcela sobra do array
        venda.listaParcelas.splice(parcelaFilhaIndex, 1);
      }
      
      venda.listaParcelas[index].paga = false;
      venda.listaParcelas[index].dataPagamento = null;
    } 
    
    // --- CASO 2: PAGAMENTO PARCIAL (paga === true e valor menor) ---
    else if (valorPago && Number(valorPago) < Number(venda.listaParcelas[index].valor)) {
      const valorOriginalDestaParcela = Number(venda.listaParcelas[index].valor);
      const valorRecebido = Number(valorPago);
      const diferenca = valorOriginalDestaParcela - valorRecebido;

      // Atualiza a parcela atual para o que foi pago
      venda.listaParcelas[index].valor = valorRecebido;
      venda.listaParcelas[index].paga = true;
      venda.listaParcelas[index].dataPagamento = dataPagamento;

      // Cria a nova parcela com o resto
      venda.listaParcelas.push({
        ...venda.listaParcelas[index],
        numero: numAtual + 0.5,
        valor: diferenca,
        paga: false,
        dataPagamento: null,
        observacao: `Restante da parcela ${numAtual}`
      });

      // Reordena para ficar 1 -> 1.5 -> 2
      venda.listaParcelas.sort((a, b) => a.numero - b.numero);
    } 
    
    // --- CASO 3: BAIXA NORMAL (valor total ou maior) ---
    else {
      venda.listaParcelas[index].paga = paga;
      venda.listaParcelas[index].dataPagamento = paga ? dataPagamento : null;
    }
    
    venda.markModified('listaParcelas');
    await venda.save();
    res.json(venda);
  } catch (err) {
    console.error("Erro na parcela:", err);
    res.status(500).json({ error: "Erro ao processar alteração na parcela" });
  }
});

// DESPESAS
app.get('/api/despesas', async (req, res) => res.json(await Despesa.find()));
app.post('/api/despesas', async (req, res) => res.json(await new Despesa(req.body).save()));

app.patch('/api/despesas/:id', async (req, res) => {
  try {
    const despesa = await Despesa.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(despesa);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
});

app.delete('/api/despesas/:id', async (req, res) => {
  try {
    await Despesa.findByIdAndDelete(req.params.id);
    res.json({ message: "Despesa excluída" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir despesa" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor da Ótica rodando na porta ${PORT}`));