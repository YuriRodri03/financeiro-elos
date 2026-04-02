import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { gerarPDFDocumento } from '../../documentosUtils'; 
import './style.css';

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
      await adicionarVenda(dadosParaSalvar);
      
      const imprimir = confirm("Venda registrada com sucesso! 👓\nDeseja gerar o Pedido com Garantia agora?");
      if (imprimir) {
        gerarPDFDocumento({
          numero: "017-2026", 
          data: venda.dataVenda.split('-').reverse().join('/'),
          cliente: venda.cliente,
          produto: venda.produto || "PRODUTOS ÓPTICOS",
          valorProduto: valorTotalLimpio + descontoLimpio,
          desconto: descontoLimpio,
          valorTotal: valorTotalLimpio
        }, 'pedido'); 
      }

      setVenda({
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
    } catch (error) {
      alert("Erro ao salvar a venda.");
    }
  }; // Fechamento da função handleSalvar

  return (
    <div className="vendas-container">
      <header className="vendas-header">
        <h1>Nova Venda - Ótica Elos</h1>
      </header>

      <form className="vendas-form" onSubmit={handleSalvar}>
        <div className="form-group">
          <label>CPF do Cliente</label>
          <input type="text" name="cpf" value={venda.cpf} onChange={handleChange} required placeholder="000.000.000-00" />
        </div>

        <div className="form-group">
          <label>Nome do Cliente</label>
          <input type="text" name="cliente" value={venda.cliente} onChange={handleChange} required placeholder="Nome Completo" />
        </div>

        <div className="form-group full-width">
          <label>Produto / Armação</label>
          <input type="text" name="produto" value={venda.produto} onChange={handleChange} placeholder="Ex: Ray-Ban Aviator" />
        </div>

        <div className="form-group">
          <label>Data da Venda</label>
          <input type="date" name="dataVenda" value={venda.dataVenda} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Preço de Venda (Final)</label>
          <input type="text" name="valorTotal" value={venda.valorTotal} onChange={handleChange} required placeholder="R$ 0,00" />
        </div>

        <div className="form-group">
          <label>Desconto Concedido</label>
          <input type="text" name="desconto" value={venda.desconto} onChange={handleChange} placeholder="R$ 0,00" />
        </div>

        <div className="form-group">
          <label>Valor de Entrada</label>
          <input type="text" name="valorEntrada" value={venda.valorEntrada} onChange={handleChange} placeholder="R$ 0,00" />
        </div>

        <div className="form-group">
          <label>Forma de Pagamento</label>
          <select name="metodoPagamento" value={venda.metodoPagamento} onChange={handleChange}>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Pix">Pix</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Boleto / Crediário">Boleto / Crediário</option>
          </select>
        </div>

        <div className="form-group">
          <label>Nº de Parcelas (Restante)</label>
          <input type="number" name="parcelas" min="1" max="12" value={venda.parcelas} onChange={handleChange} />
        </div>

        {venda.metodoPagamento === 'Boleto / Crediário' && (
          <div className="form-group">
            <label style={{color: 'var(--primary)', fontWeight: 'bold'}}>🗓️ Vencimento da 1ª Parcela</label>
            <input type="date" name="dataPrimeiraParcela" value={venda.dataPrimeiraParcela} onChange={handleChange} style={{borderColor: 'var(--primary)', backgroundColor: '#f0f4f0'}} />
          </div>
        )}

        <button type="submit" className="btn-salvar">Finalizar e Gerar Pedido</button>
      </form>
    </div>
  );
}