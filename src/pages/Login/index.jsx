import React, { useState } from 'react';
import './style.css';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // DEFINA SEU LOGIN E SENHA AQUI:
    if (usuario === 'admin' && senha === 'elos2026') {
      onLogin();
    } else {
      alert("Usuário ou senha incorretos!");
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <h2>Ótica Elos</h2>
          <p>Gestão Interna</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuário</label>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)} 
              placeholder="Digite seu usuário"
              required 
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn-login">Entrar no Sistema</button>
        </form>
      </div>
    </div>
  );
}