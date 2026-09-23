package transcription

import "testing"

func TestNormalizeTokensAndPunctuation(t *testing.T) {
	got := NormalizeTokens([]rawToken{{Text: " Hello", Start: 0, End: .4}, {Text: ",", Start: .4, End: .5}, {Text: " world", Start: .5, End: .9}, {Text: "!", Start: .9, End: 1}})
	if len(got) != 2 || got[0].Text != "Hello," || got[1].Text != "world!" {
		t.Fatalf("unexpected words: %#v", got)
	}
}

func TestNormalizeSubwordTokens(t *testing.T) {
	got := NormalizeTokens([]rawToken{{Text: " cap", Start: 0, End: .2}, {Text: "tion", Start: .2, End: .5}})
	if len(got) != 1 || got[0].Text != "caption" || got[0].End != .5 {
		t.Fatalf("unexpected word: %#v", got)
	}
}

func TestBuildCaptionGroups(t *testing.T) {
	words := []WordTimestamp{{Text: "one", Start: 0, End: .2}, {Text: "two", Start: .2, End: .4}, {Text: "three", Start: .4, End: .6}, {Text: "four", Start: .6, End: .8}, {Text: "five", Start: .8, End: 1}}
	got := BuildCaptionGroups(words, DefaultMaxWordGap)
	if len(got) != 2 || len(got[0].Words) != 3 || len(got[1].Words) != 2 {
		t.Fatalf("unexpected groups: %#v", got)
	}
}

func TestBuildCaptionGroupsSplitsAtGap(t *testing.T) {
	words := []WordTimestamp{{Text: "one", Start: 1, End: 2}, {Text: "two", Start: 2, End: 3}, {Text: "three", Start: 4, End: 5}}
	if got := BuildCaptionGroups(words, DefaultMaxWordGap); len(got) != 2 || len(got[0].Words) != 2 || len(got[1].Words) != 1 {
		t.Fatalf("expected gap split: %#v", got)
	}
}

func TestBuildCaptionGroupsBalancesRemainder(t *testing.T) {
	for count, want := range map[int][]int{
		2: {2}, 3: {3}, 4: {4}, 6: {3, 3}, 7: {3, 4}, 8: {3, 3, 2}, 10: {3, 3, 4},
	} {
		words := make([]WordTimestamp, count)
		for i := range words {
			words[i] = WordTimestamp{Start: float64(i), End: float64(i + 1)}
		}
		got := BuildCaptionGroups(words, DefaultMaxWordGap)
		if len(got) != len(want) {
			t.Fatalf("%d words: got %d groups, want %d", count, len(got), len(want))
		}
		for i, group := range got {
			if len(group.Words) != want[i] {
				t.Fatalf("%d words: group %d has %d words, want %d", count, i, len(group.Words), want[i])
			}
		}
	}
}
