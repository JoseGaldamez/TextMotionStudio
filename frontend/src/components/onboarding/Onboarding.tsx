import {useEffect, useState} from 'react';
import {AudioWaveIcon, BoltIcon, CheckIcon, ChevronIcon, ExportIcon, SparkleIcon, VideoIcon} from '../Icons';
import logotype from '../../assets/images/textmotion-logotipo.png';
import {cancelDownload, downloadModel, listModels, selectModel, subscribeToModelDownloads, type DownloadProgress, type ModelInfo, type ModelStatus} from './modelDownload';
import {getCopy, getModelCopy, type Language} from '../../i18n';

type Step = 'welcome' | 'tour' | 'setup' | 'download' | 'ready';

interface Props {
    onComplete: (language: Language) => Promise<void>;
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

function DownloadProgress({model, onComplete, onError, onCancel, language}: {model: ModelInfo; onComplete: () => void; onError: (message: string) => void; onCancel: () => void; language: Language}) {
    const [progress, setProgress] = useState<DownloadProgress>({modelId: model.id, bytesDownloaded: 0, totalBytes: model.sizeBytes, percentage: 0});
    const copy = getCopy(language).onboarding;
    const localizedModels = getModelCopy(language);
    useEffect(() => {
        const unsubscribe = subscribeToModelDownloads({progress: value => {if (value.modelId === model.id) setProgress(value)}, completed: value => {if (value.modelId === model.id) onComplete()}, error: value => {if (value.modelId === model.id) onError(value.message)}, canceled: value => {if (value.modelId === model.id) onCancel()}});
        void downloadModel(model.id).catch(error => onError(String(error)));
        return unsubscribe;
    }, [model.id]);
    const percent = Math.min(100, Math.round(progress.percentage));
    const formatMiB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
    return <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-8 grid size-16 place-items-center rounded-2xl bg-primary/15 text-highlight"><AudioWaveIcon className="size-8"/></div>
        <h2 className="text-[32px] font-bold tracking-[-.03em]">{progress.validating ? 'Validating…' : copy.downloading}</h2>
        <p className="mt-3 text-sm text-muted">{copy.settingUp.replace('{model}', localizedModels[model.id as keyof Pick<typeof localizedModels, 'base' | 'small' | 'medium'>]?.name ?? model.name)}</p>
        <div className="mt-12 flex items-end justify-between"><span className="text-sm text-muted">{formatMiB(progress.bytesDownloaded)} / {formatMiB(progress.totalBytes)}</span><strong className="text-2xl">{percent}%</strong></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#30394a]" role="progressbar" aria-label={copy.downloadProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{width: `${percent}%`}}/></div>
        <div className="mt-5 flex items-center justify-between"><p className="text-xs text-muted">{copy.keepOpen}{progress.bytesPerSecond ? ` · ${formatMiB(progress.bytesPerSecond)}/s` : ''}</p><button className="cursor-pointer text-xs text-muted hover:text-white" onClick={() => cancelDownload(model.id)}>{localizedModels.cancel}</button></div>
    </div>;
}

export function Onboarding({onComplete}: Props) {
    const [language, setLanguage] = useState<Language>('en');
    const copy = getCopy(language).onboarding;
    const localizedModels = getModelCopy(language);
    const [step, setStep] = useState<Step>('welcome');
    const [tourIndex, setTourIndex] = useState(0);
    const [modelStatus, setModelStatus] = useState<ModelStatus>('not-installed');
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [selectedModelID, setSelectedModelID] = useState('small');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {void listModels().then(values => {setModels(values); const selected = values.find(model => model.selected); if (selected) setSelectedModelID(selected.id)}).catch(() => setError('Could not load transcription models.'))}, []);

