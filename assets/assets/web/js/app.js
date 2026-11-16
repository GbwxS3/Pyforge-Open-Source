// PyForge — roteador e estado global.
import { api, TOKEN } from './api.js';
import { toast, el, esc, ic } from './ui.js';

export const estado = { config: null, ping: null, telaAtual: null, conta: null };

const telas = {
  lobby: () => import('./lobby.js'),
  editor: () => import('./editor.js'),
  designer: () => import('./designer.js'),
  config: () => import('./config.js'),
};

export function ir(rota) { location.hash = rota; }

export function lerRota() {
  const h = location.hash.replace(/^#\/?/, '');
  const [nome, qs] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { nome: nome || 'lobby', params };
}

export async function recarregarConfig() {
  estado.config = await api('config');
  aplicarAparencia();
  return estado.config;
}

export async function salvarConfig(parcial) {
  estado.config = await api('config', parcial);
  aplicarAparencia();
  return estado.config;
}

export function cfg(caminho, padrao) {
  let v = estado.config;
  for (const p of caminho.split('.')) { if (v == null) return padrao; v = v[p]; }
  return v === undefined || v === null ? padrao : v;
}

function aplicarAparencia() {
  const t = cfg('editor.tamanhoFonte', 13);
  document.documentElement.style.setProperty('--fs-code', t + 'px');
}

let desmontar = null;
let navegando = false;

async function navegar() {
  if (navegando) return;
  navegando = true;
  try {
    const { nome, params } = lerRota();
    if (estado.telaAtual && estado.telaAtual.podeSair && !(await estado.telaAtual.podeSair())) {
      history.back();
      return;
    }
    if (desmontar) { try { desmontar(); } catch (e) { console.error(e); } desmontar = null; }
    const app = document.getElementById('app');
    app.innerHTML = '';
    const carregar = telas[nome] || telas.lobby;
    const mod = await carregar();
    estado.telaAtual = mod;
    desmontar = await mod.montar(app, params);
  } catch (e) {
    console.error(e);
    toast('Erro ao abrir a tela: ' + e.message, 'err');
  } finally {
    navegando = false;
  }
}

async function iniciar() {
  if (!TOKEN) {
    document.getElementById('app').appendChild(el(`<div class="vazio">${ic('logo', 48)}<h2>PyForge</h2><p class="muted">Abra o PyForge pelo programa (PyForge.exe).</p></div>`));
    return;
  }
  try {
    estado.ping = await api('ping');
    await recarregarConfig();
  } catch (e) {
    document.getElementById('app').appendChild(el(`<div class="vazio">${ic('alerta', 48)}<h2>Não consegui falar com o PyForge</h2><p class="muted">${esc(e.message)}</p></div>`));
    return;
  }
  // Conta: quem não entrou (ou não pode usar agora) vê a tela de entrar antes de tudo.
  estado.conta = await api('conta').catch(() => ({ logado: false }));
  if (!estado.conta.logado || (estado.conta.acesso && estado.conta.acesso.liberado === false)) {
    const { telaConta } = await import('./entrar.js');
    estado.conta = await telaConta(document.getElementById('app'), estado.conta);
    history.replaceState(null, '', location.pathname + '#/');
  } else if (estado.conta.offline) {
    toast('Sem conexão com o servidor de contas: você continua conectado neste computador.', 'info', 6000);
  }
  if (!estado.ping.uv) toast('Não encontrei o uv (ferramentas\\uv.exe). Deixe a pasta "ferramentas" junto do PyForge.exe, senão rodar Python e instalar pacotes não funciona.', 'err', 12000);
  setInterval(() => api('ping').catch(() => {}), 3000);
  window.addEventListener('pagehide', () => navigator.sendBeacon('/api/tchau?t=' + TOKEN));
  window.addEventListener('hashchange', navegar);
  window.addEventListener('beforeunload', (e) => {
    if (estado.telaAtual && estado.telaAtual.temAlteracoes && estado.telaAtual.temAlteracoes()) { e.preventDefault(); e.returnValue = ''; }
  });
  document.addEventListener('keydown', (e) => {
    // Impede atalhos do navegador que não fazem sentido num app.
    if ((e.ctrlKey || e.metaKey) && ['p', 'r', 'g', 'j', 'h', 'u', 'o', 'n', 'w'].includes(e.key.toLowerCase()) && !e.altKey) {
      if (!(e.key.toLowerCase() === 'r' && e.shiftKey)) e.preventDefault();
    }
    if (e.key === 'F5' && !e.ctrlKey) e.preventDefault();
  }, true);
  navegar();
}

iniciar();
