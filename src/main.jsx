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
import Equipe from './pages/Equipe';
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

// 🟢 Componente Central: Rotas e Restrições
function ConteudoAbasPersistentes({ cargo }) {
  const location = useLocation();
  const currentPath = location.pathname;

  // 🟢 BLOQUEIO DE ACESSO DIRETO VIA URL (Proteção RBAC)
  const isVendedor = cargo === 'VENDEDOR';
  
  const mostrarRota = (caminho) => {
    // Se for Vendedor, bloqueia Despesas, Operações, Relatórios e Zap
    if (isVendedor) {
      const rotasProibidas = ['/admin/despesas', '/admin/operacoes', '/admin/zap', '/admin/relatorios', '/admin/dashboard'];
      if (rotasProibidas.includes(caminho)) return false;
      // Se ele tentar ir pro /admin raiz, o painel vai ficar em branco. No InterfaceSistema nós o forçaremos pro /admin/vendas
      if (caminho === '/admin' && currentPath === '/admin') return false; 
    }
    return currentPath === caminho;
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Rotas Restritas a ADMIN */}
      {!isVendedor && (
        <>
          <div style={{ display: currentPath === '/admin' || currentPath === '/admin/dashboard' ? 'block' : 'none' }}>
            <Dashboard />
          </div>
          <div style={{ display: mostrarRota('/admin/despesas') ? 'block' : 'none' }}>
            <Despesas />
          </div>
          <div style={{ display: mostrarRota('/admin/operacoes') ? 'block' : 'none' }}>
            <Operacoes />
          </div>
          <div style={{ display: mostrarRota('/admin/zap') ? 'block' : 'none' }}>
            <Zap />
          </div>
          <div style={{ display: mostrarRota('/admin/relatorios') ? 'block' : 'none' }}>
            <RelatorioInadimplencia />
          </div>
          <div style={{ display: mostrarRota('/admin/equipe') ? 'block' : 'none' }}>
            <Equipe />
          </div>
        </>
      )}

      {/* Rotas Liberadas para TODOS (Admin e Vendedor) */}
      <div style={{ display: mostrarRota('/admin/vendas') ? 'block' : 'none' }}>
        <Vendas />
      </div>
      <div style={{ display: mostrarRota('/admin/clientes') ? 'block' : 'none' }}>
        <Clientes />
      </div>
      <div style={{ display: mostrarRota('/admin/produtos') ? 'block' : 'none' }}>
        <Produtos />
      </div>
      <div style={{ display: mostrarRota('/admin/ordens-servico') ? 'block' : 'none' }}>
        <PainelOS />
      </div>

      <Routes>
        <Route path="/nova-os/:numeroPedido" element={<NovaOrdemServico />} />
        <Route path="/ordem-servico/editar/:id" element={<NovaOrdemServico />} />
        {/* 🟢 CORREÇÃO: A rota Editar Venda também deve ser carregada pelo Router para pegar o :id dinâmico */}
        <Route path="/vendas/editar/:id" element={<EditarVenda />} />
        
        {/* Placeholder nulo para rotas base capturadas pelos divs persistentes */}
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

function InterfaceSistema({ aoDeslogar, dadosUsuario }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalConfirmSair, setModalConfirmSair] = useState(false);

  // 🟢 Se o Vendedor logar e cair no /admin, joga ele pras Vendas direto!
  useEffect(() => {
    if (dadosUsuario?.cargo === 'VENDEDOR' && (location.pathname === '/admin' || location.pathname === '/admin/dashboard')) {
      navigate('/admin/vendas', { replace: true });
    }
  }, [location.pathname, dadosUsuario, navigate]);

  const obterAbaInversa = () => {
    const rota = location.pathname.replace('/admin', '');
    if (rota === '' || rota === '/') return dadosUsuario?.cargo === 'VENDEDOR' ? 'vendas' : 'dashboard';
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
      {/* 🟢 Mandando o Cargo para o Navbar para ele esconder os botões */}
      <Navbar 
        abaAtual={obterAbaInversa()} 
        setAbaAtiva={lidarMudancaAba} 
        usuarioLogado={dadosUsuario?.nome || "Equipe Elos"} 
        cargo={dadosUsuario?.cargo || "VENDEDOR"}
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
        <ConteudoAbasPersistentes cargo={dadosUsuario?.cargo} />
      </main>
    </div>
  );
}

function AppContent() {
  const [autenticadoAdmin, setAutenticadoAdmin] = useState(false);
  const [dadosUsuarioLocal, setDadosUsuarioLocal] = useState(null);
  const { carregando } = useFinanceiro();

  // 🟢 Carrega os dados do Login ao abrir o site
  useEffect(() => {
    const authStatus = localStorage.getItem('otica_elos_auth');
    const dadosEquipe = localStorage.getItem('otica_elos_dados_equipe');
    
    if (authStatus === 'true' && dadosEquipe) {
      setAutenticadoAdmin(true);
      setDadosUsuarioLocal(JSON.parse(dadosEquipe));
    } else if (authStatus === 'true') {
      // Retrocompatibilidade (Se ele tava logado na versão antiga, assume que é Admin)
      setAutenticadoAdmin(true);
      setDadosUsuarioLocal({ nome: 'Admin', cargo: 'ADMIN' });
    }
  }, []);

  // 🟢 Recebe os dados exatos do banco vindo da tela de Login
  const realizarLoginAdmin = (dadosFuncionario) => {
    setAutenticadoAdmin(true);
    setDadosUsuarioLocal(dadosFuncionario);
    localStorage.setItem('otica_elos_auth', 'true');
    if (dadosFuncionario) {
      localStorage.setItem('otica_elos_dados_equipe', JSON.stringify(dadosFuncionario));
    }
  };

  const realizarLogoutAdmin = () => {
    setAutenticadoAdmin(false);
    setDadosUsuarioLocal(null);
    localStorage.removeItem('otica_elos_auth');
    localStorage.removeItem('otica_elos_dados_equipe');
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
      <Route path="/" element={<HomeLoja />} />
      <Route path="/loja" element={<Navigate to="/" replace />} />
      
      <Route path="/login" element={<Login onLogin={realizarLoginAdmin} />} />

      <Route path="/admin/*" element={
        autenticadoAdmin ? <InterfaceSistema aoDeslogar={realizarLogoutAdmin} dadosUsuario={dadosUsuarioLocal} /> : <Navigate to="/login" replace />
      } />
      
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