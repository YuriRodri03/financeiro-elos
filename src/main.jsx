import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FinanceiroProvider, useFinanceiro } from './FinanceiroContext';

// 1. Importando suas páginas
import Dashboard from './pages/Dashboard';
import Vendas from './pages/Vendas';
import Clientes from './pages/Clientes';
import CadastroClientes from './pages/CadastroClientes';
import RelatorioInadimplencia from './pages/Relatorios';
import Login from './pages/Login';

import './index.css'; 

// 2. Estilos da Navegação
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 2rem',
  backgroundColor: '#4a5d4e', 
  color: '#fdfaf5',
  fontFamily: 'Georgia, serif'
};

const linkStyle = {
  color: '#d2b48c', 
  marginLeft: '20px',
  textDecoration: 'none',
  fontWeight: 'bold',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem'
};

// 3. Componente de Proteção e Renderização
function AppContent() {
  const [autenticado, setAutenticado] = useState(false);
  
  // Pegamos o estado de carregamento do MongoDB que criamos no Contexto
  const { carregando } = useFinanceiro();

  // Verifica login ao abrir o app
  useEffect(() => {
    const auth = localStorage.getItem('otica_elos_auth');
    if (auth === 'true') {
      setAutenticado(true);
    }
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

  // PASSO 1: Se não estiver logado, barra tudo e mostra Login
  if (!autenticado) {
    return <Login onLogin={realizarLogin} />;
  }

  // PASSO 2: Se estiver logado, mas os dados do MongoDB ainda não chegaram
  if (carregando) {
    return (
      <div style={{
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#fdfaf5', 
        color: '#4a5d4e'
      }}>
        <h2 style={{ fontFamily: 'Georgia, serif' }}>Ótica Elos</h2>
        <p>Sincronizando com o banco de dados... 🤓</p>
      </div>
    );
  }

  // PASSO 3: Sistema liberado com dados carregados
  return (
    <Router>
      <nav style={navStyle}>
        <div className="logo" style={{fontSize: '1.5rem', fontWeight: 'bold'}}>
          Ótica Elos
        </div>
        <div className="links">
          <Link to="/" style={linkStyle}>Dashboard</Link>
          <Link to="/vendas" style={linkStyle}>Nova Venda</Link>
          <Link to="/cadastro-clientes" style={linkStyle}>Novo Cliente</Link> 
          <Link to="/clientes" style={linkStyle}>Clientes</Link>
          <Link to="/relatorios" style={linkStyle}>Cobrança</Link>
          <button onClick={realizarLogout} style={{...linkStyle, color: '#ffadad', marginLeft: '30px'}}>Sair</button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/cadastro-clientes" element={<CadastroClientes />} />
        <Route path="/relatorios" element={<RelatorioInadimplencia />} />
      </Routes>
    </Router>
  );
}

// 4. Renderização Final (Envolvendo com o Provider)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FinanceiroProvider>
      <AppContent />
    </FinanceiroProvider>
  </React.StrictMode>
);