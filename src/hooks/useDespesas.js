// src/hooks/useDespesas.js
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

// 2. Adicionar Múltiplas Despesas (Para Lidar com as Parcelas Automáticas)
export function useAdicionarDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (despesasArray) => {
      // Se vier apenas um objeto (1 parcela), transforma em array para o loop rodar igual
      const lotes = Array.isArray(despesasArray) ? despesasArray : [despesasArray];

      // Dispara todas as requisições POST ao mesmo tempo (Promise.all)
      const promessas = lotes.map(despesa => 
        pedir('/despesas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(despesa)
        })
      );
      
      return Promise.all(promessas);
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