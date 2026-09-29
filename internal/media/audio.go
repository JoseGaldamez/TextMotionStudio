package media

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"runtime"
)

func ExtractAudio(ctx context.Context, tool, video, output string) error {
	args := []string{"-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output}
	if runtime.GOOS == "windows" {
		args = []string{"extract", video, output}
	}
	cmd := exec.CommandContext(ctx, tool, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("media decode: %w: %s", err, stderr.String())
	}
	return nil
}
