#!/usr/bin/env bash
# Build protegido do PyForge:
#  - minifica e embaralha todo o código web (JS/CSS), tira comentários e nomes legíveis
#  - compila o .exe sem símbolos nem caminhos (nada de nomes internos)
#  - o código legível do projeto é preservado (restaurado no fim)
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$PWD"
ES="${ESBUILD:-build/node_modules/.bin/esbuild}"
ACORN="${ACORN_DIR:-build/node_modules}"
BK="$(mktemp -d)"

if [ ! -x "$ES" ]; then
  echo "0/5  instalando ferramentas de build (esbuild, acorn)…"
  ( cd build && npm install --no-audit --no-fund )
fi
echo "1/5  guardando o código legível…"
cp -r assets/web "$BK/web"

echo "2/5  gerando a versão em inglês a partir do código legível…"
ACORN_DIR="$ACORN" node ferramentas_dev/traduzir_en.mjs >/dev/null

echo "3/5  minificando e embaralhando o código web…"
minjs() { # minifica um arquivo .js no lugar, preservando os imports entre módulos
  "$ES" "$1" --minify --format=esm --charset=utf8 --legal-comments=none > "$1.min" && mv "$1.min" "$1"
}
export -f minjs; export ES
find assets/web/js assets/web/js-en -name '*.js' -exec bash -c 'minjs "$0"' {} \;
for c in assets/web/css/*.css; do "$ES" "$c" --minify --charset=utf8 --legal-comments=none > "$c.min" && mv "$c.min" "$c"; done
# HTML: tira só os comentários (seguro)
for h in assets/web/*.html; do [ -e "$h" ] && perl -0pi -e 's/<!--(?!\[if).*?-->//gs' "$h"; done

# remove caches de Python que vazariam caminhos de build
find assets -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
find assets -name '*.pyc' -delete 2>/dev/null || true

echo "4/5  compilando o .exe protegido (sem símbolos nem caminhos)…"
( cd recursos && llvm-rc -no-preprocess -fo pyforge.res pyforge.rc && llvm-cvtres -machine:x64 -out:../rsrc_windows_amd64.syso pyforge.res )
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath \
  -ldflags "-s -w -H=windowsgui -buildid=" -o dist/PyForge.exe .

echo "5/5  restaurando o código legível do projeto…"
rm -rf assets/web && mv "$BK/web" assets/web && rmdir "$BK" 2>/dev/null || true
echo "OK  →  dist/PyForge.exe"
