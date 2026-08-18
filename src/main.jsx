import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceiroProvider, useFinanceiro } from './FinanceiroContext';

import HomeLoja from './pages/Loja';
import Dashboard from './pages/Dashboard';
import Operacoes from './pages/Operacoes';
import Vendas from './pages/Vendas';
import Clientes from './pages/Clientes';
import RelatorioInadimplencia from './pages/Relatorios';
import Despesas from './pages/Despesas';
import Login from './pages/Login'; 
import Produtos from './pages/Produtos';
import Zap from './pages/Zap';
import Navbar from './components/Navbar'; 

import NovaOrdemServico from './pages/OrdemServico/index'; 
import PainelOS from './pages/PainelOS'; 
import EditarVenda from './pages/EditarVenda/index'; 

import './index.css'; 

function FolhasCaindo() {
  const folhas = Array.from({ length: 25 }); 
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {folhas.map((_, i) => {
        const leftPos = Math.floor(Math.random() * 100);
        const delay = Math.random() * 10;
        const duration = 6 + Math.random() * 8;
        const size = 15 + Math.random() * 20;
        return (
          <div key={i} className="absolute animate-fall" style={{ left: `${leftPos}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s`, fontSize: `${size}px`, top: '-10%', color: 'rgba(74, 93, 78, 0.15)' }}>🍃</div>
        );
      })}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall { animation: fall linear infinite; }
      `}} />
    </div>
  );
}

function ConteudoAbasPersistentes() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="animate-in fade-in duration-500">
      <div style={{ display: currentPath === '/admin' || currentPath === '/admin/dashboard' ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      <div style={{ display: currentPath === '/admin/vendas' ? 'block' : 'none' }}>
        <Vendas />
      </div>
      <div style={{ display: currentPath === '/admin/despesas' ? 'block' : 'none' }}>
        <Despesas />
      </div>
      <div style={{ display: currentPath === '/admin/clientes' ? 'block' : 'none' }}>
        <Clientes />
      </div>
      <div style={{ display: currentPath === '/admin/produtos' ? 'block' : 'none' }}>
        <Produtos />
      </div>
      <div style={{ display: currentPath === '/admin/zap' ? 'block' : 'none' }}>
        <Zap />
      </div>
      <div style={{ display: currentPath === '/admin/relatorios' ? 'block' : 'none' }}>
        <RelatorioInadimplencia />
      </div>
      <div style={{ display: currentPath === '/admin/ordens-servico' ? 'block' : 'none' }}>
        <PainelOS />
      </div>
      <div style={{ display: currentPath === '/admin/operacoes' ? 'block' : 'none' }}>
        <Operacoes />
      </div>

      <Routes>
        <Route path="/nova-os/:numeroPedido" element={<NovaOrdemServico />} />
        <Route path="/ordem-servico/editar/:id" element={<NovaOrdemServico />} />
        <Route path="/vendas/editar/:id" element={<EditarVenda />} />
        
        <Route path="/" element={null} />
        <Route path="/dashboard" element={null} />
        <Route path="/operacoes" element={null} />
        <Route path="/vendas" element={null} />
        <Route path="/despesas" element={null} />
        <Route path="/clientes" element={null} />
        <Route path="/produtos" element={null} />
        <Route path="/zap" element={null} />
        <Route path="/relatorios" element={null} />
        <Route path="/ordens-servico" element={null} />
        <Route path="*" element={null} />
      </Routes>
    </div>
  );
}

function InterfaceSistema({ aoDeslogar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalConfirmSair, setModalConfirmSair] = useState(false);

  const obterAbaInversa = () => {
    const rota = location.pathname.replace('/admin', '');
    if (rota === '' || rota === '/') return 'dashboard';
    if (rota.startsWith('/nova-os')) return null; 
    if (rota.startsWith('/ordem-servico/editar')) return null; 
    if (rota.startsWith('/vendas/editar')) return null; 
    return rota.replace('/', '');
  };

  const lidarMudancaAba = (idAba) => {
    if (idAba === 'dashboard') navigate('/admin');
    else navigate(`/admin/${idAba}`);
  };

  return (
    <div className="min-h-screen bg-elos-fundo">
      <Navbar 
        abaAtual={obterAbaInversa()} 
        setAbaAtiva={lidarMudancaAba} 
        usuarioLogado="Painel Admin" 
        onLogout={() => setModalConfirmSair(true)} 
      />

      {modalConfirmSair && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl border border-elos-bege/20 animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-elos-verde">🚪</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Sair do Sistema</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">Você deseja encerrar a sua sessão atual no ecossistema da Ótica Elos?</p>
            <div className="flex gap-3">
              <button onClick={() => setModalConfirmSair(false)} className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all">Não, Voltar</button>
              <button onClick={() => { setModalConfirmSair(false); aoDeslogar(); }} className="flex-1 py-3 bg-elos-verde text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-elos-verde/20 hover:bg-[#3a4a3e] transition-all">Sim, Sair</button>
            </div>
          </div>
        </div>
      )}

      <main>
        <ConteudoAbasPersistentes />
      </main>
    </div>
  );
}

function AppContent() {
  const [autenticadoAdmin, setAutenticadoAdmin] = useState(false);
  const { carregando } = useFinanceiro();

  useEffect(() => {
    const auth = localStorage.getItem('otica_elos_auth');
    if (auth === 'true') setAutenticadoAdmin(true);
  }, []);

  const realizarLoginAdmin = () => {
    setAutenticadoAdmin(true);
    localStorage.setItem('otica_elos_auth', 'true');
  };

  const realizarLogoutAdmin = () => {
    setAutenticadoAdmin(false);
    localStorage.removeItem('otica_elos_auth');
  };

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
    <Routes>
      {/* 🟢 1. Vitrine da Loja (Home) */}
      <Route path="/" element={<HomeLoja />} />
      <Route path="/loja" element={<Navigate to="/" replace />} />
      
      {/* 🟢 2. Tela de Login Universal (Permitida para TODOS) */}
      <Route path="/login" element={<Login onLogin={realizarLoginAdmin} />} />

      {/* 🟢 3. Painel Administrativo Protegido */}
      <Route path="/admin/*" element={
        autenticadoAdmin ? <InterfaceSistema aoDeslogar={realizarLogoutAdmin} /> : <Navigate to="/login" replace />
      } />
      
      {/* 🟢 4. Segurança (Qualquer outra URL não encontrada volta pra Loja) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router> 
      <FinanceiroProvider>
        <AppContent />
      </FinanceiroProvider>
    </Router>
  </React.StrictMode>
);