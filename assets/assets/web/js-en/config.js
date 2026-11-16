// Configurações (salvas de verdade em config.json).
import { painelIALocal } from './ia_local.js';
import { painelLinguagens } from './linguagens.js';
import { api, conversarIA } from './api.js';
import { el, esc, ic, toast, modal, confirmar } from './ui.js';
import { estado, ir, cfg, salvarConfig } from './app.js';

const FONTES = { cascadia: 'Cascadia Code, Consolas, monospace', consolas: 'Consolas, Cascadia Code, monospace', jetbrains: 'JetBrains Mono, Cascadia Code, Consolas, monospace' };

const DEFS = [
  { aba: 'geral', id: 'idioma', tipo: 'seg', titulo: 'Idioma · Language', desc: 'Português ou English. O PyForge recarrega na hora. · PyForge reloads right away.', opcoes: [['pt', 'Português'], ['en', 'English']], padrao: 'pt' },
  { aba: 'geral', id: 'workspace', tipo: 'pasta', titulo: 'Projects folder', desc: 'Where new projects are created. The lobby lists the folders in here.' },
  { aba: 'geral', id: 'python.versaoPadrao', tipo: 'seg', titulo: 'Python version for new projects', desc: 'PyForge downloads and manages Python by itself, without touching the system Python. 3.13 is the most compatible today.', opcoes: [['3.12', '3.12'], ['3.13', '3.13'], ['3.14', '3.14'], ['3.15', '3.15']], padrao: '3.13', resolve: 'Itens 153–157' },

  { aba: 'editor', id: 'editor.tamanhoFonte', tipo: 'numero', titulo: 'Font size', desc: 'You can also use Ctrl+= and Ctrl+- in the editor.', min: 10, max: 24, padrao: 14 },
  { aba: 'editor', id: 'editor.fonte', tipo: 'seg', titulo: 'Code font', desc: 'Monospaced fonts made for programming.', opcoes: [[FONTES.cascadia, 'Cascadia Code'], [FONTES.consolas, 'Consolas'], [FONTES.jetbrains, 'JetBrains Mono']], padrao: FONTES.jetbrains },
  { aba: 'editor', id: 'editor.autoSalvar', tipo: 'seg', titulo: 'Auto save', desc: 'Never lose code again by forgetting Ctrl+S.', opcoes: [['desligado', 'Off'], ['foco', 'When leaving the file'], ['atraso', 'After 1 second']], padrao: 'atraso' },
  { aba: 'editor', id: 'editor.formatarAoSalvar', tipo: 'toggle', titulo: 'Format on save (Ruff)', desc: 'Fixes spaces, indentation and quotes every time you save with Ctrl+S.', padrao: true, resolve: 'Item 1' },
  { aba: 'editor', id: 'editor.paresColoridos', tipo: 'toggle', titulo: 'Parentheses colored by level', desc: 'Each pair of ( ), [ ] and { } gets a color, to find what was left open.', padrao: true, resolve: 'Itens 2, 28' },
  { aba: 'editor', id: 'editor.guias', tipo: 'toggle', titulo: 'Indentation guides', desc: 'Vertical lines show each indentation level.', padrao: true, resolve: 'Item 1' },
  { aba: 'editor', id: 'editor.cabecalhoFixo', tipo: 'toggle', titulo: 'Sticky function and class header', desc: 'While scrolling, shows which def or class you are in.', padrao: true },
  { aba: 'editor', id: 'editor.minimapa', tipo: 'toggle', titulo: 'Minimap', desc: 'File minimap on the right, with errors marked.', padrao: true },
  { aba: 'editor', id: 'editor.quebraLinha', tipo: 'toggle', titulo: 'Word wrap', desc: 'Long lines continue below instead of going off screen (Alt+Z).', padrao: false },
  { aba: 'editor', id: 'editor.ligaduras', tipo: 'toggle', titulo: 'Font ligatures', desc: 'Shows -> and >= as single symbols (needs a font with ligatures).', padrao: false },
  { aba: 'editor', id: 'editor.chatAberto', tipo: 'toggle', titulo: 'Open the AI chat together with the editor', desc: 'You can open and close it anytime with Ctrl+Alt+I.', padrao: true },

  { aba: 'python', id: 'python.armadilhas', tipo: 'toggle', titulo: 'Warn about classic Python traps', desc: 'Mutable default argument, lambda in a loop, is instead of ==, input() treated as a number, a call that freezes the window, a widget deleted by the garbage collector and more.', padrao: true, resolve: 'Itens 4, 9, 10, 13–16, 18, 30, 33–38, 41, 53, 55, 62, 63, 86, 90' },
  { aba: 'python', id: 'python.ruff', tipo: 'toggle', titulo: 'Ruff analysis', desc: 'Finds undefined names, unused imports, forgotten variables and syntax errors — explained in plain English.', padrao: true, resolve: 'Itens 3, 17, 171' },
  { aba: 'python', id: 'python.analisarAoDigitar', tipo: 'toggle', titulo: 'Analyze while typing', desc: 'Shows problems without saving.', padrao: true },

  { aba: 'ia', id: 'ia.provedor', tipo: 'seg', titulo: 'Who answers', desc: 'PyForge AI runs on your computer, free and without a key. Claude and OpenAI are smarter but need a key (pay per use). Ollama is for people who already use Ollama.', opcoes: [['pyforge', 'PyForge AI (free, on your PC)'], ['anthropic', 'Claude (Anthropic)'], ['openai', 'OpenAI'], ['ollama', 'Ollama']], padrao: 'pyforge' },
  { aba: 'ia', id: 'ia.chave', so: 'nuvem', tipo: 'senha', titulo: 'API key', desc: 'It is stored only on your computer, encrypted by your Windows account. Get yours at console.anthropic.com or platform.openai.com.' },
  { aba: 'ia', id: 'ia.modelo', so: 'nuvem', tipo: 'texto', titulo: 'Template', desc: 'Leave empty to use the default: claude-sonnet-5-5 (Claude), gpt-4.1 (OpenAI) or qwen2.5-coder:7b (Ollama).', placeholder: 'default' },
  { aba: 'ia', id: 'ia.baseURL', so: 'nuvem', tipo: 'texto', titulo: 'API address (optional)', desc: 'To use OpenRouter, LM Studio, Groq or another OpenAI-compatible service. Ollama: http://localhost:11434/v1', placeholder: 'provider default' },
  { aba: 'ia', id: 'ia.nivel', tipo: 'seg', titulo: 'Explanation level', desc: 'The AI adjusts the vocabulary and the length of its explanations.', opcoes: [['iniciante', 'Beginner'], ['intermediario', 'Intermediate'], ['avancado', 'Advanced']], padrao: 'intermediario' },
  { aba: 'ia', id: 'ia.instrucoesExtras', tipo: 'area', titulo: 'Extra instructions for the AI', desc: 'E.g. “Always use type hints”, “Explain like I\'m 12”, “Prefer Tkinter”.', placeholder: 'Optional' },

  { aba: 'designer', id: 'designer.toolkit', tipo: 'seg', titulo: 'Screens toolkit', desc: 'PySide6 (Qt) looks nicer and is more complete. Tkinter comes with Python and needs nothing installed.', opcoes: [['pyside6', 'PySide6 (Qt)'], ['tkinter', 'Tkinter']], padrao: 'pyside6', resolve: 'Itens 81–82, 96' },
  { aba: 'designer', id: 'designer.temaPadrao', tipo: 'seg', titulo: 'Theme for new screens', desc: 'You can change it on each screen later.', opcoes: [['claro', 'Light'], ['escuro', 'Dark']], padrao: 'claro', resolve: 'Item 101' },
];

