import React, { useState } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import './style.css';

export default function Despesas() {
  const { despesas, adicionarDespesa, excluirDespesa, darBaixaDespesa, carregando } = useFinanceiro();

  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    categoria: 'Fixo',
    vencimento: new Date().toISOString().split('T')[0],
    paga: false
  });

  // Reutilizando sua máscara de Moeda
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
    <div className="despesas-container">
      <header className="despesas-header">
        <h1>Gestão de Despesas</h1>
        <p>Controle de saídas e contas a pagar</p>
      </header>

      <form className="despesas-form" onSubmit={handleSubmit}>
        <div className="form-group full-width">
          <label>Descrição da Conta</label>
          <input 
            type="text" name="descricao" 
            value={novaDespesa.descricao} onChange={handleChange} 
            placeholder="Ex: Aluguel, Energia, Fornecedor..." required 
          />
        </div>

        <div className="form-group">
          <label>Valor</label>
          <input 
            type="text" name="valor" 
            value={novaDespesa.valor} onChange={handleChange} 
            placeholder="R$ 0,00" required 
          />
        </div>

        <div className="form-group">
          <label>Vencimento</label>
          <input 
            type="date" name="vencimento" 
            value={novaDespesa.vencimento} onChange={handleChange} required 
          />
        </div>

        <div className="form-group">
          <label>Categoria</label>
          <select name="categoria" value={novaDespesa.categoria} onChange={handleChange}>
            <option value="Fixo">Custo Fixo (Aluguel, Luz)</option>
            <option value="Variável">Custo Variável</option>
            <option value="Fornecedor">Fornecedor (Estoque)</option>
            <option value="Pessoal">Pessoal (Pro-labore)</option>
          </select>
        </div>

        <button type="submit" className="btn-salvar-despesa">Registrar Saída</button>
      </form>

      <div className="lista-despesas">
        <h3>Contas Recentes</h3>
        {despesas.length === 0 ? (
          <p className="vazio">Nenhuma despesa registrada.</p>
        ) : (
          despesas.sort((a,b) => new Date(b.vencimento) - new Date(a.vencimento)).map(d => (
            <div key={d._id} className={`card-despesa ${d.paga ? 'paga' : 'pendente'}`}>
              <div className="info">
                <strong>{d.descricao}</strong>
                <small>{d.categoria} • Vence em {d.vencimento.split('-').reverse().join('/')}</small>
              </div>
              <div className="valor-acao">
                <span className="valor-saida">R$ {d.valor.toFixed(2).replace('.', ',')}</span>
                <div className="acoes">
                  {!d.paga && (
                    <button onClick={() => darBaixaDespesa(d._id)} className="btn-pagar">Pagar</button>
                  )}
                  <button onClick={() => excluirDespesa(d._id)} className="btn-trash">🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}