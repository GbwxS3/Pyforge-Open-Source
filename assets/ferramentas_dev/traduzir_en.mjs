// Gera assets/web/js-en/: cópia dos arquivos JS com os textos da interface em inglês.
// Uso: node ferramentas_dev/traduzir_en.mjs   (precisa de: npm i acorn acorn-walk, em qualquer pasta acima)
// O dicionário fica em ferramentas_dev/i18n_en.json ({"texto em português": "English text"}).
// O servidor entrega /js/* desta pasta quando a configuração "idioma" é "en".
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(process.env.ACORN_DIR ? path.join(process.env.ACORN_DIR, 'x.js') : import.meta.url);
const acorn = require('acorn');
const walk = require('acorn-walk');

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ORIGEM = path.join(RAIZ, 'assets/web/js');
const DESTINO = path.join(RAIZ, 'assets/web/js-en');
const DIC = { ...JSON.parse(fs.readFileSync(path.join(RAIZ, 'ferramentas_dev/i18n_en.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(RAIZ, 'ferramentas_dev/i18n_en_extra.json'), 'utf8')) };
const NAO_MEXER = new Set(['monaco.js']);

const norm = (s) => s.replace(/\s+/g, ' ').trim();
let usados = new Set();

function exato(s) {
  const k = norm(s);
  if (!k || !(k in DIC)) return null;
  usados.add(k);
  const ini = s.match(/^\s*/)[0];
  const fim = s.match(/\s*$/)[0];
  return ini + DIC[k] + (s.trim() ? fim : '');
}

function traduzir(s) {
  const e = exato(s);
  if (e !== null) return e;
  if (!/[<>"]/.test(s)) return s;
  // resto de um atributo que começou antes do ${...} (ex.: placeholder="${nome} — abrir arquivo")
  let r = s.replace(/^([^"<>]+)"/, (m, v) => { const t = exato(v); return t === null ? m : t.replace(/"/g, '&quot;') + '"'; });
  // atributos visíveis
  r = r.replace(/\b(title|placeholder|aria-label|alt)="([^"$]*)"/g, (m, a, v) => {
    const t = exato(v);
    return t === null ? m : `${a}="${t.replace(/"/g, '&quot;')}"`;
  });
  // texto entre as tags
  r = r.split(/(<[^>]*>)/).map((parte) => {
    if (parte.startsWith('<') && parte.endsWith('>')) return parte;
    const t = exato(parte);
    return t === null ? parte : t;
  }).join('');
  return r;
}

// exemplos de código do catálogo de erros: troca os nomes em português por nomes em inglês
const NOMES_CODIGO = { nome: 'name', nomes: 'names', idade: 'age', dados: 'data', pontos: 'points', preco: 'price', texto: 'text', lista: 'items', arquivo: 'file',
  Idade: 'Age', 'Olá': 'Hello', vida: 'health', valor: 'value', numero: 'number', chave: 'key', botao: 'button', notas: 'grades', janela: 'window', Nome: 'Name',
  'Preço': 'Price', total: 'total', 'Posição': 'Position', rotulo: 'label', campo: 'field', 'Número': 'Number', linhas: 'lines', linha: 'line', 'último': 'last',
  aluno: 'student', saida: 'output', teste: 'test', media: 'average', soma: 'sum', alunos: 'students', Total: 'Total', jogador: 'player', 'números': 'numbers',
  'também o último': 'also the last', 'Digite só números!': 'Type numbers only!', 'Deu erro': 'Something went wrong', Oi: 'Hi', Bia: 'Bea', 'Zé': 'Joe' };
const RE_CODIGO = new RegExp('(?<![\\wÀ-ú])(' + Object.keys(NOMES_CODIGO).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\wÀ-ú])', 'g');
const pareceCodigo = (s) => /\n|[=()[\]]/.test(s) && !/^[A-ZÀ-Ú][^=()]*\.$/.test(s);
function traduzirCodigo(s) { return s.replace(RE_CODIGO, (m) => NOMES_CODIGO[m]); }

function literal(valor, aspa) {
  let s = valor.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  s = s.split(aspa).join('\\' + aspa);
  return aspa + s + aspa;
}
const cru = (t) => t.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
let total = 0;
for (const f of fs.readdirSync(ORIGEM)) {
  const de = path.join(ORIGEM, f);
  if (fs.statSync(de).isDirectory()) { fs.cpSync(de, path.join(DESTINO, f), { recursive: true }); continue; }
  const src = fs.readFileSync(de, 'utf8');
  if (!f.endsWith('.js') || NAO_MEXER.has(f)) { fs.writeFileSync(path.join(DESTINO, f), src); continue; }
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  const trocas = [];
  walk.full(ast, (n) => {
    if (n.type === 'Literal' && typeof n.value === 'string') {
      let t = traduzir(n.value);
      if (t === n.value && f === 'erros_catalogo.js' && pareceCodigo(n.value)) t = traduzirCodigo(n.value);
      if (t !== n.value) trocas.push([n.start, n.end, literal(t, src[n.start] === '"' ? '"' : "'")]);
    } else if (n.type === 'ObjectExpression') {
      // chaves com texto (ex.: os menus { 'Arquivo': [...] })
      for (const p of n.properties) {
        if (p.type !== 'Property' || p.computed || !p.key || p.key.type !== 'Literal' || typeof p.key.value !== 'string') continue;
        const t = traduzir(p.key.value);
        if (t !== p.key.value) trocas.push([p.key.start, p.key.end, literal(t, src[p.key.start] === '"' ? '"' : "'")]);
      }
    } else if (n.type === 'TemplateLiteral') {
      for (const q of n.quasis) {
        const v = q.value.cooked;
        if (v == null) continue;
        const t = traduzir(v);
        if (t !== v) trocas.push([q.start, q.end, cru(t)]);
      }
    }
  });
  // evita o mesmo texto ser trocado duas vezes (nós repetidos do walk)
  const vistos = new Set();
  const lista = trocas.filter(([a, b]) => { const k = a + ':' + b; if (vistos.has(k)) return false; vistos.add(k); return true; }).sort((x, y) => y[0] - x[0]);
  let out = src;
  for (const [a, b, novo] of lista) out = out.slice(0, a) + novo + out.slice(b);
  acorn.parse(out, { ecmaVersion: 'latest', sourceType: 'module' }); // garante que continua válido
  fs.writeFileSync(path.join(DESTINO, f), out);
  total += lista.length;
}
console.log(`js-en: ${total} trocas, ${usados.size} de ${Object.keys(DIC).length} textos do dicionário usados`);
