import {useEffect, useState} from 'react';
import {BoltIcon, CheckIcon, ChevronIcon, ExportIcon, SparkleIcon, VideoIcon} from '../Icons';
import logotype from '../../assets/images/textmotion-logotipo.png';
import {modelDetails, startModelDownload, type ModelStatus} from './modelDownload';
import {getCopy, type Language} from '../../i18n';

type Step = 'welcome' | 'tour' | 'setup' | 'download' | 'ready';

interface Props {
    onComplete: (modelInstalled: boolean, language: Language) => Promise<void>;
}

const primaryButton = 'inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-primary px-6 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight';
const secondaryButton = 'inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface px-6 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight';

function TourVisual({index, language}: {index: number; language: Language}) {
    const copy = getCopy(language).onboarding;
    if (index === 0) return <div className="flex h-[190px] items-center justify-center rounded-xl border border-dashed border-[#414d64] bg-surface/70">
        <div className="text-center"><VideoIcon className="mx-auto mb-4 size-9 text-[#dce3ed]"/><strong className="block text-sm">{copy.dropVideo}</strong><span className="mt-1 block text-xs text-muted">MP4, MOV, MKV, AVI…</span></div>
    </div>;
    if (index === 1) return <div className="flex h-[190px] flex-col items-center justify-center rounded-xl border border-border bg-[#101620] px-8">
        <div className="mb-5 flex items-end gap-[3px]" aria-hidden="true">{[12, 22, 16, 31, 24, 39, 18, 29, 16, 35, 21, 27, 13].map((height, i) => <span key={i} className="w-[5px] rounded-sm bg-highlight" style={{height}}/>)}</div>
        <div className="rounded-lg bg-primary px-4 py-2 text-lg font-bold text-white">{copy.sampleCaption}</div>
    </div>;
    return <div className="flex h-[190px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-[#101620]">
        <div className="flex gap-2"><span className="rounded-lg bg-primary px-4 py-2 text-sm font-bold">{getCopy(language).styles[0].name}</span><span className="rounded-lg bg-[#30394a] px-4 py-2 text-sm font-bold">{getCopy(language).styles[1].name}</span><span className="rounded-lg bg-[#30394a] px-4 py-2 text-sm font-bold">{getCopy(language).styles[3].name}</span></div>
        <div className="flex items-center gap-2 text-sm text-muted"><ExportIcon className="size-4"/> {copy.readyToExport}</div>
    </div>;
}

function DownloadProgress({onComplete, language}: {onComplete: () => void; language: Language}) {
    const [percent, setPercent] = useState(0);
    const copy = getCopy(language).onboarding;
    useEffect(() => startModelDownload(setPercent, onComplete), [onComplete]);
    const downloaded = Math.round(modelDetails.sizeMB * percent / 100);
    return <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-8 grid size-16 place-items-center rounded-2xl bg-primary/15 text-highlight"><SparkleIcon className="size-8"/></div>
        <h2 className="text-[32px] font-bold tracking-[-.03em]">{copy.downloading}</h2>
        <p className="mt-3 text-sm text-muted">{copy.settingUp.replace('{model}', modelDetails.name)}</p>
        <div className="mt-12 flex items-end justify-between"><span className="text-sm text-muted">{downloaded} MB / {modelDetails.sizeMB} MB</span><strong className="text-2xl">{percent}%</strong></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#30394a]" role="progressbar" aria-label={copy.downloadProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{width: `${percent}%`}}/></div>
        <p className="mt-5 text-xs text-muted">{copy.keepOpen}</p>
    </div>;
}

