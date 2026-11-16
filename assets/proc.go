package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
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
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

func execLookPath(nome string) (string, error) { return exec.LookPath(nome) }

// ---------- caminhos permitidos ----------

func normalizar(p string) string {
	p = filepath.Clean(p)
	if runtime.GOOS == "windows" {
		return strings.ToLower(p)
	}
	return p
}

func raizesPermitidas() []string {
	r := []string{workspace()}
	r = append(r, recentes()...)
	return r
}

func dentroDe(raiz, p string) bool {
	rel, err := filepath.Rel(normalizar(raiz), normalizar(p))
	if err != nil {
		return false
	}
	return rel == "." || (!strings.HasPrefix(rel, "..") && !filepath.IsAbs(rel))
}

func permitido(p string) bool {
	if p == "" || !filepath.IsAbs(p) {
		return false
	}
	for _, r := range raizesPermitidas() {
		if r != "" && dentroDe(r, p) {
			return true
		}
	}
	return false
}

// ---------- ambiente de execução ----------

func ambienteProjeto(raiz string) []string {
	venv := filepath.Join(raiz, ".venv")
	scripts := filepath.Join(venv, pastaScriptsVenv())
	pathAtual := os.Getenv("PATH")
	partes := []string{}
	if _, err := os.Stat(scripts); err == nil {
		partes = append(partes, scripts)
	}
	if uvPath != "" {
		partes = append(partes, filepath.Dir(uvPath))
	}
	partes = append(partes, pathAtual)
	env := []string{}
	for _, kv := range os.Environ() {
		k := strings.ToUpper(strings.SplitN(kv, "=", 2)[0])
		switch k {
		case "PATH", "VIRTUAL_ENV", "PYTHONHOME", "CONDA_PREFIX", "PYTHONIOENCODING", "PYTHONUTF8", "PYTHONUNBUFFERED", "NO_COLOR", "UV_NO_PROGRESS":
			continue
		}
		env = append(env, kv)
	}
	env = append(env,
		"PATH="+strings.Join(partes, separadorPath()),
		"PYTHONUTF8=1",
		"PYTHONIOENCODING=utf-8",
		"PYTHONUNBUFFERED=1",
		"NO_COLOR=1",
		"UV_NO_PROGRESS=1",
	)
	if _, err := os.Stat(venv); err == nil {
		env = append(env, "VIRTUAL_ENV="+venv)
	}
	return env
}

func temPyproject(raiz string) bool {
	_, err := os.Stat(filepath.Join(raiz, "pyproject.toml"))
	return err == nil
}

// ---------- jobs: processos com saída ao vivo ----------

type evento struct {
	T string `json:"t"`
	D string `json:"d,omitempty"`
	C *int   `json:"c,omitempty"`
}

type job struct {
	id      string
	titulo  string
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	mu      sync.Mutex
	eventos []evento
	aviso   chan struct{}
	fim     bool
}

var (
	jobsMu sync.Mutex
	jobs   = map[string]*job{}
)

func (j *job) add(e evento) {
	j.mu.Lock()
	j.eventos = append(j.eventos, e)
	close(j.aviso)
	j.aviso = make(chan struct{})
	j.mu.Unlock()
}

func novoID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func iniciarJob(c *exec.Cmd, titulo string) (*job, error) {
	if c.SysProcAttr == nil {
		prepararProcesso(c)
	}
	out, err := c.StdoutPipe()
	if err != nil {
		return nil, err
	}
	errp, err := c.StderrPipe()
	if err != nil {
		return nil, err
	}
	in, _ := c.StdinPipe()
	j := &job{id: novoID(), titulo: titulo, cmd: c, stdin: in, aviso: make(chan struct{})}
	j.add(evento{T: "i", D: titulo})
	if err := c.Start(); err != nil {
		j.add(evento{T: "e", D: "Não consegui iniciar: " + err.Error() + "\n"})
		zero := -1
		j.add(evento{T: "fim", C: &zero})
		j.fim = true
		jobsMu.Lock()
		jobs[j.id] = j
		jobsMu.Unlock()
		return j, nil
	}
	jobsMu.Lock()
	jobs[j.id] = j
	jobsMu.Unlock()

	var wg sync.WaitGroup
	ler := func(r io.Reader, tipo string) {
		defer wg.Done()
		br := bufio.NewReaderSize(r, 8192)
		buf := make([]byte, 4096)
		resto := []byte{}
		for {
			n, err := br.Read(buf)
			if n > 0 {
				dados := append(resto, buf[:n]...)
				corte := len(dados)
				for k := 1; k <= 3 && k <= len(dados); k++ {
					if utf8.RuneStart(dados[len(dados)-k]) {
						if !utf8.FullRune(dados[len(dados)-k:]) {
							corte = len(dados) - k
						}
						break
					}
				}
				texto := strings.ReplaceAll(string(dados[:corte]), "\r\n", "\n")
				resto = append([]byte{}, dados[corte:]...)
				j.add(evento{T: tipo, D: texto})
			}
			if err != nil {
				if len(resto) > 0 {
					j.add(evento{T: tipo, D: string(resto)})
				}
				return
			}
		}
	}
	wg.Add(2)
	go ler(out, "o")
	go ler(errp, "e")
	go func() {
		wg.Wait()
		err := c.Wait()
		codigo := 0
		if err != nil {
			var ee *exec.ExitError
			if errors.As(err, &ee) {
				codigo = ee.ExitCode()
			} else {
				codigo = -1
			}
		}
		j.mu.Lock()
		j.fim = true
		j.mu.Unlock()
		j.add(evento{T: "fim", C: &codigo})
		go func() {
			time.Sleep(10 * time.Minute)
			jobsMu.Lock()
			delete(jobs, j.id)
			jobsMu.Unlock()
		}()
	}()
	return j, nil
}

