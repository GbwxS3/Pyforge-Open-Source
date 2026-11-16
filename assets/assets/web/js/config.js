// Configurações (salvas de verdade em config.json).
import { painelIALocal } from './ia_local.js';
import { painelLinguagens } from './linguagens.js';
import { api, conversarIA } from './api.js';
import { el, esc, ic, toast, modal, confirmar } from './ui.js';
import { estado, ir, cfg, salvarConfig } from './app.js';

const FONTES = { cascadia: 'Cascadia Code, Consolas, monospace', consolas: 'Consolas, Cascadia Code, monospace', jetbrains: 'JetBrains Mono, Cascadia Code, Consolas, monospace' };

const DEFS = [
  { aba: 'geral', id: 'idioma', tipo: 'seg', titulo: 'Idioma · Language', desc: 'Português ou English. O PyForge recarrega na hora. · PyForge reloads right away.', opcoes: [['pt', 'Português'], ['en', 'English']], padrao: 'pt' },
  { aba: 'geral', id: 'workspace', tipo: 'pasta', titulo: 'Pasta dos projetos', desc: 'Onde os projetos novos são criados. O lobby lista as pastas que estão aqui.' },
  { aba: 'geral', id: 'python.versaoPadrao', tipo: 'seg', titulo: 'Versão do Python para projetos novos', desc: 'O PyForge baixa e gerencia o Python sozinho, sem mexer no Python do sistema. A 3.13 é a mais compatível hoje.', opcoes: [['3.12', '3.12'], ['3.13', '3.13'], ['3.14', '3.14'], ['3.15', '3.15']], padrao: '3.13', resolve: 'Itens 153–157' },

  { aba: 'editor', id: 'editor.tamanhoFonte', tipo: 'numero', titulo: 'Tamanho da fonte', desc: 'Também dá para usar Ctrl+= e Ctrl+- no editor.', min: 10, max: 24, padrao: 14 },
  { aba: 'editor', id: 'editor.fonte', tipo: 'seg', titulo: 'Fonte do código', desc: 'Fontes monoespaçadas feitas para programar.', opcoes: [[FONTES.cascadia, 'Cascadia Code'], [FONTES.consolas, 'Consolas'], [FONTES.jetbrains, 'JetBrains Mono']], padrao: FONTES.jetbrains },
  { aba: 'editor', id: 'editor.autoSalvar', tipo: 'seg', titulo: 'Salvamento automático', desc: 'Nunca mais perca código por esquecer o Ctrl+S.', opcoes: [['desligado', 'Desligado'], ['foco', 'Ao sair do arquivo'], ['atraso', 'Após 1 segundo']], padrao: 'atraso' },
  { aba: 'editor', id: 'editor.formatarAoSalvar', tipo: 'toggle', titulo: 'Formatar ao salvar (Ruff)', desc: 'Arruma espaços, recuo e aspas sempre que você salva com Ctrl+S.', padrao: true, resolve: 'Item 1' },
  { aba: 'editor', id: 'editor.paresColoridos', tipo: 'toggle', titulo: 'Parênteses coloridos por nível', desc: 'Cada par de ( ), [ ] e { } ganha uma cor, para achar o que ficou aberto.', padrao: true, resolve: 'Itens 2, 28' },
  { aba: 'editor', id: 'editor.guias', tipo: 'toggle', titulo: 'Guias de indentação', desc: 'Linhas verticais mostram cada nível de recuo.', padrao: true, resolve: 'Item 1' },
  { aba: 'editor', id: 'editor.cabecalhoFixo', tipo: 'toggle', titulo: 'Cabeçalho fixo de função e classe', desc: 'Ao rolar, mostra em qual def ou class você está.', padrao: true },
  { aba: 'editor', id: 'editor.minimapa', tipo: 'toggle', titulo: 'Minimapa', desc: 'Miniatura do arquivo na direita, com os erros marcados.', padrao: true },
  { aba: 'editor', id: 'editor.quebraLinha', tipo: 'toggle', titulo: 'Quebra de linha', desc: 'Linhas longas continuam embaixo em vez de sair da tela (Alt+Z).', padrao: false },
  { aba: 'editor', id: 'editor.ligaduras', tipo: 'toggle', titulo: 'Ligaduras de fonte', desc: 'Mostra -> e >= como símbolos únicos (precisa de uma fonte com ligaduras).', padrao: false },
  { aba: 'editor', id: 'editor.chatAberto', tipo: 'toggle', titulo: 'Abrir o chat da IA junto com o editor', desc: 'Você pode abrir e fechar a qualquer momento com Ctrl+Alt+I.', padrao: true },

  { aba: 'python', id: 'python.armadilhas', tipo: 'toggle', titulo: 'Avisar armadilhas clássicas do Python', desc: 'Argumento padrão mutável, lambda em loop, is no lugar de ==, input() tratado como número, chamada que trava a janela, widget apagado pelo coletor de lixo e outras.', padrao: true, resolve: 'Itens 4, 9, 10, 13–16, 18, 30, 33–38, 41, 53, 55, 62, 63, 86, 90' },
  { aba: 'python', id: 'python.ruff', tipo: 'toggle', titulo: 'Análise com Ruff', desc: 'Encontra nomes não definidos, imports sem uso, variáveis esquecidas e erros de sintaxe — com explicação em português.', padrao: true, resolve: 'Itens 3, 17, 171' },
  { aba: 'python', id: 'python.analisarAoDigitar', tipo: 'toggle', titulo: 'Analisar enquanto digita', desc: 'Mostra os problemas sem precisar salvar.', padrao: true },

  { aba: 'ia', id: 'ia.provedor', tipo: 'seg', titulo: 'Quem responde', desc: 'A PyForge IA roda no seu computador, de graça e sem chave. Claude e OpenAI são mais inteligentes, mas precisam de uma chave (pago por uso). O Ollama é para quem já usa o Ollama.', opcoes: [['pyforge', 'PyForge IA (grátis, no seu PC)'], ['anthropic', 'Claude (Anthropic)'], ['openai', 'OpenAI'], ['ollama', 'Ollama']], padrao: 'pyforge' },
  { aba: 'ia', id: 'ia.chave', so: 'nuvem', tipo: 'senha', titulo: 'Chave da API', desc: 'Fica guardada só no seu computador, criptografada pela sua conta do Windows. Pegue a sua em console.anthropic.com ou platform.openai.com.' },
  { aba: 'ia', id: 'ia.modelo', so: 'nuvem', tipo: 'texto', titulo: 'Modelo', desc: 'Deixe vazio para usar o padrão: claude-sonnet-5-5 (Claude), gpt-4.1 (OpenAI) ou qwen2.5-coder:7b (Ollama).', placeholder: 'padrão' },
  { aba: 'ia', id: 'ia.baseURL', so: 'nuvem', tipo: 'texto', titulo: 'Endereço da API (opcional)', desc: 'Para usar OpenRouter, LM Studio, Groq ou outro serviço compatível com OpenAI. Ollama: http://localhost:11434/v1', placeholder: 'padrão do provedor' },
  { aba: 'ia', id: 'ia.nivel', tipo: 'seg', titulo: 'Nível das explicações', desc: 'A IA ajusta o vocabulário e o tamanho das explicações.', opcoes: [['iniciante', 'Iniciante'], ['intermediario', 'Intermediário'], ['avancado', 'Avançado']], padrao: 'intermediario' },
  { aba: 'ia', id: 'ia.instrucoesExtras', tipo: 'area', titulo: 'Instruções extras para a IA', desc: 'Ex.: “Sempre use type hints”, “Explique como se eu tivesse 12 anos”, “Prefira Tkinter”.', placeholder: 'Opcional' },

  { aba: 'designer', id: 'designer.toolkit', tipo: 'seg', titulo: 'Toolkit das telas', desc: 'PySide6 (Qt) fica mais bonito e completo. Tkinter já vem com o Python e não precisa instalar nada.', opcoes: [['pyside6', 'PySide6 (Qt)'], ['tkinter', 'Tkinter']], padrao: 'pyside6', resolve: 'Itens 81–82, 96' },
  { aba: 'designer', id: 'designer.temaPadrao', tipo: 'seg', titulo: 'Tema das telas novas', desc: 'Você pode trocar em cada tela depois.', opcoes: [['claro', 'Claro'], ['escuro', 'Escuro']], padrao: 'claro', resolve: 'Item 101' },
];

