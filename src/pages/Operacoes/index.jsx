import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Operacoes() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('TODOS'); // TODOS, AGUARDANDO_PAGAMENTO, PAGO, CONCLUIDO, CANCELADO
  const navigate = useNavigate();

  // 🟢 UTILIZA A VARIÁVEL DE AMBIENTE CONFIGURADA (VITE_API_URL)
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
    // Atualiza a tela de operações a cada 15 segundos automaticamente
    const intervalo = setInterval(buscarPedidosOnline, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const atualizarStatus = async (id, novoStatus) => {
    // Se for efetivar a venda, vamos colocar um alerta que a integração com estoque vem na próxima etapa
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
      if (res.ok) {
        buscarPedidosOnline(); // Recarrega a lista
      }
    } catch (error) {
      alert("Erro ao atualizar status do pedido.");
    }
  };

  // Função auxiliar para pintar as tags de status
  const getEstiloStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PAGO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CONCLUIDO': return 'bg-green-100 text-green-700 border-green-200';
      case 'CANCELADO': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTextoStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return '⏳ Aguardando Pagamento';
      case 'PAGO': return '💰 Pagamento Aprovado';
      case 'CONCLUIDO': return '✅ Venda Concluída';
      case 'CANCELADO': return '❌ Cancelado';
      default: return status;
    }
  };

  const pedidosExibidos = filtroStatus === 'TODOS' 
    ? pedidos 
    : pedidos.filter(p => p.status === filtroStatus);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-elos-fundo">
        <p className="text-elos-verde font-bold animate-pulse">Carregando painel de operações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-elos-bege/20 pb-6">
          <div>
            <h1 className="font-tradicional text-4xl text-elos-verde italic">
              Operações Online
            </h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">
              Gestão de Pedidos da Loja Virtual
            </p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm"
          >
            ⬅ Voltar ao Início
          </button>
        </header>

        {/* FILTROS DE STATUS */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {['TODOS', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CONCLUIDO', 'CANCELADO'].map(status => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filtroStatus === status 
                ? 'bg-elos-verde text-white shadow-md' 
                : 'text-gray-400 hover:text-elos-verde hover:bg-elos-fundo'
              }`}
            >
              {status === 'TODOS' ? '📋 Todos' : getTextoStatus(status)}
            </button>
          ))}
        </div>

        {/* LISTA DE PEDIDOS (GRID) */}
        {pedidosExibidos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] shadow-sm border border-gray-100">
            <span className="text-5xl opacity-20 block mb-4">📦</span>
            <p className="text-gray-400 italic">Nenhum pedido encontrado com este status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pedidosExibidos.map((pedido) => (
              <div key={pedido._id} className="bg-white rounded-3xl p-6 shadow-soft border border-gray-100 flex flex-col hover:shadow-lg transition-shadow">
                
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                  <div>
                    <h3 className="font-black text-xl text-elos-verde">
                      #{pedido.numeroPedidoOnline}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      {new Date(pedido.dataPedido).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getEstiloStatus(pedido.status)}`}>
                    {getTextoStatus(pedido.status).split(' ')[1] || getTextoStatus(pedido.status)}
                  </span>
                </div>

                {/* Dados do Cliente */}
                <div className="mb-4">
                  <p className="text-sm font-bold text-elos-texto">{pedido.clienteNome}</p>
                  <p className="text-xs text-gray-500 mt-1">📞 {pedido.clienteTelefone}</p>
                  {pedido.clienteCpf && <p className="text-xs text-gray-500 mt-1">📄 CPF: {pedido.clienteCpf}</p>}
                </div>

                {/* Itens Comprados */}
                <div className="mb-6 flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b border-gray-200 pb-1">
                    Itens ({pedido.itens?.length || 0})
                  </p>
                  <ul className="space-y-2">
                    {(pedido.itens || []).map((item, idx) => (
                      <li key={idx} className="flex justify-between items-start text-xs">
                        <span className="font-bold text-gray-700 line-clamp-1 flex-1 pr-2">
                          1x {item.nome}
                        </span>
                        <span className="text-elos-verde font-black whitespace-nowrap">
                          {Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Rodapé do Card (Valor e Botões) */}
                <div className="mt-auto border-t border-gray-50 pt-4 flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Total Pedido</span>
                    <span className="text-2xl font-black text-elos-verde">
                      {Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {/* 🟢 BOTÕES DE AÇÃO DINÂMICOS POR STATUS */}
                  <div className="flex flex-col gap-2 mt-2">
                    
                    {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
                      <>
                        <button onClick={() => atualizarStatus(pedido._id, 'PAGO')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm">
                          💰 Marcar como Pago
                        </button>
                        <button onClick={() => atualizarStatus(pedido._id, 'CANCELADO')} className="w-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 font-bold py-2 rounded-xl text-xs uppercase tracking-widest transition-colors">
                          Cancelar Pedido
                        </button>
                      </>
                    )}

                    {pedido.status === 'PAGO' && (
                      <button onClick={() => atualizarStatus(pedido._id, 'CONCLUIDO')} className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm flex items-center justify-center gap-2">
                        <span>📦</span> Efetivar Venda
                      </button>
                    )}

                    {(pedido.status === 'CONCLUIDO' || pedido.status === 'CANCELADO') && (
                      <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold py-2">
                        Nenhuma ação pendente
                      </p>
                    )}
                    
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}