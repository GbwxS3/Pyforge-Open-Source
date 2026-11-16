//go:build windows

package main

import (
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const criarSemJanela = 0x08000000 // CREATE_NO_WINDOW

// garantirUV procura o uv.exe que vem na pasta "ferramentas" ao lado do PyForge.exe.
// Ele não fica mais embutido no exe: extrair e rodar um executável escondido
// é exatamente o que antivírus consideram suspeito.
func garantirUV() string {
	cands := []string{}
	if exe, err := os.Executable(); err == nil {
		d := filepath.Dir(exe)
		cands = append(cands, filepath.Join(d, "ferramentas", "uv.exe"), filepath.Join(d, "uv.exe"))
	}
	cands = append(cands, filepath.Join(dataDir, "bin", "uv.exe")) // deixado pela versão 0.1.0
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && !st.IsDir() && st.Size() > 0 {
			return c
		}
	}
	if p, err := exec.LookPath("uv.exe"); err == nil {
		return p
	}
	return ""
}

func pastaScriptsVenv() string { return "Scripts" }
func exePythonVenv() string    { return "python.exe" }
func separadorPath() string    { return ";" }

func prepararProcesso(c *exec.Cmd) {
	c.SysProcAttr = &syscall.SysProcAttr{CreationFlags: criarSemJanela}
}

func matarArvore(c *exec.Cmd) {
	if c == nil || c.Process == nil {
		return
	}
	k := exec.Command("taskkill", "/T", "/F", "/PID", strconv.Itoa(c.Process.Pid))
	prepararProcesso(k)
	k.Run()
	c.Process.Kill()
}

// comandoShell roda uma linha no cmd.exe já em UTF-8.
func comandoShell(linha string) *exec.Cmd {
	c := exec.Command("cmd.exe")
	c.SysProcAttr = &syscall.SysProcAttr{
		CmdLine:       `cmd.exe /S /C "chcp 65001>nul & ` + linha + `"`,
		CreationFlags: criarSemJanela,
	}
	return c
}

func acharEdge() string {
	cands := []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("LOCALAPPDATA"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("LOCALAPPDATA"), `Google\Chrome\Application\chrome.exe`),
	}
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return ""
}

// abrirJanela abre o PyForge numa janela própria (modo app do Edge).
// Retorna true se a janela ficou presa a este processo até ser fechada.
func abrirJanela(url string) bool {
	nav := acharEdge()
	if nav == "" {
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		return false
	}
	perfil := filepath.Join(dataDir, "janela")
	c := exec.Command(nav,
		"--app="+url,
		"--user-data-dir="+perfil,
		"--window-size=1440,900",
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-background-timer-throttling",
		"--disable-renderer-backgrounding",
		"--disable-backgrounding-occluded-windows",
		"--disable-features=Translate,msEdgeSidebarV2,msHubApps",
		"--hide-crash-restore-bubble",
	)
	if err := c.Start(); err != nil {
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		return false
	}
	inicio := time.Now()
	c.Wait()
	return time.Since(inicio) > 8*time.Second
}

// ---------- janela nativa "escolher pasta" (IFileOpenDialog, sem PowerShell) ----------

type guid struct {
	d1     uint32
	d2, d3 uint16
	d4     [8]byte
}

var (
	ole32                   = syscall.NewLazyDLL("ole32.dll")
	user32                  = syscall.NewLazyDLL("user32.dll")
	procCoInitializeEx      = ole32.NewProc("CoInitializeEx")
	procCoUninitialize      = ole32.NewProc("CoUninitialize")
	procCoCreateInstance    = ole32.NewProc("CoCreateInstance")
	procCoTaskMemFree       = ole32.NewProc("CoTaskMemFree")
	procGetForegroundWindow = user32.NewProc("GetForegroundWindow")

	clsidFileOpenDialog = guid{0xDC1C5A9C, 0xE88A, 0x4DDE, [8]byte{0xA5, 0xA1, 0x60, 0xF8, 0x2A, 0x20, 0xAE, 0xF7}}
	iidIFileOpenDialog  = guid{0xD57C7288, 0xD4AD, 0x4768, [8]byte{0xBE, 0x02, 0x9D, 0x96, 0x95, 0x32, 0xD9, 0x60}}
)

