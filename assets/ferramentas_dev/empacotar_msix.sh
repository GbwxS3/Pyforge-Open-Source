#!/bin/sh
# Gera o pacote MSIX do PyForge para a Microsoft Store.
# Uso: ferramentas_dev/empacotar_msix.sh <Identity Name> <Publisher (CN=...)> <PublisherDisplayName> <versão a.b.c> <saída.msix>
# Os três primeiros valores vêm do Partner Center (Product identity). makemsix: github.com/microsoft/msix-packaging (--pack).
set -e
NOME="$1"; PUB="$2"; PUBNOME="$3"; VER="$4"; SAIDA="$5"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
MAKEMSIX="${MAKEMSIX:-/tmp/msix-packaging/.vs/bin/makemsix}"
DIR="$(mktemp -d)"
mkdir -p "$DIR/Assets" "$DIR/ferramentas"
cp "$RAIZ/dist/PyForge.exe" "$DIR/"
cp "$RAIZ/dist/LEIA-ME.txt" "$DIR/"
cp "${UV_EXE:-/tmp/pf032/PyForge/ferramentas/uv.exe}" "$DIR/ferramentas/uv.exe"
python3 "$RAIZ/recursos/msix/icones.py" "$DIR/Assets"
esc() { printf '%s' "$1" | sed -e 's/[&/\]/\\&/g' -e 's/"/\&quot;/g'; }
sed -e "s/@NOME@/$(esc "$NOME")/" -e "s/@PUBLISHER@/$(esc "$PUB")/" -e "s/@PUBLISHER_NOME@/$(esc "$PUBNOME")/" -e "s/@VERSAO@/$VER.0/" \
  "$RAIZ/recursos/msix/AppxManifest.xml.modelo" > "$DIR/AppxManifest.xml"
rm -f "$SAIDA"
LD_LIBRARY_PATH="$(dirname "$MAKEMSIX")/../lib" "$MAKEMSIX" pack -d "$DIR" -p "$SAIDA"
echo "pasta do pacote (para testar com Add-AppxPackage -Register): $DIR"
