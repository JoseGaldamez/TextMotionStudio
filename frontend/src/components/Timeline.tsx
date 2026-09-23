import {useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import type {Caption} from '../models';
import {SearchIcon} from './Icons';
import {getCopy, type Language} from '../i18n';

interface Props {
    videoFile: File | null;
    captions: Caption[];
    activeCaptionId: string;
    currentTime: number;
    videoDuration: number;
    isPlaying?: boolean;
    onSeek: (time: number) => void;
    onCaptionSelect: (id: string) => void;
    onTogglePlay?: () => void;
    language: Language;
}

interface AudioAnalysis {
    file: File;
    status: 'loading' | 'ready' | 'unavailable';
    waveform: number[];
    duration: number;
}

const analysisCache = new Map<string, AudioAnalysis>();
const zoomCache = new Map<string, number>();

const getFileKey = (file: File) => `${file.name}_${file.size}_${file.lastModified}`;

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function extractWaveform(audio: AudioBuffer): number[] {
    const ch0 = audio.getChannelData(0);
    const ch1 = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
    const totalSamples = audio.length;

    // High density sampling: ~50 samples per second, min 2000, max 60,000
    const sampleCount = Math.max(2000, Math.min(60000, Math.round(audio.duration * 50)));
    const blockSize = Math.max(1, Math.floor(totalSamples / sampleCount));

    const levels = new Float32Array(sampleCount);
    let maxVal = 0;

    for (let i = 0; i < sampleCount; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, totalSamples);
        const stride = Math.max(1, Math.floor((end - start) / 80));
        let sum = 0;
        let count = 0;

        for (let j = start; j < end; j += stride) {
            const val0 = ch0[j] ?? 0;
            const val1 = ch1 ? (ch1[j] ?? 0) : val0;
            const sample = (val0 + val1) * 0.5;
            sum += sample * sample;
            count++;
        }

        const rms = Math.sqrt(sum / Math.max(1, count));
        levels[i] = rms;
        if (rms > maxVal) maxVal = rms;
    }

    const result: number[] = new Array(sampleCount);
    const invMax = maxVal > 0 ? 1 / maxVal : 0;
    for (let i = 0; i < sampleCount; i++) {
        result[i] = maxVal === 0 ? 0 : Math.min(1, levels[i] * invMax);
    }
    return result;
}

interface AudioWaveformProps {
    peaks: number[];
    duration: number;
    zoomScale: number;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    trackRef: React.RefObject<HTMLDivElement | null>;
    captionsCount: number;
    label: string;
}

