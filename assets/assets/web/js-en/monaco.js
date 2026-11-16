// Carrega o Monaco (o editor do VS Code) com o tema e as cores de Python do PyForge.
let promessa = null;

export function carregarMonaco() {
  if (window.monaco) return Promise.resolve(window.monaco);
  if (promessa) return promessa;
  promessa = new Promise((resolver, rejeitar) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/monaco-vs/editor/editor.main.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = '/monaco-vs/loader.js';
    s.onload = () => {
      window.require.config({ paths: { vs: '/monaco-vs' } });
      window.require(['vs/editor/editor.main'], () => {
        try { configurar(window.monaco); } catch (e) { console.error(e); }
        resolver(window.monaco);
      }, rejeitar);
    };
    s.onerror = () => rejeitar(new Error('Não consegui carregar o editor'));
    document.head.appendChild(s);
  });
  return promessa;
}

const PALAVRAS = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'match', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'lazy'];
const EMBUTIDOS = ['abs', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip', '__import__', '__name__', '__file__', 'Exception', 'BaseException', 'ValueError', 'TypeError', 'KeyError', 'IndexError', 'RuntimeError', 'AttributeError', 'NameError', 'ImportError', 'ModuleNotFoundError', 'StopIteration', 'FileNotFoundError', 'OSError', 'ZeroDivisionError', 'NotImplementedError', 'PermissionError', 'TimeoutError', 'UnicodeDecodeError', 'KeyboardInterrupt', 'NotImplemented', 'Ellipsis'];

function configurar(monaco) {
  monaco.languages.setMonarchTokensProvider('python', {
    defaultToken: '',
    keywords: PALAVRAS,
    builtins: EMBUTIDOS,
    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' },
    ],
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/^(\s*)(@[\w.]+)/, ['white', 'decorator']],
        [/\b(def)(\s+)([A-Za-z_]\w*)/, ['keyword', 'white', 'function.def']],
        [/\b(class)(\s+)([A-Za-z_]\w*)/, ['keyword', 'white', 'class.def']],
        [/\b(self|cls)\b/, 'self'],
        [/[A-Za-z_]\w*(?=\s*\()/, { cases: { '@keywords': 'keyword', '@builtins': 'builtin', '~[A-Z].*': 'type', '@default': 'function.call' } }],
        [/[A-Za-z_]\w*/, { cases: { '@keywords': 'keyword', '@builtins': 'builtin', '~[A-Z][A-Z0-9_]+': 'constant', '~[A-Z].*': 'type', '@default': 'identifier' } }],
        [/0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+/, 'number'],
        [/\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?[jJ]?|\.\d[\d_]*([eE][+-]?\d+)?[jJ]?/, 'number'],
        [/[fF][rR]?"""|[rR][fF]"""/, 'string', '@fdTriplo'],
        [/[fF][rR]?'''|[rR][fF]'''/, 'string', '@fsTriplo'],
        [/[fF][rR]?"|[rR][fF]"/, 'string', '@fduplo'],
        [/[fF][rR]?'|[rR][fF]'/, 'string', '@fsimples'],
        [/[rRbBuU]{0,2}"""/, 'string', '@dTriplo'],
        [/[rRbBuU]{0,2}'''/, 'string', '@sTriplo'],
        [/[rRbBuU]{0,2}"/, 'string', '@duplo'],
        [/[rRbBuU]{0,2}'/, 'string', '@simples'],
        [/[{}()[\]]/, '@brackets'],
        [/[-+*/%=<>!&|^~:@]+|->/, 'operator'],
        [/[.,;]/, 'delimiter'],
        [/\s+/, 'white'],
      ],
      duplo: [[/[^\\"]+/, 'string'], [/\\./, 'string.escape'], [/"/, 'string', '@pop']],
      simples: [[/[^\\']+/, 'string'], [/\\./, 'string.escape'], [/'/, 'string', '@pop']],
      dTriplo: [[/[^\\"]+/, 'string'], [/\\./, 'string.escape'], [/"""/, 'string', '@pop'], [/"/, 'string']],
      sTriplo: [[/[^\\']+/, 'string'], [/\\./, 'string.escape'], [/'''/, 'string', '@pop'], [/'/, 'string']],
      fduplo: [[/\{\{|\}\}/, 'string'], [/\{[^}"]*\}/, 'string.interp'], [/[^\\"{}]+/, 'string'], [/\\./, 'string.escape'], [/"/, 'string', '@pop'], [/[{}]/, 'string']],
      fsimples: [[/\{\{|\}\}/, 'string'], [/\{[^}']*\}/, 'string.interp'], [/[^\\'{}]+/, 'string'], [/\\./, 'string.escape'], [/'/, 'string', '@pop'], [/[{}]/, 'string']],
      fdTriplo: [[/\{\{|\}\}/, 'string'], [/\{[^}]*\}/, 'string.interp'], [/[^\\"{}]+/, 'string'], [/\\./, 'string.escape'], [/"""/, 'string', '@pop'], [/["{}]/, 'string']],
      fsTriplo: [[/\{\{|\}\}/, 'string'], [/\{[^}]*\}/, 'string.interp'], [/[^\\'{}]+/, 'string'], [/\\./, 'string.escape'], [/'''/, 'string', '@pop'], [/['{}]/, 'string']],
    },
  });

  monaco.editor.defineTheme('pyforge', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'D6DEEB' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'function.def', foreground: '82AAFF', fontStyle: 'bold' },
      { token: 'function.call', foreground: '82AAFF' },
      { token: 'class.def', foreground: 'FFCB6B', fontStyle: 'bold' },
      { token: 'type', foreground: 'FFCB6B' },
      { token: 'constant', foreground: 'F78C6C' },
      { token: 'builtin', foreground: '89DDFF' },
      { token: 'self', foreground: 'F07178', fontStyle: 'italic' },
      { token: 'decorator', foreground: 'FFCB6B' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'string.escape', foreground: '89DDFF' },
      { token: 'string.interp', foreground: 'F78C6C' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'comment', foreground: '7D8799', fontStyle: 'italic' },
      { token: 'operator', foreground: '89DDFF' },
      { token: 'delimiter', foreground: 'A6ACCD' },
      { token: 'identifier', foreground: 'D6DEEB' },
    ],
    colors: {
      'editor.background': '#0F1116',
      'editor.foreground': '#D6DEEB',
      'editorLineNumber.foreground': '#5E6675',
      'editorLineNumber.activeForeground': '#D7DBE3',
      'editor.lineHighlightBackground': '#171A21',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#2A3A6099',
      'editor.inactiveSelectionBackground': '#2A3A6055',
      'editorCursor.foreground': '#E7E9EE',
      'editorWhitespace.foreground': '#2A2F39',
      'editorIndentGuide.background1': '#1E222A',
      'editorIndentGuide.activeBackground1': '#3A4150',
      'editorWidget.background': '#1A1D24',
      'editorWidget.border': '#2E3440',
      'editorSuggestWidget.background': '#1A1D24',
      'editorSuggestWidget.border': '#2E3440',
      'editorSuggestWidget.selectedBackground': '#1F2840',
      'editorHoverWidget.background': '#1A1D24',
      'editorHoverWidget.border': '#2E3440',
      'editorGutter.background': '#0F1116',
      'minimap.background': '#0F1116',
      'scrollbarSlider.background': '#2A2F3988',
      'scrollbarSlider.hoverBackground': '#3A415099',
      'editorBracketHighlight.foreground1': '#FFD98A',
      'editorBracketHighlight.foreground2': '#D7B4FF',
      'editorBracketHighlight.foreground3': '#8FB0FF',
      'editorBracketHighlight.foreground4': '#7EE2A0',
      'editorError.foreground': '#F2575A',
      'editorWarning.foreground': '#E3A33B',
      'editorInfo.foreground': '#6E9BFF',
      'diffEditor.insertedTextBackground': '#3FB95033',
      'diffEditor.removedTextBackground': '#F2575A33',
      'input.background': '#0F1116',
      'focusBorder': '#3A4E80',
    },
  });
  monaco.editor.setTheme('pyforge');
}
