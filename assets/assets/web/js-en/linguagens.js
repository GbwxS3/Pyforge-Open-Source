// Linguagens: JavaScript, Lua (e as que a pessoa quiser) como plugins do PyForge.
// O PyForge só precisa saber "qual programa roda esse tipo de arquivo".
import { api } from './api.js';
import { el, esc, ic, toast, modal, confirmar } from './ui.js';

const LOGOS = { javascript: 'img/linguagens/javascript.png', lua: 'img/linguagens/lua.png' };
const ORIGEM = { pyforge: 'baixado pelo PyForge', sistema: 'was already on your PC', manual: 'program chosen by you', comando: 'custom command' };
const mb = (b) => (b / 1024 ** 2).toFixed(1).replace('.', ',') + ' MB';

export async function estadoLinguagens() { return api('linguagens'); }

/** Extensões que têm plugin ligado (para o botão Executar). */
export async function extensoesExecutaveis() {
  try {
    const s = await estadoLinguagens();
    const r = {};
    for (const l of s.linguagens) if (l.ligada) for (const e of l.extensoes || []) r[e] = l;
    return r;
  } catch { return {}; }
}

function logo(l) {
  if (LOGOS[l.id]) return `<img src="${LOGOS[l.id]}" alt="" width="40" height="40" style="border-radius:8px;object-fit:contain">`;
  return `<span style="width:40px;height:40px;border-radius:8px;background:var(--bg3,#22262F);display:flex;align-items:center;justify-content:center;font-weight:700">${esc((l.nome || '?').slice(0, 2).toUpperCase())}</span>`;
}

