"""Grava o app rodando como GIF (PyForge).

Uso: python gravar_gif.py <raiz> <arquivo.py> <saida.gif> [segundos_max]

Abre o programa, acha a janela dele e tira "fotos" dela ~10 vezes por segundo.
Para quando a janela fecha, quando chega "parar" na entrada ou no tempo máximo.
No fim salva o GIF e escreve uma linha  @@PYFORGE_GIF@@ {json}  na saída.
"""
import json
import os
import subprocess
import sys
import threading
import time

FPS = 10
LARGURA_MAX = 800
MARCA = "@@PYFORGE_GIF@@"


def aviso(texto):
    sys.stderr.write("[gravação] " + texto + "\n")
    sys.stderr.flush()


try:
    from PIL import Image, ImageChops, ImageGrab
except ImportError:  # pragma: no cover
    aviso("O Pillow não está disponível; não dá para gravar.")
    sys.exit(3)


# ---------------------------------------------------------------- achar a janela
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            user32.SetProcessDPIAware()
        except Exception:
            pass

    class PROCESSENTRY32(ctypes.Structure):
        _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD), ("th32ProcessID", wintypes.DWORD),
                    ("th32DefaultHeapID", ctypes.c_void_p), ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
                    ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", ctypes.c_long), ("dwFlags", wintypes.DWORD),
                    ("szExeFile", ctypes.c_char * 260)]

    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel32.Process32First.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32)]
    kernel32.Process32Next.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32)]
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    user32.GetWindow.restype = wintypes.HWND
    user32.GetWindow.argtypes = [wintypes.HWND, ctypes.c_uint]

    def familia(pid):
        """O processo e todos os filhos dele (o python do .venv abre outro python)."""
        snap = kernel32.CreateToolhelp32Snapshot(2, 0)
        pais = {}
        e = PROCESSENTRY32()
        e.dwSize = ctypes.sizeof(PROCESSENTRY32)
        ok = kernel32.Process32First(snap, ctypes.byref(e))
        while ok:
            pais.setdefault(e.th32ParentProcessID, []).append(e.th32ProcessID)
            ok = kernel32.Process32Next(snap, ctypes.byref(e))
        kernel32.CloseHandle(snap)
        todos, fila = {pid}, [pid]
        while fila:
            for f in pais.get(fila.pop(), []):
                if f not in todos:
                    todos.add(f)
                    fila.append(f)
        return todos

    def retangulo(hwnd):
        r = wintypes.RECT()
        try:  # sem a sombra da janela
            if ctypes.windll.dwmapi.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(r), ctypes.sizeof(r)) == 0:
                return (r.left, r.top, r.right, r.bottom)
        except Exception:
            pass
        user32.GetWindowRect(hwnd, ctypes.byref(r))
        return (r.left, r.top, r.right, r.bottom)

    def achar_janela(pid):
        pids = familia(pid)
        achadas = []
        PROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

        def cada(hwnd, _):
            if not user32.IsWindowVisible(hwnd) or user32.GetWindow(hwnd, 4):  # 4 = GW_OWNER (diálogos)
                return True
            p = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(p))
            if p.value in pids:
                x0, y0, x1, y1 = retangulo(hwnd)
                if x1 - x0 > 60 and y1 - y0 > 40:
                    achadas.append(((x1 - x0) * (y1 - y0), (x0, y0, x1, y1)))
            return True

        user32.EnumWindows(PROC(cada), 0)
        if not achadas:
            return None
        return max(achadas)[1]  # a maior janela do programa
else:
    def achar_janela(pid):
        """Linux/Mac: tenta o xdotool; sem ele, grava a tela inteira."""
        try:
            saida = subprocess.run(["xdotool", "search", "--onlyvisible", "--pid", str(pid)], capture_output=True, text=True, timeout=2).stdout.split()
            for w in saida:
                g = subprocess.run(["xdotool", "getwindowgeometry", "--shell", w], capture_output=True, text=True, timeout=2).stdout
                d = dict(x.split("=", 1) for x in g.split() if "=" in x)
                x, y, lw, lh = int(d["X"]), int(d["Y"]), int(d["WIDTH"]), int(d["HEIGHT"])
                if lw > 60 and lh > 40:
                    return (x, y, x + lw, y + lh)
        except Exception:
            pass
        return "tela"


