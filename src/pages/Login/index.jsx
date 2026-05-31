import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  // --- NOVO: ESTADO PARA GERENCIAR NOTIFICAÇÕES TOAST PREMIUM ---
  const [toast, setToast] = useState({ visivel: false, mensagem: '' });

  const mostrarToast = (mensagem) => {
    setToast({ visivel: true, mensagem });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '' });
    }, 3500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usuario === 'admin' && senha === 'elos2026') {
      onLogin();
    } else {
      mostrarToast("Usuário ou senha incorretos!");
    }
  };

  return (
    // Fundo com degradê suave usando as cores da empresa
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary to-[#3a4a3e] p-4 relative">
      
      {/* NOVO: COMPONENTE VISUAL DO TOAST DE ERRO */}
      {toast.visivel && (
        <div className="absolute top-8 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className="p-4 rounded-2xl bg-red-900/95 border border-red-500/30 text-red-100 backdrop-blur-md shadow-2xl flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-xs font-bold uppercase tracking-wider font-sans">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {/* Card de Login */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Header do Card com detalhe em Bege */}
        <div className="bg-white pt-10 pb-6 text-center border-b border-gray-100">
          <h2 className="font-serif text-4xl text-primary italic tracking-tight">
            Ótica Elos
          </h2>
          <div className="mt-2 flex justify-center items-center gap-2">
            <span className="h-[1px] w-8 bg-accent"></span>
            <p className="text-xs uppercase tracking-[0.3em] text-accent font-bold">
              Gestão Interna
            </p>
            <span className="h-[1px] w-8 bg-accent"></span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-primary/80 ml-1 uppercase tracking-wider">
              Usuário
            </label>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)} 
              placeholder="Digite seu usuário"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all placeholder:text-gray-300"
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-primary/80 ml-1 uppercase tracking-wider">
              Senha
            </label>
            <input 
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary hover:bg-[#3a4a3e] text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transform transition-all active:scale-[0.98] mt-4"
          >
            Entrar no Sistema
          </button>

          <p className="text-center text-gray-400 text-xs mt-8">
            &copy; 2026 Ótica Elos • Todos os direitos reservados
          </p>
        </form>
      </div>
    </div>
  );
}