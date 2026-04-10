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

  // Tela de Carregamento com Tailwind
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
        {/* NAVBAR PROFISSIONAL */}
        <nav className="bg-white border-b border-elos-bege/20 shadow-soft sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex justify-between items-center h-20">
              
              {/* Logo */}
              <div className="font-tradicional text-2xl text-elos-verde italic font-bold">
                Ótica Elos
              </div>

              {/* Menu Desktop */}
              <div className="hidden lg:flex items-center gap-1">
                <Link to="/" className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all">Dashboard</Link>
                <Link to="/vendas" className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all">Vendas</Link>
                <Link to="/despesas" className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all">Gastos</Link>
                <Link to="/clientes" className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all">Clientes</Link>
                <Link to="/cadastro-clientes" className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all">Novo Cliente</Link> 
                <Link to="/relatorios" className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-elos-verde hover:bg-elos-fundo transition-all">Cobrança</Link>
                
                <button 
                  onClick={realizarLogout} 
                  className="ml-4 px-5 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  Sair
                </button>
              </div>

              {/* Menu Mobile (Simples) */}
              <div className="lg:hidden flex gap-2">
                 <Link to="/" className="p-2 text-elos-verde">📊</Link>
                 <Link to="/vendas" className="p-2 text-elos-verde">💰</Link>
                 <button onClick={realizarLogout} className="p-2 text-red-600">✕</button>
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