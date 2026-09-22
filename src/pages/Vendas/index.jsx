import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gerarPDFDocumento } from '../../documentosUtils';

import { useClientes } from '../../hooks/useClientes';
import { useProdutos, useAdicionarProduto } from '../../hooks/useProdutos'; 
import { useVendas, useAdicionarVenda } from '../../hooks/useVendas';

export default function Vendas() {
  const navigate = useNavigate();

  // Chave da API do ImgBB
  const imgBBKey = import.meta.env.VITE_IMGBB_API_KEY || '';

  const { data: clientes = [] } = useClientes();
  const { data: vendas = [] } = useVendas();
  const { data: produtos = [] } = useProdutos();
  
  const adicionarProdutoMutation = useAdicionarProduto();
  const adicionarVendaMutation = useAdicionarVenda();

  const [abaAtiva, setAbaAtiva] = useState('nova');
  const [buscaHistorico, setBuscaHistorico] = useState('');

  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [mostrarSugestoesProd, setMostrarSugestoesProd] = useState(false);
  const [uploadingReceita, setUploadingReceita] = useState(false);
  
  const wrapperRef = useRef(null);
  const prodWrapperRef = useRef(null);

  const [venda, setVenda] = useState({
    cliente: '', cpf: '', valorEntrada: '', desconto: '', parcelas: 1,
    metodoPagamento: 'Dinheiro', observacoes: '', foto: '', // Aqui foto vai armazenar o LINK gerado pelo ImgBB
    dataVenda: new Date().toISOString().split('T')[0],
    dataPrimeiraParcela: new Date().toISOString().split('T')[0]
  });

  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' });

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null, acaoCancelar: null });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 3000);
  };

  const abrirConfirmacao = (mensagem, acao, acaoCancelar = null) => {
    setConfirmModal({ visivel: true, mensagem, acao, acaoCancelar });
  };

  // 🟢 SUGESTÕES DE CLIENTES COM DIAGNÓSTICO E FILTRAGEM ROBUSTA
  const sugestoes = useMemo(() => {
    if (!venda.cliente || venda.cliente.trim().length === 0 || !mostrarSugestoes) return [];
    
    const termo = venda.cliente.toLowerCase();
    const termoSomenteNumeros = termo.replace(/\D/g, '');

    return clientes.filter(c => {
      if (!c.nome) return false;
      const nomeMatch = c.nome.toLowerCase().includes(termo);
      const cpfMatch = c.cpf && (c.cpf.includes(termo) || (termoSomenteNumeros && c.cpf.replace(/\D/g, '').includes(termoSomenteNumeros)));
      return nomeMatch || cpfMatch;
    }).slice(0, 5);
  }, [venda.cliente, clientes, mostrarSugestoes]);

  const selecionarCliente = (c) => {
    setVenda({ ...venda, cliente: c.nome, cpf: c.cpf || '' });
    setMostrarSugestoes(false);
  };

  // 🟢 Sugestões de Produtos
  const sugestoesProd = useMemo(() => {
    if (!novoItem.nome || !mostrarSugestoesProd) return [];
    const termo = novoItem.nome.toLowerCase();
    return produtos.filter(p => p.nome.toLowerCase().includes(termo) || (p.referencia && p.referencia.toLowerCase().includes(termo))).slice(0, 5);
  }, [novoItem.nome, produtos, mostrarSugestoesProd]);

  const selecionarProdutoCat = (p) => {
    setNovoItem({ 
      nome: p.nome.toUpperCase(), 
      preco: aplicarMascaraMoeda(String(p.preco * 100)) 
    });
    setMostrarSugestoesProd(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setMostrarSugestoes(false);
      if (prodWrapperRef.current && !prodWrapperRef.current.contains(e.target)) setMostrarSugestoesProd(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🟢 LÓGICA DE UPLOAD E COMPRESSÃO (Idêntica à de Produtos)
  const handleUploadReceita = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!imgBBKey) {
      mostrarToast("Chave VITE_IMGBB_API_KEY não encontrada!", "erro");
      return;
    }

    setUploadingReceita(true);
    mostrarToast("Comprimindo e enviando receita... ⏳", "sucesso");

    const comprimirImagem = (imgFile) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(imgFile);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              resolve(new File([blob], "receita_otimizada.webp", { type: 'image/webp' }));
            }, 'image/webp', 0.8);
          };
        };
      });
    };

    try {
      const fotoSuperLeve = await comprimirImagem(file);
      
      const formData = new FormData();
      formData.append("image", fotoSuperLeve);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgBBKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setVenda({ ...venda, foto: data.data.url });
        mostrarToast("Receita anexada com sucesso! ✅", "sucesso");
      } else {
        mostrarToast("Falha no upload via ImgBB.", "erro");
        console.error("Erro no ImgBB:", data);
      }
    } catch (error) {
      mostrarToast("Erro ao processar imagem.", "erro");
      console.error("Erro na requisição:", error);
    }

    setUploadingReceita(false);
  };

  const aplicarMascaraCPF = (valor) => valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  
  const aplicarMascaraMoeda = (valor) => {
    let v = String(valor).replace(/\D/g, '');
    if (!v) return '';
    return (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const limparMoeda = (valor) => {
    if (!valor) return 0;
    return Number(String(valor).replace(/[^\d]/g, '')) / 100;
  };

  const adicionarAoCarrinho = () => {
    if (!novoItem.nome || !novoItem.preco) return mostrarToast("Preencha a descrição do item e o preço correspondente.", "erro");
    setItensCarrinho([...itensCarrinho, { id: Date.now(), nome: novoItem.nome.toUpperCase(), preco: limparMoeda(novoItem.preco) }]);
    setNovoItem({ nome: '', preco: '' });
  };

  const removerDoCarrinho = (id) => setItensCarrinho(itensCarrinho.filter(item => item.id !== id));

  const salvarItemNoCatalogo = async (item) => {
    try {
      await adicionarProdutoMutation.mutateAsync({ nome: item.nome.toUpperCase(), preco: item.preco, categoria: 'ARMAÇÃO' });
      mostrarToast(`"${item.nome}" salvo no catálogo com sucesso! 📦`, "sucesso");
    } catch (err) { mostrarToast("Erro ao sincronizar item com o catálogo.", "erro"); }
  };

  const subtotalItens = useMemo(() => itensCarrinho.reduce((acc, item) => acc + item.preco, 0), [itensCarrinho]);
  const totalFinalVenda = useMemo(() => Math.max(0, subtotalItens - limparMoeda(venda.desconto)), [subtotalItens, venda.desconto]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const valorFormatado = aplicarMascaraCPF(value).substring(0, 14);
      const isCompleto = valorFormatado.length === 14;
      const clienteExistente = isCompleto ? clientes.find(c => c.cpf === valorFormatado) : null;
      
      setVenda({ 
        ...venda, 
        cpf: valorFormatado, 
        cliente: clienteExistente ? clienteExistente.nome : venda.cliente 
      });

    } else if (name === 'cliente') {
      setVenda({ ...venda, cliente: value });
      setMostrarSugestoes(true);

    } else if (name === 'valorEntrada' || name === 'desconto') {
      setVenda({ ...venda, [name]: aplicarMascaraMoeda(value) });
      
    } else if (name === 'metodoPagamento') {
      const isAVista = value === 'Dinheiro' || value === 'Pix';
      setVenda({ ...venda, [name]: value, parcelas: isAVista ? 1 : venda.parcelas });
      
    } else {
      setVenda({ ...venda, [name]: value });
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (itensCarrinho.length === 0) return mostrarToast("Adicione pelo menos um item ao carrinho antes de finalizar.", "erro");
    if (!venda.cliente || !venda.cpf) return mostrarToast("Identifique os dados do cliente vinculados a esta operação.", "erro");

    const clienteBase = clientes.find(c => c.cpf === venda.cpf);
    const descontoNum = limparMoeda(venda.desconto);
    const valorEntradaNum = limparMoeda(venda.valorEntrada);
    const carrinhoParaPDF = [...itensCarrinho];

    const dadosParaSalvar = {
      ...venda,
      produto: itensCarrinho.map(i => i.nome).join(' + '), 
      itensCarrinho: itensCarrinho,
      valorTotal: totalFinalVenda,
      valorEntrada: valorEntradaNum,
      desconto: descontoNum 
    };

    try {
      const resultado = await adicionarVendaMutation.mutateAsync(dadosParaSalvar);

      const irParaHistorico = () => {
        setVenda({
          cliente: '', cpf: '', valorEntrada: '', desconto: '', parcelas: 1,
          metodoPagamento: 'Dinheiro', observacoes: '', foto: '',
          dataVenda: new Date().toISOString().split('T')[0],
          dataPrimeiraParcela: new Date().toISOString().split('T')[0]
        });
        setItensCarrinho([]);
        setAbaAtiva('historico');
      };

      const perguntarReciboEntrada = () => {
        if (valorEntradaNum > 0) {
          setTimeout(() => {
            abrirConfirmacao(`Deseja também imprimir o RECIBO DA ENTRADA de R$ ${valorEntradaNum.toFixed(2).replace('.',',')}?`, () => {
              gerarPDFDocumento({
                ...resultado,
                produto: `Entrada / Sinal (Pedido #${resultado.numeroPedido || 'S/N'})`,
                dataRecibo: resultado.dataVenda ? resultado.dataVenda.split('-').reverse().join('/') : '',
                valorTotal: valorEntradaNum,
                desconto: 0,
                metodoPagamento: resultado.metodoPagamento,
                itensCarrinho: [{ nome: `ENTRADA / SINAL (PEDIDO #${resultado.numeroPedido || 'S/N'})`, preco: valorEntradaNum }],
                telefone: clienteBase?.telefone || "Não informado",
                endereco: clienteBase?.endereco || "Não informado",
                email: clienteBase?.email || "Não informado"
              }, 'recibo');
              irParaHistorico();
            }, irParaHistorico);
          }, 400); 
        } else {
          irParaHistorico();
        }
      };

      abrirConfirmacao("Venda registrada com sucesso! 👓 Deseja imprimir o PEDIDO COM GARANTIA em PDF?", () => {
        gerarPDFDocumento({
          ...resultado,
          itensCarrinho: carrinhoParaPDF, 
          desconto: descontoNum,          
          data: resultado.dataVenda ? resultado.dataVenda.split('-').reverse().join('/') : venda.dataVenda.split('-').reverse().join('/'),
          telefone: clienteBase?.telefone || "Não informado",
          endereco: clienteBase?.endereco || "Não informado",
          email: clienteBase?.email || "Não informado"
        }, 'pedido');
        mostrarToast("Pedido gerado com sucesso!", "sucesso");
        perguntarReciboEntrada();
      }, perguntarReciboEntrada); 

    } catch (error) {
      mostrarToast("Erro operacional ao salvar a venda.", "erro");
    }
  };

  const vendasFiltradas = useMemo(() => {
    if (!vendas) return [];
    let filtradas = [...vendas];
    
    if (buscaHistorico) {
      const termo = buscaHistorico.toLowerCase();
      filtradas = filtradas.filter(v => 
        (v.cliente && v.cliente.toLowerCase().includes(termo)) ||
        (v.cpf && v.cpf.toLowerCase().includes(termo)) ||
        (v.numeroPedido && String(v.numeroPedido).toLowerCase().includes(termo))
      );
    }
    return filtradas.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));
  }, [vendas, buscaHistorico]);

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
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

      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl border border-elos-bege/20 animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-elos-verde">📄</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Impressão</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">{confirmModal.mensagem}</p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => {
                  if (confirmModal.acaoCancelar) confirmModal.acaoCancelar();
                  setConfirmModal({ visivel: false, mensagem: '', acao: null, acaoCancelar: null });
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Pular
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (confirmModal.acao) confirmModal.acao();
                  setConfirmModal({ visivel: false, mensagem: '', acao: null, acaoCancelar: null });
                }}
                className="flex-1 py-3 bg-elos-verde text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-elos-verde/20 hover:bg-[#3a4a3e] transition-all"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b border-elos-bege/30 pb-6">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">Gestão de Vendas</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold">Ótica Elos</p>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl shadow-soft border border-elos-bege/10 w-full md:w-auto">
            <button
              onClick={() => setAbaAtiva('nova')}
              className={`flex-1 md:w-40 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                abaAtiva === 'nova' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'
              }`}
            >
              ➕ Nova Venda
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`flex-1 md:w-40 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                abaAtiva === 'historico' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'
              }`}
            >
              📋 Histórico
            </button>
          </div>
        </header>

        {abaAtiva === 'nova' && (
          <form onSubmit={handleSalvar} className="bg-white rounded-[2.5rem] shadow-soft p-6 md:p-12 space-y-8 border border-elos-bege/10 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">CPF do Cliente</label>
                <input type="text" name="cpf" value={venda.cpf} onChange={handleChange} required placeholder="000.000.000-00" className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
              </div>

              <div className="space-y-2 relative" ref={wrapperRef}>
                <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Nome do Cliente</label>
                <input 
                  type="text" 
                  name="cliente" 
                  value={venda.cliente} 
                  onChange={handleChange} 
                  onFocus={() => setMostrarSugestoes(true)}
                  required 
                  placeholder="Nome Completo ou CPF..." 
                  className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-elos-bege/30 transition-all" 
                />
      
                {mostrarSugestoes && sugestoes.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-100 rounded-2xl shadow-xl mt-2 max-h-60 overflow-y-auto">
                    {sugestoes.map((c) => (
                      <div 
                        key={c.cpf || c._id} 
                        onClick={() => selecionarCliente(c)} 
                        className="p-4 cursor-pointer hover:bg-elos-fundo border-b border-gray-50 flex justify-between items-center"
                      >
                        <span className="font-bold text-sm text-elos-texto">{c.nome}</span>
                        <span className="text-[10px] text-gray-400 font-black">{c.cpf || 'Sem CPF'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-elos-fundo/30 p-6 rounded-[2rem] border-2 border-dashed border-elos-bege/30">
              <h3 className="text-sm font-black text-elos-verde uppercase mb-4 flex items-center gap-2">🛒 Carrinho de Itens</h3>
              <div className="flex flex-col md:flex-row gap-3 mb-6 relative" ref={prodWrapperRef}>
                
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Buscar produto no catálogo (Ex: Armação Ray-Ban...)" 
                    className="w-full px-4 py-3 rounded-xl border-none shadow-sm text-sm" 
                    value={novoItem.nome} 
                    onChange={(e) => {
                      setNovoItem({...novoItem, nome: e.target.value});
                      setMostrarSugestoesProd(true);
                    }}
                    onFocus={() => setMostrarSugestoesProd(true)}
                  />
                  
                  {sugestoesProd.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-100 rounded-2xl shadow-xl mt-2 max-h-60 overflow-y-auto">
                      {sugestoesProd.map((p) => (
                        <div 
                          key={p._id || p.id} 
                          onClick={() => selecionarProdutoCat(p)} 
                          className="p-4 cursor-pointer hover:bg-elos-fundo border-b border-gray-50 flex justify-between items-center"
                        >
                          <span className="font-bold text-sm text-elos-texto">{p.nome}</span>
                          <span className="text-xs text-elos-verde font-black">R$ {Number(p.preco).toFixed(2).replace('.',',')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <input 
                  type="text" 
                  placeholder="R$ 0,00" 
                  className="w-full md:w-32 px-4 py-3 rounded-xl border-none shadow-sm text-sm font-bold text-elos-verde" 
                  value={novoItem.preco} 
                  onChange={(e) => setNovoItem({...novoItem, preco: aplicarMascaraMoeda(e.target.value)})} 
                />
                <button type="button" onClick={adicionarAoCarrinho} className="bg-elos-bege text-white px-6 py-3 rounded-xl font-bold hover:bg-elos-verde transition-all">Adicionar</button>
              </div>

              <div className="space-y-2">
                {itensCarrinho.map(item => {
                  const jaExisteNoCatalogo = produtos.some(p => p.nome.toUpperCase() === item.nome.toUpperCase());

                  return (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-elos-bege/10">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-elos-texto">{item.nome}</span>
                        {!jaExisteNoCatalogo && (
                          <button
                            type="button"
                            onClick={() => salvarItemNoCatalogo(item)}
                            className="px-2 py-0.5 bg-elos-bege/10 hover:bg-elos-bege hover:text-white text-elos-bege text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1"
                            title="Salvar este produto no Catálogo permanente"
                          >
                            📦 Salvar no Catálogo
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-elos-verde">R$ {item.preco.toFixed(2).replace('.',',')}</span>
                        <button type="button" onClick={() => removerDoCarrinho(item.id)} className="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    </div>
                  );
                })}
                {itensCarrinho.length === 0 && <p className="text-center text-gray-400 text-xs italic py-4">Carrinho vazio.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1 italic">Detalhes Técnicos / Fotos das Receitas</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <textarea 
                  name="observacoes"
                  value={venda.observacoes}
                  onChange={handleChange}
                  placeholder="Anote aqui: Graus (OD/OE), Eixo, DNP, tipo de tratamento das lentes ou cor da armação..."
                  className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-[2rem] outline-none h-40 resize-none text-sm italic"
                />
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-elos-bege/30 rounded-[2rem] p-6 bg-elos-fundo/20 relative group hover:bg-elos-fundo/40 transition-all">
                  {uploadingReceita ? (
                    <div className="text-center">
                      <span className="text-4xl block animate-bounce mb-2">⏳</span>
                      <span className="text-[10px] font-black text-elos-verde uppercase tracking-widest">Otimizando e Enviando...</span>
                    </div>
                  ) : venda.foto ? (
                    <div className="flex flex-col items-center gap-3 w-full h-full relative group/foto">
                      <img src={venda.foto} alt="Receita" className="max-h-32 object-contain rounded-xl shadow-lg border-2 border-white" />
                      <button 
                        type="button" 
                        onClick={() => setVenda({...venda, foto: ''})} 
                        className="absolute inset-0 m-auto w-10 h-10 bg-red-600/90 text-white rounded-full text-xs font-black flex items-center justify-center opacity-0 group-hover/foto:opacity-100 transition-opacity"
                        title="Remover Foto"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">📸</div>
                      <span className="text-[10px] font-black text-elos-bege uppercase tracking-widest text-center">Tirar Foto ou Anexar Receita</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleUploadReceita} 
                        disabled={uploadingReceita} 
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Data da Venda</label>
                <input type="date" name="dataVenda" value={venda.dataVenda} onChange={handleChange} className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-red-400 uppercase tracking-tighter ml-1">Desconto</label>
                <input type="text" name="desconto" value={venda.desconto} onChange={handleChange} placeholder="R$ 0,00" className="w-full px-5 py-4 bg-red-50 border border-red-100 text-red-900 font-bold rounded-2xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-green-700 uppercase tracking-tighter ml-1">Total a Pagar</label>
                <div className="w-full px-5 py-4 bg-green-50 border border-green-200 text-green-900 font-black rounded-2xl text-xl">
                  R$ {totalFinalVenda.toFixed(2).replace('.',',')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Valor de Entrada</label>
                <input type="text" name="valorEntrada" value={venda.valorEntrada} onChange={handleChange} placeholder="R$ 0,00" className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Pagamento</label>
                <select name="metodoPagamento" value={venda.metodoPagamento} onChange={handleChange} className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none">
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Boleto / Crediário">Boleto / Crediário</option>
                </select>
              </div>
              
              <div className={`space-y-2 ${(venda.metodoPagamento === 'Dinheiro' || venda.metodoPagamento === 'Pix') ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">
                  {venda.metodoPagamento === 'Cartão de Crédito' ? 'Nº Parcelas (Maquininha)' : 'Nº Parcelas (Mensais)'}
                </label>
                <input 
                  type="number" 
                  name="parcelas" 
                  min="1" 
                  value={venda.parcelas} 
                  onChange={handleChange} 
                  className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" 
                  disabled={venda.metodoPagamento === 'Dinheiro' || venda.metodoPagamento === 'Pix'} 
                />
              </div>
            </div>

            {venda.metodoPagamento === 'Boleto / Crediário' && (
              <div className="bg-elos-verde text-white p-8 rounded-3xl shadow-xl animate-in slide-in-from-top duration-300">
                <label className="font-tradicional italic text-lg mb-2 block">🗓️ Vencimento da 1ª Parcela</label>
                <input type="date" name="dataPrimeiraParcela" value={venda.dataPrimeiraParcela} onChange={handleChange} className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white outline-none" />
              </div>
            )}

            <button type="submit" disabled={uploadingReceita || adicionarVendaMutation.isPending} className="w-full bg-elos-verde hover:bg-[#3a4a3e] disabled:bg-gray-400 text-white font-bold py-6 rounded-2xl shadow-xl transform transition-all active:scale-[0.98] text-lg uppercase tracking-widest mt-6">
              {adicionarVendaMutation.isPending ? 'Registrando Venda...' : 'Finalizar Venda'}
            </button>
          </form>
        )}

        {abaAtiva === 'historico' && (
          <div className="bg-white rounded-[2.5rem] shadow-soft p-6 md:p-10 border border-elos-bege/10 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-50 pb-6">
              <h2 className="font-tradicional text-2xl text-elos-verde italic">Últimas Vendas Realizadas</h2>
              
              <div className="w-full md:w-auto relative">
                <input 
                  type="text" 
                  placeholder="🔍 Buscar por nome, CPF ou Nº do Pedido..." 
                  value={buscaHistorico}
                  onChange={(e) => setBuscaHistorico(e.target.value)}
                  className="w-full md:w-80 px-5 py-3 bg-elos-fundo/50 border border-elos-bege/20 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-elos-verde/30 shadow-inner"
                />
              </div>
            </div>
            
            {vendasFiltradas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] uppercase font-black text-gray-400 border-b tracking-widest bg-gray-50/50">
                    <tr>
                      <th className="pb-3 pt-3 px-4 rounded-tl-xl">Data</th>
                      <th className="pb-3 pt-3 px-4">Cliente</th>
                      <th className="pb-3 pt-3 px-4">Total</th>
                      <th className="pb-3 pt-3 px-4">Pagamento</th>
                      <th className="pb-3 pt-3 px-4 text-right rounded-tr-xl">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vendasFiltradas.map(v => (
                      <tr key={v._id || v.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-4 px-4 text-xs font-bold text-gray-500">
                          {v.dataVenda ? v.dataVenda.split('-').reverse().join('/') : '--/--/----'}
                        </td>
                        <td className="py-4 px-4 font-bold text-elos-verde">
                          {v.cliente}
                          <div className="text-[9px] text-gray-400 font-black uppercase mt-1">
                            Nº Pedido: #{v.numeroPedido || 'S/N'}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-black text-elos-texto italic">
                          R$ {Number(v.valorTotal).toFixed(2).replace('.',',')}
                        </td>
                        <td className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {v.metodoPagamento}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                const clienteBase = clientes.find(c => c.cpf === v.cpf);
                                gerarPDFDocumento({
                                  ...v,
                                  data: v.dataVenda ? v.dataVenda.split('-').reverse().join('/') : '',
                                  telefone: clienteBase?.telefone || "Não informado",
                                  endereco: clienteBase?.endereco || "Não informado",
                                  email: clienteBase?.email || "Não informado"
                                }, 'pedido');
                              }}
                              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold uppercase hover:bg-elos-bege hover:text-white transition-colors"
                              title="Reimprimir Pedido"
                            >
                              🖨️
                            </button>
                            <button 
                              onClick={() => navigate(`/admin/vendas/editar/${v._id || v.id}`)}
                              className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-colors"
                              title="Editar Venda"
                            >
                              ✏️ Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 italic font-bold text-lg mb-2">Nenhuma venda encontrada.</p>
                {buscaHistorico && (
                  <p className="text-xs text-gray-400">Não localizamos resultados para "{buscaHistorico}".</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}