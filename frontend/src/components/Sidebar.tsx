import {Download, Palette, Settings, ShieldCheck, Video} from 'lucide-react';
import logotype from '../assets/images/textmotion-logotipo.png';
import {getCopy, type Language} from '../i18n';

interface Props {
    activeItem: string;
    onSelect: (item: string) => void;
    language: Language;
}

export function Sidebar({activeItem, onSelect, language}: Props) {
    const copy = getCopy(language).sidebar;
    const navItems = [
        {id: 'Create', label: copy.create, icon: Video},
        {id: 'Styles', label: copy.styles, icon: Palette},
        {id: 'Export', label: copy.export, icon: Download},
    ];

    const isSettingsActive = activeItem === 'Settings';

    const getBtnClass = (isActive: boolean) =>
        `group relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c6cff] ${
            isActive
                ? 'bg-[#1a2133] text-white border border-[#2e3d59]/90 shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
                : 'text-[#8492a6] border border-transparent hover:bg-[#131926]/90 hover:text-[#e4ebf5]'
        }`;

    return (
        <aside className="flex flex-col justify-between border-r border-[#1b2333] bg-[#0a0e17] px-3.5 pt-7 pb-4 max-[1320px]:px-2.5 [@media(max-height:820px)]:pt-5">
            <div>
                {/* Brand Logotype */}
                <div className="px-1.5 mb-7 [@media(max-height:820px)]:mb-5">
                    <img
                        src={logotype}
                        alt="TextMotion Studio"
                        className="block h-auto w-full max-w-[170px] opacity-95 transition-opacity hover:opacity-100"
                    />
                </div>

                {/* Main Navigation */}
                <nav aria-label={copy.navigation} className="grid gap-1">
                    {navItems.map(({id, label, icon: NavIcon}) => {
                        const isActive = activeItem === id;
                        return (
                            <button
                                key={id}
                                className={getBtnClass(isActive)}
                                onClick={() => onSelect(id)}
                            >
                                {isActive && (
                                    <span
                                        className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-[#695af6] shadow-[0_0_8px_rgba(105,90,246,0.5)]"
                                        aria-hidden="true"
                                    />
                                )}
                                <NavIcon
                                    size={18}
                                    strokeWidth={1.75}
                                    className={`shrink-0 transition-colors duration-150 ${
                                        isActive ? 'text-[#8f82ff]' : 'text-[#637289] group-hover:text-[#9bb0ce]'
                                    }`}
                                />
                                <span className="tracking-[-0.01em]">{label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Footer Area: Settings & Local Privacy Status */}
            <div className="border-t border-[#17202f] pt-3">
                <button
                    className={getBtnClass(isSettingsActive)}
                    onClick={() => onSelect('Settings')}
                >
                    {isSettingsActive && (
                        <span
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-[#695af6] shadow-[0_0_8px_rgba(105,90,246,0.5)]"
                            aria-hidden="true"
                        />
                    )}
                    <Settings
                        size={18}
                        strokeWidth={1.75}
                        className={`shrink-0 transition-colors duration-150 ${
                            isSettingsActive ? 'text-[#8f82ff]' : 'text-[#637289] group-hover:text-[#9bb0ce]'
                        }`}
                    />
                    <span className="tracking-[-0.01em]">{copy.settings}</span>
                </button>

                {/* Sleek Privacy & Offline Engine Badge */}
                <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#1b2436] bg-[#0e1422]/90 px-3 py-2 text-left transition-colors hover:border-[#25324a]">
                    <div className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold text-[#ccd7e6] tracking-tight">
                            {copy.processLocally}
                        </span>
                        <span className="block text-[10px] text-[#6b788e] truncate leading-tight">
                            {copy.privacy}
                        </span>
                    </div>
                    <ShieldCheck size={14} strokeWidth={1.75} className="text-[#4e5d74] shrink-0" />
                </div>
            </div>
        </aside>
    );
}
