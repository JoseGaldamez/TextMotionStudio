package runtimeassets

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestResolveBundledAndDevelopmentOverride(t *testing.T) {
	root := t.TempDir()
	base := root
	if runtime.GOOS == "darwin" {
		root = filepath.Join(root, "Contents", "MacOS")
		base = filepath.Join(root, "..", "Resources")
	}
	dir := filepath.Join(base, "bin", runtime.GOOS+"-"+runtime.GOARCH)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	for _, name := range []string{"ffmpeg", "whisper-cli"} {
		if err := os.WriteFile(filepath.Join(dir, name+ext), nil, 0755); err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv("TEXTMOTION_FFMPEG_PATH", filepath.Join(root, "missing"))
	if _, err := Resolve(root, true); err == nil {
		t.Fatal("development override should be checked")
	}
	resources, err := Resolve(root, false)
	if err != nil {
		t.Fatal(err)
	}
	if resources.FFmpegPath != filepath.Join(dir, "ffmpeg"+ext) {
		t.Fatalf("unexpected ffmpeg path: %s", resources.FFmpegPath)
	}
}
