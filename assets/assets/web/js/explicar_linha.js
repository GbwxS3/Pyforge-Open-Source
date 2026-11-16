// "Explicar ao passar o mouse": diz em português o que uma linha de Python faz (sem IA, na hora).

const PALAVRAS = {
  print: 'mostra um texto ou valor na tela (na Saída).',
  input: 'mostra uma pergunta e espera a pessoa digitar. O que ela digita sempre vem como TEXTO.',
  len: 'conta quantos itens tem (letras de um texto, itens de uma lista…).',
  range: 'gera uma sequência de números: range(5) é 0, 1, 2, 3, 4.',
  int: 'transforma em número inteiro (ex.: int("42") vira 42).',
  float: 'transforma em número com casas decimais (ex.: float("3.5")).',
  str: 'transforma em texto (ex.: str(10) vira "10").',
  bool: 'transforma em True ou False.',
  list: 'cria uma lista (ou transforma algo em lista).',
  dict: 'cria um dicionário (pares chave: valor).',
  set: 'cria um conjunto: como uma lista, mas sem itens repetidos.',
  tuple: 'cria uma tupla: uma lista que não pode ser mudada.',
  sum: 'soma todos os números de uma lista.',
  max: 'devolve o maior valor.',
  min: 'devolve o menor valor.',
  abs: 'devolve o valor sem sinal (abs(-5) é 5).',
  round: 'arredonda um número (round(2.567, 2) é 2.57).',
  sorted: 'devolve uma cópia ordenada (a original não muda).',
  reversed: 'percorre de trás para frente.',
  enumerate: 'percorre uma lista dando a posição e o item ao mesmo tempo.',
  zip: 'junta duas listas lado a lado, em pares.',
  open: 'abre um arquivo para ler ou escrever.',
  type: 'diz de que tipo é um valor (int, str, list…).',
  isinstance: 'confere se um valor é de um certo tipo.',
  any: 'True se pelo menos um item for verdadeiro.',
  all: 'True se todos os itens forem verdadeiros.',
  map: 'aplica uma função em cada item.',
  filter: 'mantém só os itens que passam num teste.',
  None: 'o “vazio” do Python: quer dizer que não tem valor.',
  True: 'verdadeiro.', False: 'falso.',
  self: 'o próprio objeto: dentro de uma classe, self.nome é o “nome” deste objeto.',
  def: 'cria uma função.', class: 'cria uma classe (um molde para criar objetos).',
  return: 'termina a função e devolve um valor.', lambda: 'cria uma função pequena de uma linha só.',
  import: 'traz código de um módulo ou pacote para usar aqui.', from: 'usado no import para trazer só uma parte de um módulo.',
  if: 'testa uma condição.', elif: '“senão, se”: testa outra condição se as de cima deram falso.', else: '“senão”: roda quando nada acima deu certo.',
  for: 'repete para cada item de uma sequência.', while: 'repete enquanto a condição for verdadeira.', in: 'confere se algo está dentro de outra coisa (ou percorre, no for).',
  break: 'sai do loop na hora.', continue: 'pula para a próxima volta do loop.', pass: 'não faz nada (marca um lugar vazio).',
  and: 'verdadeiro só se os DOIS lados forem.', or: 'verdadeiro se PELO MENOS UM lado for.', not: 'inverte: verdadeiro vira falso.',
  try: 'tenta rodar um código que pode dar erro.', except: 'o que fazer se o try der erro.', finally: 'roda sempre no fim, com ou sem erro.', raise: 'cria (lança) um erro de propósito.',
  with: 'abre algo (arquivo, conexão) e fecha sozinho no fim do bloco.', as: 'dá um apelido (import x as y, with … as f).',
  global: 'avisa que a variável é a de fora da função.', is: 'confere se é o MESMO objeto (para valores, use ==).',
  append: 'põe um item no fim da lista.', remove: 'tira da lista o primeiro item igual ao valor.', pop: 'tira e devolve um item (o último, se não disser qual).',
  insert: 'põe um item numa posição da lista.', sort: 'ordena a própria lista (e devolve None).', split: 'corta um texto em pedaços e devolve uma lista.',
  join: 'junta uma lista de textos num texto só, com o separador entre eles.', strip: 'tira os espaços (e quebras de linha) das pontas.',
  upper: 'deixa o texto em MAIÚSCULAS.', lower: 'deixa o texto em minúsculas.', replace: 'troca um pedaço do texto por outro.',
  get: 'pega o valor de uma chave do dicionário (sem dar erro se não existir).', keys: 'as chaves do dicionário.', values: 'os valores do dicionário.', items: 'os pares (chave, valor) do dicionário.',
  format: 'monta um texto trocando {} por valores.', read: 'lê o conteúdo do arquivo.', write: 'escreve no arquivo.', startswith: 'confere se o texto começa com um pedaço.', endswith: 'confere se o texto termina com um pedaço.',
  count: 'conta quantas vezes um item aparece.', index: 'diz a posição de um item.', copy: 'faz uma cópia.', extend: 'põe todos os itens de outra lista no fim.',
  mainloop: 'liga a janela do Tkinter e fica esperando cliques (o programa “mora” aqui).', pack: 'coloca o elemento na janela do Tkinter, um abaixo do outro.', grid: 'coloca o elemento numa grade (linha/coluna) do Tkinter.',
  connect: 'liga um sinal (como um clique) a uma função, no Qt.', show: 'mostra a janela.', exec: 'liga o programa do Qt e fica esperando cliques.',
};

