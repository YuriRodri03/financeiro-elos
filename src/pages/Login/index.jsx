import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  // CONTROLES DE INTERFACE
  const [modo, setModo] = useState('LOGIN'); // 'LOGIN' ou 'CADASTRO'
  const [carregando, setCarregando] = useState(false);

  // CAMPOS DE LOGIN
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');

  // 🟢 CAMPOS COMPLETOS COM IDENTIFICADOR DE CLIENTE EXISTENTE
  const [formCadastro, setFormCadastro] = useState({
    _id: null, // null se for cliente 100% novo
    nome: '',
    cpf: '',
    dataNascimento: '',
    telefone: '',
    email: '',
    endereco: '',
    senha: '',
    confirmarSenha: ''
  });

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' });

  const mostrarToast = (mensagem, tipo = 'erro') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'erro' }), 4500);
  };

  // MÁSCARAS
  const aplicarMascaraCpf = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 3) v = `${v.substring(0, 3)}.${v.substring(3)}`;
    if (v.length > 7) v = `${v.substring(0, 7)}.${v.substring(7)}`;
    if (v.length > 11) v = `${v.substring(0, 11)}-${v.substring(11)}`;
    return v;
  };

  const aplicarMascaraTelefone = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    return v;
  };

  // 🟢 LÓGICA DE LOGIN (Usando VITE_API_URL)
  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);

    const emailTratado = loginEmail.trim().toLowerCase();

    // 1. Acesso do Administrador
    if ((emailTratado === 'admin' || emailTratado === 'admin@oticaelos.com') && loginSenha === 'elos2026') {
      onLogin();
      setCarregando(false);
      return;
    }

    // 2. Acesso do Cliente
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/clientes`);
      if (!res.ok) throw new Error("Erro na resposta do servidor");
      const clientes = await res.json();

      const clienteEncontrado = clientes.find(c =>
        (c.email && c.email.toLowerCase() === emailTratado) ||
        (c.cpf && c.cpf.replace(/\D/g, '') === emailTratado.replace(/\D/g, ''))
      );

      if (clienteEncontrado && clienteEncontrado.senha === loginSenha) {
        localStorage.setItem('clienteLogadoElos', JSON.stringify(clienteEncontrado));
        mostrarToast(`Bem-vindo(a) de volta, ${clienteEncontrado.nome.split(' ')[0]}!`, "sucesso");
        setTimeout(() => navigate('/loja'), 1000);
      } else {
        mostrarToast("Credenciais inválidas. Verifique seu e-mail/CPF e senha.", "erro");
      }
    } catch (error) {
      mostrarToast("Não foi possível conectar ao servidor. Verifique sua conexão.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  // 🟢 NOVA LÓGICA: BUSCAR CLIENTE DA LOJA FÍSICA AO DIGITAR O CPF (Usando VITE_API_URL)
  const handleVerificarCpf = async (cpfDigitado) => {
    const cpfLimpo = cpfDigitado.replace(/\D/g, '');
    
    // Só pesquisa se o CPF estiver completo
    if (cpfLimpo.length === 11) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/clientes`);
        const clientes = await res.json();
        
        const clienteEncontrado = clientes.find(c => c.cpf && c.cpf.replace(/\D/g, '') === cpfLimpo);

        if (clienteEncontrado) {
          // Se já tem senha, manda fazer login
          if (clienteEncontrado.senha && clienteEncontrado.senha.trim() !== '') {
            mostrarToast("Você já possui uma conta online! Por favor, faça login.", "erro");
            setModo('LOGIN');
            setLoginEmail(clienteEncontrado.email || clienteEncontrado.cpf);
          } else {
            // Se NÃO tem senha, preenche os dados do banco para ele completar!
            mostrarToast("Encontramos seu cadastro da loja física! Crie uma senha para acessar online.", "sucesso");
            setFormCadastro(prev => ({
              ...prev,
              _id: clienteEncontrado._id, // Guarda o ID para atualizar depois
              nome: clienteEncontrado.nome || '',
              dataNascimento: clienteEncontrado.dataNascimento || '',
              telefone: clienteEncontrado.telefone || '',
              email: clienteEncontrado.email || '',
              endereco: clienteEncontrado.endereco || ''
            }));
          }
        } else {
          // É um cliente 100% novo, limpa o _id caso ele tenha apagado um CPF que existia
          setFormCadastro(prev => ({ ...prev, _id: null }));
        }
      } catch (error) {
        console.log("Erro ao verificar CPF existente:", error);
      }
    }
  };

  // 🟢 LÓGICA DE AUTO-CADASTRO (Usando VITE_API_URL)
  const handleCadastroCompleto = async (e) => {
    e.preventDefault();
    setCarregando(true);

    const cpfLimpo = formCadastro.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      mostrarToast("Informe um CPF válido com 11 dígitos.", "erro");
      setCarregando(false);
      return;
    }

    if (formCadastro.senha.length < 6) {
      mostrarToast("A senha precisa conter no mínimo 6 caracteres.", "erro");
      setCarregando(false);
      return;
    }

    if (formCadastro.senha !== formCadastro.confirmarSenha) {
      mostrarToast("As senhas digitadas não coincidem.", "erro");
      setCarregando(false);
      return;
    }

    try {
      const payloadCliente = {
        nome: formCadastro.nome.trim().toUpperCase(),
        cpf: formCadastro.cpf,
        dataNascimento: formCadastro.dataNascimento,
        telefone: formCadastro.telefone,
        email: formCadastro.email.trim().toLowerCase(),
        endereco: formCadastro.endereco.trim(),
        senha: formCadastro.senha,
        observacoes: formCadastro._id ? "Acesso online ativado pelo cliente" : "Cadastro realizado via Portal Online da Loja"
      };

      let resCadastro;

      // 🟢 Se já tinha o ID (cliente da loja física), nós ATUALIZAMOS (PUT)
      if (formCadastro._id) {
        resCadastro = await fetch(`${import.meta.env.VITE_API_URL}/clientes/${formCadastro._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadCliente)
        });
      } else {
        // 🟢 Se for cliente novo, primeiro checamos se o email já existe
        const resClientes = await fetch(`${import.meta.env.VITE_API_URL}/clientes`);
        const clientesExistentes = await resClientes.json();
        
        const jaExisteEmail = clientesExistentes.some(c => c.email && c.email.toLowerCase() === formCadastro.email.trim().toLowerCase());
        if (jaExisteEmail) {
          mostrarToast("Este e-mail já está em uso. Tente outro ou acerte sua senha.", "erro");
          setCarregando(false);
          return;
        }

        // Se estiver tudo OK, CRIAMOS o cliente (POST)
        resCadastro = await fetch(`${import.meta.env.VITE_API_URL}/clientes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadCliente)
        });
      }

      if (resCadastro.ok) {
        const clienteSalvo = await resCadastro.json();
        localStorage.setItem('clienteLogadoElos', JSON.stringify(clienteSalvo));
        mostrarToast(formCadastro._id ? "Cadastro atualizado com sucesso! Acessando vitrine..." : "Conta criada com sucesso! Acessando vitrine...", "sucesso");
        setTimeout(() => navigate('/loja'), 1200);
      } else {
        mostrarToast("Falha ao registrar cadastro. Tente novamente.", "erro");
      }
    } catch (error) {
      mostrarToast("Erro de comunicação com o servidor.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  return (
    // 🟢 FUNDO VERDE PROFISSIONAL (Gradiente Escuro Elegante)
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans overflow-hidden bg-gradient-to-br from-[#2a4537] via-[#1d3026] to-[#0a140f]">
      
      {/* Elementos decorativos sutis no fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3a5a48] rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#15241c] rounded-full blur-[100px] opacity-80"></div>
      </div>

      {/* TOAST FLUTUANTE */}
      {toast.visivel && (
        <div className="fixed top-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.tipo === 'erro' 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <span className="text-xl">{toast.tipo === 'erro' ? '⚠️' : '✨'}</span>
            <p className="text-xs font-bold tracking-wide">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {/* 🟢 CARD PRINCIPAL */}
      <div className={`relative z-10 w-full ${modo === 'CADASTRO' ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500`}>
        
        {/* CABEÇALHO DO CARD */}
        <div className="pt-10 pb-6 px-8 flex flex-col items-center bg-white border-b border-gray-100">
          
          {/* FAVICON */}
          <img src="/favicon.png" alt="Ótica Elos" className="w-16 h-16 mb-4 object-contain drop-shadow-sm" />

          <h1 className="font-tradicional text-3xl sm:text-4xl text-[#1d3026] italic font-bold tracking-tight text-center">
            Ótica Elos
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-2 text-center">
            Acesso ao Sistema
          </p>

          {/* CHAVEADOR DE ABAS */}
          <div className="flex w-full p-1 bg-gray-50 rounded-xl mt-6 border border-gray-100">
            <button
              type="button"
              onClick={() => setModo('LOGIN')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                modo === 'LOGIN'
                  ? 'bg-white text-[#1d3026] shadow-sm border border-gray-200/50'
                  : 'text-gray-400 hover:text-[#1d3026]'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setModo('CADASTRO')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                modo === 'CADASTRO'
                  ? 'bg-white text-[#1d3026] shadow-sm border border-gray-200/50'
                  : 'text-gray-400 hover:text-[#1d3026]'
              }`}
            >
              Cadastrar
            </button>
          </div>
        </div>

        {/* 🟢 FORMULÁRIO 1: LOGIN */}
        {modo === 'LOGIN' && (
          <form onSubmit={handleLogin} className="p-8 sm:p-10 space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">
                E-mail ou CPF
              </label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="nome@email.com ou 000.000.000-00"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">
                Senha
              </label>
              <input
                type="password"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#1d3026]/20 transition-all duration-300 active:scale-[0.98] mt-4 text-xs uppercase tracking-widest"
            >
              {carregando ? 'Processando...' : 'Acessar Conta'}
            </button>
          </form>
        )}

        {/* 🟢 FORMULÁRIO 2: CADASTRO COMPLETO */}
        {modo === 'CADASTRO' && (
          <form onSubmit={handleCadastroCompleto} className="p-8 sm:p-10 space-y-5 animate-in slide-in-from-right duration-300 max-h-[75vh] overflow-y-auto">
            
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-xs text-blue-800 font-medium">
                Crie sua conta para acompanhar seus pedidos e histórico de compras. Se você já é cliente da loja física, digite seu CPF para carregar seus dados!
              </p>
            </div>

            <div className="space-y-4">
              {/* CPF FICA EM CIMA PARA PESQUISAR PRIMEIRO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">CPF *</label>
                  <input
                    type="text"
                    value={formCadastro.cpf}
                    onChange={(e) => {
                      const novoCpf = aplicarMascaraCpf(e.target.value);
                      setFormCadastro({ ...formCadastro, cpf: novoCpf });
                      handleVerificarCpf(novoCpf); // 🟢 Pesquisa automática aqui
                    }}
                    placeholder="000.000.000-00"
                    required
                    className={`w-full px-4 py-3.5 border rounded-xl outline-none transition-all text-sm ${formCadastro._id ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20'}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Data de Nascimento *</label>
                  <input
                    type="date"
                    value={formCadastro.dataNascimento}
                    onChange={(e) => setFormCadastro({ ...formCadastro, dataNascimento: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Nome Completo *</label>
                <input
                  type="text"
                  value={formCadastro.nome}
                  onChange={(e) => setFormCadastro({ ...formCadastro, nome: e.target.value })}
                  placeholder="Ex: Maria Clara Fernandes"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">WhatsApp / Celular *</label>
                <input
                  type="tel"
                  value={formCadastro.telefone}
                  onChange={(e) => setFormCadastro({ ...formCadastro, telefone: aplicarMascaraTelefone(e.target.value) })}
                  placeholder="(85) 90000-0000"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">E-mail *</label>
                <input
                  type="email"
                  value={formCadastro.email}
                  onChange={(e) => setFormCadastro({ ...formCadastro, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Endereço Completo</label>
              <input
                type="text"
                value={formCadastro.endereco}
                onChange={(e) => setFormCadastro({ ...formCadastro, endereco: e.target.value })}
                placeholder="Ex: Rua Viriato Ribeiro, 321 - Bela Vista, Fortaleza-CE"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm"
              />
            </div>

            {/* SEÇÃO 3: SEGURANÇA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Criar Senha *</label>
                <input
                  type="password"
                  value={formCadastro.senha}
                  onChange={(e) => setFormCadastro({ ...formCadastro, senha: e.target.value })}
                  placeholder="Mínimo 6 dígitos"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Confirmar Senha *</label>
                <input
                  type="password"
                  value={formCadastro.confirmarSenha}
                  onChange={(e) => setFormCadastro({ ...formCadastro, confirmarSenha: e.target.value })}
                  placeholder="Repita sua senha"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-md shadow-[#1d3026]/10 transition-all duration-300 active:scale-[0.98] mt-4 text-xs uppercase tracking-widest"
            >
              {carregando ? 'Salvando...' : (formCadastro._id ? 'Atualizar Cadastro e Entrar' : 'Finalizar Cadastro')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}