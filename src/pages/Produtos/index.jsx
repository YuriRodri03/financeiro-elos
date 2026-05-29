import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function Produtos() {
  const { produtos, adicionarProduto, excluirProduto, carregando } = useFinanceiro();

  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    preco: '',
    categoria: '' // NOVO: Começa vazio para você digitar livremente
  });

  // --- MÁSCARA DE MOEDA ---
  const aplicarMascaraMoeda = (valor) => {
    let v = valor.replace(/\D/g, '');
    if (!v) return '';
    return (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const limparMoeda = (valor) => {
    if (!valor) return 0;
    return Number(String(valor).replace(/[^\d]/g, '')) / 100;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'preco') {
      setNovoProduto({ ...novoProduto, [name]: aplicarMascaraMoeda(value) });
    } else {
      setNovoProduto({ ...novoProduto, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const precoLimpo = limparMoeda(novoProduto.preco);

    if (!novoProduto.nome || precoLimpo <= 0 || !novoProduto.categoria) {
      alert("Por favor, preencha o nome, preço e categoria corretamente.");
      return;
    }

    try {
      await adicionarProduto({
        nome: novoProduto.nome.toUpperCase(), // Padroniza nome em maiúsculo
        preco: precoLimpo,
        categoria: novoProduto.categoria.toUpperCase() // NOVO: Padroniza categoria em maiúsculo
      });

      setNovoProduto({ nome: '', preco: '', categoria: '' });
      alert("Produto adicionado ao catálogo com sucesso! 📦✨");
    } catch (err) {
      alert("Erro ao cadastrar produto.");
    }
  };

  if (carregando) return null;

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-5xl mx-auto">
        
        {/* CABEÇALHO */}
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">
            Catálogo de Produtos
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Gerenciamento de Itens e Precificação</p>
        </header>

        {/* FORMULÁRIO DE CADASTRO */}
        <div className="bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border border-elos-bege/10">
          <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
            <span className="w-2 h-6 bg-elos-bege rounded-full"></span>
            Cadastrar Novo Item
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Nome do Produto / Modelo</label>
              <input 
                type="text" name="nome" value={novoProduto.nome} onChange={handleChange} 
                placeholder="Ex: RAY-BAN ERICA RB4171 - PRETO" required 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Preço de Venda</label>
              <input 
                type="text" name="preco" value={novoProduto.preco} onChange={handleChange} 
                placeholder="R$ 0,00" required 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl font-bold text-elos-verde outline-none"
              />
            </div>

            {/* SELEÇÃO ANTERIOR TRANSFORMA-SE EM CAMPO ESCRITO */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Categoria (Escrito)</label>
              <input 
                type="text" name="categoria" value={novoProduto.categoria} onChange={handleChange} 
                placeholder="Ex: ARMAÇÃO, LENTE, ACESSÓRIO..." required 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl outline-none uppercase font-bold text-elos-texto"
              />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button 
                type="submit" 
                className="bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest"
              >
                Salvar no Catálogo
              </button>
            </div>
          </form>
        </div>

        {/* LISTA DE PRODUTOS CADASTRADOS */}
        <div className="space-y-6">
          <h3 className="text-2xl font-tradicional text-elos-verde italic ml-2">Itens Disponíveis</h3>
          
          <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border border-gray-100">
            {produtos.length === 0 ? (
              <p className="text-center text-gray-400 italic py-16">Nenhum produto cadastrado no catálogo.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {produtos.map((p) => (
                  <div key={p._id || p.id} className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 hover:bg-elos-fundo/30 transition-colors">
                    <div className="text-center sm:text-left">
                      <span className="text-[9px] font-black bg-elos-bege/20 text-elos-bege px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {p.categoria}
                      </span>
                      <h4 className="text-lg font-bold text-elos-texto mt-2 font-tradicional">{p.nome}</h4>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <span className="text-xl font-black text-elos-verde">
                        {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button 
                        onClick={() => excluirProduto(p._id || p.id)}
                        className="text-red-400 hover:text-red-600 p-2 transition-colors"
                        title="Remover do catálogo"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}