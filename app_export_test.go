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

func TestApprovedFFmpegExportPipeline(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows release binary is required")
	}
	ffmpeg := filepath.Join("build", "bin", "bin", "windows-amd64", "ffmpeg.exe")
	if _, err := os.Stat(ffmpeg); err != nil {
		t.Skip("Approved FFmpeg binary is not staged")
	}
	temp := t.TempDir()
	imageFile := filepath.Join(temp, "000000.qoi")
	imageData := image.NewNRGBA(image.Rect(0, 0, 64, 64))
	for y := 10; y < 30; y++ {
		for x := 10; x < 40; x++ {
			imageData.SetNRGBA(x, y, color.NRGBA{R: 255, G: 255, B: 255, A: 255})
		}
	}
	if err := os.WriteFile(imageFile, encodeQOI(imageData), 0600); err != nil {
		t.Fatal(err)
	}
	list := "file '000000.qoi'\nduration 1.0\nfile '000000.qoi'\n"
	if err := os.WriteFile(filepath.Join(temp, "frames.ffconcat"), []byte(list), 0600); err != nil {
		t.Fatal(err)
	}
	source := filepath.Join(temp, "source.mp4")
	cmd := exec.Command(ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64:r=25:d=1", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:v", "mpeg4", "-c:a", "aac", "-y", source)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("create sample: %v: %s", err, output)
	}
	for _, tc := range []struct {
		format, audio string
		codecs        []string
	}{
		{"mp4", "Audio: aac", []string{"-c:v", "mpeg4", "-q:v", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart"}},
		{"mov", "Audio: pcm_s24le", []string{"-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuv444p10le", "-c:a", "pcm_s24le"}},
	} {
		t.Run(tc.format, func(t *testing.T) {
			result := filepath.Join(temp, "result."+tc.format)
			args := []string{"-hide_banner", "-loglevel", "error", "-nostdin", "-i", source, "-f", "concat", "-safe", "0", "-i", filepath.Join(temp, "frames.ffconcat"), "-filter_complex", "[1:v]format=rgba[caption];[0:v][caption]overlay=0:0:format=auto:eof_action=pass[v]", "-map", "[v]", "-map", "0:a?", "-fps_mode:v", "passthrough"}
			args = append(args, tc.codecs...)
			args = append(args, "-y", result)
			cmd = exec.Command(ffmpeg, args...)
			if output, err := cmd.CombinedOutput(); err != nil {
				t.Fatalf("encode export: %v: %s", err, output)
			}
			if info, err := os.Stat(result); err != nil || info.Size() == 0 {
				t.Fatalf("missing output: %v", err)
			}
			metadata, _ := exec.Command(ffmpeg, "-hide_banner", "-i", result).CombinedOutput()
			if !bytes.Contains(metadata, []byte(tc.audio)) {
				t.Fatalf("export did not preserve audio: %s", metadata)
			}
			cmd = exec.Command(ffmpeg, "-hide_banner", "-loglevel", "error", "-i", result, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1")
			frame, err := cmd.Output()
			if err != nil {
				t.Fatal(err)
			}
			if len(frame) != 64*64*4 {
				t.Fatalf("unexpected frame size: %d", len(frame))
			}
			white := (15*64 + 15) * 4
			red := (45*64 + 45) * 4
			if frame[white] < 220 || frame[white+1] < 220 || frame[red] < 170 || frame[red+1] > 80 {
				t.Fatalf("caption composite colors are wrong")
			}
		})
	}
}
