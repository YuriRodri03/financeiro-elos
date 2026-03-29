import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function Dashboard() {
  const { vendas, carregando } = useFinanceiro(); // Puxamos o estado de carregamento

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(dataAtual.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(dataAtual.getFullYear());

  // Se o contexto ainda estiver buscando dados no MongoDB, não renderiza cálculos errados
  if (carregando) return null; 

  // --- CÁLCULOS MENSAIS ---
  
  const totalNoCaixaMes = vendas.reduce((acc, venda) => {
    const parcelasPagasNoMes = (venda.listaParcelas || []).filter(p => {
      if (!p.paga || !p.dataPagamento) return false;
      const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
      return (dataPagto.getMonth() + 1) === Number(mesFiltro) && 
             dataPagto.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasPagasNoMes.reduce((soma, p) => soma + p.valor, 0);
  }, 0);

  const totalAReceberMes = vendas.reduce((acc, venda) => {
    const parcelasVencendoNoMes = (venda.listaParcelas || []).filter(p => {
      if (p.paga) return false;
      const dataVenc = new Date(venda.dataVenda + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + (p.numero - 1));
      return (dataVenc.getMonth() + 1) === Number(mesFiltro) && 
             dataVenc.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasVencendoNoMes.reduce((soma, p) => soma + p.valor, 0);
  }, 0);

  const vendasNovasNoMes = vendas.filter(v => {
    const dataV = new Date(v.dataVenda + 'T00:00:00');
    return (dataV.getMonth() + 1) === Number(mesFiltro) && 
           dataV.getFullYear() === Number(anoFiltro);
  });

  const volumeVendasMes = vendasNovasNoMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);

  // --- CÁLCULOS ANUAIS ---

  const totalNoCaixaAno = vendas.reduce((acc, venda) => {
    const parcelasPagasNoAno = (venda.listaParcelas || []).filter(p => {
      if (!p.paga || !p.dataPagamento) return false;
      const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
      return dataPagto.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasPagasNoAno.reduce((soma, p) => soma + p.valor, 0);
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

      <h2 className="secao-titulo">Resumo Mensal ({mesFiltro}/{anoFiltro})</h2>
      <section className="resumo-cards">
        <div className="card entrada">
          <h3>Recebido no Mês</h3>
          <p>R$ {totalNoCaixaMes.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="card inadimplencia">
          <h3>A Receber (No Mês)</h3>
          <p>R$ {totalAReceberMes.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="card saldo">
          <h3>Vendas no Mês</h3>
          <p>R$ {volumeVendasMes.toFixed(2).replace('.', ',')}</p>
        </div>
      </section>

      <h2 className="secao-titulo">Resumo Anual ({anoFiltro})</h2>
      <section className="resumo-cards">
        <div className="card entrada" style={{borderColor: '#2e7d32'}}>
          <h3>Total Recebido (Ano)</h3>
          <p>R$ {totalNoCaixaAno.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="card saldo" style={{borderColor: '#1565c0'}}>
          <h3>Total de Vendas (Ano)</h3>
          <p>R$ {volumeVendasAno.toFixed(2).replace('.', ',')}</p>
        </div>
      </section>

      <div className="lista-recente">
        <h3>Vendas de {mesFiltro}/{anoFiltro}</h3>
        {vendasNovasNoMes.length > 0 ? (
          <ul className="movimentacoes-lista">
            {vendasNovasNoMes.map(v => (
              <li key={v._id || v.id} className="item-venda"> {/* Ajuste para ID do MongoDB */}
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
        ) : (
          <p className="placeholder-vazio">Nenhuma venda nova neste mês.</p>
        )}
      </div>
    </div>
  );
}