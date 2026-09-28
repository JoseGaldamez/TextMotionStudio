import type {Caption, VideoProject} from './models';
import {findActiveCaption, getActiveWord} from './captionTiming';
import {drawCaption} from './captionCanvas';

export interface ExportFrame {caption: Caption | undefined; activeWordID: string; visibleWordCount: number; duration: number}

export function buildExportFrames(captions: Caption[], duration: number): ExportFrame[] {
    const boundaries = new Set<number>([0, duration]);
    for (const caption of captions) {
        for (const time of [caption.start, caption.end, ...caption.words.flatMap(word => [word.start, word.end])]) {
            if (time > 0 && time < duration) boundaries.add(time);
        }
    }
    const times = [...boundaries].sort((a, b) => a - b);
    const frames: ExportFrame[] = [];
    for (let index = 0; index < times.length - 1; index++) {
        const length = times[index + 1] - times[index];
        if (length <= 0) continue;
        const time = times[index] + length / 2;
        const caption = findActiveCaption(captions, time);
        const activeWordID = getActiveWord(caption, time)?.id ?? '';
        const visibleWordCount = caption?.words.filter(word => word.start <= time).length ?? 0;
        const previous = frames.at(-1);
        if (previous && previous.caption?.id === caption?.id && previous.activeWordID === activeWordID && previous.visibleWordCount === visibleWordCount) previous.duration += length;
        else frames.push({caption, activeWordID, visibleWordCount, duration: length});
    }
    return frames;
}

export async function createCaptionFrameRenderer(project: VideoProject, width: number, height: number) {
    await document.fonts.load('800 48px Nunito');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable.');
    return {
        async render(frame: ExportFrame): Promise<string> {
            drawCaption(context, {caption: frame.caption, activeWordID: frame.activeWordID, visibleWordCount: frame.visibleWordCount, style: project.selectedStyle, size: project.captionSize, position: project.captionPosition, width, height});
            return canvas.toDataURL('image/png').split(',')[1];
        },
        close() { canvas.width = 0; canvas.height = 0 },
    };
}
