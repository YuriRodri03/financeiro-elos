import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function Produtos() {
  const { produtos, adicionarProduto, editarProduto, excluirProduto, carregando } = useFinanceiro();

  // 🟢 URL da API local (caso ainda exista algum produto muito antigo no formato Base64)
  const apiUrl = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';
  
  // 🟢 CHAVE DA NUVEM IMGBB PUXADA DO .ENV
  const imgBBKey = import.meta.env.VITE_IMGBB_API_KEY || '';

  const [abaAtiva, setAbaAtiva] = useState('ARMAÇÃO');
  const [editandoId, setEditandoId] = useState(null);
  const [buscaEstoque, setBuscaEstoque] = useState('');
  
  const [mostrarFormCadastro, setMostrarFormCadastro] = useState(false);
  
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    referencia: '', 
    preco: '',
    categoria: 'ARMAÇÃO',
    quantidade: '',
    foto: '' 
  });

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => { setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }); }, 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, mensagem, acao });
  };

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
      if (name === 'categoria' && value === 'LENTE') {
        setNovoProduto({ ...novoProduto, [name]: value, quantidade: '', referencia: '' });
      } else {
        setNovoProduto({ ...novoProduto, [name]: value });
      }
    }
  };

  // 🟢 NOVA LÓGICA DE UPLOAD: ENVIA DIRETO PARA O IMGBB E SALVA APENAS O LINK NO BANCO
  const handleMudarFotoProduto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!imgBBKey) {
      mostrarToast("A chave VITE_IMGBB_API_KEY não foi encontrada no .env!", "erro");
      return;
    }

    mostrarToast("Enviando foto para a nuvem... ☁️", "sucesso");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgBBKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        const linkDaNuvem = data.data.url;
        setNovoProduto({ ...novoProduto, foto: linkDaNuvem });
        mostrarToast("Foto carregada com sucesso! ✅", "sucesso");
      } else {
        mostrarToast("Erro ao processar imagem na nuvem.", "erro");
      }
    } catch (error) {
      console.error("Erro no upload da imagem:", error);
      mostrarToast("Falha de conexão com a nuvem de imagens.", "erro");
    }
  };

  const handleIniciarEdicao = (p) => {
    setEditandoId(p._id || p.id);
    setAbaAtiva(p.categoria); 
    setMostrarFormCadastro(true); 
    
    setNovoProduto({
      nome: p.nome,
      referencia: p.referencia || '', 
      preco: aplicarMascaraMoeda((p.preco * 100).toString()),
      categoria: p.categoria,
      quantidade: p.quantidade || '',
      foto: p.foto || '' // Como agora é apenas um link, podemos jogar direto no estado!
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setNovoProduto({ nome: '', referencia: '', preco: '', categoria: abaAtiva, quantidade: '', foto: '' });
    setMostrarFormCadastro(false);
  };

  const handleAjusteEstoqueRápido = async (produto, delta) => {
    const novaQuantidade = (produto.quantidade || 0) + delta;
    if (novaQuantidade < 0) return; 
    
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
      categoria: novoProduto.categoria,
      foto: novoProduto.foto 
    };

    if (novoProduto.categoria === 'ARMAÇÃO') {
      dadosProduto.quantidade = parseInt(novoProduto.quantidade) || 0;
      dadosProduto.referencia = (novoProduto.referencia || '').toUpperCase();
    } else {
      dadosProduto.referencia = ''; 
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

  const termoBuscado = buscaEstoque.toLowerCase();
  const produtosExibidos = (produtos || []).filter(p => {
    const deFatoNaAba = p.categoria === abaAtiva;
    const nomeBate = (p.nome || '').toLowerCase().includes(termoBuscado);
    const refBate = (p.referencia || '').toLowerCase().includes(termoBuscado);
    return deFatoNaAba && (nomeBate || refBate);
  });

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${toast.tipo === 'sucesso' ? 'bg-elos-verde/95 border-elos-bege/30 text-white' : 'bg-red-900/95 border-red-500/30 text-red-100'}`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl border border-elos-bege/20 animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-elos-verde">📦</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Remoção</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">{confirmModal.mensagem}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ visivel: false, mensagem: '', acao: null })} className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all">Não</button>
              <button onClick={() => { if (confirmModal.acao) confirmModal.acao(); setConfirmModal({ visivel: false, mensagem: '', acao: null }); }} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all">Sim, Remover</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">Estoque & Catálogo</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Gerenciamento de Armações e Lentes</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto items-center">
            <button 
              type="button" 
              onClick={() => {
                if (mostrarFormCadastro) handleCancelarEdicao();
                else setMostrarFormCadastro(true);
              }} 
              className={`w-full md:w-auto px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all ${mostrarFormCadastro ? 'bg-elos-bege text-white' : 'bg-elos-verde text-white'}`}
            >
              {mostrarFormCadastro ? '📁 Ocultar Cadastro' : '➕ Novo Produto'}
            </button>

            <div className="flex bg-white p-1 rounded-2xl border border-elos-bege/20 shadow-sm w-full md:w-auto justify-center">
              <button 
                onClick={() => { setAbaAtiva('ARMAÇÃO'); setNovoProduto(prev => ({...prev, categoria: 'ARMAÇÃO'})); }}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === 'ARMAÇÃO' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'}`}
              >
                👓 Armações
              </button>
              <button 
                onClick={() => { setAbaAtiva('LENTE'); setNovoProduto(prev => ({...prev, categoria: 'LENTE', quantidade: '', referencia: ''})); }}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === 'LENTE' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'}`}
              >
                🔍 Lentes
              </button>
            </div>
          </div>
        </header>

        {mostrarFormCadastro && (
          <div className={`bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border transition-colors duration-300 ${editandoId ? 'border-elos-bege/40 bg-elos-bege/5' : 'border-elos-bege/10'}`}>
            <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
              <span className={`w-2 h-6 rounded-full ${editandoId ? 'bg-elos-verde animate-pulse' : 'bg-elos-bege'}`}></span>
              {editandoId ? `Editando ${novoProduto.categoria}: ${novoProduto.nome || ''}` : `Cadastrar Nova ${novoProduto.categoria}`}
            </h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">

              <div className="md:col-span-12 flex flex-col sm:flex-row items-center gap-6 mb-2 bg-elos-fundo/50 p-5 rounded-[2rem] border border-elos-bege/20">
                <div className="w-24 h-24 shrink-0 rounded-2xl border-4 border-white shadow-md flex items-center justify-center overflow-hidden bg-gray-100">
                  {novoProduto.foto ? (
                    // 🟢 PREVIEW DA IMAGEM AGORA LÊ O LINK DO IMGBB DIRETAMENTE
                    <img src={novoProduto.foto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl opacity-20">📷</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-center sm:text-left">
                  <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter">Imagem do Produto / Catálogo</label>
                  <div className="relative">
                    <button type="button" className="px-5 py-2.5 bg-elos-bege text-white rounded-xl text-xs font-bold hover:bg-elos-verde transition-colors shadow-sm">
                      {novoProduto.foto ? 'Trocar Imagem 📸' : 'Escolher Imagem 📸'}
                    </button>
                    <input type="file" accept="image/*" onChange={handleMudarFotoProduto} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                  {novoProduto.foto && (
                    <button type="button" onClick={() => setNovoProduto({...novoProduto, foto: ''})} className="text-[10px] text-red-400 font-bold hover:text-red-600 transition-colors">
                      🗑️ Remover imagem atual
                    </button>
                  )}
                </div>
              </div>
              
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

              {novoProduto.categoria === 'ARMAÇÃO' && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Código / Ref.</label>
                  <input 
                    type="text" name="referencia" value={novoProduto.referencia} onChange={handleChange} 
                    placeholder="Ex: RB4171" 
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50 uppercase"
                  />
                </div>
              )}

              <div className={`space-y-2 ${novoProduto.categoria === 'ARMAÇÃO' ? 'md:col-span-3' : 'md:col-span-7'}`}>
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Modelo / Descrição</label>
                <input 
                  type="text" name="nome" value={novoProduto.nome} onChange={handleChange} 
                  placeholder={novoProduto.categoria === 'ARMAÇÃO' ? "Ex: RAY-BAN ERICA PRETO" : "Ex: VISÃO SIMPLES RESINA INCOLOR"} 
                  required 
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Preço Venda</label>
                <input 
                  type="text" name="preco" value={novoProduto.preco} onChange={handleChange} 
                  placeholder="R$ 0,00" required 
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-elos-verde outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50"
                />
              </div>

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
        )}

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 ml-2">
            <h3 className="text-2xl font-tradicional text-elos-verde italic">
              {abaAtiva === 'ARMAÇÃO' ? 'Armações em Estoque' : 'Catálogo de Lentes'}
            </h3>
            
            <input 
              type="text"
              placeholder="🔍 Buscar por Nome ou Código/Ref..."
              value={buscaEstoque}
              onChange={(e) => setBuscaEstoque(e.target.value)}
              className="w-full md:w-80 px-5 py-3 bg-white border border-elos-bege/20 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-elos-bege/50 text-sm"
            />
          </div>
          
          <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border border-gray-100">
            {produtosExibidos.length === 0 ? (
              <p className="text-center text-gray-400 italic py-16">
                {buscaEstoque ? 'Nenhum item encontrado na busca.' : `Nenhum(a) ${abaAtiva.toLowerCase()} cadastrado(a).`}
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {produtosExibidos.map((p) => {
                  const productId = p._id || p.id;
                  
                  return (
                    <div key={productId} className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 hover:bg-elos-fundo/30 transition-colors">
                      
                      <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                        <div className="w-16 h-16 shrink-0 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden bg-gray-50 shadow-sm relative">
                          {p.categoria === 'ARMAÇÃO' ? (
                            <>
                              <img 
                                // 🟢 SUPORTE HÍBRIDO: Aceita imagens novas da nuvem ou puxa imagens antigas do backend!
                                src={p.foto && p.foto.startsWith('http') ? p.foto : `${apiUrl.replace(/\/$/, '')}/produtos/${productId}/foto?v=1`} 
                                alt={p.nome} 
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                className="w-full h-full object-cover cursor-zoom-in hover:scale-110 transition-transform duration-300" 
                                onClick={(e) => window.open(e.target.src, '_blank')} 
                              />
                              <span className="text-xl opacity-20 hidden absolute">👓</span>
                            </>
                          ) : (
                            <span className="text-xl opacity-20">🔍</span>
                          )}
                        </div>
                        
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            {p.categoria === 'ARMAÇÃO' && p.referencia && (
                              <span className="bg-elos-bege/10 border border-elos-bege/30 text-elos-bege px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                                REF: {p.referencia}
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-elos-texto font-tradicional leading-tight">{p.nome}</h4>
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{p.categoria}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto mt-4 sm:mt-0">
                        
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

                        <span className="text-xl font-black text-elos-verde whitespace-nowrap">
                          {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        
                        <div className="flex items-center gap-2 border-l border-gray-100 pl-4 sm:pl-0 sm:border-none">
                          <button onClick={() => handleIniciarEdicao(p)} className="bg-elos-fundo hover:bg-elos-bege hover:text-white text-elos-bege px-4 py-2.5 rounded-xl text-xs font-bold transition-all" title="Editar">
                            ✏️
                          </button>
                          <button onClick={() => { abrirConfirmacao(`Deseja realmente remover "${p.nome}" do sistema?`, () => { excluirProduto(productId); mostrarToast("Item removido com sucesso!", "sucesso"); }); }} className="bg-red-50 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors" title="Excluir">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}