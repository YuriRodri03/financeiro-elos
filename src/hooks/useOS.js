import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// 1. Buscar uma OS específica (Para o modo edição)
export function useOrdemServico(id) {
  return useQuery({
    queryKey: ['os', id],
    queryFn: () => pedir(`/ordens_servico/${id}`),
    enabled: !!id, // Só faz a requisição se o ID existir
    staleTime: 1000 * 60 * 5,
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
    onSuccess: () => {
      // Invalida os caches para a UI atualizar automaticamente
      queryClient.invalidateQueries({ queryKey: ['os'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] }); 
    }
  });
}