import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

function LinhaParcela({ p, vendaId, darBaixaParcela, estornarBaixaParcela }) {
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="linha-parcela" style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span>{p.numero}ª Parcela - <strong>R$ {p.valor.toFixed(2)}</strong></span>
        {p.paga && (
          <small style={{ color: '#4a5d4e', fontWeight: 'bold' }}>
            🗓️ Recebido em: {p.dataPagamento?.split('-').reverse().join('/')}
          </small>
        )}
      </div>

      {p.paga ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Paga</span>
          <button 
            onClick={() => estornarBaixaParcela(vendaId, p.numero)} 
            style={{ fontSize: '11px', background: 'none', border: 'none', textDecoration: 'underline', color: '#999', cursor: 'pointer' }}
          >
            (Estornar)
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Data do Recebimento:</label>
            <input 
              type="date" 
              value={dataBaixa} 
              onChange={(e) => setDataBaixa(e.target.value)}
              style={{ padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button 
            className="btn-baixa" 
            onClick={() => darBaixaParcela(vendaId, p.numero, dataBaixa)}
            style={{ padding: '8px 12px', fontSize: '12px', alignSelf: 'flex-end' }}
          >
            Dar Baixa
          </button>
        </div>
      )}
    </div>
  );
}

export default function Clientes() {
  const { vendas, clientes, darBaixaParcela, estornarBaixaParcela, excluirVenda, editarCliente, excluirCliente, editarDataVenda, carregando } = useFinanceiro();
  
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [clienteSelecionadoCPF, setClienteSelecionadoCPF] = useState(null);

  const fecharModal = () => setClienteSelecionadoCPF(null);

  const handleEditarDataVenda = (vendaId, dataAntiga) => {
    const novaData = prompt("Altere a data da venda (AAAA-MM-DD):", dataAntiga);
    if (novaData && novaData !== dataAntiga) {
      editarDataVenda(vendaId, novaData);
    }
  };

  const handleEditarCadastro = (cliente) => {
  const novoNome = prompt("Nome do cliente:", cliente.nome);
  const novoCpf = prompt("CPF (apenas números):", cliente.cpf);
  const novoTelefone = prompt("Telefone/WhatsApp:", cliente.telefone);
  const novoEndereco = prompt("Endereço completo:", cliente.endereco);
  const novasObs = prompt("Observações:", cliente.observacoes);

  // Só prossegue se o nome e CPF (campos obrigatórios) forem preenchidos
  if (novoNome && novoCpf) {
    editarCliente(cliente.cpf, { 
      nome: novoNome, 
      cpf: novoCpf, 
      telefone: novoTelefone || cliente.telefone,
      endereco: novoEndereco || cliente.endereco,
      observacoes: novasObs || cliente.observacoes
    });
    
    // Se o CPF mudou, fechamos o modal para evitar erros de referência
    if (novoCpf !== cliente.cpf) {
      fecharModal();
    }
    
    alert("Cadastro atualizado com sucesso!");
  }
};

  const listaFinalClientes = useMemo(() => {
    const todosCPFs = Array.from(new Set([
      ...vendas.map(v => v.cpf),
      ...clientes.map(c => c.cpf)
    ]));

    return todosCPFs.map(cpf => {
      const dadosCad = clientes.find(c => c.cpf === cpf);
      const vendasCli = vendas.filter(v => v.cpf === cpf);
      
      const totalDevido = vendasCli.reduce((acc, v) => {
        return acc + (v.listaParcelas || [])
          .filter(p => !p.paga)
          .reduce((soma, p) => soma + p.valor, 0);
      }, 0);

      return {
        nome: dadosCad?.nome || vendasCli[0]?.cliente || "Sem Nome",
        cpf: cpf,
        telefone: dadosCad?.telefone || "Não cadastrado",
        endereco: dadosCad?.endereco || "Não informado",
        observacoes: dadosCad?.observacoes || "",
        historicoVendas: vendasCli,
        totalGeralDevido: totalDevido
      };
    });
  }, [vendas, clientes]);

  const clienteNoModal = useMemo(() => {
    return listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF);
  }, [clienteSelecionadoCPF, listaFinalClientes]);

  const clientesExibidos = listaFinalClientes.filter(c => {
    const passaFiltroStatus = filtro === 'pendentes' ? c.totalGeralDevido > 0.01 : true;
    const termo = busca.toLowerCase();
    const termoApenasNumeros = termo.replace(/\D/g, '');
    const cpfBancoApenasNumeros = c.cpf.replace(/\D/g, '');
    const passaBuscaNome = c.nome.toLowerCase().includes(termo);
    const passaBuscaCPF = cpfBancoApenasNumeros.includes(termoApenasNumeros);
    return passaFiltroStatus && (passaBuscaNome || (termoApenasNumeros !== '' && passaBuscaCPF));
  });

  if (carregando) return null;

  return (
    <div className="clientes-container">
      <header className="clientes-header">
        <h1>Carteira de Clientes - Ótica Elos</h1>
      </header>

      <div className="busca-secao">
        <input 
          type="text" 
          className="input-busca"
          placeholder="🔍 Buscar por nome ou CPF do cliente..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="filtros-clientes">
        <button onClick={() => setFiltro('todos')} className={`btn-filtro ${filtro === 'todos' ? 'active' : ''}`}>
          👥 Todos ({listaFinalClientes.length})
        </button>
        <button onClick={() => setFiltro('pendentes')} className={`btn-filtro ${filtro === 'pendentes' ? 'active-alert' : ''}`}>
          ⚠️ Inadimplentes
        </button>
      </div>

      <table className="clientes-table">
        <thead>
          <tr>
            <th>Cliente / CPF</th>
            <th>Contato</th>
            <th>Saldo Devedor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientesExibidos.map((cliente) => (
            <tr key={cliente.cpf}>
              <td>
                <div className="cliente-nome">{cliente.nome}</div>
                <div className="cliente-cpf" style={{fontSize: '0.8rem', color: '#666'}}>{cliente.cpf}</div>
              </td>
              <td style={{fontSize: '0.9rem'}}>{cliente.telefone}</td>
              <td style={{ color: cliente.totalGeralDevido > 0 ? '#c62828' : '#4a5d4e', fontWeight: 'bold' }}>
                R$ {cliente.totalGeralDevido.toFixed(2)}
              </td>
              <td>
                <span className={`status-badge ${cliente.totalGeralDevido > 0 ? 'pendente' : 'pago'}`}>
                  {cliente.totalGeralDevido > 0 ? 'Em Aberto' : 'Quitado'}
                </span>
              </td>
              <td style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-detalhes" onClick={() => setClienteSelecionadoCPF(cliente.cpf)}>Ver Ficha</button>
                <button className="btn-excluir-venda" style={{ marginTop: 0, width: '40px', padding: '5px' }} onClick={() => excluirCliente(cliente.cpf)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {clienteNoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={fecharModal} className="btn-close">&times;</button>
            <header className="modal-header">
              <div style={{flex: 1}}>
                <h2 style={{margin: 0}}>{clienteNoModal.nome}</h2>
                <div className="dados-cadastro-box" style={{marginTop: '15px', padding: '15px', background: '#f4f7f4', borderRadius: '12px', border: '1px solid #e0e8e0'}}>
                  <p style={{margin: '5px 0'}}>🆔 <strong>CPF:</strong> {clienteNoModal.cpf}</p>
                  <p style={{margin: '5px 0'}}>📱 <strong>WhatsApp:</strong> {clienteNoModal.telefone}</p>
                  <p style={{margin: '5px 0'}}>🏠 <strong>Endereço:</strong> {clienteNoModal.endereco}</p>
                  <p style={{margin: '5px 0'}}>📝 <strong>Observações:</strong> {clienteNoModal.observacoes || 'Nenhuma nota registrada'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
  onClick={() => handleEditarCadastro(clienteNoModal)} 
  className="btn-editar-perfil"
>
  ✏️ Editar Cadastro Completo
</button>
                  <button onClick={() => { excluirCliente(clienteNoModal.cpf); fecharModal(); }} className="btn-excluir-venda" style={{ marginTop: 0, width: 'auto', background: '#fff5f5' }}>🗑️ Excluir Cadastro</button>
                </div>
              </div>
            </header>
            
            <div className="modal-body">
              <h3 style={{fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '15px', borderBottom: '2px solid #eee'}}>Histórico de Compras</h3>
              {clienteNoModal.historicoVendas.map((venda) => (
                <div key={venda._id || venda.id} className="card-venda-historico">
                  <div className="venda-topo">
                    <strong>📦 {venda.produto || 'Óculos'}</strong>
                    {/* DATA EDITÁVEL ABAIXO */}
                    <span 
                      onClick={() => handleEditarDataVenda(venda._id || venda.id, venda.dataVenda)}
                      style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)' }}
                      title="Clique para editar a data"
                    >
                      {venda.dataVenda.split('-').reverse().join('/')} ✏️
                    </span>
                  </div>
                  <div className="venda-parcelas">
                    {venda.listaParcelas.map(p => (
                      <LinhaParcela key={p.numero} p={p} vendaId={venda._id || venda.id} darBaixaParcela={darBaixaParcela} estornarBaixaParcela={estornarBaixaParcela} />
                    ))}
                  </div>
                  <button className="btn-excluir-venda" onClick={() => excluirVenda(venda._id || venda.id)}>🗑️ Excluir Venda</button>
                </div>
              ))}
            </div>
            <button onClick={fecharModal} className="btn-sair">Voltar para a Lista</button>
          </div>
        </div>
      )}
    </div>
  );
}