func pararTodosJobs() {
	jobsMu.Lock()
	defer jobsMu.Unlock()
	for _, j := range jobs {
		if !j.fim {
			matarArvore(j.cmd)
		}
	}
}

func cmdUV(raiz string, args ...string) *exec.Cmd {
	c := exec.Command(uvPath, args...)
	c.Dir = raiz
	c.Env = ambienteProjeto(raiz)
	return c
}

func aspas(s string) string {
	if runtime.GOOS == "windows" {
		return `"` + s + `"`
	}
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}

var reCd = regexp.MustCompile(`^\s*cd(?:\s+(?:/d\s+)?(.*))?\s*$`)
var reNomePacote = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._\-\[\],<>=!~ ]*$`)

type pedidoJob struct {
	Tipo    string   `json:"tipo"`
	Raiz    string   `json:"raiz"`
	Arquivo string   `json:"arquivo"`
	Linha   string   `json:"linha"`
	Cwd     string   `json:"cwd"`
	Pacote  string   `json:"pacote"`
	Nome    string   `json:"nome"`
	Janela  bool     `json:"janela"`
	Com     []string `json:"com"`
	Versao  string   `json:"versao"`
	Unico   bool     `json:"unico"`
	Tempo   bool     `json:"tempo"`  // executar gravando a máquina do tempo
	Codigo  string   `json:"codigo"` // avaliar: código Python curto (testes por exemplo)
	Gif     bool     `json:"gif"`    // executar gravando a janela como GIF
}

// arquivoTempo é onde a máquina do tempo grava a última execução do projeto.
func arquivoTempo(raiz string) string { return filepath.Join(raiz, ".pyforge", "tempo.jsonl") }

func apiJobIniciar(w http.ResponseWriter, r *http.Request) {
	var p pedidoJob
	if err := lerJSON(r, &p); err != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	if !permitido(p.Raiz) {
		erroJSON(w, 403, "pasta fora dos projetos do PyForge")
		return
	}
	if uvPath == "" && p.Tipo != "terminal" && p.Tipo != "linguagem" {
		erroJSON(w, 500, "uv não encontrado")
		return
	}
	var c *exec.Cmd
	titulo := ""
	switch p.Tipo {
	case "executar":
		arq := p.Arquivo
		if !filepath.IsAbs(arq) {
			arq = filepath.Join(p.Raiz, arq)
		}
		if !permitido(arq) {
			erroJSON(w, 403, "arquivo fora do projeto")
			return
		}
		rel, _ := filepath.Rel(p.Raiz, arq)
		args := []string{"run"}
		if !temPyproject(p.Raiz) {
			args = append(args, "--no-project")
		}
		for _, x := range p.Com {
			if reNomePacote.MatchString(x) {
				args = append(args, "--with", x)
			}
		}
		if p.Gif {
			nome := strings.TrimSuffix(filepath.Base(arq), filepath.Ext(arq))
			saida := filepath.Join(p.Raiz, "gravacoes", nome+"-"+time.Now().Format("2006-01-02-150405")+".gif")
			script := filepath.Join(dataDir, "py", "gravar_gif.py")
			args = append(args, "--with", "pillow", "python", "-X", "utf8", script, p.Raiz, arq, saida)
			titulo = "python " + filepath.ToSlash(rel) + " (gravando GIF)"
		} else if p.Tempo {
			os.MkdirAll(filepath.Join(p.Raiz, ".pyforge"), 0o755)
			script := filepath.Join(dataDir, "py", "maquina_tempo.py")
			args = append(args, "python", "-X", "utf8", script, p.Raiz, arq, arquivoTempo(p.Raiz))
			titulo = "python " + filepath.ToSlash(rel) + " (máquina do tempo)"
		} else {
			args = append(args, "python", "-X", "utf8", rel)
			titulo = "python " + filepath.ToSlash(rel)
		}
		c = cmdUV(p.Raiz, args...)
	case "linguagem":
		arq := p.Arquivo
		if !filepath.IsAbs(arq) {
			arq = filepath.Join(p.Raiz, arq)
		}
		if !permitido(arq) {
			erroJSON(w, 403, "arquivo fora do projeto")
			return
		}
		cmd, visivel, err := comandoLinguagem(arq)
		if err != nil {
			erroJSON(w, 400, err.Error())
			return
		}
		cmd.Env = append(os.Environ(), "NO_COLOR=1", "FORCE_COLOR=0")
		c = cmd
		titulo = visivel
	case "terminal":
		cwd := p.Cwd
		if cwd == "" || !permitido(cwd) {
			cwd = p.Raiz
		}
		if m := reCd.FindStringSubmatch(p.Linha); m != nil {
			destino := strings.Trim(strings.TrimSpace(m[1]), `"'`)
			novo := cwd
			if destino != "" {
				if filepath.IsAbs(destino) {
					novo = filepath.Clean(destino)
				} else {
					novo = filepath.Join(cwd, destino)
				}
			}
			st, err := os.Stat(novo)
			if err != nil || !st.IsDir() {
				escreverJSON(w, map[string]any{"cwd": cwd, "msg": "Pasta não encontrada: " + destino})
				return
			}
			escreverJSON(w, map[string]any{"cwd": novo})
			return
		}
		c = comandoShell(p.Linha)
		c.Dir = cwd
		c.Env = ambienteProjeto(p.Raiz)
		titulo = p.Linha
	case "avaliar":
		if len(p.Codigo) > 20000 {
			erroJSON(w, 400, "código grande demais")
			return
		}
		args := []string{"run"}
		if !temPyproject(p.Raiz) {
			args = append(args, "--no-project")
		}
		args = append(args, "python", "-X", "utf8", "-c", p.Codigo)
		c = cmdUV(p.Raiz, args...)
		titulo = "testar exemplo"
	case "sync":
		c = cmdUV(p.Raiz, "sync")
		titulo = "uv sync"
	case "testes":
		args := []string{"run"}
		if !temPyproject(p.Raiz) {
			args = append(args, "--no-project")
		}
		args = append(args, "--with", "pytest", "pytest", "-v", "--tb=short", "--color=no", "-p", "no:cacheprovider")
		c = cmdUV(p.Raiz, args...)
		titulo = "pytest"
	case "instalar", "remover":
		if !reNomePacote.MatchString(p.Pacote) {
			erroJSON(w, 400, "nome de pacote inválido")
			return
		}
		acao := "add"
		if p.Tipo == "remover" {
			acao = "remove"
		}
		if !temPyproject(p.Raiz) {
			c = cmdUV(p.Raiz, "pip", "install", p.Pacote)
			if p.Tipo == "remover" {
				c = cmdUV(p.Raiz, "pip", "uninstall", p.Pacote)
			}
		} else {
			c = cmdUV(p.Raiz, acao, p.Pacote)
		}
		titulo = "uv " + acao + " " + p.Pacote
	case "python":
		if !regexp.MustCompile(`^3\.\d{1,2}$`).MatchString(p.Versao) {
			erroJSON(w, 400, "versão inválida")
			return
		}
		c = comandoShell(aspas(uvPath) + " python pin " + p.Versao + " && " + aspas(uvPath) + " sync")
		c.Dir = p.Raiz
		c.Env = ambienteProjeto(p.Raiz)
		titulo = "Trocar para Python " + p.Versao
	case "exe":
		arq := p.Arquivo
		if !filepath.IsAbs(arq) {
			arq = filepath.Join(p.Raiz, arq)
		}
		if !permitido(arq) {
			erroJSON(w, 403, "arquivo fora do projeto")
			return
		}
		if st, err := os.Stat(arq); err != nil || st.IsDir() {
			erroJSON(w, 404, "não achei o arquivo principal: "+filepath.Base(arq))
			return
		}
		nome := regexp.MustCompile(`[^A-Za-z0-9_\-]`).ReplaceAllString(p.Nome, "")
		if nome == "" {
			nome = "MeuApp"
		}
		args := []string{"run"}
		if !temPyproject(p.Raiz) {
			args = append(args, "--no-project")
		}
		args = append(args, "--with", "pyinstaller")
		for _, x := range p.Com {
			if reNomePacote.MatchString(x) {
				args = append(args, "--with", x)
			}
		}
		// Tudo com caminho absoluto: com --specpath o PyInstaller resolve caminhos relativos a partir de build/.
		args = append(args, "pyinstaller", "--noconfirm", "--clean", "--name", nome,
			"--distpath", filepath.Join(p.Raiz, "dist"),
			"--workpath", filepath.Join(p.Raiz, "build"),
			"--specpath", filepath.Join(p.Raiz, "build"),
			"--paths", p.Raiz)
		if p.Unico {
			args = append(args, "--onefile")
		}
		if p.Janela {
			args = append(args, "--windowed")
		}
		for _, ic := range []string{"icone.ico", "icon.ico", filepath.Join("assets", "icone.ico")} {
			if st, err := os.Stat(filepath.Join(p.Raiz, ic)); err == nil && !st.IsDir() {
				args = append(args, "--icon", filepath.Join(p.Raiz, ic))
				break
			}
		}
		// Imagens e outros arquivos da pasta assets vão junto (o código gerado pelo Designer acha eles no .exe).
		// A pasta dados (planilhas do "Planilha vira app") também: na primeira vez o app copia para perto do .exe.
		if st, err := os.Stat(filepath.Join(p.Raiz, "dados")); err == nil && st.IsDir() {
			args = append(args, "--add-data", filepath.Join(p.Raiz, "dados")+string(os.PathListSeparator)+"dados")
		}
		if st, err := os.Stat(filepath.Join(p.Raiz, "assets")); err == nil && st.IsDir() {
			args = append(args, "--add-data", filepath.Join(p.Raiz, "assets")+string(os.PathListSeparator)+"assets")
		}
		args = append(args, arq)
		c = cmdUV(p.Raiz, args...)
		titulo = "Gerar executável " + nome
	default:
		erroJSON(w, 400, "tipo de tarefa desconhecido")
		return
	}
	j, err := iniciarJob(c, titulo)
	if err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"id": j.id})
}

