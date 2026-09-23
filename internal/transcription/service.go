package transcription

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"TextMotionStudio/internal/media"
)

var (
	ErrNoSpeech         = errors.New("no speech detected")
	ErrToolsUnavailable = errors.New("local transcription tools are unavailable")
)

type Service struct {
	root string
	emit func(string, any)
}

func New(root string, emit func(string, any)) *Service { return &Service{root: root, emit: emit} }

func (s *Service) tool(env, name string) (string, error) {
	if configured := os.Getenv(env); configured != "" {
		if info, err := os.Stat(configured); err == nil && !info.IsDir() {
			return configured, nil
		}
	}
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	candidates := []string{
		filepath.Join(s.root, "bin", runtime.GOOS+"-"+runtime.GOARCH, name+ext),
		filepath.Join(s.root, "bin", name+ext),
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, nil
		}
	}
	log.Printf("caption tool unavailable: %s (checked %s and %s; override with %s)", name, candidates[0], candidates[1], env)
	return "", ErrToolsUnavailable
}

func (s *Service) emitProgress(stage string) {
	if s.emit != nil {
		s.emit("captions:generation:progress", Progress{Stage: stage})
	}
}

func (s *Service) Generate(ctx context.Context, video, model, modelID, language string) (Result, error) {
	if language != "auto" && language != "en" && language != "es" {
		language = "auto"
	}
	ffmpeg, err := s.tool("TEXTMOTION_FFMPEG_PATH", "ffmpeg")
	if err != nil {
		return Result{}, err
	}
	whisper, err := s.tool("TEXTMOTION_WHISPER_PATH", "whisper-cli")
	if err != nil {
		return Result{}, err
	}
	help, err := exec.CommandContext(ctx, whisper, "--help").CombinedOutput()
	if err != nil || !bytes.Contains(help, []byte("--output-json-full")) || !bytes.Contains(help, []byte("--output-file")) || !bytes.Contains(help, []byte("--max-len")) || !bytes.Contains(help, []byte("--split-on-word")) {
		return Result{}, fmt.Errorf("unsupported whisper-cli: %w", ErrToolsUnavailable)
	}
	temp, err := os.MkdirTemp("", "textmotion-captions-")
	if err != nil {
		return Result{}, err
	}
	defer os.RemoveAll(temp)
	audio := filepath.Join(temp, "audio.wav")
	s.emitProgress("preparing")
	if err := media.ExtractAudio(ctx, ffmpeg, video, audio); err != nil {
		return Result{}, err
	}
	audioDuration := 0.0
	if info, statErr := os.Stat(audio); statErr == nil && info.Size() > 44 {
		audioDuration = float64(info.Size()-44) / 32000
	}
	s.emitProgress("transcribing")
	base := filepath.Join(temp, "transcription")
	args := []string{"-m", model, "-f", audio, "--language", language, "--max-len", "1", "--split-on-word", "--output-json-full", "--output-file", base}
	started := time.Now()
	cmd := exec.CommandContext(ctx, whisper, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		log.Printf("caption transcription subprocess failed: %v: %s", err, stderr.String())
		return Result{}, err
	}
	s.emitProgress("processing")
	words, detected, err := ParseJSON(base + ".json")
	if err != nil {
		return Result{}, err
	}
	if len(words) == 0 {
		return Result{}, ErrNoSpeech
	}
	groups := BuildCaptionGroups(words, DefaultMaxWordGap)
	log.Printf("captions generated model=%s requested_language=%s detected_language=%s audio_duration=%.2fs transcription_duration=%s words=%d groups=%d", modelID, language, detected, audioDuration, time.Since(started), len(words), len(groups))
	result := Result{Language: language, Model: modelID, Words: words, CaptionGroups: groups}
	if language == "auto" {
		result.Language, result.DetectedLanguage = detected, detected
	}
	s.emitProgress("completed")
	return result, nil
}

func FriendlyError(err error) error {
	if errors.Is(err, context.Canceled) {
		return errors.New("Caption generation was canceled.")
	}
	if errors.Is(err, ErrNoSpeech) {
		return errors.New("No speech was detected in this video.")
	}
	if errors.Is(err, ErrToolsUnavailable) {
		return errors.New("Local transcription tools are not available in this installation.")
	}
	if strings.Contains(err.Error(), "ffmpeg:") {
		return errors.New("We couldn't read the audio from this video.")
	}
	return errors.New("Couldn't generate captions. Please try again.")
}
