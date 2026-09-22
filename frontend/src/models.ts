export interface Caption { id: string; text: string; start: number; end: number; }
export interface CaptionStyle { id: 'modern' | 'bold' | 'karaoke' | 'minimal' | 'pop'; name: string; description: string; }
export interface VideoProject { videoName: string | null; videoUrl: string | null; captions: Caption[]; selectedStyle: CaptionStyle; }
