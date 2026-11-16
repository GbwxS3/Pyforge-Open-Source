package main

type modelo struct {
	Nome      string
	Descricao string
	Icone     string
	Deps      []string
	Arquivos  map[string]string
}

var ordemTemplates = []string{"janela-pyside", "janela-tk", "script", "dados", "jogo", "api", "branco"}

var templates = map[string]modelo{
	"janela-pyside": {
		Nome: "App de janela (PySide6)", Descricao: "Janela moderna com Qt, barra de progresso e thread que não trava", Icone: "monitor",
		Deps: []string{"pyside6-essentials>=6.8"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — app de janela feito com PySide6.

Dica: tarefas demoradas rodam numa thread (TrabalhoLento) para a janela nunca travar.
"""
import sys
import time

from PySide6.QtCore import QThread, Signal
from PySide6.QtWidgets import (
    QApplication,
    QLabel,
    QMainWindow,
    QProgressBar,
    QPushButton,
    QVBoxLayout,
    QWidget,
)


class TrabalhoLento(QThread):
    """Roda fora da thread da interface e avisa o progresso por sinal."""

    progresso = Signal(int)

    def run(self):
        for i in range(1, 101):
            time.sleep(0.02)  # troque pelo seu trabalho de verdade
            self.progresso.emit(i)


class JanelaPrincipal(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("{{NOME}}")
        self.resize(480, 260)

        self.rotulo = QLabel("Olá! Clique no botão para começar.")
        self.barra = QProgressBar()
        self.botao = QPushButton("Começar")
        self.botao.clicked.connect(self.comecar)

        layout = QVBoxLayout()
        layout.addWidget(self.rotulo)
        layout.addWidget(self.barra)
        layout.addWidget(self.botao)
        central = QWidget()
        central.setLayout(layout)
        self.setCentralWidget(central)

    def comecar(self):
        self.botao.setEnabled(False)
        self.rotulo.setText("Trabalhando…")
        self.trabalho = TrabalhoLento()  # guardar em self evita que o coletor de lixo apague a thread
        self.trabalho.progresso.connect(self.barra.setValue)
        self.trabalho.finished.connect(self.terminou)
        self.trabalho.start()

    def terminou(self):
        self.rotulo.setText("Pronto!")
        self.botao.setEnabled(True)


def main():
    app = QApplication(sys.argv)
    janela = JanelaPrincipal()
    janela.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
`},
	},
	"janela-tk": {
		Nome: "App de janela simples (Tkinter)", Descricao: "Janela que já vem com o Python, sem instalar nada", Icone: "janela",
		Deps: []string{},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — app de janela com Tkinter (já vem com o Python)."""
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk

if sys.platform == "win32":
    import ctypes

    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)  # interface nítida em telas de alta resolução
    except Exception:
        pass


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("{{NOME}}")
        self.geometry("460x240")
        self.rotulo = ttk.Label(self, text="Olá! Clique no botão para começar.")
        self.rotulo.pack(pady=(24, 8))
        self.barra = ttk.Progressbar(self, maximum=100, length=320)
        self.barra.pack(pady=8)
        self.botao = ttk.Button(self, text="Começar", command=self.comecar)
        self.botao.pack(pady=8)

    def comecar(self):
        self.botao.state(["disabled"])
        threading.Thread(target=self.trabalho, daemon=True).start()

    def trabalho(self):
        for i in range(1, 101):
            time.sleep(0.02)
            self.after(0, self.barra.configure, {"value": i})  # só a thread da janela mexe na interface
        self.after(0, self.terminou)

    def terminou(self):
        self.rotulo.configure(text="Pronto!")
        self.botao.state(["!disabled"])


if __name__ == "__main__":
    App().mainloop()
`},
	},
	"script": {
		Nome: "Script / automação", Descricao: "Automação com argumentos, logs e um teste pronto", Icone: "relogio",
		Deps: []string{},
		Arquivos: map[string]string{
			"main.py": `"""{{NOME}} — script de automação."""
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)


def processar(pasta: Path) -> int:
    """Conta as linhas dos arquivos .txt de uma pasta (troque pela sua automação)."""
    arquivos = sorted(pasta.glob("*.txt"))
    for arquivo in arquivos:
        texto = arquivo.read_text(encoding="utf-8")
        log.info("%s: %d linha(s)", arquivo.name, texto.count("\n") + 1)
    return len(arquivos)


def main():
    parser = argparse.ArgumentParser(description="{{NOME}}")
    parser.add_argument("pasta", nargs="?", default=".", type=Path)
    args = parser.parse_args()
    total = processar(args.pasta)
    log.info("Pronto: %d arquivo(s).", total)


if __name__ == "__main__":
    main()
`,
			"tests/test_main.py": `from pathlib import Path

from main import processar


def test_processar_conta_so_txt(tmp_path: Path):
    (tmp_path / "a.txt").write_text("um\ndois", encoding="utf-8")
    (tmp_path / "b.md").write_text("ignorado", encoding="utf-8")
    assert processar(tmp_path) == 1
`,
		},
	},
	"dados": {
		Nome: "Ciência de dados", Descricao: "Tabelas com Polars e gráficos com Matplotlib", Icone: "grafico",
		Deps: []string{"polars>=1.0", "matplotlib>=3.8"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — análise de dados com Polars e gráficos com Matplotlib."""
import matplotlib.pyplot as plt
import polars as pl

vendas = pl.DataFrame(
    {
        "mes": ["jan", "fev", "mar", "abr", "mai", "jun"],
        "valor": [1200, 1350, 980, 1610, 1720, 1540],
    }
)

print(vendas)
print("Média:", vendas["valor"].mean())

plt.figure(figsize=(7, 4))
plt.bar(vendas["mes"].to_list(), vendas["valor"].to_list(), color="#3A6AE0")
plt.title("Vendas por mês (exemplo)")
plt.tight_layout()
plt.show()
`},
	},
	"jogo": {
		Nome: "Jogo 2D (pygame)", Descricao: "Loop de jogo, teclado e desenho com pygame-ce", Icone: "jogo",
		Deps: []string{"pygame-ce>=2.5"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — jogo 2D com pygame-ce. Use as setas para mover."""
import pygame

LARGURA, ALTURA = 800, 500


def main():
    pygame.init()
    tela = pygame.display.set_mode((LARGURA, ALTURA))
    pygame.display.set_caption("{{NOME}}")
    relogio = pygame.time.Clock()
    jogador = pygame.FRect(LARGURA / 2 - 20, ALTURA / 2 - 20, 40, 40)
    velocidade = 300  # pixels por segundo

    rodando = True
    while rodando:
        dt = relogio.tick(60) / 1000
        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                rodando = False
        teclas = pygame.key.get_pressed()
        jogador.x += (teclas[pygame.K_RIGHT] - teclas[pygame.K_LEFT]) * velocidade * dt
        jogador.y += (teclas[pygame.K_DOWN] - teclas[pygame.K_UP]) * velocidade * dt
        jogador.clamp_ip(tela.get_rect())

        tela.fill((18, 20, 26))
        pygame.draw.rect(tela, (91, 140, 255), jogador, border_radius=8)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
`},
	},
	"api": {
		Nome: "API web (FastAPI)", Descricao: "API com documentação automática em /docs", Icone: "globo",
		Deps: []string{"fastapi>=0.115", "uvicorn>=0.30"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — API web com FastAPI. Rode e abra http://127.0.0.1:8000/docs"""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="{{NOME}}")


class Tarefa(BaseModel):
    titulo: str
    feita: bool = False


tarefas: list[Tarefa] = []


@app.get("/")
def inicio():
    return {"mensagem": "Olá do {{NOME}}!"}


@app.get("/tarefas")
def listar() -> list[Tarefa]:
    return tarefas


@app.post("/tarefas")
def criar(tarefa: Tarefa) -> Tarefa:
    tarefas.append(tarefa)
    return tarefa


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
`},
	},
	"branco": {
		Nome: "Em branco", Descricao: "Só o ambiente .venv pronto e um main.py", Icone: "arquivo",
		Deps:     []string{},
		Arquivos: map[string]string{"main.py": "print(\"Olá, mundo!\")\n"},
	},
}
