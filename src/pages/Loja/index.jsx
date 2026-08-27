import React, { useState, useEffect, useMemo } from 'react';
import { useFinanceiro } from '../../FinanceiroContext';
import { useNavigate } from 'react-router-dom';

// =======================================================
// 🟢 COMPONENTE: MODAL DE TERMOS DE SERVIÇO
// =======================================================
function ModalTermos({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-[#1d3026]/40 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 overflow-hidden border border-white/20">
        
        <div className="p-6 md:p-8 flex justify-between items-center bg-gradient-to-r from-[#1d3026] to-[#2a4537] text-white">
          <div>
            <h2 className="text-3xl font-tradicional italic font-bold">Termos de Serviço</h2>
            <p className="text-[10px] font-black text-[#c5a880] uppercase tracking-widest mt-1">Ótica Elos E-commerce</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-sm text-xl backdrop-blur-sm">
            &times;
          </button>
        </div>
        
        <div className="p-6 md:p-10 overflow-y-auto flex-1 text-sm text-gray-600 space-y-8 leading-relaxed custom-scrollbar bg-[#f9f8f6]">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 1. Introdução</h3>
            <p>Bem-vindo ao e-commerce da Ótica Elos. Ao utilizar nossa loja virtual e finalizar uma compra, você concorda automaticamente com as diretrizes e regras estabelecidas neste documento.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 2. Lentes de Grau e Receituário</h3>
            <p>A confecção de lentes oftálmicas com grau requer o envio de uma receita oftalmológica atualizada (emitida há no máximo 1 ano) através do nosso canal oficial de WhatsApp logo após a compra. A Ótica Elos garante a fidelidade da lente em relação à receita enviada, mas não se responsabiliza por eventuais erros médicos na prescrição.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 3. Prazos, Entregas e Frete</h3>
            <p>O prazo de produção e entrega começa a ser contabilizado apenas após a confirmação do pagamento e o envio da receita médica (quando aplicável). <strong>Atenção ao Frete:</strong> O valor do frete não está incluso no valor final do pedido online. A taxa de entrega será calculada e cobrada no momento da entrega do seu produto.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-[#1d3026] font-bold uppercase tracking-widest text-[11px] mb-3 flex items-center gap-2"><span className="text-[#c5a880]">✦</span> 4. Trocas e Devoluções</h3>
            <p>Aceitamos a devolução de armações (sem grau) no prazo de até 7 dias corridos após o recebimento, desde que o produto retorne na embalagem original e sem marcas de uso. Lentes de grau são produtos personalizados e fabricados sob medida, portanto, não possuem direito a devolução, exceto em casos de defeitos.</p>
          </div>
        </div>
        
        <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-10 py-4 bg-[#1d3026] text-white font-bold rounded-xl text-xs uppercase tracking-[0.2em] hover:bg-[#c5a880] active:scale-[0.98] transition-all shadow-lg hover:shadow-[#c5a880]/30">
            Estou de Acordo
          </button>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// 🟢 COMPONENTE: CARD DE PRODUTO (Estilo Grife Premium)
// =======================================================
function ProdutoCard({ produto, noCarrinho, adicionarAoCarrinho, apiUrl }) {
  const [imgIndex, setImgIndex] = useState(0);
  const productId = produto._id || produto.id;
  
  const fotos = (produto.fotos && produto.fotos.length > 0) ? produto.fotos : (produto.foto ? [produto.foto] : []);
  const fotoAtual = fotos[imgIndex];

  const nextImg = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev + 1) % fotos.length);
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === 0 ? fotos.length - 1 : prev - 1));
  };

  return (
    <div className="group bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-[#c5a880]/30 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 flex flex-col relative">
      
      {produto.referencia && (
        <div className="absolute top-5 left-5 z-10 bg-white/90 backdrop-blur-md text-[#1d3026] border border-gray-100 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
          Ref: {produto.referencia}
        </div>
      )}
      
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-white relative overflow-hidden flex items-center justify-center p-10 group/galeria">
        {fotoAtual ? (
          <img 
            src={fotoAtual.startsWith('http') ? fotoAtual : `${apiUrl.replace(/\/$/, '')}/produtos/${productId}/foto?v=1`} 
            alt={produto.nome} 
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] drop-shadow-xl"
          />
        ) : null}
        
        <span className={`text-7xl opacity-5 absolute ${fotoAtual ? 'hidden' : 'block'}`}>👓</span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-500 pointer-events-none"></div>

        {fotos.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm text-[#1d3026] w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/galeria:opacity-100 transition-all duration-300 z-20 hover:scale-110">
              ‹
            </button>
            <button onClick={nextImg} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm text-[#1d3026] w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/galeria:opacity-100 transition-all duration-300 z-20 hover:scale-110">
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/galeria:opacity-100 transition-all duration-300 z-20 bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-full">
              {fotos.map((_, idx) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === imgIndex ? 'bg-[#1d3026] w-3' : 'bg-gray-400'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-1 bg-white relative">
        <h3 className="font-sans font-bold text-[#1d3026] text-sm leading-relaxed line-clamp-2 mb-4 group-hover:text-[#c5a880] transition-colors">
          {produto.nome}
        </h3>
        
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">{produto.categoria}</span>
            <span className="font-tradicional italic font-bold text-[#1d3026] text-2xl tracking-tight">
              {Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          
          <button 
            onClick={() => adicionarAoCarrinho(produto)}
            disabled={noCarrinho}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md ${
              noCarrinho 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-[#1d3026] text-white hover:bg-[#c5a880] hover:shadow-[#c5a880]/40 hover:-translate-y-1 active:scale-95'
            }`}
          >
            {noCarrinho ? '✓' : '🛍️'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// 🟢 COMPONENTE PRINCIPAL: LOJA ONLINE
// =======================================================
export default function HomeLoja() {
  const { produtos, carregando } = useFinanceiro();
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  
  const infinitePayUser = import.meta.env.VITE_INFINITEPAY_USER || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';
  
  const [categoriaAtiva, setCategoriaAtiva] = useState('TODAS');
  const [isScrolled, setIsScrolled] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  
  const clienteLogado = JSON.parse(localStorage.getItem('clienteLogadoElos') || 'null');
  const [mostrarTermos, setMostrarTermos] = useState(false);

  const [carrinho, setCarrinho] = useState(() => {
    try { return JSON.parse(localStorage.getItem('carrinhoVirtualElos')) || []; } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('carrinhoVirtualElos', JSON.stringify(carrinho));
  }, [carrinho]);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [etapaCheckout, setEtapaCheckout] = useState(0); 
  const [processando, setProcessando] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(null);

  const [abaAtiva, setAbaAtiva] = useState('VITRINE'); 
  const [meusPedidos, setMeusPedidos] = useState([]);

  const [dadosCliente, setDadosCliente] = useState({ 
    nome: clienteLogado?.nome || '', 
    telefone: clienteLogado?.telefone || '', 
    cpf: clienteLogado?.cpf || '',
    endereco: clienteLogado?.endereco || ''
  });

  const buscarPedidos = async () => {
    if (!clienteLogado?.cpf) return; 
    try {
      const res = await fetch(`${apiUrl}/pedidos_online`);
      if (res.ok) {
        const todosPedidos = await res.json();
        setMeusPedidos(todosPedidos.filter(p => p.clienteCpf === clienteLogado.cpf));
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (abaAtiva === 'MEUS_PEDIDOS' && clienteLogado) buscarPedidos();
  }, [abaAtiva, clienteLogado]); 

  const handleMascaraTel = (v) => {
    let valor = v.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 2) valor = `(${valor.substring(0,2)}) ${valor.substring(2)}`;
    if (valor.length > 10) valor = `${valor.substring(0,10)}-${valor.substring(10)}`;
    return valor;
  };

  const handleMascaraCpf = (v) => {
    let valor = v.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 3) valor = `${valor.substring(0,3)}.${valor.substring(3)}`;
    if (valor.length > 7) valor = `${valor.substring(0,7)}.${valor.substring(7)}`;
    if (valor.length > 11) valor = `${valor.substring(0,11)}-${valor.substring(11)}`;
    return valor;
  };

  const getTextoStatus = (status) => {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO': return { texto: 'Aguardando Pagamento', cor: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
      case 'PAGO': return { texto: 'Pagamento Aprovado', cor: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'CONCLUIDO': return { texto: 'Pedido Entregue', cor: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'CANCELADO': return { texto: 'Cancelado', cor: 'text-red-600 bg-red-50 border-red-200' };
      default: return { texto: status, cor: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const produtosLoja = useMemo(() => {
    let filtrados = (produtos || []).filter(p => p.quantidade > 0 && p.categoria !== 'LENTE');
    if (busca) filtrados = filtrados.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.referencia || '').toLowerCase().includes(busca.toLowerCase()));
    if (categoriaAtiva !== 'TODAS') filtrados = filtrados.filter(p => p.categoria === categoriaAtiva);
    return filtrados;
  }, [produtos, busca, categoriaAtiva]);

  const categorias = [
    { id: 'TODAS', label: 'Tudo', icone: '✨' },
    { id: 'ARMAÇÃO', label: 'Óculos', icone: '👓' },
    { id: 'ÓCULOS DE SOL', label: 'Solar', icone: '☀️' },
    { id: 'ACESSÓRIOS', label: 'Acessórios', icone: '👜' }
  ];

  const adicionarAoCarrinho = (produto) => {
    if (carrinho.find(item => item._id === (produto._id || produto.id))) return;
    setCarrinho([...carrinho, { ...produto, _id: (produto._id || produto.id) }]);
    setMostrarCarrinho(true);
    setEtapaCheckout(0); 
  };

  const removerDoCarrinho = (idProduto) => {
    setCarrinho(carrinho.filter(item => item._id !== idProduto));
    if (carrinho.length === 1) setEtapaCheckout(0);
  };

  const valorTotalCarrinho = carrinho.reduce((total, item) => total + Number(item.preco), 0);

  const processarPedido = async (e) => {
    e.preventDefault();
    setProcessando(true);

    const payload = {
      clienteNome: dadosCliente.nome.toUpperCase(),
      clienteTelefone: dadosCliente.telefone,
      clienteCpf: dadosCliente.cpf,
      clienteEndereco: dadosCliente.endereco,
      itens: carrinho.map(item => ({ id: item._id, nome: item.nome, preco: item.preco, referencia: item.referencia })),
      valorTotal: valorTotalCarrinho
    };

    try {
      const res = await fetch(`${apiUrl}/pedidos_online`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setPedidoFinalizado(data.pedido); 
        setCarrinho([]); 
        setEtapaCheckout(2); 
      } else alert("Ops! Tivemos um problema.");
    } catch (err) { alert("Erro ao conectar com o servidor."); } 
    finally { setProcessando(false); }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!window.confirm("Deseja cancelar este pedido?")) return;
    try {
      const res = await fetch(`${apiUrl}/pedidos_online/${pedidoId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELADO' }) });
      if (res.ok) buscarPedidos(); 
    } catch (error) {}
  };

  const avisarWhatsApp = (pedidoEspecifico = null) => {
    const p = pedidoEspecifico || pedidoFinalizado;
    if (!p) return;
    const texto = `*OLÁ! GOSTARIA DE FALAR SOBRE O MEU PEDIDO!* 📦✨\n\n*Número do Pedido:* #${p.numeroPedidoOnline}\n*Meu Nome:* ${p.clienteNome}\n*Valor:* R$ ${Number(p.valorTotal).toFixed(2).replace('.', ',')}\n\nEstou enviando minha receita e/ou o comprovante.`;
    window.open(`https://wa.me/5585985506571?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleSair = () => { localStorage.removeItem('clienteLogadoElos'); window.location.reload(); };

  const verificarLoginEAvancar = (destino) => {
    if (clienteLogado) {
      if (destino === 'HISTORICO') setAbaAtiva('MEUS_PEDIDOS');
      if (destino === 'CHECKOUT') setEtapaCheckout(1);
    } else {
      localStorage.setItem('redirect_pos_login', 'loja');
      setMostrarCarrinho(false); 
      navigate('/login'); 
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f8f6]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1d3026] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#1d3026] font-bold uppercase tracking-[0.2em] text-xs">Preparando Experiência...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f6] font-sans relative pb-20">
      
      {mostrarTermos && <ModalTermos onClose={() => setMostrarTermos(false)} />}

      {/* NAVBAR */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-500 ease-in-out ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100 py-2' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAbaAtiva('VITRINE')}>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <img src="/favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className={`font-tradicional text-2xl italic font-bold transition-colors duration-500 ${isScrolled ? 'text-[#1d3026]' : 'text-white drop-shadow-md'}`}>Ótica Elos</span>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
              <div className="hidden md:flex flex-col text-right">
                {clienteLogado ? (
                  <>
                    <span className={`text-xs font-bold transition-colors ${isScrolled ? 'text-gray-800' : 'text-white'}`}>{clienteLogado.nome.split(' ')[0]}</span>
                    <div className="flex items-center gap-2 justify-end mt-0.5">
                      <button onClick={() => verificarLoginEAvancar('HISTORICO')} className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isScrolled ? 'text-[#c5a880] hover:text-[#1d3026]' : 'text-[#e6d0a7] hover:text-white'}`}>Pedidos</button>
                      <span className={isScrolled ? 'text-gray-300' : 'text-white/30'}>|</span>
                      <button onClick={handleSair} className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isScrolled ? 'text-red-400 hover:text-red-600' : 'text-white/70 hover:text-red-300'}`}>Sair</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => verificarLoginEAvancar('VITRINE')} className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${isScrolled ? 'text-[#1d3026] hover:text-[#c5a880]' : 'text-white hover:text-[#e6d0a7] drop-shadow-md'}`}>
                    Entrar / Cadastrar
                  </button>
                )}
              </div>

              <div className="md:hidden flex items-center">
                <button 
                  onClick={() => verificarLoginEAvancar(clienteLogado ? 'HISTORICO' : 'VITRINE')} 
                  className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${isScrolled ? 'bg-gray-50 text-[#1d3026] border border-gray-200' : 'bg-white/10 text-white backdrop-blur-md border border-white/20'}`}
                >
                  <span className="text-sm">👤</span>
                </button>
              </div>

              <div className={`hidden md:block h-8 w-px transition-colors ${isScrolled ? 'bg-gray-200' : 'bg-white/20'}`}></div>
              
              <button 
                onClick={() => { setMostrarCarrinho(true); if(etapaCheckout === 2) setEtapaCheckout(0); }} 
                className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 ${isScrolled ? 'bg-gray-50 text-[#1d3026] hover:bg-gray-100 border border-gray-200 md:border-none' : 'bg-white/10 text-white backdrop-blur-md hover:bg-white/20 border border-white/20 md:border-white/10'}`}
              >
                <span className="text-lg md:text-xl">🛒</span>
                {carrinho.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#c5a880] text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-transparent">
                    {carrinho.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {abaAtiva === 'VITRINE' ? (
        <>
          <div className="relative bg-[#1d3026] text-white overflow-hidden min-h-[65vh] flex items-center justify-center pt-20">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#c5a880] rounded-full mix-blend-screen filter blur-[180px] opacity-40 animate-pulse duration-1000"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse duration-1000" style={{ animationDelay: '2s' }}></div>
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            <div className="max-w-4xl mx-auto px-4 relative z-10 w-full flex flex-col items-center text-center">
              <span className="px-5 py-2 rounded-full border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-8 backdrop-blur-md bg-emerald-900/40 shadow-lg flex items-center gap-2">
                <span className="text-sm">🤟</span> Loja Acessível em Libras
              </span>

              <h1 className="font-tradicional text-5xl md:text-7xl lg:text-[5.5rem] italic leading-[1.1] font-light drop-shadow-2xl">
                O seu novo olhar <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d0a7] font-bold">
                  começa aqui.
                </span>
              </h1>
              <p className="mt-8 text-gray-300 max-w-lg mx-auto font-light leading-relaxed text-sm md:text-base">
                Descubra a combinação perfeita entre design sofisticado, tecnologia visual e conforto para o seu dia a dia.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#f9f8f6] to-transparent"></div>
          </div>

          <div className="sticky top-[64px] md:top-[80px] z-40 bg-[#f9f8f6]/90 backdrop-blur-xl border-b border-gray-200/60 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar pb-1">
                  {categorias.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setCategoriaAtiva(cat.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        categoriaAtiva === cat.id 
                        ? 'bg-[#1d3026] text-[#c5a880] shadow-md scale-105' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-[#c5a880]/50 hover:text-[#1d3026]'
                      }`}
                    >
                      <span className="text-base">{cat.icone}</span> {cat.label}
                    </button>
                  ))}
                </div>

                <div className="hidden lg:block relative w-64 group">
                  <input 
                    type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#c5a880]/40 focus:border-[#c5a880] text-xs font-bold text-gray-700 transition-all shadow-sm group-hover:shadow-md"
                  />
                  <span className="absolute left-4 top-2.5 text-gray-400 text-sm">🔍</span>
                </div>
              </div>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-20">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-tradicional text-[#1d3026] italic">
                  {categorias.find(c => c.id === categoriaAtiva)?.label}
                </h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black mt-2">
                  Mostrando {produtosLoja.length} resultados
                </p>
              </div>
            </div>

            {produtosLoja.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                <span className="text-7xl opacity-10 mb-6 drop-shadow-sm">🛍️</span>
                <p className="text-gray-400 font-medium text-lg">Ainda não temos produtos nesta categoria.</p>
                <button onClick={() => {setBusca(''); setCategoriaAtiva('TODAS');}} className="mt-6 px-6 py-3 bg-gray-50 text-[#1d3026] hover:bg-gray-100 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                  Ver Todo o Catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {produtosLoja.map((produto) => (
                  <ProdutoCard 
                    key={produto._id || produto.id} 
                    produto={produto} 
                    noCarrinho={carrinho.some(item => item._id === (produto._id || produto.id))}
                    adicionarAoCarrinho={adicionarAoCarrinho}
                    apiUrl={apiUrl}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-32 animate-in fade-in duration-500">
          <div className="flex flex-col items-center mb-12 text-center">
            <h2 className="text-4xl font-tradicional text-[#1d3026] italic">Seus Pedidos</h2>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-black mt-3 mb-6">Histórico de Compras e Entregas</p>
            <button onClick={handleSair} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-6 py-2.5 rounded-full transition-colors border border-red-100">
               Desconectar Minha Conta
            </button>
          </div>

          {meusPedidos.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] shadow-sm border border-gray-100">
              <span className="text-6xl opacity-10 block mb-6">📦</span>
              <p className="text-gray-400 font-medium mb-8">Sua jornada com a Elos ainda não começou.</p>
              <button onClick={() => setAbaAtiva('VITRINE')} className="px-8 py-4 bg-[#1d3026] text-white rounded-xl text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#c5a880] transition-colors shadow-lg active:scale-95">
                Explorar Vitrine
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {meusPedidos.map((pedido) => {
                const infoStatus = getTextoStatus(pedido.status);
                return (
                  <div key={pedido._id} className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row gap-8 justify-between hover:shadow-lg transition-shadow">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-2xl font-black text-[#1d3026] tracking-tight">#{pedido.numeroPedidoOnline}</span>
                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] border ${infoStatus.cor}`}>{infoStatus.texto}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">
                        Realizado em {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')} às {new Date(pedido.dataPedido).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <div className="bg-[#f9f8f6] p-4 rounded-2xl w-full border border-gray-100">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 border-b border-gray-200 pb-2">Itens do Pedido</p>
                        <ul className="space-y-2">
                          {(pedido.itens || []).map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-700 font-bold flex gap-2">
                              <span className="text-[#c5a880]">1x</span> {item.nome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-6 w-full md:w-auto md:border-l border-gray-100 md:pl-8">
                      <div className="md:text-right">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Total</p>
                        <p className="text-3xl font-tradicional italic font-bold text-[#1d3026]">{Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row w-full gap-3">
                        {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
                          <button onClick={() => cancelarPedido(pedido._id)} className="w-full px-6 py-3.5 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all">
                            Cancelar
                          </button>
                        )}
                        <button onClick={() => avisarWhatsApp(pedido)} className="w-full px-6 py-3.5 bg-[#1d3026] text-white hover:bg-[#c5a880] shadow-md hover:shadow-[#c5a880]/30 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                          <span>💬</span> Atendimento em Vídeo ou Texto
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {mostrarCarrinho && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-[#1d3026]/40 backdrop-blur-sm transition-opacity" onClick={() => { if(!processando) setMostrarCarrinho(false) }}></div>

          <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[2rem] overflow-hidden">
            
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#f9f8f6]">
              <div>
                <h2 className="text-2xl font-tradicional italic font-bold text-[#1d3026]">
                  {etapaCheckout === 0 && "Seu Carrinho"}
                  {etapaCheckout === 1 && "Seus Dados"}
                  {etapaCheckout === 2 && "Tudo Certo!"}
                </h2>
                <p className="text-[9px] uppercase tracking-widest text-[#c5a880] font-black mt-1">Ambiente Seguro</p>
              </div>
              {!processando && (
                <button onClick={() => setMostrarCarrinho(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-red-500 text-2xl transition-all shadow-sm">
                  &times;
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white custom-scrollbar">
              
              {etapaCheckout === 0 && (
                <div className="space-y-4">
                  {carrinho.length === 0 ? (
                    <div className="text-center text-gray-400 py-20">
                      <span className="text-6xl opacity-10 block mb-6">🛍️</span>
                      <p className="text-sm font-medium">Sua sacola está vazia.</p>
                    </div>
                  ) : (
                    carrinho.map(item => {
                      const fotoCapa = (item.fotos && item.fotos.length > 0) ? item.fotos[0] : item.foto;
                      return (
                        <div key={item._id} className="flex items-center gap-4 bg-[#f9f8f6] p-4 rounded-2xl border border-transparent hover:border-[#c5a880]/30 transition-all group">
                          <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100 p-2 relative shadow-sm">
                            {fotoCapa ? (
                              <img src={fotoCapa.startsWith('http') ? fotoCapa : `${apiUrl.replace(/\/$/, '')}/produtos/${item._id || item.id}/foto?v=1`} className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }}/>
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-[#1d3026] line-clamp-2">{item.nome}</h4>
                            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 mt-1 mb-2">Ref: {item.referencia || 'N/A'}</p>
                            <p className="text-sm font-tradicional italic font-bold text-[#c5a880]">{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                          <button onClick={() => removerDoCarrinho(item._id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-500 transition-all text-lg shadow-sm bg-white">&times;</button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {etapaCheckout === 1 && (
                <form id="formCheckout" onSubmit={processarPedido} className="space-y-6 animate-in fade-in">
                  <div className="bg-[#1d3026]/5 p-5 rounded-2xl border border-[#1d3026]/10 mb-4 flex items-start gap-4">
                    <span className="text-xl">✨</span>
                    <p className="text-xs text-[#1d3026] font-medium leading-relaxed">Pronto para finalizar! Por favor, confirme os dados de entrega abaixo.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome Completo</label>
                    <input type="text" required value={dadosCliente.nome} onChange={e => setDadosCliente({...dadosCliente, nome: e.target.value})} className="w-full px-5 py-4 bg-[#f9f8f6] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm font-bold text-[#1d3026] transition-all" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">WhatsApp</label>
                    <input type="tel" required value={dadosCliente.telefone} onChange={e => setDadosCliente({...dadosCliente, telefone: handleMascaraTel(e.target.value)})} className="w-full px-5 py-4 bg-[#f9f8f6] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm font-bold text-[#1d3026] transition-all" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Endereço Completo (Entrega)</label>
                    <textarea required rows="3" placeholder="Rua, Número, Bairro, Ponto de Referência..." value={dadosCliente.endereco || ''} onChange={e => setDadosCliente({...dadosCliente, endereco: e.target.value})} className="w-full px-5 py-4 bg-[#f9f8f6] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] text-sm font-bold text-[#1d3026] resize-none transition-all" />
                  </div>
                </form>
              )}

              {etapaCheckout === 2 && pedidoFinalizado && (
                <div className="text-center flex flex-col h-full animate-in zoom-in-95 duration-500 pt-4">
                  <div className="w-24 h-24 bg-[#1d3026] text-[#c5a880] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative"><span className="text-4xl">✨</span></div>
                  <h3 className="font-tradicional text-4xl italic font-bold text-[#1d3026] mb-2">Perfeito!</h3>
                  <p className="text-sm text-gray-500 mb-8 px-4 leading-relaxed">Seu pedido <span className="font-black text-[#1d3026]">#{pedidoFinalizado.numeroPedidoOnline}</span> foi gerado com sucesso e os itens foram reservados.</p>

                  <div className="bg-[#f9f8f6] p-6 rounded-3xl border border-gray-100 shadow-inner mb-8 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Total a pagar</p>
                    <p className="text-4xl font-tradicional italic font-bold text-[#1d3026] mb-2">{Number(pedidoFinalizado.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>

                  <div className="mt-auto space-y-4">
                    <button 
                      onClick={async () => { 
                        setGerandoLink(true);
                        try {
                          const payload = {
                            handle: infinitePayUser, 
                            order_nsu: String(pedidoFinalizado.numeroPedidoOnline),
                            redirect_url: window.location.href, 
                            customer: {
                              name: pedidoFinalizado.clienteNome,
                              phone_number: "+55" + pedidoFinalizado.clienteTelefone.replace(/\D/g, '')
                            },
                            items: pedidoFinalizado.itens.map(item => ({
                              quantity: 1,
                              price: Math.round(Number(item.preco) * 100), 
                              description: item.nome
                            }))
                          };

                          const res = await fetch("https://api.checkout.infinitepay.io/links", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                          });
                          
                          const data = await res.json();
                          if (data.url) {
                            window.open(data.url, "_blank"); 
                          } else {
                            alert("Ops! Falha ao gerar o link de pagamento.");
                          }
                        } catch (e) {
                          alert("Erro ao conectar com a InfinitePay.");
                        } finally {
                          setGerandoLink(false);
                        }
                      }} 
                      disabled={gerandoLink}
                      className="w-full bg-[#1d3026] hover:bg-[#c5a880] text-white font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {gerandoLink ? <span className="animate-spin text-lg">⏳</span> : <><span className="text-xl">💳</span> Pagar na InfinitePay</>}
                    </button>
                    <p className="text-[10px] text-gray-400 px-4">Pagamento via PIX ou Cartão.</p>
                  </div>
                </div>
              )}
            </div>

            {/* RODAPÉ DO CARRINHO */}
            {etapaCheckout < 2 && carrinho.length > 0 && (
              <div className="p-6 md:p-8 border-t border-gray-100 bg-[#f9f8f6]">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Estimado</span>
                  <span className="text-3xl font-tradicional italic font-bold text-[#1d3026]">{valorTotalCarrinho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                
                {etapaCheckout === 0 ? (
                  <button onClick={() => verificarLoginEAvancar('CHECKOUT')} className="w-full bg-[#1d3026] text-[#e6d0a7] hover:bg-[#c5a880] hover:text-white font-bold py-5 rounded-2xl shadow-xl hover:shadow-[#c5a880]/30 transition-all active:scale-[0.98] text-[10px] uppercase tracking-[0.2em]">
                    Finalizar Compra
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setEtapaCheckout(0)} disabled={processando} className="w-1/3 bg-white text-gray-500 border border-gray-200 font-bold py-5 rounded-xl transition-all hover:bg-gray-50 text-[10px] uppercase tracking-widest">Voltar</button>
                    <button type="submit" form="formCheckout" disabled={processando} className="w-2/3 bg-[#1d3026] text-white hover:bg-[#c5a880] font-bold py-5 rounded-xl shadow-xl transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest flex justify-center items-center">
                      {processando ? <span className="animate-spin text-lg">⏳</span> : 'Confirmar Pedido'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER DA LOJA */}
      <footer className="bg-white py-16 mt-auto border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-center md:text-left">
            <h4 className="font-tradicional text-3xl text-[#1d3026] italic font-bold mb-2">Ótica Elos</h4>
            <p className="text-[9px] font-black text-[#c5a880] uppercase tracking-[0.2em] mb-4">E-commerce Oficial</p>
            <p className="text-xs text-gray-500 font-medium">Rua Viriato Ribeiro, 321 - Bela Vista, Fortaleza-CE</p>
            <p className="text-[10px] text-gray-400 mt-2 font-bold tracking-wider">CNPJ: 52.294.947/0001-56</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Links Úteis & Atendimento</p>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <button onClick={() => setMostrarTermos(true)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1d3026] transition-colors underline decoration-gray-200 hover:decoration-[#1d3026] underline-offset-4">
                Termos & Políticas
              </button>
              <a href="https://wa.me/5585985506571" target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 bg-[#1d3026] text-white hover:bg-[#c5a880] rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-[#c5a880]/30 active:scale-95 flex items-center gap-3">
                <span className="text-lg">💬</span> Atendimento Vídeo/Texto
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}