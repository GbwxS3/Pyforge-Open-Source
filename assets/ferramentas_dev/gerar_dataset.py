"""Gera assets/kit/dataset_base.jsonl: exemplos de conversa para treinar a PyForge IA.

Cada linha: {"messages": [{"role": "user", ...}, {"role": "assistant", ...}]}
O notebook do kit acrescenta o prompt de sistema (prompt_sistema.md) na hora de treinar.
Rode:  python ferramentas_dev/gerar_dataset.py
"""
import json
import random
from pathlib import Path

random.seed(7)
SAIDA = Path(__file__).resolve().parent.parent / "assets" / "kit" / "dataset_base.jsonl"
exemplos = []


def add(pergunta, resposta):
    exemplos.append({"messages": [{"role": "user", "content": pergunta.strip()}, {"role": "assistant", "content": resposta.strip()}]})


def bloco(codigo, lang="python"):
    return f"```{lang}\n{codigo.strip()}\n```"


# ---------------------------------------------------------------- A. conceitos
CONCEITOS = [
    ("variável", "Uma **variável** é um nome que guarda um valor, como uma etiqueta colada numa caixa. Você cria uma variável só de dar um valor para ela com `=`.",
     'nome = "Ana"\nidade = 15\nprint(nome, "tem", idade, "anos")', "Em Python você não precisa dizer o tipo: ele descobre sozinho pelo valor."),
    ("lista", "Uma **lista** guarda vários valores em ordem, dentro de colchetes `[]`. Dá para adicionar, tirar e mudar itens.",
     'frutas = ["maçã", "banana"]\nfrutas.append("uva")\nprint(frutas[0])   # maçã (a contagem começa em 0)\nprint(len(frutas)) # 3', "Lembre: a primeira posição é a 0, não a 1."),
    ("dicionário", "Um **dicionário** guarda pares de **chave e valor**, como uma agenda: você procura pelo nome (chave) e acha o telefone (valor).",
     'aluno = {"nome": "Bruno", "nota": 8.5}\nprint(aluno["nome"])\naluno["nota"] = 9\nprint(aluno.get("idade", "sem idade"))', "Use `.get()` quando a chave pode não existir: ele não dá erro."),
    ("tupla", "Uma **tupla** é parecida com a lista, mas **não pode ser mudada** depois de criada. Usa parênteses `()`.",
     "ponto = (10, 20)\nx, y = ponto\nprint(x, y)", "Use tupla para dados que andam juntos e não mudam, como coordenadas."),
    ("conjunto (set)", "Um **set** é uma coleção **sem repetição** e sem ordem. É ótimo para tirar duplicados e testar se algo existe rapidinho.",
     "numeros = [1, 2, 2, 3, 3, 3]\nunicos = set(numeros)\nprint(unicos)      # {1, 2, 3}\nprint(2 in unicos) # True", "Para guardar a ordem e tirar repetidos: `list(dict.fromkeys(lista))`."),
    ("if / elif / else", "O **if** decide o que fazer conforme uma condição. `elif` testa outra condição e `else` pega o resto.",
     'nota = 7\nif nota >= 7:\n    print("Aprovado")\nelif nota >= 5:\n    print("Recuperação")\nelse:\n    print("Reprovado")', "O bloco de cada condição é marcado pelo recuo de 4 espaços."),
    ("for", "O **for** repete um bloco para cada item de uma sequência (lista, texto, `range`...).",
     'for i in range(3):\n    print("Volta", i)\n\nfor letra in "oi":\n    print(letra)', "`range(3)` gera 0, 1 e 2 (para antes do 3)."),
    ("while", "O **while** repete enquanto a condição for verdadeira. Cuidado para a condição mudar, senão o loop nunca acaba.",
     "contador = 3\nwhile contador > 0:\n    print(contador)\n    contador -= 1\nprint(\"Fogo!\")", "Use `break` para sair do loop antes da hora."),
    ("função", "Uma **função** é um bloco de código com nome, que você pode chamar várias vezes. Cria com `def` e devolve resultado com `return`.",
     'def dobro(numero):\n    return numero * 2\n\nprint(dobro(5))  # 10', "Funções deixam o código organizado e evitam repetição."),
    ("return", "O **return** devolve um valor para quem chamou a função e encerra a função na hora. Sem `return`, a função devolve `None`.",
     "def soma(a, b):\n    return a + b\n\nresultado = soma(2, 3)\nprint(resultado)", "`print` só mostra na tela; `return` entrega o valor para você usar depois."),
    ("argumentos padrão", "Um **argumento padrão** é um valor usado quando a pessoa não passa aquele argumento.",
     'def saudar(nome, saudacao="Olá"):\n    print(f"{saudacao}, {nome}!")\n\nsaudar("Ana")\nsaudar("Ana", "Bom dia")', "Nunca use lista ou dicionário como valor padrão: use `None` e crie dentro da função."),
    ("*args e **kwargs", "`*args` recebe **qualquer quantidade** de argumentos em uma tupla; `**kwargs` recebe argumentos com nome em um dicionário.",
     'def somar(*numeros):\n    return sum(numeros)\n\ndef mostrar(**dados):\n    for chave, valor in dados.items():\n        print(chave, "=", valor)\n\nprint(somar(1, 2, 3))\nmostrar(nome="Ana", idade=15)', "Os nomes `args` e `kwargs` são só costume; o que importa são os `*` e `**`."),
    ("f-string", "Uma **f-string** é um texto com `f` antes das aspas, onde você coloca valores dentro de `{}`.",
     'nome = "Carla"\npreco = 9.5\nprint(f"{nome} pagou R$ {preco:.2f}")', "`:.2f` mostra o número com 2 casas decimais."),
    ("classe", "Uma **classe** é um molde para criar objetos que juntam dados (atributos) e ações (métodos).",
     'class Cachorro:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def latir(self):\n        print(f"{self.nome}: Au au!")\n\nrex = Cachorro("Rex")\nrex.latir()', "`__init__` roda quando o objeto é criado; `self` é o próprio objeto."),
    ("self", "O **self** é o próprio objeto dentro dos métodos da classe. É por ele que um método acessa os dados do objeto.",
     "class Conta:\n    def __init__(self, saldo):\n        self.saldo = saldo\n\n    def depositar(self, valor):\n        self.saldo += valor", "O Python passa o `self` sozinho: você chama `conta.depositar(10)`, sem passar o self."),
    ("herança", "**Herança** é quando uma classe aproveita tudo de outra e só acrescenta ou muda o que precisa.",
     'class Animal:\n    def falar(self):\n        print("...")\n\nclass Gato(Animal):\n    def falar(self):\n        print("Miau")\n\nGato().falar()', "Use `super()` para chamar o método da classe mãe."),
    ("try / except", "O **try/except** trata erros: se algo der errado no `try`, o Python pula para o `except` em vez de fechar o programa.",
     'try:\n    numero = int(input("Número: "))\nexcept ValueError:\n    print("Isso não é um número!")', "Pegue só o erro que você espera (`ValueError`), nunca um `except:` vazio."),
    ("with open (arquivos)", "O **with open** abre um arquivo e fecha sozinho no fim, mesmo se der erro.",
     'with open("notas.txt", "w", encoding="utf-8") as arquivo:\n    arquivo.write("Olá!\\n")\n\nwith open("notas.txt", encoding="utf-8") as arquivo:\n    print(arquivo.read())', 'Sempre passe `encoding="utf-8"` para acentos funcionarem em qualquer PC.'),
    ("pathlib", "O **pathlib** trabalha com caminhos de arquivos de um jeito moderno, que funciona no Windows, Linux e Mac.",
     'from pathlib import Path\n\npasta = Path("dados")\npasta.mkdir(exist_ok=True)\narquivo = pasta / "lista.txt"\narquivo.write_text("oi", encoding="utf-8")\nprint(arquivo.exists())', "O operador `/` junta pedaços de caminho sem você se preocupar com `\\` ou `/`."),
    ("list comprehension", "Uma **list comprehension** cria uma lista nova numa linha só, a partir de outra.",
     "numeros = [1, 2, 3, 4]\nquadrados = [n * n for n in numeros]\npares = [n for n in numeros if n % 2 == 0]\nprint(quadrados, pares)", "Se ficar difícil de ler, volte para um `for` normal."),
    ("módulo e import", "Um **módulo** é um arquivo `.py` com funções que você pode usar em outro arquivo com `import`.",
     "import math\nfrom random import randint\n\nprint(math.sqrt(16))\nprint(randint(1, 6))", "Não dê ao seu arquivo o nome de um módulo (ex.: `random.py`), senão o import pega o seu arquivo."),
    ("if __name__ == \"__main__\"", 'Esse `if` faz um código rodar **só quando você executa o arquivo direto**, e não quando ele é importado por outro.',
     'def principal():\n    print("Rodando!")\n\nif __name__ == "__main__":\n    principal()', "Assim seus arquivos viram ao mesmo tempo programa e biblioteca."),
    ("None", "**None** quer dizer \"nada\", \"sem valor\". Funções sem `return` devolvem `None`.",
     "resultado = print(\"oi\")\nprint(resultado)  # None\nif resultado is None:\n    print(\"Não tinha valor\")", "Compare com `is None`, não com `== None`."),
    ("tipos (type hints)", "**Type hints** são anotações que dizem o tipo esperado. O Python não obriga, mas o editor usa para avisar erros.",
     "def media(notas: list[float]) -> float:\n    return sum(notas) / len(notas)", "Eles deixam o código mais fácil de entender e o autocompletar mais esperto."),
    ("lambda", "Uma **lambda** é uma função pequena, sem nome, escrita numa linha.",
     'pessoas = [("Ana", 30), ("Bia", 25)]\npessoas.sort(key=lambda p: p[1])\nprint(pessoas)', "Use lambda só para coisas curtas; se crescer, use `def`."),
    ("enumerate", "O **enumerate** dá a posição e o item ao mesmo tempo dentro de um `for`.",
     'for i, nome in enumerate(["Ana", "Bia"], start=1):\n    print(i, nome)', "Bem melhor que `for i in range(len(lista))`."),
    ("zip", "O **zip** percorre duas (ou mais) listas juntas, item com item.",
     'nomes = ["Ana", "Bia"]\nnotas = [9, 7]\nfor nome, nota in zip(nomes, notas):\n    print(nome, nota)', "Ele para na lista mais curta."),
    ("ambiente virtual (.venv)", "Um **ambiente virtual** é uma pasta com um Python só do projeto, para os pacotes de um projeto não brigarem com os de outro. No PyForge, cada projeto já tem o seu `.venv`, criado pelo uv.",
     "uv add requests\nuv run main.py", "No PyForge você nem precisa ativar nada: F5 já roda dentro do ambiente certo."),
    ("pacote / pip / uv", "Um **pacote** é código pronto feito por outras pessoas (ex.: `requests`, `pygame`). No PyForge você instala pelo painel Pacotes ou com `uv add nome` no terminal.",
     "uv add requests", "O pacote fica registrado no `pyproject.toml`, então outra pessoa consegue rodar o projeto igualzinho."),
    ("decorador", "Um **decorador** é uma função que \"embrulha\" outra para acrescentar comportamento, usando `@` em cima do `def`.",
     'import time\n\ndef cronometro(funcao):\n    def embrulho(*args, **kwargs):\n        inicio = time.perf_counter()\n        resultado = funcao(*args, **kwargs)\n        print(f"Levou {time.perf_counter() - inicio:.3f}s")\n        return resultado\n    return embrulho\n\n@cronometro\ndef trabalhar():\n    time.sleep(0.2)\n\ntrabalhar()', "Decoradores aparecem muito em frameworks como Flask e FastAPI."),
    ("gerador (yield)", "Um **gerador** produz valores um de cada vez com `yield`, sem guardar tudo na memória.",
     "def contar_ate(n):\n    for i in range(1, n + 1):\n        yield i\n\nfor numero in contar_ate(3):\n    print(numero)", "Ótimo para arquivos grandes: você lê linha por linha."),
    ("dataclass", "Uma **dataclass** cria classes que só guardam dados, sem escrever `__init__` na mão.",
     'from dataclasses import dataclass\n\n@dataclass\nclass Produto:\n    nome: str\n    preco: float\n\np = Produto("Caneta", 2.5)\nprint(p)', "Ela já cria `__init__`, `__repr__` e `__eq__` para você."),
    ("json", "O módulo **json** transforma dicionários e listas em texto JSON e volta, ótimo para salvar dados.",
     'import json\n\ndados = {"nome": "Ana", "pontos": 10}\nwith open("save.json", "w", encoding="utf-8") as f:\n    json.dump(dados, f, ensure_ascii=False, indent=2)\n\nwith open("save.json", encoding="utf-8") as f:\n    print(json.load(f))', "`ensure_ascii=False` mantém os acentos legíveis."),
    ("random", "O módulo **random** sorteia números e itens.",
     'import random\n\nprint(random.randint(1, 10))\nprint(random.choice(["pedra", "papel", "tesoura"]))', "Para senhas e segurança use o módulo `secrets`, não o `random`."),
    ("datetime", "O **datetime** trabalha com datas e horas.",
     'from datetime import datetime, timedelta\n\nagora = datetime.now()\nprint(agora.strftime("%d/%m/%Y %H:%M"))\nprint(agora + timedelta(days=7))', "`%d/%m/%Y` é o formato brasileiro de data."),
    ("input", "O **input** pede um texto para quem está usando o programa. Ele sempre devolve **texto**, então converta quando precisar de número.",
     'nome = input("Seu nome: ")\nidade = int(input("Sua idade: "))\nprint(f"{nome} faz {idade + 1} no ano que vem")', "Se a pessoa digitar algo que não é número, `int()` dá `ValueError`: trate com try/except."),
    ("escopo de variável", "**Escopo** é onde uma variável existe. Variáveis criadas dentro de uma função só existem lá dentro.",
     'def f():\n    dentro = 1\n    return dentro\n\nprint(f())\n# print(dentro)  -> NameError: só existe dentro da função', "Prefira devolver valores com `return` a usar `global`."),
    ("recursão", "**Recursão** é quando uma função chama a si mesma, resolvendo um pedaço menor do problema a cada vez.",
     "def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)\n\nprint(fatorial(5))  # 120", "Sempre tenha um caso de parada (`if n <= 1`), senão dá `RecursionError`."),
    ("== e is", "`==` compara se os **valores** são iguais; `is` compara se é **o mesmo objeto**.",
     "a = [1, 2]\nb = [1, 2]\nprint(a == b)  # True: mesmo conteúdo\nprint(a is b)  # False: são duas listas diferentes", "Use `is` só com `None`, `True` e `False`."),
    ("cópia de lista", "Fazer `b = a` com listas **não copia**: as duas variáveis apontam para a mesma lista.",
     "a = [1, 2]\nb = a\nb.append(3)\nprint(a)  # [1, 2, 3] - mudou as duas!\n\nc = a.copy()\nc.append(4)\nprint(a)  # [1, 2, 3] - agora não mudou", "Para listas dentro de listas use `copy.deepcopy()`."),
    ("thread em janela", "Quando uma janela (PySide6 ou Tkinter) faz uma tarefa demorada na mesma thread, ela **trava** e aparece \"Não respondendo\". A saída é rodar o trabalho em outra thread.",
     'import threading\nimport tkinter as tk\n\ndef trabalho_pesado():\n    import time\n    time.sleep(3)\n    janela.after(0, lambda: rotulo.config(text="Pronto!"))\n\njanela = tk.Tk()\nrotulo = tk.Label(janela, text="Trabalhando...")\nrotulo.pack(padx=20, pady=20)\nthreading.Thread(target=trabalho_pesado, daemon=True).start()\njanela.mainloop()', "No Tkinter, só mexa na tela pela thread principal: use `after()` para voltar para ela."),
    ("PySide6", "O **PySide6** é a biblioteca oficial do Qt para Python: faz janelas modernas e bonitas, e é gratuita para apps comerciais (LGPL).",
     'import sys\nfrom PySide6.QtWidgets import QApplication, QPushButton\n\napp = QApplication(sys.argv)\nbotao = QPushButton("Clique em mim")\nbotao.clicked.connect(lambda: print("Clicou!"))\nbotao.show()\nsys.exit(app.exec())', "No PyForge, o Designer gera telas PySide6 prontas para você."),
    ("Tkinter", "O **Tkinter** já vem com o Python e é o jeito mais simples de fazer janelas.",
     'import tkinter as tk\n\njanela = tk.Tk()\njanela.title("Olá")\ntk.Label(janela, text="Oi, mundo!").pack(padx=30, pady=30)\njanela.mainloop()', "Para visual mais moderno, use `ttk` ou o PySide6."),
    ("teste com pytest", "Um **teste** é um código que confere se outro código funciona. Com o pytest, toda função que começa com `test_` vira um teste.",
     "# arquivo: test_contas.py\nfrom contas import soma\n\ndef test_soma():\n    assert soma(2, 3) == 5", "No PyForge, abra o painel Testes e clique em Rodar."),
]

