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
        <div class="flex"><span class="grow" style="font-weight:600">${s.etapa === 'motor' ? 'Baixando o motor da IA' : 'Baixando o modelo'} <span class="dim mono" style="font-weight:400;font-size:12px">${esc(s.arquivo || '')}</span></span><button class="btn peq ghost" data-cancelar>Pausar</button></div>
        <div class="ial-barra"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="dim" style="font-size:12px">${s.total > 0 ? `${tam(s.feito)} de ${tam(s.total)} (${pct.toFixed(0)}%)` : tam(s.feito)} · dá para continuar usando o PyForge enquanto baixa</div></div>`);
      p.querySelector('[data-cancelar]').onclick = () => api('ia/local/cancelar', {}).then(atualizar);
      caixa.appendChild(p);
    }
    if (s.erro && !s.baixando) {
      caixa.appendChild(el(`<div class="ial-erro">${ic('alerta', 14)}<span>${esc(s.erro)}</span></div>`));
      if (!/cancelado/i.test(s.erro)) caixa.appendChild(planoB(s));
    }
    if (s.prontoParaUsar && !s.baixando) {
      caixa.appendChild(el(`<div class="ial-ok">${ic('checkC', 16)}<span><strong>PyForge IA pronta</strong> com o modelo ${esc(s.escolhaNome || s.escolha)}. ${s.rodando ? 'Ligada agora.' : 'Ela liga sozinha na primeira pergunta.'}</span></div>`));
    }
    const cards = el(`<div class="ial-cards ${op.compacto ? 'compacto' : ''}"></div>`);
    for (const m of s.catalogo) {
      const escolhido = s.escolha === m.id;
      const pouca = ram && ram + 0.5 < m.ramGB;
      const c = el(`<div class="ial-card ${escolhido ? 'on' : ''}">
        <div class="flex"><strong class="grow">${esc(m.nome)}${m.id === 'equilibrado' ? ' <span class="pill info">recomendado</span>' : ''}</strong>${m.baixado ? `<span class="ok" style="font-size:12px">${ic('check', 12)} baixado</span>` : ''}</div>
        <div class="muted" style="font-size:12.5px;line-height:1.45">${esc(m.descricao)}</div>
        <div class="dim" style="font-size:12px">${String(m.tamanhoGB).replace('.', ',')} GB · pede uns ${m.ramGB} GB de RAM${pouca ? ` <span class="warn">(seu PC tem ${ram.toFixed(0)} GB)</span>` : ''}</div>
        <div class="flex" style="gap:6px"></div></div>`);
      const bts = c.lastElementChild;
      if (m.baixado) {
        if (!escolhido) { const b = el('<button class="btn peq pri">Usar este</button>'); b.onclick = () => instalar(m.id); bts.appendChild(b); }
        else bts.appendChild(el('<span class="pill ok">em uso</span>'));
        const r = el(`<button class="ib peq" title="Apagar do PC" aria-label="Apagar ${esc(m.nome)}">${ic('lixo', 14)}</button>`);
        r.onclick = async () => { if (await confirmar('Apagar modelo', `Apagar o modelo ${m.nome} (${String(m.tamanhoGB).replace('.', ',')} GB) do seu PC? Dá para baixar de novo depois.`, 'Apagar', true)) { await api('ia/local/remover', { arquivo: m.arquivo }); atualizar(); } };
        bts.appendChild(el('<span class="grow"></span>'));
        bts.appendChild(r);
      } else {
        const b = el(`<button class="btn peq ${m.id === 'equilibrado' ? 'pri' : ''}" ${s.baixando ? 'disabled' : ''}>${ic('download', 13)}Baixar e usar</button>`);
        b.onclick = () => instalar(m.id);
        bts.appendChild(b);
      }
      cards.appendChild(c);
    }
    caixa.appendChild(cards);
    if (!op.compacto) {
      if (s.proprios && s.proprios.length) {
        caixa.appendChild(el('<div class="secao-t" style="margin-top:6px">Seus modelos (.gguf na pasta de modelos)</div>'));
        for (const p of s.proprios) {
          const escolhido = s.escolha === p.arquivo;
          const l = el(`<div class="ial-proprio ${escolhido ? 'on' : ''}">${ic('brilho', 14)}<span class="grow mono ellipsis" style="font-size:12.5px">${esc(p.arquivo)}</span><span class="dim" style="font-size:12px">${tam(p.tamanho)}</span></div>`);
          if (escolhido) l.appendChild(el('<span class="pill ok">em uso</span>'));
          else { const b = el('<button class="btn peq">Usar este</button>'); b.onclick = () => instalar(p.arquivo); l.appendChild(b); }
          caixa.appendChild(l);
        }
      }
      const rod = el(`<div class="flex" style="gap:10px;flex-wrap:wrap">
        <label class="flex" style="gap:8px;font-size:12.5px"><input type="checkbox" data-gpu ${s.motor.gpu ? 'checked' : ''}> Usar a placa de vídeo (mais rápido; precisa de placa compatível com Vulkan)</label>
        <span class="grow"></span><button class="btn peq" data-pasta>${ic('pastaAberta', 13)}Pasta dos modelos</button></div>`);
      usarGPU = s.motor.gpu;
      rod.querySelector('[data-gpu]').onchange = (e) => {
        usarGPU = e.target.checked;
        if (s.motor.instalado && usarGPU !== s.motor.gpu) {
          toast(usarGPU ? 'Vou baixar o motor com placa de vídeo.' : 'Vou voltar para o motor só com processador.', 'info');
          instalar(s.escolha);
        }
      };
      rod.querySelector('[data-pasta]').onclick = () => api('ia/local/pasta', {}).catch((e) => toast(e.message, 'err'));
      caixa.appendChild(rod);
      caixa.appendChild(el(`<div class="dim" style="font-size:12px;line-height:1.5">Tudo roda no seu computador: suas perguntas e seu código não saem dele. Motor: llama.cpp (código aberto, MIT). Modelos: família Qwen (código aberto). Para usar um modelo seu (por exemplo, um treinado com o kit de treino), coloque o arquivo <span class="mono">.gguf</span> na pasta dos modelos.${s.motor.instalado ? ` Motor ${esc(s.motor.versao)}${s.motor.gpu ? ' com placa de vídeo' : ''}.` : ''}</div>`));
    }
  }

  // Plano B: baixar pelo navegador; o PyForge acha o arquivo sozinho na pasta Downloads.
  function planoB(s) {
    const alvoId = s.instalando || s.escolha;
    const m = s.catalogo.find((x) => x.id === alvoId);
    const ehMotor = s.etapa === 'motor' || !s.motor.instalado;
    const url = ehMotor ? s.paginaMotor : m ? `https://huggingface.co/${m.repo}/resolve/main/${m.arquivo}` : '';
    const b = el(`<div class="ial-planob">
      <strong>Plano B: baixar pelo navegador (sempre funciona)</strong>
      <ol>
        <li><button class="btn peq" data-abrir>${ic('download', 13)}${ehMotor ? 'Abrir a página do motor' : 'Baixar o modelo pelo navegador'}</button></li>
        <li>${ehMotor
          ? 'Na página, desça até <strong>Assets</strong> e baixe o arquivo que termina com <span class="mono">bin-win-cpu-x64.zip</span> (uns 30 MB). Não precisa abrir o .zip.'
          : `Espere o download do <span class="mono">${esc(m ? m.arquivo : '.gguf')}</span> terminar no navegador (é grande, pode demorar).`}</li>
        <li><button class="btn peq pri" data-denovo>Tentar de novo</button> O PyForge procura o arquivo sozinho na pasta <strong>Downloads</strong>.</li>
      </ol></div>`);
    b.querySelector('[data-abrir]').onclick = () => api('abrir-url', { url }).catch((e) => toast(e.message, 'err'));
    b.querySelector('[data-denovo]').onclick = () => instalar(alvoId);
    return b;
  }

  atualizar();
  return { atualizar, parar };
}
