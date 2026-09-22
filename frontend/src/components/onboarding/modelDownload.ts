import {CancelModelDownload, DownloadModel, ListModels, SelectModel} from '../../../wailsjs/go/main/App';
import {EventsOn} from '../../../wailsjs/runtime/runtime';
import type {models} from '../../../wailsjs/go/models';

export type ModelStatus = 'not-installed' | 'downloading' | 'validating' | 'installed' | 'error';
export type ModelInfo = models.Info;
export interface DownloadProgress {modelId: string; bytesDownloaded: number; totalBytes: number; percentage: number; bytesPerSecond?: number; validating?: boolean}

export const listModels = () => ListModels();
export const downloadModel = (id: string) => DownloadModel(id);
export const cancelDownload = (id: string) => CancelModelDownload(id);
export const selectModel = (id: string) => SelectModel(id);

export function subscribeToModelDownloads(handlers: {progress: (value: DownloadProgress) => void; completed: (value: {modelId: string}) => void; error: (value: {modelId: string; message: string}) => void; canceled: (value: {modelId: string}) => void}) {
    const cleanups = [EventsOn('model:download:progress', handlers.progress), EventsOn('model:download:completed', handlers.completed), EventsOn('model:download:error', handlers.error), EventsOn('model:download:canceled', handlers.canceled)];
    return () => cleanups.forEach(cleanup => cleanup());
}
