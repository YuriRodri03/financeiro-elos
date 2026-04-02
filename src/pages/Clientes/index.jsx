import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils'; 
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
  const [editandoCadastro, setEditandoCadastro] = useState(null);
  
  // Estado para o formulário de configuração do recibo
  const [dadosRecibo, setDadosRecibo] = useState(null);

  const fecharModal = () => {
    setClienteSelecionadoCPF(null);
    setEditandoCadastro(null);
    setDadosRecibo(null);
  };

  const handleEditarDataVenda = (vendaId, dataAntiga) => {
    const novaData = prompt("Altere a data da venda (AAAA-MM-DD):", dataAntiga);
    if (novaData && novaData !== dataAntiga) {
      editarDataVenda(vendaId, novaData);
    }
  };

  const salvarEdicao = async () => {
    if (!editandoCadastro.nome || !editandoCadastro.cpf) {
      alert("Nome e CPF são obrigatórios!");
      return;
    }
    try {
      await editarCliente(clienteSelecionadoCPF, editandoCadastro);
      if (editandoCadastro.cpf !== clienteSelecionadoCPF) {
        fecharModal();
      } else {
        setEditandoCadastro(null);
      }
      alert("Cadastro atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar cadastro.");
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
                <h2 style={{margin: 0, color: 'var(--primary)'}}>
                  {editandoCadastro ? "Editando Cadastro" : clienteNoModal.nome}
                </h2>
                
                {editandoCadastro ? (
                  <div className="dados-cadastro-box" style={{ marginTop: '15px', padding: '20px', background: '#fff', borderRadius: '12px', border: '2px solid var(--primary)', display: 'grid', gap: '12px' }}>
                    <div className="form-group-edit">
                      <label>Nome Completo:</label>
                      <input type="text" value={editandoCadastro.nome} onChange={(e) => setEditandoCadastro({...editandoCadastro, nome: e.target.value})} />
                    </div>
                    <div className="form-group-edit">
                      <label>CPF:</label>
                      <input type="text" value={editandoCadastro.cpf} onChange={(e) => setEditandoCadastro({...editandoCadastro, cpf: e.target.value})} />
                    </div>
                    <div className="form-group-edit">
                      <label>WhatsApp:</label>
                      <input type="text" value={editandoCadastro.telefone} onChange={(e) => setEditandoCadastro({...editandoCadastro, telefone: e.target.value})} />
                    </div>
                    <div className="form-group-edit">
                      <label>Endereço:</label>
                      <input type="text" value={editandoCadastro.endereco} onChange={(e) => setEditandoCadastro({...editandoCadastro, endereco: e.target.value})} />
                    </div>
                    <div className="form-group-edit">
                      <label>Observações:</label>
                      <textarea value={editandoCadastro.observacoes} onChange={(e) => setEditandoCadastro({...editandoCadastro, observacoes: e.target.value})} rows="3" style={{width: '100%', resize: 'none'}} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button className="btn-baixa" onClick={salvarEdicao}>Salvar Alterações</button>
                      <button className="btn-sair" style={{ margin: 0, background: '#eee', color: '#666' }} onClick={() => setEditandoCadastro(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="dados-cadastro-box" style={{ marginTop: '15px', padding: '20px', background: '#fdfaf5', borderRadius: '12px', border: '1px solid #d2b48c', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <p style={{margin: 0}}>🆔 <strong>CPF:</strong> {clienteNoModal.cpf}</p>
                      <p style={{margin: 0}}>📱 <strong>WhatsApp:</strong> {clienteNoModal.telefone}</p>
                      <p style={{margin: 0, gridColumn: 'span 2'}}>🏠 <strong>Endereço:</strong> {clienteNoModal.endereco}</p>
                      <p style={{margin: 0, gridColumn: 'span 2', fontSize: '0.9rem', color: '#666', fontStyle: 'italic', borderTop: '1px solid #e8d5bc', paddingTop: '10px' }}>
                        📝 {clienteNoModal.observacoes || 'Nenhuma nota registrada'}
                      </p>
                    </div>

                    <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
                      {dadosRecibo ? (
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#4a5d4e' }}>Configurar Recibo com Desconto</h4>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Valor Bruto (R$):</label>
                              <input 
                                type="number" 
                                value={dadosRecibo.valor} 
                                onChange={(e) => setDadosRecibo({...dadosRecibo, valor: e.target.value})}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Desconto (R$):</label>
                              <input 
                                type="number" 
                                value={dadosRecibo.desconto} 
                                onChange={(e) => setDadosRecibo({...dadosRecibo, desconto: e.target.value})}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#c62828' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Data:</label>
                              <input 
                                type="date" 
                                value={dadosRecibo.data} 
                                onChange={(e) => setDadosRecibo({...dadosRecibo, data: e.target.value})}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Referente a:</label>
                              <input 
                                type="text" 
                                value={dadosRecibo.produto} 
                                onChange={(e) => setDadosRecibo({...dadosRecibo, produto: e.target.value})}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button 
                              className="btn-baixa" 
                              onClick={async () => {
                                const valorBruto = Number(dadosRecibo.valor || 0);
                                const desconto = Number(dadosRecibo.desconto || 0);
                                await gerarPDFDocumento({
                                  numero: "017-2026", 
                                  data: dadosRecibo.data.split('-').reverse().join('/'), 
                                  cliente: clienteNoModal.nome, 
                                  produto: dadosRecibo.produto, 
                                  valorProduto: valorBruto, 
                                  desconto: desconto,
                                  valorTotal: valorBruto - desconto 
                                }, 'recibo');
                                setDadosRecibo(null);
                              }}
                            >
                              ✅ Gerar PDF (Líquido: R$ {(Number(dadosRecibo.valor) - Number(dadosRecibo.desconto)).toFixed(2)})
                            </button>
                            <button className="btn-sair" style={{ margin: 0 }} onClick={() => setDadosRecibo(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button onClick={() => setEditandoCadastro({...clienteNoModal})} className="btn-editar-perfil">✏️ Editar Ficha</button>
                          
                          <button 
                            onClick={() => setDadosRecibo({
                              valor: clienteNoModal.totalGeralDevido, 
                              desconto: 0,
                              data: new Date().toISOString().split('T')[0],
                              produto: "Produtos Ópticos / Lentes" 
                            })} 
                            className="btn-editar-perfil" 
                            style={{ background: '#4a5d4e', color: 'white' }}
                          >
                            📄 Gerar Recibo
                          </button>

                          <button onClick={() => { excluirCliente(clienteNoModal.cpf); fecharModal(); }} className="btn-excluir-venda" style={{ marginTop: 0, width: 'auto', background: '#fff5f5' }}>🗑️ Excluir</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </header>
            
            <div className="modal-body">
              <h3 style={{fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '15px', borderBottom: '2px solid #eee', paddingTop: '20px'}}>Histórico de Compras</h3>
              {clienteNoModal.historicoVendas.length > 0 ? (
                clienteNoModal.historicoVendas.map((venda) => (
                  <div key={venda._id || venda.id} className="card-venda-historico">
                    <div className="venda-topo">
                      <strong>📦 {venda.produto || 'Óculos'}</strong>
                      <span 
                        onClick={() => handleEditarDataVenda(venda._id || venda.id, venda.dataVenda)}
                        style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)', fontSize: '0.9rem' }}
                      >
                        {venda.dataVenda.split('-').reverse().join('/')} ✏️
                      </span>
                    </div>
                    <div className="venda-parcelas">
                      {venda.listaParcelas.map(p => (
                        <LinhaParcela key={p.numero} p={p} vendaId={venda._id || venda.id} darBaixaParcela={darBaixaParcela} estornarBaixaParcela={estornarBaixaParcela} />
                      ))}
                    </div>
                    <button className="btn-excluir-venda" onClick={() => excluirVenda(venda._id || venda.id)}>🗑️ Excluir Registro de Venda</button>
                  </div>
                ))
              ) : <p style={{color: '#999', fontStyle: 'italic'}}>Nenhuma compra realizada ainda.</p>}
            </div>
            <button onClick={fecharModal} className="btn-sair">Voltar para a Lista</button>
          </div>
        </div>
      )}
    </div>
  );
}