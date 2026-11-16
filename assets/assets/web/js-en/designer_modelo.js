import { normalizarLogica, logicaVazia } from './designer_logica.js';
import { EFEITOS } from './designer_animacao.js';

// Modelo de dados do Designer (versão 2): elementos com posição livre (x, y, w, h),
// restrições de redimensionamento (como no Figma) e conversão das telas da versão 1.

export const ID_OK = /^[a-z_][a-z0-9_]{0,40}$/;
export const COR_OK = /^#[0-9a-fA-F]{6}$/;

// Nomes que não podem virar self.<nome>: palavras do Python e métodos do Qt/Tk e da própria tela.
export const RESERVADOS = new Set(('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield ' +
  'self app estilo layout corpo tela mostrar esconder colocar fonte posicionar escala caminho rodar dica_no_campo mostrar_imagem ' +
  'show hide close update destroy title geometry resize move size width height pos x y font style children parent focus config configure ' +
  'after bind place pack grid lower lift raise_ event repaint layout palette cursor tooltip quit mainloop').split(' '));
export const nomeOk = (n) => ID_OK.test(n || '') && !RESERVADOS.has(n);

export const CORES_TEMA = {
  claro: { bg: '#FFFFFF', sup: '#F4F6F9', bd: '#D5DAE3', tx: '#1B1F27', mut: '#5A6170', barra: '#EEF0F4', trilho: '#E3E7EE' },
  escuro: { bg: '#16181D', sup: '#20232B', bd: '#323845', tx: '#E9ECF2', mut: '#A3AAB8', barra: '#0F1115', trilho: '#2A2F39' },
};

export const FONTES = ['', 'Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Consolas', 'Courier New'];

export const TAMANHOS_JANELA = [
  ['360x640', 'Phone, portrait (360 × 640)'], ['480x360', 'Small (480 × 360)'], ['640x460', 'Medium (640 × 460)'], ['800x600', 'Large (800 × 600)'],
  ['1024x768', 'Tablet / 1024 × 768'], ['1280x720', 'HD (1280 × 720)'], ['1440x900', 'Laptop (1440 × 900)'],
];

// Restrições: como o elemento se comporta quando a janela muda de tamanho.
export const REST_H = [['esq', 'Left'], ['dir', 'Right'], ['esqdir', 'Left and right (stretch)'], ['centro', 'Center'], ['escala', 'Scale (proportional)']];
export const REST_V = [['topo', 'Top'], ['base', 'Bottom'], ['topobase', 'Top and bottom (stretch)'], ['centro', 'Center'], ['escala', 'Scale (proportional)']];

