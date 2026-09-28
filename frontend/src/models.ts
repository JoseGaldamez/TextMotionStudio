export interface CaptionWord { id: string; text: string; start: number; end: number; confidence?: number; }
export interface Caption { id: string; start: number; end: number; words: CaptionWord[]; text: string; }
export interface Transcription { language: string; detectedLanguage?: string; model: string; words: CaptionWord[]; captionGroups: Caption[]; }
export interface CaptionStyle {
    id: string;
    name: string;
    description: string;
    category?: 'trending' | 'punchy' | 'minimal' | 'karaoke' | 'cinematic' | 'custom';
    revealMode?: 'all' | 'progressive' | 'single';
    sampleWord?: string;
    sampleSentence?: string;
    bgPreviewClass?: string;
    textPreviewClass?: string;
    highlightColor?: string;
    textColor?: string;
    badgeText?: string;
    fontFamily?: string;
    fontSize?: number;
    letterSpacing?: number;
    hasBgPill?: boolean;
    bgPillColor?: string;
    textShadow?: string;
    isCustom?: boolean;
    createdAt?: number;
}
export interface VideoProject { videoName: string | null; videoUrl: string | null; videoPath: string | null; captions: Caption[]; transcription?: Transcription; selectedStyle: CaptionStyle; captionSize: number; captionPosition: number; }
