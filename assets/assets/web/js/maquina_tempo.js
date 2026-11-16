// Máquina do tempo: mostra a gravação de uma execução passo a passo (linha, variáveis, saída).
import { el, esc, ic, fmt } from './ui.js';
import { TOKEN } from './api.js';

/** Baixa a última gravação do projeto. */
export async function carregarGravacao(raiz) {
  const r = await fetch('/api/tempo?raiz=' + encodeURIComponent(raiz), { headers: { 'X-PyForge-Token': TOKEN } });
  if (!r.ok) {
    let msg = 'Erro ' + r.status;
    try { msg = (await r.json()).erro || msg; } catch { /* texto */ }
    throw new Error(msg);
  }
  return interpretar(await r.text());
}

/** Transforma o JSON-por-linha do gravador em passos com o estado completo de cada momento. */
export function interpretar(texto) {
  const arquivos = [];
  const passos = [];
  let info = {}, limite = 0, erro = null, saida = '';
  const vars = new Map(); // quadro -> variáveis
  let pilha = [];
  for (const linha of texto.split('\n')) {
    if (!linha.trim()) continue;
    let o;
    try { o = JSON.parse(linha); } catch { continue; }
    if (o.t === 'inicio') info = o;
    else if (o.t === 'arq') arquivos[o.i] = o.c;
    else if (o.t === 'limite') limite = o.n;
    else if (o.t === 'erro') erro = o;
    else if (o.t === 'p') {
      if (o.e === 'o') { saida += o.o || ''; if (passos.length) passos[passos.length - 1].saidaFim = saida.length; continue; }
      const antes = vars.get(o.k) || {};
      let agora = antes;
      if (o.v || o.x) {
        agora = { ...antes, ...(o.v || {}) };
        for (const n of o.x || []) delete agora[n];
      }
      vars.set(o.k, agora);
      if (o.e === 'c') pilha = [...pilha, { f: o.f, k: o.k, a: o.a, l: o.l }];
      else {
        const i = pilha.findIndex((q) => q.k === o.k);
        if (i >= 0) pilha = [...pilha.slice(0, i), { ...pilha[i], l: o.l }];
        else pilha = [...pilha, { f: o.f, k: o.k, a: o.a, l: o.l }];
      }
      if (o.o) saida += o.o;
      passos.push({ a: o.a, arquivo: arquivos[o.a], l: o.l, f: o.f, k: o.k, e: o.e, vars: agora, antes, mudou: Object.keys(o.v || {}), pilha, saidaFim: saida.length, r: o.r, erro: o.erro, th: o.th });
      if (o.e === 'r') { pilha = pilha.slice(0, -1); vars.delete(o.k); }
    }
  }
  return { info, arquivos, passos, saida, limite, erro };
}

const nomeFuncao = (f) => (f === '<module>' ? 'programa principal' : f + '()');
const curtoArq = (c) => String(c || '').split(/[\\/]/).pop();

/** O que aconteceu neste passo, em português. */
function explicar(p) {
  const valores = (obj, nomes) => nomes.map((n) => `${n} = ${obj[n]}`).join(', ');
  if (p.e === 'c') {
    if (p.f === '<module>') return `O programa começou (${curtoArq(p.arquivo)}).`;
    const args = Object.keys(p.vars);
    return `Entrou na função ${p.f}()${args.length ? fmt(' recebendo {v}', { v: valores(p.vars, args.slice(0, 6)) }) : ''}.`;
  }
  if (p.e === 'r') return p.f === '<module>' ? 'O programa chegou ao fim.' : `Saiu de ${p.f}() devolvendo ${p.r}.`;
  if (p.e === 'x') return `Deu erro aqui: ${p.erro}`;
  if (!p.mudou.length) return `Vai executar a linha ${p.l}.`;
  const partes = p.mudou.slice(0, 4).map((n) => (n in p.antes ? fmt('{n} mudou de {a} para {b}', { n, a: p.antes[n], b: p.vars[n] }) : fmt('{n} foi criada valendo {b}', { n, b: p.vars[n] })));
  return `A linha anterior fez: ${partes.join('; ')}${p.mudou.length > 4 ? '…' : ''}. Agora vai executar a linha ${p.l}.`;
}

/**
 * @param {HTMLElement} raiz
 * @param {{ mostrar: (arquivo:string, linha:number, erro:boolean) => void, limpar: () => void, textoLinha: (arquivo:string, linha:number) => string }} ctx
 */
