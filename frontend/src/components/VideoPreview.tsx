import {useEffect,useRef,useState} from 'react';
import type {Caption} from '../models';
import {CaptionsIcon,FullscreenIcon,PauseIcon,PlayIcon,VideoIcon} from './Icons';
import {getCopy, type Language} from '../i18n';
interface Props{videoUrl:string|null;captionStyle:string;activeCaption?:Caption;playbackTime:number;videoDuration:number;seekRequest:{time:number;id:number}|null;onPlaybackTimeChange:(time:number)=>void;onDurationChange:(duration:number)=>void;onSeek:(time:number)=>void;language:Language}
const formatTime=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const iconButtonClass = 'grid size-[34px] cursor-pointer place-items-center rounded-lg text-[#a9b4c5] hover:enabled:bg-[#202939] hover:enabled:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]';
const captionStyleClass: Record<string, string> = {
 modern: 'bg-primary/95 text-white text-[clamp(21px,2.1vw,36px)] font-extrabold',
 bold: 'bg-transparent text-white text-[clamp(25px,2.5vw,42px)] font-extrabold uppercase [text-shadow:0_3px_0_#5c4df0,0_7px_20px_#000]',
 karaoke: 'bg-[#f1df3c] text-[#1b1821] text-[clamp(21px,2.1vw,36px)] font-extrabold',
 minimal: 'bottom-[7%] bg-[rgba(9,12,18,.7)] text-white text-[clamp(18px,1.8vw,28px)] font-semibold',
 pop: '-rotate-1 bg-[#f04b89] text-white text-[clamp(21px,2.1vw,36px)] font-extrabold',
 cyber: 'bg-black/80 text-[#00f2fe] text-[clamp(22px,2.2vw,38px)] font-extrabold uppercase tracking-widest [text-shadow:0_0_12px_#00f2fe]',
 boxed: 'bg-black/75 px-3 py-1.5 rounded-lg text-white text-[clamp(18px,1.8vw,28px)] font-bold',
 cinematic: 'italic font-serif text-[#f5ecd7] text-[clamp(20px,2vw,32px)] [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]',
 typewriter: 'font-mono text-emerald-400 bg-black/60 text-[clamp(17px,1.7vw,26px)]',
};
export function VideoPreview({videoUrl,captionStyle,activeCaption,playbackTime,videoDuration,seekRequest,onPlaybackTimeChange,onDurationChange,onSeek,language}:Props){
 const copy=getCopy(language).preview;
 const videoRef=useRef<HTMLVideoElement>(null);const cardRef=useRef<HTMLDivElement>(null);const [playing,setPlaying]=useState(false);const [captionsVisible,setCaptionsVisible]=useState(true);
 useEffect(()=>{if(seekRequest&&videoRef.current)videoRef.current.currentTime=seekRequest.time},[seekRequest]);
 const toggle=async()=>{const video=videoRef.current;if(!video)return;if(video.paused)await video.play();else video.pause()};
 return <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_58px] overflow-hidden rounded-[15px] border border-[#222b39] bg-[#101620] [@media(max-height:820px)]:grid-rows-[minmax(0,1fr)_50px]" ref={cardRef}>
  <div className={`relative grid min-h-0 min-w-0 place-items-center overflow-hidden ${videoUrl ? 'bg-black' : 'video-stage bg-[radial-gradient(circle_at_50%_40%,#1d2635_0,#141b27_42%,#0b1018_100%)]'}`}>
   {videoUrl?<video className="absolute inset-0 h-full w-full object-contain" ref={videoRef} src={videoUrl} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onLoadedMetadata={e=>onDurationChange(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)} onTimeUpdate={e=>onPlaybackTimeChange(e.currentTarget.currentTime)} onSeeked={e=>onPlaybackTimeChange(e.currentTarget.currentTime)}/>:<div className="relative z-1 flex flex-col items-center text-center"><div className="mb-4 grid size-[60px] place-items-center rounded-[15px] border border-[#323c4d] bg-[#171f2c] text-[#a8b2c4] shadow-[0_12px_28px_rgba(0,0,0,.25)] [&_svg]:size-[27px]"><VideoIcon/></div><strong className="text-[18px] tracking-[-.02em]">{copy.emptyTitle}</strong><span className="mt-[7px] text-xs text-[#8994a6]">{copy.emptyBody}</span></div>}
   {videoUrl&&captionsVisible&&activeCaption&&<div className={`absolute bottom-[10%] left-1/2 max-w-[80%] -translate-x-1/2 rounded-[7px] px-[7px] py-1 tracking-[-.03em] whitespace-nowrap [text-shadow:0_2px_8px_rgba(0,0,0,.4)] ${captionStyleClass[captionStyle] ?? captionStyleClass.modern}`}><span>{activeCaption.text}</span></div>}
  </div>
  <div className="flex items-center gap-3 border-t border-[#1d2532] bg-[#101620] px-[17px]">
   <button className={`${iconButtonClass} text-white`} onClick={toggle} disabled={!videoUrl} aria-label={playing?copy.pause:copy.play}>{playing?<PauseIcon/>:<PlayIcon/>}</button>
   <span className="whitespace-nowrap text-xs text-[#d9dee7]">{formatTime(playbackTime)} <i className="text-[#687386] not-italic">/</i> {formatTime(videoDuration)}</span>
   <input className="seek h-1 min-w-20 flex-1 cursor-pointer rounded-[10px] bg-[#30394a] accent-primary" aria-label={copy.position} type="range" min="0" max={videoDuration||0} step="0.1" value={playbackTime} disabled={!videoUrl||videoDuration<=0} onChange={e=>onSeek(Number(e.target.value))}/>
   <button className={`${iconButtonClass} ${captionsVisible?'text-[#f1f2f7]':''}`} onClick={()=>setCaptionsVisible(v=>!v)} aria-label={copy.toggleCaptions}><CaptionsIcon/></button>
   <button className={iconButtonClass} onClick={()=>cardRef.current?.requestFullscreen()} aria-label={copy.fullscreen}><FullscreenIcon/></button>
  </div>
 </div>
}
