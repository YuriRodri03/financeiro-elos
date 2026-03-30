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
import Despesas from './pages/Despesas'; // NOVO: Importando Despesas
import Login from './pages/Login';

import './index.css'; 

// 3. Componente de Proteção e Renderização
function AppContent() {
  const [autenticado, setAutenticado] = useState(false);
  const { carregando } = useFinanceiro();

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

  if (!autenticado) {
    return <Login onLogin={realizarLogin} />;
  }

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

  return (
    <Router>
      <nav className="navbar-container">
        <div className="logo-loja">
          Ótica Elos
        </div>
        <div className="nav-menu">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/vendas" className="nav-link">Vendas</Link>
          <Link to="/despesas" className="nav-link">Gastos</Link>
          <Link to="/clientes" className="nav-link">Clientes</Link>
          <Link to="/cadastro-clientes" className="nav-link">Novo Cliente</Link> 
          <Link to="/relatorios" className="nav-link">Cobrança</Link>
          <button onClick={realizarLogout} className="btn-logout">Sair</button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/despesas" element={<Despesas />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/cadastro-clientes" element={<CadastroClientes />} />
        <Route path="/relatorios" element={<RelatorioInadimplencia />} />
      </Routes>
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