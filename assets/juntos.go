package main

// Juntos: um chat entre quem programa junto na MESMA rede Wi-Fi.
// Um PyForge cria a sala (vira o "anfitrião") e abre um servidorzinho na rede (porta 8800 em
// diante). Os outros digitam o código de 6 números: o PyForge procura a sala na rede (UDP 8788)
// e entra. A página de cada um só fala com o PyForge do próprio PC (localhost); é ele que
// conversa com o anfitrião. O servidor da rede só sabe fazer chat: não dá acesso a arquivos.

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	portaDescoberta = 8788
	maxMensagens    = 300
	maxTextoChat    = 20000
	maxImagemChat   = 8 << 20 // dataURL em base64
	tempoForaMembro = 70 * time.Second
	esperaLongPoll  = 25 * time.Second
	prefixoPergunta = "PYFORGE-SALA?"
	prefixoResposta = "PYFORGE-SALA!"
)

var coresJuntos = []string{"#5B8CFF", "#F2994A", "#27AE60", "#EB5757", "#BB6BD9", "#2D9CDB", "#F2C94C", "#56CCF2"}

type msgJuntos struct {
	ID      int    `json:"id"`
	Autor   string `json:"autor"`
	Cor     string `json:"cor"`
	Tipo    string `json:"tipo"` // texto | codigo | imagem | sistema
	Texto   string `json:"texto,omitempty"`
	Ling    string `json:"ling,omitempty"`
	Arquivo string `json:"arquivo,omitempty"`
	Imagem  string `json:"imagem,omitempty"`
	Hora    int64  `json:"hora"`
}

type membroJuntos struct {
	Nome      string `json:"nome"`
	Cor       string `json:"cor"`
	Anfitriao bool   `json:"anfitriao"`
	token     string
	visto     time.Time
}

type salaJuntos struct {
	codigo  string
	nome    string
	porta   int
	srv     *http.Server
	udp     *net.UDPConn
	membros map[string]*membroJuntos
	msgs    []msgJuntos
	proxID  int
	mudou   chan struct{}
	fechada bool
	falhas  map[string][]time.Time // tentativas erradas por IP
	tokenEu string                 // o anfitrião (a página deste PC)
}

// convidado: quando este PyForge entrou na sala de outro
type conviteJuntos struct {
	base   string
	token  string
	codigo string
	nome   string
	sala   string
	cor    string
	caiu   string
}

var juntos struct {
	mu   sync.Mutex
	sala *salaJuntos    // somos o anfitrião
	conv *conviteJuntos // entramos na sala de alguém
}

var clienteJuntos = &http.Client{Timeout: 40 * time.Second}

func tokenAleatorio() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func codigoSala() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return strconv.Itoa(int(n.Int64()) + 100000)
}

func limparNome(n string) string {
	n = strings.TrimSpace(strings.Join(strings.Fields(n), " "))
	r := []rune(n)
	if len(r) > 24 {
		r = r[:24]
	}
	if len(r) == 0 {
		return "Alguém"
	}
	return string(r)
}

// ---------------------------------------------------------------- sala (anfitrião)

func (s *salaJuntos) avisar() {
	close(s.mudou)
	s.mudou = make(chan struct{})
}

// adicionar precisa ser chamado com juntos.mu travado.
func (s *salaJuntos) adicionar(m msgJuntos) {
	s.proxID++
	m.ID = s.proxID
	m.Hora = time.Now().UnixMilli()
	s.msgs = append(s.msgs, m)
	if len(s.msgs) > maxMensagens {
		s.msgs = s.msgs[len(s.msgs)-maxMensagens:]
	}
	s.avisar()
}

func (s *salaJuntos) listaMembros() []membroJuntos {
	var r []membroJuntos
	for _, m := range s.membros {
		r = append(r, *m)
	}
	// anfitrião primeiro, depois por nome
	for i := 0; i < len(r); i++ {
		for j := i + 1; j < len(r); j++ {
			if (r[j].Anfitriao && !r[i].Anfitriao) || (r[j].Anfitriao == r[i].Anfitriao && strings.ToLower(r[j].Nome) < strings.ToLower(r[i].Nome)) {
				r[i], r[j] = r[j], r[i]
			}
		}
	}
	return r
}

