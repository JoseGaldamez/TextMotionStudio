import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, PointerEvent, ReactNode} from 'react';
import {Sidebar} from './components/Sidebar';
import {TitleBar} from './components/TitleBar';
import {Timeline} from './components/Timeline';
import {VideoPreview} from './components/VideoPreview';
import {WorkflowPanel} from './components/WorkflowPanel';
import {Onboarding} from './components/onboarding/Onboarding';
import type {Caption, CaptionStyle, VideoProject} from './models';
import {GetAppConfig, UpdateAppConfig} from '../wailsjs/go/main/App';
import type {config} from '../wailsjs/go/models';
import {getCopy, type Language} from './i18n';

const mockCaptions: Caption[] = [
    {id: 'c1', text: 'Great ideas', start: 0, end: 4.2},
    {id: 'c2', text: 'deserve', start: 4.2, end: 7.1},
    {id: 'c3', text: 'to be seen.', start: 7.1, end: 11.4},
    {id: 'c4', text: 'Make your videos', start: 11.4, end: 17.2},
    {id: 'c5', text: 'stand out', start: 17.2, end: 21.3},
    {id: 'c6', text: 'with TextMotion Studio.', start: 21.3, end: 28},
];

const styles: CaptionStyle[] = [
    {id: 'modern', name: 'Modern', description: 'Clean, readable, and stylish'},
    {id: 'bold', name: 'Bold', description: 'High-impact words with weight'},
    {id: 'karaoke', name: 'Karaoke', description: 'Word-by-word color emphasis'},
    {id: 'minimal', name: 'Minimal', description: 'Quiet type, maximum clarity'},
    {id: 'pop', name: 'Pop', description: 'Playful scale and vivid color'},
];

const defaultVideoFraction = 0.61;
const minVideoHeight = 220;
const minTimelineHeight = 160;

function AppFrame({children, language = 'en'}: {children: ReactNode; language?: Language}) {
    return <div className="flex h-screen min-w-[1280px] flex-col overflow-hidden bg-background">
        <TitleBar language={language}/>
        <div className="min-h-0 flex-1">{children}</div>
    </div>;
}

