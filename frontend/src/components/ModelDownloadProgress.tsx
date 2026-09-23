import type {DownloadProgress} from './onboarding/modelDownload';
import {getModelCopy, type Language} from '../i18n';

const mib = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MiB`;

export function ModelDownloadProgress({progress, language}: {progress?: DownloadProgress; language: Language}) {
    const copy = getModelCopy(language);
    const percent = progress ? Math.max(0, Math.min(100, Math.round(progress.percentage))) : 0;
    const label = progress?.validating ? copy.validating : copy.downloading;
    return <div className="mt-3 min-w-0" role="status">
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#c8d0de]">
            <span className="truncate">{label}{progress && !progress.validating ? ` · ${mib(progress.bytesDownloaded)} / ${mib(progress.totalBytes)}` : ''}</span>
            {progress && <strong className="shrink-0 tabular-nums text-white">{percent}%</strong>}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#30394a]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ? percent : undefined}>
            <div className={`h-full rounded-full bg-primary transition-[width] duration-200 ${progress ? '' : 'w-1/3 animate-pulse'}`} style={progress ? {width: `${percent}%`} : undefined}/>
        </div>
        {progress?.bytesPerSecond && !progress.validating && <p className="mt-1 text-[11px] text-[#aeb9ca]">{mib(progress.bytesPerSecond)}/s</p>}
    </div>;
}
