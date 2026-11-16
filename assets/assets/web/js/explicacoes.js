// Explicações em português para erros do Python e regras do Ruff.
import { CATALOGO, PAI, TIPOS_PT } from './erros_catalogo.js';

export const RUFF_PT = {
  F401: 'Import que não é usado em lugar nenhum',
  F403: '“import *” esconde de onde vêm os nomes',
  F405: 'Nome que pode ter vindo de um “import *”',
  F541: 'f-string sem nenhuma {variável}: o f é desnecessário',
  F601: 'Chave repetida no dicionário (a última vence)',
  F631: 'assert com tupla é sempre verdadeiro',
  F632: 'Use == para comparar valores (is compara identidade)',
  F702: 'continue fora de um loop',
  F704: 'yield fora de uma função',
  F706: 'return fora de uma função',
  F811: 'Este nome já foi definido antes e está sendo substituído',
  F821: 'Nome não definido: erro de digitação ou faltou criar/importar',
  F822: 'Nome em __all__ que não existe',
  F823: 'Variável local usada antes de receber valor',
  F841: 'Variável criada e nunca usada',
  E401: 'Vários imports na mesma linha',
  E402: 'Import no meio do arquivo: o lugar dele é no topo',
  E701: 'Vários comandos na mesma linha (use uma linha para cada)',
  E702: 'Vários comandos na mesma linha separados por ;',
  E703: 'Ponto e vírgula desnecessário no fim da linha',
  E711: 'Compare com None usando “is None”',
  E712: 'Não compare com True/False: use “if x:” ou “if not x:”',
  E713: 'Use “x not in y” em vez de “not x in y”',
  E714: 'Use “x is not y” em vez de “not x is y”',
  E721: 'Para checar tipo, use isinstance()',
  E722: '“except:” sem tipo pega tudo e esconde bugs',
  E731: 'Não guarde lambda em variável: use def',
  E741: 'Nome ambíguo (l, O ou I parecem 1 e 0)',
  E902: 'Não consegui ler o arquivo',
};

export function textoRuff(codigo, msg) {
  return RUFF_PT[codigo] ? `${RUFF_PT[codigo]}  (${msg})` : msg;
}

// Encontra o último traceback numa saída e explica (com o catálogo de erros).
const NOME_ERRO = /^([A-Za-z_][\w.]*)(?::\s?(.*))?$/;
const PARECE_ERRO = /(Error|Exception|Interrupt|Exit|Iteration|Group|Terminator|Warning|BadZipFile|InvalidOperation|Timeout|Schema|URL|Redirects|^[\w.]+\.error)$/;

export function analisarTraceback(saida, raiz) {
  let i = saida.lastIndexOf('Traceback (most recent call last):');
  if (i < 0) {
    // SyntaxError do arquivo principal não tem a linha "Traceback": começa direto em File "...", line N
    const m = /^ {2}File "[^"]+", line \d+\s*$/m.exec(saida);
    if (!m) return null;
    i = m.index;
  }
  const linhas = saida.slice(i).split('\n');
  const frames = [];
  let erroTipo = '', erroMsg = '', depoisDoFrame = false;
  for (const l of linhas) {
    const f = l.match(/^\s*File "([^"]+)", line (\d+)(?:, in (.+))?/);
    if (f) { frames.push({ arquivo: f[1], linha: +f[2], funcao: f[3] || '' }); depoisDoFrame = true; continue; }
    if (!depoisDoFrame || /^\s/.test(l) || !l.trim() || l.startsWith('Traceback')) continue;
    const e = NOME_ERRO.exec(l.trimEnd());
    if (e && (e[2] !== undefined || PARECE_ERRO.test(e[1])) && (PARECE_ERRO.test(e[1]) || /[A-Z]/.test(e[1][0]) || e[1].includes('.'))) {
      erroTipo = e[1]; erroMsg = e[2] || ''; depoisDoFrame = false;
    }
  }
  if (!erroTipo) return null;
  const doProjeto = frames.filter((f) => raiz && f.arquivo.toLowerCase().startsWith(raiz.toLowerCase()) && !/[\\/]\.venv[\\/]/.test(f.arquivo));
  const alvo = doProjeto[doProjeto.length - 1] || frames[frames.length - 1] || null;
  const tipo = erroTipo.split('.').pop();
  return { tipo, tipoCompleto: erroTipo, msg: erroMsg, alvo, ...explicarErro(tipo, erroMsg, erroTipo) };
}

function preencher(s, m, msg) {
  if (!s) return s;
  return s.replace(/\$(r?)(\d)/g, (_, cru, n) => {
    if (n === '0') return msg;
    const v = m && m[+n];
    if (v === undefined || v === null || v === '') return '…';
    return cru ? v : TIPOS_PT[v] || v;
  });
}

function montar(ent, m, msg, tipo) {
  const r = { titulo: preencher(ent.titulo, m, msg), texto: preencher(ent.texto, m, msg), grupo: ent.grupo, acao: ent.acao };
  if (ent.exemplo) r.exemplo = ent.exemplo.map((x) => preencher(x, m, msg));
  const sug = /Did you mean:? '?([^'?]+)'?\?/.exec(msg);
  if (sug && !r.titulo.includes(sug[1])) r.sugestao = sug[1];
  if (tipo === 'ModuleNotFoundError') {
    const mm = msg.match(/No module named '([^'.]+)/);
    if (mm && !['ui', 'estado', 'tkinter', '_tkinter'].includes(mm[1]) && !/is not a package/.test(msg)) r.modulo = mm[1];
  }
  return r;
}

/** Explica um erro (tipo curto, mensagem e nome completo como "sqlite3.OperationalError"). */
export function explicarErro(tipo, msg, tipoCompleto) {
  msg = msg || '';
  let nomes = new Set([tipo, tipoCompleto].filter(Boolean));
  const vistos = new Set();
  let atual = tipo;
  for (;;) {
    for (const ent of CATALOGO) {
      if (!ent.tipos || !ent.tipos.some((t) => nomes.has(t))) continue;
      const m = ent.re ? ent.re.exec(msg) : [msg];
      if (m) return montar(ent, m, msg, tipo);
    }
    vistos.add(atual);
    atual = PAI[atual];
    if (!atual || vistos.has(atual)) break;
    nomes = new Set([atual]);
  }
  return { titulo: tipo, texto: 'O programa parou com este erro. Peça para a IA explicar e corrigir.', grupo: '' };
}

/** Problemas que não vêm em traceback: avisos, mensagens do Qt, pip/uv/PyInstaller, códigos de saída do Windows. */
export function analisarSaida(saida, codigo) {
  const texto = saida + (codigo ? `\nexit code ${codigo >>> 0}` : '');
  const out = [];
  for (const ent of CATALOGO) {
    if (ent.tipos) continue;
    const m = ent.re.exec(texto);
    if (!m) continue;
    const r = montar(ent, m, m[0], '');
    if (out.some((x) => x.titulo === r.titulo)) continue;
    r.aviso = ent.grupo.startsWith('Avisos');
    r.tipo = r.aviso ? 'Aviso' : ent.grupo.startsWith('Janelas') ? 'Qt' : ent.grupo.startsWith('Outras') ? 'Linguagem' : 'Ferramenta';
    out.push(r);
    if (out.length >= 3) break;
  }
  return out;
}

export { CATALOGO };
