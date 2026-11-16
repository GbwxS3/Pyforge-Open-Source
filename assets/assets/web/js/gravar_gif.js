// Gravar o app rodando como GIF: o gravar_gif.py tira fotos da janela e avisa no fim
// com uma linha "@@PYFORGE_GIF@@ {json}" na saída.
import { api, q, TOKEN } from './api.js';
import { el, esc, ic, modal, toast } from './ui.js';
import { estaNaSala, enviarJuntos, imagemParaDataURL } from './juntos.js';

export const MARCA_GIF = '@@PYFORGE_GIF@@';

/** Separa o aviso do GIF do resto da saída. Devolve { texto, info }. */
export function filtrarGif(texto) {
  let info = null;
  const linhas = texto.split('\n').filter((l) => {
    const i = l.indexOf(MARCA_GIF);
    if (i < 0) return true;
    try { info = JSON.parse(l.slice(i + MARCA_GIF.length)); } catch { /* linha estragada */ }
    return false;
  });
  return { texto: linhas.join('\n'), info };
}

const tam = (b) => (b >= 1024 ** 2 ? (b / 1024 ** 2).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

/** Mostra o GIF gravado. */
export function mostrarGif(info) {
  const url = '/api/fs/bruto?' + q({ caminho: info.arquivo, t: TOKEN, v: Date.now() });
  const nome = info.arquivo.split(/[\\/]/).pop();
  const corpo = el(`<div style="display:flex;flex-direction:column;gap:12px;align-items:center">
    <img src="${url}" alt="Gravação do app" style="max-width:100%;max-height:60vh;border-radius:8px;border:1px solid var(--bd);background:#000">
    <div class="muted" style="font-size:12.5px;text-align:center"><span class="mono">gravacoes/${esc(nome)}</span><br>${info.segundos} s · ${info.largura} × ${info.altura} · ${tam(info.bytes)}</div>
    <div class="dim" style="font-size:12px;text-align:center">Dá para mandar no WhatsApp, Discord ou colocar no README do projeto.</div>
  </div>`);
  modal({ titulo: 'Gravação pronta', corpo, largo: true, botoes: [
    ...(estaNaSala() ? [{ texto: 'Mandar no chat Juntos', acao: async () => {
      try {
        const blob = await (await fetch(url)).blob();
        await enviarJuntos({ tipo: 'imagem', imagem: await imagemParaDataURL(blob), texto: nome });
        toast('GIF enviado no chat.', 'ok');
      } catch (e) { toast(e.message, 'err'); }
      return false;
    } }] : []),
    { texto: 'Mostrar na pasta', acao: () => { api('fs/revelar', { caminho: info.arquivo }).catch(() => {}); return false; } },
    { texto: 'Fechar', classe: 'pri' },
  ] });
}

/** Botão "Parar gravação": pede para o gravador parar (assim o GIF é salvo). */
export async function pararGravacao(idJob) {
  try { await api('job/entrada', { id: idJob, dados: 'parar\n' }); } catch { /* já tinha acabado */ }
}

export const icGif = (t = 14) => ic('monitor', t);
