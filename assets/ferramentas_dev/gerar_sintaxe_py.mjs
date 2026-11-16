// Gera a lista TRADUCOES do assets/py/assistente_py.py a partir do catálogo de erros (grupo Sintaxe).
// Uso: node ferramentas_dev/gerar_sintaxe_py.mjs   (rode de novo sempre que mudar o catálogo)
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CATALOGO } = await import(pathToFileURL(path.join(raiz, 'assets/web/js/erros_catalogo.js')).href);
const itens = CATALOGO.filter((e) => e.tipos && e.tipos.includes('SyntaxError') && e.re);
const linhas = itens.map((e) => `    (${JSON.stringify(e.re.source)}, ${JSON.stringify(e.titulo)}, ${JSON.stringify(e.texto + (e.exemplo ? ` Exemplo certo: ${e.exemplo[1].replace(/\n/g, ' ⏎ ')}` : ''))}),`);
const bloco = `# >>> gerado por ferramentas_dev/gerar_sintaxe_py.mjs a partir de assets/web/js/erros_catalogo.js\nTRADUCOES = [\n${linhas.join('\n')}\n]\n# <<< fim do bloco gerado`;
const arq = path.join(raiz, 'assets/py/assistente_py.py');
let py = fs.readFileSync(arq, 'utf8');
const re = /# >>> gerado por[\s\S]*?# <<< fim do bloco gerado|TRADUCOES = \[[\s\S]*?\n\]/;
if (!re.test(py)) throw new Error('não achei TRADUCOES no assistente_py.py');
py = py.replace(re, bloco);
fs.writeFileSync(arq, py);
console.log(`${itens.length} traduções de sintaxe gravadas em assets/py/assistente_py.py`);
