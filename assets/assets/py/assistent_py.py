"""Assistente Python do PyForge.

Roda em segundo plano e responde, por linhas JSON no stdin/stdout:
- analisar: erros de sintaxe explicados em português + detector de armadilhas do Python
- completar / info / definicao: autocompletar, documentação e "ir para definição" (jedi)
"""

import ast
import json
import os
import re
import sys

RAIZ = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()

try:
    import jedi
except Exception:  # sem jedi ainda: a análise continua funcionando
    jedi = None

FONTE = "Armadilhas do Python"

# ---------------------------------------------------------------- jedi

_ambiente = None
_projeto = None


def ambiente():
    global _ambiente
    if _ambiente is None and jedi:
        venv = os.path.join(RAIZ, ".venv")
        _ambiente = False
        if os.path.isdir(venv):
            try:
                _ambiente = jedi.create_environment(venv, safe=False)
            except Exception:
                _ambiente = False
    return _ambiente or None


def projeto():
    global _projeto
    if _projeto is None and jedi:
        _projeto = jedi.Project(RAIZ, added_sys_path=[RAIZ])
    return _projeto


def script(msg):
    return jedi.Script(code=msg.get("codigo", ""), path=msg.get("caminho") or None, project=projeto(), environment=ambiente())


TIPOS = {
    "function": "funcao", "class": "classe", "module": "modulo", "instance": "variavel",
    "keyword": "palavra", "statement": "variavel", "param": "parametro", "property": "propriedade", "path": "arquivo",
}


def completar(msg):
    if not jedi:
        return []
    linha, coluna = int(msg.get("linha", 1)), int(msg.get("coluna", 1)) - 1
    itens = []
    for i, c in enumerate(script(msg).complete(linha, max(coluna, 0))):
        if i >= 150:
            break
        item = {"nome": c.name, "tipo": TIPOS.get(c.type, c.type), "detalhe": c.description}
        if i < 25:
            try:
                doc = c.docstring(raw=False)
                if doc:
                    item["doc"] = doc[:1200]
            except Exception:
                pass
        itens.append(item)
    return itens


def info(msg):
    if not jedi:
        return None
    linha, coluna = int(msg.get("linha", 1)), int(msg.get("coluna", 1)) - 1
    nomes = script(msg).help(linha, max(coluna, 0))
    if not nomes:
        return None
    n = nomes[0]
    partes = []
    try:
        assinaturas = n.get_signatures()
        if assinaturas:
            partes.append("```python\n" + assinaturas[0].to_string() + "\n```")
        elif n.description:
            partes.append("```python\n" + n.description + "\n```")
    except Exception:
        pass
    try:
        doc = n.docstring(raw=True)
        if doc:
            partes.append(doc[:3000])
    except Exception:
        pass
    if n.module_name and n.type != "keyword":
        partes.append("*" + n.module_name + "*")
    return "\n\n".join(partes) if partes else None


def definicao(msg):
    if not jedi:
        return []
    linha, coluna = int(msg.get("linha", 1)), int(msg.get("coluna", 1)) - 1
    out = []
    for d in script(msg).goto(linha, max(coluna, 0), follow_imports=True):
        if d.module_path and d.line:
            out.append({"caminho": str(d.module_path), "linha": d.line, "coluna": (d.column or 0) + 1, "nome": d.name})
    return out


# ---------------------------------------------------------------- sintaxe em português

