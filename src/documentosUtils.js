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

  // --- CABECALHO ---
  if (logoImg) {
    doc.addImage(logoImg, "PNG", margemEsq, 15, 15, 15);
  }
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Otica Elos", 50, 22);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("52.294.947 ANDERSON SOARES DA SILVA", 50, 27);
  doc.text("CNPJ: 52.294.947/0001-56", 50, 31);
  doc.text("Rua Viriato Ribeiro, 321, Bela Vista, Fortaleza-CE", 50, 35);
  doc.text("CEP 60442-642", 50, 39);

  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFont("helvetica", "italic");
  doc.text("Criando um elo com voce!", 140, 22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("oticaelos@hotmail.com", 140, 27);
  doc.text("+55 (85) 8550-6571", 140, 31);
  doc.text("@oticaelos", 140, 35);

  y = 50;
  doc.setDrawColor(200, 200, 200);
  doc.line(margemEsq, y, 190, y); 

  // --- TITULO COM FUNDO VERDE ---
  y += 10;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  
  const txtTitulo = tipo === "recibo" ? "Recibo" : "Pedido";
  const numDocumento = dados.numero || "017-2026";
  const dataDocumento = dados.data || "01/04/2026";
  
  doc.text(txtTitulo + " " + numDocumento, margemEsq + 5, y + 7);
  doc.setFontSize(10);
  doc.text(dataDocumento, 185, y + 7, { align: "right" });

  // --- CORPO ---
  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  const nomeCliente = (dados.cliente || "CLIENTE").toUpperCase();
  const valorTotalStr = Number(dados.valorTotal || 0).toFixed(2).replace(".", ",");

  if (tipo === "recibo") {
    const fraseRecibo = "Declaro que recebi de " + nomeCliente + " o valor de R$ " + valorTotalStr + " em " + dataDocumento + ", referente aos seguintes produtos:";
    const splitRecibo = doc.splitTextToSize(fraseRecibo, 170);
    doc.text(splitRecibo, margemEsq, y);
    y += (splitRecibo.length * 6);
  } else {
    doc.text("Cliente: " + nomeCliente, margemEsq, y);
    y += 10;
  }

  // --- PRODUTOS (Fundo Verde) ---
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Produtos", margemEsq + 2, y + 5);

  y += 8;
  doc.setFillColor(245, 245, 245);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.text("Descricao", margemEsq + 2, y + 5);
  doc.text("Qtd.", 140, y + 5);
  doc.text("Preco", 185, y + 5, { align: "right" });
  
  y += 12;
  doc.setFont("helvetica", "normal");
  const descProd = dados.produto || "VISAO SIMPLES 1.61 BLUE";
  const precoUnid = Number(dados.valorProduto || 0).toFixed(2).replace(".", ",");
  
  doc.text(descProd, margemEsq + 2, y);
  doc.text("1", 142, y);
  doc.text("R$ " + precoUnid, 185, y, { align: "right" });

  // --- VALORES ---
  y += 15;
  doc.text("Subtotal", 130, y);
  doc.text("R$ " + precoUnid, 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(198, 40, 40);
  const valorDesc = Number(dados.desconto || 0).toFixed(2).replace(".", ",");
  doc.text("Desconto sobre produtos", 130, y);
  doc.text("- R$ " + valorDesc, 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Total", 130, y);
  doc.text("R$ " + valorTotalStr, 185, y, { align: "right" });

  // --- PAGAMENTO ---
  y += 15;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Pagamento", margemEsq + 2, y + 5);
  
  y += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Meios de pagamento:", margemEsq, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const pgto = dados.metodoPagamento || "Dinheiro";
  doc.text(pgto, margemEsq, y);

  // --- ASSINATURA ---
  y = 245;
  doc.setDrawColor(0, 0, 0);
  doc.line(70, y, 140, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Otica Elos - Anderson Soares", 105, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Fortaleza, " + dataDocumento, 105, y, { align: "center" });

  y = 275;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("obrigado por construir esse elo conosco.", 105, y, { align: "center" });

  // --- GARANTIA ---
  if (tipo === "pedido") {
    doc.addPage();
    doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.rect(margemEsq, 20, 170, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("Garantia", margemEsq + 5, 27);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const gar = [
      "1. Cobertura: Manutencao e ajuste de oculos.",
      "1.1 Inclui substituicao de parafusos e plaquetas.",
      "2. Exclusoes: Danos por uso inadequado ou acidentes.",
      "3. Reclamacoes: Apresentar o comprovante original."
    ];
    let yG = 40;
    for (let i = 0; i < gar.length; i++) {
      doc.text(gar[i], margemEsq, yG);
      yG += 7;
    }
  }

  const nomeArquivo = txtTitulo + "_" + nomeCliente.replace(/\s+/g, "_") + ".pdf";
  doc.save(nomeArquivo);
};