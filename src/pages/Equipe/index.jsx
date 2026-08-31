import React, { useState, useEffect } from 'react';

export default function Equipe() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [abaAtiva, setAbaAtiva] = useState('MEUS_DADOS'); 
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // 🟢 ESTADO PARA CONTROLAR A EDIÇÃO
  const [editandoId, setEditandoId] = useState(null);

  // Puxa quem está logado agora
  const meuUsuario = JSON.parse(localStorage.getItem('otica_elos_dados_equipe') || '{}');

  // Estados dos Formulários
  const [formNovo, setFormNovo] = useState({ nome: '', usuario: '', senha: '', cargo: 'VENDEDOR' });
  const [formMeusDados, setFormMeusDados] = useState({ nome: meuUsuario.nome || '', usuario: meuUsuario.usuario || '', novaSenha: '' });

  const buscarFuncionarios = async () => {
    try {
      const res = await fetch(`${API_URL}/funcionarios`);
      if (res.ok) setFuncionarios(await res.json());
    } catch (e) {}
  };

  useEffect(() => { buscarFuncionarios(); }, []);

  // 🟢 ATUALIZAR PRÓPRIAS CREDENCIAIS
  const atualizarMeusDados = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const payload = { nome: formMeusDados.nome, usuario: formMeusDados.usuario };
      if (formMeusDados.novaSenha.trim() !== '') {
        payload.senha = formMeusDados.novaSenha;
      }

      const res = await fetch(`${API_URL}/funcionarios/${meuUsuario.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        const dadosAtualizados = await res.json();
        localStorage.setItem('otica_elos_dados_equipe', JSON.stringify({
          id: dadosAtualizados._id, nome: dadosAtualizados.nome, usuario: dadosAtualizados.usuario, cargo: dadosAtualizados.cargo
        }));
        alert("Seus dados foram atualizados com sucesso! (Se você mudou a senha, use-a no próximo login).");
        setFormMeusDados(prev => ({...prev, novaSenha: ''}));
        buscarFuncionarios();
      } else {
        alert("Erro ao atualizar dados. O nome de usuário pode já estar em uso.");
      }
    } catch (error) { alert("Erro de conexão."); }
    finally { setCarregando(false); }
  };

  // 🟢 INICIAR E CANCELAR EDIÇÃO DA EQUIPE
  const iniciarEdicao = (func) => {
    setEditandoId(func._id);
    setFormNovo({ nome: func.nome, usuario: func.usuario, senha: '', cargo: func.cargo });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormNovo({ nome: '', usuario: '', senha: '', cargo: 'VENDEDOR' });
  };

  // 🟢 SALVAR FUNCIONÁRIO (Criação ou Edição)
  const salvarFuncionario = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const payload = { nome: formNovo.nome, usuario: formNovo.usuario, cargo: formNovo.cargo };
      
      // Só envia a senha se o admin digitou algo novo
      if (formNovo.senha.trim() !== '') {
        payload.senha = formNovo.senha;
      } else if (!editandoId) {
        // Se for um NOVO cadastro, a senha é obrigatória
        alert("A senha inicial é obrigatória para novos cadastros.");
        setCarregando(false);
        return;
      }

      const url = editandoId ? `${API_URL}/funcionarios/${editandoId}` : `${API_URL}/funcionarios`;
      const metodo = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editandoId ? "Dados atualizados com sucesso!" : `Acesso liberado para ${formNovo.nome}!`);
        cancelarEdicao();
        buscarFuncionarios();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar. O usuário pode já existir.");
      }
    } catch (error) { alert("Erro de conexão."); }
    finally { setCarregando(false); }
  };

  // 🟢 EXCLUIR FUNCIONÁRIO
  const deletarFuncionario = async (id, nome, cargo) => {
    if (id === meuUsuario.id) return alert("Você não pode excluir a si mesmo!");
    if (cargo === 'ADMIN' && id !== meuUsuario.id) {
      const confirmaAdmin = window.confirm("Atenção: Você está prestes a excluir outro Administrador. Tem certeza?");
      if (!confirmaAdmin) return;
    } else {
      if (!window.confirm(`Deseja revogar o acesso de ${nome}?`)) return;
    }

    try {
      await fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE' });
      buscarFuncionarios();
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-8">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Segurança & Equipe</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Controle de Acessos do Sistema</p>
        </header>

        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-8 max-w-sm">
          <button onClick={() => setAbaAtiva('MEUS_DADOS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'MEUS_DADOS' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'}`}>
            🔐 Minhas Credenciais
          </button>
          <button onClick={() => setAbaAtiva('GERENCIAR')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'GERENCIAR' ? 'bg-[#c5a880] text-white shadow-md' : 'text-gray-400 hover:text-[#c5a880]'}`}>
            👥 Gerenciar Equipe
          </button>
        </div>

        {/* 🟢 ABA 1: MINHAS CREDENCIAIS */}
        {abaAtiva === 'MEUS_DADOS' && (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 animate-in fade-in max-w-2xl">
            <h2 className="font-tradicional text-2xl text-elos-verde italic font-bold mb-6">Meus Dados de Acesso</h2>
            
            <form onSubmit={atualizarMeusDados} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Meu Nome (Exibição)</label>
                <input type="text" value={formMeusDados.nome} onChange={e => setFormMeusDados({...formMeusDados, nome: e.target.value})} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-elos-verde font-bold text-gray-700" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Usuário de Login</label>
                <input type="text" value={formMeusDados.usuario} onChange={e => setFormMeusDados({...formMeusDados, usuario: e.target.value.toLowerCase()})} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-elos-verde font-bold text-gray-700 lowercase" />
              </div>

              <div className="space-y-1.5 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black uppercase text-[#c5a880] tracking-widest ml-1">Redefinir Senha (Opcional)</label>
                <input type="text" placeholder="Digite apenas se quiser mudar a atual..." value={formMeusDados.novaSenha} onChange={e => setFormMeusDados({...formMeusDados, novaSenha: e.target.value})} className="w-full bg-orange-50/50 p-4 rounded-xl border border-orange-100 outline-none focus:border-[#c5a880] font-bold text-gray-700" />
              </div>

              <button type="submit" disabled={carregando} className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg active:scale-95 transition-all mt-2">
                {carregando ? 'Salvando...' : 'Atualizar Minhas Credenciais'}
              </button>
            </form>
          </div>
        )}

        {/* 🟢 ABA 2: GERENCIAR EQUIPE */}
        {abaAtiva === 'GERENCIAR' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
            
            {/* FORMULÁRIO: CRIAR OU EDITAR FUNCIONÁRIO */}
            <div className={`bg-white rounded-[2rem] p-8 shadow-sm border h-fit sticky top-24 transition-colors ${editandoId ? 'border-orange-200 ring-4 ring-orange-50' : 'border-gray-100'}`}>
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
                  <input type="text" placeholder="Ex: João Silva" value={formNovo.nome} onChange={e => setFormNovo({...formNovo, nome: e.target.value})} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-700" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Usuário</label>
                    <input type="text" placeholder="Ex: joao.vendas" value={formNovo.usuario} onChange={e => setFormNovo({...formNovo, usuario: e.target.value.toLowerCase()})} required className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-700 lowercase" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                      {editandoId ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                    </label>
                    <input type="text" placeholder={editandoId ? "Deixe em branco para manter" : "Ex: 123456"} value={formNovo.senha} onChange={e => setFormNovo({...formNovo, senha: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-700" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nível de Acesso (Cargo)</label>
                  <select value={formNovo.cargo} onChange={e => setFormNovo({...formNovo, cargo: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] font-bold text-gray-600 cursor-pointer">
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
                  <button type="submit" disabled={carregando} className={`flex-[2] text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg active:scale-95 transition-all ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-[#c5a880] hover:bg-[#b0946d] shadow-[#c5a880]/20'}`}>
                    {carregando ? 'Salvando...' : (editandoId ? 'Salvar Alterações' : 'Liberar Acesso')}
                  </button>
                </div>
              </form>
            </div>

            {/* LISTA DE FUNCIONÁRIOS */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 ml-1">Acessos Ativos</p>
              {funcionarios.map(func => (
                <div key={func._id} className={`bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center transition-all ${editandoId === func._id ? 'border-orange-300 ring-2 ring-orange-50' : 'border-gray-100 hover:shadow-md'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ${func.cargo === 'ADMIN' ? 'bg-elos-verde text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {func.cargo === 'ADMIN' ? '👑' : '💼'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        {func.nome} 
                        {func._id === meuUsuario.id && <span className="text-[8px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Você</span>}
                      </h4>
                      <p className="text-[10px] font-black text-gray-400 tracking-widest">Login: <span className="text-[#c5a880] lowercase">{func.usuario}</span></p>
                    </div>
                  </div>
                  
                  {func._id !== meuUsuario.id && (
                    <div className="flex items-center gap-2">
                      {/* BOTÃO DE EDIÇÃO INSERIDO AQUI */}
                      <button onClick={() => iniciarEdicao(func)} className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-gray-50 border border-gray-100" title="Editar Credenciais">
                        ✏️
                      </button>
                      <button onClick={() => deletarFuncionario(func._id, func.nome, func.cargo)} className="text-red-400 hover:text-white hover:bg-red-500 w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-red-50 border border-red-100/50" title="Revogar Acesso">
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}