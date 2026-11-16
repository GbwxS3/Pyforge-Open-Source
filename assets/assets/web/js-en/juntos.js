// Juntos: o chat de quem programa junto no mesmo Wi-Fi.
// Um laço só (por página) busca as mensagens; cada painel aberto só desenha.
import { api, q } from './api.js';
import { el, esc, ic, toast, modal } from './ui.js';
import { cfg, salvarConfig } from './app.js';

const J = { estado: { modo: '' }, msgs: [], membros: [], ultimo: 0, ouvintes: new Set(), rodando: false, naoLidas: 0, paineis: new Set(), caiu: '', parar: null };
const algumVisivel = () => document.visibilityState === 'visible' && [...J.paineis].some((a) => a.isConnected && a.offsetParent !== null);
const MAX_IMG = 6 * 1024 * 1024;

function avisarTodos() { for (const f of J.ouvintes) { try { f(); } catch { /* painel já fechado */ } } }
/** Recebe um aviso sempre que algo muda (mensagens, membros, não lidas). Devolve a função para cancelar. */
export function assinarJuntos(fn) { J.ouvintes.add(fn); return () => J.ouvintes.delete(fn); }
export const estaNaSala = () => !!J.estado.modo;
export const naoLidas = () => J.naoLidas;

function zerar() { J.estado = { modo: '' }; J.msgs = []; J.membros = []; J.ultimo = 0; J.caiu = ''; }

export async function atualizarJuntos() {
  try { J.estado = await api('juntos'); } catch { J.estado = { modo: '' }; }
  if (J.estado.modo) laco(); else zerar();
  avisarTodos();
}

async function laco() {
  if (J.rodando) return;
  J.rodando = true;
  while (J.estado.modo) {
    const ctrl = new AbortController();
    J.parar = () => ctrl.abort();
    let ev;
    try { ev = await api('juntos/eventos?' + q({ desde: J.ultimo }), undefined, 'GET', ctrl.signal); } catch (e) {
      if (!J.estado.modo) break;
      J.caiu = 'No connection to PyForge…';
      avisarTodos();
      await new Promise((ok) => setTimeout(ok, 2000));
      continue;
    }
    if (!J.estado.modo) break;
    if (ev.fechada) {
      const era = J.estado.modo;
      zerar();
      avisarTodos();
      if (era === 'convidado') toast('The room was closed (or you left it).', 'info', 6000);
      break;
    }
    J.caiu = ev.caiu || '';
    if (ev.membros) J.membros = ev.membros;
    const novas = (ev.mensagens || []).filter((m) => m.id > J.ultimo);
    if (novas.length) {
      J.msgs.push(...novas);
      if (J.msgs.length > 400) J.msgs = J.msgs.slice(-400);
      J.ultimo = Math.max(J.ultimo, ...novas.map((m) => m.id));
      const deOutros = novas.filter((m) => m.tipo !== 'sistema' && m.autor !== J.estado.eu);
      if (deOutros.length && !algumVisivel() && J.msgs.length > novas.length) {
        J.naoLidas += deOutros.length;
        const m = deOutros[deOutros.length - 1];
        toast(`💬 ${m.autor}: ${m.tipo === 'imagem' ? 'sent an image' : m.tipo === 'codigo' ? 'sent some code' : m.texto.slice(0, 80)}`, 'info', 5000);
      }
    } else if (typeof ev.ultimo === 'number' && ev.ultimo < J.ultimo) J.ultimo = ev.ultimo;
    avisarTodos();
  }
  J.rodando = false;
}

export async function enviarJuntos(msg) {
  await api('juntos/enviar', msg);
}

/** Lê um arquivo de imagem como dataURL (para mandar no chat). */
export function imagemParaDataURL(blob) {
  return new Promise((ok, erro) => {
    if (blob.size > MAX_IMG) { erro(new Error('image too big (max 6 MB)')); return; }
    const fr = new FileReader();
    fr.onload = () => ok(fr.result);
    fr.onerror = () => erro(new Error('could not read the image'));
    fr.readAsDataURL(blob);
  });
}

