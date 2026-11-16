// PyForge — o app para programar Python.
// Servidor local (só biblioteca padrão do Go) + interface web embutida.
package main

import (
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"time"
)

const versao = "0.12.0"

//go:embed all:assets
var assetsFS embed.FS

var (
	token        string
	dataDir      string
	uvPath       string
	hostEsperado string
	ultimoPing   atomic.Int64
	pingVisto    atomic.Bool
	tchau        atomic.Int64
)

func main() {
	semJanela := flag.Bool("sem-janela", false, "não abre janela (modo de teste)")
	porta := flag.Int("porta", 0, "porta fixa (0 = automática)")
	tokenFixo := flag.String("token", "", "token fixo (modo de teste)")
	flag.Parse()

	prepararPastas()
	carregarConfig()
	uvPath = garantirUV()
	extrairHelpers()

	if *tokenFixo != "" {
		token = *tokenFixo
	} else {
		b := make([]byte, 16)
		rand.Read(b)
		token = hex.EncodeToString(b)
	}

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *porta))
	if err != nil {
		log.Fatal(err)
	}
	p := ln.Addr().(*net.TCPAddr).Port
	hostEsperado = fmt.Sprintf("127.0.0.1:%d", p)

	mux := http.NewServeMux()
	registrarRotas(mux)
	web, _ := fs.Sub(assetsFS, "assets/web")
	arquivos := http.FileServer(http.FS(web))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/monaco-vs/") {
			w.Header().Set("Cache-Control", "max-age=86400")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		// PyForge em inglês: os módulos vêm de js-en (mesmos arquivos, textos traduzidos)
		if strings.HasPrefix(r.URL.Path, "/js/") && cfgString("idioma") == "en" {
			en := "js-en/" + strings.TrimPrefix(r.URL.Path, "/js/")
			if f, err := web.Open(en); err == nil {
				f.Close()
				r2 := r.Clone(r.Context())
				r2.URL.Path = "/" + en
				arquivos.ServeHTTP(w, r2)
				return
			}
		}
		arquivos.ServeHTTP(w, r)
	}))

	srv := &http.Server{Handler: protegido(mux)}
	go srv.Serve(ln)

	// Instalador pediu para já baixar a IA na primeira abertura.
	if cfgBool("ia", "instalarAoAbrir") {
		modelo := cfgString("ia", "modeloLocal")
		salvarParcialConfig(map[string]any{"ia": map[string]any{"instalarAoAbrir": false}})
		go func() { _ = iniciarInstalacaoIA(modelo, false) }()
	}

	url := fmt.Sprintf("http://%s/#t=%s", hostEsperado, token)
	log.Printf("PyForge %s rodando em %s", versao, url)
	if *semJanela {
		select {}
	}

	inicio := time.Now()
	go func() {
		// Se a janela ficou presa a este processo, fechar a janela fecha o PyForge.
		if abrirJanela(url) {
			encerrar()
		}
	}()
	// Também acompanha pelos pings da página (caso o navegador continue aberto em segundo plano).
	for {
		time.Sleep(2 * time.Second)
		agora := time.Now().UnixMilli()
		if t := tchau.Load(); t > 0 && agora-t > 5000 && ultimoPing.Load() < t {
			break
		}
		if pingVisto.Load() && agora-ultimoPing.Load() > 60_000 {
			break
		}
		if !pingVisto.Load() && time.Since(inicio) > 3*time.Minute {
			break
		}
	}
	encerrar()
}

func encerrar() {
	pararMotorIA()
	pararTodosJobs()
	pararHelpers()
	os.Exit(0)
}

func prepararPastas() {
	if runtime.GOOS == "windows" {
		base := os.Getenv("LOCALAPPDATA")
		if base == "" {
			base, _ = os.UserConfigDir()
		}
		dataDir = filepath.Join(base, "PyForge")
	} else {
		home, _ := os.UserHomeDir()
		dataDir = filepath.Join(home, ".local", "share", "pyforge")
	}
	os.MkdirAll(filepath.Join(dataDir, "bin"), 0o755)
	os.MkdirAll(filepath.Join(dataDir, "py"), 0o755)
	logf, err := os.OpenFile(filepath.Join(dataDir, "pyforge.log"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err == nil {
		log.SetOutput(io.MultiWriter(os.Stderr, logf))
	}
}

func extrairHelpers() {
	ents, _ := assetsFS.ReadDir("assets/py")
	for _, e := range ents {
		b, _ := assetsFS.ReadFile("assets/py/" + e.Name())
		os.WriteFile(filepath.Join(dataDir, "py", e.Name()), b, 0o644)
	}
}

// protegido exige o token em toda chamada da API e bloqueia outros sites.
func protegido(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != hostEsperado {
			http.Error(w, "host inválido", http.StatusForbidden)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			t := r.Header.Get("X-PyForge-Token")
			if t == "" {
				t = r.URL.Query().Get("t")
			}
			if t != token {
				http.Error(w, "token inválido", http.StatusForbidden)
				return
			}
		}
		h.ServeHTTP(w, r)
	})
}

// ---------- utilidades JSON ----------

func lerJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(io.LimitReader(r.Body, 64<<20)).Decode(v)
}

func escreverJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(v)
}

func erroJSON(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]any{"erro": traduzirMsg(msg)})
}

