// src/hooks/useVendas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// ============================================================
// FUNÇÕES UTILITÁRIAS (Fuso de Fortaleza)
// ============================================================
const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' });

// Soma meses a uma data YYYY-MM-DD sem estourar o dia (31/01 + 1 mês = 28/02)
function somarMesesIso(iso, meses) {
  const [a, m, d] = String(iso).split('T')[0].split('-').map(Number);
  if (!a || !m || !d) return null;
  const ultimoDiaDoMes = new Date(a, m - 1 + meses + 1, 0).getDate();
  const alvo = new Date(a, m - 1 + meses, Math.min(d, ultimoDiaDoMes), 12);
  if (Number.isNaN(alvo.getTime())) return null;
  return alvo.toLocaleDateString('sv-SE');
}

const montarParcelas = (novaVenda) => {
  const valorTotal = Number(novaVenda.valorTotal) || 0;
  const valorEntrada = Number(novaVenda.valorEntrada) || 0;
  const valorRestante = parseFloat(Math.max(0, valorTotal - valorEntrada).toFixed(2));

  const isCrediario = novaVenda.metodoPagamento === 'Boleto / Crediário';
  const isCartao = novaVenda.metodoPagamento === 'Cartão de Crédito';
  const numParcelas = isCrediario ? Math.max(1, Number(novaVenda.parcelas) || 1) : 1;

  const dataVendaLimpa = String(novaVenda.dataVenda || hojeBR()).split('T')[0];
  const dataEntradaLimpa = String(novaVenda.dataEntrada || dataVendaLimpa).split('T')[0];
  const dataBase = isCrediario
    ? String(novaVenda.dataPrimeiraParcela || '').split('T')[0]
    : dataVendaLimpa;

  if (valorRestante > 0 && !dataBase) {
    throw new Error(isCrediario ? 'Informe a data da primeira parcela para vendas no crediário.' : 'Informe a data da venda.');
  }

  if (dataBase && !somarMesesIso(dataBase, 0)) {
    throw new Error('A data informada não é válida.');
  }

  const parcelas = [];

  if (valorEntrada > 0) {
    parcelas.push({
      numero: 0,
      valor: parseFloat(valorEntrada.toFixed(2)),
      paga: true,
      dataPagamento: dataEntradaLimpa,
      dataVencimento: dataEntradaLimpa,
      vencimentoOriginal: dataEntradaLimpa,
      observacao: 'Entrada/Sinal'
    });
  }

  if (valorRestante > 0 || valorEntrada <= 0) {
    const valorBase = Math.floor((valorRestante / numParcelas) * 100) / 100;
    const sobra = parseFloat((valorRestante - valorBase * numParcelas).toFixed(2));

    for (let i = 0; i < numParcelas; i++) {
      const vencimentoIso = somarMesesIso(dataBase || dataVendaLimpa, i);
      const ehUltima = i === numParcelas - 1;
      const valor = parseFloat((ehUltima ? valorBase + sobra : valorBase).toFixed(2));

      parcelas.push({
        numero: i + 1,
        valor,
        paga: !isCrediario,
        dataPagamento: !isCrediario ? dataVendaLimpa : null,
        dataVencimento: vencimentoIso,
        vencimentoOriginal: vencimentoIso,
        observacao: isCartao && Number(novaVenda.parcelas) > 1 ? `No cartão em ${novaVenda.parcelas}x` : ''
      });
    }
  }

  return parcelas;
};

// ============================================================
// HOOKS DO REACT QUERY
// ============================================================

// 1. Buscar Vendas
export function useVendas() {
  return useQuery({
    queryKey: ['vendas'],
    queryFn: async () => {
      const res = await pedir('/vendas');
      return Array.isArray(res) ? res : (res?.vendas || res?.data || []);
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 5000,
  });
}

// 2. Adicionar Venda
export function useAdicionarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (novaVenda) => {
      // Preserva listaParcelas se já vier montada (ex: Renegociação de Dívida)
      const temParcelasProntas = Array.isArray(novaVenda.listaParcelas) && novaVenda.listaParcelas.length > 0;
      const vendaCompleta = {
        ...novaVenda,
        listaParcelas: temParcelasProntas ? novaVenda.listaParcelas : montarParcelas(novaVenda)
      };

      return pedir('/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaCompleta)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}

// 3. Editar Venda Genérica
export function useEditarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendaId, dadosNovos }) => pedir(`/vendas/${vendaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovos)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}

// 4. Editar apenas a Data da Venda
export function useEditarDataVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendaId, novaData }) => pedir(`/vendas/${vendaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataVenda: novaData })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
    }
  });
}

// 5. Dar Baixa em Parcela
export function useDarBaixaParcela() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendaId, numeroParcela, dataPagamento, valorPago }) => pedir(`/vendas/${vendaId}/parcela/${numeroParcela}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paga: true,
        dataPagamento: dataPagamento || hojeBR(),
        valorPago: Number(valorPago)
      })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}

// 6. Estornar Baixa de Parcela
export function useEstornarBaixaParcela() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendaId, numeroParcela }) => pedir(`/vendas/${vendaId}/parcela/${numeroParcela}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paga: false, dataPagamento: null })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}

// 7. Excluir Venda
export function useExcluirVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendaId) => pedir(`/vendas/${vendaId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}