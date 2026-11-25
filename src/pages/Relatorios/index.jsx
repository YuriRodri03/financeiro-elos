import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVendas, useEditarVenda } from '../../hooks/useVendas';
import { useClientes } from '../../hooks/useClientes';

// Data de hoje cravada no fuso de Fortaleza (YYYY-MM-DD)
const obterHojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });

// Soma meses a uma data YYYY-MM-DD sem estourar o dia (31/01 + 1 mês = 28/02)
const somarMeses = (iso, n) => {
  const [a, m, d] = String(iso).split('T')[0].split('-').map(Number);
  if (!a || !m || !d) return null;
  const ultimoDia = new Date(a, m - 1 + n + 1, 0).getDate();
  const alvo = new Date(a, m - 1 + n, Math.min(d, ultimoDia), 12);
  return Number.isNaN(alvo.getTime()) ? null : alvo.toLocaleDateString('sv-SE');
};

const normalizarIso = (data) => (data ? String(data).split('T')[0] : '');
const limparCpf = (cpf) => String(cpf || '').replace(/\D/g, '');

// Normaliza o telefone para o WhatsApp (evita 55 duplicado)
const normalizarFone = (telefone) => {
  let n = String(telefone || '').replace(/\D/g, '');
  if (!n) return '';
  if (n.startsWith('55') && n.length >= 12) n = n.slice(2);
  return `55${n}`;
};

// Contrato que já foi renegociado (a dívida passou para um novo acordo)
const foiRenegociada = (venda) =>
  venda?.renegociada === true || String(venda?.observacoes || '').includes('DÍVIDA RENEGOCIADA');

// Contrato que é o NOVO acordo gerado por uma renegociação
const ehAcordoRenegociacao = (venda) => String(venda?.produto || '').includes('RENEGOCIAÇÃO');

// Calcula a data exata de vencimento respeitando renegociações, vencimentoOriginal e parcelas parciais (.5)
const calcularDataVencimentoParcela = (venda, parcela) => {
  const dataSalva = parcela.dataVencimento || parcela.vencimentoOriginal;
  if (dataSalva) {
    const iso = normalizarIso(dataSalva);
    const data = new Date(`${iso}T00:00:00-03:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  if (Number(parcela.numero) === 0) {
    const baseEntrada = normalizarIso(venda.dataEntrada || venda.dataVenda);
    if (!baseEntrada) return null;
    const data = new Date(`${baseEntrada}T00:00:00-03:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const dataBase = normalizarIso(venda.dataPrimeiraParcela || venda.dataVenda);
  if (!dataBase) return null;

  const indiceMes = Math.max(0, Math.floor(Number(parcela.numero)) - 1);
  const dataCalculada = somarMeses(dataBase, indiceMes);
  if (!dataCalculada) return null;

  const data = new Date(`${dataCalculada}T00:00:00-03:00`);
  return Number.isNaN(data.getTime()) ? null : data;
};

const obterParcelasVencidas = (venda, hojeStr) => {
  if (foiRenegociada(venda)) return [];

  return (venda.listaParcelas || [])
    .filter((p) => !p.paga && !p.renegociada && Number(p.valor) > 0)
    .map((p) => {
      const dataVencimentoReal = calcularDataVencimentoParcela(venda, p);
      if (!dataVencimentoReal) return null;
      const dataVencStr = dataVencimentoReal.toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });
      return { ...p, dataVencimentoReal, dataVencStr };
    })
    .filter((p) => p && p.dataVencStr < hojeStr);
};

