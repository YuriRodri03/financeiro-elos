import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function CadastroClientes() {
  const { adicionarCliente } = useFinanceiro();
  const [novo, setNovo] = useState({
    nome: '', 
    cpf: '', 
    telefone: '', 
    email: '', 
    endereco: '', 
    observacoes: ''
  });

  // --- MÁSCARAS DE FORMATAÇÃO ---
  const mascaraTelefone = (v) => {
    return v.replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .substring(0, 15);
  };

  const mascaraCPF = (v) => {
    return v.replace(/\D/g, "")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
            .substring(0, 14);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      setNovo({ ...novo, [name]: mascaraTelefone(value) });
    } else if (name === 'cpf') {
      setNovo({ ...novo, [name]: mascaraCPF(value) });
    } else {
      setNovo({ ...novo, [name]: value });
    }
  };

  const salvar = async (e) => { // Tornada assíncrona
    e.preventDefault();
    
    if (novo.cpf.length < 14) {
      alert("Por favor, preencha o CPF corretamente.");
      return;
    }

    try {
      // Chama a função que agora faz o fetch para o MongoDB
      await adicionarCliente(novo);
      
      alert("Cliente cadastrado com sucesso na nuvem da Ótica Elos! ☁️✨");
      
      // Limpa o formulário apenas após o sucesso
      setNovo({ nome: '', cpf: '', telefone: '', email: '', endereco: '', observacoes: '' });
    } catch (error) {
      alert("Erro ao conectar com o banco de dados. Verifique o servidor.");
    }
  };

  return (
    <div className="vendas-container"> 
      <header className="vendas-header">
        <h1>Novo Cadastro - Ótica Elos</h1>
      </header>

      <form className="vendas-form" onSubmit={salvar}>
        <div className="form-group full-width">
          <label>Nome Completo</label>
          <input 
            type="text" 
            name="nome" 
            value={novo.nome} 
            onChange={handleChange} 
            required 
            placeholder="Ex: João Silva de Souza"
          />
        </div>

        <div className="form-group">
          <label>CPF (Obrigatório)</label>
          <input 
            type="text" 
            name="cpf" 
            value={novo.cpf} 
            onChange={handleChange} 
            required 
            placeholder="000.000.000-00" 
          />
        </div>

        <div className="form-group">
          <label>Telefone / WhatsApp</label>
          <input 
            type="text" 
            name="telefone" 
            value={novo.telefone} 
            onChange={handleChange} 
            placeholder="(88) 99999-9999" 
          />
        </div>

        <div className="form-group full-width">
          <label>Endereço Completo</label>
          <input 
            type="text" 
            name="endereco" 
            value={novo.endereco} 
            onChange={handleChange} 
            placeholder="Rua, Número, Bairro e Cidade"
          />
        </div>

        <div className="form-group full-width">
          <label>Observações Clínicas (Grau, Armação, Lentes)</label>
          <textarea 
            name="observacoes" 
            value={novo.observacoes} 
            onChange={handleChange} 
            rows="4" 
            placeholder="Anote aqui detalhes da receita ou preferências do cliente..."
            style={{
              padding: '15px', 
              borderRadius: '8px', 
              border: '2px solid #d2b48c', // Usei a cor bege de destaque do seu tema
              fontFamily: 'sans-serif',
              fontSize: '1rem'
            }}
          ></textarea>
        </div>

        <button type="submit" className="btn-salvar">
          Finalizar Cadastro
        </button>
      </form>
    </div>
  );
}