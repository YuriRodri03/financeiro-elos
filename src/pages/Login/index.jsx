import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const [modo, setModo] = useState('LOGIN'); 
  const [carregando, setCarregando] = useState(false);

  // LOGIN
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');

  // CADASTRO
  const [formCadastro, setFormCadastro] = useState({
    _id: null, nome: '', cpf: '', dataNascimento: '', telefone: '', email: '', endereco: '', senha: '', confirmarSenha: ''
  });

  // RECUPERAÇÃO VIA E-MAIL
  const [etapaRecuperacao, setEtapaRecuperacao] = useState(1);
  const [recuperaEmail, setRecuperaEmail] = useState('');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' });

  const mostrarToast = (mensagem, tipo = 'erro') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'erro' }), 4500);
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

  // 🟢 LÓGICA DE LOGIN 100% PELO BANCO DE DADOS
  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const emailTratado = loginEmail.trim().toLowerCase();

    try {
      // 1. TENTA LOGAR COMO FUNCIONÁRIO (PAINEL ADMIN)
      const resFunc = await fetch(`${import.meta.env.VITE_API_URL}/funcionarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: emailTratado, senha: loginSenha })
      });

      if (resFunc.ok) {
        // Deu certo! É um funcionário (Admin ou Vendedor)
        const dadosFuncionario = await resFunc.json();
        onLogin(dadosFuncionario); 
        navigate('/admin');
        setCarregando(false);
        return;
      }

      // 2. SE NÃO FOR FUNCIONÁRIO, TENTA LOGAR COMO CLIENTE (LOJA VIRTUAL)
      const resCli = await fetch(`${import.meta.env.VITE_API_URL}/clientes`);
      if (!resCli.ok) throw new Error("Erro na resposta do servidor");
      const clientes = await resCli.json();
      
      const clienteEncontrado = clientes.find(c => 
        (c.email && c.email.toLowerCase() === emailTratado) || 
        (c.cpf && c.cpf.replace(/\D/g, '') === emailTratado.replace(/\D/g, ''))
      );

      if (clienteEncontrado && clienteEncontrado.senha === loginSenha) {
        localStorage.setItem('clienteLogadoElos', JSON.stringify(clienteEncontrado));
        const redirectPosLogin = localStorage.getItem('redirect_pos_login');
        if (redirectPosLogin === 'loja') {
          localStorage.removeItem('redirect_pos_login'); 
          navigate('/');
        } else {
          mostrarToast(`Bem-vindo(a), ${clienteEncontrado.nome.split(' ')[0]}!`, "sucesso");
          setTimeout(() => navigate('/'), 1000);
        }
      } else {
        mostrarToast("Credenciais inválidas. Verifique os dados digitados.", "erro");
      }
    } catch (error) { 
      mostrarToast("Não foi possível conectar ao servidor.", "erro"); 
    } finally { 
      setCarregando(false); 
    }
  };

  const handleVerificarCpf = async (cpfDigitado) => {
    const cpfLimpo = cpfDigitado.replace(/\D/g, '');
    if (cpfLimpo.length === 11) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/clientes`);
        const clientes = await res.json();
        const clienteEncontrado = clientes.find(c => c.cpf && c.cpf.replace(/\D/g, '') === cpfLimpo);

        if (clienteEncontrado) {
          if (clienteEncontrado.senha && clienteEncontrado.senha.trim() !== '') {
            mostrarToast("Você já possui uma conta online! Faça login.", "erro"); setModo('LOGIN'); setLoginEmail(clienteEncontrado.email || clienteEncontrado.cpf);
          } else {
            mostrarToast("Encontramos seu cadastro da loja física! Crie uma senha.", "sucesso");
            setFormCadastro(prev => ({ ...prev, _id: clienteEncontrado._id, nome: clienteEncontrado.nome || '', dataNascimento: clienteEncontrado.dataNascimento || '', telefone: clienteEncontrado.telefone || '', email: clienteEncontrado.email || '', endereco: clienteEncontrado.endereco || '' }));
          }
        } else setFormCadastro(prev => ({ ...prev, _id: null }));
      } catch (error) {}
    }
  };

  const handleCadastroCompleto = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const cpfLimpo = formCadastro.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) { mostrarToast("Informe um CPF válido com 11 dígitos.", "erro"); setCarregando(false); return; }
    if (formCadastro.senha.length < 6) { mostrarToast("A senha precisa ter no mínimo 6 caracteres.", "erro"); setCarregando(false); return; }
    if (formCadastro.senha !== formCadastro.confirmarSenha) { mostrarToast("As senhas não coincidem.", "erro"); setCarregando(false); return; }

    try {
      const payloadCliente = { ...formCadastro, nome: formCadastro.nome.trim().toUpperCase(), email: formCadastro.email.trim().toLowerCase(), observacoes: formCadastro._id ? "Acesso online ativado" : "Cadastro via Portal Online" };
      let resCadastro;

      if (formCadastro._id) {
        resCadastro = await fetch(`${import.meta.env.VITE_API_URL}/clientes/${formCadastro._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadCliente) });
      } else {
        const resClientes = await fetch(`${import.meta.env.VITE_API_URL}/clientes`);
        const clientesExistentes = await resClientes.json();
        if (clientesExistentes.some(c => c.email && c.email.toLowerCase() === formCadastro.email.trim().toLowerCase())) { mostrarToast("E-mail já em uso.", "erro"); setCarregando(false); return; }
        resCadastro = await fetch(`${import.meta.env.VITE_API_URL}/clientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadCliente) });
      }

      if (resCadastro.ok) {
        const clienteSalvo = await resCadastro.json();
        localStorage.setItem('clienteLogadoElos', JSON.stringify(clienteSalvo));
        if (localStorage.getItem('redirect_pos_login') === 'loja') { localStorage.removeItem('redirect_pos_login'); navigate('/'); } 
        else { mostrarToast("Conta configurada! Redirecionando...", "sucesso"); setTimeout(() => navigate('/'), 1200); }
      } else mostrarToast("Falha ao registrar cadastro.", "erro");
    } catch (error) { mostrarToast("Erro de comunicação com o servidor.", "erro"); } 
    finally { setCarregando(false); }
  };

  // SOLICITA O CÓDIGO NO E-MAIL
  const handleSolicitarCodigoEmail = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/clientes/solicitar-recuperacao`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: recuperaEmail })
      });
      if (res.ok) {
        setEtapaRecuperacao(2);
        mostrarToast("Um código de 6 dígitos foi enviado para o seu e-mail!", "sucesso");
      } else {
        mostrarToast("E-mail não encontrado em nossos registros.", "erro");
      }
    } catch (error) {
      mostrarToast("Erro ao conectar com o servidor.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  // VALIDA O CÓDIGO E SALVA NOVA SENHA
  const handleSalvarNovaSenha = async (e) => {
    e.preventDefault();
    setCarregando(true);

    if (novaSenha.length < 6) { mostrarToast("A senha precisa ter no mínimo 6 caracteres.", "erro"); setCarregando(false); return; }
    if (novaSenha !== confirmarNovaSenha) { mostrarToast("As senhas não coincidem.", "erro"); setCarregando(false); return; }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/clientes/redefinir-senha`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: recuperaEmail, token: codigoDigitado, novaSenha })
      });

      if (res.ok) {
        mostrarToast("Senha redefinida com sucesso! Você já pode fazer login.", "sucesso");
        setModo('LOGIN'); setLoginEmail(recuperaEmail); setLoginSenha('');
        setRecuperaEmail(''); setCodigoDigitado(''); setNovaSenha(''); setConfirmarNovaSenha(''); setEtapaRecuperacao(1);
      } else {
        mostrarToast("Código inválido ou expirado.", "erro");
      }
    } catch (error) {
      mostrarToast("Erro de comunicação com o servidor.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans overflow-hidden bg-gradient-to-br from-[#2a4537] via-[#1d3026] to-[#0a140f]">
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
              <button onClick={() => setModo('LOGIN')} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${modo === 'LOGIN' ? 'bg-white text-[#1d3026] shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-[#1d3026]'}`}>Fazer Login</button>
              <button onClick={() => setModo('CADASTRO')} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${modo === 'CADASTRO' ? 'bg-white text-[#1d3026] shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-[#1d3026]'}`}>Novo Cadastro</button>
            </div>
          )}
        </div>

        {modo === 'LOGIN' && (
          <form onSubmit={handleLogin} className="p-8 sm:p-10 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">E-mail, CPF ou Usuário</label>
              <input type="text" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="cliente@email.com ou joao.vendedor" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Senha</label>
                <button type="button" onClick={() => { setModo('RECUPERAR'); setEtapaRecuperacao(1); }} className="text-[10px] text-[#c5a880] hover:text-[#b0946d] font-bold uppercase tracking-widest underline underline-offset-2 transition-colors">Esqueceu a senha?</button>
              </div>
              <input type="password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} placeholder="••••••••" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400" />
            </div>

            <button type="submit" disabled={carregando} className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-[#1d3026]/20 shadow-lg transition-all duration-300 active:scale-[0.98] mt-2 text-[11px] uppercase tracking-widest">
              {carregando ? 'Processando...' : 'Acessar Conta'}
            </button>
          </form>
        )}

        {modo === 'CADASTRO' && (
          <form onSubmit={handleCadastroCompleto} className="p-8 sm:p-10 space-y-5 animate-in slide-in-from-right duration-300 max-h-[75vh] overflow-y-auto">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
              <p className="text-xs text-emerald-800 font-medium">Crie sua conta. <strong className="font-black">Já é cliente da loja física?</strong> Digite seu CPF para carregar seus dados!</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">CPF *</label><input type="text" value={formCadastro.cpf} onChange={(e) => { const novoCpf = aplicarMascaraCpf(e.target.value); setFormCadastro({ ...formCadastro, cpf: novoCpf }); handleVerificarCpf(novoCpf); }} placeholder="000.000.000-00" required className={`w-full px-4 py-3.5 border rounded-xl outline-none transition-all text-sm ${formCadastro._id ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20'}`} /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Data Nascimento *</label><input type="date" value={formCadastro.dataNascimento} onChange={(e) => setFormCadastro({ ...formCadastro, dataNascimento: e.target.value })} required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm text-gray-700 focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Nome Completo *</label><input type="text" value={formCadastro.nome} onChange={(e) => setFormCadastro({ ...formCadastro, nome: e.target.value })} placeholder="Ex: Maria Clara Fernandes" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Celular *</label><input type="tel" value={formCadastro.telefone} onChange={(e) => setFormCadastro({ ...formCadastro, telefone: aplicarMascaraTelefone(e.target.value) })} placeholder="(85) 90000-0000" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">E-mail *</label><input type="email" value={formCadastro.email} onChange={(e) => setFormCadastro({ ...formCadastro, email: e.target.value })} placeholder="exemplo@email.com" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
            </div>
            <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Endereço Completo</label><input type="text" value={formCadastro.endereco} onChange={(e) => setFormCadastro({ ...formCadastro, endereco: e.target.value })} placeholder="Rua, Número, Bairro - Cidade" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Criar Senha *</label><input type="password" value={formCadastro.senha} onChange={(e) => setFormCadastro({ ...formCadastro, senha: e.target.value })} placeholder="Mínimo 6 dígitos" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Confirmar Senha *</label><input type="password" value={formCadastro.confirmarSenha} onChange={(e) => setFormCadastro({ ...formCadastro, confirmarSenha: e.target.value })} placeholder="Repita sua senha" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:bg-white focus:border-[#1d3026] focus:ring-2 focus:ring-[#1d3026]/20" /></div>
            </div>
            <button type="submit" disabled={carregando} className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-md transition-all duration-300 active:scale-[0.98] mt-4 text-[11px] uppercase tracking-widest">
              {carregando ? 'Salvando...' : (formCadastro._id ? 'Atualizar Cadastro e Entrar' : 'Finalizar Cadastro')}
            </button>
          </form>
        )}

        {/* 🟢 FORMULÁRIO 3: RECUPERAR SENHA VIA E-MAIL */}
        {modo === 'RECUPERAR' && (
          <form onSubmit={etapaRecuperacao === 1 ? handleSolicitarCodigoEmail : handleSalvarNovaSenha} className="p-8 sm:p-10 space-y-6 animate-in slide-in-from-left duration-300">
            
            {etapaRecuperacao === 1 ? (
              <>
                <div className="bg-[#c5a880]/10 p-4 rounded-xl border border-[#c5a880]/30 text-center mb-2">
                  <p className="text-xs text-[#9d7d54] font-medium">Digite o e-mail cadastrado na sua conta. Nós enviaremos um código de 6 dígitos para você redefinir sua senha.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Seu E-mail</label>
                  <input type="email" value={recuperaEmail} onChange={(e) => setRecuperaEmail(e.target.value)} placeholder="exemplo@email.com" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-sm" />
                </div>
              </>
            ) : (
              <>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center mb-2">
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">E-mail Enviado!</p>
                  <p className="text-[10px] text-emerald-700 mt-1">Verifique a caixa de entrada de <strong>{recuperaEmail}</strong> (e o Spam).</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Código de 6 dígitos</label>
                  <input type="text" value={codigoDigitado} onChange={(e) => setCodigoDigitado(e.target.value)} placeholder="000000" maxLength="6" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-center tracking-[0.5em] text-lg font-bold text-[#1d3026]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Nova Senha</label>
                  <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo de 6 caracteres" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block ml-1">Confirmar Nova Senha</label>
                  <input type="password" value={confirmarNovaSenha} onChange={(e) => setConfirmarNovaSenha(e.target.value)} placeholder="Repita a senha" required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1d3026] outline-none text-sm" />
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