import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// 1. Buscar Despesas
export function useDespesas() {
  return useQuery({
    queryKey: ['despesas'],
    queryFn: () => pedir('/despesas'),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}

// 2. Adicionar Despesa
export function useAdicionarDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (novaDespesa) => pedir('/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaDespesa)
    }),
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