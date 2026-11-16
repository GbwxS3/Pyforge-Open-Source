package main

// Conta do PyForge: o app conversa com o servidor de contas (pyforge.online) por aqui.
// A página nunca vê o token da sessão; ele fica só no arquivo conta.json da pasta de dados.

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

const contasPadrao = "https://pyforge-contas.pyforge-app.workers.dev"

type contaLocal struct {
	Sessao     string         `json:"sessao"`
	Conta      map[string]any `json:"conta"`
	Acesso     map[string]any `json:"acesso"`
	ValidadaEm time.Time      `json:"validadaEm"`
}

var (
	contaMu  sync.Mutex
	clienteC = &http.Client{Timeout: 25 * time.Second}
)

func urlContas() string {
	if v := strings.TrimSpace(os.Getenv("PYFORGE_CONTAS_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	if v := cfgString("contas", "url"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return contasPadrao
}

func arquivoConta() string { return filepath.Join(dataDir, "conta.json") }

// ultimoEmail lembra o email da última conta, para já preencher a tela de entrar.
func ultimoEmail() string {
	b, _ := os.ReadFile(filepath.Join(dataDir, "ultimo-email.txt"))
	return strings.TrimSpace(string(b))
}

func lerContaLocal() *contaLocal {
	dados, err := os.ReadFile(arquivoConta())
	if err != nil {
		return nil
	}
	var c contaLocal
	if json.Unmarshal(dados, &c) != nil || c.Sessao == "" {
		return nil
	}
	return &c
}

func salvarContaLocal(c *contaLocal) {
	dados, _ := json.MarshalIndent(c, "", " ")
	tmp := arquivoConta() + ".tmp"
	if os.WriteFile(tmp, dados, 0o600) == nil {
		os.Rename(tmp, arquivoConta())
	}
}

func idiomaApp() string {
	if cfgString("idioma") == "en" {
		return "en"
	}
	return "pt"
}

func pt(pt, en string) string {
	if idiomaApp() == "en" {
		return en
	}
	return pt
}

func dispositivo() string {
	h, _ := os.Hostname()
	return "PyForge " + versao + " · " + runtime.GOOS + " · " + h
}

// chamarContas faz um pedido ao servidor de contas. Devolve status e o JSON da resposta.
func chamarContas(metodo, caminho string, corpo map[string]any, sessao string) (int, map[string]any, error) {
	var leitor io.Reader
	if corpo != nil {
		b, _ := json.Marshal(corpo)
		leitor = bytes.NewReader(b)
	}
	req, err := http.NewRequest(metodo, urlContas()+caminho, leitor)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Idioma", idiomaApp())
	req.Header.Set("User-Agent", "PyForge/"+versao)
	if sessao != "" {
		req.Header.Set("Authorization", "Bearer "+sessao)
	}
	resp, err := clienteC.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	var dados map[string]any
	json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&dados)
	if dados == nil {
		dados = map[string]any{}
	}
	return resp.StatusCode, dados, nil
}

func semInternet(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusBadGateway)
	json.NewEncoder(w).Encode(map[string]any{"erro": pt("Não consegui falar com o servidor de contas. Confira a internet e tente de novo.", "I couldn't reach the account server. Check your internet and try again."), "codigo": "sem_conexao"})
}

// GET /api/conta — diz se tem alguém conectado.
func apiConta(w http.ResponseWriter, r *http.Request) {
	contaMu.Lock()
	defer contaMu.Unlock()
	c := lerContaLocal()
	if c == nil {
		escreverJSON(w, map[string]any{"logado": false, "ultimoEmail": ultimoEmail()})
		return
	}
	status, dados, err := chamarContas("GET", "/v1/conta", nil, c.Sessao)
	switch {
	case err == nil && status == 200:
		c.Conta, _ = dados["conta"].(map[string]any)
		c.Acesso, _ = dados["acesso"].(map[string]any)
		c.ValidadaEm = time.Now()
		salvarContaLocal(c)
		escreverJSON(w, map[string]any{"logado": true, "conta": c.Conta, "acesso": c.Acesso})
	case err == nil && status == 401:
		os.Remove(arquivoConta())
		escreverJSON(w, map[string]any{"logado": false, "motivo": "sessao_expirada", "ultimoEmail": ultimoEmail()})
	default:
		// Sem internet: continua conectado por até 30 dias desde a última confirmação.
		if time.Since(c.ValidadaEm) < 30*24*time.Hour {
			escreverJSON(w, map[string]any{"logado": true, "offline": true, "conta": c.Conta, "acesso": map[string]any{"liberado": true, "plano": "offline"}})
			return
		}
		escreverJSON(w, map[string]any{"logado": false, "offline": true, "ultimoEmail": ultimoEmail()})
	}
}

var acoesConta = map[string]bool{
	"cadastro/iniciar": true, "cadastro/confirmar": true,
	"entrar/iniciar": true, "entrar/confirmar": true,
	"codigo/reenviar": true, "senha/iniciar": true, "senha/confirmar": true,
}

// POST /api/conta/<ação> — repassa para o servidor e guarda a sessão quando ela chega.
func apiContaAcao(w http.ResponseWriter, r *http.Request) {
	acao := strings.TrimPrefix(r.URL.Path, "/api/conta/")
	if r.Method != http.MethodPost || !acoesConta[acao] {
		erroJSON(w, 404, "não encontrado")
		return
	}
	var corpo map[string]any
	if err := lerJSON(r, &corpo); err != nil || corpo == nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	corpo["idioma"] = idiomaApp()
	corpo["dispositivo"] = dispositivo()
	status, dados, err := chamarContas("POST", "/v1/"+acao, corpo, "")
	if err != nil {
		semInternet(w)
		return
	}
	if s, ok := dados["sessao"].(string); ok && s != "" && status == 200 {
		contaMu.Lock()
		c := &contaLocal{Sessao: s, ValidadaEm: time.Now()}
		c.Conta, _ = dados["conta"].(map[string]any)
		c.Acesso, _ = dados["acesso"].(map[string]any)
		salvarContaLocal(c)
		if e, ok := c.Conta["email"].(string); ok {
			os.WriteFile(filepath.Join(dataDir, "ultimo-email.txt"), []byte(e), 0o600)
		}
		contaMu.Unlock()
		delete(dados, "sessao")
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(dados)
}

// POST /api/conta-sair — desconecta este computador.
func apiContaSair(w http.ResponseWriter, r *http.Request) {
	contaMu.Lock()
	defer contaMu.Unlock()
	if c := lerContaLocal(); c != nil {
		chamarContas("POST", "/v1/sair", map[string]any{}, c.Sessao)
	}
	os.Remove(arquivoConta())
	escreverJSON(w, map[string]any{"ok": true})
}
