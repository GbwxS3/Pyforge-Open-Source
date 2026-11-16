// "Funções": blocos ligados por fios (estilo Blueprint) que viram código Python de verdade.
//
// D.logica = {
//   vars: [{ nome: 'pontos', tipo: 'numero', inicial: '0', global: false }],
//   nos:  [{ id: 'f1', fn: 'mudarTexto', x, y, valores: { alvo: 'e3', texto: 'Olá, {nome}!' } }],
//   fios: [{ de: 'e2:aoClicar', para: 'f1:entrada' }, { de: 'e1:texto', para: 'f1:texto' }],
//   pos:  { e2: { x, y }, tela: { x, y } },
// }
// Portas: "<no>:<porta>". Nó de elemento = id do elemento (e3). Nó da janela = "tela".
// Nos campos de texto, {nome} põe o valor de uma variável (ou de um elemento) no meio do texto.
import { nomeOk } from './designer_modelo.js';
import { ANIMACOES } from './designer_animacao.js';

export const TIPOS_PORTA = {
  exec: { nome: 'action', cor: '#E9ECF2' },
  texto: { nome: 'texto', cor: '#F2A65A' },
  numero: { nome: 'number', cor: '#5BC8AF' },
  bool: { nome: 'yes/no', cor: '#E2657A' },
  lista: { nome: 'lista', cor: '#6FA8FF' },
  qualquer: { nome: 'any value', cor: '#A88BFA' },
};
export const TIPOS_VAR = [['texto', 'Text'], ['numero', 'Number'], ['bool', 'Yes/No'], ['lista', 'List']];

// Saídas de cada tipo de elemento: eventos (exec) e valores.
export const PORTAS_ELEMENTO = {
  botao: [['aoClicar', 'exec', 'On click']],
  campo: [['aoMudar', 'exec', 'While typing'], ['aoEnter', 'exec', 'When Enter is pressed'], ['texto', 'texto', 'Typed text']],
  area: [['texto', 'texto', 'Typed text']],
  numero: [['aoMudar', 'exec', 'On change'], ['valor', 'numero', 'Number']],
  caixa: [['aoMudar', 'exec', 'When checked/unchecked'], ['marcado', 'bool', 'Is it checked?']],
  opcao: [['aoMudar', 'exec', 'When checked'], ['marcado', 'bool', 'Is it checked?']],
  combo: [['aoMudar', 'exec', 'On choose'], ['escolhido', 'texto', 'Chosen option'], ['itens', 'lista', 'All options']],
  slider: [['aoMudar', 'exec', 'When moved'], ['valor', 'numero', 'Value']],
  lista: [['aoMudar', 'exec', 'On choose'], ['item', 'texto', 'Chosen item'], ['itens', 'lista', 'All items']],
  texto: [['texto', 'texto', 'Current text']],
};
export const PORTAS_TELA = [['aoAbrir', 'exec', 'When the window opens'], ['aoFechar', 'exec', 'When the window closes']];

// Que elementos cada tipo de parâmetro "elemento" aceita.
export const ALVOS = {
  'elemento:texto': ['texto', 'botao', 'campo', 'area', 'caixa', 'opcao'],
  'elemento:qualquer': null, // todos
  'elemento:campo': ['campo', 'area'],
  'elemento:valor': ['progresso', 'slider', 'numero'],
  'elemento:lista': ['lista', 'combo'],
  'elemento:listaSo': ['lista'],
  'elemento:caixa': ['caixa'],
  'elemento:foco': ['botao', 'campo', 'area', 'numero', 'caixa', 'opcao', 'combo', 'slider', 'lista', 'tabela'],
  'elemento:cor': ['texto', 'botao', 'campo', 'area', 'retangulo'],
  'elemento:imagem': ['imagem'],
  'elemento:ativavel': ['botao', 'campo', 'area', 'numero', 'caixa', 'opcao', 'combo', 'slider', 'lista', 'tabela'],
};

export const OPERADORES = [['igual', 'is equal to'], ['diferente', 'is different from'], ['maior', 'is greater than'], ['menor', 'is less than'], ['maiorIgual', 'is greater than or equal to'], ['menorIgual', 'is less than or equal to'],
  ['contem', 'contains'], ['comeca', 'starts with'], ['termina', 'ends with'], ['vazio', 'is empty'], ['naoVazio', 'is not empty'], ['verdadeiro', 'is yes (true)'], ['falso', 'is no (false)']];
const SEM_B = new Set(['vazio', 'naoVazio', 'verdadeiro', 'falso']);

const C = { basico: '#8A63D2', telas: '#C2569B', elementos: '#3A6AE0', logica: '#E0892F', tempo: '#D4A017', vars: '#2F9E6E', listas: '#3E8ED0', texto: '#1F8FA8', mat: '#16A085', perg: '#B05A3C' };

