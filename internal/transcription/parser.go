package transcription

import (
	"encoding/json"
	"fmt"
	"os"
)

type rawToken struct {
	Text                   string
	Start, End, Confidence float64
}

type whisperJSON struct {
	Result struct {
		Language string `json:"language"`
	} `json:"result"`
	Transcription []struct {
		Tokens []struct {
			Text    string `json:"text"`
			Offsets struct {
				From int64 `json:"from"`
				To   int64 `json:"to"`
			} `json:"offsets"`
			Timestamps struct {
				From string `json:"from"`
				To   string `json:"to"`
			} `json:"timestamps"`
			Probability float64 `json:"p"`
		} `json:"tokens"`
	} `json:"transcription"`
}

func ParseJSON(path string) ([]WordTimestamp, string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, "", err
	}
	var document whisperJSON
	if err := json.Unmarshal(data, &document); err != nil {
		return nil, "", fmt.Errorf("parse whisper JSON: %w", err)
	}
	var tokens []rawToken
	for _, segment := range document.Transcription {
		for _, token := range segment.Tokens {
			if token.Offsets.To <= token.Offsets.From {
				continue
			}
			tokens = append(tokens, rawToken{Text: token.Text, Start: float64(token.Offsets.From) / 1000, End: float64(token.Offsets.To) / 1000, Confidence: token.Probability})
		}
	}
	return NormalizeTokens(tokens), document.Result.Language, nil
}