# >>> gerado por ferramentas_dev/gerar_sintaxe_py.mjs a partir de assets/web/js/erros_catalogo.js
TRADUCOES = [
    ("expected ':'", "Faltou os dois-pontos (:)", "Toda linha que abre um bloco termina com dois-pontos: if, elif, else, for, while, def, class, try, except, with. Exemplo certo: if idade >= 18: ⏎     print(\"adulto\")"),
    ("invalid syntax\\. Perhaps you forgot a comma\\?", "Faltou uma vírgula", "Entre os itens de uma lista, tupla, dicionário ou argumentos precisa ter vírgula. Exemplo certo: nomes = [\"Ana\", \"Bia\", \"Caio\"]"),
    ("invalid syntax\\. Maybe you meant '==' or ':=' instead of '='\\?|cannot assign to .* here\\. Maybe you meant '==' instead of '='\\?|expression cannot contain assignment, perhaps you meant \"==\"", "Use == para comparar", "Um = guarda valor; dois == comparam. Exemplo certo: if senha == \"1234\":"),
    ("Missing parentheses in call to '(print|exec)'(?:\\. Did you mean (.+)\\?)?", "$1 sem parênteses (isso é Python 2)", "No Python 3, $1 é uma função: use $1(...). Exemplo certo: print(\"Olá\")"),
    ("unexpected indent", "Recuo (espaços) inesperado", "Esta linha tem espaços no começo sem estar dentro de um bloco. Alinhe com a linha de cima. Exemplo certo: x = 1 ⏎ y = 2"),
    ("unindent does not match any outer indentation level", "O recuo não bate com nenhum bloco", "Os espaços no começo desta linha não alinham com nenhum bloco acima. Use sempre 4 espaços (Formatar documento arruma: Shift+Alt+F)."),
    ("expected an indented block(?: after '(\\w+)' statement on line (\\d+))?", "Faltou o recuo depois do “$1”", "Depois de uma linha com : a próxima precisa de 4 espaços. Se o bloco ainda está vazio, escreva pass. Exemplo certo: def jogar(): ⏎     print(\"oi\")"),
    ("inconsistent use of tabs and spaces", "Mistura de Tab e espaços", "Use só espaços. O PyForge converte ao formatar (Shift+Alt+F)."),
    ("unterminated triple-quoted string literal", "Texto com \"\"\" sem fechar", "Feche o texto com as mesmas aspas triplas."),
    ("unterminated string literal|EOL while scanning string literal", "Texto (string) sem aspas de fechamento", "Toda aspa aberta precisa ser fechada na mesma linha. Se o texto tem aspas dentro, use o outro tipo por fora: \"Ele disse 'oi'\". Exemplo certo: print(\"Olá\")"),
    ("'(\\(|\\[|\\{)' was never closed", "O “$1” foi aberto e nunca fechado", "Conte os parênteses/colchetes/chaves: cada um que abre precisa fechar. O erro às vezes aparece na linha de BAIXO. Exemplo certo: print(len(nomes))"),
    ("unmatched '(\\)|\\]|\\})'", "“$1” fechando sem ter aberto", "Tem um fechamento sobrando nesta linha."),
    ("closing parenthesis '(.)' does not match opening parenthesis '(.)'", "“$2” fechado com “$1”", "Cada abertura fecha com o seu par: ( com ), [ com ], { com }."),
    ("cannot assign to (function call|literal|expression|f-string expression|comparison|conditional expression|attribute here)", "Não dá para guardar valor aí", "Do lado ESQUERDO do = precisa ser um nome de variável. Ao contrário? valor = variavel → variavel = valor. Exemplo certo: pontos = 10"),
    ("'return' outside function", "return fora de uma função", "return só pode ser usado dentro de um def. Confira o recuo da linha."),
    ("'(break|continue)' (?:outside loop|not properly in loop)", "$1 fora de um loop", "$1 só pode ser usado dentro de um for ou while. Confira o recuo."),
    ("'(await|async with|async for)' outside (?:async )?function", "$1 fora de uma função async", "Use await só dentro de async def."),
    ("'yield' outside function", "yield fora de uma função", "yield só pode ser usado dentro de def (geradores)."),
    ("invalid non-printable character U\\+00A0", "Espaço invisível copiado da internet", "Este código tem um “espaço não separável” (copiado de site/PDF). Apague e digite os espaços de novo."),
    ("invalid character '(.)' \\(U\\+[0-9A-F]+\\)", "Caractere estranho: “$1”", "Provavelmente aspas curvas “ ” ou travessão — copiados de Word/site. Troque por aspas normais \" e hífen -. Exemplo certo: print(\"Olá\")"),
    ("invalid non-printable character", "Caractere invisível no código", "Apague o pedaço copiado e digite de novo."),
    ("invalid decimal literal", "Nome começando com número (ou número colado em letras)", "Nomes de variáveis não podem começar com número: 1lugar → lugar1. Ou faltou um operador: 2x → 2 * x. Exemplo certo: nome2 = \"Ana\""),
    ("leading zeros in decimal integer literals are not permitted", "Número com zero na frente", "Escreva 7, não 07. Para datas/telefones, use texto: \"07\"."),
    ("invalid (hexadecimal|octal|binary) literal", "Número $1 inválido", "Confira os dígitos depois de 0x/0o/0b."),
    ("f-string: expecting '\\}'|f-string: single '\\}' is not allowed|f-string: unmatched|f-string: empty expression", "Chaves { } erradas na f-string", "Dentro da f-string, { abre um valor e } fecha. Para escrever uma chave de verdade, dobre: {{ }}. Exemplo certo: f\"Total: {preco}\""),
    ("f-string", "Problema dentro de uma f-string", "Confira as chaves { } e as aspas: dentro de f\"...\" use aspas simples (ou atualize para Python 3.12+)."),
    ("positional argument follows keyword argument", "Argumento sem nome depois de um com nome", "Os argumentos com nome (x=1) vêm por último. Exemplo certo: abrir(\"r\", arquivo=\"a.txt\")"),
    ("(?:non-default argument follows default argument|parameter without a default follows parameter with a default)", "Parâmetro sem valor padrão depois de um com padrão", "No def, os parâmetros com valor padrão (x=0) precisam vir por último. Exemplo certo: def criar(idade, nome=\"?\"):"),
    ("duplicate argument '(.+)' in function definition", "Parâmetro “$1” repetido", "Cada parâmetro precisa de um nome diferente."),
    ("keyword argument repeated", "Argumento repetido na chamada", "O mesmo nome= aparece duas vezes."),
    ("expected 'except' or 'finally' block", "try sem except", "Todo try: precisa de um except (ou finally) logo depois, com o mesmo recuo. Exemplo certo: try: ⏎     n = int(x) ⏎ except ValueError: ⏎     n = 0"),
    ("default 'except:' must be last", "except: genérico antes dos específicos", "Coloque o “except:” (ou except Exception) por último."),
    ("multiple exception types must be parenthesized", "Vários erros no except sem parênteses", "Escreva except (ValueError, KeyError): Exemplo certo: except (ValueError, KeyError):"),
    ("expected 'in'", "Faltou o “in” no for", "O formato é: for item in lista: Exemplo certo: for i in range(10):"),
    ("expected '\\('", "Faltou o parêntese", "def e class precisam de ( ) depois do nome: def nome(): Exemplo certo: def jogar():"),
    ("expected 'else' after 'if' expression", "if de uma linha sem else", "O “x if condição else y” precisa do else."),
    ("trailing comma not allowed without surrounding parentheses", "Vírgula sobrando no import", "Tire a vírgula do fim ou use parênteses: from x import (a, b,)"),
    ("Generator expression must be parenthesized|did you forget parentheses around the comprehension target", "Faltou parênteses na expressão", "Coloque a parte “x for x in …” entre parênteses, ou os itens entre parênteses."),
    ("name '(.+)' is (?:used prior to|assigned to before) global declaration", "“global $1” tem que vir antes", "Escreva global $1 na primeira linha da função, antes de usar."),
    ("no binding for nonlocal '(.+)' found", "nonlocal sem variável de fora", "nonlocal só funciona com variáveis de uma função de fora (não do arquivo — para essas, use global)."),
    ("cannot use starred expression here|can't use starred expression here", "* usado num lugar que não pode", "O *lista só funciona dentro de chamadas, listas ou desmontagem."),
    ("'tuple' is an illegal expression for augmented assignment|illegal expression for augmented assignment", "+= com várias variáveis", "Faça uma de cada vez: a += 1 e b += 1."),
    ("cannot delete (function call|literal|expression)", "del em algo que não é variável", "del apaga variáveis, itens (lista[0]) ou atributos."),
    ("cannot mix bytes and nonbytes literals", "Misturou b\"...\" com texto normal", "Use só bytes ou só texto."),
    ("expected expression", "Faltou um valor", "O Python esperava um valor/conta aqui (ex.: x = sem nada depois)."),
    ("Did you mean '(.+)'\\?", "Você quis dizer “$1”?", "O Python sugeriu uma correção para esta linha."),
    ("unexpected EOF while parsing|EOF in multi-line statement", "O arquivo terminou no meio de um comando", "Faltou fechar um parêntese, colchete, chave ou aspas — veja as linhas anteriores."),
    ("Non-UTF-8 code starting with", "O arquivo não está salvo em UTF-8", "Salve o arquivo com codificação UTF-8 (o editor do PyForge salva sempre em UTF-8)."),
    ("assignment expression cannot be used", "Uso inválido de :=", "O “operador morsa” := não pode ser usado aí."),
    ("too many statically nested blocks", "Blocos aninhados demais", "Mais de 20 níveis de recuo. Separe em funções."),
    ("(?:\\(|\\b)print (?:\"|')", "print sem parênteses", "Use print(\"...\") com parênteses."),
    ("invalid syntax", "Sintaxe inválida: o Python não entendeu esta linha", "Confira: dois-pontos no fim de if/for/def, aspas e parênteses fechados, = vs ==, e palavras do Python escritas certo (elif, não else if)."),
]
# <<< fim do bloco gerado


