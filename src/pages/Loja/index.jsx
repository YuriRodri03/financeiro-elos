import React, { useState, useEffect, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { useNavigate } from 'react-router-dom';

export default function HomeLoja() {
  const { produtos, carregando } = useFinanceiro();
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  
  // 🟢 TAG DA INFINITEPAY DO .ENV
  const infinitePayUser = import.meta.env.VITE_INFINITEPAY_USER || '';
  
  const [categoriaAtiva, setCategoriaAtiva] = useState('TODAS');
  
  const clienteLogado = JSON.parse(localStorage.getItem('clienteLogadoElos') || 'null');

  useEffect(() => {
    if (!clienteLogado) navigate('/login');
  }, [clienteLogado, navigate]);

  const [carrinho, setCarrinho] = useState([]);
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [etapaCheckout, setEtapaCheckout] = useState(0); 
  const [processando, setProcessando] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(null);

  const [abaAtiva, setAbaAtiva] = useState('VITRINE'); 
  const [meusPedidos, setMeusPedidos] = useState([]);

  const [dadosCliente, setDadosCliente] = useState({ 
    nome: clienteLogado?.nome || '', 
    telefone: clienteLogado?.telefone || '', 
    cpf: clienteLogado?.cpf || '',
    endereco: clienteLogado?.endereco || ''
  });

  const buscarPedidos = async () => {
    if (!clienteLogado?.cpf) return; 
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pedidos_online`);
      if (res.ok) {
        const todosPedidos = await res.json();
        const pedidosDoCliente = todosPedidos.filter(p => p.clienteCpf === clienteLogado.cpf);
        setMeusPedidos(pedidosDoCliente);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico", err);
    }
  };

  useEffect(() => {
    if (abaAtiva === 'MEUS_PEDIDOS') buscarPedidos();
  }, [abaAtiva]); 

  const handleMascaraTel = (v) => {
    let valor = v.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 2) valor = `(${valor.substring(0,2)}) ${valor.substring(2)}`;
    if (valor.length > 10) valor = `${valor.substring(0,10)}-${valor.substring(10)}`;
    return valor;
  };

  const handleMascaraCpf = (v) => {
    let valor = v.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 3) valor = `${valor.substring(0,3)}.${valor.substring(3)}`;
    if (valor.length > 7) valor = `${valor.substring(0,7)}.${valor.substring(7)}`;
    if (valor.length > 11) valor = `${valor.substring(0,11)}-${valor.substring(11)}`;
    return valor;
  };

  const getTextoStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return { texto: 'Aguardando Pagamento', cor: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
      case 'PAGO': return { texto: 'Pagamento Aprovado', cor: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'CONCLUIDO': return { texto: 'Pedido Entregue', cor: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'CANCELADO': return { texto: 'Cancelado', cor: 'text-red-600 bg-red-50 border-red-200' };
      default: return { texto: status, cor: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const produtosLoja = useMemo(() => {
    let filtrados = produtos.filter(p => p.quantidade > 0 && p.categoria === 'ARMAÇÃO');
    if (busca) filtrados = filtrados.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
    if (categoriaAtiva !== 'TODAS') filtrados = filtrados.filter(p => p.nome.toLowerCase().includes(categoriaAtiva.toLowerCase()));
    return filtrados;
  }, [produtos, busca, categoriaAtiva]);

  const categorias = [
    { id: 'TODAS', label: 'Todas as Armações', icone: '👓' },
    { id: 'MASCULINO', label: 'Masculino', icone: '👔' },
    { id: 'FEMININO', label: 'Feminino', icone: '👗' },
    { id: 'INFANTIL', label: 'Infantil', icone: '🧸' },
    { id: 'SOLAR', label: 'Óculos de Sol', icone: '☀️' },
  ];

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item._id === (produto._id || produto.id));
    if (itemExistente) {
      alert("Esta armação já está no seu carrinho!");
      return;
    }
    setCarrinho([...carrinho, { ...produto, _id: (produto._id || produto.id) }]);
    setMostrarCarrinho(true);
    setEtapaCheckout(0); 
  };

  const removerDoCarrinho = (idProduto) => {
    setCarrinho(carrinho.filter(item => item._id !== idProduto));
    if (carrinho.length === 1) setEtapaCheckout(0);
  };

  const valorTotalCarrinho = carrinho.reduce((total, item) => total + Number(item.preco), 0);

  const processarPedido = async (e) => {
    e.preventDefault();
    setProcessando(true);

    const payload = {
      clienteNome: dadosCliente.nome.toUpperCase(),
      clienteTelefone: dadosCliente.telefone,
      clienteCpf: dadosCliente.cpf,
      clienteEndereco: dadosCliente.endereco,
      itens: carrinho.map(item => ({ id: item._id, nome: item.nome, preco: item.preco, referencia: item.referencia })),
      valorTotal: valorTotalCarrinho
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pedidos_online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setPedidoFinalizado(data.pedido); 
        setCarrinho([]); 
        setEtapaCheckout(2); 
      } else {
        alert("Ops! Tivemos um problema.");
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setProcessando(false);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!window.confirm("Deseja cancelar este pedido?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pedidos_online/${pedidoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADO' })
      });
      if (res.ok) {
        alert("Pedido cancelado!");
        buscarPedidos(); 
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  };

  const avisarWhatsApp = (pedidoEspecifico = null) => {
    const p = pedidoEspecifico || pedidoFinalizado;
    if (!p) return;
    const telefoneLoja = "5585985506571";
    let texto = `*OLÁ! GOSTARIA DE FALAR SOBRE O MEU PEDIDO!* 📦✨\n\n`;
    texto += `*Número do Pedido:* #${p.numeroPedidoOnline}\n`;
    texto += `*Meu Nome:* ${p.clienteNome}\n`;
    texto += `*Valor:* R$ ${Number(p.valorTotal).toFixed(2).replace('.', ',')}\n\n`;
    texto += `Estou enviando minha receita e/ou o comprovante.`;
    
    window.open(`https://wa.me/${telefoneLoja}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleSair = () => {
    localStorage.removeItem('clienteLogadoElos');
    navigate('/login');
  };

  if (carregando || !clienteLogado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1d3026] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#1d3026] font-bold uppercase tracking-widest text-xs">Preparando sua loja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f6] font-sans relative">
      
      {/* NAVBAR */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAbaAtiva('VITRINE')}>
              <img src="/favicon.png" alt="Ótica Elos" className="w-10 h-10 object-contain drop-shadow-sm" />
              <span className="font-tradicional text-2xl text-[#1d3026] italic font-bold">Ótica Elos</span>
            </div>

            {abaAtiva === 'VITRINE' && (
              <div className="hidden md:block flex-1 max-w-md mx-8">
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Buscar modelos, marcas..." 
                    value={busca} 
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:bg-white focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm transition-all shadow-sm group-hover:shadow-md"
                  />
                  <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs text-gray-500 font-medium">Olá, {clienteLogado.nome.split(' ')[0]}</span>
                <div className="flex items-center gap-2 mt-0.5 justify-end">
                  <button onClick={() => setAbaAtiva('MEUS_PEDIDOS')} className="text-[10px] font-bold text-[#c5a880] hover:text-[#9d7d54] uppercase tracking-wider transition-colors">Histórico</button>
                  <span className="text-gray-300 text-[10px]">|</span>
                  <button onClick={handleSair} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider transition-colors">Sair</button>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
              <button 
                onClick={() => { setMostrarCarrinho(true); if(etapaCheckout === 2) setEtapaCheckout(0); }} 
                className="relative p-2 text-[#1d3026] hover:bg-gray-50 rounded-full transition-all"
              >
                <span className="text-2xl drop-shadow-sm">🛒</span>
                {carrinho.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#1d3026] text-[#c5a880] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm border border-[#c5a880]/30">
                    {carrinho.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {abaAtiva === 'VITRINE' ? (
        <>
          <div className="bg-[#1d3026] text-white pt-24 pb-16 px-4 relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#c5a880] rounded-full blur-[100px]"></div>
               <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
            <div className="max-w-7xl mx-auto relative z-10 text-center flex flex-col items-center">
              <h1 className="font-tradicional text-5xl md:text-7xl italic leading-tight font-light drop-shadow-2xl">
                O seu novo olhar <br/> <span className="text-[#c5a880] font-bold">começa aqui.</span>
              </h1>
              <p className="text-gray-300 text-sm md:text-base tracking-[0.2em] uppercase font-bold mt-8 mb-4">Coleção Exclusiva 2026</p>
              <div className="w-16 h-1 bg-[#c5a880] rounded-full mt-4"></div>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-20">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              <aside className="w-full lg:w-64 shrink-0 bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100 lg:sticky lg:top-28">
                <h3 className="font-tradicional text-xl text-[#1d3026] italic font-bold mb-6 border-b border-gray-100 pb-4">Categorias</h3>
                <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 no-scrollbar">
                  {categorias.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setCategoriaAtiva(cat.id)}
                      className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap lg:whitespace-normal text-left ${
                        categoriaAtiva === cat.id 
                        ? 'bg-[#1d3026] text-[#c5a880] shadow-md scale-[1.02]' 
                        : 'bg-gray-50 text-gray-500 hover:bg-[#c5a880]/10 hover:text-[#1d3026]'
                      }`}
                    >
                      <span className="text-lg">{cat.icone}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
                  <div>
                    <h2 className="text-3xl font-tradicional text-[#1d3026] italic">
                      {categorias.find(c => c.id === categoriaAtiva)?.label}
                    </h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">
                      Mostrando {produtosLoja.length} resultados
                    </p>
                  </div>
                </div>

                {produtosLoja.length === 0 ? (
                  <div className="text-center py-32 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
                    <span className="text-6xl opacity-20">👓</span>
                    <p className="text-gray-400 mt-6 font-medium text-lg">Nenhuma armação encontrada nesta categoria.</p>
                    <button 
                      onClick={() => {setBusca(''); setCategoriaAtiva('TODAS');}} 
                      className="mt-4 text-[#c5a880] font-bold uppercase tracking-widest text-xs underline"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {produtosLoja.map((produto) => {
                      const noCarrinho = carrinho.some(item => item._id === (produto._id || produto.id));
                      return (
                        <div key={produto._id || produto.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col relative">
                          
                          {produto.referencia && (
                            <div className="absolute top-4 left-4 z-10 bg-[#c5a880] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                              Ref: {produto.referencia}
                            </div>
                          )}
                          
                          <div className="aspect-[4/3] bg-gradient-to-b from-[#f9f8f6] to-white relative overflow-hidden flex items-center justify-center p-8">
                            {produto.foto ? (
                              <img src={produto.foto} alt={produto.nome} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out drop-shadow-xl"/>
                            ) : (
                              <span className="text-7xl opacity-10">👓</span>
                            )}
                          </div>
                          
                          <div className="p-6 flex flex-col flex-1">
                            <h3 className="font-black text-[#1d3026] text-sm leading-snug line-clamp-2 mb-2 group-hover:text-[#c5a880] transition-colors">
                              {produto.nome}
                            </h3>
                            
                            <div className="mt-auto pt-6 flex flex-col gap-4">
                              <span className="font-black text-[#1d3026] text-2xl tracking-tight">
                                {Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <button 
                                onClick={() => adicionarAoCarrinho(produto)}
                                disabled={noCarrinho}
                                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-md ${
                                  noCarrinho 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                                    : 'bg-[#1d3026] text-white hover:bg-[#c5a880] hover:shadow-[#c5a880]/30 active:scale-[0.98]'
                                }`}
                              >
                                {noCarrinho ? '✅ No Carrinho' : 'Adicionar ao Carrinho'}
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
          </main>
        </>
      ) : (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-300">
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-3xl font-tradicional text-[#1d3026] italic">Seu Histórico</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-2">Acompanhe suas compras</p>
          </div>

          {meusPedidos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
              <span className="text-5xl opacity-20 block mb-4">📦</span>
              <p className="text-gray-400 italic">Você ainda não realizou nenhuma compra online.</p>
              <button 
                onClick={() => setAbaAtiva('VITRINE')} 
                className="mt-6 px-6 py-3 bg-[#1d3026] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2a4537] transition-colors shadow-md"
              >
                Ir para a Vitrine
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {meusPedidos.map((pedido) => {
                const infoStatus = getTextoStatus(pedido.status);
                return (
                  <div key={pedido._id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:shadow-md transition-shadow">
                    
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl font-black text-[#1d3026]">#{pedido.numeroPedidoOnline}</span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${infoStatus.cor}`}>
                          {infoStatus.texto}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        Realizado em: {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')} às {new Date(pedido.dataPedido).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <div className="bg-gray-50 p-3 rounded-xl mt-3 inline-block w-full sm:w-auto">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 border-b border-gray-200 pb-1">Itens</p>
                        <ul className="space-y-1">
                          {(pedido.itens || []).map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-700 font-medium line-clamp-1">• 1x {item.nome}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest md:text-right mb-0.5">Total</p>
                        <p className="text-2xl font-black text-[#1d3026]">
                          {Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row w-full gap-2">
                        {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
                          <button 
                            onClick={() => cancelarPedido(pedido._id)} 
                            className="w-full sm:w-auto px-5 py-3 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 border border-gray-200 hover:border-red-200 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2" 
                          >
                            <span>❌</span> Cancelar
                          </button>
                        )}
                        <button 
                          onClick={() => avisarWhatsApp(pedido)} 
                          className="w-full sm:w-auto px-6 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <span>💬</span> Falar na Loja
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {mostrarCarrinho && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => { if(!processando) setMostrarCarrinho(false) }}></div>

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#1d3026] to-[#2a4537] text-white">
              <h2 className="text-xl font-tradicional italic font-medium">
                {etapaCheckout === 0 && "Sua Seleção"}
                {etapaCheckout === 1 && "Confirme Seus Dados"}
                {etapaCheckout === 2 && "Tudo Certo!"}
              </h2>
              {!processando && (
                <button 
                  onClick={() => setMostrarCarrinho(false)} 
                  className="text-[#c5a880] hover:text-white text-3xl leading-none transition-colors"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              
              {etapaCheckout === 0 && (
                <div className="space-y-4">
                  {carrinho.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 mt-10">
                      <span className="text-5xl opacity-20 block mb-4">🛒</span>
                      <p className="text-sm font-medium">Seu carrinho está vazio.</p>
                    </div>
                  ) : (
                    carrinho.map(item => (
                      <div key={item._id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100 p-2">
                          {item.foto ? <img src={item.foto} className="w-full h-full object-contain" /> : <span className="opacity-20">👓</span>}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{item.nome}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Ref: {item.referencia || 'N/A'}</p>
                          <p className="text-sm font-black text-[#1d3026] mt-1">{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <button 
                          onClick={() => removerDoCarrinho(item._id)} 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xl"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {etapaCheckout === 1 && (
                <form id="formCheckout" onSubmit={processarPedido} className="space-y-5 animate-in fade-in">
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mb-6 flex items-start gap-3">
                    <span className="text-xl">✅</span>
                    <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                      Seus dados foram vinculados automaticamente. Confirme o endereço para entrega.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input type="text" required value={dadosCliente.nome} onChange={e => setDadosCliente({...dadosCliente, nome: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm text-gray-800" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input type="tel" required value={dadosCliente.telefone} onChange={e => setDadosCliente({...dadosCliente, telefone: handleMascaraTel(e.target.value)})} className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm text-gray-800" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Endereço Completo de Entrega</label>
                    <textarea 
                      required 
                      rows="2"
                      placeholder="Rua, Número, Bairro, CEP..."
                      value={dadosCliente.endereco || ''} 
                      onChange={e => setDadosCliente({...dadosCliente, endereco: e.target.value})} 
                      className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm text-gray-800 resize-none" 
                    />
                  </div>
                  <div className="space-y-1.5 opacity-60">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">CPF (Vinculado)</label>
                    <input type="text" required value={dadosCliente.cpf} onChange={e => setDadosCliente({...dadosCliente, cpf: handleMascaraCpf(e.target.value)})} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-500 text-sm cursor-not-allowed font-medium" disabled />
                  </div>
                </form>
              )}

              {/* 🟢 TELA DE SUCESSO PREMIUM REFORMULADA */}
              {etapaCheckout === 2 && pedidoFinalizado && (
                <div className="text-center flex flex-col h-full animate-in zoom-in-95 duration-500 pt-4">
                  
                  {/* Ícone de Sucesso Clean */}
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm relative">
                    <span className="text-4xl">✨</span>
                  </div>
                  
                  <h3 className="font-tradicional text-3xl italic text-[#1d3026] mb-2">Pedido Criado!</h3>
                  <p className="text-xs text-gray-500 mb-6 px-4">Seu pedido <span className="font-black text-[#1d3026]">#{pedidoFinalizado.numeroPedidoOnline}</span> foi reservado com sucesso.</p>

                  {/* Resumo do Pedido Premium */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8 text-left relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#c5a880]"></div>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Total a pagar</p>
                    </div>
                    <p className="text-3xl font-black text-[#1d3026] tracking-tight mb-2">
                      {Number(pedidoFinalizado.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-xs font-medium text-gray-500 line-clamp-1">
                      Referente a: {pedidoFinalizado.itens[0]?.nome} {pedidoFinalizado.itens.length > 1 && `e mais ${pedidoFinalizado.itens.length - 1} item(ns)`}
                    </p>
                  </div>

                  <div className="mt-auto space-y-4">
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                      <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-[#c5a880] text-[10px] font-black uppercase tracking-widest">Finalize sua compra</span></div>
                    </div>

                    {/* Botão de Pagamento Limpo e Direto */}
                    <button 
                      onClick={() => { 
                      const valorFixo = Number(pedidoFinalizado.valorTotal).toFixed(2).replace('.', ',');
                      window.open(`https://pay.infinitepay.io/${infinitePayUser}/${valorFixo}`, "_blank"); 
                    }} 
                      className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-[#1d3026]"
                    >
                      <span className="text-lg">💳</span> Pagar via PIX ou Cartão
                    </button>

                    <p className="text-[10px] text-gray-400 px-4 leading-relaxed">
                      Você será redirecionado para o ambiente 100% seguro da InfinitePay.
                    </p>

                    <div className="pt-2">
                      <button 
                        onClick={() => avisarWhatsApp(pedidoFinalizado)} 
                        className="w-full bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold py-3.5 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors active:scale-[0.98] text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <span>💬</span> Enviar Receita / Já Paguei
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RODAPÉ DO CARRINHO */}
            {etapaCheckout < 2 && carrinho.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total da Compra</span>
                  <span className="text-3xl font-black text-[#1d3026] tracking-tight">{valorTotalCarrinho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                
                {etapaCheckout === 0 ? (
                  <button 
                    onClick={() => setEtapaCheckout(1)} 
                    className="w-full bg-[#1d3026] hover:bg-[#2a4537] text-[#c5a880] font-bold py-4 rounded-xl shadow-lg shadow-[#1d3026]/20 transition-all active:scale-[0.98] text-xs uppercase tracking-widest border border-[#c5a880]/30"
                  >
                    Avançar para Pagamento
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => setEtapaCheckout(0)} 
                      disabled={processando} 
                      className="w-full sm:w-1/3 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl transition-all hover:bg-gray-200 text-[10px] uppercase tracking-widest"
                    >
                      Revisar
                    </button>
                    <button 
                      type="submit" 
                      form="formCheckout" 
                      disabled={processando} 
                      className="w-full sm:w-2/3 bg-[#1d3026] hover:bg-[#2a4537] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#1d3026]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                    >
                      {processando ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Confirmar e Pagar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h4 className="font-tradicional text-2xl text-[#1d3026] italic mb-1">Ótica Elos</h4>
            <p className="text-[10px] font-bold text-[#c5a880] uppercase tracking-widest mb-3">E-commerce Oficial</p>
            <p className="text-xs text-gray-500 font-medium">Rua Viriato Ribeiro, 321 - Bela Vista, Fortaleza-CE</p>
            <p className="text-xs text-gray-400 mt-1">CNPJ: 52.294.947/0001-56</p>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Atendimento ao Cliente</p>
            <div className="px-5 py-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-[#1d3026] text-sm">(85) 98550-6571</div>
          </div>
        </div>
      </footer>
    </div>
  );
}