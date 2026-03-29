import React from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function RelatorioInadimplencia() {
  const { vendas, clientes } = useFinanceiro();

  // 1. Identificar as parcelas vencidas (Lógica mantida para precisão)
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

  // 2. Calcula os dias de atraso baseado na parcela MAIS ANTIGA
  const calcularDiasDaParcelaMaisAntiga = (parcelasVencidas) => {
    if (parcelasVencidas.length === 0) return 0;

    const hoje = new Date();
    const datas = parcelasVencidas.map(p => p.dataVencimentoReal);
    const maisAntiga = new Date(Math.min(...datas));

    const diffTime = Math.abs(hoje - maisAntiga);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Processa as vendas do MongoDB
  const listaInadimplentes = vendas.map(v => {
    const parcelasVencidas = obterParcelasVencidasInfo(v);
    const valorAtrasado = parcelasVencidas.reduce((acc, p) => acc + p.valor, 0);
    const diasDeAtrasoReal = calcularDiasDaParcelaMaisAntiga(parcelasVencidas);

    return {
      ...v,
      parcelasVencidas,
      valorAtrasado,
      dias: diasDeAtrasoReal
    };
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Relatório de Cobrança (Vencidos)</h1>
      </header>

      <div className="resumo-cards">
        <div className="card inadimplencia" style={{borderTop: '6px solid #c62828'}}>
          <h3>Total Vencido Hoje</h3>
          <p>R$ {listaInadimplentes.reduce((acc, v) => acc + v.valorAtrasado, 0).toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="card" style={{borderTop: '6px solid #ef6c00'}}>
          <h3>Clientes em Atraso</h3>
          <p>{listaInadimplentes.length}</p>
        </div>
      </div>

      <div className="lista-recente">
        <table className="clientes-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Parcelas Vencidas</th>
              <th>Tempo de Atraso</th>
              <th>Total em Dívida</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {listaInadimplentes.length > 0 ? (
              listaInadimplentes.map(v => (
                <tr key={v._id || v.id}> {/* Suporte para os dois tipos de ID */}
                  <td>
                    <strong>{v.cliente}</strong>
                    <div style={{fontSize: '0.75rem', color: '#888'}}>{v.produto}</div>
                  </td>
                  <td>
                    {v.parcelasVencidas.map(p => (
                      <span key={p.numero} style={{fontSize: '0.8rem', display: 'block'}}>
                        {p.numero}ª parc. (Venceu {p.dataVencimentoReal.toLocaleDateString()})
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`status-badge ${v.dias > 60 ? 'atrasado' : 'pendente'}`}>
                      {v.dias} dias
                    </span>
                  </td>
                  <td style={{color: '#c62828', fontWeight: 'bold'}}>
                    R$ {v.valorAtrasado.toFixed(2).replace('.', ',')}
                  </td>
                  <td>
                    <button className="btn-baixa" onClick={() => abrirWhatsApp(v)}>
                      💬 Cobrar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>Tudo em dia por aqui! 👓✨</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}