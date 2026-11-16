package main

// PyForge IA: uma IA que roda no PC da pessoa, sem chave e sem internet depois de baixada.
// Motor: llama-server (projeto llama.cpp, licença MIT), baixado do GitHub na primeira vez.
// Modelo: um arquivo .gguf baixado do Hugging Face (ou qualquer .gguf colocado na pasta de modelos,
// como um modelo treinado com o kit de treino do PyForge).

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
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

type modeloLocal struct {
	ID        string  `json:"id"`
	Nome      string  `json:"nome"`
	Descricao string  `json:"descricao"`
	Repo      string  `json:"repo"`
	Arquivo   string  `json:"arquivo"`
	Quant     string  `json:"quant"`
	TamanhoGB float64 `json:"tamanhoGB"`
	RAMGB     int     `json:"ramGB"`
	Contexto  int     `json:"contexto"`
}

var catalogoIA = []modeloLocal{
	{ID: "leve", Nome: "Leve", Descricao: "Qwen2.5 Coder 1.5B. Rápido até em PC simples; bom para dúvidas e códigos curtos.",
		Repo: "bartowski/Qwen2.5-Coder-1.5B-Instruct-GGUF", Arquivo: "Qwen2.5-Coder-1.5B-Instruct-Q4_K_M.gguf", Quant: "Q4_K_M", TamanhoGB: 1.0, RAMGB: 4, Contexto: 16384},
	{ID: "equilibrado", Nome: "Equilibrado", Descricao: "Qwen3.5 4B. O melhor custo-benefício: entende bem português e código.",
		Repo: "unsloth/Qwen3.5-4B-GGUF", Arquivo: "Qwen3.5-4B-Q4_K_M.gguf", Quant: "Q4_K_M", TamanhoGB: 2.8, RAMGB: 8, Contexto: 16384},
	{ID: "forte", Nome: "Forte", Descricao: "Qwen2.5 Coder 7B. O mais esperto em código; pede um PC bom.",
		Repo: "bartowski/Qwen2.5-Coder-7B-Instruct-GGUF", Arquivo: "Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf", Quant: "Q4_K_M", TamanhoGB: 4.7, RAMGB: 12, Contexto: 16384},
}

const modeloPadraoIA = "equilibrado"

type infoMotor struct {
	Caminho string `json:"caminho"`
	Versao  string `json:"versao"`
	GPU     bool   `json:"gpu"`
}

var iaLocal struct {
	mu        sync.Mutex
	baixando  bool
	etapa     string // "motor" | "modelo"
	modelo    string // id do modelo sendo instalado
	arquivo   string
	feito     int64
	total     int64
	erro      string
	cancelar  context.CancelFunc
	cmd       *exec.Cmd
	porta     int
	rodando   string // caminho do modelo carregado
	iniciando bool
	logMotor  *bytes.Buffer
}

func pastaIA() string      { return filepath.Join(dataDir, "ia") }
func pastaModelos() string { return filepath.Join(pastaIA(), "modelos") }

func baseHF() string {
	if v := os.Getenv("PYFORGE_IA_HF"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "https://huggingface.co"
}

func lerInfoMotor() (infoMotor, bool) {
	var m infoMotor
	b, err := os.ReadFile(filepath.Join(pastaIA(), "motor.json"))
	if err != nil || json.Unmarshal(b, &m) != nil {
		return m, false
	}
	if st, err := os.Stat(m.Caminho); err != nil || st.IsDir() {
		return m, false
	}
	return m, true
}

// ---------- modelos ----------

type modeloNoDisco struct {
	Arquivo string `json:"arquivo"`
	Caminho string `json:"caminho"`
	Tamanho int64  `json:"tamanho"`
}

func modelosNoDisco() []modeloNoDisco {
	var out []modeloNoDisco
	itens, _ := os.ReadDir(pastaModelos())
	for _, it := range itens {
		if it.IsDir() || !strings.HasSuffix(strings.ToLower(it.Name()), ".gguf") || strings.Contains(strings.ToLower(it.Name()), "mmproj") {
			continue
		}
		info, err := it.Info()
		if err != nil {
			continue
		}
		out = append(out, modeloNoDisco{Arquivo: it.Name(), Caminho: filepath.Join(pastaModelos(), it.Name()), Tamanho: info.Size()})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Arquivo < out[j].Arquivo })
	return out
}

func modeloPorID(id string) (modeloLocal, bool) {
	for _, m := range catalogoIA {
		if m.ID == id {
			return m, true
		}
	}
	return modeloLocal{}, false
}

