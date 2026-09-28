import {useEffect, useRef, useState} from 'react';
import {LoaderCircle, RotateCcw} from 'lucide-react';
import type {CaptionStyle, VideoProject} from '../models';
import {CheckIcon, ChevronIcon, ExportIcon, SparkleIcon, VideoIcon} from './Icons';
import {getCopy, type Language} from '../i18n';

interface Props {project: VideoProject; styles: CaptionStyle[]; captionsReady: boolean; isGenerating: boolean; readyModelId: string | null; generationError: string; captionLanguage: string; language: Language; onChooseVideo: () => void; onVideoSelect: (file: File) => void; onGenerate: () => void; onCancel: () => void; onCaptionLanguageChange: (language: string) => void; onStyleSelect: (style: CaptionStyle) => void; onCaptionSizeChange: (size: number) => void; onCaptionPositionChange: (position: number) => void; onExport: () => void;}

const stepClass = 'relative pb-[26px] mb-[26px] border-b border-[#21293a] [@media(max-height:820px)]:pb-[18px] [@media(max-height:820px)]:mb-[18px]';
const headingClass = 'mb-[14px] flex items-center gap-2.5 text-[17px] font-bold tracking-[-.01em]';
const buttonClass = 'mt-3 flex h-[50px] w-full items-center justify-center gap-[10px] rounded-[10px] font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]';

function StepBadge({step, status}: {step: number; status: 'completed' | 'active' | 'locked'}) {
    if (status === 'completed') {
        return (
            <span
                className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] border border-emerald-500/40 bg-[#11241c] text-[11px] font-bold text-emerald-400 select-none"
                aria-label={`Paso ${step} completado`}
            >
                <CheckIcon className="size-3 stroke-[2.5]" />
            </span>
        );
    }
    if (status === 'active') {
        return (
            <span
                className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] border border-[#6d5df5] bg-[#22273d] text-[11px] font-bold text-white select-none"
                aria-label={`Paso ${step} actual`}
            >
                {step}
            </span>
        );
    }
    return (
        <span
            className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] border border-[#252f3f] bg-[#121722] text-[11px] font-semibold text-[#505f76] select-none"
            aria-label={`Paso ${step} bloqueado`}
        >
            {step}
        </span>
    );
}

