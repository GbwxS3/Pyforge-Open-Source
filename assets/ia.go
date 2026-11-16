package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type mensagemIA struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type pedidoIA struct {
	Mensagens []mensagemIA `json:"mensagens"`
	Contexto  string       `json:"contexto"`
}

// avisoIdioma pede para a IA responder em inglês quando o PyForge está em inglês.
func avisoIdioma(p string) string {
	if cfgString("idioma") == "en" {
		return p + "\n\n# LANGUAGE\nThe user's PyForge is in ENGLISH. Always answer in English, and write code comments, names and texts in English (the rules above were written in Portuguese, but follow them in English).\n"
	}
	return p
}

func promptSistema() string {
	b, _ := assetsFS.ReadFile("assets/prompts/assistente.md")
	return avisoIdioma(string(b))
}

// Modelos locais (Ollama) costumam ter pouca memória de contexto: usam a versão compacta.
// promptLocal é o prompt para modelos pequenos que rodam no PC (PyForge IA e Ollama).
func promptLocal() string {
	b, _ := assetsFS.ReadFile("assets/prompts/assistente_local.md")
	if len(b) == 0 {
		return promptCompacto()
	}
	return avisoIdioma(string(b))
}

func promptCompacto() string {
	b, _ := assetsFS.ReadFile("assets/prompts/assistente_curto.md")
	return avisoIdioma(string(b))
}

