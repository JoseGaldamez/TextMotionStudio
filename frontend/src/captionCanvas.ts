import type {Caption, CaptionStyle} from './models';

const fontScale: Record<string, number> = {
    modern: .03, bold: .035, karaoke: .03, minimal: .024, pop: .03,
    cyber: .032, boxed: .024, cinematic: .028, typewriter: .022,
    reels: .038, story: .03,
};

const fontWeight: Record<string, number> = {
    modern: 800, bold: 800, karaoke: 800, minimal: 600, pop: 800,
    cyber: 800, boxed: 700, cinematic: 400, typewriter: 400,
    reels: 900, story: 800,
};

interface Part {text: string; active: boolean; visible: boolean}
interface Line {parts: Part[]; width: number}

export interface CaptionDrawing {
    caption: Caption | undefined;
    activeWordID: string;
    visibleWordCount: number;
    style: CaptionStyle;
    size: number;
    position: number;
    width: number;
    height: number;
}

export function drawCaption(context: CanvasRenderingContext2D, drawing: CaptionDrawing): void {
    const {caption, activeWordID, visibleWordCount, style, size, position, width, height} = drawing;
    context.clearRect(0, 0, width, height);
    if (!caption?.words.length) return;

    const revealMode = style.revealMode ?? 'all';
    const revealed = Math.min(caption.words.length, Math.max(0, visibleWordCount));
    if (revealMode !== 'all' && revealed === 0) return;
    const words = revealMode === 'single' ? caption.words.slice(revealed - 1, revealed) : caption.words;

    const id = style.id;
    const fontSize = width * (style.fontSize ? style.fontSize / 1000 : fontScale[id] ?? fontScale.modern) * 1.8 * size / 100;
    const lineHeight = fontSize * 1.25;
    const padX = fontSize * (id === 'boxed' ? .45 : .25);
    const padY = fontSize * (id === 'boxed' ? .25 : .12);
    const spacing = style.letterSpacing ? width / 1000 * style.letterSpacing : 0;
    const family = style.fontFamily ?? (id === 'cinematic' ? 'Georgia, serif' : id === 'typewriter' || id === 'cyber' ? 'monospace' : 'Nunito, sans-serif');
    const italic = id === 'cinematic' ? 'italic ' : '';
    const weight = style.isCustom ? 700 : fontWeight[id] ?? 800;
    const maxTextWidth = Math.max(1, width * .9 - 2 * padX);
    const highlight = style.highlightColor ?? '#8a7dff';
    const baseColor = style.textColor ?? (id === 'cyber' ? '#00f2fe' : id === 'cinematic' ? '#f5ecd7' : id === 'typewriter' ? '#34d399' : '#ffffff');
    const uppercase = id === 'bold' || id === 'cyber' || id === 'reels';

    const setFont = (active: boolean) => {
        context.font = `${italic}${revealMode === 'progressive' ? weight : active ? 900 : weight} ${fontSize}px ${family}`;
    };
    const measure = (text: string, active: boolean) => {
        setFont(active);
        if (!spacing) return context.measureText(text).width;
        return Array.from(text).reduce((sum, character) => sum + context.measureText(character).width + spacing, 0);
    };
    const lines: Line[] = [{parts: [], width: 0}];
    const addPart = (part: Part) => {
        const line = lines[lines.length - 1];
        const partWidth = measure(part.text, part.active);
        line.parts.push(part);
        line.width += partWidth;
    };
    for (const [index, word] of words.entries()) {
        const active = word.id === activeWordID || revealMode === 'single';
        const visible = revealMode !== 'progressive' || index < revealed;
        const text = uppercase ? word.text.toUpperCase() : word.text;
        const line = lines[lines.length - 1];
        const joined = line.parts.length ? ` ${text}` : text;
        if (line.parts.length && line.width + measure(joined, active) > maxTextWidth) lines.push({parts: [], width: 0});
        if (measure(text, active) <= maxTextWidth) {
            addPart({text: lines[lines.length - 1].parts.length ? ` ${text}` : text, active, visible});
            continue;
        }
        for (const character of Array.from(text)) {
            const current = lines[lines.length - 1];
            if (current.parts.length && current.width + measure(character, active) > maxTextWidth) lines.push({parts: [], width: 0});
            addPart({text: character, active, visible});
        }
    }
    const boxWidth = Math.min(width * .9, Math.max(...lines.map(line => line.width - (spacing || 0))) + 2 * padX);
    const boxHeight = lines.length * lineHeight + 2 * padY;
    const fraction = Math.max(0, Math.min(1, position / 100));
    const bottomOffset = id === 'minimal' ? .035 : .05;
    const top = height * (1 - bottomOffset) * (1 - fraction) - boxHeight * (1 - fraction);

    context.save();
    context.translate(width / 2, top + boxHeight / 2);
    if (id === 'pop') context.rotate(-Math.PI / 180);
    const left = -boxWidth / 2;
    const boxTop = -boxHeight / 2;
    const background = style.hasBgPill ? style.bgPillColor ?? 'rgba(0,0,0,.75)' : undefined;
    if (background) {
        context.fillStyle = background;
        context.beginPath();
        context.roundRect(left, boxTop, boxWidth, boxHeight, fontSize * .25);
        context.fill();
    }

    context.textBaseline = 'alphabetic';
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        let x = -(line.width - (spacing || 0)) / 2;
        const y = boxTop + padY + lineHeight * (row + .5) + fontSize * .36;
        for (const part of line.parts) {
            setFont(part.active);
            const partWidth = measure(part.text, part.active);
            if (!part.visible) {x += partWidth; continue}
            context.fillStyle = part.active ? highlight : baseColor;
            context.shadowColor = id === 'cyber' ? '#00f2fe' : id === 'pop' ? '#581c87' : id === 'bold' ? '#5c4df0' : 'rgba(0,0,0,.7)';
            context.shadowBlur = id === 'cyber' ? fontSize * .32 : fontSize * .22;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = id === 'bold' ? fontSize * .08 : fontSize * .07;
            if (style.textShadow === 'none') {
                context.shadowColor = 'transparent';
                context.shadowBlur = 0;
                context.shadowOffsetY = 0;
            } else if (style.textShadow?.includes('currentColor')) {
                context.shadowColor = String(context.fillStyle);
                context.shadowBlur = fontSize * .32;
                context.shadowOffsetY = 0;
            } else if (style.textShadow?.includes('#5c4df0')) {
                context.shadowColor = '#000000';
                context.shadowBlur = fontSize * .55;
                context.shadowOffsetY = fontSize * .2;
            } else if (style.textShadow?.includes('rgba(')) {
                context.shadowColor = style.textShadow.match(/rgba\([^)]+\)/)?.[0] ?? context.shadowColor;
            }
            const outlined = id === 'bold' || id === 'reels';
            if (outlined) {
                context.strokeStyle = '#101015';
                context.lineWidth = fontSize * .09;
                context.lineJoin = 'round';
            }
            if (spacing) {
                for (const character of Array.from(part.text)) {
                    if (outlined) context.strokeText(character, x, y);
                    context.fillText(character, x, y);
                    x += context.measureText(character).width + spacing;
                }
            } else {
                if (outlined) context.strokeText(part.text, x, y);
                context.fillText(part.text, x, y);
                x += partWidth;
            }
        }
    }
    context.restore();
}
