import {useEffect, useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {getCopy, getModelCopy, type Language} from '../i18n';
import {useLocalModels} from '../useLocalModels';
import {ModelDownloadProgress} from './ModelDownloadProgress';

interface Props {
    language: Language;
    isGenerating: boolean;
    onReadyModelChange: (id: string | null) => void;
}

export function ModelSelector({language, isGenerating, onReadyModelChange}: Props) {
    const copy = getCopy(language).workflow;
    const modelCopy = getModelCopy(language);
    const {models, progressById, error, select, download, cancel} = useLocalModels();
    const [requestedModelId, setRequestedModelId] = useState('');
    const [isSelecting, setIsSelecting] = useState(false);
    const requestedModel = models.find(model => model.id === requestedModelId);
    const readyId = requestedModel?.status === 'installed' && requestedModel.selected ? requestedModel.id : null;

    useEffect(() => {
        if (!requestedModelId && models.length > 0) setRequestedModelId(models.find(model => model.selected)?.id ?? models[0].id);
    }, [models, requestedModelId]);

    useEffect(() => onReadyModelChange(readyId), [onReadyModelChange, readyId]);

    const chooseInstalledModel = async (id: string) => {
        setIsSelecting(true);
        try {
            await select(id);
        } finally {
            setIsSelecting(false);
        }
    };

    const needsAction = requestedModel && !readyId;

    return <div className="relative flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-[#aeb9ca]">
            <span className="whitespace-nowrap">{copy.modelLabel}</span>
            <select
                className="h-8 w-[155px] rounded-[8px] border border-[#30394a] bg-surface px-2 text-xs text-[#e7ebf2] outline-0 focus-visible:border-[#8074ff] focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-60"
                value={requestedModelId}
                onChange={event => {
                    const id = event.target.value;
                    setRequestedModelId(id);
                    const chosen = models.find(model => model.id === id);
                    if (chosen?.status === 'installed' && !chosen.selected) void chooseInstalledModel(id);
                }}
                disabled={isGenerating || isSelecting || models.length === 0}
            >
                {models.length === 0 && <option value="">{copy.modelLabel}</option>}
                {models.map(model => <option key={model.id} value={model.id}>{modelCopy[model.id as 'base' | 'small' | 'medium']?.name ?? model.name} · {model.displaySize}</option>)}
            </select>
        </label>
        {isSelecting && <span className="flex items-center gap-1 text-[11px] text-[#c5beff]" role="status"><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true"/>{modelCopy.selecting}</span>}
        {!isSelecting && needsAction && requestedModel.status !== 'downloading' && <button type="button" disabled={isGenerating} className="h-8 whitespace-nowrap rounded-[8px] border border-[#50477d] bg-[#211f36] px-2.5 text-[11px] font-bold text-[#d2ccff] hover:enabled:bg-[#2d294a] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#958aff]" onClick={() => void (requestedModel.status === 'installed' ? chooseInstalledModel(requestedModel.id) : download(requestedModel.id))}>
            {requestedModel.status === 'installed' ? modelCopy.useModel : modelCopy.download}
        </button>}
        {needsAction && requestedModel.status === 'downloading' && <button type="button" disabled={isGenerating} className="h-8 rounded-[8px] px-2 text-[11px] font-semibold text-[#c8d0de] hover:enabled:text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#958aff]" onClick={() => void cancel(requestedModel.id)}>{modelCopy.cancel}</button>}
        {(requestedModel?.status === 'downloading' || error) && <div className="absolute top-10 right-0 z-30 w-[280px] rounded-[10px] border border-[#30394a] bg-[#171e2b] px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,.35)]">
            {requestedModel?.status === 'downloading' && <ModelDownloadProgress progress={progressById[requestedModel.id]} language={language}/>}
            {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
        </div>}
    </div>;
}
