import React, { useState, useMemo } from 'react'; // Adicionado useMemo
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function Dashboard() {
  const { vendas, carregando } = useFinanceiro();

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(dataAtual.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(dataAtual.getFullYear());
  
  // ESTADO PARA O MODAL
  const [modalAberto, setModalAberto] = useState(false);

  if (carregando) return null;

  // --- CÁLCULOS ---
  
  // Lógica para identificar quem deve pagar no mês selecionado
  const detalhesAReceber = useMemo(() => {
    let lista = [];
    vendas.forEach(venda => {
      (venda.listaParcelas || []).forEach(p => {
        if (!p.paga) {
          const dataVenc = new Date(venda.dataVenda + 'T00:00:00');
          dataVenc.setMonth(dataVenc.getMonth() + (p.numero - 1));
          
          if ((dataVenc.getMonth() + 1) === Number(mesFiltro) && 
              dataVenc.getFullYear() === Number(anoFiltro)) {
            lista.push({
              cliente: venda.cliente,
              cpf: venda.cpf,
              valor: p.valor,
              parcela: p.numero,
              vencimento: dataVenc.toLocaleDateString('pt-BR')
            });
          }
        }
      });
    });
    return lista;
  }, [vendas, mesFiltro, anoFiltro]);

  const totalAReceberMes = detalhesAReceber.reduce((acc, item) => acc + item.valor, 0);

  // ... (Mantenha seus outros cálculos de totalNoCaixaMes, volumeVendasMes, etc) ...
  const totalNoCaixaMes = vendas.reduce((acc, venda) => {
    const parcelasPagasNoMes = (venda.listaParcelas || []).filter(p => {
      if (!p.paga || !p.dataPagamento) return false;
      const dataPagto = new Date(p.dataPagamento + 'T00:00:00');
      return (dataPagto.getMonth() + 1) === Number(mesFiltro) && 
             dataPagto.getFullYear() === Number(anoFiltro);
    });
    return acc + parcelasPagasNoMes.reduce((soma, p) => soma + p.valor, 0);
  }, 0);

  const vendasNovasNoMes = vendas.filter(v => {
    const dataV = new Date(v.dataVenda + 'T00:00:00');
    return (dataV.getMonth() + 1) === Number(mesFiltro) && 
           dataV.getFullYear() === Number(anoFiltro);
  });

  const volumeVendasMes = vendasNovasNoMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);

  return (
    <div className="dashboard-container">
      {/* ... (Seu Header com filtros permanece igual) ... */}
      <header className="dashboard-header">
         <h1>Painel Financeiro</h1>
         <div className="filtros-periodo">
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
               {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                 <option key={i} value={i + 1}>{m}</option>
               ))}
            </select>
            <input type="number" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} />
         </div>
      </header>

      <section className="resumo-cards">
        <div className="card entrada">
          <h3>Recebido no Mês</h3>
          <p>R$ {totalNoCaixaMes.toFixed(2).replace('.', ',')}</p>
        </div>

        {/* CARD INTERATIVO */}
        <div 
          className="card inadimplencia clicavel" 
          onClick={() => setModalAberto(true)}
          style={{ cursor: 'pointer', borderLeft: '5px solid var(--danger)' }}
        >
          <h3>A Receber (No Mês) 🔍</h3>
          <p>R$ {totalAReceberMes.toFixed(2).replace('.', ',')}</p>
          <small>Clique para ver detalhes</small>
        </div>

        <div className="card saldo">
          <h3>Vendas no Mês</h3>
          <p>R$ {volumeVendasMes.toFixed(2).replace('.', ',')}</p>
        </div>
      </section>

      {/* MODAL DE DETALHES "A RECEBER" */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="btn-close" onClick={() => setModalAberto(false)}>&times;</button>
            <h2>Contas a Receber — {mesFiltro}/{anoFiltro}</h2>
            
            <div className="modal-body">
              {detalhesAReceber.length > 0 ? (
                <table className="tabela-detalhes">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Parcela</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhesAReceber.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.cliente}</td>
                        <td>{item.parcela}ª</td>
                        <td style={{fontWeight: 'bold'}}>R$ {item.valor.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhuma conta pendente para este mês!</p>
              )}
            </div>
            
            <button className="btn-sair" onClick={() => setModalAberto(false)}>Fechar</button>
          </div>
        </div>
      )}

      {/* ... (O restante do seu dashboard Anual e Lista de Vendas permanece igual) ... */}
    </div>
  );
}