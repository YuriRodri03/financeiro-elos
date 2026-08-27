const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys'); 
const QRCode = require('qrcode');
const nodemailer = require('nodemailer'); // 🟢 Adicionado para disparo de e-mails

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MONGO_URI = process.env.MONGODB_URI; 

// --- VARIÁVEIS DE CONTROLE DO ROBÔ ---
let whatsappClient = null;
let statusConexao = 'Iniciando...';
let qrCodeBase64 = null;
let idsAniversariantesEnviadosHoje = []; 
let idsPosVendaEnviadosHoje = [];
let dataUltimaVerificacaoJanela = "";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Banco MongoDB da Ótica Elos Conectado!");
    atualizarVendasAntigas(); 
    inicializarMensagensPadrao(); 
    inicializarWhatsApp();
  })
  .catch(err => console.error("❌ Erro na conexão:", err));

// --- MODELOS (SCHEMAS) ---
const Cliente = mongoose.model('Cliente', {
  nome: String, cpf: String, dataNascimento: String, telefone: String, email: String, endereco: String, observacoes: String, foto: String,
  senha: { type: String, default: "" },
  tokenRecuperacao: { type: String, default: null }, // 🟢 Código de 6 dígitos temporário
  tokenExpiraEm: { type: Date, default: null } // 🟢 Validade do código (ex: 15 min)
});

const Venda = mongoose.model('Venda', {
  numeroPedido: Number, cliente: String, cpf: String, produto: String, itensCarrinho: Array, valorTotal: Number, valorEntrada: Number, desconto: Number, parcelas: Number, listaParcelas: Array, dataVenda: String, metodoPagamento: String, dataPrevisaoPagamento: String, observacoes: String, foto: String, dataPrimeiraParcela: String        
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, valor: Number, categoria: String, vencimento: String, paga: Boolean
});

const Produto = mongoose.model('Produto', new mongoose.Schema({
  nome: String, preco: Number, categoria: String, quantidade: Number, foto: { type: String, default: "" }, fotos: { type: [String], default: [] }, referencia: { type: String, default: "" }
}), 'produtos');

const Configuracao = mongoose.model('Configuracao', {
  chave: String, valor: String
});

const OrdemServico = mongoose.model('OrdemServico', {
  numeroPedido: String, dataCriacao: String, lente: String, tratamento: String, armacao: String, 
  longe_od_esf: String, longe_od_cil: String, longe_od_eixo: String, longe_od_dnp: String,
  longe_oe_esf: String, longe_oe_cil: String, longe_oe_eixo: String, longe_oe_dnp: String,
  adicao: String,
  co_od_esf: String, co_od_cil: String, co_od_eixo: String, co_od_dnp: String,
  co_oe_esf: String, co_oe_cil: String, co_oe_eixo: String, co_oe_dnp: String,
  perto_od_esf: String, perto_od_cil: String, perto_od_eixo: String, perto_od_dnp: String,
  perto_oe_esf: String, perto_oe_cil: String, perto_oe_eixo: String, perto_oe_dnp: String,
  medidas_vertical: String, medidas_horizontal: String, medidas_ponte: String, medidas_diag: String,
  observacoes: String, consultor: String
});

const PedidoOnlineSchema = new mongoose.Schema({
  numeroPedidoOnline: Number, clienteNome: String, clienteTelefone: String, clienteCpf: String, clienteEndereco: String,
  itens: Array, valorTotal: Number, status: { type: String, default: 'AGUARDANDO_PAGAMENTO' }, dataPedido: { type: Date, default: Date.now }, infinitePayId: String
});
const PedidoOnline = mongoose.model('PedidoOnline', PedidoOnlineSchema);

const atualizarVendasAntigas = async () => {
  try {
    const vendasSemNumero = await Venda.find({ numeroPedido: { $exists: false } }).sort({ dataVenda: 1 });
    if (vendasSemNumero.length > 0) {
      console.log(`🔢 Numerando ${vendasSemNumero.length} vendas antigas...`);
      for (let i = 0; i < vendasSemNumero.length; i++) {
        vendasSemNumero[i].numeroPedido = 2000 + i; await vendasSemNumero[i].save();
      }
    }
  } catch (err) {}
};

