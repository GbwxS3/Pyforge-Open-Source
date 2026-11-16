// Lobby: projetos, modelos, estatísticas e IA.
import { api, iniciarJob } from './api.js';
import { fmt, el, esc, ic, toast, modal, perguntar, tempoRelativo, iniciais, tintaDe, menuContexto, confirmar } from './ui.js';
import { estado, ir, cfg } from './app.js';
import { criarChat } from './ia.js';

let dados = { projetos: [], workspace: '' };
let vista = 'inicio';
let filtro = '';

export async function montar(app, params) {
  vista = params.v || 'inicio';
  const raiz = el(`<div style="display:flex;flex-direction:column;height:100%">
    <header class="titulo">
      <span class="logo" aria-hidden="true">${ic('logo', 17)}</span>
      <span class="marca">PyForge</span>
      <span class="dim" style="font-size:12px">v${esc(estado.ping.versao)}</span>
      <div class="busca-topo"><label>${ic('busca', 15)}<input data-busca placeholder="Search projects" aria-label="Search projects"><span class="kbd-chip">Ctrl K</span></label></div>
      <button class="ib" title="Settings" aria-label="Settings" data-ir-config>${ic('engrenagem', 17)}</button>
      <button class="avatar" title="Your account" aria-label="Your account" data-ir-conta style="border:0;cursor:pointer">${esc(((estado.conta && estado.conta.conta && (estado.conta.conta.nome || estado.conta.conta.email)) || "?").trim().slice(0, 1).toUpperCase())}</button>
    </header>
    <div class="corpo">
      <nav class="nav-lat" aria-label="Main navigation">
        <button class="btn pri grande" data-novo style="margin-bottom:12px">${ic('mais', 16)}<span class="rot">New project</span></button>
        <button class="nav-item" data-v="inicio">${ic('home', 17)}<span class="rot">Home</span></button>
        <button class="nav-item" data-v="projetos">${ic('pasta', 17)}<span class="rot">Projects</span><span class="badge rot" data-qtd>0</span></button>
        <button class="nav-item" data-v="equipes">${ic('equipe', 17)}<span class="rot">Teams</span></button>
        <button class="nav-item" data-abrir-pasta>${ic('pastaAberta', 17)}<span class="rot">Open folder…</span></button>
        <div class="nav-sec"><span>TOOLS</span></div>
        <button class="nav-item" data-editor>${ic('codigo', 17)}<span class="rot">Code editor</span></button>
        <button class="nav-item" data-designer>${ic('paleta', 17)}<span class="rot">Interface Designer</span></button>
        <button class="nav-item" data-ir-config>${ic('engrenagem', 17)}<span class="rot">Settings</span></button>
        <div class="nav-sec"><span>RECENT</span></div>
        <div data-recentes style="display:flex;flex-direction:column;gap:2px"></div>
        <div style="flex:1;min-height:16px"></div>
        <a class="nav-item" href="https://docs.python.org/pt-br/3/" target="_blank" rel="noopener">${ic('livro', 17)}<span class="rot">Python documentation</span></a>
      </nav>
      <main class="conteudo"><div class="conteudo-in" data-view></div></main>
      <aside class="chat-lado" data-chat></aside>
    </div>
  </div>`);
  app.appendChild(raiz);

  const chat = criarChat(raiz.querySelector('[data-chat]'), {
    chaveHistorico: 'lobby',
    titulo: 'Assistant',
    boasVindas: 'Hi! I know your projects. I can **create an app**, **explain an error** or **answer Python questions**. Where do we start?',
    sugestoes: ['I want to create an app with a window', 'What is a virtual environment?', 'Teach me how to use lists'],
    obterContexto: () => {
      const l = dados.projetos.slice(0, 20).map((p) => `- ${p.nome} (${p.caminho}) · deps: ${p.deps.join(', ') || 'nenhuma'} · Python ${p.python || '?'}`).join('\n');
      return `# Onde o usuário está\nNo LOBBY do PyForge (lista de projetos). Não há arquivo aberto.\nPasta de projetos: ${dados.workspace}
Projects:
${l || '(none yet)'}

If the user wants to create a project, tell them to click "New project" and which template to pick.`;
    },
  });

  raiz.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { vista = b.dataset.v; pintar(); }));
  raiz.querySelectorAll('[data-ir-config]').forEach((b) => (b.onclick = () => ir('/config')));
  raiz.querySelector('[data-ir-conta]').onclick = () => ir('/config?aba=conta');
  raiz.querySelector('[data-novo]').onclick = () => novoProjeto();
  raiz.querySelector('[data-abrir-pasta]').onclick = () => abrirPasta();
  raiz.querySelector('[data-editor]').onclick = () => {
    const p = dados.projetos[0];
    if (p) ir('/editor?' + new URLSearchParams({ p: p.caminho })); else novoProjeto();
  };
  raiz.querySelector('[data-designer]').onclick = () => {
    const p = dados.projetos[0];
    if (p) ir('/designer?' + new URLSearchParams({ p: p.caminho })); else novoProjeto();
  };
  const busca = raiz.querySelector('[data-busca]');
  busca.addEventListener('input', () => { filtro = busca.value; if (vista !== 'projetos') vista = 'projetos'; pintar(); busca.focus(); });
  const atalho = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); busca.focus(); } };
  document.addEventListener('keydown', atalho);

  async function carregar() {
    try { dados = await api('projetos'); } catch (e) { toast(e.message, 'err'); }
    raiz.querySelector('[data-qtd]').textContent = dados.projetos.length;
    const rec = raiz.querySelector('[data-recentes]');
    rec.innerHTML = '';
    for (const p of dados.projetos.slice(0, 6)) {
      const a = el(`<button class="nav-item" title="${esc(p.caminho)}"><span class="ponto" style="background:${esc(p.cor || '#8FB0FF')}"></span><span class="rot ellipsis">${esc(p.nome)}</span></button>`);
      a.onclick = () => ir('/editor?' + new URLSearchParams({ p: p.caminho }));
      rec.appendChild(a);
    }
    pintar();
  }

  async function pintar() {
    raiz.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === vista));
    const alvo = raiz.querySelector('[data-view]');
    alvo.innerHTML = '';
    if (vista === 'inicio') await pintarInicio(alvo, chat);
    else if (vista === 'projetos') await pintarProjetos(alvo);
    else pintarEquipes(alvo);
  }

  await carregar();
  return () => document.removeEventListener('keydown', atalho);
}

