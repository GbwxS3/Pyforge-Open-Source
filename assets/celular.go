package main

// Prévia no celular: o Designer manda uma "foto" da tela em HTML e o PyForge abre um
// servidorzinho só de leitura na rede Wi-Fi (porta 8790 em diante). O celular abre o
// endereço (ou lê o QR code) e a página se atualiza sozinha quando a tela muda.
// Ele só mostra a prévia publicada: não dá acesso a arquivos nem ao resto do PyForge.

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

var celular struct {
	mu     sync.Mutex
	codigo string
	html   string
	versao int
	srv    *http.Server
	porta  int
	visto  time.Time
}

const scriptCelular = `<script>(function(){var v=%d;setInterval(function(){fetch(location.pathname+'/v',{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){if(+t!==v)location.reload()}).catch(function(){})},1000)})();</script>`

func ipsDaRede() []string {
	var privados, outros []string
	ifs, _ := net.Interfaces()
	for _, i := range ifs {
		if i.Flags&net.FlagUp == 0 || i.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := i.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok || ipn.IP.To4() == nil || ipn.IP.IsLoopback() || ipn.IP.IsLinkLocalUnicast() {
				continue
			}
			if ipn.IP.IsPrivate() {
				privados = append(privados, ipn.IP.String())
			} else {
				outros = append(outros, ipn.IP.String())
			}
		}
	}
	// 192.168.x costuma ser o Wi-Fi de casa: vem primeiro
	sort.SliceStable(privados, func(a, b int) bool {
		return strings.HasPrefix(privados[a], "192.168.") && !strings.HasPrefix(privados[b], "192.168.")
	})
	return append(privados, outros...)
}

func iniciarServidorCelular() error {
	if celular.srv != nil {
		return nil
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/c/", func(w http.ResponseWriter, r *http.Request) {
		partes := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		celular.mu.Lock()
		cod, html, ver := celular.codigo, celular.html, celular.versao
		celular.visto = time.Now()
		celular.mu.Unlock()
		if len(partes) < 2 || partes[1] != cod || cod == "" {
			http.Error(w, "Prévia não encontrada. Abra de novo pelo PyForge.", 404)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		if len(partes) == 3 && partes[2] == "v" {
			fmt.Fprint(w, ver)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, strings.Replace(html, "</body>", fmt.Sprintf(scriptCelular, ver)+"</body>", 1))
	})
	var ln net.Listener
	var err error
	for p := 8790; p < 8800; p++ {
		if ln, err = net.Listen("tcp", fmt.Sprintf("0.0.0.0:%d", p)); err == nil {
			celular.porta = p
			break
		}
	}
	if ln == nil {
		return fmt.Errorf("não achei uma porta livre para a prévia (%v)", err)
	}
	celular.srv = &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go celular.srv.Serve(ln)
	return nil
}

func apiCelular(w http.ResponseWriter, r *http.Request) {
	celular.mu.Lock()
	defer celular.mu.Unlock()
	if r.Method == http.MethodGet {
		escreverJSON(w, estadoCelular())
		return
	}
	var p struct {
		HTML  string `json:"html"`
		Parar bool   `json:"parar"`
	}
	if err := lerJSON(r, &p); err != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	if p.Parar {
		if celular.srv != nil {
			celular.srv.Close()
			celular.srv = nil
		}
		celular.codigo, celular.html = "", ""
		escreverJSON(w, estadoCelular())
		return
	}
	if len(p.HTML) > 20<<20 {
		erroJSON(w, 400, "a tela ficou grande demais para a prévia (imagens muito pesadas?)")
		return
	}
	if err := iniciarServidorCelular(); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	if celular.codigo == "" {
		b := make([]byte, 5)
		rand.Read(b)
		celular.codigo = hex.EncodeToString(b)
	}
	if p.HTML != celular.html {
		celular.html = p.HTML
		celular.versao++
	}
	escreverJSON(w, estadoCelular())
}

func estadoCelular() map[string]any {
	var urls []string
	if celular.srv != nil && celular.codigo != "" {
		for _, ip := range ipsDaRede() {
			urls = append(urls, fmt.Sprintf("http://%s:%d/c/%s", ip, celular.porta, celular.codigo))
		}
	}
	conectado := !celular.visto.IsZero() && time.Since(celular.visto) < 4*time.Second
	return map[string]any{"ligado": celular.srv != nil, "urls": urls, "conectado": conectado}
}
