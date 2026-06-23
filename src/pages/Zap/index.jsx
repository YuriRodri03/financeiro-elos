import React, { useState, useEffect } from 'react';

export default function WhatsappConnect() {
  const [status, setStatus] = useState('Buscando status...');
  const [qrCode, setQrCode] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // --- ESTADOS PARA OS TEMPLATES DE MENSAGENS CUSTOMIZÁVEIS ---
  const [msgAniversario, setMsgAniversario] = useState('');
  const [msgPosVenda, setMsgPosVenda] = useState('');
  const [salvandoMensagens, setSalvandoMensagens] = useState(false);

  // URL do seu backend
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Função para buscar o status do WhatsApp no servidor
  const buscarStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/status`);
      const data = await response.json();
      
      setStatus(data.status);
      setQrCode(data.qr); 
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp:', error);
      setStatus('Erro ao conectar com o servidor');
    }
  };

  // Função para carregar os templates salvos no MongoDB
  const carregarTemplatesMensagens = async () => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/mensagens`);
      if (response.ok) {
        const data = await response.json();
        setMsgAniversario(data.msg_aniversario || '');
        setMsgPosVenda(data.msg_pos_venda || '');
      }
    } catch (error) {
      console.error('Erro ao buscar templates do banco:', error);
    }
  };

  useEffect(() => {
    buscarStatus(); 
    carregarTemplatesMensagens(); 
    
    const interval = setInterval(() => {
      buscarStatus();
    }, 5000); 

    return () => clearInterval(interval);
  }, []);

  // Função para sincronizar os textos alterados com o banco
  const handleSalvarMensagens = async (e) => {
    e.preventDefault();
    setSalvandoMensagens(true);
    try {
      const response = await fetch(`${API_URL}/whatsapp/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_aniversario: msgAniversario,
          msg_pos_venda: msgPosVenda
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Templates de disparo atualizados com sucesso! 🚀');
      } else {
        alert('Erro ao salvar novos textos.');
      }
    } catch (error) {
      console.error('Erro na requisição das mensagens:', error);
      alert('Erro de rede ao salvar configurações.');
    } finally {
      setSalvandoMensagens(false);
    }
  };

  const handleDesconectar = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp da Ótica Elos?')) return;
    
    setCarregando(true);
    try {
      const response = await fetch(`${API_URL}/whatsapp/desconectar`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Sessão encerrada com sucesso!');
        setQrCode(null);
        buscarStatus();
      } else {
        alert(data.error || 'Erro ao desconectar.');
      }
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      alert('Erro de comunicação com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  // Mapeamento de Cores adaptado para as strings de status do Baileys
  const obterCorStatus = () => {
    switch (status) {
      case 'Conectado':
      case 'open':
        return '#10b981'; // Verde estável
      case 'Aguardando Leitura do QR Code':
        return '#f59e0b'; // Laranja de atenção
      case 'Desconectado':
      case 'close':
        return '#ef4444'; // Vermelho
      default:
        return '#6b7280'; // Cinza de carregamento
    }
  };

  // Helper para amigabilizar o texto bruto do Baileys na tela
  const obterTextoStatusAmigavel = () => {
    if (status === 'open') return 'Conectado';
    if (status === 'close') return 'Desconectado';
    return status;
  };

  return (
    <div style={{
      maxWidth: '650px',
      margin: '40px auto',
      padding: '30px',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
      fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#1f2937', marginBottom: '10px', fontWeight: '700', fontSize: '24px' }}>
          Automação de Mensagens 🟢
        </h2>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '25px' }}>
          Gerencie o canal de conexão e os textos de pós-venda e birthdays da <strong>Ótica Elos</strong>.
        </p>
      </div>

      {/* Box de Status Atual */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '16px 20px',
        borderRadius: '16px',
        borderLeft: `6px solid ${obterCorStatus()}`,
        marginBottom: '25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '11px', color: '#9ca3af', display: 'inline-block', textTransform: 'uppercase', tracking: '0.05em', fontWeight: 'bold' }}>
            Status do Conector
          </span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginTop: '2px' }}>
            {obterTextoStatusAmigavel()}
          </div>
        </div>

        {/* Exibe botão de desconectar rápido se estiver ativo */}
        {(status === 'Conectado' || status === 'open') && (
          <button
            onClick={handleDesconectar}
            disabled={carregando}
            style={{
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              cursor: carregando ? 'not-allowed' : 'pointer'
            }}
          >
            {carregando ? 'Encerrando...' : 'Desconectar'}
          </button>
        )}
      </div>

      {/* Renderização do Conector QR */}
      {status === 'Aguardando Leitura do QR Code' && qrCode ? (
        <div style={{ margin: '20px 0', textAlign: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '30px' }}>
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '15px' }}>
            Abra o WhatsApp no celular, toque em <strong>Aparelhos conectados &gt; Conectar um aparelho</strong> e aponte para a tela:
          </p>
          <div style={{
            display: 'inline-block',
            padding: '12px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              style={{ width: '220px', height: '220px', display: 'block' }} 
            />
          </div>
        </div>
      ) : (status !== 'Conectado' && status !== 'open') && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
          🔄 Conectando com o canal estável do Baileys via WebSockets...
        </div>
      )}

      {/* PAINEL: Configuração Dinâmica de Templates de Texto */}
      <form onSubmit={handleSalvarMensagens} style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#374151', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px', marginBottom: '15px' }}>
          📝 Customização dos Disparos
        </h3>

        {/* Template Aniversariantes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#4b5563', marginBottom: '6px' }}>
            🎉 Mensagem de Aniversário
          </label>
          <textarea
            rows="5"
            value={msgAniversario}
            onChange={(e) => setMsgAniversario(e.target.value)}
            placeholder="Escreva o texto automático de parabéns..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              lineHeight: '1.5',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
          <small style={{ color: '#9ca3af', fontSize: '10px', marginTop: '4px', display: 'block' }}>
            Tag disponível: <strong style={{ color: '#6b7280' }}>{`{nome}`}</strong> (insere o primeiro nome do cliente).
          </small>
        </div>

        {/* Template Pós-Venda */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#4b5563', marginBottom: '6px' }}>
            🕶️ Mensagem de Pós-Venda (30 dias)
          </label>
          <textarea
            rows="5"
            value={msgPosVenda}
            onChange={(e) => setMsgPosVenda(e.target.value)}
            placeholder="Escreva o texto do acompanhamento de 30 dias..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              lineHeight: '1.5',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
          <small style={{ color: '#9ca3af', fontSize: '10px', marginTop: '4px', display: 'block' }}>
            Tags disponíveis: <strong style={{ color: '#6b7280' }}>{`{nome}`}</strong> e <strong style={{ color: '#6b7280' }}>{`{produto}`}</strong> (insere o óculos/item comprado).
          </small>
        </div>

        {/* Botão de Salvar Alterações */}
        <button
          type="submit"
          disabled={salvandoMensagens}
          style={{
            width: '100%',
            backgroundColor: '#4a5d4e', 
            color: '#ffffff',
            border: 'none',
            padding: '14px',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: salvandoMensagens ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(74, 93, 78, 0.15)',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => { if(!salvandoMensagens) e.target.style.backgroundColor = '#3a4a3e' }}
          onMouseOut={(e) => { if(!salvandoMensagens) e.target.style.backgroundColor = '#4a5d4e' }}
        >
          {salvandoMensagens ? 'Sincronizando com o MongoDB...' : '💾 Salvar Alterações de Texto'}
        </button>
      </form>
    </div>
  );
}