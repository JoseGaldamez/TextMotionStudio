import {useState} from 'react';
import type {CaptionStyle, VideoProject} from '../../models';
import {CheckIcon, SearchIcon, SparkleIcon, SlidersIcon} from '../Icons';
import {getCopy, type Language} from '../../i18n';

interface Props {
    project: VideoProject;
    onSelectStyle: (style: CaptionStyle) => void;
    language: Language;
    onNavigateToCreate: () => void;
}

interface ExtendedStyle extends CaptionStyle {
    category: 'trending' | 'punchy' | 'minimal' | 'karaoke' | 'cinematic';
    sampleWord: string;
    sampleSentence: string;
    bgPreviewClass: string;
    textPreviewClass: string;
    highlightColor: string;
    textColor: string;
    badgeText: string;
    fontFamily: string;
}

const galleryStyles: ExtendedStyle[] = [
    {
        id: 'modern',
        name: 'Modern Glow',
        description: 'Clean typography with radiant violet gradient emphasis.',
        category: 'trending',
        sampleWord: 'GREAT IDEAS',
        sampleSentence: 'Great ideas deserve to be seen.',
        bgPreviewClass: 'bg-[#151a27] border-[#38435d]',
        textPreviewClass: 'font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(117,104,255,0.45)]',
        highlightColor: '#8a7dff',
        textColor: '#ffffff',
        badgeText: 'Word Glow',
        fontFamily: 'Nunito',
    },
    {
        id: 'bold',
        name: 'Hormozi Impact',
        description: 'High-contrast heavy punch with vivid yellow key word accents.',
        category: 'punchy',
        sampleWord: 'STAND OUT',
        sampleSentence: 'Make your videos stand out today.',
        bgPreviewClass: 'bg-[#161a20] border-[#443f25]',
        textPreviewClass: 'font-black tracking-normal uppercase text-yellow-300 drop-shadow-[0_4px_0_#000]',
        highlightColor: '#facc15',
        textColor: '#ffffff',
        badgeText: 'Viral Punch',
        fontFamily: 'Impact, sans-serif',
    },
    {
        id: 'karaoke',
        name: 'Karaoke Wave',
        description: 'Smooth progressive reveal tracking spoken words in real time.',
        category: 'karaoke',
        sampleWord: 'WORD-BY-WORD',
        sampleSentence: 'Word-by-word active rhythm.',
        bgPreviewClass: 'bg-[#121c27] border-[#274661]',
        textPreviewClass: 'font-bold tracking-wide text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]',
        highlightColor: '#22d3ee',
        textColor: '#e2e8f0',
        badgeText: 'Time Synced',
        fontFamily: 'Nunito',
    },
    {
        id: 'minimal',
        name: 'Minimal Studio',
        description: 'Quiet type and maximum legibility with elegant spacing.',
        category: 'minimal',
        sampleWord: 'Simplicity',
        sampleSentence: 'Simplicity is the ultimate sophistication.',
        bgPreviewClass: 'bg-[#131720] border-[#2b3548]',
        textPreviewClass: 'font-medium tracking-wider text-slate-200',
        highlightColor: '#94a3b8',
        textColor: '#f1f5f9',
        badgeText: 'Clean',
        fontFamily: 'sans-serif',
    },
    {
        id: 'pop',
        name: 'Comic Pop',
        description: 'Playful bouncy scale with cheerful pastel color pops.',
        category: 'punchy',
        sampleWord: 'BOOM!',
        sampleSentence: 'Level up your story with fun.',
        bgPreviewClass: 'bg-[#22182b] border-[#5a3875]',
        textPreviewClass: 'font-black -rotate-2 text-pink-400 drop-shadow-[2px_2px_0_#581c87]',
        highlightColor: '#f472b6',
        textColor: '#fef08a',
        badgeText: 'Playful',
        fontFamily: 'Nunito',
    },
    {
        id: 'cyber',
        name: 'Cyberpunk Neon',
        description: 'High-voltage electric magenta and turquoise glow.',
        category: 'trending',
        sampleWord: 'FUTURE',
        sampleSentence: 'The future of video captioning.',
        bgPreviewClass: 'bg-[#0f1825] border-[#294c6b]',
        textPreviewClass: 'font-extrabold uppercase tracking-widest text-[#00f2fe] drop-shadow-[0_0_12px_#00f2fe]',
        highlightColor: '#ff007f',
        textColor: '#00f2fe',
        badgeText: 'Neon Glow',
        fontFamily: 'monospace',
    },
    {
        id: 'boxed',
        name: 'Subtle Boxed Pill',
        description: 'Translucent rounded backdrop pill for busy background footage.',
        category: 'minimal',
        sampleWord: 'Readability',
        sampleSentence: 'Never miss a single word again.',
        bgPreviewClass: 'bg-[#151c28] border-[#303f58]',
        textPreviewClass: 'font-bold px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white',
        highlightColor: '#818cf8',
        textColor: '#ffffff',
        badgeText: 'Box Pill',
        fontFamily: 'Nunito',
    },
    {
        id: 'cinematic',
        name: 'Cinematic Serif',
        description: 'Film-grade classical typography with subtle letterbox poise.',
        category: 'cinematic',
        sampleWord: 'STORYTELLING',
        sampleSentence: 'Captivating stories told with grace.',
        bgPreviewClass: 'bg-[#17161b] border-[#44384a]',
        textPreviewClass: 'font-serif italic tracking-widest text-[#f5ecd7] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]',
        highlightColor: '#f5ecd7',
        textColor: '#d6cfbd',
        badgeText: 'Film Grade',
        fontFamily: 'Georgia, serif',
    },
    {
        id: 'typewriter',
        name: 'Retro Typewriter',
        description: 'Monospace mechanical character cadence with nostalgic feel.',
        category: 'minimal',
        sampleWord: 'typing...',
        sampleSentence: 'Authentic creator journal style.',
        bgPreviewClass: 'bg-[#19191d] border-[#3d3d4a]',
        textPreviewClass: 'font-mono text-emerald-400 tracking-tight',
        highlightColor: '#34d399',
        textColor: '#a7f3d0',
        badgeText: 'Monospace',
        fontFamily: 'monospace',
    },
];

