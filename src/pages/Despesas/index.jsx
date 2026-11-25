import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDespesas, useAdicionarDespesa, useDarBaixaDespesa, useExcluirDespesa } from '../../hooks/useDespesas';

// Data de hoje no fuso de Fortaleza (YYYY-MM-DD)
const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });

// Soma meses sem estourar o dia (31/01 + 1 mês = 28/02)
const somarMeses = (iso, n) => {
  const [a, m, d] = String(iso).split('T')[0].split('-').map(Number);
  const ultimoDia = new Date(a, m - 1 + n + 1, 0).getDate();
  const alvo = new Date(a, m - 1 + n, Math.min(d, ultimoDia), 12);
  return alvo.toLocaleDateString('sv-SE');
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Despesas() {
  const { data: despesas = [], isLoading: carregandoDespesas } = useDespesas();
  const adicionarDespesaMutation = useAdicionarDespesa();
  const darBaixaDespesaMutation = useDarBaixaDespesa();
  const excluirDespesaMutation = useExcluirDespesa();

  const [anoHoje, mesHoje] = hojeBR().split('-').map(Number);
  const [mesFiltro, setMesFiltro] = useState(mesHoje);
  const [anoFiltro, setAnoFiltro] = useState(anoHoje);

  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    vencimento: hojeBR(),
    parcelas: 1,
    modoParcelamento: 'DIVIDIR', // 'DIVIDIR' (parcela) | 'REPETIR' (gasto fixo mensal)
    paga: false
  });

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, mensagem: '', acao: null });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visivel: true, mensagem, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, mensagem, acao });
  };

  const despesasFiltradas = useMemo(() => {
    return despesas
      .filter((d) => {
        if (!d?.vencimento) return false;
        const [ano, mes] = String(d.vencimento).split('T')[0].split('-');
        return Number(mes) === Number(mesFiltro) && Number(ano) === Number(anoFiltro);
      })
      .sort((a, b) => String(b.vencimento || '').localeCompare(String(a.vencimento || '')));
  }, [despesas, mesFiltro, anoFiltro]);

  const aplicarMascaraMoeda = (valor) => {
    let v = String(valor).replace(/\D/g, '');
    if (!v) return '';
    v = (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return v;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'valor') {
      setNovaDespesa((prev) => ({ ...prev, valor: aplicarMascaraMoeda(value) }));
    } else if (name === 'parcelas') {
      const qtd = Number(value) || 1;
      setNovaDespesa((prev) => ({
        ...prev,
        parcelas: qtd,
        modoParcelamento: qtd === 12 ? 'REPETIR' : prev.modoParcelamento
      }));
    } else {
      setNovaDespesa((prev) => ({ ...prev, [name]: value }));
    }
  };

  const valorLimpoAtual = Number(String(novaDespesa.valor).replace(/\D/g, '')) / 100;
  const qtdParcelasAtual = Math.max(1, Number(novaDespesa.parcelas) || 1);
  const previaValorMensal = novaDespesa.modoParcelamento === 'REPETIR'
    ? valorLimpoAtual
    : valorLimpoAtual / qtdParcelasAtual;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (adicionarDespesaMutation.isPending) return;

    const descricaoLimpa = novaDespesa.descricao.trim();
    const categoriaLimpa = novaDespesa.categoria.trim().toUpperCase();

    if (!descricaoLimpa || valorLimpoAtual <= 0 || !categoriaLimpa || !novaDespesa.vencimento) {
      mostrarToast('Preencha descrição, valor, vencimento e categoria corretamente.', 'erro');
      return;
    }

    try {
      const loteDespesas = [];
      const repetirValor = novaDespesa.modoParcelamento === 'REPETIR';
      const valorBaseParcela = repetirValor
        ? parseFloat(valorLimpoAtual.toFixed(2))
        : parseFloat((valorLimpoAtual / qtdParcelasAtual).toFixed(2));
      const sobraMatematica = repetirValor
        ? 0
        : parseFloat((valorLimpoAtual - valorBaseParcela * qtdParcelasAtual).toFixed(2));

      for (let i = 0; i < qtdParcelasAtual; i++) {
        const isUltima = i === qtdParcelasAtual - 1;
        const valorDestaParcela = parseFloat((isUltima ? valorBaseParcela + sobraMatematica : valorBaseParcela).toFixed(2));
        const dataVencimento = somarMeses(novaDespesa.vencimento, i);

        const desc = qtdParcelasAtual > 1
          ? `${descricaoLimpa} (${i + 1}/${qtdParcelasAtual})`
          : descricaoLimpa;

        loteDespesas.push({
          descricao: desc,
          valor: valorDestaParcela,
          categoria: categoriaLimpa,
          vencimento: dataVencimento,
          paga: i === 0 ? novaDespesa.paga : false
        });
      }

      await adicionarDespesaMutation.mutateAsync(loteDespesas);

      setNovaDespesa({
        descricao: '',
        valor: '',
        categoria: '',
        parcelas: 1,
        modoParcelamento: 'DIVIDIR',
        vencimento: hojeBR(),
        paga: false
      });

      mostrarToast(
        qtdParcelasAtual > 1
          ? `✅ ${qtdParcelasAtual} despesas programadas com sucesso!`
          : 'Despesa registrada!',
        'sucesso'
      );
    } catch (err) {
      mostrarToast(err?.message || 'Erro ao salvar despesa no banco de dados.', 'erro');
    }
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">

      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-9999 animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${
            toast.tipo === 'sucesso' ? 'bg-elos-verde/95 border-elos-bege/30 text-white' : 'bg-red-900/95 border-red-500/30 text-red-100'
          }`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-9999 p-4">
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
                  const acao = confirmModal.acao;
                  setConfirmModal({ visivel: false, mensagem: '', acao: null });
                  if (acao) acao();
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

          <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-soft border border-elos-bege/10">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Mês</label>
              <select
                className="bg-transparent font-bold outline-none cursor-pointer text-sm"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(Number(e.target.value))}
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-px bg-gray-100 mx-2"></div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-elos-verde uppercase ml-1">Ano</label>
              <input
                type="number"
                className="bg-transparent font-bold w-16 outline-none text-sm"
                value={anoFiltro}
                onChange={(e) => setAnoFiltro(Number(e.target.value))}
              />
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border border-elos-bege/10">
          <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
            <span className="w-2 h-6 bg-elos-bege rounded-full"></span>
            Registrar Novo Gasto
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Descrição do Gasto</label>
              <input type="text" name="descricao" value={novaDespesa.descricao} onChange={handleChange} placeholder="Ex: Aluguel, Estoque de Lentes..." required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Valor</label>
              <input type="text" name="valor" value={novaDespesa.valor} onChange={handleChange} placeholder="R$ 0,00" required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl font-bold text-red-600 outline-none" />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Repetição Mensal</label>
              <select name="parcelas" value={novaDespesa.parcelas} onChange={handleChange} className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none font-bold">
                <option value="1">1x (Apenas uma vez)</option>
                <option value="2">2x (2 meses)</option>
                <option value="3">3x (3 meses)</option>
                <option value="4">4x (4 meses)</option>
                <option value="5">5x (5 meses)</option>
                <option value="6">6x (6 meses)</option>
                <option value="12">12x (Anual)</option>
              </select>
            </div>

            {qtdParcelasAtual > 1 && (
              <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-elos-fundo/40 p-4 rounded-2xl border border-elos-bege/20">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNovaDespesa((prev) => ({ ...prev, modoParcelamento: 'DIVIDIR' }))}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      novaDespesa.modoParcelamento === 'DIVIDIR'
                        ? 'bg-elos-verde text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                  >
                    Dividir valor total
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaDespesa((prev) => ({ ...prev, modoParcelamento: 'REPETIR' }))}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      novaDespesa.modoParcelamento === 'REPETIR'
                        ? 'bg-elos-verde text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                  >
                    Repetir valor cheio (fixo mensal)
                  </button>
                </div>
                {valorLimpoAtual > 0 && (
                  <span className="text-xs font-bold text-elos-verde">
                    Prévia: {qtdParcelasAtual}x de R$ {previaValorMensal.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
            )}

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">1º Vencimento</label>
              <input type="date" name="vencimento" value={novaDespesa.vencimento} onChange={handleChange} required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none" />
            </div>

            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Categoria (Manual)</label>
              <input type="text" name="categoria" value={novaDespesa.categoria} onChange={handleChange} placeholder="Ex: FIXO, MARKETING..." required className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none uppercase" />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button type="submit" disabled={adicionarDespesaMutation.isPending} className="w-full bg-elos-verde hover:bg-[#3a4a3e] disabled:bg-gray-400 text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest">
                {adicionarDespesaMutation.isPending ? 'Salvando...' : 'Registrar Gasto'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-8">
          <div className="flex justify-between items-center ml-2">
            <h3 className="text-2xl font-tradicional text-elos-verde italic">
              Contas de {MESES[mesFiltro - 1] || ''}/{anoFiltro}
            </h3>
            <span className="bg-elos-bege/10 text-elos-bege px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-elos-bege/20">
              {despesasFiltradas.length} Registro(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {carregandoDespesas ? (
              <div className="bg-white p-16 rounded-[2.5rem] text-center text-elos-verde font-bold animate-pulse uppercase text-xs tracking-widest shadow-soft">
                Carregando despesas...
              </div>
            ) : despesasFiltradas.length === 0 ? (
              <div className="bg-white p-20 rounded-[2.5rem] text-center text-gray-300 shadow-soft italic border border-dashed border-gray-100">
                Nenhuma despesa encontrada para este período.
              </div>
            ) : (
              despesasFiltradas.map((d) => {
                const valorNum = Number(d.valor || 0);
                const vencFormatado = d.vencimento
                  ? String(d.vencimento).split('T')[0].split('-').reverse().join('/')
                  : '--/--/----';

                return (
                  <div
                    key={d._id}
                    className={`group flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-4xl shadow-soft border-l-8 transition-all hover:scale-[1.01] ${
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
                        CATEGORIA: {d.categoria || 'GERAL'} • <span className="italic">Vencimento: {vencFormatado}</span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <span className={`text-3xl font-black ${d.paga ? 'text-gray-300' : 'text-red-700'}`}>
                        R$ {valorNum.toFixed(2).replace('.', ',')}
                      </span>

                      <div className="flex items-center gap-4">
                        {!d.paga && (
                          <button
                            disabled={darBaixaDespesaMutation.isPending}
                            onClick={() => abrirConfirmacao(
                              `Deseja efetuar a baixa de "${d.descricao}" no valor de R$ ${valorNum.toFixed(2).replace('.', ',')}?`,
                              async () => {
                                try {
                                  await darBaixaDespesaMutation.mutateAsync(d._id);
                                  mostrarToast('Baixa realizada com sucesso!', 'sucesso');
                                } catch (err) {
                                  mostrarToast(err?.message || 'Erro ao dar baixa na despesa.', 'erro');
                                }
                              }
                            )}
                            className="bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                          >
                            Dar Baixa
                          </button>
                        )}
                        <button
                          disabled={excluirDespesaMutation.isPending}
                          onClick={() => abrirConfirmacao(
                            `Deseja remover permanentemente o registro de despesa "${d.descricao}"?`,
                            async () => {
                              try {
                                await excluirDespesaMutation.mutateAsync(d._id);
                                mostrarToast('Despesa removida do sistema.', 'sucesso');
                              } catch (err) {
                                mostrarToast(err?.message || 'Erro ao remover despesa.', 'erro');
                              }
                            }
                          )}
                          className="p-3 text-gray-300 hover:text-red-600 disabled:opacity-40 transition-colors"
                          title="Excluir despesa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}