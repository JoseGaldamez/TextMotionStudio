import {useEffect, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import type {Caption} from '../models';
import {SearchIcon} from './Icons';
import {getCopy, type Language} from '../i18n';

interface Props {
    videoFile: File | null;
    captions: Caption[];
    activeCaptionId: string;
    currentTime: number;
    videoDuration: number;
    onSeek: (time: number) => void;
    onCaptionSelect: (id: string) => void;
    language: Language;
}

interface AudioAnalysis {
    file: File;
    status: 'loading' | 'ready' | 'unavailable';
    waveform: number[];
    duration: number;
}

const barCount = 160;
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function extractWaveform(audio: AudioBuffer): number[] {
    const channels = Array.from({length: audio.numberOfChannels}, (_, index) => audio.getChannelData(index));
    const levels = Array.from({length: barCount}, (_, index) => {
        const start = Math.floor(index * audio.length / barCount);
        const end = Math.max(start + 1, Math.floor((index + 1) * audio.length / barCount));
        const stride = Math.max(1, Math.floor((end - start) / 200));
        let sum = 0;
        let count = 0;
        for (let sample = start; sample < end; sample += stride) {
            for (const channel of channels) {
                const value = channel[sample] ?? 0;
                sum += value * value;
                count++;
            }
        }
        return Math.sqrt(sum / Math.max(1, count));
    });
    const maximum = Math.max(...levels);
    return levels.map(level => maximum === 0 ? 2 : Math.max(2, Math.round(2 + Math.sqrt(level / maximum) * 37)));
}

export function Timeline({videoFile, captions, activeCaptionId, currentTime, videoDuration, onSeek, onCaptionSelect, language}: Props) {
    const copy = getCopy(language).timeline;
    const [activeTab, setActiveTab] = useState<'captions' | 'timeline'>('captions');
    const [showWaveform, setShowWaveform] = useState(true);
    const [zoom, setZoom] = useState(50);
    const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    useEffect(() => {
        if (!videoFile) {
            setAnalysis(null);
            return;
        }
        let cancelled = false;
        setAnalysis({file: videoFile, status: 'loading', waveform: [], duration: 0});
        const analyze = async () => {
            let context: AudioContext | null = null;
            try {
                const data = await videoFile.arrayBuffer();
                if (cancelled) return;
                context = new AudioContext();
                const audio = await context.decodeAudioData(data);
                if (!cancelled) setAnalysis({file: videoFile, status: 'ready', waveform: extractWaveform(audio), duration: audio.duration});
            } catch {
                if (!cancelled) setAnalysis({file: videoFile, status: 'unavailable', waveform: [], duration: 0});
            } finally {
                if (context) void context.close();
            }
        };
        void analyze();
        return () => {cancelled = true};
    }, [videoFile]);

    const currentAnalysis = analysis?.file === videoFile ? analysis : null;
    const zoomScale = Math.pow(3, (zoom - 50) / 50);
    const duration = videoDuration > 0 ? videoDuration : currentAnalysis?.duration ?? 0;
    const ticks = Array.from({length: 6}, (_, index) => formatTime(duration * index / 5));
    const playheadPercent = duration > 0 ? Math.max(0, Math.min(100, currentTime / duration * 100)) : 0;
    const seekFromPointer = (clientX: number) => {
        if (duration <= 0 || !trackRef.current) return;
        const bounds = trackRef.current.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
        onSeek(fraction * duration);
    };
    const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const moveWithKeyboard = (key: string, shiftKey: boolean) => {
        const step = Math.max(0.1, duration / 100) * (shiftKey ? 5 : 1);
        if (key === 'ArrowLeft') onSeek(currentTime - step);
        else if (key === 'ArrowRight') onSeek(currentTime + step);
        else if (key === 'Home') onSeek(0);
        else if (key === 'End') onSeek(duration);
        else return false;
        return true;
    };

    return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[15px] border border-[#222b39] bg-[#101620] px-[14px] pt-3 pb-[13px] [@media(max-height:820px)]:pt-2" aria-label={copy.label}>
        <header className="flex h-[46px] shrink-0 items-start justify-between gap-5 [@media(max-height:820px)]:h-10">
            <div className="flex gap-[3px]">{(['captions', 'timeline'] as const).map(tab => <button key={tab} className={`h-[35px] cursor-pointer rounded-[9px] px-[15px] text-[#96a1b3] ${activeTab === tab ? 'bg-[#263044] text-foreground' : ''}`} onClick={() => setActiveTab(tab)}>{tab === 'captions' ? copy.edit : copy.timeline}</button>)}</div>
            <div className="flex items-center gap-[11px] text-[11px] text-[#aab4c4] max-[1320px]:gap-[7px]">
                <button className="grid size-[31px] cursor-pointer place-items-center rounded-lg hover:enabled:bg-[#202939] hover:enabled:text-white disabled:opacity-40" aria-label={copy.search} disabled={captions.length === 0}><SearchIcon/></button>
                <label className={`flex items-center gap-[7px] whitespace-nowrap max-[1320px]:text-[0px] ${videoFile ? 'cursor-pointer' : 'opacity-40'}`}><input className="peer absolute opacity-0" type="checkbox" checked={showWaveform} disabled={!videoFile} onChange={event => setShowWaveform(event.target.checked)}/><span className="toggle-switch relative h-[19px] w-[34px] rounded-full bg-[#343d4d] p-[2px] transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#958aff]"/>{copy.waveform}</label>
                <span className="text-xl font-light">−</span><input aria-label={copy.zoom} aria-valuetext={`${zoomScale.toFixed(1)}×`} title={`${zoomScale.toFixed(1)}×`} className="zoom h-1 w-[76px] cursor-pointer rounded-[10px] bg-[#30394a] accent-primary disabled:opacity-40" type="range" min="0" max="100" value={zoom} disabled={!videoFile} onChange={event => setZoom(Number(event.target.value))}/><span className="text-xl font-light">+</span>
            </div>
        </header>
        <div className="timeline-scroll min-h-0 flex-1 overflow-auto" style={{'--timeline-scale': `${zoomScale}`} as CSSProperties}>
            {videoFile && <>
                <div ref={trackRef} className={`relative h-full w-[calc(100%*var(--timeline-scale))] touch-none ${duration > 0 ? 'cursor-crosshair' : ''}`} onPointerDown={event => {
                    if (duration <= 0 || (event.target instanceof Element && event.target.closest('[data-caption]'))) return;
                    draggingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    seekFromPointer(event.clientX);
                }} onPointerMove={event => {if (draggingRef.current) seekFromPointer(event.clientX)}} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
                    {duration > 0 && <><div className="flex h-[25px] justify-between text-[10px] text-[#768195]">{ticks.map((tick, index) => <span key={index}>{tick}</span>)}</div><div className="tick-line mx-1 -mt-2 mb-1 h-2 opacity-75"/></>}
                    {duration > 0 && captions.length > 0 && <div className="relative h-12">{captions.filter(caption => caption.start < duration && caption.end > 0).map(caption => {
                        const start = Math.max(0, caption.start);
                        const end = Math.min(duration, caption.end);
                        return <button key={caption.id} data-caption type="button" className={`absolute top-0 h-12 cursor-pointer overflow-hidden rounded-[9px] border px-[10px] text-ellipsis whitespace-nowrap text-[11px] text-[#e3e7ee] hover:bg-[#252e40] ${activeCaptionId === caption.id ? 'border-[#7669ff] bg-[#5f52e7] shadow-[0_7px_17px_rgba(72,57,206,.22)]' : 'border-transparent bg-[#1d2533]'}`} style={{left: `${start / duration * 100}%`, width: `${(end - start) / duration * 100}%`}} onClick={() => onCaptionSelect(caption.id)}>{caption.text}</button>;
                    })}</div>}
                    {currentAnalysis?.status === 'loading' && <p className="mt-5 text-sm text-muted" role="status">{copy.analyzing}</p>}
                    {currentAnalysis?.status === 'unavailable' && <p className="mt-5 text-sm text-muted" role="status">{copy.unavailable}</p>}
                    {showWaveform && currentAnalysis?.status === 'ready' && <div className={`flex h-12 items-center gap-px overflow-hidden rounded-lg bg-[#1b2240] px-[3px] py-1 ${captions.length > 0 ? 'mt-2' : 'mt-3'}`} role="img" aria-label={copy.audioWaveform}>{currentAnalysis.waveform.map((height, index) => <i className="min-w-0 flex-1 rounded-sm bg-[#786bff] opacity-90" key={index} style={{height: `${height}px`}}/>)}</div>}
                    {duration > 0 && <div role="slider" tabIndex={0} aria-label={copy.playhead} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(currentTime * 10) / 10} aria-valuetext={formatTime(currentTime)} className="absolute top-0 bottom-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize focus-visible:rounded focus-visible:outline-2 focus-visible:outline-highlight" style={{left: `clamp(6px, ${playheadPercent}%, calc(100% - 6px))`}} onKeyDown={event => {if (moveWithKeyboard(event.key, event.shiftKey)) event.preventDefault()}}><span className="absolute top-0 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-[#101620] bg-white"/><span className="absolute top-2 bottom-0 left-1/2 w-px -translate-x-1/2 bg-white/90"/></div>}
                </div>
            </>}
        </div>
    </section>;
}