function cartaoProjeto(p) {
  const cor = p.cor || '#8FB0FF';
  const stack = p.deps.length ? p.deps.slice(0, 3).join(' · ') : 'Plain Python';
  const st = !p.venv ? '<span class="pill warn">no environment yet</span>' : '<span class="pill ok">environment ready</span>';
  const c = el(`<article class="card hc proj">
    <div class="flex" style="gap:10px">
      <span class="ini" style="background:${tintaDe(cor)};color:${esc(cor)}">${esc(iniciais(p.nome))}</span>
      <div class="grow"><div style="font-weight:600" class="ellipsis">${esc(p.nome)}</div><div class="dim ellipsis" style="font-size:12px">${esc(stack)}${p.python ? ' · Python ' + esc(p.python) : ''}</div></div>
      <button class="ib" data-mais aria-label="More actions">${ic('mais3', 16)}</button>
    </div>
    <div class="flex" style="flex-wrap:wrap">${st}<span class="dim" style="font-size:12px">${fmt('{n} .py file(s)', { n: p.arquivosPy })}${p.telas ? fmt(' · {n} screen(s)', { n: p.telas }) : ''}</span><span class="grow"></span><span class="dim" style="font-size:12px">${esc(tempoRelativo(p.modificado))}</span></div>
    <div class="flex"><button class="btn grow" data-cod>${ic('codigo', 15)}Code</button><button class="btn grow" data-ui>${ic('paleta', 15)}Interface</button></div>
  </article>`);
  c.querySelector('[data-cod]').onclick = () => ir('/editor?' + new URLSearchParams({ p: p.caminho }));
  c.querySelector('[data-ui]').onclick = () => ir('/designer?' + new URLSearchParams({ p: p.caminho }));
  c.querySelector('[data-mais]').onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    menuContexto(r.left, r.bottom + 4, [
      { texto: 'Open in editor', acao: () => ir('/editor?' + new URLSearchParams({ p: p.caminho })) },
      { texto: 'Show in folder', acao: () => api('fs/revelar', { caminho: p.caminho }) },
      ...(p.noWorkspace ? [] : [{ texto: 'Remove from list', acao: async () => { if (await confirmar('Remove from list', 'The folder stays on your computer; it only leaves PyForge\'s list.', 'Remove')) { await api('projetos/esquecer', { caminho: p.caminho }); ir('/lobby?v=projetos'); location.reload(); } } }]),
    ]);
  };
  return c;
}