const inicializarMensagensPadrao = async () => {
  try {
    const msgAniv = await Configuracao.findOne({ chave: 'msg_aniversario' });
    if (!msgAniv) await new Configuracao({ chave: 'msg_aniversario', valor: "Olá, {nome}! 🎉\n\nNós da *Ótica Elos* passamos para te desejar um feliz aniversário! 🎂✨\n\nQue o seu novo ciclo seja iluminado, cheio de saúde, foco e muitas conquistas. Como presente, traga esta mensagem até a nossa loja durante o seu mês de aniversário para retirar um brinde exclusivo! 🕶️💝" }).save();

    const msgPosVenda = await Configuracao.findOne({ chave: 'msg_pos_venda' });
    if (!msgPosVenda) await new Configuracao({ chave: 'msg_pos_venda', valor: "Olá, {nome}! Tudo bem? 😊\n\nHá cerca de um mês você esteve aqui na *Ótica Elos* e levou seu(s) produto(s): *{produto}*.\n\nPassamos para saber como está sendo a sua experiência! Os óculos estão confortáveis? Precisando de qualquer ajuste na armação ou limpeza ultrassônica das lentes, lembre-se que você tem assistência gratuita vitalícia em nossa loja. 🕶️✨\n\nSua satisfação e conforto visual são nossa prioridade!" }).save();
  } catch (err) {}
};

// ==========================================
// CONFIGURAÇÃO DO GMAIL (ENVIO DE SENHA)
// ==========================================
// ⚠️ Coloque seu E-mail da Ótica e a Senha de Aplicativo do Gmail aqui!
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_REMETENTE || 'seuemail@gmail.com', 
    pass: process.env.SENHA_EMAIL || 'sua_senha_de_app_aqui'
  }
});

// ==========================================
// 🛠️ ROTAS DE CONTROLE DO WHATSAPP
// ==========================================
app.get('/api/whatsapp/status', (req, res) => res.json({ status: statusConexao, qr: qrCodeBase64 }));

app.post('/api/whatsapp/desconectar', async (req, res) => {
  if (!whatsappClient) return res.status(400).json({ error: 'WhatsApp não está ativo para desconectar.' });
  try {
    statusConexao = 'Desconectando...';
    await whatsappClient.logout();
    statusConexao = 'Desconectado'; qrCodeBase64 = null; whatsappClient = null;
    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
    setTimeout(() => { inicializarWhatsApp(); }, 3000);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/whatsapp/mensagens', async (req, res) => {
  try { const configs = await Configuracao.find(); const mapa = {}; configs.forEach(c => mapa[c.chave] = c.valor); res.json(mapa); } 
  catch (err) { res.status(500).json({ error: "Erro ao carregar mensagens" }); }
});

app.post('/api/whatsapp/mensagens', async (req, res) => {
  try {
    const { msg_aniversario, msg_pos_venda } = req.body;
    if (msg_aniversario) await Configuracao.updateOne({ chave: 'msg_aniversario' }, { valor: msg_aniversario }, { upsert: true });
    if (msg_pos_venda) await Configuracao.updateOne({ chave: 'msg_pos_venda' }, { valor: msg_pos_venda }, { upsert: true });
    res.json({ success: true, message: "Mensagens salvas com sucesso!" });
  } catch (err) { res.status(500).json({ error: "Erro ao salvar mensagens" }); }
});

// ==========================================
// --- ROTAS API: CLIENTES ---
// ==========================================
app.get('/api/clientes', async (req, res) => res.json(await Cliente.find()));
app.get('/api/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(cliente);
  } catch (err) { res.status(500).json({ error: "Erro ao buscar cliente" }); }
});
app.post('/api/clientes', async (req, res) => res.json(await new Cliente(req.body).save()));
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const clienteAtualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clienteAtualizado) return res.status(404).json({ error: "Cliente não encontrado" });
    await Venda.updateMany({ cpf: clienteAtualizado.cpf }, { $set: { cliente: clienteAtualizado.nome } });
    res.json(clienteAtualizado);
  } catch (err) { res.status(500).json({ error: "Erro ao editar cliente" }); }
});
app.delete('/api/clientes/:cpf', async (req, res) => { await Cliente.deleteOne({ cpf: req.params.cpf }); res.json({ message: "Removido" }); });

