# PyForge — código-fonte do aplicativo (.exe)

Esta é a source **completa do app PyForge** (o programa que vira `PyForge.exe`).
Com ela você compila o `.exe` do zero. Não precisa de internet para compilar: o código Go
usa só a biblioteca padrão (não há dependências externas).

> Este pacote é **só do app**. O instalador, o servidor de contas e o site ficam em projetos
> separados (posso te mandar também, é só pedir).

## Pastas

| Pasta | O que é |
|---|---|
| `*.go` (raiz) | O código do app em Go (editor, Designer, IA, contas, etc.) |
| `assets/` | A interface web, os scripts Python e o editor Monaco — tudo embutido no `.exe` |
| `recursos/` | Ícone e dados de versão do `.exe` do Windows (`pyforge.rc`, `pyforge.ico`) |
| `ferramentas_dev/` | Scripts de build: tradução para inglês e o build protegido |
| `build/` | O "lugar de buildar" a parte web: dependências de Node (Monaco, esbuild…). Só é necessária se você for **regenerar** os assets web ou fazer o build protegido. |

## Pré-requisitos

- **Go 1.24 ou mais novo** — https://go.dev/dl/  (obrigatório)
- **Node.js 18+** — só para o **build protegido** (minificar o código web)
- **llvm-rc / llvm-cvtres** (vem no LLVM) — só para embutir o ícone e a versão no `.exe`.
  No Windows, alternativa: `windres` (do MSYS2/MinGW) ou o pacote Go `go-winres`.

## 1) Build rápido (o jeito mais simples)

Gera um `.exe` que já funciona (sem o ícone/versão embutidos). Rode na raiz do projeto:

**No Windows (PowerShell ou CMD):**
```
go build -o PyForge.exe .
```

**No Linux/Mac, compilando para Windows:**
```
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o PyForge.exe .
```

Pronto — `PyForge.exe` aparece na pasta. Os `assets/` já estão prontos, então não precisa de Node.

## 2) Build com ícone e versão

Primeiro gere o recurso do Windows (`.syso`) e depois compile:
```
cd recursos
llvm-rc -no-preprocess -fo pyforge.res pyforge.rc
llvm-cvtres -machine:x64 -out:../rsrc_windows_amd64.syso pyforge.res
cd ..
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H=windowsgui" -o dist/PyForge.exe .
```
O `-H=windowsgui` faz o app abrir sem uma janela de terminal atrás.

## 3) Build protegido (código web embaralhado + `.exe` sem símbolos)

É o que foi usado nas versões entregues. Precisa de Node e llvm-rc. Na raiz:
```
bash ferramentas_dev/build-release.sh
```
Na primeira vez ele roda `npm install` dentro de `build/` sozinho (baixa esbuild e acorn).
O resultado sai em `dist/PyForge.exe`, com o código da tela minificado e o binário sem nomes internos.
O seu código legível em `assets/` **não** é alterado (o script faz uma cópia, minifica e restaura).

## Observações

- **uv.exe:** o PyForge usa o `uv` (da Astral) para instalar o Python. O app **baixa o `uv` sozinho**
  na primeira vez. Para distribuir já com ele embutido (sem download), baixe de https://github.com/astral-sh/uv/releases
  (o `uv-x86_64-pc-windows-msvc.zip`) e coloque o `uv.exe` numa pasta `ferramentas/` ao lado do `PyForge.exe`.
- **IA local:** o motor (llama-server) e os modelos `.gguf` também são baixados pelo app; não fazem parte da source.
- **Regenerar os assets web** (Monaco etc.): `cd build && npm install` — só é preciso se você mexer nessa parte.
- **Rodar/testar no Linux** (sem gerar o .exe): `go build -o pyforge .` e rode com `./pyforge`.
- **Versão:** troque em `main.go` (`const versao`) e em `recursos/pyforge.rc`.
