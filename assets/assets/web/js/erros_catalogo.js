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
g('Nomes e variáveis');
e('NameError', /name '(true|false)' is not defined/, '“$1” com letra minúscula', 'Em Python, verdadeiro e falso são True e False, com a primeira letra maiúscula.', ['ativo = true', 'ativo = True']);
e('NameError', /name '(null|none|nil|undefined)' is not defined/, '“$1” não existe em Python', 'O “vazio” do Python se chama None (com N maiúsculo).', ['valor = null', 'valor = None']);
e('NameError', /name 'self' is not defined/, '“self” fora de um método', 'self só existe dentro de um método (def dentro de uma class), e precisa ser o primeiro parâmetro dele.', ['class Jogo:\n    def iniciar():\n        self.pontos = 0', 'class Jogo:\n    def iniciar(self):\n        self.pontos = 0']);
e('NameError', /name '(Print|Input|Len|Range|Int|Str|Float|List|Dict|Def|If|For|While|Import|Return|Class)' is not defined/, '“$1” com letra maiúscula', 'O Python diferencia maiúsculas de minúsculas: as palavras do Python são todas minúsculas (print, input, len, range…).', ['Print("Oi")', 'print("Oi")']);
e('NameError', /name '(math|random|os|sys|time|json|datetime|re|csv|sqlite3|pathlib|Path|tk|tkinter|ttk|messagebox|np|numpy|pd|pandas|plt|requests|pygame|turtle|QApplication|QWidget|QLabel|QPushButton)' is not defined/, 'Faltou importar “$1”', 'Para usar um módulo ou classe, primeiro importe no topo do arquivo.', ['print(math.sqrt(16))', 'import math\n\nprint(math.sqrt(16))']);
e('NameError', /name '([^']+)' is not defined\. Did you mean: '([^']+)'/, '“$1” não existe — você quis dizer “$2”?', 'Provavelmente é um erro de digitação. O Python achou um nome parecido que existe.', ['nome = "Ana"\nprint(nmoe)', 'nome = "Ana"\nprint(nome)']);
e('NameError', /name '([^']+)' is not defined/, 'O nome “$1” não existe aqui', 'O Python não achou essa variável ou função neste ponto. Pode ser erro de digitação (maiúsculas contam!), a variável ainda não foi criada (o código roda de cima para baixo) ou faltou um import. Texto precisa de aspas: print(oi) procura uma variável chamada oi.', ['print(ola)', 'print("ola")']);
e('NameError', /cannot access free variable '([^']+)'|free variable '([^']+)' referenced before assignment/, '“$1” foi usada antes de existir', 'Uma função de dentro usa uma variável da função de fora que ainda não recebeu valor.', null);
e('NameError', null, 'Nome desconhecido', 'O Python não achou esse nome. Confira a grafia e se ele foi criado antes desta linha.', null);
e('UnboundLocalError', /'([^']+)'/, '“$1” foi usada antes de receber valor', 'Como você muda essa variável dentro da função, o Python acha que ela é local e ignora a de fora. Passe o valor como parâmetro e devolva com return (ou, se precisar mesmo, use “global $1” no começo da função).', ['pontos = 0\ndef ganhar():\n    pontos += 1', 'pontos = 0\ndef ganhar(pontos):\n    return pontos + 1\n\npontos = ganhar(pontos)']);
e('UnboundLocalError', null, 'Variável usada antes de receber valor', 'Dentro da função, a variável é usada antes da linha que dá valor a ela.', null);

