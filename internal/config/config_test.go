package config

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestLoadSaveAndFirstRun(t *testing.T) {
	base := t.TempDir()
	if runtime.GOOS == "windows" {
		t.Setenv("APPDATA", base)
	} else {
		t.Setenv("XDG_CONFIG_HOME", base)
	}

	initial, err := Load()
	if err != nil || initial.OnboardingCompleted || initial.SelectedModel != "" || initial.Language != "en" {
		t.Fatalf("unexpected first-run state: %+v, %v", initial, err)
	}

	want := AppConfig{OnboardingCompleted: true, SelectedModel: "small", Language: "es"}
	if err := Save(want); err != nil {
		t.Fatal(err)
	}
	got, err := Load()
	if err != nil || got != want {
		t.Fatalf("unexpected saved state: %+v, %v", got, err)
	}

	data, err := os.ReadFile(filepath.Join(base, appDirectory, fileName))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "{\n  \"onboardingCompleted\": true,\n  \"selectedModel\": \"small\",\n  \"language\": \"es\"\n}\n" {
		t.Fatalf("unexpected config JSON: %s", data)
	}

	installed := AppConfig{OnboardingCompleted: true, SelectedModel: "base", Language: "en"}
	if err := Save(installed); err != nil {
		t.Fatal(err)
	}
	got, err = Load()
	if err != nil || got != installed {
		t.Fatalf("unexpected installed state: %+v, %v", got, err)
	}
}

func TestLoadLegacyConfigDefaultsToEnglish(t *testing.T) {
	base := t.TempDir()
	if runtime.GOOS == "windows" {
		t.Setenv("APPDATA", base)
	} else {
		t.Setenv("XDG_CONFIG_HOME", base)
	}
	filePath := filepath.Join(base, appDirectory, fileName)
	if err := os.MkdirAll(filepath.Dir(filePath), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filePath, []byte(`{"onboardingCompleted":true,"modelInstalled":true}`), 0600); err != nil {
		t.Fatal(err)
	}
	got, err := Load()
	if err != nil || got.Language != "en" || !got.OnboardingCompleted || got.SelectedModel != "" {
		t.Fatalf("unexpected legacy state: %+v, %v", got, err)
	}
}