function ResetButton({
    disabled,
    onClick,
    label,
}: {
    disabled: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex size-[22px] items-center justify-center rounded-[5px] border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff] ${
                disabled
                    ? 'border-transparent bg-transparent text-[#4f5d75] opacity-40 cursor-not-allowed'
                    : 'border-[#2d3a4e] bg-[#161d2a] text-[#b4c1d6] hover:border-[#425471] hover:bg-[#1e2738] hover:text-white cursor-pointer active:scale-95'
            }`}
            title={label}
            aria-label={label}
        >
            <RotateCcw className="size-3 shrink-0" />
        </button>
    );
}

export function WorkflowPanel({project, styles, captionsReady, isGenerating, readyModelId, generationError, captionLanguage, language, onChooseVideo, onVideoSelect, onGenerate, onCancel, onCaptionLanguageChange, onStyleSelect, onCaptionSizeChange, onCaptionPositionChange, onExport}: Props) {
    const copy = getCopy(language).workflow;
    const stylesById = (getCopy(language) as unknown as {stylesById?: Record<string, {name: string; description: string}>}).stylesById;
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [stylesOpen, setStylesOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const modelReady = Boolean(readyModelId);
    const captionsForSelectedModel = captionsReady && project.transcription?.model === readyModelId;

    const hasVideo = Boolean(project.videoUrl);
    const step1Status: 'completed' | 'active' = hasVideo ? 'completed' : 'active';
    const step2Status: 'completed' | 'active' | 'locked' = !hasVideo ? 'locked' : captionsReady ? 'completed' : 'active';
    const step3Status: 'completed' | 'active' | 'locked' = !captionsReady ? 'locked' : 'completed';
    const step4Status: 'completed' | 'active' | 'locked' = (!captionsReady || !hasVideo) ? 'locked' : 'active';

    useEffect(() => {
        if (!stylesOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setStylesOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [stylesOpen]);

    const currentStyleName = stylesById?.[project.selectedStyle.id]?.name ?? project.selectedStyle.name;
    const currentStyleDesc = stylesById?.[project.selectedStyle.id]?.description ?? project.selectedStyle.description;

    return <aside className="overflow-y-auto border-r border-[#232b39] bg-[#111722] px-5 pt-[27px] pb-7 [scrollbar-width:thin] max-[1320px]:px-4 [@media(max-height:820px)]:pt-5" aria-label={copy.label}>
        {/* Paso 1: Carga tu video */}
        <section className={stepClass}>
            <h2 className={`${headingClass} text-white`}>
                <StepBadge step={1} status={step1Status} />
                <span>{copy.load}</span>
            </h2>
            <button data-video-drop-target className={`flex h-[166px] w-full cursor-pointer flex-col items-center justify-center rounded-[13px] border bg-[#1a2130] text-[#dfe5ef] transition-[border,background,transform] duration-200 hover:-translate-y-px hover:border-[#7062fb] hover:bg-[#1d2536] [@media(max-height:820px)]:h-[135px] [&>svg]:mb-[15px] [&>svg]:size-[31px] ${dragging ? '-translate-y-px border-[#7062fb] bg-[#1d2536]' : project.videoUrl ? 'border-[#4b5b61]' : 'border-[#30394a]'}`} onClick={onChooseVideo} onDragOver={e => {e.preventDefault(); setDragging(true)}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) onVideoSelect(file)}}>
                {project.videoUrl ? <CheckIcon className="text-[#63d3a0]"/> : <VideoIcon className="text-[#dce3ed]"/>}
                <strong className="max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap text-sm">{project.videoName ?? copy.drop}</strong>
                <span className="mt-[5px] text-[13px] text-[#b5bfce]">{project.videoUrl ? copy.replace : copy.browse}</span>
                <small className="mt-[10px] text-[11px] text-[#8792a4]">MP4, MOV, MKV, AVI…</small>
            </button>
        </section>

        {/* Paso 2: Genera subtítulos (Solo activo si hay video) */}
        <section className={`${stepClass} ${step2Status === 'locked' ? 'opacity-40' : ''}`}>
            <h2 className={`${headingClass} ${step2Status === 'locked' ? 'text-[#5d6c82]' : 'text-white'}`}>
                <StepBadge step={2} status={step2Status} />
                <span>{copy.generate}</span>
            </h2>
            {hasVideo && !modelReady && <p className="mb-3 text-[11px] text-[#aeb9ca]">{copy.modelRequired}</p>}
            <label className="block">
                <span className="sr-only">{copy.captionLanguage}</span>
                <select
                    className="h-[45px] w-full rounded-[10px] border border-[#30394a] bg-surface pr-[42px] pl-[15px] text-[#e7ebf2] outline-0 focus-visible:border-[#8074ff] focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    value={captionLanguage}
                    onChange={event => onCaptionLanguageChange(event.target.value)}
                    disabled={!hasVideo}
                >
                    <option value="auto">{copy.autoDetect}</option>
                    <option value="en">{copy.english}</option>
                    <option value="es">{copy.spanish}</option>
                </select>
            </label>
            <button
                className={`${buttonClass} ${
                    !hasVideo || !modelReady
                        ? 'cursor-not-allowed border border-[#242e3f] bg-[#151c27] text-[#556377]'
                        : captionsForSelectedModel && !isGenerating
                        ? 'cursor-pointer border border-emerald-500/30 bg-[#152820] text-[#7de3af] hover:bg-[#1b3429]'
                        : 'cursor-pointer border border-[#6b5dff]/50 bg-primary text-white hover:bg-primary-hover active:bg-[#5244e3]'
                } ${isGenerating ? 'cursor-wait opacity-80' : ''}`}
                onClick={onGenerate}
                disabled={!hasVideo || !modelReady || isGenerating}
            >
                {isGenerating ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true"/> : captionsForSelectedModel ? <CheckIcon/> : <SparkleIcon/>}
                {isGenerating ? copy.generating : captionsForSelectedModel ? copy.generated : copy.generateButton}
            </button>
            {isGenerating && <button type="button" className="mt-2 w-full text-xs text-muted hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]" onClick={onCancel}>{copy.cancelGeneration}</button>}
            {isGenerating && <span className="sr-only" role="status">{copy.generating}</span>}
            {generationError && <p className="mt-2 text-xs text-red-300" role="alert">{generationError}</p>}
        </section>

        {/* Paso 3: Personaliza tus subtítulos (Solo activo si se generaron subtítulos) */}
        <section className={`${stepClass} ${step3Status === 'locked' ? 'opacity-40' : ''}`}>
            <h2 className={`${headingClass} ${step3Status === 'locked' ? 'text-[#5d6c82]' : 'text-white'}`}>
                <StepBadge step={3} status={step3Status} />
                <span>{copy.style}</span>
            </h2>
            <button
                className={`flex h-[78px] w-full items-center rounded-[11px] border border-[#30394a] bg-surface px-[13px] py-[11px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff] ${
                    !captionsReady
                        ? 'cursor-not-allowed'
                        : 'cursor-pointer hover:bg-[#202838]'
                }`}
                onClick={() => {
                    if (!captionsReady) return;
                    setStylesOpen(o => !o);
                }}
                disabled={!captionsReady}
                aria-expanded={stylesOpen}
            >
                <span
                    className="grid size-[50px] shrink-0 place-items-center rounded-[9px] font-extrabold text-[17px] shadow-sm transition-all select-none"
                    style={{
                        fontFamily: project.selectedStyle.fontFamily ?? 'Nunito, sans-serif',
                        backgroundColor: project.selectedStyle.hasBgPill
                            ? (project.selectedStyle.bgPillColor ?? '#5d50ee')
                            : (project.selectedStyle.id === 'pop' ? '#f04b89' : '#1f2736'),
                        textShadow: project.selectedStyle.textShadow && project.selectedStyle.textShadow !== 'none'
                            ? project.selectedStyle.textShadow
                            : undefined,
                    }}
                >
                    <span>
                        <span style={{color: project.selectedStyle.highlightColor ?? '#8a7dff'}}>A</span>
                        <span style={{color: project.selectedStyle.textColor ?? '#ffffff'}}>a</span>
                    </span>
                </span>
                <span className="mx-3 min-w-0 flex-1">
                    <strong className="block text-white truncate">{currentStyleName}</strong>
                    <small className="mt-[3px] block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{currentStyleDesc}</small>
                </span>
                <ChevronIcon className={`w-[17px] text-[#9ba6b8] transition-transform duration-200 ${stylesOpen ? 'rotate-90' : ''}`}/>
            </button>
            {stylesOpen && captionsReady && (
                <div
                    ref={dropdownRef}
                    className="absolute top-[105px] right-0 left-0 z-30 max-h-72 overflow-y-auto rounded-[11px] border border-[#30394a] bg-[#131926] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,.6)] [scrollbar-width:thin]"
                >
                    {styles.map((style) => {
                        const isSelected = project.selectedStyle.id === style.id;
                        const name = stylesById?.[style.id]?.name ?? style.name;
                        return (
                            <button
                                key={style.id}
                                onClick={() => {
                                    onStyleSelect(style);
                                    setStylesOpen(false);
                                }}
                                className={`flex min-h-[40px] w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#20293a] hover:text-white ${
                                    isSelected ? 'bg-[#222c3e] font-bold text-white' : 'text-[#c2cbd8]'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                        className="grid size-6 shrink-0 place-items-center rounded text-[10px] font-black select-none"
                                        style={{
                                            fontFamily: style.fontFamily ?? 'sans-serif',
                                            backgroundColor: style.hasBgPill
                                                ? (style.bgPillColor ?? '#5d50ee')
                                                : '#273142',
                                        }}
                                    >
                                        <span>
                                            <span style={{color: style.highlightColor ?? '#8a7dff'}}>A</span>
                                            <span style={{color: style.textColor ?? '#ffffff'}}>a</span>
                                        </span>
                                    </span>
                                    <span className="truncate">{name}</span>
                                    {style.isCustom && (
                                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                            Custom
                                        </span>
                                    )}
                                </div>
                                {isSelected && <CheckIcon className="size-4 shrink-0 text-[#8b7fff]" />}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor="caption-size" className="text-xs font-semibold text-[#c7ced9]">{copy.captionSize}</label>
                    <div className="flex items-center gap-2">
                        <output htmlFor="caption-size" className="text-xs font-bold tabular-nums text-white">{project.captionSize}%</output>
                        <ResetButton
                            disabled={!captionsReady || project.captionSize === 100}
                            onClick={() => onCaptionSizeChange(100)}
                            label={copy.resetSize}
                        />
                    </div>
                </div>
                <input id="caption-size" type="range" min="25" max="300" step="5" value={project.captionSize} disabled={!captionsReady} onChange={event => onCaptionSizeChange(Number(event.target.value))} className="seek mt-3 h-2 w-full cursor-pointer rounded-full bg-[#30394a] accent-primary disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]"/>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#7d8b9f]">
                    <span>{copy.captionSizeHint}</span>
                    <span className="tabular-nums">25% – 300%</span>
                </div>
            </div>
            <div className="mt-4 border-t border-[#273143] pt-4">
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor="caption-position" className="text-xs font-semibold text-[#c7ced9]">{copy.captionPosition}</label>
                    <div className="flex items-center gap-2">
                        <output htmlFor="caption-position" className="text-xs font-bold tabular-nums text-white">{project.captionPosition}%</output>
                        <ResetButton
                            disabled={!captionsReady || project.captionPosition === 0}
                            onClick={() => onCaptionPositionChange(0)}
                            label={copy.resetSize}
                        />
                    </div>
                </div>
                <input id="caption-position" type="range" min="0" max="100" step="1" value={project.captionPosition} disabled={!captionsReady} onChange={event => onCaptionPositionChange(Number(event.target.value))} className="seek mt-3 h-2 w-full cursor-pointer rounded-full bg-[#30394a] accent-primary disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]"/>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#7d8b9f]">
                    <span>{copy.positionOriginal}</span>
                    <span>{copy.positionTop}</span>
                </div>
            </div>
        </section>

        {/* Paso 4: Exportar (Solo activo si hay video y subtítulos generados) */}
        <section className={step4Status === 'locked' ? 'opacity-40' : ''}>
            <h2 className={`${headingClass} ${step4Status === 'locked' ? 'text-[#5d6c82]' : 'text-white'}`}>
                <StepBadge step={4} status={step4Status} />
                <span>{copy.export}</span>
            </h2>
            <button
                className={`${buttonClass} ${
                    step4Status === 'locked'
                        ? 'border border-[#222a38] bg-[#141924] text-[#556377] cursor-not-allowed'
                        : 'border border-[#38465d] bg-[#1d2638] text-white hover:bg-[#26334a] cursor-pointer'
                }`}
                disabled={step4Status === 'locked'}
                onClick={onExport}
            >
                <ExportIcon/> {copy.exportVideo}
            </button>
        </section>
    </aside>;
}
