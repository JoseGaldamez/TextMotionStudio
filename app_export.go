package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"TextMotionStudio/internal/runtimeassets"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type videoExportJob struct {
	mu       sync.Mutex
	cancel   context.CancelFunc
	ctx      context.Context
	input    string
	output   string
	temp     string
	ffmpeg   string
	format   string
	width    int
	height   int
	duration float64
	frames   []float64
	running  bool
}

type VideoExportStart struct {
	Output string `json:"output"`
}

func (a *App) StartVideoExport(videoPath string, width, height int, duration float64) (VideoExportStart, error) {
	return a.startVideoExport(videoPath, width, height, duration, "mp4")
}

func (a *App) StartVideoExportWithFormat(videoPath string, width, height int, duration float64, format string) (VideoExportStart, error) {
	return a.startVideoExport(videoPath, width, height, duration, format)
}

func (a *App) startVideoExport(videoPath string, width, height int, duration float64, format string) (VideoExportStart, error) {
	if width < 1 || height < 1 || width > 8192 || height > 8192 || duration <= 0 || duration > 21600 {
		return VideoExportStart{}, errors.New("Invalid video dimensions or duration.")
	}
	if format != "mp4" && format != "mov" {
		return VideoExportStart{}, errors.New("Unsupported export format.")
	}
	a.videoMu.RLock()
	valid := false
	for _, path := range a.videos {
		if path == videoPath {
			valid = true
			break
		}
	}
	a.videoMu.RUnlock()
	if !valid {
		return VideoExportStart{}, errors.New("Please select a local video first.")
	}
	if _, err := os.Stat(videoPath); err != nil {
		return VideoExportStart{}, err
	}
	executable, err := os.Executable()
	if err != nil {
		return VideoExportStart{}, err
	}
	resources, err := runtimeassets.Resolve(filepath.Dir(executable), a.ctx.Value("buildtype") == "dev")
	if err != nil {
		return VideoExportStart{}, fmt.Errorf("FFmpeg is unavailable: %w", err)
	}
	a.exportMu.Lock()
	if a.exportJob != nil {
		a.exportMu.Unlock()
		return VideoExportStart{}, errors.New("A video export is already running.")
	}
	a.exportMu.Unlock()
	name := strings.TrimSuffix(filepath.Base(videoPath), filepath.Ext(videoPath)) + "_captioned." + format
	label := "MP4 video"
	if format == "mov" {
		label = "QuickTime ProRes video"
	}
	output, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{Title: "Export video", DefaultFilename: name, Filters: []runtime.FileFilter{{DisplayName: label, Pattern: "*." + format}}})
	if err != nil || output == "" {
		return VideoExportStart{}, err
	}
	if !strings.EqualFold(filepath.Ext(output), "."+format) {
		output += "." + format
	}
	if filepath.Clean(output) == filepath.Clean(videoPath) {
		return VideoExportStart{}, errors.New("Choose a different output file from the source video.")
	}
	if _, err := os.Stat(output); err == nil {
		return VideoExportStart{}, errors.New("The output file already exists. Choose a different name.")
	} else if !os.IsNotExist(err) {
		return VideoExportStart{}, err
	}
	temp, err := os.MkdirTemp(filepath.Dir(output), ".textmotion-export-")
	if err != nil {
		return VideoExportStart{}, err
	}
	ctx, cancel := context.WithCancel(a.ctx)
	job := &videoExportJob{cancel: cancel, ctx: ctx, input: videoPath, output: output, temp: temp, ffmpeg: resources.FFmpegPath, format: format, width: width, height: height, duration: duration}
	a.exportMu.Lock()
	if a.exportJob != nil {
		a.exportMu.Unlock()
		cancel()
		os.RemoveAll(temp)
		return VideoExportStart{}, errors.New("A video export is already running.")
	}
	a.exportJob = job
	a.exportMu.Unlock()
	return VideoExportStart{Output: output}, nil
}

func (a *App) AddVideoExportFrame(pngBase64 string, duration float64) error {
	a.exportMu.Lock()
	job := a.exportJob
	a.exportMu.Unlock()
	if job == nil {
		return errors.New("No video export is active.")
	}
	job.mu.Lock()
	defer job.mu.Unlock()
	if job.ctx.Err() != nil {
		return errors.New("Video export was canceled.")
	}
	if job.running || duration <= 0 || duration > job.duration || len(job.frames) >= 10000 || len(pngBase64) > 24<<20 {
		return errors.New("Invalid export frame.")
	}
	data, err := base64.StdEncoding.DecodeString(pngBase64)
	if err != nil {
		return err
	}
	decoded, err := png.Decode(bytes.NewReader(data))
	if err != nil || decoded.Bounds().Dx() != job.width || decoded.Bounds().Dy() != job.height {
		return errors.New("Invalid caption image dimensions.")
	}
	file := filepath.Join(job.temp, fmt.Sprintf("%06d.qoi", len(job.frames)))
	if err := os.WriteFile(file, encodeQOI(decoded), 0600); err != nil {
		return err
	}
	job.frames = append(job.frames, duration)
	return nil
}

