import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils';

// --- COMPONENTE DE LINHA DE PARCELA ---
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
          <span className="text-elos-verde ml-1 font-black">R$ {(p.valor || 0).toFixed(2).replace('.', ',')}</span>
        </span>
        {p.paga && (
          <small className="text-elos-verde font-bold text-[10px] uppercase tracking-tighter">
            🗓️ Recebido em: {p.dataPagamento?.split('-').reverse().join('/')}
          </small>
        )}
      </div>

      {p.paga ? (
        <div className="flex items-center gap-3">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">✅ Paga</span>
          <button 
            onClick={() => estornarBaixaParcela(vendaId, p.numero)} 
            className="text-[10px] text-gray-400 underline hover:text-red-500 transition-colors font-bold"
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
  const [editandoVenda, setEditandoVenda] = useState(null); // Estado para o novo modal de venda
  const [dadosRecibo, setDadosRecibo] = useState(null);

  const fecharModal = () => {
    setClienteSelecionadoCPF(null);
    setEditandoCadastro(null);
    setEditandoVenda(null);
    setDadosRecibo(null);
  };

  const salvarEdicaoCadastro = async () => {
    const clienteParaEditar = listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF);
    const idMongo = clienteParaEditar?._id;
    if (!idMongo) return alert("Erro: ID não encontrado.");
    try {
      await editarCliente(idMongo, editandoCadastro);
      setClienteSelecionadoCPF(editandoCadastro.cpf);
      setEditandoCadastro(null);
      alert("Cadastro atualizado!");
    } catch (err) { console.error(err); }
  };

  const salvarEdicaoVenda = async () => {
    if (!editandoVenda.vendaId || !editandoVenda.dataVenda) return;
    try {
      await editarDataVenda(editandoVenda.vendaId, editandoVenda.dataVenda);
      setEditandoVenda(null);
      alert("Data da venda atualizada!");
    } catch (err) { console.error(err); }
  };

  const listaFinalClientes = useMemo(() => {
    const todosCPFs = Array.from(new Set([
      ...(vendas || []).map(v => v.cpf),
      ...(clientes || []).map(c => c.cpf)
    ]));

    const lista = todosCPFs.map(cpf => {
      const dadosCad = (clientes || []).find(c => c.cpf === cpf);
      const vendasCli = (vendas || []).filter(v => v.cpf === cpf).sort((a,b) => new Date(b.dataVenda) - new Date(a.dataVenda));
      const totalDevido = vendasCli.reduce((acc, v) => acc + (v.listaParcelas || []).filter(p => !p.paga).reduce((soma, p) => soma + (p.valor || 0), 0), 0);

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

    // --- ORDEM ALFABÉTICA ---
    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
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
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Carteira de Clientes</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold italic">Base de dados unificada (A-Z)</p>
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
            <button onClick={() => setFiltro('todos')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtro === 'todos' ? 'bg-elos-verde text-white' : 'text-gray-400'}`}>TODOS</button>
            <button onClick={() => setFiltro('pendentes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtro === 'pendentes' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>⚠️ PENDENTES</button>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-3xl shadow-soft overflow-hidden border border-elos-bege/10">
        <table className="w-full text-left">
          <thead className="bg-elos-fundo/50 border-b border-gray-100">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-8 py-5">Cliente (Ordem A-Z)</th>
              <th className="px-8 py-5 text-center">Saldo Devedor</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clientesExibidos.map((cliente) => (
              <tr key={cliente.cpf} className="hover:bg-elos-fundo/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="font-bold text-elos-verde group-hover:underline cursor-pointer" onClick={() => setClienteSelecionadoCPF(cliente.cpf)}>{cliente.nome}</div>
                  <div className="text-[10px] text-gray-400">{cliente.cpf}</div>
                </td>
                <td className={`px-8 py-5 text-center font-black ${cliente.totalGeralDevido > 0 ? 'text-red-600' : 'text-elos-verde'}`}>
                  R$ {cliente.totalGeralDevido.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setClienteSelecionadoCPF(cliente.cpf)} className="px-4 py-2 bg-elos-fundo text-elos-verde rounded-xl font-bold text-xs hover:bg-elos-verde hover:text-white transition-all shadow-sm">Ver Ficha</button>
                    <button onClick={() => { if(confirm("Excluir cadastro deste cliente?")) excluirCliente(cliente.cpf) }} className="p-2 text-red-200 hover:text-red-600 transition-colors">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clienteNoModal && clienteSelecionadoCPF && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={fecharModal}>
          <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
            <button onClick={fecharModal} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-elos-fundo rounded-full text-2xl text-gray-400 hover:text-red-500 z-10">&times;</button>
            
            <header className="p-10 bg-elos-fundo/50 border-b border-elos-bege/20 text-center md:text-left">
              <h2 className="font-tradicional text-3xl text-elos-verde italic leading-tight">{clienteNoModal.nome}</h2>
              <div className="flex gap-2 justify-center md:justify-start mt-2">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border px-2 py-0.5 rounded-md">CPF: {clienteNoModal.cpf}</span>
              </div>
            </header>
            
            <div className="p-10 overflow-y-auto flex-1 bg-white space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-elos-fundo/30 p-6 rounded-3xl border border-elos-bege/20 shadow-inner">
                <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Contato</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.telefone || "Não cadastrado"}</p></div>
                <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Endereço</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.endereco || "Não cadastrado"}</p></div>
                <div className="md:col-span-2 border-t border-elos-bege/10 pt-4"><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Observações / Receitas</h4><p className="text-sm italic text-elos-texto whitespace-pre-wrap">{clienteNoModal.observacoes || "Nenhuma observação."}</p></div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => setEditandoCadastro({...clienteNoModal})} className="flex-1 py-4 bg-white border-2 border-elos-bege/30 text-elos-verde font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-elos-bege hover:text-white transition-all">✏️ Editar Cadastro</button>
                <button onClick={() => setDadosRecibo({ valor: clienteNoModal.totalGeralDevido, desconto: 0, data: new Date().toISOString().split('T')[0], produto: "Produtos Ópticos", metodoPagamento: "Dinheiro" })} className="flex-1 py-4 bg-elos-verde text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-elos-verde/20">📄 Gerar Recibo</button>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-tradicional text-2xl text-elos-verde italic border-b border-gray-100 pb-2">Histórico de Pedidos</h3>
                {clienteNoModal.historicoVendas.map((venda, index) => {
                  const numPed = venda.numeroPedido || (2000 + (vendas.length - vendas.indexOf(venda)));
                  return (
                    <div key={venda._id || index} className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 relative group shadow-sm mb-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-elos-verde text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">PEDIDO #{numPed}</span>
                            {/* BOTÃO EDITAR DATA (Substituído prompt por Modal) */}
                            <small 
                              className="text-gray-400 font-bold uppercase text-[9px] tracking-widest cursor-pointer hover:text-elos-bege flex items-center gap-1" 
                              onClick={() => setEditandoVenda({ vendaId: venda._id, dataVenda: venda.dataVenda })}
                            >
                              {venda.dataVenda?.split('-').reverse().join('/')} <span className="text-[12px]">✏️</span>
                            </small>
                          </div>
                          <strong className="text-xl text-elos-texto block italic font-tradicional">📦 {venda.produto || 'Produtos Ópticos'}</strong>
                          <div className="mt-1 text-elos-verde font-black text-sm uppercase tracking-tighter">Valor: R$ {Number(venda.valorTotal).toFixed(2).replace('.', ',')}</div>
                        </div>
                        <button onClick={() => gerarPDFDocumento({...venda, numeroPedido: numPed, cliente: clienteNoModal.nome}, 'pedido')} className="w-full md:w-auto bg-elos-fundo text-elos-verde border-2 border-elos-bege/20 hover:bg-elos-verde hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">📄 Reemitir Pedido</button>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                        {(venda.listaParcelas || []).map((p, idx) => (
                          <LinhaParcela key={idx} p={p} vendaId={venda._id} darBaixaParcela={darBaixaParcela} estornarBaixaParcela={estornarBaixaParcela} />
                        ))}
                      </div>
                      <button className="mt-6 text-[9px] font-black text-red-200 hover:text-red-600 uppercase tracking-widest transition-colors" onClick={() => { if(confirm("Excluir esta venda permanentemente?")) excluirVenda(venda._id) }}>🗑️ Excluir Venda</button>
                    </div>
                  )
                })}
              </div>
            </div>
            <footer className="p-6 bg-elos-fundo border-t flex justify-center">
              <button onClick={fecharModal} className="bg-elos-texto text-white px-12 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-elos-verde transition-all shadow-xl">Voltar para a Lista</button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CADASTRO */}
      {editandoCadastro && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 space-y-6 shadow-2xl">
            <h2 className="font-tradicional text-2xl text-elos-verde italic text-center">Editar Perfil</h2>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black uppercase text-gray-400">Nome</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.nome} onChange={(e) => setEditandoCadastro({...editandoCadastro, nome: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">WhatsApp</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.telefone} onChange={(e) => setEditandoCadastro({...editandoCadastro, telefone: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Endereço</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.endereco} onChange={(e) => setEditandoCadastro({...editandoCadastro, endereco: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Observações / Receitas</label><textarea rows="3" className="w-full p-3 bg-elos-fundo rounded-xl outline-none resize-none" value={editandoCadastro.observacoes} onChange={(e) => setEditandoCadastro({...editandoCadastro, observacoes: e.target.value})} /></div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={salvarEdicaoCadastro} className="flex-1 bg-elos-verde text-white py-3 rounded-xl font-bold hover:bg-[#3a4a3e]">Salvar</button>
              <button onClick={() => setEditandoCadastro(null)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL DE EDIÇÃO DE DATA DA VENDA (Substituindo o prompt) */}
      {editandoVenda && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 space-y-6 shadow-2xl">
            <h2 className="font-tradicional text-2xl text-elos-verde italic text-center">Editar Data da Venda</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Nova Data</label>
                <input 
                  className="w-full p-4 bg-elos-fundo rounded-xl outline-none focus:ring-2 focus:ring-elos-bege font-bold text-center" 
                  type="date" 
                  value={editandoVenda.dataVenda} 
                  onChange={(e) => setEditandoVenda({...editandoVenda, dataVenda: e.target.value})} 
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={salvarEdicaoVenda} className="flex-1 bg-elos-verde text-white py-3 rounded-xl font-bold hover:bg-[#3a4a3e]">Atualizar</button>
              <button onClick={() => setEditandoVenda(null)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}