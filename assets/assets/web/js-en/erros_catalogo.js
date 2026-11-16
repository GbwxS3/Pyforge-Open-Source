// Catálogo de erros: Python, bibliotecas, Windows e ferramentas — tudo explicado em português.
//
// Cada entrada: { grupo, tipos, re, titulo, texto, exemplo }
//   tipos   : nomes de exceção separados por | (curto "TypeError" ou completo "sqlite3.OperationalError").
//             null = procura na saída inteira (ferramentas, avisos e mensagens do Qt/Windows).
//   re      : expressão que a mensagem precisa ter (null = qualquer mensagem desse tipo).
//   titulo  : $1, $2… = pedaços capturados pela expressão (nomes de tipo viram português).
//   exemplo : [errado, certo] — mostrado no cartão do erro.
// A ordem importa: os casos específicos vêm antes do caso geral de cada tipo.

export const CATALOGO = [];
let grupoAtual = '';
const g = (nome) => { grupoAtual = nome; };
function e(tipos, re, titulo, texto, exemplo, acao) {
  CATALOGO.push({ grupo: grupoAtual, tipos: tipos ? tipos.split('|') : null, re, titulo, texto, exemplo: exemplo || null, acao: acao || null });
}

// =====================================================================================================
g('Names and variables');
e('NameError', /name '(true|false)' is not defined/, '“$1” with a lowercase letter', 'In Python, true and false are True and False, with a capital first letter.', ['ativo = true', 'ativo = True']);
e('NameError', /name '(null|none|nil|undefined)' is not defined/, '“$1” does not exist in Python', 'Python\'s “empty” is called None (with a capital N).', ['value = null', 'value = None']);
e('NameError', /name 'self' is not defined/, '“self” outside a method', 'self only exists inside a method (a def inside a class), and must be its first parameter.', ['class Jogo:\n    def iniciar():\n        self.points = 0', 'class Jogo:\n    def iniciar(self):\n        self.points = 0']);
e('NameError', /name '(Print|Input|Len|Range|Int|Str|Float|List|Dict|Def|If|For|While|Import|Return|Class)' is not defined/, '“$1” with a capital letter', 'Python is case-sensitive: Python\'s words are all lowercase (print, input, len, range…).', ['Print("Hi")', 'print("Hi")']);
e('NameError', /name '(math|random|os|sys|time|json|datetime|re|csv|sqlite3|pathlib|Path|tk|tkinter|ttk|messagebox|np|numpy|pd|pandas|plt|requests|pygame|turtle|QApplication|QWidget|QLabel|QPushButton)' is not defined/, 'Forgot to import “$1”', 'To use a module or class, first import it at the top of the file.', ['print(math.sqrt(16))', 'import math\n\nprint(math.sqrt(16))']);
e('NameError', /name '([^']+)' is not defined\. Did you mean: '([^']+)'/, '“$1” does not exist — did you mean “$2”?', 'It is probably a typo. Python found a similar name that exists.', ['name = "Ana"\nprint(nmoe)', 'name = "Ana"\nprint(name)']);
e('NameError', /name '([^']+)' is not defined/, 'The name “$1” does not exist here', 'Python did not find that variable or function at this point. It may be a typo (capitals count!), the variable was not created yet (code runs from top to bottom) or an import is missing. Text needs quotes: print(hi) looks for a variable called hi.', ['print(ola)', 'print("ola")']);
e('NameError', /cannot access free variable '([^']+)'|free variable '([^']+)' referenced before assignment/, '“$1” was used before it existed', 'An inner function uses a variable of the outer function that has no value yet.', null);
e('NameError', null, 'Unknown name', 'Python did not find that name. Check the spelling and whether it was created before this line.', null);
e('UnboundLocalError', /'([^']+)'/, '“$1” was used before it got a value', 'Since you change this variable inside the function, Python thinks it is local and ignores the outer one. Pass the value as a parameter and give it back with return (or, if you really need to, use “global $1” at the start of the function).', ['points = 0\ndef ganhar():\n    points += 1', 'points = 0\ndef ganhar(points):\n    return points + 1\n\npoints = ganhar(points)']);
e('UnboundLocalError', null, 'Variable used before it got a value', 'Inside the function, the variable is used before the line that gives it a value.', null);