func (a *App) FinishVideoExport() (string, error) {
	a.exportMu.Lock()
	job := a.exportJob
	a.exportMu.Unlock()
	if job == nil {
		return "", errors.New("No video export is active.")
	}
	job.mu.Lock()
	if job.running || len(job.frames) == 0 {
		job.mu.Unlock()
		return "", errors.New("No caption frames are ready.")
	}
	job.running = true
	job.mu.Unlock()
	defer a.clearVideoExport(job)
	var list strings.Builder
	for index, seconds := range job.frames {
		fmt.Fprintf(&list, "file '%06d.qoi'\nduration %.9f\n", index, seconds)
	}
	fmt.Fprintf(&list, "file '%06d.qoi'\n", len(job.frames)-1)
	if err := os.WriteFile(filepath.Join(job.temp, "frames.ffconcat"), []byte(list.String()), 0600); err != nil {
		return "", err
	}
	partial := filepath.Join(job.temp, "result."+job.format)
	filter := "[1:v]format=rgba[caption];[0:v][caption]overlay=0:0:format=auto:eof_action=pass[v]"
	args := []string{"-hide_banner", "-loglevel", "error", "-nostdin", "-progress", "pipe:1", "-i", job.input, "-f", "concat", "-safe", "0", "-i", filepath.Join(job.temp, "frames.ffconcat"), "-filter_complex", filter, "-map", "[v]", "-map", "0:a?", "-fps_mode:v", "passthrough"}
	if job.format == "mp4" {
		args = append(args, "-c:v", "mpeg4", "-q:v", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart")
	} else {
		args = append(args, "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuv444p10le", "-c:a", "pcm_s24le")
	}
	args = append(args, "-y", partial)
	cmd := exec.CommandContext(job.ctx, job.ffmpeg, args...)
	cmd.Dir = job.temp
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Start(); err != nil {
		return "", err
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "out_time_us=") {
				continue
			}
			micros, parseErr := strconv.ParseFloat(strings.TrimPrefix(line, "out_time_us="), 64)
			if parseErr == nil && job.duration > 0 {
				percent := int(micros / (job.duration * 1e6) * 100)
				if percent > 99 {
					percent = 99
				}
				if percent < 0 {
					percent = 0
				}
				runtime.EventsEmit(a.ctx, "video:export:progress", percent)
			}
		}
	}()
	err = cmd.Wait()
	<-done
	if job.ctx.Err() != nil {
		return "", errors.New("Video export was canceled.")
	}
	if err != nil {
		return "", fmt.Errorf("FFmpeg export failed: %s", strings.TrimSpace(stderr.String()))
	}
	if err := os.Rename(partial, job.output); err != nil {
		return "", err
	}
	runtime.EventsEmit(a.ctx, "video:export:progress", 100)
	return job.output, nil
}

func (a *App) CancelVideoExport() {
	a.exportMu.Lock()
	job := a.exportJob
	a.exportMu.Unlock()
	if job == nil {
		return
	}
	job.cancel()
	job.mu.Lock()
	running := job.running
	job.mu.Unlock()
	if !running {
		a.clearVideoExport(job)
	}
}

// QOI keeps the browser-rendered RGBA pixels lossless and is supported by the
// approved FFmpeg build, which has no PNG decoder.
func encodeQOI(source image.Image) []byte {
	bounds := source.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	pixels, ok := source.(*image.NRGBA)
	if !ok || bounds.Min.X != 0 || bounds.Min.Y != 0 {
		pixels = image.NewNRGBA(image.Rect(0, 0, width, height))
		draw.Draw(pixels, pixels.Bounds(), source, bounds.Min, draw.Src)
	}
	output := make([]byte, 0, width*height/4+22)
	output = append(output, 'q', 'o', 'i', 'f')
	var size [8]byte
	binary.BigEndian.PutUint32(size[:4], uint32(width))
	binary.BigEndian.PutUint32(size[4:], uint32(height))
	output = append(output, size[:]...)
	output = append(output, 4, 0)
	previous := [4]byte{0, 0, 0, 255}
	run := 0
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			offset := y*pixels.Stride + x*4
			current := [4]byte{pixels.Pix[offset], pixels.Pix[offset+1], pixels.Pix[offset+2], pixels.Pix[offset+3]}
			if current == previous {
				run++
				if run == 62 || (y == height-1 && x == width-1) {
					output = append(output, byte(0xc0|run-1))
					run = 0
				}
				continue
			}
			if run > 0 {
				output = append(output, byte(0xc0|run-1))
				run = 0
			}
			if current[3] == previous[3] {
				output = append(output, 0xfe, current[0], current[1], current[2])
			} else {
				output = append(output, 0xff, current[0], current[1], current[2], current[3])
			}
			previous = current
		}
	}
	output = append(output, 0, 0, 0, 0, 0, 0, 0, 1)
	return output
}

func (a *App) clearVideoExport(job *videoExportJob) {
	a.exportMu.Lock()
	if a.exportJob == job {
		a.exportJob = nil
	}
	a.exportMu.Unlock()
	job.cancel()
	_ = os.RemoveAll(job.temp)
}
