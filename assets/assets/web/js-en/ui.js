// Ícones, utilidades de interface, toasts e modais.

const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const R = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

export const ICONES = {
  logo: 'M9 7 4 12l5 5M15 7l5 5-5 5',
  cursor: 'M5 3l14 7.5-6.2 1.9L10.5 19z',
  joinha: 'M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM7 10l4-7a2.5 2.5 0 0 1 3 3l-1 4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 21H7',
  joinhaBaixo: 'M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1zM17 14l-4 7a2.5 2.5 0 0 1-3-3l1-4H5.5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.7 3H17',
  mao: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v6M17 10a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4.2 14.4a1.5 1.5 0 0 1 2.4-1.8L8 14',
  texto: 'M5 7V4h14v3M12 4v16M9 20h6',
  retangulo: R(3, 5, 18, 14, 2),
  circulo: C(12, 12, 8.5),
  linhaReta: 'M4 20 20 4',
  imagem: R(3, 4, 18, 16, 2) + C(8.5, 9.5, 1.5) + 'M21 15l-5-5L5 20',
  numero: R(3, 7, 18, 10, 2) + 'M15.5 10.5 17 9l1.5 1.5M15.5 13.5 17 15l1.5-1.5',
  opcao: C(12, 12, 8) + C(12, 12, 3.5),
  tabela: R(3, 4, 18, 16, 2) + 'M3 10h18M3 15h18M10 4v16',
  alEsq: 'M4 3v18M8 7h11v4H8zM8 14h7v4H8z',
  alCentroH: 'M12 3v18M6 7h12v4H6zM8 14h8v4H8z',
  alDir: 'M20 3v18M5 7h11v4H5zM9 14h7v4H9z',
  alTopo: 'M3 4h18M7 8h4v11H7zM14 8h4v7h-4z',
  alMeio: 'M3 12h18M7 6h4v12H7zM14 8h4v8h-4z',
  alBase: 'M3 20h18M7 5h4v11H7zM14 9h4v7h-4z',
  distH: 'M4 3v18M20 3v18M10 7h4v10h-4z',
  distV: 'M3 4h18M3 20h18M7 10h10v4H7z',
  grade: R(3, 3, 18, 18, 2) + 'M3 9h18M3 15h18M9 3v18M15 3v18',
  regua: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  ima: 'M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3zM6 7h4M14 7h4',
  cadeado: R(5, 11, 14, 10, 2) + 'M8 11V7a4 4 0 0 1 8 0v4',
  cadeadoAberto: R(5, 11, 14, 10, 2) + 'M8 11V7a4 4 0 0 1 7.6-1.8',
  olhoFechado: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  agrupar: 'M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4' + R(7, 7, 6, 6, 1) + R(11, 11, 6, 6, 1),
  desagrupar: R(3, 3, 8, 8, 1) + R(13, 13, 8, 8, 1),
  frente: R(9, 9, 12, 12, 2) + 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  tras: R(3, 3, 12, 12, 2) + 'M19 9h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-1',
  teclado: R(2, 6, 20, 12, 2) + 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
  modelos: R(3, 3, 8, 8, 1.5) + R(13, 3, 8, 8, 1.5) + R(3, 13, 8, 8, 1.5) + R(13, 13, 8, 8, 1.5),
  restricao: R(4, 4, 16, 16, 2) + R(9, 9, 6, 6, 1) + 'M12 4v5M12 15v5M4 12h5M15 12h5',
  negrito: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italico: 'M10 5h8M6 19h8M14 5 10 19',
  txtEsq: 'M4 6h16M4 10h10M4 14h16M4 18h10',
  txtCentro: 'M4 6h16M7 10h10M4 14h16M7 18h10',
  txtDir: 'M4 6h16M10 10h10M4 14h16M10 18h10',
  conta: 'M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2',
  home: 'M3 11 12 4l9 7M5 10v10h14V10',
  pasta: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  pastaAberta: 'M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1M3 7v10a2 2 0 0 0 2 2h12l4-8H7l-4 8',
  arquivo: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  arquivos: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  novoArq: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 11v6M9 14h6',
  novaPasta: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6',
  equipe: C(9, 8, 3.5) + 'M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6',
  codigo: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14',
  paleta: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 9.8C21.3 5.9 17.1 3 12 3z' + C(7.5, 11, 1) + C(10, 7, 1) + C(15, 7, 1),
  engrenagem: C(12, 12, 3) + 'M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1',
  livro: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h8',
  busca: C(11, 11, 7) + 'M20 20l-3.5-3.5',
  sino: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  brilho: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  clipe: 'M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 17.8a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9',
  enviar: 'M12 19V5M5 12l7-7 7 7',
  parar: R(6, 6, 12, 12, 2),
  estrela: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
  abaixo: 'M6 9l6 6 6-6',
  direita: 'M9 6l6 6-6 6',
  esquerda: 'M15 6l-6 6 6 6',
  cima: 'M6 15l6-6 6 6',
  check: 'M5 12l5 5 9-10',
  checkC: C(12, 12, 9) + 'M8 12l3 3 5-6',
  xC: C(12, 12, 9) + 'M9 9l6 6M15 9l-6 6',
  alerta: 'M12 3 2 20h20zM12 9v5M12 17.5v.5',
  info: C(12, 12, 9) + 'M12 11v5M12 8v.5',
  x: 'M6 6l12 12M18 6 6 18',
  play: 'M7 4v16l13-8z',
  bug: R(8, 6, 8, 13, 4) + 'M12 10v9M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2',
  frasco: 'M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-2.5L14 9V3',
  caixa: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  git: C(6, 5, 2) + C(6, 19, 2) + C(18, 7, 2) + 'M6 7v10M18 9c0 5-6 4-11 8',
  terminal: R(3, 4, 18, 16, 2) + 'M7 9l3 3-3 3M13 15h4',
  latEsq: R(3, 4, 18, 16, 2) + 'M9 4v16',
  latBaixo: R(3, 4, 18, 16, 2) + 'M3 14h18',
  latDir: R(3, 4, 18, 16, 2) + 'M15 4v16',
  mais3: C(5, 12, 1) + C(12, 12, 1) + C(19, 12, 1),
  relogio: C(12, 12, 9) + 'M12 7v5l3 2',
  copiar: R(8, 8, 13, 13, 2) + 'M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3',
  mic: R(9, 3, 6, 11, 3) + 'M5 11a7 7 0 0 0 14 0M12 18v3',
  bot: R(4, 8, 16, 12, 3) + 'M12 4v4' + C(9, 14, 1) + C(15, 14, 1),
  lixo: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  editar: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  monitor: R(3, 4, 18, 12, 2) + 'M8 20h8M12 16v4',
  janela: R(3, 4, 18, 16, 2) + 'M3 9h18M7 6.5h.01M10 6.5h.01',
  globo: C(12, 12, 9) + 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  grafico: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  jogo: R(2, 7, 20, 11, 4) + 'M7 11v4M5 13h4M15.5 12h.01M18 14h.01',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  atualizar: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  formatar: 'M4 6h16M4 12h10M4 18h14',
  dividir: R(3, 4, 18, 16, 2) + 'M12 4v16',
  lua: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  celular: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  filme: 'M3 5h18v14H3zM3 9h18M3 15h18M7 5v4M7 15v4M17 5v4M17 15v4',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  desfazer: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-2',
  refazer: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h2',
  linha: R(3, 8, 7, 8, 1) + R(14, 8, 7, 8, 1),
  botao: R(3, 8, 18, 8, 3),
  campo: R(3, 7, 18, 10, 2) + 'M7 10v4',
  area: R(3, 5, 18, 14, 2) + 'M7 9h10M7 13h6',
  caixaSel: R(4, 4, 16, 16, 3) + 'M8 12l3 3 5-6',
  rotulo: 'M5 6h14M5 12h10M5 18h7',
  progresso: R(3, 9, 18, 6, 3) + 'M3 12h10',
  lista: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  slider: 'M3 12h18' + C(9, 12, 3),
  combo: R(3, 7, 18, 10, 2) + 'M15 11l2 2 2-2',
  espaco: 'M4 8v-3h16v3M4 16v3h16v-3',
  separador: 'M3 12h18',
  titulo: 'M5 5h14M12 5v14M9 19h6',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' + C(12, 12, 3),
  zoom: C(11, 11, 7) + 'M20 20l-3.5-3.5M11 8v6M8 11h6',
  ajustar: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  salvar: 'M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v6h9M7 21v-7h10v7',
  chave: C(8, 15, 4) + 'M11 12l9-9M17 6l3 3M15 8l2 2',
  duplicar: R(8, 8, 13, 13, 2) + 'M5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1',
};

