package runtimeassets

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
)

type Resources struct {
	FFmpegPath  string
	WhisperPath string
}

// Resolve uses only binaries shipped beside the application in production.
// Overrides are available solely to Wails development builds.
func Resolve(root string, development bool) (Resources, error) {
	ffmpeg, err := binary(root, development, "ffmpeg", "TEXTMOTION_FFMPEG_PATH")
	if err != nil {
		return Resources{}, err
	}
	whisper, err := binary(root, development, "whisper-cli", "TEXTMOTION_WHISPER_PATH")
	if err != nil {
		return Resources{}, err
	}
	return Resources{FFmpegPath: ffmpeg, WhisperPath: whisper}, nil
}

func binary(root string, development bool, name, override string) (string, error) {
	if development {
		if path := os.Getenv(override); path != "" {
			return checked(path, name)
		}
	}
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	base := root
	if runtime.GOOS == "darwin" {
		base = filepath.Clean(filepath.Join(root, "..", "Resources"))
	}
	path := filepath.Join(base, "bin", runtime.GOOS+"-"+runtime.GOARCH, name+ext)
	return checked(path, name)
}

func checked(path, name string) (string, error) {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		log.Printf("required native tool %s unavailable at %s: %v", name, path, err)
		return "", fmt.Errorf("%s missing from application bundle", name)
	}
	if runtime.GOOS != "windows" && info.Mode()&0111 == 0 {
		log.Printf("required native tool %s is not executable: %s", name, path)
		return "", fmt.Errorf("%s is not executable in application bundle", name)
	}
	return path, nil
}
