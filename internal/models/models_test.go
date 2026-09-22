package models

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestProgressJSONUsesFrontendFieldNames(t *testing.T) {
	data, err := json.Marshal(Progress{ModelID: "small", BytesDownloaded: 67, TotalBytes: 100, BytesPerSecond: 12, Percentage: 67})
	if err != nil {
		t.Fatal(err)
	}
	var event map[string]any
	if err := json.Unmarshal(data, &event); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"modelId", "bytesDownloaded", "totalBytes", "bytesPerSecond", "percentage"} {
		if _, ok := event[key]; !ok {
			t.Fatalf("progress event missing %q: %s", key, data)
		}
	}
}

func testConfigHome(t *testing.T) {
	base := t.TempDir()
	if runtime.GOOS == "windows" {
		t.Setenv("APPDATA", base)
	} else {
		t.Setenv("XDG_CONFIG_HOME", base)
	}
}

func testDefinition(data []byte, url string) Definition {
	sum := sha1.Sum(data)
	return Definition{ID: "small", Name: "Balanced", FileName: "ggml-small.bin", URL: url, SHA1: hex.EncodeToString(sum[:]), SizeBytes: int64(len(data)), DisplaySize: "test"}
}

func TestInstalledSelectionAndCorruption(t *testing.T) {
	testConfigHome(t)
	dir := t.TempDir()
	data := []byte("valid model bytes")
	def := testDefinition(data, "")
	m := NewWith(dir, []Definition{def}, http.DefaultClient, nil)
	if err := os.WriteFile(filepath.Join(dir, def.FileName), data, 0600); err != nil {
		t.Fatal(err)
	}
	list, err := m.List()
	if err != nil || list[0].Status != "installed" {
		t.Fatalf("expected installed: %+v %v", list, err)
	}
	if err := m.Select(def.ID); err != nil {
		t.Fatal(err)
	}
	path, err := m.SelectedPath()
	if err != nil || !filepath.IsAbs(path) {
		t.Fatalf("bad selected path %q: %v", path, err)
	}
	if err := os.WriteFile(path, []byte("corrupt"), 0600); err != nil {
		t.Fatal(err)
	}
	list, err = m.List()
	if err != nil || list[0].Status != "not-installed" {
		t.Fatalf("corrupt model accepted: %+v %v", list, err)
	}
	if _, err = m.SelectedPath(); !errors.Is(err, ErrNoSelectedModel) {
		t.Fatalf("expected typed missing error, got %v", err)
	}
}

func TestDownloadValidatesRenamesAndCleansTemporaryFile(t *testing.T) {
	testConfigHome(t)
	data := []byte("downloaded model data")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write(data) }))
	defer server.Close()
	dir := t.TempDir()
	def := testDefinition(data, server.URL)
	done := make(chan string, 4)
	m := NewWith(dir, []Definition{def}, server.Client(), func(name string, _ any) {
		if name != "model:download:progress" {
			done <- name
		}
	})
	if err := m.Download(def.ID); err != nil {
		t.Fatal(err)
	}
	select {
	case event := <-done:
		if event != "model:download:completed" {
			t.Fatalf("unexpected event %s", event)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("download timed out")
	}
	if _, err := os.Stat(filepath.Join(dir, def.FileName)); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, def.FileName+".download")); !os.IsNotExist(err) {
		t.Fatalf("temporary file remains: %v", err)
	}
}

func TestBadDownloadIsRemoved(t *testing.T) {
	testConfigHome(t)
	expected := []byte("expected model data")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("bad payload data!!")) }))
	defer server.Close()
	dir := t.TempDir()
	def := testDefinition(expected, server.URL)
	done := make(chan string, 4)
	m := NewWith(dir, []Definition{def}, server.Client(), func(name string, _ any) {
		if name != "model:download:progress" {
			done <- name
		}
	})
	if err := m.Download(def.ID); err != nil {
		t.Fatal(err)
	}
	select {
	case event := <-done:
		if event != "model:download:error" {
			t.Fatalf("unexpected event %s", event)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("download timed out")
	}
	if _, err := os.Stat(filepath.Join(dir, def.FileName+".download")); !os.IsNotExist(err) {
		t.Fatalf("temporary file remains: %v", err)
	}
}

func TestCancelRemovesTemporaryFile(t *testing.T) {
	testConfigHome(t)
	started := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "1024")
		_, _ = w.Write([]byte("partial"))
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
		close(started)
		<-r.Context().Done()
	}))
	defer server.Close()
	dir := t.TempDir()
	def := testDefinition(make([]byte, 1024), server.URL)
	done := make(chan string, 4)
	m := NewWith(dir, []Definition{def}, server.Client(), func(name string, _ any) {
		if name != "model:download:progress" {
			done <- name
		}
	})
	if err := m.Download(def.ID); err != nil {
		t.Fatal(err)
	}
	<-started
	m.Cancel(def.ID)
	select {
	case event := <-done:
		if event != "model:download:canceled" {
			t.Fatalf("unexpected event %s", event)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("cancel timed out")
	}
	if _, err := os.Stat(filepath.Join(dir, def.FileName+".download")); !os.IsNotExist(err) {
		t.Fatalf("temporary file remains: %v", err)
	}
}