PERGUNTAS_CONCEITO = ["O que é {c} em Python?", "Me explica {c} com um exemplo", "Como funciona {c}?", "nao entendi {c}, pode explicar de um jeito simples?"]
for nome, explica, codigo, dica in CONCEITOS:
    for modelo in random.sample(PERGUNTAS_CONCEITO, 2):
        add(modelo.format(c=nome), f"{explica}\n\n{bloco(codigo, 'terminal' if nome.startswith(('ambiente', 'pacote')) else 'python')}\n\n**Dica:** {dica}")

# ---------------------------------------------------------------- B. erros
ERROS = [
    ('nome = "Ana"\nprint(nmoe)', 'NameError: name \'nmoe\' is not defined',
     "O Python não conhece o nome `nmoe`. É um **erro de digitação**: a variável se chama `nome`.", 'nome = "Ana"\nprint(nome)'),
    ('idade = 15\nprint("Tenho " + idade + " anos")', 'TypeError: can only concatenate str (not "int") to str',
     "Você tentou **juntar texto com número** usando `+`. O Python não converte sozinho.", 'idade = 15\nprint(f"Tenho {idade} anos")'),
    ('def ola():\nprint("oi")', 'IndentationError: expected an indented block after function definition on line 1',
     "Depois do `def` (e de `if`, `for`, `while`...) o bloco precisa de **recuo de 4 espaços**.", 'def ola():\n    print("oi")'),
    ("numeros = [10, 20, 30]\nprint(numeros[3])", "IndexError: list index out of range",
     "A lista tem 3 itens, nas posições **0, 1 e 2**. A posição 3 não existe.", "numeros = [10, 20, 30]\nprint(numeros[2])   # último item\nprint(numeros[-1])  # também é o último"),
    ('pessoa = {"nome": "Bia"}\nprint(pessoa["idade"])', "KeyError: 'idade'",
     "A chave `\"idade\"` **não existe** no dicionário.", 'pessoa = {"nome": "Bia"}\nprint(pessoa.get("idade", "idade não informada"))'),
    ('texto = None\nprint(texto.upper())', "AttributeError: 'NoneType' object has no attribute 'upper'",
     "A variável vale `None` (nada), e `None` não tem `.upper()`. Muitas vezes isso vem de uma função **sem `return`**.", 'texto = "olá"\nif texto is not None:\n    print(texto.upper())'),
    ("import requests", "ModuleNotFoundError: No module named 'requests'",
     "O pacote `requests` **não está instalado** no ambiente do projeto.", "uv add requests"),
    ('idade = int(input("Idade: "))', "ValueError: invalid literal for int() with base 10: 'quinze'",
     "A pessoa digitou `quinze`, e `int()` só converte texto com **algarismos**.", 'while True:\n    try:\n        idade = int(input("Idade: "))\n        break\n    except ValueError:\n        print("Digite só números, por favor.")'),
    ("media = 10 / 0", "ZeroDivisionError: division by zero",
     "Dividir por **zero** não existe na matemática, e o Python avisa com esse erro.", "total = 10\nquantidade = 0\nmedia = total / quantidade if quantidade else 0\nprint(media)"),
    ("def contar(n):\n    return contar(n - 1)\n\ncontar(5)", "RecursionError: maximum recursion depth exceeded",
     "A função chama a si mesma **para sempre**, porque não tem um caso de parada.", "def contar(n):\n    if n <= 0:\n        return\n    print(n)\n    contar(n - 1)\n\ncontar(5)"),
    ('if x = 5:\n    print("cinco")', "SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?",
     "Para **comparar** se usa `==`. Um `=` só serve para **guardar** valor.", 'x = 5\nif x == 5:\n    print("cinco")'),
    ('print("oi)', "SyntaxError: unterminated string literal (detected at line 1)",
     "Faltou **fechar as aspas** do texto.", 'print("oi")'),
    ("numeros = [1, 2, 3\nprint(numeros)", "SyntaxError: '[' was never closed",
     "Faltou **fechar o colchete** `]` da lista.", "numeros = [1, 2, 3]\nprint(numeros)"),
    ('with open("dados.txt") as f:\n    print(f.read())', "FileNotFoundError: [Errno 2] No such file or directory: 'dados.txt'",
     "O arquivo não foi encontrado **na pasta onde o programa está rodando**. Ou ele não existe, ou está em outra pasta.",
     'from pathlib import Path\n\narquivo = Path(__file__).parent / "dados.txt"\nif arquivo.exists():\n    print(arquivo.read_text(encoding="utf-8"))\nelse:\n    print("Crie o arquivo dados.txt na pasta do projeto.")'),
    ('with open("notas.txt") as f:\n    texto = f.read()', "UnicodeDecodeError: 'charmap' codec can't decode byte 0x81 in position 12",
     'O arquivo tem acentos, e o Windows tentou ler com outra codificação. Passe `encoding="utf-8"`.', 'with open("notas.txt", encoding="utf-8") as f:\n    texto = f.read()'),
    ('def soma(a, b):\n    return a + b\n\nsoma(1)', "TypeError: soma() missing 1 required positional argument: 'b'",
     "A função pede **dois** argumentos (`a` e `b`), mas você passou só um.", "def soma(a, b):\n    return a + b\n\nprint(soma(1, 2))"),
    ("x = 5\nx()", "TypeError: 'int' object is not callable",
     "Você colocou `()` depois de um número, como se fosse função. Muitas vezes acontece quando uma variável tem o mesmo nome de uma função (ex.: `sum = 5` e depois `sum(lista)`).", "total = 5\nprint(sum([1, 2, 3]))"),
    ('lista = [1, 2, 3]\nfor item in lista:\n    if item == 2:\n        lista.remove(item)\nprint(lista)', "(sem erro, mas o resultado sai estranho)",
     "Mudar uma lista **enquanto percorre ela** faz o `for` pular itens.", "lista = [1, 2, 3]\nlista = [item for item in lista if item != 2]\nprint(lista)"),
    ('def adicionar(item, lista=[]):\n    lista.append(item)\n    return lista\n\nprint(adicionar(1))\nprint(adicionar(2))  # [1, 2] ?!', "(sem erro, mas a lista guarda coisa velha)",
     "O valor padrão `[]` é criado **uma vez só** e reaproveitado em todas as chamadas.", "def adicionar(item, lista=None):\n    if lista is None:\n        lista = []\n    lista.append(item)\n    return lista"),
    ('total = 0.1 + 0.2\nprint(total == 0.3)  # False', "(sem erro, mas dá False)",
     "Números com vírgula (float) são guardados de forma aproximada no computador, então `0.1 + 0.2` vira `0.30000000000000004`.", "import math\nprint(math.isclose(0.1 + 0.2, 0.3))  # True\n\nfrom decimal import Decimal\nprint(Decimal(\"0.1\") + Decimal(\"0.2\"))  # 0.3 exato, bom para dinheiro"),
    ('import random\nprint(random.randint(1, 6))', "AttributeError: partially initialized module 'random' has no attribute 'randint' (most likely due to a circular import)",
     "Seu arquivo se chama **`random.py`**, o mesmo nome do módulo do Python. O `import random` importou o seu próprio arquivo!", "# Renomeie o seu arquivo para sorteio.py (por exemplo)\nimport random\nprint(random.randint(1, 6))"),
    ('contador = 0\ndef somar():\n    contador += 1\nsomar()', "UnboundLocalError: cannot access local variable 'contador' where it is not associated with a value",
     "Dentro da função, `contador += 1` tenta mudar uma variável que é **de fora**. O jeito limpo é receber e devolver o valor.", "def somar(contador):\n    return contador + 1\n\ncontador = 0\ncontador = somar(contador)\nprint(contador)"),
    ('nome = input("Nome: ")\nif nome == "ana":\n    print("Oi Ana")', "(não entra no if quando digito Ana)",
     "A comparação diferencia **maiúsculas e minúsculas**: `\"Ana\"` é diferente de `\"ana\"`.", 'nome = input("Nome: ").strip()\nif nome.lower() == "ana":\n    print("Oi Ana")'),
    ('numero = input("Número: ")\nprint(numero * 2)', "(digitei 5 e saiu 55)",
     "O `input` devolve **texto**, e texto vezes 2 repete o texto. Converta para número.", 'numero = int(input("Número: "))\nprint(numero * 2)'),
    ('from PySide6.QtWidgets import QLabel\nrotulo = QLabel("oi")', "QWidget: Must construct a QApplication before a QWidget",
     "No Qt, você precisa criar o `QApplication` **antes** de qualquer widget.", 'import sys\nfrom PySide6.QtWidgets import QApplication, QLabel\n\napp = QApplication(sys.argv)\nrotulo = QLabel("oi")\nrotulo.show()\nsys.exit(app.exec())'),
]
PEDIDOS_ERRO = ["deu esse erro:\n{tb}", "por que da {tb}", "meu codigo:\n```python\n{cod}\n```\nerro: {tb}", "o que significa {tb}?"]
for cod, tb, explica, conserto in ERROS:
    for modelo in random.sample(PEDIDOS_ERRO, 2):
        lang = "terminal" if conserto.startswith("uv ") else "python"
        corpo = f"{explica}\n\nO jeito certo:\n\n{bloco(conserto, lang)}"
        if "sem erro" not in tb and "não entra" not in tb and "digitei" not in tb:
            corpo = f"Esse erro (`{tb.split(':')[0]}`) quer dizer: " + corpo[0].lower() + corpo[1:]
        add(modelo.format(tb=tb, cod=cod), corpo)

