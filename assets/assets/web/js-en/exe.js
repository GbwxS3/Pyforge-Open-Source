// Diálogo "Gerar executável": usado pelo Editor e pelo Designer.
import { api, q } from './api.js';
import { el, esc, ic, modal, toast, juntar } from './ui.js';
import { estado } from './app.js';

const GUI = /\b(PySide6|PyQt[56]|customtkinter|tkinter|pygame|flet|kivy|wx)\b/;
const NOMES_LIB = { PySide6: 'PySide6 (Qt)', PyQt5: 'PyQt5', PyQt6: 'PyQt6', customtkinter: 'CustomTkinter', tkinter: 'Tkinter', pygame: 'pygame (jogo)', flet: 'Flet', kivy: 'Kivy', wx: 'wxPython' };

/**
 * @param {object} o
 * @param {string} o.raiz           pasta do projeto
 * @param {string} o.nomeProjeto
 * @param {string[]} o.deps         dependências do pyproject
 * @param {string} [o.arquivoInicial]
 * @param {(pedido:object, titulo:string, aoFim:(ok:boolean)=>void)=>void} o.rodar
 * @param {(no:HTMLElement)=>void} o.anexar  coloca um elemento na saída depois que termina
 */
// Por que o Windows/antivírus pode reclamar de um .exe feito com Python (falso positivo comum).
const AJUDA_ANTIVIRUS = `<details class="exe-av"><summary>${ic('alerta', 14)}Did Windows or your antivirus say it is a virus?</summary>
  <div class="exe-av-corpo">
    <p>It is almost always <b>false positive</b>: PyInstaller packs the whole Python inside the .exe, and some viruses are built the same way. So antivirus software distrusts any program like this, even a “hello world”.</p>
    <ol>
      <li><b>Blue screen “Windows protected your PC”</b> (SmartScreen): click <i>More information</i> › <i>Run anyway</i>. It shows up for any new program without a signature.</li>
      <li><b>Build without “A single .exe file”</b>: an .exe in a folder gets flagged much less.</li>
      <li><b>Send it to Microsoft for analysis</b>: on the Microsoft Defender file submission site (Submit a file for malware analysis), say it is your own program and a false positive. It is usually cleared within a few days.</li>
      <li><b>For good</b>: sign the .exe with a code-signing certificate. It works, but the certificate is paid.</li>
    </ol>
    <p class="dim">Never turn off your antivirus to run an .exe you did not make.</p>
  </div></details>`;

