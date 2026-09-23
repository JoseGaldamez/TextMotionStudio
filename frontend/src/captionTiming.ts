import type {Caption, CaptionWord} from './models';

export function findActiveCaption(captions: Caption[], time: number): Caption | undefined {
    let low = 0, high = captions.length - 1;
    while (low <= high) {
        const middle = (low + high) >> 1;
        const caption = captions[middle];
        if (time < caption.start) high = middle - 1;
        else if (time >= caption.end) low = middle + 1;
        else return caption;
    }
}

export function getActiveWord(caption: Caption | undefined, time: number): CaptionWord | undefined {
    return caption?.words.find(word => word.start <= time && time < word.end);
}
