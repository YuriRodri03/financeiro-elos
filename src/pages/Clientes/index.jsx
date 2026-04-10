import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils'; 
import './style.css';

// --- COMPONENTE DE LINHA DE PARCELA ---
function LinhaParcela({ p, vendaId, darBaixaParcela, estornarBaixaParcela }) {
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split('T')[0]);
  const [valorRecebido, setValorRecebido] = useState(p.valor);

  const handleBaixa = () => {
    const valor = parseFloat(valorRecebido);
    if (isNaN(valor) || valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    darBaixaParcela(vendaId, p.numero, dataBaixa, valor);
  };

  return (
    <div className="linha-parcela" style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span>{p.numero === 0 ? "Entrada" : `${p.numero}ª Parcela`} - <strong>R$ {p.valor.toFixed(2)}</strong></span>
        {p.paga && (
          <small style={{ color: '#4a5d4e', fontWeight: 'bold' }}>
            🗓️ Recebido em: {p.dataPagamento?.split('-').reverse().join('/')}
          </small>
        )}
      </div>

      {p.paga ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
          <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Paga</span>
          <button 
            onClick={() => estornarBaixaParcela(vendaId, p.numero)} 
            style={{ fontSize: '11px', background: 'none', border: 'none', textDecoration: 'underline', color: '#999', cursor: 'pointer' }}
          >
            (Estornar)
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '100px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Quanto foi pago?</label>
            <input 
              type="number" 
              className="input-parcial"
              value={valorRecebido} 
              onChange={(e) => setValorRecebido(e.target.value)}
              style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '100px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Data:</label>
            <input 
              type="date" 
              value={dataBaixa} 
              onChange={(e) => setDataBaixa(e.target.value)}
              style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button 
            className="btn-baixa" 
            onClick={handleBaixa}
            style={{ padding: '10px 15px', fontSize: '12px', alignSelf: 'flex-end' }}
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function Clientes() {
  const { vendas, clientes, darBaixaParcela, estornarBaixaParcela, excluirVenda, editarCliente, excluirCliente, editarDataVenda, carregando } = useFinanceiro();
  
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [clienteSelecionadoCPF, setClienteSelecionadoCPF] = useState(null);
  const [editandoCadastro, setEditandoCadastro] = useState(null);
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
      // Se o CPF mudou, precisamos atualizar a seleção para o novo CPF para o modal não fechar ou bugar
      setClienteSelecionadoCPF(editandoCadastro.cpf);
      setEditandoCadastro(null);
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
    if (!clienteSelecionadoCPF) return null;
    return listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF);
  }, [clienteSelecionadoCPF, listaFinalClientes]);

  const clientesExibidos = listaFinalClientes.filter(c => {
    const passaFiltroStatus = filtro === 'pendentes' ? c.totalGeralDevido > 0.01 : true;
    const termo = busca.toLowerCase();
    const termoApenasNumeros = termo.replace(/\D/g, '');
    const cpfBancoApenasNumeros = (c.cpf || '').replace(/\D/g, '');
    const passaBuscaNome = (c.nome || '').toLowerCase().includes(termo);
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
          placeholder="🔍 Buscar por nome ou CPF..." 
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

      <div className="table-wrapper">
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
                <td data-label="Cliente">
                  <div className="cliente-nome">{cliente.nome}</div>
                  <div className="cliente-cpf" style={{fontSize: '0.8rem', color: '#666'}}>{cliente.cpf}</div>
                </td>
                <td data-label="Contato">{cliente.telefone}</td>
                <td data-label="Saldo" style={{ color: cliente.totalGeralDevido > 0 ? '#c62828' : '#4a5d4e', fontWeight: 'bold' }}>
                  R$ {cliente.totalGeralDevido.toFixed(2)}
                </td>
                <td data-label="Status">
                  <span className={`status-badge ${cliente.totalGeralDevido > 0 ? 'pendente' : 'pago'}`}>
                    {cliente.totalGeralDevido > 0 ? 'Em Aberto' : 'Quitado'}
                  </span>
                </td>
                <td data-label="Ações">
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-detalhes" onClick={() => setClienteSelecionadoCPF(cliente.cpf)}>Ver Ficha</button>
                    <button className="btn-excluir-venda" style={{ marginTop: 0, width: '40px', padding: '5px' }} onClick={() => excluirCliente(cliente.cpf)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SEGURANÇA: Verificamos o CPF primeiro */}
      {clienteSelecionadoCPF && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button onClick={fecharModal} className="btn-close">&times;</button>
            <header className="modal-header">
              <h2 style={{margin: 0, color: 'var(--primary)'}}>
                {editandoCadastro ? "Editando Cadastro" : (clienteNoModal?.nome || "Carregando...")}
              </h2>
            </header>
            
            <div className="modal-body">
              {editandoCadastro ? (
                <div className="dados-cadastro-box" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '2px solid var(--primary)', display: 'grid', gap: '12px' }}>
                  <div className="form-group-edit"><label>Nome Completo:</label><input type="text" value={editandoCadastro.nome || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, nome: e.target.value})} /></div>
                  <div className="form-group-edit"><label>CPF:</label><input type="text" value={editandoCadastro.cpf || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, cpf: e.target.value})} /></div>
                  <div className="form-group-edit"><label>WhatsApp:</label><input type="text" value={editandoCadastro.telefone || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, telefone: e.target.value})} /></div>
                  <div className="form-group-edit"><label>Endereço:</label><input type="text" value={editandoCadastro.endereco || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, endereco: e.target.value})} /></div>
                  <div className="form-group-edit"><label>Observações:</label><textarea value={editandoCadastro.observacoes || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, observacoes: e.target.value})} rows="3" /></div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button className="btn-baixa" onClick={salvarEdicao}>Salvar Alterações</button>
                    <button className="btn-sair" style={{ margin: 0, background: '#eee', color: '#666' }} onClick={() => setEditandoCadastro(null)}>Cancelar</button>
                  </div>
                </div>
              ) : clienteNoModal ? (
                <>
                  <div className="dados-cadastro-box" style={{ padding: '20px', background: '#fdfaf5', borderRadius: '12px', border: '1px solid #d2b48c', marginBottom: '20px' }}>
                    <p>🆔 <strong>CPF:</strong> {clienteNoModal.cpf}</p>
                    <p>📱 <strong>WhatsApp:</strong> {clienteNoModal.telefone}</p>
                    <p>🏠 <strong>Endereço:</strong> {clienteNoModal.endereco}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    {dadosRecibo ? (
                      <div className="dados-cadastro-box" style={{ display: 'grid', gap: '10px', background: '#f9f9f9', border: '1px solid #ddd' }}>
                        <h4>Configurar Recibo</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="number" value={dadosRecibo.valor} onChange={(e) => setDadosRecibo({...dadosRecibo, valor: e.target.value})} placeholder="Valor Bruto" style={{flex: 1}}/>
                          <input type="number" value={dadosRecibo.desconto} onChange={(e) => setDadosRecibo({...dadosRecibo, desconto: e.target.value})} placeholder="Desconto" style={{flex: 1}}/>
                        </div>
                        <select value={dadosRecibo.metodoPagamento} onChange={(e) => setDadosRecibo({...dadosRecibo, metodoPagamento: e.target.value})}>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Pix">Pix</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                        </select>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button className="btn-baixa" onClick={async () => {
                            const vB = Number(dadosRecibo.valor);
                            const vD = Number(dadosRecibo.desconto);
                            await gerarPDFDocumento({
                              numero: "REC-" + Date.now().toString().slice(-4), 
                              data: dadosRecibo.data.split('-').reverse().join('/'), 
                              cliente: clienteNoModal.nome, 
                              produto: dadosRecibo.produto, 
                              valorProduto: vB, 
                              desconto: vD,
                              valorTotal: vB - vD,
                              metodoPagamento: dadosRecibo.metodoPagamento 
                            }, 'recibo');
                            setDadosRecibo(null);
                          }}>✅ Gerar PDF</button>
                          <button className="btn-sair" style={{margin: 0}} onClick={() => setDadosRecibo(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => setEditandoCadastro({...clienteNoModal})} className="btn-editar-perfil">✏️ Editar Ficha</button>
                        <button onClick={() => setDadosRecibo({ valor: clienteNoModal.totalGeralDevido, desconto: 0, data: new Date().toISOString().split('T')[0], produto: "Produtos Ópticos", metodoPagamento: "Dinheiro" })} className="btn-editar-perfil" style={{ background: '#4a5d4e', color: 'white' }}>📄 Gerar Recibo</button>
                      </div>
                    )}
                  </div>

                  <h3 style={{fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px'}}>Histórico de Compras</h3>
                  {clienteNoModal.historicoVendas?.length > 0 ? (
                    clienteNoModal.historicoVendas.map((venda) => (
                      <div key={venda._id || venda.id} className="card-venda-historico">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <strong>📦 {venda.produto || 'Óculos'}</strong>
                          <div style={{display: 'flex', gap: '8px'}}>
                            <small style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={() => handleEditarDataVenda(venda._id || venda.id, venda.dataVenda)}>{venda.dataVenda?.split('-').reverse().join('/')} ✏️</small>
                            <button onClick={() => gerarPDFDocumento({
                              numero: venda.numeroPedido || "017-2026",
                              data: venda.dataVenda?.split('-').reverse().join('/'),
                              cliente: clienteNoModal.nome,
                              produto: venda.produto || "Produtos Ópticos",
                              valorProduto: venda.valorTotal + (venda.desconto || 0),
                              desconto: venda.desconto || 0,
                              valorTotal: venda.valorTotal,
                              metodoPagamento: venda.metodoPagamento 
                            }, 'pedido')} className="btn-pdf-mini">📄 Pedido</button>
                          </div>
                        </div>
                        <div className="venda-parcelas">
                          {venda.listaParcelas?.map(p => (
                            <LinhaParcela key={p.numero} p={p} vendaId={venda._id || venda.id} darBaixaParcela={darBaixaParcela} estornarBaixaParcela={estornarBaixaParcela} />
                          ))}
                        </div>
                        <button 
                          className="btn-excluir-venda" 
                          onClick={() => excluirVenda(venda._id || venda.id)}
                          style={{ marginTop: '15px', width: '100%', fontSize: '11px', background: '#fff5f5', color: '#c62828', border: '1px solid #ffebee' }}
                        >
                          🗑️ Excluir Registro de Venda
                        </button>
                      </div>
                    ))
                  ) : <p style={{color: '#999', fontStyle: 'italic'}}>Nenhuma compra registrada.</p>}
                </>
              ) : (
                <p>Carregando dados do cliente...</p>
              )}
            </div>
            <button onClick={fecharModal} className="btn-sair">Voltar para a Lista</button>
          </div>
        </div>
      )}
    </div>
  );
}