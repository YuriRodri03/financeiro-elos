import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFSaudeFinanceira } from '../../documentosUtils';

export default function Dashboard() {
  const { vendas, despesas, carregando } = useFinanceiro();

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(dataAtual.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(dataAtual.getFullYear());
  const [modalTipo, setModalTipo] = useState(null);

  const [relatorioInicio, setRelatorioInicio] = useState('');
  const [relatorioFim, setRelatorioFim] = useState('');

  if (carregando) return null;

  const formatarMoeda = (valor) => {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

  // --- LÓGICA DO RELATÓRIO DE SAÚDE FINANCEIRA ---
  const handleGerarRelatorioSaude = () => {
    if (!relatorioInicio || !relatorioFim) {
      alert("Por favor, selecione as datas de início e fim.");
      return;
    }

    let entradasPeriodo = [];
    vendas.forEach(venda => {
      (venda.listaParcelas || []).forEach(p => {
        if (p.paga && p.dataPagamento >= relatorioInicio && p.dataPagamento <= relatorioFim) {
          entradasPeriodo.push({ 
            nome: venda.cliente, 
            valor: p.valor, 
            data: p.dataPagamento.split('-').reverse().join('/') 
          });
        }
      });
    });

    const saidasPeriodo = despesas.filter(d => 
      d.paga && d.vencimento >= relatorioInicio && d.vencimento <= relatorioFim
    ).map(d => ({ 
      nome: d.descricao, 
      valor: d.valor, 
      data: d.vencimento.split('-').reverse().join('/') 
    }));

    const totalEntradas = entradasPeriodo.reduce((acc, i) => acc + i.valor, 0);
    const totalSaidas = saidasPeriodo.reduce((acc, i) => acc + i.valor, 0);

    const dadosRelatorio = { entradas: entradasPeriodo, saidas: saidasPeriodo, totalEntradas, totalSaidas };
    const periodoFmt = { inicio: relatorioInicio.split('-').reverse().join('/'), fim: relatorioFim.split('-').reverse().join('/') };

    gerarPDFSaudeFinanceira(dadosRelatorio, periodoFmt);
  };

  // --- CÁLCULOS ---

  // 1. A RECEBER (Tudo que está pendente até a data atual filtrada)
  const detalhesAReceber = useMemo(() => {
    let lista = [];
    vendas.forEach(venda => {
      (venda.listaParcelas || []).forEach(p => {
        if (!p.paga) {
          const dataVenc = p.vencimentoOriginal 
            ? new Date(p.vencimentoOriginal + 'T00:00:00')
            : (() => {
                const d = new Date(venda.dataVenda + 'T00:00:00');
                d.setMonth(d.getMonth() + (p.numero - 1));
                return d;
              })();
          
          const dataLimite = new Date(anoFiltro, mesFiltro, 0, 23, 59, 59);
          if (dataVenc <= dataLimite) {
            lista.push({ nome: venda.cliente, valor: p.valor, info: p.numero === 0 ? "Entrada" : `${p.numero}ª Parcela`, vencimento: dataVenc });
          }
        }
      });
    });
    return lista.sort((a,b) => a.vencimento - b.vencimento);
  }, [vendas, mesFiltro, anoFiltro]);

  // 2. RECEBIDO NO CAIXA (Mês)
  const detalhesEntradas = useMemo(() => {
    let lista = [];
    vendas.forEach(venda => {
      (venda.listaParcelas || []).forEach(p => {
        if (p.paga && p.dataPagamento) {
          const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
          if ((dataPagto.getMonth() + 1) === Number(mesFiltro) && dataPagto.getFullYear() === Number(anoFiltro)) {
            lista.push({ nome: venda.cliente, valor: p.valor, info: p.dataPagamento.split('-').reverse().join('/') });
          }
        }
      });
    });
    return lista;
  }, [vendas, mesFiltro, anoFiltro]);

  // 3. DESPESAS (Mês)
  const detalhesDespesas = useMemo(() => {
    return despesas.filter(d => {
      const dataVenc = new Date(d.vencimento + 'T00:00:00');
      return (dataVenc.getMonth() + 1) === Number(mesFiltro) && dataVenc.getFullYear() === Number(anoFiltro);
    }).map(d => ({ nome: d.descricao, valor: d.valor, info: d.paga ? "✅ Paga" : "❌ Pendente", paga: d.paga }));
  }, [despesas, mesFiltro, anoFiltro]);

  const totalAReceberGeral = detalhesAReceber.reduce((acc, item) => acc + item.valor, 0);
  const totalNoCaixaMes = detalhesEntradas.reduce((acc, item) => acc + item.valor, 0);
  const totalDespesasPagasMes = detalhesDespesas.filter(d => d.paga).reduce((acc, item) => acc + item.valor, 0);
  const totalDespesasGeraisMes = detalhesDespesas.reduce((acc, item) => acc + item.valor, 0);
  const saldoLiquidoReal = totalNoCaixaMes - totalDespesasPagasMes;

  const vendasNovasNoMes = vendas.filter(v => {
    const dataV = new Date(v.dataVenda + 'T00:00:00');
    return (dataV.getMonth() + 1) === Number(mesFiltro) && dataV.getFullYear() === Number(anoFiltro);
  });
  const volumeVendasMes = vendasNovasNoMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);
  const ticketMedio = vendasNovasNoMes.length > 0 ? (volumeVendasMes / vendasNovasNoMes.length) : 0;
  const margemCaixa = volumeVendasMes > 0 ? (totalNoCaixaMes / volumeVendasMes) * 100 : 0;
  const faltamParaCusto = totalDespesasGeraisMes - totalNoCaixaMes;
  
  // Cálculo de Inadimplência Projetada para o Mês
  const totalEsperadoMes = totalNoCaixaMes + totalAReceberGeral;
  const indiceInadimplencia = totalEsperadoMes > 0 ? (totalAReceberGeral / totalEsperadoMes) * 100 : 0;

  // --- CÁLCULOS ANUAIS ---
  const totalNoCaixaAno = vendas.reduce((acc, venda) => {
    const parcelasPagasNoAno = (venda.listaParcelas || []).filter(p => {
      if (!p.paga || !p.dataPagamento) return false;
      const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
      return dataPagto.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasPagasNoAno.reduce((soma, p) => soma + p.valor, 0);
  }, 0);

  const totalDespesasAno = despesas.filter(d => d.paga).reduce((acc, d) => {
    const dataVenc = new Date(d.vencimento + 'T00:00:00');
    return dataVenc.getFullYear() === Number(anoFiltro) ? acc + d.valor : acc;
  }, 0);

  const volumeVendasAno = vendas.reduce((acc, v) => {
    const dataV = new Date(v.dataVenda + 'T00:00:00');
    return dataV.getFullYear() === Number(anoFiltro) ? acc + Number(v.valorTotal) : acc;
  }, 0);

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-elos-bege/30 pb-6 gap-6">
        <div className="text-center md:text-left">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Painel Financeiro</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold">Ótica Elos — Gestão de Resultados</p>
        </div>
        
        <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-soft border border-elos-bege/10">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Mês</label>
            <select className="bg-transparent font-bold outline-none cursor-pointer" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
              {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="w-[1px] bg-gray-100 mx-2"></div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Ano</label>
            <input type="number" className="bg-transparent font-bold w-16 outline-none" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} />
          </div>
        </div>
      </header>

      {/* SAÚDE FINANCEIRA */}
      <section className="bg-white p-6 rounded-3xl shadow-soft border border-elos-bege/20 mb-10">
        <h3 className="font-tradicional text-lg text-elos-verde mb-4 flex items-center gap-2">🏥 Saúde Financeira <span className="text-xs font-sans text-gray-400 font-normal uppercase italic tracking-tighter">(PDF por Período)</span></h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">Início</label>
            <input type="date" className="p-2 bg-elos-fundo rounded-xl border-none text-sm" value={relatorioInicio} onChange={(e) => setRelatorioInicio(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">Fim</label>
            <input type="date" className="p-2 bg-elos-fundo rounded-xl border-none text-sm" value={relatorioFim} onChange={(e) => setRelatorioFim(e.target.value)} />
          </div>
          <button onClick={handleGerarRelatorioSaude} className="bg-elos-verde hover:bg-elos-verde/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-elos-verde/20">
            📊 Baixar Balanço
          </button>
        </div>
      </section>

      {/* CARDS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div onClick={() => setModalTipo('entradas')} className="bg-white p-8 rounded-3xl shadow-soft border-t-8 border-green-600 cursor-pointer hover:scale-[1.02] transition-transform">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recebido (Caixa)</h3>
          <p className="text-3xl font-black text-green-700 mt-2">{formatarMoeda(totalNoCaixaMes)}</p>
          <p className="text-[10px] text-gray-300 mt-2 uppercase font-bold italic">Líquido entrado no mês</p>
        </div>
        <div onClick={() => setModalTipo('despesas')} className="bg-white p-8 rounded-3xl shadow-soft border-t-8 border-red-600 cursor-pointer hover:scale-[1.02] transition-transform">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pagos (Saídas)</h3>
          <p className="text-3xl font-black text-red-700 mt-2">- {formatarMoeda(totalDespesasPagasMes)}</p>
          <p className="text-[10px] text-gray-300 mt-2 uppercase font-bold italic">Saídas efetivadas</p>
        </div>
        <div className={`p-8 rounded-3xl shadow-soft border-t-8 bg-white transition-transform ${saldoLiquidoReal >= 0 ? 'border-elos-verde' : 'border-red-900'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo Líquido Real</h3>
          <p className={`text-3xl font-black mt-2 ${saldoLiquidoReal >= 0 ? 'text-elos-verde' : 'text-red-900'}`}>
            {formatarMoeda(saldoLiquidoReal)}
          </p>
          <div className="h-1 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-elos-bege" style={{width: `${Math.min((totalNoCaixaMes / (totalDespesasGeraisMes || 1)) * 100, 100)}%`}}></div>
          </div>
        </div>
      </div>

      {/* KPI'S DE PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-5 rounded-3xl border border-elos-bege/10 shadow-sm flex flex-col justify-center">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1 italic">Ticket Médio</h4>
          <p className="text-xl font-bold text-elos-verde">{formatarMoeda(ticketMedio)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-elos-bege/10 shadow-sm flex flex-col justify-center">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1 italic">Vendas Novos Contratos</h4>
          <p className="text-xl font-bold text-elos-verde">{vendasNovasNoMes.length}</p>
        </div>
        <div onClick={() => setModalTipo('receber')} className="bg-elos-bege/5 p-5 rounded-3xl border border-elos-bege/20 shadow-sm flex flex-col justify-center cursor-pointer hover:bg-elos-bege/10 transition-colors">
          <h4 className="text-[10px] font-black text-elos-bege uppercase tracking-tighter mb-1 italic">Dívida Acumulada</h4>
          <p className="text-xl font-bold text-elos-bege font-black">{formatarMoeda(totalAReceberGeral)}</p>
          <span className="text-[8px] text-elos-bege uppercase font-bold">Total a receber geral</span>
        </div>
        <div className="bg-elos-verde/5 p-5 rounded-3xl border border-elos-verde/20 shadow-sm flex flex-col justify-center">
          <h4 className="text-[10px] font-black text-elos-verde uppercase tracking-tighter mb-1 italic">Eficiência de Caixa</h4>
          <p className="text-xl font-bold text-elos-verde">{margemCaixa.toFixed(1)}%</p>
        </div>
      </div>

      {/* ANÁLISE DE RISCO E PONTO DE EQUILÍBRIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-tighter">Ponto de Equilíbrio</h4>
            <p className="text-[10px] text-gray-400 italic font-bold">Faltam p/ cobrir custos totais</p>
          </div>
          <strong className={`text-2xl ${faltamParaCusto <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {faltamParaCusto <= 0 ? "Custos Cobertos ✅" : formatarMoeda(faltamParaCusto)}
          </strong>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-tighter">Inadimplência Projetada</h4>
            <p className="text-[10px] text-gray-400 italic font-bold">Risco sobre o faturamento</p>
          </div>
          <strong className={`text-2xl ${indiceInadimplencia > 30 ? 'text-red-600' : 'text-elos-bege'}`}>{indiceInadimplencia.toFixed(1)}%</strong>
        </div>
      </div>

      {/* FATURAMENTO BRUTO */}
      <div className="grid grid-cols-1 gap-6 mb-10">
        <div className="bg-elos-verde p-8 rounded-3xl shadow-soft text-white border-l-8 border-[#3a4a3e]">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Faturamento Bruto (Novas Vendas do Mês)</h3>
          <p className="text-4xl font-black mt-2 text-white italic">{formatarMoeda(volumeVendasMes)}</p>
        </div>
      </div>

      {/* RESUMO ANUAL */}
      <h2 className="font-tradicional text-xl italic text-elos-verde mb-6 ml-2">Resumo Anual ({anoFiltro})</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl shadow-soft border-t-8 border-green-700">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recebido (Ano)</h3>
          <p className="text-2xl font-black text-green-700 mt-1">{formatarMoeda(totalNoCaixaAno)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border-t-8 border-red-700">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custos Pagos (Ano)</h3>
          <p className="text-2xl font-black text-red-700 mt-1">{formatarMoeda(totalDespesasAno)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border-t-8 border-elos-verde">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendas Brutas (Ano)</h3>
          <p className="text-2xl font-black text-elos-verde mt-1 font-tradicional italic">{formatarMoeda(volumeVendasAno)}</p>
        </div>
      </div>

      {/* VENDAS RECENTES */}
      <div className="bg-white rounded-3xl shadow-soft p-8">
        <h3 className="font-tradicional text-xl italic text-elos-verde mb-6 border-b pb-4">Contratos de {mesFiltro}/{anoFiltro}</h3>
        {vendasNovasNoMes.length > 0 ? (
          <div className="space-y-4">
            {vendasNovasNoMes.map(v => (
              <div key={v._id || v.id} className="flex justify-between items-center p-4 rounded-2xl hover:bg-elos-fundo transition-colors border-b border-gray-50">
                <div className="flex flex-col">
                  <span className="font-bold text-elos-verde">{v.cliente}</span>
                  <small className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Realizada em {v.dataVenda.split('-').reverse().join('/')}</small>
                </div>
                <strong className="text-lg font-black text-elos-texto italic">{formatarMoeda(v.valorTotal)}</strong>
              </div>
            ))}
          </div>
        ) : <p className="text-center text-gray-300 italic py-10">Nenhuma venda nova registrada neste mês.</p>}
      </div>

      {/* MODAL DETALHAMENTO */}
      {modalTipo && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <header className="p-6 bg-elos-fundo flex justify-between items-center border-b">
              <h2 className="font-tradicional text-xl text-elos-verde italic">
                {modalTipo === 'receber' ? 'Dívidas Acumuladas (Geral)' : 'Detalhamento do Mês'}
              </h2>
              <button onClick={() => setModalTipo(null)} className="text-2xl text-gray-400 hover:text-red-500">&times;</button>
            </header>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const dados = modalTipo === 'receber' ? detalhesAReceber : modalTipo === 'entradas' ? detalhesEntradas : detalhesDespesas;
                return dados.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="text-xs uppercase text-gray-400 border-b">
                      <tr>
                        <th className="pb-3">{modalTipo === 'despesas' ? 'Descrição' : 'Cliente'}</th>
                        <th className="pb-3 text-center">{modalTipo === 'receber' ? 'Vencimento' : 'Info'}</th>
                        <th className="pb-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dados.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-4 font-bold text-elos-verde">{item.nome}</td>
                          <td className="py-4 text-center text-xs text-gray-500 font-bold">
                            {modalTipo === 'receber' ? item.vencimento.toLocaleDateString() : item.info}
                          </td>
                          <td className="py-4 text-right font-black">{formatarMoeda(item.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-center text-gray-400 py-10 italic">Nenhum registro encontrado.</p>;
              })()}
            </div>
            <footer className="p-4 bg-gray-50 text-right">
              <button onClick={() => setModalTipo(null)} className="bg-elos-verde text-white px-8 py-2 rounded-xl font-bold">Fechar</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}