import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// ==========================================
// FUNÇÃO AUXILIAR PARA IMAGENS
// ==========================================
const carregarImagem = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

const formatarMoedaPDF = (valor) => {
  return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
};

// ==========================================
// 🟢 MOTOR DE PIX (PADRÃO BANCO CENTRAL)
// ==========================================
const gerarPayloadPix = (chave, valor) => {
  const nome = "OTICA ELOS";
  const cidade = "FORTALEZA";
  
  let limpa = String(chave).trim();
  let chavePronta = limpa;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpa);
  const isAleatoria = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpa);

  if (!isEmail && !isAleatoria) {
    const num = limpa.replace(/\D/g, '');
    
    if (num.length === 11) {
      if (limpa.includes('.')) {
        chavePronta = num; 
      } else if (num[2] === '9' || limpa.includes('(')) {
        chavePronta = '+55' + num;
      } else {
        chavePronta = num;
      }
    } else if (num.length === 14) {
      chavePronta = num;
    } else if (num.length === 10) {
      chavePronta = '+55' + num;
    } else if (num.length >= 12 && num.startsWith('55')) {
      chavePronta = '+' + num;
    } else {
      chavePronta = num;
    }
  }

  let p = "000201";
  const acc = `0014br.gov.bcb.pix01${String(chavePronta.length).padStart(2, '0')}${chavePronta}`;
  p += `26${String(acc.length).padStart(2, '0')}${acc}`;
  p += "52040000";
  p += "5303986";
  
  if (valor > 0) {
    const valStr = Number(valor).toFixed(2);
    p += `54${String(valStr.length).padStart(2, '0')}${valStr}`; 
  }
  
  p += "5802BR";
  p += `59${String(nome.length).padStart(2, '0')}${nome}`;
  p += `60${String(cidade.length).padStart(2, '0')}${cidade}`;
  p += "62070503***";
  p += "6304";

  let crc = 0xFFFF;
  for (let i = 0; i < p.length; i++) {
    crc ^= p.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  
  return p + crcHex;
};

