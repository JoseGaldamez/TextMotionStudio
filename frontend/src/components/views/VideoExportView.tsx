import {useEffect, useRef, useState} from 'react';
import type {VideoProject} from '../../models';
import {AddVideoExportFrame, CancelVideoExport, FinishVideoExport, StartVideoExportWithFormat} from '../../../wailsjs/go/main/App';
import {EventsOn} from '../../../wailsjs/runtime/runtime';
import {buildExportFrames, createCaptionFrameRenderer} from '../../exportFrames';
import {DownloadIcon, CheckIcon} from '../Icons';
import type {Language} from '../../i18n';

interface Props {project: VideoProject; language: Language; onBackToEdit: () => void}
interface Metadata {width: number; height: number; duration: number}

export function VideoExportView({project, language, onBackToEdit}: Props) {
    const es = language === 'es';
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [format, setFormat] = useState<'mp4' | 'mov'>('mp4');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState('');
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

    const exportVideo = async () => {
        if (!project.videoPath || !metadata || busy) return;
        setError('');
        setOutput('');
        setProgress(0);
        setBusy(true);
        canceled.current = false;
        const off = EventsOn('video:export:progress', (percent: number) => {setPhase(es ? 'Codificando video…' : 'Encoding video…'); setProgress(20 + Math.round(percent * .8))});
        let started = false;
        let renderer: Awaited<ReturnType<typeof createCaptionFrameRenderer>> | null = null;
        try {
            const selection = await StartVideoExportWithFormat(project.videoPath, metadata.width, metadata.height, metadata.duration, format);
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
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label={es ? 'Formato de exportación' : 'Export format'}>
                    <button type="button" disabled={busy} onClick={() => setFormat('mp4')} aria-pressed={format === 'mp4'} className={`rounded-xl border p-4 text-left disabled:opacity-50 ${format === 'mp4' ? 'border-primary bg-primary/10' : 'border-[#344056] hover:border-[#6a63a9]'}`}><strong className="block text-sm">MP4 · MPEG-4 Parte 2</strong><span className="mt-1 block text-xs text-[#9daabd]">{es ? 'Archivo .mp4 de alta calidad. Algunas plataformas requieren H.264.' : 'High-quality .mp4 file. Some platforms require H.264.'}</span></button>
                    <button type="button" disabled={busy} onClick={() => setFormat('mov')} aria-pressed={format === 'mov'} className={`rounded-xl border p-4 text-left disabled:opacity-50 ${format === 'mov' ? 'border-primary bg-primary/10' : 'border-[#344056] hover:border-[#6a63a9]'}`}><strong className="block text-sm">MOV · ProRes 4444</strong><span className="mt-1 block text-xs text-[#9daabd]">{es ? 'Máster de mayor fidelidad para edición; archivo grande.' : 'Higher fidelity editing master; large file.'}</span></button>
                </div>
                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                    <div><span className="block text-xs text-[#8190a5]">{es ? 'Formato' : 'Format'}</span><strong>{format === 'mp4' ? 'MP4 · MPEG-4 Parte 2' : 'MOV · ProRes 4444'}</strong></div>
                    <div><span className="block text-xs text-[#8190a5]">{es ? 'Resolución' : 'Resolution'}</span><strong>{metadata ? `${metadata.width} × ${metadata.height}` : '—'}</strong></div>
                    <div><span className="block text-xs text-[#8190a5]">{es ? 'Audio' : 'Audio'}</span><strong>{format === 'mp4' ? 'AAC 320 kb/s' : 'PCM 24-bit'}</strong></div>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-[#96a5b9]">{format === 'mp4' ? (es ? 'Conserva la resolución y los tiempos del original. Este FFmpeg no incluye H.264; algunas plataformas podrían no aceptar su códec MPEG-4 Parte 2.' : 'Keeps the source resolution and timing. This FFmpeg build has no H.264 encoder; some platforms may not accept MPEG-4 Part 2.') : (es ? 'Conserva la resolución y los tiempos del original. ProRes prioriza la fidelidad visual y genera un archivo grande.' : 'Keeps the source resolution and timing. ProRes prioritizes visual fidelity and creates a large file.')}</p>
                {!available && <p className="mt-4 text-sm text-amber-300" role="status">{es ? 'Selecciona un video local y espera a que cargue para exportarlo.' : 'Select a local video and wait for it to load before exporting.'}</p>}
                {error && <p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}
                {output && <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300" role="status"><CheckIcon className="size-5 shrink-0"/><span>{es ? 'Video guardado en' : 'Video saved to'} <strong className="break-all">{output}</strong></span></div>}
                {busy && <div className="mt-5" role="status"><div className="mb-2 flex justify-between text-xs text-[#a9b8cb]"><span>{phase}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#273247]"><div className="h-full bg-primary transition-[width]" style={{width: `${progress}%`}}/></div></div>}
                <div className="mt-6 flex gap-3">
                    <button type="button" onClick={() => void exportVideo()} disabled={!available || busy} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><DownloadIcon className="size-4"/>{es ? 'Exportar video' : 'Export video'}</button>
                    {busy && <button type="button" onClick={cancel} className="rounded-xl border border-[#344056] px-5 py-3 text-sm font-bold hover:bg-[#1d2637]">{es ? 'Cancelar' : 'Cancel'}</button>}
                </div>
            </div>
        </div>
    </div>;
}
