package main

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/wailsapp/wails/v2/pkg/assetserver"
	assetoptions "github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

func TestLocalVideoBypassesFrontendDevServer(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sample.mp4")
	if err := os.WriteFile(path, []byte("video data"), 0600); err != nil {
		t.Fatal(err)
	}
	app := &App{videos: map[string]string{"selected": path}}
	frontend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("<html>Vite fallback</html>"))
	}))
	defer frontend.Close()
	frontendURL, err := url.Parse(frontend.URL)
	if err != nil {
		t.Fatal(err)
	}
	handler := assetserver.NewExternalAssetsHandler(nil, assetoptions.Options{Middleware: app.videoAssetMiddleware}, frontendURL)
	request := httptest.NewRequest(http.MethodGet, "/local-video/selected", nil)
	request.Header.Set("Range", "bytes=0-4")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusPartialContent || response.Body.String() != "video" {
		t.Fatalf("video range response: status %d body %q", response.Code, response.Body.String())
	}
}

func TestRegisterVideoFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sample.mp4")
	if err := os.WriteFile(path, []byte("video data"), 0600); err != nil {
		t.Fatal(err)
	}
	app := NewApp()
	selected, err := app.RegisterVideoFile(path)
	if err != nil || selected["path"] != path || selected["name"] != "sample.mp4" {
		t.Fatalf("selected video: %#v, %v", selected, err)
	}
	if app.videos[selected["url"][len("/local-video/"):]] != path {
		t.Fatal("video token was not registered")
	}
	if _, err := app.RegisterVideoFile(filepath.Join(t.TempDir(), "invalid.txt")); err == nil {
		t.Fatal("non-video file was accepted")
	}
}
