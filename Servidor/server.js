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
  listaParcelas: Array, // Array de objetos { numero, valor, paga, dataPagamento, vencimentoOriginal, observacao }
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

// --- BAIXA DE PARCELA COM LÓGICA DE PAGAMENTO PARCIAL ---
app.patch('/api/vendas/:id/parcela/:numero', async (req, res) => {
  try {
    const { id, numero } = req.params;
    const { paga, dataPagamento, valorPago } = req.body;
    
    const venda = await Venda.findById(id);
    if (!venda) return res.status(404).json({ error: "Venda não encontrada" });

    // Encontra o índice da parcela usando parseFloat para suportar números decimais (ex: 1.5)
    const index = venda.listaParcelas.findIndex(p => p.numero === parseFloat(numero));
    if (index === -1) return res.status(404).json({ error: "Parcela não encontrada" });

    const parcelaOriginal = venda.listaParcelas[index];

    // Lógica de Pagamento Parcial
    // Verifica se o valor pago é menor que o valor atual da parcela e se estamos tentando pagar (paga === true)
    if (valorPago && Number(valorPago) < Number(parcelaOriginal.valor) && paga === true) {
      const sobra = Number(parcelaOriginal.valor) - Number(valorPago);

      // 1. Atualiza a parcela atual com o valor que entrou
      venda.listaParcelas[index].valor = Number(valorPago);
      venda.listaParcelas[index].paga = true;
      venda.listaParcelas[index].dataPagamento = dataPagamento;

      // 2. Cria a parcela residual com a diferença
      const novaParcela = {
        ...parcelaOriginal,
        numero: parseFloat(numero) + 0.5, // Gera um número intermediário
        valor: sobra,
        paga: false,
        dataPagamento: null,
        observacao: `Restante da parcela ${numero}`
      };

      venda.listaParcelas.push(novaParcela);
      
      // Reordena para manter a sequência visual
      venda.listaParcelas.sort((a, b) => a.numero - b.numero);
    } else {
      // Baixa normal (valor total pago ou estorno)
      venda.listaParcelas[index].paga = paga;
      venda.listaParcelas[index].dataPagamento = paga ? dataPagamento : null;
      
      // Se for um estorno e o valor tiver sido alterado anteriormente, você pode querer restaurar o original aqui
      // mas como o sistema cria novas parcelas, o estorno apenas limpa o pagamento desta parcela específica.
    }
    
    // Indica ao Mongoose que o array interno mudou (Essencial para persistência no MongoDB)
    venda.markModified('listaParcelas');
    await venda.save();
    res.json(venda);
  } catch (err) {
    console.error("Erro no processamento da parcela:", err);
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