func (s *salaJuntos) novoMembro(nome string, anfitriao bool) *membroJuntos {
	usadas := map[string]bool{}
	nomes := map[string]bool{}
	for _, m := range s.membros {
		usadas[m.Cor] = true
		nomes[strings.ToLower(m.Nome)] = true
	}
	cor := coresJuntos[len(s.membros)%len(coresJuntos)]
	for _, c := range coresJuntos {
		if !usadas[c] {
			cor = c
			break
		}
	}
	base := nome
	for i := 2; nomes[strings.ToLower(nome)]; i++ {
		nome = fmt.Sprintf("%s %d", base, i)
	}
	m := &membroJuntos{Nome: nome, Cor: cor, Anfitriao: anfitriao, token: tokenAleatorio(), visto: time.Now()}
	s.membros[m.token] = m
	return m
}

// eventos devolve o que mudou desde "desde" (com juntos.mu travado).
func (s *salaJuntos) eventos(desde int) map[string]any {
	var novas []msgJuntos
	for _, m := range s.msgs {
		if m.ID > desde {
			novas = append(novas, m)
		}
	}
	return map[string]any{"mensagens": novas, "membros": s.listaMembros(), "ultimo": s.proxID, "fechada": s.fechada, "sala": s.nome, "codigo": s.codigo}
}

// esperar segura a resposta até chegar algo novo (long polling).
func (s *salaJuntos) esperar(token string, desde int, r *http.Request) (map[string]any, error) {
	limite := time.After(esperaLongPoll)
	for {
		juntos.mu.Lock()
		if juntos.sala != s {
			juntos.mu.Unlock()
			return map[string]any{"fechada": true}, nil
		}
		m := s.membros[token]
		if m == nil {
			juntos.mu.Unlock()
			return nil, errors.New("você não está nesta sala")
		}
		m.visto = time.Now()
		if s.proxID > desde || s.fechada {
			ev := s.eventos(desde)
			juntos.mu.Unlock()
			return ev, nil
		}
		canal := s.mudou
		juntos.mu.Unlock()
		select {
		case <-canal:
		case <-limite:
			juntos.mu.Lock()
			ev := s.eventos(desde)
			juntos.mu.Unlock()
			return ev, nil
		case <-r.Context().Done():
			return nil, r.Context().Err()
		}
	}
}

// receber valida e guarda uma mensagem de um membro.
func (s *salaJuntos) receber(token string, m msgJuntos) error {
	juntos.mu.Lock()
	defer juntos.mu.Unlock()
	mb := s.membros[token]
	if mb == nil || s.fechada {
		return errors.New("você não está nesta sala")
	}
	mb.visto = time.Now()
	m.Autor, m.Cor = mb.Nome, mb.Cor
	switch m.Tipo {
	case "texto", "codigo":
		m.Texto = strings.TrimRight(m.Texto, " \n\r\t")
		if strings.TrimSpace(m.Texto) == "" {
			return errors.New("mensagem vazia")
		}
		if len(m.Texto) > maxTextoChat {
			return errors.New("mensagem grande demais (máximo 20 mil letras)")
		}
		m.Imagem = ""
		if len(m.Ling) > 20 {
			m.Ling = ""
		}
		if len(m.Arquivo) > 120 {
			m.Arquivo = m.Arquivo[:120]
		}
	case "imagem":
		ok := false
		for _, t := range []string{"png", "jpeg", "gif", "webp"} {
			if strings.HasPrefix(m.Imagem, "data:image/"+t+";base64,") {
				ok = true
			}
		}
		if !ok {
			return errors.New("só dá para mandar imagens PNG, JPG, GIF ou WEBP")
		}
		if len(m.Imagem) > maxImagemChat {
			return errors.New("imagem grande demais (máximo 6 MB)")
		}
		if len(m.Texto) > 500 {
			m.Texto = m.Texto[:500]
		}
		m.Ling = ""
	default:
		return errors.New("tipo de mensagem desconhecido")
	}
	s.adicionar(m)
	return nil
}

func (s *salaJuntos) sair(token string) {
	juntos.mu.Lock()
	defer juntos.mu.Unlock()
	if m := s.membros[token]; m != nil && !m.Anfitriao {
		delete(s.membros, token)
		s.adicionar(msgJuntos{Tipo: "sistema", Texto: m.Nome + pten(" saiu da sala", " left the room")})
	}
}

