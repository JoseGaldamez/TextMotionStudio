import {useRef, useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {CheckIcon, CpuIcon, KeyboardIcon, RefreshIcon, SettingsIcon, ShieldCheckIcon, TrashIcon, SparkleIcon} from '../Icons';
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
}

type TabType = 'general' | 'ai' | 'storage' | 'shortcuts' | 'about';

export function SettingsView({language, appConfig, onLanguageChange}: Props) {
    const copy = getCopy(language).settingsView;
    const localizedModels = getModelCopy(language);
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [theme, setTheme] = useState<'dark' | 'black' | 'slate'>('dark');
    const [hardwareAcc, setHardwareAcc] = useState(true);
    const [autoSave, setAutoSave] = useState(true);
    const {models: localModels, progressById: modelProgress, error: modelError, select, download, cancel, remove} = useLocalModels();
    const [selectingModelId, setSelectingModelId] = useState<string | null>(null);
    const selectionInProgress = useRef(false);
    const [computeDevice, setComputeDevice] = useState<'gpu' | 'cpu'>('gpu');
    const [wordTimestamps, setWordTimestamps] = useState(true);
    const [cacheCleared, setCacheCleared] = useState(false);
    const [cacheSize, setCacheSize] = useState('1.24 GB');
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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

    const handleClearCache = () => {
        setCacheSize('0 MB');
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 3000);
    };

    const handleCheckUpdates = () => {
        setCheckingUpdates(true);
        setUpdateStatus(null);
        setTimeout(() => {
            setCheckingUpdates(false);
            setUpdateStatus(copy.latestVersion);
        }, 1500);
    };

    const tabs: {id: TabType; label: string; icon: any}[] = [
        {id: 'general', label: copy.general, icon: SettingsIcon},
        {id: 'ai', label: copy.aiModel, icon: SparkleIcon},
        {id: 'storage', label: copy.storage, icon: TrashIcon},
        {id: 'shortcuts', label: copy.shortcuts, icon: KeyboardIcon},
        {id: 'about', label: copy.about, icon: ShieldCheckIcon},
    ];

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-[#0d121b] text-foreground">
            {/* Left Settings Navigation */}
            <aside className="w-[240px] shrink-0 border-r border-[#202838] bg-[#0e131d] p-5">
                <div className="mb-5 flex items-center gap-2 text-primary">
                    <SettingsIcon className="size-5" />
                    <h2 className="text-base font-bold text-white">{copy.title}</h2>
                </div>

                <nav className="grid gap-1.5">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-primary text-white shadow-sm font-bold'
                                        : 'text-[#96a4b8] hover:bg-[#161d2b] hover:text-white'
                                }`}
                            >
                                <Icon className="size-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Right Settings Content Area */}
            <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8 [scrollbar-width:thin]">
                {/* 1. General Tab */}
                {activeTab === 'general' && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <h1 className="text-xl font-bold text-white">{copy.general}</h1>
                            <p className="mt-1 text-xs text-muted">Configure your workspace preferences and appearance.</p>
                        </div>

                        {/* Language Selection */}
                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                            <label className="block text-sm font-bold text-white mb-1">{copy.appLanguage}</label>
                            <p className="text-xs text-muted mb-3">Choose the interface language for TextMotion Studio.</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {code: 'en' as Language, label: 'English (US)', flag: '🇺🇸'},
                                    {code: 'es' as Language, label: 'Español (América Latina)', flag: '🇪🇸'},
                                ].map(lang => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => onLanguageChange(lang.code)}
                                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition-all ${
                                            language === lang.code
                                                ? 'border-primary bg-primary/10 text-white shadow-sm'
                                                : 'border-[#232d3f] bg-[#151e2e] text-[#8e9cb1] hover:text-white hover:border-[#35435c]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-base">{lang.flag}</span>
                                            <span>{lang.label}</span>
                                        </div>
                                        {language === lang.code && <CheckIcon className="size-4 text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theme */}
                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                            <label className="block text-sm font-bold text-white mb-1">{copy.theme}</label>
                            <p className="text-xs text-muted mb-3">Tailor the visual contrast of your creative environment.</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    {id: 'dark', label: copy.darkStudio, preview: '#0d111a'},
                                    {id: 'black', label: copy.pitchBlack, preview: '#000000'},
                                    {id: 'slate', label: copy.slate, preview: '#181e29'},
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTheme(t.id as any)}
                                        className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                                            theme === t.id
                                                ? 'border-primary bg-primary/10 text-white'
                                                : 'border-[#232d3f] bg-[#151e2e] text-[#8e9cb1] hover:text-white'
                                        }`}
                                    >
                                        <div
                                            className="mx-auto mb-2 size-6 rounded-full border border-white/20 shadow-sm"
                                            style={{backgroundColor: t.preview}}
                                        />
                                        <span className="text-xs font-semibold">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hardware Acceleration & Auto-save */}
                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5 space-y-4">
                            <label className="flex cursor-pointer items-start justify-between gap-4">
                                <div>
                                    <span className="block text-sm font-bold text-white">{copy.hardwareAcceleration}</span>
                                    <span className="block text-xs text-muted mt-0.5">{copy.hardwareAccelerationDesc}</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={hardwareAcc}
                                    onChange={e => setHardwareAcc(e.target.checked)}
                                    className="size-5 accent-primary cursor-pointer mt-1"
                                />
                            </label>

                            <div className="border-t border-[#1e2739]" />

                            <label className="flex cursor-pointer items-start justify-between gap-4">
                                <div>
                                    <span className="block text-sm font-bold text-white">{copy.autoSave}</span>
                                    <span className="block text-xs text-muted mt-0.5">Automatically preserve edits and custom styling presets locally.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={autoSave}
                                    onChange={e => setAutoSave(e.target.checked)}
                                    className="size-5 accent-primary cursor-pointer mt-1"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* 2. AI & Transcription Tab */}
                {activeTab === 'ai' && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <h1 className="text-xl font-bold text-white">{copy.aiModel}</h1>
                            <p className="mt-1 text-xs text-muted">{copy.modelDesc}</p>
                        </div>

                        {/* Local Models List */}
                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                            <h2 className="text-sm font-bold text-white mb-3">{copy.localModel}</h2>
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
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-[#232c3f] bg-[#151d2c] hover:border-[#35435c]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <strong className="text-xs font-bold text-white">{localized?.name ?? model.name}</strong>
                                                        <span className="rounded bg-[#1e2739] px-2 py-0.5 text-[10px] text-muted">{model.displaySize}</span>
                                                        {model.recommended && <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-[#c5beff]">{localizedModels.recommended}</span>}
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-[#8898ae]">{localized?.description ?? model.description}</p>
                                                </div>

                                                <div className="shrink-0">
                                                    {isSelected ? (
                                                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                                            {copy.activeBadge}
                                                        </span>
                                                    ) : (
                                                        <div className="flex gap-2"><button onClick={() => void handleModelAction(model)} disabled={selectingModelId !== null} aria-busy={isSelecting} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1e2739] px-2.5 py-1 text-[10px] font-bold text-[#b6c2d3] hover:enabled:text-white disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-[#958aff]">{isSelecting && <LoaderCircle className="size-3 animate-spin" aria-hidden="true"/>}{isSelecting ? localizedModels.selecting : model.status === 'installed' ? localizedModels.select : model.status === 'downloading' ? localizedModels.cancel : copy.downloadAction}</button>{model.status === 'installed' && <button onClick={() => void remove(model.id)} disabled={selectingModelId !== null} className="cursor-pointer rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#958aff]">{localizedModels.delete}</button>}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelecting && <span className="sr-only" role="status">{localizedModels.selecting}</span>}
                                            {model.status === 'downloading' && <ModelDownloadProgress progress={modelProgress[model.id]} language={language}/>}
                                        </div>
                                    );
                                })}
                            </div>
                            {modelError && <p className="mt-3 text-xs text-red-300">{modelError}</p>}
                        </div>

                        {/* Compute Device */}
                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                            <h2 className="text-sm font-bold text-white mb-1">{copy.computeDevice}</h2>
                            <p className="text-xs text-muted mb-3">Choose the processing unit for AI speech inference.</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {id: 'gpu', label: copy.autoGpu, desc: 'Hardware accelerated (NVIDIA CUDA / DirectML)'},
                                    {id: 'cpu', label: copy.forceCpu, desc: 'Compatible with all devices without dedicated GPU'},
                                ].map(dev => (
                                    <button
                                        key={dev.id}
                                        type="button"
                                        onClick={() => setComputeDevice(dev.id as any)}
                                        className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                                            computeDevice === dev.id
                                                ? 'border-primary bg-primary/10 text-white'
                                                : 'border-[#232c3f] bg-[#151d2c] text-[#8e9cb0] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CpuIcon className="size-4 text-primary" />
                                            <strong className="text-xs font-bold">{dev.label}</strong>
                                        </div>
                                        <p className="mt-1 text-[11px] text-muted">{dev.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Word Timestamps */}
                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                            <label className="flex cursor-pointer items-start justify-between gap-4">
                                <div>
                                    <span className="block text-sm font-bold text-white">{copy.wordTimestamps}</span>
                                    <span className="block text-xs text-muted mt-0.5">{copy.wordTimestampsDesc}</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={wordTimestamps}
                                    onChange={e => setWordTimestamps(e.target.checked)}
                                    className="size-5 accent-primary cursor-pointer mt-1"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* 3. Storage & Cache Tab */}
                {activeTab === 'storage' && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <h1 className="text-xl font-bold text-white">{copy.storage}</h1>
                            <p className="mt-1 text-xs text-muted">Manage disk cache and temporary render frames.</p>
                        </div>

                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-muted mb-1">{copy.cacheLocation}</label>
                                <div className="rounded-xl border border-[#263143] bg-[#0f1420] p-3 text-xs font-mono text-slate-300">
                                    C:\Users\joseg\AppData\Local\TextMotionStudio\cache
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-[#232d40] bg-[#161e2d] p-4">
                                <div>
                                    <span className="block text-xs text-muted">{copy.cacheUsage}</span>
                                    <strong className="text-lg font-black text-white">{cacheSize}</strong>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearCache}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-colors"
                                >
                                    <TrashIcon className="size-4" />
                                    <span>{copy.clearCache}</span>
                                </button>
                            </div>

                            {cacheCleared && (
                                <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 p-3 text-center text-xs font-bold text-emerald-300">
                                    {copy.cacheCleared}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Keyboard Shortcuts Tab */}
                {activeTab === 'shortcuts' && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <h1 className="text-xl font-bold text-white">{copy.shortcuts}</h1>
                            <p className="mt-1 text-xs text-muted">Accelerate your editing workflow with key shortcuts.</p>
                        </div>

                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-5">
                            <div className="divide-y divide-[#1e2739]">
                                {[
                                    {action: 'Play / Pause video', keys: ['Space']},
                                    {action: 'Seek 1 second backward / forward', keys: ['←', '→']},
                                    {action: 'Seek 5 seconds backward / forward', keys: ['Shift', '← / →']},
                                    {action: 'Next caption segment', keys: ['Tab']},
                                    {action: 'Previous caption segment', keys: ['Shift', 'Tab']},
                                    {action: 'Split caption at playhead', keys: ['Enter']},
                                    {action: 'Undo last change', keys: ['Ctrl', 'Z']},
                                    {action: 'Redo last change', keys: ['Ctrl', 'Y']},
                                    {action: 'Export video dialog', keys: ['Ctrl', 'E']},
                                ].map(shortcut => (
                                    <div key={shortcut.action} className="flex items-center justify-between py-3">
                                        <span className="text-xs text-slate-300 font-medium">{shortcut.action}</span>
                                        <div className="flex items-center gap-1.5">
                                            {shortcut.keys.map(k => (
                                                <kbd
                                                    key={k}
                                                    className="rounded-lg border border-[#35435c] bg-[#1a2333] px-2 py-1 text-[11px] font-mono font-bold text-[#ccd6e6] shadow-sm"
                                                >
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. About Tab */}
                {activeTab === 'about' && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <h1 className="text-xl font-bold text-white">{copy.about}</h1>
                            <p className="mt-1 text-xs text-muted">TextMotion Studio version and licensing info.</p>
                        </div>

                        <div className="rounded-2xl border border-[#222c3e] bg-[#121825] p-6 text-center">
                            <div className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-[#8c7dff] text-white shadow-xl">
                                <ShieldCheckIcon className="size-8" />
                            </div>
                            <h2 className="text-lg font-bold text-white">TextMotion Studio</h2>
                            <p className="mt-1 text-xs text-primary font-semibold">{copy.version} 1.2.0 (Build 2026.9)</p>

                            <div className="my-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 text-left">
                                <div className="flex items-center gap-2 font-bold mb-1">
                                    <ShieldCheckIcon className="size-4" />
                                    <span>{copy.privacyGuarantee}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-[#8ee5be]">{copy.privacyDesc}</p>
                            </div>

                            <div className="flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCheckUpdates}
                                    disabled={checkingUpdates}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover shadow-md disabled:opacity-60"
                                >
                                    <RefreshIcon className={`size-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                                    <span>{checkingUpdates ? copy.checkingUpdates : copy.checkUpdates}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => alert('Opening TextMotion documentation')}
                                    className="cursor-pointer rounded-xl border border-[#2b374d] bg-[#161f2e] px-4 py-2.5 text-xs font-bold text-[#b4c3d8] hover:text-white"
                                >
                                    {copy.viewDocs}
                                </button>
                            </div>

                            <details className="mt-5 rounded-xl border border-[#2b374d] bg-[#161f2e] text-left">
                                <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[#b4c3d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                    {language === 'es' ? 'Licencias de código abierto' : 'Open Source Licenses'}
                                </summary>
                                <pre className="max-h-64 overflow-auto border-t border-[#2b374d] px-4 py-3 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[#b4c3d8]">{thirdPartyNotices}</pre>
                            </details>

                            {updateStatus && (
                                <p className="mt-3 text-xs font-bold text-emerald-400 animate-fade-in">{updateStatus}</p>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