// caminhoModeloEscolhido devolve o .gguf que a pessoa escolheu (do catálogo ou um arquivo próprio).
func caminhoModeloEscolhido() (string, modeloLocal, bool) {
	escolha := cfgString("ia", "modeloLocal")
	if escolha == "" {
		escolha = modeloPadraoIA
	}
	if m, ok := modeloPorID(escolha); ok {
		p := filepath.Join(pastaModelos(), m.Arquivo)
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, m, true
		}
		return p, m, false
	}
	// arquivo próprio: o nome do .gguf dentro da pasta de modelos
	nome := filepath.Base(escolha)
	p := filepath.Join(pastaModelos(), nome)
	if st, err := os.Stat(p); err == nil && !st.IsDir() {
		return p, modeloLocal{ID: nome, Nome: nome, Contexto: 8192}, true
	}
	return p, modeloLocal{ID: nome, Nome: nome, Contexto: 8192}, false
}

// ---------- download ----------

var clienteDownload = &http.Client{Timeout: 0}

func baixarArquivo(ctx context.Context, url, destino string, progresso func(feito, total int64)) error {
	parcial := destino + ".parcial"
	os.MkdirAll(filepath.Dir(destino), 0o755)
	var inicio int64
	if st, err := os.Stat(parcial); err == nil {
		inicio = st.Size()
	}
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "PyForge/"+versao)
	if inicio > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", inicio))
	}
	resp, err := clienteDownload.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var f *os.File
	switch resp.StatusCode {
	case http.StatusPartialContent:
		f, err = os.OpenFile(parcial, os.O_WRONLY|os.O_APPEND, 0o644)
	case http.StatusOK:
		inicio = 0
		f, err = os.Create(parcial)
	case http.StatusRequestedRangeNotSatisfiable:
		// já estava completo
		return os.Rename(parcial, destino)
	default:
		return fmt.Errorf("o servidor respondeu %d para %s", resp.StatusCode, url)
	}
	if err != nil {
		return err
	}
	total := int64(-1)
	if resp.ContentLength > 0 {
		total = inicio + resp.ContentLength
	}
	feito := inicio
	buf := make([]byte, 256<<10)
	ultimo := time.Now()
	for {
		n, er := resp.Body.Read(buf)
		if n > 0 {
			if _, ew := f.Write(buf[:n]); ew != nil {
				f.Close()
				return ew
			}
			feito += int64(n)
			if time.Since(ultimo) > 200*time.Millisecond {
				progresso(feito, total)
				ultimo = time.Now()
			}
		}
		if er == io.EOF {
			break
		}
		if er != nil {
			f.Close()
			return er
		}
	}
	f.Close()
	progresso(feito, total)
	if total > 0 && feito != total {
		return fmt.Errorf("download incompleto (%d de %d bytes); tente de novo para continuar", feito, total)
	}
	return os.Rename(parcial, destino)
}