// Posições na vtable (IUnknown → IModalWindow → IFileDialog / IShellItem).
const (
	vtRelease        = 2
	vtShow           = 3
	vtSetOptions     = 9
	vtGetOptions     = 10
	vtSetTitle       = 17
	vtSetOkLabel     = 18
	vtGetResult      = 20
	vtGetDisplayName = 5 // IShellItem
)

// comChamar chama o método n da vtable de um objeto COM.
//
//go:uintptrescapes
func comChamar(obj uintptr, n int, args ...uintptr) uintptr {
	vtbl := *(*uintptr)(unsafe.Pointer(obj))
	fn := *(*uintptr)(unsafe.Pointer(vtbl + uintptr(n)*unsafe.Sizeof(uintptr(0))))
	r, _, _ := syscall.SyscallN(fn, append([]uintptr{obj}, args...)...)
	return r
}

func utf16ParaString(p *uint16) string {
	if p == nil {
		return ""
	}
	n := 0
	for ptr := unsafe.Pointer(p); *(*uint16)(ptr) != 0; n++ {
		ptr = unsafe.Add(ptr, 2)
	}
	return syscall.UTF16ToString(unsafe.Slice(p, n))
}

func escolherPasta() (string, error) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	hr, _, _ := procCoInitializeEx.Call(0, 0x2|0x4) // APARTMENTTHREADED | DISABLE_OLE1DDE
	if int32(hr) >= 0 {
		defer procCoUninitialize.Call()
	}
	var dlg uintptr
	hr, _, _ = procCoCreateInstance.Call(
		uintptr(unsafe.Pointer(&clsidFileOpenDialog)), 0, 1, // CLSCTX_INPROC_SERVER
		uintptr(unsafe.Pointer(&iidIFileOpenDialog)), uintptr(unsafe.Pointer(&dlg)))
	if int32(hr) < 0 || dlg == 0 {
		return "", fmt.Errorf("não consegui abrir a janela de pastas (0x%08X)", uint32(hr))
	}
	defer comChamar(dlg, vtRelease)

	var opcoes uint32
	comChamar(dlg, vtGetOptions, uintptr(unsafe.Pointer(&opcoes)))
	comChamar(dlg, vtSetOptions, uintptr(opcoes|0x20|0x40|0x800)) // PICKFOLDERS | FORCEFILESYSTEM | PATHMUSTEXIST
	titulo, _ := syscall.UTF16PtrFromString("Escolha a pasta do projeto")
	comChamar(dlg, vtSetTitle, uintptr(unsafe.Pointer(titulo)))
	botao, _ := syscall.UTF16PtrFromString("Escolher pasta")
	comChamar(dlg, vtSetOkLabel, uintptr(unsafe.Pointer(botao)))

	// Dono = janela em primeiro plano (a do PyForge, que acabou de ser clicada),
	// para a caixa aparecer por cima dela e não escondida atrás.
	dono, _, _ := procGetForegroundWindow.Call()
	hr = comChamar(dlg, vtShow, dono)
	if uint32(hr) == 0x800704C7 { // ERROR_CANCELLED: a pessoa fechou a janela
		return "", nil
	}
	if int32(hr) < 0 {
		return "", fmt.Errorf("a janela de pastas falhou (0x%08X)", uint32(hr))
	}
	var item uintptr
	if hr = comChamar(dlg, vtGetResult, uintptr(unsafe.Pointer(&item))); int32(hr) < 0 || item == 0 {
		return "", fmt.Errorf("não consegui ler a pasta escolhida (0x%08X)", uint32(hr))
	}
	defer comChamar(item, vtRelease)
	var texto *uint16
	if hr = comChamar(item, vtGetDisplayName, 0x80058000, uintptr(unsafe.Pointer(&texto))); int32(hr) < 0 || texto == nil { // SIGDN_FILESYSPATH
		return "", fmt.Errorf("essa pasta não está no disco (0x%08X)", uint32(hr))
	}
	defer procCoTaskMemFree.Call(uintptr(unsafe.Pointer(texto)))
	return utf16ParaString(texto), nil
}

