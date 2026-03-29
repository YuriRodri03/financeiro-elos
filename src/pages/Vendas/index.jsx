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
    parcelas: 1,
    metodoPagamento: 'Dinheiro',
    dataVenda: new Date().toISOString().split('T')[0]
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
      
      // Busca o cliente no estado global (que veio do MongoDB no carregamento)
      const clienteExistente = clientes.find(c => c.cpf === valorFormatado);
      
      setVenda({ 
        ...venda, 
        cpf: valorFormatado,
        // Se achou o cliente, trava o nome. Se não, deixa o usuário digitar.
        cliente: clienteExistente ? clienteExistente.nome : (valorFormatado.length < 14 ? '' : venda.cliente)
      });
    } else {
      setVenda({ ...venda, [name]: value });
    }
  };

  const handleSalvar = async (e) => { // Tornamos assíncrona para esperar o MongoDB
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
      // Espera a função do Contexto enviar para o backend
      await adicionarVenda(venda);
      
      alert("Venda registrada com sucesso no banco de dados! 👓");

      // Limpa o formulário apenas se deu tudo certo
      setVenda({
        cliente: '',
        cpf: '',
        produto: '',
        valorTotal: '',
        parcelas: 1,
        metodoPagamento: 'Dinheiro',
        dataVenda: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert("Erro ao salvar a venda. Verifique se o servidor está ligado.");
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
          <label>Valor Total (R$)</label>
          <input type="number" name="valorTotal" value={venda.valorTotal} step="0.01" onChange={handleChange} required placeholder="0,00" />
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
          <label>Número de Parcelas</label>
          <input type="number" name="parcelas" min="1" max="12" value={venda.parcelas} onChange={handleChange} />
        </div>

        <button type="submit" className="btn-salvar">Finalizar e Gravar na Nuvem</button>
      </form>
    </div>
  );
}