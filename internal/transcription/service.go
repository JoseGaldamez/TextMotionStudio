package transcription

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"TextMotionStudio/internal/media"
	"TextMotionStudio/internal/runtimeassets"
)

var (
	ErrNoSpeech         = errors.New("no speech detected")
	ErrToolsUnavailable = errors.New("local transcription tools are unavailable")
)

type Service struct {
	root        string
	development bool
	emit        func(string, any)
}

func New(root string, development bool, emit func(string, any)) *Service {
	return &Service{root: root, development: development, emit: emit}
}

func (s *Service) emitProgress(stage string) {
	if s.emit != nil {
		s.emit("captions:generation:progress", Progress{Stage: stage})
	}
}

func (s *Service) Generate(ctx context.Context, video, model, modelID, language, device string) (Result, error) {
	if language != "auto" && language != "en" && language != "es" {
		language = "auto"
	}
	resources, err := runtimeassets.Resolve(s.root, s.development)
	if err != nil {
		return Result{}, fmt.Errorf("%w: %v", ErrToolsUnavailable, err)
	}
	decoder, whisper := resources.FFmpegPath, resources.WhisperPath
	if runtime.GOOS == "windows" {
		decoder = resources.MediaPath
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
	if err := media.ExtractAudio(ctx, decoder, video, audio); err != nil {
		return Result{}, err
	}
	audioDuration := 0.0
	if info, statErr := os.Stat(audio); statErr == nil && info.Size() > 44 {
		audioDuration = float64(info.Size()-44) / 32000
	}
	s.emitProgress("transcribing")
	base := filepath.Join(temp, "transcription")
	args := []string{"-m", model, "-f", audio, "--language", language, "--max-len", "1", "--split-on-word", "--output-json-full", "--output-file", base}
	if device == "cpu" {
		args = append(args, "--no-gpu")
	}
	started := time.Now()
	cmd := exec.CommandContext(ctx, whisper, args...)
	pipe, err := cmd.StderrPipe()
	if err != nil {
		return Result{}, err
	}
	if err := cmd.Start(); err != nil {
		return Result{}, err
	}
	var stderr bytes.Buffer
	reader := bufio.NewReader(pipe)
	reportedDevice := false
	var readErr error
	for {
		line, err := reader.ReadString('\n')
		if line != "" {
			stderr.WriteString(line)
			if !reportedDevice {
				if backend := backendFromLog(line); backend != "" {
					s.emit("captions:generation:progress", Progress{Stage: "transcribing", Device: backend})
					reportedDevice = true
				}
			}
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				readErr = err
			}
			break
		}
	}
	if err := cmd.Wait(); err != nil {
		log.Printf("caption transcription subprocess failed: %v: %s", err, stderr.String())
		return Result{}, err
	}
	if readErr != nil {
		return Result{}, fmt.Errorf("read transcription output: %w", readErr)
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
	log.Printf("captions generated model=%s device=%s requested_language=%s detected_language=%s audio_duration=%.2fs transcription_duration=%s words=%d groups=%d", modelID, device, language, detected, audioDuration, time.Since(started), len(words), len(groups))
	result := Result{Language: language, Model: modelID, Words: words, CaptionGroups: groups}
	if language == "auto" {
		result.Language, result.DetectedLanguage = detected, detected
	}
	s.emitProgress("completed")
	return result, nil
}

func backendFromLog(line string) string {
	switch {
	case strings.Contains(line, "whisper_backend_init_gpu: using CUDA"):
		return "cuda"
	case strings.Contains(line, "whisper_backend_init_gpu: using Vulkan"):
		return "vulkan"
	case strings.Contains(line, "whisper_backend_init_gpu: no GPU found"):
		return "cpu"
	default:
		return ""
	}
}

func FriendlyError(err error) error {
	if errors.Is(err, context.Canceled) {
		return errors.New("Caption generation was canceled.")
	}
	if errors.Is(err, ErrNoSpeech) {
		return errors.New("No speech was detected in this video.")
	}
	if errors.Is(err, ErrToolsUnavailable) {
		return errors.New("Caption generation is unavailable because this installation is missing required tools. Please reinstall TextMotion Studio.")
	}
	if strings.Contains(err.Error(), "media decode:") {
		if runtime.GOOS == "windows" {
			return errors.New("We couldn't read the audio from this video. On Windows N, install Media Feature Pack from Microsoft Support.")
		}
		return errors.New("We couldn't read the audio from this video.")
	}
	return errors.New("Couldn't generate captions. Please try again.")
}
