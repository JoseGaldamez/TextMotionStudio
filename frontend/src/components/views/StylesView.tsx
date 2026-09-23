import {useState, useEffect} from 'react';
import type {CaptionStyle, VideoProject} from '../../models';
import {getCopy, type Language} from '../../i18n';
import {Check, Search, Sliders, Trash2, Plus, ArrowRight} from 'lucide-react';

interface Props {
    project: VideoProject;
    styles: CaptionStyle[];
    onSelectStyle: (style: CaptionStyle) => void;
    onSaveCustomStyle: (style: CaptionStyle) => void;
    onDeleteCustomStyle?: (styleId: string) => void;
    language: Language;
    onNavigateToCreate: () => void;
}

const FONT_OPTIONS = [
    {label: 'Nunito (Moderna & Redonda)', value: 'Nunito, sans-serif'},
    {label: 'Impact (Viral & Hormozi)', value: 'Impact, "Arial Black", sans-serif'},
    {label: 'Sistema / Inter (Limpia & Minimal)', value: 'system-ui, -apple-system, sans-serif'},
    {label: 'Consolas / Monospace (Cyber & Código)', value: 'Consolas, "Courier New", monospace'},
    {label: 'Georgia / Serif (Cinematográfica)', value: 'Georgia, "Times New Roman", serif'},
    {label: 'Comic / Curva (Divertida & Pop)', value: 'Nunito, cursive, sans-serif'},
];

const CATEGORIES = [
    {id: 'all', key: 'all'},
    {id: 'custom', key: 'myStyles'},
    {id: 'trending', key: 'trending'},
    {id: 'punchy', key: 'punchy'},
    {id: 'minimal', key: 'minimal'},
    {id: 'karaoke', key: 'karaoke'},
    {id: 'cinematic', key: 'cinematic'},
] as const;