const ABAS = [['conta', 'Your account'], ['geral', 'General'], ['editor', 'Editor'], ['python', 'Python'], ['ia', 'AI'], ['designer', 'Designer'], ['linguagens', 'Languages'], ['atalhos', 'Shortcuts'], ['sobre', 'About']];

const ATALHOS = [
  ['Save', 'Ctrl+S'], ['Run the file', 'F5'], ['Stop the program', 'Shift+F5'], ['Quick open file', 'Ctrl+P'],
  ['Editor command palette', 'F1'], ['Format document', 'Shift+Alt+F'], ['Find / Replace', 'Ctrl+F / Ctrl+H'],
  ['Search all files', 'Ctrl+Shift+F'], ['Comment line', 'Ctrl+/'], ['Rename symbol', 'F2'], ['Go to definition', 'F12'],
  ['Next occurrence (multi-cursor)', 'Ctrl+D'], ['Cursor on several lines', 'Ctrl+Alt+↑ / ↓'], ['Move line', 'Alt+↑ / ↓'],
  ['Show/hide sidebar', 'Ctrl+B'], ['Show/hide panel', 'Ctrl+J'], ['Terminal', 'Ctrl+`'], ['AI chat', 'Ctrl+Alt+I'],
  ['Problems', 'Ctrl+Shift+M'], ['Git', 'Ctrl+Shift+G'], ['New file', 'Ctrl+N'], ['Close tab', 'Ctrl+W'], ['Word wrap', 'Alt+Z'],
  ['Increase / decrease font', 'Ctrl+= / Ctrl+-'], ['Designer: undo / redo', 'Ctrl+Z / Ctrl+Y'], ['Designer: delete widget', 'Delete'], ['Designer: duplicate widget', 'Ctrl+D'], ['Designer: save screen', 'Ctrl+S'],
];