export function ic(nome, tam = 16, extra = '') {
  return `<svg class="i" width="${tam}" height="${tam}" viewBox="0 0 24 24" aria-hidden="true" ${extra}><path d="${ICONES[nome] || ''}"></path></svg>`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function $(sel, raiz = document) { return raiz.querySelector(sel); }
export function $$(sel, raiz = document) { return [...raiz.querySelectorAll(sel)]; }

export function toast(msg, tipo = 'info', ms = 4200) {
  const icone = tipo === 'err' ? 'xC' : tipo === 'ok' ? 'checkC' : 'info';
  const cor = tipo === 'err' ? 'var(--err-tx)' : tipo === 'ok' ? 'var(--ok-tx)' : 'var(--ac-tx)';
  const t = el(`<div class="toast ${tipo}" role="status"><span style="color:${cor};display:flex;padding-top:1px">${ic(icone, 16)}</span><div class="grow">${esc(msg)}</div></div>`);
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export function modal({ titulo, corpo, botoes = [], largo = false, aoFechar }) {
  const fundo = el(`<div class="fundo-modal" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
    <div class="modal ${largo ? 'largo' : ''}">
      <div class="modal-cab"><h2>${esc(titulo)}</h2><button class="ib" data-fechar aria-label="Close">${ic('x')}</button></div>
      <div class="modal-corpo"></div>
      <div class="modal-pe"></div>
    </div></div>`);
  const corpoEl = fundo.querySelector('.modal-corpo');
  if (typeof corpo === 'string') corpoEl.innerHTML = corpo; else if (corpo) corpoEl.appendChild(corpo);
  const pe = fundo.querySelector('.modal-pe');
  if (!botoes.length) pe.remove();
  const fechar = (v) => { fundo.remove(); document.removeEventListener('keydown', tecla); aoFechar && aoFechar(v); };
  for (const b of botoes) {
    const be = el(`<button class="btn ${b.classe || ''}">${esc(b.texto)}</button>`);
    be.onclick = async () => {
      if (b.acao) {
        const r = await b.acao(corpoEl);
        if (r === false) return;
      }
      fechar(b.valor);
    };
    pe.appendChild(be);
  }
  fundo.querySelector('[data-fechar]').onclick = () => fechar(null);
  fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fechar(null); });
  const tecla = (e) => { if (e.key === 'Escape') fechar(null); };
  document.addEventListener('keydown', tecla);
  document.body.appendChild(fundo);
  setTimeout(() => { const f = corpoEl.querySelector('input, textarea, select'); if (f) f.focus(); }, 30);
  return { fundo, corpo: corpoEl, fechar };
}

