package transcription

import (
	"fmt"
	"strings"
	"unicode"
)

const DefaultMaxWordGap = 0.65

func BuildCaptionGroups(words []WordTimestamp, maxGap float64) []CaptionGroup {
	groups := make([]CaptionGroup, 0, (len(words)+2)/3)
	for start := 0; start < len(words); {
		end := start + 1
		for end < len(words) && words[end].Start-words[end-1].End <= maxGap {
			end++
		}
		for i := start; i < end; {
			size := 3
			remaining := end - i
			if remaining == 4 {
				size = 4
			} else if remaining < 3 {
				size = remaining
			}
			groupWords := append([]WordTimestamp(nil), words[i:i+size]...)
			groups = append(groups, CaptionGroup{ID: fmt.Sprintf("caption-%d", len(groups)+1), Start: groupWords[0].Start, End: groupWords[len(groupWords)-1].End, Words: groupWords})
			i += size
		}
		start = end
	}
	return groups
}

func isTrailingPunctuation(s string) bool {
	return s != "" && strings.IndexFunc(s, func(r rune) bool { return !strings.ContainsRune(".,:;!?\"'”’", r) }) == -1
}

func isLeadingPunctuation(s string) bool {
	return s != "" && strings.IndexFunc(s, func(r rune) bool { return !strings.ContainsRune("¿¡\"'“‘", r) }) == -1
}

// NormalizeTokens merges whisper tokens into editable words. Leading whitespace starts
// a new word; subword tokens are joined, and punctuation never becomes a caption alone.
func NormalizeTokens(tokens []rawToken) []WordTimestamp {
	words := make([]WordTimestamp, 0, len(tokens))
	prefix := ""
	for _, token := range tokens {
		raw := token.Text
		text := strings.TrimSpace(raw)
		if text == "" || strings.HasPrefix(text, "[") && strings.HasSuffix(text, "]") {
			continue
		}
		if isLeadingPunctuation(text) {
			prefix += text
			continue
		}
		if isTrailingPunctuation(text) {
			if len(words) > 0 {
				words[len(words)-1].Text += text
			}
			continue
		}
		startsWord := len(words) == 0 || len(raw) > 0 && unicode.IsSpace(rune(raw[0]))
		if startsWord {
			words = append(words, WordTimestamp{Text: prefix + text, Start: token.Start, End: token.End, Confidence: token.Confidence})
			prefix = ""
		} else {
			words[len(words)-1].Text += text
			words[len(words)-1].End = token.End
			if token.Confidence > 0 && (words[len(words)-1].Confidence == 0 || token.Confidence < words[len(words)-1].Confidence) {
				words[len(words)-1].Confidence = token.Confidence
			}
		}
	}
	if prefix != "" && len(words) > 0 {
		words[len(words)-1].Text += prefix
	}
	for i := range words {
		words[i].ID = fmt.Sprintf("word-%d", i+1)
	}
	return words
}
