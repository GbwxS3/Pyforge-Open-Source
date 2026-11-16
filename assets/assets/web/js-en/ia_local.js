// Painel da PyForge IA (a IA que roda no PC): escolher modelo, baixar e acompanhar.
import { api } from './api.js';
import { el, esc, ic, toast, confirmar } from './ui.js';
import { salvarConfig } from './app.js';

const gb = (b) => (b / 1024 ** 3).toFixed(b >= 10 * 1024 ** 3 ? 0 : 1).replace('.', ',') + ' GB';
const mb = (b) => Math.round(b / 1024 ** 2) + ' MB';
const tam = (b) => (b >= 1024 ** 3 ? gb(b) : mb(b));

export async function estadoIALocal() { return api('ia/local'); }

/**
 * Desenha o painel dentro de `alvo`.
 * @param {HTMLElement} alvo
 * @param {{compacto?: boolean, aoPronto?: () => void}} op
 */
export function painelIALocal(alvo, op = {}) {
  let timer = null;
  let vivo = true;
  let estado = null;
  let usarGPU = false;

  async function atualizar() {
    if (!vivo || (estado && !alvo.isConnected)) { parar(); return; }
    try { estado = await estadoIALocal(); } catch (e) { alvo.innerHTML = `<div class="err">${esc(e.message)}</div>`; return; }
    pintar();
    if (estado.baixando) agendar(700);
    else if (estado.prontoParaUsar && op.aoPronto && !op._avisado) { op._avisado = true; op.aoPronto(); }
  }
  function agendar(ms) { clearTimeout(timer); timer = setTimeout(atualizar, ms); }
  function parar() { vivo = false; clearTimeout(timer); }

  async function instalar(modelo) {
    try {
      await api('ia/local/instalar', { modelo, gpu: usarGPU });
      await salvarConfig({ ia: { provedor: 'pyforge' } });
      op._avisado = false;
      atualizar();
    } catch (e) { toast(e.message, 'err'); }
  }

  function pintar() {
    const s = estado;
    const ram = s.ramGB || 0;
    alvo.innerHTML = '';
    const caixa = el('<div class="ial"></div>');
    alvo.appendChild(caixa);
    if (s.baixando) {
      const pct = s.total > 0 ? Math.min(100, (s.feito / s.total) * 100) : 0;
      const p = el(`<div class="ial-prog">
        <div class="flex"><span class="grow" style="font-weight:600">${s.etapa === 'motor' ? 'Downloading the AI engine' : 'Downloading the model'} <span class="dim mono" style="font-weight:400;font-size:12px">${esc(s.arquivo || '')}</span></span><button class="btn peq ghost" data-cancelar>Pause</button></div>
        <div class="ial-barra"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="dim" style="font-size:12px">${s.total > 0 ? `${tam(s.feito)} de ${tam(s.total)} (${pct.toFixed(0)}%)` : tam(s.feito)} · you can keep using PyForge while it downloads</div></div>`);
      p.querySelector('[data-cancelar]').onclick = () => api('ia/local/cancelar', {}).then(atualizar);
      caixa.appendChild(p);
    }
    if (s.erro && !s.baixando) {
      caixa.appendChild(el(`<div class="ial-erro">${ic('alerta', 14)}<span>${esc(s.erro)}</span></div>`));
      if (!/cancelado/i.test(s.erro)) caixa.appendChild(planoB(s));
    }
    if (s.prontoParaUsar && !s.baixando) {
      caixa.appendChild(el(`<div class="ial-ok">${ic('checkC', 16)}<span><strong>PyForge AI ready</strong> with the model ${esc(s.escolhaNome || s.escolha)}. ${s.rodando ? 'Turned on now.' : 'It turns on by itself on the first question.'}</span></div>`));
    }
    const cards = el(`<div class="ial-cards ${op.compacto ? 'compacto' : ''}"></div>`);
    for (const m of s.catalogo) {
      const escolhido = s.escolha === m.id;
      const pouca = ram && ram + 0.5 < m.ramGB;
      const c = el(`<div class="ial-card ${escolhido ? 'on' : ''}">
        <div class="flex"><strong class="grow">${esc(m.nome)}${m.id === 'equilibrado' ? ' <span class="pill info">recomendado</span>' : ''}</strong>${m.baixado ? `<span class="ok" style="font-size:12px">${ic('check', 12)} baixado</span>` : ''}</div>
        <div class="muted" style="font-size:12.5px;line-height:1.45">${esc(m.descricao)}</div>
        <div class="dim" style="font-size:12px">${String(m.tamanhoGB).replace('.', ',')} GB · pede uns ${m.ramGB} GB of RAM${pouca ? ` <span class="warn">(your PC has ${ram.toFixed(0)} GB)</span>` : ''}</div>
        <div class="flex" style="gap:6px"></div></div>`);
      const bts = c.lastElementChild;
      if (m.baixado) {
        if (!escolhido) { const b = el('<button class="btn peq pri">Use this one</button>'); b.onclick = () => instalar(m.id); bts.appendChild(b); }
        else bts.appendChild(el('<span class="pill ok">in use</span>'));
        const r = el(`<button class="ib peq" title="Delete from PC" aria-label="Delete ${esc(m.nome)}">${ic('lixo', 14)}</button>`);
        r.onclick = async () => { if (await confirmar('Delete model', `Delete the model ${m.nome} (${String(m.tamanhoGB).replace('.', ',')} GB) of your PC? You can download it again later.`, 'Delete', true)) { await api('ia/local/remover', { arquivo: m.arquivo }); atualizar(); } };
        bts.appendChild(el('<span class="grow"></span>'));
        bts.appendChild(r);
      } else {
        const b = el(`<button class="btn peq ${m.id === 'equilibrado' ? 'pri' : ''}" ${s.baixando ? 'disabled' : ''}>${ic('download', 13)}Download and use</button>`);
        b.onclick = () => instalar(m.id);
        bts.appendChild(b);
      }
      cards.appendChild(c);
    }
    caixa.appendChild(cards);
    if (!op.compacto) {
      if (s.proprios && s.proprios.length) {
        caixa.appendChild(el('<div class="secao-t" style="margin-top:6px">Your models (.gguf in the models folder)</div>'));
        for (const p of s.proprios) {
          const escolhido = s.escolha === p.arquivo;
          const l = el(`<div class="ial-proprio ${escolhido ? 'on' : ''}">${ic('brilho', 14)}<span class="grow mono ellipsis" style="font-size:12.5px">${esc(p.arquivo)}</span><span class="dim" style="font-size:12px">${tam(p.tamanho)}</span></div>`);
          if (escolhido) l.appendChild(el('<span class="pill ok">in use</span>'));
          else { const b = el('<button class="btn peq">Use this one</button>'); b.onclick = () => instalar(p.arquivo); l.appendChild(b); }
          caixa.appendChild(l);
        }
      }
      const rod = el(`<div class="flex" style="gap:10px;flex-wrap:wrap">
        <label class="flex" style="gap:8px;font-size:12.5px"><input type="checkbox" data-gpu ${s.motor.gpu ? 'checked' : ''}> Use the graphics card (faster; needs a Vulkan-compatible card)</label>
        <span class="grow"></span><button class="btn peq" data-pasta>${ic('pastaAberta', 13)}Models folder</button></div>`);
      usarGPU = s.motor.gpu;
      rod.querySelector('[data-gpu]').onchange = (e) => {
        usarGPU = e.target.checked;
        if (s.motor.instalado && usarGPU !== s.motor.gpu) {
          toast(usarGPU ? 'I\'ll download the engine with graphics card support.' : 'I\'ll switch back to the CPU-only engine.', 'info');
          instalar(s.escolha);
        }
      };
      rod.querySelector('[data-pasta]').onclick = () => api('ia/local/pasta', {}).catch((e) => toast(e.message, 'err'));
      caixa.appendChild(rod);
      caixa.appendChild(el(`<div class="dim" style="font-size:12px;line-height:1.5">Everything runs on your computer: your questions and your code never leave it. Engine: llama.cpp (open source, MIT). Models: Qwen family (open source). To use your own model (for example, one trained with the training kit), put the file <span class="mono">.gguf</span> in the models folder.${s.motor.instalado ? ` Engine ${esc(s.motor.versao)}${s.motor.gpu ? ' with graphics card' : ''}.` : ''}</div>`));
    }
  }

  // Plano B: baixar pelo navegador; o PyForge acha o arquivo sozinho na pasta Downloads.
  function planoB(s) {
    const alvoId = s.instalando || s.escolha;
    const m = s.catalogo.find((x) => x.id === alvoId);
    const ehMotor = s.etapa === 'motor' || !s.motor.instalado;
    const url = ehMotor ? s.paginaMotor : m ? `https://huggingface.co/${m.repo}/resolve/main/${m.arquivo}` : '';
    const b = el(`<div class="ial-planob">
      <strong>Plan B: download in the browser (always works)</strong>
      <ol>
        <li><button class="btn peq" data-abrir>${ic('download', 13)}${ehMotor ? 'Open the engine page' : 'Download the model in the browser'}</button></li>
        <li>${ehMotor
          ? 'On the page, scroll down to <strong>Assets</strong> and download the file ending in <span class="mono">bin-win-cpu-x64.zip</span> (about 30 MB). No need to open the .zip.'
          : `Wait for the download of <span class="mono">${esc(m ? m.arquivo : '.gguf')}</span> finish in the browser (it is big, it may take a while).`}</li>
        <li><button class="btn peq pri" data-denovo>Try again</button> PyForge looks for the file by itself in the folder <strong>Downloads</strong>.</li>
      </ol></div>`);
    b.querySelector('[data-abrir]').onclick = () => api('abrir-url', { url }).catch((e) => toast(e.message, 'err'));
    b.querySelector('[data-denovo]').onclick = () => instalar(alvoId);
    return b;
  }

  atualizar();
  return { atualizar, parar };
}
