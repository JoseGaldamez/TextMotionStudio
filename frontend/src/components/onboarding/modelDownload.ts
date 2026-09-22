export type ModelStatus = 'not-installed' | 'downloading' | 'installed' | 'error';

export const modelDetails = {
    name: 'Balanced',
    sizeMB: 512,
    displaySize: '~500 MB',
} as const;

// Replace this adapter with Wails download progress events when the model backend is ready.
export function startModelDownload(onProgress: (percent: number) => void, onComplete: () => void): () => void {
    let percent = 0;
    const timer = window.setInterval(() => {
        percent = Math.min(100, percent + 4);
        onProgress(percent);
        if (percent === 100) {
            window.clearInterval(timer);
            onComplete();
        }
    }, 100);
    return () => window.clearInterval(timer);
}