// =====================================================================================================
g('Data types (TypeError)');
e('TypeError', /can only concatenate str \(not "([^"]+)"\) to str/, 'Joining text with $1', '+ only joins text with text. Use an f-string, which accepts any value, or convert with str().', ['age = 15\nprint("Age: " + age)', 'age = 15\nprint(f"Age: {age}")']);
e('TypeError', /can only concatenate list \(not "([^"]+)"\) to list/, 'Joining a list with $1', 'A list + only joins with another list. To add an item at the end, use .append().', ['names = names + "Ana"', 'names.append("Ana")']);
e('TypeError', /can only concatenate tuple/, 'Joining a tuple with something else', 'A tuple + only joins with another tuple. A single item becomes a tuple with a comma: (x,).', null);
e('TypeError', /unsupported operand type\(s\) for [^:]+: '(int|float)' and 'str'|unsupported operand type\(s\) for [^:]+: 'str' and '(int|float)'/, 'Calculation mixing a number with text', 'One of the values is text (str). Remember: input() always returns text — convert with int() or float() before calculating.', ['age = input("Age? ")\nprint(age + 1)', 'age = int(input("Age? "))\nprint(age + 1)']);
e('TypeError', /unsupported operand type\(s\) for [^:]+: 'NoneType' and|and 'NoneType'/, 'Calculation with a None value (empty)', 'One of the values in the calculation is None. It is almost always a function without return: it returns None.', ['def dobro(x):\n    print(x * 2)\n\ntotal = dobro(5) + 1', 'def dobro(x):\n    return x * 2\n\ntotal = dobro(5) + 1']);
e('TypeError', /unsupported operand type\(s\) for ([^:]+): '([^']+)' and '([^']+)'/, 'The operation “$1” does not work between $2 and $3', 'These two kinds of value do not combine in this operation. Check each one\'s type with print(type(x)).', null);
e('TypeError', /bad operand type for unary ([^:]+): '([^']+)'/, '“$1” sign in front of $2', 'You cannot use that sign with that kind of value (e.g. -"5"). Convert it to a number first.', null);
e('TypeError', /'([<>]=?)' not supported between instances of '([^']+)' and '([^']+)'/, 'Comparing $2 with $3', 'To compare with < ou >, both sides must be the same type. Very common: comparing the text from input() with a number.', ['age = input("Age? ")\nif age >= 18: ...', 'age = int(input("Age? "))\nif age >= 18: ...']);
e('TypeError', /can't multiply sequence by non-int of type '([^']+)'/, 'Multiplying text/list by $1', '"ab" * 3 repeats the text, but only with a whole number. If you meant to do math, the other value is text: convert it with float().', ['price = input("Price? ")\ntotal = price * 1.5', 'price = float(input("Price? "))\ntotal = price * 1.5']);
e('TypeError', /'NoneType' object is not subscriptable/, 'Used [ ] on something that is None', 'The variable is empty (None). Common cause: a function without return, or a method like list.sort() that changes the list and returns None.', ['names = names.sort()\nprint(names[0])', 'names.sort()\nprint(names[0])']);
e('TypeError', /'(builtin_function_or_method|function|method)' object is not subscriptable/, 'Used [ ] on a function', 'Functions are called with ( ), not [ ]. Or you forgot to call the function before getting the item.', ['print[0]', 'print(items[0])']);
e('TypeError', /'(dict_keys|dict_values|dict_items|set|map|filter|zip|generator|reversed|enumerate)' object is not subscriptable/, '$1 does not accept [position]', 'That kind of collection has no positions. Turn it into a list first with list().', ['primeira = data.keys()[0]', 'primeira = list(data.keys())[0]']);
e('TypeError', /'type' object is not subscriptable/, 'Used [ ] on a class', 'list[0] or dict["x"] uses the type name, not your variable. Or: an annotation like list[int] on an old Python version.', null);
e('TypeError', /'(int|float|bool)' object is not subscriptable/, 'Used [ ] on a number', 'Numbers have no positions. To get a digit, turn it into text: str(number)[0].', ['number = 1234\nprint(number[0])', 'number = 1234\nprint(str(number)[0])']);
e('TypeError', /'([^']+)' object is not subscriptable/, '$1 does not accept [ ]', 'That kind of value has no items to get with brackets. Check what the variable really holds.', null);
e('TypeError', /'(builtin_function_or_method|method)' object is not iterable/, 'Missing ( ) to call the method', 'You are looping over the method instead of its result. Add the parentheses.', ['for chave in dados.keys:', 'for key in data.keys():']);
e('TypeError', /'NoneType' object is not iterable|cannot unpack non-iterable NoneType object/, 'Looping over something that is None', 'The for (or the “a, b = ...”) got None. Usually it is a function that forgot the return.', ['def pegar():\n    names = ["a", "b"]\n\nfor n in pegar(): ...', 'def pegar():\n    return ["a", "b"]\n\nfor n in pegar(): ...']);
e('TypeError', /'(int|float)' object is not iterable|cannot unpack non-iterable (int|float) object/, 'Looping over a number', 'To repeat N times use range(N).', ['for i in 10:', 'for i in range(10):']);
e('TypeError', /'type' object is not iterable/, 'Looping over a class', 'You put the type name (list, dict…) or a class in the for, not your variable.', null);
e('TypeError', /'([^']+)' object is not iterable|cannot unpack non-iterable ([^ ]+) object/, '$1 cannot be looped over', 'The for (or the unpacking a, b = ...) needs a list, text, tuple, dictionary…', null);
e('TypeError', /argument of type '([^']+)' is not iterable|'in <string>' requires string as left operand, not ([^ ]+)/, 'Using “in” with the wrong type', '“x in y” needs y to be text, a list, a dictionary… And in text, x must also be text.', ['if 5 in "12345":', 'if "5" in "12345":']);
e('TypeError', /'module' object is not callable/, 'Called the module instead of its function', 'You imported the module and used it as a function. Use module.function() or import the function directly.', ['import random\nn = random(1, 6)', 'import random\nn = random.randint(1, 6)']);
e('TypeError', /'NoneType' object is not callable/, 'Called something that is None', 'You put ( ) after something empty. In buttons: command=function (no parentheses), not command=function().', ['button = tk.Button(text="OK", command=salvar())', 'button = tk.Button(text="OK", command=salvar)']);
e('TypeError', /'(str|int|float|list|dict|tuple|bool)' object is not callable/, 'Called $1 as if it were a function', 'You put ( ) after a value. Two common causes: a variable named like a function (e.g. input = "x" and then input()), or a missing * in math: 2(3+4).', ['total = 2(3 + 4)', 'total = 2 * (3 + 4)']);
e('TypeError', /'([^']+)' object is not callable/, '$1 is not a function', 'You put ( ) after something that is not a function. Sometimes it is a variable with the same name as a function or method.', null);
e('TypeError', /'(str|tuple|range|bytes)' object does not support item assignment/, 'You cannot change $1 by position', 'Text and tuples are immutable: you cannot change a piece. Create a new one (text.replace(), or turn it into a list).', ['name = "ana"\nname[0] = "A"', 'name = "ana"\nname = "A" + name[1:]']);
e('TypeError', /'([^']+)' object (does not|doesn't) support item (assignment|deletion)/, '$1 does not allow changing/deleting items', 'That type does not allow changing items by position.', null);
e('TypeError', /list indices must be integers or slices, not str/, 'List position with text', 'Lists use a number as the position (0, 1, 2…). If the number came from input(), convert it with int(). If you wanted to use a name as a key, use a dictionary.', ['i = input("Position? ")\nprint(names[i])', 'i = int(input("Position? "))\nprint(names[i])']);
e('TypeError', /list indices must be integers or slices, not float/, 'List position with a decimal number', 'The position must be a whole number. Division with / always gives a decimal: use // for whole division.', ['meio = items[len(items) / 2]', 'meio = items[len(items) // 2]']);
e('TypeError', /list indices must be integers or slices, not tuple/, 'Missing comma between lists, or [row, column] on a list', 'items[1, 2] não existe: para tabela (items de listas) use items[1][2]. Ou faltou uma vírgula entre duas listas.', ['tabela[1, 2]', 'tabela[1][2]']);
e('TypeError', /(string|tuple) indices must be integers/, '$1 position with text', 'You used ["name"] on something that is text (or a tuple), not a dictionary. Very common when looping over a dictionary: the for gives only the keys.', ['for item in data:\n    print(item["name"])', 'for key, value in data.items():\n    print(key, value)']);
e('TypeError', /unhashable type: '([^']+)'/, '$1 cannot be a dictionary key', 'Lists, dictionaries and sets cannot be dict keys or set items. Use a tuple instead of the list.', ['visitados = {[1, 2]}', 'visitados = {(1, 2)}']);
e('TypeError', /object of type '([^']+)' has no len\(\)/, '$1 has no length', 'len() funciona com text, items, dicionário… Para contar dígitos de um número: len(str(number)).', ['len(12345)', 'len(str(12345))']);
e('TypeError', /missing (\d+) required positional arguments?: 'self'/, 'Called the method on the class, without creating the object', 'First create the object (with parentheses on the class), then call the method on it.', ['Jogo.iniciar()', 'jogo = Jogo()\njogo.iniciar()']);
e('TypeError', /(\w[\w.]*)\(\) missing (\d+) required (?:positional|keyword-only) arguments?: (.+)/, '$r1() needs more values: missing $3', 'The function needs more arguments than you passed. Check its def.', ['def somar(a, b):\n    return a + b\n\nsomar(1)', 'somar(1, 2)']);
e('TypeError', /(\w[\w.]*)\(\) takes 0 positional arguments but 1 was given/, '$r1() is missing “self”', 'Every class method receives the object itself as its first parameter. Put self in the def.', ['class Jogo:\n    def pular():', 'class Jogo:\n    def pular(self):']);
e('TypeError', /(\w[\w.]*)\(\) takes (?:from )?(\d+)(?: to \d+)? positional arguments? but (\d+) (?:were|was) given/, '$r1() recebeu valores demais', 'The function accepts $2, but got $3. In class methods, self counts as the first one. In Qt buttons, “clicked” can send an extra value (checked).', null);
e('TypeError', /(\w[\w.]*)\(\) got an unexpected keyword argument '([^']+)'/, '$r1() does not know the parameter “$2”', 'That parameter name does not exist in this function (a typo, or a library version difference).', null);
e('TypeError', /(\w[\w.]*)\(\) got multiple values for (?:keyword )?argument '([^']+)'/, '“$2” foi passado duas vezes', 'The same parameter was passed by position and by name. In methods, sometimes self is missing in the def.', null);
e('TypeError', /(\w+)\(\) takes no arguments|object\.__init__\(\) takes exactly one argument/, 'The class has no __init__ (or it is misspelled)', 'You passed values when creating the object, but the class has no __init__ to receive them. Check: it is TWO underscores on each side — __init__, not _init_ or __int__.', ['class Carro:\n    def _init_(self, cor):\n        self.cor = cor', 'class Carro:\n    def __init__(self, cor):\n        self.cor = cor']);
e('TypeError', /__init__\(\) should return None/, '__init__ cannot return a value', '__init__ only prepares the object. Remove the return (or leave just “return”).', null);
e('TypeError', /(int|float)\(\) argument must be a string, a bytes-like object or a (?:real )?number, not '([^']+)'/, '$r1() recebeu $2', 'int()/float() convertem text ou número. Se for None, alguma função esqueceu o return; se for items, converta item por item.', null);
e('TypeError', /'(float|str|NoneType)' object cannot be interpreted as an integer/, 'Needed a whole number, got $1', 'range(), posições e repetições precisam de int. Use int() ou a divisão inteira //.', ['for i in range(input("Quantas? ")):', 'for i in range(int(input("Quantas? "))):']);
e('TypeError', /slice indices must be integers/, 'Slice [a:b] with a decimal number or text', 'Slice numbers must be whole numbers: use // or int().', null);
e('TypeError', /sequence item (\d+): expected str instance, ([^ ]+) found/, 'join() achou um $2 na posição $1', '"sep".join(list) only joins texts. Convert first.', ['", ".join([1, 2, 3])', '", ".join(str(n) for n in [1, 2, 3])']);
e('TypeError', /a bytes-like object is required, not 'str'/, 'Needed bytes, got text', 'The file/connection was opened in binary mode ("rb"/"wb"). Open it in text mode ("r"/"w") or convert with text.encode().', null);
e('TypeError', /write\(\) argument must be str, not ([^ ]+)/, 'write() só escreve text (veio $1)', 'Convert to text before writing to the file.', ['file.write(points)', 'file.write(str(points) + "\\n")']);
e('TypeError', /not all arguments converted during string formatting/, '% formatting went wrong', 'A value was left over in % formatting. Or: you used % (remainder) on a text — convert it to a number. Prefer f-strings.', ['print("Hi %s" % (name, age))', 'print(f"Hi {name}, {age} anos")']);
e('TypeError', /not enough arguments for format string/, 'Missing value in % formatting', 'There are more %s than values. Prefer f-strings: f"{a} {b}".', null);
e('TypeError', /%[a-z] format: a (?:real )?number is required, not ([^ ]+)/, 'Number format got $1', '%d and %f need a number. Convert it or use an f-string.', null);
e('TypeError', /unsupported format string passed to (\w+)\.__format__/, 'Number formatting on $1', 'You used something like {x:.2f} on a value that is not a number (e.g. None or text).', null);
e('TypeError', /Object of type (\w+) is not JSON serializable/, '$1 cannot become JSON', 'JSON only stores text, numbers, True/False, None, lists and dictionaries. Convert first (e.g. str(date), list(a_set)).', null);
e('TypeError', /the JSON object must be str, bytes or bytearray, not (\w+)/, 'json.loads recebeu $1', 'json.loads() reads JSON TEXT. If you already have a dictionary, no need to convert. For files use json.load(file).', null);
e('TypeError', /expected str, bytes or os\.PathLike object, not (\w+)/, 'File path got $1', 'The function expected the file path (text). If it is None, the file dialog was canceled.', null);
e('TypeError', /descriptor '(\w+)' (?:of|for) '(\w+)' objects? (?:needs an argument|doesn't apply)|unbound method (\w+)\.(\w+)\(\) needs an argument/, 'Called a method on the class, without the value', 'Call the method on your value, not on the type: name.upper(), not str.upper().', ['str.upper()', 'name.upper()']);
e('TypeError', /exceptions must derive from BaseException/, 'raise with something that is not an error', 'raise needs an exception: raise ValueError("message").', ['raise "Deu erro"', 'raise ValueError("Something went wrong")']);
e('TypeError', /catching classes that do not inherit from BaseException/, 'except with something that is not an error', 'The except takes the error type (ValueError, KeyError…), not a text or value.', null);
e('TypeError', /__str__ returned non-string/, '__str__ must return text', 'Use return str(...) or an f-string in __str__.', null);
e('TypeError', /can't (?:subtract|compare) offset-naive and offset-aware datetimes/, 'Dates with and without time zone', 'One date has a time zone and the other does not. Use datetime.now(timezone.utc) in both, or remove the zone with .replace(tzinfo=None).', null);
e('TypeError', /object (\w+) can't be used in 'await' expression/, 'await on something that is not async', 'You can only use await in async def functions (coroutines).', null);
e('TypeError', /Population must be a sequence/, 'random.sample with a set/dictionary', 'random.sample needs a list: random.sample(list(a_set), 2).', null);
e('TypeError', /called with wrong argument types|argument \d+ has unexpected type '([^']+)'/, 'Wrong value type in a Qt method', 'PySide methods are strict: setText needs text, setValue a whole number… Convert first.', ['self.label.setText(points)', 'self.label.setText(str(points))']);
e('TypeError', /isinstance\(\) arg 2 must be a type/, 'isinstance with something that is not a type', 'The second value must be a type (int, str…) or a tuple of types: isinstance(x, (int, float)).', null);
e('TypeError', /Cannot create a consistent method resolution order/, 'Impossible inheritance order', 'The parent classes are in an order Python cannot resolve. Put the most specific class first.', null);
e('TypeError', /super\(type, obj\): obj must be an instance or subtype of type/, 'super() com a classe errada', 'Use super().__init__() without arguments (Python 3).', null);
e('TypeError', null, 'Wrong type of value', 'An operation got a data type it does not accept. Check the type of the variables involved with print(type(x)).', null);

// =====================================================================================================
g('Invalid values (ValueError)');
e('ValueError', /invalid literal for int\(\) with base \d+: ''/, 'int() recebeu um text vazio', 'The field or input() came empty. Check first: if text.strip(): ... or use try/except.', ['age = int(field.get())', 'text = field.get().strip()\nage = int(text) if text else 0']);
e('ValueError', /invalid literal for int\(\) with base 10: '-?\d+[.,]\d+'/, 'int() recebeu um número com vírgula/ponto', 'int() só aceita numbers inteiros escritos como text. Para decimais, use float() (e troque a vírgula por ponto).', ['n = int("3.5")', 'n = float("3,5".replace(",", "."))']);
e('ValueError', /invalid literal for int\(\) with base \d+: '\s+\d+\s*'|invalid literal for int\(\) with base \d+: '\d+\s+'/, 'int() recebeu espaços', 'Remove the spaces with .strip() before converting.', null);
e('ValueError', /invalid literal for int\(\) with base (\d+): (.+)/, 'int() não entendeu $2', 'That text is not a whole number. If it comes from the user, handle it with try/except ValueError.', ['n = int(input("Number: "))', 'try:\n    n = int(input("Number: "))\nexcept ValueError:\n    print("Type numbers only!")']);
e('ValueError', /could not convert string to float: ''/, 'float() recebeu um text vazio', 'The field came empty. Check before converting.', null);
e('ValueError', /could not convert string to float: '-?\d+,\d+'/, 'Number with a comma', 'Python uses a dot as the decimal separator (3.5), not a comma (3,5). Replace it before converting.', ['price = float("3,50")', 'price = float("3,50".replace(",", "."))']);
e('ValueError', /could not convert string to float: (.+)/, 'float() não entendeu $1', 'That text is not a number. Remove letters, currency symbols and spaces first.', null);
e('ValueError', /too many values to unpack \(expected (\d+)(?:, got (\d+))?\)/, 'Too many values for $1 variables', 'In “a, b = something”, the right side has more items than variables. In a for over a dictionary, use .items() to get key and value.', ['for nome, idade in pessoas:', 'for name, age in pessoas.items():']);
e('ValueError', /not enough values to unpack \(expected (\d+), got (\d+)\)/, 'Expected $1 values, got $2', 'The right side has fewer items than variables. E.g. text.split() returned fewer pieces than you thought.', null);
e('ValueError', /list\.remove\(x\): x not in list/, 'remove() não achou o item', 'The item is not in the list. Check first with: if item in my_list: my_list.remove(item).', ['names.remove("Joe")', 'if "Joe" in names:\n    names.remove("Joe")']);
e('ValueError', /'?(.+?)'? is not in list|tuple\.index\(x\): x not in tuple/, '$1 is not in the list', '.index() only works if the item exists. Check with “in” first.', null);
e('ValueError', /substring not found/, 'Text piece not found', 'text.index() raises an error when it finds nothing. Use text.find(), which returns -1, or check with “in”.', null);
e('ValueError', /math domain error/, 'Impossible math operation', 'E.g. square root of a negative number, or log of zero/negative.', ['math.sqrt(-4)', 'math.sqrt(abs(-4))']);
e('ValueError', /empty range (?:for|in) randrange/, 'Random pick with an empty range', 'random.randint(a, b) needs a to be less than or equal to b. randrange(0) and choice from an empty list also cause this.', null);
e('ValueError', /Sample larger than population/, 'Picking more items than there are', 'random.sample(my_list, n) needs n to be at most len(my_list).', null);
e('ValueError', /(max|min)\(\) (?:arg is an empty sequence|iterable argument is empty)/, '$1() of an empty list', 'You cannot find the largest/smallest of nothing. Check that the list has items, or use default=0.', ['maior = max(grades)', 'maior = max(grades, default=0)']);
e('ValueError', /time data '(.+)' does not match format '(.+)'/, 'The date “$1” does not match the format $2', 'The date text must be exactly in the format. For Brazilian dates: "%d/%m/%Y".', ['datetime.strptime("25/12/2026", "%Y-%m-%d")', 'datetime.strptime("25/12/2026", "%d/%m/%Y")']);
e('ValueError', /unconverted data remains: (.+)/, '“$1” left over after the date', 'The text has more than the format (e.g. a time). Adjust the format.', null);
e('ValueError', /(month|day|hour|minute|second|year) (?:must be in|is out of range)/, 'Impossible date (invalid $1)', 'Month from 1 to 12, a day that exists in the month (February!), hour from 0 to 23…', null);
e('ValueError', /I\/O operation on closed file/, 'Using a file that is already closed', 'After the “with open(...)” block, the file closes. Read/write everything inside the with.', ['with open("a.txt") as f:\n    pass\ntext = f.read()', 'with open("a.txt") as f:\n    text = f.read()']);
e('ValueError', /dictionary update sequence element/, 'dict() recebeu itens no formato errado', 'To create a dictionary from a list, each item must be a (key, value) pair.', null);
e('ValueError', /invalid mode: '(.+)'|must have exactly one of create\/read\/write\/append mode/, 'Invalid file open mode', 'Use "r" (read), "w" (write from scratch), "a" (append), with "b" for binary. E.g. open("x.txt", "w", encoding="utf-8").', null);
e('ValueError', /embedded null (?:character|byte)/, 'Null character in the text/path', 'Probably a Windows path with \\0. Use forward slashes or r"C:\\folder".', null);
e('ValueError', /Exceeds the limit \(\d+ digits\) for integer string conversion/, 'Number too big to turn into text', 'Python limits numbers with thousands of digits. Use sys.set_int_max_str_digits(0) if you really need it.', null);
e('ValueError', /cannot convert float NaN to integer/, 'Converting “NaN” to an integer', 'NaN is “not a number” (e.g. an empty cell in pandas). Handle it first with math.isnan() or .fillna(0).', null);
e('ValueError', /Unknown format code '(.)' for object of type '([^']+)'/, 'Format “$1” does not work for $2', 'E.g. {x:d} only works for whole numbers; {x:.2f} for numbers. Convert the value first.', ['f"{preco:d}"', 'f"{preco:.2f}"']);
e('ValueError', /Single '[{}]' encountered in format string|unmatched '\{' in format spec|expected '\}' before end of string/, 'Lone { } brace in the formatting', 'In f-strings and .format(), literal braces are written doubled: {{ and }}.', ['f"{nome} {x"', 'f"{nome} {{x}}"']);
e('ValueError', /The truth value of an? (?:array|Series|DataFrame).* is ambiguous/, 'if com uma coluna/array inteiro', 'In numpy/pandas, compare item by item: use .any(), .all(), or & and | with parentheses: df[(df.a > 1) & (df.b < 5)].', ['if df["age"] > 18:', 'adultos = df[df["age"] > 18]']);
e('ValueError', /Length of values \((\d+)\) does not match length of index \((\d+)\)/, 'Column with $1 values in a table of $2 rows', 'The list you put in the column must have the same length as the table.', null);
e('ValueError', /operands could not be broadcast together with shapes|could not broadcast input array/, 'Arrays of different sizes', 'The two matrices/vectors do not have compatible shapes for the operation. Check .shape of each.', null);
e('ValueError', /shapes \(.+\) and \(.+\) not aligned/, 'Matrix multiplication with wrong sizes', 'In matrix multiplication, the columns of the first must equal the rows of the second.', null);
e('ValueError', /setting an array element with a sequence/, 'List inside a numeric array', 'The inner lists have different sizes, or an item is a list where it should be a number.', null);
e('ValueError', /x and y must have same first dimension/, 'Chart with x and y of different sizes', 'In plt.plot(x, y), both lists must have the same number of items.', null);
e('ValueError', /Excel file format cannot be determined|File is not a recognized excel file/, 'File does not look like Excel', 'Check the extension (.xlsx) and that the file is not corrupted. For .csv use read_csv.', null);
e('ValueError', /'(.+)' is not a valid (\w+)/, '“$1” is not a valid value of $2', 'That value does not exist in the Enum. Check the options.', null);
e('ValueError', /chr\(\) arg not in range/, 'chr() com número fora do intervalo', 'chr() aceita de 0 a 1.114.111.', null);
e('ValueError', /unknown url type: '?(.+?)'?$/, 'Address without “https://”', 'Start the address with https://.', null);
e('ValueError', /negative shift count|negative (?:count|dimensions)/, 'Negative number where it is not allowed', 'That value must be 0 or greater.', null);
e('ValueError', null, 'Invalid value', 'The type is right, but the value does not work for this operation. Read the original message: it says which value.', null);

// =====================================================================================================
g('Attributes and methods (AttributeError)');
e('AttributeError', /partially initialized module '([^']+)'.*(?:circular import|same name)/, 'Circular import (or a file named like a module)', 'The module $1 was still loading. Either two files import each other, or YOUR file has the same name as the module (e.g. random.py, turtle.py) — rename your file.', null);
e('AttributeError', /module '(random|math|turtle|time|json|csv|socket|email|string|calendar|queue|copy|tkinter|pygame|requests|numpy|pandas|os|re|datetime|statistics|secrets|threading|test|code|token|types|select|operator|array)' has no attribute '([^']+)'(?:.*consider renaming '([^']+)')?/, '“$1” has no “$2” — does your file have the same name?', 'Se existe um file seu chamado $1.py (ou uma pasta $1), ele esconde o módulo de verdade. Renomeie o seu file (ex.: meu_$1.py) e apague a pasta __pycache__. Se não for isso, confira a grafia.', null);
e('AttributeError', /module 'numpy' has no attribute '(float|int|bool|object|str)'/, 'numpy.$1 foi removido', 'In new numpy versions, use the Python type: $1 (without np.).', ['np.float', 'float']);
e('AttributeError', /module '([^']+)' has no attribute '([^']+)'(?:\. Did you mean: '([^']+)')?/, 'The module $1 has no “$2”', 'A typo, or that function was renamed/removed in the installed version.', null);
e('AttributeError', /'NoneType' object has no attribute 'append'/, 'items = items.append(...) apagou a items', '.append() changes the list and returns None. Do not store the result.', ['names = names.append("Ana")', 'names.append("Ana")']);
e('AttributeError', /'NoneType' object has no attribute '(group|groups|start|end|span)'/, 'The search (re) found nothing', 're.match/re.search return None when they find nothing. Check first: if m: ...', ['m = re.search(r"\\d+", text)\nprint(m.group())', 'm = re.search(r"\\d+", text)\nif m:\n    print(m.group())']);
e('AttributeError', /'NoneType' object has no attribute '(text|find|find_all|get_text|attrs|get)'/, 'find() did not find the element', 'In BeautifulSoup/Selenium, find() returns None when it finds nothing. Check the selector and test before using it.', null);
e('AttributeError', /'NoneType' object has no attribute '(shape|copy|astype)'/, 'The image was not loaded', 'cv2.imread() returns None when the path is wrong (or has accents). Check the file path.', null);
e('AttributeError', /'NoneType' object has no attribute '([^']+)'/, 'Used “.$1” on something that is None', 'The variable is empty (None). It is often the result of a function without return, or of a method that returns nothing (sort, append, pack, grid…).', ['button = tk.Button(text="OK").pack()\nbutton.config(text="Sair")', 'button = tk.Button(text="OK")\nbutton.pack()\nbutton.config(text="Sair")']);
e('AttributeError', /'str' object has no attribute '(append|remove|pop|insert|sort)'/, 'Text has no .$1', 'Text is immutable. If it should be a list, create it with [ ]: names = [] and not names = "".', ['names = ""\nnames.append("Ana")', 'names = []\nnames.append("Ana")']);
e('AttributeError', /'str' object has no attribute 'decode'/, '.decode() on text (a Python 2 thing)', 'In Python 3, text is already str. Only bytes have .decode().', null);
e('AttributeError', /'list' object has no attribute '(split|lower|upper|strip|replace|startswith|endswith|isdigit|find)'/, 'Lists have no .$1 (that is for text)', 'Apply it to each item of the list, or join the texts first.', ['names.lower()', 'names = [n.lower() for n in names]']);
e('AttributeError', /'list' object has no attribute '(shape|reshape|mean|sum|T)'/, 'Lists have no .$1 (that is numpy)', 'Convert to an array: np.array(list).$1.', null);
e('AttributeError', /'list' object has no attribute '(items|keys|values|get)'/, 'Lists have no .$1 (that is for dictionaries)', 'That variable is a list. If each item is a dictionary, loop over the list and use .$1 on each item.', null);
e('AttributeError', /'dict' object has no attribute '(iteritems|has_key|itervalues|iterkeys)'/, '.$1 is from Python 2', 'Use .items(), “key in dictionary”, .values() or .keys().', null);
e('AttributeError', /'dict' object has no attribute 'append'/, 'Dictionary has no .append', 'In a dictionary you create the key directly: data["name"] = "Ana". If you wanted a list, use [ ].', null);
e('AttributeError', /'dict' object has no attribute '([^']+)'/, 'Dictionaries use [ ], not a dot', 'To get a dictionary value: data["$1"] or data.get("$1").', ['dados.$1', 'data["$1"]']);
e('AttributeError', /'(int|float)' object has no attribute '([^']+)'/, 'Numbers have no .$2', 'That variable is a number. If you needed text, convert it with str(); if it should be a list/object, check where it got its value.', null);
e('AttributeError', /'tuple' object has no attribute '([^']+)'/, 'This became a tuple (extra comma?)', 'A comma at the end of the line creates a tuple: x = 5, is (5,). Check the line where the variable got its value.', ['name = "Ana",\nname.upper()', 'name = "Ana"\nname.upper()']);
e('AttributeError', /'(function|method|builtin_function_or_method)' object has no attribute '([^']+)'/, 'Missing ( ) — you are using the function, not the result', 'Call the function first and then use .$2 on what it returns.', ['text = input.strip()', 'text = input().strip()']);
e('AttributeError', /type object '([^']+)' has no attribute '([^']+)'/, 'The class $1 has no “$2”', 'You used the class directly (without creating the object), or the attribute is created in __init__ (it needs an object: x = $1()).', null);
e('AttributeError', /'_io\.TextIOWrapper' object has no attribute '([^']+)'/, 'Used .$1 on the file, not on the content', 'Read the content first: text = file.read().', ['lines = file.split("\\n")', 'lines = file.read().split("\\n")']);
e('AttributeError', /'DataFrame' object has no attribute 'append'/, 'DataFrame.append was removed in pandas 2', 'Use pd.concat([df, new], ignore_index=True).', ['df = df.append(line, ignore_index=True)', 'df = pd.concat([df, pd.DataFrame([line])], ignore_index=True)']);
e('AttributeError', /'(DataFrame|Series)' object has no attribute '([^']+)'/, 'The table has no “$2”', 'If “$2” is a column, use df["$2"] — and check the exact name with print(df.columns) (spaces and capitals count).', null);
e('AttributeError', /'WebDriver' object has no attribute 'find_elements?_by_\w+'/, 'find_element_by_… was removed in Selenium 4', 'Use find_element(By.XPATH, "...") with from selenium.webdriver.common.by import By.', ['driver.find_element_by_id("x")', 'driver.find_element(By.ID, "x")']);
e('AttributeError', /'(?:PySide6\.QtCore\.)?Signal' object has no attribute 'connect'/, 'Signal created in the wrong place', 'No PySide, o Signal precisa ser declarado na classe (fora do __init__), não em self.', null);
e('AttributeError', /'_tkinter\.tkapp' object has no attribute '([^']+)'/, 'The window has no “$1”', 'O elemento $1 não foi criado com self.$1 = ... (ou foi criado depois desta line). Confira o name no Designer.', null);
e('AttributeError', /can't set attribute|property '([^']+)' of '([^']+)' object has no setter/, 'That attribute is read-only', 'It is a property without a setter: you cannot assign to it directly.', null);
e('AttributeError', /'([^']+)' object has no attribute '([^']+)'\. Did you mean: '([^']+)'/, '$1 has no “$2” — did you mean “$3”?', 'Probably a typo in the attribute/method name.', null);
e('AttributeError', /'([^']+)' object has no attribute '([^']+)'/, '$1 has no “$2”', 'Erro de digitação no name? Ou o objeto é de outro tipo do que você imagina (print(type(x))). Em classes: o atributo precisa ser criado com self.$2 = ... no __init__.', null);
e('AttributeError', null, 'Attribute or method does not exist', 'The object does not have that. Check the spelling and the object\'s type.', null);

// =====================================================================================================
g('Positions and keys (IndexError / KeyError)');
e('IndexError', /list index out of range/, 'Position that does not exist in the list', 'The list has fewer items than you thought (sometimes none). Positions go from 0 to len(list) - 1. Check with if len(list) > i.', ['names = ["Ana", "Bea"]\nprint(names[2])', 'names = ["Ana", "Bea"]\nprint(names[1])  # last\nprint(names[-1])  # also the last']);
e('IndexError', /list assignment index out of range/, 'Putting an item in a position that does not exist', 'To add at the end of a list use .append(), not my_list[i] = value.', ['grades = []\ngrades[0] = 10', 'grades = []\ngrades.append(10)']);
e('IndexError', /string index out of range/, 'Position that does not exist in the text', 'The text is shorter than the requested position (or it is empty). Check with len(text).', null);
e('IndexError', /tuple index out of range|Replacement index (\d+) out of range/, 'Position that does not exist in the tuple', 'With .format(), each {} needs a value. In sys.argv, the argument was not passed.', null);
e('IndexError', /pop from empty (list|deque)|pop index out of range/, 'pop() numa items vazia', 'There are no items to remove. Check first: if my_list: my_list.pop().', null);
e('IndexError', /index (-?\d+) is out of bounds for axis (\d+) with size (\d+)/, 'Position $1 outside the array (size $3)', 'In numpy, positions on axis $2 go from 0 to $3 - 1.', null);
e('IndexError', /single positional indexer is out-of-bounds|positional indexers are out-of-bounds/, 'iloc outside the table', 'The table has fewer rows/columns than the requested position (or it is empty).', null);
e('IndexError', /cannot do a non-empty take from an empty axes/, 'Empty table or array', 'You asked for items of something that has nothing.', null);
e('IndexError', null, 'Position that does not exist', 'You asked for an item at a position that does not exist. Positions start at 0.', null);
e('KeyError', /^"\[.+\] not in index"$|not in index/, 'Column does not exist in the table', 'Check the names with print(df.columns): spaces, accents and capitals count.', null);
e('KeyError', /popitem\(\): dictionary is empty/, 'popitem() num dicionário vazio', 'Check that the dictionary has items first.', null);
e('KeyError', /^'?(\d+)'?$/, 'The key $1 does not exist', 'Watch out: 1 (number) and "1" (text) are different keys. In pandas, use df.iloc[$1] for position.', null);
e('KeyError', /^'(.*)'$/, 'The key “$1” does not exist', 'Use dictionary.get("$1") to get None instead of an error, or check that the key is written the same way (capitals and spaces count). In os.environ, the environment variable is not set.', ['print(student["Name"])', 'print(student.get("name", "sem name"))']);
e('KeyError', null, 'Key does not exist', 'That key does not exist in the dictionary (or set). Use .get() or check with “in”.', null);

// =====================================================================================================
g('Imports and packages');
e('ModuleNotFoundError', /No module named '(ui|estado)'/, 'Could not find the Designer “ui” folder', 'Run the screen file from the project folder (Run screen button) — the ui/ folder must be next to it.', null);
e('ModuleNotFoundError', /No module named '(tkinter|_tkinter)'/, 'This Python does not have Tkinter', 'Reinstall Python ticking “tcl/tk and IDLE”. In PyForge, the managed Python already comes with Tkinter.', null);
e('ModuleNotFoundError', /No module named '([^'.]+)\.[^']+'; '([^']+)' is not a package/, '“$2” is not a package — a file with the same name?', 'You have a $2.py file hiding the real $1 package. Rename your file.', null);
e('ModuleNotFoundError', /No module named '([^'.]+)/, 'The package “$1” is not installed in this project', 'Each project has its own environment (.venv). Install the package here with one click — PyForge finds the right name on PyPI (cv2 → opencv-python, PIL → pillow, sklearn → scikit-learn, bs4 → beautifulsoup4, yaml → pyyaml, dotenv → python-dotenv).', null);
e('ImportError', /attempted relative import with no known parent package/, 'Import with a dot in a standalone file', '“from .module import x” only works inside packages. When running the file directly, use “from module import x”.', ['from .utils import calcular', 'from utils import calcular']);
e('ImportError', /cannot import name '([^']+)' from partially initialized module '([^']+)'/, 'Circular import between files', '$2 and another file import each other. Move the shared code to a third file, or do the import inside the function that uses it.', null);
e('ImportError', /cannot import name '(\w+UI)' from 'ui\.(\w+)'/, 'The screen $2 was renamed or not saved', 'Open the screen in the Designer and save again to rebuild the file ui/$2.py.', null);
e('ImportError', /cannot import name '([^']+)' from '([^']+)'(?: \(([^)]+)\))?/, '“$1” does not exist in $2', 'A typo, or that name was changed/removed in the installed version. If $2 is your own file, check that the function exists there (and that the file is not named like a Python module).', null);
e('ImportError', /DLL load failed while importing (\w+)/, 'Failed to load the C part of $1', 'On Windows: install the latest “Microsoft Visual C++ Redistributable”, or reinstall the package ($1) in a version compatible with your Python.', null);
e('ImportError', /Missing optional dependency '([^']+)'/, 'The package $1 is missing', 'pandas needs $1 for this (e.g. openpyxl for Excel). Install it in the project.', null);
e('ImportError', null, 'Could not import', 'The name you tried to import does not exist in that module (or it was renamed in a new version). Check the spelling and the installed version.', null);

