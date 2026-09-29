package main

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestNativeHashesIncludesOnlyNativeFiles(t *testing.T) {
	dir := t.TempDir()
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	mediaName := "ffmpeg" + ext
	if runtime.GOOS == "windows" {
		mediaName = "windows-media.exe"
	}
	for _, name := range []string{mediaName, "whisper-cli" + ext} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(name), 0644); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(dir, "LICENSE"), []byte("ignored"), 0644); err != nil {
		t.Fatal(err)
	}
	got := nativeHashes(dir, ext)
	for _, name := range []string{mediaName, "whisper-cli" + ext} {
		want := fmt.Sprintf("%x  %s", sha256.Sum256([]byte(name)), name)
		if !strings.Contains(got, want) {
			t.Fatalf("missing hash %s in %s", want, got)
		}
	}
	if strings.Contains(got, "LICENSE") {
		t.Fatal("non-native file was hashed")
	}
}

func TestHasLineRequiresExactVersion(t *testing.T) {
	if !hasLine("whisper.cpp version: 1.9.2\nbackend loaded\n", "whisper.cpp version: 1.9.2") {
		t.Fatal("exact version missing")
	}
	if hasLine("whisper.cpp version: 1.9.20\n", "whisper.cpp version: 1.9.2") {
		t.Fatal("prefix version accepted")
	}
}
