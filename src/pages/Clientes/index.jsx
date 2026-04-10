import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils';

// --- COMPONENTE DE LINHA DE PARCELA (Refatorado com Tailwind) ---
function LinhaParcela({ p, vendaId, darBaixaParcela, estornarBaixaParcela }) {
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split('T')[0]);
  const [valorRecebido, setValorRecebido] = useState(p?.valor || 0);

  if (!p) return null;

  const handleBaixa = () => {
    const valor = parseFloat(valorRecebido);
    if (isNaN(valor) || valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    darBaixaParcela(vendaId, p.numero, dataBaixa, valor);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 border-b border-gray-100 gap-4">
      <div className="flex flex-col">
        <span className="font-bold text-elos-texto">
          {p.numero === 0 ? "Entrada" : `${p.numero}ª Parcela`} — 
          <span className="text-elos-verde ml-1">R$ {(p.valor || 0).toFixed(2).replace('.', ',')}</span>
        </span>
        {p.paga && (
          <small className="text-elos-verde font-bold text-[10px] uppercase tracking-tighter">
            🗓️ Recebido em: {p.dataPagamento?.split('-').reverse().join('/')}
          </small>
        )}
      </div>

      {p.paga ? (
        <div className="flex items-center gap-3">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">✅ Paga</span>
          <button 
            onClick={() => estornarBaixaParcela(vendaId, p.numero)} 
            className="text-[10px] text-gray-400 underline hover:text-red-500 transition-colors"
          >
            (Estornar)
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-end w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase">Valor Pago</label>
            <input 
              type="number" 
              className="w-24 p-2 bg-elos-fundo rounded-lg text-xs border-none focus:ring-1 focus:ring-elos-bege"
              value={valorRecebido} 
              onChange={(e) => setValorRecebido(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase">Data</label>
            <input 
              type="date" 
              className="p-2 bg-elos-fundo rounded-lg text-xs border-none focus:ring-1 focus:ring-elos-bege"
              value={dataBaixa} 
              onChange={(e) => setDataBaixa(e.target.value)}
            />
          </div>
          <button 
            className="bg-elos-verde text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-elos-verde/90 transition-all active:scale-95 shadow-md shadow-elos-verde/10"
            onClick={handleBaixa}
          >
            Confirmar
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
    const clienteParaEditar = listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF);
    if (!editandoCadastro?.nome || !editandoCadastro?.cpf) {
      alert("Nome e CPF são obrigatórios!");
      return;
    }
    const idMongo = clienteParaEditar?._id;
    if (!idMongo) {
      alert("Erro: ID interno do cliente não encontrado.");
      return;
    }

    try {
      await editarCliente(idMongo, editandoCadastro);
      setClienteSelecionadoCPF(editandoCadastro.cpf);
      setEditandoCadastro(null);
      alert("Cadastro atualizado!");
    } catch (err) {
      console.error(err);
    }
  };

  const listaFinalClientes = useMemo(() => {
    const todosCPFs = Array.from(new Set([
      ...(vendas || []).map(v => v.cpf),
      ...(clientes || []).map(c => c.cpf)
    ]));

    return todosCPFs.map(cpf => {
      const dadosCad = (clientes || []).find(c => c.cpf === cpf);
      const vendasCli = (vendas || []).filter(v => v.cpf === cpf);
      const totalDevido = vendasCli.reduce((acc, v) => {
        return acc + (v.listaParcelas || []).filter(p => !p.paga).reduce((soma, p) => soma + (p.valor || 0), 0);
      }, 0);

      return {
        _id: dadosCad?._id || dadosCad?.id,
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
    return listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF) || null;
  }, [clienteSelecionadoCPF, listaFinalClientes]);

  const clientesExibidos = listaFinalClientes.filter(c => {
    const passaFiltroStatus = filtro === 'pendentes' ? (c.totalGeralDevido || 0) > 0.01 : true;
    const termo = busca.toLowerCase();
    return passaFiltroStatus && (c.nome.toLowerCase().includes(termo) || c.cpf.includes(termo));
  });

  if (carregando) return null;

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Carteira de Clientes</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold italic">Base de dados unificada</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <input 
            type="text" 
            className="px-6 py-3 bg-white rounded-2xl shadow-soft border border-elos-bege/20 focus:outline-none focus:ring-2 focus:ring-elos-bege text-sm w-full md:w-80"
            placeholder="🔍 Buscar por nome ou CPF..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="flex bg-white p-1 rounded-2xl shadow-soft border border-elos-bege/10">
            <button 
              onClick={() => setFiltro('todos')} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtro === 'todos' ? 'bg-elos-verde text-white' : 'text-gray-400'}`}
            >
              TODOS ({listaFinalClientes.length})
            </button>
            <button 
              onClick={() => setFiltro('pendentes')} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtro === 'pendentes' ? 'bg-red-600 text-white' : 'text-gray-400'}`}
            >
              ⚠️ INADIMPLENTES
            </button>
          </div>
        </div>
      </header>

      {/* TABELA */}
      <div className="bg-white rounded-3xl shadow-soft overflow-hidden border border-elos-bege/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-elos-fundo/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Cliente / CPF</th>
                <th className="px-8 py-5">Contato</th>
                <th className="px-8 py-5 text-center">Saldo Devedor</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientesExibidos.map((cliente) => (
                <tr key={cliente.cpf} className="hover:bg-elos-fundo/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-elos-verde group-hover:underline cursor-pointer" onClick={() => setClienteSelecionadoCPF(cliente.cpf)}>{cliente.nome}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{cliente.cpf}</div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-500">{cliente.telefone}</td>
                  <td className={`px-8 py-5 text-center font-black ${cliente.totalGeralDevido > 0 ? 'text-red-600' : 'text-elos-verde'}`}>
                    R$ {(cliente.totalGeralDevido || 0).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${cliente.totalGeralDevido > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {cliente.totalGeralDevido > 0 ? 'Pendente' : 'Quitado'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setClienteSelecionadoCPF(cliente.cpf)} className="p-2 bg-elos-fundo text-elos-verde rounded-xl hover:bg-elos-verde hover:text-white transition-all">
                        📄 Ficha
                      </button>
                      <button onClick={() => { if(confirm("Deseja excluir este cliente?")) excluirCliente(cliente.cpf) }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FICHA DO CLIENTE */}
      {clienteSelecionadoCPF && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative">
            
            <button onClick={fecharModal} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-elos-fundo rounded-full text-2xl text-gray-400 hover:text-red-500 z-10">&times;</button>
            
            <header className="p-10 bg-elos-fundo/50 border-b border-elos-bege/20">
              <h2 className="font-tradicional text-3xl text-elos-verde italic">
                {editandoCadastro ? `Editando Perfil` : (clienteNoModal?.nome)}
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                {editandoCadastro ? 'Alteração de dados cadastrais' : 'Ficha de Acompanhamento Financeiro'}
              </p>
            </header>
            
            <div className="p-10 overflow-y-auto flex-1 bg-white">
              {editandoCadastro ? (
                /* FORMULÁRIO DE EDIÇÃO */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-elos-fundo/30 p-8 rounded-3xl border-2 border-elos-bege/30">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-elos-verde uppercase ml-1">Nome Completo</label>
                    <input className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-elos-bege" type="text" value={editandoCadastro.nome} onChange={(e) => setEditandoCadastro({...editandoCadastro, nome: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-elos-verde uppercase ml-1">CPF</label>
                    <input className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-elos-bege" type="text" value={editandoCadastro.cpf} onChange={(e) => setEditandoCadastro({...editandoCadastro, cpf: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-elos-verde uppercase ml-1">WhatsApp</label>
                    <input className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-elos-bege" type="text" value={editandoCadastro.telefone} onChange={(e) => setEditandoCadastro({...editandoCadastro, telefone: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-elos-verde uppercase ml-1">Endereço</label>
                    <input className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-elos-bege" type="text" value={editandoCadastro.endereco} onChange={(e) => setEditandoCadastro({...editandoCadastro, endereco: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] font-black text-elos-verde uppercase ml-1">Observações Internas</label>
                    <textarea className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-elos-bege" rows="3" value={editandoCadastro.observacoes} onChange={(e) => setEditandoCadastro({...editandoCadastro, observacoes: e.target.value})} />
                  </div>
                  <div className="flex gap-3 md:col-span-2 mt-4">
                    <button onClick={salvarEdicao} className="flex-1 bg-elos-verde text-white py-3 rounded-2xl font-bold shadow-lg shadow-elos-verde/20">Salvar Alterações</button>
                    <button onClick={() => setEditandoCadastro(null)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold">Cancelar</button>
                  </div>
                </div>
              ) : clienteNoModal ? (
                /* VISUALIZAÇÃO DA FICHA */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-elos-fundo p-6 rounded-3xl border border-elos-bege/20 flex flex-col justify-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase italic">Dados de Contato</span>
                      <p className="font-bold text-elos-texto mt-1">{clienteNoModal.telefone}</p>
                      <p className="text-xs text-gray-500 truncate">{clienteNoModal.endereco}</p>
                    </div>
                    <div className="bg-elos-fundo p-6 rounded-3xl border border-elos-bege/20 flex flex-col justify-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase italic">Documento</span>
                      <p className="font-bold text-elos-texto mt-1 font-mono">{clienteNoModal.cpf}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setEditandoCadastro({...clienteNoModal})} className="w-full py-3 bg-white border-2 border-elos-bege text-elos-bege font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-elos-bege hover:text-white transition-all">✏️ Editar Ficha</button>
                      <button onClick={() => setDadosRecibo({ valor: clienteNoModal.totalGeralDevido, desconto: 0, data: new Date().toISOString().split('T')[0], produto: "Produtos Ópticos", metodoPagamento: "Dinheiro" })} className="w-full py-3 bg-elos-verde text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-elos-verde/10">📄 Gerar Recibo</button>
                    </div>
                  </div>

                  {/* CONFIGURAÇÃO DE RECIBO RÁPIDO */}
                  {dadosRecibo && (
                    <div className="mb-10 p-8 bg-primary text-white rounded-[32px] animate-in fade-in zoom-in duration-300">
                      <h4 className="font-tradicional italic text-xl mb-4">Emissão de Recibo Avulso</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <input className="p-3 rounded-xl bg-white/10 border-white/20 text-white placeholder-white/40" type="number" value={dadosRecibo.valor} onChange={(e) => setDadosRecibo({...dadosRecibo, valor: e.target.value})} placeholder="Valor Bruto" />
                        <input className="p-3 rounded-xl bg-white/10 border-white/20 text-white placeholder-white/40" type="number" value={dadosRecibo.desconto} onChange={(e) => setDadosRecibo({...dadosRecibo, desconto: e.target.value})} placeholder="Desconto" />
                        <select className="col-span-2 p-3 rounded-xl bg-white/10 border-white/20 text-white" value={dadosRecibo.metodoPagamento} onChange={(e) => setDadosRecibo({...dadosRecibo, metodoPagamento: e.target.value})}>
                          <option className="text-black" value="Dinheiro">Dinheiro</option>
                          <option className="text-black" value="Pix">Pix</option>
                          <option className="text-black" value="Cartão de Crédito">Cartão de Crédito</option>
                        </select>
                        <button className="col-span-1 bg-white text-primary py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest" onClick={async () => {
                          await gerarPDFDocumento({
                            numero: "REC-" + Date.now().toString().slice(-4), 
                            data: new Date().toLocaleDateString('pt-BR'), 
                            cliente: clienteNoModal.nome, 
                            produto: dadosRecibo.produto, 
                            valorProduto: Number(dadosRecibo.valor), 
                            desconto: Number(dadosRecibo.desconto),
                            valorTotal: Number(dadosRecibo.valor) - Number(dadosRecibo.desconto),
                            metodoPagamento: dadosRecibo.metodoPagamento 
                          }, 'recibo');
                          setDadosRecibo(null);
                        }}>✅ Gerar PDF</button>
                        <button className="col-span-1 bg-red-900/30 text-white py-3 rounded-2xl font-black text-[10px] uppercase" onClick={() => setDadosRecibo(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  <h3 className="font-tradicional text-2xl text-elos-verde italic mb-6 border-b border-gray-100 pb-4">Histórico de Compras</h3>
                  <div className="space-y-8">
                    {(clienteNoModal.historicoVendas || []).length > 0 ? (
                      clienteNoModal.historicoVendas.map((venda) => (
                        <div key={venda._id || venda.id} className="bg-elos-fundo/20 p-8 rounded-[32px] border border-gray-100 relative group">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <strong className="text-xl text-elos-texto block">📦 {venda.produto || 'Produtos Ópticos'}</strong>
                              <span className="text-[10px] font-black text-elos-bege uppercase tracking-widest cursor-pointer hover:underline" onClick={() => handleEditarDataVenda(venda._id || venda.id, venda.dataVenda)}>
                                Data: {venda.dataVenda?.split('-').reverse().join('/')} ✏️
                              </span>
                            </div>
                            <button onClick={() => gerarPDFDocumento({...venda, cliente: clienteNoModal.nome}, 'pedido')} className="bg-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-gray-100 hover:shadow-md transition-all">📄 Reemitir Pedido</button>
                          </div>
                          
                          <div className="bg-white rounded-2xl p-4 shadow-inner border border-gray-50">
                            {(venda.listaParcelas || []).map((p, idx) => (
                              <LinhaParcela key={p.numero || idx} p={p} vendaId={venda._id || venda.id} darBaixaParcela={darBaixaParcela} estornarBaixaParcela={estornarBaixaParcela} />
                            ))}
                          </div>

                          <button 
                            className="mt-6 text-[10px] font-bold text-red-300 hover:text-red-600 uppercase tracking-tighter transition-colors"
                            onClick={() => { if(confirm("Excluir esta venda permanentemente?")) excluirVenda(venda._id || venda.id) }}
                          >
                            🗑️ Excluir registro desta venda
                          </button>
                        </div>
                      ))
                    ) : <p className="text-center text-gray-300 italic py-10">Nenhuma compra registrada até o momento.</p>}
                  </div>
                </>
              ) : null}
            </div>
            
            <footer className="p-6 bg-elos-fundo border-t flex justify-center">
              <button onClick={fecharModal} className="bg-elos-texto text-white px-12 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-elos-verde transition-all shadow-xl">Voltar para a Lista</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}