// limpeza tira quem fechou o PyForge sem sair.
func (s *salaJuntos) limpeza() {
	for {
		time.Sleep(10 * time.Second)
		juntos.mu.Lock()
		if juntos.sala != s {
			juntos.mu.Unlock()
			return
		}
		for t, m := range s.membros {
			if !m.Anfitriao && time.Since(m.visto) > tempoForaMembro {
				delete(s.membros, t)
				s.adicionar(msgJuntos{Tipo: "sistema", Texto: m.Nome + pten(" saiu (perdeu a conexão)", " left (lost connection)")})
			}
		}
		juntos.mu.Unlock()
	}
}

// muitasFalhas evita que alguém na rede fique chutando códigos.
func (s *salaJuntos) muitasFalhas(ip string, errou bool) bool {
	juntos.mu.Lock()
	defer juntos.mu.Unlock()
	agora := time.Now()
	total := 0
	for k, lista := range s.falhas {
		var ficam []time.Time
		for _, t := range lista {
			if agora.Sub(t) < 5*time.Minute {
				ficam = append(ficam, t)
			}
		}
		s.falhas[k] = ficam
		total += len(ficam)
	}
	if errou {
		s.falhas[ip] = append(s.falhas[ip], agora)
	}
	return len(s.falhas[ip]) >= 10 || total >= 60
}

// ---------------------------------------------------------------- servidor da rede

func ipDe(r *http.Request) string {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

func (s *salaJuntos) rotas() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("/sala/entrar", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Codigo string `json:"codigo"`
			Nome   string `json:"nome"`
		}
		if r.Method != http.MethodPost || lerJSON(r, &p) != nil {
			erroJSON(w, 400, "pedido inválido")
			return
		}
		ip := ipDe(r)
		if s.muitasFalhas(ip, false) {
			erroJSON(w, 429, "muitas tentativas erradas; espere alguns minutos")
			return
		}
		juntos.mu.Lock()
		if juntos.sala != s || s.fechada {
			juntos.mu.Unlock()
			erroJSON(w, 404, "a sala foi fechada")
			return
		}
		if strings.TrimSpace(p.Codigo) != s.codigo {
			juntos.mu.Unlock()
			s.muitasFalhas(ip, true)
			erroJSON(w, 403, "código errado")
			return
		}
		if len(s.membros) >= 12 {
			juntos.mu.Unlock()
			erroJSON(w, 409, "a sala está cheia (12 pessoas)")
			return
		}
		mb := s.novoMembro(limparNome(p.Nome), false)
		s.adicionar(msgJuntos{Tipo: "sistema", Texto: mb.Nome + pten(" entrou na sala", " joined the room")})
		resp := map[string]any{"token": mb.token, "nome": mb.Nome, "cor": mb.Cor, "sala": s.nome}
		juntos.mu.Unlock()
		escreverJSON(w, resp)
	})
	m.HandleFunc("/sala/eventos", func(w http.ResponseWriter, r *http.Request) {
		desde, _ := strconv.Atoi(r.URL.Query().Get("desde"))
		ev, err := s.esperar(r.URL.Query().Get("t"), desde, r)
		if err != nil {
			erroJSON(w, 403, err.Error())
			return
		}
		escreverJSON(w, ev)
	})
	m.HandleFunc("/sala/enviar", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			T string `json:"t"`
			msgJuntos
		}
		if r.Method != http.MethodPost || json.NewDecoder(io.LimitReader(r.Body, 10<<20)).Decode(&p) != nil {
			erroJSON(w, 400, "pedido inválido")
			return
		}
		if err := s.receber(p.T, p.msgJuntos); err != nil {
			erroJSON(w, 400, err.Error())
			return
		}
		escreverJSON(w, map[string]any{"ok": true})
	})
	m.HandleFunc("/sala/sair", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			T string `json:"t"`
		}
		lerJSON(r, &p)
		s.sair(p.T)
		escreverJSON(w, map[string]any{"ok": true})
	})
	return m
}

