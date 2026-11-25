// src/hooks/useClientes.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedir } from '../utils/api';

const limparCpf = (c) => String(c || '').replace(/\D/g, '');

// 1. Buscar os clientes
export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const res = await pedir('/clientes');
      return Array.isArray(res) ? res : (res?.clientes || res?.data || []);
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 5000,
  });
}

// 2. Adicionar Cliente
export function useAdicionarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoCliente) => {
      const clientesAtuais = queryClient.getQueryData(['clientes']) || [];
      const cpfNovo = limparCpf(novoCliente.cpf);

      if (cpfNovo.length === 11 && clientesAtuais.some((c) => limparCpf(c.cpf) === cpfNovo)) {
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
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
    }
  });
}

// 4. Excluir Cliente
export function useExcluirCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cpf) => pedir(`/clientes/${encodeURIComponent(cpf)}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
}