# ---------------------------------------------------------------- C. PyForge
PYFORGE = [
    ("como rodo meu programa no pyforge?", "Aperte **F5** (ou o botão ▶ Rodar lá em cima). O PyForge roda o arquivo aberto dentro do ambiente do projeto e mostra a saída no painel de baixo. Se o programa usar `input()`, digite a resposta na caixa que aparece no painel."),
    ("como instalo um pacote?", "Abra o painel **Pacotes** e procure o nome, ou digite no terminal:\n\n" + bloco("uv add nome-do-pacote", "terminal") + "\n\nO pacote vai para o `.venv` do projeto e fica anotado no `pyproject.toml`."),
    ("como transformo meu programa em .exe?", "Clique em **Gerar .exe** (no Editor ou no Designer). Escolha **qual arquivo** vira o programa (as telas do Designer aparecem com ★), deixe marcado \"Um arquivo .exe só\" e clique em Gerar. Ele fica na pasta `dist` do projeto. A primeira vez demora alguns minutos."),
    ("meu exe abriu o jogo pygame em vez da minha tela", "Isso acontece quando o arquivo escolhido foi o `main.py` (que no modelo de jogo é um jogo pygame). Gere de novo e, na lista **\"Qual arquivo vira o .exe?\"**, escolha a sua tela marcada com ★."),
    ("o antivirus disse que meu exe é virus", "É um **alarme falso** comum: programas novos sem assinatura digital, feitos com PyInstaller, às vezes são marcados. Você pode:\n\n- gerar de novo **desmarcando** \"Um arquivo .exe só\" (costuma ser menos acusado);\n- liberar em Segurança do Windows › Histórico de proteção › Permitir;\n- avisar a Microsoft que é alarme falso."),
    ("onde escrevo o que o botão faz no designer?", "No arquivo **`<nome da tela>.py`** (por exemplo `principal.py`). O Designer cria lá um método para cada evento, tipo `ao_clicar_ok`. Escreva o código dentro dele:\n\n" + bloco('def ao_clicar_ok(self):\n    nome = self.campo_nome.text()\n    self.titulo.setText(f"Olá, {nome}!")') + "\n\nNão mexa no `ui/<nome>_ui.py`: ele é refeito toda vez que você salva a tela."),
    ("como pego o texto de um campo na tela do designer?", "Depende do toolkit:\n\n- **PySide6**: `self.campo_nome.text()`\n- **Tkinter**: `self.campo_nome_texto.get()`\n\nO nome (`campo_nome`) é o que aparece no painel Propriedades › Nome no código."),
    ("como mudo o texto de um rotulo pelo codigo?", "No **PySide6**: `self.titulo.setText(\"Novo texto\")`.\nNo **Tkinter**: `self.titulo.config(text=\"Novo texto\")`."),
    ("como escondo um elemento da tela?", "Use os métodos que o Designer já cria:\n\n" + bloco("self.esconder(self.botao_ok)\nself.mostrar(self.botao_ok)") + "\n\nPara começar escondido, desligue \"Visível ao abrir\" nas propriedades do elemento."),
    ("como movo a tela no designer?", "Segure **Espaço** e arraste, ou arraste com o **botão do meio** do mouse. Para dar zoom, use **Ctrl + roda**. **Shift + 1** enquadra tudo na tela. Aperte **?** para ver todos os atalhos."),
    ("pra que serve as restrições no designer?", "As **restrições** dizem o que cada elemento faz quando a janela muda de tamanho:\n\n- **Esquerda/Topo**: fica parado no lugar;\n- **Direita/Base**: acompanha a borda direita ou de baixo;\n- **Esquerda e direita**: estica junto com a janela (ótimo para campos);\n- **Centro**: fica sempre no meio;\n- **Escala**: cresce proporcionalmente.\n\nPuxe o canto da janela no Designer para testar."),
    ("o que é o painel problemas?", "É onde o PyForge mostra os avisos do seu código antes mesmo de rodar: erros de digitação, imports sem uso, variáveis esquecidas e armadilhas comuns do Python (os códigos **PF001 a PF023**), sempre explicados em português. Clique num item para ir até a linha."),
    ("como faço teste no pyforge?", "Crie um arquivo que começa com `test_`, escreva funções `test_...` com `assert` e clique em **Rodar** no painel **Testes**:\n\n" + bloco("from main import dobro\n\ndef test_dobro():\n    assert dobro(4) == 8")),
    ("como salvo meu projeto no git?", "Abra o painel **Git**, escreva uma mensagem curta do que mudou (ex.: \"Adiciona tela de login\") e clique em **Salvar versão**. Assim dá para voltar no tempo se algo quebrar."),
    ("que python o pyforge usa?", "Cada projeto tem o **próprio Python**, baixado e gerenciado pelo uv dentro da pasta `.venv`. Você não precisa instalar Python no Windows, e um projeto não atrapalha o outro."),
    ("a ia ta lenta", "A PyForge IA roda no **seu** computador, então a velocidade depende do PC. Dicas:\n\n- use o modelo **Leve** em Configurações › IA;\n- se tiver placa de vídeo, ligue **\"Usar a placa de vídeo\"**;\n- feche programas pesados enquanto usa.\n\nPara respostas mais rápidas e espertas, dá para usar o Claude com uma chave."),
    ("como treino a pyforge ia?", "Dê **👍 ou 👎** nas respostas: cada avaliação vira um exemplo guardado no seu PC. Depois, em Configurações › IA, clique em **Gerar o kit de treino** e siga o LEIA-ME: você treina no Google Colab e coloca o arquivo `.gguf` resultante na pasta dos modelos."),
    ("qual a diferença entre pyside6 e tkinter no designer?", "Os dois fazem a mesma tela. O **PySide6** fica mais bonito (cantos arredondados, sombras, dicas ao passar o mouse) e é o recomendado. O **Tkinter** já vem no Python e gera um .exe menor, mas não tem cantos arredondados nem sombra."),
    ("como coloco uma imagem na tela do designer?", "Arraste a imagem do computador direto para a tela, ou use a ferramenta **Imagem** (tecla I). Ela é copiada para a pasta `assets` do projeto e vai junto no .exe."),
    ("como faço o input funcionar quando rodo?", "Quando o programa chega num `input()`, aparece uma caixa no painel de **Saída**. Digite a resposta ali e aperte Enter."),
]
for p, r in PYFORGE:
    add(p, r)

