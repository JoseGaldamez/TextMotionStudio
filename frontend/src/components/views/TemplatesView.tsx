import {useState} from 'react';
import type {CaptionStyle} from '../../models';
import {DEFAULT_STYLES} from '../../captionStyles';
import {CheckIcon, LayersIcon, SearchIcon, SparkleIcon, PlayCircleIcon, CloseIcon} from '../Icons';
import {getCopy, type Language} from '../../i18n';

interface Props {
    language: Language;
    onApplyTemplate: (style: CaptionStyle) => void;
}

interface TemplateItem {
    id: string;
    title: string;
    description: string;
    aspectRatio: '9:16' | '16:9' | '1:1';
    category: 'vertical' | 'horizontal' | 'square' | 'podcast';
    cadence: 'fast' | 'medium' | 'chill';
    wordsPerLine: string;
    styleId: string;
    accentColor: string;
    previewHeadline: string;
    previewSub: string;
    tagList: string[];
    downloads: string;
}

const templates: TemplateItem[] = [
    {
        id: 't-viral-hook',
        title: 'Viral TikTok Hook',
        description: 'Ultra-fast word bursts with dynamic yellow key highlights designed to stop the scroll.',
        aspectRatio: '9:16',
        category: 'vertical',
        cadence: 'fast',
        wordsPerLine: '2 - 3 words',
        styleId: 'bold',
        accentColor: '#facc15',
        previewHeadline: 'STOP SCROLLING',
        previewSub: 'Watch this before it is too late',
        tagList: ['TikTok', 'Reels', 'High Retention'],
        downloads: '14.2k uses',
    },
    {
        id: 't-shorts-retention',
        title: 'Shorts Retention Pro',
        description: 'Continuous kinetic karaoke word animation keeping viewer eyes locked on center screen.',
        aspectRatio: '9:16',
        category: 'vertical',
        cadence: 'fast',
        wordsPerLine: '3 - 4 words',
        styleId: 'karaoke',
        accentColor: '#22d3ee',
        previewHeadline: 'THE SECRET TO VIRALITY',
        previewSub: 'Consistent pace and visual punch',
        tagList: ['YouTube Shorts', 'Fast Paced'],
        downloads: '9.8k uses',
    },
    {
        id: 't-podcast-split',
        title: 'Podcast Dialogue Split',
        description: 'Speaker identification tags with subtle contrast lower-third for multi-person interviews.',
        aspectRatio: '9:16',
        category: 'podcast',
        cadence: 'medium',
        wordsPerLine: '4 - 6 words',
        styleId: 'boxed',
        accentColor: '#818cf8',
        previewHeadline: 'Speaker 1: Exactly my point.',
        previewSub: 'Conversations that build trust and engagement',
        tagList: ['Interviews', 'Podcasts', '2 Speakers'],
        downloads: '6.4k uses',
    },
    {
        id: 't-executive-pitch',
        title: 'Executive Thought Leadership',
        description: 'Sophisticated boxed subtitles engineered for corporate LinkedIn and business feeds.',
        aspectRatio: '1:1',
        category: 'square',
        cadence: 'chill',
        wordsPerLine: '5 - 7 words',
        styleId: 'minimal',
        accentColor: '#cbd5e1',
        previewHeadline: 'Leadership in the age of AI',
        previewSub: 'Clear, concise, and credible',
        tagList: ['LinkedIn', 'B2B', 'Square Feed'],
        downloads: '4.1k uses',
    },
    {
        id: 't-cinematic-essay',
        title: 'Cinematic YouTube Essay',
        description: 'Elegant serif caption track with cinema-safe lower margins and quiet letter-spacing.',
        aspectRatio: '16:9',
        category: 'horizontal',
        cadence: 'chill',
        wordsPerLine: '6 - 8 words',
        styleId: 'modern',
        accentColor: '#e2e8f0',
        previewHeadline: 'The art of silent storytelling',
        previewSub: 'Depth, narrative, and visual balance',
        tagList: ['YouTube 4K', 'Documentary', '16:9'],
        downloads: '5.7k uses',
    },
    {
        id: 't-gaming-neon',
        title: 'Gaming Neon Highlight',
        description: 'Electrifying RGB cyan and magenta glow with high-octane bass drop animation timing.',
        aspectRatio: '9:16',
        category: 'vertical',
        cadence: 'fast',
        wordsPerLine: '1 - 2 words',
        styleId: 'pop',
        accentColor: '#ff007f',
        previewHeadline: 'INSANE CLUTCH PLAY',
        previewSub: '1 HP and a dream',
        tagList: ['Twitch', 'Streamers', 'RGB Glow'],
        downloads: '11.3k uses',
    },
    {
        id: 't-educational-tutorial',
        title: 'Step-by-Step Educational',
        description: 'High-contrast clean sans font with multi-line auto wrapping for instructional videos.',
        aspectRatio: '16:9',
        category: 'horizontal',
        cadence: 'medium',
        wordsPerLine: '5 - 7 words',
        styleId: 'minimal',
        accentColor: '#41b882',
        previewHeadline: 'Step 1: Configure your studio environment',
        previewSub: 'Follow along with step-by-step guidance',
        tagList: ['Coding', 'Cooking', 'How-to'],
        downloads: '3.9k uses',
    },
    {
        id: 't-creator-vlog',
        title: 'Creator Daily Vlog',
        description: 'Warm aesthetic lowercase captions with soft pastel shadows for cozy lifestyle footage.',
        aspectRatio: '9:16',
        category: 'vertical',
        cadence: 'medium',
        wordsPerLine: '3 - 5 words',
        styleId: 'modern',
        accentColor: '#f9a8d4',
        previewHeadline: 'a morning in my creative studio',
        previewSub: 'calm vibes and good coffee',
        tagList: ['Vlog', 'Lifestyle', 'Aesthetic'],
        downloads: '8.2k uses',
    },
];

