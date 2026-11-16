package main

// Mensagens do servidor em inglês (quando Configurações › Idioma = English).
// A interface em si é traduzida em assets/web/js-en (veja ferramentas_dev/traduzir_en.mjs).

import (
	"regexp"
	"strings"
)

// padrão em português → inglês. %s pega qualquer pedaço (inclusive números).
var mensagensEN = [][2]string{
	{"%s não está instalado. Abra Configurações › Linguagens e clique em Instalar (ou escolha onde ele está)", "%s is not installed. Open Settings › Languages and click Install (or choose where it is)"},
	{"JSON inválido", "invalid JSON"},
	{"a IA demorou demais para ligar. Tente um modelo menor em Configurações › IA.", "the AI took too long to start. Try a smaller model in Settings › AI."},
	{"a sala está cheia (12 pessoas)", "the room is full (12 people)"},
	{"a sala foi fechada", "the room was closed"},
	{"a tela ficou grande demais para a prévia (imagens muito pesadas?)", "the screen is too big for the preview (very heavy images?)"},
	{"ainda não há gravação: use Executar com máquina do tempo", "no recording yet: use Run with time machine"},
	{"arquivo de saída inválido", "invalid output file"},
	{"arquivo fora do projeto", "file outside the project"},
	{"arquivo não encontrado", "file not found"},
	{"arquivo não permitido", "file not allowed"},
	{"arquivos .py já são do Python", ".py files already belong to Python"},
	{"assistente Python fechou", "Python helper closed"},
	{"assistente Python parado", "Python helper stopped"},
	{"baixei, mas não achei o programa dentro do arquivo", "downloaded, but could not find the program inside the file"},
	{"caminho inválido", "invalid path"},
	{"código errado", "wrong code"},
	{"código grande demais", "code too big"},
	{"dados inválidos", "invalid data"},
	{"download incompleto (%s de %s bytes); tente de novo para continuar", "incomplete download (%s of %s bytes); try again to resume"},
	{"dê um nome ao projeto", "give the project a name"},
	{"endereço inválido; use algo como 192.168.0.10:8800", "invalid address; use something like 192.168.0.10:8800"},
	{"endereço não permitido", "address not allowed"},
	{"escolha uma pasta de projeto, não a pasta inteira do usuário ou do disco", "choose a project folder, not the whole user folder or drive"},
	{"escreva uma mensagem para o commit", "write a commit message"},
	{"essa linguagem não tem download automático", "this language has no automatic download"},
	{"expressão regular inválida", "invalid regular expression"},
	{"gravação grande demais", "recording too big"},
	{"imagem grande demais (máximo 6 MB)", "image too big (max 6 MB)"},
	{"já estou baixando outra linguagem", "already downloading another language"},
	{"já estou baixando, espere terminar", "already downloading, wait for it to finish"},
	{"já existe um item com esse nome", "an item with that name already exists"},
	{"já existe um projeto com esse nome", "a project with that name already exists"},
	{"já existe uma linguagem com esse nome", "a language with that name already exists"},
	{"linguagem desconhecida", "unknown language"},
	{"mensagem grande demais (máximo 20 mil letras)", "message too big (max 20 thousand characters)"},
	{"mensagem vazia", "empty message"},
	{"modelo desconhecido", "unknown model"},
	{"muitas tentativas erradas; espere alguns minutos", "too many wrong attempts; wait a few minutes"},
	{"nenhuma linguagem cadastrada para arquivos %s. Adicione uma em Configurações › Linguagens", "no language set up for %s files. Add one in Settings › Languages"},
	{"nome de pacote inválido", "invalid package name"},
	{"nome de tela inválido (use letras minúsculas, números e _)", "invalid screen name (use lowercase letters, numbers and _)"},
	{"não achei esse programa: %s", "could not find this program: %s"},
	{"não achei nenhuma sala com esse código na rede. Confira o código e se os dois PCs estão no mesmo Wi-Fi (ou digite o endereço que aparece na sala)", "could not find any room with that code on the network. Check the code and that both PCs are on the same Wi-Fi (or type the address shown in the room)"},
	{"não achei o arquivo %s em %s", "could not find the file %s in %s"},
	{"não achei o arquivo principal: %s", "could not find the main file: %s"},
	{"não apago a pasta inteira do projeto por aqui", "I don't delete the whole project folder from here"},
	{"não consegui abrir a sala na rede: %s", "could not open the room on the network: %s"},
	{"não consegui baixar (%s). Você pode instalar pelo site oficial e clicar em “Escolher programa”", "could not download (%s). You can install it from the official site and set the program in Configure"},
	{"não consegui falar com a sala (%s). O Firewall do Windows do outro PC pode estar bloqueando: peça para ele clicar em Permitir quando o Windows perguntar.", "could not talk to the room (%s). The other PC's Windows Firewall may be blocking it: ask them to click Allow when Windows asks."},
	{"não consegui mandar: sem conexão com a sala", "could not send: no connection to the room"},
	{"não permitido", "not allowed"},
	{"não posso apagar aqui", "can't delete here"},
	{"não posso criar aqui", "can't create here"},
	{"não posso renomear aqui", "can't rename here"},
	{"não posso salvar aqui", "can't save here"},
	{"o arquivo baixado veio estragado (%s). Tente de novo", "the downloaded file is broken (%s). Try again"},
	{"o comando da linguagem está vazio", "the language command is empty"},
	{"o código tem 6 números", "the code has 6 numbers"},
	{"o download automático é só para Windows; instale pelo gerenciador de pacotes do sistema", "automatic download is Windows only; install it with the system package manager"},
	{"o plugin %s está desligado em Configurações › Linguagens", "the %s plugin is turned off in Settings › Languages"},
	{"o programa não está rodando", "the program is not running"},
	{"o servidor respondeu %s para %s", "the server answered %s for %s"},
	{"pasta fora dos projetos do PyForge", "folder outside PyForge projects"},
	{"pasta não encontrada", "folder not found"},
	{"pasta não permitida", "folder not allowed"},
	{"pedido inválido", "invalid request"},
	{"preencha nome, extensão e comando", "fill in name, extension and command"},
	{"projeto não permitido", "project not allowed"},
	{"seletor de pastas indisponível neste sistema; digite o caminho", "folder picker unavailable on this system; type the path"},
	{"só dá para mandar imagens PNG, JPG, GIF ou WEBP", "you can only send PNG, JPG, GIF or WEBP images"},
	{"tarefa não encontrada", "task not found"},
	{"tempo esgotado", "timed out"},
	{"tipo de mensagem desconhecido", "unknown message type"},
	{"tipo de tarefa desconhecido", "unknown task type"},
	{"uv não encontrado", "uv not found"},
	{"versão inválida", "invalid version"},
	{"você já está numa sala; saia dela primeiro", "you are already in a room; leave it first"},
	{"você não está em nenhuma sala", "you are not in any room"},
	{"você não está nesta sala", "you are not in this room"},
	{"A PyForge IA ainda não foi baixada.", "PyForge AI has not been downloaded yet."},
	{"Coloque sua chave da Anthropic em Configurações › IA.", "Put your Anthropic key in Settings › AI."},
	{"Coloque sua chave em Configurações › IA.", "Put your key in Settings › AI."},
	{"Não deu para formatar: %s", "Could not format: %s"},
	{"conversa vazia", "empty conversation"},
	{"Pasta não encontrada: %s", "Folder not found: %s"},
	{"o motor da IA fechou sozinho. Pode faltar memória para esse modelo; tente um menor.%s", "the AI engine closed by itself. There may not be enough memory for this model; try a smaller one.%s"},
	{"não consegui ligar o motor da IA: %s", "could not start the AI engine: %s"},
	{"não consegui abrir o motor baixado: %s", "could not open the downloaded engine: %s"},
	{"o download do motor falhou: %s", "the engine download failed: %s"},
	{"não consegui baixar o motor da IA pelo GitHub (%s)", "could not download the AI engine from GitHub (%s)"},
	{"não consegui falar com o Hugging Face: %s", "could not reach Hugging Face: %s"},
	{"o Hugging Face respondeu com erro %s; tente de novo daqui a pouco", "Hugging Face answered with error %s; try again in a moment"},
}

type msgRegex struct {
	re *regexp.Regexp
	en string
}

var regexMensagensEN = func() []msgRegex {
	var r []msgRegex
	for _, p := range mensagensEN {
		partes := strings.Split(p[0], "%s")
		for i := range partes {
			partes[i] = regexp.QuoteMeta(partes[i])
		}
		r = append(r, msgRegex{regexp.MustCompile("(?s)^" + strings.Join(partes, "(.*?)") + "$"), p[1]})
	}
	return r
}()

// traduzirMsg devolve a mensagem em inglês se o PyForge estiver em inglês.
func traduzirMsg(msg string) string {
	if cfgString("idioma") != "en" || msg == "" {
		return msg
	}
	for _, m := range regexMensagensEN {
		if g := m.re.FindStringSubmatch(msg); g != nil {
			en := m.en
			for _, v := range g[1:] {
				en = strings.Replace(en, "%s", v, 1)
			}
			return en
		}
	}
	return msg
}
