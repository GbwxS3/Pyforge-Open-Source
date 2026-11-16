// "Explicar ao passar o mouse": diz em português o que uma linha de Python faz (sem IA, na hora).

const PALAVRAS = {
  print: 'shows a text or value on screen (in the Output).',
  input: 'shows a question and waits for the person to type. What they type always comes as TEXT.',
  len: 'counts how many items there are (letters of a text, items of a list…).',
  range: 'generates a sequence of numbers: range(5) is 0, 1, 2, 3, 4.',
  int: 'turns into a whole number (e.g. int("42") becomes 42).',
  float: 'turns into a number with decimal places (e.g. float("3.5")).',
  str: 'turns into text (e.g. str(10) becomes "10").',
  bool: 'turns into True or False.',
  list: 'creates a list (or turns something into a list).',
  dict: 'creates a dictionary (key: value pairs).',
  set: 'creates a set: like a list, but without repeated items.',
  tuple: 'creates a tuple: a list that cannot be changed.',
  sum: 'adds up all the numbers of a list.',
  max: 'devolve o maior valor.',
  min: 'devolve o menor valor.',
  abs: 'returns the value without a sign (abs(-5) is 5).',
  round: 'rounds a number (round(2.567, 2) is 2.57).',
  sorted: 'returns a sorted copy (the original does not change).',
  reversed: 'loops from back to front.',
  enumerate: 'loops over a list giving the position and the item at the same time.',
  zip: 'joins two lists side by side, in pairs.',
  open: 'opens a file to read or write.',
  type: 'tells what type a value is (int, str, list…).',
  isinstance: 'checks whether a value is of a certain type.',
  any: 'True if at least one item is true.',
  all: 'True if all items are true.',
  map: 'applies a function to each item.',
  filter: 'keeps only the items that pass a test.',
  None: 'Python\'s “empty”: it means there is no value.',
  True: 'verdadeiro.', False: 'falso.',
  self: 'the object itself: inside a class, self.name is this object\'s “name”.',
  def: 'creates a function.', class: 'creates a class (a mold for creating objects).',
  return: 'ends the function and returns a value.', lambda: 'creates a small one-line function.',
  import: 'brings code from a module or package to use here.', from: 'used in import to bring only part of a module.',
  if: 'tests a condition.', elif: '“else, if”: tests another condition if the ones above were false.', else: '“else”: runs when nothing above worked.',
  for: 'repeats for each item of a sequence.', while: 'repeats while the condition is true.', in: 'checks whether something is inside something else (or loops, in a for).',
  break: 'leaves the loop right away.', continue: 'jumps to the next round of the loop.', pass: 'does nothing (marks an empty spot).',
  and: 'true only if BOTH sides are.', or: 'true if AT LEAST ONE side is.', not: 'inverte: verdadeiro vira falso.',
  try: 'tries to run code that may raise an error.', except: 'what to do if the try raises an error.', finally: 'always runs at the end, with or without an error.', raise: 'raises an error on purpose.',
  with: 'opens something (a file, a connection) and closes it by itself at the end of the block.', as: 'gives a nickname (import x as y, with … as f).',
  global: 'says the variable is the one outside the function.', is: 'checks whether it is the SAME object (for values, use ==).',
  append: 'adds an item at the end of the list.', remove: 'removes from the list the first item equal to the value.', pop: 'removes and returns an item (the last one, if you do not say which).',
  insert: 'puts an item at a position in the list.', sort: 'sorts the list itself (and returns None).', split: 'cuts a text into pieces and returns a list.',
  join: 'joins a list of texts into one text, with the separator between them.', strip: 'removes the spaces (and line breaks) at the ends.',
  upper: 'makes the text UPPERCASE.', lower: 'makes the text lowercase.', replace: 'replaces a piece of the text with another.',
  get: 'gets the value of a dictionary key (without an error if it does not exist).', keys: 'the dictionary keys.', values: 'the dictionary values.', items: 'the (key, value) pairs of the dictionary.',
  format: 'builds a text replacing {} with values.', read: 'reads the file content.', write: 'writes to the file.', startswith: 'checks whether the text starts with a piece.', endswith: 'checks whether the text ends with a piece.',
  count: 'counts how many times an item appears.', index: 'tells the position of an item.', copy: 'makes a copy.', extend: 'adds all items of another list at the end.',
  mainloop: 'starts the Tkinter window and waits for clicks (the program “lives” here).', pack: 'places the element in the Tkinter window, one below the other.', grid: 'places the element in a Tkinter grid (row/column).',
  connect: 'connects a signal (like a click) to a function, in Qt.', show: 'shows the window.', exec: 'starts the Qt program and waits for clicks.',
};

