package main

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

var ignorarPastas = map[string]bool{
	".venv": true, "venv": true, "__pycache__": true, ".git": true, "node_modules": true,
	".ruff_cache": true, ".pytest_cache": true, ".mypy_cache": true, "dist": true, "build": true,
	".idea": true, ".pyforge": true, ".tox": true, ".eggs": true,
}

type itemArvore struct {
	Nome    string        `json:"nome"`
	Caminho string        `json:"caminho"`
	Dir     bool          `json:"dir"`
	Filhos  []*itemArvore `json:"filhos,omitempty"`
}

func montarArvore(pasta string, prof int, cont *int) []*itemArvore {
	ents, err := os.ReadDir(pasta)
	if err != nil {
		return nil
	}
	sort.Slice(ents, func(a, b int) bool {
		if ents[a].IsDir() != ents[b].IsDir() {
			return ents[a].IsDir()
		}
		return strings.ToLower(ents[a].Name()) < strings.ToLower(ents[b].Name())
	})
	out := []*itemArvore{}
	for _, e := range ents {
		if *cont > 4000 {
			break
		}
		nome := e.Name()
		if e.IsDir() && (ignorarPastas[nome] || strings.HasSuffix(nome, ".egg-info")) {
			continue
		}
		if nome == ".DS_Store" || strings.HasSuffix(nome, ".pyc") {
			continue
		}
		*cont++
		it := &itemArvore{Nome: nome, Caminho: filepath.Join(pasta, nome), Dir: e.IsDir()}
		if e.IsDir() && prof < 10 {
			it.Filhos = montarArvore(it.Caminho, prof+1, cont)
		}
		out = append(out, it)
	}
	return out
}

func apiArvore(w http.ResponseWriter, r *http.Request) {
	raiz := r.URL.Query().Get("raiz")
	if !permitido(raiz) {
		erroJSON(w, 403, "pasta não permitida")
		return
	}
	cont := 0
	escreverJSON(w, map[string]any{"itens": montarArvore(raiz, 0, &cont)})
}

func apiLer(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("caminho")
	if !permitido(p) {
		erroJSON(w, 403, "arquivo não permitido")
		return
	}
	st, err := os.Stat(p)
	if err != nil {
		erroJSON(w, 404, "arquivo não encontrado")
		return
	}
	if st.Size() > 8<<20 {
		escreverJSON(w, map[string]any{"grande": true, "mtime": st.ModTime().UnixMilli()})
		return
	}
	b, err := os.ReadFile(p)
	if err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	amostra := b
	if len(amostra) > 8000 {
		amostra = amostra[:8000]
	}
	if bytes.IndexByte(amostra, 0) >= 0 {
		escreverJSON(w, map[string]any{"binario": true, "mtime": st.ModTime().UnixMilli()})
		return
	}
	escreverJSON(w, map[string]any{"conteudo": string(b), "mtime": st.ModTime().UnixMilli()})
}

func apiEscrever(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho  string `json:"caminho"`
		Conteudo string `json:"conteudo"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Caminho) {
		erroJSON(w, 403, "não posso salvar aqui")
		return
	}
	os.MkdirAll(filepath.Dir(p.Caminho), 0o755)
	tmp := p.Caminho + ".pyforge-tmp"
	if err := os.WriteFile(tmp, []byte(p.Conteudo), 0o644); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	if err := os.Rename(tmp, p.Caminho); err != nil {
		os.Remove(tmp)
		if err2 := os.WriteFile(p.Caminho, []byte(p.Conteudo), 0o644); err2 != nil {
			erroJSON(w, 500, err2.Error())
			return
		}
	}
	st, _ := os.Stat(p.Caminho)
	escreverJSON(w, map[string]any{"ok": true, "mtime": st.ModTime().UnixMilli()})
}

func apiCriar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho string `json:"caminho"`
		Dir     bool   `json:"dir"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Caminho) {
		erroJSON(w, 403, "não posso criar aqui")
		return
	}
	if _, err := os.Stat(p.Caminho); err == nil {
		erroJSON(w, 409, "já existe um item com esse nome")
		return
	}
	var err error
	if p.Dir {
		err = os.MkdirAll(p.Caminho, 0o755)
	} else {
		os.MkdirAll(filepath.Dir(p.Caminho), 0o755)
		err = os.WriteFile(p.Caminho, []byte{}, 0o644)
	}
	if err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiRenomear(w http.ResponseWriter, r *http.Request) {
	var p struct {
		De   string `json:"de"`
		Para string `json:"para"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.De) || !permitido(p.Para) {
		erroJSON(w, 403, "não posso renomear aqui")
		return
	}
	if _, err := os.Stat(p.Para); err == nil {
		erroJSON(w, 409, "já existe um item com esse nome")
		return
	}
	if err := os.Rename(p.De, p.Para); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiApagar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho string `json:"caminho"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Caminho) {
		erroJSON(w, 403, "não posso apagar aqui")
		return
	}
	for _, raiz := range raizesPermitidas() {
		if normalizar(raiz) == normalizar(p.Caminho) {
			erroJSON(w, 403, "não apago a pasta inteira do projeto por aqui")
			return
		}
	}
	// Em vez de apagar de vez, move para a lixeira do PyForge.
	lixeira := filepath.Join(dataDir, "lixeira", time.Now().Format("20060102-150405"))
	os.MkdirAll(lixeira, 0o755)
	destino := filepath.Join(lixeira, filepath.Base(p.Caminho))
	if err := os.Rename(p.Caminho, destino); err != nil {
		if err2 := os.RemoveAll(p.Caminho); err2 != nil {
			erroJSON(w, 500, err2.Error())
			return
		}
	}
	escreverJSON(w, map[string]any{"ok": true, "lixeira": destino})
}

