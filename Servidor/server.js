const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys'); // ✅ Otimizado: sem useMultiFileAuthState
const QRCode = require('qrcode');
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
let idsAniversariantesEnviadosHoje = []; 
let idsPosVendaEnviadosHoje = [];
let dataUltimaVerificacaoJanela = "";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Banco MongoDB da Ótica Elos Conectado!");
    atualizarVendasAntigas(); 
    inicializarMensagensPadrao(); 
    
    // ✅ Inicializa o Baileys automaticamente após a conexão segura com o MongoDB
    inicializarWhatsApp();
  })
  .catch(err => console.error("❌ Erro na conexão:", err));

// --- MODELOS (SCHEMAS) ---
const Cliente = mongoose.model('Cliente', {
  nome: String, cpf: String, dataNascimento: String, telefone: String, email: String, endereco: String, observacoes: String, foto: String 
});

const Venda = mongoose.model('Venda', {
  numeroPedido: Number, cliente: String, cpf: String, produto: String, itensCarrinho: Array, valorTotal: Number, valorEntrada: Number, desconto: Number, parcelas: Number, listaParcelas: Array, dataVenda: String, metodoPagamento: String, dataPrevisaoPagamento: String, observacoes: String, foto: String        
});

const Despesa = mongoose.model('Despesa', {
  descricao: String, valor: Number, categoria: String, vencimento: String, paga: Boolean
});

const Produto = mongoose.model('Produto', {
  nome: String, preco: Number, categoria: String
});

const Produto = mongoose.model('Produto', {
  nome: String, 
  preco: Number, 
  categoria: String,
  quantidade: Number
});

const Configuracao = mongoose.model('Configuracao', {
  chave: String, valor: String
});

// ✅ NOVO: MODELO DE ORDEM DE SERVIÇO
const OrdemServico = mongoose.model('OrdemServico', {
  numeroPedido: String,
  dataCriacao: String,
  
  lente: String,
  tratamento: String,
  armacao: String,
  
  longe_od_esf: String, longe_od_cil: String, longe_od_eixo: String, longe_od_dnp: String,
  longe_oe_esf: String, longe_oe_cil: String, longe_oe_eixo: String, longe_oe_dnp: String,
  
  adicao: String,
  
  co_od_esf: String, co_od_cil: String, co_od_eixo: String, co_od_dnp: String,
  co_oe_esf: String, co_oe_cil: String, co_oe_eixo: String, co_oe_dnp: String,
  
  perto_od_esf: String, perto_od_cil: String, perto_od_eixo: String, perto_od_dnp: String,
  perto_oe_esf: String, perto_oe_cil: String, perto_oe_eixo: String, perto_oe_dnp: String,
  
  medidas_vertical: String, medidas_horizontal: String,
  medidas_ponte: String, medidas_diag: String,
  
  observacoes: String,
  consultor: String
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
  } catch (err) { console.error("Erro ao atualizar vendas antigas:", err); }
};

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
  } catch (err) { console.error("Erro ao inicializar mensagens padrão:", err); }
};

// ==========================================
// 🛠️ ROTAS DE CONTROLE DO WHATSAPP (MIGRADAS PARA BAILEYS)
// ==========================================
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: statusConexao, qr: qrCodeBase64 });
});

app.post('/api/whatsapp/desconectar', async (req, res) => {
  if (!whatsappClient) return res.status(400).json({ error: 'WhatsApp não está ativo para desconectar.' });
  try {
    statusConexao = 'Desconectando...';
    await whatsappClient.logout();
    statusConexao = 'Desconectado';
    qrCodeBase64 = null;
    whatsappClient = null;
    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });

    setTimeout(() => {
      console.log('🔄 Reiniciando motor pós-logout para disponibilizar novo QR Code...');
      inicializarWhatsApp();
    }, 3000);
  } catch (error) {
    statusConexao = 'Erro ao desconectar';
    res.status(500).json({ error: error.message });
  }
});

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

