import React, { useState, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function Despesas() {
  const { despesas, adicionarDespesa, excluirDespesa, darBaixaDespesa, carregando } = useFinanceiro();

  // --- ESTADOS DE FILTRO ---
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    vencimento: new Date().toISOString().split('T')[0],
    paga: false
  });

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
    setConfirmModal({ visivel: true, mensagem, acao });
  };

  // --- LÓGICA DE FILTRAGEM ---
  const despesasFiltradas = useMemo(() => {
    return despesas
      .filter(d => {
        const [ano, mes] = d.vencimento.split('-');
        return parseInt(mes) === parseInt(mesFiltro) && parseInt(ano) === parseInt(anoFiltro);
      })
      .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
  }, [despesas, mesFiltro, anoFiltro]);

  // --- MÁSCARAS E HANDLERS ---
  const aplicarMascaraMoeda = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (!v) return '';
    v = (Number(v) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return v;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'valor') {
      setNovaDespesa({ ...novaDespesa, valor: aplicarMascaraMoeda(value) });
    } else {
      setNovaDespesa({ ...novaDespesa, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valorLimpo = Number(novaDespesa.valor.replace(/\D/g, '')) / 100;

    if (!novaDespesa.descricao || valorLimpo <= 0 || !novaDespesa.categoria) {
      mostrarToast("Preencha a descrição, valor e categoria corretamente.", "erro");
      return;
    }

    try {
      await adicionarDespesa({ 
        ...novaDespesa, 
        valor: valorLimpo,
        categoria: novaDespesa.categoria.toUpperCase()
      });
      
      setNovaDespesa({
        descricao: '', valor: '', categoria: '',
        vencimento: new Date().toISOString().split('T')[0],
        paga: false
      });
      mostrarToast("Despesa registrada no fluxo de caixa!", "sucesso");
    } catch (err) {
      mostrarToast("Erro ao salvar despesa no banco de dados.", "erro");
    }
  };

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
            <div className="text-4xl text-red-600">💸</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Ação</h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">{confirmModal.mensagem}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ visivel: false, mensagem: '', acao: null })}
                className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (confirmModal.acao) confirmModal.acao();
                  setConfirmModal({ visivel: false, mensagem: '', acao: null });
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-elos-bege/20 pb-6 gap-6">
          <div className="text-center md:text-left">
            <h1 className="font-tradicional text-4xl text-elos-verde italic">Gestão de Despesas</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Controle de Saídas e Fluxo de Caixa</p>
          </div>

          {/* FILTROS DE MÊS E ANO */}
          <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-soft border border-elos-bege/10">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Mês</label>
              <select 
                className="bg-transparent font-bold outline-none cursor-pointer text-sm" 
                value={mesFiltro} 
                onChange={(e) => setMesFiltro(e.target.value)}
              >
                {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-[1px] bg-gray-100 mx-2"></div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Ano</label>
              <input 
                type="number" 
                className="bg-transparent font-bold w-16 outline-none text-sm" 
                value={anoFiltro} 
                onChange={(e) => setAnoFiltro(e.target.value)} 
              />
            </div>
          </div>
        </header>

        {/* Formulário de Cadastro */}
        <div className="bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border border-elos-bege/10">
          <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
            <span className="w-2 h-6 bg-elos-bege rounded-full"></span>
            Registrar Novo Gasto
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Descrição do Gasto</label>
              <input type="text" name="descricao" value={novaDespesa.descricao} onChange={handleChange} placeholder="Ex: Aluguel, Nota Fornecedor X..." required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Valor</label>
              <input type="text" name="valor" value={novaDespesa.valor} onChange={handleChange} placeholder="R$ 0,00" required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl font-bold text-red-600 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Vencimento</label>
              <input type="date" name="vencimento" value={novaDespesa.vencimento} onChange={handleChange} required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Categoria (Digite manualmente)</label>
              <input type="text" name="categoria" value={novaDespesa.categoria} onChange={handleChange} placeholder="Ex: FIXO, VARIÁVEL, LABORATORIO, ESTOQUE..." required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none uppercase" />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button type="submit" className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest">
                Registrar Gasto
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Despesas Filtradas */}
        <div className="space-y-8">
          <div className="flex justify-between items-center ml-2">
            <h3 className="text-2xl font-tradicional text-elos-verde italic">Contas de {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][mesFiltro - 1]}/{anoFiltro}</h3>
            <span className="bg-elos-bege/10 text-elos-bege px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-elos-bege/20">
              {despesasFiltradas.length} Registro(s)
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {despesasFiltradas.length === 0 ? (
              <div className="bg-white p-20 rounded-[2.5rem] text-center text-gray-300 shadow-soft italic border border-dashed border-gray-100">
                Nenhuma despesa encontrada para este período.
              </div>
            ) : (
              despesasFiltradas.map(d => (
                <div 
                  key={d._id} 
                  className={`group flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] shadow-soft border-l-8 transition-all hover:scale-[1.01] ${
                    d.paga ? 'border-gray-200 opacity-60' : 'border-red-600'
                  }`}
                >
                  <div className="flex flex-col text-center md:text-left mb-4 md:mb-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest mb-2 ${d.paga ? 'text-gray-400' : 'text-red-600'}`}>
                      {d.paga ? '✓ Baixado no Caixa' : '⚠ Aguardando Pagamento'}
                    </span>
                    <strong className={`text-xl font-bold font-tradicional ${d.paga ? 'text-gray-400 line-through' : 'text-elos-verde'}`}>
                      {d.descricao}
                    </strong>
                    <div className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-tighter">
                      CATEGORIA: {d.categoria} • <span className="italic">Vencimento: {d.vencimento.split('-').reverse().join('/')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <span className={`text-3xl font-black ${d.paga ? 'text-gray-300' : 'text-red-700'}`}>
                      R$ {d.valor.toFixed(2).replace('.', ',')}
                    </span>
                    
                    <div className="flex items-center gap-4">
                      {!d.paga && (
                        <button 
                          onClick={() => abrirConfirmacao(`Deseja efetuar a baixa de "${d.descricao}" no valor de R$ ${d.valor.toFixed(2).replace('.', ',')}?`, () => {
                            darBaixaDespesa(d._id);
                            mostrarToast("Baixa realizada com sucesso!", "sucesso");
                          })} 
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Dar Baixa
                        </button>
                      )}
                      <button 
                        onClick={() => { 
                          abrirConfirmacao(`Deseja remover permanentemente o registro de despesa "${d.descricao}"?`, () => {
                            excluirDespesa(d._id);
                            mostrarToast("Despesa removida do sistema.", "sucesso");
                          });
                        }} 
                        className="p-3 text-gray-300 hover:text-red-600 transition-colors"
                        title="Excluir despesa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}