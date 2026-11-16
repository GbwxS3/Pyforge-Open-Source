// "Planilha vira app": lê um .xlsx ou .csv e cria uma tela pronta com tabela, busca e
// formulário (adicionar, salvar alteração, apagar). Os dados ficam em dados/<nome>.csv.
import { criarBase, nomeOk, CORES_TEMA } from './designer_modelo.js';
import { logicaVazia } from './designer_logica.js';
import { el, esc, ic, toast, modal, fmt } from './ui.js';

export const MAX_CAMPOS = 8;
const MAX_LINHAS = 20000;

// ------------------------------------------------------------------ CSV
function decodificar(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('windows-1252').decode(bytes); }
}

export function lerCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const primeira = texto.split(/\r?\n/, 1)[0] || '';
  const conta = (c) => primeira.split(c).length - 1;
  const sep = [';', '\t', ',', '|'].sort((a, b) => conta(b) - conta(a))[0];
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c;
    } else if (c === '"' && campo === '') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

// ------------------------------------------------------------------ XLSX (um zip com XML dentro)
async function lerZip(buf) {
  const v = new DataView(buf);
  let fim = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw new Error('o arquivo não parece um .xlsx');
  const total = v.getUint16(fim + 10, true);
  let p = v.getUint32(fim + 16, true);
  const arquivos = new Map();
  const dec = new TextDecoder();
  for (let k = 0; k < total; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true);
    const nLen = v.getUint16(p + 28, true), xLen = v.getUint16(p + 30, true), cLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const nome = dec.decode(new Uint8Array(buf, p + 46, nLen));
    arquivos.set(nome, { metodo, comp, local });
    p += 46 + nLen + xLen + cLen;
  }
  return async (nome) => {
    const a = arquivos.get(nome);
    if (!a) return null;
    const ini = a.local + 30 + v.getUint16(a.local + 26, true) + v.getUint16(a.local + 28, true);
    const dados = new Uint8Array(buf, ini, a.comp);
    if (a.metodo === 0) return dec.decode(dados);
    const s = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(s).text();
  };
}

