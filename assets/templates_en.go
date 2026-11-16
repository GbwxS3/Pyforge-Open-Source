package main

// Os mesmos modelos de projeto, em inglês (Configurações › Idioma = English).
var templatesEN = map[string]modelo{
	"janela-pyside": {
		Nome: "Window app (PySide6)", Descricao: "Modern Qt window, progress bar and a thread that never freezes", Icone: "monitor",
		Deps: []string{"pyside6-essentials>=6.8"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — window app made with PySide6.

Tip: slow tasks run in a thread (SlowWork) so the window never freezes.
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


class SlowWork(QThread):
    """Runs outside the UI thread and reports progress through a signal."""

    progress = Signal(int)

    def run(self):
        for i in range(1, 101):
            time.sleep(0.02)  # replace with your real work
            self.progress.emit(i)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("{{NOME}}")
        self.resize(480, 260)

        self.label = QLabel("Hi! Click the button to start.")
        self.bar = QProgressBar()
        self.button = QPushButton("Start")
        self.button.clicked.connect(self.start)

        layout = QVBoxLayout()
        layout.addWidget(self.label)
        layout.addWidget(self.bar)
        layout.addWidget(self.button)
        central = QWidget()
        central.setLayout(layout)
        self.setCentralWidget(central)

    def start(self):
        self.button.setEnabled(False)
        self.label.setText("Working…")
        self.work = SlowWork()  # keeping it on self stops the garbage collector from deleting the thread
        self.work.progress.connect(self.bar.setValue)
        self.work.finished.connect(self.done)
        self.work.start()

    def done(self):
        self.label.setText("Done!")
        self.button.setEnabled(True)


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
`},
	},
	"janela-tk": {
		Nome: "Simple window app (Tkinter)", Descricao: "A window that comes with Python, nothing to install", Icone: "janela",
		Deps: []string{},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — window app with Tkinter (comes with Python)."""
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk

if sys.platform == "win32":
    import ctypes

    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)  # sharp UI on high-resolution screens
    except Exception:
        pass


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("{{NOME}}")
        self.geometry("460x240")
        self.label = ttk.Label(self, text="Hi! Click the button to start.")
        self.label.pack(pady=(24, 8))
        self.bar = ttk.Progressbar(self, maximum=100, length=320)
        self.bar.pack(pady=8)
        self.button = ttk.Button(self, text="Start", command=self.start)
        self.button.pack(pady=8)

    def start(self):
        self.button.state(["disabled"])
        threading.Thread(target=self.work, daemon=True).start()

    def work(self):
        for i in range(1, 101):
            time.sleep(0.02)
            self.after(0, self.bar.configure, {"value": i})  # only the window thread touches the UI
        self.after(0, self.done)

    def done(self):
        self.label.configure(text="Done!")
        self.button.state(["!disabled"])


if __name__ == "__main__":
    App().mainloop()
`},
	},
	"script": {
		Nome: "Script / automation", Descricao: "Automation with arguments, logs and a ready test", Icone: "relogio",
		Deps: []string{},
		Arquivos: map[string]string{
			"main.py": `"""{{NOME}} — automation script."""
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)


def process(folder: Path) -> int:
    """Counts the lines of the .txt files in a folder (replace with your automation)."""
    files = sorted(folder.glob("*.txt"))
    for file in files:
        text = file.read_text(encoding="utf-8")
        log.info("%s: %d line(s)", file.name, text.count("\n") + 1)
    return len(files)


def main():
    parser = argparse.ArgumentParser(description="{{NOME}}")
    parser.add_argument("folder", nargs="?", default=".", type=Path)
    args = parser.parse_args()
    total = process(args.folder)
    log.info("Done: %d file(s).", total)


if __name__ == "__main__":
    main()
`,
			"tests/test_main.py": `from pathlib import Path

from main import process


def test_process_counts_only_txt(tmp_path: Path):
    (tmp_path / "a.txt").write_text("one\ntwo", encoding="utf-8")
    (tmp_path / "b.md").write_text("ignored", encoding="utf-8")
    assert process(tmp_path) == 1
`,
		},
	},
	"dados": {
		Nome: "Data science", Descricao: "Tables with Polars and charts with Matplotlib", Icone: "grafico",
		Deps: []string{"polars>=1.0", "matplotlib>=3.8"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — data analysis with Polars and charts with Matplotlib."""
import matplotlib.pyplot as plt
import polars as pl

sales = pl.DataFrame(
    {
        "month": ["jan", "feb", "mar", "apr", "may", "jun"],
        "value": [1200, 1350, 980, 1610, 1720, 1540],
    }
)

print(sales)
print("Average:", sales["value"].mean())

plt.figure(figsize=(7, 4))
plt.bar(sales["month"].to_list(), sales["value"].to_list(), color="#3A6AE0")
plt.title("Sales per month (example)")
plt.tight_layout()
plt.show()
`},
	},
	"jogo": {
		Nome: "2D game (pygame)", Descricao: "Game loop, keyboard and drawing with pygame-ce", Icone: "jogo",
		Deps: []string{"pygame-ce>=2.5"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — 2D game with pygame-ce. Use the arrow keys to move."""
import pygame

WIDTH, HEIGHT = 800, 500


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("{{NOME}}")
    clock = pygame.time.Clock()
    player = pygame.FRect(WIDTH / 2 - 20, HEIGHT / 2 - 20, 40, 40)
    speed = 300  # pixels per second

    running = True
    while running:
        dt = clock.tick(60) / 1000
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        keys = pygame.key.get_pressed()
        player.x += (keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]) * speed * dt
        player.y += (keys[pygame.K_DOWN] - keys[pygame.K_UP]) * speed * dt
        player.clamp_ip(screen.get_rect())

        screen.fill((18, 20, 26))
        pygame.draw.rect(screen, (91, 140, 255), player, border_radius=8)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
`},
	},
	"api": {
		Nome: "Web API (FastAPI)", Descricao: "API with automatic docs at /docs", Icone: "globo",
		Deps: []string{"fastapi>=0.115", "uvicorn>=0.30"},
		Arquivos: map[string]string{"main.py": `"""{{NOME}} — web API with FastAPI. Run it and open http://127.0.0.1:8000/docs"""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="{{NOME}}")


class Task(BaseModel):
    title: str
    done: bool = False


tasks: list[Task] = []


@app.get("/")
def home():
    return {"message": "Hello from {{NOME}}!"}


@app.get("/tasks")
def list_tasks() -> list[Task]:
    return tasks


@app.post("/tasks")
def create(task: Task) -> Task:
    tasks.append(task)
    return task


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
`},
	},
	"branco": {
		Nome: "Blank", Descricao: "Just the .venv environment ready and a main.py", Icone: "arquivo",
		Deps:     []string{},
		Arquivos: map[string]string{"main.py": "print(\"Hello, world!\")\n"},
	},
}

// modeloDoIdioma devolve o modelo no idioma escolhido nas configurações.
func modeloDoIdioma(id string) (modelo, bool) {
	if cfgString("idioma") == "en" {
		if t, ok := templatesEN[id]; ok {
			return t, true
		}
	}
	t, ok := templates[id]
	return t, ok
}