// Catálogo. entradas: [chave, tipo, rótulo, padrão, opções]. Só dá para usar o que está aqui.
// Tipos de entrada com bolinha: texto, numero, bool, qualquer, lista, cor, porVar:<campo> (o tipo da variável escolhida).
// Tipos só de escolha: elemento:*, var, var:<tipo>, escolha, tela, repeticao.
export const FUNCOES = {
  // ---------------------------------------------------------------- Básico
  print: { nome: 'Show in console', grupo: 'Basic', desc: 'Writes a value to the output (print). Use {variable} in the text.', cor: C.basico, exec: true, entradas: [['valor', 'qualquer', 'Value', 'Hello!']] },
  mensagem: { nome: 'Message box', grupo: 'Basic', desc: 'Opens a small window with a message.', cor: C.basico, exec: true, entradas: [['tipo', 'escolha', 'Type', 'info', [['info', 'ℹ Information'], ['aviso', '⚠ Aviso'], ['erro', '✖ Error']]], ['titulo', 'texto', 'Title', 'Warning'], ['texto', 'qualquer', 'Message', 'It worked!']] },
  som: { nome: 'Play a beep', grupo: 'Basic', desc: 'Plays the system alert sound.', cor: C.basico, exec: true, entradas: [] },
  copiar: { nome: 'Copy text', grupo: 'Basic', desc: 'Puts a text on the clipboard (Ctrl+V pastes).', cor: C.basico, exec: true, entradas: [['texto', 'texto', 'Text', '']] },
  abrirSite: { nome: 'Open website', grupo: 'Basic', desc: 'Opens an address in the browser.', cor: C.basico, exec: true, entradas: [['url', 'texto', 'Address', 'https://www.python.org']] },
  // ---------------------------------------------------------------- Telas
  abrirTela: { nome: 'Open another screen', grupo: 'Screens', desc: 'Opens a small screen of the project. Click the thumbnail to wire up its buttons.', cor: C.telas, exec: true, entradas: [['tela', 'tela', 'Screen', ''], ['jeito', 'escolha', 'Mode', 'janela', [['janela', 'Separate window'], ['travar', 'On top, blocking this one']]]] },
  fechar: { nome: 'Close this screen', grupo: 'Screens', desc: 'Closes the window the button is in.', cor: C.telas, exec: true, entradas: [] },
  sair: { nome: 'Close the program', grupo: 'Screens', desc: 'Closes all windows and ends the program.', cor: C.telas, exec: true, entradas: [] },
  mudarTitulo: { nome: 'Change window title', grupo: 'Screens', desc: 'Changes the title bar text.', cor: C.telas, exec: true, entradas: [['texto', 'texto', 'Title', 'My window']] },
  // ---------------------------------------------------------------- Elementos
  mudarTexto: { nome: 'Change text', grupo: 'Elements', desc: 'Changes the text of a label, button or field.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:texto', 'Element', ''], ['texto', 'qualquer', 'New text', '']] },
  limpar: { nome: 'Clear field', grupo: 'Elements', desc: 'Clears what was typed in a field.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:campo', 'Field', '']] },
  esconder: { nome: 'Hide element', grupo: 'Elements', desc: 'Makes an element disappear from the screen.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Element', '']] },
  mostrar: { nome: 'Show element', grupo: 'Elements', desc: 'Makes a hidden element appear.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Element', '']] },
  animar: { nome: 'Animate element', grupo: 'Elements', desc: 'Makes the element move: appear, disappear, pulse, shake, blink…', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Element', ''], ['efeito', 'escolha', 'Effect', 'pulsar', ANIMACOES], ['ms', 'numero', 'Duration (ms)', '400']] },
  alternar: { nome: 'Show/hide (toggle)', grupo: 'Elements', desc: 'If it is showing, hides it; if hidden, shows it.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Element', '']] },
  habilitar: { nome: 'Enable element', grupo: 'Elements', desc: 'Lets people click/type again.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:ativavel', 'Element', '']] },
  desabilitar: { nome: 'Disable element', grupo: 'Elements', desc: 'Greys out the element so it can\'t be used.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:ativavel', 'Element', '']] },
  focar: { nome: 'Put the cursor in', grupo: 'Elements', desc: 'Gets the element ready for typing (focus).', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:foco', 'Element', '']] },
  mudarCor: { nome: 'Change color', grupo: 'Elements', desc: 'Changes the background or text color.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:cor', 'Element', ''], ['parte', 'escolha', 'Part', 'fundo', [['fundo', 'Background'], ['texto', 'Letters']]], ['cor', 'cor', 'Color', '#E2657A']] },
  definirValor: { nome: 'Change value', grupo: 'Elements', desc: 'Changes the number of a progress bar, slider or number field.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:valor', 'Element', ''], ['valor', 'numero', 'Value', '50']] },
  marcar: { nome: 'Check box', grupo: 'Elements', desc: 'Checks, unchecks or toggles a checkbox.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:caixa', 'Box', ''], ['acao', 'escolha', 'Do', 'marcar', [['marcar', 'Check'], ['desmarcar', 'Uncheck'], ['inverter', 'Invert']]]] },
  adicionarItem: { nome: 'Add item', grupo: 'Elements', desc: 'Adds a new item to a list or dropdown.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:lista', 'List', ''], ['texto', 'qualquer', 'Item', 'New item']] },
  removerSelecionado: { nome: 'Remove chosen item', grupo: 'Elements', desc: 'Removes the selected item from the list.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:listaSo', 'List', '']] },
  limparLista: { nome: 'Empty list', grupo: 'Elements', desc: 'Removes all items from a list or dropdown.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:lista', 'List', '']] },
  mudarImagem: { nome: 'Change image', grupo: 'Elements', desc: 'Shows another image file (from the assets folder).', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:imagem', 'Image', ''], ['arquivo', 'texto', 'File', 'assets/imagem.png']] },
  // ---------------------------------------------------------------- Lógica
  se: { nome: 'If… else', grupo: 'Logic', desc: 'Does one thing or another depending on a comparison.', cor: C.logica, exec: true, saidas: [['entao', 'exec', 'Then'], ['senao', 'exec', 'Else']], entradas: [['a', 'qualquer', 'Value', ''], ['op', 'escolha', 'Comparison', 'igual', OPERADORES], ['b', 'qualquer', 'With', '']] },
  seSim: { nome: 'If yes', grupo: 'Logic', desc: 'Goes through “Yes” or “No” depending on a yes/no value (e.g. checked box).', cor: C.logica, exec: true, saidas: [['entao', 'exec', 'Yes'], ['senao', 'exec', 'No']], entradas: [['cond', 'bool', 'Condition', 'sim']] },
  parar: { nome: 'Stop here', grupo: 'Logic', desc: 'Does nothing else in this sequence. In “On close”, cancels closing.', cor: C.logica, exec: true, saidas: [], entradas: [] },
  comparar: { nome: 'Compare', grupo: 'Logic', desc: 'Gives yes/no by comparing two values.', cor: C.logica, dados: true, saida: ['resultado', 'bool', 'Result'], entradas: [['a', 'qualquer', 'Value', ''], ['op', 'escolha', 'Comparison', 'igual', OPERADORES], ['b', 'qualquer', 'With', '']] },
  eOu: { nome: 'And / Or', grupo: 'Logic', desc: '“And”: both must be yes. “Or”: one is enough.', cor: C.logica, dados: true, saida: ['resultado', 'bool', 'Result'], entradas: [['a', 'bool', 'Condition 1', 'sim'], ['op', 'escolha', 'Mode', 'e', [['e', 'And (both)'], ['ou', 'Or (at least one)']]], ['b', 'bool', 'Condition 2', 'sim']] },
  nao: { nome: 'Not (invert)', grupo: 'Logic', desc: 'Yes becomes no and no becomes yes.', cor: C.logica, dados: true, saida: ['resultado', 'bool', 'Inverted'], entradas: [['a', 'bool', 'Condition', 'sim']] },
  // ---------------------------------------------------------------- Repetir e tempo
  repetir: { nome: 'Repeat N times', grupo: 'Repeat and time', desc: 'Runs the “Each round” sequence several times, then continues.', cor: C.tempo, exec: true, saidas: [['cada', 'exec', 'Each round'], ['depois', 'exec', 'After']], saidasDados: [['volta', 'numero', 'Round number']], entradas: [['vezes', 'numero', 'Times', '3']] },
  paraCada: { nome: 'For each item', grupo: 'Repeat and time', desc: 'Runs “Each item” once for each item of a list.', cor: C.tempo, exec: true, saidas: [['cada', 'exec', 'Each item'], ['depois', 'exec', 'After']], saidasDados: [['item', 'qualquer', 'Item']], entradas: [['lista', 'lista', 'List', '']] },
  esperar: { nome: 'Wait seconds', grupo: 'Repeat and time', desc: 'Waits a bit (without freezing the window) and then continues.', cor: C.tempo, exec: true, entradas: [['segundos', 'numero', 'Seconds', '1']] },
  aCada: { nome: 'Repeat every X seconds', grupo: 'Repeat and time', desc: 'Starts a timer: runs “Each time” nonstop (good for clocks and games).', cor: C.tempo, exec: true, saidas: [['cada', 'exec', 'A cada vez'], ['depois', 'exec', 'After turning on']], entradas: [['segundos', 'numero', 'Seconds', '1']] },
  pararRepeticao: { nome: 'Stop repeating', grupo: 'Repeat and time', desc: 'Turns off a “Repeat every X seconds” timer.', cor: C.tempo, exec: true, entradas: [['qual', 'repeticao', 'Which', '']] },
  agora: { nome: 'Date and time now', grupo: 'Repeat and time', desc: 'Gives the current time, date or day of the week.', cor: C.tempo, dados: true, saida: ['texto', 'texto', 'Text'], entradas: [['formato', 'escolha', 'Format', 'hora', [['hora', 'Time (14:05)'], ['horaSeg', 'Time with seconds'], ['data', 'Date (09/11/2026)'], ['dataHora', 'Date and time'], ['diaSemana', 'Day of the week']]]] },
  // ---------------------------------------------------------------- Variáveis
  definirVar: { nome: 'Change variable', grupo: 'Variables', desc: 'Stores a value in the variable.', cor: C.vars, exec: true, entradas: [['nome', 'var', 'Variable', ''], ['valor', 'porVar:nome', 'Value', '']] },
  somarVar: { nome: 'Add to variable', grupo: 'Variables', desc: 'Adds a number to the variable (great for counting clicks). Use -1 to subtract.', cor: C.vars, exec: true, entradas: [['nome', 'var:numero', 'Variable', ''], ['valor', 'numero', 'How much', '1']] },
  alternarVar: { nome: 'Invert yes/no', grupo: 'Variables', desc: 'If the variable is yes, it becomes no (and the other way around).', cor: C.vars, exec: true, entradas: [['nome', 'var:bool', 'Variable', '']] },
  lerVar: { nome: 'Variable value', grupo: 'Variables', desc: 'Gets what is stored in a variable.', cor: C.vars, dados: true, saida: ['valor', 'porVar:nome', 'Value'], entradas: [['nome', 'var', 'Variable', '']] },
  // ---------------------------------------------------------------- Listas
  adicionarNaLista: { nome: 'Add to list', grupo: 'Lists', desc: 'Adds an item to the end of a list variable.', cor: C.listas, exec: true, entradas: [['nome', 'var:lista', 'List', ''], ['valor', 'qualquer', 'Item', '']] },
  removerDaLista: { nome: 'Remove from list', grupo: 'Lists', desc: 'Removes an item from a list variable.', cor: C.listas, exec: true, entradas: [['nome', 'var:lista', 'List', ''], ['valor', 'qualquer', 'Item', '']] },
  esvaziarVarLista: { nome: 'Empty list variable', grupo: 'Lists', desc: 'Leaves the list with no items.', cor: C.listas, exec: true, entradas: [['nome', 'var:lista', 'List', '']] },
  tamanhoLista: { nome: 'How many items', grupo: 'Lists', desc: 'Counts the items of a list.', cor: C.listas, dados: true, saida: ['n', 'numero', 'Amount'], entradas: [['lista', 'lista', 'List', '']] },
  itemDaLista: { nome: 'Item number…', grupo: 'Lists', desc: 'Gets the item at a position (1 = first).', cor: C.listas, dados: true, saida: ['item', 'qualquer', 'Item'], entradas: [['lista', 'lista', 'List', ''], ['n', 'numero', 'Position', '1']] },
  itemAleatorio: { nome: 'Random item', grupo: 'Lists', desc: 'Picks a random item from the list.', cor: C.listas, dados: true, saida: ['item', 'qualquer', 'Item'], entradas: [['lista', 'lista', 'List', '']] },
  listaTem: { nome: 'List has the item?', grupo: 'Lists', desc: 'Yes if the item is in the list.', cor: C.listas, dados: true, saida: ['r', 'bool', 'Has it?'], entradas: [['lista', 'lista', 'List', ''], ['valor', 'qualquer', 'Item', '']] },
  juntarLista: { nome: 'List as text', grupo: 'Lists', desc: 'Joins the items into one text (e.g. “a, b, c”).', cor: C.listas, dados: true, saida: ['texto', 'texto', 'Text'], entradas: [['lista', 'lista', 'List', ''], ['sep', 'texto', 'Separator', ', ']] },
  // ---------------------------------------------------------------- Texto
  formatar: { nome: 'Text with variables', grupo: 'Text', desc: 'Builds a text with {variables} inside. E.g. “Hello, {name}!”', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Text'], entradas: [['modelo', 'texto', 'Template', 'Hello, {nome}!']] },
  juntar: { nome: 'Join texts', grupo: 'Text', desc: 'Joins two texts (e.g. "Hello, " + name).', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Result'], entradas: [['a', 'qualquer', 'Text 1', 'Hello, '], ['b', 'qualquer', 'Text 2', '']] },
  transformar: { nome: 'Change letters', grupo: 'Text', desc: 'UPPERCASE, lowercase, Title Case or trim spaces at the ends.', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Result'], entradas: [['texto', 'texto', 'Text', ''], ['modo', 'escolha', 'Mode', 'maiusculas', [['maiusculas', 'UPPERCASE'], ['minusculas', 'lowercase'], ['titulo', 'Title Case'], ['aparar', 'Trim spaces at the ends']]]] },
  substituir: { nome: 'Replace part of the text', grupo: 'Text', desc: 'Replaces every equal piece with another.', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Result'], entradas: [['texto', 'texto', 'Text', ''], ['de', 'texto', 'Switch', 'a'], ['para', 'texto', 'By', 'b']] },
  tamanhoTexto: { nome: 'Text size', grupo: 'Text', desc: 'How many letters the text has.', cor: C.texto, dados: true, saida: ['n', 'numero', 'Letters'], entradas: [['texto', 'texto', 'Text', '']] },
  paraNumero: { nome: 'Text to number', grupo: 'Text', desc: 'Turns "12,5" into 12.5 (invalid text becomes 0).', cor: C.texto, dados: true, saida: ['n', 'numero', 'Number'], entradas: [['texto', 'texto', 'Text', '0']] },
  formatarNumero: { nome: 'Nice number', grupo: 'Text', desc: 'Writes the number with decimal places (e.g. 3.50).', cor: C.texto, dados: true, saida: ['texto', 'texto', 'Text'], entradas: [['valor', 'numero', 'Number', '0'], ['casas', 'escolha', 'Places', '2', [['0', '0 casas'], ['1', '1 casa'], ['2', '2 casas'], ['3', '3 casas']]], ['sep', 'escolha', 'Separator', 'virgula', [['virgula', 'Comma (3,50)'], ['ponto', 'Dot (3.50)']]]] },
  // ---------------------------------------------------------------- Matemática
  conta: { nome: 'Math', grupo: 'Math', desc: 'Adds, subtracts, multiplies, divides, remainder or power.', cor: C.mat, dados: true, saida: ['resultado', 'numero', 'Result'], entradas: [['a', 'numero', 'Number 1', '0'], ['op', 'escolha', 'Math', '+', [['+', '+ somar'], ['-', '− subtrair'], ['*', '× multiplicar'], ['/', '÷ divide'], ['%', 'remainder'], ['**', 'power']]], ['b', 'numero', 'Number 2', '0']] },
  somar: { nome: 'Add numbers', grupo: 'Math', desc: 'Adds two numbers.', cor: C.mat, dados: true, saida: ['resultado', 'numero', 'Sum'], entradas: [['a', 'numero', 'Number 1', '0'], ['b', 'numero', 'Number 2', '0']] },
  arredondar: { nome: 'Round', grupo: 'Math', desc: 'Rounds, up or down.', cor: C.mat, dados: true, saida: ['resultado', 'numero', 'Result'], entradas: [['valor', 'numero', 'Number', '0'], ['modo', 'escolha', 'Mode', 'perto', [['perto', 'Closer'], ['cima', 'Up'], ['baixo', 'Down']]]] },
  aleatorio: { nome: 'Random number', grupo: 'Math', desc: 'Picks a random whole number between two numbers.', cor: C.mat, dados: true, saida: ['n', 'numero', 'Drawn'], entradas: [['de', 'numero', 'From', '1'], ['ate', 'numero', 'Until', '6']] },
  maiorMenor: { nome: 'Larger / smaller', grupo: 'Math', desc: 'Gives the larger or smaller of two numbers.', cor: C.mat, dados: true, saida: ['n', 'numero', 'Result'], entradas: [['a', 'numero', 'Number 1', '0'], ['op', 'escolha', 'Which', 'max', [['max', 'O maior'], ['min', 'O menor']]], ['b', 'numero', 'Number 2', '0']] },
  matematica: { nome: 'Math', grupo: 'Math', desc: 'Square root, absolute value (no sign) or percentage.', cor: C.mat, dados: true, saida: ['n', 'numero', 'Result'], entradas: [['valor', 'numero', 'Number', '0'], ['op', 'escolha', 'Math', 'raiz', [['raiz', 'Square root'], ['abs', 'No sign (absolute)'], ['dobro', 'Double'], ['metade', 'Half']]]] },
  // ---------------------------------------------------------------- Perguntas e arquivos
  perguntar: { nome: 'Ask yes or no', grupo: 'Questions and files', desc: 'Opens a question with Yes and No buttons.', cor: C.perg, exec: true, saidas: [['sim', 'exec', 'Yes'], ['nao', 'exec', 'No']], entradas: [['titulo', 'texto', 'Title', 'Question'], ['texto', 'texto', 'Question', 'Are you sure?']] },
  pedirTexto: { nome: 'Ask for a text', grupo: 'Questions and files', desc: 'Opens a small box to type in and stores the answer in a variable.', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Answered'], ['cancelou', 'exec', 'Canceled']], entradas: [['titulo', 'texto', 'Title', 'Question'], ['texto', 'texto', 'Question', 'What is your name?'], ['nome', 'var', 'Store in', '']] },
  pedirNumero: { nome: 'Ask for a number', grupo: 'Questions and files', desc: 'Opens a small box to type a number and stores it in the variable.', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Answered'], ['cancelou', 'exec', 'Canceled']], entradas: [['titulo', 'texto', 'Title', 'Question'], ['texto', 'texto', 'Question', 'How old are you?'], ['nome', 'var:numero', 'Store in', '']] },
  escolherArquivo: { nome: 'Choose file', grupo: 'Questions and files', desc: 'Opens the Windows window to pick a file and stores the path.', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Chose'], ['cancelou', 'exec', 'Canceled']], entradas: [['modo', 'escolha', 'To', 'abrir', [['abrir', 'Open'], ['salvar', 'Save as']]], ['titulo', 'texto', 'Title', 'Pick a file'], ['nome', 'var', 'Store in', '']] },
  escolherCor: { nome: 'Pick color', grupo: 'Questions and files', desc: 'Opens the color picker and stores the chosen color (e.g. #FF0000).', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Chose'], ['cancelou', 'exec', 'Canceled']], entradas: [['nome', 'var', 'Store in', '']] },
  salvarArquivo: { nome: 'Save to file', grupo: 'Questions and files', desc: 'Writes a text to a file (replaces or appends at the end).', cor: C.perg, exec: true, entradas: [['arquivo', 'texto', 'File', 'dados.txt'], ['texto', 'texto', 'Text', ''], ['modo', 'escolha', 'Mode', 'fim', [['fim', 'Add a line at the end'], ['substituir', 'Replace all']]]] },
  lerArquivo: { nome: 'Read file', grupo: 'Questions and files', desc: 'Reads a text file and stores the content (or the lines, if the variable is a list).', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Read'], ['erro', 'exec', 'Not found']], entradas: [['arquivo', 'texto', 'File', 'dados.txt'], ['nome', 'var', 'Store in', '']] },
};

export const GRUPOS_FUNCAO = ['Basic', 'Screens', 'Elements', 'Logic', 'Repeat and time', 'Variables', 'Lists', 'Text', 'Math', 'Questions and files'];

// ====================================================================== projeto (as outras telas)
let PROJ = { telas: [] };
/** Avisa quais telas o projeto tem (os designs salvos). Usado para "Abrir outra tela" e variáveis compartilhadas. */
export function definirProjeto(telas) { PROJ = { telas: (telas || []).filter((t) => t && t.nome) }; }
export const telasDoProjeto = () => PROJ.telas;

/** Variáveis compartilhadas que vêm de outras telas. */
function globaisDeFora(D) {
  const out = [];
  for (const t of PROJ.telas) {
    if (t.nome === D.nome) continue;
    for (const v of (t.logica && t.logica.vars) || []) if (v && v.global && nomeOk(v.nome) && !out.some((x) => x.nome === v.nome)) out.push({ ...v, tela: t.nome });
  }
  return out;
}
/** Todas as variáveis que esta tela enxerga: as dela + as compartilhadas das outras. */
export function variaveisVisiveis(D) {
  const proprias = (D.logica && D.logica.vars) || [];
  return [...proprias, ...globaisDeFora(D).filter((g) => !proprias.some((v) => v.nome === g.nome))];
}
export const acharVar = (nome, D) => variaveisVisiveis(D).find((v) => v.nome === nome) || null;

// ====================================================================== portas
const PORTAVEIS = new Set(['texto', 'numero', 'bool', 'qualquer', 'lista', 'cor']);
export const ehPorta = (tipo) => PORTAVEIS.has(tipo) || tipo.startsWith('porVar:');
/** Tipo real de uma entrada/saída (resolve "cor" e "porVar:"). */
export function resolverTipo(tipo, no, D) {
  if (tipo === 'cor') return 'texto';
  if (tipo.startsWith('porVar:')) { const v = acharVar(no.valores[tipo.slice(7)], D); return v ? v.tipo : 'qualquer'; }
  return tipo;
}

/** Lista as portas de um nó: [{chave, tipo, rotulo, dir: 'in'|'out'}] */
export function portasDoNo(no, D) {
  if (no === 'tela') return PORTAS_TELA.map(([chave, tipo, rotulo]) => ({ chave, tipo, rotulo, dir: 'out' }));
  const e = D.elementos.find((x) => x.id === no);
  if (e) return (PORTAS_ELEMENTO[e.tipo] || []).map(([chave, tipo, rotulo]) => ({ chave, tipo, rotulo, dir: 'out' }));
  const n = ((D.logica && D.logica.nos) || []).find((x) => x.id === no);
  if (!n) return [];
  const F = FUNCOES[n.fn];
  const out = [];
  if (F.exec) out.push({ chave: 'entrada', tipo: 'exec', rotulo: '', dir: 'in' });
  for (const [chave, tipo, rotulo] of F.entradas) if (ehPorta(tipo)) out.push({ chave, tipo: resolverTipo(tipo, n, D), rotulo, dir: 'in' });
  if (F.exec) for (const [chave, tipo, rotulo] of F.saidas || [['depois', 'exec', 'After']]) out.push({ chave, tipo, rotulo, dir: 'out' });
  for (const [chave, tipo, rotulo] of F.saidasDados || []) out.push({ chave, tipo, rotulo, dir: 'out' });
  if (F.dados) out.push({ chave: F.saida[0], tipo: resolverTipo(F.saida[1], n, D), rotulo: F.saida[2], dir: 'out' });
  return out;
}

/** O fio de uma porta de saída (tipo de) pode ir para a porta de entrada (tipo para)? */
export function compativel(de, para) {
  if (de === 'exec' || para === 'exec') return de === para;
  if (para === 'qualquer' || de === 'qualquer') return true;
  if (para === 'texto') return true; // número, sim/não e lista viram texto
  if (para === 'numero') return de === 'numero' || de === 'texto';
  if (para === 'bool') return de === 'bool';
  if (para === 'lista') return de === 'lista';
  return de === para;
}

export function logicaVazia() { return { vars: [], nos: [], fios: [], pos: {} }; }

const ehVarCampo = (tipo) => tipo === 'var' || tipo.startsWith('var:');

/** Limpa a lógica: tira blocos desconhecidos e fios que apontam para coisas que não existem. */
export function normalizarLogica(bruta, D) {
  const L = logicaVazia();
  if (!bruta || typeof bruta !== 'object') return L;
  // variáveis
  for (const v of Array.isArray(bruta.vars) ? bruta.vars : []) {
    if (!v || !nomeOk(v.nome) || L.vars.some((x) => x.nome === v.nome)) continue;
    const tipo = TIPOS_VAR.some(([k]) => k === v.tipo) ? v.tipo : 'texto';
    L.vars.push({ nome: v.nome, tipo, inicial: String(v.inicial ?? '').slice(0, 500), global: !!v.global });
  }
  const conhecida = (nome) => L.vars.some((v) => v.nome === nome) || globaisDeFora(D).some((v) => v.nome === nome);
  // blocos
  const ids = new Set();
  for (const n of Array.isArray(bruta.nos) ? bruta.nos : []) {
    if (!n || !FUNCOES[n.fn] || !/^f\d{1,5}$/.test(n.id || '') || ids.has(n.id)) continue;
    ids.add(n.id);
    const valores = {};
    for (const [chave, tipo, , padrao, opcoes] of FUNCOES[n.fn].entradas) {
      let v = n.valores && n.valores[chave] !== undefined && n.valores[chave] !== null ? String(n.valores[chave]).slice(0, 2000) : padrao;
      if (ehVarCampo(tipo)) {
        if (v && !nomeOk(v)) v = '';
        // blocos antigos (variável digitada à mão): cria a variável sozinho
        if (v && !conhecida(v)) L.vars.push({ nome: v, tipo: tipo.startsWith('var:') ? tipo.slice(4) : 'numero', inicial: tipo === 'var:lista' || tipo === 'var:bool' ? '' : '0', global: false });
      }
      if (tipo === 'escolha' && !opcoes.some(([k]) => k === v)) v = padrao;
      if (tipo === 'bool' && v !== 'sim' && v !== 'nao') v = 'sim';
      if (tipo === 'tela' && v && !nomeOk(v)) v = '';
      if (tipo === 'cor' && !/^#[0-9a-fA-F]{6}$/.test(v) && !/\{/.test(v)) v = padrao;
      valores[chave] = v;
    }
    // compatível com a versão 0.4 (o "Se" usava o tipo "op")
    L.nos.push({ id: n.id, fn: n.fn, x: Math.round(+n.x || 0), y: Math.round(+n.y || 0), valores });
  }
  for (const n of L.nos) for (const [chave, tipo] of FUNCOES[n.fn].entradas) if (tipo === 'repeticao' && !L.nos.some((x) => x.id === n.valores[chave] && x.fn === 'aCada')) n.valores[chave] = '';
  const temp = { ...D, logica: L };
  const valida = (ref, dir) => {
    const [no, porta] = String(ref || '').split(':');
    const p = portasDoNo(no, temp).find((x) => x.chave === porta && x.dir === dir);
    return p ? p.tipo : null;
  };
  const ocupadas = new Set();
  for (const f of Array.isArray(bruta.fios) ? bruta.fios : []) {
    const td = valida(f && f.de, 'out');
    const tp = valida(f && f.para, 'in');
    if (!td || !tp || !compativel(td, tp)) continue;
    // exec: cada saída liga em um só lugar; dados: cada entrada recebe um só fio
    const chave = td === 'exec' ? 'o:' + f.de : 'i:' + f.para;
    if (ocupadas.has(chave)) continue;
    ocupadas.add(chave);
    L.fios.push({ de: f.de, para: f.para });
  }
  if (bruta.pos && typeof bruta.pos === 'object') {
    for (const [k, v] of Object.entries(bruta.pos)) {
      if ((k === 'tela' || D.elementos.some((e) => e.id === k)) && v) L.pos[k] = { x: Math.round(+v.x || 0), y: Math.round(+v.y || 0) };
    }
  }
  // alvo apontando para elemento apagado vira vazio
  for (const n of L.nos) for (const [chave, tipo] of FUNCOES[n.fn].entradas) if (tipo.startsWith('elemento') && n.valores[chave] && !D.elementos.some((e) => e.id === n.valores[chave])) n.valores[chave] = '';
  return L;
}

/** Valores que dá para pôr dentro de um texto com {nome}: variáveis e elementos que têm valor. */
export function referenciasTexto(D) {
  const out = variaveisVisiveis(D).map((v) => ({ nome: v.nome, tipo: v.tipo, de: v.tela ? `screen variable ${v.tela}` : 'variable' }));
  for (const e of D.elementos) {
    const p = (PORTAS_ELEMENTO[e.tipo] || []).find((x) => x[1] !== 'exec' && x[1] !== 'lista');
    if (p && !out.some((x) => x.nome === e.nome)) out.push({ nome: e.nome, tipo: p[1], de: p[2].toLowerCase(), elemento: true });
  }
  return out;
}

/** Valor inicial de uma variável em Python. */
export function inicialPython(v) {
  const s = String(v.inicial ?? '');
  if (v.tipo === 'numero') { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && s.trim() ? String(n) : '0'; }
  if (v.tipo === 'bool') return s === 'sim' ? 'True' : 'False';
  if (v.tipo === 'lista') return `[${s.split(',').map((x) => x.trim()).filter(Boolean).map(py).join(', ')}]`;
  return py(s);
}

/** Conteúdo do ui/estado.py (variáveis compartilhadas entre as telas). */
export function gerarEstado(telas) {
  const vistos = new Map();
  for (const t of telas) for (const v of (t.logica && t.logica.vars) || []) if (v.global && nomeOk(v.nome) && !vistos.has(v.nome)) vistos.set(v.nome, { ...v, tela: t.nome });
  if (!vistos.size) return null;
  return [
    '"""Variables shared between screens (made in the Designer\'s Functions editor).',
    '',
    'Generated by the PyForge Designer: rebuilt every time you save a screen.',
    'In your code, use: from ui import estado and then estado.variable_name',
    '"""',
    '',
    ...[...vistos.values()].sort((a, b) => a.nome.localeCompare(b.nome)).map((v) => `${v.nome} = ${inicialPython(v)}  # da tela ${v.tela}`),
    '',
  ].join('\n');
}

// ====================================================================== geração de código
const py = (s) => JSON.stringify(String(s ?? ''));
const ehLiteralTexto = (x) => /^"(?:[^"\\]|\\.)*"$/.test(x);
const ehLiteralNumero = (x) => /^-?\d+(\.\d+)?$/.test(x);
const simples = (x) => /^[\w.]+(\(\))?$/.test(x) || ehLiteralTexto(x) || ehLiteralNumero(x);
const par = (x) => (simples(x) || /^[\w.]+\([^()]*\)$/.test(x) ? x : `(${x})`);
// deixa o código gerado limpo: só converte quando precisa
const txt = (x) => (ehLiteralTexto(x) || x.startsWith('str(') || /^"(?:[^"\\]|\\.)*" \+ /.test(x) || (/ \+ str\(/.test(x) && !x.includes('numero(')) ? x : `str(${x})`);
const num = (x) => {
  const m = /^"(-?\d+(?:[.,]\d+)?)"$/.exec(x);
  if (m) return String(Number(m[1].replace(',', '.')));
  return ehLiteralNumero(x) || x.startsWith('numero(') || x.startsWith('len(') || x.startsWith('random.randint(') ? x : `numero(${x})`;
};
// versões que sabem o tipo de onde o valor veio (não converte o que já é texto/número)
const comoTexto = (T) => (T.tipo === 'texto' ? T.ex : txt(T.ex));
const comoNumero = (T) => (T.tipo === 'numero' ? T.ex : num(T.ex));
const comoInteiro = (T) => (ehLiteralNumero(T.ex) ? String(Math.round(+T.ex)) : `int(${comoNumero(T)})`);
/** if/else que evita "if x: pass". */
function ramificar(ind, cond, sim, nao) {
  if (sim.length) return [`${ind}if ${cond}:`, ...sim, ...(nao.length ? [`${ind}else:`, ...nao] : [])];
  if (!nao.length) return [`${ind}if ${cond}:`, `${ind}    pass`];
  const m = /^(.+?) == (.+)$/.exec(cond);
  const neg = m && !/ == | and | or /.test(m[2]) ? `${m[1]} != ${m[2]}` : `not ${par(cond)}`;
  return [`${ind}if ${neg}:`, ...nao];
}
const inteiro = (x) => (ehLiteralNumero(x) ? String(Math.round(+x)) : `int(${num(x)})`);
const ms = (x) => (ehLiteralNumero(x) ? String(Math.max(1, Math.round(+x * 1000))) : `max(1, round(${par(num(x))} * 1000))`);
const classe = (nome) => nome.split('_').filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join('') || 'Screen';

/**
 * Gera os métodos dos fios. Devolve:
 * { metodos: linhas da classe, conexoes: Map("eId:evento" -> método), aoAbrir, aoFechar (Tk), fechaQt (bool),
 *   iniciar: linhas que criam as variáveis da tela, importa: Set, usaNumero, avisos }
 */
export function gerarFluxos(D, tk) {
  const L = D.logica || logicaVazia();
  const porId = (id) => D.elementos.find((e) => e.id === id);
  const noPorId = (id) => L.nos.find((n) => n.id === id);
  const fioDe = (ref) => L.fios.find((f) => f.de === ref);
  const fioPara = (ref) => L.fios.find((f) => f.para === ref);
  const importa = new Set();
  const avisos = [];
  const extras = [];
  const criados = new Set();

  // ---------------------------------------------------------------- variáveis
  function varExpr(nome) {
    const v = acharVar(nome, D);
    if (!v) return null;
    if (v.global || v.tela) { importa.add('estado'); return `estado.${nome}`; }
    return `self.var_${nome}`;
  }

  // ---------------------------------------------------------------- {nome} dentro dos textos
  function refExpr(nome, cx) {
    const ve = varExpr(nome);
    if (ve) return { ex: ve, tipo: acharVar(nome, D).tipo };
    const e = D.elementos.find((x) => x.nome === nome);
    const p = e && (PORTAS_ELEMENTO[e.tipo] || []).find((x) => x[1] !== 'exec' && x[1] !== 'lista');
    if (p) return { ex: expressaoElemento(e, p[0], 'qualquer'), tipo: p[1] };
    return null;
  }
  function interpolar(s, tipo, cx) {
    const partes = [];
    let ultimo = 0;
    const re = /\{([a-z_][a-z0-9_]{0,40})\}/g;
    let m;
    while ((m = re.exec(s))) {
      const r = refExpr(m[1], cx);
      if (!r) continue;
      if (m.index > ultimo) partes.push({ lit: s.slice(ultimo, m.index) });
      partes.push(r);
      ultimo = m.index + m[0].length;
    }
    if (!partes.some((p) => p.ex)) return null;
    if (ultimo < s.length) partes.push({ lit: s.slice(ultimo) });
    if (partes.length === 1) {
      const r = partes[0];
      if (tipo === 'numero') return num(r.ex);
      if (tipo === 'texto') return r.tipo === 'texto' && !r.ex.includes('(') ? `str(${r.ex})` : txt(r.ex);
      return r.ex;
    }
    const ex = partes.map((p) => (p.lit !== undefined ? py(p.lit) : p.tipo === 'texto' && !p.ex.includes(' ') ? p.ex : `str(${p.ex})`)).join(' + ');
    return tipo === 'numero' ? `numero(${ex})` : ex;
  }

  // ---------------------------------------------------------------- valores (entradas de dados)
  function literal(tipo, padrao, cx) {
    const s = String(padrao ?? '');
    if (tipo === 'bool') return s === 'nao' ? 'False' : 'True';
    if (tipo === 'lista') return `[${s.split(',').map((x) => x.trim()).filter(Boolean).map(py).join(', ')}]`;
    if (s.includes('{')) { const i = interpolar(s, tipo, cx); if (i) return i; }
    if (tipo === 'numero') { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && s.trim() ? String(n) : '0'; }
    return py(s);
  }

  /** {ex, tipo} de uma entrada de um bloco. */
  function entradaTipada(no, chave, cx, visitados = new Set()) {
    const ent = FUNCOES[no.fn].entradas.find((x) => x[0] === chave);
    const tipo = resolverTipo(ent[1], no, D);
    const f = fioPara(`${no.id}:${chave}`);
    if (!f) {
      const so = /^\{([a-z_][a-z0-9_]{0,40})\}$/.exec(String(no.valores[chave] ?? '').trim());
      const r = so && tipo !== 'lista' && tipo !== 'bool' && refExpr(so[1], cx);
      if (r) return { ex: tipo === 'numero' && r.tipo !== 'numero' ? num(r.ex) : r.ex, tipo: tipo === 'numero' ? 'numero' : r.tipo };
      const ex = literal(tipo, no.valores[chave], cx);
      return { ex, tipo: ehLiteralNumero(ex) ? 'numero' : tipo };
    }
    const [orig, porta] = f.de.split(':');
    const el = porId(orig);
    if (el) {
      const p = (PORTAS_ELEMENTO[el.tipo] || []).find((x) => x[0] === porta);
      return { ex: expressaoElemento(el, porta, tipo), tipo: p ? p[1] : 'qualquer' };
    }
    const src = noPorId(orig);
    if (!src || visitados.has(src.id)) return { ex: '""', tipo: 'texto' };
    const pt = portasDoNo(src.id, D).find((x) => x.chave === porta && x.dir === 'out');
    const ex = expressaoNo(src, porta, cx, new Set([...visitados, src.id]));
    return { ex: tipo === 'numero' && pt && pt.tipo !== 'numero' ? num(ex) : ex, tipo: pt ? pt.tipo : 'qualquer' };
  }
  const valor = (no, chave, cx, vis) => entradaTipada(no, chave, cx, vis).ex;

  function comparacao(no, cx, vis) {
    const A = entradaTipada(no, 'a', cx, vis);
    const op = no.valores.op;
    if (op === 'verdadeiro') return `${par(A.ex)}`;
    if (op === 'falso') return `not ${par(A.ex)}`;
    if (op === 'vazio') return `not ${par(txt(A.ex))}.strip()`;
    if (op === 'naoVazio') return `${par(txt(A.ex))}.strip() != ""`;
    const B = entradaTipada(no, 'b', cx, vis);
    const pareceNumero = (T) => T.tipo === 'numero' || ehLiteralNumero(T.ex) || /^"-?\d+([.,]\d+)?"$/.test(T.ex);
    const n = pareceNumero(A) && pareceNumero(B) && (A.tipo === 'numero' || B.tipo === 'numero');
    const bools = A.tipo === 'bool' && B.tipo === 'bool';
    const a = bools ? A.ex : n ? comoNumero(A) : comoTexto(A);
    const b = bools ? B.ex : n ? comoNumero(B) : comoTexto(B);
    switch (op) {
      case 'igual': return `${a} == ${b}`;
      case 'diferente': return `${a} != ${b}`;
      case 'maior': return `${comoNumero(A)} > ${comoNumero(B)}`;
      case 'menor': return `${comoNumero(A)} < ${comoNumero(B)}`;
      case 'maiorIgual': return `${comoNumero(A)} >= ${comoNumero(B)}`;
      case 'menorIgual': return `${comoNumero(A)} <= ${comoNumero(B)}`;
      case 'contem': return `${txt(B.ex)} in ${txt(A.ex)}`;
      case 'comeca': return `${par(txt(A.ex))}.startswith(${txt(B.ex)})`;
      case 'termina': return `${par(txt(A.ex))}.endswith(${txt(B.ex)})`;
    }
    return 'True';
  }

  // expressão da saída de um bloco de valores
  function expressaoNo(no, porta, cx, vis) {
    const v = (k) => valor(no, k, cx, vis);
    const tv = (k) => comoTexto(entradaTipada(no, k, cx, vis));
    const nv = (k) => comoNumero(entradaTipada(no, k, cx, vis));
    const iv = (k) => comoInteiro(entradaTipada(no, k, cx, vis));
    switch (no.fn) {
      case 'repetir': if (cx.lacos.has(no.id)) return cx.lacos.get(no.id); avisos.push('“Round number” only works inside the “Each round” sequence.'); return '0';
      case 'paraCada': if (cx.lacos.has(no.id)) return cx.lacos.get(no.id); avisos.push('“Item” only works inside the “Each item” sequence.'); return '""';
      case 'lerVar': { const e = varExpr(no.valores.nome); if (!e) avisos.push('A “Variable value” block has no variable chosen.'); return e || '""'; }
      case 'juntar': return `${tv('a')} + ${tv('b')}`;
      case 'formatar': return tv('modelo');
      case 'somar': return `${nv('a')} + ${nv('b')}`;
      case 'conta': {
        const a = par(nv('a')), b = par(nv('b'));
        if (no.valores.op === '/') return `(${a} / ${b} if ${b} else 0)`;
        if (no.valores.op === '%') return `(${a} % ${b} if ${b} else 0)`;
        return `${a} ${no.valores.op} ${b}`;
      }
      case 'arredondar': { importa.add('math'); const x = nv('valor'); return { perto: `round(${x})`, cima: `math.ceil(${x})`, baixo: `math.floor(${x})` }[no.valores.modo]; }
      case 'aleatorio': importa.add('random'); return `random.randint(*sorted((${iv('de')}, ${iv('ate')})))`;
      case 'maiorMenor': return `${no.valores.op}(${nv('a')}, ${nv('b')})`;
      case 'matematica': {
        const x = nv('valor');
        if (no.valores.op === 'raiz') { importa.add('math'); return `math.sqrt(max(0, ${x}))`; }
        return { abs: `abs(${x})`, dobro: `${par(x)} * 2`, metade: `${par(x)} / 2` }[no.valores.op];
      }
      case 'comparar': return comparacao(no, cx, vis);
      case 'eOu': return `${par(v('a'))} ${no.valores.op === 'ou' ? 'or' : 'and'} ${par(v('b'))}`;
      case 'nao': return `not ${par(v('a'))}`;
      case 'transformar': { const t = par(tv('texto')); return { maiusculas: `${t}.upper()`, minusculas: `${t}.lower()`, titulo: `${t}.title()`, aparar: `${t}.strip()` }[no.valores.modo]; }
      case 'substituir': return `${par(tv('texto'))}.replace(${tv('de')}, ${tv('para')})`;
      case 'tamanhoTexto': return `len(${tv('texto')})`;
      case 'paraNumero': return `numero(${v('texto')})`;
      case 'formatarNumero': { const f = `format(${nv('valor')}, ${py('.' + no.valores.casas + 'f')})`; return no.valores.sep === 'virgula' ? `${f}.replace(".", ",")` : f; }
      case 'agora': {
        importa.add('datetime');
        if (no.valores.formato === 'diaSemana') return '("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")[datetime.now().weekday()]';
        const fmt = { hora: '%H:%M', horaSeg: '%H:%M:%S', data: '%d/%m/%Y', dataHora: '%d/%m/%Y %H:%M' }[no.valores.formato];
        return `datetime.now().strftime(${py(fmt)})`;
      }
      case 'tamanhoLista': return `len(${v('lista')})`;
      case 'itemDaLista': { const l = v('lista'), n = iv('n'); return `(${l}[${n} - 1] if 0 < ${n} <= len(${l}) else "")`; }
      case 'itemAleatorio': { importa.add('random'); const l = v('lista'); return `(random.choice(${l}) if ${l} else "")`; }
      case 'listaTem': return `${v('valor')} in ${v('lista')}`;
      case 'juntarLista': return `${par(tv('sep'))}.join(str(x) for x in ${v('lista')})`;
    }
    return '""';
  }

  function expressaoElemento(e, porta, tipo) {
    const n = `self.${e.nome}`;
    let ex;
    if (!tk) {
      ex = {
        'campo:texto': `${n}.text()`, 'area:texto': `${n}.toPlainText()`, 'texto:texto': `${n}.text()`,
        'numero:valor': `${n}.value()`, 'slider:valor': `${n}.value()`, 'caixa:marcado': `${n}.isChecked()`, 'opcao:marcado': `${n}.isChecked()`,
        'combo:escolhido': `${n}.currentText()`, 'lista:item': `(${n}.currentItem().text() if ${n}.currentItem() else "")`,
        'combo:itens': `[${n}.itemText(i) for i in range(${n}.count())]`, 'lista:itens': `[${n}.item(i).text() for i in range(${n}.count())]`,
      }[`${e.tipo}:${porta}`];
    } else {
      ex = {
        'campo:texto': `self.${e.nome}_texto.get()`, 'area:texto': `${n}.get("1.0", "end-1c")`, 'texto:texto': `${n}.cget("text")`,
        'numero:valor': `self.${e.nome}_valor.get()`, 'slider:valor': `round(float(${n}.get()))`, 'caixa:marcado': `self.${e.nome}_marcado.get()`,
        'opcao:marcado': `(self.grupo_${e.grupoOpcao}.get() == ${py(e.nome)})`, 'combo:escolhido': `${n}.get()`,
        'lista:item': `(${n}.get(${n}.curselection()[0]) if ${n}.curselection() else "")`,
        'combo:itens': `list(${n}["values"])`, 'lista:itens': `list(${n}.get(0, "end"))`,
      }[`${e.tipo}:${porta}`];
    }
    ex = ex || '""';
    return tipo === 'numero' && !['valor'].includes(porta) ? num(ex) : ex;
  }

  // ---------------------------------------------------------------- ações
  const PRECISA_ALVO = new Set(['mudarTexto', 'limpar', 'esconder', 'mostrar', 'animar', 'alternar', 'habilitar', 'desabilitar', 'focar', 'mudarCor', 'definirValor', 'marcar', 'adicionarItem', 'removerSelecionado', 'limparLista', 'mudarImagem']);
  const PRECISA_VAR = new Set(['definirVar', 'somarVar', 'alternarVar', 'adicionarNaLista', 'removerDaLista', 'esvaziarVarLista']);

  function instrucao(no, ind, cx) {
    const F = FUNCOES[no.fn];
    const v = (k) => valor(no, k, cx);
    const tv = (k) => comoTexto(entradaTipada(no, k, cx));
    const nv = (k) => comoNumero(entradaTipada(no, k, cx));
    const iv = (k) => comoInteiro(entradaTipada(no, k, cx));
    const alvo = porId(no.valores.alvo);
    const n = alvo ? `self.${alvo.nome}` : null;
    const L1 = (...s) => s.map((x) => ind + x);
    if (PRECISA_ALVO.has(no.fn) && !alvo) {
      avisos.push(`O bloco “${F.nome}” has no element chosen.`);
      return L1(`pass  # “${F.nome}”: pick the element in the Functions editor`);
    }
    const ve = varExpr(no.valores.nome);
    if (PRECISA_VAR.has(no.fn) && !ve) {
      avisos.push(`O bloco “${F.nome}” has no variable chosen.`);
      return L1(`pass  # “${F.nome}”: pick the variable in the Functions editor`);
    }
    switch (no.fn) {
      case 'print': return L1(`print(${v('valor')})`);
      case 'mensagem': {
        importa.add('mensagem');
        const t = no.valores.tipo;
        if (tk) return L1(`messagebox.${{ info: 'showinfo', aviso: 'showwarning', erro: 'showerror' }[t]}(${tv('titulo')}, ${tv('texto')}, parent=self)`);
        return L1(`QMessageBox.${{ info: 'information', aviso: 'warning', erro: 'critical' }[t]}(self, ${tv('titulo')}, ${tv('texto')})`);
      }
      case 'som': return L1(tk ? 'self.bell()' : 'QApplication.beep()');
      case 'copiar': return tk ? L1('self.clipboard_clear()', `self.clipboard_append(${tv('texto')})`) : L1(`QApplication.clipboard().setText(${tv('texto')})`);
      case 'abrirSite': importa.add('webbrowser'); return L1(`webbrowser.open(${tv('url')})`);
      case 'abrirTela': {
        const t = no.valores.tela;
        if (!t || !(t === D.nome || PROJ.telas.some((x) => x.nome === t))) {
          avisos.push('The “Open another screen” block has no screen chosen.');
          return L1('pass # “Open another screen”: pick the screen in the Functions editor');
        }
        importa.add('telas');
        const C = classe(t);
        return L1(`from ${t} import ${C}`, `self.abrir_tela(${C}${no.valores.jeito === 'travar' ? ', travar=True' : ''})`);
      }
      case 'fechar': return L1(tk ? 'self.destroy()' : 'self.close()');
      case 'sair': return L1(tk ? 'self.nametowidget(".").destroy()' : 'QApplication.quit()');
      case 'mudarTitulo': return L1(tk ? `self.title(${tv('texto')})` : `self.setWindowTitle(${tv('texto')})`);
      case 'esconder': return L1(`self.esconder(${n})`);
      case 'animar': importa.add('animar'); return L1(`self.animar(${n}, ${py(no.valores.efeito || 'pulsar')}, ${iv('ms')})`);
      case 'mostrar': return L1(`self.mostrar(${n})`);
      case 'alternar':
        if (!tk) return L1(`${n}.setVisible(not ${n}.isVisible())`);
        return L1(`if ${n}.winfo_ismapped():`, `    self.esconder(${n})`, 'else:', `    self.mostrar(${n})`);
      case 'habilitar':
      case 'desabilitar': {
        const ligar = no.fn === 'habilitar';
        if (!tk) return L1(`${n}.setEnabled(${ligar ? 'True' : 'False'})`);
        if (['combo', 'slider', 'tabela'].includes(alvo.tipo)) return L1(`${n}.state([${py(ligar ? '!disabled' : 'disabled')}])`);
        return L1(`${n}.configure(state=${py(ligar ? 'normal' : 'disabled')})`);
      }
      case 'focar': return L1(tk ? `${n}.focus_set()` : `${n}.setFocus()`);
      case 'mudarCor': {
        const c = tv('cor');
        const fundo = no.valores.parte === 'fundo';
        if (!tk) return L1(`${n}.setStyleSheet(${n}.styleSheet() + ${py(fundo ? 'background: ' : 'color: ')} + ${c} + ";")`);
        if (alvo.tipo === 'retangulo' && !fundo) return L1('pass # rectangle has no text');
        return L1(`${n}.configure(${fundo ? 'bg' : 'fg'}=${c})`);
      }
      case 'mudarTexto': {
        const t = tv('texto');
        if (!tk) return L1(alvo.tipo === 'area' ? `${n}.setPlainText(${t})` : `${n}.setText(${t})`);
        if (alvo.tipo === 'campo') return L1(`self.${alvo.nome}_texto.set(${t})`);
        if (alvo.tipo === 'area') return L1(`${n}.delete("1.0", "end")`, `${n}.insert("1.0", ${t})`);
        return L1(`${n}.config(text=${t})`);
      }
      case 'limpar':
        if (!tk) return L1(`${n}.clear()`);
        return L1(alvo.tipo === 'area' ? `${n}.delete("1.0", "end")` : `self.${alvo.nome}_texto.set("")`);
      case 'definirValor': {
        const x = iv('valor');
        if (!tk) return L1(`${n}.setValue(${x})`);
        if (alvo.tipo === 'progresso') return L1(`${n}["value"] = ${x}`);
        if (alvo.tipo === 'numero') return L1(`self.${alvo.nome}_valor.set(${x})`);
        return L1(`${n}.set(${x})`);
      }
      case 'marcar': {
        const a = no.valores.acao;
        if (!tk) return L1(`${n}.setChecked(${a === 'marcar' ? 'True' : a === 'desmarcar' ? 'False' : `not ${n}.isChecked()`})`);
        const vr = `self.${alvo.nome}_marcado`;
        return L1(`${vr}.set(${a === 'marcar' ? 'True' : a === 'desmarcar' ? 'False' : `not ${vr}.get()`})`);
      }
      case 'adicionarItem': {
        const t = tv('texto');
        if (!tk) return L1(`${n}.addItem(${t})`);
        if (alvo.tipo === 'combo') return L1(`${n}["values"] = (*${n}["values"], ${t})`);
        return L1(`${n}.insert("end", ${t})`);
      }
      case 'removerSelecionado':
        if (!tk) return L1(`${n}.takeItem(${n}.currentRow())`);
        return L1(`for i in reversed(${n}.curselection()):`, `    ${n}.delete(i)`);
      case 'limparLista':
        if (!tk) return L1(`${n}.clear()`);
        if (alvo.tipo === 'combo') return L1(`${n}["values"] = ()`, `${n}.set("")`);
        return L1(`${n}.delete(0, "end")`);
      case 'mudarImagem': {
        importa.add('imagem');
        const a = tv('arquivo');
        if (tk) return L1(`self.mostrar_imagem(${n}, ${a}, ${py(alvo.ajuste || 'conter')})`);
        const modo = { conter: 'KeepAspectRatio', cobrir: 'KeepAspectRatioByExpanding', esticar: 'IgnoreAspectRatio' }[alvo.ajuste] || 'KeepAspectRatio';
        return L1(`${n}.setText("")`, `${n}.imagem_original = QPixmap(caminho(${a}))`, `${n}.ajuste_imagem = Qt.AspectRatioMode.${modo}`, 'posicionar(self, self._posicoes)');
      }
      case 'definirVar': {
        const tv = (acharVar(no.valores.nome, D) || {}).tipo;
        let x = v('valor');
        if (tv === 'numero') x = num(x); else if (tv === 'texto') x = txt(x);
        return L1(`${ve} = ${x}`);
      }
      case 'somarVar': return L1(`${ve} += ${nv('valor')}`);
      case 'alternarVar': return L1(`${ve} = not ${ve}`);
      case 'adicionarNaLista': return L1(`${ve}.append(${v('valor')})`);
      case 'removerDaLista': { const x = v('valor'); return L1(`if ${x} in ${ve}:`, `    ${ve}.remove(${x})`); }
      case 'esvaziarVarLista': return L1(`${ve}.clear()`);
      case 'pararRepeticao': {
        const q = no.valores.qual;
        if (!q) { avisos.push('The “Stop repeating” block has no repetition chosen.'); return L1('pass # “Stop repeating”: pick which one in the Functions editor'); }
        importa.add('repetir');
        return L1(`self.parar_repeticao(${py(q)})`);
      }
      case 'salvarArquivo': {
        const a = tv('arquivo'), t = tv('texto');
        if (no.valores.modo === 'substituir') return L1(`Path(${a}).write_text(${t}, encoding="utf-8")`);
        return L1(`with open(${a}, "a", encoding="utf-8") as arquivo:`, `    arquivo.write(${t} + "\\n")`);
      }
    }
    return L1('pass');
  }

  // ---------------------------------------------------------------- blocos que dividem o caminho
  function ramos(no, chaves, ind, vis, cx) {
    return chaves.map((k) => cadeia(`${no.id}:${k}`, ind + '    ', new Set(vis), cx));
  }
  const ou = (linhas, ind) => (linhas.length ? linhas : [ind + '    pass']);

  function criarMetodo(nome, ref, doc) {
    if (criados.has(nome)) return;
    criados.add(nome);
    const corpo = cadeia(ref, '        ', new Set(), { lacos: new Map(), fechar: false });
    extras.push('', `    def ${nome}(self, *args):`, `        """${doc}"""`, ...(corpo.length ? corpo : ['        pass']));
  }

  function cadeia(ref, ind, visitados, cx) {
    const linhas = [];
    let f = fioDe(ref);
    while (f) {
      const [alvoId] = f.para.split(':');
      const no = noPorId(alvoId);
      if (!no || visitados.has(no.id)) break;
      visitados.add(no.id);
      const id = no.id;
      if (no.fn === 'se' || no.fn === 'seSim') {
        const cond = no.fn === 'se' ? comparacao(no, cx) : valor(no, 'cond', cx);
        const [entao, senao] = ramos(no, ['entao', 'senao'], ind, visitados, cx);
        linhas.push(...ramificar(ind, cond, entao, senao));
        break;
      }
      if (no.fn === 'perguntar') {
        importa.add('mensagem');
        const t = comoTexto(entradaTipada(no, 'titulo', cx)), p = comoTexto(entradaTipada(no, 'texto', cx));
        const cond = tk ? `messagebox.askyesno(${t}, ${p}, parent=self)` : `QMessageBox.question(self, ${t}, ${p}) == QMessageBox.StandardButton.Yes`;
        const [sim, nao] = ramos(no, ['sim', 'nao'], ind, visitados, cx);
        linhas.push(...ramificar(ind, cond, sim, nao));
        break;
      }
      if (['pedirTexto', 'pedirNumero', 'escolherArquivo', 'escolherCor', 'lerArquivo'].includes(no.fn)) {
        const ve = varExpr(no.valores.nome);
        const tv = (acharVar(no.valores.nome, D) || {}).tipo;
        if (!ve) { avisos.push(`O bloco “${FUNCOES[no.fn].nome}” has no variable to store into.`); linhas.push(`${ind}pass  # “${FUNCOES[no.fn].nome}”: pick the variable in the Functions editor`); break; }
        const [ok, nao] = ramos(no, [no.fn === 'lerArquivo' ? 'depois' : 'depois', no.fn === 'lerArquivo' ? 'erro' : 'cancelou'], ind, visitados, cx);
        const i2 = ind + '    ';
        if (no.fn === 'lerArquivo') {
          const a = comoTexto(entradaTipada(no, 'arquivo', cx));
          const leitura = tv === 'lista' ? `Path(${a}).read_text(encoding="utf-8").splitlines()` : `Path(${a}).read_text(encoding="utf-8")`;
          linhas.push(`${ind}try:`, `${i2}${ve} = ${leitura}`, `${ind}except OSError:`, ...ou(nao, ind));
          if (ok.length) linhas.push(`${ind}else:`, ...ok);
          break;
        }
        let pre, cond, guardar;
        if (no.fn === 'pedirTexto' || no.fn === 'pedirNumero') {
          const t = comoTexto(entradaTipada(no, 'titulo', cx)), p = comoTexto(entradaTipada(no, 'texto', cx));
          const numero = no.fn === 'pedirNumero';
          if (tk) { importa.add('simpledialog'); pre = `resposta = simpledialog.${numero ? 'askfloat' : 'askstring'}(${t}, ${p}, parent=self)`; cond = 'resposta is not None'; }
          else { importa.add('QInputDialog'); pre = numero ? `resposta, ok = QInputDialog.getDouble(self, ${t}, ${p}, 0, -1e9, 1e9, 2)` : `resposta, ok = QInputDialog.getText(self, ${t}, ${p})`; cond = 'ok'; }
          guardar = numero || tv === 'numero' ? 'numero(resposta)' : 'resposta';
        } else if (no.fn === 'escolherArquivo') {
          const t = comoTexto(entradaTipada(no, 'titulo', cx));
          const salvar = no.valores.modo === 'salvar';
          if (tk) { importa.add('filedialog'); pre = `resposta = filedialog.${salvar ? 'asksaveasfilename' : 'askopenfilename'}(parent=self, title=${t})`; }
          else { importa.add('QFileDialog'); pre = `resposta, _ = QFileDialog.${salvar ? 'getSaveFileName' : 'getOpenFileName'}(self, ${t})`; }
          cond = 'resposta'; guardar = 'resposta';
        } else {
          if (tk) { importa.add('colorchooser'); pre = 'resposta = colorchooser.askcolor(parent=self)[1]'; cond = 'resposta'; guardar = 'resposta'; }
          else { importa.add('QColorDialog'); pre = 'resposta = QColorDialog.getColor(parent=self)'; cond = 'resposta.isValid()'; guardar = 'resposta.name()'; }
        }
        linhas.push(`${ind}${pre}`, `${ind}if ${cond}:`, `${i2}${ve} = ${guardar}`, ...ok);
        if (nao.length) linhas.push(`${ind}else:`, ...nao);
        break;
      }
      if (no.fn === 'repetir' || no.fn === 'paraCada') {
        const base = no.fn === 'repetir' ? 'volta' : 'item';
        const qtd = [...cx.lacos.values()].filter((x) => x.startsWith(base)).length;
        const nomeVar = base + (qtd ? qtd + 1 : '');
        const cx2 = { ...cx, lacos: new Map(cx.lacos).set(id, nomeVar) };
        const corpo = cadeia(`${id}:cada`, ind + '    ', new Set(visitados), cx2);
        linhas.push(no.fn === 'repetir' ? `${ind}for ${nomeVar} in range(1, ${comoInteiro(entradaTipada(no, 'vezes', cx))} + 1):` : `${ind}for ${nomeVar} in ${valor(no, 'lista', cx)}:`, ...ou(corpo, ind));
        f = fioDe(`${id}:depois`);
        continue;
      }
      if (no.fn === 'esperar') {
        const nome = `_fluxo_espera_${id}`;
        if (tk) linhas.push(`${ind}self.after(${ms(valor(no, 'segundos', cx))}, self.${nome})`);
        else { importa.add('timer'); linhas.push(`${ind}QTimer.singleShot(${ms(valor(no, 'segundos', cx))}, self.${nome})`); }
        criarMetodo(nome, `${id}:depois`, `Continues after “Wait seconds” (Functions editor).`);
        break;
      }
      if (no.fn === 'aCada') {
        const nome = `_fluxo_repete_${id}`;
        importa.add('repetir');
        if (!tk) importa.add('timer');
        const s = valor(no, 'segundos', cx);
        linhas.push(`${ind}self.repetir(${py(id)}, ${ehLiteralNumero(s) ? s : num(s)}, self.${nome})`);
        criarMetodo(nome, `${id}:cada`, `Runs every ${ehLiteralNumero(s) ? s : 'X'} segundo(s) (editor de Funções).`);
        f = fioDe(`${id}:depois`);
        continue;
      }
      if (no.fn === 'parar') {
        if (cx.fechar && !tk) linhas.push(`${ind}evento.ignore()`);
        linhas.push(`${ind}return`);
        break;
      }
      linhas.push(...instrucao(no, ind, cx));
      f = fioDe(`${id}:depois`);
    }
    return linhas;
  }

  // ---------------------------------------------------------------- métodos dos eventos
  const metodos = [];
  const conexoes = new Map();
  let aoAbrir = null, aoFechar = null, fechaQt = false;
  const fontes = [['tela', 'aoAbrir'], ['tela', 'aoFechar']];
  for (const e of D.elementos) for (const [porta, tipo] of PORTAS_ELEMENTO[e.tipo] || []) if (tipo === 'exec') fontes.push([e.id, porta]);
  for (const [id, porta] of fontes) {
    const fechar = id === 'tela' && porta === 'aoFechar';
    const corpo = cadeia(`${id}:${porta}`, '        ', new Set(), { lacos: new Map(), fechar });
    if (!corpo.length) continue;
    const e = porId(id);
    if (fechar) {
      if (tk) {
        aoFechar = '_fluxo_ao_fechar';
        metodos.push('', '    def _fluxo_ao_fechar(self):', '        """When the window closes: made in the Functions editor (“Stop here” cancels closing)."""', ...corpo, '        self.destroy()');
      } else {
        fechaQt = true;
        metodos.push('', '    def closeEvent(self, evento):', '        """When the window closes: made in the Functions editor (“Stop here” cancels closing)."""', ...corpo, '        super().closeEvent(evento)');
      }
      continue;
    }
    const nome = id === 'tela' ? '_fluxo_ao_abrir' : `_fluxo_${e.nome}_${porta}`;
    const usuario = e && e[porta];
    const chamada = !usuario ? [] : ['aoClicar', 'aoEnter'].includes(porta) ? [`        self.${usuario}()`] : [`        self.${usuario}(*args)`];
    metodos.push('', `    def ${nome}(self, *args):`, `        """Made in the Designer's Functions editor (rebuilt on save)."""`, ...corpo, ...chamada);
    if (id === 'tela') aoAbrir = nome; else conexoes.set(`${id}:${porta}`, nome);
  }
  metodos.push(...extras);

  // ---------------------------------------------------------------- ajudantes que os blocos usam
  if (importa.has('telas')) {
    metodos.push('', '    def abrir_tela(self, classe, travar=False):', '        """Opens another screen of the project (Functions editor)."""', '        tela = classe()');
    if (tk) metodos.push('        if travar:', '            tela.transient(self)', '            tela.grab_set()', '        return tela');
    else metodos.push('        if travar:', '            tela.setWindowModality(Qt.WindowModality.ApplicationModal)', '        if not hasattr(self, "_telas_abertas"):', '            self._telas_abertas = []', '        self._telas_abertas.append(tela)  # guarda para o Python não apagar a janela', '        tela.show()', '        return tela');
  }
  if (importa.has('repetir')) {
    metodos.push('', '    def repetir(self, nome, segundos, funcao):', '        """Runs the function every X seconds until parar_repeticao(nome)."""', '        self.parar_repeticao(nome)');
    if (tk) {
      metodos.push('        espera = max(1, round(segundos * 1000))', '', '        def passo():', '            self._repeticoes[nome] = self.after(espera, passo)', '            funcao()', '', '        self._repeticoes[nome] = self.after(espera, passo)',
        '', '    def parar_repeticao(self, nome):', '        if not hasattr(self, "_repeticoes"):', '            self._repeticoes = {}', '        marcador = self._repeticoes.pop(nome, None)', '        if marcador:', '            self.after_cancel(marcador)');
    } else {
      metodos.push('        cronometro = QTimer(self)', '        cronometro.timeout.connect(funcao)', '        cronometro.start(max(1, round(segundos * 1000)))', '        self._repeticoes[nome] = cronometro',
        '', '    def parar_repeticao(self, nome):', '        if not hasattr(self, "_repeticoes"):', '            self._repeticoes = {}', '        cronometro = self._repeticoes.pop(nome, None)', '        if cronometro:', '            cronometro.stop()');
    }
  }

  // variáveis desta tela (as compartilhadas ficam em ui/estado.py)
  const iniciar = (L.vars || []).filter((x) => !x.global).map((x) => `        self.var_${x.nome} = ${inicialPython(x)}`);
  if ((L.vars || []).some((x) => x.global)) importa.add('estado');
  const tudo = metodos.join('\n');
  const usaNumero = /\bnumero\(/.test(tudo);
  return { metodos, conexoes, aoAbrir, aoFechar, fechaQt, iniciar, importa, usaNumero, avisos };
}

export const FUNCAO_NUMERO = [
  'def numero(valor):',
  '    """Converts to a number (accepts comma). If it is not a number, becomes 0."""',
  '    if isinstance(valor, bool):',
  '        return int(valor)',
  '    try:',
  '        n = float(str(valor).replace(",", "."))',
  '    except ValueError:',
  '        return 0',
  '    return int(n) if n.is_integer() else n',
];