func (s *salaJuntos) abrirRede() error {
	var ln net.Listener
	var err error
	for p := 8800; p < 8820; p++ {
		ln, err = net.Listen("tcp4", fmt.Sprintf("0.0.0.0:%d", p))
		if err == nil {
			s.porta = p
			break
		}
	}
	if ln == nil {
		return fmt.Errorf("não consegui abrir a sala na rede: %v", err)
	}
	s.srv = &http.Server{Handler: s.rotas(), ReadHeaderTimeout: 10 * time.Second}
	go s.srv.Serve(ln)
	// responde quem procura a sala pelo código
	if c, err := net.ListenUDP("udp4", &net.UDPAddr{Port: portaDescoberta}); err == nil {
		s.udp = c
		go func() {
			buf := make([]byte, 256)
			for {
				n, de, err := c.ReadFromUDP(buf)
				if err != nil {
					return
				}
				msg := string(buf[:n])
				if strings.HasPrefix(msg, prefixoPergunta) && strings.TrimPrefix(msg, prefixoPergunta) == s.codigo {
					c.WriteToUDP([]byte(fmt.Sprintf("%s%s!%d", prefixoResposta, s.codigo, s.porta)), de)
				}
			}
		}()
	}
	return nil
}

func (s *salaJuntos) fechar() {
	s.fechada = true
	s.avisar()
	srv, udp := s.srv, s.udp
	go func() {
		time.Sleep(1500 * time.Millisecond) // dá tempo dos convidados receberem o aviso
		if srv != nil {
			srv.Close()
		}
	}()
	if udp != nil {
		udp.Close()
	}
}

// ---------------------------------------------------------------- procurar a sala na rede

func enderecosBroadcast() []net.IP {
	r := []net.IP{net.IPv4bcast, net.IPv4(127, 0, 0, 1)}
	ifs, _ := net.Interfaces()
	for _, i := range ifs {
		if i.Flags&net.FlagUp == 0 || i.Flags&net.FlagBroadcast == 0 {
			continue
		}
		addrs, _ := i.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok || ipn.IP.To4() == nil {
				continue
			}
			ip := ipn.IP.To4()
			b := make(net.IP, 4)
			for k := 0; k < 4; k++ {
				b[k] = ip[k] | ^ipn.Mask[len(ipn.Mask)-4+k]
			}
			r = append(r, b)
		}
	}
	return r
}

func procurarSala(codigo string) (string, error) {
	c, err := net.ListenUDP("udp4", nil)
	if err != nil {
		return "", err
	}
	defer c.Close()
	pergunta := []byte(prefixoPergunta + codigo)
	for tentativa := 0; tentativa < 3; tentativa++ {
		for _, ip := range enderecosBroadcast() {
			c.WriteToUDP(pergunta, &net.UDPAddr{IP: ip, Port: portaDescoberta})
		}
		c.SetReadDeadline(time.Now().Add(700 * time.Millisecond))
		buf := make([]byte, 256)
		for {
			n, de, err := c.ReadFromUDP(buf)
			if err != nil {
				break
			}
			partes := strings.Split(strings.TrimPrefix(string(buf[:n]), prefixoResposta), "!")
			if strings.HasPrefix(string(buf[:n]), prefixoResposta) && len(partes) == 2 && partes[0] == codigo {
				if p, err := strconv.Atoi(partes[1]); err == nil && p > 0 && p < 65536 {
					return fmt.Sprintf("http://%s:%d", de.IP.String(), p), nil
				}
			}
		}
	}
	return "", errors.New("não achei nenhuma sala com esse código na rede. Confira o código e se os dois PCs estão no mesmo Wi-Fi (ou digite o endereço que aparece na sala)")
}

// ---------------------------------------------------------------- API local (a página)

func estadoJuntos() map[string]any {
	juntos.mu.Lock()
	defer juntos.mu.Unlock()
	if s := juntos.sala; s != nil {
		var ends []string
		for _, ip := range ipsDaRede() {
			ends = append(ends, fmt.Sprintf("%s:%d", ip, s.porta))
		}
		return map[string]any{"modo": "anfitriao", "codigo": s.codigo, "sala": s.nome, "enderecos": ends, "membros": s.listaMembros(), "eu": s.membros[s.tokenEu].Nome}
	}
	if c := juntos.conv; c != nil {
		return map[string]any{"modo": "convidado", "codigo": c.codigo, "sala": c.sala, "eu": c.nome, "cor": c.cor, "caiu": c.caiu}
	}
	return map[string]any{"modo": ""}
}

