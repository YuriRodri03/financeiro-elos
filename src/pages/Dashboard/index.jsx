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
      d.vencimento >= relatorioInicio && d.vencimento <= relatorioFim
    ).map(d => ({ 
      nome: d.descricao, 
      valor: d.valor, 
      data: d.vencimento.split('-').reverse().join('/') 
    }));

    const totalEntradas = entradasPeriodo.reduce((acc, i) => acc + i.valor, 0);
    const totalSaidas = saidasPeriodo.reduce((acc, i) => acc + i.valor, 0);

    if (entradasPeriodo.length === 0 && saidasPeriodo.length === 0) {
      alert("Nenhuma movimentação encontrada neste período.");
      return;
    }

    const dadosRelatorio = { entradas: entradasPeriodo, saidas: saidasPeriodo, totalEntradas, totalSaidas };
    const periodoFmt = { inicio: relatorioInicio.split('-').reverse().join('/'), fim: relatorioFim.split('-').reverse().join('/') };

    gerarPDFSaudeFinanceira(dadosRelatorio, periodoFmt);
  };

  // --- CÁLCULOS (MANTIDOS) ---
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
          if ((dataVenc.getMonth() + 1) === Number(mesFiltro) && dataVenc.getFullYear() === Number(anoFiltro)) {
            lista.push({ nome: venda.cliente, valor: p.valor, info: p.numero === 0 ? "Entrada" : `${p.numero}ª Parcela` });
          }
        }
      });
    });
    return lista;
  }, [vendas, mesFiltro, anoFiltro]);

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

  const detalhesDespesas = useMemo(() => {
    return despesas.filter(d => {
      const dataVenc = new Date(d.vencimento + 'T00:00:00');
      return (dataVenc.getMonth() + 1) === Number(mesFiltro) && dataVenc.getFullYear() === Number(anoFiltro);
    }).map(d => ({ nome: d.descricao, valor: d.valor, info: d.paga ? "✅ Paga" : "❌ Pendente" }));
  }, [despesas, mesFiltro, anoFiltro]);

  const totalAReceberMes = detalhesAReceber.reduce((acc, item) => acc + item.valor, 0);
  const totalNoCaixaMes = detalhesEntradas.reduce((acc, item) => acc + item.valor, 0);
  const totalDespesasMes = detalhesDespesas.reduce((acc, item) => acc + item.valor, 0);
  const saldoLiquidoMes = totalNoCaixaMes - totalDespesasMes;

  const vendasNovasNoMes = vendas.filter(v => {
    const dataV = new Date(v.dataVenda + 'T00:00:00');
    return (dataV.getMonth() + 1) === Number(mesFiltro) && dataV.getFullYear() === Number(anoFiltro);
  });
  const volumeVendasMes = vendasNovasNoMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);
  const margemCaixa = volumeVendasMes > 0 ? (totalNoCaixaMes / volumeVendasMes) * 100 : 0;
  const faltamParaCusto = totalDespesasMes - totalNoCaixaMes;
  const totalEsperadoMes = totalNoCaixaMes + totalAReceberMes;
  const indiceInadimplencia = totalEsperadoMes > 0 ? (totalAReceberMes / totalEsperadoMes) * 100 : 0;

  const totalNoCaixaAno = vendas.reduce((acc, venda) => {
    const parcelasPagasNoAno = (venda.listaParcelas || []).filter(p => {
      if (!p.paga || !p.dataPagamento) return false;
      const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
      return dataPagto.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasPagasNoAno.reduce((soma, p) => soma + p.valor, 0);
  }, 0);

  const totalDespesasAno = despesas.reduce((acc, d) => {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div onClick={() => setModalTipo('entradas')} className="bg-white p-8 rounded-3xl shadow-soft border-t-8 border-green-600 cursor-pointer hover:scale-[1.02] transition-transform">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recebido (Caixa)</h3>
          <p className="text-3xl font-black text-green-700 mt-2 whitespace-nowrap">R$ {totalNoCaixaMes.toFixed(2).replace('.', ',')}</p>
          <p className="text-[10px] text-gray-300 mt-2 uppercase font-bold tracking-tighter italic">Clique para ver detalhes</p>
        </div>
        <div onClick={() => setModalTipo('despesas')} className="bg-white p-8 rounded-3xl shadow-soft border-t-8 border-red-600 cursor-pointer hover:scale-[1.02] transition-transform">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contas (Saídas)</h3>
          <p className="text-3xl font-black text-red-700 mt-2 whitespace-nowrap">- R$ {totalDespesasMes.toFixed(2).replace('.', ',')}</p>
          <p className="text-[10px] text-gray-300 mt-2 uppercase font-bold tracking-tighter italic">Clique para ver detalhes</p>
        </div>
        <div className={`p-8 rounded-3xl shadow-soft border-t-8 bg-white transition-transform ${saldoLiquidoMes >= 0 ? 'border-elos-verde' : 'border-red-900'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo Líquido</h3>
          <p className={`text-3xl font-black mt-2 whitespace-nowrap ${saldoLiquidoMes >= 0 ? 'text-elos-verde' : 'text-red-900'}`}>
            R$ {saldoLiquidoMes.toFixed(2).replace('.', ',')}
          </p>
          <div className="h-1 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-elos-bege" style={{width: `${Math.min((totalNoCaixaMes / (totalDespesasMes || 1)) * 100, 100)}%`}}></div>
          </div>
        </div>
      </div>

      {/* ANÁLISE DE DESEMPENHO */}
      <h2 className="font-tradicional text-xl italic text-elos-verde mb-6 ml-2">Análise de Desempenho</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-elos-bege/10 p-6 rounded-3xl border border-elos-bege/20">
          <h4 className="text-xs font-black uppercase text-elos-bege mb-4 tracking-tighter">Eficiência de Caixa</h4>
          <div className="w-full h-2 bg-white rounded-full mb-3"><div className="h-full bg-elos-verde rounded-full" style={{ width: `${Math.min(margemCaixa, 100)}%` }}></div></div>
          <p className="text-sm font-bold text-elos-verde">{margemCaixa.toFixed(1)}% das vendas já entraram.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-tighter">Ponto de Equilíbrio</h4>
          <strong className={`text-xl ${faltamParaCusto <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {faltamParaCusto <= 0 ? "Custos Cobertos ✅" : `Faltam R$ ${faltamParaCusto.toFixed(2)}`}
          </strong>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-tighter">Risco de Crédito</h4>
          <strong className={`text-xl ${indiceInadimplencia > 30 ? 'text-red-600' : 'text-elos-bege'}`}>{indiceInadimplencia.toFixed(1)}%</strong>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Inadimplência Projetada</p>
        </div>
      </div>

      {/* GESTÃO DE CRÉDITO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div onClick={() => setModalTipo('receber')} className="bg-white p-8 rounded-3xl shadow-soft border-l-8 border-elos-bege cursor-pointer hover:bg-elos-fundo transition-all">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">A Receber (Mês)</h3>
          <p className="text-3xl font-black text-elos-bege mt-2">R$ {totalAReceberMes.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="bg-elos-verde p-8 rounded-3xl shadow-soft text-white">
          <h3 className="text-xs font-bold text-elos-verde/40 uppercase tracking-widest">Faturamento Bruto</h3>
          <p className="text-3xl font-black mt-2">R$ {volumeVendasMes.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      {/* VENDAS RECENTES */}
      <div className="bg-white rounded-3xl shadow-soft p-8">
        <h3 className="font-tradicional text-xl italic text-elos-verde mb-6">Contratos de {mesFiltro}/{anoFiltro}</h3>
        {vendasNovasNoMes.length > 0 ? (
          <div className="space-y-4">
            {vendasNovasNoMes.map(v => (
              <div key={v._id || v.id} className="flex justify-between items-center p-4 rounded-2xl hover:bg-elos-fundo transition-colors border-b border-gray-50">
                <div className="flex flex-col">
                  <span className="font-bold text-elos-verde">{v.cliente}</span>
                  <small className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Realizada em {v.dataVenda.split('-').reverse().join('/')}</small>
                </div>
                <strong className="text-lg font-black text-elos-texto italic">R$ {Number(v.valorTotal).toFixed(2).replace('.', ',')}</strong>
              </div>
            ))}
          </div>
        ) : <p className="text-center text-gray-300 italic py-10">Nenhuma venda nova neste mês.</p>}
      </div>

      {/* MODAL */}
      {modalTipo && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <header className="p-6 bg-elos-fundo flex justify-between items-center border-b">
              <h2 className="font-tradicional text-xl text-elos-verde">Detalhamento Financeiro</h2>
              <button onClick={() => setModalTipo(null)} className="text-2xl text-gray-400 hover:text-red-500 transition-colors">&times;</button>
            </header>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const dados = modalTipo === 'receber' ? detalhesAReceber : modalTipo === 'entradas' ? detalhesEntradas : detalhesDespesas;
                return dados.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="text-xs uppercase text-gray-400 border-b">
                      <tr><th className="pb-3">{modalTipo === 'despesas' ? 'Descrição' : 'Cliente'}</th><th className="pb-3 text-center">{modalTipo === 'despesas' ? 'Status' : 'Info'}</th><th className="pb-3 text-right">Valor</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dados.map((item, idx) => (
                        <tr key={idx} className="hover:bg-elos-fundo/30">
                          <td className="py-4 font-bold text-elos-verde">{item.nome}</td>
                          <td className="py-4 text-center text-xs text-gray-500 font-bold">{item.info}</td>
                          <td className="py-4 text-right font-black">R$ {item.valor.toFixed(2).replace('.', ',')}</td>
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