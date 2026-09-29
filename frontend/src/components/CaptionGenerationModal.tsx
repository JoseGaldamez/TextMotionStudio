import {useEffect, useRef, useState} from 'react';
import type {CSSProperties} from 'react';
import {AudioLines, X} from 'lucide-react';
import {EventsOn} from '../../wailsjs/runtime/runtime';
import {getCopy, type Language} from '../i18n';

interface Props {
    language: Language;
    onCancel: () => void;
}

const waveform = [28, 46, 68, 42, 82, 56, 94, 64, 78, 48, 88, 58, 100, 66, 86, 52, 76, 62, 92, 54, 72, 44, 64, 38, 24];
type GenerationProgress = {stage: string; device?: 'cuda' | 'vulkan' | 'cpu'};

export function CaptionGenerationModal({language, onCancel}: Props) {
    const copy = getCopy(language).generationModal;
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const [isCanceling, setIsCanceling] = useState(false);
    const [stage, setStage] = useState('starting');
    const [device, setDevice] = useState<GenerationProgress['device']>();
    const [startedAt] = useState(() => Date.now());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        dialog.showModal();
        cancelButtonRef.current?.focus();
        return () => dialog.close();
    }, []);

    useEffect(() => {
        const off = EventsOn('captions:generation:progress', (progress: GenerationProgress) => {
            setStage(progress.stage);
            if (progress.device) setDevice(progress.device);
        });
        const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => {off(); window.clearInterval(timer)};
    }, [startedAt]);

    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    const deviceName = device === 'cuda' ? copy.gpuCuda : device === 'vulkan' ? copy.gpuVulkan : device === 'cpu' ? copy.cpu : copy.detectingDevice;
    const stageName = stage === 'preparing' ? copy.preparing : stage === 'transcribing' ? copy.transcribing : stage === 'processing' ? copy.processing : copy.starting;

    const cancel = () => {
        if (isCanceling) return;
        setIsCanceling(true);
        onCancel();
    };

    return (
        <dialog
            ref={dialogRef}
            className="generation-dialog m-auto w-[min(520px,calc(100vw-48px))] overflow-hidden rounded-[16px] bg-[#151b28] p-0 text-foreground shadow-[0_28px_90px_rgba(0,0,0,.72)]"
            aria-labelledby="generation-title"
            aria-describedby="generation-description"
            onCancel={event => {
                event.preventDefault();
                cancel();
            }}
        >
            <div className="relative px-10 pt-10 pb-8 text-center">
                <div className="mx-auto mb-7 flex size-11 items-center justify-center rounded-[12px] bg-[#292444] text-[#aaa2ff]" aria-hidden="true">
                    <AudioLines className="size-5" strokeWidth={2}/>
                </div>

                <div className="decoder-visual relative mx-auto mb-8 flex h-[108px] max-w-[380px] items-center justify-center overflow-hidden" aria-hidden="true">
                    <div className="decoder-glow"/>
                    <div className="flex h-[74px] items-center gap-[5px]">
                        {waveform.map((height, index) => (
                            <span
                                key={index}
                                className="decoder-bar"
                                style={{
                                    '--bar-height': `${height}%`,
                                    '--bar-delay': `${-index * 86}ms`,
                                    '--bar-duration': `${900 + (index % 5) * 130}ms`,
                                } as CSSProperties}
                            />
                        ))}
                    </div>
                    <span className="decoder-scan"/>
                </div>

                <h2 id="generation-title" className="text-[21px] font-extrabold tracking-[-.02em] text-white">{copy.title}</h2>
                <p id="generation-description" className="mx-auto mt-3 max-w-[410px] text-sm leading-6 text-[#aeb8c8]">{copy.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                    <div className="rounded-xl border border-[#313c52] bg-[#1b2433] px-4 py-3">
                        <span className="block text-[11px] font-semibold text-[#9eabc0]">{copy.deviceLabel}</span>
                        <strong className="mt-1 block text-sm font-bold text-white" aria-live="polite">{deviceName}</strong>
                    </div>
                    <div className="rounded-xl border border-[#313c52] bg-[#1b2433] px-4 py-3">
                        <span className="block text-[11px] font-semibold text-[#9eabc0]">{copy.elapsedLabel}</span>
                        <strong className="mt-1 block font-mono text-sm font-bold tabular-nums text-white">{minutes}:{seconds}</strong>
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#aeb8c8]" role="status" aria-live="polite">
                    <span className="generation-pulse size-1.5 rounded-full bg-[#8d82ff]" aria-hidden="true"/>
                    {isCanceling ? copy.canceling : stageName}
                </div>

                <button
                    ref={cancelButtonRef}
                    type="button"
                    disabled={isCanceling}
                    onClick={cancel}
                    className="mt-7 inline-flex h-10 min-w-[168px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#39445a] bg-[#1b2332] px-5 text-sm font-bold text-[#dbe1eb] transition-colors hover:enabled:border-[#54637f] hover:enabled:bg-[#222c3e] hover:enabled:text-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]"
                >
                    <X className="size-4" aria-hidden="true"/>
                    {isCanceling ? copy.canceling : copy.cancel}
                </button>
            </div>
        </dialog>
    );
}