    const finish = async () => {
        setSaving(true);
        setError('');
        try {
            await onComplete(language);
        } catch {
            setError(copy.saveError);
        } finally {
            setSaving(false);
        }
    };
    const selectedModel = models.find(model => model.id === selectedModelID);
    const downloadComplete = async () => {try {await selectModel(selectedModelID); setModelStatus('installed'); setStep('ready')} catch (reason) {setModelStatus('error'); setError(String(reason))}};

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
                    <div className="mb-7 grid size-16 place-items-center rounded-2xl bg-primary/15 text-highlight"><AudioWaveIcon className="size-8"/></div>
                    <h2 className="text-[32px] font-bold tracking-[-.03em]">{copy.setupTitle}</h2>
                    <p className="mt-3 max-w-[540px] text-sm leading-relaxed text-muted">
                        {copy.setupDescription}{' '}
                        <strong className="inline-block font-bold text-[#d8d2ff] bg-primary/20 px-2 py-0.5 rounded-lg border border-primary/35 shadow-xs">
                            {copy.setupOnce}
                        </strong>
                    </p>
                    <div className="mt-7 grid grid-cols-3 gap-3">{copy.benefits.map(benefit => <div key={benefit} className="flex items-start gap-2 rounded-xl bg-surface p-3 text-xs leading-snug"><CheckIcon className="size-4 shrink-0 text-highlight"/>{benefit}</div>)}</div>
                    <div className="mt-7 grid grid-cols-3 gap-3 items-stretch">{models.map(model => {
                        const localized = localizedModels[model.id as keyof Pick<typeof localizedModels, 'base' | 'small' | 'medium'>];
                        const isSelected = selectedModelID === model.id;
                        return <button
                            key={model.id}
                            type="button"
                            onClick={() => setSelectedModelID(model.id)}
                            className={`flex flex-col justify-start h-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
                                isSelected ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(102,87,245,0.4)]' : 'border-border bg-[#101620] hover:border-[#566078]'
                            }`}
                        >
                            <div className="flex min-h-[22px] items-center justify-between gap-1.5">
                                <strong className="text-sm font-bold text-foreground">{localized?.name ?? model.name}</strong>
                                {model.recommended && (
                                    <span className="shrink-0 rounded-full bg-primary/25 px-2 py-0.5 text-[9px] font-bold text-[#c5beff]">
                                        {localizedModels.recommended}
                                    </span>
                                )}
                            </div>
                            <span className="mt-1.5 block text-xs font-medium text-muted">{model.displaySize}</span>
                            <p className="mt-3.5 text-[11px] leading-relaxed text-muted flex-1">{localized?.description ?? model.description}</p>
                            <div className="mt-3 pt-1 text-[10px]">
                                {model.recommended && <span className="block font-semibold text-[#bcb6ff]">{localizedModels.recommendedHint}</span>}
                                {model.resourceNote && <span className="block text-muted">{localizedModels.resourceNote}</span>}
                                {model.status === 'installed' && <span className="block font-bold text-[#83e1ae]">{localizedModels.installed}</span>}
                            </div>
                        </button>;
                    })}</div>
                    <div className="mt-9 flex gap-3"><button className={primaryButton} disabled={!selectedModel} onClick={() => {if (selectedModel?.status === 'installed') void downloadComplete(); else {setError(''); setModelStatus('downloading'); setStep('download')}}}>{selectedModel?.status === 'installed' ? localizedModels.useModel : copy.downloadModel}</button><button className={secondaryButton} onClick={finish} disabled={saving}>{copy.setupLater}</button></div>
                </div>}

                {step === 'download' && modelStatus === 'downloading' && selectedModel && <DownloadProgress model={selectedModel} onComplete={() => void downloadComplete()} onError={message => {setModelStatus('error'); setError(message)}} onCancel={() => {setModelStatus('not-installed'); setStep('setup')}} language={language}/>}
                {step === 'download' && modelStatus === 'error' && <div className="mx-auto max-w-[540px] text-center"><h2 className="text-2xl font-bold">Download interrupted</h2><p className="mt-4 text-sm text-[#ff9b9b]">{error}</p><div className="mt-8 flex justify-center gap-3"><button className={primaryButton} onClick={() => {setError('');setModelStatus('downloading')}}>Retry</button><button className={secondaryButton} onClick={() => {setError('');setModelStatus('not-installed');setStep('setup')}}>Back</button></div></div>}

                {step === 'ready' && modelStatus === 'installed' && <div className="mx-auto max-w-[540px] text-center">
                    <div className="mx-auto mb-8 grid size-[72px] place-items-center rounded-full bg-[#26382f] text-[#83e1ae]"><CheckIcon className="size-9"/></div>
                    <h2 className="text-[38px] font-bold tracking-[-.035em]">{copy.readyTitle}</h2>
                    <p className="mt-4 text-base text-muted">{copy.readyDescription}</p>
                    <button className={`${primaryButton} mt-10`} onClick={finish} disabled={saving}>{copy.firstProject}</button>
                </div>}
                {error && <p role="alert" className="mt-5 text-center text-sm text-[#ff9b9b]">{error}</p>}
            </div>
            <div className="flex h-12 items-center justify-center gap-2 border-t border-border">{(['welcome', 'tour', 'setup', 'download', 'ready'] as Step[]).map((item, i) => <span key={item} className={`h-1 rounded-full ${i <= ['welcome', 'tour', 'setup', 'download', 'ready'].indexOf(step) ? 'w-7 bg-primary' : 'w-7 bg-[#384154]'}`}/>)}</div>
        </div>
    </main>;
}
