import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ abaAtual, setAbaAtiva, usuarioLogado, onLogout }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  const linksNav = [
    { id: 'dashboard', nome: 'Dashboard', icone: '📊' },
    { id: 'vendas', nome: 'Nova Venda', icone: '👓' },
    { id: 'clientes', nome: 'Clientes', icone: '👥' },
    { id: 'produtos', nome: 'Catálogo', icone: '📦' },
    { id: 'despesas', nome: 'Despesas', icone: '💸' },
    { id: 'relatorios', nome: 'Cobrança', icone: '🚨' },
    { id: 'zap', nome: 'Automação', icone: '🟢' }, 
  ];

  // 🟢 CORRIGIDO: Agora apenas chama a função do main.jsx (que já sabe para onde navegar) e fecha o menu.
  const handleNavegacao = (abaId) => {
    setAbaAtiva(abaId);
    setMenuAberto(false);
  };

  return (
    <>
      {/* NAVBAR SUPERIOR ULTRA COMPACTA CLEAN */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-elos-bege/10 shadow-sm px-4 md:px-10 py-4 flex items-center justify-between transition-all gap-4">
        
        {/* LOGO DA ÓTICA */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => handleNavegacao('dashboard')}>
          <span className="text-2xl animate-in fade-in duration-500">👓</span>
          <div className="flex flex-col">
            <span className="font-tradicional text-xl font-black text-elos-verde italic tracking-tight leading-none">
              Ótica Elos
            </span>
            <span className="text-[8px] font-sans font-black uppercase tracking-[0.25em] text-elos-bege mt-0.5">
              SISTEMA INTERNO
            </span>
          </div>
        </div>

        {/* CONTROLE DE PERFIL RAPIDO */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-black text-elos-texto uppercase tracking-wide">
              {usuarioLogado || 'Painel Admin'}
            </span>
            <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter text-right">
              ● Online
            </span>
          </div>

          {/* BOTÃO HAMBÚRGUER UNIFICADO */}
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2.5 bg-elos-fundo text-elos-verde rounded-xl focus:outline-none transition-all active:scale-95 hover:bg-elos-bege hover:text-white flex items-center justify-center shadow-xs gap-2 font-black text-xs uppercase tracking-wider"
            title="Abrir Menu de Navegação"
          >
            <span className="text-xs">MENU</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* GAVETA LATERAL DE NAVEGAÇÃO UNIFICADA BLINDADA CONTRA ROLAGEM HORIZONTAL */}
      {menuAberto && (
        <div 
          className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setMenuAberto(false)}
        >
          <div 
            className="w-72 max-w-full h-full bg-white shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-elos-bege/10 box-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header Interno do Drawer */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex flex-col">
                  <span className="font-tradicional text-lg text-elos-verde font-black italic">Navegação</span>
                  <span className="text-[9px] font-sans font-black text-gray-400 uppercase tracking-widest">Painel de Controle</span>
                </div>
                <button 
                  onClick={() => setMenuAberto(false)}
                  className="w-8 h-8 flex items-center justify-center bg-elos-fundo text-gray-400 hover:text-red-500 rounded-full text-xl transition-colors font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Lista Vertical de Links - Apenas rolagem para cima e para baixo */}
              <div className="flex flex-col gap-2 max-h-[65vh] overflow-y-auto no-scrollbar overflow-x-hidden">
                {linksNav.map((link) => {
                  // 🟢 CORRIGIDO: Só compara a aba atual para manter as páginas de Vendas/Clientes acesas ao acessá-las.
                  const ativo = abaAtual === link.id; 
                  return (
                    <button
                      key={link.id}
                      onClick={() => handleNavegacao(link.id)}
                      className={`w-full px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-4 transition-all whitespace-normal break-words ${
                        ativo 
                          ? 'bg-elos-verde text-white shadow-md shadow-elos-verde/10 scale-[1.01]' 
                          : 'text-gray-400 bg-elos-fundo/40 hover:bg-elos-fundo hover:text-elos-verde'
                      }`}
                    >
                      <span className="text-base shrink-0">{link.icone}</span>
                      <span className="flex-1">{link.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rodapé da Gaveta Lateral */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-elos-texto uppercase tracking-wide truncate">
                  {usuarioLogado || 'Admin'}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Ótica Elos &copy; 2026</span>
              </div>
              <button 
                onClick={() => {
                  setMenuAberto(false);
                  onLogout();
                }}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Sair</span> 🚪
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}