const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
const filhos = (n, tag) => [...n.getElementsByTagName(tag)];
function colunaIdx(ref) { let n = 0; for (const c of ref.replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; }
function dataDeSerial(n) {
  const d = new Date(Math.round((n - 25569) * 86400000));
  const p = (x) => String(x).padStart(2, '0');
  const hora = d.getUTCHours() || d.getUTCMinutes() ? ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : '';
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}${hora}`;
}

export async function lerXLSX(buf) {
  const ler = await lerZip(buf);
  const wb = xml(await ler('xl/workbook.xml') || '');
  const folha = filhos(wb, 'sheet')[0];
  if (!folha) throw new Error('a planilha não tem abas');
  const rid = folha.getAttribute('r:id') || folha.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  let alvo = 'worksheets/sheet1.xml';
  const rels = await ler('xl/_rels/workbook.xml.rels');
  if (rels) for (const r of filhos(xml(rels), 'Relationship')) if (r.getAttribute('Id') === rid) alvo = r.getAttribute('Target');
  alvo = alvo.replace(/^\/?xl\//, '').replace(/^\//, '');
  const compart = [];
  const ss = await ler('xl/sharedStrings.xml');
  if (ss) for (const si of filhos(xml(ss), 'si')) compart.push(filhos(si, 't').map((t) => t.textContent).join(''));
  // estilos: quais células são datas
  const ehData = [];
  const st = await ler('xl/styles.xml');
  if (st) {
    const sx = xml(st);
    const proprios = new Map(filhos(sx, 'numFmt').map((f) => [+f.getAttribute('numFmtId'), f.getAttribute('formatCode') || '']));
    const xfs = sx.getElementsByTagName('cellXfs')[0];
    if (xfs) for (const xf of filhos(xfs, 'xf')) {
      const id = +xf.getAttribute('numFmtId');
      const cod = (proprios.get(id) || '').replace(/\[[^\]]*\]|"[^"]*"/g, '');
      ehData.push((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[dy]/i.test(cod) || /^m+([^a-z]|$)/i.test(cod));
    }
  }
  const sheet = xml(await ler('xl/' + alvo) || '');
  const linhas = [];
  for (const row of filhos(sheet, 'row')) {
    const r = +(row.getAttribute('r') || linhas.length + 1) - 1;
    const linha = [];
    for (const c of filhos(row, 'c')) {
      const j = c.getAttribute('r') ? colunaIdx(c.getAttribute('r')) : linha.length;
      const t = c.getAttribute('t');
      const vNo = c.getElementsByTagName('v')[0];
      let val = vNo ? vNo.textContent : '';
      if (t === 's') val = compart[+val] ?? '';
      else if (t === 'inlineStr') val = filhos(c, 't').map((x) => x.textContent).join('');
      else if (t === 'b') val = val === '1' ? 'Sim' : 'Não';
      else if (t !== 'str' && t !== 'e' && val !== '' && !isNaN(+val)) {
        const s = +(c.getAttribute('s') || 0);
        if (ehData[s]) val = dataDeSerial(+val);
        else { const n = +val; val = Number.isInteger(n) ? String(n) : String(+n.toPrecision(12)); }
      }
      linha[j] = val;
    }
    linhas[r] = Array.from(linha, (x) => x ?? '');
  }
  return Array.from(linhas, (x) => x || []);
}

/** Lê o arquivo escolhido e devolve { colunas, linhas, cortou }. */
export async function lerPlanilha(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const nome = arquivo.name.toLowerCase();
  let brutas;
  if (nome.endsWith('.xlsx') || nome.endsWith('.xlsm')) brutas = await lerXLSX(buf);
  else if (nome.endsWith('.xls')) throw new Error('arquivos .xls (Excel antigo) não dão: no Excel, use Salvar como › .xlsx ou .csv');
  else brutas = lerCSV(decodificar(new Uint8Array(buf)));
  const cheia = (l) => l && l.some((c) => String(c ?? '').trim() !== '');
  const i0 = brutas.findIndex(cheia);
  if (i0 < 0) throw new Error('a planilha está vazia');
  const cab = brutas[i0].map((c) => String(c ?? '').trim());
  let corpo = brutas.slice(i0 + 1).filter(cheia);
  const largura = Math.max(cab.length, ...corpo.slice(0, 500).map((l) => l.length));
  // tira colunas vazias do fim
  let n = largura;
  while (n > 1 && !cab[n - 1] && corpo.every((l) => !String(l[n - 1] ?? '').trim())) n--;
  const usados = new Set();
  const colunas = Array.from({ length: n }, (_, j) => {
    let c = (cab[j] || `Coluna ${j + 1}`).replace(/\s+/g, ' ');
    let k = 2; const base = c;
    while (usados.has(c.toLowerCase())) c = `${base} ${k++}`;
    usados.add(c.toLowerCase());
    return c;
  });
  const cortou = corpo.length > MAX_LINHAS;
  corpo = corpo.slice(0, MAX_LINHAS).map((l) => colunas.map((_, j) => String(l[j] ?? '').trim()));
  return { colunas, linhas: corpo, cortou };
}

// ------------------------------------------------------------------ nomes
export function slug(t, reserva = 'item') {
  let s = String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
  if (!s) s = reserva;
  if (/^\d/.test(s)) s = reserva + '_' + s;
  if (!nomeOk(s)) s = s + '_';
  return s;
}

// ------------------------------------------------------------------ montar a tela + código
/**
 * @param {{nome:string, titulo:string, colunas:string[], linhas:string[][], editaveis:string[], toolkit:string, tema:string, cor:string, origem:string}} p
 */
export function montarApp(p) {
  const tk = p.toolkit === 'tkinter';
  const campos = p.editaveis.slice(0, MAX_CAMPOS);
  const nomesCampo = new Map();
  const usados = new Set();
  for (const c of campos) { let s = slug(c, 'campo'), k = 2; const b = s; while (usados.has(s)) s = `${b}_${k++}`; usados.add(s); nomesCampo.set(c, s); }
  const W = 920;
  const H = Math.max(540, 40 + campos.length * 62 + 170);
  const FX = 608, FW = 288;
  const els = [];
  let id = 1;
  const add = (tipo, nome, x, y, w, h, extra = {}) => els.push(Object.assign(criarBase(tipo, x, y, w, h), { id: 'e' + id++, nome }, extra));
  const t = CORES_TEMA[p.tema] || CORES_TEMA.claro;
  const limpa = (s) => String(s).replace(/,/g, '\u201A').replace(/\n/g, ' ');
  add('texto', 'titulo', 24, 20, 560, 36, { texto: p.titulo, tamanho: 24, negrito: true, rh: 'esqdir' });
  add('texto', 'texto_contador', 24, 58, 560, 20, { texto: fmt('{n} registros', { n: p.linhas.length }), tamanho: 13, corTexto: t.mut, rh: 'esqdir' });
  add('campo', 'campo_busca', 24, 84, 560, 36, { placeholder: tk ? '' : 'Buscar em todas as colunas…', aoMudar: 'ao_buscar', rh: 'esqdir' });
  add('tabela', 'tabela_dados', 24, 132, 560, H - 156, { colunas: p.colunas.map(limpa).join(', '), linhas: p.linhas.slice(0, 12).map((l) => l.map(limpa).join(', ')).join('\n'), rh: 'esqdir', rv: 'topobase' });
  let y = 24;
  for (const c of campos) {
    const s = nomesCampo.get(c);
    add('texto', 'rotulo_' + s, FX, y, FW, 18, { texto: c, tamanho: 12, negrito: true, rh: 'dir' });
    add('campo', 'campo_' + s, FX, y + 20, FW, 34, { placeholder: '', rh: 'dir' });
    y += 62;
  }
  y += 6;
  add('botao', 'botao_adicionar', FX, y, 140, 38, { texto: 'Adicionar', aoClicar: 'ao_clicar_adicionar', rh: 'dir' });
  add('botao', 'botao_salvar', FX + 148, y, 140, 38, { texto: 'Salvar alteração', aoClicar: 'ao_clicar_salvar', rh: 'dir', tamanho: 13 });
  add('botao', 'botao_apagar', FX, y + 46, 140, 38, { texto: 'Apagar', primario: false, negrito: false, corTexto: '#D64545', borda: '#D64545', aoClicar: 'ao_clicar_apagar', rh: 'dir' });
  add('botao', 'botao_limpar', FX + 148, y + 46, 140, 38, { texto: 'Limpar campos', primario: false, negrito: false, aoClicar: 'ao_clicar_limpar', rh: 'dir', tamanho: 13 });
  add('texto', 'texto_aviso', FX, y + 96, FW, 40, { texto: 'Clique numa linha da tabela para editar.', tamanho: 13, corTexto: t.mut, alinharV: 'topo', rh: 'dir' });
  const design = { versao: 2, nome: p.nome, titulo: p.titulo, largura: W, altura: H, tema: p.tema, cor: p.cor, fundo: '', redimensionavel: true, guias: { v: [], h: [] }, elementos: els, logica: logicaVazia() };
  return { design, codigo: codigoUsuario(p, campos, nomesCampo, tk), csv: paraCSV(p.colunas, p.linhas) };
}

export function paraCSV(colunas, linhas) {
  const c = (v) => (/[;"\n\r]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v);
  return '﻿' + [colunas, ...linhas].map((l) => l.map(c).join(';')).join('\r\n') + '\r\n';
}

const py = (s) => JSON.stringify(String(s));
const classe = (n) => n.split('_').filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join('') || 'Tela';

function codigoUsuario(p, campos, nomesCampo, tk) {
  const C = classe(p.nome);
  const mapa = campos.map((c) => `    ${py(c)}: "campo_${nomesCampo.get(c)}",`);
  const comum = [
    `"""App da planilha “${p.titulo.replace(/"/g, "'")}” (criado pelo PyForge a partir de ${p.origem.replace(/"/g, "'")}).`,
    '',
    `Os dados ficam em dados/${p.nome}.csv: dá para abrir no Excel também.`,
    'O visual fica na aba Design. Este arquivo é SEU: mude o que quiser.',
    '"""',
    'import csv',
    'import shutil',
    'import sys',
    'from pathlib import Path',
    '',
    ...(tk ? ['from tkinter import messagebox', ''] : ['from PySide6.QtWidgets import QAbstractItemView, QMessageBox, QTableWidgetItem', '']),
    `from ui.${p.nome}_ui import ${C}UI, rodar`,
    '',
    `COLUNAS = [${p.colunas.map(py).join(', ')}]`,
    '# coluna da planilha -> campo da tela (as outras colunas só aparecem na tabela)',
    'CAMPOS = {',
    ...mapa,
    '}',
    'SEPARADOR = ";"',
    '',
    '',
    'def pasta_do_app():',
    '    """Pasta do projeto (ou a pasta do .exe, depois de gerar o programa)."""',
    '    if getattr(sys, "frozen", False):',
    '        return Path(sys.executable).resolve().parent',
    '    return Path(__file__).resolve().parent',
    '',
    '',
    `ARQUIVO = pasta_do_app() / "dados" / "${p.nome}.csv"`,
    '',
    '',
    'def ler_dados():',
    '    if not ARQUIVO.exists():',
    '        # no .exe: copia a planilha que foi junto na primeira vez',
    '        original = Path(getattr(sys, "_MEIPASS", pasta_do_app())) / "dados" / ARQUIVO.name',
    '        if not original.exists():',
    '            return []',
    '        ARQUIVO.parent.mkdir(parents=True, exist_ok=True)',
    '        shutil.copy(original, ARQUIVO)',
    '    with open(ARQUIVO, encoding="utf-8-sig", newline="") as f:',
    '        leitor = csv.reader(f, delimiter=SEPARADOR)',
    '        next(leitor, None)  # pula o cabeçalho',
    '        n = len(COLUNAS)',
    '        return [(linha + [""] * n)[:n] for linha in leitor if any(c.strip() for c in linha)]',
    '',
    '',
    'def salvar_dados(linhas):',
    '    ARQUIVO.parent.mkdir(parents=True, exist_ok=True)',
    '    temporario = ARQUIVO.with_suffix(".tmp")',
    '    with open(temporario, "w", encoding="utf-8-sig", newline="") as f:',
    '        escritor = csv.writer(f, delimiter=SEPARADOR)',
    '        escritor.writerow(COLUNAS)',
    '        escritor.writerows(linhas)',
    '    temporario.replace(ARQUIVO)  # troca de uma vez: não corrompe se o PC desligar',
    '',
    '',
    `class ${C}(${C}UI):`,
    '    def __init__(self, *args, **kwargs):',
    '        super().__init__(*args, **kwargs)',
    '        self.linhas = ler_dados()',
    '        self.visiveis = []  # posição (em self.linhas) de cada linha que aparece na tabela',
    '        self.escolhida = None  # linha escolhida na tabela',
    '        self.busca = ""',
    ...(tk
      ? ['        self.tabela_dados.configure(selectmode="browse")', '        self.tabela_dados.bind("<<TreeviewSelect>>", lambda _e: self.ao_escolher_linha())']
      : ['        self.tabela_dados.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)',
        '        self.tabela_dados.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)',
        '        self.tabela_dados.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)',
        '        self.tabela_dados.itemSelectionChanged.connect(self.ao_escolher_linha)']),
    '        self.mostrar_linhas()',
    '',
    '    # ---------------------------------------------------------- botões',
    '    def ao_clicar_adicionar(self):',
    '        nova = self.ler_campos([""] * len(COLUNAS))',
    '        if not any(nova):',
    '            self.avisar("Preencha pelo menos um campo.")',
    '            return',
    '        self.linhas.append(nova)',
    '        salvar_dados(self.linhas)',
    '        self.limpar_campos()',
    '        self.mostrar_linhas()',
    '        self.avisar("Adicionado!")',
    '',
    '    def ao_clicar_salvar(self):',
    '        if self.escolhida is None:',
    '            self.avisar("Escolha uma linha na tabela primeiro.")',
    '            return',
    '        self.linhas[self.escolhida] = self.ler_campos(self.linhas[self.escolhida])',
    '        salvar_dados(self.linhas)',
    '        self.mostrar_linhas()',
    '        self.avisar("Alteração salva!")',
    '',
    '    def ao_clicar_apagar(self):',
    '        if self.escolhida is None:',
    '            self.avisar("Escolha uma linha na tabela primeiro.")',
    '            return',
    '        if not self.perguntar("Apagar esta linha da planilha?"):',
    '            return',
    '        del self.linhas[self.escolhida]',
    '        salvar_dados(self.linhas)',
    '        self.limpar_campos()',
    '        self.mostrar_linhas()',
    '        self.avisar("Apagado.")',
    '',
    '    def ao_clicar_limpar(self):',
    '        self.limpar_campos()',
    '        self.mostrar_linhas()',
    '',
    '    def ao_buscar(self, texto):',
    '        self.busca = texto.strip().lower()',
    '        self.mostrar_linhas()',
    '',
    '    # ---------------------------------------------------------- ajudantes',
    '    def ler_campos(self, linha):',
    '        """Junta o que está nos campos numa linha da planilha."""',
    '        nova = list(linha)',
    '        for i, coluna in enumerate(COLUNAS):',
    '            if coluna in CAMPOS:',
    '                nova[i] = self.pegar_texto(CAMPOS[coluna]).strip()',
    '        return nova',
    '',
    '    def limpar_campos(self):',
    '        self.escolhida = None',
    '        for campo in CAMPOS.values():',
    '            self.por_texto(campo, "")',
    '',
    '    def mostrar_linhas(self):',
    '        self.visiveis = [i for i, linha in enumerate(self.linhas)',
    '                         if not self.busca or any(self.busca in c.lower() for c in linha)]',
    '        self.encher_tabela([self.linhas[i] for i in self.visiveis])',
    '        total = len(self.linhas)',
    '        texto = f"{total} registros" if not self.busca else f"{len(self.visiveis)} de {total} registros"',
    ...(tk ? ['        self.texto_contador.configure(text=texto)'] : ['        self.texto_contador.setText(texto)']),
    '',
    '    def ao_escolher_linha(self):',
    '        pos = self.linha_da_tabela()',
    '        if pos is None or pos >= len(self.visiveis):',
    '            return',
    '        self.escolhida = self.visiveis[pos]',
    '        linha = self.linhas[self.escolhida]',
    '        for i, coluna in enumerate(COLUNAS):',
    '            if coluna in CAMPOS:',
    '                self.por_texto(CAMPOS[coluna], linha[i])',
    '        self.avisar("Mude os campos e clique em Salvar alteração.")',
    '',
  ];
  const kit = tk ? [
    '    # ---------------------------------------------------------- Tkinter',
    '    def pegar_texto(self, campo):',
    '        return getattr(self, campo + "_texto").get()',
    '',
    '    def por_texto(self, campo, texto):',
    '        getattr(self, campo + "_texto").set(texto)',
    '',
    '    def encher_tabela(self, linhas):',
    '        tabela = self.tabela_dados',
    '        tabela.delete(*tabela.get_children())',
    '        for pos, linha in enumerate(linhas):',
    '            tabela.insert("", "end", iid=str(pos), values=linha)',
    '',
    '    def linha_da_tabela(self):',
    '        escolhidas = self.tabela_dados.selection()',
    '        return int(escolhidas[0]) if escolhidas else None',
    '',
    '    def avisar(self, texto):',
    '        self.texto_aviso.configure(text=texto)',
    '',
    '    def perguntar(self, texto):',
    '        return messagebox.askyesno("Confirmar", texto, parent=self)',
  ] : [
    '    # ---------------------------------------------------------- PySide6',
    '    def pegar_texto(self, campo):',
    '        return getattr(self, campo).text()',
    '',
    '    def por_texto(self, campo, texto):',
    '        getattr(self, campo).setText(texto)',
    '',
    '    def encher_tabela(self, linhas):',
    '        tabela = self.tabela_dados',
    '        tabela.blockSignals(True)',
    '        tabela.clearSelection()',
    '        tabela.setRowCount(len(linhas))',
    '        for i, linha in enumerate(linhas):',
    '            for j, valor in enumerate(linha):',
    '                tabela.setItem(i, j, QTableWidgetItem(valor))',
    '        tabela.blockSignals(False)',
    '',
    '    def linha_da_tabela(self):',
    '        linhas = self.tabela_dados.selectionModel().selectedRows()',
    '        return linhas[0].row() if linhas else None',
    '',
    '    def avisar(self, texto):',
    '        self.texto_aviso.setText(texto)',
    '',
    '    def perguntar(self, texto):',
    '        r = QMessageBox.question(self, "Confirmar", texto)',
    '        return r == QMessageBox.StandardButton.Yes',
  ];
  return [...comum, ...kit, '', '', 'if __name__ == "__main__":', `    rodar(${C})`, ''].join('\n');
}

