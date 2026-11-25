// src/authFetch.js
const API_BASE = (import.meta.env.VITE_API_URL || 'https://financeiro-elos.onrender.com/api').replace(/\/$/, '');
export const CHAVE_TOKEN_PAINEL = 'otica_elos_token';

// Rotas da API que pertencem à loja/cliente ou proxy externo e NUNCA devem receber o token do painel
const ROTAS_SEM_TOKEN_PAINEL = [
  '/infinitepay/',
  '/meus-pedidos',
  '/funcionarios/login',
  '/clientes/login',
  '/clientes/status-cpf',
  '/clientes/ativar-conta',
  '/clientes/cadastro-online',
  '/clientes/solicitar-recuperacao',
  '/clientes/redefinir-senha',
];

if (typeof window !== 'undefined' && !window.__elosFetchPatched) {
  window.__elosFetchPatched = true;
  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const ehApiDaLoja = url === API_BASE || url.startsWith(`${API_BASE}/`);
    const caminhoRelativo = ehApiDaLoja ? url.slice(API_BASE.length) : '';
    const rotaExcluida = ROTAS_SEM_TOKEN_PAINEL.some((r) => caminhoRelativo.startsWith(r));

    let token = null;
    try { token = localStorage.getItem(CHAVE_TOKEN_PAINEL); } catch {}

    let anexouToken = false;
    if (ehApiDaLoja && !rotaExcluida && token) {
      const headers = new Headers(
        init.headers || (typeof input !== 'string' && input && input.headers) || {}
      );
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
        anexouToken = true;
      }
      init = { ...init, headers };
    }

    const resposta = await fetchOriginal(input, init);

    // Se enviamos o token do painel e o servidor devolveu 401, encerra a sessão
    if (anexouToken && resposta.status === 401) {
      try {
        const dados = await resposta.clone().json();
        if (!dados?.codigo || dados.codigo === 'SESSAO_INVALIDA') {
          window.dispatchEvent(new Event('elos:sessao-expirada'));
        }
      } catch {
        window.dispatchEvent(new Event('elos:sessao-expirada'));
      }
    }

    return resposta;
  };
}