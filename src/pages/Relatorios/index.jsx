import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function RelatorioInadimplencia() {
  // Ajustado para 'editarVenda', que é o nome da função que está no seu FinanceiroContext
  const { vendas, clientes, editarVenda } = useFinanceiro();
  const [dataPrevisaoTemp, setDataPrevisaoTemp] = useState({});

  // --- ESTADO PARA NOTIFICAÇÕES TOAST PREMIUM ---
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  // 1. Lógica para identificar QUALQUER parcela vencida (sem carência de 30 dias)
  const obterParcelasVencidas = (venda) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas

    return (venda.listaParcelas || []).filter(p => {
      if (p.paga) return false;
      
      // Calcula a data de vencimento (venda + meses da parcela)
      const dataVencimento = new Date(venda.dataVenda + 'T00:00:00');
      dataVencimento.setMonth(dataVencimento.getMonth() + (p.numero - 1));
      
      // Se a data de vencimento for menor que hoje, está atrasada
      return dataVencimento < hoje;
    }).map(p => {
      const dataVenc = new Date(venda.dataVenda + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + (p.numero - 1));
      return { ...p, dataVencimentoReal: dataVenc };
    });
  };

  const salvarPrevisao = async (vendaId, data) => {
    try {
      // Sincronizado com a rota PATCH e com o Mongoose do backend através do editarVenda
      await editarVenda(vendaId, { dataPrevisaoPagamento: data });
      mostrarToast("Prazo de pagamento registrado com sucesso!", "sucesso");
    } catch (error) {
      mostrarToast("Erro ao salvar prazo de previsão no banco.", "erro");
    }
  };

  const hojeStr = new Date().toISOString().split('T')[0];

  const listaInadimplentes = vendas
    .map(v => {
      const parcelasVencidas = obterParcelasVencidas(v);
      const valorAtrasado = parcelasVencidas.reduce((acc, p) => acc + p.valor, 0);
      
      let dias = 0;
      if (parcelasVencidas.length > 0) {
        const maisAntiga = new Date(Math.min(...parcelasVencidas.map(p => p.dataVencimentoReal)));
        const hoje = new Date();
        dias = Math.ceil(Math.abs(hoje - maisAntiga) / (1000 * 60 * 60 * 24));
      }

      return { ...v, parcelasVencidas, valorAtrasado, dias };
    })
    .filter(v => v.valorAtrasado > 0)
    .sort((a, b) => b.dias - a.dias);

  const abrirWhatsApp = (venda) => {
    const cadastroDoCliente = clientes.find(c => c.cpf === venda.cpf);
    const foneLimpo = (cadastroDoCliente?.telefone || venda.telefone)?.replace(/\D/g, "");
    if (!foneLimpo) {
      mostrarToast("Este cliente não possui WhatsApp válido em seu cadastro.", "erro");
      return;
    }
    
    const mensagem = `Olá ${venda.cliente}, tudo bem? Aqui é da Ótica Elos. 🤓 Notamos que constam parcelas pendentes no seu cadastro. Poderia nos ajudar a regularizar?`;
    window.open(`https://wa.me/55${foneLimpo}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

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

      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Painel de Cobrança</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Listagem Geral de Atrasos</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[2rem] shadow-soft border-t-8 border-red-600">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dívida Total Vencida</h3>
            <p className="text-4xl font-black text-red-700 mt-2">
              R$ {listaInadimplentes.reduce((acc, v) => acc + v.valorAtrasado, 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-soft border-t-8 border-elos-verde">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Clientes</h3>
            <p className="text-4xl font-black text-elos-verde mt-2">{listaInadimplentes.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border border-elos-bege/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-elos-fundo text-elos-verde border-b border-gray-100">
                <tr className="text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-6">Cliente / Contrato</th>
                  <th className="px-8 py-6">Vencimentos</th>
                  <th className="px-8 py-6">Dívida / Atraso</th>
                  <th className="px-8 py-6">Dar Prazo (Previsão)</th>
                  <th className="px-8 py-6 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listaInadimplentes.map(v => {
                  const temPrazoFuturo = v.dataPrevisaoPagamento && v.dataPrevisaoPagamento > hojeStr;
                  const prazoVenceuHj = v.dataPrevisaoPagamento && v.dataPrevisaoPagamento <= hojeStr;

                  return (
                    <tr key={v._id || v.id} className={`transition-all ${temPrazoFuturo ? 'opacity-40 bg-gray-50' : 'hover:bg-elos-fundo/30'}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-elos-texto">{v.cliente}</span>
                            {temPrazoFuturo && (
                              <span className="text-[8px] bg-elos-bege text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Agendado</span>
                            )}
                            {prazoVenceuHj && (
                              <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">⚠️ Prazo Vencido</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase font-black truncate max-w-[200px]">{v.produto}</div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1">
                          {v.parcelasVencidas.map(p => (
                            <span key={p.numero} className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold border border-red-100">
                              {p.numero === 0 ? 'Entrada' : `${p.numero}ª parc`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-red-600">R$ {v.valorAtrasado.toFixed(2).replace('.', ',')}</div>
                        <div className="text-[10px] font-bold text-orange-500 uppercase italic">{v.dias} dias</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <input 
                            type="date" 
                            defaultValue={v.dataPrevisaoPagamento || ""}
                            className="text-[11px] p-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-elos-bege"
                            onChange={(e) => setDataPrevisaoTemp({...dataPrevisaoTemp, [v._id || v.id]: e.target.value})}
                          />
                          <button 
                            onClick={() => {
                              const targetId = v._id || v.id;
                              if(dataPrevisaoTemp[targetId]) salvarPrevisao(targetId, dataPrevisaoTemp[targetId]);
                            }}
                            className="p-2 bg-elos-bege text-white rounded-lg hover:bg-elos-verde transition-colors"
                          >
                            OK
                          </button>
                        </div>
                        {v.dataPrevisaoPagamento && (
                           <p className={`text-[9px] mt-1 font-bold italic ${prazoVenceuHj ? 'text-red-600' : 'text-elos-bege'}`}>
                             {prazoVenceuHj ? `Vencido em: ` : `Prometeu p/: `}
                             {v.dataPrevisaoPagamento.split('-').reverse().join('/')}
                           </p>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 mx-auto transition-all active:scale-95 ${temPrazoFuturo ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                          onClick={() => !temPrazoFuturo && abrirWhatsApp(v)}
                        >
                          Cobrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {listaInadimplentes.length === 0 && (
              <div className="p-20 text-center text-gray-300 italic font-tradicional text-xl">
                Nenhuma parcela vencida até o momento! 👓✨
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}