const limpar = (s) => s.trim().replace(/\s+/g, ' ');
const corta = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const semPonto = (s) => s.replace(/\.$/, '');
const cod = (s) => '`' + corta(limpar(s)).replace(/`/g, "'") + '`';

/** Explica uma expressão curta (o lado direito de um =, o argumento de um print…). */
function expressao(e) {
  e = limpar(e);
  let m;
  if ((m = /^int\(\s*input\((.*)\)\s*\)$/.exec(e))) return `the answer to the question ${m[1] || ''} already converted to a whole number`;
  if ((m = /^float\(\s*input\((.*)\)\s*\)$/.exec(e))) return `the answer to the question ${m[1] || ''} already converted to a decimal number`;
  if ((m = /^input\((.*)\)$/.exec(e))) return `what the person types in the question ${m[1] || ''} (comes as TEXT, even if it is a number)`;
  if ((m = /\.(\w+)\([^()]*\)$/.exec(e)) && PALAVRAS[m[1]] && !/^\w+\(/.test(e)) return `the result of .${m[1]}(), which ${semPonto(PALAVRAS[m[1]])}`;
  if (/^\[.+\bfor\b.+\bin\b.+\]$/.test(e)) return 'a new list, built item by item (list comprehension)';
  if (/^\[.*\]$/.test(e)) return e === '[]' ? 'an empty list' : 'a list';
  if (/^\{.*:.*\}$/.test(e) || e === '{}') return e === '{}' ? 'an empty dictionary' : 'a dictionary (key: value)';
  if (/^\(.*,.*\)$/.test(e)) return 'a tuple';
  if (/^f["']/.test(e)) return 'a text where each {…} is replaced by the value inside (f-string)';
  if (/^["']/.test(e)) return 'a text';
  if (/^-?\d+$/.test(e)) return `the number ${e}`;
  if (/^-?\d*\.\d+$/.test(e)) return `the decimal number ${e}`;
  if (/^(True|False)$/.test(e)) return e === 'True' ? 'verdadeiro (True)' : 'falso (False)';
  if (e === 'None') return 'None (empty)';
  if ((m = /^(\w+)\((.*)\)$/.exec(e)) && PALAVRAS[m[1]]) return `the result of ${m[1]}(), which ${semPonto(PALAVRAS[m[1]])}`;
  if ((m = /^[\w.\]\[]+\.(\w+)\((.*)\)$/.exec(e)) && PALAVRAS[m[1]]) return `the result of .${m[1]}(), which ${semPonto(PALAVRAS[m[1]])}`;
  if ((m = /^([A-Z]\w*)\((.*)\)$/.exec(e))) return `a new object of the class ${m[1]}`;
  if ((m = /^(\w+)\((.*)\)$/.exec(e))) return `what the function ${m[1]}() devolver`;
  if (/ if .+ else /.test(e)) return 'one value or another, depending on a condition (one-line if)';
  return `the result of ${cod(e)}`;
}

/** Explicação da linha inteira. */
export function explicarLinha(texto) {
  const l = texto.trim();
  let m;
  if (!l) return '';
  if (l.startsWith('#')) return 'Comment: Python ignores this line. It explains the code to whoever reads it.';
  if (/^("""|''')/.test(l)) return 'Documentation text (docstring): explains what the function, class or file does.';
  if ((m = /^if __name__ == ["']__main__["']\s*:/.exec(l))) return 'Only runs the block below when THIS file is run directly (not when another file imports it).';
  if ((m = /^@(\w[\w.]*)/.exec(l))) return `Decorator: “wraps” the function below with ${cod('@' + m[1])}, mudando como ela funciona.`;
  if ((m = /^(async\s+)?def\s+(\w+)\s*\((.*)\)\s*(->\s*[^:]+)?:/.exec(l))) {
    const ps = m[3].split(',').map((p) => p.split(/[:=]/)[0].trim()).filter((p) => p && p !== 'self' && p !== '*' && p !== '/');
    const metodo = /\bself\b/.test(m[3]);
    return `Creates ${metodo ? 'the method' : 'the function'} **${m[2]}**${ps.length ? `, which takes ${ps.map((p) => `**${p}**`).join(', ')}` : ', which takes nothing'}. The indented code below only runs when someone calls ${m[2]}(…).`;
  }
  if ((m = /^class\s+(\w+)\s*(?:\((.*)\))?\s*:/.exec(l))) return `Creates the class **${m[1]}**: a mold for creating objects${m[2] ? `, based on ${cod(m[2])} (inherits everything it has)` : ''}. Each object created with ${m[1]}() has its own values.`;
  if ((m = /^elif\s+(.+):\s*(#.*)?$/.exec(l))) return `Else, if ${cod(m[1])} is true, runs the block below (only tested if the tests above were false).`;
  if ((m = /^if\s+(.+):\s*(#.*)?$/.exec(l))) return `Tests whether ${cod(m[1])} is true. If it is, runs the indented block below; if not, skips it.`;
  if (/^else\s*:/.test(l)) return 'Else: runs the block below when none of the tests above worked.';
  if ((m = /^for\s+(.+?)\s+in\s+range\((.*)\)\s*:/.exec(l))) {
    const a = m[2].split(',').map((x) => x.trim());
    if (a.length === 1) return `Repeats the block ${/^\d+$/.test(a[0]) ? a[0] : cod(a[0])} times. Each round, **${m[1]}** is 0, 1, 2… up to ${/^\d+$/.test(a[0]) ? +a[0] - 1 : a[0] + ' - 1'}.`;
    return `Repeats the block with **${m[1]}** going from ${a[0]} up to ${a[1]} (not including ${a[1]})${a[2] ? `, stepping by ${a[2]} em ${a[2]}` : ''}.`;
  }
  if ((m = /^for\s+(\w+)\s*,\s*(\w+)\s+in\s+enumerate\((.+)\)\s*:/.exec(l))) return `Loops over ${cod(m[3])}: each round, **${m[1]}** is the position (0, 1, 2…) and **${m[2]}** is the item.`;
  if ((m = /^for\s+(\w+)\s*,\s*(\w+)\s+in\s+(.+)\.items\(\)\s*:/.exec(l))) return `Loops over the dictionary ${cod(m[3])}: each round, **${m[1]}** is the key and **${m[2]}** is the value.`;
  if ((m = /^for\s+(.+?)\s+in\s+(.+):\s*(#.*)?$/.exec(l))) return `For each item of ${cod(m[2])}, stores the item in **${m[1]}** e roda o bloco abaixo.`;
  if (/^while\s+True\s*:/.test(l)) return 'Repeats the block forever. Only exits with break (or return/an error).';
  if ((m = /^while\s+(.+):\s*(#.*)?$/.exec(l))) return `Repeats the block while ${cod(m[1])} is true. Careful: something inside must change, or it never stops.`;
  if ((m = /^return\s*(.*)$/.exec(l))) return m[1] ? `Ends the function and returns ${expressao(m[1])} to whoever called.` : 'Ends the function here (returns None).';
  if (/^break\b/.test(l)) return 'Leaves the loop (for/while) right away.';
  if (/^continue\b/.test(l)) return 'Skips the rest of this round and goes to the next round of the loop.';
  if (/^pass\b/.test(l)) return 'Does nothing: marks a block that is still empty.';
  if ((m = /^from\s+(\S+)\s+import\s+(.+)$/.exec(l))) return `Brings ${cod(m[2])} from the module **${m[1]}** to use here without writing ${m[1]}. in front.`;
  if ((m = /^import\s+(\S+)\s+as\s+(\w+)/.exec(l))) return `Brings in the module **${m[1]}** and calls it **${m[2]}** (nickname) from here on.`;
  if ((m = /^import\s+(.+)$/.exec(l))) return `Brings in the module ${cod(m[1])}: then just use ${m[1].split(',')[0].trim()}.alguma_coisa.`;
  if (/^try\s*:/.test(l)) return 'Tries to run the block below. If it raises an error, instead of stopping the program, it goes to the except.';
  if ((m = /^except\s*(.*?)(?:\s+as\s+(\w+))?\s*:/.exec(l))) return m[1] ? `If the try raises an error of type ${cod(m[1])}, runs this block${m[2] ? ` (the error goes into **${m[2]}**)` : ''}.` : 'If the try raises ANY error, runs this block (careful: it hides typos).';
  if (/^finally\s*:/.test(l)) return 'Always runs this block at the end, error or not.';
  if ((m = /^raise\s+(.+)$/.exec(l))) return `Raises an error on purpose: ${cod(m[1])}. The program stops, unless a try/except catches it.`;
  if ((m = /^with\s+open\((.*)\)\s+as\s+(\w+)\s*:/.exec(l))) {
    const arq = (/^\s*(f?["'][^"']*["']|[\w.]+(?:\([^)]*\))?)/.exec(m[1]) || ['', m[1]])[1];
    const md = (/,\s*(?:mode\s*=\s*)?["']([rwabxt+]+)["']/.exec(m[1]) || [])[1] || 'r';
    const modo = { r: 'ler', rt: 'ler', w: 'write (erases what was there)', a: 'add at the end', rb: 'read in binary', wb: 'write in binary', 'r+': 'read and write' }[md] || md;
    return `Opens the file ${cod(arq)} para ${modo} and calls it **${m[2]}**. At the end of the block, the file closes by itself.`;
  }
  if ((m = /^with\s+(.+)\s+as\s+(\w+)\s*:/.exec(l))) return `Opens ${cod(m[1])} como **${m[2]}** and closes by itself at the end of the block.`;
  if ((m = /^global\s+(.+)$/.exec(l))) return `Warns that ${cod(m[1])} is the variable outside the function (not a new one, just for here).`;
  if ((m = /^print\((.*)\)$/.exec(l))) return m[1] ? `Shows on screen ${expressao(m[1])}.` : 'Shows a blank line on screen.';
  if ((m = /^([\w.[\]'"]+)\s*([+\-*/%]|\/\/|\*\*)=\s*(.+)$/.exec(l))) {
    const op = { '+': 'Sum', '-': 'Subtracts', '*': 'Multiplies', '/': 'Divides', '//': 'Divides (whole)', '%': 'Gets the remainder of dividing', '**': 'Raises to the power' }[m[2]];
    return `${op} ${cod(m[3])} ${m[2] === '+' || m[2] === '-' ? 'em' : 'por'} **${m[1]}** and stores it back in it (same as ${m[1]} = ${m[1]} ${m[2]} ${corta(m[3], 20)}).`;
  }
  if ((m = /^([\w.]+)\.(\w+)\((.*)\)$/.exec(l)) && PALAVRAS[m[2]]) return `In ${cod(m[1])}: .${m[2]}() ${PALAVRAS[m[2]]}${m[3] ? ` Here with ${cod(m[3])}.` : ''}`;
  if ((m = /^(\w+)\s*,\s*([\w\s,]+?)\s*=\s*(.+)$/.exec(l)) && !/==/.test(l)) return `Unpacks ${expressao(m[3])} and stores each part in a variable: ${[m[1], ...m[2].split(',')].map((x) => `**${x.trim()}**`).join(', ')}.`;
  if ((m = /^([\w.]+(?:\[.+\])?)\s*(?::\s*[\w\[\], |]+)?\s*=\s*(.+)$/.exec(l)) && !/^[\w.]+\s*==/.test(l)) {
    const alvo = m[1];
    if (/\[.+\]$/.test(alvo)) return `Changes the item ${cod(alvo)} para ${expressao(m[2])}.`;
    if (alvo.startsWith('self.')) return `**${alvo}** (a value stored in this object) gets ${expressao(m[2])}.`;
    return `The variable **${alvo}** gets ${expressao(m[2])}.`;
  }
  if ((m = /^(\w+)\((.*)\)$/.exec(l))) return PALAVRAS[m[1]] ? `Calls ${m[1]}(), which ${PALAVRAS[m[1]]}` : `Calls (runs) the function **${m[1]}**${m[2] ? ` com ${cod(m[2])}` : ''}.`;
  if ((m = /^([\w.]+)\.(\w+)\((.*)\)$/.exec(l))) return `Calls the method **${m[2]}** from ${cod(m[1])}.`;
  return '';
}

/** Explicação curta de uma palavra (função embutida, palavra do Python ou método comum). */
export function explicarPalavra(p) {
  return Object.prototype.hasOwnProperty.call(PALAVRAS, p) ? PALAVRAS[p] : '';
}
