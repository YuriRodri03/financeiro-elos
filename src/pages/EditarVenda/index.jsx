import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { useParams, useNavigate } from 'react-router-dom';

export default function EditarVenda() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { vendas, clientes, produtos, adicionarProduto, editarVenda } = useFinanceiro();

  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [mostrarSugestoesProd, setMostrarSugestoesProd] = useState(false);
  const wrapperRef = useRef(null);
  const prodWrapperRef = useRef(null);

  const [venda, setVenda] = useState({
    cliente: '', cpf: '', valorEntrada: '', desconto: '', parcelas: 1,
    metodoPagamento: 'Dinheiro', observacoes: '', foto: '',
    dataVenda: new Date().toISOString().split('T')[0],
    dataPrimeiraParcela: new Date().toISOString().split('T')[0],
    listaParcelasAntigas: [] // 🟢 Guarda as parcelas anteriores para não perder os pagamentos já feitos!
  });

  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' });
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 3000);
  };

  const aplicarMascaraMoeda = (valor) => {
    let v = String(valor).replace(/\D/g, '');
    if (!v) return '';
    return (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const limparMoeda = (valor) => {
    if (!valor) return 0;
    const numeroLimpo = String(valor).replace(/[^\d]/g, '');
    return Number(numeroLimpo) / 100;
  };

  // 🟢 CARREGA OS DADOS DA VENDA EXISTENTE AO ABRIR A TELA
  useEffect(() => {
    if (vendas && vendas.length > 0 && id) {
      const vendaAtual = vendas.find(v => (v._id || v.id) === id);
      if (vendaAtual) {
        setVenda({
          cliente: vendaAtual.cliente || '',
          cpf: vendaAtual.cpf || '',
          valorEntrada: aplicarMascaraMoeda(Number(vendaAtual.valorEntrada || 0).toFixed(2)),
          desconto: aplicarMascaraMoeda(Number(vendaAtual.desconto || 0).toFixed(2)),
          parcelas: vendaAtual.parcelas || 1,
          metodoPagamento: vendaAtual.metodoPagamento || 'Dinheiro',
          observacoes: vendaAtual.observacoes || '',
          foto: vendaAtual.foto || '',
          dataVenda: vendaAtual.dataVenda || new Date().toISOString().split('T')[0],
          dataPrimeiraParcela: vendaAtual.listaParcelas?.[0]?.vencimentoOriginal || new Date().toISOString().split('T')[0],
          listaParcelasAntigas: vendaAtual.listaParcelas || []
        });
        setItensCarrinho(vendaAtual.itensCarrinho || []);
      } else {
        mostrarToast("Venda não encontrada.", "erro");
      }
    }
  }, [vendas, id]);

  const sugestoes = useMemo(() => {
    if (!venda.cliente || !mostrarSugestoes) return [];
    return (clientes || []).filter(c => c.nome.toLowerCase().includes(venda.cliente.toLowerCase())).slice(0, 5);
  }, [venda.cliente, clientes, mostrarSugestoes]);

  const sugestoesProd = useMemo(() => {
    if (!novoItem.nome || !mostrarSugestoesProd) return [];
    return (produtos || []).filter(p => p.nome.toLowerCase().includes(novoItem.nome.toLowerCase())).slice(0, 5);
  }, [novoItem.nome, produtos, mostrarSugestoesProd]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setMostrarSugestoes(false);
      if (prodWrapperRef.current && !prodWrapperRef.current.contains(e.target)) setMostrarSugestoesProd(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVenda({ ...venda, foto: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const aplicarMascaraCPF = (valor) => valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  const adicionarAoCarrinho = () => {
    if (!novoItem.nome || !novoItem.preco) return mostrarToast("Preencha a descrição do item e o preço correspondente.", "erro");
    setItensCarrinho([...itensCarrinho, { id: Date.now(), nome: novoItem.nome.toUpperCase(), preco: limparMoeda(novoItem.preco) }]);
    setNovoItem({ nome: '', preco: '' });
  };

  const removerDoCarrinho = (idItem) => setItensCarrinho(itensCarrinho.filter(item => item.id !== idItem));

  const salvarItemNoCatalogo = async (item) => {
    try {
      await adicionarProduto({ nome: item.nome.toUpperCase(), preco: item.preco, categoria: 'ARMAÇÃO' });
      mostrarToast(`"${item.nome}" salvo no catálogo! 📦`, "sucesso");
    } catch (err) {
      mostrarToast("Erro ao sincronizar item com o catálogo.", "erro");
    }
  };

  const subtotalItens = useMemo(() => itensCarrinho.reduce((acc, item) => acc + item.preco, 0), [itensCarrinho]);
  const totalFinalVenda = useMemo(() => Math.max(0, subtotalItens - limparMoeda(venda.desconto)), [subtotalItens, venda.desconto]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      const valorFormatado = aplicarMascaraCPF(value).substring(0, 14);
      const clienteExistente = (clientes || []).find(c => c.cpf === valorFormatado);
      setVenda({ ...venda, cpf: valorFormatado, cliente: clienteExistente ? clienteExistente.nome : (valorFormatado.length < 14 ? '' : venda.cliente) });
    } else if (name === 'valorEntrada' || name === 'desconto') {
      setVenda({ ...venda, [name]: aplicarMascaraMoeda(value) });
    } else {
      setVenda({ ...venda, [name]: value });
    }
  };

  const handleAtualizar = async (e) => {
    e.preventDefault();
    if (itensCarrinho.length === 0) return mostrarToast("Adicione pelo menos um item ao carrinho.", "erro");
    if (!venda.cliente || !venda.cpf) return mostrarToast("Identifique o cliente.", "erro");

    const descontoNum = limparMoeda(venda.desconto);
    const valorEntradaNum = limparMoeda(venda.valorEntrada);
    const numParcelas = Number(venda.parcelas) || 1;
    
    // 🟢 MAGIA: RECALCULA AS PARCELAS BASEADO NO NOVO TOTAL!
    const valorRestante = totalFinalVenda - valorEntradaNum;
    const valorDaParcela = parseFloat((numParcelas > 0 ? valorRestante / numParcelas : 0).toFixed(2));
    
    let novasParcelas = [];
    const parcelasAntigas = venda.listaParcelasAntigas;

    // Recria a Entrada
    if (valorEntradaNum > 0) {
      const entradaAntiga = parcelasAntigas.find(p => p.numero === 0);
      novasParcelas.push({
        numero: 0, 
        valor: valorEntradaNum, 
        paga: entradaAntiga ? entradaAntiga.paga : true,
        dataPagamento: entradaAntiga?.dataPagamento || venda.dataVenda, 
        vencimentoOriginal: entradaAntiga?.vencimentoOriginal || venda.dataVenda,
        observacao: "Entrada/Sinal"
      });
    }

    // Recria as Parcelas divididas
    for (let i = 0; i < numParcelas; i++) {
      const parcelaAntiga = parcelasAntigas.find(p => p.numero === i + 1);
      
      const dataBase = venda.metodoPagamento === 'Boleto / Crediário' ? venda.dataPrimeiraParcela : venda.dataVenda;
      let dataVenc = new Date(dataBase + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + i);

      const isPaga = venda.metodoPagamento !== 'Boleto / Crediário' ? true : (parcelaAntiga ? parcelaAntiga.paga : false);
      const dtPagto = isPaga ? (parcelaAntiga?.dataPagamento || venda.dataVenda) : null;

      novasParcelas.push({
        numero: i + 1,
        valor: valorDaParcela,
        paga: isPaga,
        dataPagamento: dtPagto,
        vencimentoOriginal: parcelaAntiga?.vencimentoOriginal || dataVenc.toISOString().split('T')[0]
      });
    }

    const dadosParaSalvar = {
      ...venda,
      produto: itensCarrinho.map(i => i.nome).join(' + '), 
      itensCarrinho: itensCarrinho,
      valorTotal: totalFinalVenda,
      valorEntrada: valorEntradaNum,
      desconto: descontoNum,
      listaParcelas: novasParcelas // 🟢 Injeta as novas parcelas corrigidas no banco!
    };

    try {
      await editarVenda(id, dadosParaSalvar);
      mostrarToast("Venda atualizada com sucesso!", "sucesso");
      
      setTimeout(() => {
        navigate(-1); // Retorna automaticamente para a aba do cliente
      }, 1500);
    } catch (error) {
      mostrarToast("Erro operacional ao atualizar a venda.", "erro");
    }
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative animate-in fade-in">
      
      {/* TOAST PREMIUM DA ÓTICA ELOS */}
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${toast.tipo === 'sucesso' ? 'bg-elos-verde text-white' : 'bg-red-900 text-red-100'}`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 px-6 bg-white rounded-2xl shadow-soft border border-elos-bege/20 text-gray-400 hover:text-elos-verde transition-all text-xs font-black uppercase tracking-widest">
            ⬅️ Voltar
          </button>
          <h1 className="font-tradicional text-4xl text-elos-verde italic border-b-2 border-elos-bege/30 pb-4 inline-block w-full md:w-auto">
            Editar Venda
          </h1>
        </header>

        <form onSubmit={handleAtualizar} className="bg-white rounded-[2.5rem] shadow-soft p-6 md:p-12 space-y-8 border border-elos-bege/10">
          
          {/* DADOS DO CLIENTE */}
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
                placeholder="Nome Completo" 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" 
              />
    
              {sugestoes.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-100 rounded-2xl shadow-xl mt-2 max-h-60 overflow-y-auto">
                  {sugestoes.map((c) => (
                    <div 
                      key={c.cpf} 
                      onClick={() => { setVenda({ ...venda, cliente: c.nome, cpf: c.cpf }); setMostrarSugestoes(false); }} 
                      className="p-4 cursor-pointer hover:bg-elos-fundo border-b border-gray-50 flex justify-between items-center"
                    >
                      <span className="font-bold text-sm text-elos-texto">{c.nome}</span>
                      <span className="text-[10px] text-gray-400 font-black">{c.cpf}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CARRINHO DE COMPRAS INTEGRADO AO CATÁLOGO */}
          <div className="bg-elos-fundo/30 p-6 rounded-[2rem] border-2 border-dashed border-elos-bege/30">
            <h3 className="text-sm font-black text-elos-verde uppercase mb-4 flex items-center gap-2">🛒 Carrinho de Itens</h3>
            <div className="flex flex-col md:flex-row gap-3 mb-6 relative" ref={prodWrapperRef}>
              
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Buscar produto no catálogo (Ex: Armação Ray-Ban, Lente Crizal...)" 
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
                        onClick={() => { setNovoItem({ nome: p.nome.toUpperCase(), preco: p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }); setMostrarSugestoesProd(false); }} 
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
                const jaExisteNoCatalogo = (produtos || []).some(p => p.nome.toUpperCase() === item.nome.toUpperCase());

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

          {/* DETALHES TÉCNICOS E FOTOS */}
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
                {venda.foto ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={venda.foto} alt="Receita" className="max-h-32 rounded-xl shadow-lg border-2 border-white" />
                    <button type="button" onClick={() => setVenda({...venda, foto: ''})} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Remover Foto</button>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-2">📸</div>
                    <span className="text-[10px] font-black text-elos-bege uppercase tracking-widest text-center">Tirar Foto ou Anexar Receita</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FINANCEIRO */}
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
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Nº Parcelas</label>
              <input type="number" name="parcelas" min="1" value={venda.parcelas} onChange={handleChange} className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
            </div>
          </div>

          {venda.metodoPagamento === 'Boleto / Crediário' && (
            <div className="bg-elos-verde text-white p-8 rounded-3xl shadow-xl animate-in slide-in-from-top duration-300">
              <label className="font-tradicional italic text-lg mb-2 block">🗓️ Vencimento da 1ª Parcela</label>
              <input type="date" name="dataPrimeiraParcela" value={venda.dataPrimeiraParcela} onChange={handleChange} className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white outline-none" />
            </div>
          )}

          <button type="submit" className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-6 rounded-2xl shadow-xl transform transition-all active:scale-[0.98] text-lg uppercase tracking-widest mt-6">
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}