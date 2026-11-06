import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProdutos } from '../../hooks/useProdutos';

// Opção fixa de retirada na loja sempre disponível
const OPCAO_RETIRADA_FIXA = {
  id: 'retirada',
  nome: 'Retirar na Loja (Bela Vista)',
  valor: 0.00,
  prazo: 'Disponível p/ retirada'
};

// =======================================================
// 🟢 COMPONENTE: MODAL DE TERMOS DE SERVIÇO
// =======================================================
function ModalTermos({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ animation: 'fadeUp 0.5s ease forwards' }}>
      <div className="absolute inset-0 bg-[#1d3026]/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-[#F4F1EA] w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        <div className="p-6 md:p-8 flex justify-between items-center bg-[#1d3026] text-[#F4F1EA]">
          <div>
            <h2 className="text-3xl font-tradicional italic font-bold">Termos de Serviço</h2>
            <p className="text-[10px] font-black text-[#c5a880] uppercase tracking-widest mt-1">Ótica Elos E-commerce</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-sm text-xl backdrop-blur-sm">
            &times;
          </button>
        </div>
        <div className="p-6 md:p-10 overflow-y-auto flex-1 text-sm text-gray-700 space-y-8 leading-relaxed custom-scrollbar">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50 hover:border-[#c5a880]/30 transition-colors">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 1. Introdução</h3>
            <p>Bem-vindo ao e-commerce da Ótica Elos. Ao utilizar nossa loja virtual e finalizar uma compra, você concorda automaticamente com as diretrizes e regras estabelecidas neste documento.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50 hover:border-[#c5a880]/30 transition-colors">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 2. Lentes de Grau e Receituário</h3>
            <p>A confecção de lentes oftálmicas com grau requer o envio de uma receita oftalmológica atualizada (emitida há no máximo 1 ano) através do nosso canal oficial de WhatsApp logo após a compra. A Ótica Elos garante a fidelidade da lente em relação à receita enviada, mas não se responsabiliza por eventuais erros médicos na prescrição.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50 hover:border-[#c5a880]/30 transition-colors">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 3. Prazos, Entregas e Frete</h3>
            <p>O prazo de produção e entrega começa a ser contabilizado apenas após a confirmação do pagamento e o envio da receita médica (quando aplicável). Você pode optar por retirar gratuitamente em nossa loja física ou calcular o frete de entrega.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50 hover:border-[#c5a880]/30 transition-colors">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 4. Trocas e Devoluções</h3>
            <p>Aceitamos a devolução de armações (sem grau) no prazo de até 7 dias corridos após o recebimento, desde que o produto retorne na embalagem original e sem marcas de uso. Lentes de grau são produtos personalizados e fabricados sob medida, portanto, não possuem direito a devolução, exceto em casos de defeitos.</p>
          </div>
        </div>
        <div className="p-6 bg-white border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-10 py-4 bg-[#1d3026] text-[#F4F1EA] font-bold rounded-xl text-xs uppercase tracking-[0.2em] hover:bg-[#c5a880] active:scale-[0.98] transition-all shadow-lg hover:shadow-[#c5a880]/30">
            Estou de Acordo
          </button>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// 🟢 COMPONENTE: MODAL DE DETALHES E ZOOM DO PRODUTO
// =======================================================
function ModalDetalhesProduto({ produto, precoPromocional, noCarrinho, adicionarAoCarrinho, apiUrl, onClose }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [superZoom, setSuperZoom] = useState(false);

  if (!produto) return null;

  const productId = produto._id || produto.id;
  const fotos = (produto.fotos && produto.fotos.length > 0) ? produto.fotos : (produto.foto ? [produto.foto] : []);

  const getUrlFotoAlta = (f) => {
    if (!f) return '';
    if (f.startsWith('http')) {
      const urlLimpa = f.replace(/^https?:\/\//, '');
      return `https://wsrv.nl/?url=${urlLimpa}&w=1000&output=webp&q=85`;
    }
    if (f.startsWith('data:')) return f;
    return `${apiUrl.replace(/\/$/, '')}/produtos/${productId}/foto?v=1`;
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      style={{ animation: 'fadeUp 0.3s ease forwards' }}
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-30 w-10 h-10 bg-white/90 hover:bg-red-500 hover:text-white text-[#1d3026] rounded-full flex items-center justify-center shadow-md text-2xl transition-all"
        >
          &times;
        </button>

        {/* LADO ESQUERDO: GALERIA COM ZOOM */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#F4F1EA] to-white flex flex-col justify-between p-6 relative">
          <div className="relative flex-1 min-h-[260px] max-h-[380px] overflow-auto flex items-center justify-center rounded-2xl">
            {fotos[imgIndex] ? (
              <img 
                src={getUrlFotoAlta(fotos[imgIndex])} 
                alt={produto.nome}
                onClick={() => setSuperZoom(!superZoom)}
                className={`transition-transform duration-300 object-contain ${
                  superZoom ? 'scale-[2] cursor-zoom-out m-auto' : 'w-full h-full max-h-[320px] cursor-zoom-in drop-shadow-xl'
                }`}
              />
            ) : (
              <span className="text-7xl opacity-10">👓</span>
            )}

            <button 
              type="button"
              onClick={() => setSuperZoom(!superZoom)}
              className="absolute bottom-2 right-2 bg-white/85 backdrop-blur-sm text-[#1d3026] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-gray-200 hover:bg-[#1d3026] hover:text-white transition-colors"
            >
              {superZoom ? '🔍 1x' : '🔎 Zoom 2x'}
            </button>
          </div>

          {fotos.length > 1 && (
            <div className="flex gap-2 justify-center mt-4 overflow-x-auto pb-1">
              {fotos.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setSuperZoom(false); setImgIndex(idx); }}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 bg-white flex-shrink-0 transition-all ${
                    idx === imgIndex ? 'border-[#1d3026] scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getUrlFotoAlta(f)} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LADO DIREITO: INFORMAÇÕES E DESCRIÇÃO */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-white">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest bg-[#F4F1EA] text-[#1d3026] px-3 py-1 rounded-full">
                {produto.categoria}
              </span>
              {produto.referencia && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-[#c5a880]/15 text-[#8b7355] px-3 py-1 rounded-full">
                  Ref: {produto.referencia}
                </span>
              )}
            </div>

            <h2 className="font-tradicional text-2xl md:text-3xl italic font-bold text-[#1d3026] leading-tight">
              {produto.nome}
            </h2>

            <div className="pt-2">
              {precoPromocional && precoPromocional < produto.preco ? (
                <div className="flex items-baseline gap-3">
                  <span className="font-tradicional italic font-bold text-red-600 text-3xl">
                    {Number(precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-sm text-gray-400 line-through font-bold">
                    {Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ) : (
                <span className="font-tradicional italic font-bold text-[#1d3026] text-3xl">
                  {Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>

            {produto.descricao ? (
              <div className="bg-[#F4F1EA]/70 p-4 rounded-2xl border border-gray-200/60 mt-4">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[#c5a880] mb-1.5">
                  Detalhes & Especificações
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {produto.descricao}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic pt-2">
                Peça selecionada com garantia de qualidade e autenticidade Ótica Elos.
              </p>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100">
            <button
              onClick={() => {
                const produtoParaCarrinho = precoPromocional ? { ...produto, preco: precoPromocional, precoOriginal: produto.preco } : produto;
                adicionarAoCarrinho(produtoParaCarrinho);
                onClose();
              }}
              disabled={noCarrinho}
              className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2 ${
                noCarrinho
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#1d3026] text-[#F4F1EA] hover:bg-[#c5a880] hover:text-white active:scale-95'
              }`}
            >
              {noCarrinho ? '✓ Já está no seu carrinho' : '🛒 Adicionar ao Carrinho'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// 🟢 COMPONENTE: CARD DE PRODUTO
// =======================================================
function ProdutoCard({ produto, noCarrinho, adicionarAoCarrinho, abrirDetalhes, apiUrl, precoPromocional }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [imgCarregada, setImgCarregada] = useState(false);
  
  const productId = produto._id || produto.id;
  const fotos = (produto.fotos && produto.fotos.length > 0) ? produto.fotos : (produto.foto ? [produto.foto] : []);
  const fotoAtual = fotos[imgIndex];

  useEffect(() => { setImgCarregada(false); }, [imgIndex]);

  const nextImg = (e) => { if (e) e.stopPropagation(); setImgIndex((prev) => (prev + 1) % fotos.length); };
  const prevImg = (e) => { if (e) e.stopPropagation(); setImgIndex((prev) => (prev === 0 ? fotos.length - 1 : prev - 1)); };

  const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextImg();
    if (distance < -50) prevImg();
  };

  const getUrlFoto = (f) => {
    if (!f) return '';
    if (f.startsWith('http')) {
      const urlLimpa = f.replace(/^https?:\/\//, '');
      return `https://wsrv.nl/?url=${urlLimpa}&w=600&output=webp&q=80`;
    }
    if (f.startsWith('data:')) return f;
    return `${apiUrl.replace(/\/$/, '')}/produtos/${productId}/foto?v=1`;
  };

  return (
    <div className="group bg-white rounded-3xl md:rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-200 hover:border-[#c5a880]/40 hover:shadow-[0_20px_40px_rgba(197,168,128,0.15)] hover:-translate-y-1 md:hover:-translate-y-2 transition-all duration-500 flex flex-col relative anim-texto-2">
      
      {precoPromocional && precoPromocional < produto.preco && (
        <div className="absolute top-3 right-3 md:top-5 md:right-5 z-20 bg-red-600/90 backdrop-blur-md text-white border border-red-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-3 py-1 md:py-1.5 rounded-full shadow-lg pointer-events-none animate-pulse">
          🔥 Promoção!
        </div>
      )}

      {produto.referencia && !precoPromocional && (
        <div className="absolute top-3 left-3 md:top-5 md:left-5 z-20 bg-white/90 backdrop-blur-md text-[#1d3026] border border-gray-100 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-4 py-1 md:py-1.5 rounded-full shadow-sm pointer-events-none">
          Ref: {produto.referencia}
        </div>
      )}
      
      <div 
        onClick={() => abrirDetalhes(produto)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="aspect-square bg-gradient-to-br from-[#F4F1EA] to-white relative overflow-hidden flex items-center justify-center p-4 md:p-10 group/galeria cursor-pointer"
        title="Clique para ampliar e ver detalhes"
      >
        {!imgCarregada && fotoAtual && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-gray-200 border-t-[#c5a880] rounded-full animate-spin"></div>
          </div>
        )}

        {fotoAtual ? (
          <img 
            src={getUrlFoto(fotoAtual)} 
            alt={produto.nome} 
            loading="lazy" 
            decoding="async" 
            onLoad={() => setImgCarregada(true)}
            onError={(e) => { 
              e.target.style.display = 'none'; 
              e.target.nextSibling.style.display = 'block'; 
              setImgCarregada(true);
            }}
            className={`w-full h-full object-contain group-hover:scale-110 transition-all duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] drop-shadow-xl relative z-10 ${imgCarregada ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : null}
        
        <span className={`text-5xl md:text-7xl opacity-5 absolute pointer-events-none z-0 ${fotoAtual && imgCarregada ? 'hidden' : (!fotoAtual ? 'block' : 'hidden')}`}>👓</span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-[#1d3026]/[0.03] transition-colors duration-500 pointer-events-none z-10"></div>

        {/* Ícone sutil de Lupa indicando que pode clicar para dar zoom */}
        <div className="absolute bottom-2.5 right-2.5 md:bottom-4 md:right-4 z-20 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm text-[#1d3026] flex items-center justify-center text-xs opacity-70 md:opacity-0 md:group-hover/galeria:opacity-100 transition-opacity shadow-sm pointer-events-none">
          🔍
        </div>

        {fotos.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm text-[#1d3026] w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg opacity-40 md:opacity-0 md:group-hover/galeria:opacity-100 transition-all duration-300 z-30 hover:scale-110">‹</button>
            <button onClick={nextImg} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm text-[#1d3026] w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg opacity-40 md:opacity-0 md:group-hover/galeria:opacity-100 transition-all duration-300 z-30 hover:scale-110">›</button>
            <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover/galeria:opacity-100 transition-all duration-300 z-30 bg-white/50 backdrop-blur-md px-2 md:px-3 py-1 md:py-1.5 rounded-full pointer-events-none">
              {fotos.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === imgIndex ? 'bg-[#1d3026] w-2 md:w-3' : 'bg-gray-400 w-1.5'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="p-4 md:p-6 flex flex-col flex-1 bg-white relative z-20">
        <h3 
          onClick={() => abrirDetalhes(produto)}
          className="font-sans font-bold text-[#1d3026] text-xs md:text-sm leading-relaxed line-clamp-2 mb-1 group-hover:text-[#c5a880] transition-colors cursor-pointer"
        >
          {produto.nome}
        </h3>

        {produto.descricao && (
          <p 
            onClick={() => abrirDetalhes(produto)}
            className="text-[10px] text-gray-400 line-clamp-1 mb-2 cursor-pointer"
          >
            {produto.descricao}
          </p>
        )}
        
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">{produto.categoria}</span>
            
            {precoPromocional && precoPromocional < produto.preco ? (
              <div className="flex flex-col">
                <span className="text-[10px] md:text-xs text-gray-400 line-through font-bold">
                  {Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="font-tradicional italic font-bold text-red-600 text-lg md:text-2xl tracking-tight leading-none mt-0.5 md:mt-1">
                  {Number(precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            ) : (
              <span className="font-tradicional italic font-bold text-[#1d3026] text-lg md:text-2xl tracking-tight leading-none mt-0.5 md:mt-1">
                {Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </div>
          
          <button 
            onClick={() => {
              const produtoParaCarrinho = precoPromocional ? { ...produto, preco: precoPromocional, precoOriginal: produto.preco } : produto;
              adicionarAoCarrinho(produtoParaCarrinho);
            }}
            disabled={noCarrinho}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 shadow-md ${
              noCarrinho 
                ? 'bg-[#F4F1EA] text-gray-400 cursor-not-allowed shadow-none border border-gray-200' 
                : precoPromocional
                  ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-600/40 hover:-translate-y-1 active:scale-95'
                  : 'bg-[#1d3026] text-[#F4F1EA] hover:bg-[#c5a880] hover:shadow-[#c5a880]/40 hover:-translate-y-1 active:scale-95'
            }`}
          >
            {noCarrinho ? '✓' : '🛒'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// 🟢 COMPONENTE: HERO INTERATIVO (Vitrine 3D Completa SVG 360º)
// =======================================================
function HeroInterativo() {
  return (
    <div className="relative bg-gradient-to-b from-[#1d3026] via-[#243d31] to-[#F4F1EA] overflow-hidden min-h-[60vh] flex items-center justify-center pt-44 pb-16">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes textoSobe {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes vitrine360 {
          0% { transform: rotateY(0deg) rotateX(5deg); }
          100% { transform: rotateY(-360deg) rotateX(5deg); } 
        }
        @keyframes shadowPulse360 {
          0% { transform: translateX(-50%) scale(1); opacity: 0.4; }
          25% { transform: translateX(-50%) scale(0.7); opacity: 0.2; }
          50% { transform: translateX(-50%) scale(1); opacity: 0.4; }
          75% { transform: translateX(-50%) scale(0.7); opacity: 0.2; }
          100% { transform: translateX(-50%) scale(1); opacity: 0.4; }
        }
        
        .anim-texto-1 { animation: textoSobe 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .anim-texto-2 { animation: textoSobe 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.3s; }
      `}} />

      <div className="absolute top-[0%] left-[-5%] w-[60%] h-[60%] bg-[#c5a880] rounded-full mix-blend-screen filter blur-[140px] opacity-20 animate-pulse duration-1000"></div>

      <div className="max-w-7xl mx-auto px-4 w-full flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
        
        {/* LADO ESQUERDO: TEXTOS */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left z-20">
          <span className="anim-texto-1 px-5 py-2 rounded-full border border-[#c5a880]/40 text-[#e6d0a7] bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-sm flex items-center gap-2">
            <span className="text-sm">🌟</span> Coleção Premium
          </span>

          <h1 className="anim-texto-2 font-tradicional text-5xl md:text-7xl lg:text-[6rem] italic leading-[1.1] font-light text-white drop-shadow-2xl">
            O seu novo olhar <br/>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d0a7]">
              começa aqui.
            </span>
          </h1>
        </div>

        {/* LADO DIREITO: ÓCULOS 3D (SVG Puro) GIRANDO 360 GRAUS SEM PARAR */}
        <div className="anim-texto-2 flex-1 w-full flex flex-col items-center justify-center relative pt-12 md:pt-0" style={{ animationDelay: '0.6s' }}>
          
          <div className="relative w-[280px] sm:w-[320px] h-[100px]" style={{ perspective: '1000px' }}>
            <div className="w-full h-full relative" style={{ transformStyle: 'preserve-3d', animation: 'vitrine360 12s linear infinite' }}>
              
              {/* Lente Frontal e Aros */}
              <div className="absolute inset-0" style={{ transform: 'translateZ(100px)' }}>
                <svg viewBox="0 0 300 100" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)]">
                  <defs>
                    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#222"/>
                      <stop offset="50%" stopColor="#0a0a0a"/>
                      <stop offset="100%" stopColor="#111"/>
                    </linearGradient>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c5a880"/>
                      <stop offset="50%" stopColor="#f3e0c0"/>
                      <stop offset="100%" stopColor="#8b7355"/>
                    </linearGradient>
                    <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
                      <stop offset="50%" stopColor="rgba(255,255,255,0)"/>
                      <stop offset="100%" stopColor="rgba(255,255,255,0.1)"/>
                    </linearGradient>
                  </defs>
                  <rect x="10" y="10" width="130" height="80" rx="20" fill="url(#lensGrad)"/>
                  <rect x="160" y="10" width="130" height="80" rx="20" fill="url(#lensGrad)"/>
                  <rect x="10" y="10" width="130" height="80" rx="20" fill="none" stroke="url(#frameGrad)" strokeWidth="12"/>
                  <rect x="160" y="10" width="130" height="80" rx="20" fill="none" stroke="url(#frameGrad)" strokeWidth="12"/>
                  <path d="M 140 30 Q 150 20 160 30" fill="none" stroke="url(#goldGrad)" strokeWidth="8"/>
                  <rect x="-2" y="25" width="12" height="16" rx="4" fill="url(#goldGrad)"/>
                  <rect x="290" y="25" width="12" height="16" rx="4" fill="url(#goldGrad)"/>
                </svg>
              </div>

              {/* Haste Lateral Esquerda */}
              <div className="absolute top-[28px] left-[5px] h-[8px] w-[180px] rounded-l-full"
                   style={{ 
                     background: 'linear-gradient(to right, #c5a880 0%, #111 20%, transparent 100%)',
                     transformOrigin: 'left center',
                     transform: 'translateZ(100px) rotateY(-85deg)'
                   }}>
              </div>

              {/* Haste Lateral Direita */}
              <div className="absolute top-[28px] right-[5px] h-[8px] w-[180px] rounded-r-full"
                   style={{ 
                     background: 'linear-gradient(to left, #c5a880 0%, #111 20%, transparent 100%)',
                     transformOrigin: 'right center',
                     transform: 'translateZ(100px) rotateY(85deg)'
                   }}>
              </div>
            </div>
          </div>
          
          <div className="absolute -bottom-10 left-1/2 w-[220px] h-5 bg-black/40 blur-xl rounded-full" style={{ animation: 'shadowPulse360 12s linear infinite' }}></div>
        </div>

      </div>
    </div>
  );
}

// =======================================================
// 🟢 COMPONENTE PRINCIPAL: LOJA ONLINE
// =======================================================
export default function HomeLoja() {
  const navigate = useNavigate();
  const { data: produtos = [], isLoading: carregando } = useProdutos();
  
  const [busca, setBusca] = useState('');
  
  const infinitePayUser = import.meta.env.VITE_INFINITEPAY_USER || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';
  
  const [categoriaAtiva, setCategoriaAtiva] = useState('TODAS');
  const [isScrolled, setIsScrolled] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  
  const clienteLogado = JSON.parse(localStorage.getItem('clienteLogadoElos') || 'null');
  const [mostrarTermos, setMostrarTermos] = useState(false);
  const [produtoEmDestaque, setProdutoEmDestaque] = useState(null);

  const [carrinho, setCarrinho] = useState(() => {
    try { return JSON.parse(localStorage.getItem('carrinhoVirtualElos')) || []; } catch (e) { return []; }
  });

  const [cupomDigitado, setCupomDigitado] = useState('');
  const [cupomAtivo, setCupomAtivo] = useState(null); 
  const [validandoCupom, setValidandoCupom] = useState(false);

  // 🟢 FRETE: Retirada na Loja já começa visível e pré-selecionada!
  const [cepFrete, setCepFrete] = useState('');
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [opcoesFrete, setOpcoesFrete] = useState([OPCAO_RETIRADA_FIXA]);
  const [freteSelecionado, setFreteSelecionado] = useState(OPCAO_RETIRADA_FIXA);

  const promocoesAtivas = useMemo(() => {
    return (produtos || []).filter(p => p.categoria === 'PROMO_CATE');
  }, [produtos]);

  const obterPrecoPromocional = (produto) => {
    const regraPromo = promocoesAtivas.find(p => p.nome === `PROMOCAO_${produto.categoria}`);
    if (!regraPromo) return null;

    let precoComDesconto = Number(produto.preco);
    const valorDesconto = Number(regraPromo.preco);

    if (regraPromo.referencia === 'PERCENTUAL') {
      precoComDesconto = precoComDesconto - (precoComDesconto * (valorDesconto / 100));
    } else {
      precoComDesconto = precoComDesconto - valorDesconto;
    }
    return Math.max(0, precoComDesconto);
  };

  const temPromocaoNoCarrinho = useMemo(() => {
    return carrinho.some(i => i.categoria === 'UPSELL' || i.precoOriginal);
  }, [carrinho]);

  useEffect(() => {
    if (temPromocaoNoCarrinho && cupomAtivo) {
      setCupomAtivo(null);
      setCupomDigitado('');
      alert("⚠️ O cupom de desconto foi removido, pois você já possui itens em promoção no carrinho.");
    }
  }, [temPromocaoNoCarrinho, cupomAtivo]);

  useEffect(() => {
    localStorage.setItem('carrinhoVirtualElos', JSON.stringify(carrinho));
  }, [carrinho]);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [etapaCheckout, setEtapaCheckout] = useState(0); 
  const [processando, setProcessando] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('VITRINE'); 
  const [meusPedidos, setMeusPedidos] = useState([]);

  const [dadosCliente, setDadosCliente] = useState({ 
    nome: clienteLogado?.nome || '', 
    telefone: clienteLogado?.telefone || '', 
    cpf: clienteLogado?.cpf || '',
    endereco: clienteLogado?.endereco || '',
    temGrau: null 
  });

  const buscarPedidos = async () => {
    if (!clienteLogado?.cpf) return; 
    try {
      const res = await fetch(`${apiUrl}/pedidos_online`);
      if (res.ok) {
        const todosPedidos = await res.json();
        setMeusPedidos(todosPedidos.filter(p => p.clienteCpf === clienteLogado.cpf));
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (abaAtiva === 'MEUS_PEDIDOS' && clienteLogado) buscarPedidos();
  }, [abaAtiva, clienteLogado]); 

  const produtoUpsell = useMemo(() => {
    return (produtos || []).find(p => p.categoria === 'UPSELL' && p.quantidade > 0);
  }, [produtos]);

  const calculosCarrinho = useMemo(() => {
    const subtotalBruto = carrinho.reduce((total, item) => total + Number(item.preco), 0);
    let descontoCupom = 0;

    if (cupomAtivo && !temPromocaoNoCarrinho) {
      const valorElegivelCupom = carrinho.reduce((total, item) => total + Number(item.preco), 0);
      if (cupomAtivo.tipo === 'PERCENTUAL') {
        descontoCupom = valorElegivelCupom * (Number(cupomAtivo.valor) / 100);
      } else {
        descontoCupom = Math.min(Number(cupomAtivo.valor), valorElegivelCupom); 
      }
    }

    const valorFrete = freteSelecionado ? freteSelecionado.valor : 0;
    const totalFinal = Math.max(0, subtotalBruto - descontoCupom) + valorFrete;

    return { subtotalBruto, descontoCupom, valorFrete, totalFinal };
  }, [carrinho, cupomAtivo, temPromocaoNoCarrinho, freteSelecionado]);

  const validarCupomServidor = async () => {
    if (!cupomDigitado.trim()) return;
    setValidandoCupom(true);
    try {
      const res = await fetch(`${apiUrl}/cupons/validar/${cupomDigitado}`);
      const data = await res.json();
      if (data.valido) {
        setCupomAtivo(data.cupom);
      } else {
        setCupomAtivo(null);
        alert(data.error || "Cupom inválido.");
      }
    } catch (e) { alert("Erro ao validar cupom."); } 
    finally { setValidandoCupom(false); }
  };

  const handleMascaraTel = (v) => {
    let valor = v.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 2) valor = `(${valor.substring(0,2)}) ${valor.substring(2)}`;
    if (valor.length > 10) valor = `${valor.substring(0,10)}-${valor.substring(10)}`;
    return valor;
  };

  const handleMascaraCep = (v) => {
    let valor = v.replace(/\D/g, '');
    if (valor.length > 5) valor = `${valor.substring(0, 5)}-${valor.substring(5, 8)}`;
    return valor.substring(0, 9);
  };

  const calcularFrete = async () => {
    if (cepFrete.replace(/\D/g, '').length !== 8) return alert("Digite um CEP válido com 8 dígitos.");
    setCalculandoFrete(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      const cepPrefixo = cepFrete.substring(0, 2);
      let opcoes = [OPCAO_RETIRADA_FIXA];
      
      if (['60','61'].includes(cepPrefixo)) {
        opcoes.push({ id: 'motoboy', nome: 'Motoboy Fortaleza/Região', valor: 15.00, prazo: '1 dia útil' });
      }
      
      opcoes.push({ id: 'pac', nome: 'Correios PAC', valor: 28.90, prazo: '5 a 8 dias úteis' });
      opcoes.push({ id: 'sedex', nome: 'Correios Sedex', valor: 45.50, prazo: '2 a 3 dias úteis' });
      
      setOpcoesFrete(opcoes);
      setFreteSelecionado(opcoes[1] || opcoes[0]);
    } catch (e) {
      alert("Erro ao calcular frete.");
    } finally {
      setCalculandoFrete(false);
    }
  };

  const getTextoStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return { texto: 'Aguardando Pagamento', cor: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
      case 'PAGO': return { texto: 'Pagamento Aprovado', cor: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'CONCLUIDO': return { texto: 'Pedido Entregue', cor: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'CANCELADO': return { texto: 'Cancelado', cor: 'text-red-600 bg-red-50 border-red-200' };
      default: return { texto: status, cor: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const produtosLoja = useMemo(() => {
    let filtrados = (produtos || []).filter(p => 
      (p.quantidade > 0 || p.categoria === 'LENTE') &&
      p.categoria !== 'UPSELL' && 
      p.categoria !== 'PROMO_CATE'
    );
    if (busca) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(p => 
        (p.nome || '').toLowerCase().includes(termo) || 
        (p.referencia || '').toLowerCase().includes(termo) ||
        (p.descricao || '').toLowerCase().includes(termo)
      );
    }
    if (categoriaAtiva !== 'TODAS') filtrados = filtrados.filter(p => p.categoria === categoriaAtiva);
    return filtrados;
  }, [produtos, busca, categoriaAtiva]);

  const categorias = [
    { id: 'TODAS', label: 'Catálogo' },
    { id: 'ARMAÇÃO', label: 'Armações' },
    { id: 'LENTE', label: 'Lentes' },
    { id: 'ÓCULOS DE SOL', label: 'Solar' },
    { id: 'ACESSÓRIOS', label: 'Acessórios' }
  ];

  const adicionarAoCarrinho = (produto) => {
    if (carrinho.find(item => item._id === (produto._id || produto.id))) return;
    setCarrinho([...carrinho, { ...produto, _id: (produto._id || produto.id) }]);
    setMostrarCarrinho(true);
    setEtapaCheckout(0); 
  };

  const removerDoCarrinho = (idProduto) => {
    setCarrinho(carrinho.filter(item => item._id !== idProduto));
    if (carrinho.length === 1) {
      setEtapaCheckout(0);
    }
  };

  const limparCarrinhoCompleto = () => {
    if (!window.confirm("Deseja remover todos os itens do carrinho?")) return;
    setCarrinho([]);
    setEtapaCheckout(0);
    setCupomAtivo(null);
  };

  const processarPedido = async (e) => {
    e.preventDefault();
    const temArmacaoNoCarrinho = carrinho.some(i => i.categoria === 'ARMAÇÃO');
    if (temArmacaoNoCarrinho && dadosCliente.temGrau === null) {
      alert("Por favor, selecione nas opções abaixo se as suas lentes terão grau ou não.");
      return;
    }

    setProcessando(true);

    const isRetiradaNaLoja = freteSelecionado?.id === 'retirada';
    let enderecoFinal = isRetiradaNaLoja 
      ? 'RETIRADA NA LOJA FÍSICA (Rua Viriato Ribeiro, 321A - Bela Vista)' 
      : dadosCliente.endereco;

    if (temArmacaoNoCarrinho) {
      enderecoFinal += dadosCliente.temGrau 
        ? '\n\n[ÓCULOS COM GRAU - Cliente enviará a Receita]' 
        : '\n\n[ÓCULOS SEM GRAU - Apenas lente de descanso/estética]';
    }

    const payload = {
  clienteNome: dadosCliente.nome,
  clienteTelefone: dadosCliente.telefone,
  clienteCpf: dadosCliente.cpf,
  clienteEndereco: enderecoFinal,
  itens: carrinho.map(item => ({ id: item._id })),
  cupomUtilizado: cupomAtivo ? cupomAtivo.codigo : undefined,
  freteId: freteSelecionado?.id || 'retirada',
  cep: cepFrete
};

try {
  const res = await fetch(`${apiUrl}/pedidos_online`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok) {
    setPedidoFinalizado(data.pedido);   // já vem com valorTotal, freteValor e freteTipo corretos
    setCarrinho([]); setCupomAtivo(null); setCupomDigitado('');
    setFreteSelecionado(OPCAO_RETIRADA_FIXA);
    setEtapaCheckout(2);
  } else {
    alert(data.error || 'Ops! Tivemos um problema.');
  }
} catch (err) { alert('Erro ao conectar com o servidor.'); }
finally { setProcessando(false); }
}; 

  const cancelarPedido = async (pedidoId) => {
    if (!window.confirm("Deseja cancelar este pedido?")) return;
    try {
      const res = await fetch(`${apiUrl}/pedidos_online/${pedidoId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELADO' }) });
      if (res.ok) buscarPedidos(); 
    } catch (error) {}
  };

  const avisarWhatsApp = (pedidoEspecifico = null) => {
    const p = pedidoEspecifico || pedidoFinalizado;
    if (!p) return;
    
    const ehSemGrau = p.clienteEndereco && p.clienteEndereco.includes('SEM GRAU');
    const txtReceita = ehSemGrau 
      ? "Meu óculos é *SEM GRAU*, quero a lente apenas para descanso/estética." 
      : "Estou enviando minha *Receita Médica* para a produção das minhas lentes.";

    const texto = `*OLÁ! GOSTARIA DE FALAR SOBRE O MEU PEDIDO!* 📦✨\n\n*Número do Pedido:* #${p.numeroPedidoOnline}\n*Meu Nome:* ${p.clienteNome}\n*Modalidade:* ${p.freteTipo || 'Retirada/Entrega'}\n*Valor:* R$ ${Number(p.valorTotal).toFixed(2).replace('.', ',')}\n\n${txtReceita}\n\nAqui está o comprovante de pagamento.`;
    
    window.open(`https://wa.me/5585985506571?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleSair = () => { localStorage.removeItem('clienteLogadoElos'); window.location.reload(); };

  const verificarLoginEAvancar = (destino) => {
    if (clienteLogado) {
      if (destino === 'HISTORICO') setAbaAtiva('MEUS_PEDIDOS');
      if (destino === 'CHECKOUT') setEtapaCheckout(1);
    } else {
      localStorage.setItem('redirect_pos_login', 'loja');
      setMostrarCarrinho(false); 
      navigate('/login'); 
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EA]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1d3026] border-t-[#c5a880] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#1d3026] font-bold uppercase tracking-[0.2em] text-xs">Preparando Experiência...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] font-sans relative pb-20">
      
      {mostrarTermos && <ModalTermos onClose={() => setMostrarTermos(false)} />}

      {/* MODAL DE ZOOM E DETALHES DO PRODUTO */}
      {produtoEmDestaque && (
        <ModalDetalhesProduto 
          produto={produtoEmDestaque}
          precoPromocional={obterPrecoPromocional(produtoEmDestaque)}
          noCarrinho={carrinho.some(item => item._id === (produtoEmDestaque._id || produtoEmDestaque.id))}
          adicionarAoCarrinho={adicionarAoCarrinho}
          apiUrl={apiUrl}
          onClose={() => setProdutoEmDestaque(null)}
        />
      )}

      {/* NAVBAR PRINCIPAL */}
      <nav className={`fixed w-full top-0 z-[60] transition-all duration-500 ease-in-out flex items-center ${isScrolled ? 'bg-[#F4F1EA]/95 backdrop-blur-xl shadow-sm border-b border-gray-200/50 h-[70px]' : 'bg-transparent h-[80px]'}`}>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAbaAtiva('VITRINE')}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-500 group-hover:scale-105 ${isScrolled ? 'bg-[#1d3026]' : 'bg-white'}`}>
                <img src="/favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className={`font-tradicional text-2xl italic font-bold transition-colors duration-500 ${isScrolled ? 'text-[#1d3026]' : 'text-white drop-shadow-md'}`}>Ótica Elos</span>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
              <div className="hidden md:flex flex-col text-right">
                {clienteLogado ? (
                  <>
                    <span className={`text-xs font-bold transition-colors duration-500 ${isScrolled ? 'text-[#1d3026]' : 'text-white drop-shadow-sm'}`}>{clienteLogado.nome.split(' ')[0]}</span>
                    <div className="flex items-center gap-2 justify-end mt-0.5">
                      <button onClick={() => verificarLoginEAvancar('HISTORICO')} className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${isScrolled ? 'text-[#c5a880] hover:text-[#1d3026]' : 'text-[#c5a880] hover:text-white'}`}>Pedidos</button>
                      <span className={`transition-colors duration-500 ${isScrolled ? 'text-gray-300' : 'text-white/30'}`}>|</span>
                      <button onClick={handleSair} className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${isScrolled ? 'text-red-400 hover:text-red-600' : 'text-red-300 hover:text-white'}`}>Sair</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => verificarLoginEAvancar('VITRINE')} className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-500 ${isScrolled ? 'text-[#1d3026] hover:text-[#c5a880]' : 'text-white hover:text-[#c5a880] drop-shadow-sm'}`}>
                    Entrar / Cadastrar
                  </button>
                )}
              </div>

              <div className="md:hidden flex items-center">
                <button 
                  onClick={() => verificarLoginEAvancar(clienteLogado ? 'HISTORICO' : 'VITRINE')} 
                  className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-500 shadow-sm ${isScrolled ? 'bg-white text-[#1d3026] border border-gray-200' : 'bg-white/20 text-white backdrop-blur-sm border border-white/30'}`}
                >
                  <span className="text-sm">👤</span>
                </button>
              </div>

              <div className={`hidden md:block h-8 w-px transition-colors duration-500 ${isScrolled ? 'bg-gray-200' : 'bg-white/20'}`}></div>
              
              <button 
                onClick={() => { setMostrarCarrinho(true); if(etapaCheckout === 2) setEtapaCheckout(0); }} 
                className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 shadow-sm ${isScrolled ? 'bg-white text-[#1d3026] hover:bg-[#c5a880] hover:text-white border border-gray-200' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30'}`}
              >
                <span className="text-lg md:text-xl">🛒</span>
                {carrinho.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-transparent">
                    {carrinho.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* NAVBAR SECUNDÁRIA: CATEGORIAS E BUSCA */}
      {abaAtiva === 'VITRINE' && (
        <div className={`fixed w-full left-0 z-[50] py-2.5 transition-all duration-500 ${isScrolled ? 'top-[70px] bg-[#F4F1EA]/95 backdrop-blur-md shadow-sm border-b border-gray-200/50' : 'top-[80px] bg-transparent border-b border-white/10'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-6">
              
              <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {categorias.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => {
                       setCategoriaAtiva(cat.id);
                       window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'smooth' });
                    }}
                    className={`flex-shrink-0 flex items-center px-4 sm:px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                      categoriaAtiva === cat.id 
                      ? (isScrolled ? 'bg-[#1d3026] text-[#F4F1EA] shadow-md scale-105' : 'bg-[#c5a880] text-white shadow-md scale-105')
                      : (isScrolled ? 'bg-white text-gray-500 border border-gray-200/60 hover:border-[#c5a880]/50 hover:text-[#1d3026]' : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 hover:text-white')
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64 group">
                <input 
                  type="text" placeholder="Buscar modelo ou ref..." value={busca} onChange={(e) => setBusca(e.target.value)}
                  className={`w-full pl-9 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-xs font-bold transition-all shadow-sm ${isScrolled ? 'bg-white border border-gray-200 text-gray-700' : 'bg-white/15 border border-white/20 text-white placeholder-white/60 backdrop-blur-md'}`}
                />
                <span className={`absolute left-3.5 top-2 text-xs transition-colors ${isScrolled ? 'text-gray-400' : 'text-white/60'}`}>🔍</span>
                {busca && (
                  <button onClick={() => setBusca('')} className={`absolute right-3 top-1.5 text-sm font-bold ${isScrolled ? 'text-gray-400 hover:text-red-500' : 'text-white/70 hover:text-white'}`}>
                    &times;
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'VITRINE' ? (
        <>
          <HeroInterativo />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-20">
            <div className="flex justify-between items-end mb-8" style={{ animation: 'fadeUp 1s ease forwards', opacity: 0, animationDelay: '0.4s' }}>
              <div>
                <h2 className="text-3xl font-tradicional text-[#1d3026] italic">
                  {categorias.find(c => c.id === categoriaAtiva)?.label}
                </h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mt-2">
                  Mostrando {produtosLoja.length} resultados
                </p>
              </div>
            </div>

            {produtosLoja.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-gray-200/50 flex flex-col items-center" style={{ animation: 'fadeUp 1s ease forwards', opacity: 0, animationDelay: '0.6s' }}>
                <span className="text-7xl opacity-10 mb-6 drop-shadow-sm">🛒</span>
                <p className="text-gray-400 font-medium text-lg">Ainda não temos produtos nesta categoria.</p>
                <button onClick={() => {setBusca(''); setCategoriaAtiva('TODAS');}} className="mt-6 px-6 py-3 bg-[#F4F1EA] text-[#1d3026] hover:bg-[#c5a880] hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                  Ver Todo o Catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 px-1 md:px-0">
                {produtosLoja.map((produto) => (
                  <ProdutoCard 
                    key={produto._id || produto.id} 
                    produto={produto} 
                    noCarrinho={carrinho.some(item => item._id === (produto._id || produto.id))}
                    adicionarAoCarrinho={adicionarAoCarrinho}
                    abrirDetalhes={(prod) => setProdutoEmDestaque(prod)}
                    apiUrl={apiUrl}
                    precoPromocional={obterPrecoPromocional(produto)} 
                  />
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-32" style={{ animation: 'fadeUp 0.8s ease forwards' }}>
          <div className="flex flex-col items-center mb-12 text-center">
            <h2 className="text-4xl font-tradicional text-[#1d3026] italic">Seus Pedidos</h2>
            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-black mt-3 mb-6">Histórico de Compras e Entregas</p>
            <button onClick={handleSair} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-6 py-2.5 rounded-full transition-colors border border-red-100">
               Desconectar Minha Conta
            </button>
          </div>

          {meusPedidos.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] shadow-sm border border-gray-200/50">
              <span className="text-6xl opacity-10 block mb-6">📦</span>
              <p className="text-gray-400 font-medium mb-8">Sua jornada com a Elos ainda não começou.</p>
              <button onClick={() => setAbaAtiva('VITRINE')} className="px-8 py-4 bg-[#1d3026] text-[#F4F1EA] rounded-xl text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#c5a880] transition-colors shadow-lg active:scale-95">
                Explorar Vitrine
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {meusPedidos.map((pedido) => {
                const infoStatus = getTextoStatus(pedido.status);
                return (
                  <div key={pedido._id} className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-200/50 flex flex-col md:flex-row gap-8 justify-between hover:shadow-lg transition-shadow">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-2xl font-black text-[#1d3026] tracking-tight">#{pedido.numeroPedidoOnline}</span>
                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] border ${infoStatus.cor}`}>{infoStatus.texto}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        Realizado em {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')} às {new Date(pedido.dataPedido).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <div className="bg-[#F4F1EA] p-4 rounded-2xl w-full border border-gray-200/50">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2 border-b border-gray-200 pb-2">Itens do Pedido</p>
                        <ul className="space-y-2">
                          {(pedido.itens || []).map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-800 font-bold flex gap-2">
                              <span className="text-[#c5a880]">1x</span> {item.nome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-6 w-full md:w-auto md:border-l border-gray-200 md:pl-8">
                      <div className="md:text-right">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] mb-1">Total Pago</p>
                        <p className="text-3xl font-tradicional italic font-bold text-[#1d3026]">{Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row w-full gap-3">
                        {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
                          <button onClick={() => cancelarPedido(pedido._id)} className="w-full px-6 py-3.5 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all">
                            Cancelar
                          </button>
                        )}
                        <button onClick={() => avisarWhatsApp(pedido)} className="w-full px-6 py-3.5 bg-[#1d3026] text-[#F4F1EA] hover:bg-[#c5a880] shadow-md hover:shadow-[#c5a880]/30 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                          <span>💬</span> Atendimento em Vídeo ou Texto
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* CARRINHO LATERAL */}
      {mostrarCarrinho && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-[#1d3026]/40 backdrop-blur-sm transition-opacity" onClick={() => { if(!processando) setMostrarCarrinho(false) }}></div>

          <div className="relative w-full max-w-[430px] bg-white h-full shadow-2xl flex flex-col rounded-l-[2rem] overflow-hidden" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
            
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-[#F4F1EA]">
              <div>
                <h2 className="text-2xl font-tradicional italic font-bold text-[#1d3026]">
                  {etapaCheckout === 0 && "Seu Carrinho"}
                  {etapaCheckout === 1 && "Finalizar Pedido"}
                  {etapaCheckout === 2 && "Tudo Certo!"}
                </h2>
                <p className="text-[9px] uppercase tracking-widest text-[#c5a880] font-black mt-1">
                  {etapaCheckout === 0 && `${carrinho.length} ${carrinho.length === 1 ? 'item selecionado' : 'itens selecionados'}`}
                  {etapaCheckout === 1 && "Confirme seus dados"}
                  {etapaCheckout === 2 && "Reserva concluída"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {etapaCheckout === 0 && carrinho.length > 1 && (
                  <button 
                    onClick={limparCarrinhoCompleto} 
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Esvaziar carrinho"
                  >
                    Limpar
                  </button>
                )}
                {!processando && (
                  <button onClick={() => setMostrarCarrinho(false)} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-red-500 text-2xl transition-all shadow-sm">
                    &times;
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white custom-scrollbar">
              
              {etapaCheckout === 0 && (
                <div className="space-y-4">
                  {carrinho.length === 0 ? (
                    <div className="text-center text-gray-400 py-16 flex flex-col items-center">
                      <span className="text-6xl opacity-10 block mb-4">🛒</span>
                      <p className="text-sm font-bold text-[#1d3026] mb-1">Seu carrinho está vazio</p>
                      <p className="text-xs text-gray-400 mb-6">Explore nossa vitrine e escolha sua nova armação.</p>
                      <button 
                        onClick={() => setMostrarCarrinho(false)}
                        className="px-6 py-3 bg-[#1d3026] text-[#F4F1EA] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#c5a880] transition-colors"
                      >
                        Continuar Comprando
                      </button>
                    </div>
                  ) : (
                    <>
                      {carrinho.map(item => {
                        const fotoCapa = (item.fotos && item.fotos.length > 0) ? item.fotos[0] : item.foto;
                        return (
                          <div key={item._id} className="flex items-center gap-4 bg-[#F4F1EA] p-4 rounded-2xl border border-transparent hover:border-[#c5a880]/30 transition-all group">
                            <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 p-2 relative shadow-sm">
                              {fotoCapa ? (
                                <img src={fotoCapa.startsWith('http') ? fotoCapa : `${apiUrl.replace(/\/$/, '')}/produtos/${item._id || item.id}/foto?v=1`} className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }}/>
                              ) : null}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-[#1d3026] line-clamp-2">{item.nome}</h4>
                              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500 mt-1 mb-2">Ref: {item.referencia || 'N/A'}</p>
                              <div className="flex gap-2 items-baseline">
                                <p className="text-sm font-tradicional italic font-bold text-[#c5a880]">{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                {item.precoOriginal && (
                                  <p className="text-[9px] text-gray-400 line-through font-bold">R$ {Number(item.precoOriginal).toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                            <button onClick={() => removerDoCarrinho(item._id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500 transition-all text-lg shadow-sm bg-white border border-gray-200">&times;</button>
                          </div>
                        );
                      })}

                      {produtoUpsell && carrinho.some(i => i.categoria === 'ARMAÇÃO') && !carrinho.some(i => i._id === produtoUpsell._id) && (
                        <div className="mt-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm relative overflow-hidden" style={{ animation: 'fadeUp 0.5s ease forwards' }}>
                          <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-200 rounded-full mix-blend-multiply opacity-50 blur-xl"></div>
                          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-yellow-200 rounded-full mix-blend-multiply opacity-50 blur-xl"></div>

                          <div className="flex gap-3 items-start relative z-10">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 text-xl border border-orange-100">🎁</div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm">Oferta Desbloqueada</span>
                              </div>
                              <h4 className="text-sm font-black text-orange-900 tracking-tight leading-tight">Preço especial de Combo!</h4>
                              <p className="text-[10px] text-orange-800/80 font-medium mt-1.5 leading-relaxed">
                                Como você escolheu uma armação, adicione a <strong className="text-orange-900">{produtoUpsell.nome}</strong> com desconto exclusivo!
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => adicionarAoCarrinho(produtoUpsell)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-95 relative z-10"
                          >
                            + Aproveitar Oferta por {Number(produtoUpsell.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </button>
                        </div>
                      )}

                      {/* 🟢 RETIRADA NA LOJA JÁ SELECIONADA E SEMPRE VISÍVEL */}
                      <div className="pt-6 mt-6 border-t border-gray-100">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-3 ml-1">
                          Como deseja receber?
                        </p>

                        <div className="space-y-2 mb-4">
                          {opcoesFrete.map(opcao => (
                            <label 
                              key={opcao.id} 
                              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                                freteSelecionado?.id === opcao.id 
                                  ? 'border-[#1d3026] bg-[#1d3026]/5 ring-1 ring-[#1d3026]' 
                                  : 'border-gray-200 bg-white hover:border-[#c5a880]/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input 
                                  type="radio" 
                                  name="frete" 
                                  checked={freteSelecionado?.id === opcao.id} 
                                  onChange={() => setFreteSelecionado(opcao)}
                                  className="w-4 h-4 text-[#1d3026] focus:ring-[#1d3026]"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-[#1d3026] flex items-center gap-1.5">
                                    {opcao.id === 'retirada' ? '🏪' : '🚚'} {opcao.nome}
                                  </span>
                                  <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                                    {opcao.id === 'retirada' ? 'Rua Viriato Ribeiro, 321A - Bela Vista' : `Prazo: ${opcao.prazo}`}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs font-black ${opcao.valor === 0 ? 'text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200' : 'text-[#1d3026]'}`}>
                                {opcao.valor === 0 ? 'GRÁTIS' : Number(opcao.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="bg-[#F4F1EA]/70 p-3.5 rounded-2xl border border-gray-200/60">
                          <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider block mb-2">
                            Prefere receber em casa? Calcule o frete por CEP:
                          </span>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Digite seu CEP (00000-000)" 
                              value={cepFrete}
                              onChange={e => setCepFrete(handleMascaraCep(e.target.value))}
                              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]/30 text-xs font-bold tracking-widest text-[#1d3026]"
                            />
                            <button 
                              onClick={calcularFrete}
                              disabled={calculandoFrete || cepFrete.length < 9}
                              className="px-4 bg-[#1d3026] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#c5a880] transition-colors disabled:opacity-40"
                            >
                              {calculandoFrete ? '⏳' : 'Calcular'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 mt-6 border-t border-gray-100">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-3 ml-1">Cupom de Desconto</p>
                        
                        {temPromocaoNoCarrinho ? (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                              🚫 Cupons não são cumulativos com os itens em liquidação que você já possui no carrinho.
                            </p>
                          </div>
                        ) : !cupomAtivo ? (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Digite o código" 
                              value={cupomDigitado}
                              onChange={e => setCupomDigitado(e.target.value.toUpperCase())}
                              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]/30 text-xs font-bold uppercase tracking-widest text-[#1d3026]"
                            />
                            <button 
                              onClick={validarCupomServidor}
                              disabled={validandoCupom || !cupomDigitado}
                              className="px-5 bg-[#1d3026] text-[#F4F1EA] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#c5a880] transition-colors disabled:opacity-50"
                            >
                              {validandoCupom ? '...' : 'Aplicar'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 text-lg">🏷️</span>
                              <div>
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">{cupomAtivo.codigo}</p>
                                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Desconto aplicado com sucesso!</p>
                              </div>
                            </div>
                            <button onClick={() => { setCupomAtivo(null); setCupomDigitado(''); }} className="text-gray-400 hover:text-red-500 text-lg">&times;</button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {etapaCheckout === 1 && (
                <form id="formCheckout" onSubmit={processarPedido} className="space-y-6 pb-4" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
                  <div className="bg-[#1d3026]/5 p-5 rounded-2xl border border-[#1d3026]/10 mb-4 flex items-start gap-4">
                    <span className="text-xl">✨</span>
                    <p className="text-xs text-[#1d3026] font-medium leading-relaxed">
                      Pronto para finalizar! Confirme seus dados de contato abaixo.
                    </p>
                  </div>

                  {carrinho.some(i => i.categoria === 'ARMAÇÃO') && (
                    <div className="space-y-3 pt-2 pb-4 border-b border-gray-200">
                      <label className="text-[9px] font-black text-[#c5a880] uppercase tracking-widest ml-2">Sobre suas lentes</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button 
                          type="button" 
                          onClick={() => setDadosCliente({...dadosCliente, temGrau: false})} 
                          className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-1.5 ${dadosCliente.temGrau === false ? 'bg-[#1d3026] text-[#F4F1EA] border-[#1d3026] shadow-md ring-2 ring-[#1d3026]/20' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1d3026]/40 hover:bg-gray-50'}`}
                        >
                          <span className={`uppercase tracking-wider text-[10px] font-black ${dadosCliente.temGrau === false ? 'text-[#c5a880]' : 'text-gray-400'}`}>Sem Grau</span>
                          <span className="text-xs font-bold">Apenas p/ Descanso</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setDadosCliente({...dadosCliente, temGrau: true})} 
                          className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-1.5 ${dadosCliente.temGrau === true ? 'bg-[#1d3026] text-[#F4F1EA] border-[#1d3026] shadow-md ring-2 ring-[#1d3026]/20' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1d3026]/40 hover:bg-gray-50'}`}
                        >
                          <span className={`uppercase tracking-wider text-[10px] font-black ${dadosCliente.temGrau === true ? 'text-[#c5a880]' : 'text-gray-400'}`}>Com Grau</span>
                          <span className="text-xs font-bold">Vou enviar a receita</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Nome Completo</label>
                    <input type="text" required value={dadosCliente.nome} onChange={e => setDadosCliente({...dadosCliente, nome: e.target.value})} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm font-bold text-[#1d3026] transition-all" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">WhatsApp</label>
                    <input type="tel" required value={dadosCliente.telefone} onChange={e => setDadosCliente({...dadosCliente, telefone: handleMascaraTel(e.target.value)})} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm font-bold text-[#1d3026] transition-all" />
                  </div>
                  
                  {freteSelecionado?.id === 'retirada' ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 block">
                        🏪 Modalidade: Retirada na Loja (Grátis)
                      </span>
                      <p className="text-xs font-bold text-[#1d3026]">
                        Rua Viriato Ribeiro, 321A - Bela Vista, Fortaleza-CE
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Avisaremos no seu WhatsApp assim que seu pedido estiver separado para retirada.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Endereço Completo (Entrega)</label>
                      <textarea required rows="3" placeholder="Rua, Número, Bairro, Complemento e Ponto de Referência..." value={dadosCliente.endereco || ''} onChange={e => setDadosCliente({...dadosCliente, endereco: e.target.value})} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm font-bold text-[#1d3026] resize-none transition-all" />
                    </div>
                  )}
                </form>
              )}

              {etapaCheckout === 2 && pedidoFinalizado && (
                <div className="text-center flex flex-col h-full pt-4" style={{ animation: 'fadeUp 0.6s ease forwards' }}>
                  <div className="w-24 h-24 bg-[#1d3026] text-[#c5a880] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative"><span className="text-4xl">✨</span></div>
                  <h3 className="font-tradicional text-4xl italic font-bold text-[#1d3026] mb-2">Perfeito!</h3>
                  <p className="text-sm text-gray-500 mb-8 px-4 leading-relaxed">Seu pedido <span className="font-black text-[#1d3026]">#{pedidoFinalizado.numeroPedidoOnline}</span> foi gerado com sucesso e os itens foram reservados.</p>

                  <div className="bg-[#F4F1EA] p-6 rounded-3xl border border-gray-200/50 shadow-inner mb-8 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2">Total a pagar</p>
                    <p className="text-4xl font-tradicional italic font-bold text-[#1d3026] mb-2">{Number(pedidoFinalizado.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <span className="text-[10px] font-bold text-[#c5a880] uppercase tracking-widest">{pedidoFinalizado.freteTipo}</span>
                  </div>

                  <div className="mt-auto space-y-3">
                    <button 
                      disabled={gerandoLink}
                      onClick={async () => { 
                        setGerandoLink(true);
                        try {
                          const subtotalOriginal = pedidoFinalizado.itens.reduce((acc, item) => acc + Number(item.preco), 0);
                          const valorItensComDesconto = pedidoFinalizado.valorTotal - (pedidoFinalizado.freteValor || 0);
                          const fatorDesconto = subtotalOriginal > 0 ? valorItensComDesconto / subtotalOriginal : 1;
                          
                          const infiniteItems = pedidoFinalizado.itens.map(item => ({
                            quantity: 1,
                            price: Math.round((Number(item.preco) * fatorDesconto) * 100), 
                            description: item.nome
                          }));

                          if (pedidoFinalizado.freteValor > 0) {
                            infiniteItems.push({
                              quantity: 1,
                              price: Math.round(pedidoFinalizado.freteValor * 100),
                              description: `Frete: ${pedidoFinalizado.freteTipo}`
                            });
                          }

                          const telLimpo = String(pedidoFinalizado.clienteTelefone || '').replace(/\D/g, '');
                          const telFormatado = telLimpo.startsWith('55') ? `+${telLimpo}` : `+55${telLimpo}`;
                          
                          const payload = {
                            handle: String(infinitePayUser).replace(/^[$@]+/, '').trim(), 
                            order_nsu: String(pedidoFinalizado.numeroPedidoOnline),
                            redirect_url: window.location.origin, 
                            customer: {
                              name: pedidoFinalizado.clienteNome,
                              phone_number: telFormatado
                            },
                            items: infiniteItems
                          };

                          const tokenInfinite = import.meta.env.VITE_INFINITEPAY_TOKEN;

                          // 🟢 CORRIGIDO: Usando apiUrl (minúsculo) que é a variável declarada no componente
                          const res = await fetch(`${apiUrl}/infinitepay/checkout`, {
                            method: "POST",
                            headers: { 
                              "Content-Type": "application/json",
                              ...(tokenInfinite ? { "Authorization": `Bearer ${tokenInfinite}` } : {})
                            },
                            body: JSON.stringify(payload)
                          });
                          
                          const data = await res.json();
                          const linkCheckout = data.url || data.link || data?.data?.url;

                          if (res.ok && linkCheckout) {
                            const novaJanela = window.open(linkCheckout, "_blank");
                            // Se o celular bloquear o pop-up, abre na mesma aba
                            if (!novaJanela) window.location.href = linkCheckout;
                          } else {
                            console.error("Retorno erro InfinitePay:", data);
                            alert(data.error || "Ops! Falha ao gerar o link de pagamento na InfinitePay.");
                          }
                        } catch (e) {
                          console.error("Erro na requisição de checkout:", e);
                          alert("Erro ao conectar com a InfinitePay.");
                        } finally {
                          setGerandoLink(false);
                        }
                      }} 
                      className="w-full bg-[#1d3026] hover:bg-[#c5a880] text-[#F4F1EA] font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {gerandoLink ? <span className="animate-spin text-lg">⏳</span> : <><span className="text-xl">💳</span> Pagar na InfinitePay</>}
                    </button>

                    <button 
                      onClick={() => avisarWhatsApp(pedidoFinalizado)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-[0.98] text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      <span>💬</span> Enviar Receita / Falar no WhatsApp
                    </button>

                    <p className="text-[10px] text-gray-500 px-4 font-bold">Pagamento Seguro via PIX ou Cartão.</p>
                  </div>
                </div>
              )}
            </div>

            {/* RODAPÉ DO CARRINHO */}
            {etapaCheckout < 2 && carrinho.length > 0 && (
              <div className="p-6 md:p-8 border-t border-gray-200 bg-white space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] relative z-20">
                
                {calculosCarrinho.descontoCupom > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest">Cupom Promocional</span>
                    </div>
                    <span className="text-xs font-bold">- {calculosCarrinho.descontoCupom.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}

                {freteSelecionado && (
                  <div className="flex justify-between items-center text-gray-600 px-3 py-2 bg-[#F4F1EA]/60 rounded-xl">
                    <span className="text-[9px] font-black uppercase tracking-widest">{freteSelecionado.nome}</span>
                    <span className="text-xs font-bold text-[#1d3026]">{freteSelecionado.valor === 0 ? 'GRÁTIS' : Number(freteSelecionado.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}

                <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Final</span>
                  <div className="text-right">
                    {calculosCarrinho.descontoCupom > 0 && (
                       <p className="text-xs text-gray-400 line-through mb-1">{calculosCarrinho.subtotalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    )}
                    <span className="text-3xl font-tradicional italic font-bold text-[#1d3026]">
                      {calculosCarrinho.totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
                
                {etapaCheckout === 0 ? (
                  <button 
                    onClick={() => {
                      if (!freteSelecionado) return alert("Por favor, selecione uma opção de retirada ou entrega.");
                      verificarLoginEAvancar('CHECKOUT');
                    }} 
                    className="w-full bg-[#1d3026] text-[#F4F1EA] hover:bg-[#c5a880] hover:text-white font-bold py-5 rounded-2xl shadow-xl hover:shadow-[#c5a880]/30 transition-all active:scale-[0.98] text-[10px] uppercase tracking-[0.2em] mt-4"
                  >
                    Avançar Pagamento
                  </button>
                ) : (
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setEtapaCheckout(0)} disabled={processando} className="w-1/3 bg-white text-gray-500 border border-gray-200 font-bold py-5 rounded-xl transition-all hover:bg-gray-50 text-[10px] uppercase tracking-widest">Voltar</button>
                    <button type="submit" form="formCheckout" disabled={processando} className="w-2/3 bg-[#1d3026] text-[#F4F1EA] hover:bg-[#c5a880] font-bold py-5 rounded-xl shadow-xl transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest flex justify-center items-center">
                      {processando ? <span className="animate-spin text-lg">⏳</span> : 'Confirmar Pedido'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white py-16 mt-auto border-t border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-center md:text-left">
            <h4 className="font-tradicional text-3xl text-[#1d3026] italic font-bold mb-2">Ótica Elos</h4>
            <p className="text-[9px] font-black text-[#c5a880] uppercase tracking-[0.2em] mb-4">E-commerce Oficial</p>
            <p className="text-xs text-gray-600 font-medium">Rua Viriato Ribeiro, 321A - Bela Vista, Fortaleza-CE</p>
            <p className="text-[10px] text-gray-400 mt-2 font-bold tracking-wider">CNPJ: 52.294.947/0001-56</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Links Úteis & Atendimento</p>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <button onClick={() => setMostrarTermos(true)} className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-[#1d3026] transition-colors underline decoration-gray-200 hover:decoration-[#1d3026] underline-offset-4">
                Termos & Políticas
              </button>
              <a href="https://wa.me/5585985506571" target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 bg-[#1d3026] text-[#F4F1EA] hover:bg-[#c5a880] rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-[#c5a880]/30 active:scale-95 flex items-center gap-3">
                <span className="text-lg">💬</span> Atendimento Vídeo/Texto
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}