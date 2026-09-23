package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"TextMotionStudio/internal/config"
	modelmanager "TextMotionStudio/internal/models"
	"TextMotionStudio/internal/transcription"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	models           *modelmanager.Manager
	transcriber      *transcription.Service
	generationMu     sync.Mutex
	generationCancel context.CancelFunc
	videoMu          sync.RWMutex
	videos           map[string]string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{videos: make(map[string]string)}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	directory, err := config.Directory()
	if err == nil {
		emit := func(name string, payload any) { runtime.EventsEmit(ctx, name, payload) }
		a.models = modelmanager.New(filepath.Join(directory, "models"), emit)
		executable, executableErr := os.Executable()
		root := "."
		if executableErr == nil {
			root = filepath.Dir(executable)
		}
		a.transcriber = transcription.New(root, emit)
	}
	// Development-only reset: launch with TEXTMOTION_RESET_ONBOARDING=1.
	if ctx.Value("buildtype") == "dev" && os.Getenv("TEXTMOTION_RESET_ONBOARDING") == "1" {
		_ = config.Save(config.AppConfig{})
	}
	if ctx.Value("buildtype") == "dev" && os.Getenv("TEXTMOTION_RESET_MODELS") == "1" && err == nil {
		_ = os.RemoveAll(filepath.Join(directory, "models"))
	}
}

func (a *App) SelectVideoFile() (map[string]string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{Title: "Select a video", Filters: []runtime.FileFilter{{DisplayName: "Video files", Pattern: "*.mp4;*.mov;*.mkv;*.avi;*.webm;*.m4v"}}})
	if err != nil || path == "" {
		return nil, err
	}
	return a.RegisterVideoFile(path)
}

func (a *App) RegisterVideoFile(path string) (map[string]string, error) {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	switch strings.ToLower(filepath.Ext(absolute)) {
	case ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v":
	default:
		return nil, errors.New("Please select a video file.")
	}
	info, err := os.Stat(absolute)
	if err != nil || info.IsDir() {
		return nil, errors.New("We couldn't open this video.")
	}
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	token := hex.EncodeToString(tokenBytes)
	a.videoMu.Lock()
	a.videos = map[string]string{token: absolute}
	a.videoMu.Unlock()
	return map[string]string{"path": absolute, "name": filepath.Base(absolute), "url": "/local-video/" + token}, nil
}

func (a *App) serveVideo(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/local-video/") {
		http.NotFound(w, r)
		return
	}
	token := strings.TrimPrefix(r.URL.Path, "/local-video/")
	a.videoMu.RLock()
	path := a.videos[token]
	a.videoMu.RUnlock()
	if path == "" {
		http.NotFound(w, r)
		return
	}
	file, err := os.Open(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		http.NotFound(w, r)
		return
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func (a *App) videoAssetMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/local-video/") {
			a.serveVideo(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) GenerateCaptions(videoPath, language string) (transcription.Result, error) {
	if a.models == nil || a.transcriber == nil {
		return transcription.Result{}, errors.New("Local transcription is unavailable.")
	}
	modelPath, modelID, err := a.models.Selected()
	if err != nil {
		return transcription.Result{}, errors.New("A transcription model is required.")
	}
	a.videoMu.RLock()
	selectedVideo := false
	for _, path := range a.videos {
		if path == videoPath {
			selectedVideo = true
			break
		}
	}
	a.videoMu.RUnlock()
	if !selectedVideo {
		return transcription.Result{}, errors.New("Please select a video first.")
	}
	a.generationMu.Lock()
	if a.generationCancel != nil {
		a.generationMu.Unlock()
		return transcription.Result{}, errors.New("Caption generation is already running.")
	}
	ctx, cancel := context.WithCancel(a.ctx)
	a.generationCancel = cancel
	a.generationMu.Unlock()
	defer func() { a.generationMu.Lock(); a.generationCancel = nil; a.generationMu.Unlock(); cancel() }()
	result, err := a.transcriber.Generate(ctx, videoPath, modelPath, modelID, language)
	if err != nil {
		stage := "error"
		if errors.Is(err, context.Canceled) {
			stage = "canceled"
		}
		runtime.EventsEmit(a.ctx, "captions:generation:progress", transcription.Progress{Stage: stage, Message: transcription.FriendlyError(err).Error()})
		return transcription.Result{}, transcription.FriendlyError(err)
	}
	return result, nil
}

func (a *App) CancelCaptionGeneration() {
	a.generationMu.Lock()
	cancel := a.generationCancel
	a.generationMu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) GetAppConfig() (config.AppConfig, error) {
	return config.Load()
}

func (a *App) UpdateAppConfig(onboardingCompleted bool, language string) (config.AppConfig, error) {
	value, err := config.Load()
	if err != nil {
		return config.AppConfig{}, err
	}
	value.OnboardingCompleted, value.Language = onboardingCompleted, language
	if err := config.Save(value); err != nil {
		return config.AppConfig{}, err
	}
	return config.Load()
}

func (a *App) ListModels() ([]modelmanager.Info, error) {
	if a.models == nil {
		return nil, errors.New("model storage is unavailable")
	}
	return a.models.List()
}
func (a *App) DownloadModel(id string) error {
	if a.models == nil {
		return errors.New("model storage is unavailable")
	}
	return a.models.Download(id)
}
func (a *App) CancelModelDownload(id string) {
	if a.models != nil {
		a.models.Cancel(id)
	}
}
func (a *App) DeleteModel(id string) error {
	if a.models == nil {
		return errors.New("model storage is unavailable")
	}
	return a.models.Delete(id)
}
func (a *App) SelectModel(id string) error {
	if a.models == nil {
		return errors.New("model storage is unavailable")
	}
	return a.models.Select(id)
}
func (a *App) GetSelectedModelPath() (string, error) {
	if a.models == nil {
		return "", modelmanager.ErrNoSelectedModel
	}
	return a.models.SelectedPath()
}
