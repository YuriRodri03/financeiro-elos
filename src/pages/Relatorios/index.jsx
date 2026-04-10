import React from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function RelatorioInadimplencia() {
  const { vendas, clientes } = useFinanceiro();

  const obterParcelasVencidasInfo = (venda) => {
    const hoje = new Date();
    return (venda.listaParcelas || []).filter(p => {
      if (p.paga) return false;
      const dataVencimento = new Date(venda.dataVenda + 'T00:00:00');
      dataVencimento.setMonth(dataVencimento.getMonth() + (p.numero - 1));
      return dataVencimento < hoje;
    }).map(p => {
      const dataVenc = new Date(venda.dataVenda + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + (p.numero - 1));
      return { ...p, dataVencimentoReal: dataVenc };
    });
  };

  const calcularDiasDaParcelaMaisAntiga = (parcelasVencidas) => {
    if (parcelasVencidas.length === 0) return 0;
    const hoje = new Date();
    const datas = parcelasVencidas.map(p => p.dataVencimentoReal);
    const maisAntiga = new Date(Math.min(...datas));
    const diffTime = Math.abs(hoje - maisAntiga);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const listaInadimplentes = vendas.map(v => {
    const parcelasVencidas = obterParcelasVencidasInfo(v);
    const valorAtrasado = parcelasVencidas.reduce((acc, p) => acc + p.valor, 0);
    const diasDeAtrasoReal = calcularDiasDaParcelaMaisAntiga(parcelasVencidas);

    return { ...v, parcelasVencidas, valorAtrasado, dias: diasDeAtrasoReal };
  }).filter(v => v.valorAtrasado > 0)
    .sort((a, b) => b.dias - a.dias);

  const abrirWhatsApp = (venda) => {
    const cadastroDoCliente = clientes.find(c => c.cpf === venda.cpf);
    const telefoneDestino = cadastroDoCliente?.telefone || venda.telefone;
    const foneLimpo = telefoneDestino?.replace(/\D/g, "");
    
    if (!foneLimpo || foneLimpo.length < 10) {
      return alert(`O cliente ${venda.cliente} não possui um telefone válido.`);
    }
    
    const mensagem = `Olá ${venda.cliente}, tudo bem? Aqui é da Ótica Elos. 🤓 Notamos que constam parcelas pendentes da sua compra de ${venda.produto}. Poderia nos ajudar a regularizar?`;
    window.open(`https://wa.me/55${foneLimpo}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6">
          <h1 className="font-tradicional text-3xl md:text-4xl text-elos-verde italic">
            Relatório de Cobrança
          </h1>
          <p className="text-gray-400 text-sm mt-2 uppercase tracking-[0.2em]">Fluxo de Inadimplência Real</p>
        </header>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-3xl shadow-soft border-l-8 border-red-600">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Vencido Hoje</h3>
            <p className="text-4xl font-black text-red-700 mt-2">
              R$ {listaInadimplentes.reduce((acc, v) => acc + v.valorAtrasado, 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-soft border-l-8 border-orange-500">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clientes em Atraso</h3>
            <p className="text-4xl font-black text-elos-texto mt-2">{listaInadimplentes.length}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-elos-verde text-white">
                <tr>
                  <th className="p-5 text-xs uppercase tracking-widest font-semibold">Cliente</th>
                  <th className="p-5 text-xs uppercase tracking-widest font-semibold">Parcelas Vencidas</th>
                  <th className="p-5 text-xs uppercase tracking-widest font-semibold">Atraso</th>
                  <th className="p-5 text-xs uppercase tracking-widest font-semibold">Total em Dívida</th>
                  <th className="p-5 text-xs uppercase tracking-widest font-semibold text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listaInadimplentes.length > 0 ? (
                  listaInadimplentes.map(v => (
                    <tr key={v._id || v.id} className="hover:bg-elos-fundo/50 transition-colors">
                      <td className="p-5">
                        <div className="font-bold text-elos-verde">{v.cliente}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mt-1">{v.produto}</div>
                      </td>
                      <td className="p-5">
                        <div className="space-y-1">
                          {v.parcelasVencidas.map(p => (
                            <span key={p.numero} className="block text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit">
                              {p.numero}ª parc • <span className="font-bold italic">{p.dataVencimentoReal.toLocaleDateString()}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${
                          v.dias > 60 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          {v.dias} dias
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="text-lg font-black text-red-600">
                          R$ {v.valorAtrasado.toFixed(2).replace('.', ',')}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-green-200 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                          onClick={() => abrirWhatsApp(v)}
                        >
                          <span>💬</span> Cobrar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-gray-400 italic">
                      Tudo em dia por aqui! 👓✨
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}