async function pintarInicio(alvo, chat) {
  const hora = new Date().getHours();
  const saud = hora < 12 ? 'Good morning' : hora < 18 ? 'Good afternoon' : 'Good evening';
  const hero = el(`<section class="card hero">
    <div><h1>${saud}! What are we building today?</h1><p class="muted" style="margin:4px 0 0">Describe an app, paste an error message or ask anything about Python.</p></div>
    <div class="caixa-ia"><span style="color:var(--ac-tx);display:flex">${ic('brilho', 18)}</span><input data-p placeholder="E.g. I want an app that organizes my files by type" aria-label="Ask the AI"><button class="btn pri grande" data-env>Send ${ic('enviar', 15)}</button></div>
    <div class="flex" style="flex-wrap:wrap" data-chips></div>
  </section>`);
  const inp = hero.querySelector('[data-p]');
  const env = () => { const v = inp.value.trim(); if (v) { chat.enviar(v); inp.value = ''; } };
  hero.querySelector('[data-env]').onclick = env;
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') env(); });
  for (const [t, icone, texto] of [['Create an app with a window', 'monitor', 'I want to create an app with a window. Which PyForge template do I pick and how do I start?'], ['Explain an error', 'bug', 'I\'ll paste a Python error for you to explain: '], ['Learn Python', 'livro', 'Give me a Python study plan for beginners, with exercises.'], ['Project ideas', 'brilho', 'Suggest 5 cool projects to practice Python.']]) {
    const c = el(`<button class="chip">${ic(icone, 14)}${esc(t)}</button>`);
    c.onclick = () => { if (texto.endsWith(': ')) { chat.definirTexto(texto); } else chat.enviar(texto); };
    hero.querySelector('[data-chips]').appendChild(c);
  }
  alvo.appendChild(hero);

  let stats = {};
  try { stats = await api('stats'); } catch {}
  const dias = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d.toISOString().slice(0, 10); });
  const serie = (tipo) => dias.map((d) => (stats[tipo] && stats[tipo][d]) || 0);
  const barras = (arr, cor) => { const m = Math.max(1, ...arr); return arr.map((v) => `<span style="height:${Math.max(3, Math.round((v / m) * 34))}px;background:${v ? cor : '#262A33'}"></span>`).join(''); };
  const exec = serie('execucoes'), ia = serie('ia');
  const soma = (a) => a.reduce((x, y) => x + y, 0);
  alvo.appendChild(el(`<section class="grade-stats" aria-label="Summary">
    <div class="card stat"><div class="muted" style="font-size:12px;font-weight:500">Projects</div><div class="v">${dados.projetos.length}</div><div class="dim" style="font-size:12px">${fmt('in {pasta}', { pasta: esc(dados.workspace) })}</div></div>
    <div class="card stat"><div class="muted" style="font-size:12px;font-weight:500">Runs · 14 days</div><div class="v">${soma(exec)}</div><div class="barras" role="img" aria-label="Runs per day">${barras(exec, '#5B8CFF')}</div></div>
    <div class="card stat"><div class="muted" style="font-size:12px;font-weight:500">AI answers · 14 days</div><div class="v">${soma(ia)}</div><div class="barras" role="img" aria-label="AI answers per day">${barras(ia, '#F2C14E')}</div></div>
    <div class="card stat"><div class="muted" style="font-size:12px;font-weight:500">Tools</div><div class="v" style="font-size:18px;margin-top:6px">${estado.ping.uv ? '<span class="ok">uv ready</span>' : '<span class="err">uv missing</span>'}</div><div class="dim" style="font-size:12px">${estado.ping.git ? 'Git: installed' : 'Git: not found'}</div></div>
  </section>`));

  const sec = el(`<section style="display:flex;flex-direction:column;gap:12px"><div class="flex"><h2 style="margin:0;font-size:15px;flex:1">Recent projects</h2><button class="btn ghost peq" data-todos>See all</button></div><div class="grade-proj" data-g></div></section>`);
  sec.querySelector('[data-todos]').onclick = () => { vista = 'projetos'; document.querySelector('[data-v="projetos"]').click(); };
  const g = sec.querySelector('[data-g]');
  if (!dados.projetos.length) {
    g.appendChild(el(`<div class="card" style="padding:28px;grid-column:1/-1;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center"><span class="icone-q">${ic('mais', 18)}</span><div style="font-weight:600">No projects yet</div><div class="muted">Create the first one from a ready-made template. PyForge installs Python by itself.</div><button class="btn pri" data-n>Create my first project</button></div>`));
    g.querySelector('[data-n]').onclick = () => novoProjeto();
  }
  for (const p of dados.projetos.slice(0, 6)) g.appendChild(cartaoProjeto(p));
  alvo.appendChild(sec);
}

