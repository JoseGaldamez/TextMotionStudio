// nativecheck rejects unapproved native binaries before release packaging.
package main

import (
	"crypto/sha256"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
)

func main() {
	target := flag.String("target", runtime.GOOS+"-"+runtime.GOARCH, "release target")
	dir := flag.String("dir", "", "directory containing native binaries")
	metadata := flag.String("metadata", "third_party", "pinned version and approval directory")
	notices := flag.String("notices", "THIRD_PARTY_NOTICES.txt", "third-party notices file")
	report := flag.String("report", "", "optional validation report path")
	candidate := flag.Bool("candidate", false, "record candidate hashes/config; do not approve for release")
	variant := flag.String("variant", "cpu", "native variant: cpu or gpu")
	flag.Parse()
	if *variant != "cpu" && *variant != "gpu" {
		fail("unsupported native variant: " + *variant)
	}
	if *variant == "gpu" && *target != "windows-amd64" {
		fail("GPU variant currently supports windows-amd64 only")
	}
	if flag.NArg() != 0 {
		fail("use flags; example: go run ./tools/nativecheck -target windows-amd64 -dir <native-directory>")
	}
	if *target != "windows-amd64" && *target != "darwin-arm64" && *target != "darwin-amd64" {
		fail("unsupported release target: " + *target)
	}
	if runtime.GOOS+"-"+runtime.GOARCH != *target {
		fail("nativecheck must run on the target architecture")
	}
	if *dir == "" {
		*dir = filepath.Join("build", "bin", "bin", *target)
	}
	if info, err := os.Stat(*notices); err != nil || info.IsDir() {
		fail("THIRD_PARTY_NOTICES.txt is missing")
	}
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	windows := *target == "windows-amd64"
	mediaName := "ffmpeg" + ext
	if windows {
		mediaName = "windows-media.exe"
	}
	mediaTool := filepath.Join(*dir, mediaName)
	whisper := filepath.Join(*dir, "whisper-cli"+ext)
	for _, path := range []string{mediaTool, whisper} {
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			fail("required native binary is missing: " + path)
		}
	}
	version, buildconf := "", ""
	if !windows {
		version = run(mediaTool, "-version")
		buildconf = run(mediaTool, "-buildconf")
		for _, forbidden := range []string{"--enable-gpl", "--enable-nonfree", "--enable-libx264", "--enable-libx265", "--enable-libxvid", "--enable-libvidstab"} {
			for _, field := range strings.Fields(buildconf) {
				if field == forbidden {
					fail("FFmpeg is not approved for this LGPL bundle: " + forbidden)
				}
			}
		}
		ffmpegVersion := read(filepath.Join(*metadata, "ffmpeg", "VERSION"))
		if !strings.HasPrefix(version, "ffmpeg version "+ffmpegVersion+" ") || !strings.Contains(buildconf, "configuration:") {
			fail("FFmpeg version/configuration does not match the pinned release")
		}
	}
	whisperVersion := run(whisper, "--version")
	wantWhisper := "whisper.cpp version: " + read(filepath.Join(*metadata, "whisper", "VERSION"))
	if !hasLine(whisperVersion, wantWhisper) {
		fail("whisper.cpp version does not match the pinned release")
	}
	help := run(whisper, "--help")
	for _, option := range []string{"--output-json-full", "--output-file", "--max-len", "--split-on-word"} {
		if !strings.Contains(help, option) {
			fail("whisper-cli lacks required option " + option)
		}
	}
	hashes := nativeHashes(*dir, ext)
	if *variant == "gpu" {
		for _, backend := range []string{"cpu", "vulkan", "cuda"} {
			if !hasDLL(*dir, "ggml-"+backend) {
				fail("GPU bundle is missing ggml-" + backend + " backend")
			}
		}
		if info, err := os.Stat(filepath.Join(*dir, "CUDA_EULA.txt")); err != nil || info.IsDir() {
			fail("GPU bundle is missing CUDA_EULA.txt")
		}
	}
	if *candidate {
		write(filepath.Join(*dir, "SHA256SUMS"), hashes)
		if !windows {
			write(filepath.Join(*dir, "build-config.txt"), strings.TrimSpace(buildconf)+"\n")
		}
		fmt.Println("Candidate recorded; NOT approved for distribution:", *dir)
	} else {
		if !windows {
			configTarget := *target
			if *variant == "gpu" {
				configTarget += "-gpu"
			}
			if strings.TrimSpace(buildconf) != read(filepath.Join(*metadata, "ffmpeg", "build-config-"+configTarget+".txt")) {
				fail("FFmpeg -buildconf differs from the approved configuration")
			}
		}
		approval := *target
		if *variant == "gpu" {
			approval += "-gpu"
		}
		if strings.TrimSpace(hashes) != read(filepath.Join(*metadata, "approved", approval+".sha256")) {
			fail("native binary SHA-256 differs from the approved manifest")
		}
		if strings.TrimSpace(hashes) != read(filepath.Join(*dir, "SHA256SUMS")) {
			fail("candidate SHA256SUMS differs from staged binaries")
		}
		fmt.Println("Native dependency validation passed:", *target)
	}
	if *report != "" {
		mediaReport := "Windows Media Foundation\n"
		if !windows {
			mediaReport = "FFmpeg -version\n" + version + "\nFFmpeg -buildconf\n" + buildconf + "\n"
		}
		write(*report, mediaReport+"whisper-cli --version\n"+whisperVersion+"\nSHA256SUMS\n"+hashes)
	}
}

func hasDLL(dir, prefix string) bool {
	entries, err := os.ReadDir(dir)
	if err != nil {
		fail(err.Error())
	}
	for _, entry := range entries {
		name := strings.ToLower(entry.Name())
		if !entry.IsDir() && strings.HasPrefix(name, prefix) && strings.HasSuffix(name, ".dll") {
			return true
		}
	}
	return false
}

func nativeHashes(dir, ext string) string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		fail(err.Error())
	}
	var names []string
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() {
			fail("unexpected directory in native bundle: " + name)
		}
		if name == "ffmpeg"+ext || name == "windows-media.exe" || name == "whisper-cli"+ext || strings.HasSuffix(strings.ToLower(name), ".dll") || strings.HasSuffix(strings.ToLower(name), ".dylib") {
			names = append(names, name)
		} else if strings.HasSuffix(strings.ToLower(name), ".exe") {
			fail("unexpected executable in native bundle: " + name)
		}
	}
	sort.Strings(names)
	var lines []string
	for _, name := range names {
		file, err := os.Open(filepath.Join(dir, name))
		if err != nil {
			fail(err.Error())
		}
		hash := sha256.New()
		if _, err := io.Copy(hash, file); err != nil {
			file.Close()
			fail(err.Error())
		}
		if err := file.Close(); err != nil {
			fail(err.Error())
		}
		lines = append(lines, fmt.Sprintf("%x  %s", hash.Sum(nil), name))
	}
	return strings.Join(lines, "\n") + "\n"
}

func hasLine(output, want string) bool {
	for _, line := range strings.Split(output, "\n") {
		if strings.TrimSpace(line) == want {
			return true
		}
	}
	return false
}

func read(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		fail("required release metadata missing: " + path)
	}
	return strings.TrimSpace(string(data))
}

func write(path, content string) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		fail(err.Error())
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		fail(err.Error())
	}
}

func run(path, arg string) string {
	output, err := exec.Command(path, arg).CombinedOutput()
	if err != nil {
		fail(fmt.Sprintf("%s %s failed: %v: %s", path, arg, err, output))
	}
	return string(output)
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
