// src/utils/api.js

// Função inteligente que normaliza a URL do backend para sempre incluir /api no final
const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com';
  // Remove barra no final se houver
  url = url.replace(/\/$/, '');
  // Se não terminar com /api, adiciona automaticamente
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const API_URL = getApiUrl();
const TEMPO_LIMITE_MS = 50000;

export async function pedir(caminho, opcoes = {}) {
  const { timeoutMs = TEMPO_LIMITE_MS, ...resto } = opcoes;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  // Garante que o caminho comece com barra (ex: /clientes)
  const caminhoFormatado = caminho.startsWith('/') ? caminho : `/${caminho}`;

  try {
    const res = await fetch(`${API_URL}${caminhoFormatado}`, {
      ...resto,
      signal: controlador.signal
    });

    if (!res.ok) {
      let mensagem = `O servidor respondeu com erro ${res.status}.`;
      try {
        const corpo = await res.json();
        if (corpo?.error) mensagem = corpo.error;
      } catch { }
      throw new Error(mensagem);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente de novo.');
    }
    if (err instanceof TypeError) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}