// 🟢 NOVA ROTA 1: SOLICITAR CÓDIGO POR E-MAIL
app.post('/api/clientes/solicitar-recuperacao', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail obrigatório." });

    const cliente = await Cliente.findOne({ email: email.trim().toLowerCase() });
    if (!cliente) return res.status(404).json({ error: "E-mail não encontrado." });

    // Gera código de 6 dígitos
    const codigoToken = Math.floor(100000 + Math.random() * 900000).toString();
    const dataExpiracao = new Date(Date.now() + 15 * 60000); // Expira em 15 mins

    cliente.tokenRecuperacao = codigoToken;
    cliente.tokenExpiraEm = dataExpiracao;
    await cliente.save();

    // Envia o E-mail
    const mailOptions = {
      from: '"Ótica Elos - Suporte" <nao-responda@oticaelos.com>',
      to: cliente.email,
      subject: 'Recuperação de Senha - Ótica Elos',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1d3026;">Olá, ${cliente.nome.split(' ')[0]}!</h2>
          <p>Recebemos um pedido de recuperação de senha para a sua conta na Ótica Elos E-commerce.</p>
          <p>Seu código de segurança é:</p>
          <div style="background-color: #f9f8f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #1d3026; border-radius: 10px; margin: 20px 0;">
            ${codigoToken}
          </div>
          <p style="font-size: 12px; color: #666;">Este código é válido por 15 minutos. Se você não solicitou isso, pode ignorar este e-mail em segurança.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erro ao enviar e-mail:", error);
        return res.status(500).json({ error: "Erro no servidor de e-mail." });
      }
      res.json({ success: true, message: "Token enviado!" });
    });

  } catch (err) {
    res.status(500).json({ error: "Erro ao processar solicitação." });
  }
});

// 🟢 NOVA ROTA 2: VALIDAR CÓDIGO E SALVAR NOVA SENHA
app.post('/api/clientes/redefinir-senha', async (req, res) => {
  try {
    const { email, token, novaSenha } = req.body;
    
    const cliente = await Cliente.findOne({ email: email.trim().toLowerCase() });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

    if (cliente.tokenRecuperacao !== token || new Date() > cliente.tokenExpiraEm) {
      return res.status(400).json({ error: "Código inválido ou expirado." });
    }

    cliente.senha = novaSenha;
    cliente.tokenRecuperacao = null; // Limpa o token após o uso
    cliente.tokenExpiraEm = null;
    await cliente.save();

    res.json({ success: true, message: "Senha atualizada com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao redefinir senha." });
  }
});


// ==========================================
// --- ROTAS API: VENDAS E ORDENS DE SERVIÇO ---
// ==========================================
app.get('/api/vendas', async (req, res) => {
  try {
    const vendas = await Venda.find().lean();
    const ordensServico = await OrdemServico.find().lean();
    const vendasComOS = vendas.map(venda => {
      const identificadorVenda = venda.numeroPedido ? String(venda.numeroPedido) : venda._id.toString();
      const osDestaVenda = ordensServico.filter(os => String(os.numeroPedido) === identificadorVenda);
      return { ...venda, ordensServico: osDestaVenda.map(os => ({ ...os, idOS: os._id.toString() })) };
    });
    res.json(vendasComOS);
  } catch (err) { res.status(500).json({ error: "Erro ao buscar vendas e OS" }); }
});

app.post('/api/vendas', async (req, res) => {
  try {
    const ultimaVenda = await Venda.findOne().sort({ numeroPedido: -1 });
    const proximoNumero = ultimaVenda && ultimaVenda.numeroPedido ? ultimaVenda.numeroPedido + 1 : 2000;
    const novaVenda = new Venda({ ...req.body, numeroPedido: proximoNumero });
    res.json(await novaVenda.save());
  } catch (err) { res.status(500).json({ error: "Erro ao salvar venda" }); }
});
app.patch('/api/vendas/:id', async (req, res) => { try { res.json(await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); } });
app.put('/api/vendas/:id', async (req, res) => { try { res.json(await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); } });
app.delete('/api/vendas/:id', async (req, res) => { try { await Venda.findByIdAndDelete(req.params.id); res.json({ message: "Venda excluída" }); } catch (err) { res.status(500).json({ error: "Erro" }); } });

