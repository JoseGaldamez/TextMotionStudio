import {useEffect, useRef, useState} from 'react';
import {DeleteModel} from '../wailsjs/go/main/App';
import {cancelDownload, downloadModel, listModels, selectModel, subscribeToModelDownloads, type DownloadProgress, type ModelInfo} from './components/onboarding/modelDownload';

export function useLocalModels() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [progressById, setProgressById] = useState<Record<string, DownloadProgress>>({});
    const [error, setError] = useState('');
    const lastUpdate = useRef<Record<string, {time: number; percent: number}>>({});

    const refresh = async () => {
        try {
            setModels(await listModels());
        } catch (reason) {
            setError(String(reason));
        }
    };

    useEffect(() => {
        void refresh();
        return subscribeToModelDownloads({
            progress: value => {
                const now = performance.now();
                const previous = lastUpdate.current[value.modelId];
                const percent = Math.floor(value.percentage);
                if (!value.validating && previous && percent === previous.percent && now - previous.time < 250) return;
                lastUpdate.current[value.modelId] = {time: now, percent};
                setProgressById(current => ({...current, [value.modelId]: value}));
            },
            completed: value => {setProgressById(current => {const next = {...current}; delete next[value.modelId]; return next}); void refresh()},
            error: value => {setError(value.message); setProgressById(current => {const next = {...current}; delete next[value.modelId]; return next}); void refresh()},
            canceled: value => {setProgressById(current => {const next = {...current}; delete next[value.modelId]; return next}); void refresh()},
        });
    }, []);

    const act = async (action: () => Promise<unknown>) => {
        setError('');
        try {
            await action();
            await refresh();
        } catch (reason) {
            setError(String(reason));
        }
    };

    return {
        models, progressById, error,
        select: (id: string) => act(() => selectModel(id)),
        download: (id: string) => act(() => downloadModel(id)),
        cancel: (id: string) => act(() => cancelDownload(id)),
        remove: (id: string) => act(() => DeleteModel(id)),
    };
}
