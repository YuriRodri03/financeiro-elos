import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// 🟢 ADICIONADO: Hooks do React Query
import { useOrdemServico, useSalvarOS } from '../../hooks/useOS';

export default function NovaOrdemServico() {
  const { numeroPedido, id } = useParams();
  const navigate = useNavigate();
  const modoEdicao = !!id; 

  // 🟢 AQUI: React Query busca a OS se estivermos no modo de edição
  const { data: osBanco, isLoading: carregandoOS } = useOrdemServico(id);
  const salvarOSMutation = useSalvarOS();

  const [dadosOS, setDadosOS] = useState({
    lente: '', tratamento: '', armacao: '',
    
    // Longe
    longe_od_esf: '', longe_od_cil: '', longe_od_eixo: '', longe_od_dnp: '',
    longe_oe_esf: '', longe_oe_cil: '', longe_oe_eixo: '', longe_oe_dnp: '',
    
    // Adição
    adicao: '',
    
    // CO
    co_od_esf: '', co_od_cil: '', co_od_eixo: '', co_od_dnp: '',
    co_oe_esf: '', co_oe_cil: '', co_oe_eixo: '', co_oe_dnp: '',
    
    // Perto
    perto_od_esf: '', perto_od_cil: '', perto_od_eixo: '', perto_od_dnp: '',
    perto_oe_esf: '', perto_oe_cil: '', perto_oe_eixo: '', perto_oe_dnp: '',
    
    // Medidas da Armação
    medidas_vertical: '', medidas_horizontal: '', 
    medidas_ponte: '', medidas_diag: '',
    
    // Rodapé
    observacoes: '', consultor: '', cliente: '', numeroPedido: numeroPedido || ''
  });

  // 🟢 PREENCHE O FORMULÁRIO QUANDO O REACT QUERY RETORNAR OS DADOS
  useEffect(() => {
    if (osBanco && modoEdicao) {
      const dadosFormatados = { ...dadosOS };
      Object.keys(dadosFormatados).forEach(key => {
        dadosFormatados[key] = osBanco[key] || '';
      });
      if (osBanco.numeroPedido) dadosFormatados.numeroPedido = osBanco.numeroPedido;
      setDadosOS(dadosFormatados);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osBanco, modoEdicao]);

  const handleChange = (e) => {
    setDadosOS({
      ...dadosOS,
      [e.target.name]: e.target.value
    });
  };

  const salvarOS = async (e) => {
    e.preventDefault();
    
    const osParaSalvar = { ...dadosOS };

    if (!modoEdicao) {
      osParaSalvar.dataCriacao = new Date().toISOString();
    }

    try {
      // 🟢 AQUI: Chama a mutação do React Query
      await salvarOSMutation.mutateAsync({ id, dadosOS: osParaSalvar });
      
      alert(`Ordem de Serviço ${modoEdicao ? 'atualizada' : 'cadastrada'} com sucesso!`);
      navigate(-1); 
    } catch (error) {
      console.error("Erro ao salvar OS: ", error);
      alert("Erro de conexão ao salvar a Ordem de Serviço.");
    }
  };

  if (modoEdicao && carregandoOS) {
    return <div className="p-10 text-center text-gray-500 font-bold">Carregando Ordem de Serviço...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {modoEdicao ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </h2>
          <span className="text-lg font-semibold text-gray-500">
            OS Vinculada ao Pedido #{dadosOS.numeroPedido || numeroPedido || 'N/A'}
          </span>
        </div>
        
        <form onSubmit={salvarOS} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 rounded-md">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">LENTE:</label>
              <input type="text" name="lente" value={dadosOS.lente} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-700 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">TRATAMENTO:</label>
              <input type="text" name="tratamento" value={dadosOS.tratamento} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-700 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">ARMAÇÃO:</label>
              <input type="text" name="armacao" value={dadosOS.armacao} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-700 outline-none" />
            </div>
          </div>

          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="bg-gray-200 text-center font-bold py-2 border-b border-gray-300">
              DADOS DA RX
            </div>
            
            <div className="grid grid-cols-6 text-center font-bold bg-gray-100 border-b border-gray-300 text-sm">
              <div className="p-2 border-r border-gray-300 col-span-2">RX</div>
              <div className="p-2 border-r border-gray-300">ESF</div>
              <div className="p-2 border-r border-gray-300">CIL</div>
              <div className="p-2 border-r border-gray-300">EIXO</div>
              <div className="p-2">DNP LONGE</div>
            </div>

            <div className="grid grid-cols-6 border-b border-gray-300 text-sm">
              <div className="p-2 border-r border-gray-300 flex items-center justify-center font-bold">LONGE</div>
              <div className="border-r border-gray-300">
                <div className="border-b border-gray-300 p-2 text-center font-bold">OD</div>
                <div className="p-2 text-center font-bold">OE</div>
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="longe_od_esf" value={dadosOS.longe_od_esf} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="longe_oe_esf" value={dadosOS.longe_oe_esf} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="longe_od_cil" value={dadosOS.longe_od_cil} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="longe_oe_cil" value={dadosOS.longe_oe_cil} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="longe_od_eixo" value={dadosOS.longe_od_eixo} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="longe_oe_eixo" value={dadosOS.longe_oe_eixo} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div>
                <input type="text" name="longe_od_dnp" value={dadosOS.longe_od_dnp} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="longe_oe_dnp" value={dadosOS.longe_oe_dnp} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
            </div>

            <div className="grid grid-cols-6 border-b border-gray-300 text-sm bg-gray-50">
              <div className="p-2 border-r border-gray-300 col-span-2 font-bold flex items-center justify-center">ADIÇÃO</div>
              <div className="col-span-4 p-2">
                <input type="text" name="adicao" value={dadosOS.adicao} onChange={handleChange} className="w-full p-2 text-center border rounded outline-none focus:bg-green-50" />
              </div>
            </div>

            <div className="grid grid-cols-6 border-b border-gray-300 text-sm">
              <div className="p-2 border-r border-gray-300 flex items-center justify-center font-bold">CO</div>
              <div className="border-r border-gray-300">
                <div className="border-b border-gray-300 p-2 text-center font-bold">OD</div>
                <div className="p-2 text-center font-bold">OE</div>
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="co_od_esf" value={dadosOS.co_od_esf} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="co_oe_esf" value={dadosOS.co_oe_esf} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div className="col-span-3 grid grid-cols-3">
                 <div className="col-span-1 p-2 flex items-center justify-center font-bold text-center text-xs border-r border-gray-300">
                   MEDIDAS DA ARMAÇÃO
                 </div>
                 <div className="col-span-2 grid grid-cols-2">
                    <div className="border-b border-r border-gray-300 p-1 flex flex-col items-center justify-center text-xs">
                      <span className="font-bold text-gray-500">VERTICAL</span>
                      <input type="text" name="medidas_vertical" value={dadosOS.medidas_vertical} onChange={handleChange} className="w-full text-center outline-none" />
                    </div>
                    <div className="border-b border-gray-300 p-1 flex flex-col items-center justify-center text-xs">
                      <span className="font-bold text-gray-500">HORIZONTAL</span>
                      <input type="text" name="medidas_horizontal" value={dadosOS.medidas_horizontal} onChange={handleChange} className="w-full text-center outline-none" />
                    </div>
                    <div className="border-r border-gray-300 p-1 flex flex-col items-center justify-center text-xs">
                      <span className="font-bold text-gray-500">PONTE</span>
                      <input type="text" name="medidas_ponte" value={dadosOS.medidas_ponte} onChange={handleChange} className="w-full text-center outline-none" />
                    </div>
                    <div className="p-1 flex flex-col items-center justify-center text-xs">
                      <span className="font-bold text-gray-500">DIAG. MAIOR</span>
                      <input type="text" name="medidas_diag" value={dadosOS.medidas_diag} onChange={handleChange} className="w-full text-center outline-none" />
                    </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-6 text-sm">
              <div className="p-2 border-r border-gray-300 flex items-center justify-center font-bold">PERTO</div>
              <div className="border-r border-gray-300">
                <div className="border-b border-gray-300 p-2 text-center font-bold">OD</div>
                <div className="p-2 text-center font-bold">OE</div>
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="perto_od_esf" value={dadosOS.perto_od_esf} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="perto_oe_esf" value={dadosOS.perto_oe_esf} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="perto_od_cil" value={dadosOS.perto_od_cil} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="perto_oe_cil" value={dadosOS.perto_oe_cil} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div className="border-r border-gray-300">
                <input type="text" name="perto_od_eixo" value={dadosOS.perto_od_eixo} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="perto_oe_eixo" value={dadosOS.perto_oe_eixo} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
              <div>
                <input type="text" name="perto_od_dnp" value={dadosOS.perto_od_dnp} onChange={handleChange} className="w-full border-b border-gray-300 p-2 text-center outline-none focus:bg-green-50" />
                <input type="text" name="perto_oe_dnp" value={dadosOS.perto_oe_dnp} onChange={handleChange} className="w-full p-2 text-center outline-none focus:bg-green-50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">OBSERVAÇÕES:</label>
              <textarea name="observacoes" value={dadosOS.observacoes} onChange={handleChange} rows="3" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-700 outline-none resize-none"></textarea>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">PACIENTE:</label>
              <input type="text" name="cliente" value={dadosOS.cliente} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-700 outline-none" />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={salvarOSMutation.isPending} className="px-6 py-2 bg-green-700 rounded text-white font-bold hover:bg-green-800 transition disabled:opacity-50">
              {salvarOSMutation.isPending ? 'Salvando...' : (modoEdicao ? 'Salvar Alterações' : 'Salvar Ordem de Serviço')}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}