const ABAS = [['conta', 'Sua conta'], ['geral', 'Geral'], ['editor', 'Editor'], ['python', 'Python'], ['ia', 'IA'], ['designer', 'Designer'], ['linguagens', 'Linguagens'], ['atalhos', 'Atalhos'], ['sobre', 'Sobre']];

const ATALHOS = [
  ['Salvar', 'Ctrl+S'], ['Executar o arquivo', 'F5'], ['Parar o programa', 'Shift+F5'], ['Abrir arquivo rápido', 'Ctrl+P'],
  ['Paleta de comandos do editor', 'F1'], ['Formatar documento', 'Shift+Alt+F'], ['Localizar / Substituir', 'Ctrl+F / Ctrl+H'],
  ['Buscar em todos os arquivos', 'Ctrl+Shift+F'], ['Comentar linha', 'Ctrl+/'], ['Renomear símbolo', 'F2'], ['Ir para definição', 'F12'],
  ['Próxima ocorrência (multi-cursor)', 'Ctrl+D'], ['Cursor em várias linhas', 'Ctrl+Alt+↑ / ↓'], ['Mover linha', 'Alt+↑ / ↓'],
  ['Mostrar/esconder barra lateral', 'Ctrl+B'], ['Mostrar/esconder painel', 'Ctrl+J'], ['Terminal', 'Ctrl+`'], ['Chat da IA', 'Ctrl+Alt+I'],
  ['Problemas', 'Ctrl+Shift+M'], ['Git', 'Ctrl+Shift+G'], ['Novo arquivo', 'Ctrl+N'], ['Fechar aba', 'Ctrl+W'], ['Quebra de linha', 'Alt+Z'],
  ['Aumentar / diminuir fonte', 'Ctrl+= / Ctrl+-'], ['Designer: desfazer / refazer', 'Ctrl+Z / Ctrl+Y'], ['Designer: apagar widget', 'Delete'], ['Designer: duplicar widget', 'Ctrl+D'], ['Designer: salvar tela', 'Ctrl+S'],
];

