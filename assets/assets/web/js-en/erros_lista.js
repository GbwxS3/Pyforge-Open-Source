// Lista pesquisável de todos os erros que o PyForge sabe explicar (menu Ajuda › Lista de erros).
import { el, esc, ic, modal } from './ui.js';
import { CATALOGO } from './erros_catalogo.js';

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// título "de catálogo": troca $1, $2… por reticências
const limpo = (s) => String(s || '').replace(/\$r?\d/g, '…');

/** Mostra o exemplo errado → certo de um erro. */
export function htmlExemplo(ex) {
  if (!ex) return '';
  return `<div class="erro-ex"><div class="erro-ex-col"><span class="erro-ex-rot ruim">${ic('x', 12)}This gives an error</span><pre class="mono">${esc(ex[0])}</pre></div>
    <div class="erro-ex-col"><span class="erro-ex-rot bom">${ic('check', 12)}This works</span><pre class="mono">${esc(ex[1])}</pre></div></div>`;
}

export function abrirListaErros(busca = '') {
  const grupos = [...new Set(CATALOGO.map((x) => x.grupo))];
  const corpo = el(`<div class="erros-lista">
    <div class="flex" style="gap:8px"><input class="campo grow" data-b placeholder="Search errors… (e.g. NoneType, comma, int(), file, pygame)" aria-label="Search errors" value="${esc(busca)}"><span class="dim" data-n style="font-size:12px;white-space:nowrap"></span></div>
    <div class="erros-chips" data-chips></div>
    <div class="erros-itens" data-itens></div></div>`);
  let grupo = '';
  const chips = corpo.querySelector('[data-chips]');
  chips.innerHTML = `<button class="chip on" data-g="">All</button>` + grupos.map((x) => `<button class="chip" data-g="${esc(x)}">${esc(x)}</button>`).join('');
  chips.onclick = (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    grupo = b.dataset.g;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
    pintar();
  };
  const inp = corpo.querySelector('[data-b]');
  function pintar() {
    const q = semAcento(inp.value.trim()).split(/\s+/).filter(Boolean);
    const lista = CATALOGO.filter((x) => (!grupo || x.grupo === grupo) && q.every((p) => semAcento([x.titulo, x.texto, (x.tipos || []).join(' '), x.re ? x.re.source : '', x.grupo].join(' ')).includes(p)));
    corpo.querySelector('[data-n]').textContent = `${lista.length} de ${CATALOGO.length} erros`;
    const box = corpo.querySelector('[data-itens]');
    box.innerHTML = lista.slice(0, 250).map((x, i) => `<details class="erro-item" ${lista.length <= 3 && i === 0 ? 'open' : ''}>
        <summary><span class="grow">${esc(limpo(x.titulo))}</span><span class="mono dim erro-tipo">${esc(x.tipos ? x.tipos[0].split('.').pop() : x.grupo.startsWith('Warnings') ? 'Warning' : 'Output')}</span></summary>
        <div class="erro-corpo"><div>${esc(limpo(x.texto))}</div>${htmlExemplo(x.exemplo)}
        ${x.re ? `<div class="dim mono" style="font-size:11px">Recognizes: ${esc(x.re.source.length > 140 ? x.re.source.slice(0, 140) + '…' : x.re.source)}</div>` : ''}</div></details>`).join('')
      || '<div class="dim" style="padding:20px;text-align:center">No error with those words.</div>';
  }
  inp.oninput = pintar;
  pintar();
  return modal({ titulo: `Errors PyForge explains`, corpo, largo: true });
}
