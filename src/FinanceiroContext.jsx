import React, { createContext, useState, useContext, useCallback, useRef, useMemo } from 'react';

const FinanceiroContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';

// Render free demora pra acordar. 25s cobre o cold start sem deixar a tela presa pra sempre.
const TEMPO_LIMITE_MS = 25000;

async function pedir(caminho, opcoes = {}) {
  const { timeoutMs = TEMPO_LIMITE_MS, ...resto } = opcoes;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${caminho}`, { ...resto, signal: controlador.signal });

    if (!res.ok) {
      let mensagem = `O servidor respondeu com erro ${res.status}.`;
      try {
        const corpo = await res.json();
        if (corpo?.error) mensagem = corpo.error;
      } catch {
        // resposta sem JSON: mantém a mensagem padrão
      }
      throw new Error(mensagem);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente de novo.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const RECURSOS = ['vendas', 'clientes', 'despesas', 'produtos'];
const STATUS_INICIAL = { vendas: 'ocioso', clientes: 'ocioso', despesas: 'ocioso', produtos: 'ocioso' };

export function FinanceiroProvider({ children }) {
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [status, setStatus] = useState(STATUS_INICIAL);
  const [erros, setErros] = useState({});

  // Guarda as promessas em andamento para que duas páginas pedindo "vendas"
  // ao mesmo tempo (ou o StrictMode em dev) disparem uma requisição só.
  const emVoo = useRef({});

  const setters = useRef({
    vendas: setVendas,
    clientes: setClientes,
    despesas: setDespesas,
    produtos: setProdutos
  });

  const buscarRecurso = useCallback((nome, forcar = false) => {
    if (!RECURSOS.includes(nome)) return Promise.resolve();
    if (emVoo.current[nome]) return emVoo.current[nome];

    const promessa = (async () => {
      setStatus(s => ({ ...s, [nome]: 'carregando' }));
      try {
        const dados = await pedir(`/${nome}`);
        setters.current[nome](Array.isArray(dados) ? dados : []);
        setStatus(s => ({ ...s, [nome]: 'pronto' }));
        setErros(e => ({ ...e, [nome]: null }));
      } catch (err) {
        console.error(`Falha ao carregar ${nome}:`, err);
        setStatus(s => ({ ...s, [nome]: 'erro' }));
        setErros(e => ({ ...e, [nome]: err.message }));
      } finally {
        delete emVoo.current[nome];
      }
    })();

    emVoo.current[nome] = promessa;
    return promessa;
  }, []);

  // Chame isto nas páginas: garantir('vendas', 'clientes')
  // Só busca o que ainda não chegou. Repetir a chamada não gera requisição nova.
  const garantir = useCallback((...nomes) => {
    const pendentes = nomes.filter(nome => {
      const s = status[nome];
      return s === 'ocioso' || s === 'erro';
    });
    return Promise.all(pendentes.map(nome => buscarRecurso(nome)));
  }, [status, buscarRecurso]);

  // Força uma nova busca mesmo que o recurso já esteja em memória.
  const recarregar = useCallback((...nomes) => {
    const alvos = nomes.length ? nomes : RECURSOS;
    return Promise.all(alvos.map(nome => buscarRecurso(nome, true)));
  }, [buscarRecurso]);

  const carregandoVendas = status.vendas === 'carregando';
  const carregandoClientes = status.clientes === 'carregando';
  const carregandoDespesas = status.despesas === 'carregando';
  const carregandoProdutos = status.produtos === 'carregando';

  // Mantido por compatibilidade com o código que já lê `carregando`.
  // Agora só é `true` enquanto algo que a tela atual pediu está chegando.
  const carregando = useMemo(
    () => RECURSOS.some(nome => status[nome] === 'carregando'),
    [status]
  );

  // ============================================================
  // CLIENTES
  // ============================================================
  const adicionarCliente = async (novoCliente) => {
    if (clientes.some(c => c.cpf === novoCliente.cpf)) {
      throw new Error('Este CPF já está cadastrado.');
    }
    const clienteSalvo = await pedir('/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoCliente)
    });
    setClientes(prev => [...prev, clienteSalvo]);
    return clienteSalvo;
  };

  const editarCliente = async (clienteId, dadosNovos) => {
    const clienteAtualizado = await pedir(`/clientes/${clienteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovos)
    });

    setClientes(prev => prev.map(c =>
      (c._id === clienteId || c.id === clienteId) ? clienteAtualizado : c
    ));

    setVendas(prev => prev.map(v =>
      v.cpf === clienteAtualizado.cpf ? { ...v, cliente: clienteAtualizado.nome } : v
    ));

    return clienteAtualizado;
  };

  const excluirCliente = async (cpf) => {
    await pedir(`/clientes/${cpf}`, { method: 'DELETE' });
    setClientes(prev => prev.filter(c => c.cpf !== cpf));
  };

  // ============================================================
  // VENDAS
  // ============================================================
  const montarParcelas = (novaVenda) => {
    const valorTotal = Number(novaVenda.valorTotal) || 0;
    const valorEntrada = Number(novaVenda.valorEntrada) || 0;
    const valorRestante = parseFloat((valorTotal - valorEntrada).toFixed(2));

    const isCrediario = novaVenda.metodoPagamento === 'Boleto / Crediário';
    const isCartao = novaVenda.metodoPagamento === 'Cartão de Crédito';
    const numParcelas = isCrediario ? Math.max(1, Number(novaVenda.parcelas) || 1) : 1;

    const dataBase = isCrediario ? novaVenda.dataPrimeiraParcela : novaVenda.dataVenda;
    if (!dataBase) {
      throw new Error(
        isCrediario
          ? 'Informe a data da primeira parcela para vendas no crediário.'
          : 'Informe a data da venda.'
      );
    }

    const referencia = new Date(`${dataBase}T00:00:00`);
    if (Number.isNaN(referencia.getTime())) {
      throw new Error('A data informada não é válida.');
    }

    const parcelas = [];

    if (valorEntrada > 0) {
      parcelas.push({
        numero: 0,
        valor: valorEntrada,
        paga: true,
        dataPagamento: novaVenda.dataVenda,
        vencimentoOriginal: novaVenda.dataVenda,
        observacao: 'Entrada/Sinal'
      });
    }

    // Arredonda pra baixo e joga a sobra de centavos na última parcela,
    // senão a soma das parcelas não fecha com o total da venda.
    const valorBase = Math.floor((valorRestante / numParcelas) * 100) / 100;
    const sobra = parseFloat((valorRestante - valorBase * numParcelas).toFixed(2));

    for (let i = 0; i < numParcelas; i++) {
      const vencimento = new Date(referencia);
      vencimento.setMonth(vencimento.getMonth() + i);

      const ehUltima = i === numParcelas - 1;
      const valor = parseFloat((ehUltima ? valorBase + sobra : valorBase).toFixed(2));

      parcelas.push({
        numero: i + 1,
        valor,
        paga: !isCrediario,
        dataPagamento: !isCrediario ? novaVenda.dataVenda : null,
        vencimentoOriginal: vencimento.toISOString().split('T')[0],
        observacao: isCartao && Number(novaVenda.parcelas) > 1
          ? `No cartão em ${novaVenda.parcelas}x`
          : ''
      });
    }

    return parcelas;
  };

  const adicionarVenda = async (novaVenda) => {
    const vendaCompleta = { ...novaVenda, listaParcelas: montarParcelas(novaVenda) };

    const vendaSalva = await pedir('/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendaCompleta)
    });

    // Entra no topo: a lista vem do servidor ordenada do pedido mais novo pro mais antigo.
    setVendas(prev => [vendaSalva, ...prev]);
    return vendaSalva;
  };

  const editarVenda = async (vendaId, dadosNovos) => {
    const doServidor = await pedir(`/vendas/${vendaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovos)
    });

    const vendaFinal = { ...doServidor, ...dadosNovos };
    setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? vendaFinal : v));
    return vendaFinal;
  };

  const editarDataVenda = async (vendaId, novaData) => {
    await pedir(`/vendas/${vendaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataVenda: novaData })
    });
    setVendas(prev => prev.map(v =>
      (v._id === vendaId || v.id === vendaId) ? { ...v, dataVenda: novaData } : v
    ));
  };

  const darBaixaParcela = async (vendaId, numeroParcela, dataPagamento, valorPago) => {
    const vendaAtualizada = await pedir(`/vendas/${vendaId}/parcela/${numeroParcela}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paga: true,
        dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
        valorPago: Number(valorPago)
      })
    });
    setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? vendaAtualizada : v));
    return vendaAtualizada;
  };

  const estornarBaixaParcela = async (vendaId, numeroParcela) => {
    const vendaAtualizada = await pedir(`/vendas/${vendaId}/parcela/${numeroParcela}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paga: false, dataPagamento: null })
    });
    setVendas(prev => prev.map(v => (v._id === vendaId || v.id === vendaId) ? vendaAtualizada : v));
    return vendaAtualizada;
  };

  const excluirVenda = async (vendaId) => {
    await pedir(`/vendas/${vendaId}`, { method: 'DELETE' });
    setVendas(prev => prev.filter(v => v._id !== vendaId && v.id !== vendaId));
  };

  // ============================================================
  // DESPESAS
  // ============================================================
  const adicionarDespesa = async (novaDespesa) => {
    const salva = await pedir('/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaDespesa)
    });
    setDespesas(prev => [...prev, salva]);
    return salva;
  };

  const darBaixaDespesa = async (id) => {
    await pedir(`/despesas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paga: true })
    });
    setDespesas(prev => prev.map(d => (d._id === id || d.id === id) ? { ...d, paga: true } : d));
  };

  const excluirDespesa = async (id) => {
    await pedir(`/despesas/${id}`, { method: 'DELETE' });
    setDespesas(prev => prev.filter(d => d._id !== id && d.id !== id));
  };

  // ============================================================
  // PRODUTOS
  // ============================================================
  const adicionarProduto = async (novoProduto) => {
    const produtoSalvo = await pedir('/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProduto),
      timeoutMs: 60000 // upload de foto em base64 demora mais
    });
    setProdutos(prev => [...prev, produtoSalvo]);
    return produtoSalvo;
  };

  const editarProduto = async (produtoId, dadosNovos) => {
    const produtoAtualizado = await pedir(`/produtos/${produtoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovos),
      timeoutMs: 60000
    });
    setProdutos(prev => prev.map(p =>
      (p._id === produtoId || p.id === produtoId) ? produtoAtualizado : p
    ));
    return produtoAtualizado;
  };

  const excluirProduto = async (produtoId) => {
    await pedir(`/produtos/${produtoId}`, { method: 'DELETE' });
    setProdutos(prev => prev.filter(p => p._id !== produtoId && p.id !== produtoId));
  };

  return (
    <FinanceiroContext.Provider value={{
      vendas, clientes, despesas, produtos,

      garantir, recarregar,
      status, erros,
      carregando,
      carregandoVendas, carregandoClientes, carregandoDespesas, carregandoProdutos,

      adicionarVenda, editarVenda, darBaixaParcela, estornarBaixaParcela, excluirVenda, editarDataVenda,
      adicionarCliente, editarCliente, excluirCliente,
      adicionarDespesa, darBaixaDespesa, excluirDespesa,
      adicionarProduto, editarProduto, excluirProduto
    }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

export const useFinanceiro = () => useContext(FinanceiroContext);
