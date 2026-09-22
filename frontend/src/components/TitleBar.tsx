import {Quit, WindowMinimise, WindowToggleMaximise} from '../../wailsjs/runtime/runtime';
import appIcon from '../assets/images/textmotion-app-icon.png';
import {getCopy, type Language} from '../i18n';

const controlClass = 'window-no-drag grid h-full w-[46px] cursor-pointer place-items-center text-[#aab4c5] transition-colors hover:bg-[#202838] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-highlight';

export function TitleBar({language}: {language: Language}) {
    const copy = getCopy(language).titlebar;
    return <header className="flex h-11 shrink-0 items-center border-b border-border bg-[#0c111a] text-foreground">
        <div className="window-drag flex h-full min-w-0 flex-1 select-none items-center gap-2.5 pl-3" onDoubleClick={WindowToggleMaximise}>
            <img src={appIcon} alt="" className="size-7 object-contain" draggable={false}/>
            <span className="truncate text-[13px] font-bold tracking-[-.01em]">TextMotion Studio</span>
        </div>
        <div className="window-no-drag flex h-full items-stretch">
            <button type="button" className={controlClass} onClick={WindowMinimise} aria-label={copy.minimize} title={copy.minimize}>
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 10h12"/></svg>
            </button>
            <button type="button" className={controlClass} onClick={WindowToggleMaximise} aria-label={copy.maximize} title={copy.maximize}>
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4.5" y="4.5" width="11" height="11" rx="1"/></svg>
            </button>
            <button type="button" className={`${controlClass} hover:bg-[#b3404d] hover:text-white`} onClick={Quit} aria-label={copy.close} title={copy.close}>
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
            </button>
        </div>
    </header>;
}
