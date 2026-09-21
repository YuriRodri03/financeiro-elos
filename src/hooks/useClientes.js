// src/hooks/useClientes.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

// 1. Buscar os clientes
export function useClientes() {
  return useQuery({
    queryKey: ['clientes'], 
    queryFn: () => pedir('/clientes'),
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// 2. Adicionar Cliente
export function useAdicionarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoCliente) => {
      // Validação local igual à original
      const clientesAtuais = queryClient.getQueryData(['clientes']) || [];
      if (clientesAtuais.some((c) => c.cpf === novoCliente.cpf)) {
        throw new Error('Este CPF já está cadastrado.');
      }

      return pedir('/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCliente)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}

// 3. Editar Cliente
export function useEditarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dadosNovos }) => pedir(`/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovos)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // 🟢 CORREÇÃO CRÍTICA: Descomentado! O backend atualiza o nome do cliente nas vendas antigas também. 
      // Logo, o frontend precisa recarregar a tela de Vendas para não exibir o nome antigo.
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
    }
  });
}

// 4. Excluir Cliente
export function useExcluirCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cpf) => pedir(`/clientes/${cpf}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}