export default function RelatorioInadimplencia() {
  const { data: vendas = [], isLoading: carregandoVendas } = useVendas();
  const { data: clientes = [], isLoading: carregandoClientes } = useClientes();
  const editarVendaMutation = useEditarVenda();

  const carregando = carregandoVendas || carregandoClientes;

  const [dataPrevisaoTemp, setDataPrevisaoTemp] = useState({});
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const toastTimerRef = useRef(null);

  const hojeStr = obterHojeBR();

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

  const salvarPrevisao = async (vendaId, data) => {
    try {
      await editarVendaMutation.mutateAsync({ vendaId, dadosNovos: { dataPrevisaoPagamento: data } });
      mostrarToast(
        data ? 'Prazo de pagamento registrado com sucesso!' : 'Prazo de pagamento removido.',
        'sucesso'
      );
      setDataPrevisaoTemp((prev) => {
        const copia = { ...prev };
        delete copia[vendaId];
        return copia;
      });
    } catch (error) {
      mostrarToast(error?.message || 'Erro ao salvar prazo de previsão no banco.', 'erro');
    }
  };

  const listaInadimplentes = useMemo(() => {
    const hoje = new Date(`${hojeStr}T00:00:00-03:00`);

    return (vendas || [])
      .filter((v) => (
        !foiRenegociada(v) &&
        Array.isArray(v.listaParcelas) &&
        v.listaParcelas.some((p) => !p.paga && !p.renegociada)
      ))
      .map((v) => {
        const parcelasVencidas = obterParcelasVencidas(v, hojeStr);
        const valorAtrasado = Math.round(
          parcelasVencidas.reduce((acc, p) => acc + Number(p.valor || 0), 0) * 100
        ) / 100;

        let dias = 0;
        if (parcelasVencidas.length > 0) {
          const maisAntiga = Math.min(...parcelasVencidas.map((p) => p.dataVencimentoReal.getTime()));
          dias = Math.max(1, Math.round((hoje.getTime() - maisAntiga) / (1000 * 60 * 60 * 24)));
        }

        return { ...v, parcelasVencidas, valorAtrasado, dias };
      })
      .filter((v) => v.valorAtrasado > 0)
      .sort((a, b) => b.dias - a.dias);
  }, [vendas, hojeStr]);

  const totalVencido = Math.round(
    listaInadimplentes.reduce((acc, v) => acc + v.valorAtrasado, 0) * 100
  ) / 100;

  const abrirWhatsApp = (venda) => {
    const cpfVenda = limparCpf(venda.cpf);
    const cadastroDoCliente = cpfVenda
      ? clientes.find((c) => limparCpf(c.cpf) === cpfVenda)
      : null;

    const foneBruto = cadastroDoCliente?.telefone || venda.telefone;
    const foneCompleto = normalizarFone(foneBruto);
    if (!foneCompleto || foneCompleto.length < 12) {
      mostrarToast('Este cliente não possui WhatsApp válido em seu cadastro.', 'erro');
      return;
    }

    const valorFormatado = venda.valorAtrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const mensagem = `Olá ${venda.cliente}, tudo bem? Aqui é da Ótica Elos. 🤓 Notamos que consta um saldo vencido de ${valorFormatado} referente ao seu pedido. Poderia nos ajudar a regularizar?`;
    window.open(`https://wa.me/${foneCompleto}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-elos-fundo flex items-center justify-center">
        <p className="text-elos-verde font-bold animate-pulse text-xs uppercase tracking-widest">
          Carregando relatório de inadimplência...
        </p>
      </div>
    );
  }

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

      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Painel de Cobrança</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Listagem Geral de Atrasos</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-4xl shadow-soft border-t-8 border-red-600">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dívida Total Vencida</h3>
            <p className="text-4xl font-black text-red-700 mt-2">
              {totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-white p-8 rounded-4xl shadow-soft border-t-8 border-elos-verde">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contratos em Atraso</h3>
            <p className="text-4xl font-black text-elos-verde mt-2">{listaInadimplentes.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border border-elos-bege/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-elos-fundo text-elos-verde border-b border-gray-100">
                <tr className="text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-6">Cliente / Contrato</th>
                  <th className="px-8 py-6">Vencimentos</th>
                  <th className="px-8 py-6">Dívida / Atraso</th>
                  <th className="px-8 py-6">Dar Prazo (Previsão)</th>
                  <th className="px-8 py-6 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listaInadimplentes.map((v) => {
                  const targetId = v._id || v.id;
                  const previsaoIso = normalizarIso(v.dataPrevisaoPagamento);
                  const temPrazoFuturo = Boolean(previsaoIso && previsaoIso > hojeStr);
                  const prazoVenceuHj = Boolean(previsaoIso && previsaoIso <= hojeStr);
                  const temAlteracaoPendente = Object.prototype.hasOwnProperty.call(dataPrevisaoTemp, targetId);

                  return (
                    <tr key={targetId} className={`transition-all ${temPrazoFuturo ? 'opacity-40 bg-gray-50' : 'hover:bg-elos-fundo/30'}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-elos-texto">{v.cliente}</span>
                            {ehAcordoRenegociacao(v) && (
                              <span
                                className="text-[8px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter"
                                title="Acordo gerado por renegociação de dívida"
                              >
                                🤝 Acordo
                              </span>
                            )}
                            {temPrazoFuturo && (
                              <span className="text-[8px] bg-elos-bege text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Agendado</span>
                            )}
                            {prazoVenceuHj && (
                              <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">⚠️ Prazo Vencido</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase font-black truncate max-w-55">
                            {v.numeroPedido ? `#${v.numeroPedido} - ` : ''}{v.produto}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1">
                          {v.parcelasVencidas.map((p) => {
                            const ehRestante = !Number.isInteger(Number(p.numero));
                            const labelParcela = Number(p.numero) === 0
                              ? 'Entrada'
                              : ehRestante
                                ? `Rest. ${Math.floor(Number(p.numero))}ª`
                                : `${p.numero}ª parc`;

                            return (
                              <span
                                key={p.numero}
                                className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold border border-red-100"
                                title={`Venceu em: ${p.dataVencStr.split('-').reverse().join('/')} — R$ ${Number(p.valor).toFixed(2)}`}
                              >
                                {labelParcela}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-red-600">
                          {v.valorAtrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-[10px] font-bold text-orange-500 uppercase italic">
                          {v.dias} {v.dias === 1 ? 'dia' : 'dias'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <input
                            key={`${targetId}-${previsaoIso || 'vazio'}`}
                            type="date"
                            defaultValue={previsaoIso}
                            className="text-[11px] p-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-elos-bege"
                            onChange={(e) => setDataPrevisaoTemp((prev) => ({ ...prev, [targetId]: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (temAlteracaoPendente) salvarPrevisao(targetId, dataPrevisaoTemp[targetId]);
                            }}
                            disabled={editarVendaMutation.isPending || !temAlteracaoPendente}
                            className="p-2 bg-elos-bege text-white rounded-lg hover:bg-elos-verde transition-colors disabled:opacity-50"
                            title={temAlteracaoPendente && !dataPrevisaoTemp[targetId] ? 'Remover prazo' : 'Salvar prazo'}
                          >
                            OK
                          </button>
                        </div>
                        {previsaoIso && (
                          <p className={`text-[9px] mt-1 font-bold italic ${prazoVenceuHj ? 'text-red-600' : 'text-elos-bege'}`}>
                            {prazoVenceuHj ? 'Vencido em: ' : 'Prometeu p/: '}
                            {previsaoIso.split('-').reverse().join('/')}
                          </p>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button
                          type="button"
                          disabled={temPrazoFuturo}
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 mx-auto transition-all active:scale-95 ${
                            temPrazoFuturo
                              ? 'bg-gray-400 cursor-not-allowed opacity-50 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                          onClick={() => !temPrazoFuturo && abrirWhatsApp(v)}
                        >
                          Cobrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {listaInadimplentes.length === 0 && (
              <div className="p-20 text-center text-gray-300 italic font-tradicional text-xl">
                Nenhuma parcela vencida até o momento! 👓✨
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}