// ==========================================
// 1. RECIBO E PEDIDO (LAYOUT ANTI-SOBREPOSIÇÃO)
// ==========================================
export const gerarPDFDocumento = async (dados, tipo = 'recibo') => {
  const doc = new jsPDF();
  const margemEsq = 20;
  const margemDir = 190;
  const larguraUtil = 170;
  const verdeElos = [29, 48, 38]; // Verde escuro institucional
  const douradoElos = [197, 168, 128];
  let y = 18;

  const logoImg = await carregarImagem("/favicon.png");

  // --- CABEÇALHO DA EMPRESA ---
  if (logoImg) {
    doc.addImage(logoImg, "PNG", margemEsq, 14, 18, 18);
  }
  
  const xTextoEmpresa = logoImg ? 42 : margemEsq;
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Ótica Elos", xTextoEmpresa, 20);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("52.294.947 ANDERSON SOARES DA SILVA", xTextoEmpresa, 25);
  doc.text("CNPJ: 52.294.947/0001-56", xTextoEmpresa, 29.5);
  doc.text("Rua Viriato Ribeiro, 321, Bela Vista, Fortaleza-CE | CEP 60442-642", xTextoEmpresa, 34);

  // Contatos alinhados à direita para nunca colidir com o razão social
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Criando um elo com você!", margemDir, 20, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("oticaelos@hotmail.com", margemDir, 25, { align: "right" });
  doc.text("+55 (85) 8550-6571", margemDir, 29.5, { align: "right" });
  doc.text("@oticaelos", margemDir, 34, { align: "right" });

  y = 40;
  doc.setDrawColor(douradoElos[0], douradoElos[1], douradoElos[2]);
  doc.setLineWidth(0.5);
  doc.line(margemEsq, y, margemDir, y);

  // --- FAIXA DE TÍTULO DO DOCUMENTO ---
  y += 6;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.roundedRect(margemEsq, y, larguraUtil, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  
  const txtT = tipo === "recibo" ? "RECIBO DE PAGAMENTO" : "PEDIDO COM GARANTIA";
  const numeroExibicao = dados.numeroPedido || dados.numero || "S/N";
  doc.text(`${txtT} #${numeroExibicao}`, margemEsq + 5, y + 7.3);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dataDoc = dados.dataRecibo || dados.data || new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${dataDoc}`, margemDir - 5, y + 7.3, { align: "right" });

  // --- QUADRO DE DADOS DO CLIENTE ---
  y += 16;
  const nCli = (dados.cliente || "CLIENTE").toUpperCase();
  const nomeClienteLinhas = doc.splitTextToSize(nCli, 162);
  const enderecoLinhas = doc.splitTextToSize(`Endereço: ${dados.endereco || "Não informado"}`, 162);
  const alturaCaixaCliente = 18 + (nomeClienteLinhas.length * 5) + (enderecoLinhas.length * 4.5);

  doc.setFillColor(249, 248, 246);
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.3);
  doc.roundedRect(margemEsq, y, larguraUtil, alturaCaixaCliente, 2, 2, "FD");

  let yCli = y + 6;
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text(nomeClienteLinhas, margemEsq + 4, yCli);
  yCli += (nomeClienteLinhas.length * 5) + 1;

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  
  const cpfTrunc = String(dados.cpf || "Não informado").substring(0, 25);
  const telTrunc = String(dados.telefone || "Não informado").substring(0, 25);
  doc.text(`CPF: ${cpfTrunc}`, margemEsq + 4, yCli);
  doc.text(`Telefone: ${telTrunc}`, 115, yCli);
  
  yCli += 5;
  const emailTrunc = String(dados.email || "Não informado").substring(0, 65);
  doc.text(`E-mail: ${emailTrunc}`, margemEsq + 4, yCli);
  
  yCli += 5;
  doc.text(enderecoLinhas, margemEsq + 4, yCli);

  y += alturaCaixaCliente + 6;

  // --- CABEÇALHO DA TABELA DE ITENS ---
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, larguraUtil, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(tipo === "recibo" ? "Descrição do Recebimento" : "Descrição dos Produtos / Serviços", margemEsq + 4, y + 5.5);
  doc.text("Valor", margemDir - 4, y + 5.5, { align: "right" });

  y += 8;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const itens = dados.itensCarrinho && dados.itensCarrinho.length > 0
    ? dados.itensCarrinho
    : [{ nome: dados.produto || "PRODUTO ÓPTICO", preco: Number(dados.valorProduto || dados.valorTotal || 0) }];
  
  itens.forEach((item, index) => {
    let nomeItem = String(item.nome || "ITEM").toUpperCase();
    if (item.descontoItem && Number(item.descontoItem) > 0) {
      nomeItem += ` (Desc. item: -${formatarMoedaPDF(item.descontoItem)})`;
    }

    const precoItem = formatarMoedaPDF(item.preco);
    // Largura máxima 120mm (de x=24 até x=144), deixando 42mm livres para o preço na direita
    const nomeQuebrado = doc.splitTextToSize(nomeItem, 120);
    const alturaLinha = Math.max(8, (nomeQuebrado.length * 4.8) + 3.5);

    if (y + alturaLinha > 265) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 !== 0) {
      doc.setFillColor(246, 246, 246);
      doc.rect(margemEsq, y, larguraUtil, alturaLinha, "F");
    }

    doc.setDrawColor(235, 235, 235);
    doc.line(margemEsq, y + alturaLinha, margemDir, y + alturaLinha);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(nomeQuebrado, margemEsq + 4, y + 5.2);

    doc.setFont("helvetica", "bold");
    doc.text(precoItem, margemDir - 4, y + 5.2, { align: "right" });
    
    y += alturaLinha;
  });

  y += 6;

  // Verifica se o bloco de resumo cabe na página atual
  if (y + 55 > 275) {
    doc.addPage();
    y = 25;
  }

  // --- BLOCO DE FORMA DE PAGAMENTO (ESQUERDA) E TOTAIS (DIREITA) ---
  const yInicioResumo = y;

  // Coluna Esquerda: Forma de Pagamento (x = 20 até x = 90)
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("FORMA DE PAGAMENTO", margemEsq, yInicioResumo + 5);
  
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const pgtoInfo = tipo === "pedido" 
    ? `${dados.metodoPagamento || "Dinheiro"} ${dados.parcelas > 1 ? `(${dados.parcelas}x)` : "(À vista)"}` 
    : (dados.metodoPagamento || "Dinheiro");
  const pgtoLinhas = doc.splitTextToSize(pgtoInfo, 70);
  doc.text(pgtoLinhas, margemEsq, yInicioResumo + 11);

  // Coluna Direita: Resumo Financeiro (x = 95 até x = 190 -> 95mm de largura livre!)
  const xLabelTotais = 98;
  const xValorTotais = margemDir - 4;
  let yTot = yInicioResumo;

  const vTotalNum = Number(dados.valorTotal || 0);
  const vDescNum = Number(dados.desconto || dados.valorDesconto || 0);
  const subtotal = vTotalNum + vDescNum;

  if (tipo === "pedido") {
    const vEntradaNum = Number(dados.valorEntrada || 0);
    const numLinhasResumo = vEntradaNum > 0 ? 5 : 4;
    const alturaBoxResumo = (numLinhasResumo * 6.5) + 8;

    doc.setFillColor(249, 248, 246);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(95, yTot, 95, alturaBoxResumo, 2, 2, "FD");

    yTot += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text("Subtotal:", xLabelTotais, yTot);
    doc.text(formatarMoedaPDF(subtotal), xValorTotais, yTot, { align: "right" });
    
    yTot += 6;
    doc.setTextColor(198, 40, 40); 
    doc.text("Desconto Geral:", xLabelTotais, yTot);
    doc.text("- " + formatarMoedaPDF(vDescNum), xValorTotais, yTot, { align: "right" });
    
    yTot += 6.5;
    doc.setDrawColor(210, 210, 210);
    doc.line(xLabelTotais, yTot - 4, xValorTotais, yTot - 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const totalFinal = subtotal - vDescNum;
    doc.text("TOTAL DO PEDIDO:", xLabelTotais, yTot);
    doc.text(formatarMoedaPDF(totalFinal), xValorTotais, yTot, { align: "right" });

    if (vEntradaNum > 0) {
      yTot += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.text("Sinal / Entrada Acordada:", xLabelTotais, yTot);
      doc.text(formatarMoedaPDF(vEntradaNum), xValorTotais, yTot, { align: "right" });
    }

    const hojeIso = new Date().toISOString().split('T')[0];
    const dataVendaObj = dados.dataVenda || hojeIso;

    const totalPago = (dados.listaParcelas || []).filter(p => {
      if (p.numero === 0 && (p.dataVencimento || dataVendaObj) > hojeIso && !p.dataPagamento) {
        return false;
      }
      return p.paga;
    }).reduce((acc, p) => acc + Number(p.valor || 0), 0);

    const saldoDevedor = Math.max(0, totalFinal - totalPago);

    yTot += 6;
    doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Total Já Recebido:", xLabelTotais, yTot);
    doc.text(formatarMoedaPDF(totalPago), xValorTotais, yTot, { align: "right" });

    yTot += 7.5;
    doc.setDrawColor(210, 210, 210);
    doc.line(xLabelTotais, yTot - 5, xValorTotais, yTot - 5);

    if (saldoDevedor > 0.01) {
      doc.setTextColor(198, 40, 40);
      doc.setFontSize(10.5);
      doc.text("SALDO DEVEDOR:", xLabelTotais, yTot);
      doc.text(formatarMoedaPDF(saldoDevedor), xValorTotais, yTot, { align: "right" });
    } else {
      doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
      doc.setFontSize(10.5);
      doc.text("STATUS DO PEDIDO:", xLabelTotais, yTot);
      doc.text("QUITADO / PAGO", xValorTotais, yTot, { align: "right" });
    }

    y = yTot + 10;
  } else {
    // MODO RECIBO
    doc.setFillColor(242, 247, 244);
    doc.setDrawColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.roundedRect(95, yTot, 95, 14, 2, 2, "FD");

    doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("VALOR RECEBIDO:", xLabelTotais, yTot + 9);
    doc.text(formatarMoedaPDF(vTotalNum), xValorTotais, yTot + 9, { align: "right" });

    y = yTot + 22;
  }

  // --- FUNÇÃO DE ASSINATURAS (ANTI-SOBREPOSIÇÃO DE NOMES LONGOS) ---
  const desenharAssinaturas = (posY) => {
    if (posY > 250) {
      doc.addPage();
      posY = 40;
    }
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.line(margemEsq, posY, 95, posY);
    doc.line(115, posY, margemDir, posY);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Ótica Elos (Anderson Soares)", 57.5, posY + 5, { align: "center" });

    // Quebra o nome do cliente se for muito grande para não invadir a assinatura da esquerda
    const nomeAssinatura = doc.splitTextToSize(nCli, 73);
    doc.text(nomeAssinatura, 152.5, posY + 5, { align: "center" });

    const offsetExtra = (nomeAssinatura.length - 1) * 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Fortaleza - CE, ${dataDoc}`, 105, posY + 15 + offsetExtra, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(140, 140, 140);
    doc.text("Obrigado por construir esse elo conosco.", 105, posY + 21 + offsetExtra, { align: "center" });
  };

  if (tipo === "recibo") {
    const posAssinaturaRecibo = Math.max(y + 25, 235);
    desenharAssinaturas(posAssinaturaRecibo);
  }

  if (tipo === "pedido") {
    doc.addPage();
    doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.roundedRect(margemEsq, 20, larguraUtil, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TERMO E CONDIÇÕES DE GARANTIA", margemEsq + 5, 26.8);
    
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    const clausulas = [
      { t: "Período de Garantia", b: true },
      { t: "180 dias a contar da data da compra/entrega.", b: false },
      { t: "", b: false },
      { t: "1. Cobertura de Garantia", b: true },
      { t: "1.1 A garantia cobre exclusivamente os serviços de manutenção e ajuste de óculos fornecidos pela ótica.", b: false },
      { t: "1.2 A garantia inclui a substituição de parafusos, plaquetas e ajustes de armação sem custo adicional.", b: false },
      { t: "1.3 A garantia cobre a verificação e ajuste da prescrição óptica conforme necessário.", b: false },
      { t: "", b: false },
      { t: "2. Exclusões de Garantia", b: true },
      { t: "2.1 A garantia não cobre danos causados por mau uso, quedas, exposição ao calor excessivo, produtos químicos ou acidentes.", b: false },
      { t: "2.2 A garantia não se aplica a serviços ou consertos realizados por terceiros não autorizados pela Ótica Elos.", b: false },
      { t: "2.3 A garantia não cobre alterações na prescrição óptica devido a mudanças na visão do cliente após a prestação do serviço inicial.", b: false },
      { t: "", b: false },
      { t: "3. Procedimentos de Garantia", b: true },
      { t: "3.1 Em caso de defeito coberto pela garantia, a ótica realizará os reparos necessários sem custo adicional.", b: false },
      { t: "3.2 Se os reparos não forem possíveis, a ótica poderá, a seu critério, oferecer substituição por item equivalente.", b: false },
      { t: "", b: false },
      { t: "4. Reclamações e Validação", b: true },
      { t: "4.1 Para acionar a garantia, o cliente deve apresentar este documento original.", b: false },
      { t: "4.2 Todas as solicitações devem ser feitas diretamente na loja física da Ótica Elos.", b: false },
      { t: "4.3 O cliente deve notificar a ótica sobre qualquer problema coberto dentro de um prazo razoável após a descoberta do defeito.", b: false },
      { t: "", b: false },
      { t: "5. Limitações Gerais", b: true },
      { t: "5.1 A garantia é limitada aos itens especificados neste pedido e não cobre custos extras incorridos pelo cliente.", b: false },
      { t: "5.2 A garantia é pessoal e intransferível, válida apenas para o titular contratante.", b: false },
    ];

    let yG = 38;
    clausulas.forEach(item => {
      if (item.t === "") { yG += 3.5; return; }
      doc.setFont("helvetica", item.b ? "bold" : "normal");
      const splitLinha = doc.splitTextToSize(item.t, larguraUtil);
      doc.text(splitLinha, margemEsq, yG);
      yG += (splitLinha.length * 5.2);
    });

    desenharAssinaturas(yG + 18);
  }

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

// ==========================================
// 2. RELATÓRIO DE SAÚDE FINANCEIRA
// ==========================================
export const gerarPDFSaudeFinanceira = (dadosRelatorio, periodo) => {
  const doc = new jsPDF();
  const verdeElos = [29, 48, 38];
  const margemEsq = 20;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ótica Elos - Saúde Financeira", 105, y, { align: "center" });
  
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Período Analisado: " + periodo.inicio + " até " + periodo.fim, 105, y, { align: "center" });

  y += 12;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRADAS (Recebimentos)", margemEsq + 3, y + 5.5);
  
  y += 13;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text("Origem / Cliente", margemEsq, y);
  doc.text("Valor", 185, y, { align: "right" });
  y += 2;
  doc.line(margemEsq, y, 190, y);
  y += 6;

  dadosRelatorio.entradas.forEach(item => {
    doc.text(String(item.nome || "").substring(0, 55), margemEsq, y);
    doc.text(formatarMoedaPDF(item.valor), 185, y, { align: "right" });
    y += 6;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  y += 8;
  doc.setFillColor(198, 40, 40);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("SAÍDAS (Despesas Pagas)", margemEsq + 3, y + 5.5);

  y += 13;
  doc.setTextColor(0, 0, 0);
  doc.text("Descrição", margemEsq, y);
  doc.text("Valor", 185, y, { align: "right" });
  y += 2;
  doc.line(margemEsq, y, 190, y);
  y += 6;

  dadosRelatorio.saidas.forEach(item => {
    doc.text(String(item.nome || "").substring(0, 55), margemEsq, y);
    doc.text("- " + formatarMoedaPDF(item.valor), 185, y, { align: "right" });
    y += 6;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  y += 12;
  if (y + 30 > 280) { doc.addPage(); y = 20; }

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margemEsq, y, 170, 26, 2, 2, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10.5);
  doc.text("Total de Entradas:", margemEsq + 5, y + 7);
  doc.text(formatarMoedaPDF(dadosRelatorio.totalEntradas), 185, y + 7, { align: "right" });
  
  doc.text("Total de Saídas:", margemEsq + 5, y + 14);
  doc.setTextColor(198, 40, 40);
  doc.text("- " + formatarMoedaPDF(dadosRelatorio.totalSaidas), 185, y + 14, { align: "right" });
  
  const saldo = dadosRelatorio.totalEntradas - dadosRelatorio.totalSaidas;
  doc.setTextColor(saldo >= 0 ? verdeElos[0] : 198, saldo >= 0 ? verdeElos[1] : 40, saldo >= 0 ? verdeElos[2] : 40);
  doc.setFont("helvetica", "bold");
  doc.text("LUCRO / SALDO LÍQUIDO REAL:", margemEsq + 5, y + 22);
  doc.text(formatarMoedaPDF(saldo), 185, y + 22, { align: "right" });

  doc.save("Saude_Financeira_" + periodo.inicio.replace(/\//g, '-') + ".pdf");
};

// ==========================================
// 3. ORDEM DE SERVIÇO
// ==========================================
export const gerarPDFOrdemServico = async (dados) => {
  const doc = new jsPDF();
  const margemEsq = 20;
  let y = 12; 

  const logoImg = await carregarImagem("/favicon.png");

  if (logoImg) {
    doc.addImage(logoImg, "PNG", margemEsq, 6, 12, 12);
  }
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEM DE SERVIÇO ÓPTICO", 105, 12, { align: "center" });
  
  doc.setFontSize(12);
  const numeroOS = dados.numeroOS || dados.numeroPedido || dados.numero || "________";
  doc.text(`OS Nº ${numeroOS}`, 190, 12, { align: "right" });

  y = 22;
  
  doc.setFillColor(210, 210, 210);
  doc.rect(margemEsq, y, 170, 6, "F");
  doc.setFontSize(9);
  doc.text("DADOS DA RX", 105, y + 4.2, { align: "center" });
  doc.rect(margemEsq, y, 170, 6); 
  
  y += 6;
  const linhasSuperiores = [
    { label: "LENTE:", valor: dados.lente || "" },
    { label: "TRATAMENTO:", valor: dados.tratamento || "" },
    { label: "ARMAÇÃO:", valor: dados.armacao || "" }
  ];
  
  doc.setFontSize(8);
  linhasSuperiores.forEach(linha => {
    doc.rect(margemEsq, y, 170, 6);
    doc.setFont("helvetica", "bold");
    doc.text(linha.label, margemEsq + 2, y + 4.2);
    doc.setFont("helvetica", "normal");
    doc.text(String(linha.valor).toUpperCase().substring(0, 75), margemEsq + 30, y + 4.2);
    y += 6;
  });

  doc.rect(margemEsq, y, 170, 6);
  doc.setFont("helvetica", "bold");
  doc.text("RX", 37.5, y + 4.2, { align: "center" });
  doc.text("ESF", 70, y + 4.2, { align: "center" });
  doc.text("CIL", 100, y + 4.2, { align: "center" });
  doc.text("EIXO", 130, y + 4.2, { align: "center" });
  doc.text("DNP LONGE", 167.5, y + 4.2, { align: "center" });
  
  y += 6;
  const rowH = 6; 
  
  doc.rect(margemEsq, y, 170, 7 * rowH);
  for(let i=1; i<7; i++) { doc.line(margemEsq, y + (i*rowH), 190, y + (i*rowH)); }
  
  doc.line(40, y, 40, y + (7 * rowH)); 
  doc.line(55, y, 55, y + (7 * rowH)); 
  doc.line(85, y, 85, y + (7 * rowH)); 
  doc.line(115, y, 115, y + (7 * rowH)); 
  doc.line(145, y, 145, y + (7 * rowH)); 
  
  doc.setFillColor(255, 255, 255);
  doc.rect(20.2, y + 0.2, 19.6, 11.6, "F"); 
  doc.rect(20.2, y + 18.2, 19.6, 11.6, "F"); 
  doc.rect(20.2, y + 30.2, 19.6, 11.6, "F"); 
  doc.rect(85.2, y + 18.2, 104.6, 11.6, "F"); 
  
  doc.rect(20.2, y + 12.2, 34.6, 5.6, "F"); 
  doc.rect(55.2, y + 12.2, 134.6, 5.6, "F"); 
  
  doc.setDrawColor(0, 0, 0);
  doc.line(115, y + 18, 115, y + 30); 
  doc.line(152.5, y + 18, 152.5, y + 30); 
  doc.line(115, y + 24, 190, y + 24); 

  doc.setFont("helvetica", "bold");
  doc.text("LONGE:", 30, y + 7.5, { align: "center" });
  doc.text("ADIÇÃO:", 37.5, y + 16.5, { align: "center" });
  doc.text("CO:", 30, y + 25.5, { align: "center" });
  doc.text("PERTO:", 30, y + 37.5, { align: "center" });
  
  doc.text("OD", 47.5, y + 4.5, { align: "center" });
  doc.text("OE", 47.5, y + 10.5, { align: "center" });
  doc.text("OD", 47.5, y + 22.5, { align: "center" });
  doc.text("OE", 47.5, y + 28.5, { align: "center" });
  doc.text("OD", 47.5, y + 34.5, { align: "center" });
  doc.text("OE", 47.5, y + 40.5, { align: "center" });
  
  doc.setFontSize(7);
  doc.text("MEDIDAS", 100, y + 22.5, { align: "center" });
  doc.text("DA ARMAÇÃO", 100, y + 27.5, { align: "center" });

  doc.setFontSize(6);
  doc.text("VERT.:", 117, y + 22);
  doc.text("PONTE.:", 117, y + 28);
  doc.text("HORIZ.:", 154, y + 22);
  doc.text("DIAG.:", 154, y + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if(dados.longe_od_esf) doc.text(String(dados.longe_od_esf), 70, y + 4.5, { align: "center" });
  if(dados.longe_od_cil) doc.text(String(dados.longe_od_cil), 100, y + 4.5, { align: "center" });
  if(dados.longe_od_eixo) doc.text(String(dados.longe_od_eixo), 130, y + 4.5, { align: "center" });
  if(dados.longe_od_dnp) doc.text(String(dados.longe_od_dnp), 167.5, y + 4.5, { align: "center" });

  if(dados.longe_oe_esf) doc.text(String(dados.longe_oe_esf), 70, y + 10.5, { align: "center" });
  if(dados.longe_oe_cil) doc.text(String(dados.longe_oe_cil), 100, y + 10.5, { align: "center" });
  if(dados.longe_oe_eixo) doc.text(String(dados.longe_oe_eixo), 130, y + 10.5, { align: "center" });
  if(dados.longe_oe_dnp) doc.text(String(dados.longe_oe_dnp), 167.5, y + 10.5, { align: "center" });

  if(dados.adicao) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(dados.adicao), 122.5, y + 16.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  }

  if(dados.co_od_esf) doc.text(String(dados.co_od_esf), 70, y + 22.5, { align: "center" });
  if(dados.co_oe_esf) doc.text(String(dados.co_oe_esf), 70, y + 28.5, { align: "center" });

  doc.setFontSize(8);
  if(dados.medidas_vertical) doc.text(String(dados.medidas_vertical), 140, y + 22.5, { align: "center" });
  if(dados.medidas_ponte) doc.text(String(dados.medidas_ponte), 140, y + 28.5, { align: "center" });
  if(dados.medidas_horizontal) doc.text(String(dados.medidas_horizontal), 178, y + 22.5, { align: "center" });
  if(dados.medidas_diag) doc.text(String(dados.medidas_diag), 178, y + 28.5, { align: "center" });
  doc.setFontSize(9);

  if(dados.perto_od_esf) doc.text(String(dados.perto_od_esf), 70, y + 34.5, { align: "center" });
  if(dados.perto_od_cil) doc.text(String(dados.perto_od_cil), 100, y + 34.5, { align: "center" });
  if(dados.perto_od_eixo) doc.text(String(dados.perto_od_eixo), 130, y + 34.5, { align: "center" });
  if(dados.perto_od_dnp) doc.text(String(dados.perto_od_dnp), 167.5, y + 34.5, { align: "center" });

  if(dados.perto_oe_esf) doc.text(String(dados.perto_oe_esf), 70, y + 40.5, { align: "center" });
  if(dados.perto_oe_cil) doc.text(String(dados.perto_oe_cil), 100, y + 40.5, { align: "center" });
  if(dados.perto_oe_eixo) doc.text(String(dados.perto_oe_eixo), 130, y + 40.5, { align: "center" });
  if(dados.perto_oe_dnp) doc.text(String(dados.perto_oe_dnp), 167.5, y + 40.5, { align: "center" });

  y += 45;
  doc.setFillColor(210, 210, 210);
  doc.rect(margemEsq, y, 170, 5, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES", 105, y + 3.8, { align: "center" });
  
  doc.rect(margemEsq, y, 170, 18); 
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (dados.observacoes) {
    const obsFormatada = doc.splitTextToSize(String(dados.observacoes), 165).slice(0, 3);
    doc.text(obsFormatada, margemEsq + 2, y + 8.5);
  }
  y += 24;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LOJA:", margemEsq, y);
  doc.setFont("helvetica", "normal");
  doc.text("ELOS", margemEsq + 11, y); 
  doc.line(margemEsq + 10, y + 1, 120, y + 1);
  
  doc.setFont("helvetica", "bold");
  doc.text("DATA DA VENDA:", 128, y);
  doc.setFont("helvetica", "normal");
  if (dados.dataVenda) {
    const dtFormatada = dados.dataVenda.split('-').reverse().join('/');
    doc.text(dtFormatada, 158, y);
  }
  doc.line(156, y + 1, 190, y + 1);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("CONSULTOR(A):", margemEsq, y);
  doc.setFont("helvetica", "normal");
  if (dados.consultor) doc.text(String(dados.consultor).toUpperCase().substring(0, 60), margemEsq + 26, y);
  doc.line(margemEsq + 25, y + 1, 190, y + 1);
  
  y += 7;
  const nCli = dados.cliente || dados.nomeCliente || "";
  doc.setFont("helvetica", "bold");
  doc.text("NOME DO CLIENTE:", margemEsq, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(nCli).toUpperCase().substring(0, 55), margemEsq + 32, y);
  doc.line(margemEsq + 30, y + 1, 190, y + 1);

  doc.setDrawColor(200, 200, 200); 
  doc.line(10, 148.5, 200, 148.5); 
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("✂️ Linha de corte (Metade da folha A4)", 105, 147.2, { align: "center" });

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

// ==========================================
// 4. CARNÊ DE PAGAMENTO (CREDIÁRIO)
// ==========================================
export const gerarPDFCarne = async (dados, chavePixDigitada) => {
  const doc = new jsPDF();
  const verdeElos = [29, 48, 38];
  
  // Filtra apenas parcelas futuras e que não foram canceladas por renegociação
  const parcelas = (dados.listaParcelas || []).filter(p => p.numero > 0 && !p.renegociada);
  const totalParcelas = parcelas.length;

  if (totalParcelas === 0) {
    alert("Este pedido não possui parcelas futuras ativas para gerar carnê.");
    return;
  }

  let logoImg = null;
  try {
    logoImg = await carregarImagem("/favicon.png");
  } catch (e) {
    console.warn("Logo não carregada no carnê");
  }
  
  const chavePix = chavePixDigitada || "Sem chave";

  let y = 10;
  let countImpressosNaPagina = 0;

  for (let i = 0; i < totalParcelas; i++) {
    const p = parcelas[i];

    let imgQrDataUrl = null;
    if (chavePix !== "Sem chave") {
      const payloadCopiaECola = gerarPayloadPix(chavePix, Number(p.valor));
      try {
        if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
          imgQrDataUrl = await QRCode.toDataURL(payloadCopiaECola, { margin: 1, width: 150 });
        } else {
          throw new Error("Erro na biblioteca QRCode");
        }
      } catch (err) {
        const urlFallback = `https://quickchart.io/qr?text=${encodeURIComponent(payloadCopiaECola)}&size=150`;
        imgQrDataUrl = await carregarImagem(urlFallback);
      }
    }

    if (countImpressosNaPagina === 3) {
      doc.addPage();
      y = 10;
      countImpressosNaPagina = 0;
    }

    doc.setDrawColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setLineWidth(0.4);
    doc.rect(10, y, 190, 85);

    doc.setDrawColor(150, 150, 150);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(65, y, 65, y + 85);
    doc.setLineDashPattern([], 0); 

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const dataVencimentoBruta = p.dataVencimento || p.vencimentoOriginal;
    const dtVenc = dataVencimentoBruta ? dataVencimentoBruta.split('-').reverse().join('/') : '--/--/----';

    // LADO ESQUERDO: CANHOTO DA LOJA
    doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.rect(10, y, 55, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("CANHOTO DA LOJA", 37.5, y + 5.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Pedido: #${dados.numeroPedido || 'S/N'}`, 12, y + 15);
    doc.text(`Parcela: ${p.numero} de ${totalParcelas}`, 12, y + 20);
    
    doc.setFontSize(8.5);
    doc.text(`Vencimento:`, 12, y + 29);
    doc.setTextColor(198, 40, 40);
    doc.text(dtVenc, 12, y + 34);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Valor da Parcela:`, 12, y + 43);
    doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setFontSize(10);
    doc.text(formatarMoedaPDF(p.valor), 12, y + 48.5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Recebido em: ____/____/____", 12, y + 63);
    
    doc.setDrawColor(0, 0, 0);
    doc.line(12, y + 77, 62, y + 77);
    doc.setFontSize(7);
    doc.text("Assinatura do Recebedor", 37.5, y + 81.5, { align: "center" });

    // LADO DIREITO: VIA DO CLIENTE
    if (logoImg) {
      doc.addImage(logoImg, "PNG", 68, y + 3, 10, 10);
    }

    doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("CARNÊ DE PAGAMENTO", 80, y + 9.5);
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Ótica Elos - WhatsApp: (85) 98550-6571", 80, y + 14);

    doc.setDrawColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setLineWidth(0.4);
    doc.line(68, y + 17.5, 197, y + 17.5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 68, y + 24);
    doc.setFont("helvetica", "normal");
    const nCli = (dados.cliente || "Não informado").toUpperCase();
    doc.text(`Nome: ${nCli.substring(0, 38)}`, 68, y + 29.5);
    doc.text(`CPF: ${dados.cpf || "Não informado"}`, 68, y + 34.5);

    // Quadro de detalhes da parcela bem espaçado para não encavalar Vencimento e Valor
    doc.setFillColor(246, 245, 242);
    doc.roundedRect(68, y + 40, 82, 30, 1.5, 1.5, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`Nº do Pedido: #${dados.numeroPedido || 'S/N'}`, 71, y + 47);
    doc.text(`Parcela: ${p.numero} de ${totalParcelas}`, 115, y + 47);
    
    doc.setDrawColor(225, 225, 225);
    doc.line(71, y + 50.5, 147, y + 50.5);

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("VENCIMENTO", 71, y + 56.5);
    doc.text("VALOR A PAGAR", 112, y + 56.5);

    doc.setFontSize(10.5);
    doc.setTextColor(198, 40, 40);
    doc.text(dtVenc, 71, y + 64);

    doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.setFontSize(11);
    doc.text(formatarMoedaPDF(p.valor), 112, y + 64);

    // ÁREA DO PIX COM O QR CODE NATIVO
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("PAGUE VIA PIX", 174, y + 24, { align: "center" });

    if (imgQrDataUrl) {
      doc.addImage(imgQrDataUrl, "PNG", 160, y + 26.5, 28, 28);
    } else {
      doc.rect(160, y + 26.5, 28, 28);
      doc.setFontSize(7);
      doc.text("QR CODE", 174, y + 41, { align: "center" });
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text("Chave Pix:", 174, y + 59, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    
    const chaveFormatada = doc.splitTextToSize(String(chavePix), 40).slice(0, 2);
    doc.text(chaveFormatada, 174, y + 63, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Evite multas e juros mantendo sua parcela em dia.", 132.5, y + 80.5, { align: "center" });

    y += 90; 
    countImpressosNaPagina++;
  }

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};