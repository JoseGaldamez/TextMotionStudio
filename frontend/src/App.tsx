import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, PointerEvent, ReactNode} from 'react';
import {Sidebar} from './components/Sidebar';
import {TitleBar} from './components/TitleBar';
import {Timeline} from './components/Timeline';
import {VideoPreview} from './components/VideoPreview';
import {WorkflowPanel} from './components/WorkflowPanel';
import {ModelSelector} from './components/ModelSelector';
import {Onboarding} from './components/onboarding/Onboarding';
import type {CaptionStyle, Transcription, VideoProject} from './models';
import {CancelCaptionGeneration, GenerateCaptions, GetAppConfig, RegisterVideoFile, SelectVideoFile, UpdateAppConfig, UpdateTranscriptionDevice} from '../wailsjs/go/main/App';
import {CanResolveFilePaths, OnFileDrop, OnFileDropOff} from '../wailsjs/runtime/runtime';
import {findActiveCaption} from './captionTiming';
import type {config} from '../wailsjs/go/models';
import {getCopy, type Language} from './i18n';
import {StylesView} from './components/views/StylesView';
import {VideoExportView} from './components/views/VideoExportView';
import {SettingsView} from './components/views/SettingsView';
import {DEFAULT_STYLES, getAllStyles, loadCustomStyles, saveCustomStyles} from './captionStyles';
import {CaptionGenerationModal} from './components/CaptionGenerationModal';

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
    const [customStyles, setCustomStyles] = useState<CaptionStyle[]>(() => loadCustomStyles());
    const allStyles = getAllStyles(customStyles);
    const [project, setProject] = useState<VideoProject>({videoName: null, videoUrl: null, videoPath: null, captions: [], selectedStyle: DEFAULT_STYLES[0], captionSize: 100, captionPosition: 0});
    const [isGenerating, setIsGenerating] = useState(false);
    const [readyModelId, setReadyModelId] = useState<string | null>(null);
    const [captionsReady, setCaptionsReady] = useState(false);
    const [captionLanguage, setCaptionLanguage] = useState('auto');
    const [generationError, setGenerationError] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playPauseRequest, setPlayPauseRequest] = useState(0);
    const [seekRequest, setSeekRequest] = useState<{time: number; id: number} | null>(null);
    const [videoFraction, setVideoFraction] = useState(defaultVideoFraction);
    const videoPanelRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const browserSelectionRef = useRef<{name: string; url: string} | null>(null);
    const generationCancelRequestedRef = useRef(false);
    const timelinePanelRef = useRef<HTMLDivElement>(null);
    const resizeStartRef = useRef<{y: number; videoHeight: number; totalHeight: number} | null>(null);
    const language: Language = appConfig?.language === 'es' ? 'es' : 'en';
    const copy = getCopy(language);

    useEffect(() => {document.documentElement.lang = language}, [language]);

    useEffect(() => () => {
        if (project.videoUrl?.startsWith('blob:')) URL.revokeObjectURL(project.videoUrl);
    }, [project.videoUrl]);

    useEffect(() => {
        OnFileDrop((x, y, paths) => {
            const fromPicker = x === -1 && y === -1;
            const target = document.elementFromPoint(x, y);
            if (!fromPicker && !(target instanceof Element && target.closest('[data-video-drop-target]'))) return;
            const path = paths[0];
            if (!path) return;
            void RegisterVideoFile(path).then(selected => {
                const browserSelection = browserSelectionRef.current;
                if (browserSelection?.name === selected.name) {
                    setProject(current => current.videoUrl === browserSelection.url ? {...current, videoPath: selected.path} : current);
                    return;
                }
                browserSelectionRef.current = null;
                setVideoFile(null);
                setCaptionsReady(false);
                setGenerationError('');
                setPlaybackTime(0);
                setVideoDuration(0);
                setSeekRequest(null);
                setProject(current => ({...current, videoName: selected.name, videoUrl: selected.url, videoPath: selected.path, captions: [], transcription: undefined}));
            }).catch(error => setGenerationError(String(error)));
        }, false);
        return () => OnFileDropOff();
    }, []);

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

    const selectBrowserVideo = (file: File) => {
        if (!file.type.startsWith('video/') && !/\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(file.name)) return;
        const url = URL.createObjectURL(file);
        browserSelectionRef.current = {name: file.name, url};
        setVideoFile(file);
        setCaptionsReady(false);
        setGenerationError('');
        setPlaybackTime(0);
        setVideoDuration(0);
        setSeekRequest(null);
        setProject(current => ({...current, videoName: file.name, videoUrl: url, videoPath: null, captions: [], transcription: undefined}));
    };

    const chooseVideo = async () => {
        if (CanResolveFilePaths()) { fileInputRef.current?.click(); return; }
        const selected = await SelectVideoFile();
        if (!selected) return;
        browserSelectionRef.current = null;
        setVideoFile(null);
        setCaptionsReady(false);
        setPlaybackTime(0);
        setVideoDuration(0);
        setSeekRequest(null);
        setProject((current) => {
            return {...current, videoName: selected.name, videoUrl: selected.url, videoPath: selected.path, captions: [], transcription: undefined};
        });
    };

    const generateCaptions = async () => {
        if (isGenerating) return;
        if (!project.videoPath) { setGenerationError("We couldn't access the local path for this video."); return; }
        generationCancelRequestedRef.current = false;
        setIsGenerating(true);
        setGenerationError('');
        try {
            const raw = await GenerateCaptions(project.videoPath, captionLanguage);
            const captionGroups = raw.captionGroups.map(group => ({...group, text: group.words.map(word => word.text).join(' ')}));
            const transcription: Transcription = {...raw, captionGroups};
            setProject(current => ({...current, transcription, captions: captionGroups}));
            setCaptionsReady(true);
        } catch (reason) {
            setCaptionsReady(false);
            if (!generationCancelRequestedRef.current) setGenerationError(String(reason));
        } finally {
            generationCancelRequestedRef.current = false;
            setIsGenerating(false);
        }
    };

    const cancelCaptionGeneration = () => {
        generationCancelRequestedRef.current = true;
        CancelCaptionGeneration();
    };

    const seekTo = (time: number) => {
        const nextTime = Math.max(0, Math.min(time, videoDuration || time));
        setPlaybackTime(nextTime);
        setSeekRequest(current => ({time: nextTime, id: (current?.id ?? 0) + 1}));
    };
    const editCaptionWords = (captionId: string, texts: string[]) => {
        setProject(current => {
            const original = current.captions.find(caption => caption.id === captionId);
            if (!original || texts.length !== original.words.length) return current;
            const words = original.words.map((word, index) => ({...word, text: texts[index]}));
            const edited = {...original, words, text: words.map(word => word.text).join(' ')};
            const captions = current.captions.map(caption => caption.id === captionId ? edited : caption);
            const changedWords = new Map(words.map(word => [word.id, word.text]));
            const transcription = current.transcription ? {
                ...current.transcription,
                captionGroups: captions,
                words: current.transcription.words.map(word => changedWords.has(word.id) ? {...word, text: changedWords.get(word.id)!} : word),
            } : undefined;
            return {...current, captions, transcription};
        });
    };
    const activeCaption = captionsReady ? findActiveCaption(project.captions, playbackTime) : undefined;
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

    const handleLanguageChange = async (newLang: Language) => {
        if (!appConfig) return;
        try {
            const updated = await UpdateAppConfig(appConfig.onboardingCompleted, newLang);
            setAppConfig(updated);
        } catch (err) {
            console.error('Failed to update language', err);
        }
    };

    const handleTranscriptionDeviceChange = async (device: 'auto' | 'cpu') => {
        try {
            setAppConfig(await UpdateTranscriptionDevice(device));
        } catch (err) {
            console.error('Failed to update transcription device', err);
            throw err;
        }
    };

    const handleSaveCustomStyle = (newStyle: CaptionStyle) => {
        setCustomStyles(prev => {
            const existingIndex = prev.findIndex(s => s.id === newStyle.id);
            let updated: CaptionStyle[];
            if (existingIndex >= 0) {
                updated = [...prev];
                updated[existingIndex] = newStyle;
            } else {
                updated = [newStyle, ...prev];
            }
            saveCustomStyles(updated);
            return updated;
        });
    };

    const handleDeleteCustomStyle = (styleId: string) => {
        setCustomStyles(prev => {
            const updated = prev.filter(s => s.id !== styleId);
            saveCustomStyles(updated);
            return updated;
        });
        if (project.selectedStyle.id === styleId) {
            setProject(current => ({...current, selectedStyle: DEFAULT_STYLES[0]}));
        }
    };

    if (!appConfig) return <AppFrame><main className="grid h-full min-w-[1280px] place-items-center bg-background text-foreground">
        {configError ? <div className="text-center"><p className="mb-5 text-sm text-muted" role="alert">{configError}</p><button className="cursor-pointer rounded-[10px] bg-primary px-5 py-3 text-sm font-bold hover:bg-primary-hover" onClick={() => {setConfigError(''); setLoadAttempt(attempt => attempt + 1)}}>{copy.app.retry}</button></div> : <p className="text-sm text-muted">{copy.app.loading}</p>}
    </main></AppFrame>;

    if (!appConfig.onboardingCompleted) return <AppFrame><Onboarding onComplete={async (selectedLanguage) => {
        const value = await UpdateAppConfig(true, selectedLanguage);
        setAppConfig(value);
    }}/></AppFrame>;

    return (
        <AppFrame language={language}><main className={`grid h-full min-w-[1280px] overflow-hidden bg-background text-foreground text-left ${
            activeNav === 'Create'
                ? 'grid-cols-[214px_370px_minmax(0,1fr)] max-[1320px]:grid-cols-[188px_334px_minmax(0,1fr)]'
                : 'grid-cols-[214px_minmax(0,1fr)] max-[1320px]:grid-cols-[188px_minmax(0,1fr)]'
        }`}>
            <input ref={fileInputRef} className="hidden" type="file" accept="video/*" onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                selectBrowserVideo(file);
                const resolver = (window as Window & {runtime?: {ResolveFilePaths?: (x: number, y: number, files: File[]) => void}}).runtime?.ResolveFilePaths;
                resolver?.(-1, -1, [file]);
            }}/>
            <Sidebar activeItem={activeNav} onSelect={setActiveNav} language={language}/>

            {activeNav === 'Create' && (
                <>
                    <WorkflowPanel project={project} styles={allStyles} captionsReady={captionsReady} isGenerating={isGenerating} readyModelId={readyModelId} generationError={generationError} captionLanguage={captionLanguage} language={language} onChooseVideo={() => void chooseVideo()} onVideoSelect={selectBrowserVideo} onGenerate={() => void generateCaptions()} onCancel={cancelCaptionGeneration} onCaptionLanguageChange={setCaptionLanguage} onStyleSelect={(selectedStyle) => setProject((current) => ({...current, selectedStyle}))} onCaptionSizeChange={(captionSize) => setProject((current) => ({...current, captionSize}))} onCaptionPositionChange={(captionPosition) => setProject((current) => ({...current, captionPosition}))} onExport={() => setActiveNav('Export')}/>
                    <section className="workspace-grid grid min-h-0 min-w-0 overflow-hidden bg-[#0d121b] p-[18px] max-[1320px]:px-3" style={{'--video-flex': `${videoFraction}fr`, '--timeline-flex': `${1 - videoFraction}fr`} as CSSProperties} aria-label={copy.app.workspace}>
                        <header className="relative z-20 flex min-w-0 items-center justify-between gap-4 px-1 text-xs text-[#7f899b]"><div className="flex min-w-0 items-center gap-2"><span className="size-[7px] shrink-0 rounded-full bg-[#41b882] shadow-[0_0_0_3px_rgba(65,184,130,.09)]" aria-hidden="true"/><span className="overflow-hidden text-ellipsis whitespace-nowrap">{project.videoName ?? copy.app.untitled}</span></div><ModelSelector language={language} isGenerating={isGenerating} onReadyModelChange={setReadyModelId}/></header>
                        <div ref={videoPanelRef} className="min-h-0"><VideoPreview videoUrl={project.videoUrl} captions={captionsReady ? project.captions : []} captionStyle={project.selectedStyle} captionSize={project.captionSize} captionPosition={project.captionPosition} playbackTime={playbackTime} videoDuration={videoDuration} playPauseRequest={playPauseRequest} onPlayingChange={setIsPlaying} onPlaybackTimeChange={setPlaybackTime} onDurationChange={setVideoDuration} seekRequest={seekRequest} onSeek={seekTo} onChooseVideo={() => void chooseVideo()} onVideoSelect={selectBrowserVideo} language={language}/></div>
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
                        <div ref={timelinePanelRef} className="min-h-0"><Timeline videoUrl={project.videoUrl} videoFile={videoFile} captions={captionsReady && !isGenerating ? project.captions : []} isGenerating={isGenerating} activeCaptionId={activeCaption?.id ?? ''} currentTime={playbackTime} videoDuration={videoDuration} isPlaying={isPlaying} onSeek={seekTo} onCaptionSelect={(id) => {const caption = project.captions.find(item => item.id === id); if (caption) seekTo(caption.start)}} onCaptionEdit={editCaptionWords} onTogglePlay={() => setPlayPauseRequest(req => req + 1)} language={language}/></div>
                    </section>
                </>
            )}

            {activeNav === 'Styles' && (
                <StylesView
                    project={project}
                    styles={allStyles}
                    onSelectStyle={(selectedStyle) => setProject((current) => ({...current, selectedStyle}))}
                    onSaveCustomStyle={handleSaveCustomStyle}
                    onDeleteCustomStyle={handleDeleteCustomStyle}
                    language={language}
                    onNavigateToCreate={() => setActiveNav('Create')}
                />
            )}

            {activeNav === 'Export' && (
                <VideoExportView
                    project={project}
                    language={language}
                    onBackToEdit={() => setActiveNav('Create')}
                />
            )}

            {activeNav === 'Settings' && (
                <SettingsView
                    language={language}
                    appConfig={appConfig}
                    onLanguageChange={handleLanguageChange}
                    onDeviceChange={handleTranscriptionDeviceChange}
                />
            )}
            {isGenerating && <CaptionGenerationModal language={language} onCancel={cancelCaptionGeneration}/>} 
        </main></AppFrame>
    );
}

export default App;