function App() {
    const [appConfig, setAppConfig] = useState<config.AppConfig | null>(null);
    const [configError, setConfigError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [activeNav, setActiveNav] = useState('Create');
    const [project, setProject] = useState<VideoProject>({videoName: null, videoUrl: null, captions: mockCaptions, selectedStyle: styles[0]});
    const [isGenerating, setIsGenerating] = useState(false);
    const [captionsReady, setCaptionsReady] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [seekRequest, setSeekRequest] = useState<{time: number; id: number} | null>(null);
    const [videoFraction, setVideoFraction] = useState(defaultVideoFraction);
    const videoPanelRef = useRef<HTMLDivElement>(null);
    const timelinePanelRef = useRef<HTMLDivElement>(null);
    const resizeStartRef = useRef<{y: number; videoHeight: number; totalHeight: number} | null>(null);
    const language: Language = appConfig?.language === 'es' ? 'es' : 'en';
    const copy = getCopy(language);

    useEffect(() => {document.documentElement.lang = language}, [language]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const value = await GetAppConfig();
                if (!cancelled) {setAppConfig(value); setConfigError('')}
            } catch {
                if (!cancelled) setConfigError('Could not load your local settings. Please try again.');
            }
        };
        void load();
        return () => {cancelled = true};
    }, [loadAttempt]);

    useEffect(() => () => {
        if (project.videoUrl) URL.revokeObjectURL(project.videoUrl);
    }, [project.videoUrl]);

    const selectVideo = (file: File) => {
        if (!file.type.startsWith('video/')) return;
        const url = URL.createObjectURL(file);
        setVideoFile(file);
        setCaptionsReady(false);
        setPlaybackTime(0);
        setVideoDuration(0);
        setSeekRequest(null);
        setProject((current) => {
            if (current.videoUrl) URL.revokeObjectURL(current.videoUrl);
            return {...current, videoName: file.name, videoUrl: url};
        });
    };

    const generateCaptions = () => {
        if (isGenerating) return;
        setIsGenerating(true);
        window.setTimeout(() => {setIsGenerating(false); setCaptionsReady(true);}, 900);
    };

    const seekTo = (time: number) => {
        const nextTime = Math.max(0, Math.min(time, videoDuration || time));
        setPlaybackTime(nextTime);
        setSeekRequest(current => ({time: nextTime, id: (current?.id ?? 0) + 1}));
    };
    const activeCaption = captionsReady ? project.captions.find(caption => playbackTime >= caption.start && playbackTime < caption.end) : undefined;
    const clampVideoHeight = (height: number, total: number) => Math.max(minVideoHeight, Math.min(total - minTimelineHeight, height));
    const resizePanelsBy = (pixels: number) => {
        const videoHeight = videoPanelRef.current?.getBoundingClientRect().height ?? 0;
        const timelineHeight = timelinePanelRef.current?.getBoundingClientRect().height ?? 0;
        const total = videoHeight + timelineHeight;
        if (total > minVideoHeight + minTimelineHeight) setVideoFraction(clampVideoHeight(videoHeight + pixels, total) / total);
    };
    const stopPanelResize = (event: PointerEvent<HTMLDivElement>) => {
        resizeStartRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    if (!appConfig) return <AppFrame><main className="grid h-full min-w-[1280px] place-items-center bg-background text-foreground">
        {configError ? <div className="text-center"><p className="mb-5 text-sm text-muted" role="alert">{configError}</p><button className="cursor-pointer rounded-[10px] bg-primary px-5 py-3 text-sm font-bold hover:bg-primary-hover" onClick={() => {setConfigError(''); setLoadAttempt(attempt => attempt + 1)}}>{copy.app.retry}</button></div> : <p className="text-sm text-muted">{copy.app.loading}</p>}
    </main></AppFrame>;

    if (!appConfig.onboardingCompleted) return <AppFrame><Onboarding onComplete={async (modelInstalled, selectedLanguage) => {
        const value = await UpdateAppConfig(true, modelInstalled, selectedLanguage);
        setAppConfig(value);
    }}/></AppFrame>;

    return (
        <AppFrame language={language}><main className="grid h-full min-w-[1280px] grid-cols-[214px_370px_minmax(0,1fr)] overflow-hidden bg-background text-foreground text-left max-[1320px]:grid-cols-[188px_334px_minmax(0,1fr)]">
            <Sidebar activeItem={activeNav} onSelect={setActiveNav} language={language}/>
            <WorkflowPanel project={project} styles={styles} captionsReady={captionsReady} isGenerating={isGenerating} language={language} onVideoSelect={selectVideo} onGenerate={generateCaptions} onStyleSelect={(selectedStyle) => setProject((current) => ({...current, selectedStyle}))}/>
            <section className="workspace-grid grid min-h-0 min-w-0 overflow-hidden bg-[#0d121b] p-[18px] max-[1320px]:px-3" style={{'--video-flex': `${videoFraction}fr`, '--timeline-flex': `${1 - videoFraction}fr`} as CSSProperties} aria-label={copy.app.workspace}>
                <header className="flex items-center justify-between px-1 text-xs text-[#7f899b]"><div className="flex min-w-0 items-center gap-2"><span className="size-[7px] rounded-full bg-[#41b882] shadow-[0_0_0_3px_rgba(65,184,130,.09)]" aria-hidden="true"/><span className="overflow-hidden text-ellipsis whitespace-nowrap">{project.videoName ?? copy.app.untitled}</span></div><p className="m-0">{copy.app.tagline}</p></header>
                <div ref={videoPanelRef} className="min-h-0"><VideoPreview videoUrl={project.videoUrl} captionStyle={project.selectedStyle.id} activeCaption={activeCaption} playbackTime={playbackTime} videoDuration={videoDuration} onPlaybackTimeChange={setPlaybackTime} onDurationChange={setVideoDuration} seekRequest={seekRequest} onSeek={seekTo} language={language}/></div>
                <div role="separator" tabIndex={0} aria-label={copy.app.resizePanels} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(videoFraction * 100)} className="group flex cursor-row-resize touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-highlight" onPointerDown={event => {
                    const videoHeight = videoPanelRef.current?.getBoundingClientRect().height ?? 0;
                    const timelineHeight = timelinePanelRef.current?.getBoundingClientRect().height ?? 0;
                    resizeStartRef.current = {y: event.clientY, videoHeight, totalHeight: videoHeight + timelineHeight};
                    event.currentTarget.setPointerCapture(event.pointerId);
                    event.preventDefault();
                }} onPointerMove={event => {
                    const start = resizeStartRef.current;
                    if (start && start.totalHeight > minVideoHeight + minTimelineHeight) setVideoFraction(clampVideoHeight(start.videoHeight + event.clientY - start.y, start.totalHeight) / start.totalHeight);
                }} onPointerUp={stopPanelResize} onPointerCancel={stopPanelResize} onKeyDown={event => {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        resizePanelsBy(event.key === 'ArrowDown' ? 20 : -20);
                        event.preventDefault();
                    }
                }}><span className="h-1 w-12 rounded-full bg-[#354055] transition-colors group-hover:bg-primary group-focus-visible:bg-primary"/></div>
                <div ref={timelinePanelRef} className="min-h-0"><Timeline videoFile={videoFile} captions={captionsReady ? project.captions : []} activeCaptionId={activeCaption?.id ?? ''} currentTime={playbackTime} videoDuration={videoDuration} onSeek={seekTo} onCaptionSelect={(id) => {const caption = project.captions.find(item => item.id === id); if (caption) seekTo(caption.start)}} language={language}/></div>
            </section>
        </main></AppFrame>
    );
}

export default App;
