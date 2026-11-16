// Animações do Designer: a mesma lista de efeitos para a prévia (navegador) e para o código
// gerado (PySide6 e Tkinter). As contas são iguais nos três para ficar parecido de verdade.

export const ANIMACOES = [
  ['aparecer', 'Aparecer (surgir suave)'],
  ['deslizar_cima', 'Subir até o lugar'],
  ['deslizar_baixo', 'Descer até o lugar'],
  ['deslizar_esquerda', 'Entrar pela direita'],
  ['deslizar_direita', 'Entrar pela esquerda'],
  ['crescer', 'Crescer'],
  ['pulsar', 'Pulsar'],
  ['tremer', 'Tremer'],
  ['piscar', 'Piscar'],
  ['sumir', 'Sumir'],
];
export const ENTRADAS = new Set(['aparecer', 'deslizar_cima', 'deslizar_baixo', 'deslizar_esquerda', 'deslizar_direita', 'crescer']);
export const EFEITOS = new Set(ANIMACOES.map(([k]) => k));
/** Efeitos que fazem sentido "ao abrir a tela". */
export const ANIMACOES_ABRIR = [['', 'Nenhuma'], ...ANIMACOES.filter(([k]) => k !== 'sumir')];

/** Estado do efeito no instante t (0 a 1): deslocamento, escala, opacidade e se aparece. */
export function quadro(efeito, t) {
  const s = 1 - (1 - t) ** 3; // começa rápido e termina suave
  let dx = 0, dy = 0, k = 1, op = 1, vis = true;
  switch (efeito) {
    case 'aparecer': op = s; dy = 12 * (1 - s); break;
    case 'deslizar_cima': dy = 40 * (1 - s); op = s; break;
    case 'deslizar_baixo': dy = -40 * (1 - s); op = s; break;
    case 'deslizar_esquerda': dx = 40 * (1 - s); op = s; break;
    case 'deslizar_direita': dx = -40 * (1 - s); op = s; break;
    case 'crescer': k = 0.6 + 0.4 * s; op = s; break;
    case 'pulsar': k = 1 + 0.08 * Math.sin(t * Math.PI); break;
    case 'tremer': dx = Math.sin(t * Math.PI * 8) * 10 * (1 - t); break;
    case 'piscar': op = Math.abs(Math.cos(t * Math.PI * 2)); vis = Math.cos(t * Math.PI * 4) >= 0; break;
    case 'sumir': op = 1 - t; dy = 12 * t; if (t >= 1) vis = false; break;
  }
  return { dx, dy, k, op, vis };
}

/** Toca o efeito num elemento do Designer (Web Animations). */
export function tocarNoNavegador(dom, efeito, ms = 400, atraso = 0) {
  if (!dom || !EFEITOS.has(efeito) || !dom.animate) return null;
  const quadros = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const q = quadro(efeito, i / N);
    quadros.push({ offset: i / N, transform: `translate(${q.dx}px, ${q.dy}px) scale(${q.k})`, opacity: efeito === 'piscar' ? q.op : q.op });
  }
  if (efeito === 'sumir') quadros[N].opacity = 0;
  return dom.animate(quadros, { duration: Math.max(50, ms), delay: Math.max(0, atraso), easing: 'linear', fill: 'backwards' });
}

// ------------------------------------------------------------------ código Python
const DOC = '        """Anima um elemento. Efeitos: aparecer, sumir, deslizar_cima, deslizar_baixo,\n        deslizar_esquerda, deslizar_direita, crescer, pulsar, tremer e piscar.\n        ms é a duração e atraso é quanto esperar antes de começar (em milissegundos)."""';

const CONTAS = [
  '    s = 1 - (1 - t) ** 3  # começa rápido e termina suave',
  '    dx = dy = 0.0',
  '    k = op = 1.0',
  '    if efeito == "aparecer":',
  '        op, dy = s, 12 * (1 - s)',
  '    elif efeito == "deslizar_cima":',
  '        op, dy = s, 40 * (1 - s)',
  '    elif efeito == "deslizar_baixo":',
  '        op, dy = s, -40 * (1 - s)',
  '    elif efeito == "deslizar_esquerda":',
  '        op, dx = s, 40 * (1 - s)',
  '    elif efeito == "deslizar_direita":',
  '        op, dx = s, -40 * (1 - s)',
  '    elif efeito == "crescer":',
  '        op, k = s, 0.6 + 0.4 * s',
  '    elif efeito == "pulsar":',
  '        k = 1 + 0.08 * math.sin(t * math.pi)',
  '    elif efeito == "tremer":',
  '        dx = math.sin(t * math.pi * 8) * 10 * (1 - t)',
  '    elif efeito == "piscar":',
  '        op = abs(math.cos(t * math.pi * 2))',
  '    elif efeito == "sumir":',
  '        op, dy = 1 - t, 12 * t',
  '    return dx, dy, k, op',
];

