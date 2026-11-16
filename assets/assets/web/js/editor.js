// Editor de código Python (Monaco + ferramentas reais).
import { api, q, iniciarJob, conversarIA } from './api.js';
import { fmt, el, esc, ic, toast, modal, perguntar, confirmar, menuContexto, barraMenus, debounce, nomeBase, juntar, relativo, pai } from './ui.js';
import { estado, ir, cfg, salvarConfig } from './app.js';
import { carregarMonaco } from './monaco.js';
import { criarChat } from './ia.js';
import { analisarTraceback, analisarSaida, textoRuff } from './explicacoes.js';
import { abrirListaErros, htmlExemplo } from './erros_lista.js';
import { carregarGravacao, criarPainelTempo } from './maquina_tempo.js';
import { explicarLinha, explicarPalavra } from './explicar_linha.js';
import { abrirTesteExemplo } from './testes_exemplo.js';
import { extensoesExecutaveis } from './linguagens.js';
import { painelJuntos, assinarJuntos, naoLidas, estaNaSala } from './juntos.js';
import { filtrarGif, mostrarGif, pararGravacao, MARCA_GIF } from './gravar_gif.js';
import { dialogoExe } from './exe.js';

let E = null; // estado da tela atual
let provedoresRegistrados = false;

const LINGUAGENS = { py: 'python', pyw: 'python', pyi: 'python', md: 'markdown', json: 'json', toml: 'ini', ini: 'ini', cfg: 'ini', txt: 'plaintext', html: 'html', htm: 'html', css: 'css', js: 'javascript', mjs: 'javascript', cjs: 'javascript', lua: 'lua', rb: 'ruby', php: 'php', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', cs: 'csharp', cpp: 'cpp', c: 'cpp', h: 'cpp', r: 'r', ts: 'typescript', yaml: 'yaml', yml: 'yaml', xml: 'xml', ui: 'xml', sql: 'sql', csv: 'plaintext', qss: 'css', bat: 'bat', ps1: 'powershell', sh: 'shell' };
const NOMES_LING = { python: 'Python', markdown: 'Markdown', json: 'JSON', ini: 'TOML/INI', plaintext: 'Texto', html: 'HTML', css: 'CSS', javascript: 'JavaScript', lua: 'Lua', ruby: 'Ruby', php: 'PHP', go: 'Go', rust: 'Rust', java: 'Java', kotlin: 'Kotlin', csharp: 'C#', cpp: 'C/C++', r: 'R', typescript: 'TypeScript', yaml: 'YAML', xml: 'XML', sql: 'SQL', bat: 'Batch', powershell: 'PowerShell', shell: 'Shell' };
const corArquivo = (n) => (/\.pyw?$/.test(n) ? '#6E9BFF' : /\.[mc]?js$/.test(n) ? '#F0DB4F' : /\.lua$/.test(n) ? '#7C8CFF' : /\.(toml|ini|cfg)$/.test(n) ? '#E3A33B' : /\.md$/.test(n) ? '#8FD3FF' : /\.json$/.test(n) ? '#FFD98A' : /\.pyforge\.json$/.test(n) ? '#C792EA' : '#A0A7B4');
const lingDe = (c) => LINGUAGENS[(c.split('.').pop() || '').toLowerCase()] || 'plaintext';

export function temAlteracoes() {
  if (!E) return false;
  for (const a of E.arquivos.values()) if (a.modelo && a.modelo.getAlternativeVersionId() !== a.versaoSalva) return true;
  return false;
}

export async function podeSair() {
  if (!temAlteracoes()) return true;
  return confirmar('Arquivos não salvos', 'Alguns arquivos têm mudanças que não foram salvas. Sair mesmo assim?', 'Sair sem salvar', true);
}

export async function montar(app, params) {
  const raiz = params.p;
  if (!raiz) { ir('/lobby'); return; }
  let info;
  try { info = await api('projetos/abrir', { caminho: raiz }); } catch (e) { toast(e.message, 'err'); ir('/lobby'); return; }

  E = {
    raiz: info.caminho, nome: info.nome, arquivos: new Map(), abas: [], atual: null,
    vista: 'explorer', painel: 'problemas', lateral: true, mostrarPainel: true, mostrarChat: cfg('editor.chatAberto', true),
    diags: new Map(), expandidos: new Set(JSON.parse(sessionStorage.getItem('exp:' + info.caminho) || '[]')),
    arvore: [], exec: null, saidaTexto: '', term: { cwd: info.caminho, hist: [], idx: -1, job: null },
    env: null, git: null, testes: null, desmontadores: [],
  };
  const ui = el(`<div style="display:flex;flex-direction:column;height:100%">
    <header class="titulo">
      <button class="logo" title="Voltar ao lobby" aria-label="Voltar ao lobby" data-lobby>${ic('logo', 17)}</button>
      <nav class="menus" aria-label="Menu" data-menus></nav>
      <div class="busca-topo"><label>${ic('busca', 14)}<input data-qo placeholder="${esc(E.nome)} — abrir arquivo (Ctrl+P)" aria-label="Abrir arquivo rapidamente"></label></div>
      <button class="btn peq verde" data-run title="Executar (F5)">${ic('play', 14)}Executar</button>
      <button class="ib" data-run-tempo title="Executar com máquina do tempo (Ctrl+F5): depois dá para voltar e ver cada passo" aria-label="Executar com máquina do tempo" style="color:#E5B95C">${ic('relogio', 16)}</button>
      <button class="ib" data-stop title="Parar (Shift+F5)" aria-label="Parar" style="color:var(--err-tx);display:none">${ic('parar', 15)}</button>
      <button class="ib" data-t-lat title="Barra lateral (Ctrl+B)" aria-label="Mostrar ou esconder barra lateral">${ic('latEsq', 16)}</button>
      <button class="ib" data-t-pai title="Painel (Ctrl+J)" aria-label="Mostrar ou esconder painel">${ic('latBaixo', 16)}</button>
      <button class="ib" data-t-chat title="Chat da IA (Ctrl+Alt+I)" aria-label="Mostrar ou esconder chat da IA">${ic('latDir', 16)}</button>
    </header>
    <div class="ed-corpo">
      <nav class="ativ" aria-label="Barra de atividades" data-ativ></nav>
      <aside class="lateral" data-lateral><div class="lateral-cab" data-lat-titulo></div><div class="lateral-corpo" data-lat-corpo></div></aside>
      <main class="centro">
        <div class="abas"><div class="abas-lista" role="tablist" data-abas></div>
          <div class="flex" style="padding:0 6px;gap:2px">
            <button class="ib peq" title="Formatar (Shift+Alt+F)" aria-label="Formatar documento" data-fmt>${ic('formatar', 15)}</button>
            <button class="ib peq" title="Dividir editor" aria-label="Dividir editor" data-split>${ic('dividir', 15)}</button>
          </div>
        </div>
        <div class="migalhas" data-mig></div>
        <div class="editor-area" data-area><div class="vazio" data-vazio>${ic('logo', 46)}<div style="font-size:15px;color:var(--tx);font-weight:600">Nenhum arquivo aberto</div><div>Ctrl+P para abrir um arquivo · F5 para executar</div></div></div>
        <section class="painel" data-painel>
          <div class="painel-alca" data-alca></div>
          <div class="painel-abas" role="tablist" data-p-abas></div>
          <div class="painel-corpo" data-p-corpo></div>
        </section>
      </main>
      <aside class="chat-lado" data-chat></aside>
    </div>
    <footer class="status" data-status></footer>
  </div>`);
  app.appendChild(ui);
  E.ui = ui;
  const $ = (s) => ui.querySelector(s);

  // ---------- Monaco ----------
  let monaco;
  try { monaco = await carregarMonaco(); } catch (e) { toast('Não consegui carregar o editor: ' + e.message, 'err'); return; }
  E.monaco = monaco;
  const editor = monaco.editor.create($('[data-area]'), {
    model: null, theme: 'pyforge', automaticLayout: true,
    fontFamily: cfg('editor.fonte', 'JetBrains Mono, Cascadia Code, Consolas, monospace'),
    fontSize: cfg('editor.tamanhoFonte', 14), fontLigatures: cfg('editor.ligaduras', false),
    minimap: { enabled: cfg('editor.minimapa', true), renderCharacters: false, scale: 1 },
    wordWrap: cfg('editor.quebraLinha', false) ? 'on' : 'off',
    stickyScroll: { enabled: cfg('editor.cabecalhoFixo', true) },
    bracketPairColorization: { enabled: cfg('editor.paresColoridos', true) },
    guides: { indentation: cfg('editor.guias', true), bracketPairs: cfg('editor.paresColoridos', true) ? 'active' : false },
    renderWhitespace: 'selection', tabSize: 4, insertSpaces: true, detectIndentation: true, smoothScrolling: true,
    cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on', mouseWheelZoom: true, padding: { top: 8 },
    suggest: { showWords: true, preview: true }, quickSuggestions: { other: true, comments: false, strings: false },
    scrollBeyondLastLine: true, fixedOverflowWidgets: true, renderLineHighlight: 'all', lightbulb: { enabled: 'on' },
  });
  E.editor = editor;
  E.desmontadores.push(() => editor.dispose());
  registrarProvedores(monaco);

  // ---------- chat ----------
  E.chat = criarChat($('[data-chat]'), {
    chaveHistorico: 'editor:' + E.raiz,
    titulo: 'Chat',
    modos: true,
    boasVindas: `Oi! Estou vendo o projeto **${E.nome}**. Posso explicar o código aberto, corrigir problemas, criar testes ou novas funções.`,
    sugestoes: ['Explique este arquivo', 'Tem algum problema neste código?', 'Crie testes para este arquivo'],
    chipsContexto: () => (E.atual ? [relativo(E.raiz, E.atual), '#problemas', '#saída'] : ['#projeto']),
    obterContexto: contextoIA,
    aoCodigo: { aplicar: aplicarCodigoIA, inserir: (c) => { if (!E.atual) return; editor.focus(); editor.executeEdits('ia', [{ range: editor.getSelection(), text: c, forceMoveMarkers: true }]); } },
    aoTerminal: async (bloco) => {
      E.mostrarPainel = true; E.painel = 'terminal'; layout();
      for (const linha of bloco.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
        const ok = await rodarTerminal(linha.replace(/^\$\s*/, ''));
        if (!ok) break;
      }
    },
    aoFechar: () => { E.mostrarChat = false; layout(); },
  });

  // ---------- menus ----------
  barraMenus($('[data-menus]'), {
    'Arquivo': [
      { texto: 'Novo arquivo', kbd: 'Ctrl+N', acao: () => novoItem(E.raiz, false) },
      { texto: 'Nova pasta', acao: () => novoItem(E.raiz, true) },
      { texto: 'Abrir arquivo…', kbd: 'Ctrl+P', acao: abrirRapido },
      '-',
      { texto: 'Salvar', kbd: 'Ctrl+S', acao: () => salvar() },
      { texto: 'Salvar tudo', kbd: 'Ctrl+K S', acao: salvarTudo },
      { texto: () => 'Salvamento automático: ' + (cfg('editor.autoSalvar', 'atraso') === 'desligado' ? 'desligado' : 'ligado'), acao: async () => { await salvarConfig({ editor: { autoSalvar: cfg('editor.autoSalvar', 'atraso') === 'desligado' ? 'atraso' : 'desligado' } }); toast('Salvamento automático ' + (cfg('editor.autoSalvar') === 'desligado' ? 'desligado' : 'ligado'), 'ok'); } },
      '-',
      { texto: 'Gerar executável (.exe)…', acao: gerarExe },
      { texto: 'Mostrar projeto na pasta', acao: () => api('fs/revelar', { caminho: E.raiz }) },
      { texto: 'Fechar aba', kbd: 'Ctrl+W', acao: () => E.atual && fecharAba(E.atual) },
      { texto: 'Voltar ao lobby', acao: () => ir('/lobby') },
    ],
    'Editar': [
      { texto: 'Desfazer', kbd: 'Ctrl+Z', acao: () => { editor.focus(); editor.trigger('menu', 'undo'); } },
      { texto: 'Refazer', kbd: 'Ctrl+Y', acao: () => { editor.focus(); editor.trigger('menu', 'redo'); } },
      '-',
      { texto: 'Localizar', kbd: 'Ctrl+F', acao: () => acao('actions.find') },
      { texto: 'Substituir', kbd: 'Ctrl+H', acao: () => acao('editor.action.startFindReplaceAction') },
      { texto: 'Localizar nos arquivos', kbd: 'Ctrl+Shift+F', acao: () => mostrarVista('busca') },
      '-',
      { texto: 'Renomear símbolo', kbd: 'F2', acao: () => acao('editor.action.rename') },
      { texto: 'Comentar linha', kbd: 'Ctrl+/', acao: () => acao('editor.action.commentLine') },
      { texto: 'Formatar documento', kbd: 'Shift+Alt+F', acao: formatar },
    ],
    'Seleção': [
      { texto: 'Selecionar tudo', kbd: 'Ctrl+A', acao: () => acao('editor.action.selectAll') },
      { texto: 'Expandir seleção', kbd: 'Shift+Alt+→', acao: () => acao('editor.action.smartSelect.expand') },
      { texto: 'Copiar linha abaixo', kbd: 'Shift+Alt+↓', acao: () => acao('editor.action.copyLinesDownAction') },
      { texto: 'Mover linha para cima', kbd: 'Alt+↑', acao: () => acao('editor.action.moveLinesUpAction') },
      { texto: 'Mover linha para baixo', kbd: 'Alt+↓', acao: () => acao('editor.action.moveLinesDownAction') },
      '-',
      { texto: 'Adicionar cursor acima', kbd: 'Ctrl+Alt+↑', acao: () => acao('editor.action.insertCursorAbove') },
      { texto: 'Próxima ocorrência', kbd: 'Ctrl+D', acao: () => acao('editor.action.addSelectionToNextFindMatch') },
      { texto: 'Todas as ocorrências', kbd: 'Ctrl+Shift+L', acao: () => acao('editor.action.selectHighlights') },
    ],
    'Ver': [
      { texto: 'Paleta de comandos', kbd: 'F1', acao: () => acao('editor.action.quickCommand') },
      { texto: 'Explicar as linhas ao passar o mouse (liga/desliga)', acao: () => { const v = !cfg('editor.explicarLinhas', true); salvarConfig({ editor: { explicarLinhas: v } }); toast(v ? 'Passe o mouse numa linha para ver o que ela faz.' : 'Explicações ao passar o mouse desligadas.', 'info'); } },
      '-',
      { texto: 'Explorador', kbd: 'Ctrl+Shift+E', acao: () => mostrarVista('explorer') },
      { texto: 'Buscar', kbd: 'Ctrl+Shift+F', acao: () => mostrarVista('busca') },
      { texto: 'Git', kbd: 'Ctrl+Shift+G', acao: () => mostrarVista('git') },
      { texto: 'Testes', acao: () => mostrarVista('testes') },
      { texto: 'Ambiente Python', acao: () => mostrarVista('ambiente') },
      '-',
      { texto: 'Problemas', kbd: 'Ctrl+Shift+M', acao: () => mostrarPainel('problemas') },
      { texto: 'Saída', acao: () => mostrarPainel('saida') },
      { texto: 'Terminal', kbd: 'Ctrl+`', acao: () => mostrarPainel('terminal') },
      { texto: 'Chat da IA', kbd: 'Ctrl+Alt+I', acao: () => { E.mostrarChat = true; layout(); E.chat.focar(); } },
      '-',
      { texto: () => 'Minimapa: ' + (cfg('editor.minimapa', true) ? 'ligado' : 'desligado'), acao: async () => { await salvarConfig({ editor: { minimapa: !cfg('editor.minimapa', true) } }); editor.updateOptions({ minimap: { enabled: cfg('editor.minimapa', true) } }); } },
      { texto: () => 'Quebra de linha: ' + (cfg('editor.quebraLinha', false) ? 'ligada' : 'desligada'), kbd: 'Alt+Z', acao: alternarQuebra },
      { texto: 'Aumentar fonte', kbd: 'Ctrl+=', acao: () => mudarFonte(1) },
      { texto: 'Diminuir fonte', kbd: 'Ctrl+-', acao: () => mudarFonte(-1) },
    ],
    'Executar': [
      { texto: 'Executar arquivo', kbd: 'F5', acao: () => executar() },
      { texto: 'Executar com máquina do tempo', kbd: 'Ctrl+F5', acao: () => executar(null, { tempo: true }) },
      { texto: 'Abrir a última gravação (máquina do tempo)', acao: () => abrirTempo() },
      { texto: 'Executar e gravar como GIF', acao: () => executar(null, { gif: true }) },
      { texto: 'Criar teste por exemplo…', acao: () => novoTesteExemplo() },
      { texto: 'Parar', kbd: 'Shift+F5', acao: parar },
      '-',
      { texto: 'Rodar testes (pytest)', acao: () => { mostrarVista('testes'); rodarTestes(); } },
      { texto: 'Sincronizar ambiente (uv sync)', acao: () => rodarTerminal('uv sync') },
      { texto: 'Gerar executável (.exe)…', acao: gerarExe },
    ],
    'Terminal': [
      { texto: 'Abrir terminal', kbd: 'Ctrl+`', acao: () => mostrarPainel('terminal') },
      { texto: 'Executar arquivo ativo', acao: () => executar() },
      { texto: 'Limpar terminal', acao: () => { const t = ui.querySelector('[data-term-saida]'); if (t) t.innerHTML = ''; } },
    ],
    'Ajuda': [
      { texto: 'Atalhos de teclado', acao: () => ir('/config?aba=atalhos') },
      { texto: 'Lista de erros do Python (explicados)', acao: () => abrirListaErros() },
      { texto: 'Explicar o arquivo aberto com a IA', acao: () => { E.mostrarChat = true; layout(); E.chat.enviar('Explique este arquivo de forma simples.'); } },
      { texto: 'Documentação do Python', acao: () => window.open('https://docs.python.org/pt-br/3/', '_blank') },
      { texto: 'Sobre o PyForge', acao: () => modal({ titulo: 'Sobre o PyForge', corpo: `<p style="margin:0">PyForge ${esc(estado.ping.versao)} — o app para programar Python.</p><p class="muted" style="margin:0">Editor: Monaco (MIT) · Ambientes: uv (Astral, MIT/Apache) · Análise: Ruff e jedi.</p><p class="dim" style="margin:0;font-size:12px">Dados: ${esc(estado.ping.dados)}</p>` }) },
    ],
  });

  // ---------- barra de atividades ----------
  const ATIV = [['explorer', 'arquivos', 'Explorador'], ['busca', 'busca', 'Buscar'], ['git', 'git', 'Git'], ['testes', 'frasco', 'Testes'], ['ambiente', 'caixa', 'Ambiente Python'], ['juntos', 'equipe', 'Juntos: chat com quem programa com você']];
  function pintarAtiv() {
    const a = $('[data-ativ]');
    a.innerHTML = '';
    for (const [id, icone, rot] of ATIV) {
      const b = el(`<button class="ativ-btn ${E.vista === id && E.lateral ? 'on' : ''}" title="${rot}" aria-label="${rot}">${ic(icone, 22)}</button>`);
      if (id === 'git' && E.git && E.git.repo && E.git.arquivos.length) b.appendChild(el(`<span class="badge">${E.git.arquivos.length}</span>`));
      if (id === 'testes' && E.testes && E.testes.falhas) b.appendChild(el(`<span class="badge vermelho">${E.testes.falhas}</span>`));
      if (id === 'juntos' && naoLidas()) b.appendChild(el(`<span class="badge vermelho">${naoLidas()}</span>`));
      if (id === 'juntos' && estaNaSala() && !naoLidas()) b.appendChild(el('<span class="ponto-on" aria-hidden="true"></span>'));
      b.onclick = () => { if (E.vista === id && E.lateral) { E.lateral = false; layout(); } else mostrarVista(id); };
      a.appendChild(b);
    }
    a.appendChild(el('<div style="flex:1"></div>'));
    for (const [rota, icone, rot] of [['/lobby', 'home', 'Lobby de projetos'], ['/designer?' + q({ p: E.raiz }), 'paleta', 'Designer de interface'], ['/config', 'engrenagem', 'Configurações']]) {
      const b = el(`<button class="ativ-btn" title="${rot}" aria-label="${rot}">${ic(icone, 21)}</button>`);
      b.onclick = () => ir(rota);
      a.appendChild(b);
    }
  }

  function layout() {
    $('[data-lateral]').style.display = E.lateral ? '' : 'none';
    $('[data-painel]').style.display = E.mostrarPainel ? '' : 'none';
    $('[data-chat]').style.display = E.mostrarChat ? '' : 'none';
    $('[data-t-lat]').classList.toggle('ativo', E.lateral);
    $('[data-t-pai]').classList.toggle('ativo', E.mostrarPainel);
    $('[data-t-chat]').classList.toggle('ativo', E.mostrarChat);
    pintarAtiv();
    pintarPainel();
  }
  function mostrarVista(v) { E.vista = v; E.lateral = true; pintarLateral(); layout(); }
  function mostrarPainel(p) { E.painel = p; E.mostrarPainel = true; layout(); if (p === 'terminal') setTimeout(() => { const i = ui.querySelector('[data-term-in]'); if (i) i.focus(); }, 20); }
  const acao = (id) => { editor.focus(); const a = editor.getAction(id); if (a) a.run(); };

  // ---------- lateral ----------
  async function pintarLateral() {
    const titulos = { explorer: 'EXPLORADOR', busca: 'BUSCAR', git: 'GIT', testes: 'TESTES', ambiente: 'AMBIENTE PYTHON', juntos: 'JUNTOS' };
    const tit = $('[data-lat-titulo]');
    tit.innerHTML = `<span class="grow">${titulos[E.vista]}</span>`;
    const corpo = $('[data-lat-corpo]');
    if (E.vista === 'explorer') {
      for (const [icone, rot, fn] of [['novoArq', 'Novo arquivo', () => novoItem(E.raiz, false)], ['novaPasta', 'Nova pasta', () => novoItem(E.raiz, true)], ['atualizar', 'Atualizar', carregarArvore]]) {
        const b = el(`<button class="ib peq" title="${rot}" aria-label="${rot}">${ic(icone, 15)}</button>`);
        b.onclick = fn;
        tit.appendChild(b);
      }
      pintarArvore();
    } else if (E.vista === 'busca') pintarBusca(corpo);
    else if (E.vista === 'git') pintarGit(corpo);
    else if (E.vista === 'testes') pintarTestes(corpo);
    else if (E.vista === 'ambiente') pintarAmbiente(corpo);
    else if (E.vista === 'juntos') {
      corpo.innerHTML = '';
      const alvo = el('<div style="height:100%"></div>');
      corpo.appendChild(alvo);
      painelJuntos(alvo, {
        pegarCodigo: () => {
          const m = editor.getModel();
          if (!m || !E.atual) return null;
          const sel = editor.getSelection();
          const texto = sel && !sel.isEmpty() ? m.getValueInRange(sel) : m.getValue();
          return { texto: texto.slice(0, 20000), ling: lingDe(E.atual), arquivo: relativo(E.raiz, E.atual) + (sel && !sel.isEmpty() ? ` (linhas ${sel.startLineNumber}–${sel.endLineNumber})` : '') };
        },
        inserirCodigo: (texto) => {
          if (!editor.getModel() || !E.atual) { toast('Abra um arquivo para colar o código.', 'info'); return; }
          editor.executeEdits('juntos', [{ range: editor.getSelection(), text: texto, forceMoveMarkers: true }]);
          editor.focus();
        },
      });
    }
  }

  async function carregarArvore() {
    try { E.arvore = (await api('fs/arvore?' + q({ raiz: E.raiz }))).itens || []; } catch (e) { toast(e.message, 'err'); }
    if (E.vista === 'explorer') pintarArvore();
  }

  function decoracao(caminho) {
    const d = E.diags.get(caminho) || [];
    const erros = d.filter((x) => x.sev === 'erro').length, avisos = d.filter((x) => x.sev === 'aviso').length;
    const a = E.arquivos.get(caminho);
    const sujo = a && a.modelo && a.modelo.getAlternativeVersionId() !== a.versaoSalva;
    const git = E.git && E.git.repo && E.git.arquivos.find((f) => f.caminho.toLowerCase() === caminho.toLowerCase());
    if (erros) return { classe: 'erro', deco: String(erros + avisos), cor: 'var(--err-tx)' };
    if (avisos) return { classe: 'aviso', deco: String(avisos), cor: 'var(--warn-tx)' };
    if (sujo) return { classe: 'mod', deco: '●', cor: 'var(--tx2)' };
    if (git) return { classe: git.estado === '??' ? '' : 'mod', deco: git.estado === '??' ? 'U' : git.estado[0], cor: git.estado === '??' ? 'var(--ok-tx)' : '#E3A33B' };
    return { classe: '', deco: '', cor: '' };
  }

  function pintarArvore() {
    if (E.vista !== 'explorer') return;
    const corpo = $('[data-lat-corpo]');
    const rolagem = corpo.scrollTop;
    corpo.innerHTML = '';
    const cab = el(`<div class="arv-item" style="font-weight:700;font-size:11.5px;color:var(--tx);padding-left:8px">${ic('abaixo', 13)}<span class="ellipsis">${esc(E.nome.toUpperCase())}</span></div>`);
    corpo.appendChild(cab);
    const desenhar = (itens, prof) => {
      for (const it of itens) {
        const pad = 10 + prof * 14;
        if (it.dir) {
          const aberto = E.expandidos.has(it.caminho);
          const b = el(`<button class="arv-item" style="padding-left:${pad}px" title="${esc(it.caminho)}">${ic(aberto ? 'abaixo' : 'direita', 13)}<span style="color:var(--mut);display:flex">${ic(aberto ? 'pastaAberta' : 'pasta', 15)}</span><span class="nome ellipsis">${esc(it.nome)}</span></button>`);
          b.onclick = () => { aberto ? E.expandidos.delete(it.caminho) : E.expandidos.add(it.caminho); sessionStorage.setItem('exp:' + E.raiz, JSON.stringify([...E.expandidos])); pintarArvore(); };
          b.oncontextmenu = (e) => { e.preventDefault(); menuItem(e, it); };
          corpo.appendChild(b);
          if (aberto && it.filhos) desenhar(it.filhos, prof + 1);
        } else {
          const d = decoracao(it.caminho);
          const tela = it.nome.endsWith('.pyforge.json');
          const b = el(`<button class="arv-item ${d.classe} ${it.caminho === E.atual ? 'on' : ''}" style="padding-left:${pad}px" title="${esc(it.caminho)}"><span style="width:13px"></span><span style="color:${tela ? '#C792EA' : corArquivo(it.nome)};display:flex">${ic(tela ? 'paleta' : 'arquivo', 15)}</span><span class="nome ellipsis">${esc(it.nome)}</span><span class="deco" style="color:${d.cor}">${esc(d.deco)}</span></button>`);
          b.onclick = () => (tela ? ir('/designer?' + q({ p: E.raiz, tela: it.nome.replace('.pyforge.json', '') })) : abrir(it.caminho));
          b.oncontextmenu = (e) => { e.preventDefault(); menuItem(e, it); };
          corpo.appendChild(b);
        }
      }
    };
    desenhar(E.arvore, 0);
    if (!E.arvore.length) corpo.appendChild(el(`<div class="lat-sec muted" style="padding-top:8px">Pasta vazia. Crie um arquivo com o botão + acima.</div>`));
    corpo.appendChild(el('<div style="height:10px"></div>'));
    const outline = el(`<div><div class="arv-item" style="font-weight:700;font-size:11.5px;color:var(--tx);padding-left:8px;border-top:1px solid var(--bd)">${ic('abaixo', 13)}ESTRUTURA</div><div data-outline></div></div>`);
    corpo.appendChild(outline);
    pintarOutline();
    corpo.scrollTop = rolagem;
  }

  function pintarOutline() {
    const alvo = ui.querySelector('[data-outline]');
    if (!alvo) return;
    alvo.innerHTML = '';
    const a = E.atual && E.arquivos.get(E.atual);
    if (!a || !a.modelo || lingDe(E.atual) !== 'python') { alvo.appendChild(el('<div class="dim" style="padding:4px 14px;font-size:12px">Abra um arquivo .py</div>')); return; }
    const linhas = a.modelo.getLinesContent();
    linhas.forEach((t, i) => {
      const m = t.match(/^(\s*)(class|def|async def)\s+(\w+)/);
      if (!m) return;
      const classe = m[2] === 'class';
      const b = el(`<button class="outline-item" style="padding-left:${12 + m[1].length * 3}px"><span class="k ${classe ? 'c' : 'f'}">${classe ? 'C' : 'ƒ'}</span><span class="ellipsis">${esc(m[3])}</span><span class="dim" style="font-size:11px;margin-left:auto">${i + 1}</span></button>`);
      b.onclick = () => irPara(E.atual, i + 1, 1);
      alvo.appendChild(b);
    });
    if (!alvo.children.length) alvo.appendChild(el('<div class="dim" style="padding:4px 14px;font-size:12px">Sem classes ou funções</div>'));
  }

  function menuItem(e, it) {
    const itens = [];
    const pasta = it.dir ? it.caminho : pai(it.caminho);
    itens.push({ texto: 'Novo arquivo', acao: () => novoItem(pasta, false) }, { texto: 'Nova pasta', acao: () => novoItem(pasta, true) }, '-');
    if (!it.dir && /\.(pyw?|[mc]?js|lua)$/.test(it.nome)) itens.push({ texto: 'Executar este arquivo', acao: () => executar(it.caminho) }, '-');
    itens.push({ texto: 'Renomear…', acao: () => renomear(it) }, { texto: 'Apagar', acao: () => apagar(it) }, '-');
    itens.push({ texto: 'Copiar caminho', acao: () => navigator.clipboard.writeText(it.caminho) }, { texto: 'Mostrar na pasta', acao: () => api('fs/revelar', { caminho: it.caminho }) });
    menuContexto(e.clientX, e.clientY, itens);
  }

  async function novoItem(pasta, dir) {
    const nome = await perguntar(dir ? 'Nova pasta' : 'Novo arquivo', dir ? 'Nome da pasta' : 'Nome do arquivo', dir ? '' : 'novo.py', dir ? '' : 'Dica: termine com .py para arquivos Python.');
    if (!nome) return;
    if (/[<>:"|?*]/.test(nome)) { toast('Nome com caracteres inválidos', 'err'); return; }
    const caminho = juntar(pasta, nome.replace(/\//g, pasta.includes('\\') ? '\\' : '/'));
    try {
      await api('fs/criar', { caminho, dir });
      E.expandidos.add(pasta);
      await carregarArvore();
      if (!dir) abrir(caminho);
    } catch (e) { toast(e.message, 'err'); }
  }

  async function renomear(it) {
    const novo = await perguntar('Renomear', 'Novo nome', it.nome);
    if (!novo || novo === it.nome) return;
    const para = juntar(pai(it.caminho), novo);
    try {
      await api('fs/renomear', { de: it.caminho, para });
      const a = E.arquivos.get(it.caminho);
      if (a) { fecharAba(it.caminho, true); abrir(para); }
      carregarArvore();
    } catch (e) { toast(e.message, 'err'); }
  }

  async function apagar(it) {
    if (!(await confirmar('Apagar', `Apagar “${it.nome}”? Ele vai para a lixeira do PyForge.`, 'Apagar', true))) return;
    try {
      await api('fs/apagar', { caminho: it.caminho });
      for (const c of [...E.arquivos.keys()]) if (c === it.caminho || c.startsWith(it.caminho + (it.caminho.includes('\\') ? '\\' : '/'))) fecharAba(c, true);
      carregarArvore();
      toast('Apagado. Está na lixeira do PyForge, se precisar.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  // ---------- busca ----------
  function pintarBusca(corpo) {
    corpo.innerHTML = '';
    const s = el(`<div class="lat-sec">
      <div class="flex" style="gap:4px"><input class="campo grow" data-q placeholder="Buscar" aria-label="Buscar nos arquivos" style="height:30px">
      <button class="ib peq" data-maiusc title="Diferenciar maiúsculas" aria-pressed="false" style="font-family:var(--mono);font-size:11px">Aa</button>
      <button class="ib peq" data-regex title="Expressão regular" aria-pressed="false" style="font-family:var(--mono);font-size:11px">.*</button></div>
      <div class="dim" data-resumo style="font-size:12px"></div><div data-res style="display:flex;flex-direction:column;gap:2px"></div></div>`);
    corpo.appendChild(s);
    const inp = s.querySelector('[data-q]');
    let maiusc = false, regex = false;
    const alterna = (b, v) => { b.setAttribute('aria-pressed', v); b.style.background = v ? 'var(--sel)' : ''; };
    s.querySelector('[data-maiusc]').onclick = (e) => { maiusc = !maiusc; alterna(e.currentTarget, maiusc); buscar(); };
    s.querySelector('[data-regex]').onclick = (e) => { regex = !regex; alterna(e.currentTarget, regex); buscar(); };
    const buscar = debounce(async () => {
      const termo = inp.value;
      const res = s.querySelector('[data-res]');
      res.innerHTML = '';
      if (!termo) { s.querySelector('[data-resumo]').textContent = ''; return; }
      try {
        const r = await api('fs/buscar?' + q({ raiz: E.raiz, q: termo, regex: regex ? 1 : 0, maiusc: maiusc ? 1 : 0 }));
        const arqs = new Set(r.resultados.map((x) => x.arquivo));
        s.querySelector('[data-resumo]').textContent = fmt('{a} resultado(s) em {b} arquivo(s)', { a: r.resultados.length, b: arqs.size });
        for (const x of r.resultados) {
          const b = el(`<button class="res-busca"><span class="dim" style="font-size:12px">${esc(relativo(E.raiz, x.arquivo))} · linha ${x.linha}</span><code>${esc(x.texto.trim())}</code></button>`);
          b.onclick = () => irPara(x.arquivo, x.linha, x.coluna);
          res.appendChild(b);
        }
      } catch (e) { s.querySelector('[data-resumo]').textContent = e.message; }
    }, 300);
    inp.addEventListener('input', buscar);
    setTimeout(() => inp.focus(), 20);
  }

  // ---------- git ----------
  async function atualizarGit() {
    try { E.git = await api('git/status?' + q({ raiz: E.raiz })); } catch { E.git = null; }
    pintarAtiv();
    pintarStatus();
    if (E.vista === 'git') pintarGit($('[data-lat-corpo]'));
    if (E.vista === 'explorer') pintarArvore();
  }

  function pintarGit(corpo) {
    corpo.innerHTML = '';
    const g = E.git;
    if (!g) { corpo.appendChild(el('<div class="lat-sec muted">Carregando…</div>')); atualizarGit(); return; }
    if (!g.git) { corpo.appendChild(el(`<div class="lat-sec"><div class="muted">O Git não está instalado. Instale em <a href="https://git-scm.com/download/win" target="_blank" rel="noopener">git-scm.com</a> e reabra o PyForge.</div></div>`)); return; }
    if (!g.repo) {
      const s = el(`<div class="lat-sec"><div class="muted">Este projeto ainda não usa Git (histórico de versões).</div><button class="btn pri">Iniciar Git neste projeto</button></div>`);
      s.querySelector('button').onclick = async () => { try { await api('git/init', { raiz: E.raiz }); atualizarGit(); } catch (e) { toast(e.message, 'err'); } };
      corpo.appendChild(s);
      return;
    }
    const s = el(`<div class="lat-sec">
      <div class="flex dim" style="font-size:12px">${ic('git', 13)}${esc(g.branch || 'main')}</div>
      <input class="campo" data-msg placeholder="Mensagem do commit (o que mudou?)" aria-label="Mensagem do commit">
      <div class="flex" style="gap:6px"><button class="btn pri grow" data-commit>${ic('check', 15)}Confirmar (commit)</button><button class="btn" data-ia title="Gerar mensagem com IA" aria-label="Gerar mensagem com IA" style="color:var(--ac-tx)">${ic('brilho', 15)}</button></div>
      <div class="secao-t" style="margin-top:4px">Alterações · ${g.arquivos.length}</div><div data-arqs></div>
      <div class="secao-t" style="margin-top:6px">Histórico</div><div data-log></div></div>`);
    const arqs = s.querySelector('[data-arqs]');
    if (!g.arquivos.length) arqs.appendChild(el('<div class="muted" style="font-size:12.5px">Nada para confirmar. Tudo salvo no histórico.</div>'));
    for (const f of g.arquivos) {
      const cor = f.estado === '??' ? 'var(--ok-tx)' : f.estado.includes('D') ? 'var(--err-tx)' : '#E3A33B';
      const b = el(`<button class="arv-item" style="padding-left:4px"><span style="color:${corArquivo(f.rel)};display:flex">${ic('arquivo', 14)}</span><span class="nome ellipsis">${esc(f.rel)}</span><span class="deco" style="color:${cor}">${esc(f.estado === '??' ? 'U' : f.estado)}</span></button>`);
      b.onclick = () => { if (!f.estado.includes('D')) abrir(f.caminho); };
      arqs.appendChild(b);
    }
    const log = s.querySelector('[data-log]');
    for (const c of g.log) log.appendChild(el(`<div class="flex" style="align-items:flex-start;gap:8px;padding:3px 0"><span style="width:9px;height:9px;border-radius:50%;border:2px solid var(--ac);margin-top:5px;flex:none"></span><div class="grow"><div style="font-size:12.5px;color:#D7DBE3">${esc(c.msg)}</div><div class="dim" style="font-size:11.5px">${esc(c.autor)} · ${esc(c.quando)} · <span class="mono">${esc(c.hash)}</span></div></div></div>`));
    if (!g.log.length) log.appendChild(el('<div class="muted" style="font-size:12.5px">Nenhum commit ainda.</div>'));
    const msg = s.querySelector('[data-msg]');
    s.querySelector('[data-commit]').onclick = async () => {
      if (!msg.value.trim()) { toast('Escreva o que mudou', 'err'); msg.focus(); return; }
      await salvarTudo();
      try { await api('git/commit', { raiz: E.raiz, msg: msg.value.trim() }); toast('Commit feito!', 'ok'); atualizarGit(); } catch (e) { toast(e.message, 'err', 8000); }
    };
    s.querySelector('[data-ia]').onclick = async () => {
      msg.value = 'Gerando…';
      let texto = '';
      try {
        await conversarIA({ mensagens: [{ role: 'user', content: 'Escreva UMA mensagem de commit curta (até 60 caracteres), em português, no imperativo, para estas alterações. Responda só com a mensagem.\n' + g.arquivos.map((f) => f.estado + ' ' + f.rel).join('\n') }], contexto: 'Tarefa rápida: gerar mensagem de commit.' }, (t) => { texto += t; msg.value = texto.replace(/[`"]/g, '').trim(); });
      } catch (e) { msg.value = ''; toast(e.message, 'err'); }
    };
    corpo.appendChild(s);
  }

  // ---------- testes ----------
  function pintarTestes(corpo) {
    corpo.innerHTML = '';
    const t = E.testes;
    const s = el(`<div class="lat-sec">
      <div class="flex"><button class="btn pri" data-rodar>${ic('play', 14)}Rodar todos</button><span data-resumo style="font-weight:600;font-size:12.5px"></span></div>
      <button class="btn" data-exemplo>${ic('mais', 14)}Novo teste por exemplo</button>
      <div data-lista></div>
      <div class="dim" style="font-size:12px">Teste por exemplo: você diz uma entrada, o PyForge roda e, se o resultado estiver certo, vira um teste. Os testes ficam na pasta tests (arquivos test_*.py).</div></div>`);
    s.querySelector('[data-rodar]').onclick = rodarTestes;
    s.querySelector('[data-exemplo]').onclick = novoTesteExemplo;
    const lista = s.querySelector('[data-lista]');
    if (t) {
      const r = s.querySelector('[data-resumo]');
      r.textContent = t.rodando ? 'Rodando…' : `${t.passou} passaram · ${t.falhas} falharam`;
      r.style.color = t.rodando ? 'var(--mut)' : t.falhas ? 'var(--err-tx)' : 'var(--ok-tx)';
      for (const x of t.itens) {
        const ok = x.res === 'PASSED' || x.res === 'XFAIL' || x.res === 'SKIPPED';
        const b = el(`<button class="arv-item" style="padding-left:4px;height:auto;min-height:24px"><span style="color:${ok ? 'var(--ok-tx)' : 'var(--err-tx)'};display:flex">${ic(ok ? 'checkC' : 'xC', 15)}</span><span class="nome ellipsis mono" style="font-size:11.5px">${esc(x.nome)}</span></button>`);
        b.onclick = () => { const arq = juntar(E.raiz, x.arquivo.replace(/\//g, E.raiz.includes('\\') ? '\\' : '/')); abrirEBuscar(arq, x.nome.split('::').pop()); };
        lista.appendChild(b);
      }
    }
    corpo.appendChild(s);
  }

  async function abrirEBuscar(arq, nomeFuncao) {
    await abrir(arq);
    const a = E.arquivos.get(arq);
    if (!a || !a.modelo) return;
    const m = a.modelo.findMatches('def ' + nomeFuncao.replace(/\[.*$/, ''), false, false, true, null, false)[0];
    if (m) irPara(arq, m.range.startLineNumber, 1);
  }

  async function novoTesteExemplo() {
    const caminho = E.atual && /\.pyw?$/.test(E.atual) ? E.atual : null;
    if (!caminho) { toast('Abra o arquivo .py que você quer testar.', 'info'); return; }
    if (/[\\/]tests?[\\/]|[\\/]test_[^\\/]*$/.test(caminho)) { toast('Abra o arquivo do programa (não o de teste) para criar um teste dele.', 'info'); return; }
    await salvarTudo();
    abrirTesteExemplo({ raiz: E.raiz, arquivo: caminho, texto: E.arquivos.get(caminho).modelo.getValue(), aoSalvar: async (arq) => { await abrir(arq, false); mostrarVista('testes'); rodarTestes(); carregarArvore(); } });
  }

  async function rodarTestes() {
    await salvarTudo();
    E.testes = { rodando: true, itens: [], passou: 0, falhas: 0 };
    pintarTestes($('[data-lat-corpo]'));
    let saida = '';
    escreverSaida('limpar');
    escreverSaida('s', '▶ pytest\n');
    mostrarPainel('saida');
    try {
      await iniciarJob({ tipo: 'testes', raiz: E.raiz }, (ev) => {
        if (ev.t === 'o' || ev.t === 'e') { saida += ev.d; escreverSaida(ev.t === 'e' ? 'e' : '', ev.d); }
        if (ev.t === 'fim') {
          const itens = [];
          for (const m of saida.matchAll(/^(\S+?\.py)::(\S+)\s+(PASSED|FAILED|ERROR|SKIPPED|XFAIL|XPASS)/gm)) itens.push({ arquivo: m[1], nome: m[2], res: m[3] });
          // arquivo de teste que nem carregou (erro na coleta)
          for (const m of saida.matchAll(/^ERROR (\S+?\.py)(?: - (.*))?$/gm)) if (!itens.some((x) => x.arquivo === m[1])) itens.push({ arquivo: m[1], nome: m[1].split('/').pop() + ' (não carregou)', res: 'ERROR' });
          for (const x of analisarSaida(saida, 1)) mostrarExplicacao(x);
          const falhas = itens.filter((x) => x.res === 'FAILED' || x.res === 'ERROR').length;
          E.testes = { rodando: false, itens, passou: itens.length - falhas, falhas };
          if (!itens.length && /no tests ran|collected 0 items/.test(saida)) toast('Nenhum teste encontrado. Crie arquivos test_*.py (a IA pode ajudar).', 'info', 6000);
          if (E.vista === 'testes') pintarTestes($('[data-lat-corpo]'));
          pintarAtiv();
          escreverSaida(falhas ? 'e' : 'v', `\n${falhas ? '✗' : '✓'} ${itens.length - falhas} passaram, ${falhas} falharam\n`);
        }
      });
    } catch (e) { toast(e.message, 'err'); }
  }

  // ---------- ambiente ----------
  async function atualizarAmbiente() {
    try { E.env = await api('py/ambiente?' + q({ raiz: E.raiz })); } catch { E.env = null; }
    pintarStatus();
    if (E.vista === 'ambiente') pintarAmbiente($('[data-lat-corpo]'));
  }

  function pintarAmbiente(corpo) {
    corpo.innerHTML = '';
    const env = E.env;
    if (!env) { corpo.appendChild(el('<div class="lat-sec muted">Carregando…</div>')); atualizarAmbiente(); return; }
    const s = el(`<div class="lat-sec">
      <div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px">
        <div class="flex"><span style="width:8px;height:8px;border-radius:50%;background:${env.venv ? 'var(--ok)' : 'var(--warn)'}"></span><span style="font-weight:600">${env.venv ? 'Python ' + esc(env.python || '?') : 'Ambiente ainda não criado'}</span><span class="dim">· .venv · uv</span></div>
        <div class="muted" style="font-size:12px">${env.venv ? 'Ativado sozinho no editor, no terminal, nos testes e ao executar.' : 'Clique em Sincronizar: o PyForge instala o Python e os pacotes.'}</div>
        <div class="flex" style="flex-wrap:wrap;gap:6px"><button class="btn peq" data-sync>${ic('atualizar', 13)}Sincronizar</button>
        <select class="sel" data-ver style="height:28px;font-size:12.5px" aria-label="Versão do Python">${['3.12', '3.13', '3.14', '3.15'].map((v) => `<option ${env.pin === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>
      <div class="secao-t">Instalar pacote</div>
      <div class="flex" style="gap:6px"><input class="campo grow" data-pac placeholder="ex.: requests, pillow, cv2" aria-label="Nome do pacote" style="height:30px"><button class="btn pri peq" data-inst>Instalar</button></div>
      <div class="dim" style="font-size:11.5px">Digitou o nome do import (cv2, PIL, sklearn)? O PyForge descobre o nome certo do pacote.</div>
      <div class="secao-t" style="margin-top:4px">Pacotes do projeto</div><div data-deps></div>
      <div class="secao-t" style="margin-top:4px">Tudo instalado · ${env.pacotes.length}</div><div data-todos></div></div>`);
    const deps = s.querySelector('[data-deps]');
    for (const d of env.deps || []) {
      const v = env.pacotes.find((p) => p.name.toLowerCase().replace(/_/g, '-') === d.toLowerCase().replace(/_/g, '-'));
      const r = el(`<div class="flex" style="padding:3px 2px">${ic('caixa', 14, 'style="color:var(--mut)"')}<span class="grow ellipsis">${esc(d)}</span><span class="mono dim" style="font-size:11.5px">${esc(v ? v.version : 'não instalado')}</span><button class="ib peq" title="Remover" aria-label="Remover ${esc(d)}">${ic('lixo', 13)}</button></div>`);
      r.querySelector('button').onclick = async () => { if (await confirmar('Remover pacote', `Remover ${d} do projeto?`, 'Remover', true)) rodarJobPainel({ tipo: 'remover', raiz: E.raiz, pacote: d }, 'uv remove ' + d, () => atualizarAmbiente()); };
      deps.appendChild(r);
    }
    if (!(env.deps || []).length) deps.appendChild(el('<div class="muted" style="font-size:12.5px">Nenhum pacote extra ainda.</div>'));
    const todos = s.querySelector('[data-todos]');
    for (const p of env.pacotes) todos.appendChild(el(`<div class="flex" style="padding:2px;font-size:12.5px"><span class="grow ellipsis">${esc(p.name)}</span><span class="mono dim" style="font-size:11px">${esc(p.version)}</span></div>`));
    s.querySelector('[data-sync]').onclick = () => rodarJobPainel({ tipo: 'sync', raiz: E.raiz }, 'uv sync', () => atualizarAmbiente());
    s.querySelector('[data-ver]').onchange = (e) => rodarJobPainel({ tipo: 'python', raiz: E.raiz, versao: e.target.value }, 'Trocar para Python ' + e.target.value, () => atualizarAmbiente());
    const inst = async () => {
      const nome = s.querySelector('[data-pac]').value.trim();
      if (!nome) return;
      await instalarPacote(nome);
      s.querySelector('[data-pac]').value = '';
    };
    s.querySelector('[data-inst]').onclick = inst;
    s.querySelector('[data-pac]').addEventListener('keydown', (e) => { if (e.key === 'Enter') inst(); });
    corpo.appendChild(s);
  }

  async function instalarPacote(nome) {
    let pacote = nome;
    try {
      const r = await api('py/nome-pacote?' + q({ nome }));
      if (r.trocado && !(await confirmar('Nome do pacote', `Para usar “import ${nome}”, o pacote se chama “${r.pacote}”. Instalar ${r.pacote}?`, 'Instalar'))) return;
      pacote = r.pacote;
    } catch {}
    rodarJobPainel({ tipo: 'instalar', raiz: E.raiz, pacote }, 'uv add ' + pacote, (ok) => { atualizarAmbiente(); if (ok) { toast(pacote + ' instalado!', 'ok'); analisarAtual(); } });
  }

  function rodarJobPainel(pedido, titulo, aoFim) {
    escreverSaida('limpar');
    escreverSaida('s', '▶ ' + titulo + '\n');
    mostrarPainel('saida');
    let saida = '';
    iniciarJob(pedido, (ev) => {
      if (ev.t === 'o' || ev.t === 'e') { escreverSaida('', ev.d); if (saida.length < 400000) saida += ev.d; }
      if (ev.t === 'fim') {
        escreverSaida(ev.c === 0 ? 'v' : 'e', ev.c === 0 ? '\n✓ Pronto\n' : `\n✗ Terminou com erro (código ${ev.c})\n`);
        // explica o que deu errado (PyInstaller, pip/uv, testes…)
        if (ev.c !== 0) {
          const ferramentas = analisarSaida(saida, ev.c);
          const tb = analisarTraceback(saida, E.raiz);
          if (ferramentas.length) ferramentas.forEach(mostrarExplicacao); else if (tb) mostrarExplicacao(tb);
        }
        aoFim && aoFim(ev.c === 0);
      }
    }).catch((e) => toast(e.message, 'err'));
  }

  // ---------- abas e arquivos ----------
  async function abrir(caminho, foco = true) {
    if (!caminho) return;
    const igual = [...E.arquivos.keys()].find((k) => k.toLowerCase() === caminho.toLowerCase());
    if (igual) caminho = igual;
    let a = E.arquivos.get(caminho);
    if (!a) {
      let r;
      try { r = await api('fs/ler?' + q({ caminho })); } catch (e) { toast(e.message, 'err'); return; }
      if (r.binario || r.grande) { toast(r.binario ? 'Esse arquivo não é texto (imagem, executável…).' : 'Arquivo grande demais para abrir no editor.', 'info'); return; }
      const uri = monaco.Uri.file(caminho);
      let modelo = monaco.editor.getModel(uri);
      if (modelo) modelo.setValue(r.conteudo); else modelo = monaco.editor.createModel(r.conteudo, lingDe(caminho), uri);
      a = { modelo, versaoSalva: modelo.getAlternativeVersionId(), mtime: r.mtime, viewState: null };
      E.arquivos.set(caminho, a);
      modelo.onDidChangeContent(() => aoMudar(caminho));
      if (lingDe(caminho) === 'python') analisar(caminho);
    }
    if (!E.abas.includes(caminho)) E.abas.push(caminho);
    trocarPara(caminho, foco);
  }

  function trocarPara(caminho, foco = true) {
    if (E.atual && E.arquivos.get(E.atual)) E.arquivos.get(E.atual).viewState = editor.saveViewState();
    E.atual = caminho;
    const a = E.arquivos.get(caminho);
    editor.setModel(a.modelo);
    if (a.viewState) editor.restoreViewState(a.viewState);
    $('[data-vazio]').style.display = 'none';
    if (foco) editor.focus();
    pintarAbas(); pintarMigalhas(); pintarStatus(); pintarOutline();
    if (E.vista === 'explorer') pintarArvore();
    E.chat.atualizarChips();
  }

  async function fecharAba(caminho, forcar = false) {
    const a = E.arquivos.get(caminho);
    if (!forcar && a && a.modelo.getAlternativeVersionId() !== a.versaoSalva) {
      const escolha = await new Promise((res) => modal({ titulo: 'Salvar alterações?', corpo: `<p style="margin:0">“${esc(nomeBase(caminho))}” tem mudanças não salvas.</p>`, botoes: [{ texto: 'Cancelar', valor: 'c' }, { texto: 'Não salvar', valor: 'n' }, { texto: 'Salvar', classe: 'pri', valor: 's' }], aoFechar: (v) => res(v || 'c') }));
      if (escolha === 'c') return;
      if (escolha === 's') await salvar(caminho);
    }
    const i = E.abas.indexOf(caminho);
    if (i >= 0) E.abas.splice(i, 1);
    if (a) { a.modelo.dispose(); E.arquivos.delete(caminho); }
    E.diags.delete(caminho);
    if (E.atual === caminho) {
      E.atual = null;
      const prox = E.abas[Math.min(i, E.abas.length - 1)];
      if (prox) trocarPara(prox); else { editor.setModel(null); $('[data-vazio]').style.display = ''; pintarAbas(); pintarMigalhas(); pintarStatus(); pintarOutline(); }
    } else pintarAbas();
    pintarProblemas();
  }

  function pintarAbas() {
    const c = $('[data-abas]');
    c.innerHTML = '';
    for (const caminho of E.abas) {
      const a = E.arquivos.get(caminho);
      const sujo = a && a.modelo.getAlternativeVersionId() !== a.versaoSalva;
      const d = E.diags.get(caminho) || [];
      const erros = d.filter((x) => x.sev === 'erro').length;
      const avisos = d.filter((x) => x.sev === 'aviso').length;
      const b = el(`<div class="aba ${caminho === E.atual ? 'on' : ''} ${sujo ? 'sujo' : ''}" role="tab" aria-selected="${caminho === E.atual}" title="${esc(caminho)}">
        <span style="color:${corArquivo(caminho)};display:flex">${ic('arquivo', 14)}</span><span>${esc(nomeBase(caminho))}</span>
        ${erros || avisos ? `<span style="font-size:11px;font-weight:700;color:${erros ? 'var(--err-tx)' : 'var(--warn-tx)'}">${erros + avisos}</span>` : ''}
        <button class="x" aria-label="Fechar ${esc(nomeBase(caminho))}"><span class="bola"></span>${ic('x', 13)}</button></div>`);
      b.onclick = (e) => { if (!e.target.closest('.x')) trocarPara(caminho); };
      b.onauxclick = (e) => { if (e.button === 1) fecharAba(caminho); };
      b.querySelector('.x').onclick = () => fecharAba(caminho);
      b.oncontextmenu = (e) => { e.preventDefault(); menuContexto(e.clientX, e.clientY, [{ texto: 'Fechar', acao: () => fecharAba(caminho) }, { texto: 'Fechar as outras', acao: async () => { for (const o of E.abas.filter((x) => x !== caminho)) await fecharAba(o); } }, { texto: 'Executar', acao: () => executar(caminho) }, { texto: 'Mostrar na pasta', acao: () => api('fs/revelar', { caminho }) }]); };
      c.appendChild(b);
    }
  }

  function pintarMigalhas() {
    const m = $('[data-mig]');
    if (!E.atual) { m.innerHTML = ''; return; }
    const partes = [E.nome, ...relativo(E.raiz, E.atual).split('/')];
    const pos = editor.getPosition();
    const a = E.arquivos.get(E.atual);
    if (pos && a && lingDe(E.atual) === 'python') {
      const linhas = a.modelo.getLinesContent().slice(0, pos.lineNumber);
      const pilha = [];
      linhas.forEach((t) => {
        const mm = t.match(/^(\s*)(?:class|def|async def)\s+(\w+)/);
        if (mm) { const ind = mm[1].length; while (pilha.length && pilha[pilha.length - 1].ind >= ind) pilha.pop(); pilha.push({ ind, nome: mm[2] }); }
        else if (t.trim() && !t.startsWith(' ') && !t.startsWith('\t') && !t.startsWith('#') && !t.startsWith('@')) pilha.length = 0;
      });
      partes.push(...pilha.map((p) => p.nome));
    }
    m.innerHTML = partes.map((p, i) => `<span style="color:${i === partes.length - 1 ? 'var(--tx)' : 'inherit'}">${esc(p)}</span>`).join(ic('direita', 11));
  }

  function aoMudar(caminho) {
    pintarAbas();
    if (E.vista === 'explorer') pintarArvoreDebounced();
    if (cfg('editor.autoSalvar', 'atraso') === 'atraso') autoSalvar(caminho);
    if (lingDe(caminho) === 'python' && cfg('python.analisarAoDigitar', true)) analisarDebounced(caminho);
  }
  const pintarArvoreDebounced = debounce(() => pintarArvore(), 400);
  const salvadores = new Map();
  function autoSalvar(caminho) {
    clearTimeout(salvadores.get(caminho));
    salvadores.set(caminho, setTimeout(() => salvar(caminho, { auto: true }), 1200));
  }

  async function salvar(caminho = E.atual, opcoes = {}) {
    const a = caminho && E.arquivos.get(caminho);
    if (!a) return;
    if (!opcoes.auto && lingDe(caminho) === 'python' && cfg('editor.formatarAoSalvar', true)) await formatar(caminho, true);
    const versao = a.modelo.getAlternativeVersionId();
    if (opcoes.auto && versao === a.versaoSalva) return;
    try {
      const r = await api('fs/escrever', { caminho, conteudo: a.modelo.getValue() });
      a.versaoSalva = versao;
      a.mtime = r.mtime;
      pintarAbas();
      if (E.vista === 'explorer') pintarArvore();
      if (lingDe(caminho) === 'python') analisar(caminho);
      atualizarGitDebounced();
    } catch (e) { toast('Não salvei: ' + e.message, 'err'); }
  }
  const atualizarGitDebounced = debounce(atualizarGit, 1500);
  async function salvarTudo() { for (const c of E.arquivos.keys()) { const a = E.arquivos.get(c); if (a.modelo.getAlternativeVersionId() !== a.versaoSalva) await salvar(c, { auto: true }); } }

  async function formatar(caminho = E.atual, silencioso = false) {
    const a = caminho && E.arquivos.get(caminho);
    if (!a || lingDe(caminho) !== 'python') { if (!silencioso && a) acao('editor.action.formatDocument'); return; }
    try {
      const r = await api('py/formatar', { raiz: E.raiz, caminho, conteudo: a.modelo.getValue() });
      if (r.erro) { if (!silencioso) toast(r.erro, 'err'); return; }
      if (r.conteudo !== undefined && r.conteudo !== a.modelo.getValue()) {
        const vs = caminho === E.atual ? editor.saveViewState() : null;
        a.modelo.pushEditOperations([], [{ range: a.modelo.getFullModelRange(), text: r.conteudo }], () => null);
        if (vs) editor.restoreViewState(vs);
      }
    } catch (e) { if (!silencioso) toast(e.message, 'err'); }
  }

  function irPara(caminho, linha, coluna = 1) {
    abrir(caminho).then(() => {
      editor.revealLineInCenter(linha);
      editor.setPosition({ lineNumber: linha, column: coluna });
      editor.focus();
    });
  }

  // ---------- análise ----------
  const analisarDebounced = debounce((c) => analisar(c), 900);
  async function analisar(caminho) {
    const a = E.arquivos.get(caminho);
    if (!a) return;
    try {
      const r = await api('py/analisar', { raiz: E.raiz, caminho, conteudo: a.modelo.getValue() });
      let d = r.diagnosticos || [];
      if (!cfg('python.armadilhas', true)) d = d.filter((x) => x.fonte !== 'Armadilhas do Python');
      if (!cfg('python.ruff', true)) d = d.filter((x) => x.fonte !== 'Ruff');
      d = d.map((x) => (x.fonte === 'Ruff' ? { ...x, msg: textoRuff(x.codigo, x.msg) } : x));
      E.diags.set(caminho, d);
      E.ruffOk = !r.erroRuff;
      const sev = { erro: monaco.MarkerSeverity.Error, aviso: monaco.MarkerSeverity.Warning, info: monaco.MarkerSeverity.Info };
      monaco.editor.setModelMarkers(a.modelo, 'pyforge', d.map((x) => ({
        startLineNumber: x.linha, startColumn: x.coluna, endLineNumber: x.fimLinha || x.linha, endColumn: Math.max(x.fimColuna || x.coluna + 1, x.coluna + 1),
        severity: sev[x.sev] || monaco.MarkerSeverity.Info, message: x.msg + (x.dica ? '\nDica: ' + x.dica : ''), source: x.fonte, code: x.codigo,
      })));
    } catch (e) { /* análise é opcional */ }
    pintarAbas(); pintarProblemas(); pintarStatus();
    if (E.vista === 'explorer') pintarArvoreDebounced();
  }
  function analisarAtual() { if (E.atual && lingDe(E.atual) === 'python') analisar(E.atual); }

  // ---------- painel inferior ----------
  function pintarPainel() {
    const total = [...E.diags.values()].reduce((n, d) => n + d.length, 0);
    const abas = [['problemas', 'PROBLEMAS', total], ['saida', 'SAÍDA', 0], ['terminal', 'TERMINAL', 0], ['tempo', 'MÁQUINA DO TEMPO', 0]];
    if (E.painel !== 'tempo') limparMarcaTempo();
    const pa = $('[data-p-abas]');
    pa.innerHTML = '';
    for (const [id, rot, n] of abas) {
      const b = el(`<button class="p-aba ${E.painel === id ? 'on' : ''}" role="tab" aria-selected="${E.painel === id}">${rot}${n ? `<span class="n">${n}</span>` : ''}</button>`);
      b.onclick = () => { E.painel = id; pintarPainel(); if (id === 'terminal') setTimeout(() => { const i = ui.querySelector('[data-term-in]'); if (i) i.focus(); }, 10); };
      pa.appendChild(b);
    }
    pa.appendChild(el('<span class="grow"></span>'));
    if (E.painel === 'saida' || E.painel === 'terminal') {
      const lim = el(`<button class="ib peq" title="Limpar" aria-label="Limpar">${ic('lixo', 14)}</button>`);
      lim.onclick = () => { if (E.painel === 'saida') escreverSaida('limpar'); else ui.querySelector('[data-term-saida]').innerHTML = ''; };
      pa.appendChild(lim);
    }
    const fe = el(`<button class="ib peq" title="Fechar painel" aria-label="Fechar painel">${ic('x', 14)}</button>`);
    fe.onclick = () => { E.mostrarPainel = false; layout(); };
    pa.appendChild(fe);
    const corpo = $('[data-p-corpo]');
    for (const filho of corpo.children) filho.style.display = 'none';
    let alvo = corpo.querySelector(`[data-pc="${E.painel}"]`);
    if (!alvo) {
      if (E.painel === 'saida') alvo = el(`<div data-pc="saida"><div class="saida" data-saida></div><div class="entrada-linha oculto" data-ent>›<input data-ent-in placeholder="O programa está esperando você digitar (input). Enter envia." aria-label="Entrada do programa"></div></div>`);
      else if (E.painel === 'terminal') alvo = criarTerminal();
      else if (E.painel === 'tempo') {
        alvo = el('<div data-pc="tempo" style="height:100%"></div>');
        E.tempo = criarPainelTempo(alvo, { mostrar: marcarTempo, limpar: limparMarcaTempo, textoLinha: textoDaLinha });
      } else alvo = el('<div data-pc="problemas"></div>');
      corpo.appendChild(alvo);
      if (E.painel === 'saida') {
        const inp = alvo.querySelector('[data-ent-in]');
        inp.addEventListener('keydown', async (e) => {
          if (e.key !== 'Enter' || !E.exec) return;
          const v = inp.value;
          inp.value = '';
          escreverSaida('ent', v + '\n');
          try { await api('job/entrada', { id: E.exec.id, dados: v + '\n' }); } catch (er) { toast(er.message, 'err'); }
        });
      }
    }
    alvo.style.display = '';
    if (E.painel === 'problemas') pintarProblemas();
    if (E.painel === 'tempo' && E.tempo) E.tempo.focar();
  }

  function pintarProblemas() {
    const alvo = ui.querySelector('[data-pc="problemas"]');
    const todos = [];
    for (const [c, d] of E.diags) for (const x of d) todos.push({ ...x, arquivo: c });
    const ordem = { erro: 0, aviso: 1, info: 2 };
    todos.sort((a, b) => ordem[a.sev] - ordem[b.sev] || a.linha - b.linha);
    if (alvo) {
      alvo.innerHTML = '';
      if (!todos.length) alvo.appendChild(el(`<div class="flex ok" style="padding:10px 8px">${ic('check', 16)}${E.diags.size ? 'Nenhum problema nos arquivos abertos. Bom trabalho!' : 'Os problemas dos arquivos .py abertos aparecem aqui.'}</div>`));
      for (const x of todos.slice(0, 300)) {
        const cor = x.sev === 'erro' ? 'var(--err)' : x.sev === 'aviso' ? 'var(--warn)' : '#6E9BFF';
        const icone = x.sev === 'erro' ? 'xC' : x.sev === 'aviso' ? 'alerta' : 'info';
        const r = el(`<div class="prob"><span style="color:${cor};display:flex;padding-top:1px">${ic(icone, 16)}</span>
          <div class="grow"><div>${esc(x.msg)} <span class="dim">${esc(x.fonte)}${x.item ? ' · item ' + x.item + ' da lista' : ''} · ${esc(relativo(E.raiz, x.arquivo))}:${x.linha}</span></div>${x.dica ? `<div class="muted" style="font-size:12px">Dica: ${esc(x.dica)}</div>` : ''}</div>
          <button class="btn peq" data-fix style="color:var(--ac-tx)">${ic('brilho', 13)}Corrigir com IA</button></div>`);
        r.onclick = (e) => { if (!e.target.closest('[data-fix]')) irPara(x.arquivo, x.linha, x.coluna); };
        r.querySelector('[data-fix]').onclick = () => pedirCorrecao(x);
        alvo.appendChild(r);
      }
    }
    const pa = $('[data-p-abas]');
    if (pa && pa.firstElementChild) {
      const n = pa.firstElementChild.querySelector('.n');
      if (n) n.textContent = todos.length; else if (todos.length) pa.firstElementChild.insertAdjacentHTML('beforeend', `<span class="n">${todos.length}</span>`);
      if (!todos.length && n) n.remove();
    }
  }

  function pedirCorrecao(x) {
    E.mostrarChat = true; layout();
    E.chat.definirModo('editar');
    if (x.arquivo !== E.atual) abrir(x.arquivo);
    E.chat.enviar(`Corrija este problema em ${relativo(E.raiz, x.arquivo)}, linha ${x.linha}: “${x.msg}”. Explique em 2 frases e devolva o arquivo completo corrigido.`);
  }

  // ---------- saída e execução ----------
  function escreverSaida(classe, texto) {
    if (!ui.querySelector('[data-pc="saida"]')) { const p = E.painel; E.painel = 'saida'; pintarPainel(); E.painel = p; pintarPainel(); }
    const s = ui.querySelector('[data-saida]');
    if (classe === 'limpar') { s.innerHTML = ''; E.saidaTexto = ''; return; }
    E.saidaTexto = (E.saidaTexto + texto).slice(-20000);
    const ult = s.lastElementChild;
    if (ult && ult.dataset.c === classe && ult.tagName === 'SPAN') ult.textContent += texto;
    else { const sp = document.createElement('span'); sp.dataset.c = classe; if (classe) sp.className = classe; sp.textContent = texto; s.appendChild(sp); }
    const corpo = $('[data-p-corpo]');
    corpo.scrollTop = corpo.scrollHeight;
  }

  // ---------- máquina do tempo ----------
  function marcarTempo(arquivo, linha, erro) {
    if (!arquivo || linha < 1) { limparMarcaTempo(); return; }
    const pintar = () => {
      E.decoTempo = editor.deltaDecorations(E.decoTempo || [], [{ range: new monaco.Range(linha, 1, linha, 1), options: { isWholeLine: true, className: erro ? 'mt-deco-erro' : 'mt-deco', linesDecorationsClassName: erro ? 'mt-glifo-erro' : 'mt-glifo', overviewRuler: { color: erro ? '#E2657A' : '#E5B95C', position: monaco.editor.OverviewRulerLane.Full } } }]);
      editor.revealLineInCenterIfOutsideViewport(linha);
    };
    const igual = E.atual && E.atual.toLowerCase() === arquivo.toLowerCase();
    if (igual) pintar(); else abrir(arquivo, false).then(pintar);
  }
  function limparMarcaTempo() { if (E.decoTempo && E.decoTempo.length) E.decoTempo = editor.deltaDecorations(E.decoTempo, []); }
  function textoDaLinha(arquivo, linha) {
    const k = [...E.arquivos.keys()].find((x) => arquivo && x.toLowerCase() === arquivo.toLowerCase());
    const a = k && E.arquivos.get(k);
    try { return a && a.modelo ? a.modelo.getLineContent(linha) : ''; } catch { return ''; }
  }
  async function abrirTempo() {
    try {
      const g = await carregarGravacao(E.raiz);
      mostrarPainel('tempo');
      E.tempo.carregar(g);
    } catch (e) { toast(e.message, 'info', 5000); }
  }

  async function executar(caminho, opcoes = {}) {
    caminho = caminho || E.atual;
    // outras linguagens (plugins de Configurações › Linguagens)
    let plugin = null;
    if (caminho && !/\.pyw?$/.test(caminho)) {
      const ext = '.' + (caminho.split('.').pop() || '').toLowerCase();
      const mapa = await extensoesExecutaveis();
      plugin = mapa[ext] || null;
      if (plugin && !plugin.instalado) {
        toast(`${plugin.nome} ainda não está instalado. Abra Configurações › Linguagens e clique em Instalar.`, 'info', 7000);
        return;
      }
      if (!plugin && /^\.(js|mjs|cjs|lua)$/.test(ext)) {
        toast('O plugin dessa linguagem está desligado. Ligue em Configurações › Linguagens.', 'info', 7000);
        return;
      }
      if (plugin && (opcoes.tempo || opcoes.gif)) toast('Essa opção é só para Python; vou executar normalmente.', 'info');
    }
    if (!plugin && (!caminho || !/\.pyw?$/.test(caminho))) {
      const main = juntar(E.raiz, 'main.py');
      if (E.arvore.find((x) => x.nome === 'main.py')) caminho = main;
      else { toast('Abra um arquivo .py (ou de uma linguagem ligada em Configurações › Linguagens) para executar.', 'info'); return; }
    }
    if (plugin) opcoes = {};
    if (E.exec) await parar();
    await salvarTudo();
    escreverSaida('limpar');
    escreverSaida('s', `▶ ${plugin ? plugin.nome.toLowerCase() : 'python'} ${relativo(E.raiz, caminho)}${opcoes.tempo ? '  (gravando a máquina do tempo)' : ''}${opcoes.gif ? '  (gravando GIF: feche a janela ou clique em Parar para terminar)' : ''}\n`);
    mostrarPainel('saida');
    const inicio = Date.now();
    let saida = '';
    try {
      const r = await iniciarJob(plugin ? { tipo: 'linguagem', raiz: E.raiz, arquivo: caminho } : { tipo: 'executar', raiz: E.raiz, arquivo: caminho, tempo: !!opcoes.tempo, gif: !!opcoes.gif }, (ev) => {
        if (ev.t === 'o' || ev.t === 'e') { saida += ev.d; const d = ev.d.includes(MARCA_GIF) ? filtrarGif(ev.d).texto : ev.d; if (d) escreverSaida(ev.t === 'e' ? 'e' : '', d); }
        if (ev.t === 'fim') {
          E.exec = null;
          ui.querySelector('[data-ent]').classList.add('oculto');
          $('[data-stop]').style.display = 'none';
          $('[data-run]').style.display = '';
          const seg = ((Date.now() - inicio) / 1000).toFixed(1);
          escreverSaida(ev.c === 0 ? 'v' : 's', '\n' + fmt(ev.c ? '■ Terminou com código {c} em {s} s' : '✓ Terminou em {s} s', { c: ev.c, s: seg }) + '\n');
          const tb = !plugin && ev.c !== 0 && analisarTraceback(saida, E.raiz);
          if (tb) mostrarExplicacao(tb);
          // sem traceback: avisos, mensagens do Qt, pip/uv e códigos de saída do Windows
          for (const x of analisarSaida(saida, ev.c)) if (!tb || x.aviso) if (ev.c !== 0 || x.aviso || x.tipo === 'Qt') mostrarExplicacao(x);
          if (opcoes.tempo) setTimeout(abrirTempo, 150);
          if (opcoes.gif) { const g = filtrarGif(saida).info; if (g) mostrarGif(g); }
          pintarStatus();
        }
      });
      E.exec = { id: r.id, gif: !!opcoes.gif };
      api('stats', { tipo: 'execucoes' }).catch(() => {});
      ui.querySelector('[data-ent]').classList.remove('oculto');
      $('[data-stop]').style.display = '';
      $('[data-run]').style.display = 'none';
      pintarStatus();
    } catch (e) { toast(e.message, 'err'); }
  }

  // versão anterior do Python (para pacotes que ainda não saíram para a versão nova)
  function versaoAnterior() {
    const v = ((E.env && (E.env.python || E.env.pin)) || '3.13').split('.');
    const menor = Math.max(12, (+v[1] || 13) - 1);
    return '3.' + menor;
  }
  function botaoAcaoErro(acao) {
    if (acao === 'versaoPython') return `<button class="btn peq pri" data-acao>${ic('atualizar', 13)}Usar Python ${versaoAnterior()} neste projeto</button>`;
    if (acao === 'pygameCe') return `<button class="btn peq pri" data-acao>${ic('caixa', 13)}Instalar pygame-ce</button>`;
    return '';
  }
  async function fazerAcaoErro(acao, botao) {
    botao.disabled = true;
    if (acao === 'versaoPython') {
      const v = versaoAnterior();
      rodarJobPainel({ tipo: 'python', raiz: E.raiz, versao: v }, 'Trocar para Python ' + v, (ok) => { atualizarAmbiente(); if (ok) toast(`Pronto: o projeto agora usa Python ${v}. Tente instalar o pacote de novo.`, 'ok', 6000); });
    } else if (acao === 'pygameCe') {
      if ((E.env && E.env.deps || []).some((d) => d.toLowerCase() === 'pygame')) await new Promise((r) => rodarJobPainel({ tipo: 'remover', raiz: E.raiz, pacote: 'pygame' }, 'uv remove pygame', () => r()));
      instalarPacote('pygame-ce');
    }
  }

  function mostrarExplicacao(tb) {
    const s = ui.querySelector('[data-saida]');
    const card = el(`<div class="explica ${tb.aviso ? 'aviso' : ''}"><div class="flex"><span class="${tb.aviso ? 'warn' : 'err'}" style="display:flex">${ic(tb.aviso ? 'alerta' : 'bug', 16)}</span><strong>${esc(tb.titulo)}</strong><span class="dim mono" style="font-size:12px">${esc(tb.tipo || '')}</span></div>
      <div style="color:var(--tx2)">${esc(tb.texto)}</div>
      ${tb.sugestao ? `<div style="font-size:12.5px">O Python sugere: <span class="mono" style="color:var(--ok, #5BC8AF)">${esc(tb.sugestao)}</span></div>` : ''}
      ${htmlExemplo(tb.exemplo)}
      ${tb.alvo ? `<div class="dim" style="font-size:12px">Em ${esc(relativo(E.raiz, tb.alvo.arquivo))}, linha ${tb.alvo.linha}${tb.alvo.funcao ? ', na função ' + esc(tb.alvo.funcao) : ''}</div>` : ''}
      <div class="flex" style="flex-wrap:wrap">${tb.alvo ? '<button class="btn peq" data-ir>Ir para a linha</button>' : ''}${tb.modulo ? `<button class="btn peq pri" data-inst>Instalar ${esc(tb.modulo)}</button>` : ''}${botaoAcaoErro(tb.acao)}<button class="btn peq" data-ia style="color:var(--ac-tx)">${ic('brilho', 13)}Corrigir com IA</button><button class="btn peq ghost" data-lista>Ver todos os erros</button></div></div>`);
    const ac = card.querySelector('[data-acao]');
    if (ac) ac.onclick = () => fazerAcaoErro(tb.acao, ac);
    card.querySelector('[data-lista]').onclick = () => abrirListaErros(tb.tipoCompleto ? tb.tipo : '');
    if (tb.alvo) card.querySelector('[data-ir]').onclick = () => irPara(tb.alvo.arquivo, tb.alvo.linha);
    if (tb.modulo) card.querySelector('[data-inst]').onclick = () => instalarPacote(tb.modulo);
    card.querySelector('[data-ia]').onclick = () => {
      E.mostrarChat = true; layout(); E.chat.definirModo('editar');
      E.chat.enviar(`Meu programa deu este erro. Explique a causa de forma simples e corrija o arquivo:\n\n${tb.tipoCompleto ? `${tb.tipoCompleto}: ${tb.msg}` : `${tb.titulo} — ${tb.texto}`}${tb.alvo ? `\n(em ${relativo(E.raiz, tb.alvo.arquivo)}, linha ${tb.alvo.linha})` : ''}`);
    };
    s.appendChild(card);
    $('[data-p-corpo]').scrollTop = 1e9;
  }

  async function parar() {
    if (!E.exec) return;
    if (E.exec.gif) { // pede para o gravador parar e salvar o GIF; se não responder, encerra
      const id = E.exec.id;
      await pararGravacao(id);
      for (let i = 0; i < 40 && E.exec && E.exec.id === id; i++) await new Promise((ok) => setTimeout(ok, 200));
      if (!E.exec || E.exec.id !== id) return;
    }
    try { await api('job/parar', { id: E.exec.id }); } catch {}
  }

  // ---------- terminal ----------
  function criarTerminal() {
    const t = el(`<div data-pc="terminal" style="display:flex;flex-direction:column;min-height:100%">
      <div class="saida" data-term-saida><span class="s">Terminal do projeto. O ambiente .venv já está ativo: “python”, “pip” e “uv” usam o Python deste projeto.\n</span></div>
      <div class="entrada-linha"><span data-prompt class="p"></span><input data-term-in spellcheck="false" aria-label="Comando do terminal" placeholder="digite um comando (ex.: uv add requests)"></div></div>`);
    const inp = t.querySelector('[data-term-in]');
    const pintarPrompt = () => { t.querySelector('[data-prompt]').textContent = `${relativo(E.raiz, E.term.cwd) || E.nome}>`; };
    pintarPrompt();
    inp.addEventListener('keydown', async (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); if (E.term.hist.length) { E.term.idx = Math.max(0, (E.term.idx < 0 ? E.term.hist.length : E.term.idx) - 1); inp.value = E.term.hist[E.term.idx]; } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (E.term.idx >= 0) { E.term.idx = Math.min(E.term.hist.length, E.term.idx + 1); inp.value = E.term.hist[E.term.idx] || ''; } return; }
      if (e.key === 'c' && e.ctrlKey && E.term.job) { e.preventDefault(); api('job/parar', { id: E.term.job }); return; }
      if (e.key !== 'Enter') return;
      const linha = inp.value;
      inp.value = '';
      if (E.term.job) { escreverTerm('ent', linha + '\n'); api('job/entrada', { id: E.term.job, dados: linha + '\n' }).catch(() => {}); return; }
      if (!linha.trim()) return;
      E.term.hist.push(linha); E.term.idx = -1;
      await rodarTerminal(linha);
      pintarPrompt();
    });
    t.addEventListener('mouseup', () => { if (!getSelection().toString()) inp.focus(); });
    E.pintarPrompt = pintarPrompt;
    return t;
  }

  function escreverTerm(classe, texto) {
    const s = ui.querySelector('[data-term-saida]');
    if (!s) return;
    const sp = document.createElement('span');
    if (classe) sp.className = classe;
    sp.textContent = texto;
    s.appendChild(sp);
    $('[data-p-corpo]').scrollTop = 1e9;
  }

  function rodarTerminal(linha) {
    return new Promise(async (resolver) => {
      if (E.painel !== 'terminal' || !ui.querySelector('[data-term-saida]')) mostrarPainel('terminal');
      if (/^\s*(cls|clear)\s*$/i.test(linha)) { ui.querySelector('[data-term-saida]').innerHTML = ''; resolver(true); return; }
      escreverTerm('p', `${relativo(E.raiz, E.term.cwd) || E.nome}> `);
      escreverTerm('', linha + '\n');
      try {
        const r = await api('job/iniciar', { tipo: 'terminal', raiz: E.raiz, linha, cwd: E.term.cwd });
        if (r.cwd) { E.term.cwd = r.cwd; if (r.msg) escreverTerm('e', r.msg + '\n'); if (E.pintarPrompt) E.pintarPrompt(); resolver(!r.msg); return; }
        E.term.job = r.id;
        (await import('./api.js')).ouvirJob(r.id, (ev) => {
          if (ev.t === 'o') escreverTerm('', ev.d);
          if (ev.t === 'e') escreverTerm('e', ev.d);
          if (ev.t === 'fim') {
            E.term.job = null;
            if (ev.c) escreverTerm('s', `(código de saída ${ev.c})\n`);
            if (/\buv\s+(add|remove|sync|pip)\b|\bpip\s+install\b/.test(linha)) { atualizarAmbiente(); analisarAtual(); }
            if (/\bgit\b/.test(linha)) atualizarGit();
            carregarArvore();
            resolver(ev.c === 0);
          }
        });
      } catch (e) { escreverTerm('e', e.message + '\n'); resolver(false); }
    });
  }

  // ---------- status ----------
  function pintarStatus() {
    const s = $('[data-status]');
    const todos = [...E.diags.values()].flat();
    const erros = todos.filter((x) => x.sev === 'erro').length, avisos = todos.length - erros;
    const pos = editor.getPosition();
    const a = E.atual && E.arquivos.get(E.atual);
    const ling = E.atual ? lingDe(E.atual) : '';
    s.innerHTML = '';
    s.appendChild(el(`<span style="background:var(--pri);color:#fff">${ic('logo', 13)}</span>`));
    const add = (html, fn, titulo) => { const b = el(fn ? `<button title="${esc(titulo || '')}">${html}</button>` : `<span>${html}</span>`); if (fn) b.onclick = fn; s.appendChild(b); };
    if (E.git && E.git.repo) add(`${ic('git', 13)}${esc(E.git.branch || 'main')}${E.git.arquivos.length ? '*' : ''}`, () => mostrarVista('git'), 'Git');
    add(`${ic('xC', 13)}${erros}${ic('alerta', 13, 'style="margin-left:4px"')}${avisos}`, () => mostrarPainel('problemas'), 'Problemas');
    if (E.exec) add(`<span class="ok">● executando</span>`, () => mostrarPainel('saida'));
    s.appendChild(el('<span class="grow"></span>'));
    if (a && pos) {
      add(`Ln ${pos.lineNumber}, Col ${pos.column}`, () => acao('editor.action.gotoLine'), 'Ir para linha');
      const opts = a.modelo.getOptions();
      add(opts.insertSpaces ? `Espaços: ${opts.tabSize}` : `Tab: ${opts.tabSize}`);
      add('UTF-8');
      add(a.modelo.getEOL() === '\r\n' ? 'CRLF' : 'LF');
      add(esc(NOMES_LING[ling] || ling));
    }
    if (E.env) add(`<span style="color:#FFD98A">${E.env.venv ? 'Python ' + esc(E.env.python) + ' (.venv)' : 'Sem ambiente'}</span>`, () => mostrarVista('ambiente'), 'Ambiente Python');
    if (ling === 'python' && E.ruffOk !== undefined) add(E.ruffOk ? '<span class="ok">Ruff ✓</span>' : '<span class="warn">Ruff: preparando</span>');
    add(`${ic('brilho', 13)}IA`, () => { E.mostrarChat = !E.mostrarChat; layout(); }, 'Chat da IA');
  }

  // ---------- IA: contexto e aplicar código ----------
  async function contextoIA() {
    const partes = [`# Projeto aberto no PyForge\nNome: ${E.nome}\nPasta: ${E.raiz}\nPython: ${E.env && E.env.venv ? E.env.python + ' (.venv gerenciado pelo uv)' : 'ambiente ainda não criado'}\nPacotes do projeto: ${(E.env && E.env.deps || []).join(', ') || 'nenhum'}\nSistema: ${estado.ping.sistema}`];
    const lista = [];
    const andar = (itens) => { for (const it of itens) { if (lista.length > 120) return; if (it.dir) andar(it.filhos || []); else lista.push(relativo(E.raiz, it.caminho)); } };
    andar(E.arvore);
    partes.push('# Arquivos do projeto\n' + lista.join('\n'));
    if (E.atual) {
      const a = E.arquivos.get(E.atual);
      const rel = relativo(E.raiz, E.atual);
      let conteudo = a.modelo.getValue();
      const pos = editor.getPosition();
      if (conteudo.length > 60000) {
        const linhas = conteudo.split('\n');
        const ini = Math.max(0, (pos ? pos.lineNumber : 1) - 400);
        conteudo = linhas.slice(ini, ini + 800).join('\n');
        partes.push(`(arquivo grande: mostrando das linhas ${ini + 1} a ${ini + 800})`);
      }
      partes.push(`# Arquivo aberto: ${rel}\nCursor na linha ${pos ? pos.lineNumber : 1}.\n\`\`\`${lingDe(E.atual)} arquivo=${rel}\n${conteudo}\n\`\`\``);
      const sel = editor.getSelection();
      if (sel && !sel.isEmpty()) partes.push(`# Trecho selecionado (linhas ${sel.startLineNumber}-${sel.endLineNumber})\n\`\`\`\n${a.modelo.getValueInRange(sel)}\n\`\`\``);
    } else partes.push('Nenhum arquivo aberto no momento.');
    const probs = [];
    for (const [c, d] of E.diags) for (const x of d) probs.push(`${relativo(E.raiz, c)}:${x.linha} [${x.sev}] ${x.msg}${x.item ? ' (item ' + x.item + ')' : ''}`);
    if (probs.length) partes.push('# Problemas encontrados pelo PyForge\n' + probs.slice(0, 40).join('\n'));
    if (E.saidaTexto.trim()) partes.push('# Última saída do programa/terminal\n```\n' + E.saidaTexto.slice(-3500) + '\n```');
    return partes.join('\n\n');
  }

  async function aplicarCodigoIA(codigo, info) {
    let alvo = E.atual;
    if (info.arquivo) {
      const rel = info.arquivo.replace(/^\.?[\\/]/, '');
      if (rel.includes('..')) { toast('Caminho de arquivo inválido na resposta da IA', 'err'); return; }
      alvo = juntar(E.raiz, rel.replace(/\//g, E.raiz.includes('\\') ? '\\' : '/'));
    }
    if (!alvo) { toast('Abra um arquivo primeiro', 'info'); return; }
    let original = '';
    const aberto = E.arquivos.get(alvo);
    if (aberto) original = aberto.modelo.getValue();
    else {
      try { const r = await api('fs/ler?' + q({ caminho: alvo })); original = r.conteudo || ''; } catch { original = ''; }
    }
    const novo = codigo.endsWith('\n') ? codigo : codigo + '\n';
    const corpo = el('<div style="flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;height:100%"><div class="muted" style="font-size:12.5px">Esquerda: como está. Direita: como a IA sugere. Revise antes de aceitar.</div><div data-diff style="flex:1;min-height:420px;border:1px solid var(--bd);border-radius:8px;overflow:hidden"></div></div>');
    const mo = monaco.editor.createModel(original, lingDe(alvo));
    const mn = monaco.editor.createModel(novo, lingDe(alvo));
    let diff;
    const m = modal({
      titulo: `Mudanças em ${relativo(E.raiz, alvo)}${original ? '' : ' (arquivo novo)'}`, corpo, largo: true,
      botoes: [{ texto: 'Rejeitar', valor: false }, { texto: 'Aceitar mudanças', classe: 'pri', valor: true, acao: async () => {
        const texto = mn.getValue();
        if (!aberto && !original) { try { await api('fs/criar', { caminho: alvo, dir: false }); } catch {} }
        await abrir(alvo);
        const a = E.arquivos.get(alvo);
        a.modelo.pushEditOperations([], [{ range: a.modelo.getFullModelRange(), text: texto }], () => null);
        await salvar(alvo, { auto: true });
        carregarArvore();
        toast('Mudanças aplicadas e salvas. Ctrl+Z desfaz.', 'ok');
      } }],
      aoFechar: () => { if (diff) diff.dispose(); mo.dispose(); mn.dispose(); },
    });
    m.corpo.style.flex = '1';
    m.corpo.style.minHeight = '0';
    diff = monaco.editor.createDiffEditor(corpo.querySelector('[data-diff]'), { theme: 'pyforge', automaticLayout: true, renderSideBySide: true, originalEditable: false, readOnly: false, minimap: { enabled: false }, fontSize: cfg('editor.tamanhoFonte', 14) });
    diff.setModel({ original: mo, modified: mn });
  }

  // ---------- diálogos ----------
  async function abrirRapido() {
    const lista = [];
    const andar = (itens) => { for (const it of itens) { if (it.dir) andar(it.filhos || []); else lista.push(it.caminho); } };
    andar(E.arvore);
    const corpo = el(`<div style="display:flex;flex-direction:column;gap:8px"><input class="campo" placeholder="Nome do arquivo" aria-label="Nome do arquivo"><div data-l style="display:flex;flex-direction:column;max-height:50vh;overflow:auto"></div></div>`);
    const inp = corpo.querySelector('input');
    const l = corpo.querySelector('[data-l]');
    let atuais = [];
    const pintar = () => {
      const f = inp.value.toLowerCase();
      atuais = lista.filter((c) => relativo(E.raiz, c).toLowerCase().includes(f)).slice(0, 60);
      l.innerHTML = '';
      for (const c of atuais) {
        const b = el(`<button class="arv-item" style="height:30px;padding-left:6px"><span style="color:${corArquivo(c)};display:flex">${ic('arquivo', 14)}</span><span class="nome">${esc(nomeBase(c))}</span><span class="dim" style="font-size:12px;margin-left:8px">${esc(relativo(E.raiz, pai(c)))}</span></button>`);
        b.onclick = () => { m.fechar(); abrir(c); };
        l.appendChild(b);
      }
    };
    const m = modal({ titulo: 'Abrir arquivo', corpo });
    inp.addEventListener('input', pintar);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && atuais[0]) { m.fechar(); abrir(atuais[0]); } });
    pintar();
  }

  function gerarExe() {
    dialogoExe({
      raiz: E.raiz, nomeProjeto: E.nome, deps: (E.env && E.env.deps) || [], arquivoInicial: E.atual,
      rodar: rodarJobPainel,
      anexar: (no) => { const s = ui.querySelector('[data-saida]'); s.appendChild(no); s.scrollTop = 1e9; },
    });
  }

  function alternarQuebra() {
    const v = !cfg('editor.quebraLinha', false);
    salvarConfig({ editor: { quebraLinha: v } });
    editor.updateOptions({ wordWrap: v ? 'on' : 'off' });
  }
  function mudarFonte(d) {
    const t = Math.min(28, Math.max(9, cfg('editor.tamanhoFonte', 14) + d));
    salvarConfig({ editor: { tamanhoFonte: t } });
    editor.updateOptions({ fontSize: t });
  }

  // ---------- eventos ----------
  $('[data-lobby]').onclick = () => ir('/lobby');
  $('[data-run]').onclick = () => executar();
  $('[data-run-tempo]').onclick = () => executar(null, { tempo: true });
  $('[data-stop]').onclick = parar;
  $('[data-t-lat]').onclick = () => { E.lateral = !E.lateral; layout(); };
  $('[data-t-pai]').onclick = () => { E.mostrarPainel = !E.mostrarPainel; layout(); };
  $('[data-t-chat]').onclick = () => { E.mostrarChat = !E.mostrarChat; layout(); salvarConfig({ editor: { chatAberto: E.mostrarChat } }); };
  $('[data-fmt]').onclick = () => formatar();
  $('[data-split]').onclick = () => toast('Divisão de editor chega na próxima versão.', 'info');
  $('[data-qo]').addEventListener('focus', (e) => { e.target.blur(); abrirRapido(); });
  editor.onDidChangeCursorPosition(debounce(() => { pintarStatus(); pintarMigalhas(); }, 80));
  editor.onDidBlurEditorText(() => { if (cfg('editor.autoSalvar', 'atraso') === 'foco' && E.atual) salvar(E.atual, { auto: true }); });

  const K = monaco.KeyMod, KC = monaco.KeyCode;
  editor.addCommand(K.CtrlCmd | KC.KeyS, () => salvar());
  editor.addCommand(KC.F5, () => executar());
  editor.addCommand(K.CtrlCmd | KC.F5, () => executar(null, { tempo: true }));
  editor.addCommand(K.Shift | KC.F5, parar);
  editor.addCommand(K.CtrlCmd | KC.KeyP, abrirRapido);
  editor.addCommand(K.Alt | KC.KeyZ, alternarQuebra);
  editor.addCommand(K.Shift | K.Alt | KC.KeyF, () => formatar());
  const teclas = (e) => {
    const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (c && k === 's' && !e.shiftKey) { e.preventDefault(); salvar(); }
    else if (e.key === 'F5' && c && !e.shiftKey) { e.preventDefault(); executar(null, { tempo: true }); }
    else if (e.key === 'F5' && !e.shiftKey) { e.preventDefault(); executar(); }
    else if (e.key === 'F5' && e.shiftKey) { e.preventDefault(); parar(); }
    else if (c && k === 'p' && !e.shiftKey) { e.preventDefault(); abrirRapido(); }
    else if (c && k === 'b') { e.preventDefault(); E.lateral = !E.lateral; layout(); }
    else if (c && k === 'j') { e.preventDefault(); E.mostrarPainel = !E.mostrarPainel; layout(); }
    else if (c && (e.key === '`' || e.code === 'Backquote')) { e.preventDefault(); mostrarPainel('terminal'); }
    else if (c && e.altKey && k === 'i') { e.preventDefault(); E.mostrarChat = true; layout(); E.chat.focar(); }
    else if (c && e.shiftKey && k === 'f') { e.preventDefault(); mostrarVista('busca'); }
    else if (c && e.shiftKey && k === 'e') { e.preventDefault(); mostrarVista('explorer'); }
    else if (c && e.shiftKey && k === 'g') { e.preventDefault(); mostrarVista('git'); }
    else if (c && e.shiftKey && k === 'm') { e.preventDefault(); mostrarPainel('problemas'); }
    else if (c && k === 'n' && !e.shiftKey) { e.preventDefault(); novoItem(E.raiz, false); }
    else if (c && k === 'w') { e.preventDefault(); if (E.atual) fecharAba(E.atual); }
    else if (c && (k === '=' || k === '+')) { e.preventDefault(); mudarFonte(1); }
    else if (c && k === '-') { e.preventDefault(); mudarFonte(-1); }
  };
  document.addEventListener('keydown', teclas);
  E.desmontadores.push(() => document.removeEventListener('keydown', teclas));
  E.desmontadores.push(assinarJuntos(() => pintarAtiv()));

  // Redimensionar o painel inferior.
  $('[data-alca]').addEventListener('mousedown', (e) => {
    const painel = $('[data-painel]');
    const y0 = e.clientY, h0 = painel.offsetHeight;
    const mover = (ev) => { painel.style.height = Math.max(90, Math.min(innerHeight - 200, h0 - (ev.clientY - y0))) + 'px'; };
    const soltar = () => { document.removeEventListener('mousemove', mover); document.removeEventListener('mouseup', soltar); };
    document.addEventListener('mousemove', mover);
    document.addEventListener('mouseup', soltar);
  });

  E.irPara = irPara; E.abrir = abrir; E.pedirCorrecao = pedirCorrecao;
  layout();
  pintarLateral();
  pintarStatus();
  await carregarArvore();
  atualizarAmbiente();
  atualizarGit();
  const inicial = params.f || (E.arvore.find((x) => x.nome === 'main.py') || {}).caminho;
  if (inicial) abrir(inicial);

  return () => {
    for (const fn of E.desmontadores) { try { fn(); } catch {} }
    for (const a of E.arquivos.values()) { try { a.modelo.dispose(); } catch {} }
    E = null;
  };
}

// Provedores do Monaco (registrados uma vez, usam o projeto aberto no momento).
function registrarProvedores(monaco) {
  if (provedoresRegistrados) return;
  provedoresRegistrados = true;
  const KIND = monaco.languages.CompletionItemKind;
  const tipos = { funcao: KIND.Function, classe: KIND.Class, modulo: KIND.Module, variavel: KIND.Variable, palavra: KIND.Keyword, parametro: KIND.Variable, propriedade: KIND.Property, arquivo: KIND.File };
  const pedido = (model, pos) => ({ raiz: E.raiz, caminho: model.uri.fsPath, conteudo: model.getValue(), linha: pos.lineNumber, coluna: pos.column });
  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    async provideCompletionItems(model, pos) {
      if (!E) return { suggestions: [] };
      try {
        const r = await api('py/completar', pedido(model, pos));
        const palavra = model.getWordUntilPosition(pos);
        const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: palavra.startColumn, endColumn: palavra.endColumn };
        return { suggestions: (r.res || []).map((x, i) => ({ label: x.nome, kind: tipos[x.tipo] ?? KIND.Text, detail: x.detalhe, documentation: x.doc ? { value: '```text\n' + x.doc + '\n```' } : undefined, insertText: x.nome, range, sortText: String(i).padStart(4, '0') })) };
      } catch { return { suggestions: [] }; }
    },
  });
  monaco.languages.registerHoverProvider('python', {
    async provideHover(model, pos) {
      if (!E) return null;
      const palavra = model.getWordAtPosition(pos);
      const conteudo = [];
      if (cfg('editor.explicarLinhas', true)) {
        const linha = explicarLinha(model.getLineContent(pos.lineNumber));
        if (linha) conteudo.push({ value: `**Em português:** ${linha}` });
        const p = palavra && explicarPalavra(palavra.word);
        if (p) conteudo.push({ value: `\`${palavra.word}\` ${p}` });
      }
      if (palavra) {
        try {
          const r = await api('py/info', pedido(model, pos));
          if (r.res) conteudo.push({ value: r.res });
        } catch { /* sem ajuda do jedi */ }
      }
      return conteudo.length ? { contents: conteudo } : null;
    },
  });
  monaco.languages.registerDefinitionProvider('python', {
    async provideDefinition(model, pos) {
      if (!E) return null;
      try {
        const r = await api('py/definicao', pedido(model, pos));
        const locais = [];
        for (const d of r.res || []) {
          const uri = monaco.Uri.file(d.caminho);
          if (!monaco.editor.getModel(uri)) {
            try { const f = await api('fs/ler?' + q({ caminho: d.caminho })); if (f.conteudo !== undefined) monaco.editor.createModel(f.conteudo, 'python', uri); } catch { continue; }
          }
          locais.push({ uri, range: new monaco.Range(d.linha, d.coluna, d.linha, d.coluna) });
        }
        return locais;
      } catch { return null; }
    },
  });
  monaco.editor.registerEditorOpener({
    openCodeEditor(_fonte, recurso, selecao) {
      if (!E) return false;
      const caminho = recurso.fsPath;
      const linha = selecao ? (selecao.startLineNumber || selecao.lineNumber || 1) : 1;
      E.abrir(caminho).then(() => { if (E && E.irPara) E.irPara(caminho, linha, 1); });
      return true;
    },
  });
  monaco.languages.registerDocumentFormattingEditProvider('python', {
    async provideDocumentFormattingEdits(model) {
      if (!E) return [];
      try {
        const r = await api('py/formatar', { raiz: E.raiz, caminho: model.uri.fsPath, conteudo: model.getValue() });
        if (r.erro || r.conteudo === undefined) { if (r.erro) toast(r.erro, 'err'); return []; }
        return [{ range: model.getFullModelRange(), text: r.conteudo }];
      } catch { return []; }
    },
  });
  monaco.languages.registerCodeActionProvider('python', {
    provideCodeActions(model, _range, contexto) {
      if (!E) return { actions: [], dispose() {} };
      const acoes = contexto.markers.filter((m) => m.owner === 'pyforge' || m.source).slice(0, 3).map((m) => ({
        title: 'Corrigir com a IA: ' + m.message.split('\n')[0].slice(0, 60),
        kind: 'quickfix',
        diagnostics: [m],
        command: { id: comandoCorrigir(monaco), title: 'Corrigir com a IA', arguments: [{ arquivo: model.uri.fsPath, linha: m.startLineNumber, coluna: m.startColumn, msg: m.message.split('\n')[0] }] },
      }));
      return { actions: acoes, dispose() {} };
    },
  });
}

let idComando = null;
function comandoCorrigir(monaco) {
  if (!idComando) {
    idComando = 'pyforge.corrigirIA';
    monaco.editor.registerCommand(idComando, (_acc, x) => { if (E && E.pedirCorrecao) E.pedirCorrecao(x); });
  }
  return idComando;
}
