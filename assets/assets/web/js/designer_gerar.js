// Gera código Python de verdade (PySide6 ou Tkinter) a partir do design v2.
import { CORES_TEMA, EVENTOS, cor, fundoJanela, escurecer } from './designer_modelo.js';
import { gerarFluxos, FUNCAO_NUMERO } from './designer_logica.js';
import { PY_QUADRO, PY_ANIMAR_QT, PY_ANIMAR_TK, chamadasAoAbrir, usaAnimacao } from './designer_animacao.js';

const py = (s) => JSON.stringify(String(s ?? ''));
const classe = (nome) => nome.split('_').filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join('') || 'Tela';
const itensDe = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const csvDe = (s) => String(s || '').split(',').map((x) => x.trim());
const FONTE_PADRAO = 'Segoe UI';

/** Imports do Python que os blocos do editor de Funções pedem. */
function importsDosBlocos(fl) {
  const out = [];
  if (fl.importa.has('math')) out.push('import math');
  if (fl.importa.has('random')) out.push('import random');
  if (fl.importa.has('webbrowser')) out.push('import webbrowser');
  if (fl.importa.has('datetime')) out.push('from datetime import datetime');
  return out;
}

function eventosDe(D) {
  const ev = [];
  for (const e of D.elementos) for (const [campo, , tipo] of EVENTOS[e.tipo] || []) if (e[campo]) ev.push({ e, campo, metodo: e[campo], tipo });
  return ev;
}
function metodosUnicos(D) { return [...new Map(eventosDe(D).map((x) => [x.metodo, x])).values()]; }

function exemplo(x) {
  const e = x.e;
  if (x.tipo === 'clique') return [`    def ${x.metodo}(self):`, `        print("Clicou em ${String(e.texto || e.nome).replace(/["\\]/g, "'")}")`, ''];
  if (x.tipo === 'enter') return [`    def ${x.metodo}(self):`, `        print("Apertou Enter em ${e.nome}")`, ''];
  const arg = { campo: 'texto', caixa: 'marcado', opcao: 'marcado', combo: 'texto', lista: 'texto', slider: 'valor', numero: 'valor' }[e.tipo] || 'valor';
  return [`    def ${x.metodo}(self, ${arg}):`, `        print("${e.nome} mudou:", ${arg})`, ''];
}

function arquivoUsuario(D) {
  const C = classe(D.nome);
  const corpo = metodosUnicos(D).flatMap(exemplo);
  while (corpo.length && corpo[corpo.length - 1] === '') corpo.pop();
  return [
    `"""Tela “${D.titulo.replace(/"/g, "'")}”: escreva aqui o que cada botão faz.`,
    '',
    `O visual fica em ui/${D.nome}_ui.py (gerado pelo Designer). Este arquivo é SEU:`,
    'o Designer cria ele uma vez e nunca mais sobrescreve.',
    '',
    'Dicas: self.nome_do_elemento acessa cada elemento da tela;',
    'self.esconder(self.algum_elemento) e self.mostrar(...) escondem e mostram.',
    '"""',
    `from ui.${D.nome}_ui import ${C}UI, rodar`,
    '',
    '',
    `class ${C}(${C}UI):`,
    ...(corpo.length ? corpo : ['    pass']),
    '',
    '',
    'if __name__ == "__main__":',
    `    rodar(${C})`,
    '',
  ].join('\n');
}

/** Tela com rolagem: os elementos nascem dentro de self._area em vez de self. */
function paiArea(linha) {
  if (/^        self\.\w+ = Q\w+\(/.test(linha)) return linha.replace(/\(self\)$/, '(self._area)').replace(/, self\)$/, ', self._area)');
  if (/^        self\.\w+ = (tk|ttk)\.\w+\(self[,)]/.test(linha)) return linha.replace(/\(self([,)])/, '(self._area$1');
  return linha;
}

const cabecalho = (D) => [
  `# Gerado pelo Designer do PyForge a partir de ui/${D.nome}.pyforge.json.`,
  '# NÃO edite este arquivo: ele é recriado sempre que você salva a tela.',
  `# O seu código (o que cada botão faz) fica em ${D.nome}.py.`,
];

const funcaoCaminho = [
  'def caminho(relativo):',
  '    """Acha um arquivo do projeto (imagens etc.), também dentro do .exe."""',
  '    base = getattr(sys, "_MEIPASS", None) or Path(__file__).resolve().parent.parent',
  '    return str(Path(base) / relativo)',
];

