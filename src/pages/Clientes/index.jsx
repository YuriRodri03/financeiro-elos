import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useClientes, useEditarCliente, useExcluirCliente } from '../../hooks/useClientes';
import { useVendas, useAdicionarVenda, useEditarVenda, useExcluirVenda, useDarBaixaParcela, useEstornarBaixaParcela } from '../../hooks/useVendas';

import { gerarPDFDocumento, gerarPDFOrdemServico, gerarPDFCarne } from '../../documentosUtils';
import CadastroClientes from '../CadastroClientes'; 

// --- FUNÇÕES AUXILIARES PARA MOEDA ---
const aplicarMascaraMoeda = (valor) => {
  let v = String(valor).replace(/\D/g, '');
  if (!v) return '';
  v = (Number(v) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  return v;
};

const limparMoeda = (valor) => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  return Number(String(valor).replace(/[^\d]/g, '')) / 100;
};

// --- COMPRESSÃO DE IMAGEM ---
const comprimirImagem = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], "imagem_otimizada.webp", { type: 'image/webp' }));
        }, 'image/webp', 0.8);
      };
    };
  });
};

// --- COMPONENTE DE LINHA DE PARCELA (COM EDIÇÃO DE VALOR E DATA) ---
function LinhaParcela({ p, venda, darBaixaParcela, estornarBaixaParcela, editarParcelaManual, mostrarToast, abrirConfirmacao }) {
  const vendaId = venda._id || venda.id;
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split('T')[0]);
  const [valorRecebido, setValorRecebido] = useState(p?.valor || 0);
  const [modoEdicao, setModoEdicao] = useState(false);

  useEffect(() => {
    setValorRecebido(p?.valor || 0);
  }, [p?.valor]);

  if (!p || !venda) return null;

  const calcularVencimento = () => {
    try {
      let dataVenc;
      if (p.numero === 0) {
        if (!venda.dataVenda) return '';
        dataVenc = new Date(venda.dataVenda + 'T00:00:00');
      } else {
        const dataBase = venda.dataPrimeiraParcela || venda.dataVenda;
        if (!dataBase) return '';
        dataVenc = new Date(dataBase + 'T00:00:00');
        dataVenc.setMonth(dataVenc.getMonth() + (p.numero - 1));
      }
      return dataVenc.toISOString().split('T')[0];
    } catch (error) {
      return ''; 
    }
  };

  const dataVencimentoStr = p.dataVencimento || p.vencimentoOriginal || calcularVencimento();
  const [novoValorParcela, setNovoValorParcela] = useState(p?.valor || 0);
  const [novoVencimentoParcela, setNovoVencimentoParcela] = useState(dataVencimentoStr);

  // Verifica se está atrasada
  const hojeIso = new Date().toISOString().split('T')[0];
  const isAtrasada = !p.paga && !p.renegociada && !venda.renegociada && dataVencimentoStr && dataVencimentoStr < hojeIso;

  const handleBaixa = async () => {
    let stringValor = String(valorRecebido).replace(',', '.');
    let valor = parseFloat(stringValor); 
    
    if (isNaN(valor) || valor <= 0) {
      mostrarToast("Informe um valor válido para o pagamento.", "erro");
      return;
    }
    valor = parseFloat(valor.toFixed(2));
    
    try {
      await darBaixaParcela(vendaId, p.numero, dataBaixa, valor);
      mostrarToast("Baixa registrada com sucesso!", "sucesso");

      const nomeProduto = p.numero === 0 
        ? `Entrada / Sinal (Pedido #${venda.numeroPedido || 'S/N'})` 
        : `Pagamento da ${p.numero}ª Parcela (Pedido #${venda.numeroPedido || 'S/N'})`;

      abrirConfirmacao(`Pagamento de R$ ${valor.toFixed(2).replace('.', ',')} recebido com sucesso! Deseja emitir o Recibo Simples desta parcela agora?`, () => {
        gerarPDFDocumento({
          cliente: venda.cliente, 
          cpf: venda.cpf, 
          telefone: venda.telefone || "Não cadastrado", 
          endereco: venda.endereco || "Não cadastrado", 
          email: venda.email || "Não cadastrado",
          valorTotal: valor, 
          produto: nomeProduto, 
          dataRecibo: dataBaixa.split('-').reverse().join('/'), 
          metodoPagamento: "Dinheiro / Transferência",
          desconto: 0,
          numeroPedido: venda.numeroPedido,
          itensCarrinho: [{ nome: nomeProduto.toUpperCase(), preco: valor }]
        }, 'recibo');
      });
    } catch (err) {
      mostrarToast("Erro ao processar baixa.", "erro");
    }
  };

  const salvarAlteracaoParcela = async () => {
    const valNum = parseFloat(String(novoValorParcela).replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) {
      mostrarToast("Valor inválido para a parcela.", "erro");
      return;
    }
    await editarParcelaManual(venda, p.numero, parseFloat(valNum.toFixed(2)), novoVencimentoParcela);
    setModoEdicao(false);
  };
  
  return (
    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center py-4 border-b border-gray-100 gap-4 ${p.renegociada ? 'opacity-50' : ''}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-elos-texto">
            {p.numero === 0 ? "Entrada" : `${p.numero}ª Parcela`} — 
            <span className={`ml-1 font-black ${p.renegociada ? 'line-through text-gray-400' : 'text-elos-verde'}`}>
              R$ {(p.valor || 0).toFixed(2).replace('.', ',')}
            </span>
          </span>
          {isAtrasada && (
            <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
              ⚠️ Atrasada
            </span>
          )}
        </div>
        
        {dataVencimentoStr && (
          <small className={`font-bold text-[10px] uppercase tracking-tighter ${isAtrasada ? 'text-red-500' : 'text-gray-500'}`}>
            ⏳ Vencimento: {dataVencimentoStr.split('-').reverse().join('/')}
          </small>
        )}

        {p.observacao && (
          <small className="text-gray-400 italic text-[10px]">{p.observacao}</small>
        )}

        {p.paga && (
          <small className="text-elos-verde font-bold text-[10px] uppercase tracking-tighter">
            🗓️ Recebido em: {p.dataPagamento?.split('-').reverse().join('/')}
          </small>
        )}
      </div>

      {/* STATUS OU AÇÕES DA PARCELA */}
      {p.paga ? (
        <div className="flex items-center gap-3">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">✅ Paga</span>
          {!venda.renegociada && (
            <button 
              onClick={async () => {
                try {
                  await estornarBaixaParcela(vendaId, p.numero);
                  mostrarToast("Estorno realizado com sucesso!", "sucesso");
                } catch (e) {
                  mostrarToast("Falha ao estornar parcela.", "erro");
                }
              }} 
              className="text-[10px] text-gray-400 underline hover:text-red-500 transition-colors font-bold"
            >
              (Estornar)
            </button>
          )}
        </div>
      ) : (p.renegociada || venda.renegociada) ? (
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
          🔄 Renegociada
        </span>
      ) : modoEdicao ? (
        <div className="flex flex-wrap gap-2 items-end bg-amber-50/70 p-3 rounded-xl border border-amber-200 w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-amber-800 uppercase">Novo Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              className="w-24 p-2 bg-white rounded-lg text-xs border border-amber-200 font-bold"
              value={novoValorParcela} 
              onChange={(e) => setNovoValorParcela(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-amber-800 uppercase">Novo Vencimento</label>
            <input 
              type="date" 
              className="p-2 bg-white rounded-lg text-xs border border-amber-200 font-bold"
              value={novoVencimentoParcela} 
              onChange={(e) => setNovoVencimentoParcela(e.target.value)}
            />
          </div>
          <button 
            onClick={salvarAlteracaoParcela}
            className="bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-amber-700 transition-all"
          >
            Salvar
          </button>
          <button 
            onClick={() => setModoEdicao(false)}
            className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-300 transition-all"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-end w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase">Valor Pago</label>
            <input 
              type="number" 
              step="0.01"
              className="w-24 p-2 bg-elos-fundo rounded-lg text-xs border-none focus:ring-1 focus:ring-elos-bege"
              value={valorRecebido} 
              onChange={(e) => setValorRecebido(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase">Data Pag.</label>
            <input 
              type="date" 
              className="p-2 bg-elos-fundo rounded-lg text-xs border-none focus:ring-1 focus:ring-elos-bege"
              value={dataBaixa} 
              onChange={(e) => setDataBaixa(e.target.value)}
            />
          </div>
          <button 
            className="bg-elos-verde text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-elos-verde/90 transition-all active:scale-95 shadow-md shadow-elos-verde/10"
            onClick={handleBaixa}
          >
            Confirmar
          </button>
          <button 
            type="button"
            onClick={() => {
              setNovoValorParcela(p.valor);
              setNovoVencimentoParcela(dataVencimentoStr);
              setModoEdicao(true);
            }}
            className="p-2 bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-700 rounded-lg text-xs transition-colors"
            title="Editar Valor ou Data de Vencimento desta parcela"
          >
            ✏️
          </button>
        </div>
      )}
    </div>
  );
}

export default function Clientes() {
  const navigate = useNavigate();
  const imgBBKey = import.meta.env.VITE_IMGBB_API_KEY || '';
  const baseUrl = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api';
  
  const { data: clientes = [], isLoading: carregandoClientes } = useClientes();
  const { data: vendas = [], isLoading: carregandoVendas } = useVendas();
  
  const editarClienteMutation = useEditarCliente();
  const excluirClienteMutation = useExcluirCliente();
  const adicionarVendaMutation = useAdicionarVenda();
  const editarVendaMutation = useEditarVenda();
  const excluirVendaMutation = useExcluirVenda();
  const darBaixaParcelaMutation = useDarBaixaParcela();
  const estornarBaixaParcelaMutation = useEstornarBaixaParcela();

  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [clienteSelecionadoCPF, setClienteSelecionadoCPF] = useState(null);
  const [editandoCadastro, setEditandoCadastro] = useState(null);
  const [editandoVenda, setEditandoVenda] = useState(null);
  const [modalRecibo, setModalRecibo] = useState(null);

  // 🟢 CHAVE PIX PERSISTENTE (Salva uma única vez no navegador e no servidor)
  const [chavePixPadrao, setChavePixPadrao] = useState(() => {
    return localStorage.getItem('chavePixElos') || '(85) 8550-6571';
  });
  const [modalConfigPix, setModalConfigPix] = useState(false);
  const [inputNovaChavePix, setInputNovaChavePix] = useState('');
  const [vendaAguardandoCarne, setVendaAguardandoCarne] = useState(null);

  // 🟢 ESTADO DO MODAL DE RENEGOCIAÇÃO DE DÍVIDA
  const [modalRenegociacao, setModalRenegociacao] = useState(null);
  const [processandoRenegociacao, setProcessandoRenegociacao] = useState(false);

  const [novaFotoCliente, setNovaFotoCliente] = useState('');
  const [novaFotoVenda, setNovaFotoVenda] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mostrarFormCadastro, setMostrarFormCadastro] = useState(false);

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [confirmModal, setConfirmModal] = useState({ visivel: false, message: '', acao: null });

  // Busca chave PIX salva no servidor (caso o usuário troque de computador/celular)
  useEffect(() => {
    fetch(`${baseUrl}/whatsapp/mensagens`)
      .then(r => r.json())
      .then(data => {
        if (data && data.chave_pix_carne) {
          setChavePixPadrao(data.chave_pix_carne);
          localStorage.setItem('chavePixElos', data.chave_pix_carne);
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  const salvarChavePixGlobal = async () => {
    const chaveLimpa = inputNovaChavePix.trim();
    if (!chaveLimpa) {
      mostrarToast("Informe uma chave PIX válida!", "erro");
      return;
    }

    localStorage.setItem('chavePixElos', chaveLimpa);
    setChavePixPadrao(chaveLimpa);
    setModalConfigPix(false);
    mostrarToast("Chave PIX salva como padrão! ✅", "sucesso");

    // Se o usuário clicou em "Gerar Carnê" e não tinha chave ainda, gera agora automaticamente
    if (vendaAguardandoCarne && clienteNoModal) {
      gerarPDFCarne({ ...vendaAguardandoCarne, cliente: clienteNoModal.nome, cpf: clienteNoModal.cpf }, chaveLimpa);
      setVendaAguardandoCarne(null);
    }
  };

  const handleEmitirCarneDireto = (venda) => {
    const chaveAtual = localStorage.getItem('chavePixElos') || chavePixPadrao;
    if (!chaveAtual) {
      setInputNovaChavePix('');
      setVendaAguardandoCarne(venda);
      setModalConfigPix(true);
    } else {
      gerarPDFCarne({ ...venda, cliente: clienteNoModal.nome, cpf: clienteNoModal.cpf }, chaveAtual);
    }
  };

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  const abrirConfirmacao = (mensagem, acao) => {
    setConfirmModal({ visivel: true, message: mensagem, acao });
  };

  const fecharModal = () => {
    setClienteSelecionadoCPF(null);
    setEditandoCadastro(null);
    setEditandoVenda(null);
    setModalRecibo(null);
    setModalRenegociacao(null);
    setNovaFotoCliente(''); 
    setNovaFotoVenda('');   
  };

  const handleUploadImgBB = async (e, setFotoState) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!imgBBKey) {
      mostrarToast("Chave VITE_IMGBB_API_KEY não encontrada!", "erro");
      return;
    }

    setUploadingImage(true);
    mostrarToast("Comprimindo e enviando arquivo... ⏳", "sucesso");

    try {
      const fotoSuperLeve = await comprimirImagem(file);
      const formData = new FormData();
      formData.append("image", fotoSuperLeve);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgBBKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFotoState(data.data.url);
        mostrarToast("Upload concluído com sucesso! ✅", "sucesso");
      } else {
        mostrarToast("Falha no upload do ImgBB.", "erro");
      }
    } catch (error) {
      mostrarToast("Erro ao processar imagem.", "erro");
    }

    setUploadingImage(false);
  };

  const salvarEdicaoCadastro = async () => {
    const clienteParaEditar = listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF);
    const idMongo = clienteParaEditar?._id;
    if (!idMongo) return mostrarToast("Erro: ID do cliente não mapeado.", "erro");

    const dadosAtualizados = {
      ...editandoCadastro,
      foto: novaFotoCliente || editandoCadastro.foto
    };

    try {
      await editarClienteMutation.mutateAsync({ id: idMongo, dadosNovos: dadosAtualizados });
      setClienteSelecionadoCPF(editandoCadastro.cpf);
      setEditandoCadastro(null);
      setNovaFotoCliente('');
      mostrarToast("Cadastro atualizado com sucesso!", "sucesso");
    } catch (err) { mostrarToast("Erro ao editar dados no servidor.", "erro"); }
  };

  const salvarEdicaoVenda = async () => {
    if (!editandoVenda.vendaId || !editandoVenda.dataVenda) return;

    const dadosAtualizados = {
      ...editandoVenda,
      foto: novaFotoVenda || editandoVenda.foto
    };

    try {
      await editarVendaMutation.mutateAsync({ vendaId: editandoVenda.vendaId, dadosNovos: dadosAtualizados });
      setEditandoVenda(null);
      setNovaFotoVenda('');
      mostrarToast("Pedido atualizado com sucesso!", "sucesso");
    } catch (err) { mostrarToast("Erro ao sincronizar modificações do pedido.", "erro"); }
  };

  // 🟢 FUNÇÃO PARA EDITAR VALOR E DATA DE UMA PARCELA INDIVIDUALMENTE
  const handleEditarParcelaManual = async (vendaAlvo, numeroParcela, novoValor, novoVencimento) => {
    const vendaId = vendaAlvo._id || vendaAlvo.id;
    const novasParcelas = (vendaAlvo.listaParcelas || []).map(p => {
      if (String(p.numero) === String(numeroParcela)) {
        return {
          ...p,
          valor: novoValor,
          dataVencimento: novoVencimento,
          vencimentoOriginal: novoVencimento
        };
      }
      return p;
    });

    const novoTotalVenda = novasParcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);

    try {
      await editarVendaMutation.mutateAsync({
        vendaId,
        dadosNovos: {
          ...vendaAlvo,
          valorTotal: parseFloat(novoTotalVenda.toFixed(2)),
          listaParcelas: novasParcelas
        }
      });
      mostrarToast("Parcela atualizada com sucesso! ✅", "sucesso");
    } catch (err) {
      mostrarToast("Erro ao atualizar parcela.", "erro");
    }
  };

  // 🟢 FUNÇÕES DE RENEGOCIAÇÃO DE DÍVIDA
  const gerarParcelasPreviasRenegociacao = (valorTotal, valorEntrada, dataEntrada, qtdParcelas, dataPrimeira) => {
    const hojeIso = new Date().toISOString().split('T')[0];
    const lista = [];
    const restante = Math.max(0, valorTotal - valorEntrada);
    const numParc = Math.max(1, Number(qtdParcelas) || 1);

    if (valorEntrada > 0) {
      const pagaHoje = dataEntrada <= hojeIso;
      lista.push({
        numero: 0,
        valor: parseFloat(valorEntrada.toFixed(2)),
        dataVencimento: dataEntrada,
        vencimentoOriginal: dataEntrada,
        paga: pagaHoje,
        dataPagamento: pagaHoje ? dataEntrada : null,
        observacao: 'Entrada de Renegociação'
      });
    }

    if (restante > 0) {
      const valorBase = Math.floor((restante / numParc) * 100) / 100;
      const diferencaCentavos = parseFloat((restante - (valorBase * numParc)).toFixed(2));
      const dtBase = new Date((dataPrimeira || hojeIso) + 'T12:00:00');

      for (let i = 1; i <= numParc; i++) {
        const dtVenc = new Date(dtBase);
        dtVenc.setMonth(dtVenc.getMonth() + (i - 1));
        const vencStr = dtVenc.toISOString().split('T')[0];
        const valParcela = i === numParc ? parseFloat((valorBase + diferencaCentavos).toFixed(2)) : valorBase;

        lista.push({
          numero: i,
          valor: valParcela,
          dataVencimento: vencStr,
          vencimentoOriginal: vencStr,
          paga: false,
          dataPagamento: null,
          observacao: `Renegociação ${i}/${numParc}`
        });
      }
    }

    return lista;
  };

  const abrirModalRenegociar = (vendaOriginal) => {
    const parcelasPendentes = (vendaOriginal.listaParcelas || []).filter(p => !p.paga && !p.renegociada);
    const saldoAberto = parcelasPendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0);

    const hojeIso = new Date().toISOString().split('T')[0];
    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    const proximoMesIso = proximoMes.toISOString().split('T')[0];

    const parcelasIniciais = gerarParcelasPreviasRenegociacao(saldoAberto, 0, hojeIso, 3, proximoMesIso);

    setModalRenegociacao({
      vendaOriginal,
      saldoOriginal: saldoAberto,
      novoValorTotalFmt: aplicarMascaraMoeda(String(Math.round(saldoAberto * 100))),
      valorEntradaFmt: '',
      dataEntrada: hojeIso,
      parcelas: 3,
      dataPrimeiraParcela: proximoMesIso,
      metodoPagamento: 'Boleto / Crediário',
      observacoes: `Acordo referente ao Pedido #${vendaOriginal.numeroPedido || 'S/N'} (Saldo anterior: R$ ${saldoAberto.toFixed(2).replace('.', ',')})`,
      parcelasPrevias: parcelasIniciais
    });
  };

  const atualizarParametrosRenegociacao = (novosCampos) => {
    setModalRenegociacao(prev => {
      const atualizado = { ...prev, ...novosCampos };
      const vTotal = limparMoeda(atualizado.novoValorTotalFmt);
      const vEntrada = limparMoeda(atualizado.valorEntradaFmt);
      const novasPrevias = gerarParcelasPreviasRenegociacao(
        vTotal,
        vEntrada,
        atualizado.dataEntrada,
        atualizado.parcelas,
        atualizado.dataPrimeiraParcela
      );
      return { ...atualizado, parcelasPrevias: novasPrevias };
    });
  };

  const editarLinhaPreviaRenegociacao = (idx, campo, valor) => {
    setModalRenegociacao(prev => {
      const copia = [...prev.parcelasPrevias];
      if (campo === 'valor') {
        copia[idx] = { ...copia[idx], valor: parseFloat(valor) || 0 };
      } else if (campo === 'dataVencimento') {
        copia[idx] = { ...copia[idx], dataVencimento: valor, vencimentoOriginal: valor };
      }
      const somaTotal = copia.reduce((acc, item) => acc + Number(item.valor || 0), 0);
      return {
        ...prev,
        parcelasPrevias: copia,
        novoValorTotalFmt: aplicarMascaraMoeda(String(Math.round(somaTotal * 100)))
      };
    });
  };

  const confirmarRenegociacao = async () => {
    if (!modalRenegociacao) return;
    const { vendaOriginal, parcelasPrevias, metodoPagamento, observacoes, dataPrimeiraParcela, valorEntradaFmt } = modalRenegociacao;

    if (!parcelasPrevias || parcelasPrevias.length === 0) {
      mostrarToast("Gere ao menos uma parcela para a renegociação.", "erro");
      return;
    }

    setProcessandoRenegociacao(true);
    const hojeIso = new Date().toISOString().split('T')[0];
    const vendaOriginalId = vendaOriginal._id || vendaOriginal.id;
    const numPedAntigo = vendaOriginal.numeroPedido || 'S/N';

    // 1. Congela as parcelas antigas não pagas marcando como renegociadas
    const parcelasAntigasCongeladas = (vendaOriginal.listaParcelas || []).map(p => {
      if (!p.paga) {
        return {
          ...p,
          renegociada: true,
          observacao: `${p.observacao ? p.observacao + ' | ' : ''}Renegociada em ${hojeIso.split('-').reverse().join('/')}`
        };
      }
      return p;
    });

    const totalNovoAcordo = parseFloat(parcelasPrevias.reduce((acc, p) => acc + Number(p.valor || 0), 0).toFixed(2));
    const entradaNum = limparMoeda(valorEntradaFmt);

    try {
      // Atualiza contrato antigo para "Dívida Renegociada"
      await editarVendaMutation.mutateAsync({
        vendaId: vendaOriginalId,
        dadosNovos: {
          ...vendaOriginal,
          renegociada: true,
          renegociadaEm: hojeIso,
          listaParcelas: parcelasAntigasCongeladas,
          observacoes: `${vendaOriginal.observacoes ? vendaOriginal.observacoes + '\n' : ''}🔄 DÍVIDA RENEGOCIADA EM ${hojeIso.split('-').reverse().join('/')}.`
        }
      });

      // 2. Cria a Nova Conta (Renegociação) ativa para dar baixa
      const nomeAcordo = `🔄 RENEGOCIAÇÃO (REF. PEDIDO #${numPedAntigo})`;
      const novaVendaRenegociada = {
        cliente: clienteNoModal.nome,
        cpf: clienteNoModal.cpf,
        produto: nomeAcordo,
        itensCarrinho: [{ nome: nomeAcordo, preco: totalNovoAcordo }],
        valorTotal: totalNovoAcordo,
        valorEntrada: entradaNum,
        desconto: 0,
        parcelas: parcelasPrevias.filter(p => p.numero > 0).length || 1,
        listaParcelas: parcelasPrevias,
        dataVenda: hojeIso,
        dataPrimeiraParcela: dataPrimeiraParcela,
        metodoPagamento: metodoPagamento,
        observacoes: observacoes
      };

      await adicionarVendaMutation.mutateAsync(novaVendaRenegociada);

      setModalRenegociacao(null);
      mostrarToast("Dívida renegociada! Novo acordo ativo criado com sucesso.", "sucesso");
    } catch (error) {
      mostrarToast("Erro ao processar a renegociação.", "erro");
    } finally {
      setProcessandoRenegociacao(false);
    }
  };

  const handleExcluirFotoCliente = () => {
    abrirConfirmacao("Deseja remover permanentemente a foto de perfil deste cliente?", async () => {
      const idMongo = clienteNoModal?._id;
      try {
        await editarClienteMutation.mutateAsync({ id: idMongo, dadosNovos: { ...clienteNoModal, foto: '' } });
        mostrarToast("Foto de perfil removida.", "sucesso");
      } catch (err) { mostrarToast("Erro ao remover arquivo.", "erro"); }
    });
  };

  const handleExcluirFotoVenda = (vendaId, vendaAtual) => {
    abrirConfirmacao("Deseja remover permanentemente a receita digitalizada deste pedido?", async () => {
      try {
        await editarVendaMutation.mutateAsync({ vendaId, dadosNovos: { ...vendaAtual, foto: '' } });
        mostrarToast("Receita óptica removida do histórico.", "sucesso");
      } catch (err) { mostrarToast("Erro ao limpar arquivo.", "erro"); }
    });
  };

  const handleExcluirOS = (idOS) => {
    abrirConfirmacao("Deseja excluir esta Ordem de Serviço permanentemente?", async () => {
      try {
        const response = await fetch(`${baseUrl}/ordens_servico/${idOS}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          mostrarToast("Ordem de Serviço excluída com sucesso!", "sucesso");
          setTimeout(() => window.location.reload(), 1500); 
        } else {
          mostrarToast("Erro ao excluir OS no servidor.", "erro");
        }
      } catch (error) {
        mostrarToast("Erro de conexão ao tentar excluir a OS.", "erro");
      }
    });
  };

  const listaFinalClientes = useMemo(() => {
    const todosCPFs = Array.from(new Set([
      ...(vendas || []).map(v => v.cpf),
      ...(clientes || []).map(c => c.cpf)
    ]));

    return todosCPFs.map(cpf => {
      const dadosCad = (clientes || []).find(c => c.cpf === cpf);
      const vendasCli = (vendas || [])
        .filter(v => v.cpf === cpf)
        .sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda))
        .map(venda => {
          const osVenda = venda.ordensServico || [];
          const foiRenegociada = venda.renegociada === true || (venda.observacoes && venda.observacoes.includes('DÍVIDA RENEGOCIADA'));
          return {
            ...venda,
            renegociada: foiRenegociada,
            ordensServico: osVenda.map(os => ({
              ...os,
              idOS: os.idOS || os._id 
            }))
          };
        });

      // 🟢 SALDO DEVEDOR IGNORA VENDAS/PARCELAS QUE JÁ FORAM RENEGOCIADAS
      const totalDevido = vendasCli.reduce((acc, v) => {
        if (v.renegociada) return acc;
        const somaAberta = (v.listaParcelas || [])
          .filter(p => !p.paga && !p.renegociada)
          .reduce((soma, p) => soma + (p.valor || 0), 0);
        return acc + somaAberta;
      }, 0);

      return {
        ...dadosCad,
        _id: dadosCad?._id || dadosCad?.id,
        nome: dadosCad?.nome || vendasCli[0]?.cliente || "Sem Nome",
        cpf: cpf,
        telefone: dadosCad?.telefone || "Não cadastrado",
        email: dadosCad?.email || "Não cadastrado",
        origem: dadosCad?.origem || "Não informada", 
        endereco: dadosCad?.endereco || "Não informado",
        dataNascimento: dadosCad?.dataNascimento || "",
        observacoes: dadosCad?.observacoes || "",
        foto: dadosCad?.foto || "",
        historicoVendas: vendasCli,
        totalGeralDevido: totalDevido
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [vendas, clientes]);

  const clienteNoModal = useMemo(() => {
    if (!clienteSelecionadoCPF) return null;
    return listaFinalClientes.find(c => c.cpf === clienteSelecionadoCPF) || null;
  }, [clienteSelecionadoCPF, listaFinalClientes]);

  const clientesExibidos = listaFinalClientes.filter(c => {
    const passaFiltroStatus = filtro === 'pendentes' ? (c.totalGeralDevido || 0) > 0.01 : true;
    const termo = busca.toLowerCase();
    return passaFiltroStatus && (c.nome.toLowerCase().includes(termo) || c.cpf.includes(termo));
  });

  return (
    <div className="min-h-screen bg-elos-fundo p-4 md:p-10 font-sans text-elos-texto relative">
      
      {/* TOAST PREMIUM */}
      {toast.visivel && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
            toast.tipo === 'sucesso' ? 'bg-elos-verde text-white' : 'bg-red-900 text-red-100'
          }`}>
            <span className="text-lg">{toast.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.mensagem}</p>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.visivel && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="text-4xl text-elos-verde">👓</div>
            <h3 className="font-tradicional text-xl italic text-elos-verde">Confirmar Ação</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ visivel: false, message: '', acao: null })} className="flex-1 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase">Não</button>
              <button onClick={() => { if (confirmModal.acao) confirmModal.acao(); setConfirmModal({ visivel: false, message: '', acao: null }); }} className="flex-1 py-3 bg-elos-verde text-white font-bold rounded-xl text-xs uppercase shadow-lg">Sim, Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="font-tradicional text-4xl text-elos-verde italic">Carteira de Clientes</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-black italic">Base de dados unificada (A-Z)</p>
        </div>

        <div className="flex flex-wrap md:flex-row gap-3 w-full md:w-auto items-center">
          {/* 🟢 BOTÃO PARA CONFIGURAR A CHAVE PIX UMA ÚNICA VEZ */}
          <button 
            type="button" 
            onClick={() => {
              setInputNovaChavePix(chavePixPadrao);
              setVendaAguardandoCarne(null);
              setModalConfigPix(true);
            }} 
            className="px-4 py-3 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2"
            title={`Chave atual: ${chavePixPadrao}`}
          >
            🔑 Chave PIX Carnê
          </button>

          <button type="button" onClick={() => setMostrarFormCadastro(!mostrarFormCadastro)} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all ${mostrarFormCadastro ? 'bg-elos-bege text-white' : 'bg-elos-verde text-white'}`}>
            {mostrarFormCadastro ? '📁 Ocultar Cadastro' : '➕ Cadastrar Cliente'}
          </button>
          
          <input type="text" className="px-6 py-3 bg-white rounded-2xl shadow-soft border border-elos-bege/20 focus:outline-none text-sm w-full md:w-72" placeholder="🔍 Buscar por nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          
          <div className="flex bg-white p-1 rounded-2xl border border-elos-bege/10">
            <button onClick={() => setFiltro('todos')} className={`px-4 py-2 rounded-xl text-xs font-bold ${filtro === 'todos' ? 'bg-elos-verde text-white' : 'text-gray-400'}`}>TODOS</button>
            <button onClick={() => setFiltro('pendentes')} className={`px-4 py-2 rounded-xl text-xs font-bold ${filtro === 'pendentes' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>⚠️ PENDENTES</button>
          </div>
        </div>
      </header>

      {mostrarFormCadastro && (
        <div className="mb-10">
          <CadastroClientes />
        </div>
      )}

      {/* TABELA DE CLIENTES */}
      <div className="bg-white rounded-3xl shadow-soft overflow-hidden border border-elos-bege/10">
        <div className="w-full overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-elos-fundo/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Cliente (Ordem A-Z)</th>
                <th className="px-8 py-5 text-center">Saldo Devedor</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientesExibidos.map((cliente) => (
                <tr key={cliente.cpf} className="hover:bg-elos-fundo/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-elos-verde cursor-pointer" onClick={() => setClienteSelecionadoCPF(cliente.cpf)}>{cliente.nome}</div>
                    <div className="text-[10px] text-gray-400">{cliente.cpf}</div>
                  </td>
                  <td className={`px-8 py-5 text-center font-black ${cliente.totalGeralDevido > 0 ? 'text-red-600' : 'text-elos-verde'}`}>
                    R$ {cliente.totalGeralDevido.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate('/admin/nova-venda', { state: { clienteNome: cliente.nome, clienteCpf: cliente.cpf }});
                        }} 
                        className="px-4 py-2 bg-[#e6d0a7]/30 text-[#c5a880] rounded-xl font-bold text-xs hover:bg-[#c5a880] hover:text-white transition-colors flex items-center gap-1"
                      >
                        🛒 Nova Venda
                      </button>
                      
                      <button onClick={() => setClienteSelecionadoCPF(cliente.cpf)} className="px-4 py-2 bg-elos-fundo text-elos-verde rounded-xl font-bold text-xs hover:bg-elos-verde hover:text-white transition-colors">Ver Ficha</button>
                      <button onClick={(e) => { e.stopPropagation(); abrirConfirmacao(`Deseja remover permanentemente o cadastro de ${cliente.nome}?`, () => excluirClienteMutation.mutate(cliente.cpf)); }} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DA FICHA DO CLIENTE */}
      {clienteNoModal && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={fecharModal}>
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
            <button onClick={fecharModal} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-elos-fundo rounded-full text-2xl text-gray-400 hover:text-red-500 z-10">&times;</button>
            
            <header className="p-10 bg-elos-fundo/50 border-b border-elos-bege/20 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="font-tradicional text-3xl text-elos-verde italic leading-tight">{clienteNoModal.nome}</h2>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border px-2 py-0.5 rounded-md">CPF: {clienteNoModal.cpf}</span>
                </div>
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl border border-elos-bege/20 text-right mr-8">
                <span className="text-[9px] font-black uppercase text-gray-400 block">Saldo Devedor Ativo</span>
                <span className={`text-xl font-black ${clienteNoModal.totalGeralDevido > 0 ? 'text-red-600' : 'text-elos-verde'}`}>
                  R$ {clienteNoModal.totalGeralDevido.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </header>
            
            <div className="p-10 overflow-y-auto flex-1 bg-white space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-elos-fundo/30 p-6 rounded-3xl border border-elos-bege/20 h-fit">
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Contato</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.telefone || "Não cadastrado"}</p></div>
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">E-mail</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.email || "Não cadastrado"}</p></div>
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Data de Nascimento</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.dataNascimento ? clienteNoModal.dataNascimento.split('-').reverse().join('/') : "Não informada"}</p></div>
                  <div><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Endereço</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.endereco || "Não cadastrado"}</p></div>
                  
                  <div className="md:col-span-2 border-t border-elos-bege/10 pt-4"><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Origem do Cliente</h4><p className="text-sm font-bold text-elos-texto">{clienteNoModal.origem || "Não informada"}</p></div>

                  <div className="md:col-span-2 border-t border-elos-bege/10 pt-4"><h4 className="text-[10px] font-black text-elos-bege uppercase mb-1">Observações</h4><p className="text-sm italic text-elos-texto whitespace-pre-wrap">{clienteNoModal.observacoes || "Nenhuma observação."}</p></div>
                </div>

                <div className="bg-elos-fundo/30 p-4 rounded-3xl border border-elos-bege/20 flex flex-col items-center justify-center min-h-[200px]">
                  {clienteNoModal.foto ? (
                    <>
                      <img src={clienteNoModal.foto} alt="Foto" className="w-full h-auto rounded-2xl shadow-lg cursor-zoom-in" onClick={() => window.open(clienteNoModal.foto, '_blank')} />
                      <button onClick={handleExcluirFotoCliente} className="mt-3 text-[10px] font-black text-red-400 uppercase tracking-widest">🗑️ Excluir Foto</button>
                    </>
                  ) : (
                    <div className="text-center text-gray-300 italic py-10">
                      <div className="text-3xl mb-2 opacity-20">📸</div>
                      <p className="text-[10px] uppercase font-bold tracking-widest">Sem Foto</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => setEditandoCadastro({...clienteNoModal})} className="flex-1 py-4 bg-white border-2 border-elos-bege/30 text-elos-verde font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-elos-bege hover:text-white transition-all">✏️ Editar Cadastro</button>
                <button onClick={() => setModalRecibo({ valorFmt: aplicarMascaraMoeda(String(Math.round(clienteNoModal.totalGeralDevido * 100))), produto: "Pagamento de saldo devedor", data: new Date().toISOString().split('T')[0], metodo: "Dinheiro" })} className="flex-1 py-4 bg-elos-verde text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg">📄 Gerar Recibo</button>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-tradicional text-2xl text-elos-verde italic border-b border-gray-100 pb-2">Histórico de Pedidos & Acordos</h3>
                {clienteNoModal.historicoVendas.map((venda, index) => {
                  const numPed = venda.numeroPedido || "S/N";
                  const produtosLista = venda.itensCarrinho && venda.itensCarrinho.length > 0 
                    ? venda.itensCarrinho.map(item => item.nome)
                    : String(venda.produto || '').split('+').map(p => p.trim());

                  const saldoAbertoDestaVenda = venda.renegociada 
                    ? 0 
                    : (venda.listaParcelas || []).filter(p => !p.paga && !p.renegociada).reduce((acc, p) => acc + Number(p.valor || 0), 0);

                  const isAcordoRenegociacao = String(venda.produto || '').includes('RENEGOCIAÇÃO');

                  return (
                    <div 
                      key={venda._id || index} 
                      className={`p-6 md:p-8 rounded-[32px] border relative shadow-sm mb-6 transition-all ${
                        venda.renegociada 
                          ? 'bg-gray-50/80 border-amber-200/80 opacity-75' 
                          : isAcordoRenegociacao 
                            ? 'bg-amber-50/20 border-amber-300 ring-1 ring-amber-200/50' 
                            : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`${isAcordoRenegociacao ? 'bg-amber-600' : 'bg-elos-verde'} text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase`}>
                              {isAcordoRenegociacao ? `ACORDO #${numPed}` : `PEDIDO #${numPed}`}
                            </span>

                            {/* 🟢 SELO DE DÍVIDA RENEGOCIADA */}
                            {venda.renegociada && (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                🔄 Dívida Renegociada {venda.renegociadaEm ? `em ${venda.renegociadaEm.split('-').reverse().join('/')}` : ''}
                              </span>
                            )}
                            
                            {!venda.renegociada && (
                              <small className="text-gray-400 font-bold uppercase text-[9px] tracking-widest cursor-pointer hover:text-elos-verde" onClick={() => navigate(`/admin/vendas/editar/${venda._id || venda.id}`, { state: { abaAtiva: 'historico' } })}>
                                {venda.dataVenda?.split('-').reverse().join('/')} ✏️ EDITAR
                              </small>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {produtosLista.map((prodNome, pIdx) => (
                              <div key={pIdx} className="flex items-center bg-elos-fundo border border-elos-bege/30 px-3.5 py-1.5 rounded-xl">
                                <span className="text-xs font-black text-elos-texto tracking-wide uppercase">
                                  {isAcordoRenegociacao ? '🤝' : '👓'} {prodNome}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-4 mt-2 items-center">
                            <span className="text-elos-verde font-black text-sm uppercase">
                              Valor do Contrato: R$ {Number(venda.valorTotal).toFixed(2).replace('.', ',')}
                            </span>
                            {!venda.renegociada && saldoAbertoDestaVenda > 0 && (
                              <span className="text-red-600 font-black text-xs uppercase bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                                Em Aberto: R$ {saldoAbertoDestaVenda.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                          
                          {venda.foto && (
                            <div className="mt-4 p-2 bg-elos-fundo rounded-2xl border w-fit relative group">
                              <p className="text-[8px] font-black uppercase text-elos-bege mb-1">Receita Anexada:</p>
                              <img src={venda.foto} alt="Receita" className="h-20 w-auto rounded-lg shadow-sm cursor-pointer" onClick={() => window.open(venda.foto, '_blank')} />
                              <button onClick={() => handleExcluirFotoVenda(venda._id || venda.id, venda)} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm">✕</button>
                            </div>
                          )}

                          {venda.observacoes && (
                            <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 p-3 rounded-xl border-l-4 border-elos-bege whitespace-pre-wrap">
                              {venda.observacoes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                          {/* 🟢 BOTÃO DE RENEGOCIAR DÍVIDA */}
                          {!venda.renegociada && saldoAbertoDestaVenda > 0.01 && (
                            <button 
                              onClick={() => abrirModalRenegociar(venda)}
                              className="flex-1 md:flex-none bg-amber-500 text-white hover:bg-amber-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                            >
                              🔄 Renegociar
                            </button>
                          )}

                          {!venda.renegociada && (
                            <button 
                              onClick={() => navigate(`/admin/nova-os/${numPed}`)} 
                              className="flex-1 md:flex-none bg-blue-50 text-blue-600 border-2 border-blue-100 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                              ➕ Nova OS
                            </button>
                          )}

                          <button 
                            onClick={() => {
                              const valorTotalNum = Number(venda.valorTotal || 0);
                              const descontoNum = Number(venda.desconto || 0);
                              const subtotalBruto = valorTotalNum + descontoNum;

                              let itensRecalculados = [];
                              if (venda.itensCarrinho && venda.itensCarrinho.length > 0) {
                                const fatorProporcional = subtotalBruto / (venda.itensCarrinho.reduce((acc, i) => acc + Number(i.preco || 0), 0) || 1);
                                itensRecalculados = venda.itensCarrinho.map(item => ({
                                  ...item,
                                  preco: Number((Number(item.preco || 0) * fatorProporcional).toFixed(2)) 
                                }));
                              } else {
                                itensRecalculados = [{ nome: venda.produto || "PRODUTO ÓPTICO", preco: subtotalBruto }];
                              }

                              gerarPDFDocumento({
                                ...venda,
                                numeroPedido: numPed, 
                                cliente: clienteNoModal.nome, 
                                email: clienteNoModal.email, 
                                endereco: clienteNoModal.endereco, 
                                telefone: clienteNoModal.telefone,
                                valorProduto: subtotalBruto,
                                desconto: descontoNum,
                                valorTotal: valorTotalNum,
                                itensCarrinho: itensRecalculados, 
                                data: venda.dataVenda ? venda.dataVenda.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR'),
                              }, 'pedido');
                            }} 
                            className="flex-1 md:flex-none bg-elos-fundo text-elos-verde border-2 border-elos-bege/20 hover:bg-elos-verde hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all"
                          >
                            📄 Pedido PDF
                          </button>

                          {/* 🟢 BOTÃO GERAR CARNÊ DIRETO (USA A CHAVE PIX SALVA SEM PERGUNTAR TODA VEZ) */}
                          {!venda.renegociada && (venda.metodoPagamento === 'Boleto / Crediário' || (venda.listaParcelas || []).some(p => p.numero > 0 && !p.paga)) && (
                            <button 
                              onClick={() => handleEmitirCarneDireto(venda)}
                              className="flex-1 md:flex-none bg-orange-50 text-orange-600 border-2 border-orange-100 hover:bg-orange-500 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
                              title={`Imprimir Carnê (Chave PIX: ${chavePixPadrao})`}
                            >
                              🎟️ Gerar Carnê
                            </button>
                          )}

                          <button onClick={() => { abrirConfirmacao("Deseja excluir este contrato permanentemente?", () => excluirVendaMutation.mutate(venda._id || venda.id)); }} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-colors">🗑️</button>
                        </div>
                      </div>

                      {venda.ordensServico && venda.ordensServico.length > 0 && (
                        <div className="mt-4 mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                          <h4 className="text-[10px] font-black text-blue-800 uppercase mb-3 tracking-widest">Ordens de Serviço Vinculadas</h4>
                          <div className="space-y-2">
                            {venda.ordensServico.map((os, osIdx) => (
                              <div key={os.idOS || osIdx} className="flex flex-col md:flex-row justify-between md:items-center bg-white p-3 rounded-xl border border-blue-100 shadow-sm gap-3">
                                <span className="text-xs font-bold text-gray-700">
                                  👓 OS {osIdx + 1} - Armação: <span className="font-normal">{os.armacao || 'Não informada'}</span>
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => gerarPDFOrdemServico({ 
                                      ...os, 
                                      nomeCliente: clienteNoModal.nome, 
                                      dataVenda: venda.dataVenda, 
                                      numeroOS: `${numPed}-${osIdx + 1}` 
                                    })}
                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-200 transition-colors"
                                  >
                                    🖨️ Imprimir OS
                                  </button>
                                  <button
                                    onClick={() => navigate(`/admin/ordem-servico/editar/${os.idOS}`)}
                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-200 transition-colors"
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    onClick={() => handleExcluirOS(os.idOS)}
                                    className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                  >
                                    🗑️ Excluir
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-50 rounded-2xl p-4 shadow-inner border border-gray-200/50">
                        {(venda.listaParcelas || []).map((p, idx) => (
                          <LinhaParcela 
                            key={idx} 
                            p={p} 
                            venda={venda} 
                            darBaixaParcela={async (vendaId, numeroParcela, dataPagamento, valorPago) => {
                              return await darBaixaParcelaMutation.mutateAsync({ vendaId, numeroParcela, dataPagamento, valorPago });
                            }} 
                            estornarBaixaParcela={async (vendaId, numeroParcela) => {
                              return await estornarBaixaParcelaMutation.mutateAsync({ vendaId, numeroParcela });
                            }}
                            editarParcelaManual={handleEditarParcelaManual}
                            mostrarToast={mostrarToast} 
                            abrirConfirmacao={abrirConfirmacao} 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL DE RENEGOCIAÇÃO DE DÍVIDA */}
      {modalRenegociacao && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto border border-amber-200">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  🔄 Novo Acordo Financeiro
                </span>
                <h2 className="font-tradicional text-2xl md:text-3xl text-elos-verde italic mt-2">
                  Renegociar Pedido #{modalRenegociacao.vendaOriginal.numeroPedido || 'S/N'}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  O pedido antigo ficará marcado como <strong>Dívida Renegociada</strong> e este novo acordo assumirá as cobranças.
                </p>
              </div>
              <button onClick={() => setModalRenegociacao(null)} className="text-2xl text-gray-400 hover:text-red-500">&times;</button>
            </div>

            {/* RESUMO E PARÂMETROS DO ACORDO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block">Saldo Devedor Original</span>
                <span className="text-lg font-black text-red-600">
                  R$ {modalRenegociacao.saldoOriginal.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                  Novo Valor Total Negociado (Com Juros ou Desconto)
                </label>
                <input 
                  type="text"
                  className="w-full p-3 bg-white border border-amber-300 rounded-xl font-black text-elos-verde text-base outline-none focus:ring-2 focus:ring-amber-400"
                  value={modalRenegociacao.novoValorTotalFmt}
                  onChange={(e) => atualizarParametrosRenegociacao({ novoValorTotalFmt: aplicarMascaraMoeda(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nova Entrada (Opcional)</label>
                <input 
                  type="text"
                  placeholder="R$ 0,00"
                  className="w-full p-3 bg-elos-fundo rounded-xl text-xs font-bold text-elos-verde outline-none"
                  value={modalRenegociacao.valorEntradaFmt}
                  onChange={(e) => atualizarParametrosRenegociacao({ valorEntradaFmt: aplicarMascaraMoeda(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Data da Entrada</label>
                <input 
                  type="date"
                  className="w-full p-3 bg-elos-fundo rounded-xl text-xs font-bold outline-none"
                  value={modalRenegociacao.dataEntrada}
                  onChange={(e) => atualizarParametrosRenegociacao({ dataEntrada: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nº de Parcelas</label>
                <input 
                  type="number"
                  min="1"
                  max="36"
                  className="w-full p-3 bg-elos-fundo rounded-xl text-xs font-bold outline-none"
                  value={modalRenegociacao.parcelas}
                  onChange={(e) => atualizarParametrosRenegociacao({ parcelas: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">1º Vencimento</label>
                <input 
                  type="date"
                  className="w-full p-3 bg-elos-fundo rounded-xl text-xs font-bold outline-none"
                  value={modalRenegociacao.dataPrimeiraParcela}
                  onChange={(e) => atualizarParametrosRenegociacao({ dataPrimeiraParcela: e.target.value })}
                />
              </div>
            </div>

            {/* PRÉVIA EDITÁVEL DE CADA PARCELA */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-elos-verde tracking-widest">
                  📋 Ajuste Fino das Novas Parcelas (Você pode editar valores e datas individualmente)
                </h4>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 max-h-60 overflow-y-auto">
                {modalRenegociacao.parcelasPrevias.map((parc, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-3 rounded-xl border border-gray-100 gap-3">
                    <span className="text-xs font-black text-elos-verde min-w-[90px]">
                      {parc.numero === 0 ? '⚡ Entrada' : `${parc.numero}ª Parcela`}
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">R$</span>
                      <input 
                        type="number"
                        step="0.01"
                        className="w-28 p-2 bg-elos-fundo rounded-lg text-xs font-bold text-elos-texto outline-none"
                        value={parc.valor}
                        onChange={(e) => editarLinhaPreviaRenegociacao(idx, 'valor', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Venc:</span>
                      <input 
                        type="date"
                        className="p-2 bg-elos-fundo rounded-lg text-xs font-bold text-elos-texto outline-none"
                        value={parc.dataVencimento}
                        onChange={(e) => editarLinhaPreviaRenegociacao(idx, 'dataVencimento', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Observações do Acordo</label>
              <textarea 
                rows="2"
                className="w-full p-3 bg-elos-fundo rounded-xl text-xs outline-none resize-none"
                value={modalRenegociacao.observacoes}
                onChange={(e) => setModalRenegociacao({ ...modalRenegociacao, observacoes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setModalRenegociacao(null)} 
                className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="button"
                disabled={processandoRenegociacao}
                onClick={confirmarRenegociacao}
                className="flex-[1.5] py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                {processandoRenegociacao ? 'Processando Acordo...' : '✅ Confirmar Renegociação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL DE CONFIGURAR CHAVE PIX PADRÃO DO CARNÊ (UMA ÚNICA VEZ) */}
      {modalConfigPix && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[95] p-4">
          <div className="bg-white p-8 rounded-[32px] max-w-sm w-full border border-orange-100 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl text-orange-500 mb-2">🔑</div>
              <h2 className="font-tradicional text-2xl text-elos-verde italic">Chave PIX do Carnê</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 mb-6">
                Ficará salva automaticamente para todos os carnês
              </p>
            </div>
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-orange-600 uppercase tracking-tighter ml-1">
                Chave PIX da Loja (Celular, CPF, CNPJ ou E-mail)
              </label>
              <input 
                type="text" 
                className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl font-bold text-elos-texto text-sm outline-none focus:ring-2 focus:ring-orange-200" 
                value={inputNovaChavePix} 
                onChange={(e) => setInputNovaChavePix(e.target.value)} 
                placeholder="Ex: (85) 8550-6571"
              />
              <p className="text-[9px] text-gray-400 italic ml-1 mt-1">
                Você não precisará digitar novamente ao clicar em "Gerar Carnê".
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { setModalConfigPix(false); setVendaAguardandoCarne(null); }} 
                className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={salvarChavePixGlobal} 
                className="flex-[1.5] bg-orange-500 text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                Salvar Padrão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CADASTRO */}
      {editandoCadastro && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-tradicional text-2xl text-elos-verde italic text-center">Editar Perfil</h2>
            
            <div className="flex flex-col items-center gap-3 bg-elos-fundo/50 p-4 rounded-2xl border border-elos-bege/10">
              <img src={novaFotoCliente || editandoCadastro.foto || 'https://via.placeholder.com/150'} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
              <div className="relative">
                <button type="button" disabled={uploadingImage} className="px-4 py-2 bg-elos-bege text-white rounded-full text-xs font-bold hover:bg-elos-verde disabled:opacity-50">
                  {uploadingImage ? 'Otimizando... ⏳' : 'Alterar Foto 📸'}
                </button>
                <input type="file" accept="image/*" capture="environment" disabled={uploadingImage} onChange={(e) => handleUploadImgBB(e, setNovaFotoCliente)} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div><label className="text-[10px] font-black uppercase text-gray-400">Nome</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.nome} onChange={(e) => setEditandoCadastro({...editandoCadastro, nome: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">CPF</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.cpf} onChange={(e) => setEditandoCadastro({...editandoCadastro, cpf: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Data de Nascimento</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none text-gray-500" type="date" value={editandoCadastro.dataNascimento || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, dataNascimento: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">WhatsApp</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.telefone} onChange={(e) => setEditandoCadastro({...editandoCadastro, telefone: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">E-mail</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="email" value={editandoCadastro.email || ''} onChange={(e) => setEditandoCadastro({...editandoCadastro, email: e.target.value})} /></div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Origem (De onde veio?)</label>
                <input 
                  list="edit-opcoes-origem" 
                  className="w-full p-3 bg-elos-fundo rounded-xl outline-none" 
                  type="text" 
                  value={editandoCadastro.origem || ''} 
                  onChange={(e) => setEditandoCadastro({...editandoCadastro, origem: e.target.value})} 
                />
                <datalist id="edit-opcoes-origem">
                  <option value="Instagram"></option>
                  <option value="Facebook"></option>
                  <option value="WhatsApp"></option>
                  <option value="Google"></option>
                  <option value="Passou em frente a Loja"></option>
                  <option value="Indicação"></option>
                </datalist>
              </div>

              <div><label className="text-[10px] font-black uppercase text-gray-400">Endereço</label><input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoCadastro.endereco} onChange={(e) => setEditandoCadastro({...editandoCadastro, endereco: e.target.value})} /></div>
              <div><label className="text-[10px] font-black uppercase text-gray-400">Observações</label><textarea rows="3" className="w-full p-3 bg-elos-fundo rounded-xl outline-none resize-none" value={editandoCadastro.observacoes} onChange={(e) => setEditandoCadastro({...editandoCadastro, observacoes: e.target.value})} /></div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={salvarEdicaoCadastro} disabled={uploadingImage} className="flex-1 bg-elos-verde text-white py-3 rounded-xl font-bold disabled:bg-gray-400">Salvar</button>
              <button onClick={() => setEditandoCadastro(null)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE VENDA */}
      {editandoVenda && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-tradicional text-2xl text-elos-verde italic text-center">Editar Pedido</h2>
            
            <div className="flex flex-col items-center gap-3 bg-elos-fundo/50 p-4 rounded-2xl border border-elos-bege/10">
              {novaFotoVenda || editandoVenda.foto ? (
                <img src={novaFotoVenda || editandoVenda.foto} alt="Preview" className="max-h-32 rounded-xl shadow-md border-2 border-white" />
              ) : (
                <div className="w-full h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 italic text-xs">Sem receita anexada</div>
              )}
              <div className="relative">
                <button type="button" disabled={uploadingImage} className="px-4 py-2 bg-elos-bege text-white rounded-full text-xs font-bold disabled:opacity-50">
                  {uploadingImage ? 'Otimizando... ⏳' : 'Alterar Receita 📸'}
                </button>
                <input type="file" accept="image/*" capture="environment" disabled={uploadingImage} onChange={(e) => handleUploadImgBB(e, setNovaFotoVenda)} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Data da Venda</label>
                <input className="w-full p-3 bg-elos-fundo rounded-xl outline-none font-bold text-center" type="date" value={editandoVenda.dataVenda} onChange={(e) => setEditandoVenda({...editandoVenda, dataVenda: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Produto/Serviço</label>
                <input className="w-full p-3 bg-elos-fundo rounded-xl outline-none" type="text" value={editandoVenda.produto} onChange={(e) => setEditandoVenda({...editandoVenda, produto: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">Observações Técnicas</label>
                <textarea rows="4" className="w-full p-3 bg-elos-fundo rounded-xl outline-none resize-none italic" value={editandoVenda.observacoes} onChange={(e) => setEditandoVenda({...editandoVenda, observacoes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={salvarEdicaoVenda} disabled={uploadingImage} className="flex-1 bg-elos-verde text-white py-3 rounded-xl font-bold disabled:bg-gray-400">Atualizar</button>
              <button onClick={() => setEditandoVenda(null)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERAR RECIBO (PAGAMENTO MANUAL TOTAL) */}
      {modalRecibo && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white p-8 rounded-[32px] max-w-md w-full border border-elos-bege/20 shadow-2xl">
            <div className="text-center">
              <h2 className="font-tradicional text-2xl text-elos-verde italic">Emitir Recibo</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Confirme os valores abaixo</p>
            </div>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter">Valor do Recebimento</label>
                <input type="text" className="w-full p-4 bg-elos-fundo/50 border rounded-2xl font-bold text-elos-verde text-lg outline-none" value={modalRecibo.valorFmt} onChange={(e) => setModalRecibo({...modalRecibo, valorFmt: aplicarMascaraMoeda(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter">Referente a</label>
                <input type="text" className="w-full p-4 bg-elos-fundo/50 border rounded-2xl text-sm outline-none" placeholder="Ex: Pagamento de parcelas, Entrada..." value={modalRecibo.produto} onChange={(e) => setModalRecibo({...modalRecibo, produto: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter">Data</label>
                  <input type="date" className="w-full p-3 bg-elos-fundo/50 border rounded-xl text-xs outline-none" value={modalRecibo.data} onChange={(e) => setModalRecibo({...modalRecibo, data: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-elos-verde uppercase tracking-tighter">Método</label>
                  <select className="w-full p-3 bg-elos-fundo/50 border rounded-xl text-xs outline-none" value={modalRecibo.metodo} onChange={(e) => setModalRecibo({...modalRecibo, metodo: e.target.value})}>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button onClick={() => {
                const valorLimpo = Number(modalRecibo.valorFmt.replace(/\D/g, '')) / 100;
                gerarPDFDocumento({
                  cliente: clienteNoModal.nome, cpf: clienteNoModal.cpf, telefone: clienteNoModal.telefone, endereco: clienteNoModal.endereco, email: clienteNoModal.email,
                  valorTotal: valorLimpo, produto: modalRecibo.produto, dataRecibo: modalRecibo.data.split('-').reverse().join('/'), metodoPagamento: modalRecibo.metodo, desconto: 0,
                  itensCarrinho: [{ nome: modalRecibo.produto.toUpperCase(), preco: valorLimpo }]
                }, 'recibo');
                setModalRecibo(null);
              }} className="flex-1 bg-elos-verde text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.95]">Gerar PDF</button>
              <button onClick={() => setModalRecibo(null)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}