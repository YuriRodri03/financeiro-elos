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
  const atualizado = await Cliente.findOneAndUpdate({ cpf: req.params.cpf }, req.body, { new: true });
  res.json(atualizado);
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

// --- BAIXA DE PARCELA COM LÓGICA DE PAGAMENTO PARCIAL ---
app.patch('/api/vendas/:id/parcela/:numero', async (req, res) => {
  try {
    const { id, numero } = req.params;
    const { paga, dataPagamento, valorPago } = req.body;
    
    const venda = await Venda.findById(id);
    if (!venda) return res.status(404).json({ error: "Venda não encontrada" });

    // Encontra o índice da parcela que está sendo paga
    const index = venda.listaParcelas.findIndex(p => p.numero === parseFloat(numero));
    if (index === -1) return res.status(404).json({ error: "Parcela não encontrada" });

    const parcelaOriginal = venda.listaParcelas[index];

    // Se houver um valorPago e ele for menor que o valor da parcela...
    if (valorPago && valorPago < parcelaOriginal.valor && paga === true) {
      const sobra = parcelaOriginal.valor - valorPago;

      // 1. Atualiza a parcela atual para o valor que entrou de fato
      venda.listaParcelas[index].valor = valorPago;
      venda.listaParcelas[index].paga = true;
      venda.listaParcelas[index].dataPagamento = dataPagamento;

      // 2. Cria a parcela residual (sobra)
      // O número da parcela ganha um sufixo .5 para indicar que é um resto
      const novaParcela = {
        ...parcelaOriginal,
        numero: parseFloat(numero) + 0.5,
        valor: sobra,
        paga: false,
        dataPagamento: null
      };

      venda.listaParcelas.push(novaParcela);
      
      // Ordena as parcelas para que a sobra fique logo abaixo da original
      venda.listaParcelas.sort((a, b) => a.numero - b.numero);
    } else {
      // Baixa normal (valor total ou estorno)
      venda.listaParcelas[index].paga = paga;
      venda.listaParcelas[index].dataPagamento = dataPagamento;
    }
    
    // Marca o array como modificado para o Mongoose salvar corretamente
    venda.markModified('listaParcelas');
    await venda.save();
    res.json(venda);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar pagamento" });
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