func registrarRotas(m *http.ServeMux) {
	m.HandleFunc("/api/ping", apiPing)
	m.HandleFunc("/api/tchau", func(w http.ResponseWriter, r *http.Request) {
		tchau.Store(time.Now().UnixMilli())
		w.WriteHeader(204)
	})
	m.HandleFunc("/api/config", apiConfig)
	m.HandleFunc("/api/conta", apiConta)
	m.HandleFunc("/api/conta/", apiContaAcao)
	m.HandleFunc("/api/conta-sair", apiContaSair)
	m.HandleFunc("/api/stats", apiStats)
	m.HandleFunc("/api/prompt", func(w http.ResponseWriter, r *http.Request) {
		b, _ := assetsFS.ReadFile("assets/prompts/assistente.md")
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write(b)
	})

	m.HandleFunc("/api/projetos", apiProjetos)
	m.HandleFunc("/api/projetos/criar", apiCriarProjeto)
	m.HandleFunc("/api/projetos/abrir", apiAbrirProjeto)
	m.HandleFunc("/api/projetos/esquecer", apiEsquecerProjeto)
	m.HandleFunc("/api/escolher-pasta", apiEscolherPasta)
	m.HandleFunc("/api/templates", apiTemplates)

	m.HandleFunc("/api/fs/arvore", apiArvore)
	m.HandleFunc("/api/fs/ler", apiLer)
	m.HandleFunc("/api/fs/escrever", apiEscrever)
	m.HandleFunc("/api/fs/criar", apiCriar)
	m.HandleFunc("/api/fs/renomear", apiRenomear)
	m.HandleFunc("/api/fs/apagar", apiApagar)
	m.HandleFunc("/api/fs/buscar", apiBuscar)
	m.HandleFunc("/api/fs/revelar", apiRevelar)
	m.HandleFunc("/api/fs/bruto", apiBruto)
	m.HandleFunc("/api/tempo", apiTempo)
	m.HandleFunc("/api/celular", apiCelular)
	m.HandleFunc("/api/juntos", apiJuntos)
	m.HandleFunc("/api/juntos/criar", apiJuntosCriar)
	m.HandleFunc("/api/juntos/entrar", apiJuntosEntrar)
	m.HandleFunc("/api/juntos/eventos", apiJuntosEventos)
	m.HandleFunc("/api/juntos/enviar", apiJuntosEnviar)
	m.HandleFunc("/api/juntos/sair", apiJuntosSair)
	m.HandleFunc("/api/linguagens", apiLinguagens)
	m.HandleFunc("/api/linguagens/instalar", apiLinguagensInstalar)
	m.HandleFunc("/api/linguagens/configurar", apiLinguagensConfigurar)
	m.HandleFunc("/api/linguagens/remover", apiLinguagensRemover)
	m.HandleFunc("/api/linguagens/extra", apiLinguagensExtra)
	m.HandleFunc("/api/ia/local", apiIALocalEstado)
	m.HandleFunc("/api/ia/local/instalar", apiIALocalInstalar)
	m.HandleFunc("/api/ia/local/cancelar", apiIALocalCancelar)
	m.HandleFunc("/api/ia/local/remover", apiIALocalRemover)
	m.HandleFunc("/api/ia/local/pasta", apiIALocalPasta)
	m.HandleFunc("/api/ia/feedback", apiIAFeedback)
	m.HandleFunc("/api/ia/kit", apiIAKit)
	m.HandleFunc("/api/abrir-url", apiAbrirURL)
	m.HandleFunc("/api/ia/feedback/resumo", apiIAFeedbackResumo)
	m.HandleFunc("/api/ia/feedback/apagar", apiIAFeedbackApagar)
	m.HandleFunc("/api/fs/escrever-b64", apiEscreverB64)

	m.HandleFunc("/api/job/iniciar", apiJobIniciar)
	m.HandleFunc("/api/job/stream", apiJobStream)
	m.HandleFunc("/api/job/parar", apiJobParar)
	m.HandleFunc("/api/job/entrada", apiJobEntrada)

	m.HandleFunc("/api/py/analisar", apiAnalisar)
	m.HandleFunc("/api/py/formatar", apiFormatar)
	m.HandleFunc("/api/py/completar", apiCompletar)
	m.HandleFunc("/api/py/info", apiInfo)
	m.HandleFunc("/api/py/definicao", apiDefinicao)
	m.HandleFunc("/api/py/ambiente", apiAmbiente)
	m.HandleFunc("/api/py/nome-pacote", apiNomePacote)

	m.HandleFunc("/api/git/status", apiGitStatus)
	m.HandleFunc("/api/git/commit", apiGitCommit)
	m.HandleFunc("/api/git/init", apiGitInit)

	m.HandleFunc("/api/ia/chat", apiIAChat)

	m.HandleFunc("/api/designer/listar", apiDesignerListar)
	m.HandleFunc("/api/designer/salvar", apiDesignerSalvar)
}

func apiPing(w http.ResponseWriter, r *http.Request) {
	ultimoPing.Store(time.Now().UnixMilli())
	pingVisto.Store(true)
	_, gitErr := execLookPath("git")
	escreverJSON(w, map[string]any{
		"ok": true, "versao": versao, "sistema": runtime.GOOS,
		"uv": uvPath != "", "git": gitErr == nil, "dados": dataDir,
	})
}