export function criarPainelTempo(raiz, ctx) {
  let G = null, i = 0, tocando = null, histVar = null;
  raiz.innerHTML = `<div class="mt" tabindex="0" aria-label="Máquina do tempo">
    <div class="mt-vazio" data-mt-vazio>${ic('relogio', 28)}<div><b>Máquina do tempo</b></div><div class="muted">Use <b>Executar › Executar com máquina do tempo</b> (Ctrl+F5). Depois volte e avance o programa passo a passo, vendo as variáveis mudarem.</div></div>
    <div class="mt-tudo" data-mt-tudo style="display:none">
      <div class="mt-barra">
        <button class="ib" data-mt-ir="inicio" title="Começo (Home)" aria-label="Começo">${ic('esquerda', 15)}${ic('esquerda', 15)}</button>
        <button class="ib" data-mt-ir="ant" title="Passo anterior (←)" aria-label="Passo anterior">${ic('esquerda', 16)}</button>
        <button class="btn peq pri" data-mt-play title="Tocar / pausar (espaço)">${ic('play', 13)}<span>Tocar</span></button>
        <button class="ib" data-mt-ir="prox" title="Próximo passo (→)" aria-label="Próximo passo">${ic('direita', 16)}</button>
        <button class="ib" data-mt-ir="fim" title="Fim (End)" aria-label="Fim">${ic('direita', 15)}${ic('direita', 15)}</button>
        <div class="mt-trilho grow"><input type="range" min="0" value="0" data-mt-slider aria-label="Linha do tempo"><div class="mt-marcas" data-mt-marcas></div></div>
        <span class="mono mt-contador" data-mt-cont></span>
        <select class="sel" data-mt-vel aria-label="Velocidade" style="height:28px;font-size:12px"><option value="600">Devagar</option><option value="220" selected>Normal</option><option value="60">Rápido</option></select>
      </div>
      <div class="mt-corpo">
        <div class="mt-col mt-onde"><div class="secao-t">Onde está</div><div data-mt-onde></div><div class="mt-explica" data-mt-exp></div><div class="secao-t" style="margin-top:8px">Funções abertas</div><div class="mt-pilha" data-mt-pilha></div><div class="mt-aviso" data-mt-aviso></div></div>
        <div class="mt-col"><div class="secao-t">Variáveis <span class="dim" style="text-transform:none;font-weight:400">· clique para ver quando mudou</span></div><div class="mt-vars" data-mt-vars></div><div data-mt-hist></div></div>
        <div class="mt-col"><div class="secao-t">Saída até aqui</div><pre class="mt-saida mono" data-mt-saida></pre></div>
      </div>
    </div></div>`;
  const $ = (s) => raiz.querySelector(s);
  const caixa = $('.mt');
  const slider = $('[data-mt-slider]');

  function parar() { if (tocando) { clearInterval(tocando); tocando = null; } $('[data-mt-play] span').textContent = 'Tocar'; }
  function tocar() {
    if (tocando) { parar(); return; }
    if (i >= G.passos.length - 1) i = 0;
    $('[data-mt-play] span').textContent = 'Pausar';
    tocando = setInterval(() => { if (i >= G.passos.length - 1) { parar(); return; } ir(i + 1); }, +$('[data-mt-vel]').value);
  }

  function ir(n) {
    if (!G || !G.passos.length) return;
    i = Math.max(0, Math.min(G.passos.length - 1, n));
    const p = G.passos[i];
    slider.value = i;
    $('[data-mt-cont]').textContent = fmt('Passo {a} de {b}', { a: i + 1, b: G.passos.length });
    const txt = (ctx.textoLinha(p.arquivo, p.l) || '').trim();
    $('[data-mt-onde]').innerHTML = `<div class="mt-linha-num">Linha ${p.l} · <span class="mono">${esc(curtoArq(p.arquivo))}</span> · em ${esc(nomeFuncao(p.f))}${p.th ? ` · thread ${esc(p.th)}` : ''}</div>${txt ? `<pre class="mono mt-codigo">${esc(txt.slice(0, 200))}</pre>` : ''}`;
    $('[data-mt-exp]').textContent = explicar(p);
    $('[data-mt-exp]').classList.toggle('erro', p.e === 'x');
    $('[data-mt-pilha]').innerHTML = p.pilha.map((q, j) => `<span class="mt-quadro ${j === p.pilha.length - 1 ? 'on' : ''}">${esc(nomeFuncao(q.f))} <span class="dim">:${q.l}</span></span>`).join('<span class="dim">›</span>') || '<span class="dim">—</span>';
    const nomes = Object.keys(p.vars);
    $('[data-mt-vars]').innerHTML = nomes.length ? `<table class="mt-tabela">${nomes.map((n) => {
      const mudou = p.mudou.includes(n);
      const novo = mudou && !(n in p.antes);
      return `<tr class="${mudou ? 'mudou' : ''} ${histVar === n ? 'sel' : ''}" data-mt-var="${esc(n)}"><td class="mono">${esc(n)}</td><td class="mono">${esc(p.vars[n])}</td><td>${novo ? '<span class="mt-tag novo">nova\u200b</span>' : mudou ? '<span class="mt-tag">mudou\u200b</span>' : ''}</td></tr>`;
    }).join('')}</table>` : '<div class="dim" style="padding:6px 2px">Nenhuma variável aqui ainda.</div>';
    pintarHistorico(p);
    const s = $('[data-mt-saida]');
    s.textContent = G.saida.slice(0, p.saidaFim) || '';
    s.scrollTop = s.scrollHeight;
    ctx.mostrar(p.arquivo, p.l, p.e === 'x');
  }

  // quando cada variável mudou (no mesmo quadro de função)
  function pintarHistorico(p) {
    const box = $('[data-mt-hist]');
    if (!histVar || !(histVar in p.vars)) { box.innerHTML = ''; return; }
    const vezes = [];
    G.passos.forEach((q, j) => { if (q.k === p.k && q.mudou.includes(histVar)) vezes.push(j); });
    box.innerHTML = `<div class="mt-hist"><div class="dim" style="font-size:12px;margin-bottom:4px">${fmt(vezes.length === 1 ? '“{v}” mudou {n} vez em {f}:' : '“{v}” mudou {n} vezes em {f}:', { v: esc(histVar), n: vezes.length, f: esc(nomeFuncao(p.f)) })}</div>${vezes.slice(0, 60).map((j) => `<button class="mt-chip ${j === i ? 'on' : ''}" data-mt-pulo="${j}" title="Ir para o passo ${j + 1}">#${j + 1}: ${esc(String(G.passos[j].vars[histVar]).slice(0, 24))}</button>`).join('')}</div>`;
  }

  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mt-ir]');
    if (b) { parar(); ir({ inicio: 0, ant: i - 1, prox: i + 1, fim: G.passos.length - 1 }[b.dataset.mtIr]); return; }
    const v = e.target.closest('[data-mt-var]');
    if (v) { histVar = histVar === v.dataset.mtVar ? null : v.dataset.mtVar; ir(i); return; }
    const pulo = e.target.closest('[data-mt-pulo]');
    if (pulo) { parar(); ir(+pulo.dataset.mtPulo); }
  });
  $('[data-mt-play]').onclick = tocar;
  slider.oninput = () => { parar(); ir(+slider.value); };
  $('[data-mt-vel]').onchange = () => { if (tocando) { parar(); tocar(); } };
  caixa.addEventListener('keydown', (e) => {
    if (!G || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); parar(); ir(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); parar(); ir(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); parar(); ir(0); }
    else if (e.key === 'End') { e.preventDefault(); parar(); ir(G.passos.length - 1); }
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); tocar(); }
  });

  return {
    /** Mostra uma gravação nova. */
    carregar(gravacao) {
      parar();
      G = gravacao;
      histVar = null;
      const tem = G.passos.length > 0;
      $('[data-mt-vazio]').style.display = tem ? 'none' : '';
      $('[data-mt-tudo]').style.display = tem ? '' : 'none';
      if (!tem) {
        $('[data-mt-vazio]').querySelector('.muted').textContent = 'A gravação não tem nenhuma linha do seu projeto. O programa terminou antes de começar?';
        return;
      }
      slider.max = G.passos.length - 1;
      const n = G.passos.length;
      $('[data-mt-marcas]').innerHTML = G.passos.map((p, j) => (p.e === 'x' ? `<i class="erro" style="left:${(j / Math.max(1, n - 1)) * 100}%" title="Erro no passo ${j + 1}"></i>` : p.e === 'c' && p.f !== '<module>' && n < 3000 ? `<i style="left:${(j / Math.max(1, n - 1)) * 100}%"></i>` : '')).join('');
      $('[data-mt-aviso]').innerHTML = G.limite ? `<div class="mt-limite">${ic('alerta', 13)}Gravou só os primeiros ${G.limite.toLocaleString('pt-BR')} passos (o programa continuou rodando normalmente).</div>` : '';
      const primeiroErro = G.passos.findIndex((p) => p.e === 'x');
      ir(primeiroErro >= 0 ? primeiroErro : 0);
      caixa.focus();
    },
    focar: () => caixa.focus(),
    parar,
    tem: () => !!(G && G.passos.length),
  };
}
