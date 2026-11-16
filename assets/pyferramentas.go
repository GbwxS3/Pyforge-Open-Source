package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"
)

// ---------- processo auxiliar Python (jedi + detector de armadilhas) ----------

type helperPy struct {
	cmd    *exec.Cmd
	in     io.WriteCloser
	mu     sync.Mutex
	pend   map[int]chan json.RawMessage
	prox   int
	vivo   bool
	inicio time.Time
}

var (
	helpersMu sync.Mutex
	helpers   = map[string]*helperPy{}
)

func pegarHelper(raiz string) (*helperPy, error) {
	helpersMu.Lock()
	defer helpersMu.Unlock()
	if h, ok := helpers[normalizar(raiz)]; ok && h.vivo {
		return h, nil
	}
	if uvPath == "" {
		return nil, errors.New("uv não encontrado")
	}
	script := filepath.Join(dataDir, "py", "assistente_py.py")
	c := cmdUV(raiz, "run", "--no-project", "--with", "jedi>=0.19", "python", "-X", "utf8", script, raiz)
	prepararProcesso(c)
	in, err := c.StdinPipe()
	if err != nil {
		return nil, err
	}
	out, err := c.StdoutPipe()
	if err != nil {
		return nil, err
	}
	c.Stderr = io.Discard
	if err := c.Start(); err != nil {
		return nil, err
	}
	h := &helperPy{cmd: c, in: in, pend: map[int]chan json.RawMessage{}, vivo: true, inicio: time.Now()}
	helpers[normalizar(raiz)] = h
	go func() {
		sc := bufio.NewScanner(out)
		sc.Buffer(make([]byte, 1<<20), 32<<20)
		for sc.Scan() {
			var cab struct {
				ID int `json:"id"`
			}
			linha := append([]byte{}, sc.Bytes()...)
			if json.Unmarshal(linha, &cab) != nil {
				continue
			}
			h.mu.Lock()
			ch := h.pend[cab.ID]
			delete(h.pend, cab.ID)
			h.mu.Unlock()
			if ch != nil {
				ch <- linha
			}
		}
		h.mu.Lock()
		h.vivo = false
		for _, ch := range h.pend {
			close(ch)
		}
		h.pend = map[int]chan json.RawMessage{}
		h.mu.Unlock()
		c.Wait()
	}()
	return h, nil
}

func (h *helperPy) chamar(cmd string, args map[string]any) (json.RawMessage, error) {
	h.mu.Lock()
	if !h.vivo {
		h.mu.Unlock()
		return nil, errors.New("assistente Python parado")
	}
	h.prox++
	id := h.prox
	ch := make(chan json.RawMessage, 1)
	h.pend[id] = ch
	args["id"] = id
	args["cmd"] = cmd
	b, _ := json.Marshal(args)
	_, err := h.in.Write(append(b, '\n'))
	h.mu.Unlock()
	if err != nil {
		return nil, err
	}
	limite := 10 * time.Second
	if time.Since(h.inicio) < 90*time.Second {
		limite = 60 * time.Second // primeira vez: o uv pode estar baixando o jedi/Python
	}
	select {
	case r, ok := <-ch:
		if !ok {
			return nil, errors.New("assistente Python fechou")
		}
		return r, nil
	case <-time.After(limite):
		h.mu.Lock()
		delete(h.pend, id)
		h.mu.Unlock()
		return nil, errors.New("tempo esgotado")
	}
}

func pararHelpers() {
	helpersMu.Lock()
	defer helpersMu.Unlock()
	for _, h := range helpers {
		matarArvore(h.cmd)
	}
}

type pedidoCodigo struct {
	Raiz     string `json:"raiz"`
	Caminho  string `json:"caminho"`
	Conteudo string `json:"conteudo"`
	Linha    int    `json:"linha"`
	Coluna   int    `json:"coluna"`
}

func lerPedidoCodigo(w http.ResponseWriter, r *http.Request) (*pedidoCodigo, bool) {
	var p pedidoCodigo
	if lerJSON(r, &p) != nil || !permitido(p.Raiz) {
		erroJSON(w, 403, "projeto não permitido")
		return nil, false
	}
	return &p, true
}

