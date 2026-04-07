import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFSaudeFinanceira } from '../../documentosUtils';
import './style.css';

export default function Dashboard() {
  const { vendas, despesas, carregando } = useFinanceiro();

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(dataAtual.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(dataAtual.getFullYear());
  const [modalTipo, setModalTipo] = useState(null);

  // --- NOVOS ESTADOS PARA O RELATÓRIO DE SAÚDE FINANCEIRA POR PERÍODO ---
  const [relatorioInicio, setRelatorioInicio] = useState('');
  const [relatorioFim, setRelatorioFim] = useState('');

  if (carregando) return null;

  // --- LÓGICA DO RELATÓRIO DE SAÚDE FINANCEIRA (PDF) ---
  const handleGerarRelatorioSaude = () => {
    if (!relatorioInicio || !relatorioFim) {
      alert("Por favor, selecione as datas de início e fim.");
      return;
    }

    // 1. Filtrar ENTRADAS (Dinheiro que REALMENTE entrou no caixa no período)
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

    // 2. Filtrar SAÍDAS (Despesas do período)
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

    const dadosRelatorio = {
      entradas: entradasPeriodo,
      saidas: saidasPeriodo,
      totalEntradas,
      totalSaidas
    };

    const periodoFmt = {
      inicio: relatorioInicio.split('-').reverse().join('/'),
      fim: relatorioFim.split('-').reverse().join('/')
    };

    gerarPDFSaudeFinanceira(dadosRelatorio, periodoFmt);
  };

  // --- SEUS CÁLCULOS MENSAIS ORIGINAIS (MANTIDOS) ---
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

  // --- SEUS CÁLCULOS ANUAIS ORIGINAIS (MANTIDOS) ---
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div><h1>Painel Financeiro</h1><p>Ótica Elos — Gestão de Resultados</p></div>
        <div className="filtros-periodo">
          <div className="filtro-group">
            <label>Mês</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
              {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="filtro-group"><label>Ano</label><input type="number" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} /></div>
        </div>
      </header>

      {/* --- SEÇÃO: ANÁLISE DE SAÚDE FINANCEIRA (NOVO) --- */}
      <h2 className="secao-titulo">Análise de Saúde Financeira</h2>
      <section className="dashboard-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #eee', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '15px' }}>🏥 Gerar Balanço de Fluxo de Caixa (Entradas vs Saídas)</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="filtro-group">
            <label style={{fontSize: '12px'}}>Início do Período:</label>
            <input type="date" value={relatorioInicio} onChange={(e) => setRelatorioInicio(e.target.value)} />
          </div>
          <div className="filtro-group">
            <label style={{fontSize: '12px'}}>Fim do Período:</label>
            <input type="date" value={relatorioFim} onChange={(e) => setRelatorioFim(e.target.value)} />
          </div>
          <button 
            onClick={handleGerarRelatorioSaude}
            className="btn-gerar"
            style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📊 Baixar Saúde Financeira (PDF)
          </button>
        </div>
      </section>

      {/* --- FLUXO MENSAL --- */}
      <h2 className="secao-titulo">Fluxo de Caixa Mensal ({mesFiltro}/{anoFiltro})</h2>
      <section className="resumo-cards">
        <div className="card entrada clicavel" onClick={() => setModalTipo('entradas')}>
          <h3>Recebido (Entradas)</h3>
          <p>R$ {totalNoCaixaMes.toFixed(2).replace('.', ',')}</p>
          <small>Ver recebimentos do mês</small>
        </div>
        <div className="card saida clicavel" style={{ borderLeft: '5px solid #c62828' }} onClick={() => setModalTipo('despesas')}>
          <h3>Contas (Despesas)</h3>
          <p style={{ color: '#c62828' }}>- R$ {totalDespesasMes.toFixed(2).replace('.', ',')}</p>
          <small>Ver lista de contas</small>
        </div>
        <div className="card saldo" style={{ borderLeft: '5px solid #1565c0' }}>
          <h3>Saldo Líquido</h3>
          <p className={saldoLiquidoMes >= 0 ? 'valor-positivo' : 'valor-negativo'}>
            R$ {saldoLiquidoMes.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </section>

      {/* --- ANÁLISE DE SAÚDE MENSAL --- */}
      <h2 className="secao-titulo">Análise de Desempenho Mensal</h2>
      <section className="analise-economica">
        <div className="card-analise">
          <h4>Eficiência de Caixa</h4>
          <div className="progresso-container"><div className="progresso-barra" style={{ width: `${Math.min(margemCaixa, 100)}%` }}></div></div>
          <p>{margemCaixa.toFixed(1)}% das vendas viraram caixa.</p>
        </div>
        <div className="card-analise">
          <h4>Ponto de Equilíbrio</h4>
          <strong style={{ color: faltamParaCusto <= 0 ? '#2e7d32' : '#c62828' }}>
            {faltamParaCusto <= 0 ? "Custos Cobertos ✅" : `Faltam R$ ${faltamParaCusto.toFixed(2)}`}
          </strong>
          <p>Para quitar as despesas do mês.</p>
        </div>
        <div className="card-analise">
          <h4>Risco de Crédito</h4>
          <strong style={{ color: indiceInadimplencia > 30 ? '#c62828' : '#d2b48c' }}>{indiceInadimplencia.toFixed(1)}%</strong>
          <p>Inadimplência sobre o esperado.</p>
        </div>
      </section>

      <h2 className="secao-titulo">Gestão de Crédito e Faturamento</h2>
      <section className="resumo-cards">
        <div className="card inadimplencia clicavel" onClick={() => setModalTipo('receber')}>
          <h3>A Receber (No Mês)</h3>
          <p>R$ {totalAReceberMes.toFixed(2).replace('.', ',')}</p>
          <small>Ver quem deve pagar este mês</small>
        </div>
        <div className="card vendas-total">
          <h3>Faturamento Bruto</h3>
          <p>R$ {volumeVendasMes.toFixed(2).replace('.', ',')}</p>
          <small>Total em novos contratos</small>
        </div>
      </section>

      {/* MODAL MULTIFUNÇÃO (MANTIDO) */}
      {modalTipo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="btn-close" onClick={() => setModalTipo(null)}>&times;</button>
            <h2>{modalTipo === 'receber' ? "Contas a Receber" : modalTipo === 'entradas' ? "Entradas no Caixa" : "Detalhamento de Despesas"} — {mesFiltro}/{anoFiltro}</h2>
            <div className="modal-body">
              {(() => {
                const dados = modalTipo === 'receber' ? detalhesAReceber : modalTipo === 'entradas' ? detalhesEntradas : detalhesDespesas;
                return dados.length > 0 ? (
                  <table className="tabela-detalhes">
                    <thead><tr><th>{modalTipo === 'despesas' ? 'Descrição' : 'Cliente'}</th><th>{modalTipo === 'despesas' ? 'Status' : modalTipo === 'entradas' ? 'Data Pagto' : 'Parcela'}</th><th>Valor</th></tr></thead>
                    <tbody>{dados.map((item, idx) => (<tr key={idx}><td>{item.nome}</td><td>{item.info}</td><td><strong>R$ {item.valor.toFixed(2).replace('.', ',')}</strong></td></tr>))}</tbody>
                  </table>
                ) : <p>Nenhum registro encontrado para este período.</p>;
              })()}
            </div>
            <button className="btn-sair" onClick={() => setModalTipo(null)}>Fechar</button>
          </div>
        </div>
      )}

      {/* RESUMO ANUAL (MANTIDO) */}
      <h2 className="secao-titulo">Resumo Anual ({anoFiltro})</h2>
      <section className="resumo-cards">
        <div className="card entrada" style={{borderColor: '#2e7d32'}}>
          <h3>Recebido (Ano)</h3>
          <p>R$ {totalNoCaixaAno.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="card saida" style={{borderColor: '#c62828'}}>
          <h3>Despesas (Ano)</h3>
          <p>R$ {totalDespesasAno.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="card saldo" style={{borderColor: '#1565c0'}}>
          <h3>Vendas Brutas (Ano)</h3>
          <p>R$ {volumeVendasAno.toFixed(2).replace('.', ',')}</p>
        </div>
      </section>

      {/* LISTA DE VENDAS RECENTES (MANTIDO) */}
      <div className="lista-recente">
        <h3>Vendas de {mesFiltro}/{anoFiltro}</h3>
        {vendasNovasNoMes.length > 0 ? (
          <ul className="movimentacoes-lista">
            {vendasNovasNoMes.map(v => (
              <li key={v._id || v.id} className="item-venda">
                <div className="venda-info">
                  <span className="cliente-nome">{v.cliente}</span>
                  <small className="venda-detalhe">Realizada em {v.dataVenda.split('-').reverse().join('/')}</small>
                </div>
                <div className="venda-valor">
                  <strong className="valor-total">R$ {Number(v.valorTotal).toFixed(2).replace('.', ',')}</strong>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="placeholder-vazio">Nenhuma venda nova neste mês.</p>}
      </div>
    </div>
  );
}