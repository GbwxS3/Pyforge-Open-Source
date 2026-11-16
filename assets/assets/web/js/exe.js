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
const AJUDA_ANTIVIRUS = `<details class="exe-av"><summary>${ic('alerta', 14)}O Windows ou o antivírus disse que é vírus?</summary>
  <div class="exe-av-corpo">
    <p>É quase sempre <b>falso positivo</b>: o PyInstaller junta o Python inteiro dentro do .exe, e alguns vírus são feitos do mesmo jeito. Então o antivírus desconfia de qualquer programa assim, mesmo um “olá mundo”.</p>
    <ol>
      <li><b>Tela azul “O Windows protegeu o computador”</b> (SmartScreen): clique em <i>Mais informações</i> › <i>Executar assim mesmo</i>. Ela aparece para qualquer programa novo e sem assinatura.</li>
      <li><b>Gere sem “Um arquivo .exe só”</b>: o .exe em pasta é bem menos acusado.</li>
      <li><b>Mande para a Microsoft analisar</b>: no site de envio de arquivos do Microsoft Defender (Submit a file for malware analysis), marque que é um programa seu e incorreto. Costuma ser liberado em alguns dias.</li>
      <li><b>De vez</b>: assinar o .exe com um certificado de assinatura de código. Resolve, mas o certificado é pago.</li>
    </ol>
    <p class="dim">Nunca desligue o antivírus para rodar um .exe que você não fez.</p>
  </div></details>`;

export async function dialogoExe({ raiz, nomeProjeto, deps = [], arquivoInicial, rodar, anexar }) {
  let arvore = [], telas = [];
  try { arvore = (await api('fs/arvore?' + q({ raiz }))).itens || []; } catch (e) { toast(e.message, 'err'); return; }
  try { telas = ((await api('designer/listar?' + q({ raiz }))).telas || []).map((t) => t.nome); } catch { /* sem telas */ }
  const opcoes = arvore
    .filter((i) => !i.dir && /\.pyw?$/i.test(i.nome) && !/^(test_.*|.*_test|conftest|setup|__init__)\.pyw?$/i.test(i.nome))
    .map((i) => ({ caminho: i.caminho, nome: i.nome, tela: telas.includes(i.nome.replace(/\.pyw?$/i, '')) }));
  if (!opcoes.length) { toast('Não achei nenhum arquivo .py na pasta do projeto.', 'err'); return; }
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

  const nomePadrao = (nomeProjeto || 'MeuApp').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]/g, '') || 'MeuApp';
  const corpo = el(`<div style="display:flex;flex-direction:column;gap:14px">
    <div class="prop"><label class="rotulo" for="ex-nome">Nome do programa</label><input id="ex-nome" class="campo" value="${esc(nomePadrao)}"></div>
    <div class="prop"><label class="rotulo" for="ex-arq">Qual arquivo vira o .exe?</label>
      <select id="ex-arq" class="sel campo">${opcoes.map((o) => `<option value="${esc(o.caminho)}" ${o === atual ? 'selected' : ''}>${o.tela ? '★ ' : ''}${esc(o.nome)}${o.tela ? ' — tela do Designer' : ''}</option>`).join('')}</select>
      <div data-nota class="muted" style="font-size:12.5px;line-height:1.5;min-height:18px"></div></div>
    <label class="flex"><input type="checkbox" id="ex-jan"> É um app de janela (não abre a tela preta do console)</label>
    <label class="flex"><input type="checkbox" id="ex-uni" checked> Um arquivo .exe só (fácil de mandar para outra pessoa)</label>
    <div class="muted" style="font-size:12.5px;line-height:1.55">O PyForge usa o PyInstaller. O programa fica na pasta <span class="mono">dist</span> do projeto. A primeira vez demora alguns minutos.
    Imagens da pasta <span class="mono">assets</span> e planilhas da pasta <span class="mono">dados</span> vão junto, e um <span class="mono">icone.ico</span> na pasta do projeto vira o ícone.
    Se o antivírus implicar com o .exe, desmarque "Um arquivo .exe só".</div>
    ${AJUDA_ANTIVIRUS}</div>`);
  const sel = corpo.querySelector('#ex-arq');
  const nota = corpo.querySelector('[data-nota]');
  const jan = corpo.querySelector('#ex-jan');
  let info = null;
  async function atualizar() {
    atual = opcoes.find((o) => o.caminho === sel.value) || atual;
    nota.textContent = 'Analisando…';
    info = await analisar(atual);
    jan.checked = info.gui;
    const temTela = opcoes.some((o) => o.tela);
    if (atual.tela) nota.innerHTML = `${ic('check', 13)} Tela do Designer${info.lib ? ' feita com ' + esc(NOMES_LIB[info.lib] || info.lib) : ''}. É isso que vai abrir quando clicarem no .exe.`;
    else if (temTela && (info.pygame || !info.gui)) nota.innerHTML = `<span style="color:var(--yel)">${ic('alerta', 13)} Este arquivo ${info.pygame ? 'é um jogo pygame' : 'não abre a tela que você desenhou'}. Para o .exe abrir a sua tela do Designer, escolha um arquivo com ★.</span>`;
    else if (info.lib) nota.textContent = `Usa ${NOMES_LIB[info.lib] || info.lib}.`;
    else nota.textContent = 'Programa de console (sem janela).';
  }
  sel.addEventListener('change', atualizar);
  atualizar();

  modal({ titulo: 'Gerar executável', corpo, botoes: [{ texto: 'Cancelar' }, { texto: 'Gerar .exe', classe: 'pri', acao: async (c) => {
    const nome = (c.querySelector('#ex-nome').value.trim().replace(/[^A-Za-z0-9_-]/g, '')) || 'MeuApp';
    if (!info) info = await analisar(atual);
    const com = [];
    if (info.qt && !deps.some((d) => /pyside6/i.test(d))) com.push('pyside6-essentials');
    if (info.pygame && !deps.some((d) => /pygame/i.test(d))) com.push('pygame-ce');
    if (info.pil && !deps.some((d) => /pillow/i.test(d))) com.push('pillow');
    const unico = c.querySelector('#ex-uni').checked;
    const win = estado.ping && estado.ping.sistema === 'windows';
    const dist = juntar(raiz, 'dist');
    const exe = unico ? juntar(dist, nome + (win ? '.exe' : '')) : juntar(juntar(dist, nome), nome + (win ? '.exe' : ''));
    rodar({ tipo: 'exe', raiz, arquivo: atual.caminho, nome, janela: jan.checked, unico, com }, `Gerando ${nome}${win ? '.exe' : ''} a partir de ${atual.nome}`, (ok) => {
      if (!ok) return;
      const fim = el(`<div style="margin:8px 0;padding:10px 12px;border-radius:8px;background:var(--ok-bg, #12301F);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="color:var(--ok-tx)">${ic('checkC', 16)}</span><span class="grow">Pronto! Seu programa: <span class="mono">${esc(exe)}</span></span>
        <button class="btn peq pri">${ic('pasta', 13)}Mostrar na pasta</button></div>`);
      fim.appendChild(el(`<div style="flex-basis:100%">${AJUDA_ANTIVIRUS}</div>`));
      fim.querySelector('button').onclick = () => api('fs/revelar', { caminho: exe }).catch((e) => toast(e.message, 'err'));
      anexar(fim);
      toast(`${nome}${win ? '.exe' : ''} pronto na pasta dist.`, 'ok', 7000);
    });
  } }] });
}