app.get('/api/ordens_servico', async (req, res) => res.json(await OrdemServico.find()));
app.get('/api/ordens_servico/:id', async (req, res) => {
  try { const os = await OrdemServico.findById(req.params.id); if (!os) return res.status(404).json({ error: "OS não encontrada" }); res.json(os); } catch (err) { res.status(500).json({ error: "Erro ao buscar a OS" }); }
});
app.get('/api/ordens_servico/pedido/:numeroPedido', async (req, res) => { try { const ordens = await OrdemServico.find({ numeroPedido: req.params.numeroPedido }); res.json(ordens); } catch (err) { res.status(500).json({ error: "Erro" }); } });
app.post('/api/ordens_servico', async (req, res) => { try { const novaOS = new OrdemServico(req.body); await novaOS.save(); res.status(201).json(novaOS); } catch (err) { res.status(500).json({ error: "Erro ao salvar OS" }); } });
app.put('/api/ordens_servico/:id', async (req, res) => { try { const osEditada = await OrdemServico.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(osEditada); } catch (err) { res.status(500).json({ error: "Erro ao atualizar OS" }); } });
app.delete('/api/ordens_servico/:id', async (req, res) => { try { await OrdemServico.findByIdAndDelete(req.params.id); res.json({ message: "OS excluída com sucesso" }); } catch (err) { res.status(500).json({ error: "Erro ao deletar OS" }); } });

app.patch('/api/vendas/:id/parcela/:numero', async (req, res) => {
  try {
    const { id, numero } = req.params; const { paga, dataPagamento, valorPago } = req.body;
    const venda = await Venda.findById(id);
    if (!venda) return res.status(404).json({ error: "Venda não encontrada" });
    const numAtual = parseFloat(numero);
    let novasParcelas = JSON.parse(JSON.stringify(venda.listaParcelas || []));
    const index = novasParcelas.findIndex(p => String(p.numero) === String(numAtual));
    if (index === -1) return res.status(404).json({ error: "Parcela não encontrada" });

    if (paga === false) {
      const proximoNumero = numAtual + 0.5; const parcelaFilhaIndex = novasParcelas.findIndex(p => String(p.numero) === String(proximoNumero));
      if (parcelaFilhaIndex !== -1 && !Number.isInteger(proximoNumero)) {
        const somaRecomposta = Number(novasParcelas[index].valor) + Number(novasParcelas[parcelaFilhaIndex].valor);
        novasParcelas[index].valor = parseFloat(somaRecomposta.toFixed(2)); novasParcelas.splice(parcelaFilhaIndex, 1); i--; 
      }
      novasParcelas[index].paga = false; novasParcelas[index].dataPagamento = null;
    } else {
      let valorInformado = parseFloat(Number(valorPago || novasParcelas[index].valor).toFixed(2));
      let valorOriginalDaParcela = parseFloat(Number(novasParcelas[index].valor).toFixed(2));
      const diferenca = parseFloat((valorInformado - valorOriginalDaParcela).toFixed(2));

      if (diferenca > 0) {
        let excesso = diferenca;
        for (let i = index + 1; i < novasParcelas.length; i++) {
          if (excesso <= 0) break; if (novasParcelas[i].paga) continue;
          let valorDaProxima = parseFloat(Number(novasParcelas[i].valor).toFixed(2));
          if (excesso >= valorDaProxima) { novasParcelas[index].valor = parseFloat((Number(novasParcelas[index].valor) + valorDaProxima).toFixed(2)); excesso = parseFloat((excesso - valorDaProxima).toFixed(2)); novasParcelas.splice(i, 1); i--; } 
          else { novasParcelas[i].valor = parseFloat((valorDaProxima - excesso).toFixed(2)); novasParcelas[index].valor = parseFloat((Number(novasParcelas[index].valor) + excesso).toFixed(2)); excesso = 0; }
        }
        novasParcelas[index].paga = true; novasParcelas[index].dataPagamento = dataPagamento;
      } else if (diferenca < 0) {
        const valorSobra = Math.abs(diferenca);
        novasParcelas[index].valor = valorInformado; novasParcelas[index].paga = true; novasParcelas[index].dataPagamento = dataPagamento;
        novasParcelas.push({ ...novasParcelas[index], numero: numAtual + 0.5, valor: valorSobra, paga: false, dataPagamento: null, observacao: `Restante da parc. ${numAtual}` });
      } else {
        novasParcelas[index].valor = valorInformado; novasParcelas[index].paga = true; novasParcelas[index].dataPagamento = dataPagamento;
      }
    }
    novasParcelas.sort((a, b) => a.numero - b.numero); venda.listaParcelas = novasParcelas; venda.markModified('listaParcelas'); await venda.save(); res.json(venda);
  } catch (err) { res.status(500).json({ error: "Erro ao processar parcela" }); }
});