async function pintarProjetos(alvo) {
  const cab = el(`<div class="flex" style="flex-wrap:wrap;gap:12px"><h1 style="margin:0;font-size:22px;flex:1">Projects</h1><button class="btn" data-abrir>${ic('pastaAberta', 15)}Open folder…</button><button class="btn pri" data-novo>${ic('mais', 15)}New project</button></div>`);
  cab.querySelector('[data-novo]').onclick = () => novoProjeto();
  cab.querySelector('[data-abrir]').onclick = () => abrirPasta();
  alvo.appendChild(cab);
  const f = filtro.toLowerCase();
  const lista = dados.projetos.filter((p) => !f || p.nome.toLowerCase().includes(f) || p.caminho.toLowerCase().includes(f));
  const t = el(`<div class="card tabela"><div class="linha-t cab"><span>Project</span><span>Packages</span><span>Python</span><span>Last edited</span><span>Open</span></div></div>`);
  for (const p of lista) {
    const cor = p.cor || '#8FB0FF';
    const r = el(`<div class="linha-t">
      <div class="flex" style="gap:10px;min-width:0"><span class="ini" style="width:30px;height:30px;font-size:11px;background:${tintaDe(cor)};color:${esc(cor)}">${esc(iniciais(p.nome))}</span><div class="grow"><div style="font-weight:600" class="ellipsis">${esc(p.nome)}</div><div class="dim ellipsis" style="font-size:12px" title="${esc(p.caminho)}">${esc(p.caminho)}</div></div></div>
      <span class="muted ellipsis">${esc(p.deps.join(', ') || '—')}</span>
      <span>${p.venv ? `<span class="pill ok">${esc(p.python || 'pronto')}</span>` : '<span class="pill warn">no environment</span>'}</span>
      <span class="muted">${esc(tempoRelativo(p.modificado))}</span>
      <div class="flex"><button class="btn peq" data-c>Code</button><button class="btn peq" data-u>Interface</button></div>
    </div>`);
    r.querySelector('[data-c]').onclick = () => ir('/editor?' + new URLSearchParams({ p: p.caminho }));
    r.querySelector('[data-u]').onclick = () => ir('/designer?' + new URLSearchParams({ p: p.caminho }));
    t.appendChild(r);
  }
  if (!lista.length) t.appendChild(el(`<div style="padding:28px;text-align:center" class="muted">${filtro ? 'No project with that name.' : 'No projects yet.'}</div>`));
  alvo.appendChild(t);
  const tpl = el(`<section style="display:flex;flex-direction:column;gap:12px"><h2 style="margin:0;font-size:15px">Start from a template</h2><div class="grade-tpl" data-g></div></section>`);
  try {
    for (const m of await api('templates')) {
      const b = el(`<button class="tpl"><span class="icone-q">${ic(iconeModelo(m.icone), 18)}</span><span><span style="display:block;font-weight:600">${esc(m.nome)}</span><span class="muted" style="display:block;font-size:12.5px;margin-top:2px">${esc(m.descricao)}</span></span></button>`);
      b.onclick = () => novoProjeto(m.id);
      tpl.querySelector('[data-g]').appendChild(b);
    }
  } catch {}
  alvo.appendChild(tpl);
}

function pintarEquipes(alvo) {
  alvo.appendChild(el(`<div style="display:flex;flex-direction:column;gap:16px">
    <h1 style="margin:0;font-size:22px">Teams</h1>
    <div class="card" style="padding:22px;display:flex;flex-direction:column;gap:12px">
      <div class="flex"><span class="icone-q">${ic('equipe', 18)}</span><div><div style="font-weight:700;font-size:15px">Online teams are coming in the next version</div><div class="muted">Working together in real time needs a server on the internet, and that does not fit inside the .exe alone.</div></div></div>
      <div class="secao-t" style="margin-top:6px">Coming next</div>
      <ul style="margin:0;padding-left:20px;color:var(--tx2);line-height:1.8">
        <li>Create a team and invite by code (PYF-XXXX-XXXX)</li>
        <li>Live editing with everyone's cursor</li>
        <li>Comments on the Designer screen and in the code</li>
        <li>Same Python environment for everyone (shared lockfile)</li>
      </ul>
      <div class="secao-t" style="margin-top:6px">How to work as a group today</div>
      <div class="muted">Use the panel <strong>Git</strong> in the editor and send the project to GitHub. Since PyForge creates the <code class="mono">uv.lock</code>, everyone installs exactly the same versions with a <code class="mono">uv sync</code>.</div>
    </div>
  </div>`));
}

function iconeModelo(n) {
  return { monitor: 'monitor', janela: 'janela', relogio: 'relogio', grafico: 'grafico', jogo: 'jogo', globo: 'globo', arquivo: 'arquivo' }[n] || 'arquivo';
}

