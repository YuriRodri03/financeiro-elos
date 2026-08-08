import React, { createContext, useState, useContext, useEffect } from 'react';

const FinanceiroContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';

export function FinanceiroProvider({ children }) {
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // --- CARREGAMENTO INICIAL ATUALIZADO ---
  useEffect(() => {
    async function carregarDados() {
      try {
        const [resVendas, resClientes, resDespesas, resProdutos] = await Promise.all([
          fetch(`${API_URL}/vendas`),
          fetch(`${API_URL}/clientes`),
          fetch(`${API_URL}/despesas`),
          fetch(`${API_URL}/produtos`) 
        ]);
        
        if (!resVendas.ok || !resClientes.ok) throw new Error("Erro ao buscar dados do servidor");

        const dadosVendas = await resVendas.json();
        const dadosClientes = await resClientes.json();
        const dadosDespesas = resDespesas.ok ? await resDespesas.json() : [];
        const dadosProdutos = resProdutos.ok ? await resProdutos.json() : [];
        
        setVendas(dadosVendas);
        setClientes(dadosClientes);
        setDespesas(dadosDespesas);
        setProdutos(dadosProdutos);
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
    if (existe) {
      alert("Este CPF já está cadastrado!");
      throw new Error("CPF já cadastrado");
    }
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCliente)
      });
      if (!res.ok) throw new Error("Erro no servidor");

      const clienteSalvo = await res.json();
      setClientes(prev => [...prev, clienteSalvo]);
      return clienteSalvo;
    } catch (err) { 
      console.error(err);
      throw err; 
    }
  };

  const editarCliente = async (clienteId, dadosNovos) => {
    try {
      const res = await fetch(`${API_URL}/clientes/${clienteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosNovos)
      });

      if (!res.ok) {
        const erroJson = await res.json();
        throw new Error(erroJson.error || "Erro ao salvar alterações no servidor");
      }

      const clienteAtualizado = await res.json();
      setClientes(prev => prev.map(c => (c._id === clienteId || c.id === clienteId) ? clienteAtualizado : c));
      
      setVendas(prevVendas => prevVendas.map(v => 
        v.cpf === clienteAtualizado.cpf 
          ? { ...v, cliente: clienteAtualizado.nome } 
          : v
      ));

      return clienteAtualizado;
    } catch (err) { 
      console.error("Erro no Contexto:", err);
      throw err;
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
      throw err;
    }
  };

  // --- FUNÇÕES DE VENDA ---
  const adicionarVenda = async (novaVenda) => {
    const valorTotal = Number(novaVenda.valorTotal);
    const valorEntrada = Number(novaVenda.valorEntrada || 0);
    const valorRestante = valorTotal - valorEntrada;
    
    // 🟢 REGRA INTELIGENTE: Só divide em várias dívidas se for Crediário
    const isCrediario = novaVenda.metodoPagamento === 'Boleto / Crediário';
    const isCartao = novaVenda.metodoPagamento === 'Cartão de Crédito';
    const numParcelasGerar = isCrediario ? Number(novaVenda.parcelas) : 1;
    
    const valorDaParcelaRaw = numParcelasGerar > 0 ? valorRestante / numParcelasGerar : 0;
    const valorDaParcela = parseFloat(valorDaParcelaRaw.toFixed(2));

    let parcelasGeradas = [];
    if (valorEntrada > 0) {
      parcelasGeradas.push({
        numero: 0, valor: valorEntrada, paga: true,
        dataPagamento: novaVenda.dataVenda, vencimentoOriginal: novaVenda.dataVenda,
        observacao: "Entrada/Sinal"
      });
    }

    for (let i = 0; i < numParcelasGerar; i++) {
      const dataBase = isCrediario ? novaVenda.dataPrimeiraParcela : novaVenda.dataVenda;
      let dataVenc = new Date(dataBase + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + i);
      
      parcelasGeradas.push({
        numero: i + 1, 
        valor: parseFloat(valorDaParcela.toFixed(2)),
        paga: !isCrediario, // Se não for crediário (Cartão/Pix), já nasce PAGA
        dataPagamento: !isCrediario ? novaVenda.dataVenda : null,
        vencimentoOriginal: dataVenc.toISOString().split('T')[0],
        // 🟢 Salva uma observação limpa caso tenha sido no cartão
        observacao: isCartao && Number(novaVenda.parcelas) > 1 ? `No cartão em ${novaVenda.parcelas}x` : ''
      });
    }

    const vendaCompleta = { ...novaVenda, listaParcelas: parcelasGeradas };
    
    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaCompleta)
      });
      if (!res.ok) throw new Error("Erro no servidor");

      const vendaSalva = await res.json();
      setVendas(prev => [...prev, vendaSalva]);
      return vendaSalva;
    } catch (err) { 
      console.error(err);
      throw err;
    }
  };

  const editarVenda = async (vendaId, dadosNovos) => {
    try {
      const res = await fetch(`${API_URL}/vendas/${vendaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosNovos)
      });
      if (!res.ok) throw new Error("Erro ao atualizar o pedido no servidor.");
      
      const vendaAtualizadaBackend = await res.json();
      
      // Mescla os dados digitados por cima da resposta do servidor para a UI atualizar na hora
      const vendaFinal = { ...vendaAtualizadaBackend, ...dadosNovos };

      setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? vendaFinal : v));
      return vendaFinal;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const editarDataVenda = async (vendaId, novaData) => {
    try {
      const res = await fetch(`${API_URL}/vendas/${vendaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataVenda: novaData })
      });
      if (!res.ok) throw new Error("Erro no servidor");

      setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? { ...v, dataVenda: novaData } : v));
    } catch (err) { 
      alert("Erro ao atualizar data."); 
      throw err;
    }
  };

  const darBaixaParcela = async (vendaId, numeroParcela, dataPagamento, valorPago) => {
    const dataFinal = dataPagamento || new Date().toISOString().split('T')[0];
    const valorPagoNum = Number(valorPago);

    try {
      const res = await fetch(`${API_URL}/vendas/${vendaId}/parcela/${numeroParcela}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paga: true, 
          dataPagamento: dataFinal,
          valorPago: valorPagoNum 
        })
      });

      if (!res.ok) throw new Error("Erro na comunicação com o servidor");

      const vendaAtualizada = await res.json();
      setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? vendaAtualizada : v));
    } catch (err) { 
      alert("Erro ao dar baixa. Verifique o valor informado."); 
      throw err;
    }
  };

  const estornarBaixaParcela = async (vendaId, numeroParcela) => {
    if (!window.confirm("Deseja estornar o pagamento? A parcela voltará ao valor original e sobras serão removidas.")) return;
    try {
      const res = await fetch(`${API_URL}/vendas/${vendaId}/parcela/${numeroParcela}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paga: false, dataPagamento: null })
      });
      
      if (!res.ok) throw new Error("Erro no estorno");
      
      const vendaAtualizada = await res.json();
      setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? vendaAtualizada : v));
      alert("Estorno realizado com sucesso!");
    } catch (err) { 
      alert("Erro ao estornar."); 
      throw err;
    }
  };

  const excluirVenda = async (vendaId) => {
    if (!window.confirm("Excluir venda do banco permanentemente?")) return;
    try {
      const res = await fetch(`${API_URL}/vendas/${vendaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro no servidor");

      setVendas(prev => prev.filter(v => (v._id !== vendaId && v.id !== vendaId)));
    } catch (err) { 
      alert("Erro ao excluir."); 
      throw err;
    }
  };

  // --- FUNÇÕES DE DESPESA ---
  const adicionarDespesa = async (novaDespesa) => {
    try {
      const res = await fetch(`${API_URL}/despesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaDespesa)
      });
      if (!res.ok) throw new Error("Erro no servidor");

      const salva = await res.json();
      setDespesas(prev => [...prev, salva]);
      return salva;
    } catch (err) { 
      console.error(err);
      throw err; 
    }
  };

  const darBaixaDespesa = async (id) => {
    try {
      const res = await fetch(`${API_URL}/despesas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paga: true })
      });
      if (!res.ok) throw new Error("Erro no servidor");

      setDespesas(prev => prev.map(d => (d._id === id || d.id === id) ? { ...d, paga: true } : d));
    } catch (err) { 
      alert("Erro ao pagar despesa."); 
      throw err;
    }
  };

  const excluirDespesa = async (id) => {
    if (!window.confirm("Excluir despesa?")) return;
    try {
      const res = await fetch(`${API_URL}/despesas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro no servidor");

      setDespesas(prev => prev.filter(d => (d._id !== id && d.id !== id)));
    } catch (err) { 
      alert("Erro ao excluir despesa."); 
      throw err;
    }
  };

  // --- FUNÇÕES DE PRODUTO (CATÁLOGO) ---
  const adicionarProduto = async (novoProduto) => {
    try {
      const res = await fetch(`${API_URL}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoProduto)
      });
      if (!res.ok) throw new Error("Erro no servidor");

      const produtoSalvo = await res.json();
      setProdutos(prev => [...prev, produtoSalvo]);
      return produtoSalvo;
    } catch (err) { 
      console.error(err);
      throw err; 
    }
  };

  const editarProduto = async (produtoId, dadosNovos) => {
    try {
      const res = await fetch(`${API_URL}/produtos/${produtoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosNovos)
      });

      if (!res.ok) throw new Error("Erro ao salvar alterações do produto no servidor.");

      const produtoAtualizado = await res.json();
      setProdutos(prev => prev.map(p => (p._id === produtoId || p.id === produtoId) ? produtoAtualizado : p));
      return produtoAtualizado;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const excluirProduto = async (produtoId) => {
    if (!window.confirm("Deseja remover este produto do catálogo?")) return;
    try {
      const res = await fetch(`${API_URL}/produtos/${produtoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro no servidor");

      setProdutos(prev => prev.filter(p => p._id !== produtoId && p.id !== produtoId));
      alert("Produto removido do catálogo!");
    } catch (err) { 
      alert("Erro ao remover produto."); 
      throw err;
    }
  };

  return (
    <FinanceiroContext.Provider value={{ 
      vendas, clientes, despesas, produtos, 
      adicionarVenda, editarVenda, darBaixaParcela, estornarBaixaParcela, excluirVenda, editarDataVenda, 
      adicionarCliente, editarCliente, excluirCliente, 
      adicionarDespesa, darBaixaDespesa, excluirDespesa,
      adicionarProduto, editarProduto, excluirProduto, 
      carregando 
    }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

export const useFinanceiro = () => useContext(FinanceiroContext);