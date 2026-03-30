import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function Dashboard() {
  const { vendas, despesas, carregando } = useFinanceiro();

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(dataAtual.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(dataAtual.getFullYear());
  
  const [modalAberto, setModalAberto] = useState(false);

  if (carregando) return null;

  // --- CÁLCULOS MENSAIS ---
  
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
          
          if ((dataVenc.getMonth() + 1) === Number(mesFiltro) && 
              dataVenc.getFullYear() === Number(anoFiltro)) {
            lista.push({
              cliente: venda.cliente,
              valor: p.valor,
              parcela: p.numero === 0 ? "Entrada" : `${p.numero}ª`
            });
          }
        }
      });
    });
    return lista;
  }, [vendas, mesFiltro, anoFiltro]);

  const totalAReceberMes = detalhesAReceber.reduce((acc, item) => acc + item.valor, 0);

  const totalNoCaixaMes = vendas.reduce((acc, venda) => {
    const parcelasPagasNoMes = (venda.listaParcelas || []).filter(p => {
      if (!p.paga || !p.dataPagamento) return false;
      const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
      return (dataPagto.getMonth() + 1) === Number(mesFiltro) && 
             dataPagto.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasPagasNoMes.reduce((soma, p) => soma + p.valor, 0);
  }, 0);

  const totalDespesasMes = despesas.reduce((acc, d) => {
    const dataVenc = new Date(d.vencimento + 'T00:00:00');
    if ((dataVenc.getMonth() + 1) === Number(mesFiltro) && 
        dataVenc.getFullYear() === Number(anoFiltro)) {
      return acc + d.valor;
    }
    return acc;
  }, 0);

  const saldoLiquidoMes = totalNoCaixaMes - totalDespesasMes;

  const vendasNovasNoMes = vendas.filter(v => {
    const dataV = new Date(v.dataVenda + 'T00:00:00');
    return (dataV.getMonth() + 1) === Number(mesFiltro) && 
           dataV.getFullYear() === Number(anoFiltro);
  });

  const volumeVendasMes = vendasNovasNoMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);

  // --- ANÁLISES ECONÔMICAS (MÉTRICAS DE GESTÃO) ---
  
  const margemCaixa = volumeVendasMes > 0 ? (totalNoCaixaMes / volumeVendasMes) * 100 : 0;
  
  const faltamParaCusto = totalDespesasMes - totalNoCaixaMes;
  
  const totalEsperadoMes = totalNoCaixaMes + totalAReceberMes;
  const indiceInadimplencia = totalEsperadoMes > 0 ? (totalAReceberMes / totalEsperadoMes) * 100 : 0;

  // --- CÁLCULOS ANUAIS ---

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
        <div>
          <h1>Painel Financeiro</h1>
          <p>Ótica Elos — Gestão de Resultados</p>
        </div>

        <div className="filtros-periodo">
          <div className="filtro-group">
            <label>Mês</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
              {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="filtro-group">
            <label>Ano</label>
            <input type="number" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} />
          </div>
        </div>
      </header>

      <h2 className="secao-titulo">Fluxo de Caixa Mensal ({mesFiltro}/{anoFiltro})</h2>
      <section className="resumo-cards">
        <div className="card entrada">
          <h3>Recebido (Entradas)</h3>
          <p>R$ {totalNoCaixaMes.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="card saida" style={{ borderLeft: '5px solid #c62828' }}>
          <h3>Contas (Despesas)</h3>
          <p style={{ color: '#c62828' }}>- R$ {totalDespesasMes.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="card saldo" style={{ borderLeft: '5px solid #1565c0' }}>
          <h3>Saldo Líquido</h3>
          <p className={saldoLiquidoMes >= 0 ? 'valor-positivo' : 'valor-negativo'}>
            R$ {saldoLiquidoMes.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </section>

      {/* SEÇÃO DE ANÁLISE ESTRATÉGICA */}
      <h2 className="secao-titulo">Análise de Saúde Financeira</h2>
      <section className="analise-economica">
        <div className="card-analise">
          <h4>Eficiência de Caixa</h4>
          <div className="progresso-container">
            <div className="progresso-barra" style={{ width: `${Math.min(margemCaixa, 100)}%` }}></div>
          </div>
          <p>{margemCaixa.toFixed(1)}% das vendas já viraram dinheiro em caixa.</p>
        </div>

        <div className="card-analise">
          <h4>Ponto de Equilíbrio</h4>
          <strong style={{ color: faltamParaCusto <= 0 ? '#2e7d32' : '#c62828' }}>
            {faltamParaCusto <= 0 ? "Custos Cobertos ✅" : `Faltam R$ ${faltamParaCusto.toFixed(2)}`}
          </strong>
          <p>Quanto falta receber para quitar as despesas do mês.</p>
        </div>

        <div className="card-analise">
          <h4>Risco de Crédito</h4>
          <strong style={{ color: indiceInadimplencia > 30 ? '#c62828' : '#d2b48c' }}>
            {indiceInadimplencia.toFixed(1)}%
          </strong>
          <p>Volume de parcelas em aberto sobre o total esperado.</p>
        </div>
      </section>

      <h2 className="secao-titulo">Gestão de Crédito e Faturamento</h2>
      <section className="resumo-cards">
        <div className="card inadimplencia clicavel" onClick={() => setModalAberto(true)} style={{ cursor: 'pointer' }}>
          <h3>A Receber (No Mês) 🔍</h3>
          <p>R$ {totalAReceberMes.toFixed(2).replace('.', ',')}</p>
          <small>Clique para ver detalhes</small>
        </div>

        <div className="card vendas-total">
          <h3>Faturamento Bruto</h3>
          <p>R$ {volumeVendasMes.toFixed(2).replace('.', ',')}</p>
          <small>Total em novos contratos</small>
        </div>
      </section>

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="btn-close" onClick={() => setModalAberto(false)}>&times;</button>
            <h2>Contas a Receber — {mesFiltro}/{anoFiltro}</h2>
            <div className="modal-body">
              {detalhesAReceber.length > 0 ? (
                <table className="tabela-detalhes">
                  <thead>
                    <tr><th>Cliente</th><th>Parcela</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    {detalhesAReceber.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.cliente}</td>
                        <td>{item.parcela}</td>
                        <td><strong>R$ {item.valor.toFixed(2).replace('.', ',')}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p>Tudo em dia para este mês!</p>}
            </div>
            <button className="btn-sair" onClick={() => setModalAberto(false)}>Fechar</button>
          </div>
        </div>
      )}

      <h2 className="secao-titulo">Resumo Anual ({anoFiltro})</h2>
      <section className="resumo-cards">
        <div className="card entrada" style={{borderColor: '#2e7d32'}}>
          <h3>Total Recebido (Ano)</h3>
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