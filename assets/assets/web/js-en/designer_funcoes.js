// Editor "Funções": cubos dos elementos ligados por fios a blocos de função (estilo Blueprint/Scratch).
import { el, esc, ic, toast, menuContexto, confirmar } from './ui.js';
import { TIPOS, nomeOk } from './designer_modelo.js';
import {
  FUNCOES, GRUPOS_FUNCAO, PORTAS_ELEMENTO, PORTAS_TELA, TIPOS_PORTA, TIPOS_VAR, ALVOS,
  portasDoNo, compativel, normalizarLogica, ehPorta, resolverTipo, variaveisVisiveis, acharVar, referenciasTexto, telasDoProjeto,
} from './designer_logica.js';

const DESC_ELEMENTO = {
  botao: 'When someone clicks, follows the ▶ wire.',
  campo: 'Fires when someone types and gives the typed text.',
  area: 'Gives the written text.',
  numero: 'Fires when the number changes and gives the number.',
  caixa: 'Fires when checked/unchecked and tells if it is checked.',
  opcao: 'Fires when it gets checked and tells if it is checked.',
  combo: 'Fires when someone chooses and gives the chosen option.',
  slider: 'Fires when moved and gives the value.',
  lista: 'Fires when someone chooses an item and gives the item.',
};
const NOME_TIPO_VAR = Object.fromEntries(TIPOS_VAR);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const ehVarCampo = (tipo) => tipo === 'var' || tipo.startsWith('var:');
const TEXTUAIS = new Set(['texto', 'qualquer', 'numero']);

/**
 * @param {HTMLElement} raiz
 * @param {{ D: () => object, mudou: () => void, codigo: () => string, trilha?: () => string[], voltar?: () => void,
 *           entrarTela?: (nome: string) => void, criarTelinha?: () => Promise<string|null> }} ctx
 */