export function perguntar(titulo, rotulo, valor = '', dica = '') {
  return new Promise((res) => {
    const corpo = el(`<div class="prop"><label class="rotulo" for="pf-perg">${esc(rotulo)}</label><input id="pf-perg" class="campo" value="${esc(valor)}">${dica ? `<div class="dim" style="font-size:12px">${esc(dica)}</div>` : ''}</div>`);
    const inp = corpo.querySelector('input');
    let m;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = inp.value.trim(); m.fechar(); res(v || null); } });
    m = modal({ titulo, corpo, botoes: [{ texto: 'Cancel', valor: null }, { texto: 'OK', classe: 'pri', acao: () => { res(inp.value.trim() || null); } }], aoFechar: (v) => { if (v === null) res(null); } });
    setTimeout(() => { inp.select(); }, 40);
  });
}

export function confirmar(titulo, texto, botaoOk = 'Confirm', perigo = false) {
  return new Promise((res) => {
    modal({ titulo, corpo: `<p style="margin:0;color:var(--tx2)">${esc(texto)}</p>`, botoes: [{ texto: 'Cancel', valor: false }, { texto: botaoOk, classe: perigo ? 'pri perigo' : 'pri', valor: true }], aoFechar: (v) => res(!!v) });
  });
}

/** Troca {nome} pelos valores (assim a frase inteira pode ser traduzida). */
export function fmt(texto, v) { return texto.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); }

export function tempoRelativo(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return fmt('{n} min ago', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return fmt('{n} h ago', { n: h });
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return fmt('{n} days ago', { n: d });
  const me = Math.round(d / 30);
  return me <= 1 ? '1 month ago' : fmt('{n} months ago', { n: me });
}

export function iniciais(nome) {
  const p = String(nome || '?').split(/[\s\-_]+/).filter((x) => x.length > 0);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0] || '').slice(1, 2))).toUpperCase();
}

export function tintaDe(cor) {
  const m = { '#8FB0FF': '#1D2740', '#7EE2A0': '#17301F', '#D7B4FF': '#2A1F3A', '#FFD98A': '#33290F', '#FFB59A': '#3A2016', '#9FE7FF': '#14303A', '#FF9CC8': '#3A1A2A' };
  return m[cor] || '#1D2740';
}

