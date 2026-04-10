import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

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

  const salvar = async (e) => {
    e.preventDefault();
    
    if (novo.cpf.length < 14) {
      alert("Por favor, preencha o CPF corretamente.");
      return;
    }

    try {
      await adicionarCliente(novo);
      alert("Cliente cadastrado com sucesso na nuvem da Ótica Elos! ☁️✨");
      setNovo({ nome: '', cpf: '', telefone: '', email: '', endereco: '', observacoes: '' });
    } catch (error) {
      alert("Erro ao conectar com o banco de dados. Verifique o servidor.");
    }
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="font-tradicional text-3xl md:text-4xl text-elos-verde italic border-b-2 border-elos-bege/30 pb-4 inline-block">
            Novo Cadastro - Ótica Elos
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mt-2 font-bold">Registro de Clientes e Receitas</p>
        </header>

        {/* Formulário */}
        <form onSubmit={salvar} className="bg-white rounded-[2.5rem] shadow-soft p-6 md:p-12 space-y-8 border border-elos-bege/10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Nome Completo - Ocupa 2 colunas no MD */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                type="text" name="nome" value={novo.nome} onChange={handleChange} required 
                placeholder="Ex: João Silva de Souza"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all placeholder:text-gray-300"
              />
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1">CPF (Obrigatório)</label>
              <input 
                type="text" name="cpf" value={novo.cpf} onChange={handleChange} required 
                placeholder="000.000.000-00"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
              <input 
                type="text" name="telefone" value={novo.telefone} onChange={handleChange} 
                placeholder="(88) 99999-9999"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>

            {/* Endereço */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1">Endereço Completo</label>
              <input 
                type="text" name="endereco" value={novo.endereco} onChange={handleChange} 
                placeholder="Rua, Número, Bairro e Cidade"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>

            {/* Observações */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1">Observações Clínicas (Grau, Armação, Lentes)</label>
              <textarea 
                name="observacoes" value={novo.observacoes} onChange={handleChange} rows="4" 
                placeholder="Anote aqui detalhes da receita ou preferências do cliente..."
                className="w-full px-5 py-4 bg-elos-fundo/50 border-2 border-elos-bege/20 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all resize-none italic text-elos-texto"
              ></textarea>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-5 rounded-2xl shadow-xl shadow-elos-verde/20 transform transition-all active:scale-[0.98] text-lg uppercase tracking-[0.2em] mt-6"
          >
            Finalizar Cadastro
          </button>
        </form>

        <footer className="mt-10 text-center text-gray-400 text-[10px] uppercase tracking-widest font-bold">
          Sistema Homologado Ótica Elos &copy; 2026
        </footer>
      </div>
    </div>
  );
}