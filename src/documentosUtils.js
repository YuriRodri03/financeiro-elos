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

  // --- CABEÇALHO (Dados Oficiais da Ótica Elos) ---
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
  const nomeCliente = (dados.cliente || "Cliente").toUpperCase();
  
  if (tipo === 'recibo') {
    const valorTexto = Number(dados.valorTotal || 0).toFixed(2).replace('.', ',');
    const textoRecibo = "Declaro que recebi de " + nomeCliente + " o valor de R$ " + valorTexto + " em " + (dados.data || "01/04/2026") + ", referente aos seguintes produtos:";
    const splitTexto = doc.splitTextToSize(textoRecibo, 170);
    doc.text(splitTexto, margemEsq, y);
    y += (splitTexto.length * 5);
  } else {
    doc.text("Cliente: " + nomeCliente, margemEsq, y);
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
  doc.text(dados.produto || "VISÃO SIMPLES 1.61 BLUE", margemEsq + 2, y);
  doc.text("1", 142, y);
  const valorTotalNum = Number(dados.valorTotal || 0);
  doc.text("R$ " + valorTotalNum.toFixed(2).replace('.', ','), 170, y, { align: "right" });

  y += 15;
  doc.setDrawColor(230, 230, 230);
  doc.line(120, y, 190, y);
  y += 7;
  doc.text("Subtotal", 120, y);
  doc.text("R$ " + valorTotalNum.toFixed(2).replace('.', ','), 170, y, { align: "right" });
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(74, 93, 78);
  doc.text("Total", 120, y);
  doc.text("R$ " + valorTotalNum.toFixed(2).replace('.', ','), 170, y, { align: "right" });

  // --- ASSINATURA ---
  y = 240;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("obrigado por construir esse elo conosco.", 105, y, { align: "center" });
  
  y += 20;
  doc.setDrawColor(0, 0, 0);
  doc.line(70, y, 140, y);
  y += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Ótica Elos", 105, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Anderson Soares", 105, y + 4, { align: "center" });

  // --- GARANTIA ---
  if (tipo === 'pedido') {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Garantia", margemEsq, 20);
    doc.setFontSize(9);
    doc.text("Condições da garantia", margemEsq, 28);
    
    doc.setFont("helvetica", "normal");
    const garantiaTxt = [
      "1. Cobertura de Garantia",
      "1.1 A garantia cobre manutenção e ajuste de óculos.",
      "1.2 Inclui substituição de parafusos e plaquetas.",
      "2. Exclusões",
      "2.1 Não cobre danos por uso inadequado ou acidentes.",
      "3. Reclamações",
      "3.1 Apresentar o comprovante de serviço original."
    ];
    
    let yGar = 35;
    garantiaTxt.forEach((linha) => {
      doc.text(linha, margemEsq, yGar);
      yGar += 6;
    });
  }

  const nomeArq = titulo + "_" + nomeCliente.replace(/\s+/g, '_') + ".pdf";
  doc.save(nomeArq);
};