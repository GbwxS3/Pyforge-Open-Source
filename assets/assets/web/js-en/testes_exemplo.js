// "Testes sem escrever testes": a pessoa dá um exemplo, o PyForge roda, ela confirma e vira um teste pytest.
import { el, esc, ic, toast, modal, juntar, relativo, separadorDe } from './ui.js';
import { api, q, iniciarJob } from './api.js';

const MARCA = '@@PYFORGE@@';

/** Funções do nível de cima de um arquivo .py: [{nome, params:[...]}] */
export function funcoesDoArquivo(texto) {
  const out = [];
  for (const m of texto.matchAll(/^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/gm)) {
    if (m[1].startsWith('_')) continue;
    const params = m[2].split(',').map((p) => p.trim()).filter((p) => p && !p.startsWith('*') && p !== '/')
      .map((p) => { const [nome, padrao] = p.split('='); return { nome: nome.split(':')[0].trim(), padrao: padrao ? padrao.trim() : '' }; });
    out.push({ nome: m[1], params });
  }
  return out;
}

const py = (s) => JSON.stringify(String(s));

// código que roda o exemplo e devolve uma linha JSON com o resultado
function codigoFuncao(raiz, modulo, funcao, args) {
  return [
    'import builtins, contextlib, io, json, sys, ast, traceback',
    `sys.path.insert(0, ${py(raiz)})`,
    "builtins.input = lambda *a, **k: (_ for _ in ()).throw(RuntimeError('o arquivo chamou input() ao ser importado: coloque o código principal dentro de if __name__ == \"__main__\":'))",
    'saida = io.StringIO()',
    'res = {}',
    'try:',
    '    with contextlib.redirect_stdout(saida):',
    `        from ${modulo} import ${funcao} as _f`,
    `        _r = _f(${args})`,
    '    texto = repr(_r)',
    '    try:',
    '        ast.literal_eval(texto)',
    '        literal = True',
    '    except Exception:',
    '        literal = False',
    "    res = {'ok': True, 'repr': texto, 'literal': literal, 'float': isinstance(_r, float)}",
    'except BaseException as e:',
    "    res = {'ok': False, 'tipo': type(e).__name__, 'msg': str(e)[:400]}",
    "res['print'] = saida.getvalue()[-2000:]",
    `print(${py(MARCA)} + json.dumps(res, ensure_ascii=False))`,
  ].join('\n');
}

function codigoPrograma(raiz, arquivo, entrada) {
  return [
    'import json, subprocess, sys',
    `r = subprocess.run([sys.executable, "-X", "utf8", ${py(arquivo)}], input=${py(entrada)}, capture_output=True, text=True, timeout=30, cwd=${py(raiz)}, encoding="utf-8")`,
    `print(${py(MARCA)} + json.dumps({"ok": r.returncode == 0, "stdout": r.stdout[-4000:], "stderr": r.stderr[-1500:], "codigo": r.returncode}, ensure_ascii=False))`,
  ].join('\n');
}

function rodar(raiz, codigo) {
  return new Promise((resolve, reject) => {
    let saida = '';
    iniciarJob({ tipo: 'avaliar', raiz, codigo }, (ev) => {
      if (ev.t === 'o' || ev.t === 'e') saida += ev.d;
      if (ev.t === 'fim') {
        const i = saida.lastIndexOf(MARCA);
        if (i < 0) { reject(new Error(saida.trim().split('\n').slice(-3).join(' ') || 'Could not run the example.')); return; }
        try { resolve(JSON.parse(saida.slice(i + MARCA.length).split('\n')[0])); } catch (e) { reject(e); }
      }
    }).catch(reject);
  });
}

const CABECALHO = () => [
  '"""Tests created by example in PyForge. Feel free to edit."""',
  'import subprocess',
  'import sys',
  'from pathlib import Path',
  '',
  'import pytest',
  '',
  'RAIZ = Path(__file__).resolve().parent.parent',
  'sys.path.insert(0, str(RAIZ))',
  '',
].join('\n');

/**
 * Abre o assistente de teste por exemplo.
 * @param {{ raiz:string, arquivo:string, texto:string, aoSalvar:(caminhoTeste:string)=>void }} o
 */
