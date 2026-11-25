import React, { useState, useEffect, useCallback } from 'react';

export default function Equipe() {
  const API_URL = import.meta.env.VITE_API_URL || 'https://elos-server.onrender.com/api';

  const [abaAtiva, setAbaAtiva] = useState('MEUS_DADOS');
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [deletandoId, setDeletandoId] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [mostrarMinhaSenha, setMostrarMinhaSenha] = useState(false);
  const [mostrarSenhaNovo, setMostrarSenhaNovo] = useState(false);

  // Leitura segura do usuário logado
  const [meuUsuario, setMeuUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('otica_elos_dados_equipe') || '{}');
    } catch {
      return {};
    }
  });

  const [formNovo, setFormNovo] = useState({ nome: '', usuario: '', senha: '', cargo: 'VENDEDOR' });
  const [formMeusDados, setFormMeusDados] = useState({
    nome: meuUsuario.nome || '',
    usuario: meuUsuario.usuario || '',
    novaSenha: ''
  });

  const buscarFuncionarios = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const res = await fetch(`${API_URL}/funcionarios`);
      if (res.ok) {
        const dados = await res.json();
        setFuncionarios(Array.isArray(dados) ? dados : []);
      }
    } catch {}
    finally {
      setCarregandoLista(false);
    }
  }, [API_URL]);

  useEffect(() => {
    buscarFuncionarios();
  }, [buscarFuncionarios]);

  // Atualizar próprias credenciais
  const atualizarMeusDados = async (e) => {
    e.preventDefault();
    if (carregando) return;

    const meuId = meuUsuario.id || meuUsuario._id;
    if (!meuId) {
      alert('Não foi possível identificar sua sessão. Faça login novamente.');
      return;
    }

    const nomeLimpo = formMeusDados.nome.trim();
    const usuarioLimpo = formMeusDados.usuario.trim().toLowerCase();
    const novaSenhaLimpa = formMeusDados.novaSenha.trim();

    if (!nomeLimpo || !usuarioLimpo) {
      alert('Informe seu nome e usuário de login.');
      return;
    }
    if (novaSenhaLimpa && novaSenhaLimpa.length < 3) {
      alert('A nova senha deve ter pelo menos 3 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      const payload = { nome: nomeLimpo, usuario: usuarioLimpo };
      if (novaSenhaLimpa) payload.senha = novaSenhaLimpa;

      const res = await fetch(`${API_URL}/funcionarios/${meuId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const dadosAtualizados = await res.json();
        const novoPerfil = {
          id: dadosAtualizados._id,
          nome: dadosAtualizados.nome,
          usuario: dadosAtualizados.usuario,
          cargo: dadosAtualizados.cargo
        };
        localStorage.setItem('otica_elos_dados_equipe', JSON.stringify(novoPerfil));
        setMeuUsuario(novoPerfil);
        setFormMeusDados({ nome: novoPerfil.nome, usuario: novoPerfil.usuario, novaSenha: '' });
        alert('Seus dados foram atualizados com sucesso! (Se você mudou a senha, use-a no próximo login).');
        buscarFuncionarios();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao atualizar dados. O nome de usuário pode já estar em uso.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicao = (func) => {
    setEditandoId(func._id);
    setFormNovo({ nome: func.nome, usuario: func.usuario, senha: '', cargo: func.cargo });
    setMostrarSenhaNovo(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormNovo({ nome: '', usuario: '', senha: '', cargo: 'VENDEDOR' });
    setMostrarSenhaNovo(false);
  };

  const salvarFuncionario = async (e) => {
    e.preventDefault();
    if (carregando) return;

    const nomeLimpo = formNovo.nome.trim();
    const usuarioLimpo = formNovo.usuario.trim().toLowerCase();
    const senhaLimpa = formNovo.senha.trim();

    if (!nomeLimpo || !usuarioLimpo) {
      alert('Preencha nome e usuário.');
      return;
    }

    if (!editandoId && senhaLimpa.length < 3) {
      alert('A senha inicial é obrigatória e deve ter pelo menos 3 caracteres.');
      return;
    }

    if (editandoId && senhaLimpa && senhaLimpa.length < 3) {
      alert('A nova senha deve ter pelo menos 3 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      const payload = { nome: nomeLimpo, usuario: usuarioLimpo, cargo: formNovo.cargo };
      if (senhaLimpa) payload.senha = senhaLimpa;

      const url = editandoId ? `${API_URL}/funcionarios/${editandoId}` : `${API_URL}/funcionarios`;
      const metodo = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editandoId ? 'Dados atualizados com sucesso!' : `Acesso liberado para ${nomeLimpo}!`);
        cancelarEdicao();
        buscarFuncionarios();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao salvar. O usuário pode já existir.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const deletarFuncionario = async (id, nome, cargo) => {
    const meuId = meuUsuario.id || meuUsuario._id;
    if (id === meuId) return alert('Você não pode excluir a si mesmo!');
    if (deletandoId === id) return;

    if (cargo === 'ADMIN') {
      const confirmaAdmin = window.confirm('Atenção: Você está prestes a excluir outro Administrador. Tem certeza?');
      if (!confirmaAdmin) return;
    } else if (!window.confirm(`Deseja revogar o acesso de ${nome}?`)) {
      return;
    }

    setDeletandoId(id);
    try {
      const res = await fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editandoId === id) cancelarEdicao();
        buscarFuncionarios();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Não foi possível revogar o acesso deste colaborador.');
      }
    } catch {
      alert('Erro de conexão ao tentar excluir colaborador.');
    } finally {
      setDeletandoId(null);
    }
  };

  const meuIdAtual = meuUsuario.id || meuUsuario._id;

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-5xl mx-auto">

        <header className="mb-8">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Segurança & Equipe</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Controle de Acessos do Sistema</p>
        </header>

        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-8 max-w-sm">
          <button type="button" onClick={() => setAbaAtiva('MEUS_DADOS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'MEUS_DADOS' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'}`}>
            🔐 Minhas Credenciais
          </button>
          <button type="button" onClick={() => setAbaAtiva('GERENCIAR')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'GERENCIAR' ? 'bg-[#c5a880] text-white shadow-md' : 'text-gray-400 hover:text-[#c5a880]'}`}>
            👥 Gerenciar Equipe
          </button>
        </div>

        {/* ABA 1: MINHAS CREDENCIAIS */}
        {abaAtiva === 'MEUS_DADOS' && (
          <div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100 animate-in fade-in max-w-2xl">
            <h2 className="font-tradicional text-2xl text-elos-verde italic font-bold mb-6">Meus Dados de Acesso</h2>

            <form onSubmit={atualizarMeusDados} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Meu Nome (Exibição)</label>
                <input type="text" value={formMeusDados.nome} onChange={e => setFormMeusDados({ ...formMeusDados, nome: e.target.value })} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-elos-verde font-bold text-gray-700" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Usuário de Login</label>
                <input type="text" value={formMeusDados.usuario} onChange={e => setFormMeusDados({ ...formMeusDados, usuario: e.target.value.toLowerCase() })} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-elos-verde font-bold text-gray-700 lowercase" />
              </div>

              <div className="space-y-1.5 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black uppercase text-[#c5a880] tracking-widest ml-1">Redefinir Senha (Opcional)</label>
                <div className="relative">
                  <input
                    type={mostrarMinhaSenha ? 'text' : 'password'}
                    placeholder="Digite apenas se quiser mudar a atual..."
                    value={formMeusDados.novaSenha}
                    onChange={e => setFormMeusDados({ ...formMeusDados, novaSenha: e.target.value })}
                    className="w-full bg-orange-50/50 p-4 pr-12 rounded-xl border border-orange-100 outline-none focus:border-[#c5a880] font-bold text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarMinhaSenha(!mostrarMinhaSenha)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    title={mostrarMinhaSenha ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {mostrarMinhaSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={carregando} className="w-full bg-elos-verde hover:bg-[#3a4a3e] disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg active:scale-95 transition-all mt-2">
                {carregando ? 'Salvando...' : 'Atualizar Minhas Credenciais'}
              </button>
            </form>
          </div>
        )}

        {/* ABA 2: GERENCIAR EQUIPE */}
        {abaAtiva === 'GERENCIAR' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">

            {/* FORMULÁRIO: CRIAR OU EDITAR FUNCIONÁRIO */}
            <div className={`bg-white rounded-4xl p-8 shadow-sm border h-fit sticky top-24 transition-colors ${editandoId ? 'border-orange-200 ring-4 ring-orange-50' : 'border-gray-100'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-tradicional text-2xl text-[#c5a880] italic font-bold">
                  {editandoId ? 'Editar Colaborador' : 'Novo Colaborador'}
                </h2>
                {editandoId && (
                  <span className="bg-orange-100 text-orange-600 text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-widest">Editando</span>
                )}
              </div>

              <form onSubmit={salvarFuncionario} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nome Completo</label>
                  <input type="text" placeholder="Ex: João Silva" value={formNovo.nome} onChange={e => setFormNovo({ ...formNovo, nome: e.target.value })} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-700" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Usuário</label>
                    <input type="text" placeholder="Ex: joao.vendas" value={formNovo.usuario} onChange={e => setFormNovo({ ...formNovo, usuario: e.target.value.toLowerCase() })} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-700 lowercase" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                      {editandoId ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarSenhaNovo ? 'text' : 'password'}
                        placeholder={editandoId ? 'Manter atual' : 'Mín. 3 dígitos'}
                        value={formNovo.senha}
                        onChange={e => setFormNovo({ ...formNovo, senha: e.target.value })}
                        className="w-full bg-gray-50 p-4 pr-10 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenhaNovo(!mostrarSenhaNovo)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                        title={mostrarSenhaNovo ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {mostrarSenhaNovo ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nível de Acesso (Cargo)</label>
                  <select value={formNovo.cargo} onChange={e => setFormNovo({ ...formNovo, cargo: e.target.value })} className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-600 cursor-pointer">
                    <option value="VENDEDOR">Vendedor (Apenas Vendas, PDV e OS)</option>
                    <option value="ADMIN">Administrador (Acesso Total)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  {editandoId && (
                    <button type="button" onClick={cancelarEdicao} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all">
                      Cancelar
                    </button>
                  )}
                  <button type="submit" disabled={carregando} className={`flex-2 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg active:scale-95 transition-all ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-[#c5a880] hover:bg-[#b0946d] shadow-[#c5a880]/20'}`}>
                    {carregando ? 'Salvando...' : (editandoId ? 'Salvar Alterações' : 'Liberar Acesso')}
                  </button>
                </div>
              </form>
            </div>

            {/* LISTA DE FUNCIONÁRIOS */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 ml-1">Acessos Ativos</p>
              {carregandoLista ? (
                <p className="text-center text-elos-verde font-bold animate-pulse uppercase text-xs py-10">Carregando equipe...</p>
              ) : funcionarios.length === 0 ? (
                <p className="text-center text-gray-400 text-xs italic py-10 bg-white rounded-2xl border border-gray-100">Nenhum colaborador encontrado.</p>
              ) : (
                funcionarios.map(func => (
                  <div key={func._id} className={`bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center transition-all ${editandoId === func._id ? 'border-orange-300 ring-2 ring-orange-50' : 'border-gray-100 hover:shadow-md'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ${func.cargo === 'ADMIN' ? 'bg-elos-verde text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {func.cargo === 'ADMIN' ? '👑' : '💼'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          {func.nome}
                          {func._id === meuIdAtual && <span className="text-[8px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Você</span>}
                        </h4>
                        <p className="text-[10px] font-black text-gray-400 tracking-widest">Login: <span className="text-[#c5a880] lowercase">{func.usuario}</span></p>
                      </div>
                    </div>

                    {func._id !== meuIdAtual && (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => iniciarEdicao(func)} className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-gray-50 border border-gray-100" title="Editar Credenciais">
                          ✏️
                        </button>
                        <button
                          type="button"
                          disabled={deletandoId === func._id}
                          onClick={() => deletarFuncionario(func._id, func.nome, func.cargo)}
                          className="text-red-400 hover:text-white hover:bg-red-500 disabled:opacity-40 w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-red-50 border border-red-100/50"
                          title="Revogar Acesso"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}