import React, { createContext, useState, useContext, useEffect } from 'react';

const FinanceiroContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';

export function FinanceiroProvider({ children }) {
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [despesas, setDespesas] = useState([]); // Movido para dentro
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resVendas, resClientes, resDespesas] = await Promise.all([
          fetch(`${API_URL}/vendas`),
          fetch(`${API_URL}/clientes`),
          fetch(`${API_URL}/despesas`) // Adicionado busca de despesas
        ]);
        
        if (!resVendas.ok || !resClientes.ok) throw new Error("Erro na rede");

        const dadosVendas = await resVendas.json();
        const dadosClientes = await resClientes.json();
        const dadosDespesas = resDespesas.ok ? await resDespesas.json() : [];
        
        setVendas(dadosVendas);
        setClientes(dadosClientes);
        setDespesas(dadosDespesas);
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
    } catch (err) { alert("Erro ao salvar cliente."); }
  };

  const editarCliente = async (cpfAntigo, dadosNovos) => {
    try {
      await fetch(`${API_URL}/clientes/${cpfAntigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosNovos)
      });
      setClientes(prev => prev.map(c => c.cpf === cpfAntigo ? { ...c, ...dadosNovos } : c));
      setVendas(prev => prev.map(v => v.cpf === cpfAntigo ? { ...v, cliente: dadosNovos.nome, cpf: dadosNovos.cpf } : v));
    } catch (err) { alert("Erro ao editar cliente."); }
  };

  const excluirCliente = async (cpf) => {
    if (!window.confirm("⚠️ Excluir cliente permanentemente?")) return;
    try {
      await fetch(`${API_URL}/clientes/${cpf}`, { method: 'DELETE' });
      setClientes(prev => prev.filter(c => c.cpf !== cpf));
      alert("Cliente removido!");
    } catch (err) { alert("Erro ao excluir."); }
  };

  // --- FUNÇÕES DE VENDA ---
  const adicionarVenda = async (novaVenda) => {
    const valorTotal = Number(novaVenda.valorTotal);
    const valorEntrada = Number(novaVenda.valorEntrada || 0);
    const valorRestante = valorTotal - valorEntrada;
    const numParcelas = Number(novaVenda.parcelas);
    const valorDaParcela = valorRestante / numParcelas;

    let parcelasGeradas = [];
    if (valorEntrada > 0) {
      parcelasGeradas.push({
        numero: 0, valor: valorEntrada, paga: true,
        dataPagamento: novaVenda.dataVenda, vencimentoOriginal: novaVenda.dataVenda,
        observacao: "Entrada/Sinal"
      });
    }

    for (let i = 0; i < numParcelas; i++) {
      const dataBase = novaVenda.metodoPagamento === 'Boleto / Crediário' ? novaVenda.dataPrimeiraParcela : novaVenda.dataVenda;
      let dataVenc = new Date(dataBase + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + i);
      parcelasGeradas.push({
        numero: i + 1, valor: valorDaParcela,
        paga: novaVenda.metodoPagamento !== 'Boleto / Crediário',
        dataPagamento: novaVenda.metodoPagamento !== 'Boleto / Crediário' ? novaVenda.dataVenda : null,
        vencimentoOriginal: dataVenc.toISOString().split('T')[0]
      });
    }

    const vendaCompleta = { ...novaVenda, listaParcelas: parcelasGeradas };
    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaCompleta)
      });
      const vendaSalva = await res.json();
      setVendas(prev => [...prev, vendaSalva]);
    } catch (err) { alert("Erro ao registrar venda."); }
  };

  const editarDataVenda = async (vendaId, novaData) => {
    try {
      await fetch(`${API_URL}/vendas/${vendaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataVenda: novaData })
      });
      setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? { ...v, dataVenda: novaData } : v));
    } catch (err) { alert("Erro ao atualizar data."); }
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
        if (v._id === vendaId || v.id === vendaId) {
          const novasParcelas = v.listaParcelas.map(p => p.numero === numeroParcela ? { ...p, paga: true, dataPagamento: dataFinal } : p);
          return { ...v, listaParcelas: novasParcelas };
        }
        return v;
      }));
    } catch (err) { alert("Erro ao dar baixa."); }
  };

  const estornarBaixaParcela = async (vendaId, numeroParcela) => {
    if (!window.confirm("Deseja estornar o pagamento desta parcela?")) return;
    try {
      await fetch(`${API_URL}/vendas/${vendaId}/parcela/${numeroParcela}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paga: false, dataPagamento: null })
      });
      setVendas(prev => prev.map(v => {
        if (v._id === vendaId || v.id === vendaId) {
          const novasParcelas = v.listaParcelas.map(p => p.numero === numeroParcela ? { ...p, paga: false, dataPagamento: null } : p);
          return { ...v, listaParcelas: novasParcelas };
        }
        return v;
      }));
    } catch (err) { alert("Erro ao estornar."); }
  };

  const excluirVenda = async (vendaId) => {
    if (!window.confirm("Excluir venda do banco?")) return;
    try {
      await fetch(`${API_URL}/vendas/${vendaId}`, { method: 'DELETE' });
      setVendas(prev => prev.filter(v => (v._id !== vendaId && v.id !== vendaId)));
    } catch (err) { alert("Erro ao excluir."); }
  };

  // --- FUNÇÕES DE DESPESA (ORGANIZADAS) ---
  const adicionarDespesa = async (novaDespesa) => {
    try {
      const res = await fetch(`${API_URL}/despesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaDespesa)
      });
      const salva = await res.json();
      setDespesas(prev => [...prev, salva]);
    } catch (err) { alert("Erro ao salvar despesa."); }
  };

  const darBaixaDespesa = async (id) => {
    try {
      await fetch(`${API_URL}/despesas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paga: true })
      });
      setDespesas(prev => prev.map(d => (d._id === id || d.id === id) ? { ...d, paga: true } : d));
    } catch (err) { alert("Erro ao pagar despesa."); }
  };

  const excluirDespesa = async (id) => {
    if (!window.confirm("Excluir despesa?")) return;
    try {
      await fetch(`${API_URL}/despesas/${id}`, { method: 'DELETE' });
      setDespesas(prev => prev.filter(d => (d._id !== id && d.id !== id)));
    } catch (err) { alert("Erro ao excluir despesa."); }
  };

  return (
    <FinanceiroContext.Provider value={{ 
      vendas, clientes, despesas, 
      adicionarVenda, darBaixaParcela, estornarBaixaParcela, excluirVenda, editarDataVenda,
      adicionarCliente, editarCliente, excluirCliente, 
      adicionarDespesa, darBaixaDespesa, excluirDespesa,
      carregando 
    }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

export const useFinanceiro = () => useContext(FinanceiroContext);