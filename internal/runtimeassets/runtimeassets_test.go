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
	mediaTool := "ffmpeg"
	mediaOverride := "TEXTMOTION_FFMPEG_PATH"
	if runtime.GOOS == "windows" {
		mediaTool = "windows-media"
		mediaOverride = "TEXTMOTION_MEDIA_PATH"
	}
	for _, name := range []string{mediaTool, "whisper-cli"} {
		if err := os.WriteFile(filepath.Join(dir, name+ext), nil, 0755); err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv(mediaOverride, filepath.Join(root, "missing"))
	if _, err := Resolve(root, true); err == nil {
		t.Fatal("development override should be checked")
	}
	resources, err := Resolve(root, false)
	if err != nil {
		t.Fatal(err)
	}
	mediaPath := resources.FFmpegPath
	if runtime.GOOS == "windows" {
		mediaPath = resources.MediaPath
	}
	if mediaPath != filepath.Join(dir, mediaTool+ext) {
		t.Fatalf("unexpected media tool path: %s", mediaPath)
	}
}
