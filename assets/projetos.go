package main

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
)

type infoProjeto struct {
	Nome        string   `json:"nome"`
	Caminho     string   `json:"caminho"`
	Modificado  int64    `json:"modificado"`
	Template    string   `json:"template"`
	Cor         string   `json:"cor"`
	Python      string   `json:"python"`
	Deps        []string `json:"deps"`
	Git         bool     `json:"git"`
	ArquivosPy  int      `json:"arquivosPy"`
	Telas       int      `json:"telas"`
	Venv        bool     `json:"venv"`
	NoWorkspace bool     `json:"noWorkspace"`
}

var reDeps = regexp.MustCompile(`(?s)dependencies\s*=\s*\[(.*?)\]`)
var reStr = regexp.MustCompile(`"([^"]+)"`)

func lerInfoProjeto(p string) *infoProjeto {
	st, err := os.Stat(p)
	if err != nil || !st.IsDir() {
		return nil
	}
	info := &infoProjeto{Nome: filepath.Base(p), Caminho: p, Modificado: st.ModTime().UnixMilli(), Deps: []string{}}
	if b, err := os.ReadFile(filepath.Join(p, ".pyforge", "projeto.json")); err == nil {
		var meta map[string]string
		json.Unmarshal(b, &meta)
		info.Template = meta["template"]
		info.Cor = meta["cor"]
		if meta["nome"] != "" {
			info.Nome = meta["nome"]
		}
	}
	if b, err := os.ReadFile(filepath.Join(p, ".python-version")); err == nil {
		info.Python = strings.TrimSpace(string(b))
	}
	if b, err := os.ReadFile(filepath.Join(p, "pyproject.toml")); err == nil {
		if m := reDeps.FindSubmatch(b); m != nil {
			for _, d := range reStr.FindAllSubmatch(m[1], -1) {
				nome := regexp.MustCompile(`^[A-Za-z0-9_.\-]+`).FindString(string(d[1]))
				if nome != "" {
					info.Deps = append(info.Deps, nome)
				}
			}
		}
	}
	if _, err := os.Stat(filepath.Join(p, ".git")); err == nil {
		info.Git = true
	}
	if _, err := os.Stat(filepath.Join(p, ".venv")); err == nil {
		info.Venv = true
	}
	cont := 0
	filepath.WalkDir(p, func(q string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() && q != p && (ignorarPastas[d.Name()] || strings.HasPrefix(d.Name(), ".")) {
			return filepath.SkipDir
		}
		cont++
		if cont > 3000 {
			return filepath.SkipAll
		}
		if !d.IsDir() {
			if strings.HasSuffix(q, ".py") {
				info.ArquivosPy++
			}
			if strings.HasSuffix(q, ".pyforge.json") {
				info.Telas++
			}
			if fi, err := d.Info(); err == nil && fi.ModTime().UnixMilli() > info.Modificado {
				info.Modificado = fi.ModTime().UnixMilli()
			}
		}
		return nil
	})
	return info
}

func apiProjetos(w http.ResponseWriter, r *http.Request) {
	ws := workspace()
	vistos := map[string]bool{}
	lista := []*infoProjeto{}
	if ents, err := os.ReadDir(ws); err == nil {
		for _, e := range ents {
			if !e.IsDir() || strings.HasPrefix(e.Name(), ".") {
				continue
			}
			p := filepath.Join(ws, e.Name())
			if info := lerInfoProjeto(p); info != nil {
				info.NoWorkspace = true
				lista = append(lista, info)
				vistos[normalizar(p)] = true
			}
		}
	}
	for _, p := range recentes() {
		if vistos[normalizar(p)] {
			continue
		}
		if info := lerInfoProjeto(p); info != nil {
			lista = append(lista, info)
			vistos[normalizar(p)] = true
		}
	}
	sort.Slice(lista, func(a, b int) bool { return lista[a].Modificado > lista[b].Modificado })
	escreverJSON(w, map[string]any{"workspace": ws, "projetos": lista})
}

func slug(nome string) string {
	acentos := strings.NewReplacer("á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a", "é", "e", "è", "e", "ê", "e", "ë", "e",
		"í", "i", "ì", "i", "î", "i", "ï", "i", "ó", "o", "ò", "o", "ô", "o", "õ", "o", "ö", "o", "ú", "u", "ù", "u", "û", "u", "ü", "u",
		"ç", "c", "ñ", "n", "Á", "a", "À", "a", "Â", "a", "Ã", "a", "É", "e", "Ê", "e", "Í", "i", "Ó", "o", "Ô", "o", "Õ", "o", "Ú", "u", "Ç", "c")
	t := acentos.Replace(nome)
	var b strings.Builder
	for _, r := range t {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			b.WriteRune(unicode.ToLower(r))
		default:
			b.WriteRune('-')
		}
	}
	s := regexp.MustCompile(`-+`).ReplaceAllString(b.String(), "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "projeto"
	}
	if s[0] >= '0' && s[0] <= '9' {
		s = "p-" + s
	}
	return s
}

var coresProjeto = []string{"#8FB0FF", "#7EE2A0", "#D7B4FF", "#FFD98A", "#FFB59A", "#9FE7FF", "#FF9CC8"}