def foto(caixa):
    if caixa == "tela":
        return ImageGrab.grab()
    try:
        return ImageGrab.grab(bbox=caixa, all_screens=True)
    except TypeError:
        return ImageGrab.grab(bbox=caixa)


# ---------------------------------------------------------------- gravação
def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    raiz, arquivo, saida = sys.argv[1], sys.argv[2], sys.argv[3]
    maximo = float(sys.argv[4]) if len(sys.argv) > 4 else 60.0
    os.makedirs(os.path.dirname(saida) or ".", exist_ok=True)

    env = dict(os.environ, PYTHONUNBUFFERED="1")
    filho = subprocess.Popen([sys.executable, "-X", "utf8", arquivo], cwd=raiz, env=env, stdin=subprocess.DEVNULL)

    parar = threading.Event()

    def ler_entrada():
        for linha in sys.stdin:
            if linha.strip().lower() in ("parar", "stop", "q"):
                parar.set()
                return

    threading.Thread(target=ler_entrada, daemon=True).start()

    # espera a janela aparecer (o PySide6 pode demorar na primeira vez)
    caixa = None
    limite = time.time() + 90
    while caixa is None and time.time() < limite and filho.poll() is None and not parar.is_set():
        caixa = achar_janela(filho.pid)
        if caixa is None:
            time.sleep(0.25)
    if caixa == "tela":  # sem como achar a janela: espera ela abrir e grava a tela toda
        time.sleep(1.5)
    if caixa is None or filho.poll() is not None:
        if filho.poll() is None:
            aviso("Não achei a janela do programa, então não gravei nada.")
        return filho.wait()
    time.sleep(0.35)  # deixa a janela terminar de desenhar
    aviso(f"gravando… feche a janela ou clique em Parar gravação (máximo {int(maximo)} s)")

    quadros = []  # [imagem, duração_ms]
    passo = 1.0 / FPS
    inicio = time.time()
    proximo = inicio
    while filho.poll() is None and not parar.is_set() and time.time() - inicio < maximo:
        nova = achar_janela(filho.pid) if sys.platform == "win32" else caixa
        if nova is None:  # janela minimizada/fechando
            time.sleep(passo)
            continue
        caixa = nova
        try:
            img = foto(caixa).convert("RGB")
        except Exception as e:  # tela bloqueada, etc.
            aviso(f"não consegui tirar a foto ({e})")
            break
        if img.width > LARGURA_MAX:
            img = img.resize((LARGURA_MAX, round(img.height * LARGURA_MAX / img.width)), Image.LANCZOS)
        ms = round(passo * 1000)
        if quadros and quadros[-1][0].size == img.size and ImageChops.difference(quadros[-1][0], img).getbbox() is None:
            quadros[-1][1] += ms  # igual ao anterior: só estica o tempo
        else:
            quadros.append([img, ms])
        proximo += passo
        time.sleep(max(0.0, proximo - time.time()))
    duracao = time.time() - inicio

    pediu_parar = parar.is_set() and filho.poll() is None
    if pediu_parar:
        filho.terminate()
    try:
        codigo = filho.wait(timeout=5)
    except subprocess.TimeoutExpired:
        filho.kill()
        codigo = filho.wait()
    if pediu_parar:
        codigo = 0  # quem parou foi a pessoa, não foi erro

    if not quadros:
        aviso("Nada foi gravado.")
        return codigo
    tamanho = quadros[0][0].size
    imgs = [q[0] if q[0].size == tamanho else q[0].resize(tamanho) for q in quadros]
    paleta = [i.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for i in imgs]
    paleta[0].save(saida, save_all=True, append_images=paleta[1:], duration=[q[1] for q in quadros], loop=0, optimize=True, disposal=1)
    info = {"arquivo": saida, "segundos": round(duracao, 1), "quadros": len(quadros), "largura": tamanho[0], "altura": tamanho[1], "bytes": os.path.getsize(saida)}
    print(MARCA + " " + json.dumps(info, ensure_ascii=False), flush=True)
    return codigo


if __name__ == "__main__":
    sys.exit(main())
