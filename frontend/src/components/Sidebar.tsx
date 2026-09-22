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
    return <aside className="flex flex-col justify-between border-r border-[#202838] bg-[#0c111a] px-[18px] pt-8 pb-5 max-[1320px]:px-[14px] [@media(max-height:820px)]:pt-6">
        <div>
            <div className="mx-1 mb-[38px] [@media(max-height:820px)]:mb-6">
                <img src={logotype} alt="TextMotion Studio" className="block h-auto w-full"/>
            </div>
            <nav aria-label={copy.navigation} className="grid gap-[7px]">
                {navItems.map(({id, label, icon: NavIcon}) => <button key={id} className={`${navClass} ${activeItem === id ? 'bg-[#6254ed] text-white shadow-[0_8px_24px_rgba(69,53,214,.22)]' : ''}`} onClick={() => onSelect(id)}><NavIcon/><span>{label}</span></button>)}
            </nav>
        </div>
        <div className="grid gap-[18px]">
            <button className={navClass} onClick={() => onSelect('Settings')}><SettingsIcon/><span>{copy.settings}</span></button>
            <div className="flex items-center gap-3 rounded-[13px] border border-[#242d3d] bg-[#151b27] px-3 py-[14px] [@media(max-height:820px)]:py-[10px]">
                <div className="grid h-[42px] w-[38px] shrink-0 place-items-center rounded-[9px] bg-[#20283a] text-[#c9c5ff]"><BoltIcon/></div>
                <div><strong className="block text-[13px]">{copy.processLocally}</strong><span className="mt-[3px] block text-[10px] leading-[1.4] text-muted">{copy.privacy}</span></div>
            </div>
        </div>
    </aside>;
}
