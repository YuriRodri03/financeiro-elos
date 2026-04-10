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
      return Number(valor.replace(/\D/g, '')) / 100;
    };

    const valorTotalLimpio = limparMoeda(venda.valorTotal);
    const descontoLimpio = limparMoeda(venda.desconto);

    const dadosParaSalvar = {
      ...venda,
      valorTotal: valorTotalLimpio,
      valorEntrada: limparMoeda(venda.valorEntrada),
      desconto: descontoLimpio
    };

    if (!venda.cliente || !venda.valorTotal || !venda.cpf) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const novaVendaSalva = await adicionarVenda(dadosParaSalvar);
      
      const imprimir = confirm("Venda registrada com sucesso! 👓\nDeseja gerar o Pedido com Garantia agora?");
      if (imprimir) {
        gerarPDFDocumento({
          numero: novaVendaSalva?.numeroPedido || novaVendaSalva?.id || "PED-" + Date.now().toString().slice(-6), 
          data: venda.dataVenda.split('-').reverse().join('/'),
          cliente: venda.cliente,
          produto: venda.produto || "PRODUTOS ÓPTICOS",
          valorProduto: valorTotalLimpio + descontoLimpio,
          desconto: descontoLimpio,
          valorTotal: valorTotalLimpio,
          metodoPagamento: venda.metodoPagamento 
        }, 'pedido'); 
      }

      setVenda({
        cliente: '', cpf: '', produto: '', valorTotal: '', valorEntrada: '',
        desconto: '', parcelas: 1, metodoPagamento: 'Dinheiro',
        dataVenda: new Date().toISOString().split('T')[0],
        dataPrimeiraParcela: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert("Erro ao salvar a venda.");
    }
  };

  return (
    <div className="min-h-screen bg-accent-light p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <header className="mb-8 text-center md:text-left">
          <h1 className="font-serif text-3xl md:text-4xl text-primary italic border-b-2 border-primary/10 pb-4 inline-block">
            Nova Venda - Ótica Elos
          </h1>
        </header>

        <form onSubmit={handleSalvar} className="bg-white rounded-3xl shadow-soft p-6 md:p-10 space-y-8">
          
          {/* SEÇÃO: DADOS DO CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">CPF do Cliente</label>
              <input 
                type="text" name="cpf" value={venda.cpf} onChange={handleChange} required 
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Nome do Cliente</label>
              <input 
                type="text" name="cliente" value={venda.cliente} onChange={handleChange} required 
                placeholder="Nome Completo"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>
          </div>

          {/* SEÇÃO: PRODUTO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Produto / Armação</label>
            <input 
              type="text" name="produto" value={venda.produto} onChange={handleChange} 
              placeholder="Ex: Ray-Ban Aviator ou Lentes Varilux"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
            />
          </div>

          <hr className="border-gray-100" />

          {/* SEÇÃO: FINANCEIRO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Data da Venda</label>
              <input 
                type="date" name="dataVenda" value={venda.dataVenda} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Preço Final</label>
              <input 
                type="text" name="valorTotal" value={venda.valorTotal} onChange={handleChange} required 
                placeholder="R$ 0,00"
                className="w-full px-4 py-3 bg-green-50 border border-green-100 text-green-900 font-bold rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Desconto</label>
              <input 
                type="text" name="desconto" value={venda.desconto} onChange={handleChange} 
                placeholder="R$ 0,00"
                className="w-full px-4 py-3 bg-red-50 border border-red-100 text-red-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Valor de Entrada</label>
              <input 
                type="text" name="valorEntrada" value={venda.valorEntrada} onChange={handleChange} 
                placeholder="R$ 0,00"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Pagamento</label>
              <select 
                name="metodoPagamento" value={venda.metodoPagamento} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Boleto / Crediário">Boleto / Crediário</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Nº Parcelas</label>
              <input 
                type="number" name="parcelas" min="1" max="12" value={venda.parcelas} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>
          </div>

          {/* VENCIMENTO ESPECIAL */}
          {venda.metodoPagamento === 'Boleto / Crediário' && (
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 animate-pulse">
              <label className="block text-sm font-bold text-primary mb-3">🗓️ Vencimento da 1ª Parcela</label>
              <input 
                type="date" name="dataPrimeiraParcela" value={venda.dataPrimeiraParcela} onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-primary rounded-xl outline-none"
              />
              <p className="text-[10px] text-primary/60 mt-2 uppercase font-bold tracking-tighter">Atenção: Sistema de crediário próprio selecionado.</p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-primary hover:bg-[#3a4a3e] text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 transform transition-all active:scale-[0.98] text-lg uppercase tracking-widest"
          >
            Finalizar e Gerar Pedido
          </button>
        </form>
      </div>
    </div>
  );
}