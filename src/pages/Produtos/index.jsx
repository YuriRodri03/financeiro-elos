import React, { useState, useRef, useEffect } from 'react';

import {
  useProdutos,
  useAdicionarProduto,
  useEditarProduto,
  useExcluirProduto
} from '../../hooks/useProdutos';

const ESTADO_PRODUTO_INICIAL = {
  nome: '',
  referencia: '',
  preco: '',
  categoria: 'ARMAÇÃO',
  quantidade: '',
  descricao: '',
  fotos: []
};

const ABAS_CATEGORIAS = [
  { id: 'ARMAÇÃO', label: '👓 Armações' },
  { id: 'LENTE', label: '🔍 Lentes' },
  { id: 'ÓCULOS DE SOL', label: '☀️ Óculos de Sol' },
  { id: 'ACESSÓRIOS', label: '👜 Acessórios' },
  { id: 'UPSELL', label: '🚀 Ofertas de Carrinho' }
];

const comprimirImagem = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido ou corrompido.'));
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Não foi possível comprimir a imagem.'));
            return;
          }
          resolve(new File([blob], 'foto_otimizada.webp', { type: 'image/webp' }));
        }, 'image/webp', 0.85);
      };
    };
  });
};

export default function Produtos() {
  const { data: produtos = [], isLoading: carregando } = useProdutos();
  const adicionarProdutoMutation = useAdicionarProduto();
  const editarProdutoMutation = useEditarProduto();
  const excluirProdutoMutation = useExcluirProduto();

  const apiUrl = import.meta.env.VITE_API_URL || 'https://elos-server.onrender.com/api';
  const imgBBKey = import.meta.env.VITE_IMGBB_API_KEY || '';

  const [abaAtiva, setAbaAtiva] = useState('ARMAÇÃO');
  const [editandoId, setEditandoId] = useState(null);
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [mostrarFormCadastro, setMostrarFormCadastro] = useState(false);
  const [ajustandoId, setAjustandoId] = useState(null);

  const [novoProduto, setNovoProduto] = useState(ESTADO_PRODUTO_INICIAL);
  const [modalZoom, setModalZoom] = useState(null);
  const [nivelZoom, setNivelZoom] = useState(false);
  const [uploadingMultiplo, setUploadingMultiplo] = useState(false);

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visivel: true, mensagem, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, mensagem, acao });
  };

  const aplicarMascaraMoeda = (valor) => {
    const digitos = String(valor).replace(/\D/g, '');
    if (!digitos) return '';
    return (Number(digitos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const limparMoeda = (valor) => {
    if (!valor) return 0;
    return Number(String(valor).replace(/\D/g, '')) / 100;
  };

  const formatarUrlFoto = (f, productId) => {
    if (!f) return '';
    if (f.startsWith('http') || f.startsWith('data:')) return f;
    if (!productId) return '';
    return `${apiUrl.replace(/\/+$/, '')}/produtos/${productId}/foto?v=1`;
  };

  const abrirZoomProduto = (produto, indexInicial = 0) => {
    const productId = produto._id || produto.id;
    const listaBruta = Array.isArray(produto.fotos) && produto.fotos.length > 0
      ? produto.fotos
      : (produto.foto ? [produto.foto] : []);

    const fotosFormatadas = listaBruta.map((f) => formatarUrlFoto(f, productId)).filter(Boolean);
    if (fotosFormatadas.length === 0) return;

    setNivelZoom(false);
    setModalZoom({
      fotos: fotosFormatadas,
      indexAtual: indexInicial,
      nome: produto.nome,
      referencia: produto.referencia,
      descricao: produto.descricao,
      preco: produto.preco
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'preco') {
      setNovoProduto((prev) => ({ ...prev, [name]: aplicarMascaraMoeda(value) }));
    } else if (name === 'categoria' && value === 'LENTE') {
      setNovoProduto((prev) => ({ ...prev, [name]: value, quantidade: '', referencia: '' }));
    } else {
      setNovoProduto((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAdicionarFotoGaleria = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!imgBBKey) {
      mostrarToast('Chave VITE_IMGBB_API_KEY não encontrada!', 'erro');
      e.target.value = '';
      return;
    }

    setUploadingMultiplo(true);
    mostrarToast(`Comprimindo e enviando ${files.length} foto(s)... ⏳`, 'sucesso');

    const novosLinks = [];

    try {
      for (const file of files) {
        try {
          const fotoSuperLeve = await comprimirImagem(file);
          const formData = new FormData();
          formData.append('image', fotoSuperLeve);

          const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgBBKey}`, {
            method: 'POST',
            body: formData
          });

          const data = await res.json();
          if (data.success && data.data?.url) {
            novosLinks.push(data.data.url);
          } else {
            console.error('Erro no ImgBB:', data);
          }
        } catch (error) {
          console.error('Erro ao processar foto:', error);
        }
      }

      if (novosLinks.length > 0) {
        setNovoProduto((prev) => ({ ...prev, fotos: [...prev.fotos, ...novosLinks] }));
        mostrarToast(`${novosLinks.length} foto(s) otimizada(s) com sucesso! ✅`, 'sucesso');
      } else {
        mostrarToast('Falha no upload das fotos.', 'erro');
      }
    } finally {
      setUploadingMultiplo(false);
      e.target.value = '';
    }
  };

  const handleRemoverFoto = (indexRemover) => {
    setNovoProduto((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((_, index) => index !== indexRemover)
    }));
  };

  const handleIniciarEdicao = (p) => {
    setEditandoId(p._id || p.id);
    setAbaAtiva(p.categoria);
    setMostrarFormCadastro(true);

    let fotosCarregadas = Array.isArray(p.fotos) ? p.fotos : [];
    if (fotosCarregadas.length === 0 && p.foto) {
      fotosCarregadas = [p.foto];
    }

    setNovoProduto({
      nome: p.nome || '',
      referencia: p.referencia || '',
      preco: aplicarMascaraMoeda(Math.round((Number(p.preco) || 0) * 100).toString()),
      categoria: p.categoria || 'ARMAÇÃO',
      quantidade: p.quantidade ?? '',
      descricao: p.descricao || '',
      fotos: fotosCarregadas
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setNovoProduto({ ...ESTADO_PRODUTO_INICIAL, categoria: abaAtiva });
    setMostrarFormCadastro(false);
  };

  const handleAjusteEstoqueRapido = async (produto, delta) => {
    const productId = produto._id || produto.id;
    if (!productId || ajustandoId === productId) return;

    const novaQuantidade = (Number(produto.quantidade) || 0) + delta;
    if (novaQuantidade < 0) return;

    setAjustandoId(productId);
    try {
      await editarProdutoMutation.mutateAsync({
        produtoId: productId,
        dadosNovos: { ...produto, quantidade: novaQuantidade }
      });
      mostrarToast('Estoque atualizado!', 'sucesso');
    } catch (err) {
      mostrarToast(err?.message || 'Erro ao atualizar o estoque.', 'erro');
    } finally {
      setAjustandoId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadingMultiplo || adicionarProdutoMutation.isPending || editarProdutoMutation.isPending) return;

    const nomeLimpo = novoProduto.nome.trim();
    const precoLimpo = limparMoeda(novoProduto.preco);

    if (!nomeLimpo || precoLimpo <= 0 || !novoProduto.categoria) {
      mostrarToast('Por favor, preencha o nome, preço e categoria corretamente.', 'erro');
      return;
    }

    const dadosProduto = {
      nome: nomeLimpo.toUpperCase(),
      preco: precoLimpo,
      categoria: novoProduto.categoria,
      descricao: (novoProduto.descricao || '').trim(),
      fotos: novoProduto.fotos,
      foto: novoProduto.fotos[0] || ''
    };

    if (novoProduto.categoria !== 'LENTE') {
      dadosProduto.quantidade = Math.max(0, parseInt(novoProduto.quantidade, 10) || 0);
      dadosProduto.referencia = (novoProduto.referencia || '').trim().toUpperCase();
    } else {
      dadosProduto.referencia = '';
    }

    try {
      if (editandoId) {
        await editarProdutoMutation.mutateAsync({ produtoId: editandoId, dadosNovos: dadosProduto });
        mostrarToast('Item atualizado no sistema! 📝✨', 'sucesso');
      } else {
        await adicionarProdutoMutation.mutateAsync(dadosProduto);
        mostrarToast('Item adicionado com sucesso! 📦✨', 'sucesso');
      }
      handleCancelarEdicao();
    } catch (err) {
      mostrarToast(err?.message || 'Erro ao salvar produto.', 'erro');
    }
  };

  const getIconeCategoria = (cat) => {
    switch (cat) {
      case 'ÓCULOS DE SOL': return '☀️';
      case 'ACESSÓRIOS': return '👜';
      case 'LENTE': return '🔍';
      case 'UPSELL': return '🚀';
      default: return '👓';
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-elos-fundo p-10 flex items-center justify-center">
        <p className="text-elos-verde font-bold animate-pulse uppercase text-xs tracking-widest">
          Carregando estoque...
        </p>
      </div>
    );
  }

  const termoBuscado = buscaEstoque.trim().toLowerCase();

  const produtosExibidos = (produtos || [])
    .filter((p) => {
      const deFatoNaAba = p.categoria === abaAtiva;
      if (!termoBuscado) return deFatoNaAba;
      const nomeBate = String(p.nome || '').toLowerCase().includes(termoBuscado);
      const refBate = String(p.referencia || '').toLowerCase().includes(termoBuscado);
      const descBate = String(p.descricao || '').toLowerCase().includes(termoBuscado);
      return deFatoNaAba && (nomeBate || refBate || descBate);
    })
    .sort((a, b) => {
      const idA = String(a._id || a.id || '');
      const idB = String(b._id || b.id || '');
      return idB.localeCompare(idA);
    });

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">

      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-9999 animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${toast.tipo === 'sucesso' ? 'bg-elos-verde/95 border-elos-bege/30 text-white' : 'bg-red-900/95 border-red-500/30 text-red-100'}`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-9999 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl border border-elos-bege/20 animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-elos-verde">📦</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Remoção</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">{confirmModal.mensagem}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ visivel: false, mensagem: '', acao: null })}
                className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => {
                  const acao = confirmModal.acao;
                  setConfirmModal({ visivel: false, mensagem: '', acao: null });
                  if (acao) acao();
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX DE ZOOM NAS FOTOS DO PRODUTO */}
      {modalZoom && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-9998 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalZoom(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 md:px-8 bg-elos-verde text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  {modalZoom.referencia && (
                    <span className="bg-elos-bege text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md">
                      REF: {modalZoom.referencia}
                    </span>
                  )}
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
                    Foto {modalZoom.indexAtual + 1} de {modalZoom.fotos.length}
                  </span>
                </div>
                <h3 className="font-tradicional text-xl md:text-2xl italic font-bold mt-1">{modalZoom.nome}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNivelZoom(!nivelZoom)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    nivelZoom ? 'bg-elos-bege text-white' : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {nivelZoom ? '🔍 Reduzir (1x)' : '🔎 Super Zoom (2x)'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center text-2xl transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-linear-to-br from-gray-50 to-white min-h-80 max-h-[60vh] overflow-auto flex items-center justify-center p-6 select-none">
              <img
                src={modalZoom.fotos[modalZoom.indexAtual]}
                alt={modalZoom.nome}
                onClick={() => setNivelZoom(!nivelZoom)}
                className={`transition-transform duration-300 object-contain rounded-xl ${
                  nivelZoom ? 'scale-[2.2] cursor-zoom-out m-auto' : 'w-full h-full max-h-[52vh] cursor-zoom-in'
                }`}
              />

              {modalZoom.fotos.length > 1 && !nivelZoom && (
                <>
                  <button
                    type="button"
                    onClick={() => setModalZoom((prev) => ({
                      ...prev,
                      indexAtual: prev.indexAtual === 0 ? prev.fotos.length - 1 : prev.indexAtual - 1
                    }))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-elos-verde/80 hover:bg-elos-verde text-white text-2xl flex items-center justify-center shadow-lg transition-all"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalZoom((prev) => ({
                      ...prev,
                      indexAtual: (prev.indexAtual + 1) % prev.fotos.length
                    }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-elos-verde/80 hover:bg-elos-verde text-white text-2xl flex items-center justify-center shadow-lg transition-all"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <div className="p-5 md:px-8 bg-elos-fundo border-t border-gray-100 space-y-4">
              {modalZoom.fotos.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 justify-center">
                  {modalZoom.fotos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setNivelZoom(false); setModalZoom((prev) => ({ ...prev, indexAtual: idx })); }}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white ${
                        idx === modalZoom.indexAtual ? 'border-elos-verde scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {modalZoom.descricao && (
                <div className="bg-white p-4 rounded-2xl border border-elos-bege/20">
                  <span className="text-[9px] font-black uppercase text-elos-bege tracking-widest block mb-1">
                    📋 Descrição / Detalhes Técnicos
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {modalZoom.descricao}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">

        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">Estoque & Catálogo</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Gerenciamento de Produtos</p>
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
          </div>
        </header>

        <div className="flex bg-white p-1.5 rounded-3xl border border-elos-bege/20 shadow-sm mb-8 overflow-x-auto no-scrollbar">
          {ABAS_CATEGORIAS.map((aba) => (
            <button
              type="button"
              key={aba.id}
              onClick={() => {
                setAbaAtiva(aba.id);
                setNovoProduto((prev) => ({
                  ...prev,
                  categoria: aba.id,
                  quantidade: aba.id === 'LENTE' ? '' : prev.quantidade,
                  referencia: aba.id === 'LENTE' ? '' : prev.referencia
                }));
              }}
              className={`flex-1 min-w-35 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === aba.id ? 'bg-elos-verde text-white shadow-md scale-[1.02]' : 'text-gray-400 hover:text-elos-verde hover:bg-elos-fundo'}`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {mostrarFormCadastro && (
          <div className={`bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border transition-colors duration-300 ${editandoId ? 'border-elos-bege/40 bg-elos-bege/5' : 'border-elos-bege/10'}`}>
            <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
              <span className={`w-2 h-6 rounded-full ${editandoId ? 'bg-elos-verde animate-pulse' : 'bg-elos-bege'}`}></span>
              {editandoId ? `Editando ${novoProduto.categoria}: ${novoProduto.nome || ''}` : `Cadastrar Nova ${novoProduto.categoria}`}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">

              <div className="md:col-span-12 flex flex-col gap-4 mb-2 bg-elos-fundo/50 p-6 rounded-4xl border border-elos-bege/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elos-bege/20 pb-4">
                  <div>
                    <label className="text-xs font-black text-elos-verde uppercase tracking-tighter">Galeria do Produto</label>
                    <p className="text-[10px] text-gray-500 mt-1">Adicione fotos de vários ângulos (A primeira será a capa). Clique na miniatura para dar zoom.</p>
                  </div>

                  <div className="relative">
                    <button type="button" disabled={uploadingMultiplo} className="px-6 py-3 bg-elos-bege text-white rounded-xl text-xs font-bold hover:bg-elos-verde transition-all shadow-sm active:scale-95 disabled:opacity-50">
                      {uploadingMultiplo ? 'Otimizando... ⏳' : '➕ Adicionar Fotos'}
                    </button>
                    <input type="file" multiple accept="image/*" onChange={handleAdicionarFotoGaleria} disabled={uploadingMultiplo} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  {novoProduto.fotos.length === 0 ? (
                    <div className="w-full text-center py-8">
                      <span className="text-4xl opacity-20 block mb-2">📸</span>
                      <p className="text-xs text-gray-400 font-medium">Nenhuma foto adicionada ainda.</p>
                    </div>
                  ) : (
                    novoProduto.fotos.map((linkFoto, idx) => (
                      <div key={idx} className={`relative w-28 h-28 rounded-2xl border-4 shadow-sm flex items-center justify-center overflow-hidden bg-white group ${idx === 0 ? 'border-elos-verde' : 'border-white'}`}>
                        {idx === 0 && <span className="absolute top-1 left-1 bg-elos-verde text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full z-10">Capa</span>}
                        <img
                          src={linkFoto}
                          alt={`Vista ${idx + 1}`}
                          onClick={() => abrirZoomProduto({ ...novoProduto, _id: editandoId }, idx)}
                          className="w-full h-full object-cover cursor-zoom-in group-hover:scale-110 transition-transform"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoverFoto(idx)}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-600/90 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          title="Remover foto"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
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
                  <option value="ÓCULOS DE SOL">ÓCULOS DE SOL</option>
                  <option value="ACESSÓRIOS">ACESSÓRIOS</option>
                  <option value="LENTE">LENTE</option>
                  <option value="UPSELL">OFERTA EXTRA (CARRINHO)</option>
                </select>
              </div>

              {novoProduto.categoria !== 'LENTE' && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Código / Ref.</label>
                  <input
                    type="text" name="referencia" value={novoProduto.referencia} onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50 uppercase"
                  />
                </div>
              )}

              <div className={`space-y-2 ${novoProduto.categoria !== 'LENTE' ? 'md:col-span-3' : 'md:col-span-7'}`}>
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Nome Principal</label>
                <input
                  type="text" name="nome" value={novoProduto.nome} onChange={handleChange}
                  placeholder={novoProduto.categoria !== 'LENTE' ? 'Ex: RAY-BAN ERICA PRETO' : 'Ex: VISÃO SIMPLES RESINA INCOLOR'}
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

              {novoProduto.categoria !== 'LENTE' && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Estoque</label>
                  <input
                    type="number" name="quantidade" value={novoProduto.quantidade} onChange={handleChange}
                    placeholder="Qtd." min="0" required
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-center outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50"
                  />
                </div>
              )}

              <div className="md:col-span-12 space-y-2">
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">
                  Descrição / Detalhes do Produto (Medidas, Material, Formato, Proteção UV, etc.)
                </label>
                <textarea
                  name="descricao"
                  rows="3"
                  value={novoProduto.descricao}
                  onChange={handleChange}
                  placeholder="Ex: Armação em acetato italiano leve, plaquetas anatômicas, medidas 54-18-140mm. Ideal para rostos ovais e redondos..."
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-elos-bege/50 text-sm resize-none"
                />
              </div>

              <div className="md:col-span-12 flex justify-end gap-4 mt-2">
                {editandoId && (
                  <button type="button" onClick={handleCancelarEdicao} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-6 py-4 rounded-2xl transition-all uppercase text-xs tracking-widest">
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={uploadingMultiplo || adicionarProdutoMutation.isPending || editarProdutoMutation.isPending} className={`${editandoId ? 'bg-elos-bege hover:bg-elos-verde' : 'bg-elos-verde hover:bg-[#3a4a3e]'} text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest disabled:opacity-50`}>
                  {adicionarProdutoMutation.isPending || editarProdutoMutation.isPending ? 'Salvando...' : (editandoId ? 'Salvar Alterações' : 'Salvar no Sistema')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 ml-2">
            <h3 className="text-2xl font-tradicional text-elos-verde italic capitalize">
              {abaAtiva.toLowerCase()} em Estoque
            </h3>

            <input
              type="text"
              placeholder="🔍 Buscar por Nome, Ref ou Descrição..."
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
                  const fotoCapa = Array.isArray(p.fotos) && p.fotos.length > 0 ? p.fotos[0] : p.foto;
                  const urlCapa = formatarUrlFoto(fotoCapa, productId);
                  const ajustandoEste = ajustandoId === productId;

                  return (
                    <div key={productId} className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 hover:bg-elos-fundo/30 transition-colors">

                      <div className="flex items-start sm:items-center gap-4 flex-1 w-full sm:w-auto">
                        <div
                          onClick={() => urlCapa && abrirZoomProduto(p, 0)}
                          className={`w-16 h-16 shrink-0 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden bg-gray-50 shadow-sm relative group ${urlCapa ? 'cursor-zoom-in' : ''}`}
                          title={urlCapa ? 'Clique para ampliar a imagem' : ''}
                        >
                          {p.categoria !== 'LENTE' ? (
                            <>
                              {urlCapa && (
                                <img
                                  src={urlCapa}
                                  alt={p.nome}
                                  onError={(e) => {
                                    const imgEl = e.currentTarget;
                                    const overlayEl = imgEl.nextElementSibling;
                                    const fallbackEl = overlayEl?.nextElementSibling;
                                    imgEl.style.display = 'none';
                                    if (overlayEl) overlayEl.style.display = 'none';
                                    if (fallbackEl) fallbackEl.style.display = 'block';
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              )}
                              <div className={`absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs ${urlCapa ? '' : 'hidden'}`}>
                                🔍
                              </div>
                              <span className={`text-xl opacity-20 ${urlCapa ? 'hidden' : 'block'}`}>
                                {getIconeCategoria(p.categoria)}
                              </span>
                            </>
                          ) : (
                            <span className="text-xl opacity-20">🔍</span>
                          )}
                        </div>

                        <div className="text-left flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {p.categoria !== 'LENTE' && p.referencia && (
                              <span className="bg-elos-bege/10 border border-elos-bege/30 text-elos-bege px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                                REF: {p.referencia}
                              </span>
                            )}
                            {Array.isArray(p.fotos) && p.fotos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => abrirZoomProduto(p, 0)}
                                className="bg-gray-100 hover:bg-elos-verde hover:text-white text-gray-500 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors"
                              >
                                🔍 {p.fotos.length} Fotos
                              </button>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-elos-texto font-tradicional leading-tight">{p.nome}</h4>

                          {p.descricao && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xl leading-relaxed">
                              {p.descricao}
                            </p>
                          )}

                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mt-1">{p.categoria}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto mt-4 sm:mt-0">

                        {p.categoria !== 'LENTE' && (
                          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <button
                              type="button"
                              disabled={ajustandoEste || (Number(p.quantidade) || 0) <= 0}
                              onClick={() => handleAjusteEstoqueRapido(p, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 rounded-lg shadow-sm font-bold hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
                            >
                              -
                            </button>
                            <div className="flex flex-col items-center min-w-12">
                              <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">QTD</span>
                              <span className={`text-lg font-black leading-none ${(Number(p.quantidade) || 0) > 0 ? 'text-elos-verde' : 'text-red-500'}`}>
                                {Number(p.quantidade) || 0}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={ajustandoEste}
                              onClick={() => handleAjusteEstoqueRapido(p, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 rounded-lg shadow-sm font-bold hover:text-elos-verde hover:bg-green-50 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <span className="text-xl font-black text-elos-verde whitespace-nowrap">
                          {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>

                        <div className="flex items-center gap-2 border-l border-gray-100 pl-4 sm:pl-0 sm:border-none">
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(p)}
                            className="bg-elos-fundo hover:bg-elos-bege hover:text-white text-elos-bege px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            disabled={excluirProdutoMutation.isPending}
                            onClick={() => {
                              abrirConfirmacao(`Deseja realmente remover "${p.nome}" do sistema?`, async () => {
                                try {
                                  await excluirProdutoMutation.mutateAsync(productId);
                                  mostrarToast('Item removido com sucesso!', 'sucesso');
                                } catch (err) {
                                  mostrarToast(err?.message || 'Erro ao remover o item.', 'erro');
                                }
                              });
                            }}
                            className="bg-red-50 hover:bg-red-600 text-red-400 hover:text-white disabled:opacity-40 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                            title="Excluir"
                          >
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