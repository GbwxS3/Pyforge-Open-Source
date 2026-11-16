"""Máquina do tempo do PyForge.

Roda um programa anotando cada linha executada (só dos arquivos do projeto), com o valor das
variáveis e o que foi escrito na tela. O PyForge depois mostra tudo numa linha do tempo.

Uso: python maquina_tempo.py <raiz do projeto> <arquivo.py> <saida.jsonl>
Formato da saída (uma linha JSON por evento):
  {"t":"inicio", ...}                       primeira linha
  {"t":"arq","i":0,"c":"C:/.../main.py"}    arquivo novo
  {"t":"p","a":0,"l":12,"f":"calcular","k":3,"e":"l","v":{"x":"5"},"x":["y"],"o":"texto"}
       e: c = entrou na função, l = linha, r = saiu (com "r": valor devolvido), x = erro
       k: quadro (cada chamada de função tem um número); v: variáveis que mudaram; x: que sumiram
  {"t":"limite"} / {"t":"fim"} / {"t":"erro","tipo":..,"msg":..}
"""
import json
import os
import reprlib
import runpy
import sys
import threading
import time
import types

LIMITE = int(os.environ.get("PYFORGE_TEMPO_LIMITE", "20000"))
MAX_VARS = 40

raiz = os.path.normcase(os.path.abspath(sys.argv[1]))
alvo = os.path.abspath(sys.argv[2])
caminho_saida = sys.argv[3]
os.makedirs(os.path.dirname(caminho_saida), exist_ok=True)
saida = open(caminho_saida, "w", encoding="utf-8")
este_arquivo = os.path.normcase(os.path.abspath(__file__))

rep = reprlib.Repr()
rep.maxlist = rep.maxtuple = rep.maxset = rep.maxfrozenset = rep.maxdeque = 12
rep.maxdict = 10
rep.maxstring = 80
rep.maxother = 80
rep.maxlevel = 3

trava = threading.Lock()
estado = {"passos": 0, "parado": False, "ultimo_flush": time.time()}
arquivos = {}      # caminho -> índice
do_projeto = {}    # co_filename -> bool (cache)
quadros = {}       # id(frame) -> (k, {nome: repr})
proximo_k = [0]
texto_novo = []    # o que o programa escreveu desde o último passo
PULAR_TIPOS = (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type, types.MethodType)


def escrever(obj):
    saida.write(json.dumps(obj, ensure_ascii=False) + "\n")
    agora = time.time()
    if agora - estado["ultimo_flush"] > 0.3:
        saida.flush()
        estado["ultimo_flush"] = agora


class Espiao:
    """Repassa o que o programa escreve (print) e guarda uma cópia para a linha do tempo."""

    def __init__(self, real):
        self._real = real

    def write(self, s):
        texto_novo.append(s)
        return self._real.write(s)

    def __getattr__(self, nome):
        return getattr(self._real, nome)


def mostrar(v):
    try:
        return rep.repr(v)
    except Exception:
        return "<não deu para mostrar>"


def variaveis(frame, modulo):
    out = {}
    try:
        itens = list(frame.f_locals.items())
    except Exception:
        return out
    for nome, v in itens:
        if nome.startswith("__") or (modulo and isinstance(v, PULAR_TIPOS)):
            continue
        if len(out) >= MAX_VARS:
            break
        out[nome] = mostrar(v)
    return out


def eh_do_projeto(codigo):
    fn = codigo.co_filename
    r = do_projeto.get(fn)
    if r is None:
        c = os.path.normcase(os.path.abspath(fn)) if fn and not fn.startswith("<") else ""
        r = bool(c) and c.startswith(raiz) and c != este_arquivo and (os.sep + ".venv" + os.sep) not in c and (os.sep + "site-packages" + os.sep) not in c
        do_projeto[fn] = r
    return r


def registrar(frame, evento, extra=None):
    if estado["parado"]:
        return
    with trava:
        estado["passos"] += 1
        if estado["passos"] > LIMITE:
            estado["parado"] = True
            escrever({"t": "limite", "n": LIMITE})
            saida.flush()
            sys.settrace(None)
            threading.settrace(None)
            return
        fn = os.path.abspath(frame.f_code.co_filename)
        if fn not in arquivos:
            arquivos[fn] = len(arquivos)
            escrever({"t": "arq", "i": arquivos[fn], "c": fn})
        chave = id(frame)
        k, antes = quadros.get(chave, (None, None))
        if k is None:
            proximo_k[0] += 1
            k, antes = proximo_k[0], {}
        modulo = frame.f_code.co_name == "<module>"
        agora = variaveis(frame, modulo)
        mudou = {n: v for n, v in agora.items() if antes.get(n) != v}
        sumiu = [n for n in antes if n not in agora]
        quadros[chave] = (k, agora)
        p = {"t": "p", "a": arquivos[fn], "l": frame.f_lineno, "f": frame.f_code.co_name, "k": k, "e": evento}
        if mudou:
            p["v"] = mudou
        if sumiu:
            p["x"] = sumiu
        if texto_novo:
            p["o"] = "".join(texto_novo)
            texto_novo.clear()
        if threading.current_thread() is not threading.main_thread():
            p["th"] = threading.current_thread().name
        if extra:
            p.update(extra)
        escrever(p)
        if evento == "r":
            quadros.pop(chave, None)


def rastro_local(frame, evento, arg):
    if estado["parado"]:
        return None
    if evento == "line":
        registrar(frame, "l")
    elif evento == "return":
        registrar(frame, "r", {"r": mostrar(arg)})
    elif evento == "exception":
        tipo, valor, _ = arg
        registrar(frame, "x", {"erro": f"{tipo.__name__}: {valor}"[:300]})
    return rastro_local


def rastro_global(frame, evento, arg):
    if estado["parado"] or evento != "call" or not eh_do_projeto(frame.f_code):
        return None
    registrar(frame, "c")
    return rastro_local


def main():
    escrever({"t": "inicio", "arquivo": alvo, "raiz": sys.argv[1], "limite": LIMITE, "python": sys.version.split()[0]})
    sys.stdout = Espiao(sys.stdout)
    sys.argv = [alvo]
    sys.path[0] = os.path.dirname(alvo)
    threading.settrace(rastro_global)
    sys.settrace(rastro_global)
    try:
        runpy.run_path(alvo, run_name="__main__")
    except SystemExit:
        raise
    except BaseException as e:
        sys.settrace(None)
        escrever({"t": "erro", "tipo": type(e).__name__, "msg": str(e)[:500]})
        raise
    finally:
        sys.settrace(None)
        threading.settrace(None)
        if texto_novo:
            escrever({"t": "p", "a": -1, "l": 0, "f": "", "k": 0, "e": "o", "o": "".join(texto_novo)})
        escrever({"t": "fim", "passos": min(estado["passos"], LIMITE)})
        saida.flush()


if __name__ == "__main__":
    main()