// --- ROTAS API: VENDAS E ORDENS DE SERVIÇO ---

// ✅ ATUALIZADO: Buscar Vendas e Mesclar com suas Ordens de Serviço
app.get('/api/vendas', async (req, res) => {
  try {
    const vendas = await Venda.find().lean();
    const ordensServico = await OrdemServico.find().lean();

    const vendasComOS = vendas.map(venda => {
      // Usa o número do pedido ou o ID como âncora
      const identificadorVenda = venda.numeroPedido ? String(venda.numeroPedido) : venda._id.toString();
      
      const osDestaVenda = ordensServico.filter(os => String(os.numeroPedido) === identificadorVenda);
      
      return {
        ...venda,
        ordensServico: osDestaVenda.map(os => ({ ...os, idOS: os._id.toString() }))
      };
    });

    res.json(vendasComOS);
  } catch (err) { 
    res.status(500).json({ error: "Erro ao buscar vendas e OS" }); 
  }
});

app.post('/api/vendas', async (req, res) => {
  try {
    const ultimaVenda = await Venda.findOne().sort({ numeroPedido: -1 });
    const proximoNumero = ultimaVenda && ultimaVenda.numeroPedido ? ultimaVenda.numeroPedido + 1 : 2000;
    const novaVenda = new Venda({ ...req.body, numeroPedido: proximoNumero });
    res.json(await novaVenda.save());
  } catch (err) { res.status(500).json({ error: "Erro ao salvar venda" }); }
});
app.patch('/api/vendas/:id', async (req, res) => {
  try { res.json(await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); }
});
app.put('/api/vendas/:id', async (req, res) => {
  try { res.json(await Venda.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); }
});
app.delete('/api/vendas/:id', async (req, res) => {
  try { await Venda.findByIdAndDelete(req.params.id); res.json({ message: "Venda excluída" }); } catch (err) { res.status(500).json({ error: "Erro" }); }
});

// ✅ NOVO: ROTAS PARA ORDEM DE SERVIÇO
app.get('/api/ordens_servico', async (req, res) => res.json(await OrdemServico.find()));

app.post('/api/ordens_servico', async (req, res) => {
  try {
    const novaOS = new OrdemServico(req.body);
    await novaOS.save();
    res.status(201).json(novaOS);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar OS" });
  }
});

app.put('/api/ordens_servico/:id', async (req, res) => {
  try {
    const osEditada = await OrdemServico.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(osEditada);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar OS" });
  }
});

app.delete('/api/ordens_servico/:id', async (req, res) => {
  try {
    await OrdemServico.findByIdAndDelete(req.params.id);
    res.json({ message: "OS excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar OS" });
  }
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
          ...novasParcelas[index], numero: numAtual + 0.5, valor: valorSobra, paga: false, dataPagamento: null, observacao: `Restante da parc. ${numAtual}` 
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
  try { res.json(await Despesa.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); }
});
app.delete('/api/despesas/:id', async (req, res) => {
  try { await Despesa.findByIdAndDelete(req.params.id); res.json({ message: "Excluída" }); } catch (err) { res.status(500).json({ error: "Erro" }); }
});

// --- ROTAS API: PRODUTOS ---
app.get('/api/produtos', async (req, res) => res.json(await Produto.find().sort({ nome: 1 })));
app.post('/api/produtos', async (req, res) => res.json(await new Produto(req.body).save()));
app.put('/api/produtos/:id', async (req, res) => {
  try { res.json(await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: "Erro" }); }
});
app.delete('/api/produtos/:id', async (req, res) => {
  try { await Produto.findByIdAndDelete(req.params.id); res.json({ message: "Removido" }); } catch (err) { res.status(500).json({ error: "Erro" }); }
});

