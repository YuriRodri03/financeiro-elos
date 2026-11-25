import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://elos-server.onrender.com/api';

  const [modo, setModo] = useState('LOGIN');
  const [carregando, setCarregando] = useState(false);

  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  const [mostrarSenhaNova, setMostrarSenhaNova] = useState(false);

  // LOGIN
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');

  // CADASTRO
  const [formCadastro, setFormCadastro] = useState({
    nome: '', cpf: '', dataNascimento: '', telefone: '', email: '', endereco: '', senha: '', confirmarSenha: ''
  });
  const [modoAtivacao, setModoAtivacao] = useState(false);
  const ultimoCpfConsultado = useRef('');

  // RECUPERAÇÃO VIA E-MAIL
  const [etapaRecuperacao, setEtapaRecuperacao] = useState(1);
  const [recuperaEmail, setRecuperaEmail] = useState('');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const mostrarToast = (mensagem, tipo = 'erro') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visivel: true, mensagem, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'erro' });
    }, 4500);
  };

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

  // Guarda o cliente logado (preservando o JWT `token`, sem senha) e redireciona
  const finalizarLoginCliente = (cliente, mensagem) => {
    const { senha, tokenRecuperacao, tokenExpiraEm, ...seguro } = cliente || {};
    localStorage.setItem('clienteLogadoElos', JSON.stringify(seguro));
    const redirectPosLogin = localStorage.getItem('redirect_pos_login');
    if (redirectPosLogin === 'loja') {
      localStorage.removeItem('redirect_pos_login');
      navigate('/loja');
    } else {
      mostrarToast(mensagem, 'sucesso');
      setTimeout(() => navigate('/loja'), 1000);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const inputTratado = loginEmail.trim().toLowerCase();
    const apenasNumeros = inputTratado.replace(/\D/g, '');
    const ehCpf = apenasNumeros.length === 11 && !inputTratado.includes('@');

    try {
      // 1) Funcionário (quando não é CPF)
      if (!ehCpf) {
        const resFunc = await fetch(`${API_URL}/funcionarios/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario: inputTratado, senha: loginSenha })
        });

        if (resFunc.ok) {
          const dadosFuncionario = await resFunc.json();
          if (!dadosFuncionario?.token) {
            mostrarToast('Não foi possível iniciar a sessão. Tente novamente.', 'erro');
            return;
          }
          onLogin(dadosFuncionario);
          navigate('/admin');
          return;
        }

        if (resFunc.status === 403 || resFunc.status === 429) {
          const dados = await resFunc.json().catch(() => ({}));
          mostrarToast(
            dados.error || (resFunc.status === 429
              ? 'Muitas tentativas. Aguarde alguns minutos.'
              : 'Sua conta foi desativada pelo administrador.'),
            'erro'
          );
          return;
        }
      }

      // 2) Cliente
      const resCli = await fetch(`${API_URL}/clientes/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: inputTratado, senha: loginSenha })
      });

      if (resCli.ok) {
        const cliente = await resCli.json();
        const primeiroNome = String(cliente.nome || '').split(' ')[0] || 'cliente';
        finalizarLoginCliente(cliente, `Bem-vindo(a), ${primeiroNome}!`);
      } else {
        const dados = await resCli.json().catch(() => ({}));
        if (resCli.status === 401) {
          mostrarToast('Credenciais inválidas. Verifique seu login e senha.', 'erro');
        } else {
          mostrarToast(dados.error || 'Não foi possível realizar o login.', 'erro');
        }
      }
    } catch {
      mostrarToast('Não foi possível conectar ao servidor.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const handleVerificarCpf = async (cpfDigitado) => {
    const cpfLimpo = cpfDigitado.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return;

    ultimoCpfConsultado.current = cpfLimpo;
    try {
      const res = await fetch(`${API_URL}/clientes/status-cpf/${cpfLimpo}`);
      if (!res.ok) return;
      const data = await res.json();

      if (ultimoCpfConsultado.current !== cpfLimpo) return;

      if (data.existe && data.temSenha) {
        mostrarToast('Você já possui uma conta online! Faça login.', 'erro');
        setModoAtivacao(false);
        setModo('LOGIN');
        setLoginEmail(cpfDigitado);
      } else if (data.existe) {
        setModoAtivacao(true);
        mostrarToast('Encontramos seu cadastro da loja física! Confirme sua data de nascimento e crie uma senha.', 'sucesso');
      } else {
        setModoAtivacao(false);
      }
    } catch {}
  };

  const handleCadastroCompleto = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const cpfLimpo = formCadastro.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) { mostrarToast('Informe um CPF válido com 11 dígitos.', 'erro'); setCarregando(false); return; }
    if (formCadastro.senha.length < 6) { mostrarToast('A senha precisa ter no mínimo 6 caracteres.', 'erro'); setCarregando(false); return; }
    if (formCadastro.senha !== formCadastro.confirmarSenha) { mostrarToast('As senhas não coincidem.', 'erro'); setCarregando(false); return; }

    try {
      const { confirmarSenha, ...dadosLimpos } = formCadastro;
      const emailTratado = formCadastro.email.trim().toLowerCase();

      const rota = modoAtivacao ? 'ativar-conta' : 'cadastro-online';
      const payload = modoAtivacao
        ? {
            cpf: formCadastro.cpf,
            dataNascimento: formCadastro.dataNascimento,
            senha: formCadastro.senha,
            email: emailTratado,
            telefone: formCadastro.telefone
          }
        : {
            ...dadosLimpos,
            nome: formCadastro.nome.trim().toUpperCase(),
            email: emailTratado
          };

      const resCadastro = await fetch(`${API_URL}/clientes/${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resCadastro.ok) {
        const clienteSalvo = await resCadastro.json();
        finalizarLoginCliente(clienteSalvo, 'Conta configurada! Redirecionando...');
      } else {
        const errData = await resCadastro.json().catch(() => ({}));
        mostrarToast(errData.error || 'Falha ao registrar cadastro.', 'erro');
      }
    } catch {
      mostrarToast('Erro de comunicação com o servidor.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const handleSolicitarCodigoEmail = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/clientes/solicitar-recuperacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recuperaEmail.trim().toLowerCase() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEtapaRecuperacao(2);
        mostrarToast('Se o e-mail estiver cadastrado, você receberá um código de 6 dígitos em instantes.', 'sucesso');
      } else {
        mostrarToast(data.error || 'Não foi possível enviar o código. Tente novamente.', 'erro');
      }
    } catch {
      mostrarToast('Erro ao conectar com o servidor.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarNovaSenha = async (e) => {
    e.preventDefault();
    setCarregando(true);

    if (novaSenha.length < 6) { mostrarToast('A senha precisa ter no mínimo 6 caracteres.', 'erro'); setCarregando(false); return; }
    if (novaSenha !== confirmarNovaSenha) { mostrarToast('As senhas não coincidem.', 'erro'); setCarregando(false); return; }

    try {
      const res = await fetch(`${API_URL}/clientes/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recuperaEmail.trim().toLowerCase(),
          token: codigoDigitado.trim(),
          novaSenha
        })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        mostrarToast('Senha redefinida com sucesso! Você já pode fazer login.', 'sucesso');
        setModo('LOGIN');
        setLoginEmail(recuperaEmail);
        setLoginSenha('');
        setRecuperaEmail('');
        setCodigoDigitado('');
        setNovaSenha('');
        setConfirmarNovaSenha('');
        setEtapaRecuperacao(1);
      } else {
        mostrarToast(data.error || 'Código inválido ou expirado.', 'erro');
      }
    } catch {
      mostrarToast('Erro de comunicação com o servidor.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans overflow-hidden bg-gradient-to-br from-[#2a4537] via-[#1d3026] to-[#0a140f]">

      <button
        type="button"
        onClick={() => navigate('/loja')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-3 rounded-2xl border border-white/10 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span>
        Voltar para a Loja
      </button>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3a5a48] rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#15241c] rounded-full blur-[100px] opacity-80"></div>
      </div>

      {toast.visivel && (
        <div className="fixed top-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.tipo === 'erro' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <span className="text-xl">{toast.tipo === 'erro' ? '⚠️' : '✨'}</span>
            <p className="text-xs font-bold tracking-wide">{toast.mensagem}</p>
          </div>
        </div>
      )}

      <div className={`relative z-10 w-full ${modo === 'CADASTRO' ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500`}>
        <div className="pt-10 pb-6 px-8 flex flex-col items-center bg-white border-b border-gray-100 relative">
          <img src="/favicon.png" alt="Ótica Elos" className="w-16 h-16 mb-4 object-contain drop-shadow-sm" />
          <h1 className="font-tradicional text-3xl sm:text-4xl text-[#1d3026] italic font-bold tracking-tight text-center">Ótica Elos</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#c5a880] font-black mt-2 text-center">
            {modo === 'RECUPERAR' ? 'Recuperação Segura' : 'Portal de Acesso Integrado'}
          </p>

          {modo !== 'RECUPERAR' && (
            <div className="flex w-full p-1 bg-gray-50 rounded-xl mt-6 border border-gray-100">
              <button type="button" onClick={() => setModo('LOGIN')} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${modo === 'LOGIN' ? 'bg-white text-[#1d3026] shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-[#1d3026]'}`}>Fazer Login</button>
              <button type="button" onClick={() => setModo('CADASTRO')} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${modo === 'CADASTRO' ? 'bg-white text-[#1d3026] shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-[#1d3026]'}`}>Novo Cadastro</button>
            </div>
          )}
        </div>

        {modo === 'LOGIN' && (
          <form onSubmit={handleLogin} className="p-8 sm:p-10 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">E-mail, CPF ou Usuário</label>
              <input type="text" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="cliente@email.com" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Senha</label>
                <button type="button" onClick={() => { setModo('RECUPERAR'); setEtapaRecuperacao(1); }} className="text-[10px] text-[#c5a880] hover:text-[#b0946d] font-bold uppercase tracking-widest underline underline-offset-2 transition-colors">Esqueceu a senha?</button>
              </div>
              <div className="relative">
                <input
                  type={mostrarSenhaLogin ? 'text' : 'password'}
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-5 py-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm focus:outline-none"
                  title={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
                >
                  {mostrarSenhaLogin ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={carregando} className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-[#1d3026]/20 shadow-lg transition-all duration-300 active:scale-[0.98] mt-2 text-[11px] uppercase tracking-widest">
              {carregando ? 'Processando...' : 'Acessar Conta'}
            </button>
          </form>
        )}

        {modo === 'CADASTRO' && (
          <form onSubmit={handleCadastroCompleto} className="p-8 sm:p-10 space-y-5 animate-in slide-in-from-right duration-300 max-h-[75vh] overflow-y-auto">
            {modoAtivacao ? (
              <div className="bg-emerald-100/70 p-4 rounded-xl border border-emerald-300 text-center">
                <p className="text-xs text-emerald-900 font-medium"><strong className="font-black">Cadastro da loja encontrado!</strong> Para sua segurança, confirme sua <strong>data de nascimento</strong> e crie uma senha para ativar o acesso online.</p>
              </div>
            ) : (
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
                <p className="text-xs text-emerald-800 font-medium">Crie sua conta. <strong className="font-black">Já é cliente da loja física?</strong> Digite seu CPF para ativar seu acesso!</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">CPF *</label>
                  <input
                    type="text"
                    value={formCadastro.cpf}
                    onChange={(e) => {
                      const novoCpf = aplicarMascaraCpf(e.target.value);
                      setFormCadastro({ ...formCadastro, cpf: novoCpf });
                      if (novoCpf.replace(/\D/g, '').length === 11) {
                        handleVerificarCpf(novoCpf);
                      } else {
                        ultimoCpfConsultado.current = '';
                        setModoAtivacao(false);
                      }
                    }}
                    placeholder="000.000.000-00"
                    required
                    className={`w-full px-4 py-3.5 border rounded-xl outline-none transition-all text-sm ${modoAtivacao ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Data Nascimento *</label>
                  <input type="date" value={formCadastro.dataNascimento} onChange={(e) => setFormCadastro({ ...formCadastro, dataNascimento: e.target.value })} required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm text-gray-700 focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" />
                </div>
              </div>

              {!modoAtivacao && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Nome Completo *</label>
                  <input type="text" value={formCadastro.nome} onChange={(e) => setFormCadastro({ ...formCadastro, nome: e.target.value })} placeholder="Ex: Maria Clara Fernandes" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Celular *</label>
                <input type="tel" value={formCadastro.telefone} onChange={(e) => setFormCadastro({ ...formCadastro, telefone: aplicarMascaraTelefone(e.target.value) })} placeholder="(85) 90000-0000" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">E-mail *</label>
                <input type="email" value={formCadastro.email} onChange={(e) => setFormCadastro({ ...formCadastro, email: e.target.value })} placeholder="exemplo@email.com" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" />
              </div>
            </div>

            {!modoAtivacao && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Endereço Completo</label>
                <input type="text" value={formCadastro.endereco} onChange={(e) => setFormCadastro({ ...formCadastro, endereco: e.target.value })} placeholder="Rua, Número, Bairro - Cidade" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Criar Senha *</label>
                <div className="relative">
                  <input
                    type={mostrarSenhaCadastro ? 'text' : 'password'}
                    value={formCadastro.senha}
                    onChange={(e) => setFormCadastro({ ...formCadastro, senha: e.target.value })}
                    placeholder="Mínimo 6 dígitos"
                    required
                    className="w-full px-4 py-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaCadastro(!mostrarSenhaCadastro)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs focus:outline-none"
                  >
                    {mostrarSenhaCadastro ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Confirmar Senha *</label>
                <input
                  type={mostrarSenhaCadastro ? 'text' : 'password'}
                  value={formCadastro.confirmarSenha}
                  onChange={(e) => setFormCadastro({ ...formCadastro, confirmarSenha: e.target.value })}
                  placeholder="Repita sua senha"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20"
                />
              </div>
            </div>

            <button type="submit" disabled={carregando} className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-md transition-all duration-300 active:scale-[0.98] mt-4 text-[11px] uppercase tracking-widest">
              {carregando ? 'Salvando...' : (modoAtivacao ? 'Ativar Acesso e Entrar' : 'Finalizar Cadastro')}
            </button>
          </form>
        )}

        {modo === 'RECUPERAR' && (
          <form onSubmit={etapaRecuperacao === 1 ? handleSolicitarCodigoEmail : handleSalvarNovaSenha} className="p-8 sm:p-10 space-y-6 animate-in slide-in-from-left duration-300">

            {etapaRecuperacao === 1 ? (
              <>
                <div className="bg-[#c5a880]/10 p-4 rounded-xl border border-[#c5a880]/30 text-center mb-2">
                  <p className="text-xs text-[#9d7d54] font-medium">Digite o e-mail cadastrado na sua conta. Se ele existir, enviaremos um código de 6 dígitos para você redefinir sua senha.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Seu E-mail</label>
                  <input type="email" value={recuperaEmail} onChange={(e) => setRecuperaEmail(e.target.value)} placeholder="exemplo@email.com" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-sm" />
                </div>
              </>
            ) : (
              <>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center mb-2">
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Verifique seu e-mail</p>
                  <p className="text-[10px] text-emerald-700 mt-1">Se <strong>{recuperaEmail}</strong> estiver cadastrado, o código chegará em instantes (olhe também o Spam).</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Código de 6 dígitos</label>
                  <input type="text" inputMode="numeric" value={codigoDigitado} onChange={(e) => setCodigoDigitado(e.target.value.replace(/\D/g, ''))} placeholder="000000" maxLength="6" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-center tracking-[0.5em] text-lg font-bold text-[#1d3026]" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={mostrarSenhaNova ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                      className="w-full px-5 py-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaNova(!mostrarSenhaNova)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs focus:outline-none"
                    >
                      {mostrarSenhaNova ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Confirmar Nova Senha</label>
                  <input
                    type={mostrarSenhaNova ? 'text' : 'password'}
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button type="submit" disabled={carregando} className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] text-[11px] uppercase tracking-widest transition-all">
                {carregando ? 'Aguarde...' : (etapaRecuperacao === 1 ? 'Enviar Código por E-mail' : 'Validar e Salvar Senha')}
              </button>

              <button type="button" onClick={() => { setModo('LOGIN'); setEtapaRecuperacao(1); }} className="w-full bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 font-bold py-4 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                Cancelar e Voltar
              </button>
            </div>
          </form>
        )}

        <div className="py-4 border-t border-gray-100 flex justify-center bg-[#f9f8f6]">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Portal Unificado - Ótica Elos
          </p>
        </div>

      </div>
    </div>
  );
}