func apiCriarProjeto(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Nome     string `json:"nome"`
		Template string `json:"template"`
		Python   string `json:"python"`
	}
	if lerJSON(r, &p) != nil || strings.TrimSpace(p.Nome) == "" {
		erroJSON(w, 400, "dê um nome ao projeto")
		return
	}
	t, ok := modeloDoIdioma(p.Template)
	if !ok {
		t, _ = modeloDoIdioma("branco")
		p.Template = "branco"
	}
	if !regexp.MustCompile(`^3\.\d{1,2}$`).MatchString(p.Python) {
		p.Python = "3.13"
	}
	pasta := slug(p.Nome)
	destino := filepath.Join(workspace(), pasta)
	if _, err := os.Stat(destino); err == nil {
		erroJSON(w, 409, "já existe um projeto com esse nome")
		return
	}
	pacote := strings.ReplaceAll(pasta, "_", "-")
	trocas := strings.NewReplacer("{{NOME}}", strings.TrimSpace(p.Nome), "{{PACOTE}}", pacote, "{{PYVER}}", p.Python)
	arquivos := map[string]string{
		"README.md":       "# {{NOME}}\n\nProjeto criado com o PyForge.\n\n## Como rodar\n\nAbra no PyForge e aperte **Executar** (F5), ou no terminal:\n\n    uv run main.py\n",
		".gitignore":      ".venv/\n__pycache__/\n*.pyc\ndist/\nbuild/\n*.spec\n.pytest_cache/\n.ruff_cache/\n.pyforge/\n",
		".python-version": "{{PYVER}}\n",
		"pyproject.toml":  montarPyproject(t),
	}
	for k, v := range t.Arquivos {
		arquivos[k] = v
	}
	for nome, conteudo := range arquivos {
		alvo := filepath.Join(destino, filepath.FromSlash(nome))
		os.MkdirAll(filepath.Dir(alvo), 0o755)
		if err := os.WriteFile(alvo, []byte(trocas.Replace(conteudo)), 0o644); err != nil {
			erroJSON(w, 500, err.Error())
			return
		}
	}
	cor := coresProjeto[int(time.Now().UnixNano()/1000)%len(coresProjeto)]
	meta, _ := json.MarshalIndent(map[string]string{"nome": strings.TrimSpace(p.Nome), "template": p.Template, "cor": cor, "criado": time.Now().Format(time.RFC3339)}, "", "  ")
	os.MkdirAll(filepath.Join(destino, ".pyforge"), 0o755)
	os.WriteFile(filepath.Join(destino, ".pyforge", "projeto.json"), meta, 0o644)

	if gitp, err := exec.LookPath("git"); err == nil {
		for _, args := range [][]string{
			{"init", "-q"},
			{"add", "-A"},
			{"-c", "user.name=PyForge", "-c", "user.email=pyforge@local", "commit", "-q", "-m", "Projeto criado pelo PyForge"},
		} {
			c := exec.Command(gitp, args...)
			c.Dir = destino
			if _, _, err := rodarCurto(c, "", 15*time.Second); err != nil {
				break
			}
		}
	}
	resp := map[string]any{"caminho": destino}
	if uvPath != "" {
		if j, err := iniciarJob(cmdUV(destino, "sync"), "Preparando o ambiente (uv sync)"); err == nil {
			resp["job"] = j.id
		}
	}
	escreverJSON(w, resp)
}

func montarPyproject(t modelo) string {
	var b strings.Builder
	b.WriteString("[project]\nname = \"{{PACOTE}}\"\nversion = \"0.1.0\"\ndescription = \"" + t.Descricao + "\"\nreadme = \"README.md\"\nrequires-python = \">={{PYVER}}\"\ndependencies = [\n")
	for _, d := range t.Deps {
		b.WriteString("    \"" + d + "\",\n")
	}
	b.WriteString("]\n\n[dependency-groups]\ndev = [\"pytest>=8\"]\n\n[tool.uv]\npackage = false\n\n[tool.pytest.ini_options]\npythonpath = [\".\"]\n")
	return b.String()
}

func apiAbrirProjeto(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho string `json:"caminho"`
	}
	if lerJSON(r, &p) != nil || !filepath.IsAbs(p.Caminho) {
		erroJSON(w, 400, "caminho inválido")
		return
	}
	limpo := filepath.Clean(p.Caminho)
	st, err := os.Stat(limpo)
	if err != nil || !st.IsDir() {
		erroJSON(w, 404, "pasta não encontrada")
		return
	}
	home, _ := os.UserHomeDir()
	if normalizar(limpo) == normalizar(filepath.VolumeName(limpo)+string(filepath.Separator)) || normalizar(limpo) == normalizar(home) {
		erroJSON(w, 400, "escolha uma pasta de projeto, não a pasta inteira do usuário ou do disco")
		return
	}
	adicionarRecente(limpo)
	escreverJSON(w, lerInfoProjeto(limpo))
}

func apiEsquecerProjeto(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Caminho string `json:"caminho"`
	}
	lerJSON(r, &p)
	removerRecente(p.Caminho)
	escreverJSON(w, map[string]any{"ok": true})
}

func apiEscolherPasta(w http.ResponseWriter, r *http.Request) {
	p, err := escolherPasta()
	if err != nil && p == "" {
		escreverJSON(w, map[string]any{"caminho": "", "erro": err.Error()})
		return
	}
	escreverJSON(w, map[string]any{"caminho": p})
}

func apiTemplates(w http.ResponseWriter, r *http.Request) {
	out := []map[string]any{}
	for _, id := range ordemTemplates {
		t, _ := modeloDoIdioma(id)
		out = append(out, map[string]any{"id": id, "nome": t.Nome, "descricao": t.Descricao, "deps": t.Deps, "icone": t.Icone})
	}
	escreverJSON(w, out)
}