// =====================================================================================================
g('Tipos de dados (TypeError)');
e('TypeError', /can only concatenate str \(not "([^"]+)"\) to str/, 'Juntando texto com $1', 'O + só junta texto com texto. Use uma f-string, que aceita qualquer valor, ou converta com str().', ['idade = 15\nprint("Idade: " + idade)', 'idade = 15\nprint(f"Idade: {idade}")']);
e('TypeError', /can only concatenate list \(not "([^"]+)"\) to list/, 'Juntando lista com $1', 'Lista + só junta com outra lista. Para pôr um item no fim, use .append().', ['nomes = nomes + "Ana"', 'nomes.append("Ana")']);
e('TypeError', /can only concatenate tuple/, 'Juntando tupla com outra coisa', 'Tupla + só junta com outra tupla. Um item sozinho vira tupla com vírgula: (x,).', null);
e('TypeError', /unsupported operand type\(s\) for [^:]+: '(int|float)' and 'str'|unsupported operand type\(s\) for [^:]+: 'str' and '(int|float)'/, 'Conta misturando número com texto', 'Um dos valores é texto (str). Lembre: input() sempre devolve texto — converta com int() ou float() antes da conta.', ['idade = input("Idade? ")\nprint(idade + 1)', 'idade = int(input("Idade? "))\nprint(idade + 1)']);
e('TypeError', /unsupported operand type\(s\) for [^:]+: 'NoneType' and|and 'NoneType'/, 'Conta com um valor None (vazio)', 'Um dos valores da conta é None. Quase sempre é uma função sem return: ela devolve None.', ['def dobro(x):\n    print(x * 2)\n\ntotal = dobro(5) + 1', 'def dobro(x):\n    return x * 2\n\ntotal = dobro(5) + 1']);
e('TypeError', /unsupported operand type\(s\) for ([^:]+): '([^']+)' and '([^']+)'/, 'A conta “$1” não funciona entre $2 e $3', 'Esses dois tipos de valor não combinam nessa operação. Confira o tipo de cada um com print(type(x)).', null);
e('TypeError', /bad operand type for unary ([^:]+): '([^']+)'/, 'Sinal “$1” na frente de $2', 'Não dá para usar esse sinal com esse tipo de valor (ex.: -"5"). Converta para número primeiro.', null);
e('TypeError', /'([<>]=?)' not supported between instances of '([^']+)' and '([^']+)'/, 'Comparando $2 com $3', 'Para comparar com < ou >, os dois lados precisam ser do mesmo tipo. Muito comum: comparar o texto do input() com um número.', ['idade = input("Idade? ")\nif idade >= 18: ...', 'idade = int(input("Idade? "))\nif idade >= 18: ...']);
e('TypeError', /can't multiply sequence by non-int of type '([^']+)'/, 'Multiplicando texto/lista por $1', '"ab" * 3 repete o texto, mas só com número inteiro. Se era para fazer conta, o outro valor é texto: converta com float().', ['preco = input("Preço? ")\ntotal = preco * 1.5', 'preco = float(input("Preço? "))\ntotal = preco * 1.5']);
e('TypeError', /'NoneType' object is not subscriptable/, 'Usou [ ] em algo que é None', 'A variável está vazia (None). Causa comum: uma função sem return, ou um método como lista.sort() que muda a lista e devolve None.', ['nomes = nomes.sort()\nprint(nomes[0])', 'nomes.sort()\nprint(nomes[0])']);
e('TypeError', /'(builtin_function_or_method|function|method)' object is not subscriptable/, 'Usou [ ] numa função', 'Função se chama com ( ), não com [ ]. Ou faltou chamar a função antes de pegar o item.', ['print[0]', 'print(lista[0])']);
e('TypeError', /'(dict_keys|dict_values|dict_items|set|map|filter|zip|generator|reversed|enumerate)' object is not subscriptable/, '$1 não aceita [posição]', 'Esse tipo de coleção não tem posições. Transforme em lista primeiro com list().', ['primeira = dados.keys()[0]', 'primeira = list(dados.keys())[0]']);
e('TypeError', /'type' object is not subscriptable/, 'Usou [ ] numa classe', 'list[0] ou dict["x"] usa o nome do tipo, não a sua variável. Ou: anotação como list[int] numa versão antiga do Python.', null);
e('TypeError', /'(int|float|bool)' object is not subscriptable/, 'Usou [ ] num número', 'Número não tem posições. Para pegar um dígito, transforme em texto: str(numero)[0].', ['numero = 1234\nprint(numero[0])', 'numero = 1234\nprint(str(numero)[0])']);
e('TypeError', /'([^']+)' object is not subscriptable/, '$1 não aceita [ ]', 'Esse tipo de valor não tem itens para pegar com colchetes. Confira o que a variável realmente guarda.', null);
e('TypeError', /'(builtin_function_or_method|method)' object is not iterable/, 'Faltou ( ) para chamar o método', 'Você está percorrendo o método em vez do resultado dele. Coloque os parênteses.', ['for chave in dados.keys:', 'for chave in dados.keys():']);
e('TypeError', /'NoneType' object is not iterable|cannot unpack non-iterable NoneType object/, 'Percorrendo algo que é None', 'O for (ou o “a, b = ...”) recebeu None. Normalmente é uma função que esqueceu o return.', ['def pegar():\n    nomes = ["a", "b"]\n\nfor n in pegar(): ...', 'def pegar():\n    return ["a", "b"]\n\nfor n in pegar(): ...']);
e('TypeError', /'(int|float)' object is not iterable|cannot unpack non-iterable (int|float) object/, 'Percorrendo um número', 'Para repetir N vezes use range(N).', ['for i in 10:', 'for i in range(10):']);
e('TypeError', /'type' object is not iterable/, 'Percorrendo uma classe', 'Você colocou o nome do tipo (list, dict…) ou de uma classe no for, e não a sua variável.', null);
e('TypeError', /'([^']+)' object is not iterable|cannot unpack non-iterable ([^ ]+) object/, '$1 não dá para percorrer', 'O for (ou a desmontagem a, b = ...) precisa de uma lista, texto, tupla, dicionário…', null);
e('TypeError', /argument of type '([^']+)' is not iterable|'in <string>' requires string as left operand, not ([^ ]+)/, 'Usando “in” com o tipo errado', '“x in y” precisa que y seja texto, lista, dicionário… E em texto, x também precisa ser texto.', ['if 5 in "12345":', 'if "5" in "12345":']);
e('TypeError', /'module' object is not callable/, 'Chamou o módulo em vez da função dele', 'Você importou o módulo e o usou como função. Use módulo.função() ou importe a função direto.', ['import random\nn = random(1, 6)', 'import random\nn = random.randint(1, 6)']);
e('TypeError', /'NoneType' object is not callable/, 'Chamou algo que é None', 'Você pôs ( ) depois de algo vazio. Em botões: command=funcao (sem parênteses), não command=funcao().', ['botao = tk.Button(text="OK", command=salvar())', 'botao = tk.Button(text="OK", command=salvar)']);
e('TypeError', /'(str|int|float|list|dict|tuple|bool)' object is not callable/, 'Chamou $1 como se fosse função', 'Você pôs ( ) depois de um valor. Duas causas comuns: uma variável com o nome de uma função (ex.: input = "x" e depois input()), ou faltou o * numa conta: 2(3+4).', ['total = 2(3 + 4)', 'total = 2 * (3 + 4)']);
e('TypeError', /'([^']+)' object is not callable/, '$1 não é função', 'Você colocou ( ) depois de algo que não é função. Às vezes é uma variável com o mesmo nome de uma função ou método.', null);
e('TypeError', /'(str|tuple|range|bytes)' object does not support item assignment/, 'Não dá para mudar $1 por posição', 'Texto e tupla são imutáveis: não dá para trocar um pedaço. Crie um novo (texto.replace(), ou transforme em lista).', ['nome = "ana"\nnome[0] = "A"', 'nome = "ana"\nnome = "A" + nome[1:]']);
e('TypeError', /'([^']+)' object (does not|doesn't) support item (assignment|deletion)/, '$1 não aceita trocar/apagar item', 'Esse tipo não permite mudar itens por posição.', null);
e('TypeError', /list indices must be integers or slices, not str/, 'Posição de lista com texto', 'Lista usa número como posição (0, 1, 2…). Se o número veio do input(), converta com int(). Se era para usar nome como chave, o certo é um dicionário.', ['i = input("Posição? ")\nprint(nomes[i])', 'i = int(input("Posição? "))\nprint(nomes[i])']);
e('TypeError', /list indices must be integers or slices, not float/, 'Posição de lista com número decimal', 'A posição precisa ser inteira. A divisão com / sempre dá decimal: use // para divisão inteira.', ['meio = lista[len(lista) / 2]', 'meio = lista[len(lista) // 2]']);
e('TypeError', /list indices must be integers or slices, not tuple/, 'Faltou vírgula entre listas, ou [linha, coluna] em lista', 'lista[1, 2] não existe: para tabela (lista de listas) use lista[1][2]. Ou faltou uma vírgula entre duas listas.', ['tabela[1, 2]', 'tabela[1][2]']);
e('TypeError', /(string|tuple) indices must be integers/, 'Posição de $1 com texto', 'Você usou ["nome"] em algo que é texto (ou tupla), não dicionário. Muito comum ao percorrer um dicionário: o for devolve só as chaves.', ['for item in dados:\n    print(item["nome"])', 'for chave, valor in dados.items():\n    print(chave, valor)']);
e('TypeError', /unhashable type: '([^']+)'/, '$1 não pode ser chave de dicionário', 'Listas, dicionários e sets não podem ser chave de dict nem item de set. Use uma tupla no lugar da lista.', ['visitados = {[1, 2]}', 'visitados = {(1, 2)}']);
e('TypeError', /object of type '([^']+)' has no len\(\)/, '$1 não tem tamanho', 'len() funciona com texto, lista, dicionário… Para contar dígitos de um número: len(str(numero)).', ['len(12345)', 'len(str(12345))']);
e('TypeError', /missing (\d+) required positional arguments?: 'self'/, 'Chamou o método pela classe, sem criar o objeto', 'Primeiro crie o objeto (com parênteses na classe), depois chame o método nele.', ['Jogo.iniciar()', 'jogo = Jogo()\njogo.iniciar()']);
e('TypeError', /(\w[\w.]*)\(\) missing (\d+) required (?:positional|keyword-only) arguments?: (.+)/, '$r1() precisa de mais valores: faltou $3', 'A função pede mais argumentos do que você passou. Confira o def dela.', ['def somar(a, b):\n    return a + b\n\nsomar(1)', 'somar(1, 2)']);
e('TypeError', /(\w[\w.]*)\(\) takes 0 positional arguments but 1 was given/, '$r1() não tem o “self”', 'Todo método de uma classe recebe o próprio objeto como primeiro parâmetro. Coloque self no def.', ['class Jogo:\n    def pular():', 'class Jogo:\n    def pular(self):']);
e('TypeError', /(\w[\w.]*)\(\) takes (?:from )?(\d+)(?: to \d+)? positional arguments? but (\d+) (?:were|was) given/, '$r1() recebeu valores demais', 'A função aceita $2, mas recebeu $3. Em métodos de classe, o self conta como o primeiro. Em botões do Qt, o “clicked” pode mandar um valor extra (checked).', null);
e('TypeError', /(\w[\w.]*)\(\) got an unexpected keyword argument '([^']+)'/, '$r1() não conhece o parâmetro “$2”', 'Esse nome de parâmetro não existe nessa função (erro de digitação ou de versão da biblioteca).', null);
e('TypeError', /(\w[\w.]*)\(\) got multiple values for (?:keyword )?argument '([^']+)'/, '“$2” foi passado duas vezes', 'O mesmo parâmetro foi passado por posição e por nome. Em métodos, às vezes falta o self no def.', null);
e('TypeError', /(\w+)\(\) takes no arguments|object\.__init__\(\) takes exactly one argument/, 'A classe não tem __init__ (ou ele está escrito errado)', 'Você passou valores ao criar o objeto, mas a classe não tem um __init__ que os receba. Confira: são DOIS sublinhados de cada lado — __init__, não _init_ nem __int__.', ['class Carro:\n    def _init_(self, cor):\n        self.cor = cor', 'class Carro:\n    def __init__(self, cor):\n        self.cor = cor']);
e('TypeError', /__init__\(\) should return None/, '__init__ não pode ter return com valor', 'O __init__ só prepara o objeto. Tire o return (ou deixe só “return”).', null);
e('TypeError', /(int|float)\(\) argument must be a string, a bytes-like object or a (?:real )?number, not '([^']+)'/, '$r1() recebeu $2', 'int()/float() convertem texto ou número. Se for None, alguma função esqueceu o return; se for lista, converta item por item.', null);
e('TypeError', /'(float|str|NoneType)' object cannot be interpreted as an integer/, 'Precisava de número inteiro, veio $1', 'range(), posições e repetições precisam de int. Use int() ou a divisão inteira //.', ['for i in range(input("Quantas? ")):', 'for i in range(int(input("Quantas? "))):']);
e('TypeError', /slice indices must be integers/, 'Fatia [a:b] com número decimal ou texto', 'Os números da fatia precisam ser inteiros: use // ou int().', null);
e('TypeError', /sequence item (\d+): expected str instance, ([^ ]+) found/, 'join() achou um $2 na posição $1', '"sep".join(lista) só junta textos. Converta antes.', ['", ".join([1, 2, 3])', '", ".join(str(n) for n in [1, 2, 3])']);
e('TypeError', /a bytes-like object is required, not 'str'/, 'Precisava de bytes, veio texto', 'O arquivo/conexão foi aberto em modo binário ("rb"/"wb"). Abra em modo texto ("r"/"w") ou converta com texto.encode().', null);
e('TypeError', /write\(\) argument must be str, not ([^ ]+)/, 'write() só escreve texto (veio $1)', 'Converta para texto antes de escrever no arquivo.', ['arquivo.write(pontos)', 'arquivo.write(str(pontos) + "\\n")']);
e('TypeError', /not all arguments converted during string formatting/, 'Formatação com % deu errado', 'Sobrou valor na formatação com %. Ou: usou % (resto da divisão) em um texto — converta para número. Prefira f-strings.', ['print("Oi %s" % (nome, idade))', 'print(f"Oi {nome}, {idade} anos")']);
e('TypeError', /not enough arguments for format string/, 'Faltou valor na formatação com %', 'Há mais %s do que valores. Prefira f-strings: f"{a} {b}".', null);
e('TypeError', /%[a-z] format: a (?:real )?number is required, not ([^ ]+)/, 'Formato de número recebeu $1', '%d e %f precisam de número. Converta ou use f-string.', null);
e('TypeError', /unsupported format string passed to (\w+)\.__format__/, 'Formatação de número em $1', 'Você usou algo como {x:.2f} num valor que não é número (ex.: None ou texto).', null);
e('TypeError', /Object of type (\w+) is not JSON serializable/, '$1 não pode virar JSON', 'JSON só guarda texto, número, True/False, None, lista e dicionário. Converta antes (ex.: str(data), list(conjunto)).', null);
e('TypeError', /the JSON object must be str, bytes or bytearray, not (\w+)/, 'json.loads recebeu $1', 'json.loads() lê TEXTO em JSON. Se você já tem um dicionário, não precisa converter. Para arquivos use json.load(arquivo).', null);
e('TypeError', /expected str, bytes or os\.PathLike object, not (\w+)/, 'Caminho de arquivo recebeu $1', 'A função esperava o caminho do arquivo (texto). Se é None, o diálogo de escolher arquivo foi cancelado.', null);
e('TypeError', /descriptor '(\w+)' (?:of|for) '(\w+)' objects? (?:needs an argument|doesn't apply)|unbound method (\w+)\.(\w+)\(\) needs an argument/, 'Chamou um método pela classe, sem o valor', 'Chame o método no seu valor, não no tipo: nome.upper(), não str.upper().', ['str.upper()', 'nome.upper()']);
e('TypeError', /exceptions must derive from BaseException/, 'raise com algo que não é erro', 'raise precisa de uma exceção: raise ValueError("mensagem").', ['raise "Deu erro"', 'raise ValueError("Deu erro")']);
e('TypeError', /catching classes that do not inherit from BaseException/, 'except com algo que não é erro', 'No except vai o tipo de erro (ValueError, KeyError…), não um texto ou valor.', null);
e('TypeError', /__str__ returned non-string/, '__str__ precisa devolver texto', 'Use return str(...) ou uma f-string no __str__.', null);
e('TypeError', /can't (?:subtract|compare) offset-naive and offset-aware datetimes/, 'Datas com e sem fuso horário', 'Uma data tem fuso horário e a outra não. Use datetime.now(timezone.utc) nas duas, ou tire o fuso com .replace(tzinfo=None).', null);
e('TypeError', /object (\w+) can't be used in 'await' expression/, 'await em algo que não é assíncrono', 'Só dá para usar await em funções async def (corrotinas).', null);
e('TypeError', /Population must be a sequence/, 'random.sample com conjunto/dicionário', 'random.sample precisa de lista: random.sample(list(conjunto), 2).', null);
e('TypeError', /called with wrong argument types|argument \d+ has unexpected type '([^']+)'/, 'Tipo de valor errado num método do Qt', 'Os métodos do PySide são rígidos: setText precisa de texto, setValue de número inteiro… Converta antes.', ['self.rotulo.setText(pontos)', 'self.rotulo.setText(str(pontos))']);
e('TypeError', /isinstance\(\) arg 2 must be a type/, 'isinstance com algo que não é tipo', 'O segundo valor precisa ser um tipo (int, str…) ou uma tupla de tipos: isinstance(x, (int, float)).', null);
e('TypeError', /Cannot create a consistent method resolution order/, 'Ordem de herança impossível', 'As classes-mãe estão numa ordem que o Python não consegue resolver. Ponha a classe mais específica primeiro.', null);
e('TypeError', /super\(type, obj\): obj must be an instance or subtype of type/, 'super() com a classe errada', 'Use super().__init__() sem argumentos (Python 3).', null);
e('TypeError', null, 'Tipo errado de valor', 'Uma operação recebeu um tipo de dado que ela não aceita. Confira o tipo das variáveis envolvidas com print(type(x)).', null);

// =====================================================================================================
g('Valores inválidos (ValueError)');
e('ValueError', /invalid literal for int\(\) with base \d+: ''/, 'int() recebeu um texto vazio', 'O campo ou o input() veio vazio. Confira antes: if texto.strip(): ... ou use try/except.', ['idade = int(campo.get())', 'texto = campo.get().strip()\nidade = int(texto) if texto else 0']);
e('ValueError', /invalid literal for int\(\) with base 10: '-?\d+[.,]\d+'/, 'int() recebeu um número com vírgula/ponto', 'int() só aceita números inteiros escritos como texto. Para decimais, use float() (e troque a vírgula por ponto).', ['n = int("3.5")', 'n = float("3,5".replace(",", "."))']);
e('ValueError', /invalid literal for int\(\) with base \d+: '\s+\d+\s*'|invalid literal for int\(\) with base \d+: '\d+\s+'/, 'int() recebeu espaços', 'Tire os espaços com .strip() antes de converter.', null);
e('ValueError', /invalid literal for int\(\) with base (\d+): (.+)/, 'int() não entendeu $2', 'Esse texto não é um número inteiro. Se vem do usuário, trate com try/except ValueError.', ['n = int(input("Número: "))', 'try:\n    n = int(input("Número: "))\nexcept ValueError:\n    print("Digite só números!")']);
e('ValueError', /could not convert string to float: ''/, 'float() recebeu um texto vazio', 'O campo veio vazio. Confira antes de converter.', null);
e('ValueError', /could not convert string to float: '-?\d+,\d+'/, 'Número com vírgula', 'O Python usa ponto como separador decimal (3.5), não vírgula (3,5). Troque antes de converter.', ['preco = float("3,50")', 'preco = float("3,50".replace(",", "."))']);
e('ValueError', /could not convert string to float: (.+)/, 'float() não entendeu $1', 'Esse texto não é um número. Tire letras, “R$” e espaços antes.', null);
e('ValueError', /too many values to unpack \(expected (\d+)(?:, got (\d+))?\)/, 'Valores demais para $1 variáveis', 'Em “a, b = algo”, o lado direito tem mais itens do que variáveis. Num for com dicionário, use .items() para pegar chave e valor.', ['for nome, idade in pessoas:', 'for nome, idade in pessoas.items():']);
e('ValueError', /not enough values to unpack \(expected (\d+), got (\d+)\)/, 'Esperava $1 valores, vieram $2', 'O lado direito tem menos itens do que variáveis. Ex.: texto.split() devolveu menos pedaços do que você achava.', null);
e('ValueError', /list\.remove\(x\): x not in list/, 'remove() não achou o item', 'O item não está na lista. Confira antes com: if item in lista: lista.remove(item).', ['nomes.remove("Zé")', 'if "Zé" in nomes:\n    nomes.remove("Zé")']);
e('ValueError', /'?(.+?)'? is not in list|tuple\.index\(x\): x not in tuple/, '$1 não está na lista', '.index() só funciona se o item existir. Confira com “in” antes.', null);
e('ValueError', /substring not found/, 'Pedaço de texto não encontrado', 'texto.index() dá erro quando não acha. Use texto.find(), que devolve -1, ou confira com “in”.', null);
e('ValueError', /math domain error/, 'Conta matemática impossível', 'Ex.: raiz quadrada de número negativo, ou log de zero/negativo.', ['math.sqrt(-4)', 'math.sqrt(abs(-4))']);
e('ValueError', /empty range (?:for|in) randrange/, 'Sorteio com intervalo vazio', 'random.randint(a, b) precisa que a seja menor ou igual a b. randrange(0) e choice de lista vazia também dão isso.', null);
e('ValueError', /Sample larger than population/, 'Sorteando mais itens do que existem', 'random.sample(lista, n) precisa que n seja no máximo len(lista).', null);
e('ValueError', /(max|min)\(\) (?:arg is an empty sequence|iterable argument is empty)/, '$1() de uma lista vazia', 'Não dá para achar o maior/menor de nada. Confira se a lista tem itens, ou use default=0.', ['maior = max(notas)', 'maior = max(notas, default=0)']);
e('ValueError', /time data '(.+)' does not match format '(.+)'/, 'A data “$1” não bate com o formato $2', 'O texto da data precisa estar exatamente no formato. Para datas brasileiras: "%d/%m/%Y".', ['datetime.strptime("25/12/2026", "%Y-%m-%d")', 'datetime.strptime("25/12/2026", "%d/%m/%Y")']);
e('ValueError', /unconverted data remains: (.+)/, 'Sobrou “$1” depois da data', 'O texto tem mais coisas que o formato (ex.: hora). Ajuste o formato.', null);
e('ValueError', /(month|day|hour|minute|second|year) (?:must be in|is out of range)/, 'Data impossível ($1 inválido)', 'Mês de 1 a 12, dia que exista no mês (fevereiro!), hora de 0 a 23…', null);
e('ValueError', /I\/O operation on closed file/, 'Usando um arquivo já fechado', 'Depois do bloco “with open(...)”, o arquivo fecha. Leia/escreva tudo dentro do with.', ['with open("a.txt") as f:\n    pass\ntexto = f.read()', 'with open("a.txt") as f:\n    texto = f.read()']);
e('ValueError', /dictionary update sequence element/, 'dict() recebeu itens no formato errado', 'Para criar um dicionário de uma lista, cada item precisa ser um par (chave, valor).', null);
e('ValueError', /invalid mode: '(.+)'|must have exactly one of create\/read\/write\/append mode/, 'Modo de abrir arquivo inválido', 'Use "r" (ler), "w" (escrever do zero), "a" (acrescentar), com "b" para binário. Ex.: open("x.txt", "w", encoding="utf-8").', null);
e('ValueError', /embedded null (?:character|byte)/, 'Caractere nulo no texto/caminho', 'Provavelmente um caminho do Windows com \\0. Use barras normais ou r"C:\\pasta".', null);
e('ValueError', /Exceeds the limit \(\d+ digits\) for integer string conversion/, 'Número gigante demais para virar texto', 'O Python limita números com milhares de dígitos. Use sys.set_int_max_str_digits(0) se precisar mesmo.', null);
e('ValueError', /cannot convert float NaN to integer/, 'Convertendo “NaN” para inteiro', 'NaN é “não é um número” (ex.: célula vazia no pandas). Trate antes com math.isnan() ou .fillna(0).', null);
e('ValueError', /Unknown format code '(.)' for object of type '([^']+)'/, 'Formato “$1” não serve para $2', 'Ex.: {x:d} só serve para inteiro; {x:.2f} para número. Converta o valor antes.', ['f"{preco:d}"', 'f"{preco:.2f}"']);
e('ValueError', /Single '[{}]' encountered in format string|unmatched '\{' in format spec|expected '\}' before end of string/, 'Chave { } sozinha na formatação', 'Em f-string e .format(), chaves literais são escritas dobradas: {{ e }}.', ['f"{nome} {x"', 'f"{nome} {{x}}"']);
e('ValueError', /The truth value of an? (?:array|Series|DataFrame).* is ambiguous/, 'if com uma coluna/array inteiro', 'No numpy/pandas, compare item a item: use .any(), .all(), ou & e | com parênteses: df[(df.a > 1) & (df.b < 5)].', ['if df["idade"] > 18:', 'adultos = df[df["idade"] > 18]']);
e('ValueError', /Length of values \((\d+)\) does not match length of index \((\d+)\)/, 'Coluna com $1 valores numa tabela de $2 linhas', 'A lista que você colocou na coluna precisa ter o mesmo tamanho da tabela.', null);
e('ValueError', /operands could not be broadcast together with shapes|could not broadcast input array/, 'Arrays de tamanhos diferentes', 'As duas matrizes/vetores não têm formatos compatíveis para a conta. Confira .shape de cada um.', null);
e('ValueError', /shapes \(.+\) and \(.+\) not aligned/, 'Multiplicação de matrizes com tamanhos errados', 'No produto de matrizes, as colunas da primeira precisam ser iguais às linhas da segunda.', null);
e('ValueError', /setting an array element with a sequence/, 'Lista dentro de array numérico', 'As listas internas têm tamanhos diferentes, ou um item é uma lista onde deveria ser número.', null);
e('ValueError', /x and y must have same first dimension/, 'Gráfico com x e y de tamanhos diferentes', 'No plt.plot(x, y), as duas listas precisam ter a mesma quantidade de itens.', null);
e('ValueError', /Excel file format cannot be determined|File is not a recognized excel file/, 'Arquivo não parece Excel', 'Confira a extensão (.xlsx) e se o arquivo não está corrompido. Para .csv use read_csv.', null);
e('ValueError', /'(.+)' is not a valid (\w+)/, '“$1” não é um valor válido de $2', 'Esse valor não existe no Enum. Confira as opções.', null);
e('ValueError', /chr\(\) arg not in range/, 'chr() com número fora do intervalo', 'chr() aceita de 0 a 1.114.111.', null);
e('ValueError', /unknown url type: '?(.+?)'?$/, 'Endereço sem “https://”', 'Comece o endereço com https://.', null);
e('ValueError', /negative shift count|negative (?:count|dimensions)/, 'Número negativo onde não pode', 'Esse valor precisa ser 0 ou maior.', null);
e('ValueError', null, 'Valor inválido', 'O tipo está certo, mas o valor não serve para essa operação. Leia a mensagem original: ela diz qual valor.', null);

// =====================================================================================================
g('Atributos e métodos (AttributeError)');
e('AttributeError', /partially initialized module '([^']+)'.*(?:circular import|same name)/, 'Import circular (ou arquivo com nome de módulo)', 'O módulo $1 ainda estava carregando. Ou dois arquivos se importam, ou SEU arquivo tem o mesmo nome do módulo (ex.: random.py, turtle.py) — renomeie o seu arquivo.', null);
e('AttributeError', /module '(random|math|turtle|time|json|csv|socket|email|string|calendar|queue|copy|tkinter|pygame|requests|numpy|pandas|os|re|datetime|statistics|secrets|threading|test|code|token|types|select|operator|array)' has no attribute '([^']+)'(?:.*consider renaming '([^']+)')?/, '“$1” não tem “$2” — seu arquivo tem o mesmo nome?', 'Se existe um arquivo seu chamado $1.py (ou uma pasta $1), ele esconde o módulo de verdade. Renomeie o seu arquivo (ex.: meu_$1.py) e apague a pasta __pycache__. Se não for isso, confira a grafia.', null);
e('AttributeError', /module 'numpy' has no attribute '(float|int|bool|object|str)'/, 'numpy.$1 foi removido', 'Nas versões novas do numpy, use o tipo do Python: $1 (sem np.).', ['np.float', 'float']);
e('AttributeError', /module '([^']+)' has no attribute '([^']+)'(?:\. Did you mean: '([^']+)')?/, 'O módulo $1 não tem “$2”', 'Erro de digitação, ou essa função mudou de nome/foi removida na versão instalada.', null);
e('AttributeError', /'NoneType' object has no attribute 'append'/, 'lista = lista.append(...) apagou a lista', '.append() muda a lista e devolve None. Não guarde o resultado.', ['nomes = nomes.append("Ana")', 'nomes.append("Ana")']);
e('AttributeError', /'NoneType' object has no attribute '(group|groups|start|end|span)'/, 'A busca (re) não achou nada', 're.match/re.search devolvem None quando não encontram. Confira antes: if m: ...', ['m = re.search(r"\\d+", texto)\nprint(m.group())', 'm = re.search(r"\\d+", texto)\nif m:\n    print(m.group())']);
e('AttributeError', /'NoneType' object has no attribute '(text|find|find_all|get_text|attrs|get)'/, 'O find() não achou o elemento', 'No BeautifulSoup/Selenium, find() devolve None quando não acha. Confira o seletor e teste antes de usar.', null);
e('AttributeError', /'NoneType' object has no attribute '(shape|copy|astype)'/, 'A imagem não foi carregada', 'cv2.imread() devolve None quando o caminho está errado (ou tem acento). Confira o caminho do arquivo.', null);
e('AttributeError', /'NoneType' object has no attribute '([^']+)'/, 'Usou “.$1” em algo que é None', 'A variável está vazia (None). Muitas vezes é o resultado de uma função sem return, ou de um método que não devolve nada (sort, append, pack, grid…).', ['botao = tk.Button(text="OK").pack()\nbotao.config(text="Sair")', 'botao = tk.Button(text="OK")\nbotao.pack()\nbotao.config(text="Sair")']);
e('AttributeError', /'str' object has no attribute '(append|remove|pop|insert|sort)'/, 'Texto não tem .$1', 'Texto é imutável. Se era para ser lista, crie com [ ]: nomes = [] e não nomes = "".', ['nomes = ""\nnomes.append("Ana")', 'nomes = []\nnomes.append("Ana")']);
e('AttributeError', /'str' object has no attribute 'decode'/, '.decode() em texto (coisa do Python 2)', 'No Python 3 o texto já é str. Só bytes têm .decode().', null);
e('AttributeError', /'list' object has no attribute '(split|lower|upper|strip|replace|startswith|endswith|isdigit|find)'/, 'Lista não tem .$1 (isso é de texto)', 'Aplique em cada item da lista, ou junte os textos antes.', ['nomes.lower()', 'nomes = [n.lower() for n in nomes]']);
e('AttributeError', /'list' object has no attribute '(shape|reshape|mean|sum|T)'/, 'Lista não tem .$1 (isso é do numpy)', 'Converta para array: np.array(lista).$1.', null);
e('AttributeError', /'list' object has no attribute '(items|keys|values|get)'/, 'Lista não tem .$1 (isso é de dicionário)', 'Essa variável é uma lista. Se cada item é um dicionário, percorra a lista e use .$1 em cada item.', null);
e('AttributeError', /'dict' object has no attribute '(iteritems|has_key|itervalues|iterkeys)'/, '.$1 é do Python 2', 'Use .items(), “chave in dicionario”, .values() ou .keys().', null);
e('AttributeError', /'dict' object has no attribute 'append'/, 'Dicionário não tem .append', 'Em dicionário você cria a chave direto: dados["nome"] = "Ana". Se queria uma lista, use [ ].', null);
e('AttributeError', /'dict' object has no attribute '([^']+)'/, 'Dicionário usa [ ], não ponto', 'Para pegar um valor de dicionário: dados["$1"] ou dados.get("$1").', ['dados.$1', 'dados["$1"]']);
e('AttributeError', /'(int|float)' object has no attribute '([^']+)'/, 'Número não tem .$2', 'Essa variável é número. Se precisava de texto, converta com str(); se era para ser lista/objeto, confira onde ela recebeu o valor.', null);
e('AttributeError', /'tuple' object has no attribute '([^']+)'/, 'Isso virou tupla (vírgula sobrando?)', 'Uma vírgula no fim da linha cria uma tupla: x = 5, é (5,). Confira a linha onde a variável recebeu valor.', ['nome = "Ana",\nnome.upper()', 'nome = "Ana"\nnome.upper()']);
e('AttributeError', /'(function|method|builtin_function_or_method)' object has no attribute '([^']+)'/, 'Faltou ( ) — você está usando a função, não o resultado', 'Chame a função primeiro e depois use o .$2 no que ela devolve.', ['texto = input.strip()', 'texto = input().strip()']);
e('AttributeError', /type object '([^']+)' has no attribute '([^']+)'/, 'A classe $1 não tem “$2”', 'Você usou a classe direto (sem criar o objeto), ou o atributo é criado no __init__ (precisa de um objeto: x = $1()).', null);
e('AttributeError', /'_io\.TextIOWrapper' object has no attribute '([^']+)'/, 'Usou .$1 no arquivo, não no conteúdo', 'Leia o conteúdo primeiro: texto = arquivo.read().', ['linhas = arquivo.split("\\n")', 'linhas = arquivo.read().split("\\n")']);
e('AttributeError', /'DataFrame' object has no attribute 'append'/, 'DataFrame.append foi removido no pandas 2', 'Use pd.concat([df, novo], ignore_index=True).', ['df = df.append(linha, ignore_index=True)', 'df = pd.concat([df, pd.DataFrame([linha])], ignore_index=True)']);
e('AttributeError', /'(DataFrame|Series)' object has no attribute '([^']+)'/, 'A tabela não tem “$2”', 'Se “$2” é uma coluna, use df["$2"] — e confira o nome exato com print(df.columns) (espaços e maiúsculas contam).', null);
e('AttributeError', /'WebDriver' object has no attribute 'find_elements?_by_\w+'/, 'find_element_by_… foi removido do Selenium 4', 'Use find_element(By.XPATH, "...") com from selenium.webdriver.common.by import By.', ['driver.find_element_by_id("x")', 'driver.find_element(By.ID, "x")']);
e('AttributeError', /'(?:PySide6\.QtCore\.)?Signal' object has no attribute 'connect'/, 'Signal criado no lugar errado', 'No PySide, o Signal precisa ser declarado na classe (fora do __init__), não em self.', null);
e('AttributeError', /'_tkinter\.tkapp' object has no attribute '([^']+)'/, 'A janela não tem “$1”', 'O elemento $1 não foi criado com self.$1 = ... (ou foi criado depois desta linha). Confira o nome no Designer.', null);
e('AttributeError', /can't set attribute|property '([^']+)' of '([^']+)' object has no setter/, 'Esse atributo é só de leitura', 'É uma property sem setter: não dá para atribuir direto.', null);
e('AttributeError', /'([^']+)' object has no attribute '([^']+)'\. Did you mean: '([^']+)'/, '$1 não tem “$2” — você quis dizer “$3”?', 'Provavelmente erro de digitação no nome do atributo/método.', null);
e('AttributeError', /'([^']+)' object has no attribute '([^']+)'/, '$1 não tem “$2”', 'Erro de digitação no nome? Ou o objeto é de outro tipo do que você imagina (print(type(x))). Em classes: o atributo precisa ser criado com self.$2 = ... no __init__.', null);
e('AttributeError', null, 'Atributo ou método inexistente', 'O objeto não tem isso. Confira a grafia e o tipo do objeto.', null);

// =====================================================================================================
g('Posições e chaves (IndexError / KeyError)');
e('IndexError', /list index out of range/, 'Posição que não existe na lista', 'A lista tem menos itens do que você pensou (às vezes nenhum). As posições vão de 0 até len(lista) - 1. Confira com if len(lista) > i.', ['nomes = ["Ana", "Bia"]\nprint(nomes[2])', 'nomes = ["Ana", "Bia"]\nprint(nomes[1])  # último\nprint(nomes[-1])  # também o último']);
e('IndexError', /list assignment index out of range/, 'Pôr item numa posição que não existe', 'Para acrescentar no fim de uma lista use .append(), não lista[i] = valor.', ['notas = []\nnotas[0] = 10', 'notas = []\nnotas.append(10)']);
e('IndexError', /string index out of range/, 'Posição que não existe no texto', 'O texto é menor do que a posição pedida (ou está vazio). Confira com len(texto).', null);
e('IndexError', /tuple index out of range|Replacement index (\d+) out of range/, 'Posição que não existe na tupla', 'Com .format(), cada {} precisa de um valor. Em sys.argv, faltou passar o argumento.', null);
e('IndexError', /pop from empty (list|deque)|pop index out of range/, 'pop() numa lista vazia', 'Não há itens para tirar. Confira antes: if lista: lista.pop().', null);
e('IndexError', /index (-?\d+) is out of bounds for axis (\d+) with size (\d+)/, 'Posição $1 fora do array (tamanho $3)', 'No numpy, as posições do eixo $2 vão de 0 a $3 - 1.', null);
e('IndexError', /single positional indexer is out-of-bounds|positional indexers are out-of-bounds/, 'iloc fora da tabela', 'A tabela tem menos linhas/colunas do que a posição pedida (ou está vazia).', null);
e('IndexError', /cannot do a non-empty take from an empty axes/, 'Tabela ou array vazio', 'Você pediu itens de algo que não tem nada.', null);
e('IndexError', null, 'Posição que não existe', 'Você pediu um item numa posição que não existe. As posições começam em 0.', null);
e('KeyError', /^"\[.+\] not in index"$|not in index/, 'Coluna não existe na tabela', 'Confira os nomes com print(df.columns): espaços, acentos e maiúsculas contam.', null);
e('KeyError', /popitem\(\): dictionary is empty/, 'popitem() num dicionário vazio', 'Confira se o dicionário tem itens antes.', null);
e('KeyError', /^'?(\d+)'?$/, 'A chave $1 não existe', 'Atenção: 1 (número) e "1" (texto) são chaves diferentes. No pandas, use df.iloc[$1] para posição.', null);
e('KeyError', /^'(.*)'$/, 'A chave “$1” não existe', 'Use dicionario.get("$1") para receber None em vez de erro, ou confira se a chave foi escrita igual (maiúsculas e espaços contam). Em os.environ, a variável de ambiente não está definida.', ['print(aluno["Nome"])', 'print(aluno.get("nome", "sem nome"))']);
e('KeyError', null, 'Chave inexistente', 'Essa chave não existe no dicionário (ou set). Use .get() ou confira com “in”.', null);

// =====================================================================================================
g('Imports e pacotes');
e('ModuleNotFoundError', /No module named '(ui|estado)'/, 'Não achou a pasta “ui” do Designer', 'Rode o arquivo da tela a partir da pasta do projeto (botão Rodar tela) — a pasta ui/ precisa estar ao lado.', null);
e('ModuleNotFoundError', /No module named '(tkinter|_tkinter)'/, 'Este Python não tem o Tkinter', 'Reinstale o Python marcando “tcl/tk and IDLE”. No PyForge, o Python gerenciado já vem com Tkinter.', null);
e('ModuleNotFoundError', /No module named '([^'.]+)\.[^']+'; '([^']+)' is not a package/, '“$2” não é um pacote — arquivo com nome igual?', 'Você tem um arquivo $2.py que está escondendo o pacote $1 de verdade. Renomeie o seu arquivo.', null);
e('ModuleNotFoundError', /No module named '([^'.]+)/, 'O pacote “$1” não está instalado neste projeto', 'Cada projeto tem o seu ambiente (.venv). Instale o pacote aqui com um clique — o PyForge descobre o nome certo no PyPI (cv2 → opencv-python, PIL → pillow, sklearn → scikit-learn, bs4 → beautifulsoup4, yaml → pyyaml, dotenv → python-dotenv).', null);
e('ImportError', /attempted relative import with no known parent package/, 'Import com ponto num arquivo solto', '“from .modulo import x” só funciona dentro de pacotes. Rodando o arquivo direto, use “from modulo import x”.', ['from .utils import calcular', 'from utils import calcular']);
e('ImportError', /cannot import name '([^']+)' from partially initialized module '([^']+)'/, 'Import circular entre arquivos', '$2 e outro arquivo se importam um ao outro. Mova o código compartilhado para um terceiro arquivo, ou faça o import dentro da função que usa.', null);
e('ImportError', /cannot import name '(\w+UI)' from 'ui\.(\w+)'/, 'A tela $2 foi renomeada ou não foi salva', 'Abra a tela no Designer e salve de novo para refazer o arquivo ui/$2.py.', null);
e('ImportError', /cannot import name '([^']+)' from '([^']+)'(?: \(([^)]+)\))?/, '“$1” não existe em $2', 'Erro de digitação, ou esse nome mudou/foi removido na versão instalada. Se $2 for um arquivo seu, confira se a função existe lá (e se o arquivo não tem o nome de um módulo do Python).', null);
e('ImportError', /DLL load failed while importing (\w+)/, 'Falhou ao carregar a parte em C de $1', 'No Windows: instale o “Microsoft Visual C++ Redistributable” mais recente, ou reinstale o pacote ($1) numa versão compatível com o seu Python.', null);
e('ImportError', /Missing optional dependency '([^']+)'/, 'Falta o pacote $1', 'O pandas precisa do $1 para isso (ex.: openpyxl para Excel). Instale-o no projeto.', null);
e('ImportError', null, 'Não consegui importar', 'O nome que você tentou importar não existe nesse módulo (ou mudou de nome numa versão nova). Confira a grafia e a versão instalada.', null);