export async function abrirPasta() {
  let r = { caminho: '' };
  try { r = await api('escolher-pasta'); } catch {}
  let caminho = r.caminho;
  if (!caminho) {
    caminho = await perguntar('Open folder', 'Project folder path', '', r.erro ? 'Paste the full path, for example C:\\Users\\you\\Documents\\my-project' : '');
    if (!caminho) return;
  }
  try {
    const info = await api('projetos/abrir', { caminho });
    ir('/editor?' + new URLSearchParams({ p: info.caminho }));
  } catch (e) { toast(e.message, 'err'); }
}

export async function novoProjeto(modeloInicial) {
  let modelos = [];
  try { modelos = await api('templates'); } catch (e) { toast(e.message, 'err'); return; }
  let escolhido = modeloInicial || modelos[0].id;
  let versao = cfg('python.versaoPadrao', '3.13');
  const corpo = el(`<div style="display:flex;flex-direction:column;gap:14px">
    <div class="prop"><label class="rotulo" for="np-nome">Project name</label><input id="np-nome" class="campo" placeholder="E.g. File Organizer" maxlength="60"></div>
    <div class="prop"><span class="rotulo">Template</span><div class="grade-tpl" data-m style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))"></div></div>
    <div class="prop"><span class="rotulo">Python version</span><div class="seg" data-v role="radiogroup" aria-label="Python version"></div><span class="dim" style="font-size:12px">Recommended: 3.13 (every library already supports it). PyForge installs the version by itself.</span></div>
    <div data-prog class="oculto"><div class="secao-t" style="margin-bottom:6px">Preparing the environment</div><div class="saida card" style="padding:10px;max-height:180px;overflow:auto" data-log></div></div>
  </div>`);
  const pm = corpo.querySelector('[data-m]');
  const pintarModelos = () => {
    pm.innerHTML = '';
    for (const m of modelos) {
      const b = el(`<button class="tpl ${m.id === escolhido ? 'on' : ''}" type="button" aria-pressed="${m.id === escolhido}"><span class="icone-q">${ic(iconeModelo(m.icone), 17)}</span><span><span style="display:block;font-weight:600">${esc(m.nome)}</span><span class="muted" style="display:block;font-size:12px;margin-top:2px">${esc(m.descricao)}</span></span></button>`);
      b.onclick = () => { escolhido = m.id; pintarModelos(); };
      pm.appendChild(b);
    }
  };
  pintarModelos();
  const pv = corpo.querySelector('[data-v]');
  const pintarV = () => {
    pv.innerHTML = '';
    for (const v of ['3.12', '3.13', '3.14', '3.15']) {
      const b = el(`<button role="radio" type="button" class="${v === versao ? 'on' : ''}" aria-checked="${v === versao}">${v}</button>`);
      b.onclick = () => { versao = v; pintarV(); };
      pv.appendChild(b);
    }
  };
  pintarV();
  let criado = null;
  const m = modal({
    titulo: 'New project',
    corpo,
    botoes: [
      { texto: 'Cancel', valor: null },
      {
        texto: 'Create project', classe: 'pri', acao: async (c) => {
          if (criado) { ir('/editor?' + new URLSearchParams({ p: criado })); return true; }
          const nome = c.querySelector('#np-nome').value.trim();
          if (!nome) { toast('Give the project a name', 'err'); return false; }
          try {
            const r = await api('projetos/criar', { nome, template: escolhido, python: versao });
            criado = r.caminho;
            const btn = m.fundo.querySelector('.modal-pe .pri');
            btn.textContent = 'Open in editor';
            if (r.job) {
              const prog = c.querySelector('[data-prog]');
              prog.classList.remove('oculto');
              const log = c.querySelector('[data-log]');
              log.innerHTML = '<span class="s">Installing Python and the template\'s packages (slow only the first time)…\n</span>';
              (await import('./api.js')).ouvirJob(r.job, (ev) => {
                if (ev.t === 'o' || ev.t === 'e') { log.insertAdjacentText('beforeend', ev.d); log.scrollTop = log.scrollHeight; }
                if (ev.t === 'fim') {
                  log.insertAdjacentHTML('beforeend', ev.c === 0 ? '<span class="v">\nEnvironment ready! ✓\n</span>' : '<span class="e">\nThe environment did not finish installing (no internet?). You can try again in the editor, under Environment › Sync.\n</span>');
                }
              });
            }
            toast('Project created!', 'ok');
            return false;
          } catch (e) { toast(e.message, 'err'); return false; }
        },
      },
    ],
    aoFechar: () => { if (criado && !location.hash.includes('editor')) location.reload(); },
  });
  void iniciarJob;
}
