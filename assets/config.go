package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

var (
	cfgMu sync.Mutex
	cfg   map[string]any
)

func caminhoConfig() string { return filepath.Join(dataDir, "config.json") }

func workspacePadrao() string {
	home, _ := os.UserHomeDir()
	if runtime.GOOS == "windows" {
		return filepath.Join(home, "Documents", "PyForge")
	}
	return filepath.Join(home, "PyForge")
}

func carregarConfig() {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	cfg = map[string]any{}
	if b, err := os.ReadFile(caminhoConfig()); err == nil {
		json.Unmarshal(b, &cfg)
	}
	if s, _ := cfg["workspace"].(string); s == "" {
		cfg["workspace"] = workspacePadrao()
	}
	os.MkdirAll(cfg["workspace"].(string), 0o755)
	// Até a 0.2 o padrão era o Claude. Quem já salvou uma chave continua com ele;
	// quem nunca configurou passa a usar a PyForge IA (grátis, no PC).
	ia, _ := cfg["ia"].(map[string]any)
	if ia == nil {
		ia = map[string]any{}
		cfg["ia"] = ia
	}
	if p, _ := ia["provedor"].(string); p == "" {
		if k, _ := ia["chaveEnc"].(string); k != "" {
			ia["provedor"] = "anthropic"
		} else {
			ia["provedor"] = "pyforge"
		}
		salvarConfigLocked()
	}
}

func salvarConfigLocked() {
	b, _ := json.MarshalIndent(cfg, "", "  ")
	tmp := caminhoConfig() + ".tmp"
	if os.WriteFile(tmp, b, 0o600) == nil {
		os.Rename(tmp, caminhoConfig())
	}
}

func cfgBool(caminho ...string) bool {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	var atual any = cfg
	for _, k := range caminho {
		m, ok := atual.(map[string]any)
		if !ok {
			return false
		}
		atual = m[k]
	}
	b, _ := atual.(bool)
	return b
}

func cfgString(caminho ...string) string {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	var atual any = cfg
	for _, c := range caminho {
		m, ok := atual.(map[string]any)
		if !ok {
			return ""
		}
		atual = m[c]
	}
	s, _ := atual.(string)
	return s
}

func workspace() string { return cfgString("workspace") }

func recentes() []string {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	out := []string{}
	if l, ok := cfg["recentes"].([]any); ok {
		for _, v := range l {
			if s, ok := v.(string); ok {
				out = append(out, s)
			}
		}
	}
	return out
}

func adicionarRecente(p string) {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	nova := []any{p}
	if l, ok := cfg["recentes"].([]any); ok {
		for _, v := range l {
			if s, _ := v.(string); s != p && len(nova) < 30 {
				nova = append(nova, s)
			}
		}
	}
	cfg["recentes"] = nova
	salvarConfigLocked()
}

func removerRecente(p string) {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	nova := []any{}
	if l, ok := cfg["recentes"].([]any); ok {
		for _, v := range l {
			if s, _ := v.(string); s != p {
				nova = append(nova, s)
			}
		}
	}
	cfg["recentes"] = nova
	salvarConfigLocked()
}

// mesclar copia "novo" para dentro de "base" de forma recursiva.
func mesclar(base, novo map[string]any) {
	for k, v := range novo {
		if vm, ok := v.(map[string]any); ok {
			if bm, ok := base[k].(map[string]any); ok {
				mesclar(bm, vm)
				continue
			}
		}
		base[k] = v
	}
}

func copiaProfunda(m map[string]any) map[string]any {
	b, _ := json.Marshal(m)
	out := map[string]any{}
	json.Unmarshal(b, &out)
	return out
}

func chaveIA() string {
	enc := cfgString("ia", "chaveEnc")
	if enc == "" {
		return ""
	}
	return revelarSegredo(enc)
}

func apiConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var novo map[string]any
		if err := lerJSON(r, &novo); err != nil {
			erroJSON(w, 400, "JSON inválido")
			return
		}
		cfgMu.Lock()
		if ia, ok := novo["ia"].(map[string]any); ok {
			if chave, ok := ia["chave"].(string); ok {
				if chave == "" {
					ia["chaveEnc"] = ""
				} else {
					ia["chaveEnc"] = protegerSegredo(chave)
				}
				delete(ia, "chave")
			}
		}
		delete(novo, "recentes")
		mesclar(cfg, novo)
		if ws, _ := cfg["workspace"].(string); ws != "" {
			os.MkdirAll(ws, 0o755)
		}
		salvarConfigLocked()
		cfgMu.Unlock()
	}
	cfgMu.Lock()
	c := copiaProfunda(cfg)
	cfgMu.Unlock()
	if ia, ok := c["ia"].(map[string]any); ok {
		ia["temChave"] = ia["chaveEnc"] != nil && ia["chaveEnc"] != ""
		delete(ia, "chaveEnc")
	}
	escreverJSON(w, c)
}

// Estatísticas reais de uso (execuções por dia, explicações da IA).
func apiStats(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req struct {
			Tipo string `json:"tipo"`
		}
		lerJSON(r, &req)
		cfgMu.Lock()
		st, _ := cfg["stats"].(map[string]any)
		if st == nil {
			st = map[string]any{}
			cfg["stats"] = st
		}
		dia := time.Now().Format("2006-01-02")
		porDia, _ := st[req.Tipo].(map[string]any)
		if porDia == nil {
			porDia = map[string]any{}
			st[req.Tipo] = porDia
		}
		n, _ := porDia[dia].(float64)
		porDia[dia] = n + 1
		salvarConfigLocked()
		cfgMu.Unlock()
	}
	cfgMu.Lock()
	st := map[string]any{}
	if s, ok := cfg["stats"].(map[string]any); ok {
		st = copiaProfunda(s)
	}
	cfgMu.Unlock()
	escreverJSON(w, st)
}

// salvarParcialConfig mescla valores na configuração e grava no disco.
func salvarParcialConfig(parcial map[string]any) {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	mesclar(cfg, parcial)
	salvarConfigLocked()
}
