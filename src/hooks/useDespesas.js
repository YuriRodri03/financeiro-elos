// src/hooks/useDespesas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// 1. Buscar Despesas
export function useDespesas() {
  return useQuery({
    queryKey: ['despesas'],
    queryFn: async () => {
      const res = await pedir('/despesas');
      return Array.isArray(res) ? res : (res?.despesas || res?.data || []);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    retry: 2,
    retryDelay: 5000,
  });
}

// 2. Adicionar Despesa (única ou lote de parcelas em 1 única requisição)
export function useAdicionarDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (despesasPayload) => {
      const corpo = Array.isArray(despesasPayload) && despesasPayload.length === 1
        ? despesasPayload[0]
        : despesasPayload;

      return pedir('/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    }
  });
}

// 3. Dar Baixa em Despesa
export function useDarBaixaDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => pedir(`/despesas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paga: true })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    }
  });
}

// 4. Excluir Despesa
export function useExcluirDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => pedir(`/despesas/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    }
  });
}