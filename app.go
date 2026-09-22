package main

import (
	"context"
	"fmt"
	"os"

	"TextMotionStudio/internal/config"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Development-only reset: launch with TEXTMOTION_RESET_ONBOARDING=1.
	if ctx.Value("buildtype") == "dev" && os.Getenv("TEXTMOTION_RESET_ONBOARDING") == "1" {
		_ = config.Save(config.AppConfig{})
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) GetAppConfig() (config.AppConfig, error) {
	return config.Load()
}

func (a *App) UpdateAppConfig(onboardingCompleted, modelInstalled bool, language string) (config.AppConfig, error) {
	value := config.AppConfig{OnboardingCompleted: onboardingCompleted, ModelInstalled: modelInstalled, Language: language}
	if err := config.Save(value); err != nil {
		return config.AppConfig{}, err
	}
	return config.Load()
}
