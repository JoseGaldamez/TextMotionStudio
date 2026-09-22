import {useRef, useState} from 'react';
import type {CaptionStyle, VideoProject} from '../models';
import {CheckIcon, ChevronIcon, ExportIcon, SparkleIcon, VideoIcon} from './Icons';
import {getCopy, type Language} from '../i18n';

interface Props {project: VideoProject; styles: CaptionStyle[]; captionsReady: boolean; isGenerating: boolean; language: Language; onVideoSelect: (file: File) => void; onGenerate: () => void; onStyleSelect: (style: CaptionStyle) => void;}

const stepClass = 'relative mb-[29px] [@media(max-height:820px)]:mb-5';
const headingClass = 'mb-[14px] text-[18px] tracking-[-.02em] [&_span]:text-[#c7ced9]';
const buttonClass = 'mt-3 flex h-[52px] w-full cursor-pointer items-center justify-center gap-[10px] rounded-[10px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]';

export function WorkflowPanel({project, styles, captionsReady, isGenerating, language, onVideoSelect, onGenerate, onStyleSelect}: Props) {
    const copy = getCopy(language).workflow;
    const styleCopy = getCopy(language).styles;
    const selectedStyleIndex = styles.findIndex(style => style.id === project.selectedStyle.id);
    const inputRef = useRef<HTMLInputElement>(null);
    const [stylesOpen, setStylesOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const acceptFile = (files: FileList | null) => {const file = files?.[0]; if (file) onVideoSelect(file)};

    return <aside className="overflow-y-auto border-r border-[#232b39] bg-[#111722] px-5 pt-[27px] pb-7 [scrollbar-width:thin] max-[1320px]:px-4 [@media(max-height:820px)]:pt-5" aria-label={copy.label}>
        <section className={stepClass}>
            <h2 className={headingClass}><span>1</span> {copy.load}</h2>
            <button className={`flex h-[166px] w-full cursor-pointer flex-col items-center justify-center rounded-[13px] border bg-[#1a2130] text-[#dfe5ef] transition-[border,background,transform] duration-200 hover:-translate-y-px hover:border-[#7062fb] hover:bg-[#1d2536] [@media(max-height:820px)]:h-[135px] [&>svg]:mb-[15px] [&>svg]:size-[31px] ${dragging ? '-translate-y-px border-[#7062fb] bg-[#1d2536]' : project.videoUrl ? 'border-[#4b5b61]' : 'border-[#30394a]'}`} onClick={() => inputRef.current?.click()} onDragOver={e => {e.preventDefault(); setDragging(true)}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files)}}>
                <input ref={inputRef} type="file" accept="video/*" hidden onChange={e => acceptFile(e.target.files)}/>
                {project.videoUrl ? <CheckIcon className="text-[#63d3a0]"/> : <VideoIcon className="text-[#dce3ed]"/>}
                <strong className="max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap text-sm">{project.videoName ?? copy.drop}</strong>
                <span className="mt-[5px] text-[13px] text-[#b5bfce]">{project.videoUrl ? copy.replace : copy.browse}</span>
                <small className="mt-[10px] text-[11px] text-[#8792a4]">MP4, MOV, MKV, AVI…</small>
            </button>
        </section>
        <section className={stepClass}>
            <h2 className={headingClass}><span>2</span> {copy.generate}</h2>
            <label className="block"><span className="sr-only">{copy.captionLanguage}</span><select className="h-[45px] w-full cursor-pointer rounded-[10px] border border-[#30394a] bg-surface pr-[42px] pl-[15px] text-[#e7ebf2] outline-0 focus-visible:border-[#8074ff] focus-visible:ring-[3px] focus-visible:ring-primary/20" defaultValue="en"><option value="en">{copy.englishAuto}</option><option value="es">{copy.spanish}</option><option value="fr">{copy.french}</option></select></label>
            <button className={`${buttonClass} ${captionsReady ? 'bg-[#26382f] text-[#83e1ae]' : 'bg-[linear-gradient(135deg,#5d50ee,#6f5cff)] shadow-[0_10px_24px_rgba(73,57,212,.2)] hover:bg-[linear-gradient(135deg,#6a5cf5,#796aff)]'} disabled:cursor-wait disabled:opacity-70`} onClick={onGenerate} disabled={isGenerating}>{captionsReady ? <CheckIcon/> : <SparkleIcon/>}{isGenerating ? copy.generating : captionsReady ? copy.generated : copy.generateButton}</button>
        </section>
        <section className={stepClass}>
            <h2 className={headingClass}><span>3</span> {copy.style}</h2>
            <button className="flex h-[78px] w-full cursor-pointer items-center rounded-[11px] border border-[#30394a] bg-surface px-[13px] py-[11px] text-left hover:bg-[#202838] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]" onClick={() => setStylesOpen(o => !o)} aria-expanded={stylesOpen}>
                <span className={`grid size-[50px] shrink-0 place-items-center rounded-[9px] font-extrabold ${project.selectedStyle.id === 'karaoke' ? 'bg-[#f0efff] text-[#6152ed]' : project.selectedStyle.id === 'pop' ? '-rotate-2 bg-[#f5df55] text-[#6824c8]' : 'bg-[#f5f5f8] text-[#171b24]'} ${project.selectedStyle.id === 'bold' ? 'text-[19px] font-black' : project.selectedStyle.id === 'minimal' ? 'font-normal' : ''}`}>Aa</span>
                <span className="mx-3 min-w-0 flex-1"><strong className="block">{styleCopy[selectedStyleIndex]?.name ?? project.selectedStyle.name}</strong><small className="mt-[5px] block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{styleCopy[selectedStyleIndex]?.description ?? project.selectedStyle.description}</small></span>
                <ChevronIcon className={`w-[17px] text-[#9ba6b8] transition-transform duration-200 ${stylesOpen ? 'rotate-90' : ''}`}/>
            </button>
            {stylesOpen && <div className="absolute top-[105px] right-0 left-0 z-5 rounded-[11px] border border-[#30394a] bg-surface p-[7px] shadow-[0_16px_36px_rgba(0,0,0,.38)]">{styles.map((style, index) => <button key={style.id} onClick={() => {onStyleSelect(style); setStylesOpen(false)}} className={`flex h-[38px] w-full cursor-pointer items-center justify-between rounded-[7px] px-[10px] text-[#c9d0dc] hover:bg-[#272f42] hover:text-white [&_svg]:w-4 [&_svg]:text-[#8b7fff] ${project.selectedStyle.id === style.id ? 'bg-[#272f42] text-white' : ''}`}><span>{styleCopy[index]?.name ?? style.name}</span>{project.selectedStyle.id === style.id && <CheckIcon/>}</button>)}</div>}
        </section>
        <section>
            <h2 className={headingClass}><span>4</span> {copy.export}</h2>
            <button className={`${buttonClass} border border-[#354055] bg-[#202838] hover:enabled:bg-[#283245] disabled:cursor-not-allowed disabled:opacity-[.42]`} disabled={!project.videoUrl}><ExportIcon/> {copy.exportVideo}</button>
        </section>
    </aside>;
}
