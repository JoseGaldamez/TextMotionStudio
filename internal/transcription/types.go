package transcription

type WordTimestamp struct {
	ID         string  `json:"id"`
	Text       string  `json:"text"`
	Start      float64 `json:"start"`
	End        float64 `json:"end"`
	Confidence float64 `json:"confidence,omitempty"`
}

type CaptionGroup struct {
	ID    string          `json:"id"`
	Start float64         `json:"start"`
	End   float64         `json:"end"`
	Words []WordTimestamp `json:"words"`
}

type Result struct {
	Language         string          `json:"language"`
	DetectedLanguage string          `json:"detectedLanguage,omitempty"`
	Model            string          `json:"model"`
	Words            []WordTimestamp `json:"words"`
	CaptionGroups    []CaptionGroup  `json:"captionGroups"`
}

type Progress struct {
	Stage    string `json:"stage"`
	Progress *int   `json:"progress,omitempty"`
	Message  string `json:"message,omitempty"`
}