const limpar = (s) => s.trim().replace(/\s+/g, ' ');
const corta = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const semPonto = (s) => s.replace(/\.$/, '');
const cod = (s) => '`' + corta(limpar(s)).replace(/`/g, "'") + '`';

/** Explica uma expressão curta (o lado direito de um =, o argumento de um print…). */
function expressao(e) {
  e = limpar(e);
  let m;
  if ((m = /^int\(\s*input\((.*)\)\s*\)$/.exec(e))) return `a resposta da pergunta ${m[1] || ''} já convertida em número inteiro`;
  if ((m = /^float\(\s*input\((.*)\)\s*\)$/.exec(e))) return `a resposta da pergunta ${m[1] || ''} já convertida em número decimal`;
  if ((m = /^input\((.*)\)$/.exec(e))) return `o que a pessoa digitar na pergunta ${m[1] || ''} (vem como TEXTO, mesmo se for número)`;
  if ((m = /\.(\w+)\([^()]*\)$/.exec(e)) && PALAVRAS[m[1]] && !/^\w+\(/.test(e)) return `o resultado de .${m[1]}(), que ${semPonto(PALAVRAS[m[1]])}`;
  if (/^\[.+\bfor\b.+\bin\b.+\]$/.test(e)) return 'uma lista nova, montada item por item (list comprehension)';
  if (/^\[.*\]$/.test(e)) return e === '[]' ? 'uma lista vazia' : 'uma lista';
  if (/^\{.*:.*\}$/.test(e) || e === '{}') return e === '{}' ? 'um dicionário vazio' : 'um dicionário (chave: valor)';
  if (/^\(.*,.*\)$/.test(e)) return 'uma tupla';
  if (/^f["']/.test(e)) return 'um texto em que cada {…} é trocado pelo valor de dentro (f-string)';
  if (/^["']/.test(e)) return 'um texto';
  if (/^-?\d+$/.test(e)) return `o número ${e}`;
  if (/^-?\d*\.\d+$/.test(e)) return `o número decimal ${e}`;
  if (/^(True|False)$/.test(e)) return e === 'True' ? 'verdadeiro (True)' : 'falso (False)';
  if (e === 'None') return 'None (vazio)';
  if ((m = /^(\w+)\((.*)\)$/.exec(e)) && PALAVRAS[m[1]]) return `o resultado de ${m[1]}(), que ${semPonto(PALAVRAS[m[1]])}`;
  if ((m = /^[\w.\]\[]+\.(\w+)\((.*)\)$/.exec(e)) && PALAVRAS[m[1]]) return `o resultado de .${m[1]}(), que ${semPonto(PALAVRAS[m[1]])}`;
  if ((m = /^([A-Z]\w*)\((.*)\)$/.exec(e))) return `um objeto novo da classe ${m[1]}`;
  if ((m = /^(\w+)\((.*)\)$/.exec(e))) return `o que a função ${m[1]}() devolver`;
  if (/ if .+ else /.test(e)) return 'um valor ou outro, dependendo de uma condição (if de uma linha)';
  return `o resultado de ${cod(e)}`;
}

/** Explicação da linha inteira. */
export function explicarLinha(texto) {
  const l = texto.trim();
  let m;
  if (!l) return '';
  if (l.startsWith('#')) return 'Comentário: o Python ignora esta linha. Serve para explicar o código para quem lê.';
  if (/^("""|''')/.test(l)) return 'Texto de documentação (docstring): explica o que a função, classe ou arquivo faz.';
  if ((m = /^if __name__ == ["']__main__["']\s*:/.exec(l))) return 'Só roda o bloco abaixo quando ESTE arquivo é executado direto (e não quando outro arquivo faz import dele).';
  if ((m = /^@(\w[\w.]*)/.exec(l))) return `Decorador: “embrulha” a função de baixo com ${cod('@' + m[1])}, mudando como ela funciona.`;
  if ((m = /^(async\s+)?def\s+(\w+)\s*\((.*)\)\s*(->\s*[^:]+)?:/.exec(l))) {
    const ps = m[3].split(',').map((p) => p.split(/[:=]/)[0].trim()).filter((p) => p && p !== 'self' && p !== '*' && p !== '/');
    const metodo = /\bself\b/.test(m[3]);
    return `Cria ${metodo ? 'o método' : 'a função'} **${m[2]}**${ps.length ? `, que recebe ${ps.map((p) => `**${p}**`).join(', ')}` : ', que não recebe nada'}. O código com recuo abaixo só roda quando alguém chamar ${m[2]}(…).`;
  }
  if ((m = /^class\s+(\w+)\s*(?:\((.*)\))?\s*:/.exec(l))) return `Cria a classe **${m[1]}**: um molde para criar objetos${m[2] ? `, baseado em ${cod(m[2])} (herda tudo que ela tem)` : ''}. Cada objeto criado com ${m[1]}() tem seus próprios valores.`;
  if ((m = /^elif\s+(.+):\s*(#.*)?$/.exec(l))) return `Senão, se ${cod(m[1])} for verdade, roda o bloco abaixo (só é testado se os testes de cima deram falso).`;
  if ((m = /^if\s+(.+):\s*(#.*)?$/.exec(l))) return `Testa se ${cod(m[1])} é verdade. Se for, roda o bloco com recuo abaixo; se não, pula.`;
  if (/^else\s*:/.test(l)) return 'Senão: roda o bloco abaixo quando nenhum teste de cima deu certo.';
  if ((m = /^for\s+(.+?)\s+in\s+range\((.*)\)\s*:/.exec(l))) {
    const a = m[2].split(',').map((x) => x.trim());
    if (a.length === 1) return `Repete o bloco ${/^\d+$/.test(a[0]) ? a[0] : cod(a[0])} vezes. A cada volta, **${m[1]}** vale 0, 1, 2… até ${/^\d+$/.test(a[0]) ? +a[0] - 1 : a[0] + ' - 1'}.`;
    return `Repete o bloco com **${m[1]}** indo de ${a[0]} até ${a[1]} (sem incluir o ${a[1]})${a[2] ? `, pulando de ${a[2]} em ${a[2]}` : ''}.`;
  }
  if ((m = /^for\s+(\w+)\s*,\s*(\w+)\s+in\s+enumerate\((.+)\)\s*:/.exec(l))) return `Percorre ${cod(m[3])}: a cada volta, **${m[1]}** é a posição (0, 1, 2…) e **${m[2]}** é o item.`;
  if ((m = /^for\s+(\w+)\s*,\s*(\w+)\s+in\s+(.+)\.items\(\)\s*:/.exec(l))) return `Percorre o dicionário ${cod(m[3])}: a cada volta, **${m[1]}** é a chave e **${m[2]}** é o valor.`;
  if ((m = /^for\s+(.+?)\s+in\s+(.+):\s*(#.*)?$/.exec(l))) return `Para cada item de ${cod(m[2])}, guarda o item em **${m[1]}** e roda o bloco abaixo.`;
  if (/^while\s+True\s*:/.test(l)) return 'Repete o bloco para sempre. Só sai com break (ou return/erro).';
  if ((m = /^while\s+(.+):\s*(#.*)?$/.exec(l))) return `Repete o bloco enquanto ${cod(m[1])} for verdade. Cuidado: algo lá dentro precisa mudar, senão nunca para.`;
  if ((m = /^return\s*(.*)$/.exec(l))) return m[1] ? `Termina a função e devolve ${expressao(m[1])} para quem chamou.` : 'Termina a função aqui (devolve None).';
  if (/^break\b/.test(l)) return 'Sai do loop (for/while) na hora.';
  if (/^continue\b/.test(l)) return 'Pula o resto desta volta e vai para a próxima volta do loop.';
  if (/^pass\b/.test(l)) return 'Não faz nada: marca um bloco que ainda está vazio.';
  if ((m = /^from\s+(\S+)\s+import\s+(.+)$/.exec(l))) return `Traz ${cod(m[2])} do módulo **${m[1]}** para usar aqui sem escrever ${m[1]}. na frente.`;
  if ((m = /^import\s+(\S+)\s+as\s+(\w+)/.exec(l))) return `Traz o módulo **${m[1]}** e o chama de **${m[2]}** (apelido) daqui para frente.`;
  if ((m = /^import\s+(.+)$/.exec(l))) return `Traz o módulo ${cod(m[1])}: depois é só usar ${m[1].split(',')[0].trim()}.alguma_coisa.`;
  if (/^try\s*:/.test(l)) return 'Tenta rodar o bloco abaixo. Se der erro, em vez de parar o programa, vai para o except.';
  if ((m = /^except\s*(.*?)(?:\s+as\s+(\w+))?\s*:/.exec(l))) return m[1] ? `Se o try der erro do tipo ${cod(m[1])}, roda este bloco${m[2] ? ` (o erro fica em **${m[2]}**)` : ''}.` : 'Se o try der QUALQUER erro, roda este bloco (cuidado: esconde erros de digitação).';
  if (/^finally\s*:/.test(l)) return 'Roda este bloco sempre no fim, dando erro ou não.';
  if ((m = /^raise\s+(.+)$/.exec(l))) return `Cria um erro de propósito: ${cod(m[1])}. O programa para, a não ser que um try/except pegue.`;
  if ((m = /^with\s+open\((.*)\)\s+as\s+(\w+)\s*:/.exec(l))) {
    const arq = (/^\s*(f?["'][^"']*["']|[\w.]+(?:\([^)]*\))?)/.exec(m[1]) || ['', m[1]])[1];
    const md = (/,\s*(?:mode\s*=\s*)?["']([rwabxt+]+)["']/.exec(m[1]) || [])[1] || 'r';
    const modo = { r: 'ler', rt: 'ler', w: 'escrever (apaga o que tinha)', a: 'acrescentar no fim', rb: 'ler em binário', wb: 'escrever em binário', 'r+': 'ler e escrever' }[md] || md;
    return `Abre o arquivo ${cod(arq)} para ${modo} e o chama de **${m[2]}**. No fim do bloco, o arquivo fecha sozinho.`;
  }
  if ((m = /^with\s+(.+)\s+as\s+(\w+)\s*:/.exec(l))) return `Abre ${cod(m[1])} como **${m[2]}** e fecha sozinho no fim do bloco.`;
  if ((m = /^global\s+(.+)$/.exec(l))) return `Avisa que ${cod(m[1])} é a variável de fora da função (e não uma nova, só daqui).`;
  if ((m = /^print\((.*)\)$/.exec(l))) return m[1] ? `Mostra na tela ${expressao(m[1])}.` : 'Mostra uma linha em branco na tela.';
  if ((m = /^([\w.[\]'"]+)\s*([+\-*/%]|\/\/|\*\*)=\s*(.+)$/.exec(l))) {
    const op = { '+': 'Soma', '-': 'Subtrai', '*': 'Multiplica', '/': 'Divide', '//': 'Divide (inteiro)', '%': 'Pega o resto da divisão de', '**': 'Eleva' }[m[2]];
    return `${op} ${cod(m[3])} ${m[2] === '+' || m[2] === '-' ? 'em' : 'por'} **${m[1]}** e guarda de volta nela (o mesmo que ${m[1]} = ${m[1]} ${m[2]} ${corta(m[3], 20)}).`;
  }
  if ((m = /^([\w.]+)\.(\w+)\((.*)\)$/.exec(l)) && PALAVRAS[m[2]]) return `Em ${cod(m[1])}: .${m[2]}() ${PALAVRAS[m[2]]}${m[3] ? ` Aqui com ${cod(m[3])}.` : ''}`;
  if ((m = /^(\w+)\s*,\s*([\w\s,]+?)\s*=\s*(.+)$/.exec(l)) && !/==/.test(l)) return `Desmonta ${expressao(m[3])} e guarda cada parte numa variável: ${[m[1], ...m[2].split(',')].map((x) => `**${x.trim()}**`).join(', ')}.`;
  if ((m = /^([\w.]+(?:\[.+\])?)\s*(?::\s*[\w\[\], |]+)?\s*=\s*(.+)$/.exec(l)) && !/^[\w.]+\s*==/.test(l)) {
    const alvo = m[1];
    if (/\[.+\]$/.test(alvo)) return `Muda o item ${cod(alvo)} para ${expressao(m[2])}.`;
    if (alvo.startsWith('self.')) return `**${alvo}** (um valor guardado neste objeto) recebe ${expressao(m[2])}.`;
    return `A variável **${alvo}** recebe ${expressao(m[2])}.`;
  }
  if ((m = /^(\w+)\((.*)\)$/.exec(l))) return PALAVRAS[m[1]] ? `Chama ${m[1]}(), que ${PALAVRAS[m[1]]}` : `Chama (roda) a função **${m[1]}**${m[2] ? ` com ${cod(m[2])}` : ''}.`;
  if ((m = /^([\w.]+)\.(\w+)\((.*)\)$/.exec(l))) return `Chama o método **${m[2]}** de ${cod(m[1])}.`;
  return '';
}

/** Explicação curta de uma palavra (função embutida, palavra do Python ou método comum). */
export function explicarPalavra(p) {
  return Object.prototype.hasOwnProperty.call(PALAVRAS, p) ? PALAVRAS[p] : '';
}