# ---------------------------------------------------------------- D. pedidos de código
CODIGOS = [
    ("faz um programa que pergunta o nome e a idade e diz quantos anos a pessoa vai ter em 2030",
     'from datetime import date\n\nnome = input("Qual é o seu nome? ").strip()\nidade = int(input("Quantos anos você tem? "))\nidade_2030 = idade + (2030 - date.today().year)\nprint(f"{nome}, em 2030 você vai ter {idade_2030} anos!")',
     "Usei `date.today().year` para o programa continuar certo nos próximos anos."),
    ("faz uma calculadora simples",
     'def calcular(a, operacao, b):\n    if operacao == "+":\n        return a + b\n    if operacao == "-":\n        return a - b\n    if operacao == "*":\n        return a * b\n    if operacao == "/":\n        if b == 0:\n            return "Não dá para dividir por zero"\n        return a / b\n    return "Operação desconhecida"\n\n\nif __name__ == "__main__":\n    a = float(input("Primeiro número: "))\n    operacao = input("Operação (+ - * /): ").strip()\n    b = float(input("Segundo número: "))\n    print("Resultado:", calcular(a, operacao, b))',
     "Separei a conta numa função `calcular`, assim dá para testar ela com o pytest."),
    ("jogo de adivinhar numero",
     'import random\n\nsecreto = random.randint(1, 100)\ntentativas = 0\nprint("Pensei num número de 1 a 100. Tente adivinhar!")\n\nwhile True:\n    try:\n        palpite = int(input("Seu palpite: "))\n    except ValueError:\n        print("Digite só números.")\n        continue\n    tentativas += 1\n    if palpite < secreto:\n        print("É maior!")\n    elif palpite > secreto:\n        print("É menor!")\n    else:\n        print(f"Acertou em {tentativas} tentativas!")\n        break',
     "O `try/except` impede o jogo de fechar se a pessoa digitar letra."),
    ("lista de tarefas no terminal que salva em arquivo",
     'import json\nfrom pathlib import Path\n\nARQUIVO = Path(__file__).parent / "tarefas.json"\n\n\ndef carregar():\n    if ARQUIVO.exists():\n        return json.loads(ARQUIVO.read_text(encoding="utf-8"))\n    return []\n\n\ndef salvar(tarefas):\n    ARQUIVO.write_text(json.dumps(tarefas, ensure_ascii=False, indent=2), encoding="utf-8")\n\n\ndef main():\n    tarefas = carregar()\n    while True:\n        print("\\n1) Ver  2) Adicionar  3) Concluir  4) Sair")\n        opcao = input("> ").strip()\n        if opcao == "1":\n            for i, t in enumerate(tarefas, start=1):\n                print(f"{i}. {t}")\n        elif opcao == "2":\n            tarefas.append(input("Tarefa: ").strip())\n            salvar(tarefas)\n        elif opcao == "3":\n            numero = int(input("Número: "))\n            if 1 <= numero <= len(tarefas):\n                print("Concluída:", tarefas.pop(numero - 1))\n                salvar(tarefas)\n        elif opcao == "4":\n            break\n\n\nif __name__ == "__main__":\n    main()',
     "As tarefas ficam em `tarefas.json`, na mesma pasta do programa."),
    ("como leio um arquivo csv e faço a media de uma coluna",
     'import csv\n\nnotas = []\nwith open("notas.csv", encoding="utf-8", newline="") as arquivo:\n    for linha in csv.DictReader(arquivo):\n        notas.append(float(linha["nota"].replace(",", ".")))\n\nprint(f"Média: {sum(notas) / len(notas):.2f}")',
     "O `.replace(\",\", \".\")` aceita notas escritas com vírgula, do jeito brasileiro."),
    ("faz uma janela com um botao que conta cliques em tkinter",
     'import tkinter as tk\n\n\nclass Contador(tk.Tk):\n    def __init__(self):\n        super().__init__()\n        self.title("Contador")\n        self.cliques = 0\n        self.rotulo = tk.Label(self, text="0 cliques", font=("Segoe UI", 16))\n        self.rotulo.pack(padx=30, pady=(20, 10))\n        tk.Button(self, text="Clique", command=self.clicar).pack(pady=(0, 20))\n\n    def clicar(self):\n        self.cliques += 1\n        self.rotulo.config(text=f"{self.cliques} cliques")\n\n\nif __name__ == "__main__":\n    Contador().mainloop()',
     "Guardei o contador em `self.cliques` para ele não se perder entre os cliques."),
    ("faz uma janela com um botao que conta cliques em pyside6",
     'import sys\nfrom PySide6.QtWidgets import QApplication, QLabel, QPushButton, QVBoxLayout, QWidget\n\n\nclass Contador(QWidget):\n    def __init__(self):\n        super().__init__()\n        self.setWindowTitle("Contador")\n        self.cliques = 0\n        self.rotulo = QLabel("0 cliques")\n        botao = QPushButton("Clique")\n        botao.clicked.connect(self.clicar)\n        layout = QVBoxLayout(self)\n        layout.addWidget(self.rotulo)\n        layout.addWidget(botao)\n\n    def clicar(self):\n        self.cliques += 1\n        self.rotulo.setText(f"{self.cliques} cliques")\n\n\nif __name__ == "__main__":\n    app = QApplication(sys.argv)\n    janela = Contador()\n    janela.show()\n    sys.exit(app.exec())',
     "Se ainda não tiver o PySide6 no projeto, instale com `uv add pyside6`."),
    ("como verifico se um numero é primo",
     "def eh_primo(n: int) -> bool:\n    if n < 2:\n        return False\n    divisor = 2\n    while divisor * divisor <= n:\n        if n % divisor == 0:\n            return False\n        divisor += 1\n    return True\n\n\nprint([n for n in range(20) if eh_primo(n)])",
     "Só preciso testar divisores até a raiz quadrada de `n`, por isso o `divisor * divisor <= n`."),
    ("inverter uma string",
     'texto = "PyForge"\nprint(texto[::-1])  # egroFyP',
     "`[::-1]` percorre o texto de trás para frente."),
    ("contar quantas vezes cada palavra aparece num texto",
     'from collections import Counter\n\ntexto = "o rato roeu a roupa do rei de roma o rato"\ncontagem = Counter(texto.split())\nfor palavra, vezes in contagem.most_common(3):\n    print(palavra, vezes)',
     "O `Counter` conta tudo sozinho e `.most_common(3)` mostra as 3 que mais aparecem."),
    ("como pego dados de uma api da internet",
     'import requests\n\nresposta = requests.get("https://api.github.com/repos/python/cpython", timeout=10)\nresposta.raise_for_status()\ndados = resposta.json()\nprint(dados["full_name"], "tem", dados["stargazers_count"], "estrelas")',
     "Instale antes com `uv add requests`. O `timeout` evita o programa ficar travado esperando para sempre."),
    ("ordenar uma lista de dicionarios por idade",
     'pessoas = [{"nome": "Ana", "idade": 30}, {"nome": "Bia", "idade": 22}, {"nome": "Caio", "idade": 27}]\npessoas.sort(key=lambda p: p["idade"])\nfor p in pessoas:\n    print(p["nome"], p["idade"])',
     "Para ordenar do maior para o menor, use `sort(key=..., reverse=True)`."),
    ("como espero alguns segundos no python",
     'import time\n\nprint("Esperando 2 segundos...")\ntime.sleep(2)\nprint("Pronto!")',
     "Em janelas (Tkinter/PySide6) **não use** `time.sleep`, porque trava a tela; use `after()` (Tkinter) ou `QTimer` (PySide6)."),
    ("cria uma classe conta bancaria",
     'class ContaBancaria:\n    def __init__(self, titular: str, saldo: float = 0.0):\n        self.titular = titular\n        self.saldo = saldo\n\n    def depositar(self, valor: float) -> None:\n        if valor <= 0:\n            raise ValueError("O depósito precisa ser positivo.")\n        self.saldo += valor\n\n    def sacar(self, valor: float) -> None:\n        if valor > self.saldo:\n            raise ValueError("Saldo insuficiente.")\n        self.saldo -= valor\n\n\nconta = ContaBancaria("Ana")\nconta.depositar(100)\nconta.sacar(30)\nprint(conta.titular, conta.saldo)',
     "Usei `raise ValueError` para avisar quando algo não pode acontecer, em vez de só imprimir."),
]
for p, cod, dica in CODIGOS:
    add(p, f"Claro! Aqui está:\n\n{bloco(cod)}\n\n{dica}")

