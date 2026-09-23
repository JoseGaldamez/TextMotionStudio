package models

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"TextMotionStudio/internal/config"
)

const safetyMargin int64 = 100 * 1024 * 1024

var ErrNoSelectedModel = errors.New("no valid transcription model is selected")

type Definition struct {
	ID, Name, FileName, URL, SHA1, DisplaySize, Description string
	SizeBytes                                               int64
	Recommended                                             bool
	ResourceNote                                            string
}

var Definitions = []Definition{
	{ID: "base", Name: "Fast", FileName: "ggml-base.bin", URL: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin", SHA1: "465707469ff3a37a2b9b8d8f89f2f99de7299dac", SizeBytes: 147951465, DisplaySize: "~142 MiB", Description: "Fastest download and lower resource usage. Good for quick captions."},
	{ID: "small", Name: "Balanced", FileName: "ggml-small.bin", URL: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin", SHA1: "55356645c2b361a969dfd0ef2c5a50d530afd8d5", SizeBytes: 487601967, DisplaySize: "~466 MiB", Description: "The best balance between transcription quality, speed and download size.", Recommended: true},
	{ID: "medium", Name: "Accurate", FileName: "ggml-medium.bin", URL: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin", SHA1: "fd9727b6e1217c2f614f9b698455c4ffd82463b4", SizeBytes: 1533774781, DisplaySize: "~1.5 GiB", Description: "Better transcription quality for difficult audio, at the cost of more disk space and processing time.", ResourceNote: "Requires more resources"},
}

type Info struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DisplaySize  string `json:"displaySize"`
	Description  string `json:"description"`
	Status       string `json:"status"`
	ResourceNote string `json:"resourceNote,omitempty"`
	SizeBytes    int64  `json:"sizeBytes"`
	Recommended  bool   `json:"recommended"`
	Selected     bool   `json:"selected"`
}

type Progress struct {
	ModelID         string  `json:"modelId"`
	BytesDownloaded int64   `json:"bytesDownloaded"`
	TotalBytes      int64   `json:"totalBytes"`
	BytesPerSecond  int64   `json:"bytesPerSecond"`
	Percentage      float64 `json:"percentage"`
}

type EventSink func(string, any)

type Manager struct {
	dir         string
	client      *http.Client
	definitions []Definition
	emit        EventSink
	mu          sync.Mutex
	cancels     map[string]context.CancelFunc
}

func New(directory string, emit EventSink) *Manager {
	return NewWith(directory, Definitions, http.DefaultClient, emit)
}

func NewWith(directory string, definitions []Definition, client *http.Client, emit EventSink) *Manager {
	return &Manager{dir: directory, definitions: definitions, client: client, emit: emit, cancels: make(map[string]context.CancelFunc)}
}

func (m *Manager) definition(id string) (Definition, error) {
	for _, d := range m.definitions {
		if d.ID == id {
			return d, nil
		}
	}
	return Definition{}, fmt.Errorf("unknown model %q", id)
}

func (m *Manager) path(d Definition) string { return filepath.Join(m.dir, d.FileName) }

func (m *Manager) valid(d Definition) bool {
	return validFile(m.path(d), d)
}

func validFile(path string, d Definition) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || info.Size() < d.SizeBytes*9/10 {
		return false
	}
	h := sha1.New()
	if _, err = io.Copy(h, f); err != nil {
		return false
	}
	return hex.EncodeToString(h.Sum(nil)) == d.SHA1
}

func (m *Manager) List() ([]Info, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	result := make([]Info, 0, len(m.definitions))
	for _, d := range m.definitions {
		status := "not-installed"
		installed := m.valid(d)
		if installed {
			status = "installed"
		}
		m.mu.Lock()
		_, downloading := m.cancels[d.ID]
		m.mu.Unlock()
		if downloading {
			status = "downloading"
		}
		result = append(result, Info{ID: d.ID, Name: d.Name, DisplaySize: d.DisplaySize, Description: d.Description, Status: status, SizeBytes: d.SizeBytes, Recommended: d.Recommended, Selected: installed && cfg.SelectedModel == d.ID, ResourceNote: d.ResourceNote})
	}
	return result, nil
}

func (m *Manager) Download(id string) error {
	d, err := m.definition(id)
	if err != nil {
		return err
	}
	if m.valid(d) {
		m.emitEvent("model:download:completed", map[string]any{"modelId": id})
		return nil
	}
	if err := os.MkdirAll(m.dir, 0700); err != nil {
		return err
	}
	available, err := availableDiskSpace(m.dir)
	if err != nil {
		return err
	}
	if available < d.SizeBytes+safetyMargin {
		return fmt.Errorf("not enough disk space to download this model (approximately %s plus 100 MiB required)", d.DisplaySize)
	}
	m.mu.Lock()
	if _, exists := m.cancels[id]; exists {
		m.mu.Unlock()
		return nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	m.cancels[id] = cancel
	m.mu.Unlock()
	go m.download(ctx, d)
	return nil
}

func (m *Manager) download(ctx context.Context, d Definition) {
	tmp := m.path(d) + ".download"
	defer os.Remove(tmp)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, d.URL, nil)
	if err != nil {
		m.fail(d.ID, err)
		return
	}
	resp, err := m.client.Do(req)
	if err != nil {
		if errors.Is(ctx.Err(), context.Canceled) {
			_ = os.Remove(tmp)
			m.finish(d.ID, "model:download:canceled", map[string]any{"modelId": d.ID})
			return
		}
		m.fail(d.ID, errors.New("Download interrupted. Check your internet connection and try again."))
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		m.fail(d.ID, fmt.Errorf("download failed with HTTP %s", resp.Status))
		return
	}
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		m.fail(d.ID, err)
		return
	}
	total := resp.ContentLength
	if total <= 0 {
		total = d.SizeBytes
	}
	started := time.Now()
	var downloaded int64
	buf := make([]byte, 256*1024)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, err = f.Write(buf[:n]); err != nil {
				readErr = err
			}
			downloaded += int64(n)
			elapsed := time.Since(started).Seconds()
			speed := int64(0)
			if elapsed > 0 {
				speed = int64(float64(downloaded) / elapsed)
			}
			m.emitEvent("model:download:progress", Progress{ModelID: d.ID, BytesDownloaded: downloaded, TotalBytes: total, BytesPerSecond: speed, Percentage: float64(downloaded) * 100 / float64(total)})
		}
		if readErr != nil {
			err = readErr
			break
		}
	}
	if closeErr := f.Close(); err == io.EOF {
		err = closeErr
	}
	if err != nil {
		if errors.Is(ctx.Err(), context.Canceled) {
			_ = os.Remove(tmp)
			m.finish(d.ID, "model:download:canceled", map[string]any{"modelId": d.ID})
		} else {
			m.fail(d.ID, errors.New("Download interrupted. Check your internet connection and try again."))
		}
		return
	}
	m.emitEvent("model:download:progress", map[string]any{"modelId": d.ID, "bytesDownloaded": downloaded, "totalBytes": total, "percentage": 100, "validating": true})
	if !m.validTemporary(d, tmp) {
		_ = os.Remove(tmp)
		m.fail(d.ID, errors.New("The downloaded model failed validation. Please try again."))
		return
	}
	_ = os.Remove(m.path(d))
	if err := os.Rename(tmp, m.path(d)); err != nil {
		m.fail(d.ID, err)
		return
	}
	m.finish(d.ID, "model:download:completed", map[string]any{"modelId": d.ID})
}

