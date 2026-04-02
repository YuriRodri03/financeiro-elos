import { jsPDF } from "jspdf";

export const gerarPDFDocumento = async (dados, tipo = 'recibo') => {
  const doc = new jsPDF();
  const margemEsq = 20;
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

  if (logoImg) {
    doc.addImage(logoImg, "PNG", margemEsq, 15, 15, 15);
  } else {
    doc.setFillColor(74, 93, 78);
    doc.circle(27, 22, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("ELOS", 27, 23, { align: "center" });
  }

  // --- CABEÇALHO ---
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

  // --- CONTATOS ---
  doc.setTextColor(74, 93, 78);
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
  y += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titulo = tipo === 'recibo' ? "Recibo" : "Pedido";
  const numDoc = dados.numero || "017-2026";
  doc.text(titulo, margemEsq, y);
  
  doc.setFontSize(10);
  doc.text(numDoc, margemEsq, y + 6);
  doc.text(dados.data || "01/04/2026", 170, y, { align: "right" });

  y += 20;
  doc.setFont("helvetica", "normal");
  const nomeCli = (dados.cliente || "Cliente").toUpperCase();
  const vLiq = Number(dados.valorTotal || 0);
  const vBru = Number(dados.valorProduto || vLiq);
  const vDesc = Number(dados.desconto || 0);

  if (tipo === 'recibo') {
    const vTexto = vLiq.toFixed(2).replace('.', ',');
    const txt = "Declaro que recebi de " + nomeCli + " o valor de R$ " + vTexto + " em " + (dados.data || "01/04/2026") + ", referente aos seguintes produtos:";
    const splitTxt = doc.splitTextToSize(txt, 170);
    doc.text(splitTxt, margemEsq, y);
    y += (splitTxt.length * 5);
  } else {
    doc.text("Cliente: " + nomeCli, margemEsq, y);
    y += 10;
  }

  // --- TABELA ---
  y += 5;
  doc.setFillColor(245, 245, 245);
  doc.rect(margemEsq, y, 170, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Descrição", margemEsq + 2, y + 5);
  doc.text("Qtd.", 140, y + 5);
  doc.text("Preço", 170, y + 5, { align: "right" });
  
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.text(dados.produto || "PRODUTOS OPTICOS", margemEsq + 2, y);
  doc.text("1", 142, y);
  doc.text("R$ " + vBru.toFixed(2).replace('.', ','), 170, y, { align: "right" });

  // --- TOTAIS ---
  y += 15;
  doc.setDrawColor(230, 230, 230);
  doc.line(120, y, 190, y);
  
  y += 7;
  doc.text("Subtotal", 120, y);
  doc.text("R$ " + vBru.toFixed(2).replace('.', ','), 170, y, { align: "right" });

  if (vDesc > 0) {
    y += 7;
    doc.setTextColor(198, 40, 40);
    doc.text("Desconto", 120, y);
    doc.text("- R$ " + vDesc.toFixed(2).replace('.', ','), 170, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(74, 93, 78);
  doc.text("Total", 120, y);
  doc.text("R$ " + vLiq.toFixed(2).replace('.', ','), 170, y, { align: "right" });

  // --- ASSINATURA ---
  y = 240;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("obrigado por construir esse elo conosco.", 105, y, { align: "center" });
  
  y += 20;
  doc.line(70, y, 140, y);
  y += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Ótica Elos", 105, y, { align: "center" });

  // --- GARANTIA ---
  if (tipo === 'pedido') {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Garantia", 20, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const linhas = [
      "1. Cobertura: Manutencao e ajuste de oculos.",
      "1.1 Inclui parafusos e plaquetas.",
      "2. Exclusoes: Danos por uso inadequado.",
      "3. Reclamacoes: Apresentar comprovante original."
    ];
    let yG = 30;
    linhas.forEach((l) => {
      doc.text(l, 20, yG);
      yG += 7;
    });
  }

  doc.save(titulo + "_" + nomeCli.replace(/\s+/g, '_') + ".pdf");
};