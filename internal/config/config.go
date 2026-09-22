package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

const appDirectory = "TextMotionStudio"
const fileName = "config.json"

// AppConfig is the small, persistent state shared by onboarding and future settings.
type AppConfig struct {
	OnboardingCompleted bool `json:"onboardingCompleted"`
	ModelInstalled      bool `json:"modelInstalled"`
	Language            string `json:"language"`
}

func normalizeLanguage(language string) string {
	if language == "es" {
		return "es"
	}
	return "en"
}

func path() (string, error) {
	directory, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(directory, appDirectory, fileName), nil
}

// Load returns the first-run defaults when no configuration file exists.
func Load() (AppConfig, error) {
	filePath, err := path()
	if err != nil {
		return AppConfig{}, err
	}
	data, err := os.ReadFile(filePath)
	if errors.Is(err, os.ErrNotExist) {
		return AppConfig{Language: "en"}, nil
	}
	if err != nil {
		return AppConfig{}, err
	}
	var value AppConfig
	if err := json.Unmarshal(data, &value); err != nil {
		return AppConfig{}, err
	}
	value.Language = normalizeLanguage(value.Language)
	return value, nil
}

// Save writes the configuration to the current user's config directory.
func Save(value AppConfig) error {
	value.Language = normalizeLanguage(value.Language)
	filePath, err := path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(filePath), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, append(data, '\n'), 0600)
}
