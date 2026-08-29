import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Operacoes() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  // 🟢 NAVEGAÇÃO INTERNA DO PAINEL
  const [abaAtiva, setAbaAtiva] = useState('PEDIDOS'); // 'PEDIDOS', 'CUPONS', 'COMBOS'

  // =====================================
  // 1. ESTADOS E LÓGICA - PEDIDOS ONLINE
  // =====================================
  const [pedidos, setPedidos] = useState([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('TODOS'); 
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1); 
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  const [expandidos, setExpandidos] = useState([]); 

  const buscarPedidosOnline = async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos_online`);
      if (res.ok) setPedidos(await res.json());
    } catch (error) { console.error(error); } 
    finally { setCarregandoPedidos(false); }
  };

  useEffect(() => {
    buscarPedidosOnline();
    const intervalo = setInterval(buscarPedidosOnline, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const atualizarStatus = async (id, novoStatus) => {
    if (novoStatus === 'CONCLUIDO') {
      const confirma = window.confirm("Deseja efetivar essa venda? No futuro, isso dará baixa automática no estoque.");
      if (!confirma) return;
    }
    try {
      const res = await fetch(`${API_URL}/pedidos_online/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) buscarPedidosOnline(); 
    } catch (error) { alert("Erro ao atualizar status."); }
  };

  const getEstiloStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PAGO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CONCLUIDO': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTextoStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return '⏳ Aguardando Pagamento';
      case 'PAGO': return '💰 Pagamento Aprovado';
      case 'CONCLUIDO': return '✅ Venda Concluída';
      default: return status;
    }
  };

  const toggleExpandir = (id) => setExpandidos(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const pedidosExibidos = pedidos.filter(p => {
    if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false;
    if (p.dataPedido) {
      const dataP = new Date(p.dataPedido);
      if (dataP.getMonth() + 1 !== Number(mesFiltro) || dataP.getFullYear() !== Number(anoFiltro)) return false;
    }
    return true;
  });

  const mesesDoAno = [
    { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' }, { v: 4, l: 'Abril' },
    { v: 5, l: 'Maio' }, { v: 6, l: 'Junho' }, { v: 7, l: 'Julho' }, { v: 8, l: 'Agosto' },
    { v: 9, l: 'Setembro' }, { v: 10, l: 'Outubro' }, { v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' }
  ];

  // =====================================
  // 2. ESTADOS E LÓGICA - CUPONS 
  // =====================================
  const [cupons, setCupons] = useState([]);
  const [carregandoCupons, setCarregandoCupons] = useState(false);
  const [formCupom, setFormCupom] = useState({ codigo: '', tipo: 'PERCENTUAL', valor: '', dataFim: '' });

  const buscarCupons = async () => {
    setCarregandoCupons(true);
    try {
      const res = await fetch(`${API_URL}/cupons`);
      if (res.ok) setCupons(await res.json());
    } catch (e) {} finally { setCarregandoCupons(false); }
  };

  useEffect(() => { if (abaAtiva === 'CUPONS') buscarCupons(); }, [abaAtiva]);

  const salvarCupom = async (e) => {
    e.preventDefault();
    if (!formCupom.codigo || !formCupom.valor || !formCupom.dataFim) return alert("Preencha todos os campos.");
    try {
      const res = await fetch(`${API_URL}/cupons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formCupom) });
      if (res.ok) { setFormCupom({ codigo: '', tipo: 'PERCENTUAL', valor: '', dataFim: '' }); buscarCupons(); } 
      else { const err = await res.json(); alert(err.error || "Erro ao salvar o cupom."); }
    } catch (e) { alert("Erro de conexão."); }
  };

  const alternarStatusCupom = async (id, statusAtual) => {
    try { await fetch(`${API_URL}/cupons/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: !statusAtual }) }); buscarCupons(); } catch (e) {}
  };

  const deletarCupom = async (id) => {
    if (!window.confirm("Deseja deletar este cupom permanentemente?")) return;
    try { await fetch(`${API_URL}/cupons/${id}`, { method: 'DELETE' }); buscarCupons(); } catch (e) {}
  };

  // =====================================
  // 3. ESTADOS E LÓGICA - MONTADOR DE COMBOS
  // =====================================
  const [produtosTotais, setProdutosTotais] = useState([]);
  const [produtosSelecionadosCombo, setProdutosSelecionadosCombo] = useState([]);
  const [nomeCombo, setNomeCombo] = useState('');
  
  // 🟢 Estado de busca
  const [buscaProdutoCombo, setBuscaProdutoCombo] = useState('');
  
  const [tipoDescontoCombo, setTipoDescontoCombo] = useState('PERCENTUAL');
  const [valorDescontoCombo, setValorDescontoCombo] = useState('');
  
  const [salvandoCombo, setSalvandoCombo] = useState(false);

  const buscarProdutosEstoque = async () => {
    try {
      const res = await fetch(`${API_URL}/produtos`);
      if (res.ok) setProdutosTotais(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (abaAtiva === 'COMBOS') buscarProdutosEstoque();
  }, [abaAtiva]);

  const toggleProdutoCombo = (produto) => {
    const jaSelecionado = produtosSelecionadosCombo.find(p => p._id === produto._id);
    if (jaSelecionado) {
      setProdutosSelecionadosCombo(prev => prev.filter(p => p._id !== produto._id));
    } else {
      setProdutosSelecionadosCombo(prev => [...prev, produto]);
    }
  };

  const totalOriginalCombo = produtosSelecionadosCombo.reduce((acc, curr) => acc + Number(curr.preco), 0);
  let precoCalculadoCombo = totalOriginalCombo;
  
  if (valorDescontoCombo) {
    const desc = Number(valorDescontoCombo);
    if (tipoDescontoCombo === 'PERCENTUAL') {
      precoCalculadoCombo = totalOriginalCombo - (totalOriginalCombo * (desc / 100));
    } else {
      precoCalculadoCombo = totalOriginalCombo - desc;
    }
  }
  precoCalculadoCombo = Math.max(0, precoCalculadoCombo); 

  const combosExistentes = produtosTotais.filter(p => p.categoria === 'COMBO');

  // 🟢 Filtro de busca para exibir na lista do Combo
  const produtosFiltradosCombo = produtosTotais.filter(p => {
    if (p.categoria === 'COMBO' || p.categoria === 'LENTE') return false;
    if (buscaProdutoCombo) {
      const termo = buscaProdutoCombo.toLowerCase();
      const matchNome = p.nome.toLowerCase().includes(termo);
      const matchRef = (p.referencia || '').toLowerCase().includes(termo);
      return matchNome || matchRef;
    }
    return true;
  });

  const gerarCombo = async (e) => {
    e.preventDefault();
    if (produtosSelecionadosCombo.length < 2) return alert("Selecione pelo menos 2 produtos para formar um combo.");
    if (!nomeCombo.trim() || !valorDescontoCombo) return alert("Preencha o nome e o valor do desconto.");

    setSalvandoCombo(true);
    try {
      const menorQuantidade = Math.min(...produtosSelecionadosCombo.map(p => p.quantidade || 0));
      const idsVinculados = "ITENS:" + produtosSelecionadosCombo.map(p => p._id).join(',');

      const payloadCombo = {
        nome: "COMBO: " + nomeCombo,
        preco: Number(precoCalculadoCombo.toFixed(2)), 
        categoria: 'COMBO',
        quantidade: menorQuantidade > 0 ? menorQuantidade : 1, 
        referencia: idsVinculados,
        foto: produtosSelecionadosCombo[0].foto 
      };

      const res = await fetch(`${API_URL}/produtos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadCombo)
      });

      if (res.ok) {
        alert("Combo gerado e enviado para a Vitrine com sucesso!");
        setProdutosSelecionadosCombo([]);
        setNomeCombo('');
        setValorDescontoCombo('');
        setTipoDescontoCombo('PERCENTUAL');
        setBuscaProdutoCombo('');
        buscarProdutosEstoque();
      } else {
        alert("Erro ao criar combo no servidor.");
      }
    } catch (err) {
      alert("Erro na conexão ao criar combo.");
    } finally {
      setSalvandoCombo(false);
    }
  };

  const deletarComboExistente = async (id) => {
    if (!window.confirm("Desfazer este Combo? Ele sairá da loja online.")) return;
    try {
      await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
      buscarProdutosEstoque();
    } catch (e) {}
  };


  // =====================================
  // RENDERIZAÇÃO
  // =====================================
  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO GERAL */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">Motor de Vendas</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">E-commerce e Promoções</p>
          </div>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm">
            ⬅ Voltar ao Painel Geral
          </button>
        </header>

        {/* NAVEGADOR DE ABAS */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-8 max-w-lg">
          <button onClick={() => setAbaAtiva('PEDIDOS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'PEDIDOS' ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'}`}>
            📦 Pedidos
          </button>
          <button onClick={() => setAbaAtiva('COMBOS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'COMBOS' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-orange-600'}`}>
            🎁 Combos
          </button>
          <button onClick={() => setAbaAtiva('CUPONS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${abaAtiva === 'CUPONS' ? 'bg-[#c5a880] text-white shadow-md' : 'text-gray-400 hover:text-[#c5a880]'}`}>
            🎟️ Cupons
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: PEDIDOS ONLINE */}
        {/* ======================================================== */}
        {abaAtiva === 'PEDIDOS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
                {['TODOS', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CONCLUIDO'].map(status => (
                  <button key={status} onClick={() => setFiltroStatus(status)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filtroStatus === status ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde hover:bg-elos-fundo'}`}>
                    {status === 'TODOS' ? '📋 Todos' : getTextoStatus(status)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-3">
                <span className="text-[10px] font-black uppercase text-gray-400">Período:</span>
                <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-elos-verde outline-none focus:border-elos-bege cursor-pointer">
                  {mesesDoAno.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-elos-verde outline-none focus:border-elos-bege cursor-pointer">
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            {carregandoPedidos ? (
              <p className="text-elos-verde font-bold animate-pulse text-center mt-20 text-sm tracking-widest">CARREGANDO PEDIDOS...</p>
            ) : pedidosExibidos.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-gray-100">
                <span className="text-6xl opacity-20 block mb-6">📭</span>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum pedido encontrado neste período.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                {pedidosExibidos.map((pedido) => {
                  const expandido = expandidos.includes(pedido._id);
                  return (
                    <div key={pedido._id} className={`bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col transition-all duration-300 relative overflow-hidden ${expandido ? 'shadow-xl ring-2 ring-elos-bege/30' : 'hover:shadow-md hover:border-gray-200'}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-2 transition-all ${pedido.status === 'AGUARDANDO_PAGAMENTO' ? 'bg-yellow-400' : pedido.status === 'PAGO' ? 'bg-blue-500' : pedido.status === 'CONCLUIDO' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      
                      <div onClick={() => toggleExpandir(pedido._id)} className="p-5 pl-7 cursor-pointer select-none">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-black text-xl text-elos-verde tracking-tight">#{pedido.numeroPedidoOnline}</h3>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${getEstiloStatus(pedido.status)}`}>{getTextoStatus(pedido.status).split(' ')[1] || getTextoStatus(pedido.status)}</span>
                            <span className="text-gray-300 text-lg transition-transform duration-300" style={{ transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <p className="text-sm font-bold text-elos-texto line-clamp-1">{pedido.clienteNome}</p>
                          <span className="text-sm font-black text-elos-verde tracking-tight ml-2">{Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </div>

                      {expandido && (
                        <div className="px-5 pb-5 pl-7 animate-in slide-in-from-top-4 fade-in duration-300 border-t border-gray-50 pt-4">
                          <div className="mb-4 space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-gray-400 font-bold tracking-widest">📞 {pedido.clienteTelefone}</p>
                              {pedido.clienteTelefone && (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${pedido.clienteTelefone.replace(/\D/g, '')}`, '_blank'); }} className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-md font-bold uppercase hover:bg-green-100 transition-colors">💬 WhatsApp</button>
                              )}
                            </div>
                            {pedido.clienteCpf && <p className="text-xs text-gray-400 font-bold tracking-widest">📄 CPF: {pedido.clienteCpf}</p>}
                          </div>
                          <div className="mb-4 bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">📍 Endereço de Entrega</p>
                            <p className="text-xs text-elos-texto font-medium">{pedido.clienteEndereco || "Não informado."}</p>
                          </div>
                          <div className="mb-5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b border-gray-200 pb-1">Itens ({pedido.itens?.length || 0})</p>
                            <ul className="space-y-1.5">
                              {(pedido.itens || []).map((item, idx) => (
                                <li key={idx} className="flex justify-between items-start text-xs">
                                  <span className="font-bold text-gray-700 line-clamp-1 flex-1 pr-2">1x {item.nome}</span>
                                  <span className="text-elos-verde font-black whitespace-nowrap">{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); atualizarStatus(pedido._id, 'PAGO'); }} className="col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest shadow-md">💰 Recebido (PIX)</button>
                                <button onClick={(e) => { e.stopPropagation(); atualizarStatus(pedido._id, 'CANCELADO'); }} className="col-span-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-widest">Cancelar Pedido</button>
                              </>
                            )}
                            {pedido.status === 'PAGO' && (
                              <button onClick={(e) => { e.stopPropagation(); atualizarStatus(pedido._id, 'CONCLUIDO'); }} className="col-span-2 bg-elos-verde hover:bg-[#3a4a3e] text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"><span className="text-lg">📦</span> Confirmar Despacho</button>
                            )}
                            {(pedido.status === 'CONCLUIDO' || pedido.status === 'CANCELADO') && (
                              <p className="col-span-2 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold py-2.5 bg-gray-50 rounded-xl border border-gray-100">Pedido Arquivado</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 🟢 ABA 2: MONTADOR DE COMBOS */}
        {/* ======================================================== */}
        {abaAtiva === 'COMBOS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* LISTA DE PRODUTOS PARA ESCOLHER COM BARRA DE PESQUISA */}
            <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col h-[80vh]">
              <h2 className="font-tradicional text-2xl text-elos-verde italic font-bold mb-1">Inventário</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-6">Selecione os itens para o combo</p>
              
              {/* 🟢 BARRA DE PESQUISA ADICIONADA AQUI */}
              <div className="mb-4 relative">
                <input
                  type="text"
                  placeholder="Buscar produto ou ref..."
                  value={buscaProdutoCombo}
                  onChange={e => setBuscaProdutoCombo(e.target.value)}
                  className="w-full bg-gray-50 p-3.5 pl-10 rounded-xl border border-gray-200 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 text-xs font-bold text-gray-700 transition-all"
                />
                <span className="absolute left-3.5 top-3.5 text-gray-400">🔍</span>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
                {produtosFiltradosCombo.length === 0 ? (
                  <p className="text-center text-xs font-bold text-gray-400 mt-10">Nenhum produto encontrado.</p>
                ) : (
                  produtosFiltradosCombo.map(produto => {
                    const taSelecionado = produtosSelecionadosCombo.some(p => p._id === produto._id);
                    return (
                      <div 
                        key={produto._id} 
                        onClick={() => toggleProdutoCombo(produto)}
                        className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${taSelecionado ? 'bg-orange-50 border-orange-300 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-orange-200'}`}
                      >
                        <div className="flex-1 pr-4">
                          <p className={`text-xs font-bold ${taSelecionado ? 'text-orange-800' : 'text-gray-700'}`}>{produto.nome}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-1">
                            {produto.categoria} {produto.referencia ? `• Ref: ${produto.referencia}` : ''} • R$ {produto.preco}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${taSelecionado ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'}`}>
                          {taSelecionado && '✓'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* FECHAMENTO DO COMBO */}
            <div className="space-y-6 sticky top-24">
              <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-xl ring-1 ring-black/5">
                <h2 className="font-tradicional text-2xl text-orange-600 italic font-bold mb-1">Montar Combo</h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-6">{produtosSelecionadosCombo.length} itens selecionados</p>
                
                {produtosSelecionadosCombo.length === 0 ? (
                  <div className="text-center py-10 bg-orange-50/50 rounded-2xl border border-orange-100 border-dashed">
                    <p className="text-orange-400 font-bold uppercase tracking-widest text-xs">Marque os itens ao lado.</p>
                  </div>
                ) : (
                  <form onSubmit={gerarCombo} className="space-y-5">
                    <ul className="space-y-2 mb-4">
                      {produtosSelecionadosCombo.map(p => (
                        <li key={p._id} className="flex justify-between text-xs font-medium text-gray-600 border-b border-gray-100 pb-2">
                          <span className="truncate pr-4">1x {p.nome}</span>
                          <span>R$ {p.preco}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mb-6">
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Valor Original (Soma)</span>
                      <span className="text-sm font-black text-gray-400 line-through">R$ {totalOriginalCombo.toFixed(2)}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest ml-1">Nome para Vitrine</label>
                      <input type="text" placeholder="Ex: Combo Sol de Verão" value={nomeCombo} onChange={e => setNomeCombo(e.target.value)} required className="w-full bg-orange-50/50 p-3.5 rounded-xl border border-orange-200 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 font-bold text-orange-800 text-sm transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest ml-1">Tipo Desconto</label>
                        <select 
                          value={tipoDescontoCombo} 
                          onChange={e => { setTipoDescontoCombo(e.target.value); setValorDescontoCombo(''); }} 
                          className="w-full bg-orange-50/50 p-3.5 rounded-xl border border-orange-200 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 text-xs font-bold text-orange-800"
                        >
                          <option value="PERCENTUAL">% Porcentagem</option>
                          <option value="FIXO">R$ Valor Fixo</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest ml-1">Desconto</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder={tipoDescontoCombo === 'PERCENTUAL' ? "Ex: 10" : "Ex: 50.00"} 
                          value={valorDescontoCombo} 
                          onChange={e => setValorDescontoCombo(e.target.value)} 
                          required 
                          className="w-full bg-orange-50/50 p-3.5 rounded-xl border border-orange-200 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 font-black text-orange-600 text-lg transition-all" 
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-orange-100/50 p-3 rounded-xl border border-orange-200 mt-2">
                      <span className="text-[10px] uppercase font-black tracking-widest text-orange-800">Preço Final do Combo</span>
                      <span className="text-xl font-black text-orange-600">R$ {precoCalculadoCombo.toFixed(2)}</span>
                    </div>

                    <button type="submit" disabled={salvandoCombo} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl shadow-lg shadow-orange-600/30 active:scale-95 transition-all mt-4">
                      {salvandoCombo ? 'Gerando...' : 'Finalizar Combo e Enviar p/ Loja'}
                    </button>
                  </form>
                )}
              </div>

              {/* COMBOS ATIVOS */}
              {combosExistentes.length > 0 && (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Combos Ativos na Loja</p>
                  <div className="space-y-3">
                    {combosExistentes.map(combo => (
                      <div key={combo._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 pr-4">
                          <p className="text-xs font-bold text-elos-verde line-clamp-1">{combo.nome}</p>
                          <p className="text-[10px] font-black text-orange-500 mt-1">R$ {combo.preco.toFixed(2)}</p>
                        </div>
                        <button onClick={() => deletarComboExistente(combo._id)} className="text-red-400 hover:text-red-600 bg-white border border-gray-200 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm" title="Desfazer Combo">
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ======================================================== */}
        {/* ABA 3: GERENCIADOR DE CUPONS */}
        {/* ======================================================== */}
        {abaAtiva === 'CUPONS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="font-tradicional text-2xl text-elos-verde italic font-bold mb-1">Novo Cupom</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-6">Regras de Desconto</p>
              
              <form onSubmit={salvarCupom} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Código Promocional</label>
                  <input type="text" placeholder="Ex: VERAO20" value={formCupom.codigo} onChange={e => setFormCupom({...formCupom, codigo: e.target.value.toUpperCase()})} required className="w-full bg-gray-50 p-3.5 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] focus:ring-2 focus:ring-[#c5a880]/20 font-black text-elos-verde text-sm tracking-widest uppercase transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Tipo</label>
                    <select value={formCupom.tipo} onChange={e => setFormCupom({...formCupom, tipo: e.target.value, valor: ''})} className="w-full bg-gray-50 p-3.5 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] focus:ring-2 focus:ring-[#c5a880]/20 text-xs font-bold text-gray-600">
                      <option value="PERCENTUAL">% Porcentagem</option>
                      <option value="FIXO">R$ Valor Fixo</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Valor</label>
                    <input type="number" step="0.01" min="1" placeholder={formCupom.tipo === 'PERCENTUAL' ? "Ex: 15" : "Ex: 50.00"} value={formCupom.valor} onChange={e => setFormCupom({...formCupom, valor: e.target.value})} required className="w-full bg-gray-50 p-3.5 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] focus:ring-2 focus:ring-[#c5a880]/20 font-bold text-elos-verde text-sm transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5 pb-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Válido até o dia</label>
                  <input type="date" value={formCupom.dataFim} onChange={e => setFormCupom({...formCupom, dataFim: e.target.value})} required className="w-full bg-gray-50 p-3.5 rounded-xl border border-gray-200 outline-none focus:border-[#c5a880] focus:ring-2 focus:ring-[#c5a880]/20 font-bold text-gray-600 text-sm transition-all" />
                </div>

                <button type="submit" className="w-full bg-[#c5a880] hover:bg-[#b0946d] text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl shadow-lg active:scale-95 transition-all">
                  Gerar Cupom
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {carregandoCupons ? (
                <p className="text-center text-elos-verde font-bold animate-pulse uppercase text-xs mt-10">Buscando Cupons...</p>
              ) : cupons.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-[3rem] border border-gray-100 border-dashed">
                  <span className="text-4xl opacity-20 block mb-4">🎟️</span>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum cupom gerado.</p>
                </div>
              ) : (
                cupons.map(cupom => {
                  const expirado = new Date() > new Date(cupom.dataFim);
                  const statusCor = !cupom.ativo ? 'bg-red-50 text-red-600 border-red-200' : expirado ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                  const textoStatus = !cupom.ativo ? 'Pausado' : expirado ? 'Expirado' : 'Ativo';

                  return (
                    <div key={cupom._id} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4 items-center">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-tradicional italic font-bold text-2xl ${cupom.tipo === 'PERCENTUAL' ? 'bg-[#c5a880]/10 text-[#c5a880]' : 'bg-elos-verde/10 text-elos-verde'}`}>
                          {cupom.tipo === 'PERCENTUAL' ? '%' : '$'}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-black text-lg text-elos-verde tracking-widest">{cupom.codigo}</h3>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusCor}`}>{textoStatus}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            Desconto de <strong className="text-elos-verde">{cupom.tipo === 'PERCENTUAL' ? `${cupom.valor}%` : `R$ ${Number(cupom.valor).toFixed(2)}`}</strong>
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Validade: {new Date(cupom.dataFim).toLocaleDateString('pt-BR')} (23:59h)</p>
                        </div>
                      </div>

                      <div className="flex w-full md:w-auto gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                        <button onClick={() => alternarStatusCupom(cupom._id, cupom.ativo)} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cupom.ativo ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                          {cupom.ativo ? 'Pausar' : 'Reativar'}
                        </button>
                        <button onClick={() => deletarCupom(cupom._id)} className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 transition-colors">
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}