// ====================================================================== PySide6
export function gerarQt(D) {
  const C = classe(D.nome);
  const t = CORES_TEMA[D.tema];
  const W = new Set(['QApplication', 'QWidget']);
  const G = new Set();
  const L = [];
  const css = [];
  const pos = [];
  const con = [];
  const gruposOpcao = new Set();
  let usaImagem = false, usaIcones = false;
  const fl = gerarFluxos(D, false);
  const anim = usaAnimacao(D, fl);
  if (anim) { fl.importa.add('math'); W.add('QGraphicsOpacityEffect'); }
  if (fl.importa.has('mensagem')) W.add('QMessageBox');
  if (D.rolagem) W.add('QScrollArea');
  for (const x of ['QInputDialog', 'QFileDialog', 'QColorDialog']) if (fl.importa.has(x)) W.add(x);
  if (fl.importa.has('imagem')) { usaImagem = true; G.add('QPixmap'); }

  const fonte = (e) => `font-size: ${e.tamanho}px; font-weight: ${e.negrito ? 700 : 400};${e.italico ? ' font-style: italic;' : ''}${e.fonte ? ` font-family: "${e.fonte}";` : ''}`;
  const borda = (e, padrao = 'none') => { const b = cor(e, 'borda', D); return b ? `${e.bordaLargura || 1}px solid ${b}` : padrao; };

  for (const e of D.elementos) {
    const n = `self.${e.nome}`;
    const q = `#${e.nome}`;
    const linhas = [];
    const add = (...xs) => linhas.push(...xs.map((x) => '        ' + x));
    const criar = (cls, args = 'self') => { W.add(cls); add(`${n} = ${cls}(${args})`, `${n}.setObjectName(${py(e.nome)})`); };
    switch (e.tipo) {
      case 'texto': {
        criar('QLabel', `${py(e.texto)}, self`);
        if (e.quebra) add(`${n}.setWordWrap(True)`);
        const h = { esquerda: 'AlignLeft', centro: 'AlignHCenter', direita: 'AlignRight' }[e.alinhar] || 'AlignLeft';
        const v = { topo: 'AlignTop', meio: 'AlignVCenter', base: 'AlignBottom' }[e.alinharV] || 'AlignVCenter';
        add(`${n}.setAlignment(Qt.AlignmentFlag.${h} | Qt.AlignmentFlag.${v})`);
        css.push(`QLabel${q} { color: ${cor(e, 'corTexto', D)}; ${fonte(e)} background: ${e.fundo || 'transparent'};${e.raio ? ` border-radius: ${e.raio}px;` : ''} }`);
        break;
      }
      case 'botao': {
        criar('QPushButton', `${py(e.texto)}, self`);
        add(`${n}.setCursor(Qt.CursorShape.PointingHandCursor)`);
        const f = cor(e, 'fundo', D);
        css.push(`QPushButton${q} { background: ${f}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; border-radius: ${e.raio}px; padding: 0 12px; ${fonte(e)} }`,
          `QPushButton${q}:hover { background: ${escurecer(f, 0.9)}; }`, `QPushButton${q}:pressed { background: ${escurecer(f, 0.78)}; }`,
          `QPushButton${q}:disabled { background: ${t.trilho}; color: ${t.mut}; }`);
        break;
      }
      case 'campo': {
        criar('QLineEdit');
        if (e.placeholder) add(`${n}.setPlaceholderText(${py(e.placeholder)})`);
        if (e.texto) add(`${n}.setText(${py(e.texto)})`);
        if (e.senha) add(`${n}.setEchoMode(QLineEdit.EchoMode.Password)`);
        css.push(`QLineEdit${q} { background: ${cor(e, 'fundo', D)}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; border-radius: ${e.raio}px; padding: 0 10px; ${fonte(e)} }`, `QLineEdit${q}:focus { border-color: ${D.cor}; }`);
        break;
      }
      case 'area': {
        criar('QTextEdit');
        if (e.placeholder) add(`${n}.setPlaceholderText(${py(e.placeholder)})`);
        if (e.texto) add(`${n}.setPlainText(${py(e.texto)})`);
        css.push(`QTextEdit${q} { background: ${cor(e, 'fundo', D)}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; border-radius: ${e.raio}px; padding: 4px 6px; ${fonte(e)} }`, `QTextEdit${q}:focus { border-color: ${D.cor}; }`);
        break;
      }
      case 'numero': {
        criar('QSpinBox');
        add(`${n}.setRange(${e.minimo}, ${e.maximo})`, `${n}.setSingleStep(${e.passo || 1})`, `${n}.setValue(${e.valor})`);
        usaIcones = true;
        css.push(`QSpinBox${q} { background: ${cor(e, 'fundo', D)}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; border-radius: ${e.raio}px; padding: 0 8px; ${fonte(e)} }`,
          `QSpinBox${q}::up-button { subcontrol-origin: border; subcontrol-position: top right; width: 22px; border: none; border-left: 1px solid ${t.bd}; background: transparent; }`,
          `QSpinBox${q}::down-button { subcontrol-origin: border; subcontrol-position: bottom right; width: 22px; border: none; border-left: 1px solid ${t.bd}; background: transparent; }`,
          `QSpinBox${q}::up-button:hover, QSpinBox${q}::down-button:hover { background: ${t.trilho}; }`,
          `QSpinBox${q}::up-arrow { image: url(@CIMA); width: 10px; height: 10px; }`, `QSpinBox${q}::down-arrow { image: url(@BAIXO); width: 10px; height: 10px; }`);
        break;
      }
      case 'caixa':
      case 'opcao': {
        criar(e.tipo === 'caixa' ? 'QCheckBox' : 'QRadioButton', `${py(e.texto)}, self`);
        if (e.marcado) add(`${n}.setChecked(True)`);
        if (e.tipo === 'opcao') {
          W.add('QButtonGroup');
          const g = `self.grupo_${e.grupoOpcao}`;
          if (!gruposOpcao.has(e.grupoOpcao)) { gruposOpcao.add(e.grupoOpcao); add(`${g} = QButtonGroup(self)`); }
          add(`${g}.addButton(${n})`);
        }
        const cls = e.tipo === 'caixa' ? 'QCheckBox' : 'QRadioButton';
        usaIcones = true;
        css.push(`${cls}${q} { color: ${cor(e, 'corTexto', D)}; font-size: ${e.tamanho}px; background: transparent; spacing: 8px; }`,
          `${cls}${q}::indicator { width: 16px; height: 16px; border: 1.5px solid ${t.mut}; border-radius: ${e.tipo === 'caixa' ? 4 : 9}px; background: ${t.bg}; }`,
          `${cls}${q}::indicator:hover { border-color: ${D.cor}; }`,
          e.tipo === 'caixa'
            ? `${cls}${q}::indicator:checked { background: ${D.cor}; border-color: ${D.cor}; image: url(@MARCA); }`
            : `${cls}${q}::indicator:checked { border-color: ${D.cor}; background: qradialgradient(cx:0.5, cy:0.5, radius:0.5, fx:0.5, fy:0.5, stop:0 ${D.cor}, stop:0.42 ${D.cor}, stop:0.5 ${t.bg}, stop:1 ${t.bg}); }`);
        break;
      }
      case 'combo': {
        criar('QComboBox');
        add(`${n}.addItems([${itensDe(e.itens).map(py).join(', ')}])`);
        usaIcones = true;
        css.push(`QComboBox${q} { background: ${cor(e, 'fundo', D)}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; border-radius: ${e.raio}px; padding: 0 10px; ${fonte(e)} }`,
          `QComboBox${q}::drop-down { border: none; width: 28px; }`, `QComboBox${q}::down-arrow { image: url(@BAIXO); width: 12px; height: 12px; }`,
          `QComboBox${q} QAbstractItemView { background: ${t.sup}; color: ${t.tx}; border: 1px solid ${t.bd}; selection-background-color: ${D.cor}; selection-color: white; outline: none; padding: 4px; }`);
        break;
      }
      case 'slider': {
        criar('QSlider', 'Qt.Orientation.Horizontal, self');
        add(`${n}.setRange(${e.minimo}, ${e.maximo})`, `${n}.setValue(${e.valor})`);
        const c = cor(e, 'cor', D);
        css.push(`QSlider${q}::groove:horizontal { height: 6px; background: ${t.trilho}; border-radius: 3px; }`, `QSlider${q}::sub-page:horizontal { background: ${c}; border-radius: 3px; }`,
          `QSlider${q}::handle:horizontal { background: ${c}; width: 16px; margin: -5px 0; border-radius: 8px; }`);
        break;
      }
      case 'progresso': {
        criar('QProgressBar');
        add(`${n}.setValue(${e.valor})`, `${n}.setTextVisible(False)`);
        css.push(`QProgressBar${q} { background: ${t.trilho}; border: none; border-radius: ${e.raio}px; }`, `QProgressBar${q}::chunk { background: ${cor(e, 'cor', D)}; border-radius: ${e.raio}px; }`);
        break;
      }
      case 'lista': {
        criar('QListWidget');
        add(`${n}.addItems([${itensDe(e.itens).map(py).join(', ')}])`);
        css.push(`QListWidget${q} { background: ${cor(e, 'fundo', D)}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; border-radius: ${e.raio}px; padding: 4px; ${fonte(e)} }`,
          `QListWidget${q}::item { padding: 6px 8px; border-radius: 4px; }`, `QListWidget${q}::item:selected { background: ${D.cor}; color: white; }`);
        break;
      }
      case 'tabela': {
        const cols = csvDe(e.colunas).filter(Boolean);
        const rows = itensDe(e.linhas).map(csvDe);
        W.add('QTableWidgetItem');
        add(`dados_${e.nome} = [${rows.map((r) => '[' + r.map(py).join(', ') + ']').join(', ')}]`);
        criar('QTableWidget', `len(dados_${e.nome}), ${cols.length || 1}, self`);
        add(`${n}.setHorizontalHeaderLabels([${cols.map(py).join(', ')}])`,
          `for i, linha in enumerate(dados_${e.nome}):`, `    for j, valor in enumerate(linha):`, `        ${n}.setItem(i, j, QTableWidgetItem(valor))`,
          `${n}.horizontalHeader().setStretchLastSection(True)`, `${n}.verticalHeader().setVisible(False)`);
        css.push(`QTableWidget${q} { background: ${cor(e, 'fundo', D)}; color: ${cor(e, 'corTexto', D)}; border: ${borda(e)}; gridline-color: ${t.bd}; font-size: ${e.tamanho}px; }`,
          `QTableWidget${q} QHeaderView::section { background: ${t.barra}; color: ${t.tx}; border: none; border-bottom: 1px solid ${t.bd}; padding: 6px; font-weight: 600; }`);
        break;
      }
      case 'imagem': {
        criar('QLabel', 'self');
        add(`${n}.setAlignment(Qt.AlignmentFlag.AlignCenter)`);
        if (e.arquivo) {
          usaImagem = true; G.add('QPixmap');
          const modo = { conter: 'KeepAspectRatio', cobrir: 'KeepAspectRatioByExpanding', esticar: 'IgnoreAspectRatio' }[e.ajuste] || 'KeepAspectRatio';
          add(`${n}.imagem_original = QPixmap(caminho(${py(e.arquivo)}))`, `${n}.ajuste_imagem = Qt.AspectRatioMode.${modo}`);
          css.push(`QLabel${q} { background: transparent; }`);
        } else {
          add(`${n}.setText("Imagem")`);
          css.push(`QLabel${q} { background: ${t.sup}; color: ${t.mut}; border: 1px dashed ${t.bd}; }`);
        }
        break;
      }
      case 'retangulo':
      case 'elipse': {
        criar('QFrame');
        const raio = e.tipo === 'elipse' ? Math.floor(Math.min(e.w, e.h) / 2) : e.raio;
        css.push(`QFrame${q} { background: ${cor(e, 'fundo', D)}; border: ${borda(e)}; border-radius: ${raio}px; }`);
        break;
      }
      case 'linha': {
        criar('QFrame');
        css.push(`QFrame${q} { background: ${cor(e, 'cor', D)}; border: none; }`);
        break;
      }
    }
    if (!e.habilitado) add(`${n}.setEnabled(False)`);
    if (e.dica) add(`${n}.setToolTip(${py(e.dica)})`);
    if (e.sombra) {
      W.add('QGraphicsDropShadowEffect'); G.add('QColor');
      add(`sombra = QGraphicsDropShadowEffect(${n})`, 'sombra.setBlurRadius(28)', 'sombra.setOffset(0, 6)', 'sombra.setColor(QColor(0, 0, 0, 50))', `${n}.setGraphicsEffect(sombra)`);
    }
    if (!e.visivel) add(`${n}.hide()`);
    L.push(...linhas, '');
    pos.push(`            (${n}, (${e.x}, ${e.y}, ${e.w}, ${e.h}), ${py(e.rh)}, ${py(e.rv)}),`);
    for (const [campo, , tipo] of EVENTOS[e.tipo] || []) {
      const alvoEv = fl.conexoes.get(`${e.id}:${campo}`) || e[campo];
      if (!alvoEv) continue;
      const sinal = tipo === 'clique' ? 'clicked' : tipo === 'enter' ? 'returnPressed'
        : { campo: 'textChanged', numero: 'valueChanged', caixa: 'toggled', opcao: 'toggled', combo: 'currentTextChanged', slider: 'valueChanged', lista: 'currentTextChanged' }[e.tipo];
      con.push(`        ${n}.${sinal}.connect(self.${alvoEv})`);
    }
  }
  while (L.length && L[L.length - 1] === '') L.pop();
  const metodos = metodosUnicos(D);
  const tx = t.tx;
  if (usaIcones) for (const x of ['QColor', 'QPainter', 'QPen', 'QPixmap']) G.add(x);
  const ui = [
    ...cabecalho(D),
    ...importsDosBlocos(fl).filter((x) => x.startsWith('import ')),
    'import sys',
    ...(usaIcones ? ['import tempfile'] : []),
    ...importsDosBlocos(fl).filter((x) => x.startsWith('from ')),
    'from pathlib import Path',
    '',
    `from PySide6.QtCore import ${[...(D.rolagem ? ['QEvent'] : []), ...(usaIcones ? ['QPointF'] : []), 'Qt', ...(fl.aoAbrir || fl.importa.has('timer') || anim ? ['QTimer'] : []), ...(anim ? ['QVariantAnimation'] : [])].join(', ')}`,
    ...(G.size ? [`from PySide6.QtGui import ${[...G].sort().join(', ')}`] : []),
    'from PySide6.QtWidgets import (',
    ...[...W].sort().map((x) => `    ${x},`),
    ')',
    ...(fl.importa.has('estado') ? ['', 'from ui import estado  # variáveis compartilhadas entre as telas'] : []),
    '',
    `LARGURA, ALTURA = ${D.largura}, ${D.altura}  # tamanho desenhado no Designer`,
    ...(D.rolagem ? [`ALTURA_VISIVEL = ${D.alturaVisivel}  # a janela mostra só isto; o resto aparece rolando`] : []),
    '',
    '',
    ...(usaImagem ? [...funcaoCaminho, '', ''] : []),
    ...(fl.usaNumero ? [...FUNCAO_NUMERO, '', ''] : []),
    ...(anim ? [...PY_QUADRO, '', ''] : []),
    ...(usaIcones ? [
      'def icone(nome, pontos, cor):',
      '    """Desenha (uma vez) um ícone pequeno usado no estilo: o ✓ das caixas e as setas."""',
      '    arquivo = Path(tempfile.gettempdir()) / f"pyforge_{nome}_{cor.strip(\'#\')}.png"',
      '    if not arquivo.exists():',
      '        imagem = QPixmap(32, 32)',
      '        imagem.fill(Qt.GlobalColor.transparent)',
      '        pintor = QPainter(imagem)',
      '        pintor.setRenderHint(QPainter.RenderHint.Antialiasing)',
      '        pintor.setPen(QPen(QColor(cor), 4, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin))',
      '        pintor.drawPolyline([QPointF(x * 2, y * 2) for x, y in pontos])',
      '        pintor.end()',
      '        imagem.save(str(arquivo))',
      '    return arquivo.as_posix()',
      '',
      '',
      'def estilo():',
      '    """Folha de estilo com o caminho dos ícones."""',
      '    return (',
      '        ESTILO.replace("@MARCA", icone("marca", [(3.5, 8.5), (6.5, 11.5), (12.5, 4.5)], "#FFFFFF"))',
      `        .replace("@CIMA", icone("cima", [(4, 10), (8, 6), (12, 10)], ${py(t.mut)}))`,
      `        .replace("@BAIXO", icone("baixo", [(4, 6), (8, 10), (12, 6)], ${py(t.mut)}))`,
      '    )',
      '',
      '',
    ] : []),
    'def posicionar(tela, itens):',
    '    """Coloca cada elemento no lugar, seguindo as restrições quando a janela muda de tamanho."""',
    '    dl, da = tela.width() - LARGURA, tela.height() - ALTURA',
    '    el, ea = tela.width() / LARGURA, tela.height() / ALTURA',
    '    for widget, (x, y, w, h), horiz, vert in itens:',
    '        if horiz == "dir":',
    '            x += dl',
    '        elif horiz == "esqdir":',
    '            w += dl',
    '        elif horiz == "centro":',
    '            x += dl / 2',
    '        elif horiz == "escala":',
    '            x, w = x * el, w * el',
    '        if vert == "base":',
    '            y += da',
    '        elif vert == "topobase":',
    '            h += da',
    '        elif vert == "centro":',
    '            y += da / 2',
    '        elif vert == "escala":',
    '            y, h = y * ea, h * ea',
    '        widget.setGeometry(round(x), round(y), max(1, round(w)), max(1, round(h)))',
    '        imagem = getattr(widget, "imagem_original", None)',
    '        if imagem is not None and not imagem.isNull():',
    '            widget.setPixmap(imagem.scaled(widget.size(), widget.ajuste_imagem, Qt.TransformationMode.SmoothTransformation))',
    '',
    '',
    `class ${C}UI(QWidget):`,
    `    """Tela “${D.titulo.replace(/"/g, "'")}”."""`,
    '',
    '    def __init__(self, parent=None):',
    '        super().__init__(parent)',
    '        self.setObjectName("tela")',
    '        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)',
    `        self.setWindowTitle(${py(D.titulo)})`,
    ...(D.rolagem ? [
      '        # Tela com rolagem: os elementos ficam numa área que desce',
      '        self._rolagem = QScrollArea(self)',
      '        self._rolagem.setWidgetResizable(True)',
      '        self._area = QWidget()',
      '        self._area.setObjectName("tela")',
      '        self._area.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)',
      '        self._area.setMinimumHeight(ALTURA)',
      '        self._rolagem.setWidget(self._area)',
      '        self._area.installEventFilter(self)',
      '        largura = LARGURA + self._rolagem.verticalScrollBar().sizeHint().width()',
      D.redimensionavel ? '        self.resize(largura, ALTURA_VISIVEL)' : '        self.setFixedSize(largura, ALTURA_VISIVEL)',
    ] : [D.redimensionavel ? '        self.resize(LARGURA, ALTURA)' : '        self.setFixedSize(LARGURA, ALTURA)']),
    '',
    ...(D.rolagem ? L.map(paiArea) : L),
    ...(L.length ? [''] : []),
    '        self._posicoes = [',
    ...pos,
    '        ]',
    usaIcones ? '        self.setStyleSheet(estilo())' : '        self.setStyleSheet(ESTILO)',
    D.rolagem ? '        posicionar(self._area, self._posicoes)' : '        posicionar(self, self._posicoes)',
    ...(chamadasAoAbrir(D).length ? ['', '        # Animações ao abrir (Designer › Animação)', ...chamadasAoAbrir(D)] : []),
    ...(fl.iniciar.length ? ['', '        # Variáveis do editor de Funções', ...fl.iniciar] : []),
    ...(con.length ? ['', `        # Eventos: escreva o que acontece em ${D.nome}.py`, ...con] : []),
    ...(fl.aoAbrir ? ['        QTimer.singleShot(0, self._fluxo_ao_abrir)'] : []),
    '',
    ...(D.rolagem ? [
      '    def resizeEvent(self, evento):',
      '        super().resizeEvent(evento)',
      '        self._rolagem.setGeometry(self.rect())',
      '',
      '    def eventFilter(self, objeto, evento):',
      '        if objeto is self._area and evento.type() == QEvent.Type.Resize:',
      '            posicionar(self._area, self._posicoes)',
      '        return super().eventFilter(objeto, evento)',
    ] : [
      '    def resizeEvent(self, evento):',
      '        super().resizeEvent(evento)',
      '        posicionar(self, self._posicoes)',
    ]),
    '',
    '    def mostrar(self, widget):',
    '        widget.show()',
    '',
    '    def esconder(self, widget):',
    '        widget.hide()',
    ...(anim ? PY_ANIMAR_QT : []),
    ...fl.metodos,
    ...metodos.flatMap((x) => ['', `    def ${x.metodo}(self, *args):`, `        """${x.tipo === 'clique' ? 'Clique em' : x.tipo === 'enter' ? 'Enter em' : 'Mudança em'} ${x.e.nome}. Escreva o que acontece em ${D.nome}.py."""`]),
    '',
    '',
    'def rodar(classe_tela):',
    '    """Abre a tela. Usado pelo seu arquivo: rodar(MinhaTela)."""',
    '    app = QApplication.instance() or QApplication(sys.argv)',
    '    tela = classe_tela()',
    '    tela.show()',
    '    sys.exit(app.exec())',
    '',
    '',
    'ESTILO = """',
    `#tela { background: ${fundoJanela(D)}; }`,
    `QWidget { color: ${tx}; font-family: "${FONTE_PADRAO}", "Inter", sans-serif; font-size: 14px; }`,
    `QToolTip { background: ${t.sup}; color: ${tx}; border: 1px solid ${t.bd}; padding: 4px 6px; }`,
    ...(D.rolagem ? ['QScrollArea { border: none; background: transparent; }'] : []),
    ...css,
    '"""',
    '',
  ];
  return { ui: ui.join('\n'), usuario: arquivoUsuario(D) };
}

