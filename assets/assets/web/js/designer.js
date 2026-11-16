// Designer de interface (v2): tela livre no estilo Figma/Canva, que gera código PySide6 ou Tkinter de verdade.
import { api, q, iniciarJob, TOKEN } from './api.js';
import { fmt, el, esc, ic, toast, modal, perguntar, confirmar, menuContexto, juntar } from './ui.js';
import { ir, cfg, salvarConfig } from './app.js';
import { carregarMonaco } from './monaco.js';
import { criarChat } from './ia.js';
import { dialogoExe } from './exe.js';
import {
  TIPOS, EVENTOS, CORES_TEMA, FONTES, TAMANHOS_JANELA, REST_H, REST_V, MODELOS, COR_OK, nomeOk,
  novoDesign, normalizar, criarBase, caixaDe, reposicionar, cor, fundoJanela, metodoSugerido,
} from './designer_modelo.js';
import { gerarQt, gerarTk } from './designer_gerar.js';
import { dialogoPlanilha, montarApp } from './designer_planilha.js';
import { painelJuntos, assinarJuntos, naoLidas, estaNaSala } from './juntos.js';
import { filtrarGif, mostrarGif, pararGravacao, MARCA_GIF } from './gravar_gif.js';
import { ANIMACOES_ABRIR, tocarNoNavegador, quadro as quadroAnim } from './designer_animacao.js';
import qrcode from './vendor/qrcode.js';
import { criarEditorFuncoes } from './designer_funcoes.js';
import { normalizarLogica, definirProjeto, gerarEstado } from './designer_logica.js';

const BARRA = 34; // altura da barra de título desenhada acima da janela
const REGUA = 20;
const FERRAMENTAS = [
  ['mover', 'cursor', 'Mover e selecionar', 'V'],
  ['mao', 'mao', 'Mão: arrastar a tela (ou segure Espaço)', 'H'],
  '-',
  ['texto', 'texto', 'Texto', 'T'],
  ['retangulo', 'retangulo', 'Retângulo', 'R'],
  ['elipse', 'circulo', 'Círculo', 'O'],
  ['linha', 'linhaReta', 'Linha', 'L'],
  ['imagem', 'imagem', 'Imagem', 'I'],
  '-',
  ['botao', 'botao', 'Botão', 'B'],
  ['campo', 'campo', 'Campo de texto', 'F'],
];
const ATALHOS = [
  ['Ferramentas', [['V', 'Mover / selecionar'], ['H ou Espaço', 'Mão (arrastar a tela)'], ['T R O L I', 'Texto, retângulo, círculo, linha, imagem'], ['B F', 'Botão, campo de texto'], ['Esc', 'Voltar para Mover / tirar seleção']]],
  ['Câmera', [['Roda do mouse', 'Rolar a tela'], ['Ctrl + roda', 'Zoom no cursor'], ['Botão do meio', 'Arrastar a tela'], ['Shift + 1', 'Ajustar tudo na tela'], ['Shift + 2', 'Zoom na seleção'], ['Ctrl + 0', '100%'], ['Ctrl + = / Ctrl + -', 'Mais / menos zoom']]],
  ['Seleção', [['Clique', 'Selecionar (o grupo inteiro)'], ['Ctrl + clique', 'Selecionar dentro do grupo'], ['Shift + clique', 'Somar à seleção'], ['Arrastar no vazio', 'Laço de seleção'], ['Ctrl + A', 'Selecionar tudo'], ['Alt (segurado)', 'Mostrar distâncias']]],
  ['Mover e tamanho', [['Setas', 'Mover 1 px'], ['Shift + setas', 'Mover 10 px'], ['Shift ao arrastar', 'Travar na horizontal/vertical'], ['Alt ao arrastar', 'Duplicar arrastando'], ['Ctrl ao arrastar', 'Sem encaixe'], ['Shift no canto', 'Manter proporção'], ['Alt no canto', 'Redimensionar pelo centro']]],
  ['Editar', [['Ctrl + Z / Ctrl + Y', 'Desfazer / refazer'], ['Ctrl + C / X / V', 'Copiar / recortar / colar'], ['Ctrl + D', 'Duplicar'], ['Delete', 'Apagar'], ['Enter ou 2 cliques', 'Editar o texto'], ['Ctrl + G / Ctrl + Shift + G', 'Agrupar / desagrupar'], ['Ctrl + ] / Ctrl + [', 'Trazer / enviar uma camada'], ['Ctrl + Shift + ] / [', 'Para a frente / para trás'], ['Ctrl + Shift + H', 'Ocultar / mostrar'], ['Ctrl + Shift + L', 'Travar / destravar']]],
  ['Alinhar', [['Alt + A / D', 'Esquerda / direita'], ['Alt + W / S', 'Topo / base'], ['Alt + H / V', 'Centro horizontal / vertical']]],
  ['Tela', [['Ctrl + S', 'Salvar'], ['F5', 'Rodar a tela'], ['Ctrl + \'', 'Mostrar / esconder a grade'], ['Shift + R', 'Mostrar / esconder as réguas'], ['?', 'Esta ajuda']]],
];

let S = null;
let CLIP = null; // área de transferência (vale entre telas)

export function temAlteracoes() { return S && S.sujo; }
export async function podeSair() {
  if (!S || !S.sujo) return true;
  return confirmar('Tela não salva', 'Esta tela tem mudanças que não foram salvas. Sair mesmo assim?', 'Sair sem salvar', true);
}

const lim = (v, a, b) => Math.max(a, Math.min(b, v));

// Contas simples nos campos numéricos (ex.: 120+16, 640/2).
function calcular(txt) {
  const s = String(txt).replace(/\s+/g, '').replace(',', '.');
  if (!/^[-+*/().\d]+$/.test(s)) return NaN;
  let i = 0;
  const num = () => { const m = /^\d*\.?\d+/.exec(s.slice(i)); if (!m) return NaN; i += m[0].length; return parseFloat(m[0]); };
  const fator = () => { if (s[i] === '-') { i++; return -fator(); } if (s[i] === '+') { i++; return fator(); } if (s[i] === '(') { i++; const v = expr(); if (s[i] === ')') i++; return v; } return num(); };
  const termo = () => { let v = fator(); while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const d = fator(); v = o === '*' ? v * d : v / d; } return v; };
  const expr = () => { let v = termo(); while (s[i] === '+' || s[i] === '-') { const o = s[i++]; const d = termo(); v = o === '+' ? v + d : v - d; } return v; };
  const v = expr();
  return i === s.length && Number.isFinite(v) ? v : NaN;
}

