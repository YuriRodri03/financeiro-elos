import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFSaudeFinanceira } from '../../documentosUtils';

export default function Dashboard() {
  const { vendas, despesas, clientes, carregando } = useFinanceiro();

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(dataAtual.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(dataAtual.getFullYear());
  const [modalTipo, setModalTipo] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('mensal'); // 'mensal', 'anual', 'geral'

  const [relatorioInicio, setRelatorioInicio] = useState('');
  const [relatorioFim, setRelatorioFim] = useState('');

  const [ocultarValores, setOcultarValores] = useState(true);

  const hojeLocalStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`;
  const [dataAniversario, setDataAniversario] = useState(hojeLocalStr);

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 3500);
  };

  if (carregando) return null;

  const formatarMoeda = (valor) => {
    if (ocultarValores) return "****";
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, '\u00A0');
  };

  // --- PDF ---
  const handleGerarRelatorioSaude = () => {
    if (!relatorioInicio || !relatorioFim) {
      mostrarToast("Selecione o período para emitir o balanço.", "erro");
      return;
    }
    let entradasPeriodo = [];
    vendas.forEach(v => {
      (v.listaParcelas || []).forEach(p => {
        if (p.paga && p.dataPagamento >= relatorioInicio && p.dataPagamento <= relatorioFim) {
          entradasPeriodo.push({ nome: v.cliente, valor: p.valor, data: p.dataPagamento.split('-').reverse().join('/') });
        }
      });
    });
    const saidasPeriodo = despesas.filter(d => d.paga && d.vencimento >= relatorioInicio && d.vencimento <= relatorioFim)
      .map(d => ({ nome: d.descricao, valor: d.valor, data: d.vencimento.split('-').reverse().join('/') }));

    const dadosRelatorio = { 
      entradas: entradasPeriodo, 
      saidas: saidasPeriodo, 
      totalEntradas: entradasPeriodo.reduce((acc, i) => acc + i.valor, 0), 
      totalSaidas: saidasPeriodo.reduce((acc, i) => acc + i.valor, 0) 
    };
    gerarPDFSaudeFinanceira(dadosRelatorio, { inicio: relatorioInicio.split('-').reverse().join('/'), fim: relatorioFim.split('-').reverse().join('/') });
    mostrarToast("Balanço gerado com sucesso!", "sucesso");
  };

  // --- ANIVERSARIANTES ---
  const aniversariantesDoDia = useMemo(() => {
    if (!clientes || !dataAniversario) return [];
    const [, mesFiltroAniv, diaFiltroAniv] = dataAniversario.split('-');
    return clientes.filter(c => {
      if (!c.dataNascimento) return false;
      const [, mesCli, diaCli] = c.dataNascimento.split('-');
      return mesCli === mesFiltroAniv && diaCli === diaFiltroAniv;
    });
  }, [clientes, dataAniversario]);

  // --- CÁLCULOS GERAIS ---
  const saldoCaixaAtualGeral = useMemo(() => {
    let arrecadado = 0;
    vendas.forEach(v => (v.listaParcelas || []).forEach(p => { if (p.paga) arrecadado += p.valor; }));
    const despesasPagas = despesas.filter(d => d.paga).reduce((acc, d) => acc + d.valor, 0);
    return arrecadado - despesasPagas;
  }, [vendas, despesas]);

  const detalhesAReceber = useMemo(() => {
    let lista = [];
    vendas.forEach(v => {
      (v.listaParcelas || []).forEach(p => {
        if (!p.paga) {
          const dataVenc = p.vencimentoOriginal ? new Date(p.vencimentoOriginal + 'T00:00:00') : new Date(new Date(v.dataVenda + 'T00:00:00').setMonth(new Date(v.dataVenda + 'T00:00:00').getMonth() + (p.numero - 1)));
          if (dataVenc <= new Date(anoFiltro, mesFiltro, 0, 23, 59, 59)) {
            lista.push({ nome: v.cliente, valor: p.valor, info: p.numero === 0 ? "Entrada" : `${p.numero}ª Parc`, vencimento: dataVenc });
          }
        }
      });
    });
    return lista.sort((a,b) => a.vencimento - b.vencimento);
  }, [vendas, mesFiltro, anoFiltro]);

  const detalhesEntradas = useMemo(() => {
    let lista = [];
    vendas.forEach(v => {
      (v.listaParcelas || []).forEach(p => {
        if (p.paga && p.dataPagamento) {
          const d = new Date(p.dataPagamento + 'T00:00:00');
          if ((d.getMonth() + 1) === Number(mesFiltro) && d.getFullYear() === Number(anoFiltro)) lista.push({ nome: v.cliente, valor: p.valor, info: p.dataPagamento.split('-').reverse().join('/') });
        }
      });
    });
    return lista;
  }, [vendas, mesFiltro, anoFiltro]);

  const detalhesDespesas = useMemo(() => despesas.filter(d => {
    const dv = new Date(d.vencimento + 'T00:00:00');
    return (dv.getMonth() + 1) === Number(mesFiltro) && dv.getFullYear() === Number(anoFiltro);
  }).map(d => ({ nome: d.descricao, valor: d.valor, info: d.paga ? "✅ Paga" : "❌ Pendente", paga: d.paga })), [despesas, mesFiltro, anoFiltro]);

  const totalAReceberGeral = detalhesAReceber.reduce((acc, i) => acc + i.valor, 0);
  const totalNoCaixaMes = detalhesEntradas.reduce((acc, i) => acc + i.valor, 0);
  const totalDespesasPagasMes = detalhesDespesas.filter(d => d.paga).reduce((acc, i) => acc + i.valor, 0);
  const totalDespesasGeraisMes = detalhesDespesas.reduce((acc, i) => acc + i.valor, 0);
  const saldoLiquidoReal = totalNoCaixaMes - totalDespesasPagasMes;

  const vendasNovasNoMes = vendas.filter(v => {
    const d = new Date(v.dataVenda + 'T00:00:00');
    return (d.getMonth() + 1) === Number(mesFiltro) && d.getFullYear() === Number(anoFiltro);
  });
  
  const volumeVendasMes = vendasNovasNoMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);
  const ticketMedio = vendasNovasNoMes.length > 0 ? (volumeVendasMes / vendasNovasNoMes.length) : 0;
  const faltamParaCusto = totalDespesasGeraisMes - totalNoCaixaMes;
  const indiceInadimplencia = (totalNoCaixaMes + totalAReceberGeral) > 0 ? (totalAReceberGeral / (totalNoCaixaMes + totalAReceberGeral)) * 100 : 0;

  // --- DADOS PARA O GRÁFICO ANUAL ---
  const dadosGraficoAnual = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dados = meses.map(m => ({ mes: m, receitas: 0, despesas: 0 }));

    vendas.forEach(v => {
      (v.listaParcelas || []).forEach(p => {
        if (p.paga && p.dataPagamento) {
          const d = new Date(p.dataPagamento + 'T00:00:00');
          if (d.getFullYear() === Number(anoFiltro)) dados[d.getMonth()].receitas += p.valor;
        }
      });
    });

    despesas.forEach(d => {
      if (d.paga && d.vencimento) {
        const dVenc = new Date(d.vencimento + 'T00:00:00');
        if (dVenc.getFullYear() === Number(anoFiltro)) dados[dVenc.getMonth()].despesas += d.valor;
      }
    });

    return dados;
  }, [vendas, despesas, anoFiltro]);

  const totalNoCaixaAno = dadosGraficoAnual.reduce((acc, m) => acc + m.receitas, 0);
  const totalDespesasAno = dadosGraficoAnual.reduce((acc, m) => acc + m.despesas, 0);
  const volumeVendasAno = vendas.reduce((acc, v) => new Date(v.dataVenda + 'T00:00:00').getFullYear() === Number(anoFiltro) ? acc + Number(v.valorTotal) : acc, 0);
  const maxValorGraficoAno = Math.max(...dadosGraficoAnual.map(d => Math.max(d.receitas, d.despesas)), 1); // Evita divisão por zero

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {/* TOAST */}
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${toast.tipo === 'sucesso' ? 'bg-elos-verde/95 border-elos-bege/30 text-white' : 'bg-red-900/95 border-red-500/30 text-red-100'}`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        
        {/* HEADER GERAL */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-tradicional text-4xl text-elos-verde italic">Painel Gerencial</h1>
              <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold">Ótica Elos — Performance e Caixa</p>
            </div>
            <button 
              onClick={() => setOcultarValores(!ocultarValores)}
              className="p-3 bg-white rounded-full shadow-soft border border-elos-bege/20 hover:bg-elos-fundo transition-all text-xl"
            >
              {ocultarValores ? "👁️‍🗨️" : "👁️"}
            </button>
          </div>

          {/* CONTROLE DE ABAS */}
          <div className="flex bg-white p-1.5 rounded-2xl shadow-soft border border-elos-bege/10 w-full md:w-auto">
            {[
              { id: 'mensal', label: 'Mensal' },
              { id: 'anual', label: 'Anual' },
              { id: 'geral', label: 'Geral & Op.' }
            ].map(aba => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex-1 md:w-32 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  abaAtiva === aba.id ? 'bg-elos-verde text-white shadow-md' : 'text-gray-400 hover:text-elos-verde'
                }`}
              >
                {aba.label}
              </button>
            ))}
          </div>
        </header>

        {/* =========================================
            ABA 1: VISÃO MENSAL
        ========================================== */}
        {abaAtiva === 'mensal' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* FILTRO MENSAL */}
            <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-elos-bege/10 w-fit mb-6">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Mês de Análise</label>
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

            {/* FATURAMENTO BRUTO */}
            <div className="bg-elos-verde p-8 rounded-[2rem] shadow-soft text-white border-l-[12px] border-[#3a4a3e] relative overflow-hidden mb-6">
              <div className="relative z-10">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-[0.2em]">Faturamento Bruto (Novas Vendas)</h3>
                <p className="text-4xl md:text-5xl font-black mt-2 text-white italic">{formatarMoeda(volumeVendasMes)}</p>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-white/[0.05] text-9xl font-black italic select-none">MÊS</div>
            </div>

            {/* RECEITA VS DESPESA (CARDS CLICÁVEIS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div onClick={() => setModalTipo('entradas')} className="bg-white p-6 rounded-[2rem] shadow-soft border-t-8 border-green-600 cursor-pointer hover:scale-[1.02] transition-transform flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entradas (Caixa)</h3>
                  <p className="text-3xl font-black text-green-700 mt-1">{formatarMoeda(totalNoCaixaMes)}</p>
                </div>
                <div className="text-green-100 text-4xl">📈</div>
              </div>
              
              <div onClick={() => setModalTipo('despesas')} className="bg-white p-6 rounded-[2rem] shadow-soft border-t-8 border-red-600 cursor-pointer hover:scale-[1.02] transition-transform flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saídas (Pagas)</h3>
                  <p className="text-3xl font-black text-red-700 mt-1">{ocultarValores ? "****" : `- ${formatarMoeda(totalDespesasPagasMes)}`}</p>
                </div>
                <div className="text-red-100 text-4xl">📉</div>
              </div>
            </div>

            {/* SALDO LÍQUIDO BARRA */}
            <div className={`p-6 mb-8 rounded-[2rem] shadow-soft border-l-8 bg-white transition-all ${saldoLiquidoReal >= 0 ? 'border-elos-verde' : 'border-red-900'}`}>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Líquido Real</h3>
                  <p className={`text-2xl font-black mt-1 ${saldoLiquidoReal >= 0 ? 'text-elos-verde' : 'text-red-900'}`}>{formatarMoeda(saldoLiquidoReal)}</p>
                </div>
                <div className="flex-1 w-full max-w-md">
                  <div className="flex justify-between text-[9px] uppercase font-black text-gray-400 mb-1">
                    <span>Despesas ({formatarMoeda(totalDespesasGeraisMes)})</span>
                    <span>Cobertura Caixa</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                    <div className="absolute top-0 left-0 h-full bg-elos-bege transition-all duration-1000" style={{width: `${Math.min((totalNoCaixaMes / (totalDespesasGeraisMes || 1)) * 100, 100)}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPIs MENSAL */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-3xl border border-elos-bege/10 shadow-sm flex flex-col justify-center">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Ticket Médio</h4>
                <p className="text-lg font-bold text-elos-verde">{formatarMoeda(ticketMedio)}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-elos-bege/10 shadow-sm flex flex-col justify-center">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Novos Contratos</h4>
                <p className="text-lg font-bold text-elos-verde">{vendasNovasNoMes.length}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Falta p/ Custos</h4>
                <p className={`text-lg font-black mt-1 ${faltamParaCusto <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {faltamParaCusto <= 0 ? "Cobertos ✅" : formatarMoeda(faltamParaCusto)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Inadimplência Risco</h4>
                <p className={`text-lg font-black mt-1 ${indiceInadimplencia > 30 ? 'text-red-600' : 'text-elos-bege'}`}>{indiceInadimplencia.toFixed(1)}%</p>
              </div>
            </div>

            {/* VENDAS RECENTES */}
            <div className="bg-white rounded-[2rem] shadow-soft p-8">
              <h3 className="font-tradicional text-xl italic text-elos-verde mb-4">Contratos de {mesFiltro}/{anoFiltro}</h3>
              {vendasNovasNoMes.length > 0 ? (
                <div className="grid gap-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                  {vendasNovasNoMes.map(v => (
                    <div key={v._id || v.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="font-bold text-elos-verde">{v.cliente}</span>
                        <small className="text-[9px] text-gray-400 uppercase font-black">{v.dataVenda.split('-').reverse().join('/')}</small>
                      </div>
                      <strong className="text-sm font-black text-elos-texto italic">{formatarMoeda(v.valorTotal)}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-gray-300 italic py-6">Nenhuma venda registrada.</p>}
            </div>
          </div>
        )}

        {/* =========================================
            ABA 2: VISÃO ANUAL
        ========================================== */}
        {abaAtiva === 'anual' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* FILTRO ANO */}
            <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-elos-bege/10 w-fit mb-6">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Ano de Exercício</label>
                <input type="number" className="bg-transparent font-bold w-24 outline-none" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} />
              </div>
            </div>

            {/* RESUMO ANUAL CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl shadow-soft border-t-8 border-green-700">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receitas Efetivadas</h3>
                <p className="text-3xl font-black text-green-700 mt-2">{formatarMoeda(totalNoCaixaAno)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-soft border-t-8 border-red-700">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custos Pagos</h3>
                <p className="text-3xl font-black text-red-700 mt-2">{ocultarValores ? "****" : formatarMoeda(totalDespesasAno)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-soft border-t-8 border-elos-verde">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendas Brutas Fechadas</h3>
                <p className="text-3xl font-black text-elos-verde mt-2 font-tradicional italic">{formatarMoeda(volumeVendasAno)}</p>
              </div>
            </div>

            {/* GRÁFICO ANUAL (PURO TAILWIND CSS) */}
            <div className="bg-white p-8 rounded-[2rem] shadow-soft border border-elos-bege/10 mb-8">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="font-tradicional text-xl italic text-elos-verde">Desempenho Financeiro</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Receitas vs Despesas (Mês a Mês)</p>
                </div>
                <div className="flex gap-4 text-[10px] font-black uppercase">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Receita</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Despesa</span>
                </div>
              </div>

              {/* ÁREA DO GRÁFICO */}
              <div className="h-64 flex items-end justify-between gap-1 md:gap-2 pb-4 border-b border-gray-100 relative">
                {/* Linhas guias horizontais */}
                <div className="absolute top-0 left-0 w-full border-t border-dashed border-gray-100"></div>
                <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-gray-100"></div>
                
                {dadosGraficoAnual.map((d, index) => {
                  const alturaReceita = Math.max((d.receitas / maxValorGraficoAno) * 100, 0);
                  const alturaDespesa = Math.max((d.despesas / maxValorGraficoAno) * 100, 0);
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative z-10 h-full justify-end">
                      {/* Tooltip Hover */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 bg-gray-900 text-white p-2 rounded-lg text-[9px] whitespace-nowrap pointer-events-none transition-opacity z-20 shadow-xl">
                        Receita: {formatarMoeda(d.receitas)}<br/>
                        Despesa: {formatarMoeda(d.despesas)}
                      </div>
                      
                      <div className="flex items-end gap-0.5 w-full justify-center h-full">
                        <div 
                          className="w-1/3 md:w-4 bg-green-500 rounded-t-sm transition-all duration-700" 
                          style={{ height: `${alturaReceita}%`, minHeight: d.receitas > 0 ? '4px' : '0' }}
                        ></div>
                        <div 
                          className="w-1/3 md:w-4 bg-red-500 rounded-t-sm transition-all duration-700" 
                          style={{ height: `${alturaDespesa}%`, minHeight: d.despesas > 0 ? '4px' : '0' }}
                        ></div>
                      </div>
                      <span className="text-[8px] md:text-[10px] font-black text-gray-400 mt-2">{d.mes}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ABA 3: GERAL & OPERACIONAL
        ========================================== */}
        {abaAtiva === 'geral' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* SALDO EM CAIXA ACUMULADO */}
            <div className={`p-8 rounded-[2.5rem] shadow-soft text-white border-l-[12px] relative overflow-hidden transition-all ${saldoCaixaAtualGeral >= 0 ? 'bg-elos-bege border-[#8c7664]' : 'bg-red-950 border-red-900'}`}>
              <div className="relative z-10">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-[0.2em]">Saldo em Conta Corrente (Histórico Acumulado)</h3>
                <p className="text-4xl md:text-5xl font-black mt-2 text-white italic">{formatarMoeda(saldoCaixaAtualGeral)}</p>
                <p className="text-[10px] text-white/50 mt-2 uppercase font-bold tracking-widest">Disponibilidade real (Todo recebido - Todas saídas)</p>
              </div>
              <div className="absolute right-[-10px] bottom-[-30px] text-white/[0.04] text-8xl font-black italic select-none">CAIXA</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* DÍVIDA ACUMULADA */}
              <div onClick={() => setModalTipo('receber')} className="bg-elos-bege/10 p-8 rounded-[2.5rem] border border-elos-bege/30 shadow-sm cursor-pointer hover:bg-elos-bege/20 transition-colors flex flex-col justify-center">
                <h4 className="text-xs font-black text-elos-bege uppercase tracking-widest mb-2 italic">Valores a Receber (Geral Inadimplência)</h4>
                <p className="text-4xl font-bold text-elos-bege font-black">{formatarMoeda(totalAReceberGeral)}</p>
                <p className="text-[10px] text-elos-bege/60 mt-3 uppercase font-bold">Clique para ver os clientes devedores</p>
              </div>

              {/* SAÚDE FINANCEIRA PDF */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-elos-bege/20 flex flex-col justify-center">
                <h3 className="font-tradicional text-xl text-elos-verde mb-4 flex items-center gap-2">🏥 Emitir Balanço Financeiro PDF</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Início</label>
                      <input type="date" className="w-full p-2 bg-elos-fundo rounded-xl border-none text-sm" value={relatorioInicio} onChange={(e) => setRelatorioInicio(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Fim</label>
                      <input type="date" className="w-full p-2 bg-elos-fundo rounded-xl border-none text-sm" value={relatorioFim} onChange={(e) => setRelatorioFim(e.target.value)} />
                    </div>
                  </div>
                  <button onClick={handleGerarRelatorioSaude} className="bg-elos-verde hover:bg-elos-verde/90 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg w-full transition-transform active:scale-95">
                    📊 Baixar Relatório DRE
                  </button>
                </div>
              </div>
            </div>

            {/* ANIVERSARIANTES WIDGET */}
            <div className="bg-white rounded-[2.5rem] shadow-soft p-8 border border-elos-bege/10">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-gray-50 pb-4">
                <div>
                  <h3 className="font-tradicional text-2xl italic text-elos-verde">🎂 Gestão de Relacionamento (CRM)</h3>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Aniversariantes e Fidelização</p>
                </div>
                <input
                  type="date"
                  className="p-3 bg-elos-fundo rounded-xl border border-elos-bege/20 text-sm font-bold text-elos-texto outline-none"
                  value={dataAniversario}
                  onChange={(e) => setDataAniversario(e.target.value)}
                />
              </div>

              {aniversariantesDoDia.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aniversariantesDoDia.map(cli => (
                    <div key={cli._id || cli.cpf} className="flex items-center justify-between p-5 bg-elos-fundo/50 rounded-2xl border border-elos-bege/20 hover:bg-elos-fundo">
                      <div className="flex flex-col">
                        <span className="font-bold text-elos-verde">{cli.nome}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{cli.telefone || 'Sem telefone'}</span>
                      </div>
                      {cli.telefone && (
                        <button
                          onClick={() => {
                            const foneLimpo = cli.telefone.replace(/\D/g, "");
                            const msg = `Olá ${cli.nome}, tudo bem? Aqui é da Ótica Elos! 🎉 Passando para te desejar um Feliz Aniversário! Que seu dia seja repleto de alegria e muita paz. Temos um presente especial te esperando, venha nos visitar! 👓✨`;
                            window.open(`https://wa.me/55${foneLimpo}?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                          className="bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-transform"
                        >
                          💬 Parabéns
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <span className="text-4xl opacity-20 mb-3 block">🎈</span>
                  <p className="text-gray-400 text-xs italic font-bold">Nenhum cliente faz aniversário na data selecionada.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DETALHAMENTO UNIVERSAL */}
        {modalTipo && (
          <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <header className="p-6 bg-elos-fundo flex justify-between items-center border-b">
                <h2 className="font-tradicional text-xl text-elos-verde italic">
                  {modalTipo === 'receber' ? 'Dívidas Acumuladas' : 'Detalhamento do Período'}
                </h2>
                <button onClick={() => setModalTipo(null)} className="text-2xl text-gray-400 hover:text-red-500">&times;</button>
              </header>
              <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
                {(() => {
                  const dados = modalTipo === 'receber' ? detalhesAReceber : modalTipo === 'entradas' ? detalhesEntradas : detalhesDespesas;
                  return dados.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="text-[10px] uppercase font-black text-gray-400 border-b tracking-widest">
                        <tr>
                          <th className="pb-3">{modalTipo === 'despesas' ? 'Descrição' : 'Cliente'}</th>
                          <th className="pb-3 text-center">{modalTipo === 'receber' ? 'Vencimento' : 'Info'}</th>
                          <th className="pb-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {dados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-4 font-bold text-elos-verde">{item.nome}</td>
                            <td className="py-4 text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                              {modalTipo === 'receber' ? item.vencimento.toLocaleDateString() : item.info}
                            </td>
                            <td className="py-4 text-right font-black text-sm">
                              {ocultarValores ? "****" : formatarMoeda(item.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-center text-gray-400 py-10 italic font-bold">Nenhum registro encontrado.</p>;
                })()}
              </div>
              <footer className="p-4 bg-gray-50 text-right">
                <button onClick={() => setModalTipo(null)} className="bg-elos-verde text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md">Fechar</button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}