var extTexto = map[string]bool{
	".py": true, ".pyi": true, ".txt": true, ".md": true, ".toml": true, ".json": true, ".cfg": true,
	".ini": true, ".yaml": true, ".yml": true, ".html": true, ".css": true, ".js": true, ".ts": true,
	".csv": true, ".sql": true, ".qss": true, ".env": true, ".rst": true, ".xml": true, ".ui": true,
}

func apiBuscar(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	raiz, termo := q.Get("raiz"), q.Get("q")
	if !permitido(raiz) || termo == "" {
		escreverJSON(w, map[string]any{"resultados": []any{}})
		return
	}
	var re *regexp.Regexp
	if q.Get("regex") == "1" {
		var err error
		flags := ""
		if q.Get("maiusc") != "1" {
			flags = "(?i)"
		}
		re, err = regexp.Compile(flags + termo)
		if err != nil {
			erroJSON(w, 400, "expressão regular inválida")
			return
		}
	} else {
		flags := "(?i)"
		if q.Get("maiusc") == "1" {
			flags = ""
		}
		re = regexp.MustCompile(flags + regexp.QuoteMeta(termo))
	}
	type res struct {
		Arquivo string `json:"arquivo"`
		Linha   int    `json:"linha"`
		Coluna  int    `json:"coluna"`
		Texto   string `json:"texto"`
	}
	out := []res{}
	filepath.WalkDir(raiz, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if len(out) >= 500 {
			return filepath.SkipAll
		}
		if d.IsDir() {
			if p != raiz && (ignorarPastas[d.Name()] || strings.HasPrefix(d.Name(), ".")) {
				return filepath.SkipDir
			}
			return nil
		}
		if !extTexto[strings.ToLower(filepath.Ext(p))] {
			return nil
		}
		if info, err := d.Info(); err != nil || info.Size() > 2<<20 {
			return nil
		}
		f, err := os.Open(p)
		if err != nil {
			return nil
		}
		defer f.Close()
		sc := bufio.NewScanner(f)
		sc.Buffer(make([]byte, 64*1024), 1<<20)
		n := 0
		for sc.Scan() {
			n++
			linha := sc.Text()
			if loc := re.FindStringIndex(linha); loc != nil {
				t := linha
				if len(t) > 240 {
					t = t[:240]
				}
				out = append(out, res{Arquivo: p, Linha: n, Coluna: loc[0] + 1, Texto: t})
				if len(out) >= 500 {
					break
				}
			}
		}
		return nil
	})
	escreverJSON(w, map[string]any{"resultados": out})
}

func apiRevelar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho string `json:"caminho"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Caminho) {
		erroJSON(w, 403, "não permitido")
		return
	}
	revelarNoSistema(p.Caminho)
	escreverJSON(w, map[string]any{"ok": true})
}

// apiBruto entrega o arquivo como está (imagens do projeto no Designer).
func apiBruto(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("caminho")
	if !permitido(p) {
		http.Error(w, "não permitido", http.StatusForbidden)
		return
	}
	st, err := os.Stat(p)
	if err != nil || st.IsDir() || st.Size() > 50<<20 {
		http.NotFound(w, r)
		return
	}
	tipos := map[string]string{".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp", ".ico": "image/x-icon", ".svg": "image/svg+xml"}
	tipo, ok := tipos[strings.ToLower(filepath.Ext(p))]
	if !ok {
		http.Error(w, "tipo não suportado", http.StatusUnsupportedMediaType)
		return
	}
	w.Header().Set("Content-Type", tipo)
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if tipo == "image/svg+xml" {
		w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
	}
	http.ServeFile(w, r, p)
}

// apiEscreverB64 grava um arquivo binário (imagem arrastada para o Designer).
func apiEscreverB64(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho string `json:"caminho"`
		Dados   string `json:"dados"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Caminho) {
		erroJSON(w, 403, "não posso salvar aqui")
		return
	}
	b, err := base64.StdEncoding.DecodeString(p.Dados)
	if err != nil {
		erroJSON(w, 400, "dados inválidos")
		return
	}
	os.MkdirAll(filepath.Dir(p.Caminho), 0o755)
	if err := os.WriteFile(p.Caminho, b, 0o644); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}
