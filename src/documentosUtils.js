import { jsPDF } from "jspdf";

// ==========================================
// 1. RECIBO E PEDIDO
// ==========================================
export const gerarPDFDocumento = async (dados, tipo = 'recibo') => {
  const doc = new jsPDF();
  const margemEsq = 20;
  const verdeElos = [74, 93, 78]; 
  let y = 20;

  const carregarLogo = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const logoImg = await carregarLogo("/favicon.png");

  // --- CABEÇALHO ---
  if (logoImg) {
    doc.addImage(logoImg, "PNG", margemEsq, 15, 15, 15);
  }
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Ótica Elos", 50, 22);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("52.294.947 ANDERSON SOARES DA SILVA", 50, 27);
  doc.text("CNPJ: 52.294.947/0001-56", 50, 31);
  doc.text("Rua Viriato Ribeiro, 321, Bela Vista, Fortaleza-CE", 50, 35);
  doc.text("CEP 60442-642", 50, 39);

  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFont("helvetica", "italic");
  doc.text("Criando um elo com você!", 140, 22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("oticaelos@hotmail.com", 140, 27);
  doc.text("+55 (85) 8550-6571", 140, 31);
  doc.text("@oticaelos", 140, 35);

  y = 50;
  doc.setDrawColor(200, 200, 200);
  doc.line(margemEsq, y, 190, y); 

  // --- TÍTULO DO DOCUMENTO ---
  y += 10;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const txtT = tipo === "recibo" ? "Recibo" : "Pedido";
  
  const numeroExibicao = dados.numeroPedido || dados.numero || "S/N";
  doc.text(`${txtT} #${numeroExibicao}`, margemEsq + 5, y + 7);
  
  doc.setFontSize(10);
  doc.text(dados.data || new Date().toLocaleDateString('pt-BR'), 185, y + 7, { align: "right" });

  // --- DADOS DO CLIENTE ---
  y += 18;
  doc.setTextColor(0, 0, 0);
  const nCli = (dados.cliente || "CLIENTE").toUpperCase();

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  // 🟢 Título em negrito com o nome do cliente
  doc.text(nCli, margemEsq, y);
  
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  // 🟢 Removemos a repetição do nome e subimos os outros dados
  doc.text(`CPF: ${dados.cpf || "Não informado"}`, margemEsq, y);
  doc.text(`Telefone: ${dados.telefone || "Não informado"}`, 120, y);
  
  y += 5;
  doc.text(`E-mail: ${dados.email || "Não informado"}`, margemEsq, y);
  
  y += 5;
  const enderecoTxt = doc.splitTextToSize(`Endereço: ${dados.endereco || "Não informado"}`, 160);
  doc.text(enderecoTxt, margemEsq, y);
  y += (enderecoTxt.length * 5) + 5;

  // --- TABELA DE PRODUTOS / CARRINHO ---
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Produtos / Serviços", margemEsq + 2, y + 5);
  doc.text("Valor", 185, y + 5, { align: "right" });

  y += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  const itens = dados.itensCarrinho || [
    { nome: dados.produto || "PRODUTO ÓPTICO", preco: Number(dados.valorProduto || dados.valorTotal || 0) }
  ];
  
  itens.forEach((item, index) => {
    const nomeItem = item.nome.toUpperCase();
    const precoItem = "R$ " + Number(item.preco).toFixed(2).replace(".", ",");
    const nomeQuebrado = doc.splitTextToSize(nomeItem, 135);
    
    if (index % 2 !== 0) {
      doc.setFillColor(250, 250, 250);
      const alturaRetangulo = (nomeQuebrado.length * 5) + 3;
      doc.rect(margemEsq, y, 170, alturaRetangulo, "F");
    }

    doc.text(nomeQuebrado, margemEsq + 2, y + 5);
    doc.text(precoItem, 185, y + 5, { align: "right" });
    
    y += (nomeQuebrado.length * 5) + 3;
  });

  // --- FECHAMENTO FINANCEIRO ---
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(110, y, 190, y);
  
  y += 8;
  
  const vTotalNum = Number(dados.valorTotal || 0);
  const vDescNum = Number(dados.desconto || dados.valorDesconto || 0);
  const subtotal = vTotalNum + vDescNum;

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 130, y);
  doc.text("R$ " + subtotal.toFixed(2).replace(".", ","), 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(198, 40, 40); 
  doc.text("Desconto:", 130, y);
  doc.text("- R$ " + vDescNum.toFixed(2).replace(".", ","), 185, y, { align: "right" });
  
  y += 8;
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL FINAL:", 130, y);
  
  const totalFinal = subtotal - vDescNum;
  doc.text("R$ " + totalFinal.toFixed(2).replace(".", ","), 185, y, { align: "right" });

  // --- PAGAMENTO ---
  y += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FORMA DE PAGAMENTO", margemEsq, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const pgtoInfo = `${dados.metodoPagamento || "Dinheiro"} ${dados.parcelas > 1 ? `(${dados.parcelas}x)` : ""}`;
  doc.text(pgtoInfo, margemEsq, y);

  const desenharAssinaturas = (posY) => {
    if (posY > 255) { doc.addPage(); posY = 30; }
    doc.setDrawColor(0, 0, 0);
    doc.line(margemEsq, posY, 90, posY);
    doc.line(110, posY, 190, posY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Ótica Elos (Anderson Soares)", 55, posY + 5, { align: "center" });
    doc.text(nCli, 150, posY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Fortaleza, " + (dados.data || new Date().toLocaleDateString('pt-BR')), 105, posY + 15, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("obrigado por construir esse elo conosco.", 105, posY + 25, { align: "center" });
  };

  if (tipo === "recibo") {
    desenharAssinaturas(245);
  }

  // --- SEGUNDA PÁGINA: GARANTIA ---
  if (tipo === "pedido") {
    doc.addPage();
    doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.rect(margemEsq, 20, 170, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Condições da garantia", margemEsq + 5, 27);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    const clausulas = [
      { t: "Período de garantia", b: true },
      { t: "180 dias", b: false },
      { t: "", b: false },
      { t: "Cobertura de Garantia", b: true },
      { t: "1.1 A garantia cobre exclusivamente os serviços de manutenção e ajuste de óculos fornecidos pela ótica.", b: false },
      { t: "1.2 A garantia inclui a substituição de parafusos, plaquetas e ajustes de armação sem custo adicional.", b: false },
      { t: "1.3 A garantia cobre a verificação e ajuste da prescrição óptica conforme necessário.", b: false },
      { t: "", b: false },
      { t: "Exclusões de Garantia", b: true },
      { t: "2.1 A garantia não cobre danos causados por uso inadequado, negligência ou acidentes.", b: false },
      { t: "2.2 A garantia não se aplica a serviços realizados por terceiros não autorizados pela ótica.", b: false },
      { t: "2.3 A garantia não cobre alterações na prescrição óptica devido a mudanças na visão do cliente após a prestação do serviço inicial.", b: false },
      { t: "", b: false },
      { t: "Remédios de Garantia", b: true },
      { t: "3.1 Em caso de defeito nos serviços cobertos pela garantia, a ótica realizará os reparos necessários sem custo adicional.", b: false },
      { t: "3.2 Se os reparos não forem possíveis, a ótica poderá, a seu critério, oferecer um serviço substitutivo equivalente.", b: false },
      { t: "", b: false },
      { t: "Reclamações de Garantia", b: true },
      { t: "4.1 Para reivindicar a garantia, o cliente deve apresentar o comprovante de serviço original.", b: false },
      { t: "4.2 Todas as reclamações de garantia devem ser feitas diretamente na ótica onde o serviço foi prestado.", b: false },
      { t: "4.3 O cliente deve notificar a ótica sobre qualquer problema coberto pela garantia dentro de um prazo razoável após a descoberta do defeito.", b: false },
      { t: "", b: false },
      { t: "Limitações de Garantia", b: true },
      { t: "5.1 A garantia é limitada aos serviços especificados e não cobre quaisquer outros custos ou despesas incorridos pelo cliente.", b: false },
      { t: "5.2 A garantia é intransferível e só pode ser reivindicada pelo cliente original que contratou os serviços.", b: false },
    ];

    let yG = 40;
    clausulas.forEach(item => {
      if (item.t === "") { yG += 4; return; }
      doc.setFont("helvetica", item.b ? "bold" : "normal");
      const splitLinha = doc.splitTextToSize(item.t, 170);
      doc.text(splitLinha, margemEsq, yG);
      yG += (splitLinha.length * 6);
    });

    desenharAssinaturas(yG + 15);
  }

  doc.save(`${txtT}_${nCli.replace(/\s+/g, "_")}.pdf`);
};

// ==========================================
// 2. RELATÓRIO DE SAÚDE FINANCEIRA
// ==========================================
export const gerarPDFSaudeFinanceira = (dadosRelatorio, periodo) => {
  const doc = new jsPDF();
  const verdeElos = [74, 93, 78];
  const margemEsq = 20;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ótica Elos - Saúde Financeira", 105, y, { align: "center" });
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Período Analisado: " + periodo.inicio + " até " + periodo.fim, 105, y, { align: "center" });

  y += 15;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRADAS (Recebimentos)", margemEsq + 2, y + 5);
  
  y += 13;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text("Origem / Cliente", margemEsq, y);
  doc.text("Valor", 185, y, { align: "right" });
  y += 2;
  doc.line(margemEsq, y, 190, y);
  y += 6;

  dadosRelatorio.entradas.forEach(item => {
    doc.text(item.nome.substring(0, 35), margemEsq, y);
    doc.text("R$ " + item.valor.toFixed(2).replace('.', ','), 185, y, { align: "right" });
    y += 6;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  y += 10;
  doc.setFillColor(198, 40, 40);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("SAÍDAS (Despesas Pagas)", margemEsq + 2, y + 5);

  y += 13;
  doc.setTextColor(0, 0, 0);
  doc.text("Descrição", margemEsq, y);
  doc.text("Valor", 185, y, { align: "right" });
  y += 2;
  doc.line(margemEsq, y, 190, y);
  y += 6;

  dadosRelatorio.saidas.forEach(item => {
    doc.text(item.nome.substring(0, 35), margemEsq, y);
    doc.text("- R$ " + item.valor.toFixed(2).replace('.', ','), 185, y, { align: "right" });
    y += 6;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  y += 15;
  doc.setFillColor(245, 245, 245);
  doc.rect(margemEsq, y, 170, 25, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text("Total de Entradas:", margemEsq + 5, y + 7);
  doc.text("R$ " + dadosRelatorio.totalEntradas.toFixed(2).replace('.', ','), 185, y + 7, { align: "right" });
  doc.text("Total de Saídas:", margemEsq + 5, y + 14);
  doc.setTextColor(198, 40, 40);
  doc.text("- R$ " + dadosRelatorio.totalSaidas.toFixed(2).replace('.', ','), 185, y + 14, { align: "right" });
  
  const saldo = dadosRelatorio.totalEntradas - dadosRelatorio.totalSaidas;
  doc.setTextColor(saldo >= 0 ? verdeElos[0] : 198, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text("LUCRO / SALDO LÍQUIDO REAL:", margemEsq + 5, y + 21);
  doc.text("R$ " + saldo.toFixed(2).replace('.', ','), 185, y + 21, { align: "right" });

  doc.save("Saude_Financeira_" + periodo.inicio.replace(/\//g, '-') + ".pdf");
};

// ==========================================
// 3. ORDEM DE SERVIÇO
// ==========================================
export const gerarPDFOrdemServico = async (dados) => {
  const doc = new jsPDF();
  const margemEsq = 20;
  let y = 15;

  const carregarLogo = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const logoImg = await carregarLogo("/favicon.png");

  // --- CABEÇALHO ---
  if (logoImg) {
    doc.addImage(logoImg, "PNG", margemEsq, 10, 20, 20);
  }
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.text("ELOS", margemEsq + 5, 35); 
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const numeroOS = dados.numeroOS || dados.numeroPedido || dados.numero || "________";
  doc.text(`OSº ${numeroOS}`, 150, 25);
  doc.setDrawColor(0, 0, 0);
  doc.line(160, 26, 190, 26);

  y = 45;
  
  // --- DADOS DA RX ---
  doc.setFillColor(210, 210, 210);
  doc.rect(margemEsq, y, 170, 7, "F");
  doc.setFontSize(10);
  doc.text("DADOS DA RX", 105, y + 5, { align: "center" });
  doc.rect(margemEsq, y, 170, 7); 
  
  y += 7;
  const labels = ["LENTE:", "TRATAMENTO:", "ARMAÇÃO:"];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  labels.forEach(label => {
    doc.rect(margemEsq, y, 170, 7);
    doc.text(label, margemEsq + 2, y + 5);
    y += 7;
  });

  // --- CABEÇALHO TABELA RX ---
  doc.rect(margemEsq, y, 170, 8);
  doc.text("RX", 37.5, y + 5, { align: "center" });
  doc.text("ESF", 70, y + 5, { align: "center" });
  doc.text("CIL", 100, y + 5, { align: "center" });
  doc.text("EIXO", 130, y + 5, { align: "center" });
  doc.text("DNP LONGE", 167.5, y + 5, { align: "center" });
  
  y += 8;
  const rowH = 7.5;
  
  // Contorno principal da tabela (7 linhas no total)
  doc.rect(margemEsq, y, 170, 7 * rowH);
  
  for(let i=1; i<7; i++) { doc.line(margemEsq, y + (i*rowH), 190, y + (i*rowH)); }
  doc.line(40, y, 40, y + (7 * rowH)); 
  doc.line(55, y, 55, y + (7 * rowH)); 
  doc.line(85, y, 85, y + (7 * rowH)); 
  doc.line(115, y, 115, y + (7 * rowH)); 
  doc.line(145, y, 145, y + (7 * rowH)); 
  
  // LIMPANDO A LINHA VERTICAL NA ADIÇÃO
  doc.setFillColor(255, 255, 255);
  doc.rect(20.2, y + (2*rowH) + 0.2, 34.6, rowH - 0.4, "F");
  // LIMPANDO ÁREA PARA MEDIDAS DA ARMAÇÃO NO CO
  doc.rect(55.2, y + (3*rowH) + 0.2, 59.6, (2*rowH) - 0.4, "F");

  // --- TEXTOS DA TABELA ---
  doc.setFont("helvetica", "bold");
  doc.text("LONGE:", 30, y + rowH, { align: "center" });
  doc.text("OD", 47.5, y + (0.7*rowH), { align: "center" });
  doc.text("OE", 47.5, y + (1.7*rowH), { align: "center" });
  
  doc.text("ADIÇÃO:", 37.5, y + (2.7*rowH), { align: "center" });
  
  doc.text("CO:", 30, y + (4*rowH), { align: "center" });
  doc.text("OD", 47.5, y + (3.7*rowH), { align: "center" });
  doc.text("OE", 47.5, y + (4.7*rowH), { align: "center" });
  
  doc.text("PERTO:", 30, y + (6*rowH), { align: "center" });
  doc.text("OD", 47.5, y + (5.7*rowH), { align: "center" });
  doc.text("OE", 47.5, y + (6.7*rowH), { align: "center" });
  
  doc.setFontSize(7);
  doc.text("MEDIDAS", 85, y + (3.8*rowH), { align: "center" });
  doc.text("DA ARMAÇÃO:", 85, y + (4.4*rowH), { align: "center" });
  doc.setFontSize(6);
  doc.text("VERTICAL", 117, y + (3.4*rowH));
  doc.text("PONTE", 117, y + (4.4*rowH));
  doc.text("HORIZONTAL", 147, y + (3.4*rowH));
  doc.text("DIAG. MAIOR", 147, y + (4.4*rowH));

  y += 7 * rowH; 
  
  // --- OBSERVAÇÕES ---
  y += 5;
  doc.setFillColor(210, 210, 210);
  doc.rect(margemEsq, y, 170, 7, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES", 105, y + 5, { align: "center" });
  doc.rect(margemEsq, y, 170, 7);
  
  y += 7;
  for(let i=0; i<5; i++) {
      doc.rect(margemEsq, y, 170, 7);
      y += 7;
  }

  // --- RODAPÉ ---
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LOJA:", margemEsq, y);
  doc.line(margemEsq + 10, y, 120, y);
  doc.text("DATA DA VENDA:", 130, y);
  doc.line(160, y, 190, y);
  y += 10;
  doc.text("CONSULTOR:", margemEsq, y);
  doc.line(margemEsq + 24, y, 190, y);
  y += 10;
  const nCli = dados.cliente || dados.nomeCliente || "";
  doc.text("NOME DO CLIENTE:", margemEsq, y);
  doc.text(nCli, margemEsq + 35, y - 1);
  doc.line(margemEsq + 34, y, 190, y);

  doc.save(`OS_${nCli ? nCli.replace(/\s+/g, "_") : "Cliente"}.pdf`);
};