export function Onboarding({onComplete}: Props) {
    const [language, setLanguage] = useState<Language>('en');
    const copy = getCopy(language).onboarding;
    const [step, setStep] = useState<Step>('welcome');
    const [tourIndex, setTourIndex] = useState(0);
    const [modelStatus, setModelStatus] = useState<ModelStatus>('not-installed');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const finish = async (installed: boolean) => {
        setSaving(true);
        setError('');
        try {
            await onComplete(installed, language);
        } catch {
            setError(copy.saveError);
        } finally {
            setSaving(false);
        }
    };
    const downloadComplete = () => {setModelStatus('installed'); setStep('ready')};

    return <main className="flex h-full min-w-[1280px] items-center justify-center overflow-y-auto bg-background px-12 py-10 text-foreground [@media(max-height:820px)]:items-start [@media(max-height:820px)]:py-4">
        <div className="w-full max-w-[780px] overflow-hidden rounded-2xl border border-border bg-secondary shadow-[0_24px_70px_rgba(0,0,0,.22)]">
            <div className="flex items-center justify-between border-b border-border px-10 py-6">
                <div className="w-full max-w-[210px]"><img src={logotype} alt="TextMotion Studio" className="block h-auto w-full"/></div>
                <div className="text-xs text-muted">{step === 'welcome' ? copy.welcome : step === 'tour' ? `${copy.tour} ${tourIndex + 1} ${copy.of} 3` : step === 'setup' ? copy.localSetup : step === 'download' ? copy.modelDownload : copy.ready}</div>
            </div>

            <div className="flex min-h-[490px] flex-col justify-center px-16 py-12 [@media(max-height:820px)]:min-h-[420px] [@media(max-height:820px)]:py-8">
                {step === 'welcome' && <div className="mx-auto max-w-[560px] text-center">
                    <h1 className="text-balance text-[38px] leading-tight font-extrabold tracking-[-.035em]">{copy.headline}</h1>
                    <p className="mx-auto mt-5 max-w-[420px] text-balance text-base leading-relaxed text-muted">{copy.intro}</p>
                    <div className="mt-7 inline-flex items-center gap-2 text-xs text-muted"><BoltIcon className="size-4 text-highlight"/> {copy.privacy}</div>
                    <fieldset className="mx-auto mt-8 w-full max-w-[340px] text-left"><legend className="mb-2 text-xs font-semibold text-muted">{copy.appLanguage}</legend><div className="grid grid-cols-2 gap-2">{(['en', 'es'] as const).map(option => <label key={option} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-highlight ${language === option ? 'border-primary bg-primary/15 text-foreground' : 'border-border bg-surface text-muted hover:bg-surface-hover'}`}><input className="sr-only" type="radio" name="app-language" value={option} checked={language === option} onChange={() => setLanguage(option)}/>{option === 'en' ? 'English' : 'Español'}</label>)}</div></fieldset>
                    <div className="mt-8"><button className={primaryButton} onClick={() => setStep('tour')}>{copy.getStarted} <ChevronIcon className="size-4"/></button></div>
                </div>}

                {step === 'tour' && <div className="mx-auto w-full max-w-[570px]">
                    <TourVisual index={tourIndex} language={language}/>
                    <h2 className="mt-9 text-[30px] font-bold tracking-[-.03em]">{copy.tourItems[tourIndex].title}</h2>
                    <p className="mt-3 max-w-[500px] text-sm leading-relaxed text-muted">{copy.tourItems[tourIndex].description}</p>
                    {tourIndex === 1 && <p className="mt-4 flex items-center gap-2 text-xs text-[#bcb6ff]"><BoltIcon className="size-4"/> {copy.neverUploaded}</p>}
                    <div className="mt-10 flex items-center justify-between">
                        <div className="flex gap-2" aria-label={`${copy.tourStep} ${tourIndex + 1} ${copy.of} 3`}>{copy.tourItems.map((_, i) => <span key={i} className={`h-[7px] rounded-full transition-[width,background] ${i === tourIndex ? 'w-7 bg-primary' : 'w-[7px] bg-[#454e60]'}`}/>)}</div>
                        <div className="flex gap-3"><button className={secondaryButton} onClick={() => {if (tourIndex === 0) setStep('welcome'); else setTourIndex(tourIndex - 1)}}>{copy.back}</button><button className={primaryButton} onClick={() => {if (tourIndex === 2) setStep('setup'); else setTourIndex(tourIndex + 1)}}>{copy.continue}</button></div>
                    </div>
                    <button className="mt-7 cursor-pointer text-xs text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-highlight" onClick={() => setStep('setup')}>{copy.skipTour}</button>
                </div>}

                {step === 'setup' && <div className="mx-auto w-full max-w-[560px]">
                    <div className="mb-7 grid size-16 place-items-center rounded-2xl bg-primary/15 text-highlight"><SparkleIcon className="size-8"/></div>
                    <h2 className="text-[32px] font-bold tracking-[-.03em]">{copy.setupTitle}</h2>
                    <p className="mt-3 max-w-[500px] text-sm leading-relaxed text-muted">{copy.setupDescription}</p>
                    <div className="mt-7 grid grid-cols-3 gap-3">{copy.benefits.map(benefit => <div key={benefit} className="flex items-start gap-2 rounded-xl bg-surface p-3 text-xs leading-snug"><CheckIcon className="size-4 shrink-0 text-highlight"/>{benefit}</div>)}</div>
                    <div className="mt-8 flex justify-between rounded-xl border border-border bg-[#101620] px-5 py-4 text-sm"><div><span className="block text-xs text-muted">{copy.recommendedModel}</span><strong className="mt-1 block">{modelDetails.name}</strong></div><div className="text-right"><span className="block text-xs text-muted">{copy.downloadSize}</span><strong className="mt-1 block">{modelDetails.displaySize}</strong></div></div>
                    <div className="mt-9 flex gap-3"><button className={primaryButton} onClick={() => {setModelStatus('downloading'); setStep('download')}}>{copy.downloadModel}</button><button className={secondaryButton} onClick={() => finish(false)} disabled={saving}>{copy.setupLater}</button></div>
                </div>}

                {step === 'download' && modelStatus === 'downloading' && <DownloadProgress onComplete={downloadComplete} language={language}/>}

                {step === 'ready' && modelStatus === 'installed' && <div className="mx-auto max-w-[540px] text-center">
                    <div className="mx-auto mb-8 grid size-[72px] place-items-center rounded-full bg-[#26382f] text-[#83e1ae]"><CheckIcon className="size-9"/></div>
                    <h2 className="text-[38px] font-bold tracking-[-.035em]">{copy.readyTitle}</h2>
                    <p className="mt-4 text-base text-muted">{copy.readyDescription}</p>
                    <button className={`${primaryButton} mt-10`} onClick={() => finish(true)} disabled={saving}>{copy.firstProject}</button>
                </div>}
                {error && <p role="alert" className="mt-5 text-center text-sm text-[#ff9b9b]">{error}</p>}
            </div>
            <div className="flex h-12 items-center justify-center gap-2 border-t border-border">{(['welcome', 'tour', 'setup', 'download', 'ready'] as Step[]).map((item, i) => <span key={item} className={`h-1 rounded-full ${i <= ['welcome', 'tour', 'setup', 'download', 'ready'].indexOf(step) ? 'w-7 bg-primary' : 'w-7 bg-[#384154]'}`}/>)}</div>
        </div>
    </main>;
}
