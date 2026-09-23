export interface Caption { id: string; text: string; start: number; end: number; }
export interface CaptionStyle {
    id: string;
    name: string;
    description: string;
    category?: 'trending' | 'punchy' | 'minimal' | 'karaoke' | 'cinematic' | 'custom';
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
export interface VideoProject { videoName: string | null; videoUrl: string | null; captions: Caption[]; selectedStyle: CaptionStyle; captionSize: number; captionPosition: number; }

