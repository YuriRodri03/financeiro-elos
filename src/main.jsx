/* eslint-disable react-refresh/only-export-components */
import './authFetch'; // 🟢 PRIMEIRO: anexa o token do painel a todas as chamadas à API
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, useLocation, useNavigate, Routes, Route, Navigate, useParams } from 'react-router-dom';

// Importações do React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Portal from './pages/Portal';
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
import NovaOrdemServico from './pages/OrdemServico';
import PainelOS from './pages/PainelOS';
import EditarVenda from './pages/EditarVenda';

import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';
const CHAVE_TOKEN = 'otica_elos_token';
const CHAVE_AUTH = 'otica_elos_auth';
const CHAVE_DADOS = 'otica_elos_dados_equipe';

const ROTAS_APENAS_ADMIN = [
  '/admin',
  '/admin/dashboard',
  '/admin/despesas',
  '/admin/operacoes',
  '/admin/zap',
  '/admin/relatorios',
  '/admin/equipe',
];

// 🟢 Gerado fora do render para não violar react-hooks/purity
const FOLHAS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  leftPos: Math.floor(Math.random() * 100),
  delay: Math.random() * 10,
  duration: 6 + Math.random() * 8,
  size: 15 + Math.random() * 20,
}));

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function FolhasCaindo() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {FOLHAS.map((f) => (
        <div
          key={f.id}
          className="absolute animate-fall"
          style={{
            left: `${f.leftPos}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            fontSize: `${f.size}px`,
            top: '-10%',
            color: 'rgba(74, 93, 78, 0.15)',
          }}
        >
          🍃
        </div>
      ))}
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

// Componente Central: Rotas e Restrições
function ConteudoAbasPersistentes({ cargo }) {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/+$/, '') || '/';

  const isVendedor = cargo === 'VENDEDOR';

  const mostrarRota = (caminho) => {
    if (isVendedor && ROTAS_APENAS_ADMIN.includes(caminho)) return false;
    return currentPath === caminho;
  };

  return (
    <div className="animate-in fade-in duration-500">
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
        <Route path="nova-os/:numeroPedido" element={<NovaOrdemServico />} />
        <Route path="ordem-servico/editar/:id" element={<NovaOrdemServico />} />
        <Route path="vendas/editar/:id" element={<EditarVenda />} />

        <Route path="" element={null} />
        <Route path="dashboard" element={null} />
        <Route path="operacoes" element={null} />
        <Route path="vendas" element={null} />
        <Route path="despesas" element={null} />
        <Route path="clientes" element={null} />
        <Route path="produtos" element={null} />
        <Route path="zap" element={null} />
        <Route path="relatorios" element={null} />
        <Route path="equipe" element={null} />
        <Route path="ordens-servico" element={null} />
        <Route path="*" element={null} />
      </Routes>
    </div>
  );
}

function InterfaceSistema({ aoDeslogar, dadosUsuario }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalConfirmSair, setModalConfirmSair] = useState(false);

  // 🟢 Redireciona VENDEDOR de qualquer rota restrita a ADMIN
  useEffect(() => {
    const caminho = location.pathname.replace(/\/+$/, '');
    if (dadosUsuario?.cargo === 'VENDEDOR' && ROTAS_APENAS_ADMIN.includes(caminho)) {
      navigate('/admin/vendas', { replace: true });
    }
  }, [location.pathname, dadosUsuario?.cargo, navigate]);

  const obterAbaInversa = () => {
    const rota = location.pathname.replace('/admin', '').replace(/\/+$/, '');
    if (rota === '') return dadosUsuario?.cargo === 'VENDEDOR' ? 'vendas' : 'dashboard';
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
        usuarioLogado={dadosUsuario?.nome || 'Equipe Elos'}
        cargo={dadosUsuario?.cargo || 'VENDEDOR'}
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

// Interceptadores para segurar usuários perdidos em botões antigos em cache
function InterceptarEdicaoVenda() {
  const { id } = useParams();
  return <Navigate to={`/admin/vendas/editar/${id}`} replace />;
}
function InterceptarNovaOS() {
  const { numeroPedido } = useParams();
  return <Navigate to={`/admin/nova-os/${numeroPedido}`} replace />;
}
function InterceptarEditarOS() {
  const { id } = useParams();
  return <Navigate to={`/admin/ordem-servico/editar/${id}`} replace />;
}

function AppContent() {
  const [autenticadoAdmin, setAutenticadoAdmin] = useState(() => {
    return localStorage.getItem(CHAVE_AUTH) === 'true' && !!localStorage.getItem(CHAVE_TOKEN);
  });

  const [dadosUsuarioLocal, setDadosUsuarioLocal] = useState(() => {
    const logado = localStorage.getItem(CHAVE_AUTH) === 'true' && !!localStorage.getItem(CHAVE_TOKEN);
    if (!logado) return null;
    try {
      const dadosEquipe = localStorage.getItem(CHAVE_DADOS);
      return dadosEquipe ? JSON.parse(dadosEquipe) : { nome: 'Equipe Elos', cargo: 'VENDEDOR' };
    } catch {
      return { nome: 'Equipe Elos', cargo: 'VENDEDOR' };
    }
  });

  const [mostrarSplash, setMostrarSplash] = useState(() => {
    try { return sessionStorage.getItem('splashVisto') !== '1'; } catch { return true; }
  });

  const realizarLoginAdmin = (dadosFuncionario) => {
    const { token, ...dados } = dadosFuncionario || {};
    if (!token) {
      alert('Não foi possível iniciar a sessão. Tente novamente.');
      return;
    }
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_AUTH, 'true');
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(dados));
    setAutenticadoAdmin(true);
    setDadosUsuarioLocal(dados);
  };

  const realizarLogoutAdmin = useCallback(() => {
    setAutenticadoAdmin(false);
    setDadosUsuarioLocal(null);
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_AUTH);
    localStorage.removeItem(CHAVE_DADOS);
    queryClient.clear();
  }, []);

  useEffect(() => {
    if (!mostrarSplash) return undefined;
    const timer = setTimeout(() => {
      try { sessionStorage.setItem('splashVisto', '1'); } catch {}
      setMostrarSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [mostrarSplash]);

  useEffect(() => {
    const aoExpirar = () => realizarLogoutAdmin();
    window.addEventListener('elos:sessao-expirada', aoExpirar);
    return () => window.removeEventListener('elos:sessao-expirada', aoExpirar);
  }, [realizarLogoutAdmin]);

  useEffect(() => {
    if (!autenticadoAdmin) return undefined;
    let cancelado = false;

    fetch(`${API_URL}/funcionarios/eu`)
      .then(async (res) => {
        if (cancelado || !res.ok) return;
        const eu = await res.json();
        setDadosUsuarioLocal((prev) => {
          const novo = { ...(prev || {}), id: eu.id, nome: eu.nome, usuario: eu.usuario, cargo: eu.cargo };
          try { localStorage.setItem(CHAVE_DADOS, JSON.stringify(novo)); } catch {}
          return novo;
        });
      })
      .catch(() => {});

    return () => { cancelado = true; };
  }, [autenticadoAdmin]);

  if (mostrarSplash) {
    return (
      <div className="fixed inset-0 flex flex-col justify-center items-center bg-elos-fundo text-elos-verde z-[9999] overflow-hidden transition-opacity duration-1000">
        <FolhasCaindo />
        <div className="relative z-10 text-center animate-in fade-in zoom-in-95 duration-1000">
          <h2 className="font-tradicional text-5xl mb-3 italic">Ótica Elos</h2>
          <div className="w-16 h-[1px] bg-elos-bege mx-auto mb-4 opacity-40"></div>
          <p className="text-[10px] uppercase tracking-[0.5em] font-black opacity-40 animate-pulse">Bem-vindo</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Portal />} />
      <Route path="/loja" element={<HomeLoja />} />
      <Route path="/login" element={<Login onLogin={realizarLoginAdmin} />} />

      <Route path="/vendas/editar/:id" element={<InterceptarEdicaoVenda />} />
      <Route path="/nova-os/:numeroPedido" element={<InterceptarNovaOS />} />
      <Route path="/ordem-servico/editar/:id" element={<InterceptarEditarOS />} />

      <Route
        path="/admin/*"
        element={
          autenticadoAdmin
            ? <InterfaceSistema aoDeslogar={realizarLogoutAdmin} dadosUsuario={dadosUsuarioLocal} />
            : <Navigate to="/login" replace />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);