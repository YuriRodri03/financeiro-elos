import { jsPDF } from "jspdf";

export const gerarPDFDocumento = (dados, tipo = 'recibo') => {
  const doc = new jsPDF();
  const margemEsq = 20;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Ótica Elos", margemEsq, y);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  y += 7;
  doc.text("ANDERSON SOARES DA SILVA", margemEsq, y);
  y += 4;
  doc.text("CNPJ: 52.294.947/0001-56", margemEsq, y);
  y += 4;
  doc.text("Rua Viriato Ribeiro, 321A, Bela Vista, Fortaleza-CE", margemEsq, y);
  y += 4;
  doc.text("WhatsApp: +55 (85) 8550-6571", margemEsq, y);
  
  y += 10;
  doc.setLineWidth(0.2);
  doc.line(margemEsq, y, 190, y); 

  y += 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titulo = tipo === 'recibo' ? "Recibo" : "Pedido";
  const numDoc = dados.numero || "017-2026";
  doc.text(titulo + " n " + numDoc, margemEsq, y);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dataDoc = dados.data || "01/04/2026";
  doc.text("Data: " + dataDoc, 150, y);

  y += 10;
  const nomeCliente = (dados.cliente || "Cliente").toUpperCase();
  doc.text("Cliente: " + nomeCliente, margemEsq, y);

  y += 15;
  doc.setFillColor(240, 240, 240);
  doc.rect(margemEsq, y, 170, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("Descrição", margemEsq + 2, y + 6);
  doc.text("Qtd", 140, y + 6);
  doc.text("Preço", 165, y + 6);
  
  y += 15;
  doc.setFont("helvetica", "normal");
  const descProd = dados.produto || "VISÃO SIMPLES 1.61 BLUE";
  doc.text(descProd, margemEsq + 2, y);
  doc.text("1", 142, y);
  const valorFormatado = "R$ " + Number(dados.valorTotal || 0).toFixed(2).replace('.', ',');
  doc.text(valorFormatado, 165, y);

  y += 20;
  doc.text("Subtotal:", 130, y);
  doc.text(valorFormatado, 165, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 130, y);
  doc.text(valorFormatado, 165, y);

  y += 40;
  doc.line(60, y, 150, y);
  y += 5;
  doc.setFontSize(10);
  doc.text("Ótica Elos - Anderson Soares", 105, y, { align: "center" });

  if (tipo === 'pedido') {
    doc.addPage();
    y = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Termos de Garantia", margemEsq, y);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const termos = [
      "1. Cobertura: Manutenção, parafusos e plaquetas.",
      "2. Exclusões: Uso inadequado, negligência ou acidentes.",
      "3. Reclamações: Apresentar comprovante original.",
      "4. Validade: Garantia intransferível ao cliente original."
    ];
    
    termos.forEach(linha => {
      y += 8;
      doc.text(linha, margemEsq, y);
    });
  }

  const nomeArq = titulo + "_" + nomeCliente.replace(/\s+/g, '_') + ".pdf";
  doc.save(nomeArq);
};