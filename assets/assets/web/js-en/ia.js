// Componente de chat com a IA (usado no lobby, no editor e no designer).
import { conversarIA, api } from './api.js';
import { el, esc, ic, markdown, textoMd, toast, perguntar } from './ui.js';
import { painelIALocal } from './ia_local.js';
import { cfg, ir } from './app.js';

const historicos = new Map();

const INSTRUCOES_MODO = {
  perguntar: 'ASK MODE: answer and explain calmly. Show code only when it helps understanding.',
  editar: 'MODO EDITAR: quando mudar código, devolva o ARQUIVO COMPLETO atualizado num bloco ```python arquivo=<caminho relativo ao projeto>```. PyForge shows the difference and the user accepts with one click. Do not use ellipses or "rest unchanged".',
  agente: 'AGENT MODE: give the plan in short steps. For each new or changed file, use a block ```python arquivo=<caminho relativo>``` with the COMPLETE file. For commands, use ```terminal``` blocks (one command per line). The user approves each block with one click. Finish by saying how to test.',
};

export function criarChat(container, op = {}) {
  const chave = op.chaveHistorico || 'geral';
  if (!historicos.has(chave)) historicos.set(chave, []);
  const msgs = historicos.get(chave);
  let modo = op.modoInicial || 'perguntar';
  let controlador = null;

  const raiz = el(`<section class="chat" aria-label="AI chat">
    <div class="chat-cab">
      <span style="color:var(--ac-tx);display:flex">${ic('brilho', 16)}</span>
      <span style="font-weight:600;flex:1">${esc(op.titulo || 'Assistant')}</span>
      <span class="pill info" data-prov></span>
      <button class="ib" data-novo title="New chat" aria-label="New chat">${ic('mais', 16)}</button>
      ${op.aoFechar ? `<button class="ib" data-fechar title="Close" aria-label="Close chat">${ic('x', 15)}</button>` : ''}
    </div>
    <div class="chat-msgs" data-msgs></div>
    <div class="chat-pe">
      ${op.modos ? `<div class="seg" role="radiogroup" aria-label="AI mode" data-modos style="width:100%;display:flex">
        <button role="radio" data-m="perguntar" style="flex:1">Ask</button><button role="radio" data-m="editar" style="flex:1">Edit</button><button role="radio" data-m="agente" style="flex:1">Agent</button></div>` : ''}
      <div class="chat-caixa">
        <div class="flex" data-chips style="flex-wrap:wrap;gap:6px"></div>
        <textarea rows="1" aria-label="Message to the AI" placeholder="${esc(op.placeholder || 'Ask, request a change or paste an error…')}" data-txt></textarea>
        <div class="flex" style="gap:4px">
          <span class="dim" style="font-size:11.5px" data-modelo></span>
          <span class="grow"></span>
          <button class="ib peq" data-parar title="Stop" aria-label="Stop answer" style="display:none;color:var(--err-tx)">${ic('parar', 14)}</button>
          <button class="btn pri peq" data-enviar aria-label="Send">${ic('enviar', 14)}</button>
        </div>
      </div>
    </div>
  </section>`);
  container.appendChild(raiz);
  const caixaMsgs = raiz.querySelector('[data-msgs]');
  const txt = raiz.querySelector('[data-txt]');
  const btEnviar = raiz.querySelector('[data-enviar]');
  const btParar = raiz.querySelector('[data-parar]');

  const prov = cfg('ia.provedor', 'pyforge');
  const nomes = { pyforge: 'PyForge AI', anthropic: 'Claude', openai: 'OpenAI', ollama: 'Ollama (local)' };
  raiz.querySelector('[data-prov]').textContent = nomes[prov] || prov;
  raiz.querySelector('[data-modelo]').textContent = prov === 'pyforge' ? 'on your PC · free' : cfg('ia.modelo', '') || 'default model';

  function pintarModos() {
    raiz.querySelectorAll('[data-m]').forEach((b) => {
      b.classList.toggle('on', b.dataset.m === modo);
      b.setAttribute('aria-checked', b.dataset.m === modo);
    });
  }
  raiz.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { modo = b.dataset.m; pintarModos(); }));
  pintarModos();

  function pintarChips() {
    const c = raiz.querySelector('[data-chips]');
    const chips = op.chipsContexto ? op.chipsContexto() : [];
    c.innerHTML = chips.map((t) => `<span class="ctx-chip ellipsis" title="${esc(t)}">${esc(t)}</span>`).join('');
    c.style.display = chips.length ? 'flex' : 'none';
  }
  pintarChips();

  function blocoCodigo(parte, msgIndex, final) {
    const info = parte.info || '';
    const linguagem = (info.split(/\s+/)[0] || '').toLowerCase();
    const arquivo = (info.match(/arquivo=([^\s]+)/) || [])[1] || '';
    const ehTerminal = ['terminal', 'bash', 'sh', 'shell', 'cmd', 'powershell', 'ps1', 'console'].includes(linguagem);
    const ehTela = info.includes('pyforge-tela');
    const b = el(`<div class="bloco">
      <div class="bloco-cab"><span class="grow ellipsis">${esc(arquivo || (ehTela ? 'Designer screen' : linguagem || 'code'))}</span></div>
      <pre></pre></div>`);
    const pre = b.querySelector('pre');
    pre.textContent = parte.v;
    const cab = b.querySelector('.bloco-cab');
    const botao = (texto, fn, pri) => {
      const x = el(`<button class="btn peq ${pri ? 'pri' : 'ghost'}">${esc(texto)}</button>`);
      x.onclick = fn;
      cab.appendChild(x);
    };
    if (final) {
      if (ehTela && op.aoJsonTela) botao('Apply screen', () => { try { op.aoJsonTela(JSON.parse(parte.v)); } catch (e) { toast('The screen JSON came with an error: ' + e.message, 'err'); } }, true);
      else if (ehTerminal && op.aoTerminal) botao('Run in terminal', () => op.aoTerminal(parte.v), true);
      else if (!ehTerminal && !ehTela && op.aoCodigo && op.aoCodigo.aplicar && (arquivo || ['python', 'py', ''].includes(linguagem))) {
        botao(arquivo ? 'Apply' : 'Apply to file', () => op.aoCodigo.aplicar(parte.v, { arquivo, linguagem }), true);
      }
      if (!ehTerminal && !ehTela && op.aoCodigo && op.aoCodigo.inserir) botao('Insert', () => op.aoCodigo.inserir(parte.v));
      botao('Copy', () => { navigator.clipboard.writeText(parte.v).then(() => toast('Copied!', 'ok', 1500)); });
      if (window.monaco && ['python', 'py', ''].includes(linguagem) && !ehTerminal && !ehTela) {
        window.monaco.editor.colorize(parte.v, 'python', { tabSize: 4 }).then((html) => { pre.innerHTML = html; }).catch(() => {});
      }
    }
    return b;
  }

  function renderMsg(m, i, final = true) {
    if (m.role === 'user') return el(`<div class="msg-u">${esc(m.mostrar || m.content)}</div>`);
    const w = el(`<div class="msg-ia"><div class="quem">${ic('brilho', 14)}Assistant</div><div class="md"></div></div>`);
    const md = w.querySelector('.md');
    if (m.erro && m.codigo === 'local_nao_instalada') {
      md.innerHTML = `<div class="explica"><strong>Shall we turn on PyForge AI?</strong><div class="muted">It runs on your computer, free and without a key. Pick a model to download (only the first time). Prefer Claude or another AI? <a href="#" data-cfg>Set up the AI</a>.</div><div data-painel></div></div>`;
      md.querySelector('[data-cfg]').onclick = (e) => { e.preventDefault(); ir('/config?aba=ia'); };
      painelIALocal(md.querySelector('[data-painel]'), {
        compacto: true,
        aoPronto: () => {
          const ultima = [...msgs].reverse().find((x) => x.role === 'user');
          const idx = msgs.indexOf(m);
          if (idx >= 0) msgs.splice(idx - 1, 2);
          renderTudo();
          if (ultima) enviar(ultima.content, { mostrar: ultima.mostrar });
        },
      });
      return w;
    }
    if (m.erro) {
      md.innerHTML = `<div class="explica" style="border-color:#5A2A2E"><strong class="err">Could not answer</strong><div style="white-space:pre-wrap">${esc(m.erro)}</div><div><button class="btn peq" data-cfg>Set up the AI</button></div></div>`;
      md.querySelector('[data-cfg]').onclick = () => ir('/config?aba=ia');
      return w;
    }
    if (!final && !m.content && (m.status || m.inicio)) {
      const seg = m.inicio ? Math.round((performance.now() - m.inicio) / 1000) : 0;
      md.innerHTML = `<div class="dim" style="font-style:italic;display:flex;align-items:center;gap:8px"><span class="girando">${ic('brilho', 14)}</span>${esc(m.status || 'Reading your question…')}${seg >= 2 ? ` <span class="mono" style="font-style:normal">${seg}s</span>` : ''}</div>`;
      return w;
    }
    for (const parte of markdown(m.content || '')) {
      if (parte.tipo === 'texto') md.insertAdjacentHTML('beforeend', textoMd(parte.v));
      else md.appendChild(blocoCodigo(parte, i, final && !parte.aberto));
    }
    if (!final) md.classList.add('digitando');
    if (final && m.content && i >= 0) w.appendChild(barraAvaliacao(m, i));
    return w;
  }

  // 👍 / 👎: cada avaliação vira um exemplo para treinar a PyForge IA (fica só no seu PC).
  function barraAvaliacao(m, i) {
    const v = m.vel;
    const lento = v && v.escrita > 0 && v.escrita < 3;
    const b = el(`<div class="avaliar"><button class="ib peq ${m.nota === 1 ? 'on' : ''}" data-n="1" title="Boa resposta" aria-label="Boa resposta" aria-pressed="${m.nota === 1}">${ic('joinha', 14)}</button><button class="ib peq ${m.nota === -1 ? 'on ruim' : ''}" data-n="-1" title="Resposta ruim" aria-label="Resposta ruim" aria-pressed="${m.nota === -1}">${ic('joinhaBaixo', 14)}</button><span class="dim" data-obg>${m.nota ? 'Thanks! This helps train PyForge AI.' : ''}</span>${v && v.escrita > 0 ? `<span class="grow"></span><span class="dim mono" title="Leu ${v.lidos} pieces a ${v.leitura.toFixed(0)}/s e escreveu ${v.escritos} a ${v.escrita.toFixed(1)}/s">⚡ ${v.escrita.toFixed(1).replace('.', ',')} tokens/s</span>` : ''}</div>`);
    if (lento) {
      const dica = el(`<div class="dim" style="font-size:12px;margin-top:4px">Your PC is generating slowly for this model. <a href="#" data-leve>Use the Light model</a> makes it much faster.</div>`);
      dica.querySelector('[data-leve]').onclick = (e) => { e.preventDefault(); ir('/config?aba=ia'); };
      const cx = el('<div></div>');
      cx.append(b, dica);
      ligarAvaliacao(b, m, i);
      return cx;
    }
    ligarAvaliacao(b, m, i);
    return b;
  }

  function ligarAvaliacao(b, m, i) {
    b.querySelectorAll('[data-n]').forEach((bt) => (bt.onclick = async () => {
      const nota = +bt.dataset.n;
      if (m.nota === nota) return;
      let correcao = '';
      if (nota === -1) {
        const r = await perguntar('What was wrong?', 'Optional: tell what was missing or what the right answer would be. This becomes a training example.', '', 'It stays only on your computer.');
        correcao = r || '';
      }
      const conversa = msgs.slice(0, i + 1).filter((x) => !x.erro && x.content).map((x) => ({ role: x.role, content: x.content }));
      try {
        await api('ia/feedback', { nota, mensagens: conversa, contexto: m.contexto || '', onde: chave, correcao });
        m.nota = nota;
        const alvo = b.parentElement && b.parentElement.classList.contains('msg-ia') ? b : b.parentElement;
        alvo.replaceWith(barraAvaliacao(m, i));
      } catch (e) { toast(e.message, 'err'); }
    }));
  }

  function renderTudo() {
    caixaMsgs.innerHTML = '';
    if (!msgs.length) {
      const boas = el(`<div class="msg-ia"><div class="quem">${ic('brilho', 14)}Assistant</div><div class="md">${textoMd(op.boasVindas || 'Hi! I can explain errors, write code, create tests and build screens. What are we doing?')}</div></div>`);
      caixaMsgs.appendChild(boas);
      if (op.sugestoes && op.sugestoes.length) {
        const s = el('<div class="flex" style="flex-wrap:wrap;gap:6px"></div>');
        for (const t of op.sugestoes) {
          const c = el(`<button class="chip">${ic('brilho', 13)}${esc(t)}</button>`);
          c.onclick = () => enviar(t);
          s.appendChild(c);
        }
        caixaMsgs.appendChild(s);
      }
    }
    msgs.forEach((m, i) => caixaMsgs.appendChild(renderMsg(m, i)));
    caixaMsgs.scrollTop = caixaMsgs.scrollHeight;
  }

  async function enviar(texto, extra = {}) {
    texto = (texto || '').trim();
    if (!texto || controlador) return;
    msgs.push({ role: 'user', content: texto, mostrar: extra.mostrar });
    const resposta = { role: 'assistant', content: '' };
    msgs.push(resposta);
    renderTudo();
    let noAtual = caixaMsgs.lastElementChild;
    controlador = new AbortController();
    btParar.style.display = '';
    btEnviar.disabled = true;
    let contexto = '';
    try { contexto = op.obterContexto ? await op.obterContexto() : ''; } catch (e) { contexto = ''; }
    if (op.modos) contexto += '\n\n' + INSTRUCOES_MODO[modo];
    contexto += `

Preferred explanation level: ${cfg('ia.nivel', 'intermediario')}.`;
    resposta.contexto = contexto.slice(0, 8000);
    resposta.inicio = performance.now();
    const relogio = setInterval(() => {
      if (resposta.content || !controlador) { clearInterval(relogio); return; }
      const novo = renderMsg(resposta, msgs.length - 1, false); noAtual.replaceWith(novo); noAtual = novo;
    }, 1000);
    const historico = msgs.slice(0, -1).filter((m) => !m.erro && m.content).map((m) => ({ role: m.role, content: m.content }));
    let ultimoRender = 0;
    try {
      await conversarIA({ mensagens: historico, contexto }, (t) => {
        resposta.content += t;
        const agora = performance.now();
        if (agora - ultimoRender > 60) {
          ultimoRender = agora;
          const novo = renderMsg(resposta, msgs.length - 1, false);
          noAtual.replaceWith(novo);
          noAtual = novo;
          const perto = caixaMsgs.scrollHeight - caixaMsgs.scrollTop - caixaMsgs.clientHeight < 160;
          if (perto) caixaMsgs.scrollTop = caixaMsgs.scrollHeight;
        }
      }, controlador.signal, (st, vel) => {
        if (vel) { resposta.vel = vel; return; }
        resposta.status = st;
        if (!resposta.content) { const novo = renderMsg(resposta, msgs.length - 1, false); noAtual.replaceWith(novo); noAtual = novo; }
      });
      api('stats', { tipo: 'ia' }).catch(() => {});
    } catch (e) {
      if (e.name !== 'AbortError') { resposta.erro = e.message; resposta.codigo = e.codigo || ''; }
      else if (!resposta.content) resposta.content = '_(resposta interrompida)_';
    } finally {
      controlador = null;
      btParar.style.display = 'none';
      btEnviar.disabled = false;
      const novo = renderMsg(resposta, msgs.length - 1, true);
      noAtual.replaceWith(novo);
      caixaMsgs.scrollTop = caixaMsgs.scrollHeight;
      if (op.aoResponder) op.aoResponder(resposta);
    }
  }

  btEnviar.onclick = () => { const v = txt.value; txt.value = ''; autoAltura(); enviar(v); };
  btParar.onclick = () => controlador && controlador.abort();
  const autoAltura = () => { txt.style.height = 'auto'; txt.style.height = Math.min(180, txt.scrollHeight) + 'px'; };
  txt.addEventListener('input', autoAltura);
  txt.addEventListener('focus', pintarChips);
  txt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btEnviar.onclick(); }
  });
  raiz.querySelector('[data-novo]').onclick = () => { if (controlador) controlador.abort(); msgs.length = 0; renderTudo(); };
  if (op.aoFechar) raiz.querySelector('[data-fechar]').onclick = op.aoFechar;
  renderTudo();

  return {
    elemento: raiz,
    enviar,
    focar: () => txt.focus(),
    definirTexto: (t) => { txt.value = t; autoAltura(); txt.focus(); },
    definirModo: (m) => { modo = m; pintarModos(); },
    atualizarChips: pintarChips,
  };
}
