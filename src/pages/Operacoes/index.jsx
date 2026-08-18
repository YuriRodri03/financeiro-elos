import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Operacoes() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // 🟢 ESTADOS DE FILTRO E EXIBIÇÃO
  const [filtroStatus, setFiltroStatus] = useState('TODOS'); 
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1); // 1 a 12
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  
  // 🟢 CORREÇÃO: Agora é um Array (lista) para permitir vários abertos ao mesmo tempo!
  const [expandidos, setExpandidos] = useState([]); 

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const buscarPedidosOnline = async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos_online`);
      if (res.ok) {
        const data = await res.json();
        setPedidos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos online:", error);
    } finally {
      setCarregando(false);
    }
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) buscarPedidosOnline(); 
    } catch (error) {
      alert("Erro ao atualizar status do pedido.");
    }
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

  // 🟢 CORREÇÃO: Função atualizada para adicionar ou remover da lista de múltiplos cards abertos
  const toggleExpandir = (id) => {
    setExpandidos(prevExpandidos => 
      prevExpandidos.includes(id) 
        ? prevExpandidos.filter(cardId => cardId !== id) // Se já tá aberto, fecha tirando da lista
        : [...prevExpandidos, id] // Se tá fechado, adiciona na lista de abertos
    );
  };

  const pedidosExibidos = pedidos.filter(p => {
    if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false;
    
    if (p.dataPedido) {
      const dataP = new Date(p.dataPedido);
      if (dataP.getMonth() + 1 !== Number(mesFiltro) || dataP.getFullYear() !== Number(anoFiltro)) {
        return false;
      }
    }
    return true;
  });

  const mesesDoAno = [
    { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' }, { v: 4, l: 'Abril' },
    { v: 5, l: 'Maio' }, { v: 6, l: 'Junho' }, { v: 7, l: 'Julho' }, { v: 8, l: 'Agosto' },
    { v: 9, l: 'Setembro' }, { v: 10, l: 'Outubro' }, { v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' }
  ];

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-elos-fundo">
        <p className="text-elos-verde font-bold animate-pulse uppercase tracking-widest text-xs">Atualizando Painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-elos-bege/20 pb-6">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">Operações Online</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Centro de Logística e Despacho</p>
          </div>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm">
            ⬅ Voltar ao Painel Geral
          </button>
        </header>

        {/* BARRA DE FILTROS INTELIGENTE */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          
          <div className="flex flex-wrap gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
            {['TODOS', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CONCLUIDO'].map(status => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filtroStatus === status ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde hover:bg-elos-fundo'
                }`}
              >
                {status === 'TODOS' ? '📋 Todos' : getTextoStatus(status)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-3">
            <span className="text-[10px] font-black uppercase text-gray-400">Período:</span>
            <select 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)} 
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-elos-verde outline-none focus:border-elos-bege cursor-pointer"
            >
              {mesesDoAno.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            
            <select 
              value={anoFiltro} 
              onChange={(e) => setAnoFiltro(e.target.value)} 
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-elos-verde outline-none focus:border-elos-bege cursor-pointer"
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>
        </div>

        {/* LISTA DE PEDIDOS */}
        {pedidosExibidos.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-gray-100">
            <span className="text-6xl opacity-20 block mb-6">📭</span>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum pedido encontrado neste período.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {pedidosExibidos.map((pedido) => {
              // 🟢 Verifica se ESSE ID específico está dentro da lista de expandidos
              const expandido = expandidos.includes(pedido._id);
              
              return (
                <div key={pedido._id} className={`bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col transition-all duration-300 relative overflow-hidden ${expandido ? 'shadow-xl ring-2 ring-elos-bege/30' : 'hover:shadow-md hover:border-gray-200'}`}>
                  
                  <div className={`absolute left-0 top-0 bottom-0 w-2 transition-all ${
                    pedido.status === 'AGUARDANDO_PAGAMENTO' ? 'bg-yellow-400' :
                    pedido.status === 'PAGO' ? 'bg-blue-500' :
                    pedido.status === 'CONCLUIDO' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>

                  {/* CABEÇALHO RESUMIDO (Sempre visível e Clicável) */}
                  <div onClick={() => toggleExpandir(pedido._id)} className="p-5 pl-7 cursor-pointer select-none">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-black text-xl text-elos-verde tracking-tight">#{pedido.numeroPedidoOnline}</h3>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')} às {new Date(pedido.dataPedido).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${getEstiloStatus(pedido.status)}`}>
                          {getTextoStatus(pedido.status).split(' ')[1] || getTextoStatus(pedido.status)}
                        </span>
                        <span className="text-gray-300 text-lg transition-transform duration-300" style={{ transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-1">
                      <p className="text-sm font-bold text-elos-texto line-clamp-1">{pedido.clienteNome}</p>
                      <span className="text-sm font-black text-elos-verde tracking-tight whitespace-nowrap ml-2">
                        {Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* CORPO EXPANDIDO */}
                  {expandido && (
                    <div className="px-5 pb-5 pl-7 animate-in slide-in-from-top-4 fade-in duration-300 border-t border-gray-50 pt-4">
                      
                      <div className="mb-4 space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-400 font-bold tracking-widest">📞 {pedido.clienteTelefone}</p>
                          {pedido.clienteTelefone && (
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${pedido.clienteTelefone.replace(/\D/g, '')}`, '_blank'); }} className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-md font-bold uppercase hover:bg-green-100 transition-colors">
                              💬 WhatsApp
                            </button>
                          )}
                        </div>
                        {pedido.clienteCpf && <p className="text-xs text-gray-400 font-bold tracking-widest">📄 CPF: {pedido.clienteCpf}</p>}
                      </div>

                      <div className="mb-4 bg-orange-50/50 p-3 rounded-xl border border-orange-100/50 relative group">
                        <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">📍 Endereço de Entrega</p>
                        <p className="text-xs text-elos-texto font-medium leading-relaxed pr-8">
                          {pedido.clienteEndereco || "O cliente não informou endereço neste pedido."}
                        </p>
                        {pedido.clienteEndereco && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(pedido.clienteEndereco);
                              alert("Endereço copiado!");
                            }} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-orange-100 text-gray-400 flex items-center justify-center hover:bg-orange-100 hover:text-orange-600 transition-colors shadow-sm"
                            title="Copiar Endereço"
                          >
                            📋
                          </button>
                        )}
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
                            <button onClick={(e) => { e.stopPropagation(); atualizarStatus(pedido._id, 'PAGO'); }} className="col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">
                              💰 Recebido (PIX)
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); atualizarStatus(pedido._id, 'CANCELADO'); }} className="col-span-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-colors">
                              Cancelar Pedido
                            </button>
                          </>
                        )}

                        {pedido.status === 'PAGO' && (
                          <button onClick={(e) => { e.stopPropagation(); atualizarStatus(pedido._id, 'CONCLUIDO'); }} className="col-span-2 bg-elos-verde hover:bg-[#3a4a3e] text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                            <span className="text-lg">📦</span> Confirmar Despacho
                          </button>
                        )}

                        {(pedido.status === 'CONCLUIDO' || pedido.status === 'CANCELADO') && (
                          <p className="col-span-2 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            Pedido Arquivado
                          </p>
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
    </div>
  );
}