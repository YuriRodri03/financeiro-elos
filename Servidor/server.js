const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const wppconnect = require('@wppconnect-team/wppconnect'); // ✅ Integrado: Lib do Robô
require('dotenv').config();

const app = express();
app.use(cors());

// --- AJUSTE DE LIMITE PARA FOTOS ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MONGO_URI = process.env.MONGODB_URI; 

// --- VARIÁVEIS DE CONTROLE DO ROBÔ ---
let whatsappClient = null;
let ultimaDataEnvio = null; 
let ultimaDataPosVenda = null;
let statusConexao = 'Iniciando...';
let qrCodeBase64 = null;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Banco MongoDB da Ótica Elos Conectado!");
    atualizarVendasAntigas(); 
    inicializarMensagensPadrao(); // ✅ Inicializa as configurações de mensagens padrão se não existirem
    
    // ✅ Inicializa o WhatsApp automaticamente após o banco conectar com segurança
    inicializarWhatsApp();
  })
  .catch(err => console.error("❌ Erro na conexão:", err));

// --- MODELOS (SCHEMAS) ---

const Cliente = mongoose.model('Cliente', {
  nome: String, 
  cpf: String, 
  dataNascimento: String, 
  telefone: String, 
  email: String, 
  endereco: String, 
  observacoes: String,
  foto: String 
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
  observacoes: String, 
  foto: String        
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, 
  valor: Number, 
  categoria: String, 
  vencimento: String, 
  paga: Boolean
});

const Produto = mongoose.model('Produto', {
  nome: String,
  preco: Number,
  categoria: String
});

// ✅ NOVO MODELO: Para guardar textos mutáveis das notificações no MongoDB
const Configuracao = mongoose.model('Configuracao', {
  chave: String,
  valor: String
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
      console.log("✅ Vendas antigas updated com sucesso!");
    }
  } catch (err) {
    console.error("Erro ao atualizar vendas antigas:", err);
  }
};

// ✅ FUNÇÃO AUXILIAR: Garante que os textos existam no banco logo no primeiro boot
const inicializarMensagensPadrao = async () => {
  try {
    const msgAniv = await Configuracao.findOne({ chave: 'msg_aniversario' });
    if (!msgAniv) {
      await new Configuracao({
        chave: 'msg_aniversario',
        valor: "Olá, {nome}! 🎉\n\nNós da *Ótica Elos* passamos para te desejar um feliz aniversário! 🎂✨\n\nQue o seu novo ciclo seja iluminado, cheio de saúde, foco e muitas conquistas. Como presente, traga esta mensagem até a nossa loja durante o seu mês de aniversário para retirar um brinde exclusivo! 🕶️💝"
      }).save();
    }

    const msgPosVenda = await Configuracao.findOne({ chave: 'msg_pos_venda' });
    if (!msgPosVenda) {
      await new Configuracao({
        chave: 'msg_pos_venda',
        valor: "Olá, {nome}! Tudo bem? 😊\n\nHá cerca de um mês você esteve aqui na *Ótica Elos* e levou seu(s) produto(s): *{produto}*.\n\nPassamos para saber como está sendo a sua experiência! Os óculos estão confortáveis? Precisando de qualquer ajuste na armação ou limpeza ultrassônica das lentes, lembre-se que você tem assistência gratuita vitalícia em nossa loja. 🕶️✨\n\nSua satisfação e conforto visual são nossa prioridade!"
      }).save();
    }
  } catch (err) {
    console.error("Erro ao inicializar mensagens padrão:", err);
  }
};

// ==========================================
// 🛠️ ROTAS DE CONTROLE DO WHATSAPP (INTEGRADAS)
// ==========================================
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: statusConexao, qr: qrCodeBase64 });
});