def traduzir_sintaxe(msg):
    """Devolve (título, explicação) em português para a mensagem de SyntaxError."""
    for padrao, titulo, texto in TRADUCOES:
        m = re.search(padrao, msg)
        if m:
            def trocar(x):
                n = int(x.group(1))
                return (m.group(n) or "…") if n <= (m.re.groups or 0) else "…"
            return re.sub(r"\$(\d)", trocar, titulo), texto
    return msg, ""


# ---------------------------------------------------------------- armadilhas

EMBUTIDOS_PERIGOSOS = {
    "list", "dict", "str", "int", "float", "set", "tuple", "id", "type", "input", "sum", "max", "min",
    "len", "open", "print", "range", "map", "filter", "sorted", "object", "bytes", "all", "any", "iter",
    "next", "format", "vars", "dir", "hash", "compile", "exec", "eval", "zip", "round", "abs", "bool",
}
METODOS_QUE_DEVOLVEM_NONE = {"sort", "append", "extend", "reverse", "insert", "remove", "clear", "update"}
METODOS_QUE_MUDAM_LISTA = {"remove", "append", "pop", "insert", "extend", "clear"}
BLOQUEANTES = {
    ("requests", "get"), ("requests", "post"), ("requests", "put"), ("requests", "delete"), ("requests", "patch"),
    ("requests", "head"), ("requests", "request"), ("httpx", "get"), ("httpx", "post"), ("time", "sleep"),
    ("subprocess", "run"), ("subprocess", "call"), ("subprocess", "check_output"), ("subprocess", "check_call"),
    ("os", "system"), ("urllib.request", "urlopen"), ("request", "urlopen"), ("shutil", "copytree"),
}
BLOQUEANTES_NOMES = {"urlopen", "sleep", "input"}
MODULOS_GUI = ("PySide6", "PySide2", "PyQt5", "PyQt6", "tkinter", "customtkinter", "wx", "kivy", "flet")


