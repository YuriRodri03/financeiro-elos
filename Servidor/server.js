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

// Modelos (Schemas)
const Cliente = mongoose.model('Cliente', {
  nome: String, cpf: String, telefone: String, endereco: String, observacoes: String
});

const Venda = mongoose.model('Venda', {
  cliente: String, cpf: String, produto: String, valorTotal: Number,
  listaParcelas: Array, dataVenda: String, metodoPagamento: String
});

// --- ROTAS API ---

// Clientes
app.get('/api/clientes', async (req, res) => res.json(await Cliente.find()));
app.post('/api/clientes', async (req, res) => res.json(await new Cliente(req.body).save()));

// Rota de Edição (PUT) que usamos no seu componente de Clientes
app.put('/api/clientes/:cpf', async (req, res) => {
  const atualizado = await Cliente.findOneAndUpdate({ cpf: req.params.cpf }, req.body, { new: true });
  res.json(atualizado);
});

app.delete('/api/clientes/:cpf', async (req, res) => {
  await Cliente.deleteOne({ cpf: req.params.cpf });
  res.json({ message: "Removido" });
});

// Vendas
app.get('/api/vendas', async (req, res) => res.json(await Venda.find()));
app.post('/api/vendas', async (req, res) => res.json(await new Venda(req.body).save()));
app.delete('/api/vendas/:id', async (req, res) => {
  try {
    await Venda.findByIdAndDelete(req.params.id);
    res.json({ message: "Venda excluída" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir venda" });
  }
});

// Baixa de Parcela
app.patch('/api/vendas/:id/parcela/:numero', async (req, res) => {
  try {
    const { id, numero } = req.params;
    const { paga, dataPagamento } = req.body;
    
    const venda = await Venda.findById(id);
    if (!venda) return res.status(404).json({ error: "Venda não encontrada" });

    venda.listaParcelas = venda.listaParcelas.map(p => 
      p.numero === parseInt(numero) ? { ...p, paga, dataPagamento } : p
    );
    
    await venda.save();
    res.json(venda);
  } catch (err) {
    res.status(500).json({ error: "Erro ao dar baixa" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor da Ótica rodando na porta ${PORT}`));