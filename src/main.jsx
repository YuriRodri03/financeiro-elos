import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FinanceiroProvider, useFinanceiro } from './FinanceiroContext';

import Dashboard from './pages/Dashboard';
import Vendas from './pages/Vendas';
import Clientes from './pages/Clientes';
import CadastroClientes from './pages/CadastroClientes';
import RelatorioInadimplencia from './pages/Relatorios';
import Despesas from './pages/Despesas';
import Login from './pages/Login';
import Produtos from './pages/Produtos';

import './index.css'; 

// --- COMPONENTE DO EFEITO DE FOLHAS (CORRIGIDO) ---
function FolhasCaindo() {
  // Aumentei para 25 folhas para um efeito mais visível e elegante
  const folhas = Array.from({ length: 25 }); 
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {folhas.map((_, i) => {
        const leftPos = Math.floor(Math.random() * 100);
        const delay = Math.random() * 10;
        const duration = 6 + Math.random() * 8;
        const size = 15 + Math.random() * 20;

        return (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${leftPos}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              fontSize: `${size}px`,
              top: '-10%',
              color: 'rgba(74, 93, 78, 0.15)' // Verde Elos com transparência suave
            }}
          >
            🍃
          </div>
        );
      })}
      {/* CSS injetado para garantir funcionamento em qualquer navegador */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fall {
          0% { 
            transform: translateY(0) rotate(0deg); 
            opacity: 0; 
          }
          10% { 
            opacity: 1; 
          }
          90% { 
            opacity: 1; 
          }
          100% { 
            transform: translateY(110vh) rotate(720deg); 
            opacity: 0; 
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}} />
    </div>
  );
}

function AppContent() {
  const [autenticado, setAutenticado] = useState(false);
  const { carregando } = useFinanceiro();

  useEffect(() => {
    const auth = localStorage.getItem('otica_elos_auth');
    if (auth === 'true') setAutenticado(true);
  }, []);

  const realizarLogin = () => {
    setAutenticado(true);
    localStorage.setItem('otica_elos_auth', 'true');
  };

  const realizarLogout = () => {
    if (window.confirm("Deseja sair do sistema?")) {
      setAutenticado(false);
      localStorage.removeItem('otica_elos_auth');
    }
  };

  if (!autenticado) return <Login onLogin={realizarLogin} />;

  // --- TELA DE CARREGAMENTO COM EFEITO ---
  if (carregando) {
    return (
      <div className="fixed inset-0 flex flex-col justify-center items-center bg-elos-fundo text-elos-verde z-[9999] overflow-hidden">
        <FolhasCaindo />
        
        <div className="relative z-10 text-center">
          <h2 className="font-tradicional text-5xl mb-3 animate-pulse italic">Ótica Elos</h2>
          <div className="w-16 h-[1px] bg-elos-bege mx-auto mb-4 opacity-40"></div>
          <p className="text-[10px] uppercase tracking-[0.5em] font-black opacity-40">Sincronizando</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-elos-fundo">
        {/* NAVBAR */}
        <nav className="bg-white border-b border-elos-bege/20 shadow-soft sticky top-0 z-40 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex justify-between items-center h-20 gap-4">
              
              <div className="font-tradicional text-xl md:text-2xl text-elos-verde italic font-bold whitespace-nowrap">
                Ótica Elos
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                <Link to="/" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Dashboard</Link>
                <Link to="/vendas" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Vendas</Link>
                <Link to="/despesas" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Gastos</Link>
                <Link to="/clientes" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Clientes</Link>
                <Link to="/produtos" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Produtos</Link>
                <Link to="/cadastro-clientes" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Cadastro</Link> 
                <Link to="/relatorios" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Cobrança</Link>
                
                <button 
                  onClick={realizarLogout} 
                  className="ml-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all whitespace-nowrap"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="animate-in fade-in duration-500">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/despesas" element={<Despesas />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/cadastro-clientes" element={<CadastroClientes />} />
            <Route path="/relatorios" element={<RelatorioInadimplencia />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FinanceiroProvider>
      <AppContent />
    </FinanceiroProvider>
  </React.StrictMode>
);