export function painelLinguagens(alvo) {
  let timer = null;
  let s = null;

  async function atualizar() {
    if (!alvo.isConnected && s) return;
    try { s = await estadoLinguagens(); } catch (e) { alvo.innerHTML = `<div class="card err" style="padding:16px">${esc(e.message)}</div>`; return; }
    pintar();
    clearTimeout(timer);
    if (s.baixando && s.baixando.id) timer = setTimeout(atualizar, 600);
  }

  async function configurar(id, mud) {
    try { await api('linguagens/configurar', { id, ...mud }); await atualizar(); } catch (e) { toast(e.message, 'err'); }
  }

  function pintar() {
    alvo.innerHTML = '';
    alvo.appendChild(el(`<div class="card" style="padding:14px 18px;display:flex;gap:12px;align-items:center">
      <img src="img/linguagens/python.png" alt="" width="34" height="34">
      <div class="grow"><div style="font-weight:700">Python is the main language</div>
      <div class="muted" style="font-size:12.5px">Here you turn on other languages as plugins. With the plugin on, the Run button (F5) also runs those files.</div></div></div>`));
    const b = s.baixando || {};
    if (b.erro && !b.id) alvo.appendChild(el(`<div class="card" style="padding:12px 16px;display:flex;gap:8px;color:var(--err,#F87171)">${ic('alerta', 15)}<span>${esc(b.erro)}</span></div>`));
    for (const l of s.linguagens) alvo.appendChild(cartao(l, b));
    const novo = el(`<button class="btn" style="align-self:flex-start">${ic('mais', 14)}Add another language</button>`);
    novo.onclick = adicionar;
    alvo.appendChild(novo);
  }

  function cartao(l, b) {
    const baixandoEsta = b.id === l.id;
    const status = l.instalado
      ? `<span class="ok">● pronto</span> <span class="dim">· ${esc(ORIGEM[l.origem] || '')}${l.versao ? ' · ' + esc(l.versao) : ''}</span>`
      : '<span class="warn">● not installed</span>';
    const c = el(`<div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:10px;${l.ligada ? '' : 'opacity:.6'}">
      <div class="flex" style="gap:12px;align-items:center">${logo(l)}
        <div class="grow"><div style="font-weight:700;font-size:15px">${esc(l.nome)} <span class="dim mono" style="font-weight:400;font-size:12px">${esc((l.extensoes || []).join(' '))}</span></div>
          <div style="font-size:12.5px">${status}</div></div>
        <label class="flex" style="gap:6px;font-size:12.5px;cursor:pointer"><input type="checkbox" data-ligar ${l.ligada ? 'checked' : ''}>Ligado</label>
      </div>
      ${l.desc ? `<div class="muted" style="font-size:12.5px">${esc(l.desc)}</div>` : ''}
      <div data-prog></div>
      <div class="flex" style="gap:8px;flex-wrap:wrap" data-bts></div>
      <details><summary class="dim" style="cursor:pointer;font-size:12.5px">Configure</summary>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          ${l.extra ? '' : `<label class="rotulo">Program (leave empty to find it automatically)</label>
          <div class="flex" style="gap:6px"><input class="campo mono grow" data-caminho placeholder="${esc(l.caminho || 'C:\\path\\to\\program.exe')}" value="${esc(l.caminhoManual || '')}"><button class="btn peq" data-salvar-caminho>Save</button></div>`}
          <label class="rotulo">Command to run</label>
          <div class="flex" style="gap:6px"><input class="campo mono grow" data-comando value="${esc(l.comando)}"><button class="btn peq" data-salvar-comando>Save</button></div>
          <div class="dim" style="font-size:12px">Use <span class="mono">{exe}</span> (the program), <span class="mono">{arquivo}</span>, <span class="mono">{pasta}</span> e <span class="mono">{nome}</span>. Ex.: <span class="mono">{exe} --watch {arquivo}</span></div>
        </div></details>
    </div>`);
    if (baixandoEsta) {
      const pct = b.total > 0 ? Math.min(100, (b.feito / b.total) * 100) : 0;
      c.querySelector('[data-prog]').appendChild(el(`<div class="ial-prog"><div style="font-weight:600;font-size:13px">${b.etapa === 'extraindo' ? 'Installing…' : 'Downloading ' + esc(l.nome) + '…'}</div>
        <div class="ial-barra"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="dim" style="font-size:12px">${b.total > 0 ? `${mb(b.feito)} de ${mb(b.total)}` : mb(b.feito || 0)}</div></div>`));
    }
    const bts = c.querySelector('[data-bts]');
    const botao = (html, fn, classe = '') => { const x = el(`<button class="btn peq ${classe}">${html}</button>`); x.onclick = fn; bts.appendChild(x); return x; };
    if (!l.extra) {
      if (l.origem !== 'pyforge' && l.baixavel && s.windows) {
        const x = botao(`${ic('download', 13)}${l.instalado ? 'Download own version' : 'Install'} <span class="dim">(${esc(l.tamanho)})</span>`, async () => {
          try { await api('linguagens/instalar', { id: l.id }); atualizar(); } catch (e) { toast(e.message, 'err'); }
        }, l.instalado ? '' : 'pri');
        if (b.id) x.disabled = true;
      }
      if (!s.windows && !l.instalado) bts.appendChild(el(`<span class="dim" style="font-size:12.5px">Install it with the system package manager (e.g. <span class="mono">sudo apt install ${l.id === 'lua' ? 'lua5.4' : 'nodejs'}</span>).</span>`));
      if (l.origem === 'pyforge') botao(`${ic('lixo', 13)}Remove`, async () => {
        if (!await confirmar('Remove ' + l.nome, `Delete the ${l.nome} that PyForge downloaded? Your files are not deleted.`, 'Remove', true)) return;
        try { await api('linguagens/remover', { id: l.id }); atualizar(); } catch (e) { toast(e.message, 'err'); }
      });
      if (l.site) botao(`${ic('externo', 13)}Official website`, () => api('abrir-url', { url: l.site }).catch(() => window.open(l.site)));
    } else {
      botao(`${ic('lixo', 13)}Remove`, async () => {
        if (!await confirmar('Remove ' + l.nome, `Remove the language ${l.nome} from PyForge?`, 'Remove', true)) return;
        try { await api('linguagens/remover', { id: l.id }); atualizar(); } catch (e) { toast(e.message, 'err'); }
      });
    }
    c.querySelector('[data-ligar]').onchange = (e) => configurar(l.id, { ligada: e.target.checked });
    const sc = c.querySelector('[data-salvar-caminho]');
    if (sc) sc.onclick = () => configurar(l.id, { caminho: c.querySelector('[data-caminho]').value }).then(() => toast('Program saved.', 'ok'));
    c.querySelector('[data-salvar-comando]').onclick = () => configurar(l.id, { comando: c.querySelector('[data-comando]').value }).then(() => toast('Command saved.', 'ok'));
    return c;
  }

  function adicionar() {
    const corpo = el(`<div style="display:flex;flex-direction:column;gap:10px">
      <div class="muted" style="font-size:12.5px">Any language that runs from the terminal works. Its program must be installed on the PC.</div>
      <div class="prop"><label class="rotulo">Name</label><input class="campo" data-nome placeholder="Ruby"></div>
      <div class="prop"><label class="rotulo">File extensions</label><input class="campo mono" data-ext placeholder=".rb"></div>
      <div class="prop"><label class="rotulo">Command</label><input class="campo mono" data-cmd placeholder="ruby {arquivo}"></div>
      <div class="dim" style="font-size:12px">Examples: <span class="mono">ruby {arquivo}</span> · <span class="mono">php {arquivo}</span> · <span class="mono">"C:\\Program Files\\R\\bin\\Rscript.exe" {arquivo}</span></div>
    </div>`);
    modal({ titulo: 'Add language', corpo, botoes: [{ texto: 'Cancel' }, { texto: 'Add', classe: 'pri', acao: async (cp) => {
      try {
        await api('linguagens/extra', { nome: cp.querySelector('[data-nome]').value, extensoes: cp.querySelector('[data-ext]').value, comando: cp.querySelector('[data-cmd]').value });
        atualizar();
      } catch (e) { toast(e.message, 'err'); return false; }
    } }] });
  }

  alvo.style.cssText += ';display:flex;flex-direction:column;gap:12px';
  alvo.innerHTML = '<div class="muted" style="padding:12px">Looking for languages…</div>';
  atualizar();
}
