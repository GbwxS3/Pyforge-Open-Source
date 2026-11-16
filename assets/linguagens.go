package main

// Linguagens: outras linguagens como plugins configuráveis dentro do PyForge.
// Cada linguagem é só "um programa que roda um arquivo": o PyForge acha o programa
// (no PC, num caminho escolhido ou baixado com um clique) e o botão Executar passa a
// funcionar para aquela extensão. A pessoa também pode cadastrar a sua própria linguagem.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"
)

type defLinguagem struct {
	ID       string   `json:"id"`
	Nome     string   `json:"nome"`
	Exts     []string `json:"extensoes"`
	Exes     []string `json:"-"`
	Comando  string   `json:"comandoPadrao"`
	VerArg   string   `json:"-"`
	Site     string   `json:"site"`
	Desc     string   `json:"desc"`
	Baixavel bool     `json:"baixavel"`
	Tamanho  string   `json:"tamanho"`
	Extra    bool     `json:"extra"`
}

var catalogoLinguagens = []defLinguagem{
	{ID: "javascript", Nome: "JavaScript", Exts: []string{".js", ".mjs", ".cjs"}, Exes: []string{"node"},
		Comando: "{exe} {arquivo}", VerArg: "--version", Site: "https://nodejs.org",
		Desc: "Roda arquivos .js com o Node.js (versão LTS oficial).", Baixavel: true, Tamanho: "~30 MB"},
	{ID: "lua", Nome: "Lua", Exts: []string{".lua"}, Exes: []string{"lua", "lua54", "lua5.4", "lua53", "lua5.3"},
		Comando: "{exe} {arquivo}", VerArg: "-v", Site: "https://www.lua.org",
		Desc: "Roda arquivos .lua com o Lua 5.4 (LuaBinaries).", Baixavel: true, Tamanho: "~0,5 MB"},
}

type extraLinguagem struct {
	ID      string   `json:"id"`
	Nome    string   `json:"nome"`
	Exts    []string `json:"extensoes"`
	Comando string   `json:"comando"`
}

type configLinguagens struct {
	Caminhos  map[string]string `json:"caminhos"`   // id -> programa escolhido pela pessoa
	Comandos  map[string]string `json:"comandos"`   // id -> comando personalizado
	Desligada map[string]bool   `json:"desligadas"` // id -> plugin desligado
	Extras    []extraLinguagem  `json:"extras"`
}

var lingMu sync.Mutex

var lingBaixa struct {
	mu    sync.Mutex
	id    string
	feito int64
	total int64
	erro  string
	etapa string
}

func pastaLinguagens() string         { return filepath.Join(dataDir, "linguagens") }
func arquivoConfigLinguagens() string { return filepath.Join(dataDir, "linguagens.json") }

func lerConfigLinguagens() configLinguagens {
	var c configLinguagens
	if b, err := os.ReadFile(arquivoConfigLinguagens()); err == nil {
		json.Unmarshal(b, &c)
	}
	if c.Caminhos == nil {
		c.Caminhos = map[string]string{}
	}
	if c.Comandos == nil {
		c.Comandos = map[string]string{}
	}
	if c.Desligada == nil {
		c.Desligada = map[string]bool{}
	}
	return c
}

func salvarConfigLinguagens(c configLinguagens) error {
	b, _ := json.MarshalIndent(c, "", "  ")
	return os.WriteFile(arquivoConfigLinguagens(), b, 0o644)
}

func defPorID(id string, c configLinguagens) (defLinguagem, bool) {
	for _, d := range catalogoLinguagens {
		if d.ID == id {
			return d, true
		}
	}
	for _, x := range c.Extras {
		if x.ID == id {
			return defLinguagem{ID: x.ID, Nome: x.Nome, Exts: x.Exts, Comando: x.Comando, Extra: true}, true
		}
	}
	return defLinguagem{}, false
}