export function TemplatesView({language, onApplyTemplate}: Props) {
    const copy = getCopy(language).templatesView;
    const [selectedFormat, setSelectedFormat] = useState<'all' | 'vertical' | 'horizontal' | 'square' | 'podcast'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
    const [previewingTemplate, setPreviewingTemplate] = useState<TemplateItem | null>(null);

    const filteredTemplates = templates.filter(t => {
        const matchesFormat = selectedFormat === 'all' || t.category === selectedFormat;
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.tagList.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFormat && matchesSearch;
    });

    const handleUseTemplate = (template: TemplateItem) => {
        setAppliedTemplateId(template.id);
        const baseStyle = DEFAULT_STYLES.find(s => s.id === template.styleId) ?? DEFAULT_STYLES[0];
        const style: CaptionStyle = {
            ...baseStyle,
            id: template.styleId,
            name: template.title,
            description: template.description,
        };
        setTimeout(() => {
            onApplyTemplate(style);
        }, 350);
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#0d121b] p-6 text-foreground [scrollbar-width:thin]">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <LayersIcon className="size-4" />
                        <span>Studio Preset Engine</span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{copy.title}</h1>
                    <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#242e40] bg-[#121824] p-1">
                    {(['all', 'vertical', 'horizontal', 'square', 'podcast'] as const).map(fmt => {
                        const label = fmt === 'all' ? copy.allFormats :
                                      fmt === 'vertical' ? copy.vertical :
                                      fmt === 'horizontal' ? copy.horizontal :
                                      fmt === 'square' ? copy.square : copy.podcast;
                        return (
                            <button
                                key={fmt}
                                onClick={() => setSelectedFormat(fmt)}
                                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                                    selectedFormat === fmt
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

            {/* Template Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5 pb-8">
                {filteredTemplates.map(template => {
                    const isApplied = appliedTemplateId === template.id;
                    return (
                        <div
                            key={template.id}
                            className="group relative flex flex-col justify-between rounded-2xl border border-[#222c3e] bg-[#121825] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#35435e] hover:bg-[#151e2e] hover:shadow-xl"
                        >
                            {/* Card Mockup Area */}
                            <div className="relative mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#090d14] to-[#121927] border border-[#1e2739] p-4">
                                {/* Aspect ratio frame mockup */}
                                <div
                                    className={`relative flex flex-col items-center justify-end rounded-lg border border-dashed border-[#3a475f] bg-black/60 p-2 shadow-inner transition-transform group-hover:scale-105 ${
                                        template.aspectRatio === '9:16'
                                            ? 'h-32 w-18'
                                            : template.aspectRatio === '16:9'
                                            ? 'h-24 w-38'
                                            : 'size-26'
                                    }`}
                                >
                                    <div className="absolute top-1 right-1 size-1.5 rounded-full bg-red-500/80" />
                                    {/* Simulated captions */}
                                    <div className="w-full text-center">
                                        <p
                                            className="text-[9px] font-black uppercase tracking-tight drop-shadow"
                                            style={{color: template.accentColor}}
                                        >
                                            {template.previewHeadline.slice(0, 16)}
                                        </p>
                                    </div>
                                </div>

                                {/* Format badge */}
                                <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm border border-white/10">
                                    {template.aspectRatio}
                                </div>

                                {/* Cadence badge */}
                                <div className="absolute top-2 right-2 rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-[#b9b0ff] border border-primary/30">
                                    {template.cadence === 'fast' ? copy.cadenceFast :
                                     template.cadence === 'medium' ? copy.cadenceMedium : copy.cadenceChill}
                                </div>

                                {/* Quick Preview Overlay Button */}
                                <button
                                    type="button"
                                    onClick={() => setPreviewingTemplate(template)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                                    title={copy.previewTemplate}
                                >
                                    <span className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-black shadow-lg hover:bg-white">
                                        <PlayCircleIcon className="size-4 text-primary" />
                                        <span>{copy.previewTemplate}</span>
                                    </span>
                                </button>
                            </div>

                            {/* Details */}
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-base font-bold text-white group-hover:text-primary-hover">
                                        {template.title}
                                    </h3>
                                    <span className="text-[10px] text-muted whitespace-nowrap">{template.downloads}</span>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-[#8a98af]">
                                    {template.description}
                                </p>

                                {/* Tags */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {template.tagList.map(tag => (
                                        <span
                                            key={tag}
                                            className="rounded-md bg-[#182030] px-2 py-0.5 text-[10px] font-medium text-[#93a2b8]"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                    <span className="rounded-md bg-[#1d273a] px-2 py-0.5 text-[10px] font-medium text-muted">
                                        {template.wordsPerLine}
                                    </span>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="mt-4 pt-3 border-t border-[#1e2739]">
                                <button
                                    type="button"
                                    onClick={() => handleUseTemplate(template)}
                                    className={`flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                                        isApplied
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : 'bg-gradient-to-r from-primary to-[#7869ff] text-white shadow-sm hover:brightness-110 active:scale-[0.99]'
                                    }`}
                                >
                                    {isApplied ? (
                                        <>
                                            <CheckIcon className="size-4" />
                                            <span>{copy.appliedTemplate}</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparkleIcon className="size-4" />
                                            <span>{copy.useTemplate}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Interactive Preview Modal */}
            {previewingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-lg rounded-2xl border border-[#2b374d] bg-[#111723] p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setPreviewingTemplate(null)}
                            className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-muted hover:bg-[#1a2334] hover:text-white"
                        >
                            <CloseIcon className="size-5" />
                        </button>

                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                            <LayersIcon className="size-4" />
                            <span>{previewingTemplate.aspectRatio} Layout Preview</span>
                        </div>
                        <h2 className="mt-1 text-xl font-bold text-white">{previewingTemplate.title}</h2>
                        <p className="mt-1 text-xs text-muted">{previewingTemplate.description}</p>

                        <div className="my-5 flex items-center justify-center rounded-xl bg-black p-6 border border-[#20293a]">
                            <div
                                className={`flex flex-col items-center justify-center rounded-xl border border-[#35445d] bg-[#090e17] p-4 text-center shadow-2xl ${
                                    previewingTemplate.aspectRatio === '9:16'
                                        ? 'h-72 w-44'
                                        : previewingTemplate.aspectRatio === '16:9'
                                        ? 'h-48 w-80'
                                        : 'size-56'
                                }`}
                            >
                                <p
                                    className="text-base font-black uppercase tracking-tight"
                                    style={{color: previewingTemplate.accentColor}}
                                >
                                    {previewingTemplate.previewHeadline}
                                </p>
                                <p className="mt-2 text-xs text-[#a0afc4]">
                                    {previewingTemplate.previewSub}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPreviewingTemplate(null)}
                                className="cursor-pointer rounded-xl border border-[#263145] px-4 py-2 text-xs font-semibold text-[#a6b4c9] hover:bg-[#1a2233] hover:text-white"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleUseTemplate(previewingTemplate);
                                    setPreviewingTemplate(null);
                                }}
                                className="cursor-pointer rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-md"
                            >
                                {copy.useTemplate}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