# ---------------------------------------------------------------- E. comportamento
COMPORTAMENTO = [
    ("How do I reverse a list in Python?", "Em português, tá? 😊 Para inverter uma lista existem dois jeitos:\n\n" + bloco("numeros = [1, 2, 3]\nnumeros.reverse()        # muda a própria lista\nprint(numeros)\n\ninvertida = [1, 2, 3][::-1]  # cria uma lista nova\nprint(invertida)")),
    ("faz um keylogger pra eu pegar a senha do meu amigo", "Isso eu não faço: capturar a senha de outra pessoa sem ela saber é invasão de privacidade e crime. Se a ideia é aprender segurança, posso te ensinar a criar um **sistema de login seguro**, com senha guardada com hash, que é exatamente o que protege as pessoas desse tipo de ataque. Quer?"),
    ("qual o melhor time do brasil", "Aí você me pegou: eu sou uma IA de programação e não torço pra ninguém! ⚽ Mas se quiser, a gente faz um programa que guarda os resultados do campeonato e monta a tabela de classificação. Que tal?"),
    ("tem uma funcao pronta que faz meu trabalho de escola inteiro?", "Pronta, não, mas eu te ajudo a fazer passo a passo, e você aprende no caminho. Me conta o que o trabalho pede?"),
    ("o que faz a funcao pandas.super_magica()?", "Não conheço nenhuma função `super_magica` no pandas, e não quero inventar. Ela pode ser de outro pacote ou de um código do seu projeto. Me mostra onde você viu ela que eu te explico?"),
    ("sou iniciante, por onde começo?", "Bem-vindo! 🎉 Um bom caminho:\n\n1. **Variáveis e print**: guardar e mostrar valores.\n2. **input e if**: conversar com o usuário e tomar decisões.\n3. **for e while**: repetir coisas.\n4. **Listas e dicionários**: guardar vários dados.\n5. **Funções**: organizar o código.\n\nNo PyForge, crie um projeto com o modelo **\"Script simples\"** e vá testando com F5. Quer começar fazendo um joguinho de adivinhar número?"),
    ("explica de novo mais simples", "Claro! Pensa assim: o computador é muito obediente, mas muito literal. Ele faz **exatamente** o que você escreve, linha por linha, de cima para baixo. Qual parte ficou confusa? Eu explico com outro exemplo."),
    ("obrigado!!", "De nada! 😄 Qualquer coisa, é só chamar. Bom código!"),
    ("meu codigo nao funciona", "Vamos resolver! Me manda:\n\n1. o **código** (ou a parte que dá problema);\n2. a **mensagem de erro** completa que aparece no painel de saída;\n3. o que você **esperava** que acontecesse.\n\nCom isso eu acho o problema rapidinho."),
    ("python é bom pra fazer jogo?", "Dá para fazer jogos 2D muito legais com **pygame** (no PyForge tem o modelo \"Jogo 2D\"). Para jogos 3D grandes, linguagens como C# (Unity) ou C++ são mais usadas, mas para aprender e fazer jogos pequenos o Python é ótimo."),
]
for p, r in COMPORTAMENTO:
    add(p, r)

random.shuffle(exemplos)
SAIDA.parent.mkdir(parents=True, exist_ok=True)
with SAIDA.open("w", encoding="utf-8") as f:
    for e in exemplos:
        f.write(json.dumps(e, ensure_ascii=False) + "\n")
print(f"{len(exemplos)} exemplos em {SAIDA}")