export function abrirTesteExemplo({ raiz, arquivo, texto, aoSalvar }) {
  const sep = separadorDe(raiz);
  const rel = relativo(raiz, arquivo).replace(/\\/g, '/');
  const modulo = rel.replace(/\.pyw?$/, '').replace(/\//g, '.');
  const nomeArq = rel.split('/').pop().replace(/\.pyw?$/, '');
  const funcs = funcoesDoArquivo(texto);
  const corpo = el(`<div class="tx">
    <div class="muted" style="font-size:13px;line-height:1.5">Give an example, PyForge runs it and shows the result. If it is right, it becomes a <b>teste</b>: after that, every time you click <b>Run all</b>, it checks that it still gives the same result.</div>
    <label class="rotulo">What to test in <span class="mono">${esc(rel)}</span></label>
    <select class="sel campo" data-alvo>${funcs.map((f, i) => `<option value="f${i}">the function ${esc(f.nome)}(${esc(f.params.map((p) => p.nome).join(', '))})</option>`).join('')}<option value="prog">the whole program (what it prints on screen)</option></select>
    <div data-entradas></div>
    <div class="flex" style="gap:8px"><button class="btn pri" data-rodar>${ic('play', 13)}Run the example</button><span class="dim" data-status style="font-size:12.5px"></span></div>
    <div data-res></div></div>`);
  const sel = corpo.querySelector('[data-alvo]');
  const box = corpo.querySelector('[data-entradas]');
  const res = corpo.querySelector('[data-res]');
  let ultimo = null;

  function pintarEntradas() {
    res.innerHTML = '';
    ultimo = null;
    if (sel.value === 'prog') {
      box.innerHTML = `<label class="rotulo">What the person types (one answer per line, for each input())</label><textarea class="campo mono" data-stdin rows="3" placeholder="Ana
15"></textarea>`;
      return;
    }
    const f = funcs[+sel.value.slice(1)];
    box.innerHTML = f.params.length ? f.params.map((p) => `<label class="rotulo">${esc(p.nome)} <span class="dim" style="font-weight:400">— write it like in Python: 5, "Ana", [1, 2]</span></label><input class="campo mono" data-p="${esc(p.nome)}" value="${esc(p.padrao)}" spellcheck="false">`).join('') : '<div class="dim" style="font-size:12.5px">This function takes nothing.</div>';
  }
  sel.onchange = pintarEntradas;
  if (!funcs.length) sel.value = 'prog';
  pintarEntradas();

  const chamada = () => {
    const f = funcs[+sel.value.slice(1)];
    const args = f.params.map((p) => (corpo.querySelector(`[data-p="${CSS.escape(p.nome)}"]`).value.trim() || 'None'));
    return { f, args: args.join(', '), texto: `${f.nome}(${args.join(', ')})` };
  };

  corpo.querySelector('[data-rodar]').onclick = async () => {
    const st = corpo.querySelector('[data-status]');
    st.textContent = 'Running…';
    res.innerHTML = '';
    try {
      if (sel.value === 'prog') {
        const entrada = corpo.querySelector('[data-stdin]').value.replace(/\r/g, '');
        const r = await rodar(raiz, codigoPrograma(raiz, arquivo, entrada ? entrada + '\n' : ''));
        ultimo = { tipo: 'prog', entrada, r };
        res.innerHTML = `<div class="tx-res ${r.ok ? '' : 'erro'}"><div class="rotulo">${r.ok ? 'O programa escreveu:' : `The program gave an error (code ${r.codigo}):`}</div><pre class="mono">${esc(r.stdout || '(nothing)')}</pre>${r.stderr && !r.ok ? `<pre class="mono err">${esc(r.stderr.trim().split('\n').slice(-3).join('\n'))}</pre>` : ''}</div>`;
      } else {
        const c = chamada();
        const r = await rodar(raiz, codigoFuncao(raiz, modulo, c.f.nome, c.args));
        ultimo = { tipo: 'func', c, r };
        res.innerHTML = r.ok
          ? `<div class="tx-res"><div class="rotulo"><span class="mono">${esc(c.texto)}</span> devolveu:</div><pre class="mono">${esc(r.repr)}</pre>${r.print ? `<div class="dim" style="font-size:12px">And printed on screen: <span class="mono">${esc(r.print.slice(0, 200))}</span></div>` : ''}</div>`
          : `<div class="tx-res erro"><div class="rotulo"><span class="mono">${esc(c.texto)}</span> gave an error:</div><pre class="mono">${esc(r.tipo + ': ' + r.msg)}</pre></div>`;
      }
      st.textContent = '';
      pintarDecisao();
    } catch (e) { st.textContent = ''; res.innerHTML = `<div class="tx-res erro"><pre class="mono">${esc(e.message)}</pre></div>`; }
  };

  function pintarDecisao() {
    const r = ultimo.r;
    const d = el(`<div class="tx-decisao"><div style="font-weight:600">Is this the right result?</div><div class="flex" style="gap:8px;flex-wrap:wrap"></div><div data-outro></div></div>`);
    const bts = d.querySelector('.flex');
    const botao = (txt, cls, fn) => { const b = el(`<button class="btn peq ${cls}">${txt}</button>`); b.onclick = fn; bts.appendChild(b); };
    if (ultimo.tipo === 'func' && r.ok && r.literal) botao(`${ic('check', 13)}Yes, save as a test`, 'pri', () => salvar(r.repr));
    if (ultimo.tipo === 'func' && r.ok && !r.literal) botao(`${ic('check', 13)}Save: just check that it does not raise an error`, 'pri', () => salvar(null));
    if (ultimo.tipo === 'func' && !r.ok) botao(`${ic('check', 13)}Yes, the right result is ${esc(r.tipo)}`, 'pri', () => salvar(undefined, r.tipo));
    if (ultimo.tipo === 'prog' && r.ok) botao(`${ic('check', 13)}Yes, save as a test`, 'pri', () => salvar(r.stdout));
    if (ultimo.tipo === 'func') botao(`${ic('x', 13)}No, the right answer is…`, '', () => {
      const o = d.querySelector('[data-outro]');
      o.innerHTML = `<label class="rotulo">Right result (as in Python):</label><div class="flex" style="gap:6px"><input class="campo mono grow" data-certo placeholder="e.g. 10 or &quot;Hello, Ana&quot;" spellcheck="false"><button class="btn peq pri" data-ok>Save test</button></div><div class="dim" style="font-size:12px;margin-top:4px">The test will FAIL until you fix the function — that's how you use tests to find bugs.</div>`;
      o.querySelector('[data-ok]').onclick = () => { const v = o.querySelector('[data-certo]').value.trim(); if (v) salvar(v); };
      o.querySelector('[data-certo]').focus();
    });
    res.appendChild(d);
  }

  async function salvar(esperado, erroEsperado) {
    const pasta = juntar(raiz, 'tests');
    const caminho = juntar(pasta, `test_${nomeArq}.py`);
    let atual = '';
    try { const f = await api('fs/ler?' + q({ caminho })); atual = f.conteudo || ''; } catch { atual = ''; }
    if (!atual.trim()) atual = CABECALHO();
    const linhas = [];
    let nome;
    if (ultimo.tipo === 'prog') {
      let n = 1;
      while (new RegExp(`def test_programa_${nomeArq}_${n}\\b`).test(atual)) n++;
      nome = `test_programa_${nomeArq}_${n}`;
      const relPy = rel.split('/').map((p) => JSON.stringify(p)).join(' / ');
      linhas.push('', '', '', `def ${nome}():`, `    """Exemplo: digitando ${JSON.stringify(ultimo.entrada).slice(1, -1).slice(0, 60) || '(nothing)'}."""`,
        `    r = subprocess.run([sys.executable, "-X", "utf8", str(RAIZ / ${relPy})], input=${JSON.stringify(ultimo.entrada ? ultimo.entrada + '\n' : '')}, capture_output=True, text=True, timeout=30, cwd=RAIZ, encoding="utf-8")`,
        `    assert r.stdout == ${JSON.stringify(esperado)}`);
    } else {
      const { f, args } = ultimo.c;
      const imp = `from ${modulo} import ${f.nome}`;
      if (!atual.includes(imp)) atual = atual.replace(/(sys\.path\.insert\(0, str\(RAIZ\)\)\n)/, `$1${imp}  # noqa: E402\n`);
      let n = 1;
      while (new RegExp(`def test_${f.nome}_${n}\\b`).test(atual)) n++;
      nome = `test_${f.nome}_${n}`;
      linhas.push('', '', '', `def ${nome}():`);
      if (erroEsperado) linhas.push(`    with pytest.raises(${/^\w+$/.test(erroEsperado) ? erroEsperado : 'Exception'}):`, `        ${f.nome}(${args})`);
      else if (esperado === null) linhas.push(`    ${f.nome}(${args}) # just checks that it does not raise an error`);
      else linhas.push(`    assert ${f.nome}(${args}) == ${ultimo.r.float && esperado === ultimo.r.repr ? `pytest.approx(${esperado})` : esperado}`);
    }
    const novo = atual.replace(/\s*$/, '') + linhas.join('\n') + '\n';
    try {
      await api('fs/escrever', { caminho, conteudo: novo });
      toast(`Test ${nome} saved in tests${sep}test_${nomeArq}.py`, 'ok');
      m.fechar();
      aoSalvar(caminho);
    } catch (e) { toast(e.message, 'err'); }
  }

  const m = modal({ titulo: 'New test by example', corpo, largo: true });
  return m;
}
