import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// ============================================================
// FUNÇÕES UTILITÁRIAS (Fora dos hooks para não recriar na memória)
// ============================================================
function somarMeses(dataBase, meses) {
  const resultado = new Date(dataBase.getTime());
  const diaOriginal = resultado.getDate();

  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);

  const ultimoDiaDoMes = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0
  ).getDate();

  resultado.setDate(Math.min(diaOriginal, ultimoDiaDoMes));
  return resultado;
}

const montarParcelas = (novaVenda) => {
  const valorTotal = Number(novaVenda.valorTotal) || 0;
  const valorEntrada = Number(novaVenda.valorEntrada) || 0;
  const valorRestante = parseFloat((valorTotal - valorEntrada).toFixed(2));

  const isCrediario = novaVenda.metodoPagamento === 'Boleto / Crediário';
  const isCartao = novaVenda.metodoPagamento === 'Cartão de Crédito';
  const numParcelas = isCrediario ? Math.max(1, Number(novaVenda.parcelas) || 1) : 1;

  const dataBase = isCrediario ? novaVenda.dataPrimeiraParcela : novaVenda.dataVenda;

  if (!dataBase) {
    throw new Error(isCrediario ? 'Informe a data da primeira parcela para vendas no crediário.' : 'Informe a data da venda.');
  }

  const referencia = new Date(`${dataBase}T00:00:00`);
  if (Number.isNaN(referencia.getTime())) {
    throw new Error('A data informada não é válida.');
  }

  const parcelas = [];

  if (valorEntrada > 0) {
    parcelas.push({
      numero: 0,
      valor: valorEntrada,
      paga: true,
      dataPagamento: novaVenda.dataVenda,
      vencimentoOriginal: novaVenda.dataVenda,
      observacao: 'Entrada/Sinal'
    });
  }

  const valorBase = Math.floor((valorRestante / numParcelas) * 100) / 100;
  const sobra = parseFloat((valorRestante - valorBase * numParcelas).toFixed(2));

  for (let i = 0; i < numParcelas; i++) {
    const vencimento = somarMeses(referencia, i);
    const ehUltima = i === numParcelas - 1;
    const valor = parseFloat((ehUltima ? valorBase + sobra : valorBase).toFixed(2));

    parcelas.push({
      numero: i + 1,
      valor,
      paga: !isCrediario,
      dataPagamento: !isCrediario ? novaVenda.dataVenda : null,
      vencimentoOriginal: vencimento.toISOString().split('T')[0],
      observacao: isCartao && Number(novaVenda.parcelas) > 1 ? `No cartão em ${novaVenda.parcelas}x` : ''
    });
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
    queryFn: () => pedir('/vendas'),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}

// 2. Adicionar Venda
export function useAdicionarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (novaVenda) => {
      const vendaCompleta = {
        ...novaVenda,
        listaParcelas: montarParcelas(novaVenda)
      };

      return pedir('/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaCompleta)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
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
        dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
        valorPago: Number(valorPago)
      })
    }),
    onSuccess: () => {
      // 🟢 O SEGREDO: Invalida AMBOS os caches para forçar o recálculo imediato na tela de Clientes!
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
      // 🟢 O SEGREDO: Invalida AMBOS os caches para forçar o recálculo imediato na tela de Clientes!
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
    }
  });
}