export const TIPOS = {
  texto: { nome: 'Text', icone: 'texto', grupo: 'Basic', w: 200, h: 24, prefixo: 'texto', temTexto: true,
    cria: () => ({ texto: 'Text', tamanho: 14, negrito: false, italico: false, corTexto: '', fundo: '', alinhar: 'esquerda', alinharV: 'meio', fonte: '', quebra: true, raio: 0 }) },
  botao: { nome: 'Button', icone: 'botao', grupo: 'Basic', w: 120, h: 38, prefixo: 'botao', temTexto: true,
    cria: () => ({ texto: 'Button', primario: true, fundo: '', corTexto: '', borda: '', bordaLargura: 1, raio: 8, tamanho: 14, negrito: true, italico: false, fonte: '', aoClicar: '' }) },
  imagem: { nome: 'Image', icone: 'imagem', grupo: 'Basic', w: 160, h: 120, prefixo: 'imagem',
    cria: () => ({ arquivo: '', ajuste: 'conter' }) },
  campo: { nome: 'Text field', icone: 'campo', grupo: 'Input', w: 240, h: 36, prefixo: 'campo',
    cria: () => ({ placeholder: 'Type here…', texto: '', senha: false, tamanho: 14, fonte: '', fundo: '', corTexto: '', borda: '', raio: 6, aoMudar: '', aoEnter: '' }) },
  area: { nome: 'Text area', icone: 'area', grupo: 'Input', w: 240, h: 100, prefixo: 'area',
    cria: () => ({ placeholder: 'Write…', texto: '', tamanho: 14, fonte: '', fundo: '', corTexto: '', borda: '', raio: 6 }) },
  numero: { nome: 'Number', icone: 'numero', grupo: 'Input', w: 120, h: 34, prefixo: 'numero',
    cria: () => ({ minimo: 0, maximo: 100, valor: 0, passo: 1, tamanho: 14, fundo: '', corTexto: '', borda: '', raio: 6, aoMudar: '' }) },
  caixa: { nome: 'Checkbox', icone: 'caixaSel', grupo: 'Input', w: 180, h: 24, prefixo: 'caixa', temTexto: true,
    cria: () => ({ texto: 'Option', marcado: false, tamanho: 14, corTexto: '', aoMudar: '' }) },
  opcao: { nome: 'Option (radio)', icone: 'opcao', grupo: 'Input', w: 180, h: 24, prefixo: 'opcao', temTexto: true,
    cria: () => ({ texto: 'Option', marcado: false, grupoOpcao: 'opcoes', tamanho: 14, corTexto: '', aoMudar: '' }) },
  combo: { nome: 'Dropdown', icone: 'combo', grupo: 'Input', w: 200, h: 36, prefixo: 'escolha',
    cria: () => ({ itens: 'Option 1 Option 2 Option 3', tamanho: 14, fundo: '', corTexto: '', borda: '', raio: 6, aoMudar: '' }) },
  slider: { nome: 'Slider', icone: 'slider', grupo: 'Input', w: 200, h: 24, prefixo: 'slider',
    cria: () => ({ minimo: 0, maximo: 100, valor: 50, cor: '', aoMudar: '' }) },
  progresso: { nome: 'Progress bar', icone: 'progresso', grupo: 'Display', w: 200, h: 10, prefixo: 'progresso',
    cria: () => ({ valor: 40, cor: '', raio: 5 }) },
  lista: { nome: 'List', icone: 'lista', grupo: 'Display', w: 200, h: 140, prefixo: 'lista',
    cria: () => ({ itens: 'Item 1\nItem 2\nItem 3', tamanho: 14, fundo: '', corTexto: '', borda: '', raio: 6, aoMudar: '' }) },
  tabela: { nome: 'Table', icone: 'tabela', grupo: 'Display', w: 320, h: 160, prefixo: 'tabela',
    cria: () => ({ colunas: 'Name, Age', linhas: 'Ana, 30\nBruno, 25\nCarla, 41', tamanho: 13, fundo: '', corTexto: '', borda: '' }) },
  retangulo: { nome: 'Rectangle', icone: 'retangulo', grupo: 'Shapes', w: 200, h: 120, prefixo: 'retangulo',
    cria: () => ({ fundo: '', borda: '', bordaLargura: 1, raio: 12, sombra: false }) },
  elipse: { nome: 'Circle', icone: 'circulo', grupo: 'Shapes', w: 100, h: 100, prefixo: 'circulo',
    cria: () => ({ fundo: '', borda: '', bordaLargura: 1, sombra: false }) },
  linha: { nome: 'Line', icone: 'linhaReta', grupo: 'Shapes', w: 200, h: 2, prefixo: 'linha',
    cria: () => ({ cor: '' }) },
};

export const EVENTOS = {
  botao: [['aoClicar', 'On click', 'clique']],
  campo: [['aoMudar', 'When the text changes', 'mudanca'], ['aoEnter', 'When Enter is pressed', 'enter']],
  numero: [['aoMudar', 'When the number changes', 'mudanca']],
  caixa: [['aoMudar', 'When checked/unchecked', 'mudanca']],
  opcao: [['aoMudar', 'When checked/unchecked', 'mudanca']],
  combo: [['aoMudar', 'On choose', 'mudanca']],
  slider: [['aoMudar', 'When moved', 'mudanca']],
  lista: [['aoMudar', 'When an item is chosen', 'mudanca']],
};

/** Nome sugerido para o método de um evento. */
export function metodoSugerido(e, campo) {
  const base = e.nome.replace(/^(botao|campo|caixa|opcao|escolha|slider|numero|lista)_/, '') || e.nome;
  if (campo === 'aoClicar') return 'ao_clicar_' + base;
  if (campo === 'aoEnter') return 'ao_enter_' + base;
  return 'ao_mudar_' + base;
}