// ------------------------------------------------------------------ diálogo
/**
 * @param {{nomesUsados: Set<string>, criar: (r: {nome:string, titulo:string, dados:object, editaveis:string[], origem:string}) => Promise<boolean>}} ctx
 */
export function dialogoPlanilha(ctx) {
  let dados = null, origem = '';
  const corpo = el(`<div style="display:flex;flex-direction:column;gap:14px">
    <div class="muted" style="font-size:13px;line-height:1.5">Escolha uma planilha do Excel (.xlsx) ou um .csv. O PyForge cria uma tela com tabela, busca e formulário para adicionar, editar e apagar linhas. Tudo já funcionando.</div>
    <label class="btn" style="align-self:flex-start;cursor:pointer">${ic('tabela', 14)}Escolher planilha…<input type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt,.xls" data-arq hidden></label>
    <div data-info></div>
  </div>`);
  const info = corpo.querySelector('[data-info]');
  const m = modal({ titulo: 'Planilha vira app', corpo, largo: true, botoes: [{ texto: 'Cancelar' }, { texto: 'Criar o app', classe: 'pri', acao: criar }] });
  const botaoCriar = m.fundo.querySelector('.modal-pe .pri');
  botaoCriar.disabled = true;

  corpo.querySelector('[data-arq]').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    info.innerHTML = '<div class="muted">Lendo a planilha…</div>';
    try { dados = await lerPlanilha(f); origem = f.name; } catch (err) { dados = null; botaoCriar.disabled = true; info.innerHTML = `<div class="err">Não consegui ler: ${esc(err.message)}</div>`; return; }
    pintar();
  };

  function pintar() {
    let nome = slug(origem.replace(/\.[^.]+$/, ''), 'planilha'), k = 2;
    const base = nome;
    while (ctx.nomesUsados.has(nome)) nome = `${base}${k++}`;
    const titulo = origem.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
    const ver = dados.linhas.slice(0, 5);
    info.innerHTML = `
      <div class="flex" style="gap:10px;flex-wrap:wrap">
        <div class="prop grow"><label class="rotulo">Nome da tela</label><input class="campo mono" data-nome value="${esc(nome)}"></div>
        <div class="prop grow"><label class="rotulo">Título da janela</label><input class="campo" data-titulo value="${esc(titulo)}"></div>
      </div>
      <div class="muted" style="font-size:12.5px;margin:10px 0 6px">${fmt('{a} linhas · {b} colunas', { a: dados.linhas.length, b: dados.colunas.length })}${dados.cortou ? fmt(' (só as primeiras {n} linhas)', { n: MAX_LINHAS }) : ''}</div>
      <div style="overflow:auto;max-height:190px;border:1px solid var(--bd);border-radius:8px"><table class="pl-prev"><thead><tr>${dados.colunas.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${ver.map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="rotulo" style="margin:12px 0 6px">Campos para editar (até ${MAX_CAMPOS})</div>
      <div class="flex" style="flex-wrap:wrap;gap:6px 14px" data-cols>${dados.colunas.map((c, i) => `<label class="flex" style="gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" value="${esc(c)}" ${i < MAX_CAMPOS ? 'checked' : ''}>${esc(c)}</label>`).join('')}</div>`;
    const caixas = [...info.querySelectorAll('[data-cols] input')];
    const limitar = () => { const n = caixas.filter((x) => x.checked).length; caixas.forEach((x) => { x.disabled = !x.checked && n >= MAX_CAMPOS; }); botaoCriar.disabled = n === 0; };
    caixas.forEach((x) => { x.onchange = limitar; });
    limitar();
  }

  async function criar() {
    if (!dados) return false;
    const nome = info.querySelector('[data-nome]').value.trim();
    const titulo = info.querySelector('[data-titulo]').value.trim() || nome;
    if (!nomeOk(nome)) { toast('Nome da tela: só letras minúsculas, números e _ (sem acento).', 'err'); return false; }
    if (ctx.nomesUsados.has(nome)) { toast('Já existe uma tela com esse nome.', 'err'); return false; }
    const editaveis = [...info.querySelectorAll('[data-cols] input:checked')].map((x) => x.value);
    botaoCriar.disabled = true;
    const ok = await ctx.criar({ nome, titulo, dados, editaveis, origem });
    if (!ok) { botaoCriar.disabled = false; return false; }
  }
}