// =====================================================================================================
g('Files, folders and Windows');
e('FileNotFoundError', /\[WinError 2\]|\[Errno 2\] No such file or directory: '(?:python|pip|git|node|ffmpeg|tesseract|chromedriver)/, 'External program not found', 'The command Python tried to run is not installed (or not on the PATH).', null);
e('FileNotFoundError', /\[Errno 2\] No such file or directory: '(.+)'/, 'File or folder not found: $1', 'Relative paths start from the folder where the program runs. Use the path next to the code: Path(__file__).parent / "data.csv". In the .exe, use the caminho() function PyForge generates.', ['open("data.csv")', 'from pathlib import Path\nopen(Path(__file__).parent / "data.csv")']);
e('FileNotFoundError', /\[WinError 3\]/, 'Folder not found', 'One of the folders in the path does not exist. Create it first with Path("folder").mkdir(parents=True, exist_ok=True).', null);
e('FileNotFoundError', null, 'File or folder not found', 'Check the path and the folder where the program is running (print(Path.cwd())).', null);
e('PermissionError', /\[WinError 32\]|being used by another process/, 'File open in another program', 'Close the file in Excel/Word/another program (or the running .exe) and try again.', null);
e('PermissionError', /\[Errno 13\] Permission denied: '(.+)'/, 'No permission to use $1', 'Common causes: the file is open in Excel; you tried to open a FOLDER as a file; or it is a protected Windows folder (Program Files). Save to Documents.', null);
e('PermissionError', /\[WinError 5\]/, 'Access denied by Windows', 'Windows blocked it. It may be the antivirus, a file in use or a protected folder.', null);
e('PermissionError', null, 'No permission', 'The file may be open in another program, or the folder is protected by the system.', null);
e('FileExistsError', null, 'Already exists', 'The file/folder already exists. For folders: Path("x").mkdir(exist_ok=True).', ['os.mkdir("output")', 'os.makedirs("output", exist_ok=True)']);
e('IsADirectoryError', null, 'This is a folder, not a file', 'You passed a folder path where a file was needed. Complete it with the file name.', null);
e('NotADirectoryError', null, 'This is a file, not a folder', 'A piece of the path is a file where it should be a folder.', null);
e('OSError', /\[Errno 22\] Invalid argument: '.*[\x07\x08\x0b\x0c\t\n\r].*'|\[Errno 22\] Invalid argument: '[A-Za-z]:\\\\?[^']*\\x0/, 'A backslash broke the path', 'On Windows, "C:\\new\\test" becomes \\n (line break) and \\t (tab). Use r"C:\\new\\test" or forward slashes "C:/new/test".', ['open("C:\\novo\\test.txt")', 'open(r"C:\\novo\\test.txt")']);
e('OSError', /\[Errno 22\] Invalid argument|\[WinError 123\]/, 'Invalid file name', 'Windows file names cannot contain \\ / : * ? " < > | (careful with times like “14:30” in the name).', null);
e('OSError', /\[WinError 206\]|File name too long/, 'Path too long', 'Windows limits the path length. Use a shorter folder (e.g. C:\\Projects).', null);
e('OSError', /\[Errno 28\]|No space left/, 'Disk full', 'Free up disk space.', null);
e('OSError', /\[WinError 193\]/, '32-bit program/DLL with 64-bit Python', 'The library does not match Python\'s architecture. Install the 64-bit version.', null);
e('OSError', /\[WinError 126\]|\[WinError 127\]/, 'DLL not found', 'A system library is missing (Visual C++ Redistributable) or the package is incomplete. Reinstall it.', null);
e('OSError', /\[WinError 1455\]/, 'Not enough virtual memory', 'The Windows paging file is too small for this (common with AI/torch). Close programs or increase virtual memory.', null);
e('OSError', /\[WinError 10048\]|\[Errno 98\]|Address already in use/, 'Port already in use', 'Another program (or another copy of yours) is already using that port. Close it or use another port.', null);
e('OSError', /cannot write mode (RGBA|P|LA) as JPEG/, 'JPEG does not support transparency', 'Convert the image before saving: image.convert("RGB").save("photo.jpg").', ['img.save("foto.jpg")', 'img.convert("RGB").save("foto.jpg")']);
e('OSError', /image file is truncated/, 'Incomplete/corrupted image', 'The image file is cut off. Download it again or use ImageFile.LOAD_TRUNCATED_IMAGES = True.', null);
e('OSError', null, 'Operating system error', 'Windows refused the operation (file, folder, network…). The original message gives the error code.', null);
e('UnicodeDecodeError', /'charmap' codec can't decode/, 'File read with the Windows encoding', 'Windows opens files in cp1252 by default. Give the encoding: open(file, encoding="utf-8").', ['open("data.txt").read()', 'open("data.txt", encoding="utf-8").read()']);
e('UnicodeDecodeError', /'utf-8' codec can't decode/, 'The file is not in UTF-8', 'It was probably saved by Excel/old Notepad. Try encoding="latin-1" (or "cp1252").', ['pd.read_csv("planilha.csv")', 'pd.read_csv("planilha.csv", encoding="latin-1", sep=";")']);
e('UnicodeDecodeError|UnicodeError', null, 'Accent problem when reading', 'The file is in another encoding. Open it with encoding="utf-8" — or "latin-1" for old Windows files.', null);
e('UnicodeEncodeError', /'charmap' codec can't encode/, 'Windows cannot write that character', 'Emoji or symbol outside the Windows table. When saving a file use encoding="utf-8". In the console, run with the variable PYTHONIOENCODING=utf-8 (PyForge already does this when you Run).', ['open("log.txt", "w").write("✓ feito")', 'open("log.txt", "w", encoding="utf-8").write("✓ feito")']);
e('UnicodeEncodeError', null, 'Accent problem when writing', 'Use encoding="utf-8" when opening the file for writing.', null);
e('EOFError', /EOF when reading a line/, 'input() sem ninguém para digitar', 'The program asked for input() but the input ended: it was run without a console (e.g. an .exe “without a console window”) or the input was closed. In window programs, ask for the text in a field/dialog.', null);
e('EOFError', /Ran out of input/, 'Empty pickle file', 'The file pickle tried to read is empty. Check that it was saved correctly.', null);
e('EOFError', null, 'Unexpected end of data', 'The read ended earlier than expected.', null);

// =====================================================================================================
g('Math and numbers');
e('ZeroDivisionError', null, 'Division by zero', 'Some calculation divided by 0 (with /, // or %). Check the divisor first.', ['average = sum / quantidade', 'average = sum / quantidade if quantidade else 0']);
e('OverflowError', /int too large to convert to float|Result too large|result out of range|math range error/, 'Number too big for decimal', 'The result went over the float limit (~1e308). Use integers (Python accepts huge integers) or the decimal library.', null);
e('OverflowError', /cannot convert float infinity to integer/, 'Converting “infinity” to an integer', 'Some calculation gave infinity (e.g. divided by something very small). Check the values.', null);
e('OverflowError', null, 'Number too big', 'The result went over the type\'s limit.', null);
e('FloatingPointError', null, 'Decimal calculation error', 'A decimal number operation gave an invalid result.', null);
e('decimal.InvalidOperation', null, 'Decimal() did not understand the number', 'Decimal("3,5") does not work: use a dot, Decimal("3.5").', ['Decimal("3,50")', 'Decimal("3,50".replace(",", "."))']);
e('RecursionError', null, 'The function called itself too many times', 'Endless recursion: a base case to stop the calls is missing (e.g. if n == 0: return 1). If the problem is too big, use a loop. In classes: a property that reads itself also causes this.', ['def fatorial(n):\n    return n * fatorial(n - 1)', 'def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)']);
e('MemoryError', null, 'Out of memory', 'The program tried to store too much data (or an infinite loop keeps filling a list). Process it in parts.', null);

// =====================================================================================================
g('Running and program flow');
e('RuntimeError', /dictionary changed size during iteration/, 'Changed the dictionary while looping over it', 'You cannot add/remove keys inside a for over the same dictionary. Loop over a copy: for k in list(d):', ['for k in data:\n    if data[k] == 0:\n        del data[k]', 'for k in list(data):\n    if data[k] == 0:\n        del data[k]']);
e('RuntimeError', /Set changed size during iteration/, 'Changed the set while looping over it', 'Loop over a copy: for x in list(a_set):', null);
e('RuntimeError', /generator raised StopIteration/, 'next() sem itens dentro de um gerador', 'Inside a generator, use return instead of letting StopIteration escape.', null);
e('RuntimeError', /main thread is not in main loop|Calling Tcl from different apartment/, 'Tkinter touched by another thread', 'Only the main thread can touch the window. In the thread, store the result and use window.after(0, function) to update the screen.', null);
e('RuntimeError', /Too early to create (image|variable|font)/, 'Tkinter: created $1 before the window', 'Crie a window (tk.Tk()) antes de PhotoImage, StringVar ou fontes.', ['foto = tk.PhotoImage(file="a.png")\nwindow = tk.Tk()', 'window = tk.Tk()\nfoto = tk.PhotoImage(file="a.png")']);
e('RuntimeError', /Internal C\+\+ object \((\w+)\) already deleted/, 'The $1 was already deleted by Qt', 'A window/elemento foi fechado e destruído, mas o código continua usando. Guarde uma referência (self.x) ou confira se ainda existe.', null);
e('RuntimeError', /Please destroy the QApplication singleton/, 'Dois QApplication', 'Só pode existir um QApplication. Use QApplication.instance() or QApplication([]).', null);
e('RuntimeError', /This event loop is already running|asyncio\.run\(\) cannot be called from a running event loop/, 'asyncio.run inside another loop', 'There is already an async loop running (e.g. Jupyter). Use await directly instead of asyncio.run().', null);
e('RuntimeError', /Event loop is closed/, 'Async loop closed', 'Common on Windows with aiohttp. Close the sessions before finishing, or use asyncio.WindowsSelectorEventLoopPolicy().', null);
e('RuntimeError', /There is no current event loop/, 'No async loop in this thread', 'Use asyncio.run(main()) to start the loop.', null);
e('RuntimeError', /can't start new thread/, 'Too many threads', 'The program created too many threads. Use a ThreadPoolExecutor with a limited number.', null);
e('RuntimeError', /CUDA out of memory|out of memory/, 'The graphics card ran out of memory', 'Lower the batch size or the model size.', null);
e('RuntimeError', /cannot schedule new futures after (?:interpreter )?shutdown/, 'New task after closing', 'The program was closing when a new task was requested.', null);
e('RuntimeError', null, 'Error while running', 'Something went wrong while the program was running. The original message explains why.', null);
e('NotImplementedError', null, 'Part not implemented yet', 'That method exists only as a “template” and must be written (usually in a child class).', null);
e('StopIteration', null, 'next() sem mais itens', 'The iterator is finished. Use next(iterator, None) to get None instead of an error.', ['item = next(iterador)', 'item = next(iterador, None)']);
e('StopAsyncIteration', null, 'Async iterator finished', 'There are no more items in the async for.', null);
e('AssertionError', /^$/, 'An assert failed', 'A condition that should be true was false. In tests, the result was not what was expected. Tip: assert x == 5, f"x is {x}" shows the value.', null);
e('AssertionError', null, 'An assert failed: $0', 'A condition that should be true was false.', null);
e('KeyboardInterrupt', null, 'Program interrupted', 'You stopped the program (Ctrl+C or the Stop button).', null);
e('SystemExit', null, 'The program asked to exit', 'sys.exit() or exit() was called.', null);
e('GeneratorExit', null, 'Generator closed', 'The generator was closed before it finished.', null);
e('ReferenceError', null, 'Object no longer exists', 'A weak reference (weakref) points to something that was already deleted.', null);
e('SystemError', null, 'Internal Python error', 'Something went wrong inside Python itself (or a C library). Update the library involved.', null);
e('BufferError', null, 'Buffer error', 'A memory operation could not be done.', null);
e('ExceptionGroup|BaseExceptionGroup', null, 'Several errors at the same time', 'Parallel tasks (asyncio.TaskGroup) failed together. See each error listed with “|” in the output.', null);
e('PythonFinalizationError', null, 'O Python estava fechando', 'Something tried to run while Python was shutting down.', null);
e('ChildProcessError|ProcessLookupError', null, 'Process not found', 'The child process already ended or does not exist.', null);
e('BlockingIOError|InterruptedError', null, 'Operation interrupted', 'A read/write was interrupted or would have to wait.', null);

// =====================================================================================================
g('Internet and network');
e('ConnectionRefusedError', null, 'Connection refused', 'No server is listening at that address/port. Is the server on? Is the address right?', null);
e('ConnectionResetError', null, 'The connection was cut by the other side', 'The server closed the connection midway. Try again; if it repeats, the server may be blocking you.', null);
e('ConnectionAbortedError', null, 'Connection aborted', 'Your computer canceled the connection (antivirus/firewall or the program closed).', null);
e('BrokenPipeError', null, 'The other side stopped listening', 'You wrote to a connection/process that was already closed.', null);
e('TimeoutError', null, 'It took too long (timed out)', 'The server did not answer in time. Check the internet and increase the timeout.', null);
e('socket.gaierror', null, 'Address not found (no internet?)', 'Could not find the site\'s address. Check the internet and the spelling of the address.', null);
e('requests.exceptions.ConnectionError|ConnectionError', /NameResolutionError|getaddrinfo failed|Name or service not known/, 'Site not found (no internet?)', 'Could not find the address. Check the connection and the site\'s spelling.', null);
e('requests.exceptions.ConnectionError|ConnectionError', null, 'Could not connect', 'Could not talk to the server. Check the internet and the address, and use timeout=10 in requests.', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(401)\b/, 'Error 401: needs login/key', 'The site requires authentication. Check the API key (token) and the Authorization header.', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(403)\b/, 'Error 403: access forbidden', 'The site refused. Many sites block bots: send a browser User-Agent header, or use the official API.', ['requests.get(url)', 'requests.get(url, headers={"User-Agent": "Mozilla/5.0"})']);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(404)\b/, 'Error 404: page does not exist', 'Check the address (URL).', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(429)\b/, 'Error 429: too many requests', 'You made many requests in a row. Wait a bit between them (time.sleep).', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(5\d\d)\b/, 'Error $1 on the server', 'The problem is on the website\'s side. Try again later.', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', null, 'The site answered with an error', 'See the HTTP error number in the message (4xx = wrong request, 5xx = server problem).', null);
e('requests.exceptions.ReadTimeout|requests.exceptions.ConnectTimeout|requests.exceptions.Timeout|ReadTimeout|ConnectTimeout|Timeout', null, 'O site demorou demais', 'The server did not answer in time. Increase the timeout or try later.', null);
e('requests.exceptions.SSLError|SSLError|ssl.SSLCertVerificationError|SSLCertVerificationError', null, 'Problem with the security certificate (HTTPS)', 'The site\'s certificate could not be verified. It may be a school/company network intercepting it. Update the certifi package (pip install -U certifi).', null);
e('requests.exceptions.MissingSchema|MissingSchema', null, 'Address without “https://”', 'The address must start with http:// or https://.', ['requests.get("google.com")', 'requests.get("https://google.com")']);
e('requests.exceptions.InvalidURL|InvalidURL|requests.exceptions.InvalidSchema|InvalidSchema', null, 'Invalid address', 'Check whether the address has spaces, extra quotes or strange characters.', null);
e('requests.exceptions.TooManyRedirects|TooManyRedirects', null, 'Too many redirects', 'The site kept redirecting in a circle. It may require login/cookies.', null);
e('requests.exceptions.JSONDecodeError', null, 'The response is not JSON', 'The site returned something else (usually an HTML error page). Check response.status_code and response.text before .json().', null);
e('urllib.error.URLError|URLError', null, 'Could not open the address', 'No internet, wrong address or a certificate problem.', null);
e('smtplib.SMTPAuthenticationError|SMTPAuthenticationError', null, 'E-mail login refused', 'In Gmail, use an “app password” (with 2-step verification on), not your normal password.', null);

// =====================================================================================================
g('Data: JSON, CSV, databases');
e('json.decoder.JSONDecodeError|JSONDecodeError', /Expecting value: line 1 column 1 \(char 0\)/, 'The text is empty or is not JSON', 'The file/response is empty, or it is HTML (an error page). Check the content before converting.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Expecting property name enclosed in double quotes/, 'JSON with single quotes or an extra comma', 'JSON only accepts double quotes and no comma after the last item.', ["{'nome': 'Ana',}", '{"nome": "Ana"}']);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Extra data/, 'More than one JSON in the same text', 'The file has two objects in a row. Put them in a list [ ... ] or read line by line.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Expecting ',' delimiter|Expecting ':' delimiter/, 'Missing comma or colon in the JSON', 'Check the line and column given in the message.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Unterminated string|Invalid control character/, 'Broken text in the JSON', 'There is an unclosed quote or a line break inside a text.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', null, 'Invalid JSON', 'The text is not in JSON format. The message gives the line and column of the problem.', null);
e('csv.Error|_csv.Error', /field larger than field limit/, 'CSV field too big', 'Use csv.field_size_limit(10**7) before reading.', null);
e('csv.Error|_csv.Error', /line contains NUL/, 'The file is not a text CSV', 'It is probably a renamed .xlsx. Open it with pandas.read_excel.', null);
e('csv.Error|_csv.Error', /iterator should return strings, not bytes/, 'CSV opened in binary mode', 'Open with open(file, newline="", encoding="utf-8") — without "b".', null);
e('csv.Error|_csv.Error', null, 'CSV error', 'The CSV file has an unexpected format.', null);
e('pandas.errors.ParserError|ParserError', /Expected (\d+) fields? in line (\d+), saw (\d+)/, 'Wrong CSV separator (line $2)', 'Brazilian CSV files often use semicolons. Use sep=";" (and decimal="," if numbers use commas).', ['pd.read_csv("data.csv")', 'pd.read_csv("data.csv", sep=";", decimal=",", encoding="latin-1")']);
e('pandas.errors.ParserError|ParserError', null, 'pandas could not read the file', 'Check the separator (sep=";"), the encoding (encoding="latin-1") and whether it really is a CSV.', null);
e('pandas.errors.EmptyDataError|EmptyDataError', null, 'Empty file', 'The file has no columns. Check that it is the right file.', null);
e('sqlite3.OperationalError|OperationalError', /no such table: (\S+)/, 'The table $1 does not exist', 'Create the table first (CREATE TABLE IF NOT EXISTS ...). Also check that you are opening the right .db file (a relative path creates a new empty database!).', null);
e('sqlite3.OperationalError|OperationalError', /no such column: (\S+)/, 'The column $1 does not exist', 'Check the column name. If it is a text, it needs quotes — or better, use ? as a parameter.', ['cur.execute(f"SELECT * FROM students WHERE name = {name}")', 'cur.execute("SELECT * FROM students WHERE name = ?", (name,))']);
e('sqlite3.OperationalError|OperationalError', /table (\S+) already exists/, 'The table $1 already exists', 'Use CREATE TABLE IF NOT EXISTS.', null);
e('sqlite3.OperationalError|OperationalError', /database is locked/, 'Database locked', 'Another connection (or DB Browser) has the database open. Close it and use connection.commit() / with connection:.', null);
e('sqlite3.OperationalError|OperationalError', /unable to open database file/, 'Could not open the database file', 'The folder in the path does not exist, or there is no permission.', null);
e('sqlite3.OperationalError|OperationalError', /near "(.+)": syntax error/, 'SQL error near “$1”', 'Check the SQL query: commas, quotes and reserved words.', null);
e('sqlite3.OperationalError|OperationalError', /(\d+) values for (\d+) columns/, 'Wrong number of values', 'The INSERT has $1 values for $2 columns.', null);
e('sqlite3.IntegrityError|IntegrityError', /UNIQUE constraint failed: (\S+)/, 'Repeated value in $1', 'That column does not accept duplicates. Check first, or use INSERT OR IGNORE / INSERT OR REPLACE.', null);
e('sqlite3.IntegrityError|IntegrityError', /NOT NULL constraint failed: (\S+)/, '$1 cannot be empty', 'Pass a value for that column.', null);
e('sqlite3.IntegrityError|IntegrityError', /FOREIGN KEY constraint failed/, 'Reference to a record that does not exist', 'The foreign key points to something that does not exist in the other table.', null);
e('sqlite3.ProgrammingError|ProgrammingError', /Incorrect number of bindings supplied\. The current statement uses (\d+), and there are (\d+) supplied/, 'The SQL has $1 “?” but you passed $2 values', 'A single value must be a tuple with a comma: (name,).', ['cur.execute("... WHERE name = ?", (name))', 'cur.execute("... WHERE name = ?", (name,))']);
e('sqlite3.ProgrammingError|ProgrammingError', /Cannot operate on a closed (database|cursor)/, 'Used the database after closing it', 'Do everything before connection.close().', null);
e('sqlite3.ProgrammingError|sqlite3.InterfaceError|ProgrammingError|InterfaceError', /Error binding parameter|type '(\w+)' is not supported/, 'Value type SQLite does not accept', 'SQLite stores text, numbers and bytes. Convert lists/dictionaries with json.dumps().', null);
e('zipfile.BadZipFile|BadZipFile', null, 'Corrupted zip/xlsx file', 'The file is not a valid zip. If it is .xlsx: it may be open in Excel, empty, or another format renamed.', null);
e('openpyxl.utils.exceptions.InvalidFileException|InvalidFileException', null, 'openpyxl does not read that format', 'openpyxl only reads .xlsx. For old .xls, save as .xlsx in Excel.', null);
e('pickle.UnpicklingError|UnpicklingError', null, 'Invalid pickle file', 'The file was not saved with pickle or is corrupted.', null);
e('re.error|re.PatternError|PatternError', /nothing to repeat/, 'Regular expression: * or + with nothing before it', 'To search for a literal *, + or ? character, use \\* \\+ \\?.', null);
e('re.error|re.PatternError|PatternError', /unterminated character set|missing \)|unbalanced parenthesis|unterminated subpattern/, 'Regular expression with an unclosed [ or (', 'Close the brackets/parentheses, or escape them with \\.', null);
e('re.error|re.PatternError|PatternError', /bad escape/, 'Regular expression with an invalid \\', 'Use a raw string: r"\\d+".', null);
e('re.error|re.PatternError|PatternError', null, 'Invalid regular expression', 'Check the expression (tip: use r"..." to avoid trouble with \\).', null);
e('zoneinfo._common.ZoneInfoNotFoundError|ZoneInfoNotFoundError', null, 'Time zone not found', 'On Windows, install the tzdata package in the project.', null);
e('locale.Error|Error', /unsupported locale setting/, 'Language (locale) not supported', 'On Windows the name is different: locale.setlocale(locale.LC_ALL, "pt_BR") or "Portuguese_Brazil.1252".', null);
e('struct.error', null, 'Bytes format does not match', 'The size of the bytes does not match the struct format.', null);
e('binascii.Error', /Incorrect padding/, 'Incomplete Base64', 'The base64 text is cut off. Check that it arrived complete.', null);
e('subprocess.CalledProcessError|CalledProcessError', /returned non-zero exit status (\d+)/, 'The external command failed (code $1)', 'The program called with subprocess gave an error. Look at its output (capture_output=True, text=True).', null);
e('subprocess.TimeoutExpired|TimeoutExpired', null, 'O comando externo demorou demais', 'Increase the timeout or check whether the command is waiting for input.', null);

// =====================================================================================================
g('Windows: Tkinter');
e('_tkinter.TclError|TclError', /image "pyimage\d+" doesn't exist/, 'Image from another Tk window', 'Você criou mais de um tk.Tk(). Para janelas extras use tk.Toplevel() (o “Abrir outra tela” do PyForge já faz isso).', ['janela2 = tk.Tk()', 'janela2 = tk.Toplevel()']);
e('_tkinter.TclError|TclError', /couldn't recognize data in image file/, 'Tkinter does not open that kind of image', 'tk.PhotoImage só abre PNG e GIF. Para JPG, use Pillow: ImageTk.PhotoImage(Image.open("foto.jpg")).', null);
e('_tkinter.TclError|TclError', /couldn't open "(.+)": no such file or directory/, 'Image not found: $1', 'Check the path. Use caminho("assets/file.png") in the code generated by the Designer.', null);
e('_tkinter.TclError|TclError', /cannot use geometry manager (\w+) inside (\S+) which already has slaves managed by (\w+)/, 'Mixed $1 and $3 in the same window', 'Inside the same container use only one: pack OR grid OR place. Use a Frame to separate them.', null);
e('_tkinter.TclError|TclError', /invalid command name "?\.!/, 'Touched an element that was already closed', 'The window/element was destroyed, but an after() or event still tried to use it. Cancel with after_cancel when closing.', null);
e('_tkinter.TclError|TclError', /bad window path name/, 'Window or element does not exist', 'The element was already destroyed (or never created).', null);
e('_tkinter.TclError|TclError', /unknown color name "(.+)"/, 'Color “$1” does not exist', 'Use English names ("red", "blue") or the "#RRGGBB" code.', ['bg="vermelho"', 'bg="#E2657A"']);
e('_tkinter.TclError|TclError', /unknown option "-(\w+)"/, 'The element has no “$1” option', 'That kind of element does not accept that option (e.g. ttk does not accept bg/fg; use styles).', null);
e('_tkinter.TclError|TclError', /expected (integer|floating-point number|boolean value) but got "(.*)"/, 'Expected $1, got “$2”', 'A field tied to IntVar/DoubleVar has text. Handle it with try/except when reading .get().', null);
e('_tkinter.TclError|TclError', /no display name and no \$DISPLAY/, 'No display to open the window', 'The program is running somewhere without a monitor (a server).', null);
e('_tkinter.TclError|TclError', null, 'Tkinter error', 'Tkinter refused an operation. The original message says which one.', null);
e('turtle.Terminator|Terminator', null, 'The turtle window was closed', 'The drawing was still running when the window closed. Normal when closing — or use turtle.done() at the end.', null);

// =====================================================================================================
g('Games and images: pygame, Pillow, OpenCV');
e('pygame.error', /video system not initialized/, 'pygame used after pygame.quit()', 'The loop kept going after closing. After pygame.quit() leave the program (sys.exit()) or the loop with break.', ['for e in pygame.event.get():\n    if e.type == pygame.QUIT:\n        pygame.quit()', 'for e in pygame.event.get():\n    if e.type == pygame.QUIT:\n        rodando = False\n# depois do while:\npygame.quit()']);
e('pygame.error', /No video mode has been set|display Surface quit/, 'The pygame window was not created', 'Call pygame.display.set_mode((800, 600)) before drawing or .convert().', null);
e('pygame.error', /(?:Couldn't open|No file '?)(.+?)'? (?:found in working directory|$)|Couldn't open (.+)/, 'File not found by pygame', 'Check the path: use Path(__file__).parent / "images" / "ship.png".', null);
e('pygame.error', /Unsupported image format/, 'Unsupported image format', 'Use PNG or JPG. .webp/.svg files may not work.', null);
e('pygame.error', /font not initialized/, 'Missing pygame.init()', 'Call pygame.init() (or pygame.font.init()) before creating fonts.', null);
e('pygame.error', /mixer not initialized|No available audio device|Audio device/, 'Sound not available', 'Call pygame.mixer.init() — and check that the computer has sound output.', null);
e('pygame.error', null, 'pygame error', 'pygame refused an operation. The original message says which one.', null);
e('PIL.UnidentifiedImageError|UnidentifiedImageError', null, 'Pillow did not recognize the image', 'The file is not a valid image (or it is corrupted, or it is .svg/.heic).', null);
e('cv2.error', /!_src\.empty\(\)|ssize\.empty\(\)/, 'The image is empty', 'cv2.imread could not open the file (wrong path, or with accents). Check that the image is not None.', null);
e('cv2.error', null, 'OpenCV error', 'OpenCV refused the operation. Often the image was not loaded.', null);
e('pyautogui.FailSafeException|FailSafeException', null, 'pyautogui fail-safe', 'You moved the mouse to the corner of the screen: that stops the program on purpose. It is a safety feature!', null);

// =====================================================================================================
g('Windows: PySide6 / Qt');
e(null, /QWidget: Must construct a QApplication before a QWidget/, 'Faltou o QApplication', 'Crie o app = QApplication(sys.argv) ANTES de qualquer window ou widget.', ['window = QWidget()\napp = QApplication(sys.argv)', 'app = QApplication(sys.argv)\nwindow = QWidget()']);
e(null, /Could not load the Qt platform plugin "(\w+)"|This application failed to start because no Qt platform plugin/, 'Qt could not open the window', 'Reinstall PySide6 in the project. If it showed up in the .exe, build the .exe again with PyForge.', null);
e(null, /QPixmap::scaled: Pixmap is a null pixmap/, 'Image not found (empty pixmap)', 'O QPixmap não achou o file. Confira o caminho da imagem (use caminho("assets/x.png")).', null);
e(null, /QLayout: Attempting to add QLayout .* which already has a layout/, 'Two layouts on the same widget', 'Each widget can have only one main layout. Put the second one inside the first (addLayout).', null);
e(null, /QObject: Cannot create children for a parent that is in a different thread|QObject::setParent: Cannot set parent, new parent is in a different thread|QBasicTimer can only be used with threads started with QThread/, 'Touched the window outside the main thread', 'Only the main thread can touch widgets. Send the result with a Signal (or use the TrabalhoLento from the PyForge template).', null);

// =====================================================================================================
g('Syntax (Python did not understand the code)');
const S = 'SyntaxError|IndentationError|TabError';
e(S, /expected ':'/, 'Missing colon (:)', 'Every line that opens a block ends with a colon: if, elif, else, for, while, def, class, try, except, with.', ['if age >= 18\n    print("adulto")', 'if age >= 18:\n    print("adulto")']);
e(S, /invalid syntax\. Perhaps you forgot a comma\?/, 'A comma is missing', 'Items of a list, tuple, dictionary or arguments need commas between them.', ['names = ["Ana" "Bea" "Caio"]', 'names = ["Ana", "Bea", "Caio"]']);
e(S, /invalid syntax\. Maybe you meant '==' or ':=' instead of '='\?|cannot assign to .* here\. Maybe you meant '==' instead of '='\?|expression cannot contain assignment, perhaps you meant "=="/, 'Use == to compare', 'One = stores a value; two == compare.', ['if senha = "1234":', 'if senha == "1234":']);
e(S, /Missing parentheses in call to '(print|exec)'(?:\. Did you mean (.+)\?)?/, '$1 without parentheses (that is Python 2)', 'In Python 3, $1 is a function: use $1(...).', ['print "Olá"', 'print("Hello")']);
e(S, /unexpected indent/, 'Unexpected indentation (spaces)', 'This line has spaces at the start without being inside a block. Align it with the line above.', ['x = 1\n    y = 2', 'x = 1\ny = 2']);
e(S, /unindent does not match any outer indentation level/, 'The indentation does not match any block', 'The spaces at the start of this line do not line up with any block above. Always use 4 spaces (Format document fixes it: Shift+Alt+F).', null);
e(S, /expected an indented block(?: after '(\w+)' statement on line (\d+))?/, 'Missing indentation after “$1”', 'After a line ending with : the next one needs 4 spaces. If the block is still empty, write pass.', ['def jogar():\nprint("oi")', 'def jogar():\n    print("oi")']);
e(S, /inconsistent use of tabs and spaces/, 'Mixed tabs and spaces', 'Use only spaces. PyForge converts them when formatting (Shift+Alt+F).', null);
e(S, /unterminated triple-quoted string literal/, 'Text with """ not closed', 'Close the text with the same triple quotes.', null);
e(S, /unterminated string literal|EOL while scanning string literal/, 'Text (string) without a closing quote', 'Every opened quote must be closed on the same line. If the text has quotes inside, use the other kind outside: "He said \'hi\'".', ['print("Hello)', 'print("Hello")']);
e(S, /'(\(|\[|\{)' was never closed/, 'O “$1” foi aberto e nunca fechado', 'Count the parentheses/brackets/braces: each one that opens must close. The error sometimes shows on the line BELOW.', ['print(len(names)', 'print(len(names))']);
e(S, /unmatched '(\)|\]|\})'/, '“$1” fechando sem ter aberto', 'There is an extra closing symbol on this line.', null);
e(S, /closing parenthesis '(.)' does not match opening parenthesis '(.)'/, '“$2” closed with “$1”', 'Every opening closes with its pair: ( with ), [ with ], { with }.', null);
e(S, /cannot assign to (function call|literal|expression|f-string expression|comparison|conditional expression|attribute here)/, 'You cannot store a value there', 'The LEFT side of = must be a variable name. Backwards? value = variable → variable = value.', ['10 = points', 'points = 10']);
e(S, /'return' outside function/, 'return fora de uma função', 'return só pode ser usado dentro de um def. Confira o recuo da linha.', null);
e(S, /'(break|continue)' (?:outside loop|not properly in loop)/, '$1 outside a loop', '$1 can only be used inside a for or while. Check the indentation.', null);
e(S, /'(await|async with|async for)' outside (?:async )?function/, '$1 outside an async function', 'Use await only inside async def.', null);
e(S, /'yield' outside function/, 'yield outside a function', 'yield can only be used inside a def (generators).', null);
e(S, /invalid non-printable character U\+00A0/, 'Invisible space copied from the internet', 'This code has a “non-breaking space” (copied from a website/PDF). Delete and type the spaces again.', null);
e(S, /invalid character '(.)' \(U\+[0-9A-F]+\)/, 'Strange character: “$1”', 'Probably curly quotes “ ” or a dash — copied from Word/a website. Replace with normal quotes " and a hyphen -.', ['print(“Hello”)', 'print("Hello")']);
e(S, /invalid non-printable character/, 'Invisible character in the code', 'Delete the copied piece and type it again.', null);
e(S, /invalid decimal literal/, 'Name starting with a number (or a number stuck to letters)', 'Variable names cannot start with a number: 1place → place1. Or an operator is missing: 2x → 2 * x.', ['2nome = "Ana"', 'nome2 = "Ana"']);
e(S, /leading zeros in decimal integer literals are not permitted/, 'Number with a leading zero', 'Write 7, not 07. For dates/phone numbers, use text: "07".', null);
e(S, /invalid (hexadecimal|octal|binary) literal/, 'Invalid number $1', 'Check the digits after 0x/0o/0b.', null);
e(S, /f-string: expecting '\}'|f-string: single '\}' is not allowed|f-string: unmatched|f-string: empty expression/, 'Wrong { } braces in the f-string', 'Inside the f-string, { opens a value and } closes it. To write a real brace, double it: {{ }}.', ['f"Total: {preco"', 'f"Total: {preco}"']);
e(S, /f-string/, 'Problem inside an f-string', 'Check the { } braces and the quotes: inside f"..." use single quotes (or upgrade to Python 3.12+).', null);
e(S, /positional argument follows keyword argument/, 'Unnamed argument after a named one', 'Named arguments (x=1) come last.', ['abrir(file="a.txt", "r")', 'abrir("r", file="a.txt")']);
e(S, /(?:non-default argument follows default argument|parameter without a default follows parameter with a default)/, 'Parameter without a default after one with a default', 'In a def, parameters with a default value (x=0) must come last.', ['def criar(name="?", age):', 'def criar(age, name="?"):']);
e(S, /duplicate argument '(.+)' in function definition/, 'Repeated parameter “$1”', 'Each parameter needs a different name.', null);
e(S, /keyword argument repeated/, 'Repeated argument in the call', 'The same name= appears twice.', null);
e(S, /expected 'except' or 'finally' block/, 'try without except', 'Every try: needs an except (or finally) right after, with the same indentation.', ['try:\n    n = int(x)\nprint(n)', 'try:\n    n = int(x)\nexcept ValueError:\n    n = 0']);
e(S, /default 'except:' must be last/, 'generic except: before the specific ones', 'Put the “except:” (or except Exception) last.', null);
e(S, /multiple exception types must be parenthesized/, 'Several errors in an except without parentheses', 'Write except (ValueError, KeyError):', ['except ValueError, KeyError:', 'except (ValueError, KeyError):']);
e(S, /expected 'in'/, 'Missing “in” in the for', 'The format is: for item in my_list:', ['for i range(10):', 'for i in range(10):']);
e(S, /expected '\('/, 'Missing parenthesis', 'def e class precisam de ( ) depois do name: def name():', ['def jogar:', 'def jogar():']);
e(S, /expected 'else' after 'if' expression/, 'if de uma linha sem else', '“x if condition else y” needs the else.', null);
e(S, /trailing comma not allowed without surrounding parentheses/, 'Extra comma in the import', 'Remove the trailing comma or use parentheses: from x import (a, b,)', null);
e(S, /Generator expression must be parenthesized|did you forget parentheses around the comprehension target/, 'Missing parentheses in the expression', 'Put the “x for x in …” part in parentheses, or the items in parentheses.', null);
e(S, /name '(.+)' is (?:used prior to|assigned to before) global declaration/, '“global $1” must come first', 'Write global $1 on the first line of the function, before using it.', null);
e(S, /no binding for nonlocal '(.+)' found/, 'nonlocal without an outer variable', 'nonlocal only works with variables of an outer function (not of the file — for those, use global).', null);
e(S, /cannot use starred expression here|can't use starred expression here/, '* used where it is not allowed', '*list only works inside calls, lists or unpacking.', null);
e(S, /'tuple' is an illegal expression for augmented assignment|illegal expression for augmented assignment/, '+= with several variables', 'Do one at a time: a += 1 and b += 1.', null);
e(S, /cannot delete (function call|literal|expression)/, 'del on something that is not a variable', 'del deletes variables, items (my_list[0]) or attributes.', null);
e(S, /cannot mix bytes and nonbytes literals/, 'Mixed b"..." with normal text', 'Use only bytes or only text.', null);
e(S, /expected expression/, 'A value is missing', 'Python expected a value/expression here (e.g. x = with nothing after it).', null);
e(S, /Did you mean '(.+)'\?/, 'Did you mean “$1”?', 'Python suggested a fix for this line.', null);
e(S, /unexpected EOF while parsing|EOF in multi-line statement/, 'The file ended in the middle of a statement', 'A parenthesis, bracket, brace or quote was not closed — look at the previous lines.', null);
e(S, /Non-UTF-8 code starting with/, 'The file is not saved in UTF-8', 'Save the file with UTF-8 encoding (the PyForge editor always saves in UTF-8).', null);
e(S, /assignment expression cannot be used/, 'Invalid use of :=', 'The “walrus operator” := cannot be used there.', null);
e(S, /too many statically nested blocks/, 'Too many nested blocks', 'More than 20 levels of indentation. Split it into functions.', null);
e(S, /(?:\(|\b)print (?:"|')/, 'print sem parênteses', 'Use print("...") with parentheses.', null);
e(S, /invalid syntax/, 'Invalid syntax: Python did not understand this line', 'Check: colon at the end of if/for/def, closed quotes and parentheses, = vs ==, and Python words spelled right (elif, not else if).', null);
e(S, null, 'Typo in the code', 'Python did not understand the line. See the Problems tab: it shows the exact explanation.', null);
e('IndentationError|TabError', null, 'Indentation problem (spaces at the start of the line)', 'Always use 4 spaces per level. Format document (Shift+Alt+F) fixes most cases.', null);

// =====================================================================================================
g('Warnings (the program runs, but something is odd)');
e(null, /SyntaxWarning: invalid escape sequence '(\\.)'/, 'Backslash “$1” in the text', 'In regular expressions and Windows paths, use a raw string: r"...". This becomes an error in future Python versions.', ['re.search("\\d+", text)', 're.search(r"\\d+", text)']);
e(null, /SyntaxWarning: "is" with (?:a|'\w+') literal/, '“is” comparing with a fixed value', 'Use == to compare values. “is” checks whether it is the SAME object.', ['if nome is "Ana":', 'if name == "Ana":']);
e(null, /SyntaxWarning: '(\w+)' object is not callable; perhaps you missed a comma\?/, 'Missing comma in a list?', 'Two values in a row without a comma become a “call”.', null);
e(null, /SyntaxWarning: assertion is always true/, 'assert always true', 'assert (x, "msg") with parentheses is a tuple, always true. Write: assert x, "msg".', null);
e(null, /RuntimeWarning: coroutine '([^']+)' was never awaited/, 'Forgot the await in $1()', 'async def functions only run with await (or asyncio.run).', ['buscar_dados()', 'await buscar_dados()']);
e(null, /RuntimeWarning: (?:invalid value|divide by zero) encountered/, 'Invalid numpy calculation (nan/inf result)', 'There was a division by zero or an impossible calculation. The result became nan/inf.', null);
e(null, /ResourceWarning: unclosed (file|socket)/, '$1 aberto e nunca fechado', 'Use “with open(...) as f:” to close it by itself.', null);
e(null, /SettingWithCopyWarning/, 'pandas: changing a copy', 'Use .loc to change the original table: df.loc[df.a > 1, "b"] = 0.', null);
e(null, /FigureCanvasAgg is non-interactive/, 'The chart cannot open a window', 'matplotlib has no window. Save with plt.savefig("chart.png") or install Tkinter.', null);
e(null, /DeprecationWarning: (.{0,80})/, 'Feature that will be removed', 'Works today, but will go away in a future version: $1', null);
e(null, /FutureWarning: (.{0,80})/, 'The behavior will change in the future', 'A library warned that this will work differently in a new version: $1', null);

// =====================================================================================================
g('Tools: pip, uv, PyInstaller, Windows');
e(null, /'python' (?:não é reconhecido|is not recognized)|Python was not found; run without arguments to install from the Microsoft Store/, 'Windows did not find Python', 'Outside PyForge, the python command is not on the PATH. Use the PyForge Terminal (the project environment is already active).', null);
e(null, /No module named pip/, 'The environment has no pip', 'In PyForge, install packages from the Packages panel (it uses uv).', null);
e(null, /(?:Failed building wheel for pygame\b|No matching distribution found for pygame\b|pygame[\s\S]{0,600}(?:Failed to build|metadata-generation-failed|subprocess-exited-with-error))/i, 'pygame does not work on this Python version yet', 'The original pygame takes a while to support new Python versions. Use pygame-ce: it is the same pygame, maintained by the community, and the code still says “import pygame”. Or switch the project to an earlier Python.', ['uv add pygame', 'uv add pygame-ce'], 'pygameCe');
e(null, /Could not find a version that satisfies the requirement ([\w.-]+)|No matching distribution found for ([\w.-]+)/, 'Package not found: $1', 'The name is wrong, or the package has no version for your Python yet (very common right after a new Python release). Check the name on pypi.org or use an earlier Python version in the project.', null, 'versaoPython');
e(null, /Microsoft Visual C\+\+ 14\.0 or greater is required/, 'O pacote precisa ser compilado', 'There is no prebuilt version (wheel) of this package for your Python. Use an earlier Python version in the project (e.g. 3.12), or install the “Build Tools for Visual Studio”.', null, 'versaoPython');
e(null, /Failed building wheel for ([\w.-]+)|Failed to build ([\w.-]+)|subprocess-exited-with-error/, 'Failed to compile $1', 'The package has no prebuilt version for this Python. Try another version of the package or of Python.', null, 'versaoPython');
e(null, /No solution found when resolving dependencies|requirements are unsatisfiable/, 'Packages with incompatible versions', 'Two packages require versions that conflict (or require another Python). Read uv\'s explanation: it says which package asks for what. Remove the pinned version (==) from one of them.', null);
e(null, /is not a supported wheel on this platform/, 'Package for another system', 'The downloaded file is for another system/Python (32 × 64 bits, Linux × Windows).', null);
e(null, /Failed to (?:download|fetch)|error sending request|Connection (?:timed out|refused)|dns error/, 'No internet to download the package', 'Check the connection (or the school/company proxy/firewall) and try again.', null);
e(null, /Failed to execute script '?(\w+)'? due to unhandled exception/, 'The .exe gave an error when opening', 'The compiled program gave an error. Run the .py in PyForge to see the full error. If it says “No module named”, add the package to the project and build the .exe again.', null);
e(null, /Unable to find "(.+)" when adding binary and data files/, 'File to include in the .exe not found', 'The folder/file $1 does not exist. Check the folders ticked in the .exe dialog.', null);
e(null, /(?:PermissionError|WinError 5|Access is denied|Acesso negado).*(?:dist|\.exe)/, 'The old .exe is open', 'Close the running .exe (or the dist folder in Explorer) and build again.', null);
e(null, /EndUpdateResourceW|win32ctypes\.pywin32\.pywintypes\.error/, 'The antivirus locked the .exe', 'The antivirus blocked creating the .exe. Try again, or add the project folder to the exceptions.', null);
e(null, /(?:is not a valid ICO|Icon input file .* not found|Something went wrong converting icon)/, 'Invalid icon for the .exe', 'Use an .ico image (or .png with Pillow installed).', null);
e(null, /reading from stdin while output is captured/, 'The test imported a file that asks for input()', 'When your file was imported, the main code ran and called input(). Put the main code inside if __name__ == "__main__": so it only runs when you run the file.', ['name = input("Name: ")\nprint(f"Hi, {name}")', 'def main():\n    name = input("Name: ")\n    print(f"Hi, {name}")\n\n\nif __name__ == "__main__":\n    main()']);
e(null, /error during collection|ERROR collecting/, 'A test file did not even run', 'pytest failed to load a test file (usually an import that failed). Until that is fixed, no test runs. See the error just above in the Output.', null);
e(null, /fixture '(\w+)' not found/, 'pytest: fixture “$1” does not exist', 'The test asks for a parameter pytest does not know. Create the fixture with @pytest.fixture or remove the parameter.', null);
e(null, /collected 0 items/, 'pytest found no tests', 'Files must be named test_*.py and functions must start with test_.', null);
e(null, /exit code 3221225477|exit status 3221225477|0xC0000005/, 'The program crashed inside a library (invalid memory access)', 'A C library crashed. Update the packages; in Qt, do not use widgets after closing them or outside the main thread.', null);
e(null, /exit code 3221225781|0xC0000135/, 'A Windows DLL is missing', 'Install the latest “Microsoft Visual C++ Redistributable”.', null);
e(null, /Fatal Python error: init_fs_encoding|ModuleNotFoundError: No module named 'encodings'/, 'Python is misconfigured', 'The Windows PYTHONHOME/PYTHONPATH variables are getting in the way. Remove them in Environment Variables.', null);

// =====================================================================================================
// Família de cada erro: se não houver explicação específica, usa a do “pai”.
g('Other languages: JavaScript (Node) and Lua');
e(null, /ReferenceError: (print|input|len|def|True|False|None) is not defined/, 'JavaScript: “$r1” is from Python', 'That name exists in Python but not in JavaScript. To show text use console.log(); true/false are lowercase; empty is null.', ['print("oi")', 'console.log("oi");']);
e(null, /ReferenceError: (\S+) is not defined/, 'JavaScript: “$r1” does not exist', 'You used a name that was not created. Check that you wrote it the same (capitals count) and declared it with let/const first.', ['console.log(name)', 'const name = "Ana";\nconsole.log(name);']);
e(null, /TypeError: (\S+) is not a function/, 'JavaScript: “$r1” is not a function', 'You tried to call with () something that is not a function. Check the method name (e.g. toUpperCase, not toUppercase).', ['"oi".toUppercase()', '"oi".toUpperCase()']);
e(null, /TypeError: Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/, 'JavaScript: read “$r2” from something empty ($r1)', 'The variable before the dot is empty (undefined/null). Check that the object was created or that the index exists.', ['const items = [];\nconsole.log(items[0].name);', 'const items = [{ name: "Ana" }];\nconsole.log(items[0].name);']);
e(null, /TypeError: Assignment to constant variable/, 'JavaScript: tried to change a const', 'Variables created with const cannot get another value. Use let if it will change.', ['const n = 1;\nn = 2;', 'let n = 1;\nn = 2;']);
e(null, /SyntaxError: Cannot use import statement outside a module/, 'JavaScript: import outside a module', 'To use import, save the file as .mjs (or use require instead).', ['import fs from "fs"; // em arquivo .js', '// rename to main.mjs import fs from "fs";']);
e(null, /SyntaxError: (Unexpected token.*|Unexpected end of input|missing \) after argument list|Invalid or unexpected token)/, 'JavaScript: syntax error', 'Node did not understand the code ($r1). Look for a missing parenthesis, brace or quote near the line shown.', null);
e(null, /Error: Cannot find module '([^']+)'/, 'JavaScript: module “$r1” not found', 'The file or package does not exist. For npm packages, run in the terminal: npm install $r1', null);
e(null, /RangeError: Maximum call stack size exceeded/, 'JavaScript: a function calling itself nonstop', 'A recursive function never reaches its stop case. Add an if that ends the repetition.', null);
e(null, /lua[\d.]*(?:\.exe)?: .*attempt to call a nil value \((?:global|field|method|local) '([^']+)'\)/, 'Lua: “$r1” does not exist (it is nil)', 'You called a function that was not created. Check the name and that the function was defined BEFORE it is used.', ['falar("oi")\nfunction falar(t) print(t) end', 'function falar(t) print(t) end\nfalar("oi")']);
e(null, /attempt to index a nil value \((?:global|field|local|upvalue) '([^']+)'\)/, 'Lua: “$r1” is empty (nil)', 'You used a dot or [ ] on something that is nil. Check that the table was created: $r1 = {}', ['player.health = 10', 'local player = {}\nplayer.health = 10']);
e(null, /attempt to perform arithmetic on a (nil|string|table|boolean) value(?: \((?:global|field|local) '([^']+)'\))?/, 'Lua: math with a $r1 value', 'A calculation (+ - * /) got something that is not a number. Use tonumber() to convert text, and check that the variable has a value.', ['local n = io.read()\nprint(n + 1)', 'local n = tonumber(io.read())\nprint(n + 1)']);
e(null, /attempt to (?:add|sub|mul|div|mod|pow|unm|idiv) a '(\w+)' with a '(\w+)'/, 'Lua: math between $r1 and $r2', 'A calculation got something that is not a number. Use tonumber() to convert text to a number.', null);
e(null, /attempt to concatenate a (nil|table|boolean) value(?: \((?:global|field|local) '([^']+)'\))?/, 'Lua: joined text with $r1', '.. only joins texts and numbers. Use tostring(x) or check that the variable has a value.', ['print("Vida: " .. health)', 'local health = 10\nprint("Vida: " .. tostring(health))']);
e(null, /attempt to compare (\w+) with (\w+)/, 'Lua: compared $r1 with $r2', 'You can only compare < > things of the same type. Convert with tonumber() first.', null);
e(null, /lua[\d.]*(?:\.exe)?: .*:\d+: (?:'[^']+' expected|unexpected symbol|'=' expected|unfinished string)/, 'Lua: syntax error', 'Lua did not understand the code. Check that every if/for/function has its end and that quotes are closed.', ['if x > 1 then\n  print(x)', 'if x > 1 then\n  print(x)\nend']);

export const PAI = {
  ModuleNotFoundError: 'ImportError', UnboundLocalError: 'NameError', IndentationError: 'SyntaxError', TabError: 'IndentationError',
  FileNotFoundError: 'OSError', PermissionError: 'OSError', FileExistsError: 'OSError', IsADirectoryError: 'OSError', NotADirectoryError: 'OSError',
  ConnectionError: 'OSError', ConnectionRefusedError: 'ConnectionError', ConnectionResetError: 'ConnectionError', ConnectionAbortedError: 'ConnectionError', BrokenPipeError: 'ConnectionError',
  TimeoutError: 'OSError', BlockingIOError: 'OSError', ChildProcessError: 'OSError', InterruptedError: 'OSError', ProcessLookupError: 'OSError', gaierror: 'OSError',
  UnicodeDecodeError: 'UnicodeError', UnicodeEncodeError: 'UnicodeError', UnicodeTranslateError: 'UnicodeError', UnicodeError: 'ValueError', JSONDecodeError: 'ValueError',
  RecursionError: 'RuntimeError', NotImplementedError: 'RuntimeError', PythonFinalizationError: 'RuntimeError',
  ZeroDivisionError: 'ArithmeticError', OverflowError: 'ArithmeticError', FloatingPointError: 'ArithmeticError',
  IndexError: 'LookupError', KeyError: 'LookupError', SSLError: 'OSError', SSLCertVerificationError: 'SSLError',
};

// Nomes de tipo do Python em português (para os títulos).
export const TIPOS_PT = {
  str: 'text (str)', int: 'whole number (int)', float: 'decimal number (float)', bool: 'True/False (bool)', list: 'lista', dict: 'dictionary', tuple: 'tupla', set: 'conjunto (set)',
  NoneType: 'None (empty)', function: 'function', method: 'method', builtin_function_or_method: 'function', module: 'module', type: 'classe', bytes: 'bytes', range: 'range',
  generator: 'gerador', dict_keys: 'dict.keys()', dict_values: 'dict.values()', dict_items: 'dict.items()', map: 'map()', filter: 'filter()', zip: 'zip()', complex: 'complex number',
};
