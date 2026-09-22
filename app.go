package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"TextMotionStudio/internal/config"
	modelmanager "TextMotionStudio/internal/models"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx    context.Context
	models *modelmanager.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	directory, err := config.Directory()
	if err == nil {
		a.models = modelmanager.New(filepath.Join(directory, "models"), func(name string, payload any) { runtime.EventsEmit(ctx, name, payload) })
	}
	// Development-only reset: launch with TEXTMOTION_RESET_ONBOARDING=1.
	if ctx.Value("buildtype") == "dev" && os.Getenv("TEXTMOTION_RESET_ONBOARDING") == "1" {
		_ = config.Save(config.AppConfig{})
	}
	if ctx.Value("buildtype") == "dev" && os.Getenv("TEXTMOTION_RESET_MODELS") == "1" && err == nil {
		_ = os.RemoveAll(filepath.Join(directory, "models"))
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