app.get('/api/despesas', async (req, res) => res.json(await Despesa.find()));
app.post('/api/despesas', async (req, res) => res.json(await new Despesa(req.body).save()));
app.patch('/api/despesas/:id', async (req, res) => { try { res.json(await Despesa.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); } });
app.delete('/api/despesas/:id', async (req, res) => { try { await Despesa.findByIdAndDelete(req.params.id); res.json({ message: "Excluída" }); } catch (err) { res.status(500).json({ error: "Erro" }); } });

app.get('/api/produtos', async (req, res) => {
  try {
    const listaProdutos = await Produto.find({}).select('nome preco categoria quantidade referencia foto').lean();
    res.json(listaProdutos);
  } catch (err) {
    console.error("❌ ERRO GRAVE NA ROTA DE PRODUTOS:", err); res.status(500).json({ error: "Falha ao buscar", detalhes: err.message });
  }
});
app.post('/api/produtos', async (req, res) => res.json(await new Produto(req.body).save()));
app.put('/api/produtos/:id', async (req, res) => { try { res.json(await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); } });
app.delete('/api/produtos/:id', async (req, res) => { try { await Produto.findByIdAndDelete(req.params.id); res.json({ message: "Removido" }); } catch (err) { res.status(500).json({ error: "Erro" }); } });

app.get('/api/pedidos_online', async (req, res) => { try { const pedidos = await PedidoOnline.find().sort({ dataPedido: -1 }); res.json(pedidos); } catch (err) { res.status(500).json({ error: "Erro ao buscar pedidos online" }); } });
app.post('/api/pedidos_online', async (req, res) => {
  try {
    const ultimoPedido = await PedidoOnline.findOne().sort({ numeroPedidoOnline: -1 });
    const proximoNumeroOnline = ultimoPedido && ultimoPedido.numeroPedidoOnline ? ultimoPedido.numeroPedidoOnline + 1 : 1000;
    const novoPedido = new PedidoOnline({ ...req.body, numeroPedidoOnline: proximoNumeroOnline });
    await novoPedido.save(); res.json({ success: true, pedido: novoPedido });
  } catch (err) { res.status(500).json({ error: "Erro ao registrar pedido online" }); }
});

