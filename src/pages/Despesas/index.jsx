import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function Despesas() {
  const { despesas, adicionarDespesa, excluirDespesa, darBaixaDespesa, carregando } = useFinanceiro();

  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    categoria: 'Fixo',
    vencimento: new Date().toISOString().split('T')[0],
    paga: false
  });

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
    if (name === 'valor') {
      setNovaDespesa({ ...novaDespesa, valor: aplicarMascaraMoeda(value) });
    } else {
      setNovaDespesa({ ...novaDespesa, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valorLimpo = Number(novaDespesa.valor.replace(/\D/g, '')) / 100;

    if (!novaDespesa.descricao || valorLimpo <= 0) {
      alert("Preencha a descrição e o valor corretamente.");
      return;
    }

    try {
      await adicionarDespesa({ ...novaDespesa, valor: valorLimpo });
      setNovaDespesa({
        descricao: '',
        valor: '',
        categoria: 'Fixo',
        vencimento: new Date().toISOString().split('T')[0],
        paga: false
      });
      alert("Despesa registrada!");
    } catch (err) {
      alert("Erro ao salvar despesa.");
    }
  };

  if (carregando) return null;

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6">
          <h1 className="font-tradicional text-3xl md:text-4xl text-elos-verde italic">
            Gestão de Despesas
          </h1>
          <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest font-bold">Controle de Saídas e Fluxo de Caixa</p>
        </header>

        {/* Formulário de Cadastro */}
        <div className="bg-white rounded-3xl shadow-soft p-6 md:p-8 mb-12">
          <h3 className="text-lg font-bold text-elos-verde mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-elos-bege rounded-full"></span>
            Nova Despesa
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
              <input 
                type="text" name="descricao" 
                value={novaDespesa.descricao} onChange={handleChange} 
                placeholder="Ex: Aluguel, Energia..." required 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Valor</label>
              <input 
                type="text" name="valor" 
                value={novaDespesa.valor} onChange={handleChange} 
                placeholder="R$ 0,00" required 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all font-bold text-red-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Vencimento</label>
              <input 
                type="date" name="vencimento" 
                value={novaDespesa.vencimento} onChange={handleChange} required 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
              <select 
                name="categoria" value={novaDespesa.categoria} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              >
                <option value="Fixo">Custo Fixo (Aluguel, Luz)</option>
                <option value="Variável">Custo Variável</option>
                <option value="Fornecedor">Fornecedor (Estoque)</option>
                <option value="Pessoal">Pessoal (Pro-labore)</option>
              </select>
            </div>

            <div className="md:col-span-1 flex items-end">
              <button 
                type="submit" 
                className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase text-sm tracking-widest"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Despesas */}
        <div className="space-y-6">
          <h3 className="text-xl font-tradicional text-elos-verde italic ml-2">Contas Recentes</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {despesas.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl text-center text-gray-400 shadow-soft italic">
                Nenhuma despesa registrada.
              </div>
            ) : (
              despesas.sort((a,b) => new Date(b.vencimento) - new Date(a.vencimento)).map(d => (
                <div 
                  key={d._id} 
                  className={`group flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-soft border-l-8 transition-all hover:scale-[1.01] ${
                    d.paga ? 'border-gray-200 opacity-75' : 'border-red-500'
                  }`}
                >
                  <div className="flex flex-col text-center md:text-left mb-4 md:mb-0">
                    <span className={`text-xs font-black uppercase tracking-widest mb-1 ${d.paga ? 'text-gray-400' : 'text-red-500'}`}>
                      {d.paga ? '✓ Pago' : '⚠ Pendente'}
                    </span>
                    <strong className={`text-lg font-bold ${d.paga ? 'text-gray-500 line-through' : 'text-elos-verde'}`}>
                      {d.descricao}
                    </strong>
                    <div className="text-xs text-gray-400 font-bold mt-1 uppercase">
                      {d.categoria} • <span className="italic">Vence em {d.vencimento.split('-').reverse().join('/')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <span className={`text-2xl font-black ${d.paga ? 'text-gray-400' : 'text-red-600'}`}>
                      R$ {d.valor.toFixed(2).replace('.', ',')}
                    </span>
                    
                    <div className="flex items-center gap-3">
                      {!d.paga && (
                        <button 
                          onClick={() => darBaixaDespesa(d._id)} 
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                        >
                          Pagar
                        </button>
                      )}
                      <button 
                        onClick={() => excluirDespesa(d._id)} 
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Excluir despesa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}