export function criarEditorFuncoes(raiz, ctx) {
  const cam = { x: 40, y: 60, z: 1 };
  let sel = null; // { tipo: 'no'|'fio', id }
  let primeiraVez = true;
  let mostrarCodigo = false;
  let varsAberto = true;

  raiz.innerHTML = `<div class="fn-area" data-fa tabindex="-1">
      <div class="fn-mundo" data-fm><svg class="fn-fios" data-fs width="1" height="1"></svg><div data-fn></div></div>
    </div>
    <div class="fn-trilha" data-trilha></div>
    <div class="fn-barra flutua" style="top:12px;bottom:auto">
      <button class="btn peq pri" data-add>${ic('mais', 14)}Add function</button>
      <button class="btn peq ghost" data-org title="Arrange the blocks automatically">${ic('grade', 14)}Arrange</button>
      <span class="ds-sep"></span>
      <button class="ib" data-zm aria-label="Zoom out">${ic('menos', 15)}</button><span class="mono" data-zv style="min-width:44px;text-align:center;font-size:12px"></span><button class="ib" data-zp aria-label="Zoom in">${ic('mais', 15)}</button>
      <span class="ds-sep"></span>
      <button class="btn peq ghost" data-cod>${ic('codigo', 14)}View code</button>
    </div>
    <aside class="fn-vars" data-vars>
      <div class="fn-vars-cab"><button class="fn-vars-tit grow" data-vtog aria-expanded="true"><span data-vseta>▾</span> Variables <span class="dim" data-vqtd></span></button><button class="btn peq" data-novavar title="Create a variable">${ic('mais', 13)}New</button></div>
      <div class="fn-vars-corpo" data-vcorpo>
        <div class="fn-vars-lista" data-vlista></div>
        <div class="fn-vars-dica">Drag a variable onto the area to get its value. In a text, write <span class="mono">{nome}</span> or use the button <span class="mono">{x}</span>.</div>
      </div>
    </aside>
    <div class="fn-dica" data-dica>Drag from the dot <b>▶</b> from an element to a function. Right-click the background: add function.</div>
    <aside class="fn-prev" data-prev style="display:none"><div class="flex" style="padding:10px 12px;border-bottom:1px solid var(--bd)"><strong class="grow" style="font-size:13px">Code the wires generate</strong><button class="ib peq" data-fprev aria-label="Close">${ic('x', 14)}</button></div><pre class="mono" data-pcod></pre></aside>`;
  const area = raiz.querySelector('[data-fa]');
  const mundo = raiz.querySelector('[data-fm]');
  const svg = raiz.querySelector('[data-fs]');
  const camada = raiz.querySelector('[data-fn]');

  const D = () => ctx.D();
  const L = () => D().logica;
  const ponto = (ev) => { const r = area.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const s2w = (p) => ({ x: (p.x - cam.x) / cam.z, y: (p.y - cam.y) / cam.z });
  const centroTela = () => { const r = area.getBoundingClientRect(); return s2w({ x: r.width / 2, y: r.height / 2 }); };
  const proximoNo = () => 'f' + (Math.max(0, ...L().nos.map((n) => +n.id.slice(1) || 0)) + 1);
  const elementosComPortas = () => D().elementos.filter((e) => PORTAS_ELEMENTO[e.tipo] && e.tipo !== 'texto');
  const tipoPorta = (ref, dir) => { const [no, p] = ref.split(':'); const x = portasDoNo(no, D()).find((q) => q.chave === p && q.dir === dir); return x ? x.tipo : null; };
  const repeticoes = () => L().nos.filter((n) => n.fn === 'aCada');
  const rotuloRepeticao = (n) => `Repeat ${repeticoes().indexOf(n) + 1} (every ${n.valores.segundos} s)`;

  function aplicarCamera() {
    mundo.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
    raiz.querySelector('[data-zv]').textContent = Math.round(cam.z * 100) + '%';
    area.style.backgroundSize = `${24 * cam.z}px ${24 * cam.z}px`;
    area.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
  }

  // posições padrão dos cubos de elemento (coluna da esquerda)
  function posicoes() {
    const pos = { ...L().pos };
    let y = 0;
    if (!pos.tela) pos.tela = { x: 0, y: -190 };
    for (const e of elementosComPortas()) {
      if (!pos[e.id]) pos[e.id] = { x: 0, y };
      y = Math.max(y, pos[e.id].y) + 60 + (PORTAS_ELEMENTO[e.tipo].length * 30);
    }
    return pos;
  }

  // ---------------------------------------------------------------- desenho
  function porta(ref, dir, tipo, rotulo, ligado) {
    const t = TIPOS_PORTA[tipo] || TIPOS_PORTA.qualquer;
    return `<span class="fp ${dir} ${tipo === 'exec' ? 'exec' : ''} ${ligado ? 'ligada' : ''}" data-p="${esc(ref)}" data-dir="${dir}" data-t="${tipo}" style="--pc:${t.cor}" title="${esc((rotulo || '') + ' (' + t.nome + ')')}"></span>`;
  }
  const linhaSaida = (ref, tipo, rotulo) => `<div class="fn-lin out"><span class="grow">${esc(rotulo)}</span>${porta(ref, 'out', tipo, rotulo, L().fios.some((f) => f.de === ref))}</div>`;

  function htmlElemento(e, p) {
    const T = TIPOS[e.tipo];
    const rotulo = e.texto || e.placeholder || '';
    const linhas = PORTAS_ELEMENTO[e.tipo].map(([chave, tipo, nome]) => linhaSaida(`${e.id}:${chave}`, tipo, nome)).join('');
    return `<div class="fn-no fn-el" data-no="${e.id}" style="left:${p.x}px;top:${p.y}px">
      <div class="fn-cab" style="--c:#2F5BC2">${ic(T.icone, 14)}<span class="grow ellipsis">${esc(T.nome)}${rotulo ? ` “${esc(rotulo.slice(0, 22))}”` : ''}</span></div>
      <div class="fn-sub mono">${esc(e.nome)}</div>
      <div class="fn-desc">${esc(DESC_ELEMENTO[e.tipo] || '')}</div>${linhas}</div>`;
  }

  function htmlTela(p) {
    return `<div class="fn-no fn-tela" data-no="tela" style="left:${p.x}px;top:${p.y}px">
      <div class="fn-cab" style="--c:#2F8A5B">${ic('janela', 14)}<span class="grow ellipsis">Window “${esc(D().titulo)}”</span></div>
      <div class="fn-sub mono">${esc(D().nome)}</div>
      <div class="fn-desc">“On open” runs once when the window opens. “On close” runs when it is closed (with “Stop here”, it does not let it close).</div>
      ${PORTAS_TELA.map(([chave, tipo, nome]) => linhaSaida(`screen:${chave}`, tipo, nome)).join('')}</div>`;
  }

  function opcoesAlvo(tipo, valor) {
    const aceitos = ALVOS[tipo];
    const lista = D().elementos.filter((e) => !aceitos || aceitos.includes(e.tipo));
    if (!lista.length) return `<option value="">(none on this screen)</option>`;
    return `<option value="">Choose…</option>` + lista.map((e) => `<option value="${e.id}" ${e.id === valor ? 'selected' : ''}>${esc(e.nome)} (${esc(TIPOS[e.tipo].nome)})</option>`).join('');
  }
  function opcoesVar(tipo, valor) {
    const quer = tipo.startsWith('var:') ? tipo.slice(4) : null;
    const vs = variaveisVisiveis(D()).filter((v) => !quer || v.tipo === quer);
    return `<option value="">${vs.length ? 'Choose…' : '(none yet)'}</option>` + vs.map((v) => `<option value="${esc(v.nome)}" ${v.nome === valor ? 'selected' : ''}>${esc(v.nome)} · ${esc(NOME_TIPO_VAR[v.tipo])}${v.global || v.tela ? ' 🌐' : ''}</option>`).join('')
      + `<option value="__nova">＋ New variable${quer ? ' (' + NOME_TIPO_VAR[quer].toLowerCase() + ')' : ''}…</option>`;
  }
  function opcoesTela(valor) {
    const ts = telasDoProjeto().filter((t) => t.nome !== D().nome);
    const existe = !valor || ts.some((t) => t.nome === valor);
    return `<option value="">${ts.length ? 'Choose…' : '(none yet)'}</option>` + ts.map((t) => `<option value="${esc(t.nome)}" ${t.nome === valor ? 'selected' : ''}>${esc(t.nome)} — ${esc(t.titulo || '')}</option>`).join('')
      + (existe ? '' : `<option value="${esc(valor)}" selected>${esc(valor)} (not found)</option>`)
      + '<option value="__telinha">＋ Create a new small screen…</option>';
  }

  // linha de uma entrada do bloco (com bolinha quando dá para ligar um fio)
  function htmlEntrada(n, ent) {
    const [chave, tipoBruto, rotulo, , opcoes] = ent;
    const ref = `${n.id}:${chave}`;
    const v = n.valores[chave] ?? '';
    const sel = (html) => `<div class="fn-lin"><span class="fn-rot">${esc(rotulo)}</span><select class="sel campo fn-campo" data-k="${chave}">${html}</select></div>`;
    if (tipoBruto.startsWith('elemento')) return sel(opcoesAlvo(tipoBruto, v));
    if (ehVarCampo(tipoBruto)) return sel(opcoesVar(tipoBruto, v));
    if (tipoBruto === 'tela') return sel(opcoesTela(v));
    if (tipoBruto === 'escolha') return sel(opcoes.map(([k, r]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(r)}</option>`).join(''));
    if (tipoBruto === 'repeticao') {
      const rs = repeticoes();
      return sel(`<option value="">${rs.length ? 'Choose…' : '(add a “Repeat every”)'}</option>` + rs.map((r) => `<option value="${r.id}" ${r.id === v ? 'selected' : ''}>${esc(rotuloRepeticao(r))}</option>`).join(''));
    }
    const tipo = resolverTipo(tipoBruto, n, D());
    const fio = L().fios.find((f) => f.para === ref);
    let editor;
    if (fio) editor = `<span class="fn-ligado" title="Comes from the wire">⟵ ${esc(descreverOrigem(fio.de))}</span>`;
    else if (tipo === 'bool') editor = `<select class="sel campo fn-campo" data-k="${chave}"><option value="sim" ${v !== 'nao' ? 'selected' : ''}>Sim</option><option value="nao" ${v === 'nao' ? 'selected' : ''}>No</option></select>`;
    else if (tipoBruto === 'cor') editor = `<input type="color" class="fn-campo fn-cor" data-k="${chave}" value="${/^#[0-9a-fA-F]{6}$/.test(v) ? v : '#E2657A'}" aria-label="${esc(rotulo)}"><span class="mono dim" style="font-size:11px">${esc(v)}</span>`;
    else if (tipo === 'lista') editor = `<input class="campo fn-campo" data-k="${chave}" value="${esc(v)}" placeholder="a, b, c (or wire a list)">`;
    else {
      const temRef = /\{[a-z_][a-z0-9_]*\}/.test(v);
      editor = `<input class="campo fn-campo ${temRef ? 'fn-tem-ref' : ''}" data-k="${chave}" value="${esc(v)}" placeholder="${tipo === 'numero' ? '0 or {variable}' : 'text or {variable}'}" ${tipo === 'numero' ? 'inputmode="decimal"' : ''} spellcheck="false">`
        + (TEXTUAIS.has(tipo) ? `<button class="fn-ins" data-ins="${chave}" title="Put a variable's value in here">{x}</button>` : '');
    }
    return `<div class="fn-lin in">${porta(ref, 'in', tipo, rotulo, !!fio)}<span class="fn-rot">${esc(rotulo)}</span>${editor}</div>`;
  }

  // miniatura da telinha que o bloco "Abrir outra tela" abre
  function htmlPreviaTela(nome) {
    if (!nome) return '<div class="fn-tela-vazia">Pick a screen above or create a new small screen.</div>';
    const t = telasDoProjeto().find((x) => x.nome === nome);
    if (!t) return `<div class="fn-tela-vazia">Could not find the screen “${esc(nome)}”.</div>`;
    const W = Math.max(120, +t.largura || 640), H = Math.max(80, +t.altura || 460);
    const s = Math.min(212 / W, 150 / H);
    const escuro = t.tema === 'escuro';
    const caixas = (t.elementos || []).filter((e) => e && e.visivel !== false).slice(0, 80).map((e) => {
      const k = { botao: 'b', campo: 'c', area: 'c', numero: 'c', combo: 'c', texto: 't', retangulo: 'r', elipse: 'r', imagem: 'r' }[e.tipo] || 'o';
      return `<i class="fn-mini-${k}" style="left:${Math.round(e.x * s)}px;top:${Math.round(e.y * s)}px;width:${Math.max(3, Math.round(e.w * s))}px;height:${Math.max(2, Math.round(e.h * s))}px;${k === 'b' && e.primario !== false ? `background:${esc(t.cor || '#3A6AE0')}` : ''}"></i>`;
    }).join('');
    const clicaveis = (t.elementos || []).filter((e) => e && (PORTAS_ELEMENTO[e.tipo] || []).some((p) => p[1] === 'exec'));
    const ligados = new Set(((t.logica && t.logica.fios) || []).map((f) => String(f.de).split(':')[0]));
    const chips = clicaveis.slice(0, 8).map((e) => `<span class="fn-chip ${ligados.has(e.id) ? 'ok' : ''}" title="${ligados.has(e.id) ? 'Already has a function wired' : 'No function yet'}">${ic(TIPOS[e.tipo] ? TIPOS[e.tipo].icone : 'botao', 11)}${esc(e.texto || e.nome)}</span>`).join('');
    return `<div class="fn-tela-prev" data-entrar="${esc(nome)}" title="Click to enter the small screen and wire up its buttons">
      <div class="fn-mini ${escuro ? 'escuro' : ''}" style="width:${Math.round(W * s)}px;height:${Math.round(H * s)}px">${caixas}</div>
      <div class="fn-mini-tit">${esc(t.titulo || nome)}</div>
      ${chips ? `<div class="fn-chips">${chips}</div>` : '<div class="fn-tela-vazia">This small screen has no buttons yet.</div>'}
      <span class="btn peq pri fn-entrar">${ic('direita', 13)}Enter the small screen</span></div>`;
  }

  function htmlNo(n) {
    const F = FUNCOES[n.fn];
    const entrada = F.exec ? porta(`${n.id}:entrada`, 'in', 'exec', 'Input', L().fios.some((f) => f.para === `${n.id}:entrada`)) : '';
    const linhas = F.entradas.map((ent) => htmlEntrada(n, ent));
    if (n.fn === 'abrirTela') linhas.push(htmlPreviaTela(n.valores.tela));
    for (const [chave, tipo, rotulo] of F.exec ? F.saidas || [['depois', 'exec', 'After']] : []) linhas.push(linhaSaida(`${n.id}:${chave}`, tipo, rotulo));
    for (const [chave, tipo, rotulo] of F.saidasDados || []) linhas.push(linhaSaida(`${n.id}:${chave}`, tipo, rotulo));
    if (F.dados) linhas.push(linhaSaida(`${n.id}:${F.saida[0]}`, resolverTipo(F.saida[1], n, D()), F.saida[2]));
    const titulo = n.fn === 'aCada' ? `${F.nome} · ${repeticoes().indexOf(n) + 1}` : F.nome;
    return `<div class="fn-no fn-fn ${n.fn === 'abrirTela' ? 'fn-abre' : ''} ${sel && sel.tipo === 'no' && sel.id === n.id ? 'on' : ''}" data-no="${n.id}" style="left:${n.x}px;top:${n.y}px">
      <div class="fn-cab" style="--c:${F.cor}">${entrada}<span class="grow ellipsis">${esc(titulo)}</span></div>
      <div class="fn-desc">${esc(F.desc)}</div>${linhas.join('')}</div>`;
  }

  function descreverOrigem(ref) {
    const [no, p] = ref.split(':');
    const e = D().elementos.find((x) => x.id === no);
    if (e) return `${e.nome}.${(PORTAS_ELEMENTO[e.tipo].find((x) => x[0] === p) || [p, '', p])[2].toLowerCase()}`;
    const n = L().nos.find((x) => x.id === no);
    if (!n) return ref;
    const F = FUNCOES[n.fn];
    if (n.fn === 'lerVar' && n.valores.nome) return n.valores.nome;
    const saida = (F.saidasDados || []).find((x) => x[0] === p);
    return saida ? `${F.nome}: ${saida[2].toLowerCase()}` : F.nome;
  }

  function pintarTrilha() {
    const tr = ctx.trilha ? ctx.trilha() : [D().nome];
    const box = raiz.querySelector('[data-trilha]');
    box.innerHTML = (tr.length > 1 ? `<button class="btn peq" data-volta>${ic('esquerda', 13)}Back to ${esc(tr[tr.length - 2])}</button>` : '')
      + `<span class="fn-caminho">${tr.map((t, i) => `<span class="${i === tr.length - 1 ? 'atual' : ''}">${esc(t)}</span>`).join('<span class="dim"> › </span>')}</span>`;
    const b = box.querySelector('[data-volta]');
    if (b) b.onclick = () => ctx.voltar && ctx.voltar();
  }

  function pintarVars() {
    const vs = variaveisVisiveis(D());
    raiz.querySelector('[data-vqtd]').textContent = vs.length ? `(${vs.length})` : '';
    raiz.querySelector('[data-vseta]').textContent = varsAberto ? '▾' : '▸';
    raiz.querySelector('[data-vtog]').setAttribute('aria-expanded', String(varsAberto));
    raiz.querySelector('[data-vcorpo]').style.display = varsAberto ? '' : 'none';
    const lista = raiz.querySelector('[data-vlista]');
    lista.innerHTML = vs.length ? vs.map((v) => `<div class="fn-var" data-var="${esc(v.nome)}" title="${v.tela ? `Shared variable from screen ${esc(v.tela)}` : 'Click to edit · drag onto the area'}">
        <span class="fn-bola" style="background:${TIPOS_PORTA[v.tipo].cor}"></span>
        <span class="grow" style="min-width:0"><span class="mono ellipsis" style="display:block">${esc(v.nome)}</span><span class="dim fn-var-info">${esc(NOME_TIPO_VAR[v.tipo])}${v.global || v.tela ? ' · 🌐 all screens' : ''}${v.tela ? ` · of ${esc(v.tela)}` : ''}</span></span>
        <button class="ib peq" data-pegar title="Block that gets the value">${ic('esquerda', 13)}</button><button class="ib peq" data-mudar title="Block that changes the value">${ic('editar', 13)}</button>
      </div>`).join('') : '<div class="fn-vars-vazio">No variables yet. A variable stores a value under a name (e.g. <span class="mono">pontos</span>, <span class="mono">nome</span>) to use later.</div>';
    lista.querySelectorAll('.fn-var').forEach((row) => {
      const nome = row.dataset.var;
      row.querySelector('[data-pegar]').onclick = (e) => { e.stopPropagation(); criarNo('lerVar', centroTela(), null, { nome }); };
      row.querySelector('[data-mudar]').onclick = (e) => {
        e.stopPropagation();
        const v = acharVar(nome, D());
        criarNo(v && v.tipo === 'numero' ? 'somarVar' : v && v.tipo === 'lista' ? 'adicionarNaLista' : v && v.tipo === 'bool' ? 'alternarVar' : 'definirVar', centroTela(), null, { nome });
      };
      row.addEventListener('pointerdown', (ev) => arrastarVar(ev, row, nome));
    });
  }

  function pintar() {
    if (!D().logica) D().logica = { vars: [], nos: [], fios: [], pos: {} };
    const pos = posicoes();
    const partes = [htmlTela(pos.tela)];
    for (const e of elementosComPortas()) partes.push(htmlElemento(e, pos[e.id]));
    for (const n of L().nos) partes.push(htmlNo(n));
    camada.innerHTML = partes.join('');
    if (!elementosComPortas().length) camada.insertAdjacentHTML('beforeend', `<div class="fn-vazio" style="left:0;top:${pos.tela.y + 170}px">This screen has no buttons or fields yet.<br>Go back to the tab <b>Design</b> e adicione alguns.</div>`);
    ligarCampos();
    pintarTrilha();
    pintarVars();
    aplicarCamera();
    requestAnimationFrame(() => desenharFios());
    if (primeiraVez) { primeiraVez = false; requestAnimationFrame(enquadrar); }
    if (mostrarCodigo) pintarCodigo();
    raiz.querySelector('[data-dica]').style.display = L().fios.length ? 'none' : '';
  }

  function centroPorta(ref) {
    const p = camada.querySelector(`.fp[data-p="${CSS.escape(ref)}"]`);
    if (!p) return null;
    const r = p.getBoundingClientRect();
    const m = mundo.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - m.left) / cam.z, y: (r.top + r.height / 2 - m.top) / cam.z };
  }
  const curva = (a, b) => { const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; };

  function desenharFios(temp) {
    const partes = [];
    L().fios.forEach((f, i) => {
      const a = centroPorta(f.de), b = centroPorta(f.para);
      if (!a || !b) return;
      const tipo = tipoPorta(f.de, 'out') || 'qualquer';
      const on = sel && sel.tipo === 'fio' && sel.id === i;
      partes.push(`<path class="fn-fio-hit" data-fio="${i}" d="${curva(a, b)}"></path><path class="fn-fio ${tipo === 'exec' ? 'exec' : ''} ${on ? 'on' : ''}" d="${curva(a, b)}" style="--fc:${(TIPOS_PORTA[tipo] || TIPOS_PORTA.qualquer).cor}"></path>`);
    });
    if (temp) partes.push(`<path class="fn-fio temp ${temp.tipo === 'exec' ? 'exec' : ''}" d="${curva(temp.a, temp.b)}" style="--fc:${(TIPOS_PORTA[temp.tipo] || TIPOS_PORTA.qualquer).cor}"></path>`);
    svg.innerHTML = partes.join('');
  }

  function enquadrar() {
    const nos = [...camada.querySelectorAll('.fn-no')];
    if (!nos.length) return;
    const r = area.getBoundingClientRect();
    const m = mundo.getBoundingClientRect();
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nos) { const b = n.getBoundingClientRect(); x1 = Math.min(x1, (b.left - m.left) / cam.z); y1 = Math.min(y1, (b.top - m.top) / cam.z); x2 = Math.max(x2, (b.right - m.left) / cam.z); y2 = Math.max(y2, (b.bottom - m.top) / cam.z); }
    const esq = varsAberto ? 250 : 20; // deixa espaço para o painel de variáveis
    const z = lim(Math.min((r.width - esq - 60) / (x2 - x1), (r.height - 140) / (y2 - y1)), 0.3, 1);
    cam.z = z; cam.x = esq + (r.width - esq - (x2 - x1) * z) / 2 - x1 * z; cam.y = 70 + (r.height - 70 - (y2 - y1) * z) / 2 - y1 * z;
    aplicarCamera();
    desenharFios();
  }

  function pintarCodigo() {
    const pre = raiz.querySelector('[data-pcod]');
    const linhas = ctx.codigo().split('\n');
    const out = [];
    let dentro = false;
    for (const l of linhas) {
      if (/^ {4}def (_fluxo_|closeEvent|abrir_tela|repetir|parar_repeticao)/.test(l)) dentro = true;
      else if (dentro && /^ {4}\S/.test(l)) dentro = false;
      else if (dentro && /^\S/.test(l)) dentro = false;
      if (dentro) out.push(l.slice(4));
    }
    const vars = linhas.filter((l) => /^ {8}self\.var_\w+ = /.test(l)).map((l) => l.trim());
    const cab = vars.length ? ['# Variáveis desta tela (criadas quando a janela abre):', ...vars, ''] : [];
    const txt = out.length ? [...cab, out.join('\n').trim()].join('\n') : '# Ainda não tem nenhum fio ligado.\n# Arraste da bolinha ▶ de um botão até uma função.';
    pre.textContent = txt;
    if (window.monaco) window.monaco.editor.colorize(txt, 'python', { tabSize: 4 }).then((h) => { pre.innerHTML = h; }).catch(() => {});
  }

  // ---------------------------------------------------------------- variáveis
  function renomearVar(antigo, novo) {
    const re = new RegExp(`\\{${antigo}\\}`, 'g');
    for (const n of L().nos) {
      for (const [chave, tipo] of FUNCOES[n.fn].entradas) {
        if (ehVarCampo(tipo) && n.valores[chave] === antigo) n.valores[chave] = novo;
        else if (typeof n.valores[chave] === 'string' && n.valores[chave].includes('{')) n.valores[chave] = n.valores[chave].replace(re, `{${novo}}`);
      }
    }
  }
  const usosDaVar = (nome) => L().nos.filter((n) => FUNCOES[n.fn].entradas.some(([k, t]) => (ehVarCampo(t) && n.valores[k] === nome) || String(n.valores[k] || '').includes(`{${nome}}`))).length;

  /** Popover para criar/editar uma variável. Resolve com o nome (ou null). */
  function editarVar(nome, cx, cy, tipoPreferido) {
    fecharLista();
    return new Promise((resolve) => {
      const existente = nome ? acharVar(nome, D()) : null;
      const pop = el(`<div class="fn-pop fn-varpop" role="dialog" aria-label="Variable"></div>`);
      const fim = (v) => { pop.remove(); document.removeEventListener('pointerdown', fora, true); resolve(v); };
      const fora = (e) => { if (!pop.contains(e.target)) fim(null); };
      if (existente && existente.tela) {
        pop.innerHTML = `<div class="fn-varpop-tit">${esc(existente.nome)}</div><p class="dim" style="margin:0 0 10px;font-size:12.5px;line-height:1.5">This variable is shared and was created on the screen <b>${esc(existente.tela)}</b>. To change the name, type or starting value, enter that screen.</p><div class="flex" style="justify-content:flex-end;gap:6px"><button class="btn peq" data-c>Close</button>${ctx.entrarTela ? `<button class="btn peq pri" data-ir>Go to ${esc(existente.tela)}</button>` : ''}</div>`;
        pop.querySelector('[data-c]').onclick = () => fim(null);
        const ir = pop.querySelector('[data-ir]');
        if (ir) ir.onclick = () => { fim(null); ctx.entrarTela(existente.tela); };
      } else {
        const v = existente || { nome: '', tipo: tipoPreferido || 'texto', inicial: '', global: false };
        const sugestao = () => { let i = 1; while (acharVar(`variavel${i}`, D())) i++; return `variavel${i}`; };
        pop.innerHTML = `<div class="fn-varpop-tit">${existente ? 'Variable' : 'New variable'}</div>
          <label class="rotulo">Name</label><input class="campo mono" data-vn value="${esc(v.nome || sugestao())}" spellcheck="false" autocomplete="off">
          <div class="dim" style="font-size:11.5px;margin:3px 0 8px">Lowercase letters, numbers and _ (e.g. points, player_name).</div>
          <label class="rotulo">Type</label><select class="sel campo" data-vt ${tipoPreferido && !existente ? 'disabled' : ''}>${TIPOS_VAR.map(([k, r]) => `<option value="${k}" ${k === v.tipo ? 'selected' : ''}>${r}</option>`).join('')}</select>
          <label class="rotulo" style="margin-top:8px">Starts with</label><span data-vibox></span>
          <label class="fn-check"><input type="checkbox" data-vg ${v.global ? 'checked' : ''}> Use on all screens <span class="dim">(shared)</span></label>
          <div class="flex" style="gap:6px;margin-top:12px">${existente ? `<button class="btn peq perigo" data-apagar>${ic('lixo', 13)}Delete</button>` : ''}<span class="grow"></span><button class="btn peq" data-c>Cancel</button><button class="btn peq pri" data-ok>${existente ? 'Save' : 'Create'}</button></div>`;
        const box = pop.querySelector('[data-vibox]');
        const tipoSel = pop.querySelector('[data-vt]');
        const pintarInicial = (valor) => {
          const t = tipoSel.value;
          box.innerHTML = t === 'bool' ? `<select class="sel campo" data-vi><option value="nao">No</option><option value="sim" ${valor === 'sim' ? 'selected' : ''}>Sim</option></select>`
            : `<input class="campo" data-vi value="${esc(valor)}" placeholder="${{ texto: '(empty)', numero: '0', lista: 'a, b, c (or empty)' }[t]}" ${t === 'numero' ? 'inputmode="decimal"' : ''}>`;
        };
        pintarInicial(v.inicial || '');
        tipoSel.onchange = () => pintarInicial('');
        pop.querySelector('[data-c]').onclick = () => fim(null);
        const salvar = () => {
          const novo = pop.querySelector('[data-vn]').value.trim();
          if (!nomeOk(novo)) { toast('Invalid name: use lowercase letters, numbers and _ (no accents, not starting with a number).', 'err'); return; }
          if (novo !== (existente && existente.nome) && acharVar(novo, D())) { toast('There is already a variable with that name.', 'err'); return; }
          const dados = { nome: novo, tipo: tipoSel.value, inicial: pop.querySelector('[data-vi]').value, global: pop.querySelector('[data-vg]').checked };
          if (dados.tipo === 'numero' && dados.inicial.trim() && !Number.isFinite(Number(dados.inicial.replace(',', '.')))) { toast('The starting value must be a number (e.g. 0 or 2.5).', 'err'); return; }
          if (existente) {
            if (existente.nome !== novo) renomearVar(existente.nome, novo);
            Object.assign(L().vars.find((x) => x.nome === existente.nome), dados);
          } else L().vars.push(dados);
          ctx.mudou();
          fim(novo);
        };
        pop.querySelector('[data-ok]').onclick = salvar;
        pop.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && e.target.tagName === 'INPUT') salvar(); if (e.key === 'Escape') fim(null); });
        const ap = pop.querySelector('[data-apagar]');
        if (ap) ap.onclick = async () => {
          const usos = usosDaVar(existente.nome);
          pop.remove(); document.removeEventListener('pointerdown', fora, true);
          if (usos && !(await confirmar('Delete variable', `The variable “${existente.nome}” is used in ${usos} bloco${usos > 1 ? 's' : ''}. Apagar mesmo assim?`, 'Delete', true))) { resolve(null); return; }
          L().vars = L().vars.filter((x) => x.nome !== existente.nome);
          for (const n of L().nos) for (const [k, t] of FUNCOES[n.fn].entradas) if (ehVarCampo(t) && n.valores[k] === existente.nome) n.valores[k] = '';
          ctx.mudou();
          resolve(null);
        };
      }
      document.body.appendChild(pop);
      const r = pop.getBoundingClientRect();
      pop.style.left = lim(cx, 8, window.innerWidth - r.width - 8) + 'px';
      pop.style.top = lim(cy, 8, window.innerHeight - r.height - 8) + 'px';
      setTimeout(() => { const i = pop.querySelector('[data-vn]'); if (i) { i.focus(); i.select(); } }, 0);
      setTimeout(() => document.addEventListener('pointerdown', fora, true), 0);
    });
  }

  // arrastar uma variável do painel para a área cria "Valor da variável"
  function arrastarVar(ev, row, nome) {
    if (ev.button !== 0 || ev.target.closest('button')) return;
    const x0 = ev.clientX, y0 = ev.clientY;
    let fantasma = null;
    const mv = (e) => {
      if (!fantasma && Math.hypot(e.clientX - x0, e.clientY - y0) < 5) return;
      if (!fantasma) { fantasma = el(`<div class="fn-fantasma"><span class="mono">${esc(nome)}</span></div>`); document.body.appendChild(fantasma); }
      fantasma.style.left = e.clientX + 8 + 'px'; fantasma.style.top = e.clientY + 8 + 'px';
    };
    const up = (e) => {
      document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
      if (!fantasma) { const r = row.getBoundingClientRect(); editarVar(nome, r.right + 8, r.top); return; }
      fantasma.remove();
      const alvo = document.elementFromPoint(e.clientX, e.clientY);
      if (alvo && area.contains(alvo) && !alvo.closest('.fn-vars')) criarNo('lerVar', s2w(ponto(e)), null, { nome }, true);
    };
    document.addEventListener('pointermove', mv);
    document.addEventListener('pointerup', up);
  }

  // ---------------------------------------------------------------- campos dentro dos blocos
  // (a lógica é recriada a cada mudança: sempre busca o bloco de novo pelo id)
  const blocoAtual = (id) => L().nos.find((x) => x.id === id);

  function inserirReferencia(id, chave, inp, x, y) {
    const refs = referenciasTexto(D());
    const atual0 = inp ? inp.value : String((blocoAtual(id) || { valores: {} }).valores[chave] || '');
    const ini = inp ? inp.selectionStart ?? atual0.length : atual0.length;
    const fimSel = inp ? inp.selectionEnd ?? ini : ini;
    const por = (nome) => { const n = blocoAtual(id); if (!n) return; n.valores[chave] = atual0.slice(0, ini) + `{${nome}}` + atual0.slice(fimSel); ctx.mudou(); };
    const itens = refs.map((r) => ({ texto: `{${r.nome}}  ·  ${r.de}`, acao: () => por(r.nome) }));
    itens.push('-', { texto: '＋ Create a new variable…', acao: () => editarVar(null, x, y).then((nome) => { if (nome) por(nome); }) });
    menuContexto(x, y, itens);
  }

  function ligarCampos() {
    camada.querySelectorAll('.fn-fn').forEach((no) => {
      const n = L().nos.find((x) => x.id === no.dataset.no);
      const ent = (k) => FUNCOES[n.fn].entradas.find((x) => x[0] === k);
      no.querySelectorAll('[data-k]').forEach((c) => {
        c.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        c.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter' && c.tagName === 'INPUT') c.blur(); });
        c.addEventListener('change', () => {
          const k = c.dataset.k;
          const tipo = ent(k)[1];
          const v = c.value;
          if (v === '__nova') {
            const r = c.getBoundingClientRect();
            editarVar(null, r.left, r.bottom + 6, tipo.startsWith('var:') ? tipo.slice(4) : null).then((nome) => { const b = blocoAtual(n.id); if (nome && b) { b.valores[k] = nome; ctx.mudou(); } else pintar(); });
            return;
          }
          if (v === '__telinha') {
            if (!ctx.criarTelinha) { pintar(); return; }
            ctx.criarTelinha().then((nome) => { const b = blocoAtual(n.id); if (nome && b) { b.valores[k] = nome; ctx.mudou(); } else pintar(); });
            return;
          }
          const b = blocoAtual(n.id);
          if (b) { b.valores[k] = v; ctx.mudou(); }
        });
      });
      no.querySelectorAll('[data-ins]').forEach((b) => {
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); });
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const inp = no.querySelector(`input[data-k="${b.dataset.ins}"]`);
          const r = b.getBoundingClientRect();
          inserirReferencia(n.id, b.dataset.ins, inp, r.left, r.bottom + 4);
        });
      });
      no.querySelectorAll('[data-entrar]').forEach((p) => {
        p.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        p.addEventListener('click', (ev) => { ev.stopPropagation(); if (ctx.entrarTela) ctx.entrarTela(p.dataset.entrar); });
      });
    });
  }

  // ---------------------------------------------------------------- ligar fios
  function ligar(de, para) {
    const td = tipoPorta(de, 'out'), tp = tipoPorta(para, 'in');
    if (!td || !tp) return false;
    if (!compativel(td, tp)) { toast(`Does not fit: ${TIPOS_PORTA[td].nome} is not in ${TIPOS_PORTA[tp].nome}.`, 'err', 2500); return false; }
    if (de.split(':')[0] === para.split(':')[0]) return false;
    const fios = L().fios.filter((f) => (td === 'exec' ? f.de !== de : f.para !== para));
    fios.push({ de, para });
    L().fios = fios;
    return true;
  }

  function arrastarFio(ev, de, tipo) {
    const a = centroPorta(de);
    area.classList.add('ligando');
    camada.querySelectorAll('.fp.in').forEach((p) => p.classList.toggle('pode', compativel(tipo, p.dataset.t) && p.dataset.p.split(':')[0] !== de.split(':')[0]));
    const id = ev.pointerId;
    area.setPointerCapture(id);
    const mv = (e) => desenharFios({ a, b: s2w(ponto(e)), tipo });
    const up = (e) => {
      area.removeEventListener('pointermove', mv); area.removeEventListener('pointerup', up);
      try { area.releasePointerCapture(id); } catch { /* ok */ }
      area.classList.remove('ligando');
      camada.querySelectorAll('.fp.pode').forEach((p) => p.classList.remove('pode'));
      const alvo = document.elementFromPoint(e.clientX, e.clientY);
      const p = alvo && alvo.closest('.fp.in');
      if (p) { if (ligar(de, p.dataset.p)) ctx.mudou(); else desenharFios(); return; }
      // soltou no vazio: oferece as funções que combinam e já liga
      const w = s2w(ponto(e));
      if (Math.hypot(w.x - a.x, w.y - a.y) < 20) { desenharFios(); return; }
      abrirLista(e.clientX, e.clientY, w, { de, tipo });
    };
    area.addEventListener('pointermove', mv);
    area.addEventListener('pointerup', up);
  }

  // ---------------------------------------------------------------- lista de funções
  const tipoParaLigar = (t) => (t.startsWith('porVar:') ? 'qualquer' : t === 'cor' ? 'texto' : t);
  function abrirLista(cx, cy, w, ligacao) {
    fecharLista();
    const pop = el(`<div class="fn-pop" role="dialog" aria-label="Add function"><input class="campo" placeholder="Search functions… (e.g. repeat, variable, message)" aria-label="Search functions"><div class="fn-pop-lista"></div></div>`);
    document.body.appendChild(pop);
    const r = pop.getBoundingClientRect();
    pop.style.left = lim(cx, 8, window.innerWidth - r.width - 8) + 'px';
    pop.style.top = lim(cy, 8, window.innerHeight - 460) + 'px';
    const inp = pop.querySelector('input');
    const lista = pop.querySelector('.fn-pop-lista');
    const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const serve = (k) => {
      if (!ligacao) return true;
      const F = FUNCOES[k];
      if (ligacao.tipo === 'exec') return !!F.exec;
      return F.entradas.some(([, t]) => ehPorta(t) && compativel(ligacao.tipo, tipoParaLigar(t)));
    };
    function render() {
      const q = semAcento(inp.value.trim());
      lista.innerHTML = '';
      for (const g of GRUPOS_FUNCAO) {
        const itens = Object.entries(FUNCOES).filter(([k, F]) => F.grupo === g && k !== 'somar' && serve(k) && (!q || semAcento(F.nome + ' ' + F.desc + ' ' + g).includes(q)));
        if (!itens.length) continue;
        lista.appendChild(el(`<div class="secao-t" style="margin:8px 8px 4px">${esc(g)}</div>`));
        for (const [k, F] of itens) {
          const b = el(`<button class="fn-pop-item"><span class="fn-bola" style="background:${F.cor}"></span><span class="grow"><strong>${esc(F.nome)}</strong>${F.dados ? ' <span class="fn-tag">valor</span>' : ''}<br><span class="dim">${esc(F.desc)}</span></span></button>`);
          b.onclick = () => { criarNo(k, w, ligacao); fecharLista(); };
          lista.appendChild(b);
        }
      }
      if (!lista.children.length) lista.appendChild(el('<div class="dim" style="padding:12px">No function fits.</div>'));
    }
    inp.oninput = render;
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Escape') { fecharLista(); desenharFios(); } if (e.key === 'Enter') { const b = lista.querySelector('.fn-pop-item'); if (b) b.click(); } };
    render();
    setTimeout(() => inp.focus(), 0);
    setTimeout(() => document.addEventListener('pointerdown', foraDaLista, true), 0);
  }
  function foraDaLista(e) { const p = document.querySelector('.fn-pop:not(.fn-varpop)'); if (p && !p.contains(e.target)) { fecharLista(); desenharFios(); } }
  function fecharLista() { document.querySelectorAll('.fn-pop:not(.fn-varpop)').forEach((p) => p.remove()); document.removeEventListener('pointerdown', foraDaLista, true); }

  function criarNo(fn, w, ligacao, preset = {}, noPonto = false) {
    const F = FUNCOES[fn];
    const valores = {};
    for (const [chave, tipo, , padrao] of F.entradas) {
      valores[chave] = padrao;
      if (ehVarCampo(tipo)) {
        const quer = tipo.startsWith('var:') ? tipo.slice(4) : null;
        const v = variaveisVisiveis(D()).find((x) => !quer || x.tipo === quer);
        valores[chave] = v ? v.nome : '';
      }
      if (tipo === 'repeticao') { const r = repeticoes()[0]; valores[chave] = r ? r.id : ''; }
    }
    Object.assign(valores, preset);
    const n = { id: proximoNo(), fn, x: Math.round(w.x + (noPonto ? -40 : 20)), y: Math.round(w.y - 24), valores };
    L().nos.push(n);
    sel = { tipo: 'no', id: n.id };
    if (ligacao) {
      if (ligacao.tipo === 'exec') ligar(ligacao.de, `${n.id}:entrada`);
      else {
        const alvo = F.entradas.find(([, t]) => ehPorta(t) && compativel(ligacao.tipo, tipoParaLigar(t)));
        if (alvo) ligar(ligacao.de, `${n.id}:${alvo[0]}`);
      }
    }
    ctx.mudou();
  }

  function apagarNo(id) {
    L().nos = L().nos.filter((n) => n.id !== id);
    L().fios = L().fios.filter((f) => f.de.split(':')[0] !== id && f.para.split(':')[0] !== id);
    sel = null;
    ctx.mudou();
  }

  function organizar() {
    const Lg = L();
    const pos = posicoes();
    let y = 0;
    pos.tela = { x: 0, y: -230 };
    for (const e of elementosComPortas()) { pos[e.id] = { x: 0, y }; y += 70 + PORTAS_ELEMENTO[e.tipo].length * 30; }
    Lg.pos = pos;
    const noDe = (ref) => ref.split(':')[0];
    const altura = (n) => {
      const F = FUNCOES[n.fn];
      const linhas = F.entradas.length + (F.exec ? (F.saidas || [1]).length : 0) + (F.saidasDados || []).length + (F.dados ? 1 : 0);
      return 64 + linhas * 31 + (n.fn === 'abrirTela' ? 250 : 0) + (F.desc.length > 60 ? 14 : 0);
    };
    const usado = {}; // coluna -> [[y, h]]
    const colocar = (n, col, yy) => {
      const h = altura(n);
      const lista = (usado[col] = usado[col] || []);
      let mexeu = true;
      while (mexeu) { mexeu = false; for (const [u, uh] of lista) if (yy < u + uh + 24 && u < yy + h + 24) { yy = u + uh + 24; mexeu = true; } }
      lista.push([yy, h]);
      n.x = 330 + (col - 1) * 330; n.y = Math.round(yy); n._col = col;
    };
    // 1) ações: coluna = quantos passos depois do evento
    const prof = new Map();
    const fila = Lg.fios.filter((f) => !Lg.nos.some((n) => n.id === noDe(f.de))).map((f) => [noDe(f.para), 1, pos[noDe(f.de)] ? pos[noDe(f.de)].y - 10 : 0]);
    const ordem = [];
    while (fila.length) {
      const [id, d, yy] = fila.shift();
      const n = Lg.nos.find((x) => x.id === id);
      if (prof.has(id) || !n || FUNCOES[n.fn].dados) continue;
      prof.set(id, d); ordem.push([n, d, yy]);
      Lg.fios.filter((f) => noDe(f.de) === id && tipoPorta(f.de, 'out') === 'exec').forEach((f, i) => fila.push([noDe(f.para), d + 1, yy + i * 240]));
    }
    for (const [n, d, yy] of ordem) colocar(n, d, yy);
    // 2) valores: embaixo do bloco que usa o valor
    let faltam = Lg.nos.filter((n) => n._col === undefined);
    for (let volta = 0; volta < 6 && faltam.length; volta++) {
      for (const n of faltam) {
        const usa = Lg.fios.filter((f) => noDe(f.de) === n.id).map((f) => Lg.nos.find((x) => x.id === noDe(f.para))).find((x) => x && x._col !== undefined);
        if (usa) colocar(n, usa._col, usa.y + altura(usa) + 24);
      }
      faltam = Lg.nos.filter((n) => n._col === undefined);
    }
    // 3) soltos: numa coluna depois de tudo
    const ultima = Math.max(1, ...Lg.nos.filter((n) => n._col !== undefined).map((n) => n._col)) + (Lg.nos.some((n) => n._col !== undefined) ? 1 : 0);
    for (const n of faltam) colocar(n, ultima, 0);
    for (const n of Lg.nos) delete n._col;
    primeiraVez = true;
    ctx.mudou();
  }

  // ---------------------------------------------------------------- mouse
  area.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.fn-campo, .fn-ins, [data-entrar]')) return;
    const p0 = ponto(ev);
    // bolinha de saída: puxa um fio
    const fp = ev.target.closest('.fp');
    if (fp && ev.button === 0) {
      ev.preventDefault();
      if (fp.dataset.dir === 'out') { arrastarFio(ev, fp.dataset.p, fp.dataset.t); return; }
      // bolinha de entrada já ligada: solta o fio para religar
      const i = L().fios.findIndex((f) => f.para === fp.dataset.p);
      if (i >= 0) { const f = L().fios[i]; L().fios.splice(i, 1); pintar(); requestAnimationFrame(() => arrastarFio(ev, f.de, tipoPorta(f.de, 'out'))); }
      return;
    }
    const fio = ev.target.closest('[data-fio]');
    if (fio && ev.button === 0) { sel = { tipo: 'fio', id: +fio.dataset.fio }; desenharFios(); area.focus(); return; }
    const cab = ev.target.closest('.fn-no');
    if (cab && ev.button === 0) {
      const id = cab.dataset.no;
      if (L().nos.some((n) => n.id === id)) sel = { tipo: 'no', id };
      camada.querySelectorAll('.fn-fn.on').forEach((x) => x.classList.toggle('on', x.dataset.no === id));
      cab.classList.toggle('on', !!sel && sel.id === id);
      const x0 = parseFloat(cab.style.left), y0 = parseFloat(cab.style.top);
      let mexeu = false;
      area.setPointerCapture(ev.pointerId);
      const mv = (e) => {
        const p = ponto(e);
        if (!mexeu && Math.hypot(p.x - p0.x, p.y - p0.y) < 3) return;
        mexeu = true;
        cab.style.left = Math.round(x0 + (p.x - p0.x) / cam.z) + 'px';
        cab.style.top = Math.round(y0 + (p.y - p0.y) / cam.z) + 'px';
        desenharFios();
      };
      const up = () => {
        area.removeEventListener('pointermove', mv); area.removeEventListener('pointerup', up);
        if (!mexeu) { area.focus(); return; }
        const nx = parseFloat(cab.style.left), ny = parseFloat(cab.style.top);
        const n = L().nos.find((x) => x.id === id);
        if (n) { n.x = nx; n.y = ny; } else L().pos[id] = { x: nx, y: ny };
        ctx.mudou();
      };
      area.addEventListener('pointermove', mv);
      area.addEventListener('pointerup', up);
      return;
    }
    if (ev.button === 2) return;
    // fundo: arrastar a tela
    const c0 = { ...cam };
    let mexeu = false;
    area.setPointerCapture(ev.pointerId);
    area.classList.add('arrastando');
    const mv = (e) => { const p = ponto(e); mexeu = mexeu || Math.hypot(p.x - p0.x, p.y - p0.y) > 3; cam.x = c0.x + p.x - p0.x; cam.y = c0.y + p.y - p0.y; aplicarCamera(); };
    const up = () => {
      area.removeEventListener('pointermove', mv); area.removeEventListener('pointerup', up); area.classList.remove('arrastando');
      if (!mexeu && sel) { sel = null; camada.querySelectorAll('.fn-fn.on').forEach((x) => x.classList.remove('on')); desenharFios(); }
      area.focus();
    };
    area.addEventListener('pointermove', mv);
    area.addEventListener('pointerup', up);
  });

  area.addEventListener('dblclick', (ev) => {
    const no = ev.target.closest('.fn-abre');
    if (!no || ev.target.closest('.fn-campo')) return;
    const n = L().nos.find((x) => x.id === no.dataset.no);
    if (n && n.valores.tela && ctx.entrarTela) ctx.entrarTela(n.valores.tela);
  });

  area.addEventListener('wheel', (ev) => {
    if (ev.target.closest('.fn-campo')) return;
    ev.preventDefault();
    const p = ponto(ev);
    if (ev.ctrlKey || ev.metaKey) {
      const z = lim(cam.z * Math.exp(-ev.deltaY * 0.0022), 0.25, 2);
      const w = s2w(p);
      cam.z = z; cam.x = p.x - w.x * z; cam.y = p.y - w.y * z;
    } else { cam.x -= ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX; cam.y -= ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY; }
    aplicarCamera();
    desenharFios();
  }, { passive: false });

  area.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const fio = ev.target.closest('[data-fio]');
    if (fio) { const i = +fio.dataset.fio; menuContexto(ev.clientX, ev.clientY, [{ texto: 'Remove connection', kbd: 'Delete', acao: () => { L().fios.splice(i, 1); sel = null; ctx.mudou(); } }]); return; }
    const no = ev.target.closest('.fn-fn');
    if (no) {
      const n = L().nos.find((x) => x.id === no.dataset.no);
      menuContexto(ev.clientX, ev.clientY, [
        ...(n.fn === 'abrirTela' && n.valores.tela && ctx.entrarTela ? [{ texto: `Enter the small screen “${n.valores.tela}”`, acao: () => ctx.entrarTela(n.valores.tela) }, '-'] : []),
        { texto: 'Duplicate', acao: () => { const c = JSON.parse(JSON.stringify(n)); c.id = proximoNo(); c.x += 30; c.y += 30; L().nos.push(c); ctx.mudou(); } },
        { texto: 'Release all wires', acao: () => { L().fios = L().fios.filter((f) => f.de.split(':')[0] !== n.id && f.para.split(':')[0] !== n.id); ctx.mudou(); } },
        '-',
        { texto: 'Delete block', kbd: 'Delete', acao: () => apagarNo(n.id) },
      ]);
      return;
    }
    if (ev.target.closest('.fn-no')) { toast('The element cubes come from the screen. To remove one, delete the element in the Design tab.', 'info'); return; }
    abrirLista(ev.clientX, ev.clientY, s2w(ponto(ev)));
  });

  area.addEventListener('keydown', (ev) => {
    if (ev.target.closest('.fn-campo')) return;
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && sel) {
      ev.preventDefault(); ev.stopPropagation();
      if (sel.tipo === 'no') apagarNo(sel.id);
      else { L().fios.splice(sel.id, 1); sel = null; ctx.mudou(); }
    }
  });

  raiz.querySelector('[data-add]').onclick = (ev) => abrirLista(ev.clientX, ev.clientY + 20, centroTela());
  raiz.querySelector('[data-org]').onclick = organizar;
  raiz.querySelector('[data-zm]').onclick = () => { cam.z = lim(cam.z / 1.2, 0.25, 2); aplicarCamera(); desenharFios(); };
  raiz.querySelector('[data-zp]').onclick = () => { cam.z = lim(cam.z * 1.2, 0.25, 2); aplicarCamera(); desenharFios(); };
  raiz.querySelector('[data-cod]').onclick = () => { mostrarCodigo = !mostrarCodigo; raiz.querySelector('[data-prev]').style.display = mostrarCodigo ? 'flex' : 'none'; if (mostrarCodigo) pintarCodigo(); };
  raiz.querySelector('[data-fprev]').onclick = () => { mostrarCodigo = false; raiz.querySelector('[data-prev]').style.display = 'none'; };
  raiz.querySelector('[data-novavar]').onclick = (ev) => { const r = ev.currentTarget.getBoundingClientRect(); editarVar(null, r.left, r.bottom + 6); };
  raiz.querySelector('[data-vtog]').onclick = () => { varsAberto = !varsAberto; pintarVars(); };

  return {
    pintar,
    enquadrar,
    /** Volta a câmera para enquadrar tudo (ao trocar de tela). */
    reiniciar: () => { primeiraVez = true; sel = null; },
    limpar: () => { D().logica = normalizarLogica(D().logica, D()); },
    destruir: () => { fecharLista(); document.querySelectorAll('.fn-varpop').forEach((p) => p.remove()); },
  };
}