export async function dialogoExe({ raiz, nomeProjeto, deps = [], arquivoInicial, rodar, anexar }) {
  let arvore = [], telas = [];
  try { arvore = (await api('fs/arvore?' + q({ raiz }))).itens || []; } catch (e) { toast(e.message, 'err'); return; }
  try { telas = ((await api('designer/listar?' + q({ raiz }))).telas || []).map((t) => t.nome); } catch { /* sem telas */ }
  const opcoes = arvore
    .filter((i) => !i.dir && /\.pyw?$/i.test(i.nome) && !/^(test_.*|.*_test|conftest|setup|__init__)\.pyw?$/i.test(i.nome))
    .map((i) => ({ caminho: i.caminho, nome: i.nome, tela: telas.includes(i.nome.replace(/\.pyw?$/i, '')) }));
  if (!opcoes.length) { toast('Could not find any .py file in the project folder.', 'err'); return; }
  opcoes.sort((a, b) => (b.tela - a.tela) || (a.nome === 'main.py' ? -1 : b.nome === 'main.py' ? 1 : a.nome.localeCompare(b.nome)));
  const inicial = arquivoInicial && opcoes.find((o) => o.caminho.toLowerCase() === arquivoInicial.toLowerCase());
  let atual = inicial || opcoes.find((o) => o.tela) || opcoes.find((o) => o.nome === 'main.py') || opcoes[0];

  const cache = new Map();
  async function analisar(op) {
    if (cache.has(op.caminho)) return cache.get(op.caminho);
    let texto = '';
    try { texto += (await api('fs/ler?' + q({ caminho: op.caminho }))).conteudo || ''; } catch { /* ignora */ }
    if (op.tela) {
      try { texto += (await api('fs/ler?' + q({ caminho: juntar(juntar(raiz, 'ui'), op.nome.replace(/\.pyw?$/i, '') + '_ui.py') }))).conteudo || ''; } catch { /* ainda não salva */ }
    }
    const m = texto.match(GUI);
    const r = { gui: !!m || /\.pyw$/i.test(op.nome), lib: m ? m[1] : '', qt: /PySide6/.test(texto), pygame: /\bpygame\b/.test(texto), pil: /\bPIL\b/.test(texto) };
    cache.set(op.caminho, r);
    return r;
  }

  const nomePadrao = (nomeProjeto || 'MyApp').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]/g, '') || 'MyApp';
  const corpo = el(`<div style="display:flex;flex-direction:column;gap:14px">
    <div class="prop"><label class="rotulo" for="ex-nome">Program name</label><input id="ex-nome" class="campo" value="${esc(nomePadrao)}"></div>
    <div class="prop"><label class="rotulo" for="ex-arq">Which file becomes the .exe?</label>
      <select id="ex-arq" class="sel campo">${opcoes.map((o) => `<option value="${esc(o.caminho)}" ${o === atual ? 'selected' : ''}>${o.tela ? '★ ' : ''}${esc(o.nome)}${o.tela ? ' — Designer screen' : ''}</option>`).join('')}</select>
      <div data-nota class="muted" style="font-size:12.5px;line-height:1.5;min-height:18px"></div></div>
    <label class="flex"><input type="checkbox" id="ex-jan"> It is a window app (does not open the black console window)</label>
    <label class="flex"><input type="checkbox" id="ex-uni" checked> A single .exe file (easy to send to someone)</label>
    <div class="muted" style="font-size:12.5px;line-height:1.55">PyForge uses PyInstaller. The program goes in the folder <span class="mono">dist</span> of the project. The first time takes a few minutes. Images from the folder <span class="mono">assets</span> and spreadsheets from the folder <span class="mono">dados</span> go along, and an <span class="mono">icone.ico</span> in the project folder becomes the icon. If the antivirus complains about the .exe, untick "A single .exe file".</div>
    ${AJUDA_ANTIVIRUS}</div>`);
  const sel = corpo.querySelector('#ex-arq');
  const nota = corpo.querySelector('[data-nota]');
  const jan = corpo.querySelector('#ex-jan');
  let info = null;
  async function atualizar() {
    atual = opcoes.find((o) => o.caminho === sel.value) || atual;
    nota.textContent = 'Analyzing…';
    info = await analisar(atual);
    jan.checked = info.gui;
    const temTela = opcoes.some((o) => o.tela);
    if (atual.tela) nota.innerHTML = `${ic('check', 13)} Designer screen${info.lib ? ' made with ' + esc(NOMES_LIB[info.lib] || info.lib) : ''}. This is what opens when someone clicks the .exe.`;
    else if (temTela && (info.pygame || !info.gui)) nota.innerHTML = `<span style="color:var(--yel)">${ic('alerta', 13)} This file ${info.pygame ? 'is a pygame game' : 'does not open the screen you drew'}. For the .exe to open your Designer screen, pick a file with ★.</span>`;
    else if (info.lib) nota.textContent = `Uses ${NOMES_LIB[info.lib] || info.lib}.`;
    else nota.textContent = 'Console program (no window).';
  }
  sel.addEventListener('change', atualizar);
  atualizar();

  modal({ titulo: 'Build executable', corpo, botoes: [{ texto: 'Cancel' }, { texto: 'Build .exe', classe: 'pri', acao: async (c) => {
    const nome = (c.querySelector('#ex-nome').value.trim().replace(/[^A-Za-z0-9_-]/g, '')) || 'MyApp';
    if (!info) info = await analisar(atual);
    const com = [];
    if (info.qt && !deps.some((d) => /pyside6/i.test(d))) com.push('pyside6-essentials');
    if (info.pygame && !deps.some((d) => /pygame/i.test(d))) com.push('pygame-ce');
    if (info.pil && !deps.some((d) => /pillow/i.test(d))) com.push('pillow');
    const unico = c.querySelector('#ex-uni').checked;
    const win = estado.ping && estado.ping.sistema === 'windows';
    const dist = juntar(raiz, 'dist');
    const exe = unico ? juntar(dist, nome + (win ? '.exe' : '')) : juntar(juntar(dist, nome), nome + (win ? '.exe' : ''));
    rodar({ tipo: 'exe', raiz, arquivo: atual.caminho, nome, janela: jan.checked, unico, com }, `Generating ${nome}${win ? '.exe' : ''} from ${atual.nome}`, (ok) => {
      if (!ok) return;
      const fim = el(`<div style="margin:8px 0;padding:10px 12px;border-radius:8px;background:var(--ok-bg, #12301F);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="color:var(--ok-tx)">${ic('checkC', 16)}</span><span class="grow">Done! Your program: <span class="mono">${esc(exe)}</span></span>
        <button class="btn peq pri">${ic('pasta', 13)}Show in folder</button></div>`);
      fim.appendChild(el(`<div style="flex-basis:100%">${AJUDA_ANTIVIRUS}</div>`));
      fim.querySelector('button').onclick = () => api('fs/revelar', { caminho: exe }).catch((e) => toast(e.message, 'err'));
      anexar(fim);
      toast(`${nome}${win ? '.exe' : ''} ready in the dist folder.`, 'ok', 7000);
    });
  } }] });
}