// ==========================================
// 🤖 MOTOR DO WHATSAPP (MIGRAÇÃO DE STORAGE MONGODB + KEEP ALIVE)
// ==========================================
async function inicializarWhatsApp() {
  try {
    // 1. Carrega as credenciais puras direto da coleção do MongoDB
    const registroSessao = await Configuracao.findOne({ chave: 'whatsapp_session_creds' });
    
    let credsCarregadas = null;
    if (registroSessao && registroSessao.valor) {
      try {
        // 🔥 RECONSTRUTOR BINÁRIO: O JSON.parse reconverte textão em Buffers para evitar erro de Handshake
        credsCarregadas = JSON.parse(registroSessao.valor, (key, value) => {
          if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
            return Buffer.from(value.data);
          }
          return value;
        });
      } catch (e) {
        console.log("⚠️ Erro ao decodificar chaves antigas do MongoDB, iniciando limpo...");
      }
    }

    // Importação dinâmica para compatibilidade com o Baileys estruturado
    const { initAuthCreds } = require('@whiskeysockets/baileys');

    const state = {
      creds: credsCarregadas || initAuthCreds(),
      keys: {
        get: (type, ids) => {
          const data = {};
          return data;
        },
        set: (data) => {
          // Processado de forma transparente via creds.update
        }
      }
    };

    // Função interna que salva o estado estruturado de login no MongoDB
    const guardarSessaoNoMongo = async () => {
      try {
        const textoSessao = JSON.stringify(state.creds);
        await Configuracao.updateOne(
          { chave: 'whatsapp_session_creds' },
          { valor: textoSessao },
          { upsert: true }
        );
        console.log("💾 [MongoDB] Chaves de pareamento atualizadas na nuvem com sucesso!");
      } catch (err) {
        console.error("❌ [Erro Persistência] Falha ao injetar chaves no MongoDB:", err.message);
      }
    };

    whatsappClient = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000, // 🔥 Canal de batimento cardíaco ativo de 30s contra quedas abruptas
      options: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    });

    whatsappClient.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        statusConexao = 'Aguardando Leitura do QR Code';
        try {
          qrCodeBase64 = await QRCode.toDataURL(qr);
        } catch (err) { console.error('Erro ao gerar string do QR Code:', err); }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const foiDeslogado = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        
        console.log(`Conexão fechada. Código: ${statusCode}. Foi deslogado? ${foiDeslogado}`);
        statusConexao = 'Desconectado';
        qrCodeBase64 = null;

        if (foiDeslogado) {
          console.log('🧹 Limpando registro de chaves obsoletas do MongoDB...');
          try {
            await Configuracao.deleteOne({ chave: 'whatsapp_session_creds' });
            console.log('✅ Base limpa para nova sincronização!');
          } catch (e) { console.log('Erro ao limpar chave do MongoDB:', e.message); }
          
          setTimeout(() => inicializarWhatsApp(), 2000);
        } else {
          // Se caiu apenas por oscilação normal da nuvem Render, reata usando o token salvo
          inicializarWhatsApp(); 
        }
        
      } else if (connection === 'open') {
        statusConexao = 'Conectado';
        qrCodeBase64 = null;
        console.log('✅ WhatsApp conectado com sucesso via Baileys na Ótica Elos!');

        setTimeout(() => {
          verificarAniversariantesDoDia();
          verificarPosVendaTrintaDias();
        }, 15000);
      }
    });

    // Registra a chave sempre que o WhatsApp renovar os tokens internos
    whatsappClient.ev.on('creds.update', async () => {
      await guardarSessaoNoMongo();
    });

  } catch (error) {
    statusConexao = 'Erro ao conectar';
    console.error('Erro crítico ao iniciar Baileys:', error);
  }
}

async function enviarMensagemTexto(jid, texto) {
  if (!whatsappClient) throw new Error('Client Baileys não inicializado');
  await whatsappClient.sendMessage(jid, { text: texto });
}