def nome_chamada(no):
    """Devolve ('modulo', 'funcao') para chamadas tipo requests.get(...)."""
    f = no.func
    if isinstance(f, ast.Attribute):
        base = f.value
        partes = []
        while isinstance(base, ast.Attribute):
            partes.insert(0, base.attr)
            base = base.value
        if isinstance(base, ast.Name):
            partes.insert(0, base.id)
            return ".".join(partes), f.attr
    if isinstance(f, ast.Name):
        return "", f.id
    return None, None


class Detector(ast.NodeVisitor):
    def __init__(self, codigo, caminho):
        self.diags = []
        self.caminho = caminho
        self.loops = []  # nomes das variáveis de loop ativas
        self.funcoes_modulo = set()
        self.metodos_classe = []
        self.callbacks_gui = set()
        self.usa_gui = any(m in codigo for m in MODULOS_GUI)
        self.vars_input = [set()]
        self.classes_thread = set()

    # ------------------------------------------------ utilidades
    def add(self, no, sev, codigo, msg, dica="", item=0, fim=None):
        linha = getattr(no, "lineno", 1)
        col = getattr(no, "col_offset", 0) + 1
        fl = getattr(no, "end_lineno", None) or linha
        fc = (getattr(no, "end_col_offset", None) or col) + 1
        if fim is not None:
            fl, fc = fim
        self.diags.append({
            "linha": linha, "coluna": col, "fimLinha": fl, "fimColuna": fc, "sev": sev,
            "codigo": codigo, "msg": msg, "fonte": FONTE, "dica": dica, "item": item,
        })

    # ------------------------------------------------ pré-passagem
    def preparar(self, arvore):
        for no in arvore.body:
            if isinstance(no, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.funcoes_modulo.add(no.name)
            if isinstance(no, ast.ClassDef):
                for base in no.bases:
                    nome = base.attr if isinstance(base, ast.Attribute) else getattr(base, "id", "")
                    if nome in ("QThread", "Thread", "QRunnable"):
                        self.classes_thread.add(no.name)
        for no in ast.walk(arvore):
            if isinstance(no, ast.Call):
                alvos = []
                if isinstance(no.func, ast.Attribute) and no.func.attr == "connect" and no.args:
                    alvos.append(no.args[0])
                for kw in no.keywords:
                    if kw.arg == "command":
                        alvos.append(kw.value)
                if isinstance(no.func, ast.Attribute) and no.func.attr == "bind" and len(no.args) >= 2:
                    alvos.append(no.args[1])
                for a in alvos:
                    if isinstance(a, ast.Attribute):
                        self.callbacks_gui.add(a.attr)
                    elif isinstance(a, ast.Name):
                        self.callbacks_gui.add(a.id)

    # ------------------------------------------------ funções
    def visit_FunctionDef(self, no):
        self.checar_funcao(no)

    def visit_AsyncFunctionDef(self, no):
        self.checar_funcao(no)

    def checar_funcao(self, no):
        args = no.args
        posicionais = args.posonlyargs + args.args
        padroes = list(zip(posicionais[len(posicionais) - len(args.defaults):], args.defaults))
        padroes += [(a, d) for a, d in zip(args.kwonlyargs, args.kw_defaults) if d is not None]
        for arg, padrao in padroes:
            mutavel = isinstance(padrao, (ast.List, ast.Dict, ast.Set)) or (
                isinstance(padrao, ast.Call) and isinstance(padrao.func, ast.Name) and padrao.func.id in ("list", "dict", "set", "defaultdict")
            )
            if mutavel:
                self.add(padrao, "aviso", "PF001",
                         f"Argumento padrão mutável: “{arg.arg}” é criado uma vez só e compartilhado entre TODAS as chamadas.",
                         f"Use {arg.arg}=None e, dentro da função: if {arg.arg} is None: {arg.arg} = []", 37)
        for a in posicionais + args.kwonlyargs:
            if a.arg in EMBUTIDOS_PERIGOSOS:
                self.add(a, "aviso", "PF007", f"O parâmetro “{a.arg}” esconde a função embutida {a.arg}() dentro desta função.",
                         f"Troque o nome, por exemplo: {a.arg}_", 55)
        # método sem self
        if self.metodos_classe and no in self.metodos_classe[-1]:
            decs = {getattr(d, "id", getattr(d, "attr", "")) for d in no.decorator_list}
            if "staticmethod" not in decs:
                if not posicionais and not args.vararg:
                    self.add(no, "erro", "PF012", f"O método “{no.name}” não recebe self. Ao chamar obj.{no.name}() vai dar TypeError.",
                             "Coloque self como primeiro parâmetro, ou use @staticmethod.", 15,
                             fim=(no.lineno, no.col_offset + 5 + len(no.name)))
        # chamadas que travam a janela
        if self.usa_gui and no.name in self.callbacks_gui:
            for filho in ast.walk(no):
                if isinstance(filho, ast.Call):
                    mod, func = nome_chamada(filho)
                    if (mod, func) in BLOQUEANTES or (mod == "" and func in BLOQUEANTES_NOMES):
                        rotulo = f"{mod}.{func}()" if mod else f"{func}()"
                        self.add(filho, "aviso", "PF020",
                                 f"{rotulo} roda na thread da interface (dentro de “{no.name}”): a janela vai congelar (“Não respondendo”) até terminar.",
                                 "Mova o trabalho para uma QThread (PySide6) ou threading.Thread + after() (Tkinter). Peça à IA: “mova para uma thread”.", 86)
        # thread/janela guardada só em variável local
        locais = {}
        for filho in ast.walk(no):
            if isinstance(filho, ast.Assign) and len(filho.targets) == 1 and isinstance(filho.targets[0], ast.Name) and isinstance(filho.value, ast.Call):
                f = filho.value.func
                nome = f.attr if isinstance(f, ast.Attribute) else getattr(f, "id", "")
                if nome in self.classes_thread or nome in ("QThread", "QDialog", "QWidget", "QMainWindow"):
                    locais[filho.targets[0].id] = (filho, nome)
        if locais and self.metodos_classe:
            for filho in ast.walk(no):
                if isinstance(filho, ast.Call) and isinstance(filho.func, ast.Attribute) and filho.func.attr in ("start", "show") and isinstance(filho.func.value, ast.Name):
                    if filho.func.value.id in locais:
                        atrib, nome = locais[filho.func.value.id]
                        self.add(atrib, "aviso", "PF021",
                                 f"“{filho.func.value.id}” ({nome}) é uma variável local: quando a função terminar, o coletor de lixo pode apagá-la ainda em uso (a janela some ou o app fecha).",
                                 f"Guarde em self: self.{filho.func.value.id} = {nome}(...)", 90)
        self.vars_input.append(set())
        self.generic_visit(no)
        self.vars_input.pop()

    def visit_Lambda(self, no):
        livres = {n.id for n in ast.walk(no.body) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
        params = {a.arg for a in no.args.args + no.args.kwonlyargs}
        for alvo in self.loops:
            presos = (alvo & livres) - params
            if presos:
                v = sorted(presos)[0]
                self.add(no, "aviso", "PF002",
                         f"Esta lambda usa “{v}” do loop: quando ela rodar, todas vão ver o ÚLTIMO valor de {v}.",
                         f"Congele o valor agora: lambda {v}={v}: ...", 38)
                break
        self.generic_visit(no)

    # ------------------------------------------------ classes
    def visit_ClassDef(self, no):
        metodos = [n for n in no.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        self.metodos_classe.append(metodos)
        e_dataclass = any(
            (getattr(d, "id", "") == "dataclass") or (getattr(d, "attr", "") == "dataclass")
            or (isinstance(d, ast.Call) and (getattr(d.func, "id", "") == "dataclass" or getattr(d.func, "attr", "") == "dataclass"))
            for d in no.decorator_list
        )
        if e_dataclass:
            for n in no.body:
                if isinstance(n, ast.AnnAssign) and isinstance(n.value, (ast.List, ast.Dict, ast.Set)):
                    self.add(n.value, "erro", "PF013", "Dataclass não aceita lista/dicionário como valor padrão (dá ValueError ao rodar).",
                             "Use field(default_factory=list) — from dataclasses import field", 37)
        self.generic_visit(no)
        self.metodos_classe.pop()

    # ------------------------------------------------ loops
    def visit_For(self, no):
        alvos = {n.id for n in ast.walk(no.target) if isinstance(n, ast.Name)}
        if isinstance(no.iter, ast.Name):
            lista = no.iter.id
            for filho in ast.walk(ast.Module(body=no.body, type_ignores=[])):
                if (isinstance(filho, ast.Call) and isinstance(filho.func, ast.Attribute) and filho.func.attr in METODOS_QUE_MUDAM_LISTA
                        and isinstance(filho.func.value, ast.Name) and filho.func.value.id == lista):
                    self.add(filho, "aviso", "PF003",
                             f"Você está mudando “{lista}” enquanto percorre ela no for: itens são pulados ou repetidos.",
                             f"Percorra uma cópia: for ... in {lista}[:]  — ou crie uma lista nova com list comprehension.", 9)
                    break
        self.loops.append(alvos)
        self.generic_visit(no)
        self.loops.pop()

    def visit_comprehensao(self, no):
        alvos = set()
        for g in no.generators:
            alvos |= {n.id for n in ast.walk(g.target) if isinstance(n, ast.Name)}
        self.loops.append(alvos)
        self.generic_visit(no)
        self.loops.pop()

    visit_ListComp = visit_comprehensao
    visit_SetComp = visit_comprehensao
    visit_DictComp = visit_comprehensao
    visit_GeneratorExp = visit_comprehensao

    def visit_While(self, no):
        self.loops.append(set())
        self.generic_visit(no)
        self.loops.pop()

    # ------------------------------------------------ comparações
    def visit_Compare(self, no):
        lados = [no.left] + no.comparators
        for i, op in enumerate(no.ops):
            a, b = lados[i], lados[i + 1]
            if isinstance(op, (ast.Is, ast.IsNot)):
                for lado in (a, b):
                    if isinstance(lado, ast.Constant) and lado.value is not None and not isinstance(lado.value, bool) and lado.value is not Ellipsis:
                        self.add(no, "aviso", "PF004", "“is” compara se é o MESMO objeto, não se o valor é igual. Com números e textos o resultado muda conforme o caso.",
                                 "Use == para comparar valores (is só com None, True e False).", 41)
                        break
            if isinstance(op, (ast.Eq, ast.NotEq)):
                if any(isinstance(l, ast.Constant) and l.value is None for l in (a, b)):
                    self.add(no, "info", "PF005", "Para comparar com None, o certo é “is None” / “is not None”.", "Troque == None por is None.", 34)
                elif any(isinstance(l, ast.Constant) and isinstance(l.value, float) for l in (a, b)):
                    self.add(no, "info", "PF006", "Comparar números com vírgula (float) usando == pode falhar: 0.1 + 0.2 != 0.3.",
                             "Use math.isclose(a, b).", 13)
            if self.vars_input[-1]:
                for lado, outro in ((a, b), (b, a)):
                    if isinstance(lado, ast.Name) and lado.id in self.vars_input[-1] and isinstance(outro, ast.Constant) and isinstance(outro.value, (int, float)) and not isinstance(outro.value, bool):
                        self.add(no, "aviso", "PF015", f"“{lado.id}” veio de input(), então é TEXTO. Comparar texto com número nunca dá certo.",
                                 f"Converta: {lado.id} = int(input(...))", 10)
        self.generic_visit(no)

    def visit_BinOp(self, no):
        if isinstance(no.op, ast.Mult):
            for lado in (no.left, no.right):
                if isinstance(lado, ast.List) and any(
                    isinstance(e, (ast.List, ast.Dict, ast.Set))
                    or (isinstance(e, ast.BinOp) and isinstance(e.op, ast.Mult) and any(isinstance(x, ast.List) for x in (e.left, e.right)))
                    for e in lado.elts
                ):
                    self.add(no, "aviso", "PF008", "[[...]] * n cria n referências para a MESMA lista interna: mudar uma muda todas.",
                             "Use: [[0] * colunas for _ in range(linhas)]", 33)
        if isinstance(no.op, ast.Add):
            tipos = []
            for lado in (no.left, no.right):
                if isinstance(lado, (ast.JoinedStr,)) or (isinstance(lado, ast.Constant) and isinstance(lado.value, str)):
                    tipos.append("str")
                elif isinstance(lado, ast.Constant) and isinstance(lado.value, (int, float)) and not isinstance(lado.value, bool):
                    tipos.append("num")
            if sorted(tipos) == ["num", "str"]:
                self.add(no, "erro", "PF014", "Não dá para somar texto com número: isso dá TypeError ao rodar.",
                         "Use f-string: f\"idade: {idade}\"  ou converta com str().", 4)
        if self.vars_input[-1] and isinstance(no.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow)):
            for lado, outro in ((no.left, no.right), (no.right, no.left)):
                if isinstance(lado, ast.Name) and lado.id in self.vars_input[-1] and isinstance(outro, ast.Constant) and isinstance(outro.value, (int, float)) and not isinstance(outro.value, bool):
                    self.add(no, "aviso", "PF015", f"“{lado.id}” veio de input(), então é TEXTO, não número.",
                             f"Converta: {lado.id} = int(input(...))  ou float(...)", 10)
                    break
        self.generic_visit(no)

    # ------------------------------------------------ atribuições
    def visit_Assign(self, no):
        for alvo in no.targets:
            if isinstance(alvo, ast.Name) and alvo.id in EMBUTIDOS_PERIGOSOS:
                self.add(alvo, "aviso", "PF007", f"A variável “{alvo.id}” esconde a função embutida {alvo.id}() daqui para frente.",
                         f"Troque o nome, por exemplo: lista_{alvo.id}" if alvo.id in ("list", "dict", "set") else f"Troque o nome, por exemplo: {alvo.id}_", 55)
        v = no.value
        if isinstance(v, ast.Call) and isinstance(v.func, ast.Attribute) and v.func.attr in METODOS_QUE_DEVOLVEM_NONE and not v.func.attr == "update":
            if len(no.targets) == 1 and isinstance(no.targets[0], ast.Name):
                self.add(no, "aviso", "PF009", f".{v.func.attr}() muda o objeto e devolve None: “{no.targets[0].id}” vai ficar None.",
                         "Chame o método sozinho numa linha, ou use sorted(lista) para obter uma lista nova.", 30)
        if isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == "input":
            for alvo in no.targets:
                if isinstance(alvo, ast.Name):
                    self.vars_input[-1].add(alvo.id)
        else:
            for alvo in no.targets:
                if isinstance(alvo, ast.Name):
                    self.vars_input[-1].discard(alvo.id)
        self.generic_visit(no)

    # ------------------------------------------------ exceções e controle
    def visit_ExceptHandler(self, no):
        if no.type is None:
            self.add(no, "aviso", "PF010", "“except:” sem tipo pega TUDO, até o Ctrl+C e erros de digitação, e esconde bugs.",
                     "Use except Exception as erro: (ou o erro específico, como ValueError).", 35,
                     fim=(no.lineno, no.col_offset + 7))
        elif len(no.body) == 1 and isinstance(no.body[0], ast.Pass):
            self.add(no, "info", "PF011", "O erro é engolido em silêncio (except … pass). Se algo der errado, você nunca vai saber.",
                     "Pelo menos registre: logging.exception('...')", 62, fim=(no.lineno, no.col_offset + 7))
        self.generic_visit(no)

    def visit_Try(self, no):
        for filho in no.finalbody:
            for n in ast.walk(filho):
                if isinstance(n, (ast.Return, ast.Break, ast.Continue)):
                    self.add(n, "aviso", "PF016", "return/break/continue dentro de finally engole a exceção que estava acontecendo.",
                             "Tire o return de dentro do finally.", 63)
        self.generic_visit(no)

    visit_TryStar = visit_Try

    def visit_Assert(self, no):
        if isinstance(no.test, ast.Tuple) and no.test.elts:
            self.add(no, "aviso", "PF017", "assert com parênteses em volta de tudo vira uma tupla, que é SEMPRE verdadeira: o teste nunca falha.",
                     "Escreva: assert condicao, \"mensagem\"", 0)
        self.generic_visit(no)

    def visit_If(self, no):
        t = no.test
        if isinstance(t, ast.Name) and t.id in self.funcoes_modulo:
            self.add(t, "aviso", "PF018", f"Faltou os parênteses: “if {t.id}:” testa a FUNÇÃO (sempre verdadeira), não o resultado dela.",
                     f"Use: if {t.id}():", 16)
        elif isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "self" and self.metodos_classe:
            for m in self.metodos_classe[-1]:
                decs = {getattr(d, "id", getattr(d, "attr", "")) for d in m.decorator_list}
                if m.name == t.attr and "property" not in decs:
                    self.add(t, "aviso", "PF018", f"Faltou os parênteses: “self.{t.attr}” é um método, então o if é sempre verdadeiro.",
                             f"Use: if self.{t.attr}():", 16)
        self.generic_visit(no)

    def visit_Call(self, no):
        f = no.func
        nomes_kw = {k.arg for k in no.keywords}
        if isinstance(f, ast.Name) and f.id == "open" and "encoding" not in nomes_kw:
            modo = ""
            if len(no.args) >= 2 and isinstance(no.args[1], ast.Constant):
                modo = str(no.args[1].value)
            for k in no.keywords:
                if k.arg == "mode" and isinstance(k.value, ast.Constant):
                    modo = str(k.value.value)
            if "b" not in modo:
                self.add(no, "info", "PF019", "open() sem encoding: no Windows (Python antes da 3.15) o padrão é cp1252 e acentos podem quebrar.",
                         "Use open(caminho, encoding=\"utf-8\").", 18)
        if isinstance(f, ast.Attribute) and f.attr in ("read_text", "write_text") and "encoding" not in nomes_kw:
            self.add(no, "info", "PF019", f".{f.attr}() sem encoding: acentos podem quebrar no Windows.", f"Use .{f.attr}(..., encoding=\"utf-8\").", 18)
        self.generic_visit(no)


def checar_modulo(arvore, codigo, caminho, d):
    nome = os.path.splitext(os.path.basename(caminho or ""))[0]
    stdlib = getattr(sys, "stdlib_module_names", set())
    if nome and nome in stdlib and nome not in ("test", "tests", "main", "__init__", "__main__"):
        d.add(ast.Module(body=[], type_ignores=[]), "aviso", "PF022",
              f"Este arquivo se chama {nome}.py, igual ao módulo “{nome}” do Python: um “import {nome}” vai pegar ESTE arquivo.",
              f"Renomeie o arquivo, por exemplo: meu_{nome}.py", 14, fim=(1, 2))
    usa_mp = any(
        (isinstance(n, ast.Import) and any(a.name.startswith("multiprocessing") for a in n.names))
        or (isinstance(n, ast.ImportFrom) and (n.module or "").startswith(("multiprocessing", "concurrent.futures")) and any(a.name in ("Process", "Pool", "ProcessPoolExecutor") for a in n.names))
        for n in arvore.body
    )
    if usa_mp:
        tem_guarda = any(
            isinstance(n, ast.If) and isinstance(n.test, ast.Compare) and isinstance(n.test.left, ast.Name) and n.test.left.id == "__name__"
            for n in arvore.body
        )
        if not tem_guarda:
            primeiro = next(n for n in arvore.body if isinstance(n, (ast.Import, ast.ImportFrom)))
            d.add(primeiro, "aviso", "PF023", "Usando processos sem “if __name__ == \"__main__\":”. No Windows o programa vai se reiniciar sem parar.",
                  "Coloque o código principal dentro de if __name__ == \"__main__\":", 53)


def analisar(codigo, caminho):
    d = Detector(codigo, caminho)
    try:
        arvore = ast.parse(codigo, filename=caminho or "<codigo>")
    except SyntaxError as e:
        linha = e.lineno or 1
        col = e.offset or 1
        fim_linha = getattr(e, "end_lineno", None) or linha
        fim_col = getattr(e, "end_offset", None) or (col + 1)
        if fim_linha == linha and fim_col <= col:
            fim_col = col + 1
        tipo = "Recuo" if isinstance(e, IndentationError) else "Sintaxe"
        titulo_pt, texto_pt = traduzir_sintaxe(e.msg or "")
        return [{
            "linha": linha, "coluna": col, "fimLinha": fim_linha, "fimColuna": fim_col, "sev": "erro", "codigo": "sintaxe",
            "msg": f"{tipo}: {titulo_pt}", "fonte": "Python", "dica": f"{texto_pt} (Mensagem original: {e.msg})".strip(), "item": 2,
        }]
    d.preparar(arvore)
    try:
        d.visit(arvore)
    except RecursionError:
        pass
    try:
        checar_modulo(arvore, codigo, caminho, d)
    except Exception:
        pass
    vistos = set()
    unicos = []
    for x in d.diags:
        chave = (x["linha"], x["coluna"], x["codigo"])
        if chave not in vistos:
            vistos.add(chave)
            unicos.append(x)
    return unicos


def main():
    for linha in sys.stdin:
        linha = linha.strip()
        if not linha:
            continue
        try:
            msg = json.loads(linha)
        except Exception:
            continue
        ident = msg.get("id")
        cmd = msg.get("cmd")
        try:
            if cmd == "analisar":
                res = analisar(msg.get("codigo", ""), msg.get("caminho", ""))
            elif cmd == "completar":
                res = completar(msg)
            elif cmd == "info":
                res = info(msg)
            elif cmd == "definicao":
                res = definicao(msg)
            else:
                res = None
            saida = {"id": ident, "res": res}
        except Exception as erro:
            saida = {"id": ident, "res": None, "erro": f"{type(erro).__name__}: {erro}"}
        sys.stdout.write(json.dumps(saida, ensure_ascii=False) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