function AudioWaveform({peaks, duration, zoomScale, scrollContainerRef, trackRef, captionsCount, label}: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const renderWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        const container = scrollContainerRef.current;
        const track = trackRef.current;
        if (!canvas || !container || !track || duration <= 0 || peaks.length === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const scrollLeft = container.scrollLeft;
        const clientWidth = container.clientWidth;
        const trackWidth = track.clientWidth || (clientWidth * zoomScale);
        if (trackWidth <= 0 || clientWidth <= 0) return;

        // Viewport buffer for smooth scrolling
        const buffer = 160;
        const viewStart = Math.max(0, scrollLeft - buffer);
        const viewEnd = Math.min(trackWidth, scrollLeft + clientWidth + buffer);
        const canvasWidth = Math.max(10, viewEnd - viewStart);
        const canvasHeight = 48;

        canvas.style.transform = `translateX(${viewStart}px)`;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        const pixelWidth = Math.round(canvasWidth * dpr);
        const pixelHeight = Math.round(canvasHeight * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Subtle center baseline guide
        ctx.fillStyle = 'rgba(120, 107, 255, 0.12)';
        ctx.fillRect(0, canvasHeight / 2 - 0.5, canvasWidth, 1);

        // Studio vertical gradient for thin bars
        const gradient = ctx.createLinearGradient(0, 4, 0, canvasHeight - 4);
        gradient.addColorStop(0, '#9e91ff');
        gradient.addColorStop(0.35, '#7b6dff');
        gradient.addColorStop(0.7, '#6758f5');
        gradient.addColorStop(1, '#5343e8');
        ctx.fillStyle = gradient;

        // Ultra-thin high-definition bars: 1.5px width, 1.2px gap
        const barWidth = 1.5;
        const barGap = 1.2;
        const barStep = barWidth + barGap;
        const numBars = Math.floor(canvasWidth / barStep);
        const maxBarHeight = canvasHeight - 8;

        for (let i = 0; i < numBars; i++) {
            const xInCanvas = i * barStep;
            const xInTrack = viewStart + xInCanvas;
            const time = (xInTrack / trackWidth) * duration;
            if (time < 0 || time > duration) continue;

            const peakIndex = Math.min(peaks.length - 1, Math.max(0, Math.floor((time / duration) * peaks.length)));
            const level = peaks[peakIndex] ?? 0;

            const barHeight = Math.max(2, Math.round(Math.sqrt(level) * maxBarHeight));
            const y = Math.round((canvasHeight - barHeight) / 2);

            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(xInCanvas, y, barWidth, barHeight, 0.75);
                ctx.fill();
            } else {
                ctx.fillRect(xInCanvas, y, barWidth, barHeight);
            }
        }

        ctx.restore();
    }, [duration, peaks, zoomScale, scrollContainerRef, trackRef]);

    useEffect(() => {
        renderWaveform();
    }, [renderWaveform]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        let rafId: number | null = null;
        const onScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(renderWaveform);
        };
        container.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            container.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [renderWaveform, scrollContainerRef]);

    return (
        <div
            className={`relative h-12 w-full overflow-hidden rounded-lg border border-[#232c3f]/80 bg-[#121824] py-1 shadow-inner ${captionsCount > 0 ? 'mt-2' : 'mt-3'}`}
            role="img"
            aria-label={label}
        >
            <canvas
                ref={canvasRef}
                className="pointer-events-none absolute top-0 left-0 block will-change-transform"
            />
        </div>
    );
}

