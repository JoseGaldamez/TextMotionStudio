import {useEffect, useRef, useState} from 'react';
import type {VideoProject} from '../../models';
import {AddVideoExportFrame, CancelVideoExport, FinishVideoExport, OpenExportLocation, StartVideoExportWithFormat} from '../../../wailsjs/go/main/App';
import {EventsOn} from '../../../wailsjs/runtime/runtime';
import {buildExportFrames, createCaptionFrameRenderer} from '../../exportFrames';
import {DownloadIcon, CheckIcon} from '../Icons';
import type {Language} from '../../i18n';

interface Props {project: VideoProject; language: Language; onBackToEdit: () => void}
interface Metadata {width: number; height: number; duration: number}

export function VideoExportView({project, language, onBackToEdit}: Props) {
    const es = language === 'es';
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState('');
    const [device, setDevice] = useState<'nvidia' | 'gpu' | 'cpu' | 'system' | null>(null);
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const active = useRef(false);
    const canceled = useRef(false);

    useEffect(() => {
        if (!project.videoUrl) {setMetadata(null); return}
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => setMetadata({width: video.videoWidth, height: video.videoHeight, duration: video.duration});
        video.onerror = () => setMetadata(null);
        video.src = project.videoUrl;
        return () => {video.removeAttribute('src'); video.load()};
    }, [project.videoUrl]);

    useEffect(() => () => {
        if (active.current) void CancelVideoExport();
    }, []);

    const cancel = () => {
        canceled.current = true;
        void CancelVideoExport();
    };

    const openExportLocation = async () => {
        try {
            await OpenExportLocation(output);
        } catch (reason) {
            setError(`${es ? 'No se pudo abrir la ubicación del video' : 'Could not open the video location'}: ${String(reason)}`);
        }
    };

    const exportVideo = async () => {
        if (!project.videoPath || !metadata || busy) return;
        setError('');
        setOutput('');
        setProgress(0);
        setDevice(null);
        setBusy(true);
        canceled.current = false;
        const off = EventsOn('video:export:progress', (percent: number) => {setPhase(es ? 'Codificando video…' : 'Encoding video…'); setProgress(20 + Math.round(percent * .8))});
        const offDevice = EventsOn('video:export:device', (value: 'nvidia' | 'gpu' | 'cpu' | 'system') => setDevice(value));
        let started = false;
        let renderer: Awaited<ReturnType<typeof createCaptionFrameRenderer>> | null = null;
        try {
            const selection = await StartVideoExportWithFormat(project.videoPath, metadata.width, metadata.height, metadata.duration, 'mp4');
            if (!selection?.output) return;
            started = true;
            active.current = true;
            renderer = await createCaptionFrameRenderer(project, metadata.width, metadata.height);
            const frames = buildExportFrames(project.captions, metadata.duration);
            setPhase(es ? 'Preparando subtítulos…' : 'Preparing captions…');
            for (let index = 0; index < frames.length; index++) {
                if (canceled.current) throw new Error(es ? 'Exportación cancelada.' : 'Export canceled.');
                const image = await renderer.render(frames[index]);
                await AddVideoExportFrame(image, frames[index].duration);
                setProgress(Math.round((index + 1) / frames.length * 20));
            }
            renderer.close();
            renderer = null;
            if (canceled.current) throw new Error(es ? 'Exportación cancelada.' : 'Export canceled.');
            setPhase(es ? 'Codificando video…' : 'Encoding video…');
            const saved = await FinishVideoExport();
            started = false;
            active.current = false;
            setOutput(saved);
            setProgress(100);
        } catch (reason) {
            if (!canceled.current) setError(String(reason));
        } finally {
            renderer?.close();
            if (started) await CancelVideoExport();
            active.current = false;
            off();
            offDevice();
            setBusy(false);
        }
    };

    const available = Boolean(project.videoPath && metadata && Number.isFinite(metadata.duration) && metadata.duration > 0);
    return <div className="flex h-full flex-1 overflow-y-auto bg-[#0d121b] p-8 text-white">
        <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-start justify-between gap-4">
                <div><span className="text-xs font-bold uppercase tracking-widest text-primary">{es ? 'Exportación local' : 'Local export'}</span><h1 className="mt-2 text-3xl font-black">{es ? 'Exportar video' : 'Export video'}</h1><p className="mt-2 text-sm text-[#a5b2c4]">{es ? 'El video se renderiza en este equipo con los subtítulos de la vista previa.' : 'The video is rendered on this computer with the captions shown in the preview.'}</p></div>
                <button type="button" onClick={onBackToEdit} className="rounded-xl border border-[#344056] px-4 py-2 text-xs font-bold hover:bg-[#1d2637]">{es ? 'Volver al editor' : 'Back to editor'}</button>
            </div>

            <div className="mt-8 rounded-2xl border border-[#283448] bg-[#131c2a] p-6">
                <h2 className="text-lg font-bold">{project.videoName ?? (es ? 'Sin video' : 'No video')}</h2>
                <div className="mt-5 rounded-xl border border-primary bg-primary/10 p-4 text-left"><strong className="block text-sm">MP4 · H.264</strong><span className="mt-1 block text-xs text-[#9daabd]">{es ? 'Codificado con los componentes de Windows; usa aceleración de hardware si está disponible.' : 'Encoded with Windows components; uses hardware acceleration when available.'}</span></div>
                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                    <div><span className="block text-xs text-[#8190a5]">{es ? 'Formato' : 'Format'}</span><strong>MP4 · H.264</strong></div>
                    <div><span className="block text-xs text-[#8190a5]">{es ? 'Resolución' : 'Resolution'}</span><strong>{metadata ? `${metadata.width} × ${metadata.height}` : '—'}</strong></div>
                    <div><span className="block text-xs text-[#8190a5]">{es ? 'Audio' : 'Audio'}</span><strong>AAC 320 kb/s</strong></div>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-[#96a5b9]">{es ? 'Conserva la resolución y los tiempos del original. La exportación continúa por CPU si no hay codificador de hardware.' : 'Keeps the source resolution and timing. Export continues on CPU if no hardware encoder is available.'}</p>
                {!available && <p className="mt-4 text-sm text-amber-300" role="status">{es ? 'Selecciona un video local y espera a que cargue para exportarlo.' : 'Select a local video and wait for it to load before exporting.'}</p>}
                {project.videoPath && !metadata && <a className="mt-2 inline-block text-xs text-primary underline" href="https://support.microsoft.com/es-es/windows/experience/platform-variants/media-feature-pack-for-windows-n" target="_blank" rel="noreferrer">{es ? '¿Windows N? Instala los componentes multimedia de Microsoft' : 'Windows N? Install Microsoft media components'}</a>}
                {error && <p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}
                {error.includes('Media Feature Pack') && <a className="mt-2 inline-block text-sm text-primary underline" href="https://support.microsoft.com/es-es/windows/experience/platform-variants/media-feature-pack-for-windows-n" target="_blank" rel="noreferrer">{es ? 'Instalar componentes multimedia de Windows N' : 'Install Windows N media components'}</a>}
                {output && <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300" role="status"><CheckIcon className="size-5 shrink-0"/><span className="min-w-0 flex-1">{es ? 'Video guardado en' : 'Video saved to'} <strong className="break-all">{output}</strong></span><button type="button" onClick={() => void openExportLocation()} className="shrink-0 rounded-lg border border-emerald-400/40 px-3 py-2 font-semibold hover:bg-emerald-500/15">{es ? 'Abrir ubicación' : 'Open location'}</button></div>}
                {busy && <div className="mt-5" role="status"><div className="mb-2 flex justify-between text-xs text-[#a9b8cb]"><span>{phase}{device ? ` · ${device === 'system' ? (es ? 'Códec de Windows' : 'Windows codec') : device === 'nvidia' ? 'NVIDIA GPU' : device === 'gpu' ? 'GPU' : 'CPU'}` : ''}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#273247]"><div className="h-full bg-primary transition-[width]" style={{width: `${progress}%`}}/></div></div>}
                <div className="mt-6 flex gap-3">
                    <button type="button" onClick={() => void exportVideo()} disabled={!available || busy} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><DownloadIcon className="size-4"/>{es ? 'Exportar video' : 'Export video'}</button>
                    {busy && <button type="button" onClick={cancel} className="rounded-xl border border-[#344056] px-5 py-3 text-sm font-bold hover:bg-[#1d2637]">{es ? 'Cancelar' : 'Cancel'}</button>}
                </div>
            </div>
        </div>
    </div>;
}