app.post('/api/whatsapp/desconectar', async (req, res) => {
  if (!whatsappClient) return res.status(400).json({ error: 'WhatsApp não está ativo para desconectar.' });
  try {
    await whatsappClient.logout();
    statusConexao = 'Desconectado';
    whatsappClient = null;
    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ✅ NOVAS ROTAS: Buscar e atualizar os textos customizáveis das mensagens no front-end
app.get('/api/whatsapp/mensagens', async (req, res) => {
  try {
    const configs = await Configuracao.find();
    const mapa = {};
    configs.forEach(c => mapa[c.chave] = c.valor);
    res.json(mapa);
  } catch (err) { res.status(500).json({ error: "Erro ao carregar mensagens" }); }
});

app.post('/api/whatsapp/mensagens', async (req, res) => {
  try {
    const { msg_aniversario, msg_pos_venda } = req.body;
    if (msg_aniversario) await Configuracao.updateOne({ chave: 'msg_aniversario' }, { valor: msg_aniversario }, { upsert: true });
    if (msg_pos_venda) await Configuracao.updateOne({ chave: 'msg_pos_venda' }, { valor: msg_pos_venda }, { upsert: true });
    res.json({ success: true, message: "Mensagens salvas com sucesso!" });
  } catch (err) { res.status(500).json({ error: "Erro ao salvar mensagens" }); }
});


// --- ROTAS API: CLIENTES ---
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

app.put('/api/vendas/:id', async (req, res) => {
  try {
    const venda = await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(venda);
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar pedido" }); }
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
    let novasParcelas = JSON.parse(JSON.stringify(venda.listaParcelas || []));
    
    const index = novasParcelas.findIndex(p => String(p.numero) === String(numAtual));
    if (index === -1) return res.status(404).json({ error: "Parcela não encontrada" });

    if (paga === false) {
      const proximoNumero = numAtual + 0.5;
      const parcelaFilhaIndex = novasParcelas.findIndex(p => String(p.numero) === String(proximoNumero));
      if (parcelaFilhaIndex !== -1 && !Number.isInteger(proximoNumero)) {
        const somaRecomposta = Number(novasParcelas[index].valor) + Number(novasParcelas[parcelaFilhaIndex].valor);
        novasParcelas[index].valor = parseFloat(somaRecomposta.toFixed(2));
        novasParcelas.splice(parcelaFilhaIndex, 1); i--;
      }
      novasParcelas[index].paga = false;
      novasParcelas[index].dataPagamento = null;
    } else {
      let valorInformado = parseFloat(Number(valorPago || novasParcelas[index].valor).toFixed(2));
      let valorOriginalDaParcela = parseFloat(Number(novasParcelas[index].valor).toFixed(2));
      
      const diferenca = parseFloat((valorInformado - valorOriginalDaParcela).toFixed(2));

      if (diferenca > 0) {
        let excesso = diferenca;
        for (let i = index + 1; i < novasParcelas.length; i++) {
          if (excesso <= 0) break;
          if (novasParcelas[i].paga) continue;
          let valorDaProxima = parseFloat(Number(novasParcelas[i].valor).toFixed(2));
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
      } else if (diferenca < 0) {
        const valorSobra = Math.abs(diferenca);
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
        novasParcelas[index].valor = valorInformado;
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

// --- ROTAS API: PRODUTOS ---
app.get('/api/produtos', async (req, res) => {
  try {
    const listaProdutos = await Produto.find().sort({ nome: 1 });
    res.json(listaProdutos);
  } catch (err) { res.status(500).json({ error: "Erro ao buscar produtos" }); }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const novoProd = new Produto(req.body);
    res.json(await novoProd.save());
  } catch (err) { res.status(500).json({ error: "Erro ao salvar produto" }); }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const produtoAtualizado = await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!produtoAtualizado) return res.status(404).json({ error: "Produto não encontrado no catálogo" });
    res.json(produtoAtualizado);
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar dados do produto" }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ message: "Produto removido do catálogo" });
  } catch (err) { res.status(500).json({ error: "Erro ao remover produto" }); }
});

// ==========================================
// 🤖 FUNÇÕES E LOGÍSTICAS DO ROBÔ DE DISPAROS
// ==========================================
function inicializarWhatsApp() {
  wppconnect.create({
    session: 'otica-elos-session',
    catchQR: (base64Qr) => {
      statusConexao = 'Aguardando Leitura do QR Code';
      qrCodeBase64 = base64Qr; 
    },
    statusFind: (statusSession) => {
      statusConexao = statusSession;
      console.log('Status da Sessão do Robô:', statusSession);
    },
    headless: true,
    devtools: false,
    useChrome: false,
    debug: false,
    logQR: false,
    autoClose: 0,
    puppeteerOptions: {
      userDataDir: '/opt/render/project/src/server/tokens/otica-elos-session',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  })
  .then((client) => {
    whatsappClient = client;
    statusConexao = 'Conectado';
    qrCodeBase64 = null; 
    console.log('✅ Robô de Mensagens da Ótica Elos sincronizado!');
    
    setTimeout(() => {
      verificarAniversariantesDoDia();
      verificarPosVendaTrintaDias();
    }, 30000);
  })
  .catch((error) => {
    statusConexao = 'Erro ao conectar';
    console.error('Erro ao inicializar automação do WhatsApp:', error);
  });
}

async function verificarAniversariantesDoDia() {
  if (!whatsappClient) return;
  try {
    const estaConectado = await whatsappClient.isConnected();
    if (!estaConectado) return;
  } catch (err) { return; }

  const hoje = new Date();
  const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
  const diaHoje = String(hoje.getDate()).padStart(2, '0');
  const hojeDataCompleta = `${hoje.getFullYear()}-${mesHoje}-${diaHoje}`;

  if (ultimaDataEnvio === hojeDataCompleta) return;
  console.log(`🔄 [Automação] Executando rotina de aniversariantes para o dia: ${diaHoje}/${mesHoje}`);

  try {
    const regexAniversario = new RegExp(`^\\d{4}-${mesHoje}-${diaHoje}$`);
    const aniversariantes = await Cliente.find({ dataNascimento: regexAniversario });

    if (aniversariantes.length === 0) {
      console.log('📭 Sem aniversariantes na Ótica Elos hoje.');
      ultimaDataEnvio = hojeDataCompleta;
      return;
    }

    // ✅ Puxa o template salvo no MongoDB
    const configMsg = await Configuracao.findOne({ chave: 'msg_aniversario' });
    const templateBase = configMsg ? configMsg.valor : "Olá, {nome}! 🎉 Feliz Aniversário da Ótica Elos!";

    for (const cliente of aniversariantes) {
      if (!cliente.telefone) continue;
      let numeroPuro = cliente.telefone.replace(/\D/g, '');
      if (!numeroPuro.startsWith('55')) numeroPuro = `55${numeroPuro}`;

      // ✅ Aplica as tags dinâmicas de forma limpa
      const mensagem = templateBase.replace(/{nome}/g, cliente.nome);

      let envioSucesso = false;
      try {
        const infoNumero = await whatsappClient.checkNumberStatus(`${numeroPuro}@c.us`);
        const destinatarioValido = infoNumero?.id?._serialized || `${numeroPuro}@c.us`;
        await whatsappClient.sendText(destinatarioValido, mensagem);
        console.log(`✅ [Sucesso Aniversário] Mensagem entregue para: ${cliente.nome}`);
        envioSucesso = true;
      } catch (err) { console.log(`⚠️ Falha primária no envio para ${cliente.nome}`); }

      if (!envioSucesso && numeroPuro.length === 13) {
        try {
          const numeroSemNonoDigito = numeroPuro.substring(0, 4) + numeroPuro.substring(5);
          await whatsappClient.sendText(`${numeroSemNonoDigito}@c.us`, mensagem);
          console.log(`✅ [Sucesso Fallback] Mensagem entregue para: ${cliente.nome}`);
        } catch (errFallback) { console.error(`❌ Erro total na entrega para ${cliente.nome}`); }
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    ultimaDataEnvio = hojeDataCompleta;
  } catch (error) { console.error('❌ Erro na rotina de aniversariantes:', error); }
}

async function verificarPosVendaTrintaDias() {
  if (!whatsappClient) return;
  try {
    const estaConectado = await whatsappClient.isConnected();
    if (!estaConectado) return;
  } catch (err) { return; }

  const hoje = new Date();
  const hojeDataCompleta = hoje.toISOString().split('T')[0];
  if (ultimaDataPosVenda === hojeDataCompleta) return;

  const dataTrintaDiasAtras = new Date();
  dataTrintaDiasAtras.setDate(dataTrintaDiasAtras.getDate() - 30);
  const dataAlvoStr = dataTrintaDiasAtras.toISOString().split('T')[0];

  console.log(`🔄 [Automação] Buscando contratos de pós-venda fechados em: ${dataAlvoStr}`);

  try {
    const vendasTrintaDias = await Venda.find({ dataVenda: dataAlvoStr });

    if (vendasTrintaDias.length === 0) {
      console.log('📭 Nenhuma pendência de pós-venda para o dia de hoje.');
      ultimaDataPosVenda = hojeDataCompleta;
      return;
    }

    // ✅ Puxa o template salvo no MongoDB
    const configMsg = await Configuracao.findOne({ chave: 'msg_pos_venda' });
    const templateBase = configMsg ? configMsg.valor : "Olá, {nome}! Como está seu produto {produto}?";

    for (const venda of vendasTrintaDias) {
      const cadastroCliente = await Cliente.findOne({ cpf: venda.cpf });
      if (!cadastroCliente || !cadastroCliente.telefone) continue;

      let numeroPuro = cadastroCliente.telefone.replace(/\D/g, '');
      if (!numeroPuro.startsWith('55')) numeroPuro = `55${numeroPuro}`;

      // ✅ Aplica as duas tags dinâmicas de forma limpa
      const mensagem = templateBase
                        .replace(/{nome}/g, venda.cliente)
                        .replace(/{produto}/g, venda.produto);

      let envioSucesso = false;
      try {
        const infoNumero = await whatsappClient.checkNumberStatus(`${numeroPuro}@c.us`);
        const destinatarioValido = infoNumero?.id?._serialized || `${numeroPuro}@c.us`;
        await whatsappClient.sendText(destinatarioValido, mensagem);
        console.log(`✅ [Pós-Venda] Mensagem entregue para: ${venda.cliente}`);
        envioSucesso = true;
      } catch (err) { console.log(`⚠️ Falha primária no pós-venda de ${venda.cliente}`); }

      if (!envioSucesso && numeroPuro.length === 13) {
        try {
          const numeroSemNonoDigito = numeroPuro.substring(0, 4) + numeroPuro.substring(5);
          await whatsappClient.sendText(`${numeroSemNonoDigito}@c.us`, mensagem);
          console.log(`✅ [Pós-Venda Fallback] Mensagem entregue para: ${venda.cliente}`);
        } catch (errFallback) { console.error(`❌ Falha crítica no pós-venda de ${venda.cliente}`); }
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    ultimaDataPosVenda = hojeDataCompleta;
  } catch (error) { console.error('❌ Erro na rotina de pós-venda:', error); }
}

// Ciclo de verificação em background de 1 hora
setInterval(() => {
  verificarAniversariantesDoDia();
  verificarPosVendaTrintaDias();
}, 1000 * 60 * 60);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor da Ótica rodando na porta ${PORT}`));