app.patch('/api/pedidos_online/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const pedidoAnterior = await PedidoOnline.findById(req.params.id);
    
    if (status === 'CANCELADO') {
      await PedidoOnline.findByIdAndDelete(req.params.id); return res.json({ message: "Pedido excluído com sucesso." });
    }

    const pedidoAtualizado = await PedidoOnline.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (status === 'CONCLUIDO' && pedidoAnterior.status !== 'CONCLUIDO') {
      let clienteExiste = await Cliente.findOne({ cpf: pedidoAtualizado.clienteCpf });
      if (!clienteExiste) {
        clienteExiste = new Cliente({ nome: pedidoAtualizado.clienteNome, cpf: pedidoAtualizado.clienteCpf, telefone: pedidoAtualizado.clienteTelefone, endereco: pedidoAtualizado.clienteEndereco || '', observacoes: 'Cliente cadastrado automaticamente via Loja Virtual.' }); await clienteExiste.save();
      }

      const ultimaVenda = await Venda.findOne().sort({ numeroPedido: -1 });
      const proximoNumero = ultimaVenda && ultimaVenda.numeroPedido ? ultimaVenda.numeroPedido + 1 : 2000;

      const novaVendaOficial = new Venda({
        numeroPedido: proximoNumero, cliente: pedidoAtualizado.clienteNome, cpf: pedidoAtualizado.clienteCpf, produto: "Compra Online - " + pedidoAtualizado.itens.map(i => i.nome).join(', '), itensCarrinho: pedidoAtualizado.itens, valorTotal: pedidoAtualizado.valorTotal, valorEntrada: pedidoAtualizado.valorTotal, desconto: 0, parcelas: 1,
        listaParcelas: [{ numero: 1, valor: pedidoAtualizado.valorTotal, dataVencimento: new Date().toISOString().split('T')[0], paga: true, dataPagamento: new Date().toISOString().split('T')[0], observacao: "Pago via Site" }],
        dataVenda: new Date().toISOString().split('T')[0], metodoPagamento: 'Pagamento Digital (Site)', observacoes: `Origem: Pedido Online #${pedidoAtualizado.numeroPedidoOnline}\nEndereço de Entrega: ${pedidoAtualizado.clienteEndereco || 'Não informado'}`
      });

      await novaVendaOficial.save();
    }
    res.json(pedidoAtualizado);
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar status do pedido online" }); }
});

// ==========================================
// 🤖 MOTOR DO WHATSAPP
// ==========================================
async function inicializarWhatsApp() {
  try {
    const registroSessao = await Configuracao.findOne({ chave: 'whatsapp_session_creds' });
    let credsCarregadas = null;
    if (registroSessao && registroSessao.valor) {
      try { credsCarregadas = JSON.parse(registroSessao.valor, (key, value) => { if (value && value.type === 'Buffer' && Array.isArray(value.data)) { return Buffer.from(value.data); } return value; }); } catch (e) {}
    }

    const { initAuthCreds } = require('@whiskeysockets/baileys');
    const state = { creds: credsCarregadas || initAuthCreds(), keys: { get: () => ({}), set: () => {} } };

    const guardarSessaoNoMongo = async () => {
      try { const textoSessao = JSON.stringify(state.creds); await Configuracao.updateOne({ chave: 'whatsapp_session_creds' }, { valor: textoSessao }, { upsert: true }); } catch (err) {}
    };

    whatsappClient = makeWASocket({
      auth: state, printQRInTerminal: false, defaultQueryTimeoutMs: undefined, keepAliveIntervalMs: 30000, 
      options: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
    });

    whatsappClient.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) { statusConexao = 'Aguardando Leitura do QR Code'; try { qrCodeBase64 = await QRCode.toDataURL(qr); } catch (err) {} }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const foiDeslogado = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        statusConexao = 'Desconectado'; qrCodeBase64 = null;
        if (foiDeslogado) { try { await Configuracao.deleteOne({ chave: 'whatsapp_session_creds' }); } catch (e) {} setTimeout(() => inicializarWhatsApp(), 2000); } 
        else { inicializarWhatsApp(); }
      } else if (connection === 'open') {
        statusConexao = 'Conectado'; qrCodeBase64 = null; console.log('✅ WhatsApp conectado com sucesso!');
        setTimeout(() => { verificarAniversariantesDoDia(); verificarPosVendaTrintaDias(); }, 15000);
      }
    });

    whatsappClient.ev.on('creds.update', async () => { await guardarSessaoNoMongo(); });

  } catch (error) { statusConexao = 'Erro ao conectar'; console.error('Erro crítico ao iniciar Baileys:', error); }
}

async function enviarMensagemTexto(jid, texto) { if (!whatsappClient) throw new Error('Client Baileys não inicializado'); await whatsappClient.sendMessage(jid, { text: texto }); }

async function validarNumeroWhatsApp(numeroPuro) {
  try { const [result] = await whatsappClient.onWhatsApp(`${numeroPuro}@s.whatsapp.net`); if (result && result.exists) return result.jid; return `${numeroPuro}@s.whatsapp.net`; } 
  catch (e) { return `${numeroPuro}@s.whatsapp.net`; }
}