func defPorExtensao(ext string, c configLinguagens) (defLinguagem, bool) {
	ext = strings.ToLower(ext)
	for _, x := range c.Extras { // as da pessoa ganham das prontas
		for _, e := range x.Exts {
			if strings.EqualFold(e, ext) {
				return defPorID(x.ID, c)
			}
		}
	}
	for _, d := range catalogoLinguagens {
		for _, e := range d.Exts {
			if e == ext {
				return d, true
			}
		}
	}
	return defLinguagem{}, false
}

func nomeExe(n string) string {
	if runtime.GOOS == "windows" && !strings.HasSuffix(strings.ToLower(n), ".exe") {
		return n + ".exe"
	}
	return n
}

// acharPrograma devolve o programa da linguagem e de onde ele veio.
func acharPrograma(d defLinguagem, c configLinguagens) (string, string) {
	if p := c.Caminhos[d.ID]; p != "" {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, "manual"
		}
	}
	if len(d.Exes) == 0 {
		return "", ""
	}
	// baixado pelo PyForge
	pasta := filepath.Join(pastaLinguagens(), d.ID)
	achado := ""
	filepath.WalkDir(pasta, func(p string, e fs.DirEntry, err error) error {
		if err != nil || achado != "" || e.IsDir() {
			return nil
		}
		for _, x := range d.Exes {
			if strings.EqualFold(e.Name(), nomeExe(x)) {
				achado = p
				return filepath.SkipAll
			}
		}
		return nil
	})
	if achado != "" {
		return achado, "pyforge"
	}
	for _, x := range d.Exes {
		if p, err := exec.LookPath(x); err == nil {
			return p, "sistema"
		}
	}
	return "", ""
}

var versaoCache sync.Map // caminho -> versão