func revelarNoSistema(p string) {
	c := exec.Command("explorer.exe", "/select,", p)
	c.Start()
}

// ---------- DPAPI: guarda a chave da IA criptografada pela conta do Windows ----------

type blobDados struct {
	tam uint32
	ptr *byte
}

var (
	crypt32       = syscall.NewLazyDLL("crypt32.dll")
	kernel32      = syscall.NewLazyDLL("kernel32.dll")
	procProtect   = crypt32.NewProc("CryptProtectData")
	procUnprotect = crypt32.NewProc("CryptUnprotectData")
	procLocalFree = kernel32.NewProc("LocalFree")
)

func novoBlob(b []byte) *blobDados {
	if len(b) == 0 {
		return &blobDados{}
	}
	return &blobDados{tam: uint32(len(b)), ptr: &b[0]}
}

func (b *blobDados) bytes() []byte {
	out := make([]byte, b.tam)
	copy(out, unsafe.Slice(b.ptr, b.tam))
	return out
}

func protegerSegredo(s string) string {
	entrada := []byte(s)
	var saida blobDados
	r, _, _ := procProtect.Call(uintptr(unsafe.Pointer(novoBlob(entrada))), 0, 0, 0, 0, 0x1, uintptr(unsafe.Pointer(&saida)))
	if r == 0 {
		return "txt:" + base64.StdEncoding.EncodeToString(entrada)
	}
	defer procLocalFree.Call(uintptr(unsafe.Pointer(saida.ptr)))
	return "dpapi:" + base64.StdEncoding.EncodeToString(saida.bytes())
}

func revelarSegredo(s string) string {
	if strings.HasPrefix(s, "txt:") {
		b, _ := base64.StdEncoding.DecodeString(s[4:])
		return string(b)
	}
	if !strings.HasPrefix(s, "dpapi:") {
		return ""
	}
	dados, err := base64.StdEncoding.DecodeString(s[6:])
	if err != nil || len(dados) == 0 {
		return ""
	}
	var saida blobDados
	r, _, _ := procUnprotect.Call(uintptr(unsafe.Pointer(novoBlob(dados))), 0, 0, 0, 0, 0x1, uintptr(unsafe.Pointer(&saida)))
	if r == 0 {
		return ""
	}
	defer procLocalFree.Call(uintptr(unsafe.Pointer(saida.ptr)))
	return string(saida.bytes())
}

// abrirPastaNoSistema abre a pasta no Explorer.
func abrirPastaNoSistema(p string) error {
	return exec.Command("explorer.exe", p).Start()
}

type estadoMemoria struct {
	tamanho     uint32
	carga       uint32
	totalFisica uint64
	livreFisica uint64
	totalPag    uint64
	livrePag    uint64
	totalVirt   uint64
	livreVirt   uint64
	livreExt    uint64
}

// memoriaTotalGB devolve a RAM do PC (para avisar se o modelo cabe).
func memoriaTotalGB() float64 {
	proc := syscall.NewLazyDLL("kernel32.dll").NewProc("GlobalMemoryStatusEx")
	var m estadoMemoria
	m.tamanho = uint32(unsafe.Sizeof(m))
	if r, _, _ := proc.Call(uintptr(unsafe.Pointer(&m))); r == 0 {
		return 0
	}
	return float64(m.totalFisica) / (1 << 30)
}

func abrirNoNavegador(url string) error {
	return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