func pegarJob(id string) *job {
	jobsMu.Lock()
	defer jobsMu.Unlock()
	return jobs[id]
}

func apiJobStream(w http.ResponseWriter, r *http.Request) {
	j := pegarJob(r.URL.Query().Get("id"))
	if j == nil {
		erroJSON(w, 404, "tarefa não encontrada")
		return
	}
	fl, ok := w.(http.Flusher)
	if !ok {
		erroJSON(w, 500, "streaming indisponível")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	i := 0
	for {
		j.mu.Lock()
		novos := append([]evento{}, j.eventos[i:]...)
		i = len(j.eventos)
		aviso := j.aviso
		j.mu.Unlock()
		for _, e := range novos {
			b, _ := json.Marshal(e)
			fmt.Fprintf(w, "data: %s\n\n", b)
			if e.T == "fim" {
				fl.Flush()
				return
			}
		}
		fl.Flush()
		select {
		case <-aviso:
		case <-r.Context().Done():
			return
		case <-time.After(15 * time.Second):
			fmt.Fprint(w, ": ok\n\n")
		}
	}
}

func apiJobParar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		ID string `json:"id"`
	}
	lerJSON(r, &p)
	if j := pegarJob(p.ID); j != nil && !j.fim {
		matarArvore(j.cmd)
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiJobEntrada(w http.ResponseWriter, r *http.Request) {
	var p struct {
		ID    string `json:"id"`
		Dados string `json:"dados"`
	}
	lerJSON(r, &p)
	j := pegarJob(p.ID)
	if j == nil || j.fim || j.stdin == nil {
		erroJSON(w, 400, "o programa não está rodando")
		return
	}
	io.WriteString(j.stdin, p.Dados)
	escreverJSON(w, map[string]any{"ok": true})
}

// rodarCurto executa um comando e devolve a saída (para ferramentas rápidas).
func rodarCurto(c *exec.Cmd, entrada string, limite time.Duration) (string, string, error) {
	if c.SysProcAttr == nil {
		prepararProcesso(c)
	}
	var out, errb strings.Builder
	c.Stdout = &out
	c.Stderr = &errb
	if entrada != "" {
		c.Stdin = strings.NewReader(entrada)
	}
	if err := c.Start(); err != nil {
		return "", "", err
	}
	feito := make(chan error, 1)
	go func() { feito <- c.Wait() }()
	select {
	case err := <-feito:
		return out.String(), errb.String(), err
	case <-time.After(limite):
		matarArvore(c)
		return out.String(), errb.String(), errors.New("tempo esgotado")
	}
}

// apiTempo devolve a gravação da última execução com máquina do tempo (JSON por linha).
func apiTempo(w http.ResponseWriter, r *http.Request) {
	raiz := r.URL.Query().Get("raiz")
	if !permitido(raiz) {
		erroJSON(w, 403, "pasta fora dos projetos do PyForge")
		return
	}
	p := arquivoTempo(raiz)
	st, err := os.Stat(p)
	if err != nil {
		erroJSON(w, 404, "ainda não há gravação: use Executar com máquina do tempo")
		return
	}
	if st.Size() > 60<<20 {
		erroJSON(w, 413, "gravação grande demais")
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, p)
}
