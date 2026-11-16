# PyForge — código-fonte (backup)

Este zip tem o código-fonte completo do PyForge, do jeito que ficou em 14/11/2026.
Com ele dá para reconstruir o `.exe`, o instalador e os servidores, ou continuar o desenvolvimento.

Para retomar num chat novo do Claude: mande este zip e diga "continue o PyForge daqui".

## O que é cada pasta

- **(raiz)** — o app PyForge em Go. Arquivos `.go` (main.go, editor, designer, IA, contas, etc.)
  e `assets/` (a interface web, os scripts Python e o editor Monaco).
- **instalador/** — o instalador próprio do PyForge (Go + interface web em `ui/`).
- **servidor-contas-cloudflare/** — o servidor de contas que está no ar (Cloudflare Workers): `worker.js`.
- **servidor-contas/** — a mesma coisa, versão em Go (para rodar num servidor Linux próprio). Não está em uso.
- **ferramentas_dev/** — scripts de desenvolvimento: tradução para inglês e o build protegido.
- **recursos/** — ícone e dados de versão do `.exe` do Windows.
- **site/** — o código do site pyforge.online (uma página `index.html`).

## Onde ficam coisas importantes

- **Endereço do servidor de contas:** `conta.go`, constante `contasPadrao`
  (hoje: `https://pyforge-contas.pyforge-app.workers.dev`).
- **Catálogo da IA** (modelos e tamanhos): `ia_local.go`, variável `catalogoIA`.
- **Data de lançamento no site:** `site/index.html`, constante `LAUNCH`.
- **Versão:** `main.go` (`const versao`) e `recursos/pyforge.rc`.

## Como reconstruir (precisa de Go 1.24, Node e, no Windows, llvm-rc)

### 1. O app PyForge (build protegido, igual ao que foi entregue)
```
bash ferramentas_dev/build-release.sh
```
Gera `dist/PyForge.exe` com o código embaralhado e sem símbolos.
(Para um teste rápido no Linux, sem proteção: `go build -o pyforge .`)

### 2. O instalador
```
# 1) monta o "payload" com o exe + uv.exe + LEIA-ME:
#    coloque PyForge.exe, LEIA-ME.txt e ferramentas/uv.exe numa pasta e:
#    (dentro dessa pasta)  zip -r .../instalador/payload/pyforge.zip .
# 2) compila o instalador:
cd instalador
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui" -o PyForge-Installer.exe .
```

### 3. O servidor de contas (Cloudflare)
Já está no ar. O código é `servidor-contas-cloudflare/worker.js`.
Para atualizar: cole o conteúdo novo no Worker `pyforge-contas` no painel da Cloudflare e clique em Deploy.

## Observações

- O `uv.exe` (em `ferramentas/` do pacote entregue) não vai neste backup por ser grande e
  baixável; o próprio PyForge baixa o `uv` sozinho na primeira vez se faltar.
- A IA (motor llama-server + modelo .gguf) é baixada pelo app; não faz parte do código.
- Os trailers e vídeos foram feitos em outra pasta (fora deste projeto) e não estão aqui.
  Se quiser o código deles também, é só pedir.
