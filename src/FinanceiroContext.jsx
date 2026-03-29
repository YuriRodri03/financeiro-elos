import React, { createContext, useState, useContext, useEffect } from 'react';

const FinanceiroContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';

export function FinanceiroProvider({ children }) {
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resVendas, resClientes] = await Promise.all([
          fetch(`${API_URL}/vendas`),
          fetch(`${API_URL}/clientes`)
        ]);
        
        if (!resVendas.ok || !resClientes.ok) throw new Error("Erro na rede");

        const dadosVendas = await resVendas.json();
        const dadosClientes = await resClientes.json();
        
        setVendas(dadosVendas);
        setClientes(dadosClientes);
      } catch (err) {
        console.error("Erro ao buscar dados do MongoDB:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  // --- FUNÇÕES DE CLIENTE ---
  const adicionarCliente = async (novoCliente) => {
    const existe = clientes.find(c => c.cpf === novoCliente.cpf);
    if (existe) return alert("Este CPF já está cadastrado!");

    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCliente)
      });
      const clienteSalvo = await res.json();
      setClientes(prev => [...prev, clienteSalvo]);
    } catch (err) {
      alert("Erro ao salvar cliente.");
    }
  };

  // ADICIONADO: Função para editar cliente no banco
  const editarCliente = async (cpfAntigo, dadosNovos) => {
    try {
      await fetch(`${API_URL}/clientes/${cpfAntigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosNovos)
      });
      
      // Atualiza localmente
      setClientes(prev => prev.map(c => c.cpf === cpfAntigo ? { ...c, ...dadosNovos } : c));
      setVendas(prev => prev.map(v => v.cpf === cpfAntigo ? { ...v, cliente: dadosNovos.nome, cpf: dadosNovos.cpf } : v));
    } catch (err) {
      alert("Erro ao editar cliente.");
    }
  };

  const excluirCliente = async (cpf) => {
    if (!window.confirm("⚠️ Excluir cliente permanentemente?")) return;
    try {
      await fetch(`${API_URL}/clientes/${cpf}`, { method: 'DELETE' });
      setClientes(prev => prev.filter(c => c.cpf !== cpf));
      alert("Cliente removido!");
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  // --- FUNÇÕES DE VENDA ---
  const adicionarVenda = async (novaVenda) => {
    const valorTotal = Number(novaVenda.valorTotal);
    const numParcelas = Number(novaVenda.parcelas);
    const valorDaParcela = (valorTotal / numParcelas);
    
    const parcelasGeradas = Array.from({ length: numParcelas }, (_, i) => ({
      numero: i + 1,
      valor: valorDaParcela,
      paga: novaVenda.metodoPagamento !== 'Boleto / Crediário',
      dataPagamento: novaVenda.metodoPagamento !== 'Boleto / Crediário' ? novaVenda.dataVenda : null
    }));

    const vendaCompleta = { ...novaVenda, listaParcelas: parcelasGeradas };

    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaCompleta)
      });
      const vendaSalva = await res.json();
      setVendas(prev => [...prev, vendaSalva]);
    } catch (err) {
      alert("Erro ao registrar venda.");
    }
  };

  const darBaixaParcela = async (vendaId, numeroParcela, dataPagamento) => {
    const dataFinal = dataPagamento || new Date().toISOString().split('T')[0];
    
    try {
      await fetch(`${API_URL}/vendas/${vendaId}/parcela/${numeroParcela}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paga: true, dataPagamento: dataFinal })
      });

      setVendas(prev => prev.map(v => {
        if (v._id === vendaId) {
          const novasParcelas = v.listaParcelas.map(p => 
            p.numero === numeroParcela ? { ...p, paga: true, dataPagamento: dataFinal } : p
          );
          return { ...v, listaParcelas: novasParcelas };
        }
        return v;
      }));
    } catch (err) {
      alert("Erro ao dar baixa.");
    }
  };

  const excluirVenda = async (vendaId) => {
    if (!window.confirm("Excluir venda do banco?")) return;
    try {
      await fetch(`${API_URL}/vendas/${vendaId}`, { method: 'DELETE' });
      setVendas(prev => prev.filter(v => v._id !== vendaId));
    } catch (err) {
      alert("Erro ao excluir venda.");
    }
  };

  return (
    <FinanceiroContext.Provider value={{ 
      vendas, clientes, adicionarVenda, darBaixaParcela, 
      excluirVenda, adicionarCliente, editarCliente, excluirCliente, carregando 
    }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

export const useFinanceiro = () => useContext(FinanceiroContext);