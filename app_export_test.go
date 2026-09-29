package main

import (
	"bytes"
	"image"
	"image/color"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
)

func TestWindowsMediaExportPipeline(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Media Foundation is available on Windows")
	}
	tool := filepath.Join("build", "bin", "bin", "windows-amd64", "windows-media.exe")
	if _, err := os.Stat(tool); err != nil {
		t.Skip("Build the Windows media helper before this integration test")
	}
	if output, err := exec.Command(tool, "probe").CombinedOutput(); err != nil {
		t.Fatalf("Windows media codecs unavailable: %v: %s", err, output)
	}
	for _, test := range []struct {
		name, source, width, height string
	}{
		{"landscape", "windows-media-source.mp4", "64", "64"},
		{"rotated", "windows-media-rotated.mp4", "64", "128"},
	} {
		t.Run(test.name, func(t *testing.T) {
			temp := t.TempDir()
			width, height := 64, 64
			if test.name == "rotated" {
				height = 128
			}
			imageData := image.NewNRGBA(image.Rect(0, 0, width, height))
			for y := 10; y < 30; y++ {
				for x := 10; x < 40; x++ {
					imageData.SetNRGBA(x, y, color.NRGBA{R: 255, G: 255, B: 255, A: 255})
				}
			}
			if err := os.WriteFile(filepath.Join(temp, "000000.qoi"), encodeQOI(imageData), 0600); err != nil {
				t.Fatal(err)
			}
			manifest := filepath.Join(temp, "captions.txt")
			if err := os.WriteFile(manifest, []byte("1.0\n"), 0600); err != nil {
				t.Fatal(err)
			}
			source := filepath.Join("testdata", test.source)
			result := filepath.Join(temp, "result.mp4")
			if output, err := exec.Command(tool, "export", source, result, manifest, test.width, test.height, "1.0").CombinedOutput(); err != nil {
				t.Fatalf("export failed: %v: %s", err, output)
			}
			if info, err := os.Stat(result); err != nil || info.Size() < 1000 {
				t.Fatalf("missing MP4 export: %v", err)
			}
			wav := filepath.Join(temp, "audio.wav")
			if output, err := exec.Command(tool, "extract", result, wav).CombinedOutput(); err != nil {
				t.Fatalf("exported audio cannot be decoded: %v: %s", err, output)
			}
			audio, err := os.ReadFile(wav)
			if err != nil || len(audio) < 32000 || !bytes.Equal(audio[:4], []byte("RIFF")) {
				t.Fatalf("exported audio is invalid: %v", err)
			}
		})
	}
}
