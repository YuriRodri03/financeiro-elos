import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gerarPDFOrdemServico } from '../../documentosUtils';

import { useVendas } from '../../hooks/useVendas';
import { useQueryClient } from '@tanstack/react-query';

export default function PainelOS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: vendas = [], isLoading: carregando } = useVendas();

  const [busca, setBusca] = useState('');
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null });

  // 🟢 Estados para escolher o Pedido antes de ir para /admin/nova-os/:numeroPedido
  const [modalEscolherPedido, setModalEscolherPedido] = useState(false);
  const [buscaPedidoModal, setBuscaPedidoModal] = useState('');

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, message: mensagem, acao });
  };

  const handleExcluirOS = (idOS) => {
    abrirConfirmacao("Deseja excluir esta Ordem de Serviço permanentemente?", async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://elos-server.onrender.com/api'; 
        const response = await fetch(`${baseUrl}/ordens_servico/${idOS}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          mostrarToast("Ordem de Serviço excluída com sucesso!", "sucesso");
          queryClient.invalidateQueries({ queryKey: ['vendas'] }); 
        } else {
          mostrarToast("Erro ao excluir OS no servidor.", "erro");
        }
      } catch (error) {
        mostrarToast("Erro de conexão ao tentar excluir a OS.", "erro");
      }
    });
  };

  const vendasFiltradasModal = useMemo(() => {
    const termo = buscaPedidoModal.toLowerCase();
    return (vendas || []).filter(v => {
      const cliente = String(v.cliente || '').toLowerCase();
      const num = String(v.numeroPedido || '').toLowerCase();
      const prod = String(v.produto || '').toLowerCase();
      return cliente.includes(termo) || num.includes(termo) || prod.includes(termo);
    }).slice(0, 20);
  }, [vendas, buscaPedidoModal]);

  const todasAsOS = useMemo(() => {
    let listaFlat = [];
    (vendas || []).forEach(venda => {
      if (venda.ordensServico && venda.ordensServico.length > 0) {
        venda.ordensServico.forEach((os, index) => {
          listaFlat.push({
            ...os,
            idVenda: venda._id || venda.id,
            cliente: venda.cliente || "Sem Nome",
            cpf: venda.cpf,
            dataVenda: venda.dataVenda,
            numeroPedido: venda.numeroPedido || "S/N",
            numeroOSFormatado: `${venda.numeroPedido || 'S/N'}-${index + 1}`
          });
        });
      }
    });
    
    return listaFlat.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));
  }, [vendas]);

  const osExibidas = todasAsOS.filter(os => {
    const termo = busca.toLowerCase();
    return (
      os.cliente.toLowerCase().includes(termo) ||
      os.numeroOSFormatado.toLowerCase().includes(termo) ||
      (os.armacao && os.armacao.toLowerCase().includes(termo))
    );
  });

  if (carregando) return null;

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
            toast.tipo === 'sucesso' ? 'bg-elos-verde text-white' : 'bg-red-900 text-red-100'
          }`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="text-4xl text-elos-verde">👓</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Ação</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ visivel: false, mensagem: '', acao: null })} className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase">Não</button>
              <button onClick={() => { if (confirmModal.acao) confirmModal.acao(); setConfirmModal({ visivel: false, mensagem: '', acao: null }); }} className="flex-1 py-3 bg-elos-verde text-white font-bold rounded-xl text-xs uppercase shadow-lg">Sim, Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL PARA ESCOLHER A VENDA E IR PARA /admin/nova-os/:numeroPedido */}
      {modalEscolherPedido && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-tradicional text-2xl italic text-elos-verde font-bold">Vincular Ordem de Serviço</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-0.5">
                  Selecione o pedido do cliente para abrir a ficha da OS
                </p>
              </div>
              <button 
                onClick={() => setModalEscolherPedido(false)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <input
              type="text"
              placeholder="🔍 Buscar por nome do cliente ou nº do pedido..."
              value={buscaPedidoModal}
              onChange={(e) => setBuscaPedidoModal(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-elos-fundo rounded-xl border border-gray-200 text-xs font-bold outline-none focus:border-elos-bege"
            />

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {vendasFiltradasModal.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8 italic">Nenhuma venda encontrada.</p>
              ) : (
                vendasFiltradasModal.map(venda => {
                  const identificador = venda.numeroPedido ? String(venda.numeroPedido) : String(venda._id);
                  const dataBr = venda.dataVenda ? venda.dataVenda.split('-').reverse().join('/') : '--/--/----';
                  return (
                    <button
                      key={venda._id}
                      type="button"
                      onClick={() => {
                        setModalEscolherPedido(false);
                        navigate(`/admin/nova-os/${identificador}`);
                      }}
                      className="w-full text-left p-3.5 rounded-2xl border border-gray-100 hover:border-elos-bege hover:bg-elos-fundo/50 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-elos-verde/10 text-elos-verde px-2 py-0.5 rounded-md">
                            #{venda.numeroPedido || 'S/N'}
                          </span>
                          <span className="text-xs font-bold text-elos-texto group-hover:text-elos-verde">
                            {venda.cliente}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate max-w-xs mt-1">
                          {venda.produto} • {dataBr}
                        </p>
                      </div>
                      <span className="text-xs font-black text-elos-bege group-hover:translate-x-1 transition-transform">
                        Abrir OS ➔
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER ATUALIZADO */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Ordens de Serviço</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black italic">Gestão centralizada de laboratório</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* 🟢 AGORA ABRE O SELETOR E NAVEGA PARA /admin/nova-os/:numeroPedido */}
          <button 
            onClick={() => setModalEscolherPedido(true)} 
            className="w-full md:w-auto px-6 py-3 bg-elos-bege hover:bg-elos-verde text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="text-sm">➕</span> Nova OS
          </button>
          
          <input 
            type="text" 
            className="px-6 py-3 bg-white rounded-2xl shadow-soft border border-elos-bege/20 focus:outline-none text-sm w-full md:w-80" 
            placeholder="🔍 Buscar cliente, nº OS ou armação..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
          />
        </div>
      </header>

      {/* ESTATÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-elos-bege/20 shadow-sm flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-elos-verde">{todasAsOS.length}</span>
          <span className="text-[9px] uppercase font-bold text-gray-400 mt-1 tracking-widest">Total de OS</span>
        </div>
      </div>

      {/* TABELA DE OSs */}
      <div className="bg-white rounded-3xl shadow-soft overflow-hidden border border-elos-bege/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-elos-fundo/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5">OS Nº</th>
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Paciente / Cliente</th>
                <th className="px-6 py-5">Lente / Armação</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {osExibidas.length > 0 ? (
                osExibidas.map((os) => (
                  <tr key={os.idOS} className="hover:bg-elos-fundo/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="bg-elos-verde/10 text-elos-verde px-3 py-1 rounded-lg text-xs font-black">
                        #{os.numeroOSFormatado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">
                      {os.dataVenda ? os.dataVenda.split('-').reverse().join('/') : '--/--/----'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-elos-texto">{os.paciente || os.consultor || os.cliente}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-tight">Pagante: {os.cliente}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-elos-texto truncate max-w-[200px]" title={os.lente}>{os.lente || 'Lente ñ informada'}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[200px]" title={os.armacao}>{os.armacao || 'Armação ñ informada'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => gerarPDFOrdemServico({ 
                            ...os, 
                            nomeCliente: os.cliente, 
                            dataVenda: os.dataVenda, 
                            numeroOS: os.numeroOSFormatado 
                          })}
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold uppercase hover:bg-elos-bege hover:text-white transition-colors"
                          title="Imprimir OS"
                        >
                          🖨️
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/ordem-servico/editar/${os.idOS}`)}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-colors"
                          title="Editar OS"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleExcluirOS(os.idOS)}
                          className="px-3 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                          title="Excluir OS"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-300 font-tradicional italic text-lg">
                    Nenhuma Ordem de Serviço encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}