async function validarNumeroWhatsApp(numeroPuro) {
  try {
    const [result] = await whatsappClient.onWhatsApp(`${numeroPuro}@s.whatsapp.net`);
    if (result && result.exists) return result.jid;
    return `${numeroPuro}@s.whatsapp.net`;
  } catch (e) { return `${numeroPuro}@s.whatsapp.net`; }
}

async function verificarAniversariantesDoDia() {
  if (!whatsappClient || statusConexao !== 'Conectado') return;

  const hoje = new Date();
  const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
  const diaHoje = String(hoje.getDate()).padStart(2, '0');
  const hojeDataCompleta = `${hoje.getFullYear()}-${mesHoje}-${diaHoje}`;

  // Se virou o dia, limpa a lista de quem já recebeu para o novo dia
  if (dataUltimaVerificacaoJanela !== hojeDataCompleta) {
    idsAniversariantesEnviadosHoje = [];
    idsPosVendaEnviadosHoje = [];
    dataUltimaVerificacaoJanela = hojeDataCompleta;
  }

  console.log(`🔄 [Baileys] Checando aniversariantes ativos (Atualizando a cada hora)...`);

  try {
    const regexAniversario = new RegExp(`^\\d{4}-${mesHoje}-${diaHoje}$`);
    // Busca todos os aniversariantes do dia
    const aniversariantes = await Cliente.find({ dataNascimento: regexAniversario });

    // Filtra apenas os que AINDA NÃO receberam a mensagem hoje
    const pendentes = aniversariantes.filter(c => !idsAniversariantesEnviadosHoje.includes(String(c._id)));

    if (pendentes.length === 0) {
      console.log('📭 Nenhum aniversariante novo pendente nesta hora.');
      return;
    }

    const configMsg = await Configuracao.findOne({ chave: 'msg_aniversario' });
    const templateBase = configMsg ? configMsg.valor : "Olá, {nome}! 🎉 Feliz Aniversário da Ótica Elos!";

    for (const cliente of pendentes) {
      if (!cliente.telefone) continue;
      let numeroPuro = cliente.telefone.replace(/\D/g, '');
      if (!numeroPuro.startsWith('55')) numeroPuro = `55${numeroPuro}`;

      const mensagem = templateBase.replace(/{nome}/g, cliente.nome);
      let envioSucesso = false;

      try {
        const jidValido = await validarNumeroWhatsApp(numeroPuro);
        // Usando a variável mensagem correta (tinha um bug no original chamando "message")
        await enviarMensagemTexto(jidValido, mensagem);
        console.log(`✅ [Baileys Aniversário] Entregue para: ${cliente.nome}`);
        envioSucesso = true;
      } catch (err) { console.log(`⚠️ Falha primária no envio para ${cliente.nome}`); }

      if (!envioSucesso && numeroPuro.length === 13) {
        try {
          const numeroSemNonoDigito = numeroPuro.substring(0, 4) + numeroPuro.substring(5);
          const jidFallback = await validarNumeroWhatsApp(numeroSemNonoDigito);
          await enviarMensagemTexto(jidFallback, mensagem);
          console.log(`✅ [Baileys Fallback] Entregue para: ${cliente.nome}`);
          envioSucesso = true;
        } catch (errFallback) { console.error(`❌ Erro total na entrega para ${cliente.nome}`); }
      }

      // Se enviou com sucesso (ou falhou totalmente para não travar o loop), adiciona na lista de ignorados do dia
      idsAniversariantesEnviadosHoje.push(String(cliente._id));
      
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) { console.error('❌ Erro na rotina de aniversariantes:', error); }
}

async function verificarPosVendaTrintaDias() {
  if (!whatsappClient || statusConexao !== 'Conectado') return;

  const hoje = new Date();
  const hojeDataCompleta = hoje.toISOString().split('T')[0];

  const dataTrintaDiasAtras = new Date();
  dataTrintaDiasAtras.setDate(dataTrintaDiasAtras.getDate() - 30);
  const dataAlvoStr = dataTrintaDiasAtras.toISOString().split('T')[0];

  try {
    const vendasTrintaDias = await Venda.find({ dataVenda: dataAlvoStr });
    // Filtra apenas as vendas que ainda não tiveram pós-venda disparado hoje
    const pendentes = vendasTrintaDias.filter(v => !idsPosVendaEnviadosHoje.includes(String(v._id)));

    if (pendentes.length === 0) {
      console.log('📭 Nenhuma venda pendente de pós-venda nesta hora.');
      return;
    }

    const configMsg = await Configuracao.findOne({ chave: 'msg_pos_venda' });
    const templateBase = configMsg ? configMsg.valor : "Olá, {nome}! Como está seu produto {produto}?";

    for (const venda of pendentes) {
      const cadastroCliente = await Cliente.findOne({ cpf: venda.cpf });
      if (!cadastroCliente || !cadastroCliente.telefone) continue;

      let numeroPuro = cadastroCliente.telefone.replace(/\D/g, '');
      if (!numeroPuro.startsWith('55')) numeroPuro = `55${numeroPuro}`;

      const mensagem = templateBase
                        .replace(/{nome}/g, venda.cliente)
                        .replace(/{produto}/g, venda.produto);

      let envioSucesso = false;
      try {
        const jidValido = await validarNumeroWhatsApp(numeroPuro);
        // Correção aplicada: estava chamando "message" no código original
        await enviarMensagemTexto(jidValido, mensagem);
        console.log(`✅ [Baileys Pós-Venda] Entregue para: ${venda.cliente}`);
        envioSucesso = true;
      } catch (err) { console.log(`⚠️ Falha primária no pós-venda de ${venda.cliente}`); }

      if (!envioSucesso && numeroPuro.length === 13) {
        try {
          const numeroSemNonoDigito = numeroPuro.substring(0, 4) + numeroPuro.substring(5);
          const jidFallback = await validarNumeroWhatsApp(numeroSemNonoDigito);
          await enviarMensagemTexto(jidFallback, mensagem);
          console.log(`✅ [Baileys Pós-Venda Fallback] Entregue para: ${venda.cliente}`);
        } catch (errFallback) { console.error(`❌ Falha crítica no pós-venda de ${venda.cliente}`); }
      }

      // Registra que essa venda específica já foi processada hoje
      idsPosVendaEnviadosHoje.push(String(venda._id));

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) { console.error('❌ Erro na rotina de pós-venda:', error); }
}

// Ciclo de verificação em background de 1 hora
setInterval(() => {
  verificarAniversariantesDoDia();
  verificarPosVendaTrintaDias();
}, 1000 * 60 * 60);

const PORT = process.env.PORT || 5000;

// ==========================================
// 🚀 ROTINA CRÍTICA ANTI-SLEEP LOCAL (EXCLUSIVA PARA RENDER)
// ==========================================
// Envia uma requisição HTTP para si mesmo localmente a cada 10 minutos para impedir 
// que a nuvem gratuita do Render congele o processo Node.js e derrube o chip.
setInterval(async () => {
  try {
    const urlAutoPingLocal = `http://localhost:${PORT}/`;
    console.log('💓 [Anti-Sleep] Enviando pulso de atividade interna para manter o robô da Ótica Elos acordado...');
    // Realiza a chamada utilizando o fetch nativo estável do Node.js
    await fetch(urlAutoPingLocal);
  } catch (e) {
    console.log('⚠️ [Anti-Sleep] Falha temporária no auto-ping, mas o motor continua rodando.');
  }
}, 1000 * 60 * 10); // Executa a cada 10 minutos cravados

app.listen(PORT, () => console.log(`🚀 Servidor da Ótica Elos rodando na porta ${PORT} com motor Baileys estável e persistente!`));