function WaveformSkeleton({captionsCount, label}: {captionsCount: number; label: string}) {
    const pattern = [
        6, 12, 20, 14, 28, 22, 10, 18, 32, 24, 16, 8, 14, 26, 36,
        28, 12, 18, 24, 30, 20, 10, 16, 26, 18, 8, 14, 22, 34, 16,
        12, 20, 28, 18, 10, 14, 26, 38, 24, 12, 18, 22, 16, 10, 6,
    ];

    return (
        <div
            className={`relative flex h-12 w-full items-center justify-between gap-[2px] overflow-hidden rounded-lg border border-[#232c3f]/80 bg-[#121824] px-2 py-1 shadow-inner select-none ${captionsCount > 0 ? 'mt-2' : 'mt-3'}`}
            role="status"
            aria-label={label}
        >
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#786bff]/10" />
            <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#8a7dff]/15 to-transparent" />
            <div className="flex h-full w-full items-center justify-between gap-[2px] opacity-40">
                {Array.from({length: 72}).map((_, i) => {
                    const h = pattern[i % pattern.length];
                    const delay = (i % 8) * 0.12;
                    return (
                        <span
                            key={i}
                            className="min-w-0 flex-1 rounded-sm bg-[#3f4d6b]"
                            style={{
                                height: `${h}px`,
                                animation: 'pulse 1.6s ease-in-out infinite',
                                animationDelay: `${delay}s`,
                            }}
                        />
                    );
                })}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full border border-[#2d3a50]/90 bg-[#101520]/85 px-3 py-1 shadow-[0_2px_12px_rgba(0,0,0,0.4)] backdrop-blur-md">
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#786bff] opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-[#8a7dff]" />
                    </span>
                    <span className="font-mono text-[11px] font-medium tracking-wide text-[#b4bfd4]">
                        {label}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function Timeline({videoFile, captions, activeCaptionId, currentTime, videoDuration, onSeek, onCaptionSelect, onTogglePlay, language}: Props) {
    const copy = getCopy(language).timeline;
    const fileKey = videoFile ? getFileKey(videoFile) : '';
    const [showWaveform, setShowWaveform] = useState(true);
    const [zoom, setZoomState] = useState(() => (fileKey ? zoomCache.get(fileKey) ?? 0 : 0));
    const [analysis, setAnalysis] = useState<AudioAnalysis | null>(() => {
        if (!fileKey) return null;
        return analysisCache.get(fileKey) ?? null;
    });
    const sectionRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    const setZoom = (value: number | ((prev: number) => number)) => {
        setZoomState(prev => {
            const next = typeof value === 'function' ? value(prev) : value;
            if (fileKey) zoomCache.set(fileKey, next);
            return next;
        });
    };

    useEffect(() => {
        if (!videoFile) {
            setAnalysis(null);
            return;
        }

        const key = getFileKey(videoFile);
        const cached = analysisCache.get(key);
        if (cached && cached.status === 'ready') {
            setAnalysis(cached);
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
                if (!cancelled) {
                    const ready: AudioAnalysis = {
                        file: videoFile,
                        status: 'ready',
                        waveform: extractWaveform(audio),
                        duration: audio.duration,
                    };
                    if (analysisCache.size >= 20) {
                        const firstKey = analysisCache.keys().next().value;
                        if (firstKey) analysisCache.delete(firstKey);
                    }
                    analysisCache.set(key, ready);
                    setAnalysis(ready);
                }
            } catch {
                if (!cancelled) {
                    const unavailable: AudioAnalysis = {
                        file: videoFile,
                        status: 'unavailable',
                        waveform: [],
                        duration: 0,
                    };
                    analysisCache.set(key, unavailable);
                    setAnalysis(unavailable);
                }
            } finally {
                if (context) void context.close();
            }
        };
        void analyze();
        return () => {cancelled = true};
    }, [videoFile]);

    const currentAnalysis = analysis && videoFile && getFileKey(analysis.file) === getFileKey(videoFile) ? analysis : null;
    const duration = videoDuration > 0 ? videoDuration : currentAnalysis?.duration ?? 0;

    // At zoom = 0%: zoomScale = 1.0 (entire video visible without horizontal scrollbar)
    // At zoom = 100%: visible window is 20 seconds (maxZoomScale = duration / 20)
    // For short videos under 20s, allow at least 3x zoom so small segments can still be magnified
    const maxZoomScale = duration > 0 ? Math.max(3, duration / 20) : 3;
    const zoomScale = duration > 0 ? Math.pow(maxZoomScale, zoom / 100) : 1;

    // Generate dynamic ticks proportional to zoom scale
    const tickCount = Math.max(6, Math.min(150, Math.round(6 * zoomScale)));
    const ticks = Array.from({length: tickCount}, (_, index) => {
        const fraction = tickCount > 1 ? index / (tickCount - 1) : 0;
        return {
            label: formatTime(duration * fraction),
            percent: fraction * 100,
        };
    });

    const playheadPercent = duration > 0 ? Math.max(0, Math.min(100, currentTime / duration * 100)) : 0;

    const lastWheelCursorRatioRef = useRef<{trackRatio: number; cursorOffset: number} | null>(null);

    // Keep playhead or mouse cursor centered when zooming
    useEffect(() => {
        if (!scrollContainerRef.current || duration <= 0 || zoomScale <= 1.02) return;
        const container = scrollContainerRef.current;
        if (lastWheelCursorRatioRef.current) {
            const {trackRatio, cursorOffset} = lastWheelCursorRatioRef.current;
            lastWheelCursorRatioRef.current = null;
            const newTrackWidth = container.clientWidth * zoomScale;
            container.scrollLeft = Math.max(0, trackRatio * newTrackWidth - cursorOffset);
        } else {
            const trackWidth = container.clientWidth * zoomScale;
            const playheadPx = (currentTime / duration) * trackWidth;
            container.scrollLeft = Math.max(0, playheadPx - container.clientWidth / 2);
        }
    }, [zoomScale, currentTime, duration]);

    // Zoom in/out with Ctrl + Wheel
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const handleWheel = (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                if (!videoFile || duration <= 0) return;

                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const rect = container.getBoundingClientRect();
                    const cursorOffset = Math.max(0, Math.min(container.clientWidth, event.clientX - rect.left));
                    const currentTrackWidth = container.clientWidth * zoomScale;
                    if (currentTrackWidth > 0) {
                        const trackRatio = Math.max(0, Math.min(1, (container.scrollLeft + cursorOffset) / currentTrackWidth));
                        lastWheelCursorRatioRef.current = {trackRatio, cursorOffset};
                    }
                }

                const step = Math.sign(-event.deltaY) * Math.max(1, Math.min(10, Math.round(Math.abs(event.deltaY) * 0.05)));
                setZoom(z => Math.max(0, Math.min(100, z + step)));
            }
        };

        section.addEventListener('wheel', handleWheel, {passive: false});
        return () => section.removeEventListener('wheel', handleWheel);
    }, [videoFile, duration, zoomScale]);

    // Keep playhead visible during playback/seeking when zoomed
    useEffect(() => {
        if (!scrollContainerRef.current || duration <= 0 || zoomScale <= 1.02) return;
        if (draggingRef.current) return;
        const container = scrollContainerRef.current;
        const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0;
        if (trackWidth <= 0) return;
        const playheadPx = (currentTime / duration) * trackWidth;
        const scrollLeft = container.scrollLeft;
        const clientWidth = container.clientWidth;
        if (playheadPx < scrollLeft + 30 || playheadPx > scrollLeft + clientWidth - 30) {
            container.scrollTo({
                left: Math.max(0, playheadPx - clientWidth / 2),
                behavior: 'smooth',
            });
        }
    }, [currentTime, duration, zoomScale]);

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

    const visibleSeconds = duration > 0 ? Math.round(duration / zoomScale) : 0;
    const zoomTitle = zoom === 0 ? `${zoomScale.toFixed(1)}× (100%)` : `${zoomScale.toFixed(1)}× (~${visibleSeconds}s)`;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.code === 'Space' || event.key === ' ') {
            const target = event.target as HTMLElement;
            const isTextInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text';
            if (isTextInput) return;
            event.preventDefault();
            event.stopPropagation();
            onTogglePlay?.();
        }
    };

    return <section
        ref={sectionRef}
        tabIndex={0}
        onPointerDown={event => {
            if (document.activeElement !== event.currentTarget && !(event.target as HTMLElement).closest('button, input, select')) {
                event.currentTarget.focus();
            }
        }}
        onKeyDown={handleKeyDown}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-[15px] border border-[#222b39] bg-[#101620] px-[14px] pt-3 pb-[13px] outline-none transition-colors focus-within:border-[#2f3b4e] [@media(max-height:820px)]:pt-2"
        aria-label={copy.label}
    >
        <header className="flex h-[46px] shrink-0 items-center justify-between gap-5 [@media(max-height:820px)]:h-10">
            <div className="flex h-[35px] items-center px-1">
                <h2 className="text-sm font-bold tracking-tight text-[#e1e7f0] select-none">{copy.timeline}</h2>
            </div>
            <div className="flex items-center gap-[11px] text-[11px] text-[#aab4c4] max-[1320px]:gap-[7px]">
                <button className="grid size-[31px] cursor-pointer place-items-center rounded-lg hover:enabled:bg-[#202939] hover:enabled:text-white disabled:opacity-40" aria-label={copy.search} disabled={captions.length === 0}><SearchIcon/></button>
                <label className={`flex items-center gap-[7px] whitespace-nowrap max-[1320px]:text-[0px] ${videoFile ? 'cursor-pointer' : 'opacity-40'}`}><input className="peer absolute opacity-0" type="checkbox" checked={showWaveform} disabled={!videoFile} onChange={event => setShowWaveform(event.target.checked)}/><span className="toggle-switch relative h-[19px] w-[34px] rounded-full bg-[#343d4d] p-[2px] transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#958aff]"/>{copy.waveform}</label>
                <button type="button" onClick={() => setZoom(z => Math.max(0, z - 10))} disabled={!videoFile || zoom <= 0} className="cursor-pointer text-xl font-light leading-none text-[#aab4c4] hover:text-white disabled:opacity-30 select-none">−</button>
                <input aria-label={copy.zoom} aria-valuetext={zoomTitle} title={zoomTitle} className="zoom h-1 w-[80px] cursor-pointer rounded-[10px] bg-[#30394a] accent-primary disabled:opacity-40" type="range" min="0" max="100" value={zoom} disabled={!videoFile} onChange={event => setZoom(Number(event.target.value))}/>
                <button type="button" onClick={() => setZoom(z => Math.min(100, z + 10))} disabled={!videoFile || zoom >= 100} className="cursor-pointer text-xl font-light leading-none text-[#aab4c4] hover:text-white disabled:opacity-30 select-none">+</button>
                <span className="min-w-[32px] text-right font-mono text-[10px] text-[#8e99aa] select-none" title={zoomTitle}>{zoom === 0 ? '100%' : `~${visibleSeconds}s`}</span>
            </div>
        </header>
        <div ref={scrollContainerRef} className="timeline-scroll min-h-0 flex-1 overflow-auto" style={{'--timeline-scale': `${zoomScale}`} as CSSProperties}>
            {videoFile && <>
                <div ref={trackRef} className={`relative h-full w-[calc(100%*var(--timeline-scale))] touch-none ${duration > 0 ? 'cursor-crosshair' : ''}`} onPointerDown={event => {
                    if (duration <= 0 || (event.target instanceof Element && event.target.closest('[data-caption]'))) return;
                    draggingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    seekFromPointer(event.clientX);
                }} onPointerMove={event => {if (draggingRef.current) seekFromPointer(event.clientX)}} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
                    {duration > 0 && <>
                        <div className="relative h-[22px] text-[10px] text-[#768195] select-none">
                            {ticks.map((tick, index) => (
                                <span
                                    key={index}
                                    className="absolute -translate-x-1/2 whitespace-nowrap"
                                    style={{left: `${tick.percent}%`}}
                                >
                                    {tick.label}
                                </span>
                            ))}
                        </div>
                        <div className="tick-line mx-1 -mt-1 mb-1 h-2 opacity-75"/>
                    </>}
                    {duration > 0 && captions.length > 0 && <div className="relative h-12">{captions.filter(caption => caption.start < duration && caption.end > 0).map(caption => {
                        const start = Math.max(0, caption.start);
                        const end = Math.min(duration, caption.end);
                        return <button key={caption.id} data-caption type="button" className={`absolute top-0 h-12 min-w-[20px] cursor-pointer overflow-hidden rounded-[9px] border px-2 text-ellipsis whitespace-nowrap text-[11px] font-semibold text-[#e3e7ee] hover:bg-[#252e40] ${activeCaptionId === caption.id ? 'border-[#7669ff] bg-[#5f52e7] shadow-[0_7px_17px_rgba(72,57,206,.22)]' : 'border-transparent bg-[#1d2533]'}`} style={{left: `${start / duration * 100}%`, width: `${(end - start) / duration * 100}%`}} onClick={() => onCaptionSelect(caption.id)}>{caption.text}</button>;
                    })}</div>}
                    {showWaveform && currentAnalysis?.status === 'loading' && (
                        <WaveformSkeleton captionsCount={captions.length} label={copy.analyzing} />
                    )}
                    {currentAnalysis?.status === 'unavailable' && <p className="mt-5 text-sm text-muted" role="status">{copy.unavailable}</p>}
                    {showWaveform && currentAnalysis?.status === 'ready' && (
                        <AudioWaveform
                            peaks={currentAnalysis.waveform}
                            duration={duration}
                            zoomScale={zoomScale}
                            scrollContainerRef={scrollContainerRef}
                            trackRef={trackRef}
                            captionsCount={captions.length}
                            label={copy.audioWaveform}
                        />
                    )}
                    {duration > 0 && <div role="slider" tabIndex={0} aria-label={copy.playhead} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(currentTime * 10) / 10} aria-valuetext={formatTime(currentTime)} className="absolute top-0 bottom-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize focus-visible:rounded focus-visible:outline-2 focus-visible:outline-highlight" style={{left: `clamp(6px, ${playheadPercent}%, calc(100% - 6px))`}} onKeyDown={event => {if (moveWithKeyboard(event.key, event.shiftKey)) event.preventDefault()}}><span className="absolute top-0 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-[#101620] bg-white"/><span className="absolute top-2 bottom-0 left-1/2 w-px -translate-x-1/2 bg-white/90"/></div>}
                </div>
            </>}
        </div>
    </section>;
}
