// src/utils/api.js

// Normaliza a URL do backend para sempre incluir /api no final (com fallback seguro)
const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'https://elos-server.onrender.com/api').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

export const API_URL = getApiUrl();
const TEMPO_LIMITE_MS = 90000; // 90s: cobre cold start do Render sem travar a tela por 5 min

export async function pedir(caminho, opcoes = {}) {
  const { timeoutMs = TEMPO_LIMITE_MS, ...resto } = opcoes;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

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
      } catch { /* resposta sem JSON */ }
      throw new Error(mensagem);
    }

    if (res.status === 204) return null;

    const texto = await res.text();
    if (!texto) return null;
    try {
      return JSON.parse(texto);
    } catch {
      return texto;
    }
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