func (m *Manager) validTemporary(d Definition, path string) bool { return validFile(path, d) }
func (m *Manager) emitEvent(name string, payload any) {
	if m.emit != nil {
		m.emit(name, payload)
	}
}
func (m *Manager) fail(id string, err error) {
	m.finish(id, "model:download:error", map[string]any{"modelId": id, "message": err.Error()})
}
func (m *Manager) finish(id, name string, payload any) {
	m.mu.Lock()
	delete(m.cancels, id)
	m.mu.Unlock()
	m.emitEvent(name, payload)
}

func (m *Manager) Cancel(id string) {
	m.mu.Lock()
	cancel := m.cancels[id]
	m.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (m *Manager) Delete(id string) error {
	d, err := m.definition(id)
	if err != nil {
		return err
	}
	m.Cancel(id)
	if err := os.Remove(m.path(d)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	_ = os.Remove(m.path(d) + ".download")
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.SelectedModel == id {
		cfg.SelectedModel = ""
		return config.Save(cfg)
	}
	return nil
}

func (m *Manager) Select(id string) error {
	d, err := m.definition(id)
	if err != nil {
		return err
	}
	if !m.valid(d) {
		return fmt.Errorf("model %q is not installed or is corrupt", id)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	cfg.SelectedModel = id
	return config.Save(cfg)
}
func (m *Manager) SelectedPath() (string, error) {
	p, _, err := m.Selected()
	return p, err
}
func (m *Manager) Selected() (string, string, error) {
	cfg, err := config.Load()
	if err != nil {
		return "", "", err
	}
	if cfg.SelectedModel == "" {
		return "", "", ErrNoSelectedModel
	}
	d, err := m.definition(cfg.SelectedModel)
	if err != nil || !m.valid(d) {
		return "", "", ErrNoSelectedModel
	}
	p, err := filepath.Abs(m.path(d))
	return p, d.ID, err
}