func repassarHelper(w http.ResponseWriter, p *pedidoCodigo, cmd string) {
	h, err := pegarHelper(p.Raiz)
	if err != nil {
		escreverJSON(w, map[string]any{"res": nil, "erro": err.Error()})
		return
	}
	res, err := h.chamar(cmd, map[string]any{"codigo": p.Conteudo, "caminho": p.Caminho, "linha": p.Linha, "coluna": p.Coluna})
	if err != nil {
		escreverJSON(w, map[string]any{"res": nil, "erro": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(res)
}

func apiCompletar(w http.ResponseWriter, r *http.Request) {
	if p, ok := lerPedidoCodigo(w, r); ok {
		repassarHelper(w, p, "completar")
	}
}

func apiInfo(w http.ResponseWriter, r *http.Request) {
	if p, ok := lerPedidoCodigo(w, r); ok {
		repassarHelper(w, p, "info")
	}
}

func apiDefinicao(w http.ResponseWriter, r *http.Request) {
	if p, ok := lerPedidoCodigo(w, r); ok {
		repassarHelper(w, p, "definicao")
	}
}

// ---------- análise: Ruff + detector de armadilhas ----------

type diagnostico struct {
	Linha     int    `json:"linha"`
	Coluna    int    `json:"coluna"`
	FimLinha  int    `json:"fimLinha"`
	FimColuna int    `json:"fimColuna"`
	Sev       string `json:"sev"`
	Codigo    string `json:"codigo"`
	Msg       string `json:"msg"`
	Fonte     string `json:"fonte"`
	Dica      string `json:"dica,omitempty"`
	Item      int    `json:"item,omitempty"`
}

func ruffCheck(p *pedidoCodigo) ([]diagnostico, error) {
	rel, _ := filepath.Rel(p.Raiz, p.Caminho)
	c := cmdUV(p.Raiz, "tool", "run", "ruff", "check", "--output-format=json", "--no-cache", "--quiet", "--stdin-filename", rel, "-")
	out, errOut, err := rodarCurto(c, p.Conteudo, 60*time.Second)
	if strings.TrimSpace(out) == "" {
		if err != nil {
			return nil, errors.New(strings.TrimSpace(errOut))
		}
		return []diagnostico{}, nil
	}
	var itens []struct {
		Code     *string `json:"code"`
		Message  string  `json:"message"`
		Location struct {
			Row    int `json:"row"`
			Column int `json:"column"`
		} `json:"location"`
		EndLocation struct {
			Row    int `json:"row"`
			Column int `json:"column"`
		} `json:"end_location"`
	}
	if err := json.Unmarshal([]byte(out), &itens); err != nil {
		return nil, err
	}
	res := []diagnostico{}
	for _, it := range itens {
		codigo := "sintaxe"
		if it.Code != nil {
			codigo = *it.Code
		}
		sev := "aviso"
		switch {
		case codigo == "sintaxe" || strings.HasPrefix(codigo, "E9") || codigo == "F821" || codigo == "F822" || codigo == "F823" || codigo == "F706" || codigo == "F704":
			sev = "erro"
		case codigo == "F401" || codigo == "F841" || codigo == "F811" || codigo == "E402" || codigo == "F541":
			sev = "info"
		}
		res = append(res, diagnostico{Linha: it.Location.Row, Coluna: it.Location.Column, FimLinha: it.EndLocation.Row, FimColuna: it.EndLocation.Column, Sev: sev, Codigo: codigo, Msg: it.Message, Fonte: "Ruff"})
	}
	return res, nil
}

func apiAnalisar(w http.ResponseWriter, r *http.Request) {
	p, ok := lerPedidoCodigo(w, r)
	if !ok {
		return
	}
	var wg sync.WaitGroup
	var ruff, arm []diagnostico
	var erroRuff, erroArm string
	wg.Add(2)
	go func() {
		defer wg.Done()
		d, err := ruffCheck(p)
		if err != nil {
			erroRuff = err.Error()
		}
		ruff = d
	}()
	go func() {
		defer wg.Done()
		h, err := pegarHelper(p.Raiz)
		if err != nil {
			erroArm = err.Error()
			return
		}
		res, err := h.chamar("analisar", map[string]any{"codigo": p.Conteudo, "caminho": p.Caminho})
		if err != nil {
			erroArm = err.Error()
			return
		}
		var resp struct {
			Res []diagnostico `json:"res"`
		}
		json.Unmarshal(res, &resp)
		arm = resp.Res
	}()
	wg.Wait()
	todos := append([]diagnostico{}, arm...)
	// Evita duplicar erros de sintaxe que os dois encontram.
	temSintaxe := false
	for _, d := range arm {
		if d.Codigo == "sintaxe" {
			temSintaxe = true
		}
	}
	equivalentes := map[string]string{"B006": "PF001", "B023": "PF002", "F632": "PF004", "E711": "PF005", "E722": "PF010", "F631": "PF017", "B012": "PF016", "A001": "PF007", "A002": "PF007"}
	jaTem := map[string]bool{}
	for _, d := range arm {
		jaTem[fmt.Sprintf("%d:%s", d.Linha, d.Codigo)] = true
	}
	for _, d := range ruff {
		if temSintaxe && (d.Codigo == "sintaxe" || strings.HasPrefix(d.Codigo, "E9")) {
			continue
		}
		if pf, ok := equivalentes[d.Codigo]; ok && jaTem[fmt.Sprintf("%d:%s", d.Linha, pf)] {
			continue
		}
		todos = append(todos, d)
	}
	sort.SliceStable(todos, func(a, b int) bool { return todos[a].Linha < todos[b].Linha })
	escreverJSON(w, map[string]any{"diagnosticos": todos, "erroRuff": erroRuff, "erroArmadilhas": erroArm})
}

func apiFormatar(w http.ResponseWriter, r *http.Request) {
	p, ok := lerPedidoCodigo(w, r)
	if !ok {
		return
	}
	rel, _ := filepath.Rel(p.Raiz, p.Caminho)
	c := cmdUV(p.Raiz, "tool", "run", "ruff", "format", "--no-cache", "--quiet", "--stdin-filename", rel, "-")
	out, errOut, err := rodarCurto(c, p.Conteudo, 60*time.Second)
	if err != nil {
		msg := strings.TrimSpace(errOut)
		if msg == "" {
			msg = err.Error()
		}
		escreverJSON(w, map[string]any{"erro": "Não deu para formatar: " + msg})
		return
	}
	escreverJSON(w, map[string]any{"conteudo": out})
}

// ---------- ambiente Python ----------

var reVersaoVenv = regexp.MustCompile(`(?m)^\s*version(?:_info)?\s*=\s*([0-9][0-9.a-z+]*)`)

func apiAmbiente(w http.ResponseWriter, r *http.Request) {
	raiz := r.URL.Query().Get("raiz")
	if !permitido(raiz) {
		erroJSON(w, 403, "projeto não permitido")
		return
	}
	res := map[string]any{"venv": false, "pacotes": []any{}, "python": "", "pin": "", "uv": uvPath != ""}
	if b, err := os.ReadFile(filepath.Join(raiz, ".python-version")); err == nil {
		res["pin"] = strings.TrimSpace(string(b))
	}
	if b, err := os.ReadFile(filepath.Join(raiz, ".venv", "pyvenv.cfg")); err == nil {
		res["venv"] = true
		if m := reVersaoVenv.FindSubmatch(b); m != nil {
			res["python"] = string(m[1])
		}
		c := cmdUV(raiz, "pip", "list", "--format", "json")
		out, _, err := rodarCurto(c, "", 30*time.Second)
		if err == nil {
			var pac []map[string]string
			if json.Unmarshal([]byte(out), &pac) == nil {
				res["pacotes"] = pac
			}
		}
	}
	if info := lerInfoProjeto(raiz); info != nil {
		res["deps"] = info.Deps
	}
	escreverJSON(w, res)
}

var mapaPacotes = map[string]string{
	"cv2": "opencv-python", "PIL": "pillow", "sklearn": "scikit-learn", "bs4": "beautifulsoup4",
	"yaml": "pyyaml", "dotenv": "python-dotenv", "Crypto": "pycryptodome", "win32api": "pywin32",
	"win32con": "pywin32", "win32gui": "pywin32", "serial": "pyserial", "dateutil": "python-dateutil",
	"attr": "attrs", "jwt": "pyjwt", "skimage": "scikit-image", "fitz": "pymupdf", "docx": "python-docx",
	"pptx": "python-pptx", "telegram": "python-telegram-bot", "discord": "discord.py", "magic": "python-magic",
	"OpenSSL": "pyopenssl", "usb": "pyusb", "gi": "PyGObject", "wx": "wxPython", "Image": "pillow",
	"googleapiclient": "google-api-python-client", "jose": "python-jose", "multipart": "python-multipart",
	"slugify": "python-slugify", "socketio": "python-socketio", "engineio": "python-engineio",
	"Levenshtein": "python-Levenshtein", "speech_recognition": "SpeechRecognition", "pygame": "pygame-ce",
	"kivy": "kivy", "qtpy": "QtPy", "PyQt5": "PyQt5", "PyQt6": "PyQt6", "PySide6": "pyside6-essentials",
	"MySQLdb": "mysqlclient", "psycopg2": "psycopg2-binary", "ldap": "python-ldap", "Bio": "biopython",
	"mpl_toolkits": "matplotlib", "osgeo": "GDAL", "tensorflow": "tensorflow", "torch": "torch",
	"xlrd": "xlrd", "openpyxl": "openpyxl", "markdown": "Markdown", "docopt": "docopt", "lxml": "lxml",
}

func apiNomePacote(w http.ResponseWriter, r *http.Request) {
	n := strings.TrimSpace(r.URL.Query().Get("nome"))
	base := strings.SplitN(n, ".", 2)[0]
	if p, ok := mapaPacotes[base]; ok {
		escreverJSON(w, map[string]any{"pacote": p, "trocado": !strings.EqualFold(p, n)})
		return
	}
	escreverJSON(w, map[string]any{"pacote": n, "trocado": false})
}

// ---------- Git ----------

func cmdGit(raiz string, args ...string) *exec.Cmd {
	c := exec.Command("git", args...)
	c.Dir = raiz
	c.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0", "LC_ALL=C.UTF-8")
	return c
}

func apiGitStatus(w http.ResponseWriter, r *http.Request) {
	raiz := r.URL.Query().Get("raiz")
	if !permitido(raiz) {
		erroJSON(w, 403, "projeto não permitido")
		return
	}
	if _, err := exec.LookPath("git"); err != nil {
		escreverJSON(w, map[string]any{"git": false})
		return
	}
	out, _, err := rodarCurto(cmdGit(raiz, "status", "--porcelain=v1", "-b", "-uall"), "", 15*time.Second)
	if err != nil {
		escreverJSON(w, map[string]any{"git": true, "repo": false})
		return
	}
	branch := ""
	arquivos := []map[string]string{}
	for _, l := range strings.Split(strings.TrimRight(out, "\n"), "\n") {
		if strings.HasPrefix(l, "## ") {
			branch = strings.SplitN(strings.TrimPrefix(l, "## "), "...", 2)[0]
			branch = strings.TrimPrefix(branch, "No commits yet on ")
			continue
		}
		if len(l) < 4 {
			continue
		}
		estado := strings.TrimSpace(l[:2])
		caminho := strings.Trim(l[3:], `"`)
		if i := strings.Index(caminho, " -> "); i >= 0 {
			caminho = caminho[i+4:]
		}
		arquivos = append(arquivos, map[string]string{"estado": estado, "caminho": filepath.Join(raiz, filepath.FromSlash(caminho)), "rel": caminho})
	}
	log := []map[string]string{}
	lout, _, _ := rodarCurto(cmdGit(raiz, "log", "-20", "--format=%h%x1f%an%x1f%ar%x1f%s"), "", 15*time.Second)
	for _, l := range strings.Split(strings.TrimSpace(lout), "\n") {
		p := strings.Split(l, "\x1f")
		if len(p) == 4 {
			log = append(log, map[string]string{"hash": p[0], "autor": p[1], "quando": p[2], "msg": p[3]})
		}
	}
	escreverJSON(w, map[string]any{"git": true, "repo": true, "branch": branch, "arquivos": arquivos, "log": log})
}

func apiGitInit(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Raiz string `json:"raiz"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Raiz) {
		erroJSON(w, 403, "projeto não permitido")
		return
	}
	_, errOut, err := rodarCurto(cmdGit(p.Raiz, "init"), "", 15*time.Second)
	if err != nil {
		erroJSON(w, 500, errOut)
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiGitCommit(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Raiz string `json:"raiz"`
		Msg  string `json:"msg"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Raiz) || strings.TrimSpace(p.Msg) == "" {
		erroJSON(w, 400, "escreva uma mensagem para o commit")
		return
	}
	if _, errOut, err := rodarCurto(cmdGit(p.Raiz, "add", "-A"), "", 30*time.Second); err != nil {
		erroJSON(w, 500, errOut)
		return
	}
	args := []string{}
	if nome, _, _ := rodarCurto(cmdGit(p.Raiz, "config", "user.name"), "", 5*time.Second); strings.TrimSpace(nome) == "" {
		usuario := os.Getenv("USERNAME")
		if usuario == "" {
			usuario = os.Getenv("USER")
		}
		if usuario == "" {
			usuario = "PyForge"
		}
		args = append(args, "-c", "user.name="+usuario, "-c", "user.email="+strings.ToLower(usuario)+"@pyforge.local")
	}
	args = append(args, "commit", "-m", p.Msg)
	out, errOut, err := rodarCurto(cmdGit(p.Raiz, args...), "", 30*time.Second)
	if err != nil {
		msg := strings.TrimSpace(errOut + "\n" + out)
		erroJSON(w, 500, msg)
		return
	}
	escreverJSON(w, map[string]any{"ok": true, "saida": out})
}

// ---------- Designer ----------

var reNomeTela = regexp.MustCompile(`^[a-z_][a-z0-9_]{0,40}$`)

func apiDesignerListar(w http.ResponseWriter, r *http.Request) {
	raiz := r.URL.Query().Get("raiz")
	if !permitido(raiz) {
		erroJSON(w, 403, "projeto não permitido")
		return
	}
	telas := []map[string]any{}
	arquivos, _ := filepath.Glob(filepath.Join(raiz, "ui", "*.pyforge.json"))
	for _, a := range arquivos {
		b, err := os.ReadFile(a)
		if err != nil {
			continue
		}
		var d any
		if json.Unmarshal(b, &d) == nil {
			telas = append(telas, map[string]any{"nome": strings.TrimSuffix(filepath.Base(a), ".pyforge.json"), "design": d})
		}
	}
	escreverJSON(w, map[string]any{"telas": telas})
}

func apiDesignerSalvar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Raiz           string          `json:"raiz"`
		Nome           string          `json:"nome"`
		Design         json.RawMessage `json:"design"`
		ArquivoUI      string          `json:"arquivoUI"`
		CodigoUI       string          `json:"codigoUI"`
		ArquivoUsuario string          `json:"arquivoUsuario"`
		CodigoUsuario  string          `json:"codigoUsuario"`
	}
	if lerJSON(r, &p) != nil || !permitido(p.Raiz) || !reNomeTela.MatchString(p.Nome) {
		erroJSON(w, 400, "nome de tela inválido (use letras minúsculas, números e _)")
		return
	}
	pastaUI := filepath.Join(p.Raiz, "ui")
	os.MkdirAll(pastaUI, 0o755)
	if _, err := os.Stat(filepath.Join(pastaUI, "__init__.py")); err != nil {
		os.WriteFile(filepath.Join(pastaUI, "__init__.py"), []byte("# Telas geradas pelo Designer do PyForge.\n"), 0o644)
	}
	var bonito any
	json.Unmarshal(p.Design, &bonito)
	b, _ := json.MarshalIndent(bonito, "", "  ")
	os.WriteFile(filepath.Join(pastaUI, p.Nome+".pyforge.json"), b, 0o644)
	alvoUI := filepath.Join(p.Raiz, filepath.FromSlash(p.ArquivoUI))
	if !permitido(alvoUI) || !strings.HasSuffix(alvoUI, ".py") {
		erroJSON(w, 400, "arquivo de saída inválido")
		return
	}
	os.WriteFile(alvoUI, []byte(p.CodigoUI), 0o644)
	criouUsuario := false
	if p.ArquivoUsuario != "" {
		alvoUsr := filepath.Join(p.Raiz, filepath.FromSlash(p.ArquivoUsuario))
		if permitido(alvoUsr) && strings.HasSuffix(alvoUsr, ".py") {
			if _, err := os.Stat(alvoUsr); err != nil {
				os.WriteFile(alvoUsr, []byte(p.CodigoUsuario), 0o644)
				criouUsuario = true
			}
		}
	}
	escreverJSON(w, map[string]any{"ok": true, "criouUsuario": criouUsuario, "arquivoUI": alvoUI})
}

var _ = runtime.GOOS