/** Cor efetiva de uma propriedade (vazio = padrão do tema). */
export function cor(e, prop, D) {
  const t = CORES_TEMA[D.tema] || CORES_TEMA.claro;
  const v = e[prop];
  if (v) return v;
  const campoLike = ['campo', 'area', 'numero', 'combo', 'lista', 'tabela'].includes(e.tipo);
  switch (prop) {
    case 'corTexto': return e.tipo === 'botao' && e.primario ? '#FFFFFF' : t.tx;
    case 'fundo':
      if (e.tipo === 'botao') return e.primario ? D.cor : t.bg;
      if (campoLike) return t.sup;
      if (e.tipo === 'retangulo') return t.sup;
      if (e.tipo === 'elipse') return D.cor;
      return '';
    case 'borda':
      if (e.tipo === 'botao') return e.primario ? '' : t.bd;
      if (campoLike) return t.bd;
      return '';
    case 'cor':
      if (e.tipo === 'linha') return t.bd;
      return D.cor;
    default: return '';
  }
}

export function fundoJanela(D) { return D.fundo || (CORES_TEMA[D.tema] || CORES_TEMA.claro).bg; }

export function escurecer(hex, f = 0.86) {
  if (!COR_OK.test(hex || '')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function luminancia(hex) {
  if (!COR_OK.test(hex || '')) return 1;
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Cria um elemento novo (sem id/nome: quem chama completa). */
export function criarBase(tipo, x = 0, y = 0, w, h) {
  const T = TIPOS[tipo];
  return Object.assign({ id: '', tipo, nome: '', x: Math.round(x), y: Math.round(y), w: Math.round(w ?? T.w), h: Math.round(h ?? T.h), rh: 'esq', rv: 'topo', visivel: true, bloqueado: false, habilitado: true, grupo: '', dica: '', animacao: '', animMs: 400, animAtraso: 0 }, T.cria());
}

export function novoDesign(nome) {
  const D = { versao: 2, nome, titulo: 'My window', largura: 640, altura: 460, tema: 'claro', cor: '#3A6AE0', fundo: '', redimensionavel: true, guias: { v: [], h: [] }, elementos: [], logica: logicaVazia() };
  const add = (tipo, nomeEl, x, y, w, h, extra = {}) => D.elementos.push(Object.assign(criarBase(tipo, x, y, w, h), { nome: nomeEl }, extra));
  add('texto', 'titulo', 32, 32, 576, 36, { texto: 'Hello!', tamanho: 26, negrito: true, rh: 'esqdir' });
  add('texto', 'instrucao', 32, 76, 576, 22, { texto: 'Type your name and click OK.', rh: 'esqdir' });
  add('campo', 'campo_nome', 32, 114, 576, 38, { placeholder: 'Your name', rh: 'esqdir' });
  add('botao', 'botao_ok', 32, 170, 120, 40, { texto: 'OK', aoClicar: 'ao_clicar_ok' });
  add('botao', 'botao_limpar', 164, 170, 120, 40, { texto: 'Clear', primario: false, negrito: false, aoClicar: 'ao_clicar_limpar' });
  D.elementos.forEach((e, i) => { e.id = 'e' + (i + 1); });
  return D;
}

// ---------- conversão da versão 1 (lista empilhada) para posição livre ----------
function larguraTexto(texto, tamanho) { return Math.ceil(String(texto || '').length * tamanho * 0.56); }

function migrarV1(d) {
  const W = Math.max(240, Math.min(1600, +d.largura || 640));
  const margem = Number.isFinite(+d.margem) ? +d.margem : 24;
  const esp = Number.isFinite(+d.espacamento) ? +d.espacamento : 12;
  const out = [];
  const alturaDe = (w) => ({ rotulo: Math.ceil((w.tamanho || 14) * 1.45) + 2, botao: 38, campo: 36, area: w.altura || 100, caixa: 24, combo: 36, slider: 24, progresso: 10, lista: w.altura || 140, separador: 1 }[w.tipo] || 30);
  const converter = (w, x, y, larg) => {
    const tipo = { rotulo: 'texto', separador: 'linha' }[w.tipo] || w.tipo;
    if (!TIPOS[tipo]) return null;
    const e = Object.assign(criarBase(tipo, x, y, larg, alturaDe(w)), w, { tipo, x, y, w: larg, h: alturaDe(w) });
    delete e.filhos; delete e.altura; delete e.largura;
    if (tipo === 'texto') { e.corTexto = w.cor || ''; delete e.cor; }
    if (tipo === 'linha') e.cor = '';
    return e;
  };
  let y = margem;
  for (const w of d.widgets || []) {
    if (!w) continue;
    if (w.tipo === 'espaco') { y += +w.altura || 16; continue; }
    if (w.tipo === 'linha') {
      const filhos = (w.filhos || []).filter((f) => f && f.tipo !== 'linha' && f.tipo !== 'espaco');
      if (!filhos.length) continue;
      const larguraLivre = W - margem * 2;
      const gap = Math.max(4, esp - 4);
      const fixos = filhos.map((f) => (f.tipo === 'botao' && f.largura !== 'preencher' ? larguraTexto(f.texto, 14) + 40 : f.tipo === 'caixa' ? larguraTexto(f.texto, 14) + 30 : 0));
      const flex = fixos.filter((v) => !v).length;
      const sobra = larguraLivre - fixos.reduce((a, b) => a + b, 0) - gap * (filhos.length - 1);
      const cadaFlex = flex ? Math.max(60, Math.floor(sobra / flex)) : 0;
      const larguras = fixos.map((v) => v || cadaFlex);
      const total = larguras.reduce((a, b) => a + b, 0) + gap * (filhos.length - 1);
      let x = margem;
      if (!flex && w.alinhar === 'direita') x = W - margem - total;
      if (!flex && w.alinhar === 'centro') x = Math.round((W - total) / 2);
      let alt = 0;
      filhos.forEach((f, i) => {
        const e = converter(f, x, y, larguras[i]);
        if (e) {
          if (!flex && w.alinhar === 'direita') e.rh = 'dir';
          out.push(e);
          alt = Math.max(alt, e.h);
        }
        x += larguras[i] + gap;
      });
      out.forEach((e) => { if (e.y === y && alt > e.h) e.y = y + Math.round((alt - e.h) / 2); });
      y += alt + esp;
      continue;
    }
    let larg = W - margem * 2;
    let rh = 'esqdir';
    if (w.tipo === 'botao' && w.largura !== 'preencher') { larg = larguraTexto(w.texto, 14) + 40; rh = 'esq'; }
    const e = converter(w, margem, y, larg);
    if (!e) continue;
    e.rh = rh;
    out.push(e);
    y += e.h + esp;
  }
  return {
    versao: 2, nome: d.nome, titulo: d.titulo, largura: W, altura: Math.max(+d.altura || 460, y + margem),
    tema: d.tema, cor: d.cor, fundo: '', redimensionavel: true, guias: { v: [], h: [] }, elementos: out,
  };
}

const num = (v, padrao, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao; };

/** Deixa qualquer design (v1, v2 ou vindo da IA) válido e consistente. */
export function normalizar(entrada) {
  let d = entrada && typeof entrada === 'object' ? JSON.parse(JSON.stringify(entrada)) : {};
  if (!Array.isArray(d.elementos) && Array.isArray(d.widgets)) d = migrarV1(d);
  const nome = ID_OK.test(d.nome || '') ? d.nome : 'principal';
  const D = { versao: 2, nome, titulo: String(d.titulo ?? 'My window') || 'My window', largura: Math.round(num(d.largura, 640, 160, 4000)), altura: Math.round(num(d.altura, 460, 120, 4000)),
    tema: CORES_TEMA[d.tema] ? d.tema : 'claro', cor: COR_OK.test(d.cor || '') ? d.cor.toUpperCase() : '#3A6AE0', fundo: COR_OK.test(d.fundo || '') ? d.fundo.toUpperCase() : '',
    redimensionavel: d.redimensionavel !== false, guias: { v: [], h: [] }, elementos: [] };
  D.rolagem = !!d.rolagem;
  D.alturaVisivel = Math.round(num(d.alturaVisivel, Math.min(D.altura, 560), 120, D.altura));
  if (d.guias) {
    D.guias.v = (d.guias.v || []).map(Number).filter(Number.isFinite).map(Math.round).slice(0, 60);
    D.guias.h = (d.guias.h || []).map(Number).filter(Number.isFinite).map(Math.round).slice(0, 60);
  }
  let n = 0;
  const vistos = new Set();
  const idsUsados = new Set();
  for (const bruto of d.elementos || []) {
    if (!bruto || typeof bruto !== 'object') continue;
    const tipo = { rotulo: 'texto', titulo: 'texto', separador: 'linha', circulo: 'elipse', radio: 'opcao' }[bruto.tipo] || bruto.tipo;
    if (!TIPOS[tipo]) continue;
    const base = criarBase(tipo);
    const e = Object.assign(base, bruto, { tipo });
    n++;
    // o id fica estável (os fios do editor de Funções apontam para ele)
    e.id = /^e\d{1,5}$/.test(bruto.id || '') && !idsUsados.has(bruto.id) ? bruto.id : '';
    if (e.id) idsUsados.add(e.id);
    e.x = Math.round(num(e.x, 24, -5000, 9000)); e.y = Math.round(num(e.y, 24, -5000, 9000));
    e.w = Math.round(num(e.w, TIPOS[tipo].w, 1, 9000)); e.h = Math.round(num(e.h, TIPOS[tipo].h, 1, 9000));
    if (!REST_H.some(([k]) => k === e.rh)) e.rh = 'esq';
    if (!REST_V.some(([k]) => k === e.rv)) e.rv = 'topo';
    for (const k of ['fundo', 'corTexto', 'borda', 'cor']) if (k in e && e[k] && !COR_OK.test(e[k])) e[k] = '';
    for (const k of ['fundo', 'corTexto', 'borda', 'cor']) if (e[k]) e[k] = e[k].toUpperCase();
    for (const k of ['tamanho']) if (k in e) e[k] = Math.round(num(e[k], 14, 6, 200));
    for (const k of ['raio', 'bordaLargura']) if (k in e) e[k] = Math.round(num(e[k], 0, 0, 500));
    for (const k of ['minimo', 'maximo', 'valor', 'passo']) if (k in e) e[k] = Math.round(num(e[k], 0, -1e9, 1e9));
    if (tipo === 'progresso') e.valor = Math.max(0, Math.min(100, e.valor));
    if (!FONTES.includes(e.fonte)) e.fonte = '';
    if (!EFEITOS.has(e.animacao) || e.animacao === 'sumir') e.animacao = '';
    e.animMs = Math.round(num(e.animMs, 400, 50, 10000)); e.animAtraso = Math.round(num(e.animAtraso, 0, 0, 60000));
    e.visivel = e.visivel !== false; e.bloqueado = !!e.bloqueado; e.habilitado = e.habilitado !== false;
    e.grupo = /^g\d{1,4}$/.test(e.grupo || '') ? e.grupo : '';
    if (!ID_OK.test(e.grupoOpcao || 'opcoes')) e.grupoOpcao = 'opcoes';
    if (typeof e.arquivo === 'string') e.arquivo = e.arquivo.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\.\//g, '');
    for (const ev of EVENTOS[tipo] || []) if (e[ev[0]] && !nomeOk(e[ev[0]])) e[ev[0]] = '';
    let nm = ID_OK.test(e.nome || '') ? e.nome : TIPOS[tipo].prefixo + '_' + n;
    if (RESERVADOS.has(nm)) nm += '_1';
    let i = 2;
    const raizNome = nm;
    while (vistos.has(nm)) nm = `${raizNome}_${i++}`;
    vistos.add(nm);
    e.nome = nm;
    // tira chaves que não pertencem ao tipo
    const permitidas = new Set(Object.keys(base));
    for (const k of Object.keys(e)) if (!permitidas.has(k)) delete e[k];
    D.elementos.push(e);
  }
  let prox = Math.max(0, ...D.elementos.map((e) => +e.id.slice(1) || 0));
  for (const e of D.elementos) if (!e.id) e.id = 'e' + (++prox);
  D.logica = normalizarLogica(d.logica, D);
  return D;
}

/** Caixa que envolve uma lista de elementos. */
export function caixaDe(els) {
  if (!els.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const e of els) { x1 = Math.min(x1, e.x); y1 = Math.min(y1, e.y); x2 = Math.max(x2, e.x + e.w); y2 = Math.max(y2, e.y + e.h); }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Aplica as restrições quando a janela muda de W0×H0 para W1×H1 (mesma conta do código gerado). */
export function reposicionar(orig, W0, H0, W1, H1) {
  let { x, y, w, h } = orig;
  const dl = W1 - W0, da = H1 - H0, el = W1 / W0, ea = H1 / H0;
  switch (orig.rh) {
    case 'dir': x += dl; break;
    case 'esqdir': w += dl; break;
    case 'centro': x += dl / 2; break;
    case 'escala': x *= el; w *= el; break;
  }
  switch (orig.rv) {
    case 'base': y += da; break;
    case 'topobase': h += da; break;
    case 'centro': y += da / 2; break;
    case 'escala': y *= ea; h *= ea; break;
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

// ---------- modelos prontos (inseridos como grupo) ----------
// Cartões: branco com borda clara no tema claro; superfície do tema no escuro.
const cartaoCores = (D) => (D.tema === 'escuro' ? { fundo: '', borda: (CORES_TEMA.escuro).bd } : { fundo: '#FFFFFF', borda: '#E3E7EE' });
export const MODELOS = [
  { id: 'barra', nome: 'Top bar', icone: 'janela', fixoNoTopo: true, cria: (D) => [
    ['retangulo', 'barra_topo', 0, 0, D.largura, 56, { fundo: D.cor, raio: 0, rh: 'esqdir' }],
    ['texto', 'titulo_barra', 20, 14, 300, 28, { texto: D.titulo, tamanho: 18, negrito: true, corTexto: '#FFFFFF' }],
    ['botao', 'botao_menu', D.largura - 112, 10, 96, 36, { texto: 'Menu', primario: false, fundo: '#FFFFFF', corTexto: D.cor, borda: '#FFFFFF', rh: 'dir', aoClicar: 'ao_clicar_menu' }],
  ] },
  { id: 'login', nome: 'Login', icone: 'chave', cria: (D) => [
    ['retangulo', 'cartao_login', 0, 0, 340, 300, { raio: 16, sombra: true, ...cartaoCores(D) }],
    ['texto', 'titulo_login', 28, 26, 284, 34, { texto: 'Join', tamanho: 24, negrito: true }],
    ['campo', 'campo_usuario', 28, 80, 284, 38, { placeholder: 'Username' }],
    ['campo', 'campo_senha', 28, 130, 284, 38, { placeholder: 'Password', senha: true, aoEnter: 'ao_clicar_entrar' }],
    ['botao', 'botao_entrar', 28, 188, 284, 42, { texto: 'Join', aoClicar: 'ao_clicar_entrar' }],
    ['texto', 'texto_esqueci', 28, 246, 284, 22, { texto: 'Forgot my password', tamanho: 13, alinhar: 'centro', corTexto: D.cor }],
  ] },
  { id: 'cartao', nome: 'Card', icone: 'retangulo', cria: (D) => [
    ['retangulo', 'cartao', 0, 0, 300, 170, { raio: 14, sombra: true, ...cartaoCores(D) }],
    ['texto', 'cartao_titulo', 20, 18, 260, 26, { texto: 'Card title', tamanho: 17, negrito: true }],
    ['texto', 'cartao_texto', 20, 50, 260, 48, { texto: 'A short description of what this card shows.', tamanho: 13, alinharV: 'topo', corTexto: (CORES_TEMA[D.tema] || CORES_TEMA.claro).mut }],
    ['botao', 'botao_cartao', 20, 114, 120, 38, { texto: 'See more', aoClicar: 'ao_clicar_ver_mais' }],
  ] },
  { id: 'busca', nome: 'Search bar', icone: 'busca', cria: () => [
    ['campo', 'campo_busca', 0, 0, 280, 40, { placeholder: 'Search…', aoEnter: 'ao_clicar_buscar' }],
    ['botao', 'botao_buscar', 290, 0, 100, 40, { texto: 'Search', aoClicar: 'ao_clicar_buscar' }],
  ] },
  { id: 'formulario', nome: 'Form', icone: 'formatar', cria: () => [
    ['texto', 'rotulo_nome', 0, 0, 320, 20, { texto: 'Name', tamanho: 13, negrito: true }],
    ['campo', 'campo_nome', 0, 24, 320, 38, { placeholder: 'Your full name' }],
    ['texto', 'rotulo_email', 0, 76, 320, 20, { texto: 'E-mail', tamanho: 13, negrito: true }],
    ['campo', 'campo_email', 0, 100, 320, 38, { placeholder: 'you@example.com' }],
    ['caixa', 'caixa_termos', 0, 152, 320, 24, { texto: 'I accept the terms of use' }],
    ['botao', 'botao_enviar', 0, 192, 140, 40, { texto: 'Send', aoClicar: 'ao_clicar_enviar' }],
  ] },
  { id: 'rodape', nome: 'OK / Cancel buttons', icone: 'botao', fixoNaBase: true, cria: (D) => [
    ['botao', 'botao_cancelar', D.largura - 260, D.altura - 64, 110, 40, { texto: 'Cancel', primario: false, negrito: false, rh: 'dir', rv: 'base', aoClicar: 'ao_clicar_cancelar' }],
    ['botao', 'botao_confirmar', D.largura - 140, D.altura - 64, 110, 40, { texto: 'OK', rh: 'dir', rv: 'base', aoClicar: 'ao_clicar_confirmar' }],
  ] },
];
