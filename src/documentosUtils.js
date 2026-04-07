import { jsPDF } from "jspdf";

export const gerarPDFDocumento = async (dados, tipo = 'recibo') => {
  const doc = new jsPDF();
  const margemEsq = 20;
  const verdeElos = [74, 93, 78]; // Cor verde oliva da marca
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

  // --- TÍTULO COM FUNDO VERDE ---
  y += 10;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titulo = tipo === 'recibo' ? "Recibo" : "Pedido";
  doc.text(titulo + " " + (dados.numero || "017-2026"), margemEsq + 5, y + 7);
  doc.setFontSize(10);
  doc.text(dados.data || "01/04/2026", 185, y + 7, { align: "right" });

  // --- DADOS DO CLIENTE ---
  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  if (tipo === 'recibo') {
    const txtRecibo = "Declaro que recebi de " + (dados.cliente || "").toUpperCase() + " o valor de R$ " + Number(dados.valorTotal).toFixed(2).replace('.', ',') + " em " + (dados.data || "01/04/2026") + ", referente aos seguintes produtos:";
    doc.text(doc.splitTextToSize(txtRecibo, 170), margemEsq, y);
    y += 10;
  } else {
    doc.text("Cliente: " + (dados.cliente || "").toUpperCase(), margemEsq, y);
    y += 5;
  }

  // --- SEÇÃO PRODUTOS COM FUNDO VERDE ---
  y += 10;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Produtos", margemEsq + 2, y + 5);

  y += 8;
  doc.setFillColor(245, 245, 245);
  doc.rect(margemEsq, y, 170, 8, 'F');
  doc.setTextColor(0, 0, 0);
  doc.text("Descrição", margemEsq + 2, y + 5);
  doc.text("Qtd.", 140, y + 5);
  doc.text("Preço", 185, y + 5, { align: "right" });
  
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.text(dados.produto || "VISÃO SIMPLES 1.61 BLUE", margemEsq + 2, y);
  doc.text("1", 142, y);
  doc.text("R$ " + Number(dados.valorProduto || 0).toFixed(2).replace('.', ','), 185, y, { align: "right" });

  // --- TOTAIS ---
  y += 15;
  doc.text("Subtotal", 130, y);
  doc.text("R$ " + Number(dados.valorProduto || 0).toFixed(2).replace('.', ','), 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(198, 40, 40);
  doc.text("Desconto sobre produtos", 130, y);
  doc.text("- R$ " + Number(dados.desconto || 0).toFixed(2).replace('.', ','), 185, y, { align: "right" });
  
  y += 7;
  doc.setTextColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Total", 130, y);
  doc.text("R$ " + Number(dados.valorTotal || 0).toFixed(2).replace('.', ','), 185, y, { align: "right" });

  // --- PAGAMENTO ---
  y += 15;
  doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
  doc.rect(margemEsq, y, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text("Pagamento", margemEsq + 2, y + 5);
  
  y += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Meios de pagamento:", margemEsq, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const meios = tipo === 'recibo' ? (dados.meioPagamento || "Cartão de crédito.") : "Boleto, transferência bancária, dinheiro, cheque, cartão de crédito, cartão de débito, pix, fiado, picpay ou link de pagamento.";
  doc.text(doc.splitTextToSize(meios, 170), margemEsq, y);

  y = 270;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text("obrigado por construir esse elo conosco.", 105, y, { align: "center" });

  // --- PÁGINA 2: GARANTIA ---
  if (tipo === 'pedido') {
    doc.addPage();
    let yG = 20;
    doc.setFillColor(verdeElos[0], verdeElos[1], verdeElos[2]);
    doc.rect(margemEsq, yG, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Garantia", margemEsq + 5, yG + 7);
    
    yG += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("1. Cobertura de Garantia", margemEsq, yG);
    yG += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("1.1 A garantia cobre exclusivamente os serviços de manutenção e ajuste de óculos fornecidos pela ótica.", margemEsq, yG);
    yG += 5; doc.text("1.2 A garantia inclui a substituição de parafusos, plaquetas e ajustes de armação sem custo adicional.", margemEsq, yG);
    yG += 5; doc.text("1.3 A garantia cobre a verificação e ajuste da prescrição óptica conforme necessário.", margemEsq, yG);

    yG += 8; doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("2. Exclusões de Garantia", margemEsq, yG);
    yG += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("2.1 A garantia não cobre danos causados por uso inadequado, negligência ou acidentes.", margemEsq, yG);
    yG += 5; doc.text("2.2 A garantia não se aplica a serviços realizados por terceiros não autorizados pela ótica.", margemEsq, yG);
    yG += 5; doc.text("2.3 A garantia não cobre alterações na prescrição óptica devido a mudanças na visão do cliente.", margemEsq, yG);

    yG += 8; doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("3. Reclamações de Garantia", margemEsq, yG);
    yG += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("4.1 Para reivindicar a garantia, o cliente deve apresentar o comprovante de serviço original.", margemEsq, yG);
    yG += 5; doc.text("5.2 A garantia é intransferível e só pode ser reivindicada pelo cliente original.", margemEsq, yG);

    yG = 240;
    doc.line(70, yG, 140, yG);
    yG += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Ótica Elos - Anderson Soares", 105, yG, { align: "center" });
    yG += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Fortaleza, " + (dados.data || "01/04/2026"), 105, yG, { align: "center" });
  }

  doc.save(titulo + "_" + dados.cliente.replace(/\s+/g, '_') + ".pdf");
};