let aba = 'geral';

export async function montar(app, params) {
  aba = params.aba || 'geral';
  let busca = '';
  const raiz = el(`<div style="display:flex;flex-direction:column;height:100%">
    <header class="titulo">
      <button class="logo" data-lobby aria-label="Back to lobby" title="Back to lobby">${ic('logo', 17)}</button>
      <span class="marca">PyForge</span>
      <button class="btn ghost peq" data-lobby>${ic('home', 14)}Lobby</button>
      <span class="grow"></span>
      <span class="pill ok" data-salvo>All saved</span>
    </header>
    <main class="conteudo"><div class="conteudo-in" style="max-width:1100px">
      <h1 style="margin:0;font-size:22px">Settings</h1>
      <div class="cfg-abas" role="tablist" data-abas></div>
      <label class="flex" style="height:40px;padding:0 12px;background:var(--panel);border:1px solid var(--bd2);border-radius:10px;color:var(--dim)">${ic('busca', 16)}<input data-busca placeholder="Search settings (e.g. font, key, types)" style="flex:1;background:transparent;border:0;outline:none" aria-label="Search settings"></label>
      <div data-corpo style="display:flex;flex-direction:column;gap:12px"></div>
    </div></main></div>`);
  app.appendChild(raiz);
  raiz.querySelectorAll('[data-lobby]').forEach((b) => (b.onclick = () => ir('/lobby')));
  const marcarSalvo = () => { const s = raiz.querySelector('[data-salvo]'); const d = new Date(); s.textContent = 'Saved at ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  raiz.querySelector('[data-busca]').addEventListener('input', (e) => { busca = e.target.value.toLowerCase(); pintar(); });

  async function salvar(parcial) {
    try { await salvarConfig(parcial); marcarSalvo(); } catch (e) { toast(e.message, 'err'); }
  }

  function pintar() {
    const abas = raiz.querySelector('[data-abas]');
    abas.innerHTML = '';
    for (const [id, rot] of ABAS) {
      const b = el(`<button class="cfg-aba ${!busca && aba === id ? 'on' : ''}" role="tab" aria-selected="${aba === id}">${rot}</button>`);
      b.onclick = () => { aba = id; busca = ''; raiz.querySelector('[data-busca]').value = ''; pintar(); };
      abas.appendChild(b);
    }
    const corpo = raiz.querySelector('[data-corpo]');
    corpo.innerHTML = '';
    if (!busca && aba === 'atalhos') {
      const t = el('<div class="card" style="overflow:hidden"></div>');
      for (const [cmd, k] of ATALHOS) t.appendChild(el(`<div class="flex" style="padding:10px 16px;border-bottom:1px solid #1B1E25"><span class="grow">${esc(cmd)}</span><span class="flex" style="gap:4px">${k.split(' / ').map((x) => `<span class="kbd-chip" style="font-size:12px;padding:2px 8px">${esc(x)}</span>`).join('<span class="dim">ou</span>')}</span></div>`));
      corpo.appendChild(t);
      return;
    }
    if (!busca && aba === 'conta') {
      const alvo = el('<div></div>');
      corpo.appendChild(alvo);
      import('./entrar.js').then((m) => m.painelConta(alvo));
      return;
    }
    if (!busca && aba === 'linguagens') {
      const alvo = el('<div></div>');
      corpo.appendChild(alvo);
      painelLinguagens(alvo);
      return;
    }
    if (!busca && aba === 'sobre') {
      corpo.appendChild(el(`<div class="card" style="padding:20px;display:flex;flex-direction:column;gap:10px">
        <div class="flex"><span class="logo">${ic('logo', 17)}</span><div><div style="font-weight:700;font-size:16px">PyForge ${esc(estado.ping.versao)}</div><div class="muted">The app for programming Python, with AI.</div></div></div>
        <div class="muted">uv (ambientes e pacotes): <span class="${estado.ping.uv ? 'ok' : 'err'}">${estado.ping.uv ? 'ready' : 'not found'}</span> · Git: <span class="${estado.ping.git ? 'ok' : 'warn'}">${estado.ping.git ? 'installed' : 'not installed'}</span></div>
        <div class="muted">Data folder: <span class="mono">${esc(estado.ping.dados)}</span> (settings, log and trash)</div>
        <div class="dim" style="font-size:12px">Open-source components: Monaco Editor (MIT), uv (MIT/Apache-2.0), Ruff (MIT), jedi (MIT), PyInstaller (GPL with an exception for apps).</div>
      </div>`));
      return;
    }
    const local = cfg('ia.provedor', 'pyforge') === 'pyforge';
    const lista = DEFS.filter((d) => (busca ? (d.titulo + ' ' + d.desc).toLowerCase().includes(busca) : d.aba === aba) && !(d.so === 'nuvem' && local));
    const grade = el('<div class="grade-cfg"></div>');
    for (const d of lista) grade.appendChild(opcao(d));
    corpo.appendChild(grade);
    if (!lista.length) corpo.appendChild(el('<div class="card muted" style="padding:28px;text-align:center">No setting with that name.</div>'));
    if (!busca && aba === 'ia' && local) {
      const card = el(`<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px"><div><div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px"><span style="color:var(--ac-tx);display:flex">${ic('brilho', 17)}</span>PyForge AI</div><div class="muted" style="font-size:12.5px">Pick the size of the “brain”. The bigger, the smarter and heavier. Downloads only once.</div></div><div data-painel></div></div>`);
      corpo.appendChild(card);
      painelIALocal(card.querySelector('[data-painel]'));
    }
    if (!busca && aba === 'ia') {
      const treino = el(`<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:10px">
        <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px"><span style="color:var(--yel);display:flex">${ic('joinha', 17)}</span>Train PyForge AI</div>
        <div class="muted" style="font-size:12.5px;line-height:1.55">Each 👍 or 👎 you give to answers becomes a training example, kept only on your computer. With the <strong>training kit</strong> you use these examples (plus the hundreds already in the kit) to train a smarter PyForge AI on Google Colab and put the result in the models folder.</div>
        <div class="flex" style="gap:8px;flex-wrap:wrap"><span class="pill ok" data-bons>👍 …</span><span class="pill err" data-ruins>👎 …</span><span class="grow"></span>
        <button class="btn peq pri" data-kit>${ic('download', 13)}Generate the training kit</button><button class="btn peq" data-arq>${ic('pastaAberta', 13)}See the examples</button><button class="btn peq perigo" data-apagar>Delete examples</button></div></div>`);
      corpo.appendChild(treino);
      const resumo = async () => { try { const r = await api('ia/feedback/resumo'); treino.querySelector('[data-bons]').textContent = `👍 ${r.bons} ${r.bons === 1 ? "boa" : "boas"}`; treino.querySelector('[data-ruins]').textContent = `👎 ${r.ruins} ${r.ruins === 1 ? "ruim" : "ruins"}`; treino.dataset.arquivo = r.arquivo; } catch { /* ignora */ } };
      resumo();
      treino.querySelector('[data-arq]').onclick = () => api('fs/revelar', { caminho: treino.dataset.arquivo }).catch(() => toast('No examples yet: give 👍 or 👎 to some answer.', 'info'));
      treino.querySelector('[data-apagar]').onclick = async () => { if (await confirmar('Delete examples', 'Delete all saved 👍 and 👎? This cannot be undone.', 'Delete', true)) { await api('ia/feedback/apagar', {}); resumo(); } };
      treino.querySelector('[data-kit]').onclick = async () => {
        try { const r = await api('ia/kit', {}); toast(`Kit ready in ${r.pasta} (${r.exemplos} exemplos). Abra o LEIA-ME.`, 'ok', 9000); } catch (e) { toast(e.message, 'err'); }
      };
    }
    if (!busca && aba === 'ia') {
      const extra = el(`<div class="card" style="padding:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn pri" data-testar>${ic('brilho', 15)}Test connection</button><button class="btn" data-prompt>${ic('livro', 15)}View the AI prompt</button><span class="muted grow" data-res></span></div>`);
      extra.querySelector('[data-testar]').onclick = async () => {
        const r = extra.querySelector('[data-res]');
        r.textContent = 'Testing…';
        let t = '';
        try { await conversarIA({ mensagens: [{ role: 'user', content: 'Say “Hi! I\'m working.” and one more short, friendly sentence.' }], contexto: 'Connection test.' }, (x) => { t += x; r.textContent = t; }); r.className = 'ok grow'; }
        catch (e) { r.textContent = e.message; r.className = 'err grow'; }
      };
      extra.querySelector('[data-prompt]').onclick = async () => {
        const r = await fetch('/api/prompt', { headers: { 'X-PyForge-Token': sessionStorage.getItem('pyforge-token') } });
        const texto = await r.text();
        modal({ titulo: 'PyForge AI prompt', largo: true, corpo: `<div class="muted" style="font-size:12.5px">${texto.length.toLocaleString('pt-BR')} characters. This is what the AI receives before each conversation (cached, so it stays cheap).</div><pre class="saida card" style="padding:14px;margin:0;flex:1;overflow:auto;white-space:pre-wrap">${esc(texto)}</pre>` });
      };
      corpo.appendChild(extra);
    }
  }

  function opcao(d) {
    const valor = d.id === 'workspace' ? cfg('workspace', '') : cfg(d.id, d.padrao);
    const caminhoObj = (v) => { const partes = d.id.split('.'); const o = {}; let at = o; partes.forEach((p, i) => { if (i === partes.length - 1) at[p] = v; else { at[p] = {}; at = at[p]; } }); return o; };
    const c = el(`<div class="card opcao"><div class="grow" style="display:flex;flex-direction:column;gap:8px"><div><div class="t">${esc(d.titulo)}</div><div class="d">${esc(d.desc)}</div></div><div data-ctrl></div>${d.resolve ? `<div><span class="pill info">Fixes: ${esc(d.resolve)}</span></div>` : ''}</div></div>`);
    const ctrl = c.querySelector('[data-ctrl]');
    if (d.tipo === 'toggle') {
      ctrl.remove();
      const s = el(`<button class="switch" role="switch" aria-checked="${!!valor}" aria-label="${esc(d.titulo)}"></button>`);
      s.onclick = () => { const v = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', v); salvar(caminhoObj(v)); };
      c.appendChild(s);
    } else if (d.tipo === 'seg') {
      const seg = el(`<div class="seg" role="radiogroup" aria-label="${esc(d.titulo)}"></div>`);
      for (const [v, rot] of d.opcoes) {
        const b = el(`<button role="radio" class="${v === valor ? 'on' : ''}" aria-checked="${v === valor}">${esc(rot)}</button>`);
        b.onclick = () => { seg.querySelectorAll('button').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', false); }); b.classList.add('on'); b.setAttribute('aria-checked', true); salvar(caminhoObj(v)); if (d.id === 'ia.provedor') setTimeout(pintar, 50); if (d.id === 'idioma') setTimeout(() => location.reload(), 250); };
        seg.appendChild(b);
      }
      ctrl.appendChild(seg);
    } else if (d.tipo === 'numero') {
      const w = el(`<div class="flex"><input type="range" min="${d.min}" max="${d.max}" value="${valor}" style="flex:1;accent-color:var(--ac)" aria-label="${esc(d.titulo)}"><span class="mono" style="width:40px;text-align:right">${valor}px</span></div>`);
      const r = w.querySelector('input');
      r.oninput = () => { w.querySelector('span').textContent = r.value + 'px'; };
      r.onchange = () => salvar(caminhoObj(+r.value));
      ctrl.appendChild(w);
    } else if (d.tipo === 'texto' || d.tipo === 'area') {
      const inp = el(d.tipo === 'area' ? `<textarea class="campo" rows="3" placeholder="${esc(d.placeholder || '')}" aria-label="${esc(d.titulo)}" style="width:100%"></textarea>` : `<input class="campo" placeholder="${esc(d.placeholder || '')}" aria-label="${esc(d.titulo)}" style="width:100%">`);
      inp.value = valor || '';
      inp.onchange = () => salvar(caminhoObj(inp.value.trim()));
      ctrl.appendChild(inp);
    } else if (d.tipo === 'senha') {
      const tem = cfg('ia.temChave', false);
      const w = el(`<div style="display:flex;flex-direction:column;gap:6px"><div class="flex"><input class="campo grow" type="password" autocomplete="off" placeholder="${tem ? '•••••••••• (chave salva)' : 'Paste your key here'}" aria-label="API key"><button class="btn pri" data-s>Save key</button>${tem ? '<button class="btn perigo" data-a>Delete</button>' : ''}</div><span class="${tem ? 'ok' : 'dim'}" style="font-size:12px">${tem ? '✓ Chave salva' : 'No key saved'}</span></div>`);
      w.querySelector('[data-s]').onclick = async () => { const v = w.querySelector('input').value.trim(); if (!v) return; await salvar({ ia: { chave: v } }); toast('Key saved securely.', 'ok'); pintar(); };
      if (tem) w.querySelector('[data-a]').onclick = async () => { await salvar({ ia: { chave: '' } }); toast('Key deleted.', 'ok'); pintar(); };
      ctrl.appendChild(w);
    } else if (d.tipo === 'pasta') {
      const w = el(`<div class="flex"><input class="campo grow mono" style="font-size:12.5px" aria-label="Projects folder"><button class="btn" data-e>${ic('pastaAberta', 14)}Choose…</button></div>`);
      const inp = w.querySelector('input');
      inp.value = valor;
      inp.onchange = () => salvar({ workspace: inp.value.trim() });
      w.querySelector('[data-e]').onclick = async () => { const r = await api('escolher-pasta').catch(() => ({})); if (r.caminho) { inp.value = r.caminho; salvar({ workspace: r.caminho }); } else if (r.erro) toast('Type the path in the field.', 'info'); };
      ctrl.appendChild(w);
    }
    return c;
  }

  pintar();
}
