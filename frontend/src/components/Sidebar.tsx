import {BoltIcon, ExportIcon, HomeIcon, LayoutIcon, SettingsIcon, SwatchIcon} from './Icons';
import logotype from '../assets/images/textmotion-logotipo.png';
import {getCopy, type Language} from '../i18n';

interface Props { activeItem: string; onSelect: (item: string) => void; language: Language; }

const navClass = 'flex h-12 w-full cursor-pointer items-center gap-[13px] rounded-[11px] px-[17px] text-[#aab4c5] transition-[background,color] duration-[180ms] hover:bg-[#161d2a] hover:text-[#eef1f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff] [&_svg]:w-[19px]';

export function Sidebar({activeItem, onSelect, language}: Props) {
    const copy = getCopy(language).sidebar;
    const navItems = [
        {id: 'Create', label: copy.create, icon: HomeIcon},
        {id: 'Styles', label: copy.styles, icon: SwatchIcon},
        {id: 'Templates', label: copy.templates, icon: LayoutIcon},
        {id: 'Export', label: copy.export, icon: ExportIcon},
    ];

    const getBtnClass = (isActive: boolean) =>
        `relative group flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c6cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c111a] ${
            isActive
                ? 'bg-gradient-to-r from-[#6254ed] via-[#6a5df5] to-[#7465ff] text-white border border-[#897cff]/40 shadow-[0_4px_20px_rgba(98,84,237,0.38),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                : 'text-[#9ca8bc] border border-transparent hover:border-[#2d3a50]/70 hover:bg-[#182132]/90 hover:text-white hover:translate-x-1'
        }`;

    return <aside className="flex flex-col justify-between border-r border-[#202838] bg-[#0c111a] px-[18px] pt-8 pb-5 max-[1320px]:px-[14px] [@media(max-height:820px)]:pt-6">
        <div>
            <div className="mx-1 mb-[38px] [@media(max-height:820px)]:mb-6">
                <img src={logotype} alt="TextMotion Studio" className="block h-auto w-full transition-opacity duration-200 hover:opacity-90"/>
            </div>
            <nav aria-label={copy.navigation} className="grid gap-2">
                {navItems.map(({id, label, icon: NavIcon}) => {
                    const isActive = activeItem === id;
                    return (
                        <button
                            key={id}
                            className={getBtnClass(isActive)}
                            onClick={() => onSelect(id)}
                        >
                            {isActive && (
                                <span className="absolute -left-1.5 h-5 w-1 rounded-full bg-[#d0caff] shadow-[0_0_8px_#c2baff]" aria-hidden="true" />
                            )}
                            <span className={`transition-all duration-200 ${isActive ? 'text-white scale-105' : 'text-[#7e8ca3] group-hover:text-[#c4d0e4] group-hover:scale-110'}`}>
                                <NavIcon className="w-[19px] h-[19px]"/>
                            </span>
                            <span className="tracking-[-0.01em]">{label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
        <div className="grid gap-[18px]">
            {(() => {
                const isSettingsActive = activeItem === 'Settings';
                return (
                    <button
                        className={getBtnClass(isSettingsActive)}
                        onClick={() => onSelect('Settings')}
                    >
                        {isSettingsActive && (
                            <span className="absolute -left-1.5 h-5 w-1 rounded-full bg-[#d0caff] shadow-[0_0_8px_#c2baff]" aria-hidden="true" />
                        )}
                        <span className={`transition-all duration-200 ${isSettingsActive ? 'text-white scale-105' : 'text-[#7e8ca3] group-hover:text-[#c4d0e4] group-hover:scale-110'}`}>
                            <SettingsIcon className="w-[19px] h-[19px]"/>
                        </span>
                        <span className="tracking-[-0.01em]">{copy.settings}</span>
                    </button>
                );
            })()}
            <div className="flex items-center gap-3 rounded-[13px] border border-[#242d3d] bg-gradient-to-b from-[#151b27] to-[#111622] px-3 py-[14px] transition-colors duration-200 hover:border-[#2f3b50] [@media(max-height:820px)]:py-[10px]">
                <div className="grid h-[42px] w-[38px] shrink-0 place-items-center rounded-[9px] bg-[#20283a] text-[#c9c5ff] shadow-sm"><BoltIcon/></div>
                <div><strong className="block text-[13px] font-bold text-[#e8ecf4]">{copy.processLocally}</strong><span className="mt-[3px] block text-[10px] leading-[1.4] text-muted">{copy.privacy}</span></div>
            </div>
        </div>
    </aside>;
}