// ====================================================================== Tkinter
export function gerarTk(D) {
  const C = classe(D.nome);
  const t = CORES_TEMA[D.tema];
  const fundo = fundoJanela(D);
  const L = [];
  const gruposOpcao = new Map();
  let usaImagem = false, usaDica = false;
  const estilos = [];
  const fl = gerarFluxos(D, true);
  const anim = usaAnimacao(D, fl);
  if (anim) fl.importa.add('math');
  if (fl.importa.has('imagem')) usaImagem = true;
  const ev = (e, campo) => fl.conexoes.get(`${e.id}:${campo}`) || e[campo];

  // Tkinter não tem fundo transparente: usa a cor do que está atrás do elemento.
  const fundoAtras = (e) => {
    const idx = D.elementos.indexOf(e);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    for (let i = idx - 1; i >= 0; i--) {
      const o = D.elementos[i];
      if (!o.visivel || cx < o.x || cx > o.x + o.w || cy < o.y || cy > o.y + o.h) continue;
      if (o.tipo === 'retangulo') return cor(o, 'fundo', D);
      if (o.tipo === 'texto' && o.fundo) return o.fundo;
      if (o.tipo === 'botao') return cor(o, 'fundo', D);
    }
    return fundo;
  };
  const f = (e) => `self.fonte(${py(e.fonte || FONTE_PADRAO)}, ${e.tamanho || 14}${e.negrito ? ', negrito=True' : ''}${e.italico ? ', italico=True' : ''})`;
  const contorno = (e) => { const b = cor(e, 'borda', D); return b ? `highlightthickness=${e.bordaLargura || 1}, highlightbackground=${py(b)}, highlightcolor=${py(D.cor)}` : 'highlightthickness=0'; };

  for (const e of D.elementos) {
    const n = `self.${e.nome}`;
    const a = [];
    const add = (...xs) => a.push(...xs.map((x) => '        ' + x));
    let interativo = true;
    switch (e.tipo) {
      case 'texto': {
        const anc = (({ topo: 'n', meio: '', base: 's' }[e.alinharV] ?? '') + ({ esquerda: 'w', centro: '', direita: 'e' }[e.alinhar] ?? '')) || 'center';
        add(`${n} = tk.Label(self, text=${py(e.texto)}, bg=${py(e.fundo || fundoAtras(e))}, fg=${py(cor(e, 'corTexto', D))}, font=${f(e)}, anchor=${py(anc)}, justify=${py({ esquerda: 'left', centro: 'center', direita: 'right' }[e.alinhar] || 'left')}, bd=0)`);
        if (e.quebra) add(`${n}.bind("<Configure>", lambda ev: ev.widget.configure(wraplength=ev.width))`);
        interativo = false;
        break;
      }
      case 'botao': {
        const fb = cor(e, 'fundo', D);
        add(`${n} = tk.Button(self, text=${py(e.texto)}, bg=${py(fb)}, fg=${py(cor(e, 'corTexto', D))}, activebackground=${py(escurecer(fb, 0.88))}, activeforeground=${py(cor(e, 'corTexto', D))}, relief="flat", bd=0, ${contorno(e)}, font=${f(e)}, cursor="hand2"${ev(e, 'aoClicar') ? `, command=self.${ev(e, 'aoClicar')}` : ''})`);
        break;
      }
      case 'campo': {
        add(`self.${e.nome}_texto = tk.StringVar(value=${py(e.texto)})`,
          `${n} = tk.Entry(self, textvariable=self.${e.nome}_texto, bg=${py(cor(e, 'fundo', D))}, fg=${py(cor(e, 'corTexto', D))}, insertbackground=${py(cor(e, 'corTexto', D))}, relief="flat", bd=4, ${contorno(e)}, font=${f(e)}${e.senha ? ', show="•"' : ''})`);
        if (e.placeholder) { usaDica = true; add(`self.dica_no_campo(${n}, self.${e.nome}_texto, ${py(e.placeholder)})`); }
        if (ev(e, 'aoMudar')) add(`self.${e.nome}_texto.trace_add("write", lambda *_: self.${ev(e, 'aoMudar')}(self.${e.nome}_texto.get()))`);
        if (ev(e, 'aoEnter')) add(`${n}.bind("<Return>", lambda _e: self.${ev(e, 'aoEnter')}())`);
        break;
      }
      case 'area': {
        add(`${n} = tk.Text(self, bg=${py(cor(e, 'fundo', D))}, fg=${py(cor(e, 'corTexto', D))}, insertbackground=${py(cor(e, 'corTexto', D))}, relief="flat", bd=0, padx=8, pady=6, ${contorno(e)}, font=${f(e)}, wrap="word")`);
        if (e.texto) add(`${n}.insert("1.0", ${py(e.texto)})`);
        break;
      }
      case 'numero': {
        add(`self.${e.nome}_valor = tk.IntVar(value=${e.valor})`,
          `${n} = tk.Spinbox(self, from_=${e.minimo}, to=${e.maximo}, increment=${e.passo || 1}, textvariable=self.${e.nome}_valor, bg=${py(cor(e, 'fundo', D))}, fg=${py(cor(e, 'corTexto', D))}, buttonbackground=${py(t.sup)}, insertbackground=${py(cor(e, 'corTexto', D))}, relief="flat", bd=2, ${contorno(e)}, font=${f(e)}${ev(e, 'aoMudar') ? `, command=lambda: self.${ev(e, 'aoMudar')}(self.${e.nome}_valor.get())` : ''})`);
        break;
      }
      case 'caixa': {
        const bg = fundoAtras(e);
        add(`self.${e.nome}_marcado = tk.BooleanVar(value=${e.marcado ? 'True' : 'False'})`,
          `${n} = tk.Checkbutton(self, text=${py(e.texto)}, variable=self.${e.nome}_marcado, bg=${py(bg)}, fg=${py(cor(e, 'corTexto', D))}, activebackground=${py(bg)}, activeforeground=${py(cor(e, 'corTexto', D))}, selectcolor=${py(D.tema === 'escuro' ? t.sup : '#FFFFFF')}, font=${f(e)}, anchor="w", bd=0, highlightthickness=0${ev(e, 'aoMudar') ? `, command=lambda: self.${ev(e, 'aoMudar')}(self.${e.nome}_marcado.get())` : ''})`);
        break;
      }
      case 'opcao': {
        const bg = fundoAtras(e);
        const g = `self.grupo_${e.grupoOpcao}`;
        if (!gruposOpcao.has(e.grupoOpcao)) {
          const marcado = D.elementos.find((o) => o.tipo === 'opcao' && o.grupoOpcao === e.grupoOpcao && o.marcado);
          gruposOpcao.set(e.grupoOpcao, true);
          add(`${g} = tk.StringVar(value=${py(marcado ? marcado.nome : '')})`);
        }
        add(`${n} = tk.Radiobutton(self, text=${py(e.texto)}, variable=${g}, value=${py(e.nome)}, bg=${py(bg)}, fg=${py(cor(e, 'corTexto', D))}, activebackground=${py(bg)}, activeforeground=${py(cor(e, 'corTexto', D))}, selectcolor=${py(D.tema === 'escuro' ? t.sup : '#FFFFFF')}, font=${f(e)}, anchor="w", bd=0, highlightthickness=0${ev(e, 'aoMudar') ? `, command=lambda: self.${ev(e, 'aoMudar')}(True)` : ''})`);
        break;
      }
      case 'combo': {
        const itens = itensDe(e.itens);
        add(`${n} = ttk.Combobox(self, values=[${itens.map(py).join(', ')}], state="readonly", font=${f(e)})`);
        if (itens.length) add(`${n}.current(0)`);
        if (ev(e, 'aoMudar')) add(`${n}.bind("<<ComboboxSelected>>", lambda _e: self.${ev(e, 'aoMudar')}(${n}.get()))`);
        break;
      }
      case 'slider': {
        const st = `${e.nome}.Horizontal.TScale`;
        estilos.push(`        estilo.configure(${py(st)}, background=${py(fundoAtras(e))}, troughcolor=TRILHO, bordercolor=${py(fundoAtras(e))}, lightcolor=${py(cor(e, 'cor', D))}, darkcolor=${py(cor(e, 'cor', D))})`);
        add(`${n} = ttk.Scale(self, from_=${e.minimo}, to=${e.maximo}, value=${e.valor}, orient="horizontal", style=${py(st)}${ev(e, 'aoMudar') ? `, command=lambda v: self.${ev(e, 'aoMudar')}(round(float(v)))` : ''})`);
        break;
      }
      case 'progresso': {
        const st = `${e.nome}.Horizontal.TProgressbar`;
        estilos.push(`        estilo.configure(${py(st)}, background=${py(cor(e, 'cor', D))}, troughcolor=TRILHO, borderwidth=0, lightcolor=${py(cor(e, 'cor', D))}, darkcolor=${py(cor(e, 'cor', D))}, bordercolor=TRILHO)`);
        add(`${n} = ttk.Progressbar(self, maximum=100, value=${e.valor}, style=${py(st)})`);
        interativo = false;
        break;
      }
      case 'lista': {
        add(`${n} = tk.Listbox(self, bg=${py(cor(e, 'fundo', D))}, fg=${py(cor(e, 'corTexto', D))}, selectbackground=COR, selectforeground="white", relief="flat", bd=4, ${contorno(e)}, activestyle="none", font=${f(e)})`);
        for (const it of itensDe(e.itens)) add(`${n}.insert("end", ${py(it)})`);
        if (ev(e, 'aoMudar')) add(`${n}.bind("<<ListboxSelect>>", lambda _e: ${n}.curselection() and self.${ev(e, 'aoMudar')}(${n}.get(${n}.curselection()[0])))`);
        break;
      }
      case 'tabela': {
        const cols = csvDe(e.colunas).filter(Boolean);
        add(`colunas = [${cols.map(py).join(', ')}]`, `${n} = ttk.Treeview(self, columns=colunas, show="headings")`,
          'for coluna in colunas:', `    ${n}.heading(coluna, text=coluna)`, `    ${n}.column(coluna, width=80, stretch=True)`);
        for (const r of itensDe(e.linhas).map(csvDe)) add(`${n}.insert("", "end", values=[${r.map(py).join(', ')}])`);
        break;
      }
      case 'imagem': {
        add(`${n} = tk.Label(self, bg=${py(fundoAtras(e))}, bd=0)`);
        if (e.arquivo) { usaImagem = true; add(`self.mostrar_imagem(${n}, ${py(e.arquivo)}, ${py(e.ajuste || 'conter')})`); } else add(`${n}.configure(text="Imagem", fg=${py(t.mut)})`);
        interativo = false;
        break;
      }
      case 'retangulo': {
        add(`${n} = tk.Frame(self, bg=${py(cor(e, 'fundo', D))}, ${contorno(e).replace(/, highlightcolor=[^,)]+/, '')})`);
        interativo = false;
        break;
      }
      case 'elipse': {
        const b = cor(e, 'borda', D);
        add(`${n} = tk.Canvas(self, bg=${py(fundoAtras(e))}, highlightthickness=0, bd=0)`,
          `${n}.create_oval(1, 1, ${e.w - 1}, ${e.h - 1}, fill=${py(cor(e, 'fundo', D))}, outline=${py(b || cor(e, 'fundo', D))}, width=${b ? e.bordaLargura || 1 : 0}, tags="forma")`,
          `${n}.bind("<Configure>", lambda ev: ev.widget.coords("forma", 1, 1, ev.width - 1, ev.height - 1))`);
        interativo = false;
        break;
      }
      case 'linha': {
        add(`${n} = tk.Frame(self, bg=${py(cor(e, 'cor', D))})`);
        interativo = false;
        break;
      }
    }
    if (!e.habilitado && interativo) add(e.tipo === 'combo' ? `${n}.configure(state="disabled")` : e.tipo === 'tabela' || e.tipo === 'slider' ? `${n}.state(["disabled"])` : `${n}.configure(state="disabled")`);
    add(`self.colocar(${n}, ${e.x}, ${e.y}, ${e.w}, ${e.h}, ${py(e.rh)}, ${py(e.rv)})`);
    if (!e.visivel) add(`self.esconder(${n})`);
    L.push(...a, '');
  }
  while (L.length && L[L.length - 1] === '') L.pop();
  const metodos = metodosUnicos(D);
  const ui = [
    ...cabecalho(D),
    ...importsDosBlocos(fl).filter((x) => x.startsWith('import ')),
    'import sys',
    'import tkinter as tk',
    ...importsDosBlocos(fl).filter((x) => x.startsWith('from ')),
    'from pathlib import Path',
    `from tkinter import ${[['colorchooser', 'colorchooser'], ['filedialog', 'filedialog'], ['mensagem', 'messagebox'], ['simpledialog', 'simpledialog']].filter(([k]) => fl.importa.has(k)).map(([, m]) => m).concat('ttk').join(', ')}`,
    ...(fl.importa.has('estado') ? ['', 'from ui import estado  # variáveis compartilhadas entre as telas'] : []),
    '',
    'if sys.platform == "win32":',
    '    import ctypes',
    '',
    '    try:',
    '        ctypes.windll.shcore.SetProcessDpiAwareness(1)  # nítido em telas de alta resolução',
    '    except Exception:',
    '        pass',
    '',
    `LARGURA, ALTURA = ${D.largura}, ${D.altura}  # tamanho desenhado no Designer`,
    ...(D.rolagem ? [`ALTURA_VISIVEL = ${D.alturaVisivel}  # a janela mostra só isto; o resto aparece rolando`] : []),
    `FUNDO, SUPERFICIE, BORDA, TEXTO, TRILHO = ${py(fundo)}, ${py(t.sup)}, ${py(t.bd)}, ${py(t.tx)}, ${py(t.trilho)}`,
    `COR = ${py(D.cor)}`,
    '',
    '',
    ...(usaImagem ? [...funcaoCaminho, '', ''] : []),
    ...(fl.usaNumero ? [...FUNCAO_NUMERO, '', ''] : []),
    ...(anim ? [...PY_QUADRO, '', ''] : []),
    '# A primeira tela que abre é a janela principal (tk.Tk); as que ela abrir vêm por cima (tk.Toplevel).',
    'JANELA = tk.Toplevel if tk._default_root is not None else tk.Tk',
    '',
    '',
    `class ${C}UI(JANELA):`,
    `    """Tela “${D.titulo.replace(/"/g, "'")}”."""`,
    '',
    '    def __init__(self):',
    '        super().__init__()',
    '        self.escala = self.winfo_fpixels("1i") / 96  # acompanha o zoom do Windows',
    '        self._lugares = {}',
    `        self.title(${py(D.titulo)})`,
    D.rolagem ? '        self.geometry(f"{round(LARGURA * self.escala) + 16}x{round(ALTURA_VISIVEL * self.escala)}")' : '        self.geometry(f"{round(LARGURA * self.escala)}x{round(ALTURA * self.escala)}")',
    '        self.configure(bg=FUNDO)',
    D.redimensionavel ? '        self.resizable(True, True)' : '        self.resizable(False, False)',
    '        estilo = ttk.Style(self)',
    '        estilo.theme_use("clam")',
    '        estilo.configure("TCombobox", fieldbackground=SUPERFICIE, background=SUPERFICIE, foreground=TEXTO, bordercolor=BORDA, arrowcolor=TEXTO, padding=4)',
    '        estilo.map("TCombobox", fieldbackground=[("readonly", SUPERFICIE)], foreground=[("readonly", TEXTO)])',
    '        estilo.configure("Treeview", background=SUPERFICIE, fieldbackground=SUPERFICIE, foreground=TEXTO, bordercolor=BORDA, rowheight=round(26 * self.escala))',
    `        estilo.configure("Treeview.Heading", background=${py(t.barra)}, foreground=TEXTO, bordercolor=BORDA, relief="flat")`,
    '        estilo.map("Treeview", background=[("selected", COR)], foreground=[("selected", "white")])',
    ...estilos,
    ...(fl.iniciar.length ? ['', '        # Variáveis do editor de Funções', ...fl.iniciar] : []),
    ...(D.rolagem ? [
      '',
      '        # Tela com rolagem: os elementos ficam numa área que desce',
      '        self._tela_canvas = tk.Canvas(self, bg=FUNDO, highlightthickness=0, bd=0, yscrollincrement=20)',
      '        self._barra = ttk.Scrollbar(self, orient="vertical", command=self._tela_canvas.yview)',
      '        self._tela_canvas.configure(yscrollcommand=self._barra.set)',
      '        self._barra.pack(side="right", fill="y")',
      '        self._tela_canvas.pack(side="left", fill="both", expand=True)',
      '        self._area = tk.Frame(self._tela_canvas, bg=FUNDO)',
      '        self._area_id = self._tela_canvas.create_window(0, 0, window=self._area, anchor="nw")',
      '        self._tela_canvas.bind("<Configure>", self._ajustar_area)',
      '        self.bind("<MouseWheel>", self._rodinha)',
      '        self.bind("<Button-4>", lambda _e: self._tela_canvas.yview_scroll(-3, "units"))',
      '        self.bind("<Button-5>", lambda _e: self._tela_canvas.yview_scroll(3, "units"))',
    ] : []),
    '',
    ...(D.rolagem ? L.map(paiArea) : L),
    ...(chamadasAoAbrir(D).length ? ['', '        # Animações ao abrir (Designer › Animação)', ...chamadasAoAbrir(D)] : []),
    ...(fl.aoFechar ? ['', `        self.protocol("WM_DELETE_WINDOW", self.${fl.aoFechar})`] : []),
    ...(fl.aoAbrir ? ['', '        self.after(0, self._fluxo_ao_abrir)'] : []),
    '',
    '    def fonte(self, familia, tamanho, negrito=False, italico=False):',
    '        """Fonte em pixels, do mesmo tamanho que aparece no Designer."""',
    '        estilo = " ".join(x for x, ok in (("bold", negrito), ("italic", italico)) if ok) or "normal"',
    '        return (familia, -round(tamanho * self.escala), estilo)',
    '',
    ...(D.rolagem ? [
      '    def _ajustar_area(self, evento):',
      '        altura = max(evento.height, round(ALTURA * self.escala))',
      '        self._tela_canvas.itemconfigure(self._area_id, width=evento.width, height=altura)',
      '        self._tela_canvas.configure(scrollregion=(0, 0, evento.width, altura))',
      '',
      '    def _rodinha(self, evento):',
      '        if isinstance(evento.widget, (tk.Text, tk.Listbox, ttk.Treeview)):',
      '            return  # esses já rolam sozinhos',
      '        passos = int(-evento.delta / 120) or (-1 if evento.delta > 0 else 1)',
      '        self._tela_canvas.yview_scroll(passos * 3, "units")',
      '',
    ] : []),
    '    def colocar(self, widget, x, y, w, h, horiz="esq", vert="topo"):',
    '        """Posiciona como no Designer e segue as restrições quando a janela muda de tamanho."""',
    '        self._lugares[widget] = (x, y, w, h, horiz, vert)',
    '        self._aplicar(widget, x, y, w, h, horiz, vert)',
    '',
    '    def _aplicar(self, widget, x, y, w, h, horiz, vert):',
    '        e = self.escala',
    '        if horiz == "dir":',
    '            op = {"relx": 1, "x": (x - LARGURA) * e, "width": w * e}',
    '        elif horiz == "esqdir":',
    '            op = {"x": x * e, "relwidth": 1, "width": (w - LARGURA) * e}',
    '        elif horiz == "centro":',
    '            op = {"relx": 0.5, "x": (x - LARGURA / 2) * e, "width": w * e}',
    '        elif horiz == "escala":',
    '            op = {"relx": x / LARGURA, "relwidth": w / LARGURA}',
    '        else:',
    '            op = {"x": x * e, "width": w * e}',
    '        if vert == "base":',
    '            op.update(rely=1, y=(y - ALTURA) * e, height=h * e)',
    '        elif vert == "topobase":',
    '            op.update(y=y * e, relheight=1, height=(h - ALTURA) * e)',
    '        elif vert == "centro":',
    '            op.update(rely=0.5, y=(y - ALTURA / 2) * e, height=h * e)',
    '        elif vert == "escala":',
    '            op.update(rely=y / ALTURA, relheight=h / ALTURA)',
    '        else:',
    '            op.update(y=y * e, height=h * e)',
    '        widget.place(**op)',
    '',
    '    def mostrar(self, widget):',
    '        self.colocar(widget, *self._lugares[widget])',
    '',
    '    def esconder(self, widget):',
    '        widget.place_forget()',
    ...(anim ? PY_ANIMAR_TK : []),
    ...fl.metodos,
    ...(usaDica ? [
      '',
      '    def dica_no_campo(self, campo, variavel, texto):',
      '        """Texto cinza de exemplo que some quando a pessoa digita."""',
      `        dica = tk.Label(campo, text=texto, bg=campo["bg"], fg=${py(t.mut)}, font=campo["font"], cursor="xterm", bd=0)`,
      '        dica.bind("<Button-1>", lambda _e: campo.focus_set())',
      '',
      '        def atualizar(*_):',
      '            if variavel.get():',
      '                dica.place_forget()',
      '            else:',
      '                dica.place(x=2, rely=0.5, anchor="w")',
      '',
      '        variavel.trace_add("write", atualizar)',
      '        atualizar()',
    ] : []),
    ...(usaImagem ? [
      '',
      '    def mostrar_imagem(self, rotulo, arquivo, ajuste):',
      '        """Mostra a imagem ajustada ao tamanho do rótulo (com Pillow, se estiver instalado)."""',
      '        try:',
      '            from PIL import Image, ImageTk',
      '        except ImportError:',
      '            try:',
      '                rotulo.imagem = tk.PhotoImage(file=caminho(arquivo))',
      '                rotulo.configure(image=rotulo.imagem)',
      '            except tk.TclError:',
      '                rotulo.configure(text=arquivo)',
      '            return',
      '        try:',
      '            original = Image.open(caminho(arquivo))',
      '        except OSError:',
      '            rotulo.configure(text=arquivo)',
      '            return',
      '',
      '        def redesenhar(evento):',
      '            w, h = max(1, evento.width), max(1, evento.height)',
      '            if ajuste == "esticar":',
      '                tamanho = (w, h)',
      '            else:',
      '                f = (min if ajuste == "conter" else max)(w / original.width, h / original.height)',
      '                tamanho = (max(1, round(original.width * f)), max(1, round(original.height * f)))',
      '            rotulo.imagem = ImageTk.PhotoImage(original.resize(tamanho))',
      '            rotulo.configure(image=rotulo.imagem)',
      '',
      '        rotulo.bind("<Configure>", redesenhar)',
    ] : []),
    ...metodos.flatMap((x) => ['', `    def ${x.metodo}(self, *args):`, `        """${x.tipo === 'clique' ? 'Clique em' : x.tipo === 'enter' ? 'Enter em' : 'Mudança em'} ${x.e.nome}. Escreva o que acontece em ${D.nome}.py."""`]),
    '',
    '',
    'def rodar(classe_tela):',
    '    """Abre a tela. Usado pelo seu arquivo: rodar(MinhaTela)."""',
    '    classe_tela().mainloop()',
    '',
  ];
  return { ui: ui.join('\n'), usuario: arquivoUsuario(D) };
}
