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
    observacoes: '',
    foto: '' 
  });

  // --- NOVO: ESTADO PARA GERENCIAR NOTIFICAÇÕES TOAST PREMIUM ---
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3500); // Some sozinho após 3.5 segundos
  };

  // --- LÓGICA DE FOTO PARA O CADASTRO ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNovo({ ...novo, foto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

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
      mostrarToast("Por favor, preencha o CPF corretamente.", "erro");
      return;
    }

    try {
      await adicionarCliente(novo);
      mostrarToast("Cliente cadastrado com sucesso na nuvem da Ótica Elos! ☁️✨", "sucesso");
      setNovo({ nome: '', cpf: '', telefone: '', email: '', endereco: '', observacoes: '', foto: '' });
    } catch (error) {
      mostrarToast("Erro ao conectar com o banco de dados. Verifique o servidor.", "erro");
    }
  };

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {/* NOVO: COMPONENTE VISUAL DO TOAST COMPATÍVEL COM LAYOUT ELOS */}
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 ${
            toast.tipo === 'sucesso' 
              ? 'bg-elos-verde/95 border-elos-bege/30 text-white' 
              : 'bg-red-900/95 border-red-500/30 text-red-100'
          }`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider font-sans">{toast.mensagem}</p>
          </div>
        </div>
      )}

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
            {/* Nome Completo */}
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

            {/* E-mail */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1">E-mail</label>
              <input 
                type="email" name="email" value={novo.email} onChange={handleChange} 
                placeholder="cliente@email.com"
                className="w-full px-5 py-4 bg-elos-fundo/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-elos-bege outline-none transition-all placeholder:text-gray-300"
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

            {/* Observações e Foto */}
            <div className="md:col-span-2 space-y-4">
              <label className="text-xs font-black text-elos-verde uppercase tracking-widest ml-1 italic">Anexos e Observações Clínicas</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <textarea 
                  name="observacoes" value={novo.observacoes} onChange={handleChange} rows="5" 
                  placeholder="Detalhes técnicos permanentes do cliente..."
                  className="w-full px-5 py-4 bg-elos-fundo/50 border-2 border-elos-bege/20 rounded-3xl focus:ring-2 focus:ring-elos-bege outline-none transition-all resize-none italic text-elos-texto"
                ></textarea>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-elos-bege/30 rounded-3xl p-6 bg-elos-fundo/20 relative group hover:bg-elos-fundo/40 transition-all min-h-[160px]">
                  {novo.foto ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <img src={novo.foto} alt="Preview do Cliente" className="max-h-32 rounded-xl shadow-lg border-2 border-white object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setNovo({...novo, foto: ''})} 
                        className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                      >
                        Remover Anexo
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2 opacity-50">📸</div>
                      <span className="text-[10px] font-black text-elos-bege uppercase tracking-widest text-center">Tirar Foto ou Anexar Receita</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                      <div className="mt-2 text-elos-bege/40 text-[9px] font-bold uppercase tracking-widest">Clique para abrir câmera</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-elos-verde hover:bg-[#3a4a3e] text-white font-bold py-6 rounded-2xl shadow-xl shadow-elos-verde/20 transform transition-all active:scale-[0.98] text-lg uppercase tracking-[0.2em] mt-6"
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