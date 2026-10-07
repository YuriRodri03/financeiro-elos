import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Portal() {
  const navigate = useNavigate();
  const [hoverLente, setHoverLente] = useState(null);
  const [animacaoEntrada, setAnimacaoEntrada] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Efeito Parallax - O fundo se move levemente contra o mouse (Sensação 3D)
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleEntrar = (destino) => {
    setAnimacaoEntrada(destino);
    setTimeout(() => {
      navigate(destino === 'esquerda' ? '/loja' : '/login');
    }, 900); 
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a120e] flex items-center justify-center font-sans">
      
      {/* --- INJEÇÃO DE ESTILOS E ANIMAÇÕES --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0px); } }
        
        /* Brilho varrendo a lente (Lens Flare) */
        @keyframes lensShine { 0% { left: -100%; opacity: 0; } 20% { opacity: 0.6; } 100% { left: 150%; opacity: 0; } }
        
        /* Pulso suave para indicar onde tocar no celular */
        @keyframes pulseMobile { 
          0% { box-shadow: 0 0 0px rgba(197,168,128,0); } 
          50% { box-shadow: 0 0 20px rgba(197,168,128,0.2); } 
          100% { box-shadow: 0 0 0px rgba(197,168,128,0); } 
        }
        
        /* Zoom Imersivo Direcional */
        @keyframes zoomLeft { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(18) translate(25%, 5%); opacity: 0; filter: blur(5px); } }
        @keyframes zoomRight { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(18) translate(-25%, 5%); opacity: 0; filter: blur(5px); } }
        
        .anim-fade-up { animation: fadeUp 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-float { animation: float 6s ease-in-out infinite; }
        .lens-shine::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%); transform: skewX(-25deg); animation: lensShine 4s infinite; }
        
        .zoom-left { animation: zoomLeft 1s cubic-bezier(0.7, 0, 0.2, 1) forwards; pointer-events: none; }
        .zoom-right { animation: zoomRight 1s cubic-bezier(0.7, 0, 0.2, 1) forwards; pointer-events: none; }
        
        .lens-mobile-hint { animation: pulseMobile 3s infinite; }
        .dust { position: absolute; background: white; border-radius: 50%; opacity: 0.15; pointer-events: none; }
      `}} />

      {/* --- PARTÍCULAS DE LUZ --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="dust" style={{
            width: Math.random() * 4 + 1 + 'px',
            height: Math.random() * 4 + 1 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            animation: `float ${Math.random() * 10 + 10}s linear infinite`,
            animationDelay: `-${Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      {/* --- FUNDOS INTELIGENTES --- */}
      <div 
        className="absolute inset-0 transition-all duration-1000 z-0"
        style={{ 
          filter: animacaoEntrada ? 'blur(30px) brightness(0)' : 'blur(0px) brightness(1)',
          transform: `scale(${animacaoEntrada ? 1.4 : 1.1}) translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` 
        }}
      >
        {/* Camada 1: Verde Elos (Padrão) */}
        <div className={`absolute inset-0 bg-gradient-to-b from-[#1d3026] to-[#0a120e] transition-opacity duration-1000 ${hoverLente === null ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.15)_0%,transparent_60%)]"></div>
        </div>
        
        {/* Camada 2: Bege/Dourado (Loja Online) */}
        <div className={`absolute inset-0 bg-gradient-to-tr from-[#4a3b2b] via-[#c5a880] to-[#8b7355] transition-opacity duration-1000 ${hoverLente === 'esquerda' ? 'opacity-100' : 'opacity-0'}`}></div>
        
        {/* Camada 3: Café/Escuro (Login) */}
        <div className={`absolute inset-0 bg-gradient-to-tl from-[#120f0b] via-[#2a221b] to-[#0d0a08] transition-opacity duration-1000 ${hoverLente === 'direita' ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>

      {/* --- CABEÇALHO --- */}
      <div className={`absolute top-[12%] text-center anim-fade-up transition-all duration-700 z-20 ${animacaoEntrada ? '-translate-y-32 opacity-0' : 'opacity-100'}`}>
        <h1 className="text-white text-4xl md:text-6xl tracking-[0.35em] font-light uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Ótica Elos
        </h1>
        <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-[#c5a880] to-transparent mx-auto mt-6 opacity-70"></div>
      </div>

      {/* --- ÓCULOS ESTRUTURAL E LENTES --- */}
      <div 
        className={`relative w-[92%] max-w-[800px] anim-fade-up anim-float z-20 ${
          animacaoEntrada === 'esquerda' ? 'zoom-left' : 
          animacaoEntrada === 'direita' ? 'zoom-right' : ''
        }`}
        style={{ animationDelay: '0.4s' }}
      >
        
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 350" className="w-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.9)] pointer-events-none relative z-30">
          <defs>
            <linearGradient id="frameColor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#222"/>
              <stop offset="30%" stopColor="#3d3d3d"/>
              <stop offset="60%" stopColor="#1a1a1a"/>
              <stop offset="100%" stopColor="#050505"/>
            </linearGradient>
            <linearGradient id="goldColor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c5a880"/>
              <stop offset="50%" stopColor="#f3e0c0"/>
              <stop offset="100%" stopColor="#8b7355"/>
            </linearGradient>
          </defs>
          
          <path d="M 80 120 Q 40 115 0 90" fill="none" stroke="url(#goldColor)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 920 120 Q 960 115 1000 90" fill="none" stroke="url(#goldColor)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 450 140 Q 500 110 550 140" fill="none" stroke="url(#goldColor)" strokeWidth="16" strokeLinecap="round" />
          <rect x="80" y="50" width="370" height="250" rx="60" fill="none" stroke="url(#frameColor)" strokeWidth="26" />
          <rect x="550" y="50" width="370" height="250" rx="60" fill="none" stroke="url(#frameColor)" strokeWidth="26" />
        </svg>

        {/* LENTE ESQUERDA: Loja Online */}
        <div 
          onMouseEnter={() => !animacaoEntrada && setHoverLente('esquerda')}
          onMouseLeave={() => !animacaoEntrada && setHoverLente(null)}
          onTouchStart={() => !animacaoEntrada && setHoverLente('esquerda')}
          onClick={() => handleEntrar('esquerda')} 
          className={`absolute top-[14.2%] left-[8%] w-[37%] h-[71.4%] cursor-pointer transition-all duration-700 flex items-center justify-center z-10 overflow-hidden lens-mobile-hint
            ${hoverLente === 'esquerda' ? 'bg-[#c5a880]/50 backdrop-blur-md shadow-[inset_0_0_40px_rgba(255,255,255,0.3)]' : 'bg-white/10 backdrop-blur-sm'}`}
          style={{ borderRadius: '16%' }}
        >
          <div className={`absolute inset-0 lens-shine transition-opacity duration-700 ${hoverLente === 'esquerda' ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className={`absolute inset-[2px] border-[1px] transition-all duration-700 ${hoverLente === 'esquerda' ? 'border-white/60' : 'border-white/20'}`} style={{ borderRadius: '16%' }}></div>
          
          <span className={`text-white font-bold tracking-[0.2em] text-[11px] md:text-sm uppercase transition-all duration-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-center px-4 relative z-20
            ${hoverLente === 'esquerda' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-80 scale-95 translate-y-1'}`}>
            Loja
          </span>
        </div>

        {/* LENTE DIREITA: Login */}
        <div 
          onMouseEnter={() => !animacaoEntrada && setHoverLente('direita')}
          onMouseLeave={() => !animacaoEntrada && setHoverLente(null)}
          onTouchStart={() => !animacaoEntrada && setHoverLente('direita')}
          onClick={() => handleEntrar('direita')} 
          className={`absolute top-[14.2%] right-[8%] w-[37%] h-[71.4%] cursor-pointer transition-all duration-700 flex items-center justify-center z-10 overflow-hidden lens-mobile-hint
            ${hoverLente === 'direita' ? 'bg-[#1a1510]/60 backdrop-blur-md shadow-[inset_0_0_40px_rgba(197,168,128,0.2)]' : 'bg-white/10 backdrop-blur-sm'}`}
          style={{ borderRadius: '16%' }}
        >
          <div className={`absolute inset-0 lens-shine transition-opacity duration-700 ${hoverLente === 'direita' ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className={`absolute inset-[2px] border-[1px] transition-all duration-700 ${hoverLente === 'direita' ? 'border-[#c5a880]/60' : 'border-white/20'}`} style={{ borderRadius: '16%' }}></div>

          <span className={`text-[#c5a880] font-bold tracking-[0.2em] text-[11px] md:text-sm uppercase transition-all duration-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-center px-4 relative z-20
            ${hoverLente === 'direita' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-80 scale-95 translate-y-1'}`}>
            Login
          </span>
        </div>
      </div>

      {/* --- TEXTO DE ORIENTAÇÃO RODAPÉ --- */}
      <div className={`absolute bottom-[10%] text-center anim-fade-up transition-all duration-700 z-20 w-full px-4 ${animacaoEntrada ? 'translate-y-20 opacity-0' : 'opacity-100'}`} style={{ animationDelay: '0.8s' }}>
        <p className={`text-[#c5a880] text-[10px] md:text-xs tracking-[0.3em] uppercase transition-opacity duration-500 font-bold ${hoverLente ? 'opacity-100' : 'opacity-60'}`}>
          {hoverLente === 'esquerda' ? 'Vitrine, Promoções e Produtos' : 
           hoverLente === 'direita' ? 'Pagina de Login e Cadastro' : 
           'Toque em uma lente para acessar'}
        </p>
      </div>

    </div>
  );
}