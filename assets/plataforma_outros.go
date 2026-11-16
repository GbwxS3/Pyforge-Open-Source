//go:build !windows

package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"syscall"
)

func garantirUV() string {
	if p, err := exec.LookPath("uv"); err == nil {
		return p
	}
	return ""
}

func pastaScriptsVenv() string { return "bin" }
func exePythonVenv() string    { return "python" }
func separadorPath() string    { return ":" }

func prepararProcesso(c *exec.Cmd) {
	c.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

func matarArvore(c *exec.Cmd) {
	if c == nil || c.Process == nil {
		return
	}
	syscall.Kill(-c.Process.Pid, syscall.SIGKILL)
	c.Process.Kill()
}

func comandoShell(linha string) *exec.Cmd {
	return exec.Command("bash", "-lc", linha)
}

func abrirJanela(url string) bool {
	for _, nav := range []string{"google-chrome", "chromium", "chromium-browser", "microsoft-edge"} {
		if p, err := exec.LookPath(nav); err == nil {
			c := exec.Command(p, "--app="+url, "--window-size=1440,900")
			if c.Start() == nil {
				c.Wait()
				return false
			}
		}
	}
	exec.Command("xdg-open", url).Start()
	return false
}

func escolherPasta() (string, error) {
	if p, err := exec.LookPath("zenity"); err == nil {
		out, err := exec.Command(p, "--file-selection", "--directory").Output()
		return strings.TrimSpace(string(out)), err
	}
	return "", errors.New("seletor de pastas indisponível neste sistema; digite o caminho")
}

func revelarNoSistema(p string) {
	exec.Command("xdg-open", p).Start()
}

func protegerSegredo(s string) string {
	return "txt:" + base64.StdEncoding.EncodeToString([]byte(s))
}

func revelarSegredo(s string) string {
	if strings.HasPrefix(s, "txt:") {
		b, _ := base64.StdEncoding.DecodeString(s[4:])
		return string(b)
	}
	return ""
}

var _ = os.Getenv

func abrirPastaNoSistema(p string) error {
	return exec.Command("xdg-open", p).Start()
}

func memoriaTotalGB() float64 {
	b, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0
	}
	var kb float64
	for _, l := range strings.Split(string(b), "\n") {
		if strings.HasPrefix(l, "MemTotal:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(l, "MemTotal:")), "%f", &kb)
		}
	}
	return kb / (1 << 20)
}

func abrirNoNavegador(url string) error {
	return exec.Command("xdg-open", url).Start()
}