let aba = 'geral';

export async function montar(app, params) {
  aba = params.aba || 'geral';
  let busca = '';
  const raiz = el(`<div style="display:flex;flex-direction:column;height:100%">
    <header class="titulo">
      <button class="logo" data-lobby aria-label="Voltar ao lobby" title="Voltar ao lobby">${ic('logo', 17)}</button>
      <span class="marca">PyForge</span>
      <button class="btn ghost peq" data-lobby>${ic('home', 14)}Lobby</button>
      <span class="grow"></span>
      <span class="pill ok" data-salvo>Tudo salvo</span>
    </header>
    <main class="conteudo"><div class="conteudo-in" style="max-width:1100px">
      <h1 style="margin:0;font-size:22px">Configurações</h1>
      <div class="cfg-abas" role="tablist" data-abas></div>
      <label class="flex" style="height:40px;padding:0 12px;background:var(--panel);border:1px solid var(--bd2);border-radius:10px;color:var(--dim)">${ic('busca', 16)}<input data-busca placeholder="Buscar configuração (ex.: fonte, chave, tipos)" style="flex:1;background:transparent;border:0;outline:none" aria-label="Buscar configuração"></label>
      <div data-corpo style="display:flex;flex-direction:column;gap:12px"></div>
    </div></main></div>`);
  app.appendChild(raiz);
  raiz.querySelectorAll('[data-lobby]').forEach((b) => (b.onclick = () => ir('/lobby')));
  const marcarSalvo = () => { const s = raiz.querySelector('[data-salvo]'); const d = new Date(); s.textContent = 'Salvo às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
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
        <div class="flex"><span class="logo">${ic('logo', 17)}</span><div><div style="font-weight:700;font-size:16px">PyForge ${esc(estado.ping.versao)}</div><div class="muted">O app para programar Python, com IA.</div></div></div>
        <div class="muted">uv (ambientes e pacotes): <span class="${estado.ping.uv ? 'ok' : 'err'}">${estado.ping.uv ? 'pronto para usar' : 'não encontrado'}</span> · Git: <span class="${estado.ping.git ? 'ok' : 'warn'}">${estado.ping.git ? 'já instalado' : 'não instalado'}</span></div>
        <div class="muted">Pasta de dados: <span class="mono">${esc(estado.ping.dados)}</span> (configurações, log e lixeira)</div>
        <div class="dim" style="font-size:12px">Componentes de código aberto: Monaco Editor (MIT), uv (MIT/Apache-2.0), Ruff (MIT), jedi (MIT), PyInstaller (GPL com exceção para apps).</div>
      </div>`));
      return;
    }
    const local = cfg('ia.provedor', 'pyforge') === 'pyforge';
    const lista = DEFS.filter((d) => (busca ? (d.titulo + ' ' + d.desc).toLowerCase().includes(busca) : d.aba === aba) && !(d.so === 'nuvem' && local));
    const grade = el('<div class="grade-cfg"></div>');
    for (const d of lista) grade.appendChild(opcao(d));
    corpo.appendChild(grade);
    if (!lista.length) corpo.appendChild(el('<div class="card muted" style="padding:28px;text-align:center">Nenhuma configuração com esse nome.</div>'));
    if (!busca && aba === 'ia' && local) {
      const card = el(`<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px"><div><div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px"><span style="color:var(--ac-tx);display:flex">${ic('brilho', 17)}</span>PyForge IA</div><div class="muted" style="font-size:12.5px">Escolha o tamanho do “cérebro”. Quanto maior, mais esperta e mais pesada. Baixa uma vez só.</div></div><div data-painel></div></div>`);
      corpo.appendChild(card);
      painelIALocal(card.querySelector('[data-painel]'));
    }
    if (!busca && aba === 'ia') {
      const treino = el(`<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:10px">
        <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px"><span style="color:var(--yel);display:flex">${ic('joinha', 17)}</span>Treinar a PyForge IA</div>
        <div class="muted" style="font-size:12.5px;line-height:1.55">Cada 👍 ou 👎 que você dá nas respostas vira um exemplo de treino, guardado só no seu computador. Com o <strong>kit de treino</strong> você usa esses exemplos (mais as centenas que já vêm no kit) para treinar uma PyForge IA mais esperta no Google Colab e colocar o resultado na pasta dos modelos.</div>
        <div class="flex" style="gap:8px;flex-wrap:wrap"><span class="pill ok" data-bons>👍 …</span><span class="pill err" data-ruins>👎 …</span><span class="grow"></span>
        <button class="btn peq pri" data-kit>${ic('download', 13)}Gerar o kit de treino</button><button class="btn peq" data-arq>${ic('pastaAberta', 13)}Ver os exemplos</button><button class="btn peq perigo" data-apagar>Apagar exemplos</button></div></div>`);
      corpo.appendChild(treino);
      const resumo = async () => { try { const r = await api('ia/feedback/resumo'); treino.querySelector('[data-bons]').textContent = `👍 ${r.bons} ${r.bons === 1 ? "boa" : "boas"}`; treino.querySelector('[data-ruins]').textContent = `👎 ${r.ruins} ${r.ruins === 1 ? "ruim" : "ruins"}`; treino.dataset.arquivo = r.arquivo; } catch { /* ignora */ } };
      resumo();
      treino.querySelector('[data-arq]').onclick = () => api('fs/revelar', { caminho: treino.dataset.arquivo }).catch(() => toast('Ainda não há exemplos: dê 👍 ou 👎 em alguma resposta.', 'info'));
      treino.querySelector('[data-apagar]').onclick = async () => { if (await confirmar('Apagar exemplos', 'Apagar todos os 👍 e 👎 guardados? Isso não pode ser desfeito.', 'Apagar', true)) { await api('ia/feedback/apagar', {}); resumo(); } };
      treino.querySelector('[data-kit]').onclick = async () => {
        try { const r = await api('ia/kit', {}); toast(`Kit pronto em ${r.pasta} (${r.exemplos} exemplos). Abra o LEIA-ME.`, 'ok', 9000); } catch (e) { toast(e.message, 'err'); }
      };
    }
    if (!busca && aba === 'ia') {
      const extra = el(`<div class="card" style="padding:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn pri" data-testar>${ic('brilho', 15)}Testar conexão</button><button class="btn" data-prompt>${ic('livro', 15)}Ver o prompt da IA</button><span class="muted grow" data-res></span></div>`);
      extra.querySelector('[data-testar]').onclick = async () => {
        const r = extra.querySelector('[data-res]');
        r.textContent = 'Testando…';
        let t = '';
        try { await conversarIA({ mensagens: [{ role: 'user', content: 'Diga “Oi! Estou funcionando.” e mais uma frase curta e simpática.' }], contexto: 'Teste de conexão.' }, (x) => { t += x; r.textContent = t; }); r.className = 'ok grow'; }
        catch (e) { r.textContent = e.message; r.className = 'err grow'; }
      };
      extra.querySelector('[data-prompt]').onclick = async () => {
        const r = await fetch('/api/prompt', { headers: { 'X-PyForge-Token': sessionStorage.getItem('pyforge-token') } });
        const texto = await r.text();
        modal({ titulo: 'Prompt da IA do PyForge', largo: true, corpo: `<div class="muted" style="font-size:12.5px">${texto.length.toLocaleString('pt-BR')} caracteres. É isto que a IA recebe antes de cada conversa (com cache, para sair barato).</div><pre class="saida card" style="padding:14px;margin:0;flex:1;overflow:auto;white-space:pre-wrap">${esc(texto)}</pre>` });
      };
      corpo.appendChild(extra);
    }
  }

  function opcao(d) {
    const valor = d.id === 'workspace' ? cfg('workspace', '') : cfg(d.id, d.padrao);
    const caminhoObj = (v) => { const partes = d.id.split('.'); const o = {}; let at = o; partes.forEach((p, i) => { if (i === partes.length - 1) at[p] = v; else { at[p] = {}; at = at[p]; } }); return o; };
    const c = el(`<div class="card opcao"><div class="grow" style="display:flex;flex-direction:column;gap:8px"><div><div class="t">${esc(d.titulo)}</div><div class="d">${esc(d.desc)}</div></div><div data-ctrl></div>${d.resolve ? `<div><span class="pill info">Resolve: ${esc(d.resolve)}</span></div>` : ''}</div></div>`);
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
      const w = el(`<div style="display:flex;flex-direction:column;gap:6px"><div class="flex"><input class="campo grow" type="password" autocomplete="off" placeholder="${tem ? '•••••••••• (chave salva)' : 'Cole sua chave aqui'}" aria-label="Chave da API"><button class="btn pri" data-s>Salvar chave</button>${tem ? '<button class="btn perigo" data-a>Apagar</button>' : ''}</div><span class="${tem ? 'ok' : 'dim'}" style="font-size:12px">${tem ? '✓ Chave salva' : 'Nenhuma chave salva'}</span></div>`);
      w.querySelector('[data-s]').onclick = async () => { const v = w.querySelector('input').value.trim(); if (!v) return; await salvar({ ia: { chave: v } }); toast('Chave salva com segurança.', 'ok'); pintar(); };
      if (tem) w.querySelector('[data-a]').onclick = async () => { await salvar({ ia: { chave: '' } }); toast('Chave apagada.', 'ok'); pintar(); };
      ctrl.appendChild(w);
    } else if (d.tipo === 'pasta') {
      const w = el(`<div class="flex"><input class="campo grow mono" style="font-size:12.5px" aria-label="Pasta dos projetos"><button class="btn" data-e>${ic('pastaAberta', 14)}Escolher…</button></div>`);
      const inp = w.querySelector('input');
      inp.value = valor;
      inp.onchange = () => salvar({ workspace: inp.value.trim() });
      w.querySelector('[data-e]').onclick = async () => { const r = await api('escolher-pasta').catch(() => ({})); if (r.caminho) { inp.value = r.caminho; salvar({ workspace: r.caminho }); } else if (r.erro) toast('Digite o caminho no campo.', 'info'); };
      ctrl.appendChild(w);
    }
    return c;
  }

  pintar();
}
