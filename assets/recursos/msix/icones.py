"""Gera os ícones do pacote MSIX (Microsoft Store) a partir do logo do PyForge."""
import asyncio
import sys

from playwright.async_api import async_playwright

SAIDA = sys.argv[1]

ICONE = """<div style="position:relative;width:{s}px;height:{s}px;border-radius:{r}px;background:linear-gradient(145deg,#5A88F5 0%,#3A6AE0 48%,#2950BE 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 {b}px 0 rgba(255,255,255,.28)">
<svg width="{g}" height="{g}" viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M15 7l5 5-5 5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div style="position:absolute;right:{po}px;bottom:{po}px;width:{p}px;height:{p}px;border-radius:50%;background:#F2C14E;border:{pb}px solid #0a1024;box-sizing:border-box"></div></div>"""


def icone(s):
    return ICONE.format(s=s, r=round(s * 0.255), b=max(1, round(s / 150)), g=round(s * 0.68), p=round(s * 0.24), pb=max(1, round(s * 0.045)), po=round(-s * 0.02))


# (arquivo, largura, altura, tamanho do ícone, com nome?)
ITENS = [
    ("StoreLogo.png", 50, 50, 46, False),
    ("Square44x44Logo.png", 44, 44, 42, False),
    ("Square44x44Logo.targetsize-16.png", 16, 16, 16, False),
    ("Square44x44Logo.targetsize-24.png", 24, 24, 24, False),
    ("Square44x44Logo.targetsize-32.png", 32, 32, 32, False),
    ("Square44x44Logo.targetsize-48.png", 48, 48, 46, False),
    ("Square44x44Logo.targetsize-256.png", 256, 256, 244, False),
    ("Square71x71Logo.png", 71, 71, 52, False),
    ("Square150x150Logo.png", 150, 150, 96, False),
    ("Square310x310Logo.png", 310, 310, 190, False),
    ("Wide310x150Logo.png", 310, 150, 84, True),
]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for nome, w, h, s, texto in ITENS:
            pg = await b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            extra = '<div style="font:800 46px Inter,sans-serif;letter-spacing:-1.5px;color:#fff;margin-left:14px">PyForge</div>' if texto else ""
            await pg.set_content(f'<html><body style="margin:0;background:transparent"><div style="width:{w}px;height:{h}px;display:flex;align-items:center;justify-content:center">{icone(s)}{extra}</div></body></html>')
            await pg.screenshot(path=f"{SAIDA}/{nome}", omit_background=True)
            await pg.close()
        await b.close()


asyncio.run(main())
