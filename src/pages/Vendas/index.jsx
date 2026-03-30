import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function Vendas() {
  const { adicionarVenda, clientes } = useFinanceiro();

  const [venda, setVenda] = useState({
    cliente: '',
    cpf: '',
    produto: '',
    valorTotal: '',
    valorEntrada: '0', // Novo campo para entrada
    parcelas: 1,
    metodoPagamento: 'Dinheiro',
    dataVenda: new Date().toISOString().split('T')[0],
    dataPrimeiraParcela: new Date().toISOString().split('T')[0] // Novo campo para flexibilidade de data
  });

  const aplicarMascaraCPF = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      const valorFormatado = aplicarMascaraCPF(value).substring(0, 14);
      
      // Busca o cliente no estado global
      const clienteExistente = clientes.find(c => c.cpf === valorFormatado);
      
      setVenda({ 
        ...venda, 
        cpf: valorFormatado,
        cliente: clienteExistente ? clienteExistente.nome : (valorFormatado.length < 14 ? '' : venda.cliente)
      });
    } else {
      setVenda({ ...venda, [name]: value });
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();

    if (!venda.cliente || !venda.valorTotal || !venda.cpf) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (venda.cpf.length < 14) {
      alert("O CPF digitado está incompleto.");
      return;
    }

    try {
      await adicionarVenda(venda);
      
      alert("Venda registrada com sucesso! 👓");

      // Reseta o formulário
      setVenda({
        cliente: '',
        cpf: '',
        produto: '',
        valorTotal: '',
        valorEntrada: '0',
        parcelas: 1,
        metodoPagamento: 'Dinheiro',
        dataVenda: new Date().toISOString().split('T')[0],
        dataPrimeiraParcela: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert("Erro ao salvar a venda.");
    }
  };

  return (
    <div className="vendas-container">
      <header className="vendas-header">
        <h1>Nova Venda - Ótica Elos</h1>
      </header>

      <form className="vendas-form" onSubmit={handleSalvar}>
        <div className="form-group">
          <label>CPF do Cliente</label>
          <input 
            type="text" 
            name="cpf" 
            value={venda.cpf} 
            onChange={handleChange} 
            required 
            placeholder="000.000.000-00" 
          />
        </div>

        <div className="form-group">
          <label>Nome do Cliente</label>
          <input 
            type="text" 
            name="cliente" 
            value={venda.cliente} 
            onChange={handleChange} 
            required 
            placeholder={venda.cpf.length === 14 ? "Cliente encontrado!" : "Digite ou busque pelo CPF"} 
          />
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
          <label>Valor Total da Venda (R$)</label>
          <input type="number" name="valorTotal" value={venda.valorTotal} step="0.01" onChange={handleChange} required placeholder="0,00" />
        </div>

        {/* Novo campo: Valor de Entrada */}
        <div className="form-group">
          <label>Valor de Entrada (Sinal R$)</label>
          <input 
            type="number" 
            name="valorEntrada" 
            value={venda.valorEntrada} 
            step="0.01" 
            onChange={handleChange} 
            placeholder="0,00" 
          />
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

        {/* Campo Condicional: Só aparece se for Boleto/Crediário */}
        {venda.metodoPagamento === 'Boleto / Crediário' && (
          <div className="form-group">
            <label>Data da 1ª Parcela</label>
            <input 
              type="date" 
              name="dataPrimeiraParcela" 
              value={venda.dataPrimeiraParcela} 
              onChange={handleChange} 
            />
          </div>
        )}

        <button type="submit" className="btn-salvar">Finalizar e Gravar na Nuvem</button>
      </form>
    </div>
  );
}