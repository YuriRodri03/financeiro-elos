import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils';
import CadastroClientes from '../CadastroClientes'; // ✅ IMPORTADO: Seu componente de cadastro

// --- FUNÇÃO AUXILIAR PARA MOEDA (Mantida) ---
const aplicarMascaraMoeda = (valor) => {
  let v = String(valor).replace(/\D/g, '');
  v = (Number(v) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  return v;
};

// --- COMPONENTE DE LINHA DE PARCELA (Mantido) ---
function LinhaParcela({ p, vendaId, darBaixaParcela, estornarBaixaParcela, mostrarToast }) {
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split('T')[0]);
  const [valorRecebido, setValorRecebido] = useState(p?.valor || 0);

  if (!p) return null;

  const handleBaixa = () => {
    let valor = parseFloat(valorRecebido); 
    if (isNaN(valor) || valor <= 0) {
      mostrarToast("Informe um valor válido para o pagamento.", "erro");
      return;
    }
    valor = parseFloat(valor.toFixed(2));
    darBaixaParcela(vendaId, p.numero, dataBaixa, valor);
    mostrarToast("Baixa registrada com sucesso!", "sucesso");
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
  const { vendas, clientes, darBaixaParcela, estornarBaixaParcela, excluirVenda, editarCliente, excluirCliente, editarDataVenda, carregando, editarVenda } = useFinanceiro();
  
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [clienteSelecionadoCPF, setClienteSelecionadoCPF] = useState(null);
  const [editandoCadastro, setEditandoCadastro] = useState(null);
  const [editandoVenda, setEditandoVenda] = useState(null);
  const [modalRecibo, setModalRecibo] = useState(null);

  const [novaFotoCliente, setNovaFotoCliente] = useState('');
  const [novaFotoVenda, setNovaFotoVenda] = useState('');

  // --- NOVO: ESTADO PARA EXIBIR/OCULTAR O FORMULÁRIO DE CADASTRO NA TELA ---
  const [mostrarFormCadastro, setMostrarFormCadastro] = useState(false);

  // --- ESTADOS PARA OS COMPONENTES CUSTOMIZADOS DE TOAST E CONFIRM ---
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, mensagem: mensagem, acao });
  };

  const fecharModal = () => {
    setClienteSelecionadoCPF(null);
    setEditandoCadastro(null);
    setEditandoVenda(null);
    setModalRecibo(null);
    setNovaFotoCliente(''); 
    setNovaFotoVenda('');   
  };

  const converterParaBase64 = (file, callback) => {
    const reader = new FileReader();
    reader.onloadend = () => { callback(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleMudarFotoCliente = (e) => {
    const file = e.target.files[0];
    if (file) { converterParaBase64(file, setNovaFotoCliente); }
  };

  const handleMudarFotoVenda = (e) => {
    const file = e.target.files[0];
    if (file) { converterParaBase64(file, setNovaFotoVenda); }
  };

  const salvarEdicaoCadastro = async () => {
    const clienteParaEditar = listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF);
    const idMongo = clienteParaEditar?._id;
    if (!idMongo) return mostrarToast("Erro: ID do cliente não mapeado.", "erro");

    const dadosAtualizados = {
      ...editandoCadastro,
      foto: novaFotoCliente || editandoCadastro.foto
    };

    try {
      await editarCliente(idMongo, dadosAtualizados);
      setClienteSelecionadoCPF(editandoCadastro.cpf);
      setEditandoCadastro(null);
      setNovaFotoCliente('');
      mostrarToast("Cadastro atualizado com sucesso!", "sucesso");
    } catch (err) { mostrarToast("Erro ao editar dados no servidor.", "erro"); }
  };

  const salvarEdicaoVenda = async () => {
    if (!editandoVenda.vendaId || !editandoVenda.dataVenda) return;

    const dadosAtualizados = {
      ...editandoVenda,
      foto: novaFotoVenda || editandoVenda.foto
    };

    try {
      await editarVenda(editandoVenda.vendaId, dadosAtualizados);
      setEditandoVenda(null);
      setNovaFotoVenda('');
      mostrarToast("Pedido updated com sucesso!", "sucesso");
    } catch (err) { mostrarToast("Erro ao sincronizar modificações do pedido.", "erro"); }
  };

  const handleExcluirFotoCliente = () => {
    abrirConfirmacao("Deseja remover permanentemente a foto de perfil deste cliente?", async () => {
      const idMongo = clienteNoModal?._id;
      try {
        await editarCliente(idMongo, { ...clienteNoModal, foto: '' });
        mostrarToast("Foto de perfil removida.", "sucesso");
      } catch (err) { mostrarToast("Erro ao remover arquivo.", "erro"); }
    });
  };

  const handleExcluirFotoVenda = (vendaId, vendaAtual) => {
    abrirConfirmacao("Deseja remover permanentemente a receita digital digitalizada deste pedido?", async () => {
      try {
        await editarVenda(vendaId, { ...vendaAtual, foto: '' });
        mostrarToast("Receita óptica removida do histórico.", "sucesso");
      } catch (err) { mostrarToast("Erro ao limpar arquivo.", "erro"); }
    });
  };

  const listaFinalClientes = useMemo(() => {
    const todosCPFs = Array.from(new Set([
      ...(vendas || []).map(v => v.cpf),
      ...(clientes || []).map(c => c.cpf)
    ]));

    return todosCPFs.map(cpf => {
      const dadosCad = (clientes || []).find(c => c.cpf === cpf);
      const vendasCli = (vendas || []).filter(v => v.cpf === cpf).sort((a,b) => new Date(b.dataVenda) - new Date(a.dataVenda));
      const totalDevido = vendasCli.reduce((acc, v) => acc + (v.listaParcelas || []).filter(p => !p.paga).reduce((soma, p) => soma + (p.valor || 0), 0), 0);

      return {
        ...dadosCad,
        _id: dadosCad?._id || dadosCad?.id,
        nome: dadosCad?.nome || vendasCli[0]?.cliente || "Sem Nome",
        cpf: cpf,
        telefone: dadosCad?.telefone || "Não cadastrado",
        email: dadosCad?.email || "Não cadastrado",
        endereco: dadosCad?.endereco || "Não informado",
        dataNascimento: dadosCad?.dataNascimento || "",
        observacoes: dadosCad?.observacoes || "",
        foto: dadosCad?.foto || "",
        historicoVendas: vendasCli,
        totalGeralDevido: totalDevido
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
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
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {/* TOAST PREMIUM DA ÓTICA ELOS */}
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${
            toast.tipo === 'sucesso' ? 'bg-elos-verde/95 border-elos-bege/30 text-white' : 'bg-red-900/95 border-red-500/30 text-red-100'
          }`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl border border-elos-bege/20 animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-elos-verde">👓</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Ação</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">{confirmModal.mensagem}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ visivel: false, mensagem: '', acao: null })}
                className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Não
              </button>
              <button 
                onClick={() => {
                  if (confirmModal.acao) confirmModal.acao();
                  setConfirmModal({ visivel: false, mensagem: '', acao: null });
                }}
                className="flex-1 py-3 bg-elos-verde text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-elos-verde/20 hover:bg-[#3a4a3e] transition-all"
              >
                Sim, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Carteira de Clientes</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black italic">Base de dados unificada (A-Z)</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* ✅ NOVO: Botão rápido para abrir/fechar o painel de cadastro */}
          <button 
            type="button"
            onClick={() => setMostrarFormCadastro(!mostrarFormCadastro)}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2 ${
              mostrarFormCadastro ? 'bg-elos-bege text-white' : 'bg-elos-verde text-white'
            }`}
          >
            {mostrarFormCadastro ? '📁 Ocultar Cadastro' : '➕ Cadastrar Cliente'}
          </button>

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

      {/* ✅ NOVO: Renderiza a sua página de CadastroClientes de forma embutida se o botão for clicado */}
      {mostrarFormCadastro && (
        <div className="mb-10 animate-in slide-in-from-top-4 duration-300">
          <CadastroClientes />
        </div>
      )}

      {/* TABELA DE CLIENTES */}
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
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        abrirConfirmacao(`Deseja remover permanentemente da base o cadastro de ${cliente.nome}?`, () => excluirCliente(cliente.cpf));
                      }} 
                      className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DA FICHA DO CLIENTE */}
      {clienteNoModal && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={fecharModal}>
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
            <button onClick={fecharModal} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-elos-fundo rounded-full text-2xl text-gray-400 hover:text-red-500 z-10">&times;</button>
            
            <header className="p-10 bg-elos-fundo/50 border-b border-elos-bege/20">
              <h2 className="font-tradicional text-3xl text-elos-verde italic leading-tight">{clienteNoModal.nome}</h2>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border px-2 py-0.5 rounded-md">CPF: {clienteNoModal.cpf}</span>
              </div>
            </header>
            
            <div className="p-10 overflow-y-auto flex-1 bg-white space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-elos-fundo/30 p-6 rounded-3xl border border-elos-bege/20 shadow-inner h-fit">
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Contato</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.telefone || "Não cadastrado"}</p></div>
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">E-mail</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.email || "Não cadastrado"}</p></div>
                  
                  <div>
                    <h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Data de Nascimento</h4>
                    <p className="text-sm font-bold text-elos-texto">
                      {clienteNoModal.dataNascimento ? clienteNoModal.dataNascimento.split('-').reverse().join('/') : "Não informada"}
                    </p>
                  </div>
                  
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Endereço</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.endereco || "Não cadastrado"}</p></div>
                  <div className="md:col-span-2 border-t border-elos-bege/10 pt-4"><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Observações</h4><p className="text-sm italic text-elos-texto whitespace-pre-wrap">{clienteNoModal.observacoes || "Nenhuma observação."}</p></div>
                </div>

                <div className="bg-elos-fundo/30 p-4 rounded-3xl border border-elos-bege/20 flex flex-col items-center justify-center min-h-[200px] relative group">
                  {clienteNoModal.foto ? (
                    <>
                      <img 
                        src={clienteNoModal.foto} 
                        alt="Foto do Cliente" 
                        className="w-full h-auto rounded-2xl shadow-lg cursor-zoom-in transition-transform hover:scale-[1.02]"
                        onClick={() => window.open(clienteNoModal.foto, '_blank')}
                      />
                      <button onClick={handleExcluirFotoCliente} className="mt-3 text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">🗑️ Excluir Foto</button>
                    </>
                  ) : (
                    <div className="text-center text-gray-300 italic py-10">
                      <div className="text-3xl mb-2 opacity-20">📸</div>
                      <p className="text-[10px] uppercase font-bold tracking-widest">Sem Foto</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => setEditandoCadastro({...clienteNoModal})} className="flex-1 py-4 bg-white border-2 border-elos-bege/30 text-elos-verde font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-elos-bege hover:text-white transition-all">✏️ Editar Cadastro</button>
                <button 
                  onClick={() => setModalRecibo({ 
                    valorFmt: aplicarMascaraMoeda(String(clienteNoModal.totalGeralDevido * 100)), 
                    produto: "Pagamento de saldo devedor", 
                    data: new Date().toISOString().split('T')[0], 
                    metodo: "Dinheiro" 
                  })} 
                  className="flex-1 py-4 bg-elos-verde text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-elos-verde/20"
                >
                  📄 Gerar Recibo
                </button>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-tradicional text-2xl text-elos-verde italic border-b border-gray-100 pb-2">Histórico de Pedidos</h3>
                {clienteNoModal.historicoVendas.map((venda, index) => {
                  const numPed = venda.numeroPedido || "S/N";
                  
                  const produtosLista = venda.itensCarrinho && venda.itensCarrinho.length > 0 
                    ? venda.itensCarrinho.map(item => item.nome)
                    : String(venda.produto || '').split('+').map(p => p.trim());

                  return (
                    <div key={venda._id || index} className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 relative group shadow-sm mb-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="bg-elos-verde text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">PEDIDO #{numPed}</span>
                            <small className="text-gray-400 font-bold uppercase text-[9px] tracking-widest cursor-pointer hover:text-elos-bege" onClick={() => setEditandoVenda({...venda, vendaId: venda._id || venda.id})}>
                              {venda.dataVenda?.split('-').reverse().join('/')} ✏️
                            </small>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {produtosLista.map((prodNome, pIdx) => (
                              <div 
                                key={pIdx} 
                                className="flex items-center bg-elos-fundo border border-elos-bege/30 px-3.5 py-1.5 rounded-xl shadow-xs"
                              >
                                <span className="text-xs font-black text-elos-texto tracking-wide uppercase">
                                  👓 {prodNome}
                                </span>
                              </div>
                            ))}
                            {produtosLista.length === 0 && (
                              <span className="text-xs text-gray-400 italic">Nenhum item especificado</span>
                            )}
                          </div>

                          <div className="mt-2 text-elos-verde font-black text-sm uppercase tracking-tighter">
                            Valor Total: R$ {Number(venda.valorTotal).toFixed(2).replace('.', ',')}
                          </div>
                          
                          {venda.foto && (
                            <div className="mt-4 p-2 bg-elos-fundo rounded-2xl border border-elos-bege/10 w-fit relative group">
                              <p className="text-[8px] font-black uppercase text-elos-bege mb-1 ml-1">Receita Anexada:</p>
                              <img 
                                src={venda.foto} 
                                alt="Receita" 
                                className="h-20 w-auto rounded-lg shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(venda.foto, '_blank')}
                              />
                              <button 
                                onClick={() => handleExcluirFotoVenda(venda._id || venda.id, venda)}
                                className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {venda.observacoes && (
                            <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 p-3 rounded-xl border-l-4 border-elos-bege">
                              {venda.observacoes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <button 
  onClick={() => {
    const valorTotalNum = Number(venda.valorTotal || 0);
    const descontoNum = Number(venda.desconto || 0);
    
    // O subtotal bruto real de fábrica (Ex: 9 + 1 = 10)
    const subtotalBruto = valorTotalNum + descontoNum;

    gerarPDFDocumento({
      ...venda,
      numeroPedido: numPed, 
      cliente: clienteNoModal.nome, 
      email: clienteNoModal.email, 
      endereco: clienteNoModal.endereco, 
      telefone: clienteNoModal.telefone,
      
      // Injeta os dados financeiros de forma estática e explícita
      valorProduto: subtotalBruto,
      desconto: descontoNum,
      valorTotal: valorTotalNum,

      // Garante a tabela limpa
      itensCarrinho: [{ 
        nome: venda.produto || "PRODUTO ÓPTICO", 
        preco: subtotalBruto 
      }],
      data: venda.dataVenda ? venda.dataVenda.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR'),
    }, 'pedido');
  }} 
  className="flex-1 md:flex-none bg-elos-fundo text-elos-verde border-2 border-elos-bege/20 hover:bg-elos-verde hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all"
>
  📄 Reemitir
</button>
                          <button 
                            onClick={() => { abrirConfirmacao("Deseja excluir este contrato permanentemente? Esta ação removerá as pendências financeiras associadas.", () => excluirVenda(venda._id || venda.id)); }} 
                            className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                        {(venda.listaParcelas || []).map((p, idx) => (
                          <LinhaParcela key={idx} p={p} vendaId={venda._id || venda.id} darBaixaParcela={darBaixaParcela} estornarBaixaParcela={estornarBaixaParcela} mostrarToast={mostrarToast} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CADASTRO */}
      {editandoCadastro && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-tradicional text-2xl text-elos-verde italic text-center">Editar Perfil</h2>
            
            <div className="flex flex-col items-center gap-3 bg-elos-fundo/50 p-4 rounded-2xl border border-elos-bege/10">
              <img 
                src={novaFotoCliente || editandoCadastro.foto || 'https://via.placeholder.com/150'} 
                alt="Preview" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
              <div className="relative">
                <button type="button" className="px-4 py-2 bg-elos-bege text-white rounded-full text-xs font-bold hover:bg-elos-verde transition-all">
                  Alterar Foto 📸
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleMudarFotoCliente} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>
              {novaFotoCliente && <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Nova foto selecionada!</p>}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div><label className="text-[10px] font-black uppercase text-gray-400">Nome</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.nome} onChange={(e) => setEditandoCadastro({...editandoCadastro, nome: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">CPF</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.cpf} onChange={(e) => setEditandoCadastro({...editandoCadastro, cpf: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Data de Nascimento</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none text-gray-500" type="date" value={editandoCadastro.dataNascimento || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, dataNascimento: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">WhatsApp</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.telefone} onChange={(e) => setEditandoCadastro({...editandoCadastro, telefone: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">E-mail</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="email" value={editandoCadastro.email || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, email: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Endereço</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.endereco} onChange={(e) => setEditandoCadastro({...editandoCadastro, endereco: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Observações</label><textarea rows="3" className="w-full p-3 bg-elos-fundo rounded-xl outline-none resize-none" value={editandoCadastro.observacoes} onChange={(e) => setEditandoCadastro({...editandoCadastro, observacoes: e.target.value})} /></div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={salvarEdicaoCadastro} className="flex-1 bg-elos-verde text-white py-3 rounded-xl font-bold hover:bg-[#3a4a3e]">Salvar</button>
              <button onClick={() => setEditandoCadastro(null)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE VENDA */}
      {editandoVenda && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-tradicional text-2xl text-elos-verde italic text-center">Editar Pedido</h2>
            
            <div className="flex flex-col items-center gap-3 bg-elos-fundo/50 p-4 rounded-2xl border border-elos-bege/10">
              {novaFotoVenda || editandoVenda.foto ? (
                <img 
                  src={novaFotoVenda || editandoVenda.foto} 
                  alt="Preview Receita" 
                  className="max-h-32 rounded-xl shadow-md border-2 border-white"
                />
              ) : (
                <div className="w-full h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 italic text-xs">Sem receita anexada</div>
              )}
              <div className="relative">
                <button type="button" className="px-4 py-2 bg-elos-bege text-white rounded-full text-xs font-bold hover:bg-elos-verde transition-all">
                  Alterar Receita 📸
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleMudarFotoVenda} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>
              {novaFotoVenda && <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Nova receita selecionada!</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Data da Venda</label>
                <input className="w-full p-3 bg-elos-fundo rounded-xl outline-none focus:ring-2 focus:ring-elos-bege font-bold text-center" type="date" value={editandoVenda.dataVenda} onChange={(e) => setEditandoVenda({...editandoVenda, dataVenda: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Produto/Serviço</label>
                <input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoVenda.produto} onChange={(e) => setEditandoVenda({...editandoVenda, produto: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Observações Técnicas</label>
                <textarea rows="4" className="w-full p-3 bg-elos-fundo rounded-xl outline-none resize-none italic" value={editandoVenda.observacoes} onChange={(e) => setEditandoVenda({...editandoVenda, observacoes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={salvarEdicaoVenda} className="flex-1 bg-elos-verde text-white py-3 rounded-xl font-bold">Atualizar</button>
              <button onClick={() => setEditandoVenda(null)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERAR RECIBO */}
      {modalRecibo && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 space-y-6 shadow-2xl border border-elos-bege/20">
            <div className="text-center">
              <h2 className="font-tradicional text-2xl text-elos-verde italic">Emitir Recibo</h2>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Confirme os valores abaixo</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor do Recebimento</label>
                <input className="w-full p-4 bg-elos-fundo rounded-xl outline-none focus:ring-2 focus:ring-elos-bege font-bold text-elos-verde text-lg" type="text" value={modalRecibo.valorFmt} onChange={(e) => setModalRecibo({...modalRecibo, valorFmt: aplicarMascaraMoeda(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Referente a:</label>
                <input className="w-full p-4 bg-elos-fundo rounded-xl outline-none text-sm" type="text" placeholder="Ex: Pagamento de parcelas, Entrada..." value={modalRecibo.produto} onChange={(e) => setModalRecibo({...modalRecibo, produto: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Data</label><input className="w-full p-3 bg-elos-fundo rounded-xl text-xs outline-none" type="date" value={modalRecibo.data} onChange={(e) => setModalRecibo({...modalRecibo, data: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Método</label>
                  <select className="w-full p-3 bg-elos-fundo rounded-xl text-xs outline-none" value={modalRecibo.metodo} onChange={(e) => setModalRecibo({...modalRecibo, metodo: e.target.value})}>
                    <option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartão">Cartão</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => {
                  const valorLimpo = Number(modalRecibo.valorFmt.replace(/\D/g, '')) / 100;
                  gerarPDFDocumento({
                    cliente: clienteNoModal.nome, cpf: clienteNoModal.cpf, telefone: clienteNoModal.telefone, endereco: clienteNoModal.endereco, email: clienteNoModal.email,
                    valorTotal: valorLimpo, produto: modalRecibo.produto, data: modalRecibo.data.split('-').reverse().join('/'), metodoPagamento: modalRecibo.metodo, desconto: 0,
                    itensCarrinho: [{ nome: modalRecibo.produto.toUpperCase(), preco: valorLimpo }]
                  }, 'recibo');
                  setModalRecibo(null);
                }} className="flex-1 bg-elos-verde text-white py-4 rounded-2xl font-bold hover:bg-[#3a4a3e] shadow-lg shadow-elos-verde/20 transition-all active:scale-[0.95]">Gerar PDF</button>
              <button onClick={() => setModalRecibo(null)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}