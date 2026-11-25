// src/hooks/useProdutos.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// 1. Buscar Produtos (Catálogo)
export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const res = await pedir('/produtos');
      return Array.isArray(res) ? res : (res?.produtos || res?.data || []);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    retry: 2,
    retryDelay: 5000,
  });
}

// 2. Adicionar Produto
export function useAdicionarProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (novoProduto) => pedir('/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProduto)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  });
}

// 3. Editar Produto
export function useEditarProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ produtoId, dadosNovos }) => pedir(`/produtos/${produtoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovos)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  });
}

// 4. Excluir Produto
export function useExcluirProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (produtoId) => pedir(`/produtos/${produtoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  });
}