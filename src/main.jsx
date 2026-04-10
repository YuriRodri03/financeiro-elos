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

import './index.css'; 

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

  if (carregando) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-elos-fundo text-elos-verde">
        <h2 className="font-tradicional text-4xl mb-2 animate-pulse italic">Ótica Elos</h2>
        <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-60">Sincronizando dados...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-elos-fundo">
        {/* NAVBAR ADAPTADA PARA TABLET */}
        <nav className="bg-white border-b border-elos-bege/20 shadow-soft sticky top-0 z-40 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex justify-between items-center h-20 gap-4">
              
              {/* Logo - Mantém fixa na esquerda */}
              <div className="font-tradicional text-xl md:text-2xl text-elos-verde italic font-bold whitespace-nowrap">
                Ótica Elos
              </div>

              {/* Menu com Scroll Horizontal para Tablets (no-scrollbar) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                <Link to="/" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Dashboard</Link>
                <Link to="/vendas" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Vendas</Link>
                <Link to="/despesas" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Gastos</Link>
                <Link to="/clientes" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Clientes</Link>
                <Link to="/cadastro-clientes" className="px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all whitespace-nowrap">Novo</Link> 
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

        {/* ÁREA DE CONTEÚDO */}
        <main className="animate-in fade-in duration-500">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/despesas" element={<Despesas />} />
            <Route path="/clientes" element={<Clientes />} />
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