/** Funções no nível do módulo (as duas bibliotecas usam). */
export const PY_QUADRO = [
  'ENTRADAS = {"aparecer", "deslizar_cima", "deslizar_baixo", "deslizar_esquerda", "deslizar_direita", "crescer"}',
  '',
  '',
  'def quadro_animacao(efeito, t):',
  '    """Onde o elemento está no instante t (0 a 1) da animação: deslocamento, escala e opacidade."""',
  ...CONTAS,
];

/** Método animar() da tela no PySide6. */
export const PY_ANIMAR_QT = [
  '',
  '    def animar(self, widget, efeito="pulsar", ms=400, atraso=0):',
  DOC,
  '        anterior = getattr(widget, "_animacao", None)',
  '        if anterior is not None:',
  '            anterior.stop()',
  '            widget._fim_animacao()',
  '        base = widget.geometry()',
  '        opacidade = None',
  '        if widget.graphicsEffect() is None:  # (a sombra também é um efeito; aí só mexe)',
  '            opacidade = QGraphicsOpacityEffect(widget)',
  '            widget.setGraphicsEffect(opacidade)',
  '        animacao = QVariantAnimation(widget)',
  '        animacao.setStartValue(0.0)',
  '        animacao.setEndValue(1.0)',
  '        animacao.setDuration(max(50, int(ms)))',
  '',
  '        def passo(t):',
  '            dx, dy, k, op = quadro_animacao(efeito, float(t))',
  '            w, h = base.width() * k, base.height() * k',
  '            widget.setGeometry(round(base.x() + dx - (w - base.width()) / 2), round(base.y() + dy - (h - base.height()) / 2), max(1, round(w)), max(1, round(h)))',
  '            if opacidade is not None:',
  '                opacidade.setOpacity(op)',
  '            elif efeito == "piscar":',
  '                widget.setVisible(math.cos(float(t) * math.pi * 4) >= 0)',
  '',
  '        def fim():',
  '            widget._animacao = None',
  '            widget.setGeometry(base)',
  '            if opacidade is not None and widget.graphicsEffect() is opacidade:',
  '                widget.setGraphicsEffect(None)',
  '            widget.setVisible(efeito != "sumir")',
  '',
  '        animacao.valueChanged.connect(passo)',
  '        animacao.finished.connect(fim)',
  '        widget._animacao = animacao',
  '        widget._fim_animacao = fim',
  '        if efeito in ENTRADAS:',
  '            passo(0.0)',
  '            if opacidade is None:',
  '                widget.hide()',
  '',
  '        def comecar():',
  '            if widget._animacao is animacao:',
  '                widget.show()',
  '                animacao.start()',
  '',
  '        QTimer.singleShot(max(0, int(atraso)), comecar)',
];

/** Método animar() da tela no Tkinter (sem transparência: usa movimento e piscadas). */
export const PY_ANIMAR_TK = [
  '',
  '    def animar(self, widget, efeito="pulsar", ms=400, atraso=0):',
  DOC,
  '        if widget not in self._lugares:',
  '            return',
  '        x, y, w, h, horiz, vert = self._lugares[widget]',
  '        passos = max(1, round(ms / 16))',
  '        vez = getattr(widget, "_animacao", 0) + 1',
  '        widget._animacao = vez',
  '',
  '        def passo(i):',
  '            if widget._animacao != vez:  # outra animação começou no mesmo elemento',
  '                return',
  '            t = i / passos',
  '            dx, dy, k, _op = quadro_animacao(efeito, t)',
  '            escondido = (efeito == "piscar" and math.cos(t * math.pi * 4) < 0) or (efeito == "sumir" and i >= passos)',
  '            if escondido:',
  '                widget.place_forget()',
  '            elif i >= passos:',
  '                self._aplicar(widget, x, y, w, h, horiz, vert)',
  '            else:',
  '                ww, hh = w * k, h * k',
  '                self._aplicar(widget, x + dx - (ww - w) / 2, y + dy - (hh - h) / 2, ww, hh, horiz, vert)',
  '            if i < passos:',
  '                self.after(16, passo, i + 1)',
  '',
  '        if efeito in ENTRADAS:',
  '            widget.place_forget()',
  '        self.after(max(0, int(atraso)), passo, 0)',
];

/** Chamadas de "animação ao abrir" de cada elemento. */
export function chamadasAoAbrir(D) {
  return D.elementos.filter((e) => e.animacao && e.visivel).map((e) => `        self.animar(self.${e.nome}, "${e.animacao}", ${e.animMs || 400}, ${e.animAtraso || 0})`);
}
export const usaAnimacao = (D, fl) => D.elementos.some((e) => e.animacao) || (fl && fl.importa.has('animar'));