export async function montar(app, params) {
  const raiz = params.p;
  if (!raiz) { ir('/lobby'); return; }
  let info;
  try { info = await api('projetos/abrir', { caminho: raiz }); } catch (e) { toast(e.message, 'err'); ir('/lobby'); return; }
  S = {
    raiz: info.caminho, nomeProjeto: info.nome, telas: [], D: null, sel: [], hist: [], histI: -1,
    modo: 'design', esq: 'elementos', dir: 'props', cam: { x: 0, y: 0, z: 1 }, ferramenta: 'mover',
    sujo: false, salvo: '', toolkit: cfg('designer.toolkit', 'pyside6'), deps: info.deps || [],
    grade: cfg('designer.grade', true), gradeTam: cfg('designer.gradeTam', 8), encaixeGrade: cfg('designer.encaixeGrade', false),
    encaixe: cfg('designer.encaixe', true), reguas: cfg('designer.reguas', true),
    hover: null, guiasAtivas: [], laco: null, previa: null, alt: false, espaco: false, cursor: null, editando: null,
    versaoImg: Date.now(), imagens: null, coresRecentes: cfg('designer.cores', []), filtro: '', trilha: [],
  };

  const ui = el(`<div class="ds" style="display:flex;flex-direction:column;height:100%">
    <header class="titulo">
      <button class="logo" data-lobby title="Voltar ao lobby" aria-label="Voltar ao lobby">${ic('logo', 17)}</button>
      <span class="marca">Designer</span>
      <select class="sel" data-telas aria-label="Tela" style="height:30px;max-width:180px"></select>
      <button class="ib" data-nova title="Nova tela" aria-label="Nova tela">${ic('mais', 16)}</button>
      <button class="ib" data-planilha title="Planilha vira app: crie uma tela a partir de um Excel ou CSV" aria-label="Planilha vira app">${ic('tabela', 16)}</button>
      <button class="ib" data-undo title="Desfazer (Ctrl+Z)" aria-label="Desfazer">${ic('desfazer', 16)}</button>
      <button class="ib" data-redo title="Refazer (Ctrl+Y)" aria-label="Refazer">${ic('refazer', 16)}</button>
      <span class="grow"></span>
      <div class="seg" role="radiogroup" aria-label="Modo" data-modos><button role="radio" data-m="design">Design</button><button role="radio" data-m="funcoes" title="Ligue os botões a funções arrastando fios">Funções</button><button role="radio" data-m="codigo">Código</button><button role="radio" data-m="dividido">Dividido</button></div>
      <span class="grow"></span>
      <div class="seg" role="radiogroup" aria-label="Toolkit" data-tk><button role="radio" data-k="pyside6">PySide6</button><button role="radio" data-k="tkinter">Tkinter</button></div>
      <button class="btn peq" data-editor title="Abrir o editor de código">${ic('codigo', 14)}Editor</button>
      <button class="btn peq" data-exe title="Transformar esta tela num programa .exe">${ic('download', 14)}Gerar .exe</button>
      <button class="ib jt-btn" data-juntos title="Juntos: chat com quem programa com você" aria-label="Chat Juntos">${ic('equipe', 16)}</button>
      <button class="btn peq" data-gif title="Rodar a tela e gravar como GIF">${ic('monitor', 14)}Gravar GIF</button>
      <button class="btn peq verde" data-rodar title="Rodar a tela (F5)">${ic('play', 14)}Rodar tela</button>
      <button class="btn pri peq" data-salvar title="Salvar (Ctrl+S)">${ic('salvar', 14)}Salvar</button>
    </header>
    <div class="ds-corpo">
      <aside class="ds-esq">
        <div class="ds-abas" role="tablist"><button class="ds-aba" data-e="elementos" role="tab">Elementos</button><button class="ds-aba" data-e="camadas" role="tab">Camadas</button></div>
        <div style="flex:1;min-height:0;overflow-y:auto" data-esq></div>
      </aside>
      <main style="flex:1;min-width:0;display:flex;min-height:0">
        <div class="ds-area" data-area>
          <canvas class="ds-regua h" data-rh aria-hidden="true"></canvas>
          <canvas class="ds-regua v" data-rv aria-hidden="true"></canvas>
          <div class="ds-canto" aria-hidden="true"></div>
          <div class="ds-vp" data-vp>
            <div class="ds-mundo" data-mundo></div>
            <div class="ds-over" data-over></div>
          </div>
          <div class="ds-ferr" data-ferr role="toolbar" aria-label="Ferramentas"></div>
          <div class="ds-dica" data-dica></div>
          <div class="flutua ds-zoom">
            <button class="ib" data-zm title="Menos zoom (Ctrl+-)" aria-label="Menos zoom">${ic('menos', 15)}</button>
            <button class="ds-zv" data-zv title="Opções de zoom"></button>
            <button class="ib" data-zp title="Mais zoom (Ctrl+=)" aria-label="Mais zoom">${ic('mais', 15)}</button>
            <span class="ds-sep"></span>
            <button class="ib" data-tg title="Grade (Ctrl+')" aria-label="Grade">${ic('grade', 15)}</button>
            <button class="ib" data-te title="Encaixe inteligente" aria-label="Encaixe inteligente">${ic('ima', 15)}</button>
            <button class="ib" data-tr title="Réguas (Shift+R)" aria-label="Réguas">${ic('regua', 15)}</button>
            <button class="ib" data-tema title="Tema claro/escuro da janela" aria-label="Trocar tema">${ic('lua', 15)}</button>
            <span class="ds-sep"></span>
            <button class="ib" data-anim title="Ver as animações de abertura" aria-label="Ver animações">${ic('play', 15)}</button>
            <button class="ib" data-cel title="Prévia no celular" aria-label="Prévia no celular">${ic('celular', 15)}</button>
            <span class="ds-sep"></span>
            <button class="ib" data-ajuda title="Atalhos (?)" aria-label="Atalhos do teclado">${ic('teclado', 15)}</button>
          </div>
        </div>
        <div class="fn-wrap" data-funcoes style="display:none"></div>
        <div data-codigo style="flex:1;min-width:0;display:none;flex-direction:column;border-left:1px solid var(--bd)">
          <div class="flex" style="height:38px;padding:0 10px;background:var(--bar);border-bottom:1px solid var(--bd)"><div class="seg" data-arqs style="flex-wrap:nowrap"><button data-a="ui" class="on" style="white-space:nowrap">Gerado</button><button data-a="usr" style="white-space:nowrap">Seu arquivo</button></div><span class="dim ellipsis grow" style="font-size:12px;text-align:right" data-cod-info></span></div>
          <div data-mon style="flex:1;min-height:0"></div>
        </div>
      </main>
      <aside class="ds-dir">
        <div class="ds-abas" role="tablist"><button class="ds-aba" data-d="props" role="tab">Propriedades</button><button class="ds-aba" data-d="ia" role="tab">IA</button></div>
        <div style="flex:1;min-height:0;overflow-y:auto" data-props></div>
        <div style="flex:1;min-height:0;display:none" data-ia></div>
      </aside>
    </div>
    <div data-saida style="display:none;height:170px;flex:none;border-top:1px solid var(--bd);background:var(--bar);flex-direction:column">
      <div class="flex" style="height:30px;padding:0 10px"><span class="secao-t grow" data-saida-tit>Saída</span><button class="ib peq" data-fsaida aria-label="Fechar saída">${ic('x', 14)}</button></div>
      <div class="saida" data-saida-txt style="flex:1;overflow:auto;padding:0 14px 8px"></div>
    </div>
    <footer class="status"><span style="background:var(--pri);color:#fff">${ic('logo', 13)}</span><span data-st1></span><span data-st3 class="mono" style="color:var(--mut)"></span><span class="grow"></span><span data-st2></span></footer>
    <input type="file" accept="image/png,image/jpeg,image/gif,image/bmp,image/webp" data-arqimg hidden>
  </div>`);
  app.appendChild(ui);
  S.ui = ui;
  const $ = (s) => ui.querySelector(s);
  const vp = $('[data-vp]'), mundo = $('[data-mundo]'), over = $('[data-over]'), area = $('[data-area]');
  const rh = $('[data-rh]'), rv = $('[data-rv]');

  // ====================================================================== dados
  const els = () => S.D.elementos;
  const porId = (id) => S.D.elementos.find((e) => e.id === id);
  const selecionados = () => S.sel.map(porId).filter(Boolean);
  const caixaSel = () => caixaDe(selecionados());
  const idsDoGrupo = (id) => { const e = porId(id); return !e || !e.grupo ? [id] : els().filter((o) => o.grupo === e.grupo).map((o) => o.id); };
  const proximoId = () => 'e' + (Math.max(0, ...els().map((e) => +e.id.slice(1) || 0)) + 1);
  const proximoGrupo = () => 'g' + (Math.max(0, ...els().map((e) => +(e.grupo || 'g0').slice(1) || 0)) + 1);
  function nomeLivre(base, exato) {
    const usados = new Set(els().map((e) => e.nome));
    if (exato && nomeOk(base) && !usados.has(base)) return base;
    let i = 1;
    while (usados.has(`${base}_${i}`) || !nomeOk(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }
  function novoElemento(tipo, x, y, w, h, extra = {}, nomeBase) {
    const e = Object.assign(criarBase(tipo, x, y, w, h), extra);
    e.id = proximoId();
    e.nome = nomeLivre(nomeBase || TIPOS[tipo].prefixo, !!nomeBase);
    if (tipo === 'botao' && !extra.aoClicar) e.aoClicar = metodoSugerido(e, 'aoClicar');
    for (const [campo] of EVENTOS[tipo] || []) if (e[campo] && !nomeOk(e[campo])) e[campo] = '';
    return e;
  }

  // ====================================================================== telas
  async function carregarTelas() {
    try { S.telas = (await api('designer/listar?' + q({ raiz: S.raiz }))).telas || []; } catch (e) { toast(e.message, 'err'); S.telas = []; }
    atualizarProjeto();
  }
  /** Conta para o editor de Funções quais telas existem (a atual com as mudanças ainda não salvas). */
  function atualizarProjeto(atual) {
    const D = atual || (S && S.D);
    const telas = S.telas.map((t) => (D && t.nome === D.nome ? D : t.design)).filter(Boolean);
    if (D && !telas.includes(D)) telas.push(D);
    definirProjeto(telas);
  }
  await carregarTelas();
  let alvo = params.tela && S.telas.find((t) => t.nome === params.tela);
  if (!alvo && S.telas.length) alvo = S.telas[0];

  function carregarDesign(d, salvo) {
    const antigo = d && !Array.isArray(d.elementos) && Array.isArray(d.widgets);
    atualizarProjeto(d);
    S.D = normalizar(d);
    atualizarProjeto();
    if (S.modo === 'funcoes') fnEd.reiniciar();
    S.sel = [];
    S.hist = [JSON.stringify(S.D)];
    S.histI = 0;
    S.salvo = salvo && !antigo ? S.hist[0] : '';
    S.sujo = !S.salvo;
    pintarSelectTelas();
    pintarTudo();
    requestAnimationFrame(ajustarTela);
    if (antigo) toast('Esta tela era do Designer antigo e foi convertida para o novo formato. Salve para guardar.', 'info', 7000);
  }

  function pintarSelectTelas() {
    const s = $('[data-telas]');
    const nomes = S.telas.map((t) => t.nome);
    if (!nomes.includes(S.D.nome)) nomes.push(S.D.nome);
    s.innerHTML = nomes.map((n) => `<option value="${esc(n)}" ${n === S.D.nome ? 'selected' : ''}>${esc(n)}${n === S.D.nome && S.sujo ? ' ●' : ''}</option>`).join('');
  }
  $('[data-telas]').onchange = async (e) => {
    const nome = e.target.value;
    if (S.sujo && !(await confirmar('Trocar de tela', 'A tela atual tem mudanças não salvas. Trocar mesmo assim?', 'Trocar', true))) { pintarSelectTelas(); return; }
    const t = S.telas.find((x) => x.nome === nome);
    S.trilha = [];
    if (t) carregarDesign(t.design, true);
  };
  $('[data-planilha]').onclick = async () => {
    if (S.sujo && !(await confirmar('Planilha vira app', 'A tela atual tem mudanças não salvas. Salvar antes?', 'Salvar e continuar'))) return;
    if (S.sujo && !(await salvar())) return;
    const usados = new Set([...S.telas.map((t) => t.nome), S.D.nome]);
    dialogoPlanilha({
      nomesUsados: usados,
      criar: async ({ nome, titulo, dados, editaveis, origem }) => {
        // não pisar num arquivo .py que já exista com esse nome
        const existe = await api('fs/ler?' + q({ caminho: juntar(S.raiz, nome + '.py') })).then(() => true, () => false);
        if (existe) { toast(`Já existe um ${nome}.py no projeto. Escolha outro nome.`, 'err'); return false; }
        const r = montarApp({ nome, titulo, colunas: dados.colunas, linhas: dados.linhas, editaveis, toolkit: S.toolkit, tema: S.D.tema, cor: S.D.cor, origem });
        const D2 = normalizar(r.design);
        const g = S.toolkit === 'tkinter' ? gerarTk(D2) : gerarQt(D2);
        try {
          await api('fs/escrever', { caminho: juntar(juntar(S.raiz, 'dados'), nome + '.csv'), conteudo: r.csv });
          await api('designer/salvar', { raiz: S.raiz, nome, design: D2, arquivoUI: `ui/${nome}_ui.py`, codigoUI: g.ui, arquivoUsuario: `${nome}.py`, codigoUsuario: r.codigo });
        } catch (e) { toast(e.message, 'err'); return false; }
        S.telas = (await api('designer/listar?' + q({ raiz: S.raiz })).catch(() => ({ telas: [] }))).telas || [];
        S.trilha = [];
        const t = S.telas.find((x) => x.nome === nome);
        carregarDesign(t ? t.design : D2, true);
        toast(`Pronto! A tela “${nome}” usa dados/${nome}.csv. Clique em Rodar tela para testar.`, 'ok', 6000);
        return true;
      },
    });
  };
  $('[data-nova]').onclick = async () => {
    const nome = await perguntar('Nova tela', 'Nome da tela (letras minúsculas, números e _)', 'configuracoes', 'Vira o arquivo ui/<nome>_ui.py e o seu <nome>.py.');
    if (!nome) return;
    if (!nomeOk(nome)) { toast('Use só letras minúsculas, números e _ (sem acento, sem começar com número).', 'err'); return; }
    if (S.telas.some((t) => t.nome === nome)) { toast('Já existe uma tela com esse nome.', 'err'); return; }
    if (S.sujo && !(await confirmar('Nova tela', 'A tela atual tem mudanças não salvas. Continuar?', 'Continuar', true))) return;
    const d = novoDesign(nome);
    d.titulo = nome.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    d.tema = cfg('designer.temaPadrao', 'claro');
    S.trilha = [];
    carregarDesign(d, false);
  };

  // ====================================================================== telinhas (editor de Funções)
  /** Entra na tela 'nome' (para ligar os botões dela). Salva a atual antes. */
  async function entrarTela(nome, voltando = false) {
    if (!S || nome === S.D.nome) return;
    const t = S.telas.find((x) => x.nome === nome);
    if (!t) { toast(`Não achei a tela “${nome}”. Salve-a primeiro.`, 'err'); return; }
    if (S.sujo) {
      if (!(await salvar(true))) return;
      toast(`Salvei a tela “${S.D.nome}”.`, 'ok', 1800);
    }
    const t2 = S.telas.find((x) => x.nome === nome);
    if (voltando) S.trilha.pop(); else S.trilha.push(S.D.nome);
    carregarDesign(t2.design, true);
    irModo('funcoes');
  }
  function voltarTela() { if (S.trilha.length) entrarTela(S.trilha[S.trilha.length - 1], true); }

  /** Cria uma telinha nova (pequena, com um título e um botão Fechar já ligado) e salva. */
  async function criarTelinha() {
    let sugestao = 'telinha', i = 2;
    while (S.telas.some((t) => t.nome === sugestao) || sugestao === S.D.nome) sugestao = `telinha${i++}`;
    const nome = await perguntar('Nova telinha', 'Nome da telinha (letras minúsculas, números e _)', sugestao, 'Ex.: configuracoes, sobre, perfil. Vira o arquivo ui/<nome>_ui.py e o seu <nome>.py.');
    if (!nome) return null;
    if (!nomeOk(nome)) { toast('Use só letras minúsculas, números e _ (sem acento, sem começar com número). Algumas palavras do Python não podem.', 'err'); return null; }
    if (S.telas.some((t) => t.nome === nome) || nome === S.D.nome) { toast('Já existe uma tela com esse nome.', 'err'); return null; }
    const titulo = nome.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    const d = { versao: 2, nome, titulo, largura: 380, altura: 240, tema: S.D.tema, cor: S.D.cor, fundo: '', redimensionavel: false, guias: { v: [], h: [] }, elementos: [] };
    const add = (tipo, id, nomeEl, x, y, w, h, extra) => d.elementos.push(Object.assign(criarBase(tipo, x, y, w, h), { id, nome: nomeEl }, extra));
    add('texto', 'e1', 'titulo', 24, 24, 332, 32, { texto: titulo, tamanho: 22, negrito: true, rh: 'esqdir' });
    add('texto', 'e2', 'mensagem', 24, 64, 332, 80, { texto: 'Esta é uma telinha nova. Mude ela na aba Design.', rh: 'esqdir' });
    add('botao', 'e3', 'botao_fechar', 236, 180, 120, 38, { texto: 'Fechar', rh: 'dir', rv: 'base' });
    d.logica = { vars: [], nos: [{ id: 'f1', fn: 'fechar', x: 330, y: 150, valores: {} }], fios: [{ de: 'e3:aoClicar', para: 'f1:entrada' }], pos: {} };
    atualizarProjeto();
    definirProjeto([...S.telas.map((t) => (t.nome === S.D.nome ? S.D : t.design)), ...(S.telas.some((t) => t.nome === S.D.nome) ? [] : [S.D]), d]);
    const D2 = normalizar(d);
    const g = S.toolkit === 'tkinter' ? gerarTk(D2) : gerarQt(D2);
    try {
      await api('designer/salvar', { raiz: S.raiz, nome, design: D2, arquivoUI: `ui/${nome}_ui.py`, codigoUI: g.ui, arquivoUsuario: `${nome}.py`, codigoUsuario: g.usuario });
    } catch (e) { toast(e.message, 'err'); atualizarProjeto(); return null; }
    const atual = S.D;
    S.telas = (await api('designer/listar?' + q({ raiz: S.raiz })).catch(() => ({ telas: [] }))).telas || [];
    atualizarProjeto(atual);
    toast(`Telinha “${nome}” criada. Clique na miniatura para ligar os botões dela.`, 'ok', 4500);
    return nome;
  }

  // ====================================================================== histórico
  function mudou() {
    atualizarProjeto();
    S.D.logica = normalizarLogica(S.D.logica, S.D);
    const j = JSON.stringify(S.D);
    if (j === S.hist[S.histI]) { pintarTudo(); return; }
    S.hist = S.hist.slice(0, S.histI + 1);
    S.hist.push(j);
    if (S.hist.length > 200) S.hist.shift();
    S.histI = S.hist.length - 1;
    S.sujo = j !== S.salvo;
    pintarSelectTelas();
    pintarTudo();
    if (S.celular) { clearTimeout(S.celular.timer); S.celular.timer = setTimeout(() => publicarCelular().catch(() => {}), 700); }
  }
  function irHist(i) {
    S.histI = i;
    S.D = JSON.parse(S.hist[i]);
    S.sel = S.sel.filter((id) => porId(id));
    S.sujo = S.hist[i] !== S.salvo;
    pintarSelectTelas();
    pintarTudo();
  }
  const desfazer = () => { if (S.histI > 0) irHist(S.histI - 1); };
  const refazer = () => { if (S.histI < S.hist.length - 1) irHist(S.histI + 1); };

  // ====================================================================== câmera
  const ponto = (ev) => { const r = vp.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const s2w = (p) => ({ x: (p.x - S.cam.x) / S.cam.z, y: (p.y - S.cam.y) / S.cam.z });
  const w2s = (x, y) => ({ x: x * S.cam.z + S.cam.x, y: y * S.cam.z + S.cam.y });

  function aplicarCamera() {
    mundo.style.transform = `translate(${S.cam.x}px, ${S.cam.y}px) scale(${S.cam.z})`;
    mundo.style.setProperty('--z', S.cam.z);
    const cli = mundo.querySelector('.ds-cli');
    if (cli) cli.classList.toggle('com-grade', S.grade && S.gradeTam * S.cam.z >= 5);
    $('[data-zv]').textContent = Math.round(S.cam.z * 100) + '%';
    pintarOverlay();
    pintarReguas();
    if (S.editando) posicionarEdicao();
  }
  function zoomEm(z, sx, sy) {
    z = lim(z, 0.1, 8);
    const wx = (sx - S.cam.x) / S.cam.z, wy = (sy - S.cam.y) / S.cam.z;
    S.cam.z = z;
    S.cam.x = sx - wx * z;
    S.cam.y = sy - wy * z;
    aplicarCamera();
  }
  function zoomCentro(f) { const r = vp.getBoundingClientRect(); zoomEm(S.cam.z * f, r.width / 2, r.height / 2); }
  function enquadrar(b, max = 1) {
    const r = vp.getBoundingClientRect();
    if (!r.width || !r.height || !b) return;
    const pad = 70;
    const z = lim(Math.min((r.width - pad * 2) / Math.max(1, b.w), (r.height - pad * 2) / Math.max(1, b.h)), 0.1, max);
    S.cam.z = z;
    S.cam.x = (r.width - b.w * z) / 2 - b.x * z;
    S.cam.y = (r.height - b.h * z) / 2 - b.y * z;
    aplicarCamera();
  }
  function ajustarTela() {
    let b = { x: 0, y: -BARRA, w: S.D.largura, h: S.D.altura + BARRA };
    const v = els().filter((e) => e.visivel);
    if (v.length) { const c = caixaDe(v); const x1 = Math.min(b.x, c.x), y1 = Math.min(b.y, c.y); b = { x: x1, y: y1, w: Math.max(b.x + b.w, c.x + c.w) - x1, h: Math.max(b.y + b.h, c.y + c.h) - y1 }; }
    enquadrar(b, 1);
  }
  const zoomSelecao = () => { const b = caixaSel(); if (b) enquadrar(b, 4); };

  function menuZoom() {
    const r = $('[data-zv]').getBoundingClientRect();
    menuContexto(r.left, r.top - 250, [
      { texto: 'Ajustar à tela', kbd: 'Shift+1', acao: ajustarTela },
      { texto: 'Zoom na seleção', kbd: 'Shift+2', acao: zoomSelecao },
      '-',
      ...[50, 100, 150, 200, 400].map((p) => ({ texto: p + '%', kbd: p === 100 ? 'Ctrl+0' : '', acao: () => zoomCentro(p / 100 / S.cam.z) })),
    ]);
  }

  // ====================================================================== réguas
  function pintarReguas() {
    area.classList.toggle('sem-reguas', !S.reguas);
    if (!S.reguas || S.modo === 'codigo') return;
    const dpr = window.devicePixelRatio || 1;
    const b = caixaSel();
    for (const [cv, horiz] of [[rh, true], [rv, false]]) {
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#121419';
      g.fillRect(0, 0, r.width, r.height);
      const z = S.cam.z;
      const off = horiz ? S.cam.x : S.cam.y;
      const comp = horiz ? r.width : r.height;
      const larg = horiz ? r.height : r.width;
      // a régua começa depois do canto: compensa
      const base = 0;
      const pos = (v) => v * z + off + base;
      // faixa da janela e da seleção
      g.fillStyle = 'rgba(255,255,255,0.04)';
      const j1 = pos(0), j2 = pos(horiz ? S.D.largura : S.D.altura);
      if (horiz) g.fillRect(j1, 0, j2 - j1, larg); else g.fillRect(0, j1, larg, j2 - j1);
      if (b) {
        const a1 = pos(horiz ? b.x : b.y), a2 = pos(horiz ? b.x + b.w : b.y + b.h);
        g.fillStyle = 'rgba(91,140,255,0.28)';
        if (horiz) g.fillRect(a1, 0, a2 - a1, larg); else g.fillRect(0, a1, larg, a2 - a1);
      }
      const passos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
      const passo = passos.find((p) => p * z >= 56) || 10000;
      const sub = passo >= 10 ? passo / 10 : passo / 2;
      g.strokeStyle = '#3A3F4B';
      g.fillStyle = '#7D8494';
      g.font = '10px Inter, "Segoe UI", sans-serif';
      g.lineWidth = 1;
      const ini = Math.floor((-off) / z / sub) * sub;
      g.beginPath();
      for (let v = ini; pos(v) < comp; v += sub) {
        const p = Math.round(pos(v)) + 0.5;
        if (p < base) continue;
        const maior = Math.abs(v / passo - Math.round(v / passo)) < 1e-6;
        const t = maior ? larg : (Math.abs((v * 2) / passo - Math.round((v * 2) / passo)) < 1e-6 ? larg * 0.45 : larg * 0.25);
        if (horiz) { g.moveTo(p, larg); g.lineTo(p, larg - t); } else { g.moveTo(larg, p); g.lineTo(larg - t, p); }
      }
      g.stroke();
      for (let v = Math.floor((-off) / z / passo) * passo; pos(v) < comp; v += passo) {
        const p = Math.round(pos(v));
        if (p < base) continue;
        const txt = String(Math.round(v));
        if (horiz) g.fillText(txt, p + 3, 10);
        else { g.save(); g.translate(10, p - 3); g.rotate(-Math.PI / 2); g.fillText(txt, 0, 0); g.restore(); }
      }
      if (S.cursor) {
        const p = Math.round(pos(horiz ? S.cursor.x : S.cursor.y)) + 0.5;
        g.strokeStyle = '#F2C14E';
        g.beginPath();
        if (horiz) { g.moveTo(p, 0); g.lineTo(p, larg); } else { g.moveTo(0, p); g.lineTo(larg, p); }
        g.stroke();
      }
      g.strokeStyle = '#262A33';
      g.beginPath();
      if (horiz) { g.moveTo(0, larg - 0.5); g.lineTo(comp, larg - 0.5); } else { g.moveTo(larg - 0.5, 0); g.lineTo(larg - 0.5, comp); }
      g.stroke();
    }
  }

  // ====================================================================== desenho dos elementos
  const fam = (e) => `${e.fonte ? `'${e.fonte}', ` : ''}'Segoe UI', Inter, sans-serif`;
  const fonteCss = (e) => `font-family:${fam(e)};font-size:${e.tamanho}px;font-weight:${e.negrito ? 700 : 400};font-style:${e.italico ? 'italic' : 'normal'};`;
  const bordaCss = (e) => { const b = cor(e, 'borda', S.D); return b ? `border:${e.bordaLargura || 1}px solid ${b};` : 'border:0;'; };
  const sep = S.raiz.includes('\\') ? '\\' : '/';
  const urlImagem = (arq) => '/api/fs/bruto?' + q({ caminho: juntar(S.raiz, arq.split('/').join(sep)), t: TOKEN, v: S.versaoImg });

  function htmlElemento(e) {
    const D = S.D;
    const t = CORES_TEMA[D.tema];
    const tx = cor(e, 'corTexto', D);
    switch (e.tipo) {
      case 'texto': {
        const jh = { esquerda: 'flex-start', centro: 'center', direita: 'flex-end' }[e.alinhar];
        const jv = { topo: 'flex-start', meio: 'center', base: 'flex-end' }[e.alinharV];
        return `<div class="de-in" style="display:flex;justify-content:${jh};align-items:${jv};text-align:${{ esquerda: 'left', centro: 'center', direita: 'right' }[e.alinhar]};${fonteCss(e)}color:${tx};background:${e.fundo || 'transparent'};border-radius:${e.raio || 0}px;white-space:${e.quebra ? 'pre-wrap' : 'pre'};line-height:1.25;overflow:hidden"><span>${esc(e.texto) || '&nbsp;'}</span></div>`;
      }
      case 'botao':
        return `<div class="de-in" style="display:flex;align-items:center;justify-content:center;padding:0 12px;background:${cor(e, 'fundo', D)};color:${tx};${bordaCss(e)}border-radius:${e.raio}px;${fonteCss(e)}white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.texto)}</div>`;
      case 'campo': {
        const conteudo = e.texto ? (e.senha ? '•'.repeat(Math.min(12, e.texto.length)) : esc(e.texto)) : `<span style="color:${t.mut}">${esc(e.placeholder)}</span>`;
        return `<div class="de-in" style="display:flex;align-items:center;padding:0 10px;background:${cor(e, 'fundo', D)};color:${tx};${bordaCss(e)}border-radius:${e.raio}px;${fonteCss(e)}white-space:nowrap;overflow:hidden">${conteudo}</div>`;
      }
      case 'area':
        return `<div class="de-in" style="padding:6px 9px;background:${cor(e, 'fundo', D)};color:${e.texto ? tx : t.mut};${bordaCss(e)}border-radius:${e.raio}px;${fonteCss(e)}white-space:pre-wrap;overflow:hidden">${esc(e.texto || e.placeholder)}</div>`;
      case 'numero':
        return `<div class="de-in" style="display:flex;align-items:center;background:${cor(e, 'fundo', D)};color:${tx};${bordaCss(e)}border-radius:${e.raio}px;${fonteCss(e)}overflow:hidden"><span style="flex:1;padding:0 9px">${e.valor}</span><span style="display:flex;flex-direction:column;justify-content:center;width:20px;height:100%;border-left:1px solid ${t.bd};color:${t.mut}">${ic('cima', 10)}${ic('abaixo', 10)}</span></div>`;
      case 'caixa':
      case 'opcao': {
        const marca = e.tipo === 'caixa'
          ? `<span style="width:16px;height:16px;flex:none;border-radius:4px;border:1.5px solid ${e.marcado ? D.cor : t.mut};background:${e.marcado ? D.cor : 'transparent'};display:inline-flex;align-items:center;justify-content:center;color:#fff">${e.marcado ? ic('check', 12) : ''}</span>`
          : `<span style="width:16px;height:16px;flex:none;border-radius:50%;border:1.5px solid ${e.marcado ? D.cor : t.mut};display:inline-flex;align-items:center;justify-content:center">${e.marcado ? `<span style="width:8px;height:8px;border-radius:50%;background:${D.cor}"></span>` : ''}</span>`;
        return `<div class="de-in" style="display:flex;align-items:center;gap:8px;color:${tx};font-family:${fam(e)};font-size:${e.tamanho}px;white-space:nowrap;overflow:hidden">${marca}<span>${esc(e.texto)}</span></div>`;
      }
      case 'combo':
        return `<div class="de-in" style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 10px;background:${cor(e, 'fundo', D)};color:${tx};${bordaCss(e)}border-radius:${e.raio}px;${fonteCss(e)}white-space:nowrap;overflow:hidden"><span>${esc((e.itens || '').split('\n')[0] || '')}</span>${ic('abaixo', 14)}</div>`;
      case 'slider': {
        const p = lim(Math.round(((e.valor - e.minimo) / Math.max(1, e.maximo - e.minimo)) * 100), 0, 100);
        const c = cor(e, 'cor', D);
        return `<div class="de-in" style="display:flex;align-items:center;position:relative"><div style="height:6px;width:100%;border-radius:3px;background:${t.trilho}"><div style="height:6px;width:${p}%;border-radius:3px;background:${c}"></div></div><span style="position:absolute;left:calc(${p}% - 8px);width:16px;height:16px;border-radius:50%;background:${c}"></span></div>`;
      }
      case 'progresso':
        return `<div class="de-in" style="background:${t.trilho};border-radius:${e.raio}px;overflow:hidden"><div style="height:100%;width:${lim(e.valor, 0, 100)}%;background:${cor(e, 'cor', D)};border-radius:${e.raio}px"></div></div>`;
      case 'lista':
        return `<div class="de-in" style="padding:4px;background:${cor(e, 'fundo', D)};color:${tx};${bordaCss(e)}border-radius:${e.raio}px;${fonteCss(e)}overflow:hidden">${(e.itens || '').split('\n').filter(Boolean).map((x, i) => `<div style="padding:6px 8px;border-radius:4px;white-space:nowrap;${i === 0 ? `background:${D.cor};color:#fff;` : ''}">${esc(x)}</div>`).join('')}</div>`;
      case 'tabela': {
        const cols = String(e.colunas || '').split(',').map((x) => x.trim()).filter(Boolean);
        const linhas = String(e.linhas || '').split('\n').filter((x) => x.trim()).map((l) => l.split(',').map((x) => x.trim()));
        const grade = `display:grid;grid-template-columns:repeat(${Math.max(1, cols.length)},minmax(0,1fr))`;
        return `<div class="de-in" style="background:${cor(e, 'fundo', D)};color:${tx};${bordaCss(e)}font-family:${fam(e)};font-size:${e.tamanho}px;overflow:hidden">
          <div style="${grade};background:${t.barra};font-weight:600;border-bottom:1px solid ${t.bd}">${cols.map((c) => `<div style="padding:6px 8px;white-space:nowrap;overflow:hidden">${esc(c)}</div>`).join('')}</div>
          ${linhas.map((l) => `<div style="${grade};border-bottom:1px solid ${t.bd}">${cols.map((_, j) => `<div style="padding:5px 8px;white-space:nowrap;overflow:hidden">${esc(l[j] || '')}</div>`).join('')}</div>`).join('')}</div>`;
      }
      case 'imagem':
        if (e.arquivo) return `<img class="de-in" src="${esc(urlImagem(e.arquivo))}" alt="" draggable="false" style="object-fit:${{ conter: 'contain', cobrir: 'cover', esticar: 'fill' }[e.ajuste] || 'contain'}">`;
        return `<div class="de-in de-img-vazia" style="background:${t.sup};border:1px dashed ${t.bd};color:${t.mut}">${ic('imagem', 22)}<span>2 cliques para escolher</span></div>`;
      case 'retangulo':
        return `<div class="de-in" style="background:${cor(e, 'fundo', D)};${bordaCss(e)}border-radius:${e.raio}px;${e.sombra ? 'box-shadow:0 6px 28px rgba(0,0,0,.2);' : ''}"></div>`;
      case 'elipse':
        return `<div class="de-in" style="background:${cor(e, 'fundo', D)};${bordaCss(e)}border-radius:${Math.floor(Math.min(e.w, e.h) / 2)}px;${e.sombra ? 'box-shadow:0 6px 28px rgba(0,0,0,.2);' : ''}"></div>`;
      case 'linha':
        return `<div class="de-in" style="background:${cor(e, 'cor', D)}"></div>`;
    }
    return '';
  }

  function estiloCaixa(e) { return `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`; }
  function foraDaJanela(e) { return e.x + e.w <= 0 || e.y + e.h <= 0 || e.x >= S.D.largura || e.y >= S.D.altura; }

  function pintarMundo() {
    const D = S.D;
    const t = CORES_TEMA[D.tema];
    const partes = [`<div class="ds-jan" style="width:${D.largura}px;height:${D.altura + BARRA}px;top:${-BARRA}px">
      <div class="ds-barra" data-barra style="background:${t.barra};border-bottom:1px solid ${t.bd};color:${t.mut}"><span style="width:14px;height:14px;border-radius:4px;background:${D.cor};flex:none"></span><span class="grow ellipsis">${esc(D.titulo)}</span><span class="ds-bt">—</span><span class="ds-bt">☐</span><span class="ds-bt">✕</span></div>
      <div class="ds-cli" style="height:${D.altura}px;background:${fundoJanela(D)};--g:${S.gradeTam}px;--gc:${D.tema === 'escuro' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)'}">${D.rolagem ? `<div class="ds-dobra" style="top:${D.alturaVisivel}px"><span>${ic('abaixo', 12)}Até aqui aparece sem rolar · o resto a pessoa desce para ver</span></div><div class="ds-rol" style="height:${D.altura}px"><div style="height:${Math.round(100 * D.alturaVisivel / D.altura)}%"></div></div>` : ''}</div></div>`, '<div class="ds-els">'];
    for (const e of D.elementos) {
      if (!e.visivel) continue;
      const cls = ['de', 'de-' + e.tipo];
      if (e.bloqueado) cls.push('bloq');
      if (!e.habilitado) cls.push('desab');
      if (foraDaJanela(e)) cls.push('fora');
      partes.push(`<div class="${cls.join(' ')}" data-id="${e.id}" style="${estiloCaixa(e)}">${htmlElemento(e)}</div>`);
    }
    partes.push('</div>');
    mundo.innerHTML = partes.join('');
    aplicarCamera();
  }
  function tocarAnimacao(e, efeito, ms, atraso) {
    const d = mundo.querySelector(`.de[data-id="${e.id}"] .de-in`);
    return tocarNoNavegador(d, efeito || e.animacao || 'pulsar', ms ?? e.animMs, atraso ?? 0);
  }
  function tocarTodas() {
    const com = S.D.elementos.filter((e) => e.animacao && e.visivel);
    if (!com.length) { toast('Nenhum elemento tem animação. Escolha um elemento e use a seção Animação.', 'info'); return; }
    for (const e of com) tocarAnimacao(e, e.animacao, e.animMs, e.animAtraso);
  }
  // ====================================================================== prévia no celular
  const APARELHOS = [['360x640', 'Android pequeno (360 × 640)'], ['390x844', 'iPhone (390 × 844)'], ['412x915', 'Android grande (412 × 915)'], ['768x1024', 'Tablet (768 × 1024)']];

  /** A tela como uma página HTML sozinha (para o iframe e para o celular de verdade). */
  async function htmlTelaSozinha(W, H, embutir) {
    const D = S.D;
    const fundo = fundoJanela(D);
    const partes = [];
    const Hc = D.rolagem ? Math.max(H, Math.round(D.altura * W / D.largura)) : H; // com rolagem a página é mais alta que a tela
    for (const e of D.elementos) {
      if (!e.visivel) continue;
      const r = reposicionar(e, D.largura, D.altura, W, Hc);
      partes.push(`<div class="de" data-anim="${e.animacao || ''}" data-ms="${e.animMs || 400}" data-at="${e.animAtraso || 0}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px">${htmlElemento({ ...e, ...r })}</div>`);
    }
    let corpo = partes.join('');
    if (embutir) {
      const urls = [...new Set([...corpo.matchAll(/src="(\/api\/fs\/bruto\?[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))];
      for (const u of urls) {
        try {
          const b = await (await fetch(u)).blob();
          const dado = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
          corpo = corpo.split(esc(u)).join(dado).split(u).join(dado);
        } catch { /* fica sem a imagem */ }
      }
    }
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(D.titulo)}</title>
<meta name="theme-color" content="${fundo}"><style>
html,body{margin:0;background:${fundo};-webkit-text-size-adjust:100%}
#tela{position:relative;width:${W}px;height:${Hc}px;transform-origin:0 0;background:${fundo};overflow:hidden}
.de{position:absolute}.de>.de-in{width:100%;height:100%;box-sizing:border-box}.de>.de-in svg{flex:none}img.de-in{display:block}
.de-img-vazia{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font:12px "Segoe UI",Inter,sans-serif;text-align:center;padding:6px}
.de-img-vazia span{display:none}
svg.i{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
</style></head><body><div id="tela">${corpo}</div><script>
var W=${W},H=${Hc},tela=document.getElementById('tela');
var quadro=${quadroAnim.toString()};
function ajustar(){var s=Math.min(innerWidth/W,4);tela.style.transform='scale('+s+')';document.body.style.height=(H*s)+'px'}
function tocar(){document.querySelectorAll('[data-anim]').forEach(function(d){var ef=d.dataset.anim;if(!ef||!d.animate)return;var q=[];for(var i=0;i<=24;i++){var f=quadro(ef,i/24);q.push({offset:i/24,transform:'translate('+f.dx+'px,'+f.dy+'px) scale('+f.k+')',opacity:f.op})}d.firstElementChild.animate(q,{duration:+d.dataset.ms,delay:+d.dataset.at,fill:'backwards'})})}
addEventListener('resize',ajustar);ajustar();tocar();addEventListener('message',function(m){if(m.data==='tocar')tocar()});
</script></body></html>`;
  }

  async function publicarCelular() {
    if (!S.celular) return null;
    const [W, H] = S.celular.tam;
    return api('celular', { html: await htmlTelaSozinha(W, H, true) });
  }

  function abrirCelular() {
    let [W, H] = (S.celular && S.celular.tam) || [360, 640];
    let deitado = W > H;
    const corpo = el(`<div class="cel-wrap">
      <div class="cel-frame" data-frame><div class="cel-notch"></div><div class="cel-tela" data-tela></div></div>
      <div class="cel-lado">
        <div class="prop"><label class="rotulo" for="cel-ap">Aparelho</label><select id="cel-ap" class="sel campo" data-ap>${APARELHOS.map(([v, r]) => `<option value="${v}">${r}</option>`).join('')}</select></div>
        <div class="seg" data-ori><button data-o="pe">Em pé</button><button data-o="deitado">Deitado</button></div>
        <div class="flex" style="gap:6px;flex-wrap:wrap"><button class="btn peq" data-rep>${ic('play', 13)}Repetir animações</button><button class="btn peq" data-usar title="Muda o tamanho da janela no Designer; os elementos seguem as restrições">${ic('ajustar', 13)}Usar este tamanho</button></div>
        <div class="dim" style="font-size:12px;line-height:1.5">Os elementos se ajustam pelas <b>restrições</b> (painel Propriedades). Se algo sair da tela, mude a restrição dele para “Esquerda e direita (estica)” ou “Escala”.</div>
        <div class="cel-real">
          <div style="font-weight:700;display:flex;gap:6px;align-items:center">${ic('celular', 15)}No seu celular</div>
          <div class="dim" style="font-size:12px;line-height:1.5">O celular precisa estar no <b>mesmo Wi-Fi</b> deste PC. A página se atualiza sozinha enquanto você edita.</div>
          <div data-real></div>
        </div>
      </div></div>`);
    const tela = corpo.querySelector('[data-tela]');
    const frame = corpo.querySelector('[data-frame]');
    const ap = corpo.querySelector('[data-ap]');
    let iframe = null;
    let poll = null;
    async function pintar() {
      const [w, h] = deitado ? [Math.max(W, H), Math.min(W, H)] : [Math.min(W, H), Math.max(W, H)];
      const caixaW = deitado ? 520 : 292, caixaH = deitado ? 292 : 560;
      const s = Math.min(caixaW / w, caixaH / h);
      frame.classList.toggle('deitado', deitado);
      frame.style.width = Math.round(w * s + 24) + 'px';
      frame.style.height = Math.round(h * s + 24) + 'px';
      tela.innerHTML = '';
      iframe = el(`<iframe title="Prévia no celular" style="width:${w}px;height:${h}px;transform:scale(${s});transform-origin:0 0;border:0;background:${fundoJanela(S.D)}"></iframe>`);
      tela.style.width = Math.round(w * s) + 'px';
      tela.style.height = Math.round(h * s) + 'px';
      tela.appendChild(iframe);
      iframe.srcdoc = await htmlTelaSozinha(w, h, false);
      ap.value = APARELHOS.some(([v]) => v === `${Math.min(w, h)}x${Math.max(w, h)}`) ? `${Math.min(w, h)}x${Math.max(w, h)}` : ap.value;
      corpo.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('on', (b.dataset.o === 'deitado') === deitado));
      if (S.celular) { S.celular.tam = [w, h]; publicarCelular().catch(() => {}); }
    }
    function pintarReal(r) {
      const alvo = corpo.querySelector('[data-real]');
      if (!r || !r.ligado) {
        alvo.innerHTML = '';
        const b = el(`<button class="btn pri peq">${ic('celular', 13)}Mostrar no meu celular</button>`);
        b.onclick = async () => {
          b.disabled = true;
          S.celular = { tam: deitado ? [Math.max(W, H), Math.min(W, H)] : [Math.min(W, H), Math.max(W, H)] };
          try { pintarReal(await publicarCelular()); acompanhar(); } catch (e) { S.celular = null; toast(e.message, 'err'); b.disabled = false; }
        };
        alvo.appendChild(b);
        return;
      }
      const url = (r.urls || [])[0];
      if (!url) { alvo.innerHTML = '<div class="warn" style="font-size:12.5px">Este PC não está conectado a nenhuma rede. Conecte no Wi-Fi e tente de novo.</div>'; return; }
      const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
      alvo.innerHTML = `<div class="cel-qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
        <div class="dim" style="font-size:12px">Aponte a câmera do celular para o código, ou digite:</div>
        <div class="mono cel-url" title="Clique para copiar">${esc(url)}</div>
        ${(r.urls || []).length > 1 ? `<details><summary class="dim" style="font-size:12px;cursor:pointer">Não abriu? Outros endereços deste PC</summary>${r.urls.slice(1).map((u) => `<div class="mono" style="font-size:12px">${esc(u)}</div>`).join('')}</details>` : ''}
        <div style="font-size:12.5px" data-status>${r.conectado ? '<span class="ok">● celular conectado</span>' : '<span class="dim">● esperando o celular abrir…</span>'}</div>
        <div class="dim" style="font-size:11.5px">Se o Windows perguntar sobre o firewall, clique em <b>Permitir</b> (rede privada).</div>`;
      alvo.querySelector('.cel-url').onclick = () => { navigator.clipboard?.writeText(url); toast('Endereço copiado.', 'ok', 1500); };
      const parar = el(`<button class="btn peq">${ic('parar', 13)}Parar de mostrar</button>`);
      parar.onclick = async () => { clearInterval(poll); S.celular = null; pintarReal(await api('celular', { parar: true })); };
      alvo.appendChild(parar);
    }
    function acompanhar() {
      clearInterval(poll);
      poll = setInterval(async () => {
        if (!corpo.isConnected) { clearInterval(poll); return; }
        try { const r = await api('celular'); const st = corpo.querySelector('[data-status]'); if (st) st.innerHTML = r.conectado ? '<span class="ok">● celular conectado</span>' : '<span class="dim">● esperando o celular abrir…</span>'; } catch { /* nada */ }
      }, 2000);
    }
    ap.onchange = () => { [W, H] = ap.value.split('x').map(Number); pintar(); };
    corpo.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => { deitado = b.dataset.o === 'deitado'; pintar(); }; });
    corpo.querySelector('[data-rep]').onclick = () => iframe && iframe.contentWindow && iframe.contentWindow.postMessage('tocar', '*');
    corpo.querySelector('[data-usar]').onclick = () => {
      const [w, h] = deitado ? [Math.max(W, H), Math.min(W, H)] : [Math.min(W, H), Math.max(W, H)];
      redimJanela(w, h);
      toast(`A janela agora tem ${w} × ${h}.`, 'ok');
      pintar();
    };
    modal({ titulo: 'Prévia no celular', corpo, largo: true, aoFechar: () => clearInterval(poll) });
    pintar();
    if (S.celular) api('celular').then((r) => { pintarReal(r); if (r.ligado) acompanhar(); }).catch(() => pintarReal(null));
    else pintarReal(null);
  }

  function atualizarDomElemento(e) {
    const d = mundo.querySelector(`.de[data-id="${e.id}"]`);
    if (!d) return;
    d.setAttribute('style', estiloCaixa(e));
    d.classList.toggle('fora', foraDaJanela(e));
  }

  // ====================================================================== overlay (seleção, guias, alças)
  function retTela(x, y, w, h) { const p = w2s(x, y); return { x: p.x, y: p.y, w: w * S.cam.z, h: h * S.cam.z }; }
  const box = (cls, r, extra = '') => `<div class="${cls}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px" ${extra}></div>`;

  function medidas(a, b) {
    // linhas de distância entre a seleção (a) e o alvo (b), no estilo do Figma
    const out = [];
    const cy = lim(a.y + a.h / 2, b.y, b.y + b.h), cx = lim(a.x + a.w / 2, b.x, b.x + b.w);
    const dentro = a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
    if (dentro) {
      out.push({ eixo: 'x', de: b.x, ate: a.x, em: a.y + a.h / 2 }, { eixo: 'x', de: a.x + a.w, ate: b.x + b.w, em: a.y + a.h / 2 });
      out.push({ eixo: 'y', de: b.y, ate: a.y, em: a.x + a.w / 2 }, { eixo: 'y', de: a.y + a.h, ate: b.y + b.h, em: a.x + a.w / 2 });
    } else {
      if (a.x >= b.x + b.w) out.push({ eixo: 'x', de: b.x + b.w, ate: a.x, em: cy });
      else if (b.x >= a.x + a.w) out.push({ eixo: 'x', de: a.x + a.w, ate: b.x, em: cy });
      if (a.y >= b.y + b.h) out.push({ eixo: 'y', de: b.y + b.h, ate: a.y, em: cx });
      else if (b.y >= a.y + a.h) out.push({ eixo: 'y', de: a.y + a.h, ate: b.y, em: cx });
    }
    return out.filter((m) => m.ate - m.de >= 0.5);
  }

  function pintarOverlay() {
    if (!S || !S.D) return;
    const z = S.cam.z;
    const o = [];
    const D = S.D;
    D.guias.v.forEach((gx, i) => { const p = w2s(gx, 0); o.push(`<div class="og og-v" data-guia="v:${i}" style="left:${p.x - 3}px" title="Guia x=${gx} (arraste para a régua para apagar)"></div>`); });
    D.guias.h.forEach((gy, i) => { const p = w2s(0, gy); o.push(`<div class="og og-h" data-guia="h:${i}" style="top:${p.y - 3}px" title="Guia y=${gy} (arraste para a régua para apagar)"></div>`); });
    const sel = selecionados();
    if (!sel.length && S.ferramenta === 'mover') {
      const r = retTela(0, 0, D.largura, D.altura);
      o.push(box('o-jan', r));
      for (const [h, x, y] of [['e', r.x + r.w, r.y + r.h / 2], ['s', r.x + r.w / 2, r.y + r.h], ['se', r.x + r.w, r.y + r.h]]) o.push(`<div class="o-pega o-pega-jan" data-pega-jan="${h}" style="left:${x - 5}px;top:${y - 5}px;cursor:${h === 'e' ? 'ew' : h === 's' ? 'ns' : 'nwse'}-resize"></div>`);
      o.push(`<div class="o-tam" style="left:${r.x + r.w / 2}px;top:${r.y + r.h + 10}px">${D.largura} × ${D.altura}</div>`);
    }
    if (S.hover && !S.sel.includes(S.hover)) {
      const ids = idsDoGrupo(S.hover);
      const he = ids.map(porId).filter(Boolean);
      if (he.length) { const b = caixaDe(he); o.push(box('o-hover', retTela(b.x, b.y, b.w, b.h))); }
    }
    for (const e of sel) o.push(box('o-sel' + (e.bloqueado ? ' bloq' : ''), retTela(e.x, e.y, e.w, e.h)));
    const b = caixaSel();
    if (b && !S.editando) {
      const r = retTela(b.x, b.y, b.w, b.h);
      if (sel.length > 1) o.push(box('o-multi', r));
      if (!sel.some((e) => e.bloqueado)) {
        const pequeno = r.w < 26 || r.h < 26;
        for (const [h, fx, fy] of [['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5], ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5]]) {
          if (pequeno && h.length === 1 && (h === 'n' || h === 's' ? r.w < 26 : r.h < 26)) continue;
          o.push(`<div class="o-pega" data-pega="${h}" style="left:${r.x + r.w * fx - 4.5}px;top:${r.y + r.h * fy - 4.5}px;cursor:${{ n: 'ns', s: 'ns', e: 'ew', w: 'ew', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' }[h]}-resize"></div>`);
        }
      }
      o.push(`<div class="o-tam" style="left:${r.x + r.w / 2}px;top:${r.y + r.h + 10}px">${Math.round(b.w)} × ${Math.round(b.h)}</div>`);
      if (S.alt && !S.arrastando) {
        let alvoB = { x: 0, y: 0, w: D.largura, h: D.altura };
        if (S.hover && !S.sel.includes(S.hover)) { const he = idsDoGrupo(S.hover).map(porId).filter(Boolean); if (he.length) alvoB = caixaDe(he); }
        if (S.hover && !S.sel.includes(S.hover)) o.push(box('o-alvo', retTela(alvoB.x, alvoB.y, alvoB.w, alvoB.h)));
        for (const m of medidas(b, alvoB)) {
          const valor = Math.round(m.ate - m.de);
          if (m.eixo === 'x') { const p1 = w2s(m.de, m.em), p2 = w2s(m.ate, m.em); o.push(`<div class="o-med h" style="left:${p1.x}px;top:${p1.y}px;width:${p2.x - p1.x}px"><span>${valor}</span></div>`); }
          else { const p1 = w2s(m.em, m.de), p2 = w2s(m.em, m.ate); o.push(`<div class="o-med v" style="left:${p1.x}px;top:${p1.y}px;height:${p2.y - p1.y}px"><span>${valor}</span></div>`); }
        }
      }
    }
    for (const l of S.guiasAtivas) {
      if (l.eixo === 'x') { const p1 = w2s(l.v, l.a), p2 = w2s(l.v, l.b); o.push(`<div class="o-enc v" style="left:${p1.x}px;top:${p1.y}px;height:${p2.y - p1.y}px"></div>`); }
      else { const p1 = w2s(l.a, l.v), p2 = w2s(l.b, l.v); o.push(`<div class="o-enc h" style="left:${p1.x}px;top:${p1.y}px;width:${p2.x - p1.x}px"></div>`); }
    }
    if (S.laco) o.push(box('o-laco', retTela(S.laco.x, S.laco.y, S.laco.w, S.laco.h)));
    if (S.previa) { o.push(box('o-previa', retTela(S.previa.x, S.previa.y, S.previa.w, S.previa.h))); o.push(`<div class="o-tam" style="left:${w2s(S.previa.x + S.previa.w / 2, 0).x}px;top:${w2s(0, S.previa.y + S.previa.h).y + 10}px">${Math.round(S.previa.w)} × ${Math.round(S.previa.h)}</div>`); }
    if (S.guiaNova) {
      const g = S.guiaNova;
      if (g.eixo === 'v') o.push(`<div class="og og-v nova" style="left:${w2s(g.v, 0).x - 3}px"><span>${Math.round(g.v)}</span></div>`);
      else o.push(`<div class="og og-h nova" style="top:${w2s(0, g.v).y - 3}px"><span>${Math.round(g.v)}</span></div>`);
    }
    over.innerHTML = o.join('');
    void z;
  }

  // ====================================================================== encaixe inteligente
  function alvosEncaixe(excluir) {
    const W = S.D.largura, H = S.D.altura;
    const ax = [{ v: 0, a: 0, b: H }, { v: W / 2, a: 0, b: H }, { v: W, a: 0, b: H }];
    const ay = [{ v: 0, a: 0, b: W }, { v: H / 2, a: 0, b: W }, { v: H, a: 0, b: W }];
    for (const g of S.D.guias.v) ax.push({ v: g, guia: true });
    for (const g of S.D.guias.h) ay.push({ v: g, guia: true });
    for (const e of els()) {
      if (excluir.has(e.id) || !e.visivel) continue;
      for (const v of [e.x, e.x + e.w / 2, e.x + e.w]) ax.push({ v, a: e.y, b: e.y + e.h });
      for (const v of [e.y, e.y + e.h / 2, e.y + e.h]) ay.push({ v, a: e.x, b: e.x + e.w });
    }
    return { ax, ay };
  }
  function melhor(cands, alvos, limite) {
    let d = null;
    for (const c of cands) for (const t of alvos) { const x = t.v - c; if (Math.abs(x) <= limite && (d === null || Math.abs(x) < Math.abs(d))) d = x; }
    return d;
  }
  /** cx/cy: valores (bordas/centros) da caixa que se move. Devolve a correção e as linhas a desenhar. */
  function encaixar(cx, cy, caixaFinal, excluir, desligado) {
    let dx = 0, dy = 0;
    const linhas = [];
    if (desligado) return { dx, dy, linhas };
    const limite = 6 / S.cam.z;
    if (S.encaixe) {
      const { ax, ay } = alvosEncaixe(excluir);
      const mx = cx.length ? melhor(cx, ax, limite) : null;
      const my = cy.length ? melhor(cy, ay, limite) : null;
      if (mx !== null) dx = mx;
      if (my !== null) dy = my;
      const c = caixaFinal(dx, dy);
      if (mx !== null) for (const t of ax) if (!t.guia && cx.some((v) => Math.abs(t.v - (v + dx)) < 0.5)) linhas.push({ eixo: 'x', v: t.v, a: Math.min(t.a, c.y), b: Math.max(t.b, c.y + c.h) });
      if (my !== null) for (const t of ay) if (!t.guia && cy.some((v) => Math.abs(t.v - (v + dy)) < 0.5)) linhas.push({ eixo: 'y', v: t.v, a: Math.min(t.a, c.x), b: Math.max(t.b, c.x + c.w) });
      if (mx !== null && my !== null) return { dx, dy, linhas };
      if (S.encaixeGrade) {
        const g = S.gradeTam;
        if (mx === null && cx.length) dx = Math.round(cx[0] / g) * g - cx[0];
        if (my === null && cy.length) dy = Math.round(cy[0] / g) * g - cy[0];
      }
    } else if (S.encaixeGrade) {
      const g = S.gradeTam;
      if (cx.length) dx = Math.round(cx[0] / g) * g - cx[0];
      if (cy.length) dy = Math.round(cy[0] / g) * g - cy[0];
    }
    return { dx, dy, linhas };
  }

  // ====================================================================== interação com o mouse
  function arrastar(alvoEl, ev, mover, soltar) {
    const id = ev.pointerId;
    try { alvoEl.setPointerCapture(id); } catch { /* ok */ }
    S.arrastando = true;
    const mv = (e) => { if (e.pointerId === id) mover(e); };
    const up = (e) => {
      if (e.pointerId !== id) return;
      alvoEl.removeEventListener('pointermove', mv);
      alvoEl.removeEventListener('pointerup', up);
      alvoEl.removeEventListener('pointercancel', up);
      try { alvoEl.releasePointerCapture(id); } catch { /* ok */ }
      S.arrastando = false;
      soltar(e);
    };
    alvoEl.addEventListener('pointermove', mv);
    alvoEl.addEventListener('pointerup', up);
    alvoEl.addEventListener('pointercancel', up);
  }

  function iniciarPan(ev) {
    const p0 = ponto(ev);
    const c0 = { ...S.cam };
    vp.classList.add('arrastando-tela');
    arrastar(vp, ev, (e) => { const p = ponto(e); S.cam.x = c0.x + p.x - p0.x; S.cam.y = c0.y + p.y - p0.y; aplicarCamera(); }, () => vp.classList.remove('arrastando-tela'));
  }

  function iniciarMover(ev, duplicar) {
    const p0 = ponto(ev);
    const w0 = s2w(p0);
    let movido = false;
    let orig = new Map(selecionados().filter((e) => !e.bloqueado).map((e) => [e.id, { x: e.x, y: e.y }]));
    let b0 = caixaSel();
    arrastar(vp, ev, (e) => {
      const p = ponto(e);
      if (!movido && Math.hypot(p.x - p0.x, p.y - p0.y) < 3) return;
      if (!movido) {
        movido = true;
        if (duplicar) {
          const copias = duplicarSelecao(0, false);
          orig = new Map(copias.map((c) => [c.id, { x: c.x, y: c.y }]));
          b0 = caixaSel();
          pintarMundo();
        }
      }
      const w = s2w(p);
      let dx = w.x - w0.x, dy = w.y - w0.y;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const nx = b0.x + dx, ny = b0.y + dy;
      const enc = encaixar(e.shiftKey && dy === 0 && dx !== 0 ? [nx, nx + b0.w / 2, nx + b0.w] : e.shiftKey && dx === 0 ? [] : [nx, nx + b0.w / 2, nx + b0.w],
        e.shiftKey && dx !== 0 && dy === 0 ? [] : [ny, ny + b0.h / 2, ny + b0.h],
        (ex, ey) => ({ x: nx + ex, y: ny + ey, w: b0.w, h: b0.h }), new Set(orig.keys()), e.ctrlKey || e.metaKey);
      dx += enc.dx; dy += enc.dy;
      S.guiasAtivas = enc.linhas;
      for (const [id, o] of orig) { const el2 = porId(id); if (!el2) continue; el2.x = Math.round(o.x + dx); el2.y = Math.round(o.y + dy); atualizarDomElemento(el2); }
      pintarOverlay(); pintarReguas(); pintarStatus();
    }, () => {
      S.guiasAtivas = [];
      if (movido) mudou(); else pintarOverlay();
    });
  }

  function iniciarRedim(ev, alca) {
    const sel = selecionados().filter((e) => !e.bloqueado);
    if (!sel.length) return;
    const b0 = caixaDe(sel);
    const orig = new Map(sel.map((e) => [e.id, { x: e.x, y: e.y, w: e.w, h: e.h }]));
    const w0 = s2w(ponto(ev));
    const prop = b0.w / Math.max(1, b0.h);
    let mexeu = false;
    arrastar(vp, ev, (e) => {
      mexeu = true;
      const w = s2w(ponto(e));
      let dx = w.x - w0.x, dy = w.y - w0.y;
      let L = b0.x, T = b0.y, R = b0.x + b0.w, B = b0.y + b0.h;
      if (alca.includes('w')) L += dx;
      if (alca.includes('e')) R += dx;
      if (alca.includes('n')) T += dy;
      if (alca.includes('s')) B += dy;
      // encaixe só nas bordas que se mexem
      const cx = [], cy = [];
      if (alca.includes('w')) cx.push(L); if (alca.includes('e')) cx.push(R);
      if (alca.includes('n')) cy.push(T); if (alca.includes('s')) cy.push(B);
      if (!e.shiftKey && !e.altKey) {
        const enc = encaixar(cx, cy, (ex, ey) => ({ x: L + (alca.includes('w') ? ex : 0), y: T + (alca.includes('n') ? ey : 0), w: R - L, h: B - T }), new Set(orig.keys()), e.ctrlKey || e.metaKey);
        if (alca.includes('w')) L += enc.dx; if (alca.includes('e')) R += enc.dx;
        if (alca.includes('n')) T += enc.dy; if (alca.includes('s')) B += enc.dy;
        S.guiasAtivas = enc.linhas;
      } else S.guiasAtivas = [];
      if (e.altKey) { // pelo centro
        const cxm = b0.x + b0.w / 2, cym = b0.y + b0.h / 2;
        if (alca.includes('w')) R = 2 * cxm - L; if (alca.includes('e')) L = 2 * cxm - R;
        if (alca.includes('n')) B = 2 * cym - T; if (alca.includes('s')) T = 2 * cym - B;
      }
      let nw = Math.max(1, R - L), nh = Math.max(1, B - T);
      if (alca.includes('w') && R - L < 1) L = R - 1;
      if (alca.includes('n') && B - T < 1) T = B - 1;
      if (e.shiftKey) { // manter proporção
        if (alca.length === 2) { if (nw / nh > prop) nh = nw / prop; else nw = nh * prop; }
        else if (alca === 'e' || alca === 'w') nh = nw / prop; else nw = nh * prop;
        if (alca.includes('w')) L = R - nw; else if (alca === 'n' || alca === 's') L = b0.x + (b0.w - nw) / 2;
        if (alca.includes('n')) T = B - nh; else if (alca === 'e' || alca === 'w') T = b0.y + (b0.h - nh) / 2;
        if (e.altKey) { L = b0.x + b0.w / 2 - nw / 2; T = b0.y + b0.h / 2 - nh / 2; }
      }
      const fx = nw / Math.max(1, b0.w), fy = nh / Math.max(1, b0.h);
      for (const [id, o] of orig) {
        const el2 = porId(id);
        el2.x = Math.round(L + (o.x - b0.x) * fx);
        el2.y = Math.round(T + (o.y - b0.y) * fy);
        el2.w = Math.max(1, Math.round(o.w * fx));
        el2.h = Math.max(1, Math.round(o.h * fy));
        atualizarDomElemento(el2);
        if (el2.tipo === 'elipse') { const d = mundo.querySelector(`.de[data-id="${id}"] .de-in`); if (d) d.style.borderRadius = Math.floor(Math.min(el2.w, el2.h) / 2) + 'px'; }
      }
      pintarOverlay(); pintarReguas(); pintarStatus();
    }, () => { S.guiasAtivas = []; if (mexeu) mudou(); else pintarOverlay(); });
  }

  function iniciarRedimJanela(ev, alca) {
    const W0 = S.D.largura, H0 = S.D.altura;
    const orig = new Map(els().map((e) => [e.id, { x: e.x, y: e.y, w: e.w, h: e.h, rh: e.rh, rv: e.rv }]));
    const w0 = s2w(ponto(ev));
    let mexeu = false;
    arrastar(vp, ev, (e) => {
      mexeu = true;
      const w = s2w(ponto(e));
      let W1 = W0, H1 = H0;
      if (alca.includes('e')) W1 = Math.round(lim(W0 + w.x - w0.x, 160, 4000));
      if (alca.includes('s')) H1 = Math.round(lim(H0 + w.y - w0.y, 120, 4000));
      if (S.encaixeGrade) { W1 = Math.round(W1 / S.gradeTam) * S.gradeTam; H1 = Math.round(H1 / S.gradeTam) * S.gradeTam; }
      S.D.largura = W1; S.D.altura = H1;
      const seguir = !(e.ctrlKey || e.metaKey);
      for (const [id, o] of orig) {
        const el2 = porId(id);
        Object.assign(el2, seguir ? reposicionar(o, W0, H0, W1, H1) : { x: o.x, y: o.y, w: o.w, h: o.h });
      }
      pintarMundo(); pintarStatus();
    }, () => { if (mexeu) mudou(); });
  }

  function iniciarLaco(ev, somar) {
    const p0 = ponto(ev);
    const w0 = s2w(p0);
    const antes = somar ? [...S.sel] : [];
    let mexeu = false;
    arrastar(vp, ev, (e) => {
      const p = ponto(e);
      if (!mexeu && Math.hypot(p.x - p0.x, p.y - p0.y) < 3) return;
      mexeu = true;
      const w = s2w(p);
      S.laco = { x: Math.min(w0.x, w.x), y: Math.min(w0.y, w.y), w: Math.abs(w.x - w0.x), h: Math.abs(w.y - w0.y) };
      const L = S.laco;
      const ids = new Set(antes);
      for (const el2 of els()) {
        if (!el2.visivel || el2.bloqueado) continue;
        if (el2.x < L.x + L.w && el2.x + el2.w > L.x && el2.y < L.y + L.h && el2.y + el2.h > L.y) for (const id of idsDoGrupo(el2.id)) ids.add(id);
      }
      S.sel = [...ids];
      pintarOverlay(); pintarReguas();
    }, () => {
      S.laco = null;
      if (!mexeu && !somar) S.sel = [];
      pintarTudoSemMundo();
    });
  }

  function iniciarDesenho(ev, tipo) {
    const p0 = ponto(ev);
    let w0 = s2w(p0);
    const enc0 = encaixar([w0.x], [w0.y], () => ({ x: w0.x, y: w0.y, w: 0, h: 0 }), new Set(), ev.ctrlKey);
    w0 = { x: w0.x + enc0.dx, y: w0.y + enc0.dy };
    let mexeu = false;
    arrastar(vp, ev, (e) => {
      const p = ponto(e);
      if (!mexeu && Math.hypot(p.x - p0.x, p.y - p0.y) < 4) return;
      mexeu = true;
      let w = s2w(p);
      const enc = encaixar([w.x], [w.y], () => ({ x: w.x, y: w.y, w: 0, h: 0 }), new Set(), e.ctrlKey);
      w = { x: w.x + enc.dx, y: w.y + enc.dy };
      S.guiasAtivas = enc.linhas;
      let dx = w.x - w0.x, dy = w.y - w0.y;
      if (tipo === 'linha') { if (Math.abs(dx) >= Math.abs(dy)) dy = 2 * Math.sign(dy || 1); else dx = 2 * Math.sign(dx || 1); }
      else if (e.shiftKey) { const m = Math.max(Math.abs(dx), Math.abs(dy)); dx = m * Math.sign(dx || 1); dy = m * Math.sign(dy || 1); }
      S.previa = { x: Math.min(w0.x, w0.x + dx), y: Math.min(w0.y, w0.y + dy), w: Math.max(1, Math.abs(dx)), h: Math.max(1, Math.abs(dy)) };
      pintarOverlay();
    }, () => {
      S.guiasAtivas = [];
      const r = S.previa;
      S.previa = null;
      const T = TIPOS[tipo];
      const e = mexeu && r ? novoElemento(tipo, r.x, r.y, r.w, r.h) : novoElemento(tipo, w0.x, w0.y, T.w, T.h);
      els().push(e);
      S.sel = [e.id];
      definirFerramenta('mover');
      mudou();
      if (tipo === 'texto' || tipo === 'botao') editarTexto(e.id, true);
      if (tipo === 'imagem') escolherImagem(e.id);
    });
  }

  vp.addEventListener('pointerdown', (ev) => {
    if (S.editando && !ev.target.closest('.ds-edit')) finalizarEdicao(true);
    if (ev.target.closest('.ds-edit')) return;
    document.activeElement && document.activeElement.blur && !document.activeElement.closest('.ds-vp') && document.activeElement.blur();
    if (ev.button === 1 || (ev.button === 0 && (S.espaco || S.ferramenta === 'mao'))) { ev.preventDefault(); iniciarPan(ev); return; }
    if (ev.button !== 0) return;
    const guia = ev.target.closest('[data-guia]');
    if (guia) { iniciarMoverGuia(ev, ...guia.dataset.guia.split(':')); return; }
    const pj = ev.target.closest('[data-pega-jan]');
    if (pj) { iniciarRedimJanela(ev, pj.dataset.pegaJan); return; }
    const pg = ev.target.closest('[data-pega]');
    if (pg) { iniciarRedim(ev, pg.dataset.pega); return; }
    if (S.ferramenta !== 'mover' && TIPOS[S.ferramenta]) { iniciarDesenho(ev, S.ferramenta); return; }
    const alvoEl = ev.target.closest('.de');
    if (alvoEl) {
      const id = alvoEl.dataset.id;
      const ids = ev.ctrlKey || ev.metaKey ? [id] : idsDoGrupo(id);
      if (ev.shiftKey) {
        const todosSel = ids.every((x) => S.sel.includes(x));
        S.sel = todosSel ? S.sel.filter((x) => !ids.includes(x)) : [...new Set([...S.sel, ...ids])];
        pintarTudoSemMundo();
        if (todosSel) return;
      } else if (!ids.every((x) => S.sel.includes(x)) || (ev.ctrlKey && S.sel.length > 1)) {
        S.sel = ids;
        pintarTudoSemMundo();
      }
      iniciarMover(ev, ev.altKey);
      return;
    }
    if (ev.target.closest('[data-barra]')) { S.sel = []; pintarTudoSemMundo(); return; }
    iniciarLaco(ev, ev.shiftKey);
  });

  vp.addEventListener('dblclick', (ev) => {
    const alvoEl = ev.target.closest('.de');
    if (!alvoEl) { if (ev.target.closest('[data-barra]')) focarProp('titulo'); return; }
    const e = porId(alvoEl.dataset.id);
    if (!e) return;
    if (e.grupo && S.sel.length > 1) { S.sel = [e.id]; pintarTudoSemMundo(); return; }
    if (TIPOS[e.tipo].temTexto) editarTexto(e.id);
    else if (e.tipo === 'imagem') escolherImagem(e.id);
    else if (['campo', 'area'].includes(e.tipo)) focarProp('placeholder');
    else if (['combo', 'lista'].includes(e.tipo)) focarProp('itens');
  });

  vp.addEventListener('pointermove', (ev) => {
    const p = ponto(ev);
    S.cursor = s2w(p);
    $('[data-st3]').textContent = `x ${Math.round(S.cursor.x)}  y ${Math.round(S.cursor.y)}`;
    if (S.arrastando) return;
    const d = ev.target.closest('.de');
    const h = d ? d.dataset.id : null;
    if (h !== S.hover) { S.hover = h; pintarOverlay(); }
    pintarReguas();
  });
  vp.addEventListener('pointerleave', () => { S.cursor = null; if (S.hover) { S.hover = null; pintarOverlay(); } pintarReguas(); });

  vp.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (S.editando) finalizarEdicao(true);
    const p = ponto(ev);
    let dx = ev.deltaX, dy = ev.deltaY;
    if (ev.deltaMode === 1) { dx *= 16; dy *= 16; }
    if (ev.ctrlKey || ev.metaKey) { zoomEm(S.cam.z * Math.exp(-dy * 0.0022), p.x, p.y); return; }
    if (ev.shiftKey && !dx) { dx = dy; dy = 0; }
    S.cam.x -= dx; S.cam.y -= dy;
    aplicarCamera();
  }, { passive: false });

  vp.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const alvoEl = ev.target.closest('.de');
    if (alvoEl && !S.sel.includes(alvoEl.dataset.id)) { S.sel = ev.ctrlKey ? [alvoEl.dataset.id] : idsDoGrupo(alvoEl.dataset.id); pintarTudoSemMundo(); }
    const tem = S.sel.length > 0;
    const umGrupo = tem && selecionados().some((e) => e.grupo);
    const itens = tem ? [
      { texto: 'Recortar', kbd: 'Ctrl+X', acao: recortar }, { texto: 'Copiar', kbd: 'Ctrl+C', acao: copiar }, { texto: 'Colar', kbd: 'Ctrl+V', acao: colar },
      { texto: 'Duplicar', kbd: 'Ctrl+D', acao: () => { duplicarSelecao(16, true); } }, { texto: 'Apagar', kbd: 'Delete', acao: apagarSelecao }, '-',
      { texto: 'Trazer para a frente', kbd: 'Ctrl+Shift+]', acao: () => ordem('frente') }, { texto: 'Avançar uma camada', kbd: 'Ctrl+]', acao: () => ordem('avancar') },
      { texto: 'Recuar uma camada', kbd: 'Ctrl+[', acao: () => ordem('recuar') }, { texto: 'Enviar para trás', kbd: 'Ctrl+Shift+[', acao: () => ordem('tras') }, '-',
      S.sel.length > 1 ? { texto: 'Agrupar', kbd: 'Ctrl+G', acao: agrupar } : null, umGrupo ? { texto: 'Desagrupar', kbd: 'Ctrl+Shift+G', acao: desagrupar } : null,
      { texto: selecionados().every((e) => e.bloqueado) ? 'Destravar' : 'Travar', kbd: 'Ctrl+Shift+L', acao: alternarTrava },
      { texto: 'Ocultar', kbd: 'Ctrl+Shift+H', acao: alternarVisivel }, '-',
      { texto: 'Zoom na seleção', kbd: 'Shift+2', acao: zoomSelecao },
    ].filter(Boolean) : [
      { texto: 'Colar', kbd: 'Ctrl+V', acao: colar }, { texto: 'Selecionar tudo', kbd: 'Ctrl+A', acao: selecionarTudo }, '-',
      { texto: 'Ajustar à tela', kbd: 'Shift+1', acao: ajustarTela }, { texto: S.grade ? 'Esconder grade' : 'Mostrar grade', kbd: "Ctrl+'", acao: alternarGrade },
      { texto: S.reguas ? 'Esconder réguas' : 'Mostrar réguas', kbd: 'Shift+R', acao: alternarReguas },
      ...(S.D.guias.v.length || S.D.guias.h.length ? [{ texto: 'Apagar todas as guias', acao: () => { S.D.guias = { v: [], h: [] }; mudou(); } }] : []),
    ];
    menuContexto(ev.clientX, ev.clientY, itens);
  });

  // arrastar da paleta / soltar imagens do computador
  vp.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
  vp.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    const w = s2w(ponto(ev));
    const tipo = ev.dataTransfer.getData('text/pyforge-tipo');
    const modelo = ev.dataTransfer.getData('text/pyforge-modelo');
    if (tipo && TIPOS[tipo]) { adicionar(tipo, w.x - TIPOS[tipo].w / 2, w.y - TIPOS[tipo].h / 2); return; }
    if (modelo) { inserirModelo(modelo, w); return; }
    const arqs = [...(ev.dataTransfer.files || [])].filter((f) => /^image\//.test(f.type));
    for (const f of arqs) {
      const r = await enviarImagem(f);
      if (!r) continue;
      const e = novoElemento('imagem', w.x - r.w / 2, w.y - r.h / 2, r.w, r.h, { arquivo: r.arquivo });
      els().push(e);
      S.sel = [e.id];
      w.x += 24; w.y += 24;
    }
    if (arqs.length) mudou();
  });

  // ====================================================================== guias (réguas)
  function iniciarGuiaDaRegua(ev, eixo) {
    ev.preventDefault();
    const cv = eixo === 'h' ? rh : rv;
    arrastar(cv, ev, (e) => {
      const w = s2w(ponto(e));
      S.guiaNova = { eixo: eixo === 'h' ? 'h' : 'v', v: Math.round(eixo === 'h' ? w.y : w.x) };
      pintarOverlay();
    }, (e) => {
      const g = S.guiaNova;
      S.guiaNova = null;
      const p = ponto(e);
      const r = vp.getBoundingClientRect();
      if (g && p.x >= 0 && p.y >= 0 && p.x <= r.width && p.y <= r.height) { S.D.guias[g.eixo].push(g.v); mudou(); } else pintarOverlay();
    });
  }
  rh.addEventListener('pointerdown', (ev) => iniciarGuiaDaRegua(ev, 'h'));
  rv.addEventListener('pointerdown', (ev) => iniciarGuiaDaRegua(ev, 'v'));
  function iniciarMoverGuia(ev, eixo, i) {
    i = +i;
    arrastar(vp, ev, (e) => {
      const w = s2w(ponto(e));
      S.D.guias[eixo][i] = Math.round(eixo === 'v' ? w.x : w.y);
      pintarOverlay();
    }, (e) => {
      const p = ponto(e);
      if ((eixo === 'v' && p.x < 0) || (eixo === 'h' && p.y < 0)) S.D.guias[eixo].splice(i, 1);
      mudou();
    });
  }

  // ====================================================================== edição de texto no lugar
  function editarTexto(id, novo) {
    const e = porId(id);
    if (!e || !TIPOS[e.tipo].temTexto || e.bloqueado) return;
    finalizarEdicao(true);
    const multi = e.tipo === 'texto';
    const t = el(`<textarea class="ds-edit" spellcheck="false" aria-label="Editar texto"></textarea>`);
    t.value = e.texto;
    vp.appendChild(t);
    S.editando = { id, t, antes: e.texto, novo };
    posicionarEdicao();
    t.focus();
    t.select();
    t.addEventListener('keydown', (k) => {
      k.stopPropagation();
      if (k.key === 'Escape') { k.preventDefault(); finalizarEdicao(false); }
      else if (k.key === 'Enter' && (!multi || !k.shiftKey)) { k.preventDefault(); finalizarEdicao(true); }
    });
    t.addEventListener('input', () => { e.texto = t.value; const d = mundo.querySelector(`.de[data-id="${id}"] .de-in span`) || mundo.querySelector(`.de[data-id="${id}"] .de-in`); if (d && e.tipo !== 'caixa' && e.tipo !== 'opcao') d.textContent = t.value || ' '; });
    t.addEventListener('blur', () => setTimeout(() => finalizarEdicao(true), 0));
    pintarOverlay();
  }
  function posicionarEdicao() {
    const ed = S.editando;
    if (!ed) return;
    const e = porId(ed.id);
    if (!e) return;
    const r = retTela(e.x, e.y, e.w, e.h);
    const z = S.cam.z;
    const tx = cor(e, 'corTexto', S.D);
    const fundo = e.tipo === 'botao' ? cor(e, 'fundo', S.D) : (e.fundo || fundoJanela(S.D));
    Object.assign(ed.t.style, {
      left: r.x + 'px', top: r.y + 'px', width: Math.max(40, r.w) + 'px', height: Math.max(20, r.h) + 'px',
      fontSize: e.tamanho * z + 'px', fontFamily: fam(e), fontWeight: e.negrito ? 700 : 400, fontStyle: e.italico ? 'italic' : 'normal',
      color: tx, background: fundo, textAlign: e.tipo === 'botao' ? 'center' : ({ esquerda: 'left', centro: 'center', direita: 'right' }[e.alinhar] || 'left'),
      paddingTop: e.tipo === 'texto' && e.alinharV !== 'topo' ? Math.max(0, (r.h - e.tamanho * z * 1.25) / (e.alinharV === 'base' ? 1 : 2)) + 'px' : e.tipo === 'botao' ? Math.max(0, (r.h - e.tamanho * z * 1.25) / 2) + 'px' : '0px',
      paddingLeft: (['caixa', 'opcao'].includes(e.tipo) ? 24 * z : e.tipo === 'botao' ? 12 * z : 0) + 'px',
      borderRadius: (e.raio || 0) * z + 'px',
    });
  }
  function finalizarEdicao(manter) {
    const ed = S.editando;
    if (!ed) return;
    S.editando = null;
    const e = porId(ed.id);
    ed.t.remove();
    if (!e) return;
    if (!manter) e.texto = ed.antes;
    if (manter && e.texto !== ed.antes) mudou(); else pintarTudo();
  }

  // ====================================================================== ações de edição
  function adicionar(tipo, x, y, extra = {}) {
    if (x == null) {
      // centro da parte visível da janela
      const r = vp.getBoundingClientRect();
      const c = s2w({ x: r.width / 2, y: r.height / 2 });
      x = lim(c.x, 0, S.D.largura) - TIPOS[tipo].w / 2;
      y = lim(c.y, 0, S.D.altura) - TIPOS[tipo].h / 2;
      x = lim(x, 0, Math.max(0, S.D.largura - TIPOS[tipo].w));
      y = lim(y, 0, Math.max(0, S.D.altura - TIPOS[tipo].h));
      while (els().some((o) => o.x === Math.round(x) && o.y === Math.round(y))) { x += 16; y += 16; }
    }
    const e = novoElemento(tipo, x, y, undefined, undefined, extra);
    els().push(e);
    S.sel = [e.id];
    mudou();
    if (tipo === 'imagem') escolherImagem(e.id);
    return e;
  }

  function inserirModelo(id, centro) {
    const m = MODELOS.find((x) => x.id === id);
    if (!m) return;
    const partes = m.cria(S.D);
    const b = caixaDe(partes.map(([, , x, y, w, h]) => ({ x, y, w, h })));
    let ox = 0, oy = 0;
    if (m.fixoNoTopo || m.fixoNaBase) { ox = 0; oy = 0; }
    else {
      const r = vp.getBoundingClientRect();
      const c = centro || s2w({ x: r.width / 2, y: r.height / 2 });
      ox = Math.round(lim(c.x - b.w / 2, 0, Math.max(0, S.D.largura - b.w)) - b.x);
      oy = Math.round(lim(c.y - b.h / 2, 0, Math.max(0, S.D.altura - b.h)) - b.y);
    }
    const g = proximoGrupo();
    const ids = [];
    for (const [tipo, nome, x, y, w, h, extra] of partes) {
      const e = novoElemento(tipo, x + ox, y + oy, w, h, extra, nome);
      if (partes.length > 1) e.grupo = g;
      els().push(e);
      ids.push(e.id);
    }
    S.sel = ids;
    mudou();
    toast(`“${m.nome}” adicionado. Clique para mover tudo junto; Ctrl+clique edita uma parte.`, 'ok');
  }

  function apagarSelecao() {
    if (!S.sel.length) return;
    S.D.elementos = els().filter((e) => !S.sel.includes(e.id) || e.bloqueado);
    S.sel = [];
    mudou();
  }
  function copiar() {
    const sel = selecionados();
    if (!sel.length) return;
    CLIP = JSON.parse(JSON.stringify(sel));
    try { navigator.clipboard.writeText(JSON.stringify({ pyforge: 'elementos', elementos: CLIP })); } catch { /* sem permissão */ }
    toast(fmt('{n} elemento(s) copiado(s).', { n: sel.length }), 'info', 1800);
  }
  function recortar() { copiar(); apagarSelecao(); }
  function colarLista(lista, deslocar) {
    const mapaGrupos = new Map();
    const ids = [];
    const ocupado = (x, y) => els().some((o) => o.x === x && o.y === y);
    let d = 0;
    if (deslocar) while (lista.every((c) => ocupado(c.x + d, c.y + d)) && d < 400) d += 16;
    for (const c of lista) {
      const e = JSON.parse(JSON.stringify(c));
      e.id = proximoId();
      e.nome = nomeLivre(e.nome.replace(/_\d+$/, ''), false);
      e.x += d; e.y += d;
      if (e.grupo) { if (!mapaGrupos.has(e.grupo)) mapaGrupos.set(e.grupo, '__t' + mapaGrupos.size); e.grupo = mapaGrupos.get(e.grupo); }
      e.bloqueado = false;
      els().push(e);
      ids.push(e.id);
    }
    // os grupos novos recebem números de verdade
    for (const [, tmp] of mapaGrupos) { const real = proximoGrupo(); for (const e of els()) if (e.grupo === tmp) e.grupo = real; }
    S.sel = ids;
    return ids.map(porId);
  }
  async function colar() {
    let lista = CLIP;
    try {
      const txt = await navigator.clipboard.readText();
      const j = JSON.parse(txt);
      if (j && j.pyforge === 'elementos' && Array.isArray(j.elementos)) lista = j.elementos;
    } catch { /* usa o CLIP interno */ }
    if (!lista || !lista.length) { toast('Nada para colar.', 'info'); return; }
    lista = normalizar({ ...S.D, elementos: lista }).elementos;
    colarLista(lista, true);
    mudou();
  }
  function duplicarSelecao(desloc, registrar) {
    const sel = selecionados();
    if (!sel.length) return [];
    const copias = colarLista(sel.map((e) => ({ ...JSON.parse(JSON.stringify(e)), x: e.x + desloc, y: e.y + desloc })), false);
    if (registrar) mudou();
    return copias;
  }
  function selecionarTudo() { S.sel = els().filter((e) => e.visivel && !e.bloqueado).map((e) => e.id); pintarTudoSemMundo(); }
  function ordem(como) {
    const lista = els();
    const sel = new Set(S.sel);
    if (!sel.size) return;
    if (como === 'frente') S.D.elementos = [...lista.filter((e) => !sel.has(e.id)), ...lista.filter((e) => sel.has(e.id))];
    else if (como === 'tras') S.D.elementos = [...lista.filter((e) => sel.has(e.id)), ...lista.filter((e) => !sel.has(e.id))];
    else if (como === 'avancar') { for (let i = lista.length - 2; i >= 0; i--) if (sel.has(lista[i].id) && !sel.has(lista[i + 1].id)) [lista[i], lista[i + 1]] = [lista[i + 1], lista[i]]; }
    else if (como === 'recuar') { for (let i = 1; i < lista.length; i++) if (sel.has(lista[i].id) && !sel.has(lista[i - 1].id)) [lista[i], lista[i - 1]] = [lista[i - 1], lista[i]]; }
    mudou();
  }
  function agrupar() {
    if (S.sel.length < 2) return;
    const g = proximoGrupo();
    const sel = new Set(S.sel);
    // deixa o grupo junto nas camadas, na posição do mais alto
    const lista = els();
    const membros = lista.filter((e) => sel.has(e.id));
    const topo = Math.max(...membros.map((e) => lista.indexOf(e)));
    const resto = lista.filter((e) => !sel.has(e.id));
    const antesDoTopo = lista.slice(0, topo + 1).filter((e) => !sel.has(e.id)).length;
    membros.forEach((e) => { e.grupo = g; });
    S.D.elementos = [...resto.slice(0, antesDoTopo), ...membros, ...resto.slice(antesDoTopo)];
    mudou();
  }
  function desagrupar() { for (const e of selecionados()) e.grupo = ''; mudou(); }
  function alternarTrava() { const v = !selecionados().every((e) => e.bloqueado); for (const e of selecionados()) e.bloqueado = v; mudou(); }
  function alternarVisivel() { const v = !selecionados().every((e) => !e.visivel); for (const e of selecionados()) e.visivel = !v; if (v) S.sel = []; mudou(); }
  function empurrar(dx, dy) {
    const sel = selecionados().filter((e) => !e.bloqueado);
    if (!sel.length) return;
    for (const e of sel) { e.x += dx; e.y += dy; }
    mudou();
  }
  function alinhar(como) {
    const sel = selecionados().filter((e) => !e.bloqueado);
    if (!sel.length) return;
    // um só (ou um grupo só): alinha na janela
    const umaUnidade = sel.length === 1 || new Set(sel.map((e) => e.grupo || e.id)).size === 1;
    const ref = umaUnidade ? { x: 0, y: 0, w: S.D.largura, h: S.D.altura } : caixaDe(sel);
    const b = caixaDe(sel);
    const mover = (e, dx, dy) => { e.x = Math.round(e.x + dx); e.y = Math.round(e.y + dy); };
    if (umaUnidade) {
      const dx = { esq: ref.x - b.x, centroH: ref.x + ref.w / 2 - (b.x + b.w / 2), dir: ref.x + ref.w - (b.x + b.w) }[como] ?? 0;
      const dy = { topo: ref.y - b.y, meio: ref.y + ref.h / 2 - (b.y + b.h / 2), base: ref.y + ref.h - (b.y + b.h) }[como] ?? 0;
      sel.forEach((e) => mover(e, dx, dy));
    } else if (como === 'distH' || como === 'distV') {
      if (sel.length < 3) { toast('Selecione 3 ou mais elementos para distribuir.', 'info'); return; }
      const h = como === 'distH';
      const ord = [...sel].sort((a, c) => (h ? a.x - c.x : a.y - c.y));
      const total = ord.reduce((s, e) => s + (h ? e.w : e.h), 0);
      const espaco = ((h ? b.w : b.h) - total) / (ord.length - 1);
      let p = h ? b.x : b.y;
      for (const e of ord) { if (h) e.x = Math.round(p); else e.y = Math.round(p); p += (h ? e.w : e.h) + espaco; }
    } else {
      for (const e of sel) {
        if (como === 'esq') e.x = ref.x;
        if (como === 'centroH') e.x = Math.round(ref.x + ref.w / 2 - e.w / 2);
        if (como === 'dir') e.x = ref.x + ref.w - e.w;
        if (como === 'topo') e.y = ref.y;
        if (como === 'meio') e.y = Math.round(ref.y + ref.h / 2 - e.h / 2);
        if (como === 'base') e.y = ref.y + ref.h - e.h;
      }
    }
    mudou();
  }

  // ====================================================================== imagens
  async function listarImagens() {
    try {
      const r = await api('fs/arvore?' + q({ raiz: S.raiz }));
      const out = [];
      const andar = (itens, pre) => { for (const i of itens || []) { if (i.dir) andar(i.filhos, pre + i.nome + '/'); else if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(i.nome)) out.push(pre + i.nome); } };
      andar(r.itens, '');
      S.imagens = out.filter((x) => !/^(\.venv|dist|build)\//.test(x)).slice(0, 300);
    } catch { S.imagens = []; }
    return S.imagens;
  }
  function lerArquivo(f) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  }
  function tamanhoNatural(url) {
    return new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res(null); i.src = url; });
  }
  async function enviarImagem(f) {
    if (f.size > 20 * 1024 * 1024) { toast('Imagem grande demais (máximo 20 MB).', 'err'); return null; }
    try {
      const dataUrl = await lerArquivo(f);
      const base = (f.name || 'imagem.png').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'imagem.png';
      const lista = S.imagens || (await listarImagens());
      let nome = base;
      let i = 2;
      while (lista.includes('assets/' + nome)) nome = base.replace(/(\.[a-z0-9]+)?$/, `-${i++}$1`);
      await api('fs/escrever-b64', { caminho: juntar(juntar(S.raiz, 'assets'), nome), dados: dataUrl.split(',')[1] });
      lista.push('assets/' + nome);
      S.versaoImg = Date.now();
      const nat = (await tamanhoNatural(dataUrl)) || { w: 160, h: 120 };
      const f2 = Math.min(1, 320 / Math.max(nat.w, nat.h));
      toast(`Imagem salva em assets/${nome}`, 'ok', 2500);
      return { arquivo: 'assets/' + nome, w: Math.max(8, Math.round(nat.w * f2)), h: Math.max(8, Math.round(nat.h * f2)) };
    } catch (e) { toast('Não consegui salvar a imagem: ' + e.message, 'err'); return null; }
  }
  function escolherImagem(id) {
    const inp = $('[data-arqimg]');
    inp.value = '';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = await enviarImagem(f);
      const e = porId(id);
      if (!r || !e) return;
      const eraVazia = !e.arquivo;
      e.arquivo = r.arquivo;
      if (eraVazia) { e.w = r.w; e.h = r.h; }
      mudou();
    };
    inp.click();
  }

  // ====================================================================== ferramentas
  function definirFerramenta(f) {
    S.ferramenta = f;
    vp.dataset.ferr = f;
    ui.querySelectorAll('[data-ferr] [data-f]').forEach((b) => { b.classList.toggle('on', b.dataset.f === f); b.setAttribute('aria-pressed', b.dataset.f === f); });
    const nome = (FERRAMENTAS.find((x) => x[0] === f) || [])[2];
    $('[data-dica]').textContent = f !== 'mover' && f !== 'mao' && TIPOS[f] ? `${nome}: clique ou arraste na tela para criar · Esc cancela` : '';
    $('[data-dica]').style.display = $('[data-dica]').textContent ? '' : 'none';
    pintarOverlay();
  }
  function pintarFerramentas() {
    const c = $('[data-ferr]');
    c.innerHTML = '';
    for (const f of FERRAMENTAS) {
      if (f === '-') { c.appendChild(el('<span class="ds-sep"></span>')); continue; }
      const b = el(`<button class="ib" data-f="${f[0]}" title="${esc(f[2])} (${f[3]})" aria-label="${esc(f[2])}" aria-pressed="false">${ic(f[1], 16)}</button>`);
      b.onclick = () => definirFerramenta(f[0]);
      c.appendChild(b);
    }
    definirFerramenta(S.ferramenta);
  }

  // ====================================================================== painel esquerdo
  function pintarEsquerda() {
    const c = $('[data-esq]');
    const rolagem = c.scrollTop;
    c.innerHTML = '';
    if (S.esq === 'elementos') {
      const busca = el(`<div style="padding:10px 10px 4px"><input class="campo" data-busca placeholder="Buscar elemento…" aria-label="Buscar elemento" value="${esc(S.filtro)}"></div>`);
      const inp = busca.querySelector('input');
      inp.oninput = () => { S.filtro = inp.value; const pos = inp.selectionStart; pintarEsquerda(); const n = $('[data-busca]'); n.focus(); n.setSelectionRange(pos, pos); };
      c.appendChild(busca);
      c.appendChild(el('<div class="dim" style="font-size:11.5px;padding:2px 12px 8px;line-height:1.45">Clique para pôr no meio da tela ou arraste até o lugar certo.</div>'));
      const filtro = S.filtro.trim().toLowerCase();
      const grupos = {};
      for (const [k, t] of Object.entries(TIPOS)) if (!filtro || t.nome.toLowerCase().includes(filtro)) (grupos[t.grupo] = grupos[t.grupo] || []).push([k, t]);
      for (const [g, itens] of Object.entries(grupos)) {
        c.appendChild(el(`<div class="secao-t" style="margin:8px 12px 6px">${esc(g)}</div>`));
        const grade = el('<div class="paleta" style="padding:0 10px"></div>');
        for (const [k, t] of itens) {
          const b = el(`<button class="peca" draggable="true" title="${esc(t.nome)}"><span style="color:var(--ac-tx);display:flex">${ic(t.icone, 16)}</span><span>${esc(t.nome)}</span></button>`);
          b.onclick = () => adicionar(k);
          b.ondragstart = (e) => { e.dataTransfer.setData('text/pyforge-tipo', k); e.dataTransfer.effectAllowed = 'copy'; };
          grade.appendChild(b);
        }
        c.appendChild(grade);
      }
      const mods = MODELOS.filter((m) => !filtro || m.nome.toLowerCase().includes(filtro));
      if (mods.length) {
        c.appendChild(el(`<div class="secao-t" style="margin:14px 12px 6px">Modelos prontos</div>`));
        const grade = el('<div class="paleta" style="padding:0 10px 14px"></div>');
        for (const m of mods) {
          const b = el(`<button class="peca" draggable="true" title="${esc(m.nome)}"><span style="color:var(--yel);display:flex">${ic(m.icone, 16)}</span><span>${esc(m.nome)}</span></button>`);
          b.onclick = () => inserirModelo(m.id);
          b.ondragstart = (e) => { e.dataTransfer.setData('text/pyforge-modelo', m.id); e.dataTransfer.effectAllowed = 'copy'; };
          grade.appendChild(b);
        }
        c.appendChild(grade);
      }
    } else pintarCamadas(c);
    c.scrollTop = rolagem;
  }

  function pintarCamadas(c) {
    const lista = el('<div role="tree" aria-label="Camadas" style="padding:8px 6px" data-camadas></div>');
    const jan = el(`<div class="camada ${S.sel.length ? '' : 'on'}" role="treeitem" style="padding-left:8px">${ic('janela', 14)}<span class="grow ellipsis">${esc(S.D.titulo)}</span><span class="dim" style="font-size:11px">janela</span></div>`);
    jan.onclick = () => { S.sel = []; pintarTudoSemMundo(); };
    lista.appendChild(jan);
    const arr = [...els()].reverse(); // o de cima aparece primeiro, como no Photoshop/Figma
    let grupoAtual = null;
    arr.forEach((e) => {
      if (e.grupo && e.grupo !== grupoAtual) {
        grupoAtual = e.grupo;
        const membros = els().filter((o) => o.grupo === e.grupo).map((o) => o.id);
        const todos = membros.every((id) => S.sel.includes(id));
        const gr = el(`<div class="camada grupo ${todos ? 'on' : ''}" role="treeitem" style="padding-left:20px">${ic('agrupar', 13)}<span class="grow ellipsis">Grupo ${esc(e.grupo.slice(1))}</span><span class="dim" style="font-size:11px">${membros.length}</span></div>`);
        gr.onclick = () => { S.sel = membros; pintarTudoSemMundo(); };
        lista.appendChild(gr);
      } else if (!e.grupo) grupoAtual = null;
      const ativo = S.sel.includes(e.id);
      const r = el(`<div class="camada ${ativo ? 'on' : ''} ${e.visivel ? '' : 'oculta'}" role="treeitem" draggable="true" data-cid="${e.id}" style="padding-left:${e.grupo ? 38 : 20}px">
        <span style="color:${ativo ? '#fff' : 'var(--ac-tx)'};display:flex">${ic(TIPOS[e.tipo].icone, 13)}</span>
        <span class="grow ellipsis mono" style="font-size:12px" data-nm>${esc(e.nome)}</span>
        <button class="ib peq cam-bt ${e.bloqueado ? 'fixo' : ''}" data-lock aria-label="${e.bloqueado ? 'Destravar' : 'Travar'}" title="${e.bloqueado ? 'Destravar' : 'Travar'}">${ic(e.bloqueado ? 'cadeado' : 'cadeadoAberto', 12)}</button>
        <button class="ib peq cam-bt ${e.visivel ? '' : 'fixo'}" data-vis aria-label="${e.visivel ? 'Ocultar' : 'Mostrar'}" title="${e.visivel ? 'Ocultar' : 'Mostrar'}">${ic(e.visivel ? 'olho' : 'olhoFechado', 12)}</button></div>`);
      r.onclick = (ev) => {
        if (ev.target.closest('button')) return;
        if (ev.shiftKey) S.sel = S.sel.includes(e.id) ? S.sel.filter((x) => x !== e.id) : [...S.sel, e.id];
        else S.sel = [e.id];
        pintarTudoSemMundo();
      };
      r.ondblclick = (ev) => {
        if (ev.target.closest('button')) return;
        const nm = r.querySelector('[data-nm]');
        const inp = el(`<input class="campo mono" style="height:22px;font-size:12px;padding:0 6px" value="${esc(e.nome)}" aria-label="Nome">`);
        nm.replaceWith(inp);
        inp.focus(); inp.select();
        const fim = (ok) => { if (ok) renomear(e, inp.value.trim()); else pintarEsquerda(); };
        inp.onkeydown = (k) => { k.stopPropagation(); if (k.key === 'Enter') fim(true); if (k.key === 'Escape') fim(false); };
        inp.onblur = () => fim(true);
      };
      r.querySelector('[data-lock]').onclick = () => { e.bloqueado = !e.bloqueado; mudou(); };
      r.querySelector('[data-vis]').onclick = () => { e.visivel = !e.visivel; if (!e.visivel) S.sel = S.sel.filter((x) => x !== e.id); mudou(); };
      r.ondragstart = (ev) => { ev.dataTransfer.setData('text/pyforge-camada', e.id); ev.dataTransfer.effectAllowed = 'move'; };
      r.ondragover = (ev) => { ev.preventDefault(); const rr = r.getBoundingClientRect(); r.classList.toggle('drop-acima', ev.clientY < rr.top + rr.height / 2); r.classList.toggle('drop-abaixo', ev.clientY >= rr.top + rr.height / 2); };
      r.ondragleave = () => r.classList.remove('drop-acima', 'drop-abaixo');
      r.ondrop = (ev) => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData('text/pyforge-camada');
        r.classList.remove('drop-acima', 'drop-abaixo');
        if (!id || id === e.id) return;
        const rr = r.getBoundingClientRect();
        const acima = ev.clientY < rr.top + rr.height / 2; // acima na lista = mais à frente
        const lista2 = els();
        const mov = porId(id);
        lista2.splice(lista2.indexOf(mov), 1);
        const i = lista2.indexOf(e);
        lista2.splice(acima ? i + 1 : i, 0, mov);
        mudou();
      };
      lista.appendChild(r);
    });
    if (!els().length) lista.appendChild(el('<div class="dim" style="padding:12px;font-size:12.5px">Nenhum elemento ainda. Vá em Elementos e clique em um.</div>'));
    c.appendChild(lista);
  }

  function renomear(e, v) {
    if (v === e.nome) { pintarEsquerda(); return; }
    if (!nomeOk(v)) { toast('Use só letras minúsculas, números e _ (sem acento, sem começar com número, e sem nomes do Python).', 'err'); pintarTudo(); return; }
    if (els().some((x) => x.nome === v && x.id !== e.id)) { toast('Já existe um elemento com esse nome.', 'err'); pintarTudo(); return; }
    const antigo = e.nome;
    e.nome = v;
    for (const [campo] of EVENTOS[e.tipo] || []) if (e[campo] === metodoSugerido({ ...e, nome: antigo }, campo)) e[campo] = metodoSugerido(e, campo);
    mudou();
  }

  // ====================================================================== propriedades
  let idCampo = 0;
  const novoIdCampo = () => 'dp' + (++idCampo);
  function focarProp(chave) {
    S.dir = 'props'; pintarModos();
    requestAnimationFrame(() => { const i = $(`[data-props] [data-k="${chave}"]`); if (i) { i.focus(); i.select && i.select(); } });
  }
  function aplicar(fn) { for (const e of selecionados()) fn(e); mudou(); }

  function pintarProps() {
    const c = $('[data-props]');
    const rol = c.scrollTop;
    c.innerHTML = '';
    const sec = (titulo, extra = '') => { const s = el(`<section class="ps"><div class="ps-t"><span>${esc(titulo)}</span>${extra}</div></section>`); c.appendChild(s); return s; };
    const linha = (s, cols = 2) => { const g = el(`<div class="ps-g" style="grid-template-columns:repeat(${cols},minmax(0,1fr))"></div>`); s.appendChild(g); return g; };
    const campoTxt = (pai, rot, valor, aoMudar, op = {}) => {
      const id = novoIdCampo();
      const w = el(`<div class="prop"><label class="rotulo" for="${id}">${esc(rot)}</label></div>`);
      const inp = op.area ? el(`<textarea id="${id}" class="campo" rows="${op.linhas || 3}" ${op.k ? `data-k="${op.k}"` : ''}></textarea>`) : el(`<input id="${id}" class="campo ${op.mono ? 'mono' : ''}" ${op.ph ? `placeholder="${esc(op.ph)}"` : ''} ${op.k ? `data-k="${op.k}"` : ''}>`);
      inp.value = valor ?? '';
      inp.addEventListener('change', () => aoMudar(inp.value));
      inp.addEventListener('keydown', (k) => { k.stopPropagation(); if (k.key === 'Enter' && !op.area) inp.blur(); });
      w.appendChild(inp);
      if (op.dica) w.appendChild(el(`<div class="dim" style="font-size:11.5px;line-height:1.45">${op.dica}</div>`));
      pai.appendChild(w);
      return inp;
    };
    const campoNum = (pai, rot, valor, aoMudar, op = {}) => {
      const id = novoIdCampo();
      const w = el(`<div class="ps-num"><label for="${id}" title="Arraste para mudar">${esc(rot)}</label><input id="${id}" class="campo" inputmode="decimal" ${op.k ? `data-k="${op.k}"` : ''}></div>`);
      const inp = w.querySelector('input');
      inp.value = valor === null ? '' : valor;
      if (valor === null) inp.placeholder = 'Misto';
      const enviar = (v) => { if (Number.isFinite(v)) aoMudar(Math.round(lim(v, op.min ?? -1e9, op.max ?? 1e9))); else inp.value = valor ?? ''; };
      inp.addEventListener('change', () => enviar(calcular(inp.value)));
      inp.addEventListener('keydown', (k) => {
        k.stopPropagation();
        if (k.key === 'Enter') inp.blur();
        if (k.key === 'ArrowUp' || k.key === 'ArrowDown') { k.preventDefault(); const v = (Number(inp.value) || 0) + (k.key === 'ArrowUp' ? 1 : -1) * (k.shiftKey ? 10 : 1); inp.value = v; enviar(v); }
      });
      // arrastar o rótulo muda o valor (como no Figma)
      const lab = w.querySelector('label');
      lab.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const x0 = ev.clientX; const v0 = Number(inp.value) || 0;
        lab.setPointerCapture(ev.pointerId);
        const mv = (e2) => { const v = Math.round(lim(v0 + (e2.clientX - x0) * (e2.shiftKey ? 10 : 1), op.min ?? -1e9, op.max ?? 1e9)); inp.value = v; };
        const up = () => { lab.removeEventListener('pointermove', mv); lab.removeEventListener('pointerup', up); if (Number(inp.value) !== v0) enviar(Number(inp.value)); };
        lab.addEventListener('pointermove', mv); lab.addEventListener('pointerup', up);
      });
      pai.appendChild(w);
      return inp;
    };
    const seg = (pai, rot, valor, opcoes, aoMudar) => {
      const w = el(`<div class="prop">${rot ? `<span class="rotulo">${esc(rot)}</span>` : ''}<div class="seg ps-seg" role="radiogroup" aria-label="${esc(rot || '')}"></div></div>`);
      for (const [v, r, icone] of opcoes) {
        const b = el(`<button role="radio" class="${v === valor ? 'on' : ''}" aria-checked="${v === valor}" title="${esc(r)}">${icone ? ic(icone, 14) : esc(r)}</button>`);
        if (icone) b.setAttribute('aria-label', r);
        b.onclick = () => aoMudar(v);
        w.querySelector('.seg').appendChild(b);
      }
      pai.appendChild(w);
    };
    const chave = (pai, rot, valor, aoMudar, dica) => {
      const w = el(`<div class="flex" style="gap:10px"><span class="grow" style="font-size:12.5px">${esc(rot)}${dica ? `<div class="dim" style="font-size:11px">${dica}</div>` : ''}</span><button class="switch" role="switch" aria-checked="${!!valor}" aria-label="${esc(rot)}"></button></div>`);
      w.querySelector('button').onclick = () => aoMudar(!valor);
      pai.appendChild(w);
    };
    const selecao = (pai, rot, valor, opcoes, aoMudar, k) => {
      const id = novoIdCampo();
      const w = el(`<div class="prop"><label class="rotulo" for="${id}">${esc(rot)}</label><select id="${id}" class="sel campo" ${k ? `data-k="${k}"` : ''}>${opcoes.map(([v, r]) => `<option value="${esc(v)}" ${v === valor ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>`);
      w.querySelector('select').onchange = (ev) => aoMudar(ev.target.value);
      pai.appendChild(w);
    };
    const corCampo = (pai, rot, valor, aoMudar, padrao) => {
      const w = el(`<div class="prop"><span class="rotulo">${esc(rot)}</span><div class="cor-campo"><input type="color" aria-label="${esc(rot)}"><input class="campo mono grow" style="font-size:12.5px" aria-label="${esc(rot)} em hexadecimal">${padrao !== undefined ? '<button class="btn peq ghost" title="Usar a cor padrão do tema">Padrão</button>' : ''}</div><div class="ps-cores"></div></div>`);
      const [pick, txt] = w.querySelectorAll('input');
      pick.value = valor || padrao || '#000000';
      txt.value = valor || '';
      txt.placeholder = padrao !== undefined ? `padrão (${padrao || 'transparente'})` : '';
      const usar = (v) => { if (v && !S.coresRecentes.includes(v)) { S.coresRecentes = [v, ...S.coresRecentes].slice(0, 10); salvarConfig({ designer: { cores: S.coresRecentes } }); } aoMudar(v); };
      pick.onchange = () => usar(pick.value.toUpperCase());
      txt.onchange = () => { const v = txt.value.trim(); if (!v || COR_OK.test(v)) usar(v.toUpperCase()); else { toast('Use o formato #RRGGBB', 'err'); txt.value = valor || ''; } };
      txt.onkeydown = (k) => k.stopPropagation();
      if (padrao !== undefined) w.querySelector('button').onclick = () => aoMudar('');
      const doc = [...new Set([S.D.cor, ...els().flatMap((e) => [e.fundo, e.corTexto, e.borda, e.cor]).filter(Boolean), ...S.coresRecentes])].slice(0, 14);
      const cs = w.querySelector('.ps-cores');
      for (const cc of doc) { const b = el(`<button class="ps-cor ${cc === valor ? 'on' : ''}" style="background:${cc}" title="${cc}" aria-label="Usar ${cc}"></button>`); b.onclick = () => aoMudar(cc); cs.appendChild(b); }
      pai.appendChild(w);
    };
    const botoesAlinhar = () => {
      const s = el('<div class="ps-alinhar"></div>');
      for (const [k, icone, t] of [['esq', 'alEsq', 'Alinhar à esquerda (Alt+A)'], ['centroH', 'alCentroH', 'Centralizar na horizontal (Alt+H)'], ['dir', 'alDir', 'Alinhar à direita (Alt+D)'], ['topo', 'alTopo', 'Alinhar no topo (Alt+W)'], ['meio', 'alMeio', 'Centralizar na vertical (Alt+V)'], ['base', 'alBase', 'Alinhar na base (Alt+S)'], ['distH', 'distH', 'Distribuir na horizontal'], ['distV', 'distV', 'Distribuir na vertical']]) {
        const b = el(`<button class="ib" title="${esc(t)}" aria-label="${esc(t)}">${ic(icone, 16)}</button>`);
        b.onclick = () => alinhar(k);
        s.appendChild(b);
      }
      c.appendChild(s);
    };
    const D = S.D;
    const sel = selecionados();

    // ----- janela -----
    if (!sel.length) {
      c.appendChild(el(`<div class="ps-cab"><span class="icone-q" style="width:30px;height:30px">${ic('janela', 16)}</span><div class="grow"><div class="mono" style="font-size:13px">${esc(D.nome)}</div><div class="dim" style="font-size:12px">Janela · clique num elemento para editá-lo</div></div></div>`));
      const s1 = sec('Janela');
      campoTxt(s1, 'Título da janela', D.titulo, (v) => { D.titulo = v || 'Minha janela'; mudou(); }, { k: 'titulo' });
      const g = linha(s1);
      campoNum(g, 'L\u200b', D.largura, (v) => { redimJanela(v, D.altura); }, { min: 160, max: 4000, k: 'largura' });
      campoNum(g, 'A\u200b', D.altura, (v) => { redimJanela(D.largura, v); }, { min: 120, max: 4000, k: 'altura' });
      selecao(s1, 'Tamanhos prontos', '', [['', 'Escolher…'], ...TAMANHOS_JANELA], (v) => { if (!v) return; const [w, h] = v.split('x').map(Number); redimJanela(w, h); });
      chave(s1, 'Pode mudar de tamanho', D.redimensionavel, (v) => { D.redimensionavel = v; mudou(); }, 'Os elementos seguem as restrições de cada um.');
      chave(s1, 'Tela com rolagem (dá para descer)', D.rolagem, (v) => { D.rolagem = v; if (v && D.alturaVisivel >= D.altura) { D.alturaVisivel = D.altura; redimJanela(D.largura, Math.max(D.altura, Math.round(D.altura * 1.8))); return; } mudou(); }, 'A janela mostra só uma parte e a pessoa desce com a rodinha do mouse para ler e achar o resto.');
      if (D.rolagem) {
        const gr = linha(s1, 1);
        campoNum(gr, 'Visível', D.alturaVisivel, (v) => { D.alturaVisivel = Math.max(120, Math.min(D.altura, v)); mudou(); }, { min: 120, max: D.altura });
        s1.appendChild(el(`<div class="dim" style="font-size:11.5px;line-height:1.45">A linha tracejada na tela mostra até onde aparece sem rolar. Para ter mais espaço para baixo, aumente a altura (A) da janela. Elementos com restrição “Base” ficam no fim da página.</div>`));
      }
      const s2 = sec('Aparência');
      seg(s2, 'Tema', D.tema, [['claro', 'Claro'], ['escuro', 'Escuro']], (v) => { D.tema = v; mudou(); });
      corCampo(s2, 'Cor principal (botões, destaques)', D.cor, (v) => { D.cor = v || '#3A6AE0'; mudou(); });
      corCampo(s2, 'Fundo da janela', D.fundo, (v) => { D.fundo = v; mudou(); }, CORES_TEMA[D.tema].bg);
      const s3 = sec('Grade e encaixe');
      chave(s3, 'Mostrar a grade', S.grade, alternarGrade);
      const g3 = linha(s3, 1);
      campoNum(g3, 'Grade', S.gradeTam, (v) => { S.gradeTam = v; salvarConfig({ designer: { gradeTam: v } }); pintarMundo(); pintarProps(); }, { min: 2, max: 100 });
      chave(s3, 'Encaixar na grade', S.encaixeGrade, () => { S.encaixeGrade = !S.encaixeGrade; salvarConfig({ designer: { encaixeGrade: S.encaixeGrade } }); pintarProps(); });
      chave(s3, 'Encaixe inteligente', S.encaixe, alternarEncaixe, 'Alinha com bordas e centros de outros elementos. Segure Ctrl para desligar na hora.');
      chave(s3, 'Réguas', S.reguas, alternarReguas, 'Arraste da régua para criar uma guia.');
      const s4 = sec('Arquivos desta tela');
      s4.appendChild(el(`<div class="muted" style="font-size:12px;line-height:1.65"><span class="mono">ui/${esc(D.nome)}.pyforge.json</span>: o desenho<br><span class="mono">ui/${esc(D.nome)}_ui.py</span>: código gerado (refeito ao salvar)<br><span class="mono">${esc(D.nome)}.py</span>: <strong>seu</strong> código, nunca é sobrescrito</div>`));
      c.scrollTop = rol;
      return;
    }

    // ----- vários -----
    if (sel.length > 1) {
      const grupos = new Set(sel.map((e) => e.grupo).filter(Boolean));
      const ehGrupo = grupos.size === 1 && sel.every((e) => e.grupo);
      c.appendChild(el(`<div class="ps-cab"><span class="icone-q" style="width:30px;height:30px">${ic(ehGrupo ? 'agrupar' : 'modelos', 16)}</span><div class="grow"><div style="font-size:13px;font-weight:600">${ehGrupo ? 'Grupo' : sel.length + ' elementos'}</div><div class="dim" style="font-size:12px">${ehGrupo ? sel.length + ' elementos · Ctrl+clique edita um só' : 'Shift+clique soma ou tira da seleção'}</div></div>
        ${ehGrupo ? `<button class="ib peq" data-desag title="Desagrupar (Ctrl+Shift+G)" aria-label="Desagrupar">${ic('desagrupar', 14)}</button>` : `<button class="ib peq" data-ag title="Agrupar (Ctrl+G)" aria-label="Agrupar">${ic('agrupar', 14)}</button>`}
        <button class="ib peq" data-dup title="Duplicar (Ctrl+D)" aria-label="Duplicar">${ic('duplicar', 14)}</button><button class="ib peq" data-del title="Apagar (Delete)" aria-label="Apagar">${ic('lixo', 14)}</button></div>`));
      c.querySelector('[data-ag]') && (c.querySelector('[data-ag]').onclick = agrupar);
      c.querySelector('[data-desag]') && (c.querySelector('[data-desag]').onclick = desagrupar);
      c.querySelector('[data-dup]').onclick = () => duplicarSelecao(16, true);
      c.querySelector('[data-del]').onclick = apagarSelecao;
      botoesAlinhar();
      const b = caixaDe(sel);
      const s1 = sec('Posição e tamanho do conjunto');
      const g = linha(s1);
      campoNum(g, 'X', Math.round(b.x), (v) => aplicar((e) => { e.x += v - b.x; }));
      campoNum(g, 'Y', Math.round(b.y), (v) => aplicar((e) => { e.y += v - b.y; }));
      const igual = (k) => (sel.every((e) => e[k] === sel[0][k]) ? sel[0][k] : null);
      campoNum(g, 'L\u200b', igual('w'), (v) => aplicar((e) => { e.w = Math.max(1, v); }), { min: 1 });
      campoNum(g, 'A\u200b', igual('h'), (v) => aplicar((e) => { e.h = Math.max(1, v); }), { min: 1 });
      const s2 = sec('Restrições');
      selecao(s2, 'Horizontal', igual('rh') || '', [...(igual('rh') ? [] : [['', 'Misto']]), ...REST_H], (v) => v && aplicar((e) => { e.rh = v; }));
      selecao(s2, 'Vertical', igual('rv') || '', [...(igual('rv') ? [] : [['', 'Misto']]), ...REST_V], (v) => v && aplicar((e) => { e.rv = v; }));
      const comFundo = sel.filter((e) => 'fundo' in e);
      const comTexto = sel.filter((e) => 'corTexto' in e);
      if (comFundo.length || comTexto.length) {
        const s3 = sec('Cores');
        if (comFundo.length) corCampo(s3, `Fundo (${comFundo.length})`, comFundo.every((e) => e.fundo === comFundo[0].fundo) ? comFundo[0].fundo : '', (v) => aplicar((e) => { if ('fundo' in e) e.fundo = v; }), '');
        if (comTexto.length) corCampo(s3, `Texto (${comTexto.length})`, comTexto.every((e) => e.corTexto === comTexto[0].corTexto) ? comTexto[0].corTexto : '', (v) => aplicar((e) => { if ('corTexto' in e) e.corTexto = v; }), '');
      }
      c.scrollTop = rol;
      return;
    }

    // ----- um elemento -----
    const e = sel[0];
    const T = TIPOS[e.tipo];
    const cab = el(`<div class="ps-cab"><span class="icone-q" style="width:30px;height:30px">${ic(T.icone, 16)}</span><div class="grow" style="min-width:0"><div class="mono ellipsis" style="font-size:13px">${esc(e.nome)}</div><div class="dim" style="font-size:12px">${esc(T.nome)}${e.grupo ? ' · em grupo' : ''}${e.bloqueado ? ' · travado' : ''}</div></div>
      <button class="ib peq" data-dup title="Duplicar (Ctrl+D)" aria-label="Duplicar">${ic('duplicar', 14)}</button><button class="ib peq" data-del title="Apagar (Delete)" aria-label="Apagar">${ic('lixo', 14)}</button></div>`);
    cab.querySelector('[data-dup]').onclick = () => duplicarSelecao(16, true);
    cab.querySelector('[data-del]').onclick = apagarSelecao;
    c.appendChild(cab);
    botoesAlinhar();
    const set = (k) => (v) => { e[k] = v; mudou(); };
    const s0 = sec('Nome no código');
    campoTxt(s0, '', e.nome, (v) => renomear(e, v.trim()), { mono: true, k: 'nome', dica: `No seu código: <span class="mono">self.${esc(e.nome)}</span>` });
    const s1 = sec('Posição e tamanho');
    const g = linha(s1);
    campoNum(g, 'X', e.x, set('x'), { k: 'x' });
    campoNum(g, 'Y', e.y, set('y'), { k: 'y' });
    campoNum(g, 'L\u200b', e.w, set('w'), { min: 1, k: 'w' });
    campoNum(g, 'A\u200b', e.h, set('h'), { min: 1, k: 'h' });
    // restrições com diagrama clicável (como no Figma)
    const s1b = sec('Restrições', `<span class="dim" style="font-size:11px;font-weight:500;text-transform:none;letter-spacing:0">quando a janela muda de tamanho</span>`);
    const diag = el(`<div class="rest"><div class="rest-d" aria-hidden="true">
      <i class="rb e ${['esq', 'esqdir'].includes(e.rh) ? 'on' : ''}" data-r="h:esq"></i><i class="rb d ${['dir', 'esqdir'].includes(e.rh) ? 'on' : ''}" data-r="h:dir"></i>
      <i class="rb t ${['topo', 'topobase'].includes(e.rv) ? 'on' : ''}" data-r="v:topo"></i><i class="rb b ${['base', 'topobase'].includes(e.rv) ? 'on' : ''}" data-r="v:base"></i>
      <i class="rb ch ${e.rh === 'centro' ? 'on' : ''}" data-r="h:centro"></i><i class="rb cv ${e.rv === 'centro' ? 'on' : ''}" data-r="v:centro"></i><span class="rest-c"></span></div><div class="rest-s grow"></div></div>`);
    diag.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
      const [eixo, v] = b.dataset.r.split(':');
      if (eixo === 'h') e.rh = v === 'esq' ? (e.rh === 'dir' ? 'esqdir' : e.rh === 'esqdir' ? 'dir' : 'esq') : v === 'dir' ? (e.rh === 'esq' ? 'esqdir' : e.rh === 'esqdir' ? 'esq' : 'dir') : 'centro';
      else e.rv = v === 'topo' ? (e.rv === 'base' ? 'topobase' : e.rv === 'topobase' ? 'base' : 'topo') : v === 'base' ? (e.rv === 'topo' ? 'topobase' : e.rv === 'topobase' ? 'topo' : 'base') : 'centro';
      mudou();
    }));
    s1b.appendChild(diag);
    const rs = diag.querySelector('.rest-s');
    selecao(rs, 'Horizontal', e.rh, REST_H, set('rh'));
    selecao(rs, 'Vertical', e.rv, REST_V, set('rv'));

    // conteúdo
    const sC = sec('Conteúdo');
    let temConteudo = true;
    switch (e.tipo) {
      case 'texto': campoTxt(sC, 'Texto', e.texto, set('texto'), { area: true, linhas: 3, k: 'texto' }); break;
      case 'botao': case 'caixa': case 'opcao': campoTxt(sC, 'Texto', e.texto, set('texto'), { k: 'texto' }); break;
      case 'campo': case 'area':
        campoTxt(sC, 'Texto de exemplo (placeholder)', e.placeholder, set('placeholder'), { k: 'placeholder' });
        campoTxt(sC, 'Texto inicial', e.texto, set('texto'), { area: e.tipo === 'area', linhas: 2 });
        if (e.tipo === 'campo') chave(sC, 'Esconder o texto (senha)', e.senha, set('senha'));
        break;
      case 'numero': { const gn = linha(sC); campoNum(gn, 'Mín', e.minimo, set('minimo')); campoNum(gn, 'Máx', e.maximo, set('maximo')); campoNum(gn, 'Valor', e.valor, set('valor')); campoNum(gn, 'Passo', e.passo, set('passo'), { min: 1 }); break; }
      case 'slider': { const gn = linha(sC, 3); campoNum(gn, 'Mín', e.minimo, set('minimo')); campoNum(gn, 'Máx', e.maximo, set('maximo')); campoNum(gn, 'Valor', e.valor, set('valor')); break; }
      case 'progresso': { const gn = linha(sC, 1); campoNum(gn, 'Valor %', e.valor, set('valor'), { min: 0, max: 100 }); break; }
      case 'combo': case 'lista': campoTxt(sC, 'Itens (um por linha)', e.itens, set('itens'), { area: true, linhas: 4, k: 'itens' }); break;
      case 'tabela':
        campoTxt(sC, 'Colunas (separadas por vírgula)', e.colunas, set('colunas'), { k: 'itens' });
        campoTxt(sC, 'Linhas (uma por linha, valores com vírgula)', e.linhas, set('linhas'), { area: true, linhas: 4 });
        break;
      case 'imagem': {
        if (e.arquivo) sC.appendChild(el(`<div class="ps-img"><img src="${esc(urlImagem(e.arquivo))}" alt=""><span class="mono ellipsis">${esc(e.arquivo)}</span></div>`));
        const bts = el(`<div class="flex" style="gap:6px;flex-wrap:wrap"><button class="btn peq pri" data-esc>${ic('imagem', 13)}${e.arquivo ? 'Trocar imagem' : 'Escolher imagem'}</button>${e.arquivo ? `<button class="btn peq" data-nat title="Volta ao tamanho original da imagem">Tamanho original</button>` : ''}</div>`);
        bts.querySelector('[data-esc]').onclick = () => escolherImagem(e.id);
        const nat = bts.querySelector('[data-nat]');
        if (nat) nat.onclick = async () => { const n = await tamanhoNatural(urlImagem(e.arquivo)); if (n) { e.w = n.w; e.h = n.h; mudou(); } };
        sC.appendChild(bts);
        const sl = el(`<div class="prop"><label class="rotulo">Ou uma imagem que já está no projeto</label><select class="sel campo" data-lista-img><option value="">Carregando…</option></select></div>`);
        sC.appendChild(sl);
        (S.imagens ? Promise.resolve(S.imagens) : listarImagens()).then((lista) => {
          const s = sl.querySelector('select');
          s.innerHTML = `<option value="">${lista.length ? 'Escolher…' : 'Nenhuma imagem no projeto ainda'}</option>` + lista.map((x) => `<option value="${esc(x)}" ${x === e.arquivo ? 'selected' : ''}>${esc(x)}</option>`).join('');
          s.onchange = () => { if (s.value) { e.arquivo = s.value; mudou(); } };
        });
        seg(sC, 'Ajuste', e.ajuste, [['conter', 'Caber'], ['cobrir', 'Cobrir'], ['esticar', 'Esticar']], set('ajuste'));
        sC.appendChild(el('<div class="dim" style="font-size:11.5px">As imagens ficam na pasta <span class="mono">assets</span> e vão junto no .exe. Dá para arrastar imagens do computador direto para a tela.</div>'));
        break;
      }
      default: temConteudo = false;
    }
    if (e.tipo === 'caixa' || e.tipo === 'opcao') chave(sC, 'Começa marcada', e.marcado, set('marcado'));
    if (e.tipo === 'opcao') campoTxt(sC, 'Grupo (só uma marcada por grupo)', e.grupoOpcao, (v) => { if (nomeOk(v)) { e.grupoOpcao = v; mudou(); } else { toast('Nome de grupo inválido.', 'err'); pintarProps(); } }, { mono: true });
    if (!temConteudo && !['caixa', 'opcao'].includes(e.tipo)) sC.remove();

    // texto (fonte)
    if ('tamanho' in e) {
      const sT = sec('Texto');
      if ('fonte' in e) selecao(sT, 'Fonte', e.fonte, FONTES.map((f) => [f, f || 'Padrão (Segoe UI)']), set('fonte'));
      const gt = el('<div class="flex" style="gap:8px;align-items:flex-end"></div>');
      sT.appendChild(gt);
      const gn = el('<div style="width:96px"></div>');
      gt.appendChild(gn);
      campoNum(gn, 'Tam', e.tamanho, set('tamanho'), { min: 6, max: 200 });
      if ('negrito' in e) {
        const bi = el(`<div class="seg ps-seg"><button class="${e.negrito ? 'on' : ''}" title="Negrito" aria-label="Negrito" aria-pressed="${e.negrito}">${ic('negrito', 14)}</button><button class="${e.italico ? 'on' : ''}" title="Itálico" aria-label="Itálico" aria-pressed="${e.italico}">${ic('italico', 14)}</button></div>`);
        const [bn, bit] = bi.querySelectorAll('button');
        bn.onclick = () => { e.negrito = !e.negrito; mudou(); };
        bit.onclick = () => { e.italico = !e.italico; mudou(); };
        gt.appendChild(bi);
      }
      if (e.tipo === 'texto') {
        seg(sT, 'Alinhamento', e.alinhar, [['esquerda', 'Esquerda', 'txtEsq'], ['centro', 'Centro', 'txtCentro'], ['direita', 'Direita', 'txtDir']], set('alinhar'));
        seg(sT, 'Vertical', e.alinharV, [['topo', 'Topo', 'alTopo'], ['meio', 'Meio', 'alMeio'], ['base', 'Base', 'alBase']], set('alinharV'));
        chave(sT, 'Quebrar linhas', e.quebra, set('quebra'));
      }
      if ('corTexto' in e) corCampo(sT, 'Cor do texto', e.corTexto, set('corTexto'), cor({ ...e, corTexto: '' }, 'corTexto', D));
    }

    // aparência
    const sA = sec('Aparência');
    let temAp = false;
    if (e.tipo === 'botao') { temAp = true; seg(sA, 'Estilo', e.primario ? 'p' : 's', [['p', 'Principal'], ['s', 'Secundário']], (v) => { e.primario = v === 'p'; mudou(); }); }
    if ('fundo' in e) { temAp = true; corCampo(sA, e.tipo === 'texto' ? 'Fundo (vazio = transparente)' : 'Fundo', e.fundo, set('fundo'), cor({ ...e, fundo: '' }, 'fundo', D)); }
    if ('cor' in e) { temAp = true; corCampo(sA, e.tipo === 'linha' ? 'Cor da linha' : 'Cor', e.cor, set('cor'), cor({ ...e, cor: '' }, 'cor', D)); }
    if ('borda' in e) {
      temAp = true;
      corCampo(sA, 'Borda', e.borda, set('borda'), cor({ ...e, borda: '' }, 'borda', D));
      if ('bordaLargura' in e) { const gb = linha(sA, 1); campoNum(gb, 'Espessura', e.bordaLargura, set('bordaLargura'), { min: 0, max: 40 }); }
    }
    if ('raio' in e) {
      temAp = true;
      const rw = el(`<div class="prop"><span class="rotulo">Cantos arredondados: <span data-rv>${e.raio}</span> px</span><input type="range" min="0" max="${Math.max(40, Math.ceil(Math.min(e.w, e.h) / 2))}" value="${e.raio}" style="accent-color:var(--ac)" aria-label="Raio dos cantos"></div>`);
      const r = rw.querySelector('input');
      r.oninput = () => { rw.querySelector('[data-rv]').textContent = r.value; const d = mundo.querySelector(`.de[data-id="${e.id}"] .de-in`); if (d) d.style.borderRadius = r.value + 'px'; };
      r.onchange = () => { e.raio = +r.value; mudou(); };
      sA.appendChild(rw);
    }
    if ('sombra' in e) { temAp = true; chave(sA, 'Sombra', e.sombra, set('sombra'), S.toolkit === 'tkinter' ? 'O Tkinter não desenha sombra.' : ''); }
    if (!temAp) sA.remove();
    if (S.toolkit === 'tkinter' && (e.raio || e.dica || (e.tipo === 'campo' && false))) {
      sA.isConnected && sA.appendChild(el('<div class="dim" style="font-size:11.5px">No Tkinter não existem cantos arredondados nem dicas ao passar o mouse; o resto fica igual.</div>'));
    }

    // comportamento
    const sB = sec('Comportamento');
    chave(sB, 'Visível ao abrir', e.visivel, (v) => { e.visivel = v; if (!v) S.sel = []; mudou(); }, 'No código: self.mostrar(...) / self.esconder(...)');
    if (!['retangulo', 'elipse', 'linha', 'imagem', 'texto', 'progresso'].includes(e.tipo)) chave(sB, 'Habilitado', e.habilitado, set('habilitado'));
    chave(sB, 'Travado no Designer', e.bloqueado, set('bloqueado'), 'Não sai do lugar sem querer.');
    campoTxt(sB, 'Dica ao passar o mouse', e.dica, set('dica'), { ph: 'opcional' });

    // animação ao abrir
    const sN = sec('Animação', `<span class="dim" style="font-size:11px;font-weight:500;text-transform:none;letter-spacing:0">quando a tela abre</span>`);
    selecao(sN, 'Efeito', e.animacao, ANIMACOES_ABRIR, (v) => { e.animacao = v; mudou(); if (v) setTimeout(() => tocarAnimacao(e), 60); });
    if (e.animacao) {
      const gn = linha(sN, 2);
      campoNum(gn, 'ms', e.animMs, (v) => { e.animMs = v; mudou(); }, { min: 50, max: 10000 });
      campoNum(gn, 'Espera', e.animAtraso, (v) => { e.animAtraso = v; mudou(); }, { min: 0, max: 60000 });
      const bt = el(`<button class="btn peq" style="align-self:flex-start">${ic('play', 13)}Ver animação</button>`);
      bt.onclick = () => tocarAnimacao(e);
      sN.appendChild(bt);
      sN.appendChild(el('<div class="dim" style="font-size:11.5px;line-height:1.45">“Espera” é quanto esperar antes de começar (em ms): dá para fazer os elementos entrarem um depois do outro. No código: self.animar(self.' + esc(e.nome) + ', "pulsar")</div>'));
    }

    // eventos
    const evs = EVENTOS[e.tipo];
    if (evs) {
      const sE = sec('Eventos');
      for (const [campo, rot] of evs) {
        campoTxt(sE, rot + ' → chama o método', e[campo], (v) => {
          v = v.trim();
          if (v && !nomeOk(v)) { toast('Nome de método inválido.', 'err'); pintarProps(); return; }
          e[campo] = v; mudou();
        }, { mono: true, ph: metodoSugerido(e, campo) });
        if (!e[campo]) {
          const b = el(`<button class="btn peq" style="align-self:flex-start">${ic('mais', 13)}Criar evento</button>`);
          b.onclick = () => { e[campo] = metodoSugerido(e, campo); mudou(); };
          sE.appendChild(b);
        }
      }
      const bf = el(`<button class="btn peq pri" style="align-self:flex-start">${ic('brilho', 13)}Ligar a funções sem código (aba Funções)</button>`);
      bf.onclick = () => irModo('funcoes');
      sE.appendChild(bf);
      if (evs.some(([campo]) => e[campo])) {
        const b = el(`<button class="btn peq" style="align-self:flex-start">${ic('codigo', 13)}Escrever o código em ${esc(D.nome)}.py</button>`);
        b.onclick = async () => { if (S.sujo && !(await salvar())) return; ir('/editor?' + q({ p: S.raiz, f: juntar(S.raiz, D.nome + '.py') })); };
        sE.appendChild(b);
      }
    }
    c.scrollTop = rol;
  }

  function redimJanela(W1, H1) {
    const W0 = S.D.largura, H0 = S.D.altura;
    W1 = Math.round(lim(W1, 160, 4000)); H1 = Math.round(lim(H1, 120, 4000));
    for (const e of els()) Object.assign(e, reposicionar(e, W0, H0, W1, H1));
    S.D.largura = W1; S.D.altura = H1;
    mudou();
  }

  // ====================================================================== pintura geral
  function pintarModos() {
    ui.querySelectorAll('[data-m]').forEach((b) => { b.classList.toggle('on', b.dataset.m === S.modo); b.setAttribute('aria-checked', b.dataset.m === S.modo); });
    ui.querySelectorAll('[data-k]').forEach((b) => { b.classList.toggle('on', b.dataset.k === S.toolkit); b.setAttribute('aria-checked', b.dataset.k === S.toolkit); });
    area.style.display = S.modo === 'codigo' || S.modo === 'funcoes' ? 'none' : '';
    $('[data-codigo]').style.display = S.modo === 'codigo' || S.modo === 'dividido' ? 'flex' : 'none';
    $('[data-funcoes]').style.display = S.modo === 'funcoes' ? 'flex' : 'none';
    ui.querySelectorAll('[data-e]').forEach((b) => b.classList.toggle('on', b.dataset.e === S.esq));
    ui.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', b.dataset.d === S.dir));
    $('[data-props]').style.display = S.dir === 'props' ? '' : 'none';
    $('[data-ia]').style.display = S.dir === 'ia' ? 'flex' : 'none';
    $('[data-undo]').disabled = S.histI <= 0;
    $('[data-redo]').disabled = S.histI >= S.hist.length - 1;
    $('[data-tg]').classList.toggle('on', S.grade);
    $('[data-te]').classList.toggle('on', S.encaixe);
    $('[data-tr]').classList.toggle('on', S.reguas);
  }
  function pintarStatus() {
    const n = els().length;
    const sel = selecionados();
    const b = caixaSel();
    $('[data-st1]').textContent = `${S.D.nome} · ` + fmt(n === 1 ? '{n} elemento' : '{n} elementos', { n }) + (sel.length === 1 ? ` · ${sel[0].nome} (${b.x}, ${b.y}) ${b.w}×${b.h}` : sel.length > 1 ? fmt(' · {n} selecionados', { n: sel.length }) : fmt(' · janela {w}×{h}', { w: S.D.largura, h: S.D.altura }));
    $('[data-st2]').textContent = (S.sujo ? 'Não salvo · ' : 'Salvo · ') + (S.toolkit === 'tkinter' ? 'Tkinter' : 'PySide6');
  }
  function pintarTudoSemMundo() { pintarModos(); pintarEsquerda(); pintarOverlay(); pintarReguas(); pintarProps(); pintarStatus(); }
  function pintarTudo() { pintarModos(); pintarEsquerda(); pintarMundo(); pintarProps(); atualizarCodigo(); pintarStatus(); if (S.modo === 'funcoes' && fnEd) fnEd.pintar(); }

  function alternarGrade() { S.grade = !S.grade; salvarConfig({ designer: { grade: S.grade } }); pintarModos(); aplicarCamera(); pintarProps(); }
  function alternarEncaixe() { S.encaixe = !S.encaixe; salvarConfig({ designer: { encaixe: S.encaixe } }); pintarModos(); pintarProps(); toast(S.encaixe ? 'Encaixe inteligente ligado.' : 'Encaixe inteligente desligado.', 'info', 1600); }
  function alternarReguas() { S.reguas = !S.reguas; salvarConfig({ designer: { reguas: S.reguas } }); pintarModos(); pintarReguas(); pintarProps(); requestAnimationFrame(aplicarCamera); }

  // ====================================================================== código
  function gerar() { atualizarProjeto(); return S.toolkit === 'tkinter' ? gerarTk(S.D) : gerarQt(S.D); }
  let mon = null, arqCodigo = 'ui';
  async function atualizarCodigo() {
    if (S.modo === 'design' || S.modo === 'funcoes') return;
    const g = gerar();
    const texto = arqCodigo === 'ui' ? g.ui : g.usuario;
    $('[data-cod-info]').textContent = arqCodigo === 'ui' ? `ui/${S.D.nome}_ui.py · refeito ao salvar` : `${S.D.nome}.py · criado uma vez, depois é seu`;
    ui.querySelectorAll('[data-a]').forEach((b) => b.classList.toggle('on', b.dataset.a === arqCodigo));
    const m = await carregarMonaco();
    if (!S) return;
    if (!mon) mon = m.editor.create($('[data-mon]'), { value: texto, language: 'python', theme: 'pyforge', readOnly: true, automaticLayout: true, minimap: { enabled: false }, fontSize: cfg('editor.tamanhoFonte', 14), fontFamily: cfg('editor.fonte', 'JetBrains Mono, Cascadia Code, Consolas, monospace'), scrollBeyondLastLine: false, padding: { top: 8 } });
    else if (mon.getValue() !== texto) mon.setValue(texto);
  }
  ui.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => { arqCodigo = b.dataset.a; atualizarCodigo(); }));

  // ====================================================================== salvar, rodar, exe
  async function salvar(silencioso = false) {
    finalizarEdicao(true);
    const g = gerar();
    const D = S.D;
    try {
      const r = await api('designer/salvar', { raiz: S.raiz, nome: D.nome, design: D, arquivoUI: `ui/${D.nome}_ui.py`, codigoUI: g.ui, arquivoUsuario: `${D.nome}.py`, codigoUsuario: g.usuario });
      S.salvo = JSON.stringify(D);
      S.sujo = false;
      await carregarTelas();
      // as outras telas também são refeitas (mesmo PySide6/Tkinter e variáveis compartilhadas em dia)
      await regerarOutras(D);
      // variáveis compartilhadas entre as telas: ui/estado.py
      const estado = gerarEstado(S.telas.map((t) => (t.nome === D.nome ? D : t.design)).concat(S.telas.some((t) => t.nome === D.nome) ? [] : [D]));
      if (estado) await api('fs/escrever', { caminho: juntar(juntar(S.raiz, 'ui'), 'estado.py'), conteudo: estado }).catch((e) => toast('Não consegui salvar ui/estado.py: ' + e.message, 'err'));
      pintarSelectTelas(); pintarStatus();
      if (!silencioso) toast(r.criouUsuario ? `Salvo! Criei ${D.nome}.py: escreva ali o que cada botão faz.` : 'Tela salva e código gerado.', 'ok');
      return true;
    } catch (e) { toast(e.message, 'err'); return false; }
  }

  /** Refaz o código (ui/<nome>_ui.py) das outras telas do projeto. O arquivo da pessoa nunca é tocado. */
  async function regerarOutras(D) {
    for (const t of S.telas) {
      if (t.nome === D.nome || !t.design) continue;
      try {
        const D2 = normalizar(JSON.parse(JSON.stringify(t.design)));
        const g = S.toolkit === 'tkinter' ? gerarTk(D2) : gerarQt(D2);
        await api('designer/salvar', { raiz: S.raiz, nome: D2.nome, design: D2, arquivoUI: `ui/${D2.nome}_ui.py`, codigoUI: g.ui, arquivoUsuario: `${D2.nome}.py`, codigoUsuario: g.usuario });
      } catch { /* tela com problema: fica como estava */ }
    }
    atualizarProjeto();
  }

  function pacotesExtras() {
    const com = [];
    if (S.toolkit === 'pyside6' && !S.deps.some((d) => /pyside6/i.test(d))) com.push('pyside6-essentials');
    if (S.toolkit === 'tkinter' && els().some((e) => e.tipo === 'imagem' && e.arquivo) && !S.deps.some((d) => /pillow/i.test(d))) com.push('pillow');
    return com;
  }
  function abrirSaida(titulo) {
    const box = $('[data-saida]');
    box.style.display = 'flex';
    $('[data-saida-tit]').textContent = titulo;
    const txt = $('[data-saida-txt]');
    txt.innerHTML = '';
    return txt;
  }
  const escreverSaida = (txt, cls, s) => { const sp = document.createElement('span'); if (cls) sp.className = cls; sp.textContent = s; txt.appendChild(sp); txt.scrollTop = 1e9; };

  async function rodar(gif = false) {
    gif = gif === true;
    if (!(await salvar())) return;
    const com = pacotesExtras();
    const txt = abrirSaida(gif ? 'Gravando GIF' : 'Saída da tela');
    escreverSaida(txt, 's', `▶ Rodando ${S.D.nome}.py${gif ? ' e gravando a janela' : ''}${com.includes('pyside6-essentials') ? ' (baixando o PySide6 na primeira vez, pode demorar um pouco)' : ''}…\n`);
    let saida = '';
    let bt = null;
    try {
      const r = await iniciarJob({ tipo: 'executar', raiz: S.raiz, arquivo: `${S.D.nome}.py`, com, gif }, (ev) => {
        if (ev.t === 'o' || ev.t === 'e') { saida += ev.d; const d = ev.d.includes(MARCA_GIF) ? filtrarGif(ev.d).texto : ev.d; if (d) escreverSaida(txt, ev.t === 'e' ? 'e' : '', d); }
        if (ev.t === 'fim') {
          if (bt) bt.remove();
          escreverSaida(txt, ev.c === 0 ? 'v' : 's', `\n${ev.c === 0 ? '✓ A janela foi fechada.' : '■ Terminou com código ' + ev.c}\n`);
          const g = gif && filtrarGif(saida).info;
          if (g) { mostrarGif(g); const b2 = el(`<button class="btn peq" style="margin:6px 0">${ic('play', 13)}Ver o GIF de novo</button>`); b2.onclick = () => mostrarGif(g); txt.appendChild(b2); }
        }
      });
      if (gif) {
        bt = el(`<button class="btn peq perigo" style="margin:6px 0">${ic('parar', 13)}Parar gravação</button>`);
        bt.onclick = () => { bt.disabled = true; pararGravacao(r.id); };
        txt.appendChild(bt);
      }
      api('stats', { tipo: 'execucoes' }).catch(() => {});
    } catch (e) { toast(e.message, 'err'); }
    if (com.length) {
      const dica = el(`<div style="margin:6px 0" class="flex"><span class="muted" style="font-size:12.5px">Deixar ${esc(com.join(' e '))} instalado de vez no projeto?</span><button class="btn peq">Adicionar ao projeto</button></div>`);
      dica.querySelector('button').onclick = () => { for (const p of com) iniciarJob({ tipo: 'instalar', raiz: S.raiz, pacote: p }, (ev) => { if (ev.t === 'fim' && ev.c === 0) { S.deps.push(p); toast(p + ' adicionado ao projeto.', 'ok'); } }); dica.remove(); };
      txt.appendChild(dica);
    }
  }

  async function gerarExe() {
    if (!(await salvar())) return;
    dialogoExe({
      raiz: S.raiz, nomeProjeto: S.nomeProjeto, deps: S.deps, arquivoInicial: juntar(S.raiz, S.D.nome + '.py'),
      rodar: (pedido, titulo, aoFim) => {
        pedido.com = [...new Set([...(pedido.com || []), ...pacotesExtras()])];
        const txt = abrirSaida('Gerar executável');
        escreverSaida(txt, 's', '▶ ' + titulo + '\n');
        iniciarJob(pedido, (ev) => {
          if (ev.t === 'o' || ev.t === 'e') escreverSaida(txt, '', ev.d);
          if (ev.t === 'fim') { escreverSaida(txt, ev.c === 0 ? 'v' : 'e', ev.c === 0 ? '\n✓ Pronto\n' : `\n✗ Terminou com erro (código ${ev.c})\n`); aoFim(ev.c === 0); }
        }).catch((e) => toast(e.message, 'err'));
      },
      anexar: (no) => { const t = $('[data-saida-txt]'); t.appendChild(no); t.scrollTop = 1e9; },
    });
  }

  function mostrarAtalhos() {
    const corpo = el(`<div class="atalhos">${ATALHOS.map(([g, itens]) => `<div><div class="secao-t" style="margin-bottom:6px">${esc(g)}</div>${itens.map(([k, d]) => `<div class="flex" style="gap:10px;padding:3px 0"><span class="kbd-chip" style="min-width:150px;display:inline-block">${esc(k)}</span><span class="muted" style="font-size:12.5px">${esc(d)}</span></div>`).join('')}</div>`).join('')}</div>`);
    modal({ titulo: 'Atalhos do Designer', corpo, largo: true, botoes: [{ texto: 'Fechar', classe: 'pri' }] });
  }

  // ====================================================================== IA
  const chat = criarChat($('[data-ia]'), {
    chaveHistorico: 'designer:' + S.raiz,
    titulo: 'IA do Designer',
    boasVindas: 'Descreva a tela que você quer (ex.: “uma tela de login com usuário, senha e botão Entrar”) ou peça uma mudança. Eu desenho e você aplica com um clique.',
    sugestoes: ['Tela de login bonita com cartão no meio', 'Calculadora de IMC', 'Lista de tarefas com campo, botão Adicionar e lista'],
    obterContexto: () => `# Onde o usuário está
No DESIGNER DE INTERFACE do PyForge (posição livre, como no Figma), projeto “${S.nomeProjeto}”. Toolkit: ${S.toolkit}.

# Como responder
Para criar ou alterar a tela, responda com UM bloco \`\`\`json pyforge-tela\`\`\` com o design COMPLETO (não só o que mudou). O usuário clica em “Aplicar tela”. Depois do bloco, explique em 2 ou 3 frases o que fez e quais métodos de evento ele deve escrever em ${S.D.nome}.py.

# Formato (versão 2)
{"versao":2,"nome":"${S.D.nome}","titulo":"Título","largura":640,"altura":460,"tema":"claro"|"escuro","cor":"#RRGGBB","fundo":"" ou "#RRGGBB","redimensionavel":true,"elementos":[ ... ]}
Cada elemento: {"tipo":"...","nome":"identificador_python_unico","x":0,"y":0,"w":100,"h":30,"rh":"esq|dir|esqdir|centro|escala","rv":"topo|base|topobase|centro|escala", ...propriedades}
- x,y,w,h em pixels dentro da janela (0,0 = canto de cima à esquerda, sem a barra de título). Deixe margens de 24 a 32 px e espaços de 12 a 16 px entre elementos; alinhe as bordas.
- rh/rv dizem o que acontece quando a janela muda de tamanho: campos largos usam rh "esqdir"; botões no canto direito "dir"; rodapé rv "base".
- A ordem da lista é a ordem das camadas: o primeiro fica atrás (use "retangulo" como fundo de cartões ANTES dos elementos de cima).
- Cores vazias ("") usam o tema. Tamanhos de fonte em px.
Tipos e propriedades:
- texto: texto, tamanho, negrito, italico, corTexto, fundo, alinhar (esquerda|centro|direita), alinharV (topo|meio|base), fonte, quebra
- botao: texto, primario (true = cheio na cor principal), fundo, corTexto, borda, raio, tamanho, negrito, aoClicar ("ao_clicar_algo")
- campo: placeholder, texto, senha, raio, aoMudar, aoEnter
- area: placeholder, texto, raio
- numero: minimo, maximo, valor, passo, aoMudar
- caixa / opcao: texto, marcado, aoMudar; opcao também grupoOpcao
- combo / lista: itens ("A\\nB\\nC"), aoMudar
- slider: minimo, maximo, valor, cor, aoMudar
- progresso: valor (0-100), cor, raio
- tabela: colunas ("Nome, Idade"), linhas ("Ana, 30\\nBruno, 25")
- imagem: arquivo ("assets/logo.png", só se existir), ajuste (conter|cobrir|esticar)
- retangulo: fundo, borda, bordaLargura, raio, sombra
- elipse: fundo, borda, bordaLargura, sombra
- linha: cor (use h:1 ou 2 para horizontal)
Todos aceitam: visivel, habilitado, dica.

# Tela atual
\`\`\`json
${JSON.stringify(S.D)}
\`\`\``,
    aoJsonTela: (obj) => {
      try {
        obj.nome = S.D.nome;
        S.D = normalizar(obj);
        S.sel = [];
        mudou();
        requestAnimationFrame(ajustarTela);
        toast('Tela aplicada! Ctrl+Z desfaz.', 'ok');
      } catch (e) { toast('Não consegui aplicar: ' + e.message, 'err'); }
    },
  });

  // ====================================================================== botões e teclado
  $('[data-lobby]').onclick = () => ir('/lobby');
  $('[data-editor]').onclick = () => ir('/editor?' + q({ p: S.raiz }));
  $('[data-salvar]').onclick = () => salvar();
  $('[data-rodar]').onclick = () => rodar();
  $('[data-gif]').onclick = () => rodar(true);
  // ---------- Juntos (chat) ----------
  let jtPainel = null;
  const jtBtn = $('[data-juntos]');
  const pintarJtBtn = () => {
    jtBtn.querySelectorAll('.badge, .ponto-on').forEach((x) => x.remove());
    if (naoLidas()) jtBtn.appendChild(el(`<span class="badge">${naoLidas()}</span>`));
    else if (estaNaSala()) jtBtn.appendChild(el('<span class="ponto-on"></span>'));
  };
  const tirarJt = assinarJuntos(pintarJtBtn);
  jtBtn.onclick = () => {
    if (!jtPainel) {
      jtPainel = el(`<div class="jt-flutua"><div class="jt-flutua-cab"><span class="grow">JUNTOS</span><button class="ib peq" data-fechar-jt aria-label="Fechar">${ic('x', 14)}</button></div><div style="flex:1;min-height:0" data-jt></div></div>`);
      ui.style.position = 'relative';
      ui.appendChild(jtPainel);
      jtPainel.querySelector('[data-fechar-jt]').onclick = () => { jtPainel.style.display = 'none'; };
      painelJuntos(jtPainel.querySelector('[data-jt]'));
    } else jtPainel.style.display = jtPainel.style.display === 'none' ? '' : 'none';
    pintarJtBtn();
  };
  pintarJtBtn();
  $('[data-exe]').onclick = gerarExe;
  $('[data-undo]').onclick = desfazer;
  $('[data-redo]').onclick = refazer;
  $('[data-fsaida]').onclick = () => { $('[data-saida]').style.display = 'none'; };
  $('[data-zm]').onclick = () => zoomCentro(1 / 1.25);
  $('[data-zp]').onclick = () => zoomCentro(1.25);
  $('[data-zv]').onclick = menuZoom;
  $('[data-tg]').onclick = alternarGrade;
  $('[data-anim]').onclick = tocarTodas;
  $('[data-cel]').onclick = abrirCelular;
  $('[data-te]').onclick = alternarEncaixe;
  $('[data-tr]').onclick = alternarReguas;
  $('[data-ajuda]').onclick = mostrarAtalhos;
  $('[data-tema]').onclick = () => { S.D.tema = S.D.tema === 'claro' ? 'escuro' : 'claro'; mudou(); };
  ui.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => irModo(b.dataset.m)));
  function irModo(m) {
    S.modo = m;
    pintarModos();
    atualizarCodigo();
    if (m === 'funcoes') fnEd.pintar();
    requestAnimationFrame(() => { if (S.modo === 'design' || S.modo === 'dividido') ajustarTela(); });
  }
  ui.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { S.toolkit = b.dataset.k; salvarConfig({ designer: { toolkit: S.toolkit } }); pintarModos(); atualizarCodigo(); pintarStatus(); pintarProps(); }));
  ui.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => { S.esq = b.dataset.e; pintarModos(); pintarEsquerda(); }));
  ui.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { S.dir = b.dataset.d; pintarModos(); if (S.dir === 'ia') chat.focar(); }));

  const TECLA_FERR = { v: 'mover', h: 'mao', t: 'texto', r: 'retangulo', o: 'elipse', l: 'linha', i: 'imagem', b: 'botao', f: 'campo' };
  const teclas = (e) => {
    if (!S || !ui.isConnected) return;
    const alvoT = e.target;
    const digitando = alvoT.closest && alvoT.closest('input, textarea, select, .monaco-editor, [contenteditable]');
    const c = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (c && k === 's') { e.preventDefault(); salvar(); return; }
    if (e.key === 'F5') { e.preventDefault(); rodar(); return; }
    if (document.querySelector('.fundo-modal')) return;
    if (digitando) return;
    if ((S.modo === 'codigo' || S.modo === 'funcoes') && !c) return;
    if (S.modo === 'funcoes' && !['z', 'y'].includes(k)) return;
    if (e.key === 'Alt') { e.preventDefault(); if (!S.alt) { S.alt = true; pintarOverlay(); } return; }
    if (e.key === ' ') { e.preventDefault(); if (!S.espaco) { S.espaco = true; vp.classList.add('mao'); } return; }
    if (c && k === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }
    else if (c && (k === 'y' || (e.shiftKey && k === 'z'))) { e.preventDefault(); refazer(); }
    else if (c && k === 'c') { e.preventDefault(); copiar(); }
    else if (c && k === 'x') { e.preventDefault(); recortar(); }
    else if (c && k === 'v') { e.preventDefault(); colar(); }
    else if (c && k === 'd') { e.preventDefault(); duplicarSelecao(16, true); }
    else if (c && k === 'a') { e.preventDefault(); selecionarTudo(); }
    else if (c && k === 'g') { e.preventDefault(); if (e.shiftKey) desagrupar(); else agrupar(); }
    else if (c && e.shiftKey && k === 'h') { e.preventDefault(); alternarVisivel(); }
    else if (c && e.shiftKey && k === 'l') { e.preventDefault(); alternarTrava(); }
    else if (c && (e.code === 'BracketRight' || e.key === ']' || e.key === '}')) { e.preventDefault(); ordem(e.shiftKey ? 'frente' : 'avancar'); }
    else if (c && (e.code === 'BracketLeft' || e.key === '[' || e.key === '{')) { e.preventDefault(); ordem(e.shiftKey ? 'tras' : 'recuar'); }
    else if (c && (k === '0' || e.code === 'Digit0')) { e.preventDefault(); zoomCentro(1 / S.cam.z); }
    else if (c && (k === '=' || k === '+' || e.code === 'Equal' || e.code === 'NumpadAdd')) { e.preventDefault(); zoomCentro(1.25); }
    else if (c && (k === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract')) { e.preventDefault(); zoomCentro(1 / 1.25); }
    else if (c && (e.key === "'" || e.code === 'Quote')) { e.preventDefault(); alternarGrade(); }
    else if (e.altKey && !c && ['a', 'd', 'h', 'w', 's', 'v'].includes(e.code.replace('Key', '').toLowerCase())) {
      e.preventDefault();
      alinhar({ a: 'esq', d: 'dir', h: 'centroH', w: 'topo', s: 'base', v: 'meio' }[e.code.replace('Key', '').toLowerCase()]);
    }
    else if (e.shiftKey && (e.code === 'Digit1' || e.key === '!')) { e.preventDefault(); ajustarTela(); }
    else if (e.shiftKey && (e.code === 'Digit2' || e.key === '@')) { e.preventDefault(); zoomSelecao(); }
    else if (e.shiftKey && k === 'r' && !c) { e.preventDefault(); alternarReguas(); }
    else if (e.key === '?') { e.preventDefault(); mostrarAtalhos(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel.length) { e.preventDefault(); apagarSelecao(); }
    else if (e.key.startsWith('Arrow') && S.sel.length) {
      e.preventDefault();
      const p = e.shiftKey ? 10 : 1;
      empurrar(e.key === 'ArrowLeft' ? -p : e.key === 'ArrowRight' ? p : 0, e.key === 'ArrowUp' ? -p : e.key === 'ArrowDown' ? p : 0);
    }
    else if (e.key === 'Enter' && S.sel.length === 1) { e.preventDefault(); const el2 = porId(S.sel[0]); if (TIPOS[el2.tipo].temTexto) editarTexto(el2.id); else if (el2.tipo === 'imagem') escolherImagem(el2.id); }
    else if (e.key === 'Escape') { if (S.ferramenta !== 'mover') definirFerramenta('mover'); else { S.sel = []; pintarTudoSemMundo(); } }
    else if (!c && !e.altKey && !e.shiftKey && TECLA_FERR[k]) { definirFerramenta(TECLA_FERR[k]); }
  };
  const soltarTecla = (e) => {
    if (e.key === 'Alt' && S && S.alt) { S.alt = false; pintarOverlay(); }
    if (e.key === ' ' && S && S.espaco) { S.espaco = false; vp.classList.remove('mao'); }
  };
  const perdeuFoco = () => { if (!S) return; S.alt = false; S.espaco = false; vp.classList.remove('mao'); pintarOverlay(); };
  document.addEventListener('keydown', teclas);
  document.addEventListener('keyup', soltarTecla);
  window.addEventListener('blur', perdeuFoco);
  const aoRedimensionar = () => { if (S) { pintarReguas(); pintarOverlay(); } };
  const obs = new ResizeObserver(aoRedimensionar);
  obs.observe(vp);

  const fnEd = criarEditorFuncoes($('[data-funcoes]'), {
    D: () => S.D, mudou: () => mudou(), codigo: () => gerar().ui,
    trilha: () => [...S.trilha, S.D.nome], voltar: voltarTela, entrarTela: (nome) => entrarTela(nome), criarTelinha,
  });
  pintarFerramentas();
  if (alvo) carregarDesign(alvo.design, true); else carregarDesign(novoDesign('principal'), false);
  return () => {
    tirarJt();
    document.removeEventListener('keydown', teclas);
    document.removeEventListener('keyup', soltarTecla);
    window.removeEventListener('blur', perdeuFoco);
    obs.disconnect();
    fnEd.destruir();
    if (mon) mon.dispose();
    S = null;
  };
}