export function separadorDe(caminho) { return caminho.includes('\\') ? '\\' : '/'; }
export function nomeBase(caminho) { return caminho.split(/[\\/]/).pop(); }
export function juntar(pasta, nome) { const s = separadorDe(pasta); return pasta.replace(/[\\/]+$/, '') + s + nome; }
export function relativo(raiz, caminho) {
  if (!caminho.toLowerCase().startsWith(raiz.toLowerCase())) return caminho;
  return caminho.slice(raiz.length).replace(/^[\\/]+/, '').replace(/\\/g, '/');
}
export function pai(caminho) { return caminho.replace(/[\\/][^\\/]*$/, ''); }

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Menu de contexto simples.
export function menuContexto(x, y, itens) {
  document.querySelectorAll('.ctx-menu').forEach((m) => m.remove());
  const m = el(`<div class="ctx-menu" role="menu"></div>`);
  for (const it of itens) {
    if (it === '-') { m.appendChild(el('<div class="menu-sep"></div>')); continue; }
    const b = el(`<button class="menu-item" role="menuitem">${esc(it.texto)}${it.kbd ? `<span class="kbd">${esc(it.kbd)}</span>` : ''}</button>`);
    b.onclick = () => { m.remove(); it.acao(); };
    m.appendChild(b);
  }
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  const fora = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', fora, true); } };
  setTimeout(() => document.addEventListener('mousedown', fora, true), 0);
}

// Barra de menus no estilo de app desktop.
export function barraMenus(container, menus) {
  container.innerHTML = '';
  let aberto = null;
  const fecharTodos = () => {
    container.querySelectorAll('.menu-pop').forEach((p) => p.remove());
    container.querySelectorAll('.menu-btn').forEach((b) => b.classList.remove('aberto'));
    aberto = null;
  };
  for (const [nome, itens] of Object.entries(menus)) {
    const w = el(`<div class="menu-wrap"><button class="menu-btn">${esc(nome)}</button></div>`);
    const btn = w.firstElementChild;
    const abrir = () => {
      fecharTodos();
      aberto = nome;
      btn.classList.add('aberto');
      const pop = el('<div class="menu-pop" role="menu"></div>');
      for (const it of itens) {
        if (it === '-') { pop.appendChild(el('<div class="menu-sep"></div>')); continue; }
        const b = el(`<button class="menu-item" role="menuitem"><span>${esc(typeof it.texto === 'function' ? it.texto() : it.texto)}</span>${it.kbd ? `<span class="kbd">${esc(it.kbd)}</span>` : ''}</button>`);
        b.onclick = () => { fecharTodos(); it.acao(); };
        pop.appendChild(b);
      }
      w.appendChild(pop);
    };
    btn.onclick = () => (aberto === nome ? fecharTodos() : abrir());
    btn.onmouseenter = () => { if (aberto && aberto !== nome) abrir(); };
    container.appendChild(w);
  }
  document.addEventListener('mousedown', (e) => { if (aberto && !container.contains(e.target)) fecharTodos(); });
}

// Markdown simples e seguro (o texto é escapado antes).
export function markdown(texto) {
  const partes = [];
  const re = /```([^\n`]*)\n([\s\S]*?)(```|$)/g;
  let ultimo = 0, m;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push({ tipo: 'texto', v: texto.slice(ultimo, m.index) });
    partes.push({ tipo: 'codigo', info: m[1].trim(), v: m[2].replace(/\n$/, ''), aberto: m[3] !== '```' });
    ultimo = re.lastIndex;
  }
  if (ultimo < texto.length) partes.push({ tipo: 'texto', v: texto.slice(ultimo) });
  return partes;
}

export function inlineMd(t) {
  let s = esc(t);
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

export function textoMd(t) {
  const linhas = t.split('\n');
  let html = '', lista = null, para = [];
  const fecharPara = () => { if (para.length) { html += '<p>' + para.map(inlineMd).join('<br>') + '</p>'; para = []; } };
  const fecharLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };
  for (const l of linhas) {
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { fecharPara(); fecharLista(); html += `<h3>${inlineMd(m[2])}</h3>`; continue; }
    if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { fecharPara(); if (lista !== 'ul') { fecharLista(); html += '<ul>'; lista = 'ul'; } html += `<li>${inlineMd(m[1])}</li>`; continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { fecharPara(); if (lista !== 'ol') { fecharLista(); html += '<ol>'; lista = 'ol'; } html += `<li>${inlineMd(m[1])}</li>`; continue; }
    if (!l.trim()) { fecharPara(); fecharLista(); continue; }
    fecharLista();
    para.push(l);
  }
  fecharPara(); fecharLista();
  return html;
}