const hora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const iniciais = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
function textoComLinks(t) {
  return esc(t).replace(/`([^`\n]{1,200})`/g, '<code>$1</code>');
}

/**
 * Desenha o chat dentro de `alvo`.
 * @param {HTMLElement} alvo
 * @param {{pegarCodigo?: () => ({texto:string, ling?:string, arquivo?:string}|null), inserirCodigo?: (texto:string) => void}} ctx
 */
export function painelJuntos(alvo, ctx = {}) {
  let visivel = true;
  let rascunho = '';
  let pintadoAte = -1;
  let ultimoModo = null;
  alvo.classList.add('jt');
  J.paineis.add(alvo);
  J.naoLidas = 0;

  const cancelar = assinarJuntos(() => pintar());

  function pintar() {
    if (!alvo.isConnected && ultimoModo !== null) { destruir(); return; }
    if (J.estado.modo !== ultimoModo) { ultimoModo = J.estado.modo; pintadoAte = -1; (J.estado.modo ? montarSala : montarFora)(); }
    if (J.estado.modo) atualizarSala();
  }

  // ---------------------------------------------------------- fora de uma sala
  function montarFora() {
    alvo.innerHTML = `<div class="jt-fora">
      <div class="jt-hero"><span class="jt-hero-ic">${ic('equipe', 22)}</span><div><div class="jt-hero-t">Code together</div><div class="muted">Chat with people on the <b>same Wi-Fi</b>: send messages, code, images and GIFs of your app.</div></div></div>
      <div class="prop"><label class="rotulo" for="jt-nome">Your name</label><input id="jt-nome" class="campo" data-jt-nome maxlength="24" placeholder="How others will see you" value="${esc(cfg('juntos.nome', ''))}"></div>
      <button class="btn pri" data-jt-criar>${ic('mais', 14)}Create a room</button>
      <div class="jt-ou"><span>or join someone's room</span></div>
      <div class="flex" style="gap:6px"><input class="campo mono jt-cod-in" data-jt-cod inputmode="numeric" maxlength="7" placeholder="123456" aria-label="Room code"><button class="btn" data-jt-entrar>Join</button></div>
      <details class="jt-det"><summary>Can't find the room?</summary>
        <div class="dim" style="font-size:12px;margin:6px 0">Type the address shown in the creator's room (e.g. 192.168.0.10:8800).</div>
        <input class="campo mono" data-jt-end placeholder="192.168.0.10:8800"></details>
      <div class="dim jt-dica">${ic('info', 13)}<span>The first time, Windows may ask about the <b>Firewall</b>: tick “Private networks” and click <b>Allow</b>, otherwise the others cannot find the room.</span></div>
    </div>`;
    const nome = () => {
      const v = alvo.querySelector('[data-jt-nome]').value.trim();
      if (!v) { toast('Type your name first.', 'info'); alvo.querySelector('[data-jt-nome]').focus(); return null; }
      if (v !== cfg('juntos.nome', '')) salvarConfig({ juntos: { nome: v } }).catch(() => {});
      return v;
    };
    alvo.querySelector('[data-jt-criar]').onclick = async (e) => {
      const n = nome(); if (!n) return;
      e.target.disabled = true;
      try { J.estado = await api('juntos/criar', { nome: n }); J.msgs = []; J.ultimo = 0; laco(); avisarTodos(); } catch (er) { toast(er.message, 'err'); e.target.disabled = false; }
    };
    const entrar = async () => {
      const n = nome(); if (!n) return;
      const codigo = alvo.querySelector('[data-jt-cod]').value.replace(/\D/g, '');
      if (codigo.length !== 6) { toast('The code has 6 numbers.', 'info'); return; }
      const b = alvo.querySelector('[data-jt-entrar]');
      b.disabled = true; b.textContent = 'Searching…';
      try { J.estado = await api('juntos/entrar', { nome: n, codigo, endereco: alvo.querySelector('[data-jt-end]').value }); J.msgs = []; J.ultimo = 0; laco(); avisarTodos(); } catch (er) { toast(er.message, 'err', 8000); b.disabled = false; b.textContent = 'Join'; }
    };
    alvo.querySelector('[data-jt-entrar]').onclick = entrar;
    alvo.querySelector('[data-jt-cod]').onkeydown = (e) => { if (e.key === 'Enter') entrar(); };
  }

  // ---------------------------------------------------------- dentro da sala
  function montarSala() {
    alvo.innerHTML = `<div class="jt-sala">
      <div class="jt-cab">
        <div class="flex" style="gap:8px"><div class="grow ellipsis" style="font-weight:700" data-jt-sala></div><button class="btn peq ghost" data-jt-sair title="Leave the room">${ic('x', 13)}Leave</button></div>
        <div class="flex" style="gap:6px;flex-wrap:wrap"><button class="jt-codigo" data-jt-copiar title="Copy the code">Code <b data-jt-codigo></b></button><span class="dim" style="font-size:11.5px" data-jt-end></span></div>
        <div class="jt-membros" data-jt-membros></div>
        <div class="jt-caiu" data-jt-caiu></div>
      </div>
      <div class="jt-msgs" data-jt-msgs role="log" aria-live="polite"></div>
      <div class="jt-comp">
        <textarea class="campo" data-jt-txt rows="1" placeholder="Message (Enter sends, Shift+Enter new line)" aria-label="Message"></textarea>
        <div class="flex" style="gap:4px">
          ${ctx.pegarCodigo ? `<button class="ib" data-jt-cod title="Send the selected code (or the open file)" aria-label="Send code">${ic('codigo', 15)}</button>` : ''}
          <label class="ib" title="Send image or GIF" aria-label="Send image" style="cursor:pointer">${ic('imagem', 15)}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-jt-img hidden></label>
          <span class="grow"></span>
          <button class="btn pri peq" data-jt-enviar>${ic('enviar', 13)}Send</button>
        </div>
      </div></div>`;
    const txt = alvo.querySelector('[data-jt-txt]');
    txt.value = rascunho;
    const crescer = () => { txt.style.height = 'auto'; txt.style.height = Math.min(140, txt.scrollHeight + 2) + 'px'; };
    txt.oninput = () => { rascunho = txt.value; crescer(); };
    const mandar = async () => {
      const t = txt.value;
      if (!t.trim()) return;
      txt.value = ''; rascunho = ''; crescer();
      try { await enviarJuntos({ tipo: 'texto', texto: t }); } catch (e) { toast(e.message, 'err'); txt.value = t; rascunho = t; }
    };
    txt.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); mandar(); } };
    txt.onpaste = async (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
      if (!f) return;
      e.preventDefault();
      mandarImagem(f, 'pasted image');
    };
    alvo.querySelector('[data-jt-enviar]').onclick = mandar;
    alvo.querySelector('[data-jt-img]').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) mandarImagem(f, f.name); };
    const bc = alvo.querySelector('[data-jt-cod]');
    if (bc) bc.onclick = async () => {
      const c = ctx.pegarCodigo();
      if (!c || !c.texto.trim()) { toast('Open a file (or select part of the code) to send.', 'info'); return; }
      try { await enviarJuntos({ tipo: 'codigo', texto: c.texto, ling: c.ling || '', arquivo: c.arquivo || '' }); } catch (e) { toast(e.message, 'err'); }
    };
    alvo.querySelector('[data-jt-sair]').onclick = async () => {
      const anf = J.estado.modo === 'anfitriao';
      try { await api('juntos/sair', {}); } catch { /* já saiu */ }
      if (J.parar) J.parar();
      zerar(); avisarTodos();
      toast(anf ? 'Room closed.' : 'You left the room.', 'info');
    };
    alvo.querySelector('[data-jt-copiar]').onclick = () => { navigator.clipboard?.writeText(J.estado.codigo).then(() => toast('Code copied.', 'ok'), () => {}); };
    setTimeout(() => txt.focus(), 30);
  }

  async function mandarImagem(f, nome) {
    try { await enviarJuntos({ tipo: 'imagem', imagem: await imagemParaDataURL(f), texto: nome || '' }); } catch (e) { toast(e.message, 'err'); }
  }

  function htmlMsg(m, anterior) {
    if (m.tipo === 'sistema') return `<div class="jt-sis">${esc(m.texto)}</div>`;
    const mesma = anterior && anterior.tipo !== 'sistema' && anterior.autor === m.autor && m.hora - anterior.hora < 120000;
    const eu = m.autor === J.estado.eu;
    let corpo = '';
    if (m.tipo === 'codigo') {
      corpo = `<div class="jt-codigo-msg"><div class="jt-cod-cab"><span class="grow ellipsis mono">${esc(m.arquivo || m.ling || 'code')}</span>
        <button class="ib peq" data-jt-copiar-cod title="Copy" aria-label="Copy">${ic('copiar', 13)}</button>${ctx.inserirCodigo ? `<button class="ib peq" data-jt-inserir title="Paste into the open file" aria-label="Paste into file">${ic('abaixo', 13)}</button>` : ''}</div><pre>${esc(m.texto)}</pre></div>`;
    } else if (m.tipo === 'imagem') {
      corpo = `<img class="jt-img" src="${m.imagem}" alt="${esc(m.texto || 'imagem')}" data-jt-ver>`;
    } else corpo = `<div class="jt-txt">${textoComLinks(m.texto)}</div>`;
    return `<div class="jt-msg ${eu ? 'eu' : ''} ${mesma ? 'cont' : ''}" data-jt-mid="${m.id}">
      ${mesma ? '' : `<div class="jt-quem"><span class="jt-av" style="background:${m.cor}">${esc(iniciais(m.autor))}</span><b style="color:${m.cor}">${esc(m.autor)}</b><span class="dim">${hora(m.hora)}</span></div>`}
      ${corpo}</div>`;
  }

  function atualizarSala() {
    const $ = (s) => alvo.querySelector(s);
    if (!$('[data-jt-msgs]')) return;
    $('[data-jt-sala]').textContent = J.estado.sala || 'Room';
    $('[data-jt-codigo]').textContent = (J.estado.codigo || '').replace(/(\d{3})(\d{3})/, '$1 $2');
    $('[data-jt-end]').textContent = J.estado.modo === 'anfitriao' && J.estado.enderecos && J.estado.enderecos[0] ? 'Address: ' + J.estado.enderecos[0] : '';
    $('[data-jt-membros]').innerHTML = J.membros.map((m) => `<span class="jt-mb" title="${esc(m.nome)}${m.anfitriao ? ' (created the room)' : ''}"><span class="jt-av" style="background:${m.cor}">${esc(iniciais(m.nome))}</span>${esc(m.nome)}${m.anfitriao ? ' ★' : ''}</span>`).join('');
    $('[data-jt-caiu]').textContent = J.caiu;
    const lista = $('[data-jt-msgs]');
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 60;
    const novas = J.msgs.filter((m) => m.id > pintadoAte);
    if (pintadoAte < 0) lista.innerHTML = '';
    for (const m of novas) {
      const i = J.msgs.indexOf(m);
      const no = el(htmlMsg(m, J.msgs[i - 1]));
      const cc = no.querySelector('[data-jt-copiar-cod]');
      if (cc) cc.onclick = () => navigator.clipboard?.writeText(m.texto).then(() => toast('Code copied.', 'ok'), () => {});
      const ins = no.querySelector('[data-jt-inserir]');
      if (ins) ins.onclick = () => ctx.inserirCodigo(m.texto);
      const im = no.querySelector('[data-jt-ver]');
      if (im) im.onclick = () => modal({ titulo: m.texto || 'Image', largo: true, corpo: `<div style="text-align:center"><img src="${m.imagem}" alt="" style="max-width:100%;max-height:70vh;border-radius:8px"></div>`, botoes: [{ texto: 'Close', classe: 'pri' }] });
      lista.appendChild(no);
      pintadoAte = m.id;
    }
    if (!J.msgs.length) lista.innerHTML = '<div class="jt-sis">No messages yet.</div>';
    if (novas.length && (noFim || novas.some((m) => m.autor === J.estado.eu))) {
      lista.scrollTop = 1e9;
      // imagens crescem depois de carregar: continua no fim
      for (const im of lista.querySelectorAll('img.jt-img:not([data-jt-ok])')) { im.dataset.jtOk = '1'; im.addEventListener('load', () => { lista.scrollTop = 1e9; }, { once: true }); }
    }
    if (algumVisivel()) J.naoLidas = 0;
  }

  function destruir() {
    if (!visivel) return;
    visivel = false;
    cancelar();
    J.paineis.delete(alvo);
  }

  pintar();
  if (J.estado.modo === '' && !J.rodando) atualizarJuntos();
  return { destruir };
}

// ao abrir a página: se já estava numa sala (ex.: trocou do editor para o Designer), continua
atualizarJuntos();
