import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';

export default function Despesas() {
  const { despesas, adicionarDespesa, excluirDespesa, darBaixaDespesa, carregando } = useFinanceiro();

  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    categoria: '', // Agora começa vazio para você digitar
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

    if (!novaDespesa.descricao || valorLimpo <= 0 || !novaDespesa.categoria) {
      alert("Preencha a descrição, valor e categoria corretamente.");
      return;
    }

    try {
      await adicionarDespesa({ 
        ...novaDespesa, 
        valor: valorLimpo,
        categoria: novaDespesa.categoria.toUpperCase() // Salva em maiúsculo para padronizar
      });
      
      setNovaDespesa({
        descricao: '',
        valor: '',
        categoria: '',
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
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-10 text-center md:text-left border-b border-elos-bege/20 pb-6">
          <h1 className="font-tradicional text-4xl text-elos-verde italic">
            Gestão de Despesas
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black">Controle de Saídas e Fluxo de Caixa</p>
        </header>

        {/* Formulário de Cadastro */}
        <div className="bg-white rounded-[2.5rem] shadow-soft p-8 md:p-12 mb-12 border border-elos-bege/10">
          <h3 className="text-lg font-bold text-elos-verde mb-8 flex items-center gap-3 font-tradicional italic">
            <span className="w-2 h-6 bg-elos-bege rounded-full"></span>
            Registrar Novo Gasto
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Descrição do Gasto</label>
              <input 
                type="text" name="descricao" 
                value={novaDespesa.descricao} onChange={handleChange} 
                placeholder="Ex: Aluguel, Nota Fornecedor X..." required 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Valor</label>
              <input 
                type="text" name="valor" 
                value={novaDespesa.valor} onChange={handleChange} 
                placeholder="R$ 0,00" required 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-red-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Vencimento</label>
              <input 
                type="date" name="vencimento" 
                value={novaDespesa.vencimento} onChange={handleChange} required 
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all"
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter ml-1">Categoria (Digite manualmente)</label>
              <input 
                type="text" 
                name="categoria" 
                value={novaDespesa.categoria} 
                onChange={handleChange}
                placeholder="Ex: FIXO, VARIÁVEL, LABORATORIO, ESTOQUE..." 
                required
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all uppercase"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button 
                type="submit" 
                className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest"
              >
                Registrar Gasto
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Despesas */}
        <div className="space-y-8">
          <h3 className="text-2xl font-tradicional text-elos-verde italic ml-2">Fluxo de Contas Recentes</h3>
          
          <div className="grid grid-cols-1 gap-6">
            {despesas.length === 0 ? (
              <div className="bg-white p-20 rounded-[2.5rem] text-center text-gray-300 shadow-soft italic">
                Nenhuma despesa registrada.
              </div>
            ) : (
              despesas.sort((a,b) => new Date(b.vencimento) - new Date(a.vencimento)).map(d => (
                <div 
                  key={d._id} 
                  className={`group flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] shadow-soft border-l-8 transition-all hover:scale-[1.01] ${
                    d.paga ? 'border-gray-200 opacity-60' : 'border-red-600'
                  }`}
                >
                  <div className="flex flex-col text-center md:text-left mb-4 md:mb-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest mb-2 ${d.paga ? 'text-gray-400' : 'text-red-600'}`}>
                      {d.paga ? '✓ Baixado no Caixa' : '⚠ Aguardando Pagamento'}
                    </span>
                    <strong className={`text-xl font-bold font-tradicional ${d.paga ? 'text-gray-400 line-through' : 'text-elos-verde'}`}>
                      {d.descricao}
                    </strong>
                    <div className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-tighter">
                      CATEGORIA: {d.categoria} • <span className="italic">Vencimento: {d.vencimento.split('-').reverse().join('/')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <span className={`text-3xl font-black ${d.paga ? 'text-gray-300' : 'text-red-700'}`}>
                      R$ {d.valor.toFixed(2).replace('.', ',')}
                    </span>
                    
                    <div className="flex items-center gap-4">
                      {!d.paga && (
                        <button 
                          onClick={() => darBaixaDespesa(d._id)} 
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Dar Baixa
                        </button>
                      )}
                      <button 
                        onClick={() => { if(confirm("Excluir registro desta despesa?")) excluirDespesa(d._id) }} 
                        className="p-3 text-gray-300 hover:text-red-600 transition-colors"
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