import {useRef, useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {BoltIcon, CheckIcon, ChevronIcon, CpuIcon, SettingsIcon, ShieldCheckIcon, SparkleIcon} from '../Icons';
import {ModelDownloadProgress} from '../ModelDownloadProgress';
import {getCopy, getModelCopy, type Language} from '../../i18n';
import type {config} from '../../../wailsjs/go/models';
import {useLocalModels} from '../../useLocalModels';
import type {ModelInfo} from '../onboarding/modelDownload';
import thirdPartyNotices from '../../../../THIRD_PARTY_NOTICES.txt?raw';

interface Props {
    language: Language;
    appConfig: config.AppConfig | null;
    onLanguageChange: (lang: Language) => Promise<void>;
    onDeviceChange: (device: 'auto' | 'cpu') => Promise<void>;
}

type TabType = 'general' | 'ai' | 'about';

export function SettingsView({language, appConfig, onLanguageChange, onDeviceChange}: Props) {
    const copy = getCopy(language).settingsView;
    const localizedModels = getModelCopy(language);
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const computeDevice = appConfig?.transcriptionDevice === 'cpu' ? 'cpu' : 'auto';
    const [savingDevice, setSavingDevice] = useState(false);
    const [deviceError, setDeviceError] = useState('');
    const {models: localModels, progressById: modelProgress, error: modelError, select, download, cancel, remove} = useLocalModels();
    const [selectingModelId, setSelectingModelId] = useState<string | null>(null);
    const selectionInProgress = useRef(false);

    const handleDeviceChange = async (device: 'auto' | 'cpu') => {
        if (savingDevice || device === computeDevice) return;
        setSavingDevice(true);
        setDeviceError('');
        try {
            await onDeviceChange(device);
        } catch {
            setDeviceError(copy.deviceSaveError);
        } finally {
            setSavingDevice(false);
        }
    };

    const handleModelAction = async (model: ModelInfo) => {
        if (selectionInProgress.current) return;
        if (model.status === 'installed') {
            selectionInProgress.current = true;
            setSelectingModelId(model.id);
            try {
                await select(model.id);
            } finally {
                selectionInProgress.current = false;
                setSelectingModelId(null);
            }
            return;
        }
        else if (model.status === 'downloading') void cancel(model.id);
        else void download(model.id);
    };

    const tabs: {id: TabType; label: string; icon: any}[] = [
        {id: 'general', label: copy.general, icon: SettingsIcon},
        {id: 'ai', label: copy.aiModel, icon: SparkleIcon},
        {id: 'about', label: copy.about, icon: ShieldCheckIcon},
    ];

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background text-foreground">
            {/* Left Settings Navigation */}
            <aside className="flex w-[222px] shrink-0 flex-col border-r border-border bg-[#101722] px-4 py-6">
                <div className="mb-8 flex items-center gap-3 px-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-[#b6adff]"><SettingsIcon className="size-5" /></span>
                    <div>
                        <h2 className="text-sm font-extrabold leading-tight text-white">{copy.title}</h2>
                        <p className="mt-0.5 text-[11px] text-muted">TextMotion Studio</p>
                    </div>
                </div>

                <nav className="grid gap-1" aria-label={copy.title}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                    isActive
                                        ? 'bg-[#272444] text-white'
                                        : 'text-[#a8b4c7] hover:bg-[#1a2433] hover:text-white'
                                }`}
                            >
                                <Icon className="size-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="mt-auto flex items-start gap-2 border-t border-border px-2 pt-5 text-xs leading-relaxed text-muted">
                    <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#9c91ff]" />
                    <span>{copy.localProcessing}</span>
                </div>
            </aside>

            {/* Right Settings Content Area */}
            <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-8 [scrollbar-width:thin]">
                {/* 1. General Tab */}
                {activeTab === 'general' && (
                    <div className="mx-auto w-full max-w-3xl space-y-6">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-white">{copy.general}</h1>
                            <p className="mt-2 text-sm text-muted">{copy.generalDescription}</p>
                        </div>

                        {/* Language Selection */}
                        <div className="rounded-2xl border border-border bg-[#151d2b] p-6">
                            <h2 className="text-base font-bold text-white">{copy.appLanguage}</h2>
                            <p className="mt-1 text-sm text-muted">{copy.languageDescription}</p>
                            <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label={copy.appLanguage}>
                                {[
                                    {code: 'en' as Language, label: 'English (US)'},
                                    {code: 'es' as Language, label: 'Español (América Latina)'},
                                ].map(lang => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => onLanguageChange(lang.code)}
                                        aria-pressed={language === lang.code}
                                        className={`flex min-h-16 cursor-pointer items-center justify-between rounded-xl border px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                            language === lang.code
                                                ? 'border-primary/70 bg-primary/15 text-white'
                                                : 'border-[#344056] bg-[#111927] text-[#b7c3d4] hover:border-[#7168ac] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-xs font-extrabold text-[#c4bcff]">{lang.code.toUpperCase()}</span>
                                            <span>{lang.label}</span>
                                        </div>
                                        {language === lang.code && <CheckIcon className="size-4 text-[#b6adff]" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* One clear path to the transcription device setting. */}
                        <div className="rounded-2xl border border-border bg-[#151d2b] p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#b6adff]"><BoltIcon className="size-5" /></span>
                                    <div>
                                        <h2 className="text-base font-bold text-white">{copy.computeDevice}</h2>
                                        <p className="mt-1 text-sm leading-relaxed text-muted">{copy.deviceSummary}</p>
                                        <p className="mt-3 text-sm font-bold text-[#c8c1ff]">{computeDevice === 'auto' ? copy.autoGpu : copy.forceCpu}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setActiveTab('ai')} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#3d4860] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#202b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                    {copy.changeDevice}<ChevronIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. AI & Transcription Tab */}
                {activeTab === 'ai' && (
                    <div className="mx-auto w-full max-w-3xl space-y-6">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-white">{copy.aiModel}</h1>
                            <p className="mt-2 text-sm text-muted">{copy.modelDesc}</p>
                        </div>

                        {/* The selected mode is persisted and used on the next transcription. */}
                        <div className="rounded-2xl border border-border bg-[#151d2b] p-6">
                            <div className="flex items-start gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#b6adff]"><BoltIcon className="size-5" /></span>
                                <div>
                                    <h2 className="text-base font-bold text-white">{copy.computeDevice}</h2>
                                    <p className="mt-1 text-sm text-muted">{copy.deviceSummary}</p>
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label={copy.computeDevice}>
                                {([
                                    {id: 'auto', label: copy.autoGpu, desc: copy.deviceAutoDescription, icon: BoltIcon},
                                    {id: 'cpu', label: copy.forceCpu, desc: copy.deviceCpuDescription, icon: CpuIcon},
                                ] as const).map(dev => {
                                    const Icon = dev.icon;
                                    const selected = computeDevice === dev.id;
                                    return (
                                        <button
                                            key={dev.id}
                                            type="button"
                                            onClick={() => void handleDeviceChange(dev.id)}
                                            disabled={!appConfig || savingDevice}
                                            aria-pressed={selected}
                                            className={`min-h-32 cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${selected ? 'border-primary/70 bg-primary/15' : 'border-[#344056] bg-[#111927] hover:border-[#7168ac] hover:bg-[#1a2434]'}`}
                                        >
                                            <span className="flex items-center gap-2.5 text-sm font-bold text-white">
                                                <Icon className="size-4 text-[#b6adff]" />
                                                <span className="flex-1">{dev.label}</span>
                                                {selected && <CheckIcon className="size-4 text-[#b6adff]" />}
                                            </span>
                                            <span className="mt-2 block text-xs leading-relaxed text-[#adbacd]">{dev.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-4 text-xs leading-relaxed text-muted">{copy.deviceNote}</p>
                            {savingDevice && <p className="mt-3 text-xs text-[#c8c1ff]" role="status">{copy.savingDevice}</p>}
                            {deviceError && <p className="mt-3 text-xs text-red-300" role="alert">{deviceError}</p>}
                        </div>

                        {/* Local Models List */}
                        <div className="rounded-2xl border border-border bg-[#151d2b] p-6">
                            <h2 className="mb-4 text-base font-bold text-white">{copy.localModel}</h2>
                            <div className="space-y-3">
                                {localModels.map(model => {
                                    const isSelected = model.selected;
                                    const isSelecting = selectingModelId === model.id;
                                    const localized = localizedModels[model.id as keyof Pick<typeof localizedModels, 'base' | 'small' | 'medium'>];
                                    return (
                                        <div
                                            key={model.id}
                                            className={`rounded-xl border p-4 transition-colors ${
                                                isSelected
                                                    ? 'border-primary/60 bg-primary/10'
                                                    : 'border-[#344056] bg-[#111927] hover:border-[#7168ac]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <strong className="text-sm font-bold text-white">{localized?.name ?? model.name}</strong>
                                                        <span className="rounded-md bg-[#263247] px-2 py-0.5 text-[11px] text-[#c3cddd]">{model.displaySize}</span>
                                                        {model.recommended && <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-[#c8c1ff]">{localizedModels.recommended}</span>}
                                                    </div>
                                                    <p className="mt-1.5 text-xs leading-relaxed text-[#adbacd]">{localized?.description ?? model.description}</p>
                                                </div>

                                                <div className="shrink-0">
                                                    {isSelected ? (
                                                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                                                            {copy.activeBadge}
                                                        </span>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button type="button" onClick={() => void handleModelAction(model)} disabled={selectingModelId !== null} aria-busy={isSelecting} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#3d4860] px-3 py-2 text-xs font-bold text-white hover:bg-[#263247] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary">{isSelecting && <LoaderCircle className="size-3 animate-spin" aria-hidden="true"/>}{isSelecting ? localizedModels.selecting : model.status === 'installed' ? localizedModels.select : model.status === 'downloading' ? localizedModels.cancel : copy.downloadAction}</button>
                                                            {model.status === 'installed' && <button type="button" onClick={() => void remove(model.id)} disabled={selectingModelId !== null} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary">{localizedModels.delete}</button>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelecting && <span className="sr-only" role="status">{localizedModels.selecting}</span>}
                                            {model.status === 'downloading' && <ModelDownloadProgress progress={modelProgress[model.id]} language={language}/>}
                                        </div>
                                    );
                                })}
                            </div>
                            {modelError && <p className="mt-3 text-xs text-red-300" role="alert">{modelError}</p>}
                        </div>

                    </div>
                )}

                {/* About Tab */}
                {activeTab === 'about' && (
                    <div className="mx-auto w-full max-w-3xl space-y-6">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-white">{copy.about}</h1>
                            <p className="mt-2 text-sm text-muted">{copy.aboutDescription}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-[#151d2b] p-6">
                            <div className="flex items-start gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300"><ShieldCheckIcon className="size-6" /></span>
                                <div>
                                    <h2 className="text-base font-bold text-white">{copy.privacyGuarantee}</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-muted">{copy.privacyDesc}</p>
                                </div>
                            </div>
                        </div>
                        <details className="rounded-2xl border border-border bg-[#151d2b]">
                            <summary className="cursor-pointer px-6 py-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{copy.openSourceLicenses}</summary>
                            <pre className="max-h-96 overflow-auto border-t border-border px-6 py-5 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#b7c3d4]">{thirdPartyNotices}</pre>
                        </details>
                    </div>
                )}
            </main>
        </div>
    );
}