export function StylesView({
    project,
    styles,
    onSelectStyle,
    onSaveCustomStyle,
    onDeleteCustomStyle,
    language,
    onNavigateToCreate,
}: Props) {
    const copy = getCopy(language).stylesView;
    const stylesById = (getCopy(language) as unknown as {stylesById?: Record<string, {name: string; description: string}>}).stylesById;

    const [selectedCategory, setSelectedCategory] = useState<'all' | 'custom' | 'trending' | 'punchy' | 'minimal' | 'karaoke' | 'cinematic'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStyleId, setSelectedStyleId] = useState<string>(project.selectedStyle.id);

    // Inspector draft state
    const [styleName, setStyleName] = useState('');
    const [fontSize, setFontSize] = useState(28);
    const [letterSpacing, setLetterSpacing] = useState(1);
    const [textColor, setTextColor] = useState('#ffffff');
    const [highlightColor, setHighlightColor] = useState('#8a7dff');
    const [fontFamily, setFontFamily] = useState('Nunito, sans-serif');
    const [hasBgPill, setHasBgPill] = useState(false);
    const [bgPillColor, setBgPillColor] = useState('rgba(15, 23, 42, 0.85)');
    const [textShadow, setTextShadow] = useState('none');
    const [savedNotice, setSavedNotice] = useState('');

    const activeCustomStyle = styles.find(s => s.id === selectedStyleId) ?? styles[0];

    // Synchronize inspector state when selection changes
    useEffect(() => {
        if (!activeCustomStyle) return;
        const localizedName = stylesById?.[activeCustomStyle.id]?.name ?? activeCustomStyle.name;
        setStyleName(activeCustomStyle.isCustom ? localizedName : `${localizedName} Custom`);
        setFontSize(activeCustomStyle.fontSize ?? 28);
        setLetterSpacing(activeCustomStyle.letterSpacing ?? 1);
        setTextColor(activeCustomStyle.textColor ?? '#ffffff');
        setHighlightColor(activeCustomStyle.highlightColor ?? '#8a7dff');
        setFontFamily(activeCustomStyle.fontFamily ?? 'Nunito, sans-serif');
        setHasBgPill(Boolean(activeCustomStyle.hasBgPill));
        setBgPillColor(activeCustomStyle.bgPillColor ?? 'rgba(15, 23, 42, 0.85)');
        setTextShadow(activeCustomStyle.textShadow ?? 'none');
    }, [selectedStyleId, activeCustomStyle, stylesById]);

    const customStylesCount = styles.filter(s => s.isCustom).length;

    const filteredStyles = styles.filter(style => {
        const matchesCategory =
            selectedCategory === 'all'
                ? true
                : selectedCategory === 'custom'
                ? Boolean(style.isCustom)
                : style.category === selectedCategory;

        const localizedName = stylesById?.[style.id]?.name ?? style.name;
        const localizedDesc = stylesById?.[style.id]?.description ?? style.description;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !query ||
            localizedName.toLowerCase().includes(query) ||
            localizedDesc.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    const handleApply = (style: CaptionStyle) => {
        onSelectStyle(style);
        setSelectedStyleId(style.id);
    };

    const handleSaveNewStyle = () => {
        const finalName = styleName.trim() || `${activeCustomStyle.name} Copia`;
        const newStyle: CaptionStyle = {
            id: `custom_${Date.now()}`,
            name: finalName,
            description: `Estilo personalizado basado en ${activeCustomStyle.name}`,
            category: 'custom',
            sampleWord: copy.previewSample.split(' ')[0],
            sampleSentence: copy.previewSample,
            bgPreviewClass: hasBgPill ? 'bg-[#151c28] border-[#38435d]' : 'bg-[#121722] border-[#293448]',
            textPreviewClass: 'font-extrabold tracking-tight',
            highlightColor,
            textColor,
            badgeText: copy.customBadge ?? 'Custom',
            fontFamily,
            fontSize,
            letterSpacing,
            hasBgPill,
            bgPillColor,
            textShadow,
            isCustom: true,
            createdAt: Date.now(),
        };

        onSaveCustomStyle(newStyle);
        onSelectStyle(newStyle);
        setSelectedStyleId(newStyle.id);
        setSavedNotice(copy.newStyleSuccess ?? '¡Estilo guardado! Disponible en la pantalla Crear.');
        setTimeout(() => setSavedNotice(''), 3000);
    };

    const handleDeleteStyle = (e: React.MouseEvent, styleId: string) => {
        e.stopPropagation();
        if (!window.confirm(copy.deleteConfirm ?? '¿Deseas eliminar este estilo personalizado?')) return;
        onDeleteCustomStyle?.(styleId);
        if (selectedStyleId === styleId) {
            setSelectedStyleId(styles[0]?.id ?? 'modern');
        }
    };

    const isCurrentActiveSelected = project.selectedStyle.id === activeCustomStyle?.id;

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-[#0c1017] text-foreground">
            {/* Gallery area */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6 [scrollbar-width:thin]">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">{copy.title}</h1>
                        <p className="mt-0.5 text-xs text-[#8795a8]">{copy.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onNavigateToCreate}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#273245] bg-[#141b27] px-3.5 py-1.5 text-xs font-semibold text-[#b8c6da] transition-colors hover:border-[#3d4f6d] hover:bg-[#1a2333] hover:text-white"
                    >
                        <span>{copy.goToEditor}</span>
                        <ArrowRight className="size-3.5 text-[#8594ab]" />
                    </button>
                </div>

                {/* Filter and Search Toolbar */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2434] pb-4">
                    <div className="flex flex-wrap items-center gap-1">
                        {CATEGORIES.map(cat => {
                            const label =
                                cat.id === 'all'
                                    ? copy.all
                                    : cat.id === 'custom'
                                    ? `${copy.myStyles ?? 'Mis Estilos'}${customStylesCount > 0 ? ` (${customStylesCount})` : ''}`
                                    : copy[cat.key as keyof typeof copy] ?? cat.id;

                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                                    className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                        isSelected
                                            ? 'border border-[#38465d] bg-[#1e2738] text-white shadow-xs'
                                            : 'border border-transparent text-[#7e8d9f] hover:border-[#263143] hover:bg-[#131924] hover:text-white'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-64 max-w-full">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#647287]" />
                        <input
                            type="text"
                            placeholder={copy.searchPlaceholder}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-8 w-full rounded-lg border border-[#242f42] bg-[#111722] pr-3 pl-8 text-xs text-white placeholder:text-[#586579] focus:border-[#5244dd] focus:outline-none"
                        />
                    </div>
                </div>

                {/* Grid of Styles */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 pb-8">
                    {filteredStyles.map(style => {
                        const isCurrentActive = project.selectedStyle.id === style.id;
                        const isSelectedInInspector = selectedStyleId === style.id;
                        const localizedName = stylesById?.[style.id]?.name ?? style.name;
                        const localizedDesc = stylesById?.[style.id]?.description ?? style.description;

                        return (
                            <div
                                key={style.id}
                                onClick={() => setSelectedStyleId(style.id)}
                                className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3 transition-all ${
                                    isSelectedInInspector
                                        ? 'border-[#6355ee] bg-[#141b29] shadow-[0_0_0_1px_#6355ee]'
                                        : 'border-[#1e2637] bg-[#101622] hover:border-[#2f3c54] hover:bg-[#131a28]'
                                }`}
                            >
                                {/* Card Top Row: Status Badges */}
                                <div className="mb-2 flex items-center justify-between min-h-[22px]">
                                    <div className="flex items-center gap-1.5">
                                        {style.isCustom ? (
                                            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                                {copy.customBadge ?? 'Personalizado'}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium tracking-wide text-[#627187] uppercase">
                                                Preset
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {isCurrentActive ? (
                                            <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                                <Check className="size-3 stroke-[2.5]" />
                                                <span>{copy.applied}</span>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleApply(style);
                                                }}
                                                className="cursor-pointer rounded border border-transparent px-2 py-0.5 text-[10px] font-medium text-[#8f9eb3] opacity-0 transition-opacity hover:border-[#3d4d68] hover:bg-[#1c2435] hover:text-white group-hover:opacity-100"
                                            >
                                                {copy.apply}
                                            </button>
                                        )}
                                        {style.isCustom && onDeleteCustomStyle && (
                                            <button
                                                type="button"
                                                title={copy.deleteStyle ?? 'Eliminar estilo'}
                                                onClick={e => handleDeleteStyle(e, style.id)}
                                                className="cursor-pointer rounded p-1 text-[#6a788c] opacity-60 transition-opacity hover:bg-rose-500/20 hover:text-rose-400 hover:opacity-100"
                                            >
                                                <Trash2 className="size-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Preview Canvas Box */}
                                <div
                                    className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-[#1b2332] bg-[#090d14] p-3 text-center"
                                    style={{fontFamily: style.fontFamily}}
                                >
                                    <p
                                        className={`relative z-1 text-sm font-bold ${style.textPreviewClass ?? ''}`}
                                        style={{
                                            color: style.textColor ?? '#ffffff',
                                            backgroundColor: style.hasBgPill ? (style.bgPillColor ?? 'rgba(0,0,0,0.75)') : 'transparent',
                                            padding: style.hasBgPill ? '0.2em 0.5em' : undefined,
                                            borderRadius: style.hasBgPill ? '0.3em' : undefined,
                                            textShadow: style.textShadow && style.textShadow !== 'none' ? style.textShadow : undefined,
                                            letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
                                            fontWeight: style.fontFamily?.includes('Impact') ? 900 : 700,
                                        }}
                                    >
                                        {style.sampleWord ?? 'SAMPLE'}
                                    </p>
                                </div>

                                {/* Typography & Meta Info */}
                                <div className="mt-2.5">
                                    <h3 className={`text-xs font-semibold ${isSelectedInInspector ? 'text-white' : 'text-[#ccd5e2]'}`}>
                                        {localizedName}
                                    </h3>
                                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#6f7e94]">
                                        {localizedDesc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Inspector / Customization Drawer */}
            <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-[#1c2434] bg-[#0e131d] p-5 [scrollbar-width:thin]">
                <div className="flex items-center gap-2 border-b border-[#1c2434] pb-3.5">
                    <Sliders className="size-4 text-[#7b6ef8]" />
                    <h2 className="text-sm font-bold text-white">{copy.customize}</h2>
                </div>

                {/* Real-time Visual Preview Card */}
                <div className="mt-4 rounded-xl border border-[#202939] bg-[#090d14] p-3.5 text-center">
                    <span className="mb-2 block text-[10px] font-semibold text-[#66758a] uppercase tracking-wider">
                        {language === 'es' ? 'Vista Previa en Vivo' : 'Live Preview'}
                    </span>
                    <div
                        className="flex min-h-[85px] items-center justify-center rounded-lg bg-[#05080e] p-3 transition-all"
                        style={{fontFamily}}
                    >
                        <p
                            className="inline-block transition-all"
                            style={{
                                fontSize: `${fontSize}px`,
                                letterSpacing: `${letterSpacing}px`,
                                color: textColor,
                                backgroundColor: hasBgPill ? bgPillColor : 'transparent',
                                padding: hasBgPill ? '0.25em 0.5em' : '0',
                                borderRadius: hasBgPill ? '0.35em' : '0',
                                textShadow: textShadow === 'none' ? undefined : textShadow,
                                fontFamily,
                                fontWeight: fontFamily.includes('Impact') ? 900 : 700,
                            }}
                        >
                            <span style={{color: highlightColor}}>
                                {copy.previewSample.split(' ')[0]}
                            </span>{' '}
                            {copy.previewSample.split(' ').slice(1).join(' ')}
                        </p>
                    </div>
                    <span className="mt-2 block text-[10px] text-[#5e6d82]">
                        Base: <strong>{stylesById?.[activeCustomStyle.id]?.name ?? activeCustomStyle.name}</strong>
                    </span>
                </div>

                {/* Customizer Controls */}
                <div className="mt-4 space-y-4 text-xs">
                    {/* Style Name Field */}
                    <div>
                        <label className="block text-[11px] font-semibold text-[#909eb2] uppercase tracking-wider">
                            {copy.styleName ?? 'Nombre del estilo'}
                        </label>
                        <input
                            type="text"
                            value={styleName}
                            onChange={e => setStyleName(e.target.value)}
                            placeholder={copy.styleNamePlaceholder ?? 'Ej. Mi Estilo Viral'}
                            className="mt-1.5 h-8 w-full rounded-lg border border-[#222c3d] bg-[#0a0e16] px-2.5 text-xs text-white placeholder:text-[#536175] focus:border-[#5244dd] focus:outline-none"
                        />
                    </div>

                    {/* Typography */}
                    <div className="border-t border-[#1a2333] pt-3.5">
                        <label className="block text-[11px] font-semibold text-[#909eb2] uppercase tracking-wider">
                            {copy.typography}
                        </label>
                        <div className="mt-2 space-y-3">
                            <div>
                                <span className="mb-1 block text-[11px] text-[#718096]">
                                    {copy.fontFamily ?? 'Fuente Tipográfica'}
                                </span>
                                <select
                                    value={fontFamily}
                                    onChange={e => setFontFamily(e.target.value)}
                                    className="h-8 w-full cursor-pointer rounded-lg border border-[#222c3d] bg-[#0a0e16] px-2 text-xs text-white focus:border-[#5244dd] focus:outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font.value} value={font.value}>
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="mb-1 flex justify-between text-[11px] text-[#718096]">
                                    <span>{copy.fontSize}</span>
                                    <span className="font-mono text-white tabular-nums">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="46"
                                    value={fontSize}
                                    onChange={e => setFontSize(Number(e.target.value))}
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#222d3e] accent-primary"
                                />
                            </div>

                            <div>
                                <div className="mb-1 flex justify-between text-[11px] text-[#718096]">
                                    <span>{copy.letterSpacing}</span>
                                    <span className="font-mono text-white tabular-nums">{letterSpacing}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="6"
                                    value={letterSpacing}
                                    onChange={e => setLetterSpacing(Number(e.target.value))}
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#222d3e] accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Colors & Highlight */}
                    <div className="border-t border-[#1a2333] pt-3.5">
                        <label className="block text-[11px] font-semibold text-[#909eb2] uppercase tracking-wider">
                            {copy.colors}
                        </label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {/* Text Color */}
                            <div className="flex items-center gap-2 rounded-lg border border-[#1f2838] bg-[#0a0e16] p-2">
                                <label className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-white/20">
                                    <input
                                        type="color"
                                        value={textColor.startsWith('#') && textColor.length === 7 ? textColor : '#ffffff'}
                                        onChange={e => setTextColor(e.target.value)}
                                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                                    />
                                    <span className="size-full" style={{backgroundColor: textColor}} />
                                </label>
                                <div className="min-w-0 flex-1">
                                    <span className="block truncate text-[10px] text-[#6b7a8f]">{copy.textColor}</span>
                                    <span className="block truncate font-mono text-[11px] text-white uppercase">{textColor}</span>
                                </div>
                            </div>

                            {/* Highlight Color */}
                            <div className="flex items-center gap-2 rounded-lg border border-[#1f2838] bg-[#0a0e16] p-2">
                                <label className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-white/20">
                                    <input
                                        type="color"
                                        value={highlightColor.startsWith('#') && highlightColor.length === 7 ? highlightColor : '#8a7dff'}
                                        onChange={e => setHighlightColor(e.target.value)}
                                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                                    />
                                    <span className="size-full" style={{backgroundColor: highlightColor}} />
                                </label>
                                <div className="min-w-0 flex-1">
                                    <span className="block truncate text-[10px] text-[#6b7a8f]">{copy.highlightColor}</span>
                                    <span className="block truncate font-mono text-[11px] text-white uppercase">{highlightColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shadow & Box Effects */}
                    <div className="border-t border-[#1a2333] pt-3.5">
                        <label className="block text-[11px] font-semibold text-[#909eb2] uppercase tracking-wider">
                            {copy.animation ?? 'Efectos & Caja'}
                        </label>
                        <div className="mt-2 space-y-2.5">
                            <div>
                                <span className="mb-1 block text-[11px] text-[#718096]">{copy.shadowEffect ?? 'Efecto de Sombra'}</span>
                                <select
                                    value={textShadow}
                                    onChange={e => setTextShadow(e.target.value)}
                                    className="h-8 w-full cursor-pointer rounded-lg border border-[#222c3d] bg-[#0a0e16] px-2 text-xs text-white focus:border-[#5244dd] focus:outline-none"
                                >
                                    <option value="none">{copy.shadowNone ?? 'Ninguna'}</option>
                                    <option value="0 2px 8px rgba(0,0,0,0.6)">{copy.shadowSoft ?? 'Sombra Suave'}</option>
                                    <option value="0 0.08em 0 #5c4df0, 0 0.2em 0.55em #000">{copy.shadowHard ?? 'Sombra 3D / Impacto'}</option>
                                    <option value="0 0 0.32em currentColor, 0 0 0.6em currentColor">{copy.shadowNeon ?? 'Resplandor Neón'}</option>
                                </select>
                            </div>

                            <label className="flex cursor-pointer items-center justify-between text-[11px] text-[#8695aa]">
                                <span>{copy.bgPill}</span>
                                <input
                                    type="checkbox"
                                    checked={hasBgPill}
                                    onChange={e => setHasBgPill(e.target.checked)}
                                    className="size-4 cursor-pointer accent-primary"
                                />
                            </label>

                            {hasBgPill && (
                                <div className="flex items-center gap-2 rounded-lg border border-[#1f2838] bg-[#0a0e16] p-2">
                                    <label className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-white/20">
                                        <input
                                            type="color"
                                            value={bgPillColor.startsWith('#') && bgPillColor.length === 7 ? bgPillColor : '#101726'}
                                            onChange={e => setBgPillColor(e.target.value)}
                                            className="absolute inset-0 size-full cursor-pointer opacity-0"
                                        />
                                        <span className="size-full" style={{backgroundColor: bgPillColor}} />
                                    </label>
                                    <span className="text-[11px] text-[#8695aa]">{copy.bgPillColor ?? 'Color de Fondo'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="mt-auto space-y-2 pt-5 border-t border-[#1c2434]">
                    {savedNotice && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 p-2 text-center text-xs font-medium text-emerald-300">
                            {savedNotice}
                        </div>
                    )}

                    {/* Apply current style to project */}
                    <button
                        type="button"
                        onClick={() => handleApply(activeCustomStyle)}
                        className={`flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg font-bold text-xs transition-all ${
                            isCurrentActiveSelected
                                ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default'
                                : 'bg-primary text-white shadow-sm hover:bg-primary-hover active:scale-[0.99]'
                        }`}
                    >
                        <Check className="size-4" />
                        <span>{isCurrentActiveSelected ? copy.applied : copy.apply}</span>
                    </button>

                    {/* Save as New Custom Style Button */}
                    <button
                        type="button"
                        onClick={handleSaveNewStyle}
                        className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#2d3a4e] bg-[#121926] text-xs font-semibold text-[#ccd7e8] transition-colors hover:border-[#425471] hover:bg-[#182132] hover:text-white"
                    >
                        <Plus className="size-3.5 stroke-[2.5]" />
                        <span>{copy.saveAsNew ?? 'Guardar como nuevo estilo'}</span>
                    </button>
                </div>
            </aside>
        </div>
    );
}