func apiIAChat(w http.ResponseWriter, r *http.Request) {
	var p pedidoIA
	if err := lerJSON(r, &p); err != nil || len(p.Mensagens) == 0 {
		erroJSON(w, 400, "pedido inválido")
		return
	}
	fl, ok := w.(http.Flusher)
	if !ok {
		erroJSON(w, 500, "streaming indisponível")
		return
	}
	provedor := cfgString("ia", "provedor")
	if provedor == "" {
		provedor = "pyforge"
	}
	modelo := cfgString("ia", "modelo")
	base := strings.TrimRight(cfgString("ia", "baseURL"), "/")
	chave := chaveIA()
	extra := cfgString("ia", "instrucoesExtras")

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	enviar := func(v map[string]any) {
		b, _ := json.Marshal(v)
		fmt.Fprintf(w, "data: %s\n\n", b)
		fl.Flush()
	}
	contexto := p.Contexto
	if extra != "" {
		contexto += "\n\n# Instruções extras do usuário\n" + extra
	}
	// Mantém só as últimas mensagens para não estourar o limite do modelo.
	msgs := p.Mensagens
	if len(msgs) > 30 {
		msgs = msgs[len(msgs)-30:]
	}
	for len(msgs) > 0 && msgs[0].Role != "user" {
		msgs = msgs[1:]
	}
	if len(msgs) == 0 {
		enviar(map[string]any{"erro": "conversa vazia"})
		return
	}

	var req *http.Request
	var err error
	switch provedor {
	case "anthropic":
		if chave == "" {
			enviar(map[string]any{"erro": "Coloque sua chave da Anthropic em Configurações › IA."})
			return
		}
		if modelo == "" {
			modelo = "claude-sonnet-5-5"
		}
		corpo := map[string]any{
			"model":      modelo,
			"max_tokens": 8000,
			"stream":     true,
			"system": []map[string]any{
				{"type": "text", "text": promptSistema(), "cache_control": map[string]string{"type": "ephemeral"}},
				{"type": "text", "text": contexto},
			},
			"messages": msgs,
		}
		b, _ := json.Marshal(corpo)
		if base == "" {
			base = "https://api.anthropic.com"
		}
		req, err = http.NewRequestWithContext(r.Context(), "POST", base+"/v1/messages", bytes.NewReader(b))
		if err == nil {
			req.Header.Set("x-api-key", chave)
			req.Header.Set("anthropic-version", "2023-06-01")
			req.Header.Set("content-type", "application/json")
		}
	default: // "pyforge", "openai" e "ollama" usam o formato compatível com OpenAI
		if provedor == "pyforge" {
			b, err := garantirMotorIA(r.Context(), func(s string) { enviar(map[string]any{"status": s}) })
			if errors.Is(err, errIANaoInstalada) {
				enviar(map[string]any{"erro": "A PyForge IA ainda não foi baixada.", "codigo": "local_nao_instalada"})
				return
			}
			if err != nil {
				enviar(map[string]any{"erro": err.Error()})
				return
			}
			enviar(map[string]any{"status": ""})
			base, modelo, chave = b, "pyforge", ""
		}
		if base == "" {
			if provedor == "ollama" {
				base = "http://localhost:11434/v1"
			} else {
				base = "https://api.openai.com/v1"
			}
		}
		if modelo == "" {
			if provedor == "ollama" {
				modelo = "qwen2.5-coder:7b"
			} else {
				modelo = "gpt-4.1"
			}
		}
		if provedor == "openai" && chave == "" {
			enviar(map[string]any{"erro": "Coloque sua chave em Configurações › IA."})
			return
		}
		prompt := promptSistema()
		if provedor == "ollama" || provedor == "pyforge" {
			prompt = promptLocal()
			limite := 12000
			if provedor == "pyforge" {
				limite = 4000 // cada caractere a mais é tempo de leitura no processador
				if len(msgs) > 8 {
					msgs = msgs[len(msgs)-8:]
					for len(msgs) > 0 && msgs[0].Role != "user" {
						msgs = msgs[1:]
					}
				}
			}
			if len(contexto) > limite {
				contexto = contexto[:limite] + "\n(contexto cortado)"
			}
		}
		todas := []mensagemIA{{Role: "system", Content: prompt + "\n\n" + contexto}}
		todas = append(todas, msgs...)
		corpoReq := map[string]any{"model": modelo, "stream": true, "messages": todas}
		if provedor == "pyforge" {
			corpoReq["temperature"] = 0.4
			corpoReq["max_tokens"] = 2000
			// Sem "modo pensando": nos modelos que têm (Qwen3.5), ele escreve um raciocínio
			// enorme e invisível antes da resposta, e no processador isso leva minutos.
			corpoReq["chat_template_kwargs"] = map[string]any{"enable_thinking": false}
			corpoReq["cache_prompt"] = true
		}
		b, _ := json.Marshal(corpoReq)
		req, err = http.NewRequestWithContext(r.Context(), "POST", base+"/chat/completions", bytes.NewReader(b))
		if err == nil {
			req.Header.Set("content-type", "application/json")
			if chave != "" {
				req.Header.Set("Authorization", "Bearer "+chave)
			}
		}
	}
	if err != nil {
		enviar(map[string]any{"erro": err.Error()})
		return
	}
	cliente := &http.Client{Timeout: 10 * time.Minute}
	resp, err := cliente.Do(req)
	if err != nil {
		msg := err.Error()
		if provedor == "ollama" {
			msg = "Não achei o Ollama em " + base + ". Ele está aberto? (" + msg + ")"
		}
		enviar(map[string]any{"erro": msg})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		corpo, _ := io.ReadAll(io.LimitReader(resp.Body, 4000))
		msg := string(corpo)
		var e struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if json.Unmarshal(corpo, &e) == nil && e.Error.Message != "" {
			msg = e.Error.Message
		}
		if resp.StatusCode == 401 {
			msg = "Chave inválida ou sem permissão. Confira em Configurações › IA. (" + msg + ")"
		}
		enviar(map[string]any{"erro": fmt.Sprintf("A IA respondeu com erro %d: %s", resp.StatusCode, msg)})
		return
	}
	pensados, ultimoAviso := 0, -1000
	sc := bufio.NewScanner(resp.Body)
	sc.Buffer(make([]byte, 1<<20), 8<<20)
	for sc.Scan() {
		linha := sc.Text()
		if !strings.HasPrefix(linha, "data:") {
			continue
		}
		dado := strings.TrimSpace(strings.TrimPrefix(linha, "data:"))
		if dado == "[DONE]" {
			break
		}
		if provedor == "anthropic" {
			var ev struct {
				Type  string `json:"type"`
				Delta struct {
					Type string `json:"type"`
					Text string `json:"text"`
				} `json:"delta"`
				Error struct {
					Message string `json:"message"`
				} `json:"error"`
			}
			if json.Unmarshal([]byte(dado), &ev) != nil {
				continue
			}
			switch ev.Type {
			case "content_block_delta":
				if ev.Delta.Type == "text_delta" && ev.Delta.Text != "" {
					enviar(map[string]any{"t": ev.Delta.Text})
				}
			case "error":
				enviar(map[string]any{"erro": ev.Error.Message})
				return
			case "message_stop":
				enviar(map[string]any{"fim": true})
				return
			}
		} else {
			var ev struct {
				Choices []struct {
					Delta struct {
						Content    string `json:"content"`
						Raciocinio string `json:"reasoning_content"`
					} `json:"delta"`
				} `json:"choices"`
				Timings *struct {
					Prompt     int     `json:"prompt_n"`
					PromptVel  float64 `json:"prompt_per_second"`
					Gerados    int     `json:"predicted_n"`
					GeradosVel float64 `json:"predicted_per_second"`
				} `json:"timings"`
			}
			if json.Unmarshal([]byte(dado), &ev) != nil {
				continue
			}
			if len(ev.Choices) > 0 {
				if ev.Choices[0].Delta.Content != "" {
					enviar(map[string]any{"t": ev.Choices[0].Delta.Content})
				} else if ev.Choices[0].Delta.Raciocinio != "" {
					pensados += len(ev.Choices[0].Delta.Raciocinio)
					if pensados-ultimoAviso > 200 {
						ultimoAviso = pensados
						enviar(map[string]any{"status": "Pensando…"})
					}
				}
			}
			if ev.Timings != nil && ev.Timings.Gerados > 0 {
				enviar(map[string]any{"velocidade": map[string]any{"leitura": ev.Timings.PromptVel, "escrita": ev.Timings.GeradosVel, "lidos": ev.Timings.Prompt, "escritos": ev.Timings.Gerados}})
			}
		}
	}
	enviar(map[string]any{"fim": true})
}