// =====================================================================================================
g('Arquivos, pastas e Windows');
e('FileNotFoundError', /\[WinError 2\]|\[Errno 2\] No such file or directory: '(?:python|pip|git|node|ffmpeg|tesseract|chromedriver)/, 'Programa externo não encontrado', 'O comando que o Python tentou rodar não está instalado (ou não está no PATH).', null);
e('FileNotFoundError', /\[Errno 2\] No such file or directory: '(.+)'/, 'Arquivo ou pasta não encontrado: $1', 'Caminhos relativos partem da pasta onde o programa roda. Use o caminho ao lado do código: Path(__file__).parent / "dados.csv". No .exe, use a função caminho() que o PyForge gera.', ['open("dados.csv")', 'from pathlib import Path\nopen(Path(__file__).parent / "dados.csv")']);
e('FileNotFoundError', /\[WinError 3\]/, 'Pasta não encontrada', 'Uma das pastas do caminho não existe. Crie antes com Path("pasta").mkdir(parents=True, exist_ok=True).', null);
e('FileNotFoundError', null, 'Arquivo ou pasta não encontrado', 'Confira o caminho e a pasta onde o programa está rodando (print(Path.cwd())).', null);
e('PermissionError', /\[WinError 32\]|being used by another process/, 'Arquivo aberto em outro programa', 'Feche o arquivo no Excel/Word/outro programa (ou o .exe que está rodando) e tente de novo.', null);
e('PermissionError', /\[Errno 13\] Permission denied: '(.+)'/, 'Sem permissão para usar $1', 'Causas comuns: o arquivo está aberto no Excel; você tentou abrir uma PASTA como arquivo; ou é uma pasta protegida do Windows (Arquivos de Programas). Salve em Documentos.', null);
e('PermissionError', /\[WinError 5\]/, 'Acesso negado pelo Windows', 'O Windows bloqueou. Pode ser antivírus, arquivo em uso ou pasta protegida.', null);
e('PermissionError', null, 'Sem permissão', 'O arquivo pode estar aberto em outro programa, ou a pasta é protegida pelo sistema.', null);
e('FileExistsError', null, 'Já existe', 'O arquivo/pasta já existe. Para pastas: Path("x").mkdir(exist_ok=True).', ['os.mkdir("saida")', 'os.makedirs("saida", exist_ok=True)']);
e('IsADirectoryError', null, 'Isso é uma pasta, não um arquivo', 'Você passou o caminho de uma pasta onde precisava de um arquivo. Complete com o nome do arquivo.', null);
e('NotADirectoryError', null, 'Isso é um arquivo, não uma pasta', 'Um pedaço do caminho é um arquivo onde deveria ser pasta.', null);
e('OSError', /\[Errno 22\] Invalid argument: '.*[\x07\x08\x0b\x0c\t\n\r].*'|\[Errno 22\] Invalid argument: '[A-Za-z]:\\\\?[^']*\\x0/, 'Barra invertida estragou o caminho', 'No Windows, "C:\\novo\\teste" vira \\n (quebra de linha) e \\t (tab). Use r"C:\\novo\\teste" ou barras normais "C:/novo/teste".', ['open("C:\\novo\\teste.txt")', 'open(r"C:\\novo\\teste.txt")']);
e('OSError', /\[Errno 22\] Invalid argument|\[WinError 123\]/, 'Nome de arquivo inválido', 'Nomes de arquivo no Windows não podem ter \\ / : * ? " < > | (cuidado com horas “14:30” no nome).', null);
e('OSError', /\[WinError 206\]|File name too long/, 'Caminho longo demais', 'O Windows limita o tamanho do caminho. Use uma pasta mais curta (ex.: C:\\Projetos).', null);
e('OSError', /\[Errno 28\]|No space left/, 'Disco cheio', 'Libere espaço no disco.', null);
e('OSError', /\[WinError 193\]/, 'Programa/DLL de 32 bits com Python 64 bits', 'A biblioteca não combina com a arquitetura do Python. Instale a versão 64 bits.', null);
e('OSError', /\[WinError 126\]|\[WinError 127\]/, 'DLL não encontrada', 'Falta uma biblioteca do sistema (Visual C++ Redistributable) ou o pacote está incompleto. Reinstale-o.', null);
e('OSError', /\[WinError 1455\]/, 'Memória virtual insuficiente', 'O arquivo de paginação do Windows é pequeno para isso (comum com IA/torch). Feche programas ou aumente a memória virtual.', null);
e('OSError', /\[WinError 10048\]|\[Errno 98\]|Address already in use/, 'Porta já está em uso', 'Outro programa (ou outra cópia do seu) já usa essa porta. Feche-o ou use outra porta.', null);
e('OSError', /cannot write mode (RGBA|P|LA) as JPEG/, 'JPEG não aceita transparência', 'Converta a imagem antes de salvar: imagem.convert("RGB").save("foto.jpg").', ['img.save("foto.jpg")', 'img.convert("RGB").save("foto.jpg")']);
e('OSError', /image file is truncated/, 'Imagem incompleta/corrompida', 'O arquivo de imagem está cortado. Baixe de novo ou use ImageFile.LOAD_TRUNCATED_IMAGES = True.', null);
e('OSError', null, 'Erro do sistema operacional', 'O Windows recusou a operação (arquivo, pasta, rede…). A mensagem original diz o código do erro.', null);
e('UnicodeDecodeError', /'charmap' codec can't decode/, 'Arquivo lido com a codificação do Windows', 'O Windows abre arquivos em cp1252 por padrão. Diga a codificação: open(arquivo, encoding="utf-8").', ['open("dados.txt").read()', 'open("dados.txt", encoding="utf-8").read()']);
e('UnicodeDecodeError', /'utf-8' codec can't decode/, 'O arquivo não está em UTF-8', 'Provavelmente foi salvo pelo Excel/Bloco de Notas antigo. Tente encoding="latin-1" (ou "cp1252").', ['pd.read_csv("planilha.csv")', 'pd.read_csv("planilha.csv", encoding="latin-1", sep=";")']);
e('UnicodeDecodeError|UnicodeError', null, 'Problema de acentuação ao ler', 'O arquivo está em outra codificação. Abra com encoding="utf-8" — ou "latin-1" para arquivos antigos do Windows.', null);
e('UnicodeEncodeError', /'charmap' codec can't encode/, 'O Windows não consegue escrever esse caractere', 'Emoji ou símbolo fora da tabela do Windows. Ao salvar arquivo use encoding="utf-8". No console, rode com a variável PYTHONIOENCODING=utf-8 (o PyForge já faz isso ao Executar).', ['open("log.txt", "w").write("✓ feito")', 'open("log.txt", "w", encoding="utf-8").write("✓ feito")']);
e('UnicodeEncodeError', null, 'Problema de acentuação ao escrever', 'Use encoding="utf-8" ao abrir o arquivo para escrita.', null);
e('EOFError', /EOF when reading a line/, 'input() sem ninguém para digitar', 'O programa pediu um input() mas a entrada acabou: foi rodado sem console (ex.: .exe “sem janela de console”) ou a entrada foi fechada. Em programas com janela, peça o texto num campo/caixa de diálogo.', null);
e('EOFError', /Ran out of input/, 'Arquivo pickle vazio', 'O arquivo que o pickle tentou ler está vazio. Confira se ele foi salvo corretamente.', null);
e('EOFError', null, 'Fim inesperado dos dados', 'A leitura acabou antes do esperado.', null);

// =====================================================================================================
g('Contas e números');
e('ZeroDivisionError', null, 'Divisão por zero', 'Alguma conta dividiu por 0 (com /, // ou %). Confira o divisor antes.', ['media = soma / quantidade', 'media = soma / quantidade if quantidade else 0']);
e('OverflowError', /int too large to convert to float|Result too large|result out of range|math range error/, 'Número grande demais para decimal', 'O resultado passou do limite do float (~1e308). Use inteiros (o Python aceita inteiros enormes) ou a biblioteca decimal.', null);
e('OverflowError', /cannot convert float infinity to integer/, 'Convertendo “infinito” para inteiro', 'Alguma conta deu infinito (ex.: dividiu por algo muito pequeno). Confira os valores.', null);
e('OverflowError', null, 'Número grande demais', 'O resultado passou do limite do tipo.', null);
e('FloatingPointError', null, 'Erro de conta com decimal', 'Uma operação com números decimais deu resultado inválido.', null);
e('decimal.InvalidOperation', null, 'Decimal() não entendeu o número', 'Decimal("3,5") não funciona: use ponto, Decimal("3.5").', ['Decimal("3,50")', 'Decimal("3,50".replace(",", "."))']);
e('RecursionError', null, 'A função chamou a si mesma vezes demais', 'Recursão sem fim: falta um caso base que pare as chamadas (ex.: if n == 0: return 1). Se o problema é grande demais, use um loop. Em classes: uma property que lê a si mesma também causa isso.', ['def fatorial(n):\n    return n * fatorial(n - 1)', 'def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)']);
e('MemoryError', null, 'Acabou a memória', 'O programa tentou guardar dados demais (ou um loop infinito vai enchendo uma lista). Processe aos poucos.', null);

// =====================================================================================================
g('Execução e fluxo do programa');
e('RuntimeError', /dictionary changed size during iteration/, 'Mudou o dicionário enquanto percorria', 'Não dá para adicionar/apagar chaves dentro do for do próprio dicionário. Percorra uma cópia: for k in list(d):', ['for k in dados:\n    if dados[k] == 0:\n        del dados[k]', 'for k in list(dados):\n    if dados[k] == 0:\n        del dados[k]']);
e('RuntimeError', /Set changed size during iteration/, 'Mudou o set enquanto percorria', 'Percorra uma cópia: for x in list(conjunto):', null);
e('RuntimeError', /generator raised StopIteration/, 'next() sem itens dentro de um gerador', 'Dentro de um gerador, use return em vez de deixar o StopIteration escapar.', null);
e('RuntimeError', /main thread is not in main loop|Calling Tcl from different apartment/, 'Tkinter mexido por outra thread', 'Só a thread principal pode mexer na janela. Na thread, guarde o resultado e use janela.after(0, funcao) para atualizar a tela.', null);
e('RuntimeError', /Too early to create (image|variable|font)/, 'Tkinter: criou $1 antes da janela', 'Crie a janela (tk.Tk()) antes de PhotoImage, StringVar ou fontes.', ['foto = tk.PhotoImage(file="a.png")\njanela = tk.Tk()', 'janela = tk.Tk()\nfoto = tk.PhotoImage(file="a.png")']);
e('RuntimeError', /Internal C\+\+ object \((\w+)\) already deleted/, 'O $1 já foi apagado pelo Qt', 'A janela/elemento foi fechado e destruído, mas o código continua usando. Guarde uma referência (self.x) ou confira se ainda existe.', null);
e('RuntimeError', /Please destroy the QApplication singleton/, 'Dois QApplication', 'Só pode existir um QApplication. Use QApplication.instance() or QApplication([]).', null);
e('RuntimeError', /This event loop is already running|asyncio\.run\(\) cannot be called from a running event loop/, 'asyncio.run dentro de outro loop', 'Já existe um loop assíncrono rodando (ex.: Jupyter). Use await direto, em vez de asyncio.run().', null);
e('RuntimeError', /Event loop is closed/, 'Loop assíncrono fechado', 'Comum no Windows com aiohttp. Feche as sessões antes de terminar, ou use asyncio.WindowsSelectorEventLoopPolicy().', null);
e('RuntimeError', /There is no current event loop/, 'Sem loop assíncrono nesta thread', 'Use asyncio.run(main()) para começar o loop.', null);
e('RuntimeError', /can't start new thread/, 'Threads demais', 'O programa criou threads demais. Use um ThreadPoolExecutor com um número limitado.', null);
e('RuntimeError', /CUDA out of memory|out of memory/, 'Acabou a memória da placa de vídeo', 'Diminua o tamanho do lote (batch size) ou do modelo.', null);
e('RuntimeError', /cannot schedule new futures after (?:interpreter )?shutdown/, 'Tarefa nova depois de fechar', 'O programa estava fechando quando uma tarefa nova foi pedida.', null);
e('RuntimeError', null, 'Erro durante a execução', 'Algo deu errado enquanto o programa rodava. A mensagem original explica o motivo.', null);
e('NotImplementedError', null, 'Parte ainda não implementada', 'Esse método existe só como “molde” e precisa ser escrito (normalmente numa classe filha).', null);
e('StopIteration', null, 'next() sem mais itens', 'O iterador acabou. Use next(iterador, None) para receber None em vez de erro.', ['item = next(iterador)', 'item = next(iterador, None)']);
e('StopAsyncIteration', null, 'Iterador assíncrono acabou', 'Não há mais itens no async for.', null);
e('AssertionError', /^$/, 'Um assert falhou', 'Uma condição que deveria ser verdadeira deu falso. Em testes, o resultado não foi o esperado. Dica: assert x == 5, f"x vale {x}" mostra o valor.', null);
e('AssertionError', null, 'Um assert falhou: $0', 'Uma condição que deveria ser verdadeira deu falso.', null);
e('KeyboardInterrupt', null, 'Programa interrompido', 'Você parou o programa (Ctrl+C ou botão Parar).', null);
e('SystemExit', null, 'O programa pediu para sair', 'sys.exit() ou exit() foram chamados.', null);
e('GeneratorExit', null, 'Gerador fechado', 'O gerador foi fechado antes de terminar.', null);
e('ReferenceError', null, 'Objeto já não existe', 'Uma referência fraca (weakref) aponta para algo que já foi apagado.', null);
e('SystemError', null, 'Erro interno do Python', 'Algo deu errado dentro do próprio Python (ou de uma biblioteca em C). Atualize a biblioteca envolvida.', null);
e('BufferError', null, 'Erro de buffer', 'Uma operação de memória não pôde ser feita.', null);
e('ExceptionGroup|BaseExceptionGroup', null, 'Vários erros ao mesmo tempo', 'Tarefas paralelas (asyncio.TaskGroup) deram erro juntas. Veja cada erro listado com “|” na saída.', null);
e('PythonFinalizationError', null, 'O Python estava fechando', 'Algo tentou rodar enquanto o Python encerrava.', null);
e('ChildProcessError|ProcessLookupError', null, 'Processo não encontrado', 'O processo filho já terminou ou não existe.', null);
e('BlockingIOError|InterruptedError', null, 'Operação interrompida', 'Uma leitura/escrita foi interrompida ou teria que esperar.', null);

// =====================================================================================================
g('Internet e rede');
e('ConnectionRefusedError', null, 'Conexão recusada', 'Não há nenhum servidor escutando nesse endereço/porta. O servidor está ligado? O endereço está certo?', null);
e('ConnectionResetError', null, 'A conexão foi cortada pelo outro lado', 'O servidor fechou a conexão no meio. Tente de novo; se repetir, o servidor pode estar bloqueando.', null);
e('ConnectionAbortedError', null, 'Conexão abortada', 'O seu computador cancelou a conexão (antivírus/firewall ou programa fechado).', null);
e('BrokenPipeError', null, 'O outro lado parou de escutar', 'Você escreveu numa conexão/processo que já fechou.', null);
e('TimeoutError', null, 'Demorou demais (tempo esgotado)', 'O servidor não respondeu a tempo. Confira a internet e aumente o timeout.', null);
e('socket.gaierror', null, 'Endereço não encontrado (sem internet?)', 'Não deu para descobrir o endereço do site. Confira a internet e a grafia do endereço.', null);
e('requests.exceptions.ConnectionError|ConnectionError', /NameResolutionError|getaddrinfo failed|Name or service not known/, 'Site não encontrado (sem internet?)', 'Não deu para achar o endereço. Confira a conexão e a grafia do site.', null);
e('requests.exceptions.ConnectionError|ConnectionError', null, 'Não conseguiu conectar', 'Não deu para falar com o servidor. Confira a internet e o endereço, e use timeout=10 nas requisições.', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(401)\b/, 'Erro 401: precisa de login/chave', 'O site exige autenticação. Confira a chave da API (token) e o cabeçalho Authorization.', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(403)\b/, 'Erro 403: acesso proibido', 'O site recusou. Muitos sites bloqueiam robôs: envie um cabeçalho User-Agent de navegador, ou use a API oficial.', ['requests.get(url)', 'requests.get(url, headers={"User-Agent": "Mozilla/5.0"})']);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(404)\b/, 'Erro 404: página não existe', 'Confira o endereço (URL).', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(429)\b/, 'Erro 429: pedidos demais', 'Você fez muitas requisições seguidas. Espere um pouco entre elas (time.sleep).', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', /\b(5\d\d)\b/, 'Erro $1 no servidor', 'O problema é do lado do site. Tente de novo mais tarde.', null);
e('requests.exceptions.HTTPError|HTTPError|urllib.error.HTTPError', null, 'O site respondeu com erro', 'Veja o número do erro HTTP na mensagem (4xx = pedido errado, 5xx = problema no servidor).', null);
e('requests.exceptions.ReadTimeout|requests.exceptions.ConnectTimeout|requests.exceptions.Timeout|ReadTimeout|ConnectTimeout|Timeout', null, 'O site demorou demais', 'O servidor não respondeu a tempo. Aumente o timeout ou tente mais tarde.', null);
e('requests.exceptions.SSLError|SSLError|ssl.SSLCertVerificationError|SSLCertVerificationError', null, 'Problema com o certificado de segurança (HTTPS)', 'O certificado do site não pôde ser verificado. Pode ser rede da escola/empresa interceptando. Atualize o pacote certifi (pip install -U certifi).', null);
e('requests.exceptions.MissingSchema|MissingSchema', null, 'Endereço sem “https://”', 'O endereço precisa começar com http:// ou https://.', ['requests.get("google.com")', 'requests.get("https://google.com")']);
e('requests.exceptions.InvalidURL|InvalidURL|requests.exceptions.InvalidSchema|InvalidSchema', null, 'Endereço inválido', 'Confira se o endereço tem espaços, aspas sobrando ou caracteres estranhos.', null);
e('requests.exceptions.TooManyRedirects|TooManyRedirects', null, 'Redirecionamentos demais', 'O site ficou mandando para outra página em círculo. Pode exigir login/cookies.', null);
e('requests.exceptions.JSONDecodeError', null, 'A resposta não é JSON', 'O site devolveu outra coisa (normalmente uma página HTML de erro). Veja resposta.status_code e resposta.text antes de .json().', null);
e('urllib.error.URLError|URLError', null, 'Não conseguiu abrir o endereço', 'Sem internet, endereço errado ou problema de certificado.', null);
e('smtplib.SMTPAuthenticationError|SMTPAuthenticationError', null, 'Login do e-mail recusado', 'No Gmail, use uma “senha de app” (com verificação em duas etapas ligada), não a sua senha normal.', null);

// =====================================================================================================
g('Dados: JSON, CSV, banco de dados');
e('json.decoder.JSONDecodeError|JSONDecodeError', /Expecting value: line 1 column 1 \(char 0\)/, 'O texto está vazio ou não é JSON', 'O arquivo/resposta está vazio, ou é HTML (página de erro). Confira o conteúdo antes de converter.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Expecting property name enclosed in double quotes/, 'JSON com aspas simples ou vírgula sobrando', 'JSON só aceita aspas duplas e não aceita vírgula depois do último item.', ["{'nome': 'Ana',}", '{"nome": "Ana"}']);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Extra data/, 'Mais de um JSON no mesmo texto', 'O arquivo tem dois objetos seguidos. Junte numa lista [ ... ] ou leia linha por linha.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Expecting ',' delimiter|Expecting ':' delimiter/, 'Faltou vírgula ou dois-pontos no JSON', 'Confira a linha e coluna indicadas na mensagem.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', /Unterminated string|Invalid control character/, 'Texto quebrado no JSON', 'Tem aspas sem fechar ou uma quebra de linha dentro de um texto.', null);
e('json.decoder.JSONDecodeError|JSONDecodeError', null, 'JSON inválido', 'O texto não está no formato JSON. A mensagem diz a linha e a coluna do problema.', null);
e('csv.Error|_csv.Error', /field larger than field limit/, 'Campo do CSV grande demais', 'Use csv.field_size_limit(10**7) antes de ler.', null);
e('csv.Error|_csv.Error', /line contains NUL/, 'O arquivo não é um CSV de texto', 'Provavelmente é um .xlsx renomeado. Abra com pandas.read_excel.', null);
e('csv.Error|_csv.Error', /iterator should return strings, not bytes/, 'CSV aberto em modo binário', 'Abra com open(arquivo, newline="", encoding="utf-8") — sem "b".', null);
e('csv.Error|_csv.Error', null, 'Erro no CSV', 'O arquivo CSV tem um formato inesperado.', null);
e('pandas.errors.ParserError|ParserError', /Expected (\d+) fields? in line (\d+), saw (\d+)/, 'Separador do CSV errado (linha $2)', 'CSV brasileiro costuma usar ponto e vírgula. Use sep=";" (e decimal="," se os números usam vírgula).', ['pd.read_csv("dados.csv")', 'pd.read_csv("dados.csv", sep=";", decimal=",", encoding="latin-1")']);
e('pandas.errors.ParserError|ParserError', null, 'O pandas não conseguiu ler o arquivo', 'Confira o separador (sep=";"), a codificação (encoding="latin-1") e se é mesmo um CSV.', null);
e('pandas.errors.EmptyDataError|EmptyDataError', null, 'Arquivo vazio', 'O arquivo não tem nenhuma coluna. Confira se é o arquivo certo.', null);
e('sqlite3.OperationalError|OperationalError', /no such table: (\S+)/, 'A tabela $1 não existe', 'Crie a tabela antes (CREATE TABLE IF NOT EXISTS ...). Confira também se está abrindo o arquivo .db certo (caminho relativo cria um banco novo vazio!).', null);
e('sqlite3.OperationalError|OperationalError', /no such column: (\S+)/, 'A coluna $1 não existe', 'Confira o nome da coluna. Se é um texto, ele precisa de aspas — ou melhor, use ? como parâmetro.', ['cur.execute(f"SELECT * FROM alunos WHERE nome = {nome}")', 'cur.execute("SELECT * FROM alunos WHERE nome = ?", (nome,))']);
e('sqlite3.OperationalError|OperationalError', /table (\S+) already exists/, 'A tabela $1 já existe', 'Use CREATE TABLE IF NOT EXISTS.', null);
e('sqlite3.OperationalError|OperationalError', /database is locked/, 'Banco de dados travado', 'Outra conexão (ou o DB Browser) está com o banco aberto. Feche-a e use conexao.commit() / with conexao:.', null);
e('sqlite3.OperationalError|OperationalError', /unable to open database file/, 'Não conseguiu abrir o arquivo do banco', 'A pasta do caminho não existe, ou não há permissão.', null);
e('sqlite3.OperationalError|OperationalError', /near "(.+)": syntax error/, 'Erro de SQL perto de “$1”', 'Confira a consulta SQL: vírgulas, aspas e palavras reservadas.', null);
e('sqlite3.OperationalError|OperationalError', /(\d+) values for (\d+) columns/, 'Quantidade de valores errada', 'O INSERT tem $1 valores para $2 colunas.', null);
e('sqlite3.IntegrityError|IntegrityError', /UNIQUE constraint failed: (\S+)/, 'Valor repetido em $1', 'Essa coluna não aceita repetidos. Confira antes, ou use INSERT OR IGNORE / INSERT OR REPLACE.', null);
e('sqlite3.IntegrityError|IntegrityError', /NOT NULL constraint failed: (\S+)/, '$1 não pode ficar vazio', 'Passe um valor para essa coluna.', null);
e('sqlite3.IntegrityError|IntegrityError', /FOREIGN KEY constraint failed/, 'Referência para registro que não existe', 'A chave estrangeira aponta para algo que não existe na outra tabela.', null);
e('sqlite3.ProgrammingError|ProgrammingError', /Incorrect number of bindings supplied\. The current statement uses (\d+), and there are (\d+) supplied/, 'O SQL tem $1 “?” mas você passou $2 valores', 'Um valor sozinho precisa ser uma tupla com vírgula: (nome,).', ['cur.execute("... WHERE nome = ?", (nome))', 'cur.execute("... WHERE nome = ?", (nome,))']);
e('sqlite3.ProgrammingError|ProgrammingError', /Cannot operate on a closed (database|cursor)/, 'Usou o banco depois de fechar', 'Faça tudo antes de conexao.close().', null);
e('sqlite3.ProgrammingError|sqlite3.InterfaceError|ProgrammingError|InterfaceError', /Error binding parameter|type '(\w+)' is not supported/, 'Tipo de valor que o SQLite não aceita', 'O SQLite guarda texto, número e bytes. Converta listas/dicionários com json.dumps().', null);
e('zipfile.BadZipFile|BadZipFile', null, 'Arquivo zip/xlsx corrompido', 'O arquivo não é um zip válido. Se for .xlsx: ele pode estar aberto no Excel, vazio, ou ser outro formato renomeado.', null);
e('openpyxl.utils.exceptions.InvalidFileException|InvalidFileException', null, 'O openpyxl não lê esse formato', 'O openpyxl só lê .xlsx. Para .xls antigo, salve como .xlsx no Excel.', null);
e('pickle.UnpicklingError|UnpicklingError', null, 'Arquivo pickle inválido', 'O arquivo não foi salvo com pickle ou está corrompido.', null);
e('re.error|re.PatternError|PatternError', /nothing to repeat/, 'Expressão regular: * ou + sem nada antes', 'Para procurar o caractere *, + ou ? literal, use \\* \\+ \\?.', null);
e('re.error|re.PatternError|PatternError', /unterminated character set|missing \)|unbalanced parenthesis|unterminated subpattern/, 'Expressão regular com [ ou ( sem fechar', 'Feche os colchetes/parênteses, ou escape-os com \\.', null);
e('re.error|re.PatternError|PatternError', /bad escape/, 'Expressão regular com \\ inválido', 'Use string crua: r"\\d+".', null);
e('re.error|re.PatternError|PatternError', null, 'Expressão regular inválida', 'Confira a expressão (dica: use r"..." para não ter problemas com \\).', null);
e('zoneinfo._common.ZoneInfoNotFoundError|ZoneInfoNotFoundError', null, 'Fuso horário não encontrado', 'No Windows, instale o pacote tzdata no projeto.', null);
e('locale.Error|Error', /unsupported locale setting/, 'Idioma (locale) não suportado', 'No Windows o nome é diferente: locale.setlocale(locale.LC_ALL, "pt_BR") ou "Portuguese_Brazil.1252".', null);
e('struct.error', null, 'Formato de bytes não bate', 'O tamanho dos bytes não combina com o formato do struct.', null);
e('binascii.Error', /Incorrect padding/, 'Base64 incompleto', 'O texto em base64 está cortado. Confira se veio inteiro.', null);
e('subprocess.CalledProcessError|CalledProcessError', /returned non-zero exit status (\d+)/, 'O comando externo falhou (código $1)', 'O programa chamado com subprocess deu erro. Veja a saída dele (capture_output=True, text=True).', null);
e('subprocess.TimeoutExpired|TimeoutExpired', null, 'O comando externo demorou demais', 'Aumente o timeout ou confira se o comando está esperando uma entrada.', null);

// =====================================================================================================
g('Janelas: Tkinter');
e('_tkinter.TclError|TclError', /image "pyimage\d+" doesn't exist/, 'Imagem de outra janela Tk', 'Você criou mais de um tk.Tk(). Para janelas extras use tk.Toplevel() (o “Abrir outra tela” do PyForge já faz isso).', ['janela2 = tk.Tk()', 'janela2 = tk.Toplevel()']);
e('_tkinter.TclError|TclError', /couldn't recognize data in image file/, 'O Tkinter não abre esse tipo de imagem', 'tk.PhotoImage só abre PNG e GIF. Para JPG, use Pillow: ImageTk.PhotoImage(Image.open("foto.jpg")).', null);
e('_tkinter.TclError|TclError', /couldn't open "(.+)": no such file or directory/, 'Imagem não encontrada: $1', 'Confira o caminho. Use caminho("assets/arquivo.png") no código gerado pelo Designer.', null);
e('_tkinter.TclError|TclError', /cannot use geometry manager (\w+) inside (\S+) which already has slaves managed by (\w+)/, 'Misturou $1 e $3 na mesma janela', 'Dentro do mesmo container use só um: pack OU grid OU place. Use um Frame para separar.', null);
e('_tkinter.TclError|TclError', /invalid command name "?\.!/, 'Mexeu num elemento que já foi fechado', 'A janela/elemento foi destruído, mas um after() ou evento ainda tentou usá-lo. Cancele com after_cancel ao fechar.', null);
e('_tkinter.TclError|TclError', /bad window path name/, 'Janela ou elemento inexistente', 'O elemento já foi destruído (ou nunca foi criado).', null);
e('_tkinter.TclError|TclError', /unknown color name "(.+)"/, 'Cor “$1” não existe', 'Use nomes em inglês ("red", "blue") ou o código "#RRGGBB".', ['bg="vermelho"', 'bg="#E2657A"']);
e('_tkinter.TclError|TclError', /unknown option "-(\w+)"/, 'O elemento não tem a opção “$1”', 'Esse tipo de elemento não aceita essa opção (ex.: ttk não aceita bg/fg; use estilos).', null);
e('_tkinter.TclError|TclError', /expected (integer|floating-point number|boolean value) but got "(.*)"/, 'Esperava $1, veio “$2”', 'Um campo ligado a IntVar/DoubleVar tem texto. Trate com try/except ao ler .get().', null);
e('_tkinter.TclError|TclError', /no display name and no \$DISPLAY/, 'Sem tela para abrir a janela', 'O programa está rodando num lugar sem monitor (servidor).', null);
e('_tkinter.TclError|TclError', null, 'Erro do Tkinter', 'O Tkinter recusou uma operação. A mensagem original diz qual.', null);
e('turtle.Terminator|Terminator', null, 'A janela do turtle foi fechada', 'O desenho ainda estava rodando quando a janela fechou. Normal ao fechar — ou use turtle.done() no fim.', null);

// =====================================================================================================
g('Jogos e imagens: pygame, Pillow, OpenCV');
e('pygame.error', /video system not initialized/, 'pygame usado depois do pygame.quit()', 'O loop continuou depois de fechar. Depois de pygame.quit() saia do programa (sys.exit()) ou do loop com break.', ['for e in pygame.event.get():\n    if e.type == pygame.QUIT:\n        pygame.quit()', 'for e in pygame.event.get():\n    if e.type == pygame.QUIT:\n        rodando = False\n# depois do while:\npygame.quit()']);
e('pygame.error', /No video mode has been set|display Surface quit/, 'Faltou criar a janela do pygame', 'Chame pygame.display.set_mode((800, 600)) antes de desenhar ou de .convert().', null);
e('pygame.error', /(?:Couldn't open|No file '?)(.+?)'? (?:found in working directory|$)|Couldn't open (.+)/, 'Arquivo não encontrado pelo pygame', 'Confira o caminho: use Path(__file__).parent / "imagens" / "nave.png".', null);
e('pygame.error', /Unsupported image format/, 'Formato de imagem não suportado', 'Use PNG ou JPG. Arquivos .webp/.svg podem não funcionar.', null);
e('pygame.error', /font not initialized/, 'Faltou pygame.init()', 'Chame pygame.init() (ou pygame.font.init()) antes de criar fontes.', null);
e('pygame.error', /mixer not initialized|No available audio device|Audio device/, 'Som não disponível', 'Chame pygame.mixer.init() — e confira se há saída de som no computador.', null);
e('pygame.error', null, 'Erro do pygame', 'O pygame recusou uma operação. A mensagem original diz qual.', null);
e('PIL.UnidentifiedImageError|UnidentifiedImageError', null, 'O Pillow não reconheceu a imagem', 'O arquivo não é uma imagem válida (ou está corrompido, ou é .svg/.heic).', null);
e('cv2.error', /!_src\.empty\(\)|ssize\.empty\(\)/, 'A imagem está vazia', 'cv2.imread não conseguiu abrir o arquivo (caminho errado, ou com acento). Confira se a imagem não é None.', null);
e('cv2.error', null, 'Erro do OpenCV', 'O OpenCV recusou a operação. Muitas vezes a imagem não foi carregada.', null);
e('pyautogui.FailSafeException|FailSafeException', null, 'Trava de segurança do pyautogui', 'Você moveu o mouse para o canto da tela: isso para o programa de propósito. É uma proteção!', null);

// =====================================================================================================
g('Janelas: PySide6 / Qt');
e(null, /QWidget: Must construct a QApplication before a QWidget/, 'Faltou o QApplication', 'Crie o app = QApplication(sys.argv) ANTES de qualquer janela ou widget.', ['janela = QWidget()\napp = QApplication(sys.argv)', 'app = QApplication(sys.argv)\njanela = QWidget()']);
e(null, /Could not load the Qt platform plugin "(\w+)"|This application failed to start because no Qt platform plugin/, 'O Qt não conseguiu abrir a janela', 'Reinstale o PySide6 no projeto. Se apareceu no .exe, gere o .exe de novo pelo PyForge.', null);
e(null, /QPixmap::scaled: Pixmap is a null pixmap/, 'Imagem não encontrada (pixmap vazio)', 'O QPixmap não achou o arquivo. Confira o caminho da imagem (use caminho("assets/x.png")).', null);
e(null, /QLayout: Attempting to add QLayout .* which already has a layout/, 'Dois layouts no mesmo widget', 'Cada widget só pode ter um layout principal. Coloque o segundo dentro do primeiro (addLayout).', null);
e(null, /QObject: Cannot create children for a parent that is in a different thread|QObject::setParent: Cannot set parent, new parent is in a different thread|QBasicTimer can only be used with threads started with QThread/, 'Mexeu na janela fora da thread principal', 'Só a thread principal pode mexer nos widgets. Envie o resultado com um Signal (ou use o TrabalhoLento do modelo do PyForge).', null);

// =====================================================================================================
g('Sintaxe (o Python não entendeu o código)');
const S = 'SyntaxError|IndentationError|TabError';
e(S, /expected ':'/, 'Faltou os dois-pontos (:)', 'Toda linha que abre um bloco termina com dois-pontos: if, elif, else, for, while, def, class, try, except, with.', ['if idade >= 18\n    print("adulto")', 'if idade >= 18:\n    print("adulto")']);
e(S, /invalid syntax\. Perhaps you forgot a comma\?/, 'Faltou uma vírgula', 'Entre os itens de uma lista, tupla, dicionário ou argumentos precisa ter vírgula.', ['nomes = ["Ana" "Bia" "Caio"]', 'nomes = ["Ana", "Bia", "Caio"]']);
e(S, /invalid syntax\. Maybe you meant '==' or ':=' instead of '='\?|cannot assign to .* here\. Maybe you meant '==' instead of '='\?|expression cannot contain assignment, perhaps you meant "=="/, 'Use == para comparar', 'Um = guarda valor; dois == comparam.', ['if senha = "1234":', 'if senha == "1234":']);
e(S, /Missing parentheses in call to '(print|exec)'(?:\. Did you mean (.+)\?)?/, '$1 sem parênteses (isso é Python 2)', 'No Python 3, $1 é uma função: use $1(...).', ['print "Olá"', 'print("Olá")']);
e(S, /unexpected indent/, 'Recuo (espaços) inesperado', 'Esta linha tem espaços no começo sem estar dentro de um bloco. Alinhe com a linha de cima.', ['x = 1\n    y = 2', 'x = 1\ny = 2']);
e(S, /unindent does not match any outer indentation level/, 'O recuo não bate com nenhum bloco', 'Os espaços no começo desta linha não alinham com nenhum bloco acima. Use sempre 4 espaços (Formatar documento arruma: Shift+Alt+F).', null);
e(S, /expected an indented block(?: after '(\w+)' statement on line (\d+))?/, 'Faltou o recuo depois do “$1”', 'Depois de uma linha com : a próxima precisa de 4 espaços. Se o bloco ainda está vazio, escreva pass.', ['def jogar():\nprint("oi")', 'def jogar():\n    print("oi")']);
e(S, /inconsistent use of tabs and spaces/, 'Mistura de Tab e espaços', 'Use só espaços. O PyForge converte ao formatar (Shift+Alt+F).', null);
e(S, /unterminated triple-quoted string literal/, 'Texto com """ sem fechar', 'Feche o texto com as mesmas aspas triplas.', null);
e(S, /unterminated string literal|EOL while scanning string literal/, 'Texto (string) sem aspas de fechamento', 'Toda aspa aberta precisa ser fechada na mesma linha. Se o texto tem aspas dentro, use o outro tipo por fora: "Ele disse \'oi\'".', ['print("Olá)', 'print("Olá")']);
e(S, /'(\(|\[|\{)' was never closed/, 'O “$1” foi aberto e nunca fechado', 'Conte os parênteses/colchetes/chaves: cada um que abre precisa fechar. O erro às vezes aparece na linha de BAIXO.', ['print(len(nomes)', 'print(len(nomes))']);
e(S, /unmatched '(\)|\]|\})'/, '“$1” fechando sem ter aberto', 'Tem um fechamento sobrando nesta linha.', null);
e(S, /closing parenthesis '(.)' does not match opening parenthesis '(.)'/, '“$2” fechado com “$1”', 'Cada abertura fecha com o seu par: ( com ), [ com ], { com }.', null);
e(S, /cannot assign to (function call|literal|expression|f-string expression|comparison|conditional expression|attribute here)/, 'Não dá para guardar valor aí', 'Do lado ESQUERDO do = precisa ser um nome de variável. Ao contrário? valor = variavel → variavel = valor.', ['10 = pontos', 'pontos = 10']);
e(S, /'return' outside function/, 'return fora de uma função', 'return só pode ser usado dentro de um def. Confira o recuo da linha.', null);
e(S, /'(break|continue)' (?:outside loop|not properly in loop)/, '$1 fora de um loop', '$1 só pode ser usado dentro de um for ou while. Confira o recuo.', null);
e(S, /'(await|async with|async for)' outside (?:async )?function/, '$1 fora de uma função async', 'Use await só dentro de async def.', null);
e(S, /'yield' outside function/, 'yield fora de uma função', 'yield só pode ser usado dentro de def (geradores).', null);
e(S, /invalid non-printable character U\+00A0/, 'Espaço invisível copiado da internet', 'Este código tem um “espaço não separável” (copiado de site/PDF). Apague e digite os espaços de novo.', null);
e(S, /invalid character '(.)' \(U\+[0-9A-F]+\)/, 'Caractere estranho: “$1”', 'Provavelmente aspas curvas “ ” ou travessão — copiados de Word/site. Troque por aspas normais " e hífen -.', ['print(“Olá”)', 'print("Olá")']);
e(S, /invalid non-printable character/, 'Caractere invisível no código', 'Apague o pedaço copiado e digite de novo.', null);
e(S, /invalid decimal literal/, 'Nome começando com número (ou número colado em letras)', 'Nomes de variáveis não podem começar com número: 1lugar → lugar1. Ou faltou um operador: 2x → 2 * x.', ['2nome = "Ana"', 'nome2 = "Ana"']);
e(S, /leading zeros in decimal integer literals are not permitted/, 'Número com zero na frente', 'Escreva 7, não 07. Para datas/telefones, use texto: "07".', null);
e(S, /invalid (hexadecimal|octal|binary) literal/, 'Número $1 inválido', 'Confira os dígitos depois de 0x/0o/0b.', null);
e(S, /f-string: expecting '\}'|f-string: single '\}' is not allowed|f-string: unmatched|f-string: empty expression/, 'Chaves { } erradas na f-string', 'Dentro da f-string, { abre um valor e } fecha. Para escrever uma chave de verdade, dobre: {{ }}.', ['f"Total: {preco"', 'f"Total: {preco}"']);
e(S, /f-string/, 'Problema dentro de uma f-string', 'Confira as chaves { } e as aspas: dentro de f"..." use aspas simples (ou atualize para Python 3.12+).', null);
e(S, /positional argument follows keyword argument/, 'Argumento sem nome depois de um com nome', 'Os argumentos com nome (x=1) vêm por último.', ['abrir(arquivo="a.txt", "r")', 'abrir("r", arquivo="a.txt")']);
e(S, /(?:non-default argument follows default argument|parameter without a default follows parameter with a default)/, 'Parâmetro sem valor padrão depois de um com padrão', 'No def, os parâmetros com valor padrão (x=0) precisam vir por último.', ['def criar(nome="?", idade):', 'def criar(idade, nome="?"):']);
e(S, /duplicate argument '(.+)' in function definition/, 'Parâmetro “$1” repetido', 'Cada parâmetro precisa de um nome diferente.', null);
e(S, /keyword argument repeated/, 'Argumento repetido na chamada', 'O mesmo nome= aparece duas vezes.', null);
e(S, /expected 'except' or 'finally' block/, 'try sem except', 'Todo try: precisa de um except (ou finally) logo depois, com o mesmo recuo.', ['try:\n    n = int(x)\nprint(n)', 'try:\n    n = int(x)\nexcept ValueError:\n    n = 0']);
e(S, /default 'except:' must be last/, 'except: genérico antes dos específicos', 'Coloque o “except:” (ou except Exception) por último.', null);
e(S, /multiple exception types must be parenthesized/, 'Vários erros no except sem parênteses', 'Escreva except (ValueError, KeyError):', ['except ValueError, KeyError:', 'except (ValueError, KeyError):']);
e(S, /expected 'in'/, 'Faltou o “in” no for', 'O formato é: for item in lista:', ['for i range(10):', 'for i in range(10):']);
e(S, /expected '\('/, 'Faltou o parêntese', 'def e class precisam de ( ) depois do nome: def nome():', ['def jogar:', 'def jogar():']);
e(S, /expected 'else' after 'if' expression/, 'if de uma linha sem else', 'O “x if condição else y” precisa do else.', null);
e(S, /trailing comma not allowed without surrounding parentheses/, 'Vírgula sobrando no import', 'Tire a vírgula do fim ou use parênteses: from x import (a, b,)', null);
e(S, /Generator expression must be parenthesized|did you forget parentheses around the comprehension target/, 'Faltou parênteses na expressão', 'Coloque a parte “x for x in …” entre parênteses, ou os itens entre parênteses.', null);
e(S, /name '(.+)' is (?:used prior to|assigned to before) global declaration/, '“global $1” tem que vir antes', 'Escreva global $1 na primeira linha da função, antes de usar.', null);
e(S, /no binding for nonlocal '(.+)' found/, 'nonlocal sem variável de fora', 'nonlocal só funciona com variáveis de uma função de fora (não do arquivo — para essas, use global).', null);
e(S, /cannot use starred expression here|can't use starred expression here/, '* usado num lugar que não pode', 'O *lista só funciona dentro de chamadas, listas ou desmontagem.', null);
e(S, /'tuple' is an illegal expression for augmented assignment|illegal expression for augmented assignment/, '+= com várias variáveis', 'Faça uma de cada vez: a += 1 e b += 1.', null);
e(S, /cannot delete (function call|literal|expression)/, 'del em algo que não é variável', 'del apaga variáveis, itens (lista[0]) ou atributos.', null);
e(S, /cannot mix bytes and nonbytes literals/, 'Misturou b"..." com texto normal', 'Use só bytes ou só texto.', null);
e(S, /expected expression/, 'Faltou um valor', 'O Python esperava um valor/conta aqui (ex.: x = sem nada depois).', null);
e(S, /Did you mean '(.+)'\?/, 'Você quis dizer “$1”?', 'O Python sugeriu uma correção para esta linha.', null);
e(S, /unexpected EOF while parsing|EOF in multi-line statement/, 'O arquivo terminou no meio de um comando', 'Faltou fechar um parêntese, colchete, chave ou aspas — veja as linhas anteriores.', null);
e(S, /Non-UTF-8 code starting with/, 'O arquivo não está salvo em UTF-8', 'Salve o arquivo com codificação UTF-8 (o editor do PyForge salva sempre em UTF-8).', null);
e(S, /assignment expression cannot be used/, 'Uso inválido de :=', 'O “operador morsa” := não pode ser usado aí.', null);
e(S, /too many statically nested blocks/, 'Blocos aninhados demais', 'Mais de 20 níveis de recuo. Separe em funções.', null);
e(S, /(?:\(|\b)print (?:"|')/, 'print sem parênteses', 'Use print("...") com parênteses.', null);
e(S, /invalid syntax/, 'Sintaxe inválida: o Python não entendeu esta linha', 'Confira: dois-pontos no fim de if/for/def, aspas e parênteses fechados, = vs ==, e palavras do Python escritas certo (elif, não else if).', null);
e(S, null, 'Erro de digitação no código', 'O Python não entendeu a linha. Veja a aba Problemas: ela mostra a explicação exata.', null);
e('IndentationError|TabError', null, 'Problema de recuo (espaços no início da linha)', 'Use sempre 4 espaços por nível. Formatar o documento (Shift+Alt+F) arruma a maioria dos casos.', null);

// =====================================================================================================
g('Avisos (o programa roda, mas tem algo estranho)');
e(null, /SyntaxWarning: invalid escape sequence '(\\.)'/, 'Barra invertida “$1” no texto', 'Em expressões regulares e caminhos do Windows, use string crua: r"...". Isso vira erro em versões futuras do Python.', ['re.search("\\d+", texto)', 're.search(r"\\d+", texto)']);
e(null, /SyntaxWarning: "is" with (?:a|'\w+') literal/, '“is” comparando com valor fixo', 'Use == para comparar valores. “is” compara se é o MESMO objeto.', ['if nome is "Ana":', 'if nome == "Ana":']);
e(null, /SyntaxWarning: '(\w+)' object is not callable; perhaps you missed a comma\?/, 'Faltou vírgula numa lista?', 'Dois valores seguidos sem vírgula viram uma “chamada”.', null);
e(null, /SyntaxWarning: assertion is always true/, 'assert sempre verdadeiro', 'assert (x, "msg") com parênteses é uma tupla, sempre verdadeira. Escreva: assert x, "msg".', null);
e(null, /RuntimeWarning: coroutine '([^']+)' was never awaited/, 'Esqueceu o await em $1()', 'Funções async def só rodam com await (ou asyncio.run).', ['buscar_dados()', 'await buscar_dados()']);
e(null, /RuntimeWarning: (?:invalid value|divide by zero) encountered/, 'Conta inválida no numpy (resultado nan/inf)', 'Houve divisão por zero ou conta impossível. O resultado virou nan/inf.', null);
e(null, /ResourceWarning: unclosed (file|socket)/, '$1 aberto e nunca fechado', 'Use “with open(...) as f:” para fechar sozinho.', null);
e(null, /SettingWithCopyWarning/, 'pandas: mudando uma cópia', 'Use .loc para mudar a tabela original: df.loc[df.a > 1, "b"] = 0.', null);
e(null, /FigureCanvasAgg is non-interactive/, 'O gráfico não pode abrir janela', 'O matplotlib está sem janela. Salve com plt.savefig("grafico.png") ou instale o Tkinter.', null);
e(null, /DeprecationWarning: (.{0,80})/, 'Recurso que vai ser removido', 'Funciona hoje, mas vai sumir numa versão futura: $1', null);
e(null, /FutureWarning: (.{0,80})/, 'O comportamento vai mudar no futuro', 'Uma biblioteca avisou que isso vai funcionar diferente numa versão nova: $1', null);

// =====================================================================================================
g('Ferramentas: pip, uv, PyInstaller, Windows');
e(null, /'python' (?:não é reconhecido|is not recognized)|Python was not found; run without arguments to install from the Microsoft Store/, 'O Windows não achou o Python', 'Fora do PyForge, o comando python não está no PATH. Use o Terminal do PyForge (o ambiente do projeto já vem ativado).', null);
e(null, /No module named pip/, 'O ambiente não tem o pip', 'No PyForge, instale pacotes pelo painel Pacotes (ele usa o uv).', null);
e(null, /(?:Failed building wheel for pygame\b|No matching distribution found for pygame\b|pygame[\s\S]{0,600}(?:Failed to build|metadata-generation-failed|subprocess-exited-with-error))/i, 'O pygame ainda não funciona nesta versão do Python', 'O pygame original demora para sair nas versões novas do Python. Use o pygame-ce: é o mesmo pygame, mantido pela comunidade, e o código continua com “import pygame”. Ou troque o Python do projeto para uma versão anterior.', ['uv add pygame', 'uv add pygame-ce'], 'pygameCe');
e(null, /Could not find a version that satisfies the requirement ([\w.-]+)|No matching distribution found for ([\w.-]+)/, 'Pacote não encontrado: $1', 'O nome está errado, ou o pacote ainda não tem versão para o seu Python (muito comum logo que sai uma versão nova do Python). Confira o nome no pypi.org ou use uma versão anterior do Python no projeto.', null, 'versaoPython');
e(null, /Microsoft Visual C\+\+ 14\.0 or greater is required/, 'O pacote precisa ser compilado', 'Não há versão pronta (wheel) desse pacote para o seu Python. Use uma versão anterior do Python no projeto (ex.: 3.12), ou instale as “Build Tools for Visual Studio”.', null, 'versaoPython');
e(null, /Failed building wheel for ([\w.-]+)|Failed to build ([\w.-]+)|subprocess-exited-with-error/, 'Falhou ao compilar $1', 'O pacote não tem versão pronta para este Python. Tente outra versão do pacote ou do Python.', null, 'versaoPython');
e(null, /No solution found when resolving dependencies|requirements are unsatisfiable/, 'Pacotes com versões incompatíveis', 'Dois pacotes exigem versões que brigam entre si (ou exigem outro Python). Leia a explicação do uv: ela diz qual pacote pede o quê. Tire a versão fixa (==) de um deles.', null);
e(null, /is not a supported wheel on this platform/, 'Pacote para outro sistema', 'O arquivo baixado é para outro sistema/Python (32 × 64 bits, Linux × Windows).', null);
e(null, /Failed to (?:download|fetch)|error sending request|Connection (?:timed out|refused)|dns error/, 'Sem internet para baixar o pacote', 'Confira a conexão (ou proxy/firewall da escola/empresa) e tente de novo.', null);
e(null, /Failed to execute script '?(\w+)'? due to unhandled exception/, 'O .exe deu erro ao abrir', 'O programa compilado deu um erro. Rode o .py no PyForge para ver o erro completo. Se for “No module named”, adicione o pacote ao projeto e gere o .exe de novo.', null);
e(null, /Unable to find "(.+)" when adding binary and data files/, 'Arquivo para incluir no .exe não encontrado', 'A pasta/arquivo $1 não existe. Confira as pastas marcadas no diálogo do .exe.', null);
e(null, /(?:PermissionError|WinError 5|Access is denied|Acesso negado).*(?:dist|\.exe)/, 'O .exe antigo está aberto', 'Feche o .exe que está rodando (ou a pasta dist no Explorer) e gere de novo.', null);
e(null, /EndUpdateResourceW|win32ctypes\.pywin32\.pywintypes\.error/, 'O antivírus travou o .exe', 'O antivírus bloqueou a criação do .exe. Tente de novo, ou adicione a pasta do projeto às exceções.', null);
e(null, /(?:is not a valid ICO|Icon input file .* not found|Something went wrong converting icon)/, 'Ícone inválido para o .exe', 'Use uma imagem .ico (ou .png com o Pillow instalado).', null);
e(null, /reading from stdin while output is captured/, 'O teste importou um arquivo que pede input()', 'Ao importar o seu arquivo, o código principal rodou e chamou input(). Coloque o código principal dentro de if __name__ == "__main__": para ele só rodar quando você executa o arquivo.', ['nome = input("Nome: ")\nprint(f"Oi, {nome}")', 'def main():\n    nome = input("Nome: ")\n    print(f"Oi, {nome}")\n\n\nif __name__ == "__main__":\n    main()']);
e(null, /error during collection|ERROR collecting/, 'Um arquivo de teste nem chegou a rodar', 'O pytest deu erro ao carregar um arquivo de teste (normalmente um import que falhou). Enquanto isso não for arrumado, nenhum teste roda. Veja o erro logo acima na Saída.', null);
e(null, /fixture '(\w+)' not found/, 'pytest: fixture “$1” não existe', 'O teste pede um parâmetro que o pytest não conhece. Crie a fixture com @pytest.fixture ou tire o parâmetro.', null);
e(null, /collected 0 items/, 'pytest não achou nenhum teste', 'Os arquivos precisam se chamar test_*.py e as funções começar com test_.', null);
e(null, /exit code 3221225477|exit status 3221225477|0xC0000005/, 'O programa travou dentro de uma biblioteca (acesso inválido à memória)', 'Uma biblioteca em C caiu. Atualize os pacotes; em Qt, não use widgets depois de fechá-los nem fora da thread principal.', null);
e(null, /exit code 3221225781|0xC0000135/, 'Falta uma DLL do Windows', 'Instale o “Microsoft Visual C++ Redistributable” mais recente.', null);
e(null, /Fatal Python error: init_fs_encoding|ModuleNotFoundError: No module named 'encodings'/, 'Python configurado errado', 'Variáveis PYTHONHOME/PYTHONPATH do Windows estão atrapalhando. Remova-as nas Variáveis de Ambiente.', null);

// =====================================================================================================
// Família de cada erro: se não houver explicação específica, usa a do “pai”.
g('Outras linguagens: JavaScript (Node) e Lua');
e(null, /ReferenceError: (print|input|len|def|True|False|None) is not defined/, 'JavaScript: “$r1” é do Python', 'Esse nome existe no Python, mas não no JavaScript. Para mostrar texto use console.log(); verdadeiro/falso são true/false; vazio é null.', ['print("oi")', 'console.log("oi");']);
e(null, /ReferenceError: (\S+) is not defined/, 'JavaScript: “$r1” não existe', 'Você usou um nome que não foi criado. Confira se escreveu igual (maiúsculas contam) e se declarou com let/const antes.', ['console.log(nome)', 'const nome = "Ana";\nconsole.log(nome);']);
e(null, /TypeError: (\S+) is not a function/, 'JavaScript: “$r1” não é uma função', 'Você tentou chamar com () algo que não é função. Confira o nome do método (ex.: toUpperCase, não toUppercase).', ['"oi".toUppercase()', '"oi".toUpperCase()']);
e(null, /TypeError: Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/, 'JavaScript: leu “$r2” de algo vazio ($r1)', 'A variável antes do ponto está vazia (undefined/null). Confira se o objeto foi criado ou se o índice existe.', ['const lista = [];\nconsole.log(lista[0].nome);', 'const lista = [{ nome: "Ana" }];\nconsole.log(lista[0].nome);']);
e(null, /TypeError: Assignment to constant variable/, 'JavaScript: tentou mudar uma const', 'Variáveis criadas com const não podem receber outro valor. Use let se ela vai mudar.', ['const n = 1;\nn = 2;', 'let n = 1;\nn = 2;']);
e(null, /SyntaxError: Cannot use import statement outside a module/, 'JavaScript: import fora de módulo', 'Para usar import, salve o arquivo como .mjs (ou use require no lugar).', ['import fs from "fs"; // em arquivo .js', '// renomeie para main.mjs\nimport fs from "fs";']);
e(null, /SyntaxError: (Unexpected token.*|Unexpected end of input|missing \) after argument list|Invalid or unexpected token)/, 'JavaScript: erro de escrita', 'O Node não entendeu o código ($r1). Procure parêntese, chave ou aspas faltando perto da linha indicada.', null);
e(null, /Error: Cannot find module '([^']+)'/, 'JavaScript: módulo “$r1” não encontrado', 'O arquivo ou pacote não existe. Para pacotes do npm, rode no terminal: npm install $r1', null);
e(null, /RangeError: Maximum call stack size exceeded/, 'JavaScript: função chamando a si mesma sem parar', 'Uma função recursiva nunca chega no caso de parada. Coloque um if que termina a repetição.', null);
e(null, /lua[\d.]*(?:\.exe)?: .*attempt to call a nil value \((?:global|field|method|local) '([^']+)'\)/, 'Lua: “$r1” não existe (é nil)', 'Você chamou uma função que não foi criada. Confira o nome e se a função foi definida ANTES de ser usada.', ['falar("oi")\nfunction falar(t) print(t) end', 'function falar(t) print(t) end\nfalar("oi")']);
e(null, /attempt to index a nil value \((?:global|field|local|upvalue) '([^']+)'\)/, 'Lua: “$r1” está vazio (nil)', 'Você usou ponto ou [ ] em algo que é nil. Confira se a tabela foi criada: $r1 = {}', ['jogador.vida = 10', 'local jogador = {}\njogador.vida = 10']);
e(null, /attempt to perform arithmetic on a (nil|string|table|boolean) value(?: \((?:global|field|local) '([^']+)'\))?/, 'Lua: conta com um valor $r1', 'Uma conta (+ - * /) recebeu algo que não é número. Use tonumber() para converter texto, e confira se a variável tem valor.', ['local n = io.read()\nprint(n + 1)', 'local n = tonumber(io.read())\nprint(n + 1)']);
e(null, /attempt to (?:add|sub|mul|div|mod|pow|unm|idiv) a '(\w+)' with a '(\w+)'/, 'Lua: conta entre $r1 e $r2', 'Uma conta recebeu algo que não é número. Use tonumber() para converter texto em número.', null);
e(null, /attempt to concatenate a (nil|table|boolean) value(?: \((?:global|field|local) '([^']+)'\))?/, 'Lua: juntou texto com $r1', 'O .. só junta textos e números. Use tostring(x) ou confira se a variável tem valor.', ['print("Vida: " .. vida)', 'local vida = 10\nprint("Vida: " .. tostring(vida))']);
e(null, /attempt to compare (\w+) with (\w+)/, 'Lua: comparou $r1 com $r2', 'Só dá para comparar com < > coisas do mesmo tipo. Converta com tonumber() antes.', null);
e(null, /lua[\d.]*(?:\.exe)?: .*:\d+: (?:'[^']+' expected|unexpected symbol|'=' expected|unfinished string)/, 'Lua: erro de escrita', 'O Lua não entendeu o código. Confira se todo if/for/function tem o seu end e se as aspas fecham.', ['if x > 1 then\n  print(x)', 'if x > 1 then\n  print(x)\nend']);

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
  str: 'texto (str)', int: 'número inteiro (int)', float: 'número decimal (float)', bool: 'True/False (bool)', list: 'lista', dict: 'dicionário', tuple: 'tupla', set: 'conjunto (set)',
  NoneType: 'None (vazio)', function: 'função', method: 'método', builtin_function_or_method: 'função', module: 'módulo', type: 'classe', bytes: 'bytes', range: 'range',
  generator: 'gerador', dict_keys: 'dict.keys()', dict_values: 'dict.values()', dict_items: 'dict.items()', map: 'map()', filter: 'filter()', zip: 'zip()', complex: 'número complexo',
};
