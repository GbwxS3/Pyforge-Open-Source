# PyForge — código-fonte (v0.1.1)

## Estrutura
- `main.go`, `config.go`, `proc.go`, `arquivos.go`, `projetos.go`, `templates.go`, `pyferramentas.go`, `ia.go` — servidor local em Go (só biblioteca padrão).
- `plataforma_windows.go` / `plataforma_outros.go` — janela (Edge em modo app), processos, DPAPI, seletor de pasta.
- `assets/web/` — interface (HTML/CSS/JS, sem framework). `js/editor.js`, `js/designer.js`, `js/lobby.js`, `js/config.js`, `js/ia.js`.
- `assets/py/assistente_py.py` — detector de armadilhas + autocompletar (jedi).
- `assets/prompts/assistente.md` — prompt da IA (o compacto é usado com Ollama).

## Como compilar
Precisa de Go 1.24+ e Node/npm (só para baixar o Monaco).

```bash
# 1. Monaco (editor)
npm install monaco-editor@0.57.0
cp -r node_modules/monaco-editor/min/vs assets/web/monaco-vs

# 2. uv para Windows (vai AO LADO do .exe, em dist/ferramentas/uv.exe — não embutido,
#    porque extrair e rodar um exe escondido faz antivírus acusarem alarme falso)
mkdir -p dist/ferramentas
pip download uv --no-deps --platform win_amd64 --only-binary=:all: -d tmp
python -c "import zipfile,glob;z=zipfile.ZipFile(glob.glob('tmp/uv-*.whl')[0]);n=[x for x in z.namelist() if x.endswith('/uv.exe')][0];open('dist/ferramentas/uv.exe','wb').write(z.read(n))"

# 3. Ícone, versão e manifesto (gera rsrc_windows_amd64.syso, que o Go embute sozinho)
cd recursos && llvm-rc -no-preprocess -fo pyforge.res pyforge.rc && llvm-cvtres -machine:x64 -out:../rsrc_windows_amd64.syso pyforge.res && cd ..

# 4. Compilar (sem -s -w: binário com símbolos é menos acusado por antivírus)
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H=windowsgui" -o dist/PyForge.exe .
```

Para testar no Linux/macOS: `go build -o pyforge . && ./pyforge --sem-janela --porta 8765 --token abc123` e abra `http://127.0.0.1:8765/#t=abc123`.

## Catálogo de erros
- `assets/web/js/erros_catalogo.js` tem todas as explicações (Python, bibliotecas, Windows, ferramentas).
- Depois de mudar o grupo "Sintaxe", rode `node ferramentas_dev/gerar_sintaxe_py.mjs` para atualizar
  a lista `TRADUCOES` do `assets/py/assistente_py.py` (painel Problemas).

## Inglês (js-en)
A interface em inglês é gerada: `ACORN_DIR=<pasta com node_modules de acorn e acorn-walk> node ferramentas_dev/traduzir_en.mjs`.
Ela lê `ferramentas_dev/i18n_en.json` + `i18n_en_extra.json` (texto em português → inglês) e escreve `assets/web/js-en/`.
Rode de novo sempre que mudar textos em assets/web/js. Frases com números: use `fmt('há {n} min', { n })` (de ui.js) para a frase inteira ser traduzível.
Mensagens do servidor: idioma.go. Modelos de projeto: templates_en.go.