export function StylesView({project, onSelectStyle, language, onNavigateToCreate}: Props) {
    const copy = getCopy(language).stylesView;
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'trending' | 'punchy' | 'minimal' | 'karaoke' | 'cinematic'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStyleId, setSelectedStyleId] = useState<string>(project.selectedStyle.id);
    const [fontSize, setFontSize] = useState(28);
    const [letterSpacing, setLetterSpacing] = useState(1);
    const [position, setPosition] = useState<'bottom' | 'center' | 'top'>('bottom');
    const [hasBgPill, setHasBgPill] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    const activeCustomStyle = galleryStyles.find(s => s.id === selectedStyleId) ?? galleryStyles[0];

    const filteredStyles = galleryStyles.filter(style => {
        const matchesCategory = selectedCategory === 'all' || style.category === selectedCategory;
        const matchesSearch = style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              style.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleApply = (style: ExtendedStyle) => {
        onSelectStyle({
            id: style.id,
            name: style.name,
            description: style.description,
        });
        setSelectedStyleId(style.id);
    };

    const handleSavePreset = () => {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2600);
    };

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-[#0d121b] text-foreground">
            {/* Gallery area */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-[#202838] p-6 [scrollbar-width:thin]">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <SparkleIcon className="size-4" />
                        <span>TextMotion Visual Engine</span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{copy.title}</h1>
                    <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>
                </div>

                {/* Search & Categories Bar */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#242e40] bg-[#121824] p-1">
                        {(['all', 'trending', 'punchy', 'minimal', 'karaoke', 'cinematic'] as const).map(cat => {
                            const label = cat === 'all' ? copy.all :
                                          cat === 'trending' ? copy.trending :
                                          cat === 'punchy' ? copy.punchy :
                                          cat === 'minimal' ? copy.minimal :
                                          cat === 'karaoke' ? copy.karaoke : copy.cinematic;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                                        selectedCategory === cat
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-[#96a4b8] hover:bg-[#1c2436] hover:text-white'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative min-w-[240px]">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder={copy.searchPlaceholder}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-9 w-full rounded-xl border border-[#263144] bg-[#131926] pr-3 pl-9 text-xs text-white placeholder:text-[#6a778e] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Grid of Styles */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4 pb-8">
                    {filteredStyles.map(style => {
                        const isCurrentActive = project.selectedStyle.id === style.id;
                        const isSelectedInInspector = selectedStyleId === style.id;
                        return (
                            <div
                                key={style.id}
                                onClick={() => setSelectedStyleId(style.id)}
                                className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                                    isSelectedInInspector
                                        ? 'border-primary/80 bg-gradient-to-b from-[#182133] to-[#121826] shadow-[0_8px_24px_rgba(102,87,245,0.18)]'
                                        : 'border-[#222c3d] bg-[#131926]/90 hover:border-[#35435c] hover:bg-[#161f30]'
                                }`}
                            >
                                {/* Top Badge & Selection Indicator */}
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="rounded-md border border-[#2e3b50] bg-[#1a2334] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#a0afc7] uppercase">
                                        {style.badgeText}
                                    </span>
                                    {isCurrentActive && (
                                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                            <CheckIcon className="size-3" />
                                            {copy.applied}
                                        </span>
                                    )}
                                </div>

                                {/* Preview Display Box */}
                                <div
                                    className={`relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border p-3 text-center transition-all ${style.bgPreviewClass}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                                    <p className={`relative z-1 text-sm ${style.textPreviewClass}`}>
                                        {style.sampleWord}
                                    </p>
                                </div>

                                {/* Info & Actions */}
                                <div className="mt-3">
                                    <h3 className="text-sm font-bold text-white group-hover:text-primary-hover">{style.name}</h3>
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#8a97ad]">{style.description}</p>
                                </div>

                                <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#1e2738]">
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleApply(style);
                                        }}
                                        className={`flex-1 cursor-pointer rounded-lg py-1.5 text-xs font-bold transition-all ${
                                            isCurrentActive
                                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                                : 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                                        }`}
                                    >
                                        {isCurrentActive ? copy.applied : copy.apply}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Inspector / Customization Drawer */}
            <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto bg-[#101622] p-5 [scrollbar-width:thin] max-[1440px]:w-[300px]">
                <div className="flex items-center gap-2 border-b border-[#232d3f] pb-4">
                    <SlidersIcon className="size-4 text-primary" />
                    <h2 className="text-base font-bold text-white">{copy.customize}</h2>
                </div>

                {/* Real-time Visual Preview Card */}
                <div className="mt-4 rounded-xl border border-[#283449] bg-gradient-to-b from-[#161f2e] to-[#0f1520] p-4 text-center">
                    <span className="block text-[11px] font-semibold text-muted mb-2">Live Animation Sandbox</span>
                    <div
                        className="flex min-h-[90px] items-center justify-center rounded-lg bg-black/70 p-3 shadow-inner"
                        style={{fontFamily: activeCustomStyle.fontFamily}}
                    >
                        <p
                            className={`transition-all duration-200 ${activeCustomStyle.textPreviewClass} ${hasBgPill ? 'bg-black/80 px-3 py-1.5 rounded-lg' : ''}`}
                            style={{
                                fontSize: `${fontSize}px`,
                                letterSpacing: `${letterSpacing}px`,
                                color: activeCustomStyle.textColor,
                            }}
                        >
                            <span style={{color: activeCustomStyle.highlightColor}}>
                                {copy.previewSample.split(' ')[0]}
                            </span>{' '}
                            {copy.previewSample.split(' ').slice(1).join(' ')}
                        </p>
                    </div>
                    <span className="mt-2 block text-[10px] text-[#718096]">Previewing style: <strong>{activeCustomStyle.name}</strong></span>
                </div>

                {/* Customizer Controls */}
                <div className="mt-5 space-y-4 text-xs">
                    {/* Typography */}
                    <div>
                        <span className="font-bold text-[#ccd6e6] uppercase tracking-wider text-[11px]">{copy.typography}</span>
                        <div className="mt-2 space-y-3 rounded-xl border border-[#222c3d] bg-[#141b26] p-3">
                            <div>
                                <div className="flex justify-between text-muted mb-1">
                                    <span>{copy.fontSize}</span>
                                    <span className="font-mono text-white">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="44"
                                    value={fontSize}
                                    onChange={e => setFontSize(Number(e.target.value))}
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#273347] accent-primary"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-muted mb-1">
                                    <span>{copy.letterSpacing}</span>
                                    <span className="font-mono text-white">{letterSpacing}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="6"
                                    value={letterSpacing}
                                    onChange={e => setLetterSpacing(Number(e.target.value))}
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#273347] accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Colors & Highlight */}
                    <div>
                        <span className="font-bold text-[#ccd6e6] uppercase tracking-wider text-[11px]">{copy.colors}</span>
                        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-[#222c3d] bg-[#141b26] p-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className="size-5 rounded-full border border-white/20 shadow"
                                    style={{backgroundColor: activeCustomStyle.textColor}}
                                />
                                <div>
                                    <span className="block text-[10px] text-muted">{copy.textColor}</span>
                                    <span className="font-mono text-[11px] font-semibold text-white">{activeCustomStyle.textColor}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="size-5 rounded-full border border-white/20 shadow"
                                    style={{backgroundColor: activeCustomStyle.highlightColor}}
                                />
                                <div>
                                    <span className="block text-[10px] text-muted">{copy.highlightColor}</span>
                                    <span className="font-mono text-[11px] font-semibold text-white">{activeCustomStyle.highlightColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placement & Safe Zones */}
                    <div>
                        <span className="font-bold text-[#ccd6e6] uppercase tracking-wider text-[11px]">{copy.safeZones}</span>
                        <div className="mt-2 space-y-2 rounded-xl border border-[#222c3d] bg-[#141b26] p-3">
                            <div className="grid grid-cols-3 gap-1">
                                {(['top', 'center', 'bottom'] as const).map(pos => (
                                    <button
                                        key={pos}
                                        type="button"
                                        onClick={() => setPosition(pos)}
                                        className={`cursor-pointer rounded-lg py-1.5 text-center text-[11px] font-bold capitalize transition-colors ${
                                            position === pos
                                                ? 'bg-primary text-white'
                                                : 'bg-[#1b2332] text-[#8e9cb0] hover:text-white'
                                        }`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                            <label className="flex cursor-pointer items-center justify-between pt-1 text-muted">
                                <span>{copy.bgPill}</span>
                                <input
                                    type="checkbox"
                                    checked={hasBgPill}
                                    onChange={e => setHasBgPill(e.target.checked)}
                                    className="size-4 cursor-pointer accent-primary"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="mt-auto pt-5 space-y-2">
                    {savedNotice && (
                        <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 p-2 text-center text-xs font-semibold text-emerald-300">
                            {copy.presetSaved}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => handleApply(activeCustomStyle)}
                        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#7869ff] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <CheckIcon className="size-4" />
                        <span>{copy.apply}</span>
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSavePreset}
                            className="flex-1 cursor-pointer rounded-xl border border-[#2b364a] bg-[#161d2a] py-2 text-xs font-semibold text-[#b3bfd2] hover:bg-[#1d2637] hover:text-white"
                        >
                            {copy.savePreset}
                        </button>
                        <button
                            type="button"
                            onClick={onNavigateToCreate}
                            className="flex-1 cursor-pointer rounded-xl border border-[#2b364a] bg-[#161d2a] py-2 text-xs font-semibold text-[#b3bfd2] hover:bg-[#1d2637] hover:text-white"
                        >
                            {copy.goToEditor}
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
