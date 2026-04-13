import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils';

export default function Vendas() {
  const { adicionarVenda, clientes } = useFinanceiro();

  const [venda, setVenda] = useState({
    cliente: '',
    cpf: '',
    produto: '',
    valorTotal: '',
    valorEntrada: '',
    desconto: '', 
    parcelas: 1,
    metodoPagamento: 'Dinheiro',
    dataVenda: new Date().toISOString().split('T')[0],
    dataPrimeiraParcela: new Date().toISOString().split('T')[0]
  });

  const aplicarMascaraCPF = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const aplicarMascaraMoeda = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (!v) return '';
    v = (Number(v) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return v;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      const valorFormatado = aplicarMascaraCPF(value).substring(0, 14);
      const clienteExistente = clientes.find(c => c.cpf === valorFormatado);
      
      setVenda({ 
        ...venda, 
        cpf: valorFormatado,
        cliente: clienteExistente ? clienteExistente.nome : (valorFormatado.length < 14 ? '' : venda.cliente)
      });
    } 
    else if (name === 'valorTotal' || name === 'valorEntrada' || name === 'desconto') {
      const valorMascarado = aplicarMascaraMoeda(value);
      setVenda({ ...venda, [name]: valorMascarado });
    } 
    else {
      setVenda({ ...venda, [name]: value });
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();

    const limparMoeda = (valor) => {
      if (!valor) return 0;
      // Remove tudo que não é dígito e divide por 100
      const numeroLimpo = valor.replace(/[^\d]/g, '');
      return Number(numeroLimpo) / 100;
    };

    const valorTotalLimpio = limparMoeda(venda.valorTotal);
    const descontoLimpio = limparMoeda(venda.desconto);
    const entradaLimpia = limparMoeda(venda.valorEntrada);

    if (!venda.cliente || valorTotalLimpio <= 0 || !venda.cpf) {
      alert("Por favor, preencha o Nome, CPF e Valor Total corretamente.");
      return;
    }

    const dadosParaSalvar = {
      ...venda,
      valorTotal: valorTotalLimpio,
      valorEntrada: entradaLimpia,
      desconto: descontoLimpio
    };

    try {
      // 1. Salva no Banco (MongoDB via Context)
      const resultado = await adicionarVenda(dadosParaSalvar);
      
      // 2. Pergunta sobre a impressão usando os dados que acabamos de salvar
      const imprimir = confirm("Venda registrada com sucesso! 👓\nDeseja gerar o Pedido com Garantia agora?");
      
      if (imprimir) {
        gerarPDFDocumento({
          // Prioriza o número que veio do banco, se não tiver, gera um temporário
          numero: resultado?.numeroPedido || resultado?._id || "PED-" + Date.now().toString().slice(-6), 
          data: venda.dataVenda.split('-').reverse().join('/'),
          cliente: venda.cliente,
          produto: venda.produto || "PRODUTOS ÓPTICOS",
          valorProduto: valorTotalLimpio + descontoLimpio, // Valor bruto antes do desconto
          desconto: descontoLimpio,
          valorTotal: valorTotalLimpio, // Valor líquido
          metodoPagamento: venda.metodoPagamento 
        }, 'pedido'); 
      }

      // 3. Limpa o formulário
      setVenda({
        cliente: '', cpf: '', produto: '', valorTotal: '', valorEntrada: '',
        desconto: '', parcelas: 1, metodoPagamento: 'Dinheiro',
        dataVenda: new Date().toISOString().split('T')[0],
        dataPrimeiraParcela: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
      alert("Erro ao salvar a venda no banco de dados.");
    }
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-4xl mx-auto">
        
        <header className="mb-10 text-center md:text-left">
          <h1 className="font-tradicional text-4xl text-elos-verde italic border-b-2 border-elos-bege/30 pb-4 inline-block">
            Nova Venda - Ótica Elos
          </h1>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2 font-bold italic">Registro de novo contrato de venda</p>
        </header>

        <form onSubmit={handleSalvar} className="bg-white rounded-[2.5rem] shadow-soft p-6 md:p-12 space-y-8 border border-elos-bege/10">
          
          {/* SEÇÃO: DADOS DO CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">CPF do Cliente</label>
              <input 
                type="text" name="cpf" value={venda.cpf} onChange={handleChange} required 
                placeholder="000.000.000-00"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Nome do Cliente</label>
              <input 
                type="text" name="cliente" value={venda.cliente} onChange={handleChange} required 
                placeholder="Nome Completo"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>
          </div>

          {/* SEÇÃO: PRODUTO */}
          <div className="space-y-2">
            <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Produto / Armação / Lentes</label>
            <input 
              type="text" name="produto" value={venda.produto} onChange={handleChange} 
              placeholder="Ex: Ray-Ban Aviator + Lentes Crizal"
              className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
            />
          </div>

          <div className="h-[1px] bg-gray-100 w-full"></div>

          {/* SEÇÃO: FINANCEIRO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Data da Venda</label>
              <input 
                type="date" name="dataVenda" value={venda.dataVenda} onChange={handleChange}
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Preço Final (Líquido)</label>
              <input 
                type="text" name="valorTotal" value={venda.valorTotal} onChange={handleChange} required 
                placeholder="R$ 0,00"
                className="w-full px-5 py-4 bg-green-50 border border-green-100 text-green-900 font-black rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Desconto Concedido</label>
              <input 
                type="text" name="desconto" value={venda.desconto} onChange={handleChange} 
                placeholder="R$ 0,00"
                className="w-full px-5 py-4 bg-red-50 border border-red-100 text-red-900 font-bold rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Valor de Entrada</label>
              <input 
                type="text" name="valorEntrada" value={venda.valorEntrada} onChange={handleChange} 
                placeholder="R$ 0,00"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Forma de Pagamento</label>
              <select 
                name="metodoPagamento" value={venda.metodoPagamento} onChange={handleChange}
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all appearance-none"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Boleto / Crediário">Boleto / Crediário</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-tighter ml-1">Número de Parcelas</label>
              <input 
                type="number" name="parcelas" min="1" max="12" value={venda.parcelas} onChange={handleChange}
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>
          </div>

          {/* VENCIMENTO ESPECIAL PARA CREDIÁRIO */}
          {venda.metodoPagamento === 'Boleto / Crediário' && (
            <div className="bg-elos-verde text-white p-8 rounded-3xl shadow-xl animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🗓️</span>
                <label className="font-tradicional italic text-lg">Vencimento da 1ª Parcela</label>
              </div>
              <input 
                type="date" name="dataPrimeiraParcela" value={venda.dataPrimeiraParcela} onChange={handleChange}
                className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white focus:bg-white/20 transition-all"
              />
              <p className="text-[10px] text-white/50 mt-3 uppercase font-black tracking-widest">Atenção: Sistema de cobrança recorrente Elos.</p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-6 rounded-2xl shadow-xl shadow-elos-verde/20 transform transition-all active:scale-[0.98] text-lg uppercase tracking-widest mt-6"
          >
            Finalizar e Gerar Pedido
          </button>
        </form>
      </div>
    </div>
  );
}