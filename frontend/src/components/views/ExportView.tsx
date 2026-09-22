import {useState} from 'react';
import type {VideoProject} from '../../models';
import {CheckIcon, CpuIcon, DownloadIcon, FolderIcon, PlayCircleIcon, CloseIcon, ShieldCheckIcon} from '../Icons';
import {getCopy, type Language} from '../../i18n';

interface Props {
    project: VideoProject;
    language: Language;
    onBackToEdit: () => void;
}

interface RecentExport {
    id: string;
    filename: string;
    format: string;
    resolution: string;
    duration: string;
    size: string;
    date: string;
}

export function ExportView({project, language, onBackToEdit}: Props) {
    const copy = getCopy(language).exportView;
    const [format, setFormat] = useState<'mp4' | 'mov' | 'webm' | 'srt'>('mp4');
    const [renderMode, setRenderMode] = useState<'burnin' | 'overlay' | 'subtitles'>('burnin');
    const [quality, setQuality] = useState<'balanced' | 'high' | 'lossless'>('high');
    const [normalizeAudio, setNormalizeAudio] = useState(true);
    const [destinationPath, setDestinationPath] = useState('C:\\Users\\joseg\\Videos\\TextMotion_Exports');
    
    // Rendering simulation modal state
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportFinished, setExportFinished] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);

    const [recentExports, setRecentExports] = useState<RecentExport[]>([
        {
            id: 'rex-1',
            filename: 'viral_hook_vertical_v2.mp4',
            format: 'MP4 (H.264)',
            resolution: '1080 × 1920',
            duration: '0:28',
            size: '18.4 MB',
            date: 'Today, 2:15 PM',
        },
        {
            id: 'rex-2',
            filename: 'podcast_clip_alpha_overlay.mov',
            format: 'ProRes 4444',
            resolution: '1080 × 1920',
            duration: '0:45',
            size: '74.1 MB',
            date: 'Yesterday, 6:40 PM',
        },
        {
            id: 'rex-3',
            filename: 'interview_captions_subtitles.srt',
            format: 'SRT Subtitles',
            resolution: 'Text Only',
            duration: '0:28',
            size: '4 KB',
            date: 'Sep 20, 11:20 AM',
        },
    ]);

    const activeVideoTitle = project.videoName ?? copy.sampleVideoName;
    const estimatedSize = format === 'srt' ? '4 KB' : format === 'mov' ? '68 MB' : quality === 'high' ? '22.5 MB' : '14.2 MB';
    const estimatedTime = format === 'srt' ? '< 1s' : 'approx. 6 seconds';

    const handleStartExport = () => {
        setIsExporting(true);
        setExportProgress(0);
        setExportFinished(false);
        setCurrentFrame(0);

        const totalFrames = 720;
        let progress = 0;

        const interval = setInterval(() => {
            progress += 5;
            if (progress >= 100) {
                clearInterval(interval);
                setExportProgress(100);
                setCurrentFrame(totalFrames);
                setExportFinished(true);

                // Add to recent list
                const newExport: RecentExport = {
                    id: `rex-${Date.now()}`,
                    filename: activeVideoTitle.replace(/\.[^/.]+$/, '') + `_captioned.${format}`,
                    format: format.toUpperCase(),
                    resolution: '1080 × 1920',
                    duration: '0:28',
                    size: estimatedSize,
                    date: 'Just now',
                };
                setRecentExports(prev => [newExport, ...prev]);
            } else {
                setExportProgress(progress);
                setCurrentFrame(Math.round((progress / 100) * totalFrames));
            }
        }, 120);
    };

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-[#0d121b] text-foreground">
            {/* Main Export Configuration Area */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-[#202838] p-6 [scrollbar-width:thin]">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <DownloadIcon className="size-4" />
                            <span>Local Render Pipeline</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{copy.title}</h1>
                        <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onBackToEdit}
                        className="cursor-pointer rounded-xl border border-[#273246] bg-[#141b27] px-4 py-2 text-xs font-bold text-[#b5c2d6] hover:bg-[#1c2637] hover:text-white"
                    >
                        {copy.backToEditor}
                    </button>
                </div>

                {/* Project Summary Banner */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#232f42] bg-gradient-to-r from-[#121926] via-[#161f2e] to-[#121926] p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="grid size-12 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                            <PlayCircleIcon className="size-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{copy.projectSummary}</span>
                            <h2 className="text-base font-bold text-white">{activeVideoTitle}</h2>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                                <span>{copy.duration}: <strong className="text-slate-200">0:28</strong></span>
                                <span>•</span>
                                <span>{copy.resolution}: <strong className="text-slate-200">1080 × 1920 (9:16)</strong></span>
                                <span>•</span>
                                <span>{copy.captionCount}: <strong className="text-slate-200">{project.captions.length} phrases</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#2c394e] bg-[#1a2333] px-3 py-2 text-right">
                        <span className="block text-[10px] font-semibold text-muted uppercase">Active Style</span>
                        <span className="text-xs font-bold text-white">{project.selectedStyle.name}</span>
                    </div>
                </div>

                {/* Grid of Settings */}
                <div className="grid grid-cols-2 gap-5 pb-8 max-[1400px]:grid-cols-1">
                    {/* 1. Format & Codec */}
                    <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                        <h3 className="text-sm font-bold text-white mb-3">{copy.formatSettings}</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                            {([
                                {id: 'mp4', title: 'MP4 (H.264)', desc: copy.mp4Description},
                                {id: 'mov', title: 'MOV ProRes (Alpha)', desc: copy.movDescription},
                                {id: 'webm', title: 'WebM (VP9)', desc: copy.webmDescription},
                                {id: 'srt', title: 'Subtitles Only (.srt)', desc: copy.srtDescription},
                            ] as const).map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setFormat(item.id)}
                                    className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                                        format === item.id
                                            ? 'border-primary bg-primary/10 shadow-sm'
                                            : 'border-[#232c3f] bg-[#151d2c] hover:border-[#35435c] hover:bg-[#182233]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <strong className="text-xs font-bold text-white">{item.title}</strong>
                                        {format === item.id && <CheckIcon className="size-3.5 text-primary" />}
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-[#8695ab] leading-snug">{item.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Caption Render Mode */}
                    <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                        <h3 className="text-sm font-bold text-white mb-3">{copy.renderMode}</h3>
                        <div className="space-y-2">
                            {([
                                {id: 'burnin', title: copy.burnIn, desc: 'Bakes animations permanently into the video frame.'},
                                {id: 'overlay', title: copy.transparentOverlay, desc: 'Renders alpha transparent layer to drop into Premiere / DaVinci.'},
                                {id: 'subtitles', title: copy.subtitleOnly, desc: 'Exports timed text file without re-encoding video.'},
                            ] as const).map(mode => (
                                <label
                                    key={mode.id}
                                    onClick={() => setRenderMode(mode.id)}
                                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                                        renderMode === mode.id
                                            ? 'border-primary bg-primary/10 text-white'
                                            : 'border-[#232c3f] bg-[#151d2c] text-[#8695ab] hover:border-[#35435c] hover:text-slate-200'
                                    }`}
                                >
                                    <div>
                                        <span className="block text-xs font-bold text-white">{mode.title}</span>
                                        <span className="block text-[11px] text-[#7d8ca1]">{mode.desc}</span>
                                    </div>
                                    <input
                                        type="radio"
                                        name="renderMode"
                                        checked={renderMode === mode.id}
                                        onChange={() => setRenderMode(mode.id)}
                                        className="size-4 accent-primary"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 3. Quality & Bitrate */}
                    <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                        <h3 className="text-sm font-bold text-white mb-3">{copy.qualityProfile}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                {id: 'balanced', label: copy.balanced},
                                {id: 'high', label: copy.highQuality},
                                {id: 'lossless', label: copy.lossless},
                            ] as const).map(q => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => setQuality(q.id)}
                                    className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                                        quality === q.id
                                            ? 'border-primary bg-primary text-white shadow-sm'
                                            : 'border-[#232c3f] bg-[#151d2c] text-[#93a2b8] hover:bg-[#1a2334] hover:text-white'
                                    }`}
                                >
                                    <span className="block text-xs font-bold">{q.label.split(' ')[0]}</span>
                                    <span className="block text-[10px] opacity-80 mt-0.5">{q.label.split(' ').slice(1).join(' ')}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#1e2739]">
                            <label className="flex cursor-pointer items-center justify-between text-xs text-[#a0afc4]">
                                <span>{copy.normalizeLoudness}</span>
                                <input
                                    type="checkbox"
                                    checked={normalizeAudio}
                                    onChange={e => setNormalizeAudio(e.target.checked)}
                                    className="size-4 accent-primary cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>

                    {/* 4. Hardware & Output Destination */}
                    <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <CpuIcon className="size-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-white">{copy.hardwareAcc}</h3>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between">
                            <span className="font-semibold">{copy.gpuEnabled}</span>
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">NVENC</span>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-muted mb-1">{copy.destination}</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <FolderIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                                    <input
                                        type="text"
                                        value={destinationPath}
                                        onChange={e => setDestinationPath(e.target.value)}
                                        className="h-9 w-full rounded-xl border border-[#263144] bg-[#141b28] pr-3 pl-9 text-xs text-white focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => alert('Folder picker opened (mock)')}
                                    className="cursor-pointer rounded-xl border border-[#2c384e] bg-[#182131] px-3 py-2 text-xs font-semibold text-[#b3bfd2] hover:bg-[#1f2a3e] hover:text-white"
                                >
                                    {copy.browse}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#243044] bg-[#111724] p-4 shadow-lg">
                    <div className="flex items-center gap-6 text-xs text-muted">
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-[#6f7e96]">{copy.estTime}</span>
                            <strong className="text-sm font-bold text-white">{estimatedTime}</strong>
                        </div>
                        <div className="h-6 w-px bg-[#202a3a]" />
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-[#6f7e96]">{copy.estSize}</span>
                            <strong className="text-sm font-bold text-white">{estimatedSize}</strong>
                        </div>
                        <div className="h-6 w-px bg-[#202a3a]" />
                        <div className="flex items-center gap-1.5 text-emerald-400">
                            <ShieldCheckIcon className="size-4" />
                            <span className="text-[11px] font-semibold">100% Private Local Render</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleStartExport}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-[#7363ff] to-[#7f6fff] px-7 py-3 text-sm font-bold text-white shadow-xl transition-all hover:brightness-110 active:scale-98"
                    >
                        <DownloadIcon className="size-4" />
                        <span>{copy.exportButton}</span>
                    </button>
                </div>
            </div>

            {/* Right-hand Recent Exports Drawer */}
            <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto bg-[#101622] p-5 [scrollbar-width:thin] max-[1440px]:w-[280px]">
                <h3 className="text-sm font-bold text-white mb-4">{copy.recentExports}</h3>
                <div className="space-y-3">
                    {recentExports.map(rex => (
                        <div
                            key={rex.id}
                            className="group rounded-xl border border-[#222c3e] bg-[#141b27] p-3 transition-colors hover:border-[#35435e] hover:bg-[#182132]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <strong className="text-xs font-bold text-white line-clamp-1 group-hover:text-primary-hover">
                                    {rex.filename}
                                </strong>
                                <span className="rounded bg-[#1d273a] px-1.5 py-0.5 text-[9px] font-bold text-[#95a3b9] uppercase">
                                    {rex.format.split(' ')[0]}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                                <span>{rex.resolution}</span>
                                <span>{rex.size}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#1e2739] text-[10px] text-[#78879d]">
                                <span>{rex.date}</span>
                                <button
                                    type="button"
                                    onClick={() => alert(`Opening ${rex.filename}`)}
                                    className="cursor-pointer text-primary hover:underline font-semibold"
                                >
                                    Play
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Render Progress Modal */}
            {isExporting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-md rounded-2xl border border-[#2b384f] bg-[#111724] p-6 text-center shadow-2xl">
                        {!exportFinished ? (
                            <>
                                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/30 animate-pulse">
                                    <DownloadIcon className="size-7" />
                                </div>
                                <h2 className="text-lg font-bold text-white">{copy.exportingTitle}</h2>
                                <p className="mt-1 text-xs text-muted leading-relaxed">{copy.exportingSub}</p>

                                {/* Progress bar */}
                                <div className="mt-6 mb-2 h-2.5 w-full overflow-hidden rounded-full bg-[#1b2332]">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-[#8d7eff] transition-all duration-150"
                                        style={{width: `${exportProgress}%`}}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted">
                                    <span>Frame {currentFrame} / 720 (~124 FPS)</span>
                                    <span className="font-bold text-white">{exportProgress}%</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <CheckIcon className="size-8" />
                                </div>
                                <h2 className="text-xl font-bold text-white">{copy.exportComplete}</h2>
                                <p className="mt-1 text-xs text-muted leading-relaxed">
                                    Saved to <strong>{destinationPath}</strong>
                                </p>

                                <div className="mt-6 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => alert(`Showing ${activeVideoTitle} in Explorer`)}
                                        className="cursor-pointer rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-hover shadow-md"
                                    >
                                        {copy.openFolder}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsExporting(false)}
                                        className="cursor-pointer rounded-xl border border-[#2a374c] bg-[#171f2e] py-2 text-xs font-semibold text-[#a3b2c7] hover:bg-[#1d2739] hover:text-white"
                                    >
                                        {copy.close}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