// urlModelo acha o arquivo .gguf no Hugging Face. Se o nome exato mudou, procura pela quantização.
func urlModelo(ctx context.Context, m modeloLocal) (string, string, error) {
	direto := fmt.Sprintf("%s/%s/resolve/main/%s", baseHF(), m.Repo, m.Arquivo)
	req, _ := http.NewRequestWithContext(ctx, "HEAD", direto, nil)
	req.Header.Set("User-Agent", "PyForge/"+versao)
	if resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req); err == nil {
		resp.Body.Close()
		if resp.StatusCode < 400 {
			return direto, m.Arquivo, nil
		}
	}
	req, _ = http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/api/models/%s", baseHF(), m.Repo), nil)
	req.Header.Set("User-Agent", "PyForge/"+versao)
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return "", "", fmt.Errorf("não consegui falar com o Hugging Face: %v", err)
	}
	defer resp.Body.Close()
	var info struct {
		Siblings []struct {
			Rfilename string `json:"rfilename"`
		} `json:"siblings"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		if resp.StatusCode == 404 {
			return "", "", fmt.Errorf("não achei o modelo %s no Hugging Face. Ele pode ter mudado de lugar: tente outro modelo ou uma versão mais nova do PyForge", m.Nome)
		}
		return "", "", fmt.Errorf("o Hugging Face respondeu com erro %d; tente de novo daqui a pouco", resp.StatusCode)
	}
	sufixo := strings.ToLower(m.Quant + ".gguf")
	for _, s := range info.Siblings {
		n := strings.ToLower(s.Rfilename)
		if strings.HasSuffix(n, sufixo) && !strings.Contains(n, "mmproj") && !strings.Contains(n, "/") && !strings.Contains(n, "-of-") {
			return fmt.Sprintf("%s/%s/resolve/main/%s", baseHF(), m.Repo, s.Rfilename), s.Rfilename, nil
		}
	}
	return "", "", fmt.Errorf("não achei o arquivo %s em %s", m.Quant, m.Repo)
}

// Versões conhecidas do motor, usadas se o GitHub não disser qual é a mais nova.
var versoesMotorConhecidas = []string{"b11292", "b8870", "b8233"}

const paginaMotor = "https://github.com/ggml-org/llama.cpp/releases/latest"

var reTagMotor = regexp.MustCompile(`/(?:tag|download|expanded_assets)/(b\d+)`)

func nomesZipMotor(gpu bool) []string {
	q := []string{"bin-win-cpu-x64.zip", "bin-win-avx2-x64.zip"}
	if gpu {
		q = append([]string{"bin-win-vulkan-x64.zip"}, q...)
	}
	return q
}

// existeURL confere se o arquivo existe (segue redirecionamentos do GitHub).
func existeURL(ctx context.Context, url string) (existe bool, redeOk bool) {
	req, _ := http.NewRequestWithContext(ctx, "HEAD", url, nil)
	req.Header.Set("User-Agent", "PyForge/"+versao)
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return false, false
	}
	resp.Body.Close()
	return resp.StatusCode < 400, true
}

// urlMotor descobre o .zip do llama.cpp para Windows, tentando vários caminhos.
func urlMotor(ctx context.Context, gpu bool) (string, string, error) {
	if v := os.Getenv("PYFORGE_IA_MOTOR_ZIP"); v != "" {
		return v, "teste", nil
	}
	quer := nomesZipMotor(gpu)
	var falhas []string
	cli := &http.Client{Timeout: 30 * time.Second}
	pedir := func(url string, seguir bool) (*http.Response, error) {
		req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
		req.Header.Set("User-Agent", "PyForge/"+versao)
		c := cli
		if !seguir {
			c = &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
		}
		return c.Do(req)
	}
	type lancamento struct {
		Tag    string `json:"tag_name"`
		Assets []struct {
			Nome string `json:"name"`
			URL  string `json:"browser_download_url"`
		} `json:"assets"`
	}
	escolher := func(l lancamento) string {
		for _, q := range quer {
			for _, a := range l.Assets {
				if strings.HasSuffix(a.Nome, q) && strings.HasPrefix(a.Nome, "llama-") {
					return a.URL
				}
			}
		}
		return ""
	}
	// 1. API do GitHub: os últimos lançamentos (o mais novo às vezes ainda está sem os arquivos)
	if resp, err := pedir("https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=8", true); err != nil {
		falhas = append(falhas, "API do GitHub: "+err.Error())
	} else {
		var ls []lancamento
		if resp.StatusCode == 200 && json.NewDecoder(resp.Body).Decode(&ls) == nil {
			for _, l := range ls {
				if u := escolher(l); u != "" {
					resp.Body.Close()
					return u, l.Tag, nil
				}
			}
			falhas = append(falhas, "API do GitHub: nenhum lançamento recente tem o arquivo para Windows")
		} else {
			falhas = append(falhas, fmt.Sprintf("API do GitHub respondeu %d", resp.StatusCode))
		}
		resp.Body.Close()
	}
	// 2. Página "latest": a versão vem no redirecionamento ou no HTML
	var tags []string
	if resp, err := pedir(paginaMotor, false); err != nil {
		falhas = append(falhas, "página do GitHub: "+err.Error())
	} else {
		if m := reTagMotor.FindStringSubmatch(resp.Header.Get("Location")); m != nil {
			tags = append(tags, m[1])
		} else {
			corpo, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
			for _, m := range reTagMotor.FindAllStringSubmatch(string(corpo), 5) {
				tags = append(tags, m[1])
			}
			if len(tags) == 0 {
				falhas = append(falhas, fmt.Sprintf("página do GitHub respondeu %d sem a versão", resp.StatusCode))
			}
		}
		resp.Body.Close()
	}
	// 3. Versões conhecidas
	tags = append(tags, versoesMotorConhecidas...)
	vistos := map[string]bool{}
procura:
	for _, tag := range tags {
		if vistos[tag] {
			continue
		}
		vistos[tag] = true
		for _, q := range quer {
			u := fmt.Sprintf("https://github.com/ggml-org/llama.cpp/releases/download/%s/llama-%s-%s", tag, tag, q)
			existe, redeOk := existeURL(ctx, u)
			if existe {
				return u, tag, nil
			}
			if !redeOk {
				falhas = append(falhas, "o GitHub não respondeu (internet, firewall ou antivírus bloqueando o PyForge?)")
				break procura
			}
		}
	}
	if len(vistos) > 0 && !strings.Contains(strings.Join(falhas, ""), "não respondeu") {
		falhas = append(falhas, "nenhuma versão conhecida respondeu")
	}
	return "", "", fmt.Errorf("não consegui baixar o motor da IA pelo GitHub (%s)", strings.Join(falhas, "; "))
}

// Plano B: arquivos baixados pelo navegador. O PyForge procura nas pastas Downloads.
func pastasDeBusca() []string {
	home, _ := os.UserHomeDir()
	return []string{filepath.Join(home, "Downloads"), filepath.Join(home, "OneDrive", "Downloads"), filepath.Join(home, "Desktop"), pastaModelos(), pastaIA()}
}

var reZipMotor = regexp.MustCompile(`(?i)^llama-(b\d+)-bin-win-(cpu|avx2|vulkan)-x64( \(\d+\))?\.zip$`)

func zipMotorLocal(gpu bool) (string, string) {
	melhor, tagMelhor, pontos := "", "", -1
	for _, d := range pastasDeBusca() {
		itens, _ := os.ReadDir(d)
		for _, it := range itens {
			m := reZipMotor.FindStringSubmatch(it.Name())
			if m == nil || it.IsDir() {
				continue
			}
			var n int
			fmt.Sscanf(m[1][1:], "%d", &n)
			if (strings.EqualFold(m[2], "vulkan")) == gpu {
				n += 1 << 30 // prefere o tipo pedido
			}
			if n > pontos {
				melhor, tagMelhor, pontos = filepath.Join(d, it.Name()), m[1], n
			}
		}
	}
	return melhor, tagMelhor
}

func modeloLocalNoComputador(arquivo string) string {
	alvo := strings.ToLower(strings.TrimSuffix(arquivo, ".gguf"))
	for _, d := range pastasDeBusca()[:3] {
		itens, _ := os.ReadDir(d)
		for _, it := range itens {
			n := strings.ToLower(it.Name())
			if it.IsDir() || !strings.HasSuffix(n, ".gguf") {
				continue
			}
			base := strings.TrimSuffix(n, ".gguf")
			if i := strings.Index(base, " ("); i > 0 { // "arquivo (1).gguf" do navegador
				base = base[:i]
			}
			if base != alvo {
				continue
			}
			if info, err := it.Info(); err == nil && info.Size() > 50<<20 {
				return filepath.Join(d, it.Name())
			}
		}
	}
	return ""
}

func moverOuCopiar(de, para string) error {
	if os.Rename(de, para) == nil {
		return nil
	}
	in, err := os.Open(de)
	if err != nil {
		return err
	}
	defer in.Close()
	tmp := para + ".parcial"
	out, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	out.Close()
	return os.Rename(tmp, para)
}

func extrairZip(zipPath, destino string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()
	limpo, _ := filepath.Abs(destino)
	for _, f := range r.File {
		alvo := filepath.Join(destino, filepath.FromSlash(f.Name))
		abs, _ := filepath.Abs(alvo)
		if !strings.HasPrefix(abs, limpo+string(os.PathSeparator)) && abs != limpo {
			continue // proteção contra "zip slip"
		}
		if f.FileInfo().IsDir() {
			os.MkdirAll(alvo, 0o755)
			continue
		}
		os.MkdirAll(filepath.Dir(alvo), 0o755)
		rc, err := f.Open()
		if err != nil {
			return err
		}
		w, err := os.OpenFile(alvo, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(w, rc)
		rc.Close()
		w.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func acharServidor(pasta string) string {
	nome := "llama-server"
	if runtime.GOOS == "windows" {
		nome += ".exe"
	}
	achou := ""
	filepath.WalkDir(pasta, func(p string, d os.DirEntry, err error) error {
		if err == nil && !d.IsDir() && strings.EqualFold(d.Name(), nome) {
			achou = p
			return filepath.SkipAll
		}
		return nil
	})
	return achou
}

func progressoIA(etapa, arquivo string) func(int64, int64) {
	return func(feito, total int64) {
		iaLocal.mu.Lock()
		iaLocal.etapa, iaLocal.arquivo, iaLocal.feito, iaLocal.total = etapa, arquivo, feito, total
		iaLocal.mu.Unlock()
	}
}

func instalarMotor(ctx context.Context, gpu bool) error {
	if m, ok := lerInfoMotor(); ok && m.GPU == gpu {
		return nil
	}
	zipPath := filepath.Join(pastaIA(), "motor-download.zip")
	apagarZip := true
	local, tag := zipMotorLocal(gpu)
	if local != "" {
		zipPath, apagarZip = local, false // baixado pelo navegador
	} else {
		url, t, err := urlMotor(ctx, gpu)
		if err != nil {
			return err
		}
		tag = t
		if err := baixarArquivo(ctx, url, zipPath, progressoIA("motor", filepath.Base(url))); err != nil {
			return fmt.Errorf("o download do motor falhou: %v", err)
		}
	}
	pastaNova := filepath.Join(pastaIA(), "motor-"+tag)
	os.RemoveAll(pastaNova)
	if err := extrairZip(zipPath, pastaNova); err != nil {
		return fmt.Errorf("não consegui abrir o motor baixado: %v", err)
	}
	if apagarZip {
		os.Remove(zipPath)
	}
	exe := acharServidor(pastaNova)
	if exe == "" {
		return errors.New("o pacote do motor não tem o llama-server")
	}
	if runtime.GOOS != "windows" {
		os.Chmod(exe, 0o755)
	}
	b, _ := json.MarshalIndent(infoMotor{Caminho: exe, Versao: tag, GPU: gpu}, "", "  ")
	os.WriteFile(filepath.Join(pastaIA(), "motor.json"), b, 0o644)
	// apaga motores antigos
	itens, _ := os.ReadDir(pastaIA())
	for _, it := range itens {
		if it.IsDir() && strings.HasPrefix(it.Name(), "motor-") && it.Name() != "motor-"+tag {
			os.RemoveAll(filepath.Join(pastaIA(), it.Name()))
		}
	}
	return nil
}

func instalarModelo(ctx context.Context, m modeloLocal) error {
	destino := filepath.Join(pastaModelos(), m.Arquivo)
	if st, err := os.Stat(destino); err == nil && !st.IsDir() {
		return nil
	}
	os.MkdirAll(pastaModelos(), 0o755)
	if p := modeloLocalNoComputador(m.Arquivo); p != "" {
		progressoIA("modelo", m.Arquivo+" (da pasta Downloads)")(0, -1)
		return moverOuCopiar(p, destino)
	}
	url, nome, err := urlModelo(ctx, m)
	if err != nil {
		return err
	}
	tmp := filepath.Join(pastaModelos(), nome)
	if err := baixarArquivo(ctx, url, tmp, progressoIA("modelo", nome)); err != nil {
		return err
	}
	if nome != m.Arquivo {
		return os.Rename(tmp, destino)
	}
	return nil
}

// ---------- motor rodando ----------

func portaLivre() int {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 18080
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

func pararMotorIA() {
	iaLocal.mu.Lock()
	c := iaLocal.cmd
	iaLocal.cmd, iaLocal.rodando, iaLocal.porta = nil, "", 0
	iaLocal.mu.Unlock()
	if c != nil {
		matarArvore(c)
		c.Wait()
	}
}

func ultimasLinhasMotor() string {
	iaLocal.mu.Lock()
	defer iaLocal.mu.Unlock()
	if iaLocal.logMotor == nil {
		return ""
	}
	s := iaLocal.logMotor.String()
	linhas := strings.Split(strings.TrimSpace(s), "\n")
	if len(linhas) > 6 {
		linhas = linhas[len(linhas)-6:]
	}
	return strings.Join(linhas, "\n")
}

type bufLimitado struct {
	mu *sync.Mutex
	b  *bytes.Buffer
}

func (w bufLimitado) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.b.Write(p)
	if w.b.Len() > 64<<10 {
		resto := append([]byte(nil), w.b.Bytes()[w.b.Len()-32<<10:]...)
		w.b.Reset()
		w.b.Write(resto)
	}
	return len(p), nil
}

// garantirMotorIA deixa o motor rodando com o modelo escolhido e devolve o endereço da API.
func garantirMotorIA(ctx context.Context, aviso func(string)) (string, error) {
	motor, ok := lerInfoMotor()
	if !ok {
		return "", errIANaoInstalada
	}
	modelo, info, ok := caminhoModeloEscolhido()
	if !ok {
		return "", errIANaoInstalada
	}
	iaLocal.mu.Lock()
	if iaLocal.cmd != nil && iaLocal.rodando == modelo && iaLocal.porta > 0 {
		porta := iaLocal.porta
		iaLocal.mu.Unlock()
		if saudavel(porta) {
			return fmt.Sprintf("http://127.0.0.1:%d/v1", porta), nil
		}
	} else {
		iaLocal.mu.Unlock()
	}
	pararMotorIA()
	porta := portaLivre()
	ctxTam := info.Contexto
	if ctxTam == 0 {
		ctxTam = 8192
	}
	args := []string{"-m", modelo, "--host", "127.0.0.1", "--port", fmt.Sprint(porta), "-c", fmt.Sprint(ctxTam), "-np", "1", "--alias", "pyforge"}
	if motor.GPU {
		args = append(args, "-ngl", "99")
	}
	c := exec.Command(motor.Caminho, args...)
	c.Dir = filepath.Dir(motor.Caminho)
	prepararProcesso(c)
	buf := &bytes.Buffer{}
	iaLocal.mu.Lock()
	iaLocal.logMotor = buf
	c.Stdout = bufLimitado{&iaLocal.mu, buf}
	c.Stderr = bufLimitado{&iaLocal.mu, buf}
	iaLocal.mu.Unlock()
	if err := c.Start(); err != nil {
		return "", fmt.Errorf("não consegui ligar o motor da IA: %v", err)
	}
	saiu := make(chan struct{})
	go func() { c.Wait(); close(saiu) }()
	iaLocal.mu.Lock()
	iaLocal.cmd, iaLocal.porta, iaLocal.rodando, iaLocal.iniciando = c, porta, modelo, true
	iaLocal.mu.Unlock()
	defer func() { iaLocal.mu.Lock(); iaLocal.iniciando = false; iaLocal.mu.Unlock() }()
	aviso("Ligando a PyForge IA (na primeira vez demora um pouco)…")
	limite := time.Now().Add(4 * time.Minute)
	for time.Now().Before(limite) {
		select {
		case <-saiu:
			iaLocal.mu.Lock()
			iaLocal.cmd, iaLocal.rodando, iaLocal.porta = nil, "", 0
			iaLocal.mu.Unlock()
			return "", fmt.Errorf("o motor da IA fechou sozinho. Pode faltar memória para esse modelo; tente um menor.\n%s", ultimasLinhasMotor())
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(400 * time.Millisecond):
		}
		if saudavel(porta) {
			return fmt.Sprintf("http://127.0.0.1:%d/v1", porta), nil
		}
	}
	pararMotorIA()
	return "", errors.New("a IA demorou demais para ligar. Tente um modelo menor em Configurações › IA.")
}

func saudavel(porta int) bool {
	resp, err := (&http.Client{Timeout: 2 * time.Second}).Get(fmt.Sprintf("http://127.0.0.1:%d/health", porta))
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}

var errIANaoInstalada = errors.New("local_nao_instalada")

// ---------- API ----------

func apiIALocalEstado(w http.ResponseWriter, r *http.Request) {
	motor, temMotor := lerInfoMotor()
	_, escolhido, temModelo := caminhoModeloEscolhido()
	noDisco := modelosNoDisco()
	baixados := map[string]bool{}
	for _, m := range noDisco {
		baixados[m.Arquivo] = true
	}
	type itemCat struct {
		modeloLocal
		Baixado bool `json:"baixado"`
	}
	var cat []itemCat
	doCatalogo := map[string]bool{}
	for _, m := range catalogoIA {
		cat = append(cat, itemCat{m, baixados[m.Arquivo]})
		doCatalogo[m.Arquivo] = true
	}
	var proprios []modeloNoDisco
	for _, m := range noDisco {
		if !doCatalogo[m.Arquivo] {
			proprios = append(proprios, m)
		}
	}
	iaLocal.mu.Lock()
	defer iaLocal.mu.Unlock()
	escolha := cfgString("ia", "modeloLocal")
	if escolha == "" {
		escolha = modeloPadraoIA
	}
	escreverJSON(w, map[string]any{
		"catalogo": cat, "proprios": proprios, "escolha": escolha, "escolhaNome": escolhido.Nome, "prontoParaUsar": temMotor && temModelo,
		"motor":    map[string]any{"instalado": temMotor, "versao": motor.Versao, "gpu": motor.GPU},
		"baixando": iaLocal.baixando, "etapa": iaLocal.etapa, "instalando": iaLocal.modelo, "paginaMotor": paginaMotor, "arquivo": iaLocal.arquivo, "feito": iaLocal.feito, "total": iaLocal.total, "erro": iaLocal.erro,
		"rodando": iaLocal.cmd != nil && !iaLocal.iniciando, "iniciando": iaLocal.iniciando, "pastaModelos": pastaModelos(), "ramGB": memoriaTotalGB(),
	})
}

func iniciarInstalacaoIA(modeloID string, gpu bool) error {
	if modeloID == "" {
		modeloID = modeloPadraoIA
	}
	m, doCatalogo := modeloPorID(modeloID)
	if !doCatalogo {
		if st, err := os.Stat(filepath.Join(pastaModelos(), filepath.Base(modeloID))); err != nil || st.IsDir() {
			return errors.New("modelo desconhecido")
		}
	}
	iaLocal.mu.Lock()
	if iaLocal.baixando {
		iaLocal.mu.Unlock()
		return errors.New("já estou baixando, espere terminar")
	}
	ctx, cancel := context.WithCancel(context.Background())
	iaLocal.baixando, iaLocal.erro, iaLocal.cancelar, iaLocal.feito, iaLocal.total, iaLocal.etapa, iaLocal.modelo = true, "", cancel, 0, 0, "motor", modeloID
	iaLocal.mu.Unlock()
	escolher := func() {
		salvarParcialConfig(map[string]any{"ia": map[string]any{"modeloLocal": filepath.Base(modeloID), "provedor": "pyforge"}})
	}
	if !doCatalogo {
		escolher() // arquivo próprio já está no disco
	}
	go func() {
		err := instalarMotor(ctx, gpu)
		if err == nil && doCatalogo {
			iaLocal.mu.Lock()
			iaLocal.etapa = "modelo"
			iaLocal.mu.Unlock()
			err = instalarModelo(ctx, m)
		}
		iaLocal.mu.Lock()
		iaLocal.baixando, iaLocal.cancelar = false, nil
		if err != nil {
			if errors.Is(err, context.Canceled) {
				iaLocal.erro = "Download cancelado. Clique de novo para continuar de onde parou."
			} else {
				iaLocal.erro = err.Error()
			}
		}
		iaLocal.mu.Unlock()
		if err == nil {
			escolher()     // só troca de modelo depois que baixou tudo
			pararMotorIA() // o próximo pedido liga com o modelo novo
		}
	}()
	return nil
}

func apiIALocalInstalar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Modelo string `json:"modelo"`
		GPU    bool   `json:"gpu"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	if err := iniciarInstalacaoIA(p.Modelo, p.GPU); err != nil {
		switch err.Error() {
		case "modelo desconhecido":
			erroJSON(w, 404, "modelo desconhecido")
		case "já estou baixando, espere terminar":
			erroJSON(w, 409, "já estou baixando, espere terminar")
		default:
			erroJSON(w, 400, err.Error())
		}
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiIALocalCancelar(w http.ResponseWriter, r *http.Request) {
	iaLocal.mu.Lock()
	if iaLocal.cancelar != nil {
		iaLocal.cancelar()
	}
	iaLocal.mu.Unlock()
	escreverJSON(w, map[string]any{"ok": true})
}

func apiIALocalRemover(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Arquivo string `json:"arquivo"`
	}
	if lerJSON(r, &p) != nil || p.Arquivo == "" {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	alvo := filepath.Join(pastaModelos(), filepath.Base(p.Arquivo))
	iaLocal.mu.Lock()
	emUso := iaLocal.rodando == alvo
	iaLocal.mu.Unlock()
	if emUso {
		pararMotorIA()
	}
	if err := os.Remove(alvo); err != nil && !os.IsNotExist(err) {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiIALocalPasta(w http.ResponseWriter, r *http.Request) {
	os.MkdirAll(pastaModelos(), 0o755)
	if err := abrirPastaNoSistema(pastaModelos()); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true, "pasta": pastaModelos()})
}

// ---------- 👍 / 👎: exemplos para treinar a IA ----------

func arquivoTreino() string { return filepath.Join(pastaIA(), "treino", "exemplos.jsonl") }

var muTreino sync.Mutex

func apiIAFeedback(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Nota      int          `json:"nota"`
		Mensagens []mensagemIA `json:"mensagens"`
		Contexto  string       `json:"contexto"`
		Onde      string       `json:"onde"`
		Correcao  string       `json:"correcao"`
	}
	if lerJSON(r, &p) != nil || (p.Nota != 1 && p.Nota != -1) || len(p.Mensagens) < 2 {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	if len(p.Contexto) > 8000 {
		p.Contexto = p.Contexto[:8000] + "\n(cortado)"
	}
	provedor := cfgString("ia", "provedor")
	modelo := cfgString("ia", "modelo")
	if provedor == "pyforge" || provedor == "" {
		_, m, _ := caminhoModeloEscolhido()
		modelo = m.Nome
	}
	linha, _ := json.Marshal(map[string]any{
		"quando": time.Now().Format(time.RFC3339), "nota": p.Nota, "onde": p.Onde, "provedor": provedor, "modelo": modelo,
		"contexto": p.Contexto, "mensagens": p.Mensagens, "correcao": p.Correcao,
	})
	muTreino.Lock()
	defer muTreino.Unlock()
	os.MkdirAll(filepath.Dir(arquivoTreino()), 0o755)
	f, err := os.OpenFile(arquivoTreino(), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	f.Write(append(linha, '\n'))
	f.Close()
	escreverJSON(w, map[string]any{"ok": true})
}

func apiIAFeedbackResumo(w http.ResponseWriter, r *http.Request) {
	muTreino.Lock()
	defer muTreino.Unlock()
	b, _ := os.ReadFile(arquivoTreino())
	bons, ruins := 0, 0
	for _, l := range bytes.Split(b, []byte("\n")) {
		var x struct {
			Nota int `json:"nota"`
		}
		if json.Unmarshal(l, &x) == nil {
			if x.Nota > 0 {
				bons++
			} else if x.Nota < 0 {
				ruins++
			}
		}
	}
	escreverJSON(w, map[string]any{"bons": bons, "ruins": ruins, "arquivo": arquivoTreino()})
}

func apiIAFeedbackApagar(w http.ResponseWriter, r *http.Request) {
	muTreino.Lock()
	defer muTreino.Unlock()
	if err := os.Remove(arquivoTreino()); err != nil && !os.IsNotExist(err) {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

// apiIAKit monta o kit de treino: os exemplos prontos + os 👍 da pessoa, num .zip para o Colab.
func apiIAKit(w http.ResponseWriter, r *http.Request) {
	pasta := filepath.Join(pastaIA(), "treino", "kit")
	if err := os.MkdirAll(pasta, 0o755); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	base, _ := assetsFS.ReadFile("assets/kit/dataset_base.jsonl")
	prompt, _ := assetsFS.ReadFile("assets/prompts/assistente_local.md")
	notebook, _ := assetsFS.ReadFile("assets/kit/treinar_pyforge_ia.ipynb")
	leia, _ := assetsFS.ReadFile("assets/kit/LEIA-ME.md")

	// 👍 viram conversas de treino; o contexto (código aberto etc.) vai como mensagem de sistema.
	muTreino.Lock()
	bruto, _ := os.ReadFile(arquivoTreino())
	muTreino.Unlock()
	var meus bytes.Buffer
	nMeus := 0
	for _, l := range bytes.Split(bruto, []byte("\n")) {
		var x struct {
			Nota      int          `json:"nota"`
			Contexto  string       `json:"contexto"`
			Mensagens []mensagemIA `json:"mensagens"`
		}
		if json.Unmarshal(l, &x) != nil || x.Nota != 1 || len(x.Mensagens) < 2 {
			continue
		}
		msgs := []mensagemIA{}
		if strings.TrimSpace(x.Contexto) != "" {
			msgs = append(msgs, mensagemIA{Role: "system", Content: "# Informações do PyForge\n" + x.Contexto})
		}
		msgs = append(msgs, x.Mensagens...)
		b, _ := json.Marshal(map[string]any{"messages": msgs})
		meus.Write(append(b, '\n'))
		nMeus++
	}
	nBase := bytes.Count(base, []byte("\n"))

	zipPath := filepath.Join(pasta, "pyforge-kit-dados.zip")
	f, err := os.Create(zipPath)
	if err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	zw := zip.NewWriter(f)
	for nome, dados := range map[string][]byte{"dataset_base.jsonl": base, "meus_exemplos.jsonl": meus.Bytes(), "prompt_sistema.md": prompt} {
		e, _ := zw.Create(nome)
		e.Write(dados)
	}
	zw.Close()
	f.Close()
	os.WriteFile(filepath.Join(pasta, "treinar_pyforge_ia.ipynb"), notebook, 0o644)
	os.WriteFile(filepath.Join(pasta, "LEIA-ME.md"), leia, 0o644)
	abrirPastaNoSistema(pasta)
	escreverJSON(w, map[string]any{"ok": true, "pasta": pasta, "exemplos": nBase + nMeus, "meus": nMeus})
}

// apiAbrirURL abre um endereço no navegador padrão (só sites conhecidos).
func apiAbrirURL(w http.ResponseWriter, r *http.Request) {
	var p struct {
		URL string `json:"url"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	ok := false
	for _, pre := range []string{"https://github.com/", "https://huggingface.co/", "https://colab.research.google.com/", "https://console.anthropic.com/", "https://platform.openai.com/", "https://ollama.com/", "https://docs.python.org/"} {
		if strings.HasPrefix(p.URL, pre) && !strings.ContainsAny(p.URL, " \"\n\r<>^&|") {
			ok = true
		}
	}
	if !ok {
		erroJSON(w, 403, "endereço não permitido")
		return
	}
	if err := abrirNoNavegador(p.URL); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}