async function verificarAniversariantesDoDia() {
  if (!whatsappClient || statusConexao !== 'Conectado') return;
  const hoje = new Date(); const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0'); const diaHoje = String(hoje.getDate()).padStart(2, '0'); const hojeDataCompleta = `${hoje.getFullYear()}-${mesHoje}-${diaHoje}`;

  if (dataUltimaVerificacaoJanela !== hojeDataCompleta) { idsAniversariantesEnviadosHoje = []; idsPosVendaEnviadosHoje = []; dataUltimaVerificacaoJanela = hojeDataCompleta; }

  try {
    const regexAniversario = new RegExp(`^\\d{4}-${mesHoje}-${diaHoje}$`);
    const aniversariantes = await Cliente.find({ dataNascimento: regexAniversario });
    const pendentes = aniversariantes.filter(c => !idsAniversariantesEnviadosHoje.includes(String(c._id)));

    if (pendentes.length === 0) return;
    const configMsg = await Configuracao.findOne({ chave: 'msg_aniversario' });
    const templateBase = configMsg ? configMsg.valor : "Olá, {nome}! 🎉 Feliz Aniversário da Ótica Elos!";

    for (const cliente of pendentes) {
      if (!cliente.telefone) continue;
      let numeroPuro = cliente.telefone.replace(/\D/g, ''); if (!numeroPuro.startsWith('55')) numeroPuro = `55${numeroPuro}`;
      const mensagem = templateBase.replace(/{nome}/g, cliente.nome);
      let envioSucesso = false;

      try { const jidValido = await validarNumeroWhatsApp(numeroPuro); await enviarMensagemTexto(jidValido, mensagem); envioSucesso = true; } catch (err) {}
      if (!envioSucesso && numeroPuro.length === 13) { try { const numSND = numeroPuro.substring(0, 4) + numeroPuro.substring(5); const jidFB = await validarNumeroWhatsApp(numSND); await enviarMensagemTexto(jidFB, mensagem); } catch (errFallback) {} }

      idsAniversariantesEnviadosHoje.push(String(cliente._id)); await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {}
}

async function verificarPosVendaTrintaDias() {
  if (!whatsappClient || statusConexao !== 'Conectado') return;
  const dataTrintaDiasAtras = new Date(); dataTrintaDiasAtras.setDate(dataTrintaDiasAtras.getDate() - 30); const dataAlvoStr = dataTrintaDiasAtras.toISOString().split('T')[0];

  try {
    const vendasTrintaDias = await Venda.find({ dataVenda: dataAlvoStr });
    const pendentes = vendasTrintaDias.filter(v => !idsPosVendaEnviadosHoje.includes(String(v._id)));
    if (pendentes.length === 0) return;

    const configMsg = await Configuracao.findOne({ chave: 'msg_pos_venda' });
    const templateBase = configMsg ? configMsg.valor : "Olá, {nome}! Como está seu produto {produto}?";

    for (const venda of pendentes) {
      const cadastroCliente = await Cliente.findOne({ cpf: venda.cpf });
      if (!cadastroCliente || !cadastroCliente.telefone) continue;

      let numeroPuro = cadastroCliente.telefone.replace(/\D/g, ''); if (!numeroPuro.startsWith('55')) numeroPuro = `55${numeroPuro}`;
      const mensagem = templateBase.replace(/{nome}/g, venda.cliente).replace(/{produto}/g, venda.produto);

      let envioSucesso = false;
      try { const jidValido = await validarNumeroWhatsApp(numeroPuro); await enviarMensagemTexto(jidValido, mensagem); envioSucesso = true; } catch (err) {}
      if (!envioSucesso && numeroPuro.length === 13) { try { const numSND = numeroPuro.substring(0, 4) + numeroPuro.substring(5); const jidFB = await validarNumeroWhatsApp(numSND); await enviarMensagemTexto(jidFB, mensagem); } catch (errFallback) {} }

      idsPosVendaEnviadosHoje.push(String(venda._id)); await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {}
}

setInterval(() => { verificarAniversariantesDoDia(); verificarPosVendaTrintaDias(); }, 1000 * 60 * 60);

const PORT = process.env.PORT || 5000;
setInterval(async () => { try { await fetch(`http://localhost:${PORT}/`); } catch (e) {} }, 1000 * 60 * 10); 
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));