func apiJuntos(w http.ResponseWriter, r *http.Request) { escreverJSON(w, estadoJuntos()) }

func apiJuntosCriar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Nome string `json:"nome"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	juntos.mu.Lock()
	if juntos.sala != nil || juntos.conv != nil {
		juntos.mu.Unlock()
		erroJSON(w, 409, "você já está numa sala; saia dela primeiro")
		return
	}
	nome := limparNome(p.Nome)
	s := &salaJuntos{codigo: codigoSala(), nome: pten("Sala de "+nome, nome+"'s room"), membros: map[string]*membroJuntos{}, mudou: make(chan struct{}), falhas: map[string][]time.Time{}}
	juntos.mu.Unlock()
	if err := s.abrirRede(); err != nil {
		erroJSON(w, 500, err.Error())
		return
	}
	juntos.mu.Lock()
	eu := s.novoMembro(nome, true)
	s.tokenEu = eu.token
	s.adicionar(msgJuntos{Tipo: "sistema", Texto: pten("Sala criada. Passe o código "+s.codigo+" para quem vai programar com você.", "Room created. Share the code "+s.codigo+" with whoever is coding with you.")})
	juntos.sala = s
	juntos.mu.Unlock()
	go s.limpeza()
	escreverJSON(w, estadoJuntos())
}

func apiJuntosEntrar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Codigo   string `json:"codigo"`
		Nome     string `json:"nome"`
		Endereco string `json:"endereco"`
	}
	if lerJSON(r, &p) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	p.Codigo = strings.ReplaceAll(strings.TrimSpace(p.Codigo), " ", "")
	if len(p.Codigo) != 6 || strings.Trim(p.Codigo, "0123456789") != "" {
		erroJSON(w, 400, "o código tem 6 números")
		return
	}
	juntos.mu.Lock()
	ocupado := juntos.sala != nil || juntos.conv != nil
	juntos.mu.Unlock()
	if ocupado {
		erroJSON(w, 409, "você já está numa sala; saia dela primeiro")
		return
	}
	base := ""
	if e := strings.TrimSpace(p.Endereco); e != "" {
		e = strings.TrimPrefix(strings.TrimPrefix(e, "http://"), "https://")
		e = strings.TrimRight(e, "/")
		if !strings.Contains(e, ":") {
			e += ":8800"
		}
		host, porta, err := net.SplitHostPort(e)
		if err != nil || net.ParseIP(host) == nil {
			erroJSON(w, 400, "endereço inválido; use algo como 192.168.0.10:8800")
			return
		}
		base = "http://" + net.JoinHostPort(host, porta)
	} else {
		var err error
		if base, err = procurarSala(p.Codigo); err != nil {
			erroJSON(w, 404, err.Error())
			return
		}
	}
	corpo, _ := json.Marshal(map[string]string{"codigo": p.Codigo, "nome": limparNome(p.Nome)})
	cli := &http.Client{Timeout: 8 * time.Second}
	resp, err := cli.Post(base+"/sala/entrar", "application/json", strings.NewReader(string(corpo)))
	if err != nil {
		erroJSON(w, 502, "não consegui falar com a sala ("+base+"). O Firewall do Windows do outro PC pode estar bloqueando: peça para ele clicar em Permitir quando o Windows perguntar.")
		return
	}
	defer resp.Body.Close()
	var rr struct {
		Token string `json:"token"`
		Nome  string `json:"nome"`
		Cor   string `json:"cor"`
		Sala  string `json:"sala"`
		Erro  string `json:"erro"`
	}
	json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&rr)
	if resp.StatusCode != 200 || rr.Token == "" {
		if rr.Erro == "" {
			rr.Erro = "a sala não aceitou a entrada"
		}
		erroJSON(w, resp.StatusCode, rr.Erro)
		return
	}
	juntos.mu.Lock()
	juntos.conv = &conviteJuntos{base: base, token: rr.Token, codigo: p.Codigo, nome: rr.Nome, sala: rr.Sala, cor: rr.Cor}
	juntos.mu.Unlock()
	escreverJSON(w, estadoJuntos())
}

func apiJuntosEventos(w http.ResponseWriter, r *http.Request) {
	desde, _ := strconv.Atoi(r.URL.Query().Get("desde"))
	juntos.mu.Lock()
	s, c := juntos.sala, juntos.conv
	juntos.mu.Unlock()
	switch {
	case s != nil:
		ev, err := s.esperar(s.tokenEu, desde, r)
		if err != nil {
			erroJSON(w, 400, err.Error())
			return
		}
		escreverJSON(w, ev)
	case c != nil:
		req, _ := http.NewRequestWithContext(r.Context(), "GET", fmt.Sprintf("%s/sala/eventos?t=%s&desde=%d", c.base, c.token, desde), nil)
		resp, err := clienteJuntos.Do(req)
		if err != nil {
			if r.Context().Err() != nil {
				return
			}
			juntos.mu.Lock()
			c.caiu = "Sem conexão com a sala. Tentando de novo…"
			juntos.mu.Unlock()
			time.Sleep(2 * time.Second)
			escreverJSON(w, map[string]any{"caiu": c.caiu})
			return
		}
		defer resp.Body.Close()
		juntos.mu.Lock()
		c.caiu = ""
		juntos.mu.Unlock()
		if resp.StatusCode == 403 || resp.StatusCode == 404 {
			juntos.mu.Lock()
			if juntos.conv == c {
				juntos.conv = nil
			}
			juntos.mu.Unlock()
			escreverJSON(w, map[string]any{"fechada": true})
			return
		}
		var ev map[string]any
		if json.NewDecoder(io.LimitReader(resp.Body, 64<<20)).Decode(&ev) != nil {
			escreverJSON(w, map[string]any{})
			return
		}
		if f, _ := ev["fechada"].(bool); f {
			juntos.mu.Lock()
			if juntos.conv == c {
				juntos.conv = nil
			}
			juntos.mu.Unlock()
		}
		escreverJSON(w, ev)
	default:
		escreverJSON(w, map[string]any{"fechada": true})
	}
}

func apiJuntosEnviar(w http.ResponseWriter, r *http.Request) {
	var m msgJuntos
	if json.NewDecoder(io.LimitReader(r.Body, 10<<20)).Decode(&m) != nil {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	juntos.mu.Lock()
	s, c := juntos.sala, juntos.conv
	juntos.mu.Unlock()
	switch {
	case s != nil:
		if err := s.receber(s.tokenEu, m); err != nil {
			erroJSON(w, 400, err.Error())
			return
		}
	case c != nil:
		corpo, _ := json.Marshal(struct {
			T string `json:"t"`
			msgJuntos
		}{c.token, m})
		resp, err := clienteJuntos.Post(c.base+"/sala/enviar", "application/json", strings.NewReader(string(corpo)))
		if err != nil {
			erroJSON(w, 502, "não consegui mandar: sem conexão com a sala")
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			var e struct {
				Erro string `json:"erro"`
			}
			json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&e)
			erroJSON(w, resp.StatusCode, e.Erro)
			return
		}
	default:
		erroJSON(w, 400, "você não está em nenhuma sala")
		return
	}
	escreverJSON(w, map[string]any{"ok": true})
}

func apiJuntosSair(w http.ResponseWriter, r *http.Request) {
	juntos.mu.Lock()
	s, c := juntos.sala, juntos.conv
	juntos.sala, juntos.conv = nil, nil
	if s != nil {
		s.adicionar(msgJuntos{Tipo: "sistema", Texto: pten("A sala foi fechada.", "The room was closed.")})
		s.fechar()
	}
	juntos.mu.Unlock()
	if c != nil {
		corpo, _ := json.Marshal(map[string]string{"t": c.token})
		cli := &http.Client{Timeout: 3 * time.Second}
		if resp, err := cli.Post(c.base+"/sala/sair", "application/json", strings.NewReader(string(corpo))); err == nil {
			resp.Body.Close()
		}
	}
	escreverJSON(w, map[string]any{"ok": true})
}

// pten escolhe o texto pelo idioma das configurações.
func pten(pt, en string) string {
	if cfgString("idioma") == "en" {
		return en
	}
	return pt
}
