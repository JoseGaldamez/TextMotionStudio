package transcription

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "result.json")
	data := `{"result":{"language":"es"},"transcription":[{"tokens":[{"text":" Hola","offsets":{"from":1200,"to":1580},"p":0.9},{"text":",","offsets":{"from":1580,"to":1600},"p":0.8},{"text":" mundo","offsets":{"from":1600,"to":2000},"p":0.95}]}]}`
	if err := os.WriteFile(path, []byte(data), 0600); err != nil {
		t.Fatal(err)
	}
	words, language, err := ParseJSON(path)
	if err != nil || language != "es" || len(words) != 2 || words[0].Text != "Hola," || words[0].Start != 1.2 {
		t.Fatalf("unexpected parse: %#v %q %v", words, language, err)
	}
}
