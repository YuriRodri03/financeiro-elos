import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function Produtos() {
  const { produtos, adicionarProduto, editarProduto, excluirProduto, carregando } = useFinanceiro();

  const [abaAtiva, setAbaAtiva] = useState('ARMAÇÃO'); // Pode ser 'ARMAÇÃO' ou 'LENTE'
  const [editandoId, setEditandoId] = useState(null);
  
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    preco: '',
    categoria: 'ARMAÇÃO', // Padrão
    quantidade: ''
  });

  // --- ESTADOS PARA OS COMPONENTES CUSTOMIZADOS DE TOAST E CONFIRM ---
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, mensagem, acao });
  };

  // --- MÁSCARA DE MOEDA ---
  const aplicarMascaraMoeda = (valor) => {
    let v = String(valor).replace(/\D/g, '');
    if (!v) return '';
    return (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const limparMoeda = (valor) => {
    if (!valor) return 0;
    return Number(String(valor).replace(/[^\d]/g, '')) / 100;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'preco') {
      setNovoProduto({ ...novoProduto, [name]: aplicarMascaraMoeda(value) });
    } else {
      // Se mudar a categoria para lente, limpa a quantidade para não enviar lixo pro banco
      if (name === 'categoria' && value === 'LENTE') {
        setNovoProduto({ ...novoProduto, [name]: value, quantidade: '' });
      } else {
        setNovoProduto({ ...novoProduto, [name]: value });
      }
    }
  };

  // --- ENTRAR NO MODO DE EDIÇÃO ---
  const handleIniciarEdicao = (p) => {
    setEditandoId(p._id || p.id);
    setNovoProduto({
      nome: p.nome,
      preco: aplicarMascaraMoeda((p.preco * 100).toString()),
      categoria: p.categoria,
      quantidade: p.quantidade || ''
    });
    setAbaAtiva(p.categoria); // Muda para a aba correta ao editar
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setNovoProduto({ nome: '', preco: '', categoria: abaAtiva, quantidade: '' });
  };

  // --- ALTERAÇÃO RÁPIDA DE ESTOQUE (+ / -) ---
  const handleAjusteEstoqueRápido = async (produto, delta) => {
    const novaQuantidade = (produto.quantidade || 0) + delta;
    if (novaQuantidade < 0) return; // Não permite estoque negativo
    
    try {
      await editarProduto(produto._id || produto.id, { ...produto, quantidade: novaQuantidade });
      mostrarToast(`Estoque de ${produto.nome} atualizado!`, "sucesso");
    } catch (err) {
      mostrarToast("Erro ao atualizar o estoque.", "erro");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const precoLimpo = limparMoeda(novoProduto.preco);

    if (!novoProduto.nome || precoLimpo <= 0 || !novoProduto.categoria) {
      mostrarToast("Por favor, preencha o nome, preço e categoria corretamente.", "erro");
      return;
    }

    const dadosProduto = {
      nome: novoProduto.nome.toUpperCase(),
      preco: precoLimpo,
      categoria: novoProduto.categoria
    };

    // Só envia quantidade se for armação
    if (novoProduto.categoria === 'ARMAÇÃO') {
      dadosProduto.quantidade = parseInt(novoProduto.quantidade) || 0;
    }

    try {
      if (editandoId) {
        await editarProduto(editandoId, dadosProduto);
        mostrarToast("Item atualizado no sistema! 📝✨", "sucesso");
      } else {
        await adicionarProduto(dadosProduto);
        mostrarToast("Item adicionado com sucesso! 📦✨", "sucesso");
      }

      handleCancelarEdicao(); 
    } catch (err) {
      mostrarToast("Erro ao salvar produto.", "erro");
    }
  };

  if (carregando) return null;

  // Filtra os produtos com base na aba ativa
  const produtosExibidos = produtos.filter(p => p.categoria === abaAtiva);

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {/* TOAST PREMIUM DA ÓTICA ELOS */}
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${
            toast.tipo === 'sucesso' ? 'bg-elos-verde/95 border-elos-bege/30 text-white' : 'bg-red-900/95 border-red-500/30 text-red-100'
          }`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl border border-elos-bege/20 animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-elos-verde">📦</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Remoção</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">{confirmModal.mensagem}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ visivel: false, mensagem: '', acao: null })} className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all">
                Não
              </button>
              <button onClick={() => { if (confirmModal.acao) confirmModal.acao(); setConfirmModal({ visivel: false, mensagem: '', acao: null }); }} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all">
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        
        {/* CABEÇALHO */}
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">
              Estoque & Catálogo
            </h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Gerenciamento de Armações e Lentes</p>
          </div>
          
          {/* CONTROLE DE ABAS (TABS) */}
          <div className="flex bg-white p-1 rounded-2xl border border-elos-bege/20 shadow-sm">
            <button 
              onClick={() => {
                setAbaAtiva('ARMAÇÃO');
                setNovoProduto(prev => ({...prev, categoria: 'ARMAÇÃO'}));
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                abaAtiva === 'ARMAÇÃO' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'
              }`}
            >
              👓 Armações
            </button>
            <button 
              onClick={() => {
                setAbaAtiva('LENTE');
                setNovoProduto(prev => ({...prev, categoria: 'LENTE'}));
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                abaAtiva === 'LENTE' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'
              }`}
            >
              🔍 Lentes
            </button>
          </div>
        </header>

        {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
        <div className={`bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border transition-colors duration-300 ${editandoId ? 'border-elos-bege/40 bg-elos-bege/5' : 'border-elos-bege/10'}`}>
          <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
            <span className={`w-2 h-6 rounded-full ${editandoId ? 'bg-elos-verde animate-pulse' : 'bg-elos-bege'}`}></span>
            {editandoId ? `Editando ${novoProduto.categoria}: ${novoProduto.nome || ''}` : `Cadastrar Nova ${novoProduto.categoria}`}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* SELETOR DE CATEGORIA */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Tipo</label>
              <select 
                name="categoria" 
                value={novoProduto.categoria} 
                onChange={handleChange} 
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none uppercase font-bold text-elos-texto shadow-sm focus:ring-2 focus:ring-elos-bege/50 appearance-none"
              >
                <option value="ARMAÇÃO">ARMAÇÃO</option>
                <option value="LENTE">LENTE</option>
              </select>
            </div>

            {/* NOME DO PRODUTO */}
            <div className={`space-y-2 ${novoProduto.categoria === 'ARMAÇÃO' ? 'md:col-span-5' : 'md:col-span-6'}`}>
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Modelo / Descrição</label>
              <input 
                type="text" name="nome" value={novoProduto.nome} onChange={handleChange} 
                placeholder={novoProduto.categoria === 'ARMAÇÃO' ? "Ex: RAY-BAN ERICA RB4171" : "Ex: LENTE VISÃO SIMPLES RESINA"} 
                required 
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50"
              />
            </div>

            {/* PREÇO */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Preço Venda</label>
              <input 
                type="text" name="preco" value={novoProduto.preco} onChange={handleChange} 
                placeholder="R$ 0,00" required 
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-elos-verde outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50"
              />
            </div>

            {/* QUANTIDADE (SÓ APARECE SE FOR ARMAÇÃO) */}
            {novoProduto.categoria === 'ARMAÇÃO' && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Estoque</label>
                <input 
                  type="number" name="quantidade" value={novoProduto.quantidade} onChange={handleChange} 
                  placeholder="Qtd." min="0" required 
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-center outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50"
                />
              </div>
            )}

            {/* BOTÕES */}
            <div className="md:col-span-12 flex justify-end gap-4 mt-2">
              {editandoId && (
                <button type="button" onClick={handleCancelarEdicao} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-6 py-4 rounded-2xl transition-all uppercase text-xs tracking-widest">
                  Cancelar
                </button>
              )}
              <button type="submit" className={`${editandoId ? 'bg-elos-bege hover:bg-elos-verde' : 'bg-elos-verde hover:bg-[#3a4a3e]'} text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest`}>
                {editandoId ? 'Salvar Alterações' : 'Salvar no Sistema'}
              </button>
            </div>
          </form>
        </div>

        {/* LISTA DE PRODUTOS CADASTRADOS (FILTRADA PELA ABA) */}
        <div className="space-y-6">
          <h3 className="text-2xl font-tradicional text-elos-verde italic ml-2">
            {abaAtiva === 'ARMAÇÃO' ? 'Armações em Estoque' : 'Catálogo de Lentes'}
          </h3>
          
          <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border border-gray-100">
            {produtosExibidos.length === 0 ? (
              <p className="text-center text-gray-400 italic py-16">Nenhum(a) {abaAtiva.toLowerCase()} cadastrado(a).</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {produtosExibidos.map((p) => (
                  <div key={p._id || p.id} className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 hover:bg-elos-fundo/30 transition-colors">
                    
                    <div className="text-center sm:text-left flex-1">
                      <h4 className="text-lg font-bold text-elos-texto mt-1 font-tradicional">{p.nome}</h4>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto">
                      
                      {/* CONTROLE DE QUANTIDADE RÁPIDO (SÓ PARA ARMAÇÃO) */}
                      {abaAtiva === 'ARMAÇÃO' && (
                        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                          <button onClick={() => handleAjusteEstoqueRápido(p, -1)} className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 rounded-lg shadow-sm font-bold hover:text-red-500 hover:bg-red-50">-</button>
                          <div className="flex flex-col items-center min-w-[3rem]">
                            <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">QTD</span>
                            <span className={`text-lg font-black leading-none ${p.quantidade > 0 ? 'text-elos-verde' : 'text-red-500'}`}>
                              {p.quantidade || 0}
                            </span>
                          </div>
                          <button onClick={() => handleAjusteEstoqueRápido(p, 1)} className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 rounded-lg shadow-sm font-bold hover:text-elos-verde hover:bg-green-50">+</button>
                        </div>
                      )}

                      {/* PREÇO */}
                      <span className="text-xl font-black text-elos-verde whitespace-nowrap">
                        {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {/* BOTÕES DE AÇÃO */}
                      <div className="flex items-center gap-2 border-l border-gray-100 pl-4 sm:pl-0 sm:border-none">
                        <button onClick={() => handleIniciarEdicao(p)} className="bg-elos-fundo hover:bg-elos-bege hover:text-white text-elos-bege px-4 py-2.5 rounded-xl text-xs font-bold transition-all" title="Editar">
                          ✏️
                        </button>
                        <button onClick={() => { abrirConfirmacao(`Deseja realmente remover "${p.nome}" do sistema?`, () => { excluirProduto(p._id || p.id); mostrarToast("Item removido com sucesso!", "sucesso"); }); }} className="bg-red-50 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors" title="Excluir">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}