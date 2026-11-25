import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// 1. Buscar uma OS específica (para o modo edição)
export function useOrdemServico(id) {
  return useQuery({
    queryKey: ['os', id],
    queryFn: () => pedir(`/ordens_servico/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 5000,
  });
}

// 2. Salvar ou Atualizar OS
export function useSalvarOS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dadosOS }) => {
      if (id) {
        return pedir(`/ordens_servico/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosOS)
        });
      }
      return pedir('/ordens_servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosOS)
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['os'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['os', variables.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
    }
  });
}