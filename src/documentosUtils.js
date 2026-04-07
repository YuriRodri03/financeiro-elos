import { jsPDF } from "jspdf";

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

  // --- TÍTULO ---
  y += 10;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const txtT = tipo === "recibo" ? "Recibo" : "Pedido";
  
  // NÚMERO DINÂMICO: Usa o que vier de 'dados.numero'
  const numeroExibicao = dados.numero || "S/N";
  doc.text(txtT + " " + numeroExibicao, margemEsq + 5, y + 7);
  
  doc.setFontSize(10);
  doc.text(dados.data || "01/04/2026", 185, y + 7, { align: "right" });

  // --- CORPO DO TEXTO ---
  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  const nCli = (dados.cliente || "CLIENTE").toUpperCase();
  const vTotal = Number(dados.valorTotal || 0).toFixed(2).replace(".", ",");

  if (tipo === "recibo") {
    const frase = "Declaro que recebi de " + nCli + " o valor de R$ " + vTotal + " em " + (dados.data || "01/04/2026") + ", referente aos seguintes produtos:";
    doc.text(doc.splitTextToSize(frase, 170), margemEsq, y);
    y += 12;
  } else {
    doc.text("Cliente: " + nCli, margemEsq, y);
    y += 10;
  }

  // --- PRODUTOS ---
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Produtos", margemEsq + 2, y + 5);

  y += 8;
  doc.setFillColor(245, 245, 245);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.text("Descrição", margemEsq + 2, y + 5);
  doc.text("Qtd.", 140, y + 5);
  doc.text("Preço", 185, y + 5, { align: "right" });
  
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.text(dados.produto || "VISÃO SIMPLES 1.61 BLUE", margemEsq + 2, y);
  doc.text("1", 142, y);
  const pUni = Number(dados.valorProduto || 0).toFixed(2).replace(".", ",");
  doc.text("R$ " + pUni, 185, y, { align: "right" });

  // --- VALORES ---
  y += 15;
  doc.text("Subtotal", 130, y);
  doc.text("R$ " + pUni, 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(198, 40, 40);
  const vDesc = Number(dados.desconto || 0).toFixed(2).replace(".", ",");
  doc.text("Desconto sobre produtos", 130, y);
  doc.text("- R$ " + vDesc, 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Total", 130, y);
  doc.text("R$ " + vTotal, 185, y, { align: "right" });

  // --- PAGAMENTO ---
  y += 15;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Pagamento", margemEsq + 2, y + 5);
  
  y += 12;
  doc.setTextColor(0, 0, 0);
  doc.text("Meios de pagamento:", margemEsq, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const pgto = dados.metodoPagamento || "Dinheiro";
  doc.text(pgto, margemEsq, y);

  // FUNÇÃO AUXILIAR PARA ASSINATURAS
  const desenharAssinaturas = (posY) => {
    doc.setDrawColor(0, 0, 0);
    // Linha Ótica
    doc.line(margemEsq, posY, 90, posY);
    // Linha Cliente
    doc.line(110, posY, 190, posY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Ótica Elos (Anderson Soares)", 55, posY + 5, { align: "center" });
    doc.text(nCli, 150, posY + 5, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.text("Fortaleza, " + (dados.data || "01/04/2026"), 105, posY + 15, { align: "center" });
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("obrigado por construir esse elo conosco.", 105, posY + 25, { align: "center" });
  };

  // Se for Recibo, assina no fim da primeira página
  if (tipo === "recibo") {
    desenharAssinaturas(245);
  }

  // --- SEGUNDA PÁGINA (PEDIDO) ---
  if (tipo === "pedido") {
    doc.addPage();
    doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.rect(margemEsq, 20, 170, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Garantia", margemEsq + 5, 27);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    const g = [
      "1. Cobertura de Garantia",
      "1.1 A garantia cobre exclusivamente os serviços de manutenção e ajuste de óculos fornecidos pela ótica.",
      "1.2 A garantia inclui a substituição de parafusos, plaquetas e ajustes de armação sem custo adicional.",
      "1.3 A garantia cobre a verificação e ajuste da prescrição óptica conforme necessário.",
      "",
      "2. Exclusões de Garantia",
      "2.1 A garantia não cobre danos causados por uso inadequado, negligência ou acidentes.",
      "2.2 A garantia não se aplica a serviços realizados por terceiros não autorizados pela ótica.",
      "2.3 A garantia não cobre alterações na prescrição devido a mudanças na visão do cliente.",
      "",
      "3. Remédios de Garantia",
      "3.1 Em caso de defeito nos serviços, a ótica realizará os reparos necessários sem custo.",
      "3.2 Se os reparos não forem possíveis, poderá ser oferecido serviço equivalente.",
      "",
      "4. Reclamações de Garantia",
      "4.1 Para reivindicar a garantia, o cliente deve apresentar o comprovante de serviço original.",
      "4.2 As reclamações devem ser feitas diretamente na ótica onde o serviço foi prestado.",
      "",
      "5. Limitações de Garantia",
      "5.1 A garantia é limitada aos serviços especificados e não cobre outros custos incorridos.",
      "5.2 A garantia é intransferível e só pode ser reivindicada pelo cliente original."
    ];

    let yG = 40;
    for (let i = 0; i < g.length; i++) {
      if (g[i] === "") { yG += 4; continue; }
      const splitG = doc.splitTextToSize(g[i], 170);
      doc.text(splitG, margemEsq, yG);
      yG += (splitG.length * 5);
    }

    // Assina no fim da garantia (Página 2)
    desenharAssinaturas(yG + 20);
  }

  doc.save(txtT + "_" + nCli.replace(/\s+/g, "_") + ".pdf");
};