func versaoPrograma(exe, arg string) string {
	if exe == "" || arg == "" {
		return ""
	}
	if v, ok := versaoCache.Load(exe); ok {
		return v.(string)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	c := exec.CommandContext(ctx, exe, arg)
	prepararProcesso(c)
	out, _ := c.CombinedOutput()
	v := strings.TrimSpace(strings.SplitN(string(out), "\n", 2)[0])
	if i := strings.Index(v, "  "); i > 0 {
		v = v[:i]
	}
	if len(v) > 80 {
		v = v[:80]
	}
	versaoCache.Store(exe, v)
	return v
}

// partesComando separa um comando em partes, respeitando aspas.
func partesComando(s string) []string {
	var r []string
	var cur strings.Builder
	aspa := rune(0)
	tem := false
	for _, ch := range s {
		switch {
		case aspa != 0 && ch == aspa:
			aspa = 0
		case aspa == 0 && (ch == '"' || ch == '\''):
			aspa, tem = ch, true
		case aspa == 0 && (ch == ' ' || ch == '\t'):
			if cur.Len() > 0 || tem {
				r = append(r, cur.String())
				cur.Reset()
				tem = false
			}
		default:
			cur.WriteRune(ch)
		}
	}
	if cur.Len() > 0 || tem {
		r = append(r, cur.String())
	}
	return r
}

// montarComando troca {exe} {arquivo} {pasta} {nome} pelos valores reais.
func montarComando(d defLinguagem, c configLinguagens, arquivo string) (*exec.Cmd, string, error) {
	modelo := d.Comando
	if x := strings.TrimSpace(c.Comandos[d.ID]); x != "" && !d.Extra {
		modelo = x
	}
	exe, _ := acharPrograma(d, c)
	if strings.Contains(modelo, "{exe}") && exe == "" {
		return nil, "", fmt.Errorf("%s não está instalado. Abra Configurações › Linguagens e clique em Instalar (ou escolha onde ele está)", d.Nome)
	}
	nome := strings.TrimSuffix(filepath.Base(arquivo), filepath.Ext(arquivo))
	troca := strings.NewReplacer("{exe}", exe, "{arquivo}", arquivo, "{pasta}", filepath.Dir(arquivo), "{nome}", nome)
	partes := partesComando(modelo)
	if len(partes) == 0 {
		return nil, "", errors.New("o comando da linguagem está vazio")
	}
	for i := range partes {
		partes[i] = troca.Replace(partes[i])
	}
	if !strings.Contains(modelo, "{arquivo}") && !strings.Contains(modelo, "{nome}") {
		partes = append(partes, arquivo)
	}
	visivel := strings.ReplaceAll(strings.Join(partes, " "), filepath.Dir(arquivo)+string(os.PathSeparator), "")
	if d.ID == "lua" && partes[0] == exe {
		// sem isso o Lua guarda o texto do io.write e a pergunta só aparece depois do io.read
		partes = append([]string{exe, "-e", "io.stdout:setvbuf('no')"}, partes[1:]...)
	}
	cmd := exec.Command(partes[0], partes[1:]...)
	cmd.Dir = filepath.Dir(arquivo)
	return cmd, visivel, nil
}

// ---------- download ----------

var reVersaoNode = regexp.MustCompile(`^v\d+\.\d+\.\d+$`)

func urlDownload(id string) (string, error) {
	if v := os.Getenv("PYFORGE_LING_" + strings.ToUpper(id)); v != "" { // para testes
		return v, nil
	}
	if runtime.GOOS != "windows" {
		return "", errors.New("o download automático é só para Windows; instale pelo gerenciador de pacotes do sistema")
	}
	switch id {
	case "javascript":
		v := "v22.12.0"
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://nodejs.org/dist/index.json", nil)
		req.Header.Set("User-Agent", "PyForge/"+versao)
		if resp, err := http.DefaultClient.Do(req); err == nil {
			var lista []struct {
				Version string   `json:"version"`
				LTS     any      `json:"lts"`
				Files   []string `json:"files"`
			}
			if json.NewDecoder(resp.Body).Decode(&lista) == nil {
				for _, x := range lista {
					if lts, ok := x.LTS.(string); ok && lts != "" && reVersaoNode.MatchString(x.Version) {
						v = x.Version
						break
					}
				}
			}
			resp.Body.Close()
		}
		return fmt.Sprintf("https://nodejs.org/dist/%s/node-%s-win-x64.zip", v, v), nil
	case "lua":
		return "https://downloads.sourceforge.net/project/luabinaries/5.4.2/Tools%20Executables/lua-5.4.2_Win64_bin.zip", nil
	}
	return "", errors.New("essa linguagem não tem download automático")
}

func instalarLinguagem(id string) {
	defer func() {
		lingBaixa.mu.Lock()
		lingBaixa.id = ""
		lingBaixa.mu.Unlock()
	}()
	falhar := func(err error) {
		lingBaixa.mu.Lock()
		lingBaixa.erro = err.Error()
		lingBaixa.mu.Unlock()
	}
	url, err := urlDownload(id)
	if err != nil {
		falhar(err)
		return
	}
	pasta := filepath.Join(pastaLinguagens(), id)
	zipPath := filepath.Join(pastaLinguagens(), id+".zip")
	os.MkdirAll(pastaLinguagens(), 0o755)
	err = baixarArquivo(context.Background(), url, zipPath, func(feito, total int64) {
		lingBaixa.mu.Lock()
		lingBaixa.feito, lingBaixa.total = feito, total
		lingBaixa.mu.Unlock()
	})
	if err != nil {
		falhar(fmt.Errorf("não consegui baixar (%v). Você pode instalar pelo site oficial e clicar em “Escolher programa”", err))
		return
	}
	lingBaixa.mu.Lock()
	lingBaixa.etapa = "extraindo"
	lingBaixa.mu.Unlock()
	os.RemoveAll(pasta)
	if err := extrairZip(zipPath, pasta); err != nil {
		os.Remove(zipPath)
		falhar(fmt.Errorf("o arquivo baixado veio estragado (%v). Tente de novo", err))
		return
	}
	os.Remove(zipPath)
	c := lerConfigLinguagens()
	d, _ := defPorID(id, c)
	if p, origem := acharPrograma(d, c); p == "" || origem != "pyforge" {
		falhar(errors.New("baixei, mas não achei o programa dentro do arquivo"))
	}
	versaoCache.Range(func(k, _ any) bool { versaoCache.Delete(k); return true })
}

// ---------- API ----------

type estadoLinguagem struct {
	defLinguagem
	Instalado bool   `json:"instalado"`
	Caminho   string `json:"caminho"`
	Origem    string `json:"origem"`
	Versao    string `json:"versao"`
	Comando   string `json:"comando"`
	Ligada    bool   `json:"ligada"`
	Manual    string `json:"caminhoManual"`
}

func apiLinguagens(w http.ResponseWriter, r *http.Request) {
	lingMu.Lock()
	c := lerConfigLinguagens()
	lingMu.Unlock()
	var lista []estadoLinguagem
	todas := append([]defLinguagem{}, catalogoLinguagens...)
	for _, x := range c.Extras {
		d, _ := defPorID(x.ID, c)
		todas = append(todas, d)
	}
	for _, d := range todas {
		e := estadoLinguagem{defLinguagem: d, Ligada: !c.Desligada[d.ID], Manual: c.Caminhos[d.ID]}
		e.Comando = d.Comando
		if x := c.Comandos[d.ID]; x != "" && !d.Extra {
			e.Comando = x
		}
		if d.Extra {
			e.Instalado = true
			e.Origem = "comando"
		} else {
			e.Caminho, e.Origem = acharPrograma(d, c)
			e.Instalado = e.Caminho != ""
			e.Versao = versaoPrograma(e.Caminho, d.VerArg)
		}
		lista = append(lista, e)
	}
	lingBaixa.mu.Lock()
	baixa := map[string]any{"id": lingBaixa.id, "feito": lingBaixa.feito, "total": lingBaixa.total, "erro": lingBaixa.erro, "etapa": lingBaixa.etapa}
	lingBaixa.mu.Unlock()
	escreverJSON(w, map[string]any{"linguagens": lista, "baixando": baixa, "windows": runtime.GOOS == "windows"})
}

func apiLinguagensInstalar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		ID string `json:"id"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	if _, ok := defPorID(p.ID, configLinguagens{}); !ok {
		erroJSON(w, 400, "linguagem desconhecida")
		return
	}
	if runtime.GOOS != "windows" && os.Getenv("PYFORGE_LING_"+strings.ToUpper(p.ID)) == "" {
		erroJSON(w, 400, "o download automático é só para Windows; instale pelo gerenciador de pacotes do sistema")
		return
	}
	lingBaixa.mu.Lock()
	if lingBaixa.id != "" {
		lingBaixa.mu.Unlock()
		erroJSON(w, 409, "já estou baixando outra linguagem")
		return
	}
	lingBaixa.id, lingBaixa.feito, lingBaixa.total, lingBaixa.erro, lingBaixa.etapa = p.ID, 0, -1, "", "baixando"
	lingBaixa.mu.Unlock()
	go instalarLinguagem(p.ID)
	escreverJSON(w, map[string]any{"ok": true})
}

func apiLinguagensConfigurar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		ID      string  `json:"id"`
		Caminho *string `json:"caminho"`
		Comando *string `json:"comando"`
		Ligada  *bool   `json:"ligada"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	lingMu.Lock()
	defer lingMu.Unlock()
	c := lerConfigLinguagens()
	d, ok := defPorID(p.ID, c)
	if !ok {
		erroJSON(w, 400, "linguagem desconhecida")
		return
	}
	if p.Caminho != nil {
		v := strings.Trim(strings.TrimSpace(*p.Caminho), `"`)
		if v == "" {
			delete(c.Caminhos, d.ID)
		} else if st, err := os.Stat(v); err != nil || st.IsDir() {
			erroJSON(w, 400, "não achei esse programa: "+v)
			return
		} else {
			c.Caminhos[d.ID] = v
		}
		versaoCache.Delete(v)
	}
	if p.Comando != nil {
		v := strings.TrimSpace(*p.Comando)
		if d.Extra {
			for i := range c.Extras {
				if c.Extras[i].ID == d.ID && v != "" {
					c.Extras[i].Comando = v
				}
			}
		} else if v == "" || v == d.Comando {
			delete(c.Comandos, d.ID)
		} else {
			c.Comandos[d.ID] = v
		}
	}
	if p.Ligada != nil {
		if *p.Ligada {
			delete(c.Desligada, d.ID)
		} else {
			c.Desligada[d.ID] = true
		}
	}
	if err := salvarConfigLinguagens(c); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiLinguagensRemover(w http.ResponseWriter, r *http.Request) {
	var p struct {
		ID string `json:"id"`
	}
	if lerJSON(r, &p) != nil || p.ID == "" || strings.ContainsAny(p.ID, `/\.`) {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	lingMu.Lock()
	defer lingMu.Unlock()
	c := lerConfigLinguagens()
	for i, x := range c.Extras {
		if x.ID == p.ID {
			c.Extras = append(c.Extras[:i], c.Extras[i+1:]...)
			delete(c.Desligada, p.ID)
			salvarConfigLinguagens(c)
			escreverJSON(w, map[string]any{"ok": true})
			return
		}
	}
	os.RemoveAll(filepath.Join(pastaLinguagens(), p.ID))
	versaoCache.Range(func(k, _ any) bool { versaoCache.Delete(k); return true })
	escreverJSON(w, map[string]any{"ok": true})
}

var reIDExtra = regexp.MustCompile(`[^a-z0-9]+`)

func apiLinguagensExtra(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Nome    string `json:"nome"`
		Exts    string `json:"extensoes"`
		Comando string `json:"comando"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	p.Nome = strings.TrimSpace(p.Nome)
	var exts []string
	for _, e := range strings.FieldsFunc(p.Exts, func(r rune) bool { return r == ',' || r == ' ' || r == ';' }) {
		e = strings.ToLower(strings.TrimSpace(e))
		if !strings.HasPrefix(e, ".") {
			e = "." + e
		}
		if e == ".py" || e == ".pyw" {
			erroJSON(w, 400, "arquivos .py já são do Python")
			return
		}
		if len(e) > 1 {
			exts = append(exts, e)
		}
	}
	if p.Nome == "" || len(exts) == 0 || strings.TrimSpace(p.Comando) == "" {
		erroJSON(w, 400, "preencha nome, extensão e comando")
		return
	}
	id := "x-" + strings.Trim(reIDExtra.ReplaceAllString(strings.ToLower(p.Nome), "-"), "-")
	lingMu.Lock()
	defer lingMu.Unlock()
	c := lerConfigLinguagens()
	for _, x := range c.Extras {
		if x.ID == id {
			erroJSON(w, 400, "já existe uma linguagem com esse nome")
			return
		}
	}
	c.Extras = append(c.Extras, extraLinguagem{ID: id, Nome: p.Nome, Exts: exts, Comando: strings.TrimSpace(p.Comando)})
	if err := salvarConfigLinguagens(c); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	escreverJSON(w, map[string]any{"ok": true, "id": id})
}

// comandoLinguagem é usado pelo job "linguagem" (botão Executar em arquivos que não são .py).
func comandoLinguagem(arquivo string) (*exec.Cmd, string, error) {
	lingMu.Lock()
	c := lerConfigLinguagens()
	lingMu.Unlock()
	d, ok := defPorExtensao(filepath.Ext(arquivo), c)
	if !ok {
		return nil, "", fmt.Errorf("nenhuma linguagem cadastrada para arquivos %s. Adicione uma em Configurações › Linguagens", filepath.Ext(arquivo))
	}
	if c.Desligada[d.ID] {
		return nil, "", fmt.Errorf("o plugin %s está desligado em Configurações › Linguagens", d.Nome)
	}
	return montarComando(d, c, arquivo)
}
