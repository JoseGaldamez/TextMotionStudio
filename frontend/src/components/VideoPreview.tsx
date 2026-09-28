import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {DragEvent} from 'react';
import type {Caption, CaptionStyle} from '../models';
import {findActiveCaption, getActiveWord} from '../captionTiming';
import {drawCaption} from '../captionCanvas';
import {CaptionsIcon,FullscreenExitIcon,FullscreenIcon,PauseIcon,PlayIcon,VideoIcon} from './Icons';
import {getCopy, type Language} from '../i18n';
interface Props{videoUrl:string|null;captions:Caption[];captionStyle:CaptionStyle|string;captionSize:number;captionPosition:number;playbackTime:number;videoDuration:number;playPauseRequest?:number;seekRequest:{time:number;id:number}|null;onPlayingChange?:(playing:boolean)=>void;onPlaybackTimeChange:(time:number)=>void;onDurationChange:(duration:number)=>void;onSeek:(time:number)=>void;onChooseVideo:()=>void;onVideoSelect:(file:File)=>void;language:Language}
const formatTime=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const iconButtonClass = 'grid size-[34px] cursor-pointer place-items-center rounded-lg text-[#a9b4c5] hover:enabled:bg-[#202939] hover:enabled:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#958aff]';
export function VideoPreview({videoUrl,captions,captionStyle,captionSize,captionPosition,playbackTime,videoDuration,playPauseRequest,seekRequest,onPlayingChange,onPlaybackTimeChange,onDurationChange,onSeek,onChooseVideo,onVideoSelect,language}:Props){
 const styleId = typeof captionStyle === 'string' ? captionStyle : captionStyle.id;
 const copy=getCopy(language).preview;
 const videoRef=useRef<HTMLVideoElement>(null);const stageRef=useRef<HTMLDivElement>(null);const cardRef=useRef<HTMLDivElement>(null);const canvasRef=useRef<HTMLCanvasElement>(null);const [playing,setPlaying]=useState(false);const [captionsVisible,setCaptionsVisible]=useState(true);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const [videoFrame,setVideoFrame]=useState<{width:number;height:number;sourceWidth:number;sourceHeight:number}|null>(null);
 const dragDepth=useRef(0);const [dragging,setDragging]=useState(false);
 const animationFrame=useRef<number|null>(null);const [activeCaption,setActiveCaption]=useState<Caption>();const [activeWordID,setActiveWordID]=useState('');const [visibleWordCount,setVisibleWordCount]=useState(0);
 const syncCaption=useCallback((time:number)=>{const caption=findActiveCaption(captions,time);const word=getActiveWord(caption,time);const count=caption?.words.filter(item=>item.start<=time).length??0;setActiveCaption(current=>current===caption?current:caption);setActiveWordID(current=>current===word?.id?current:(word?.id??''));setVisibleWordCount(current=>current===count?current:count)},[captions]);
 const stopSync=useCallback(()=>{if(animationFrame.current!==null){cancelAnimationFrame(animationFrame.current);animationFrame.current=null}},[]);
 const startSync=useCallback(()=>{stopSync();const tick=()=>{const video=videoRef.current;if(!video||video.paused||video.ended){animationFrame.current=null;return}syncCaption(video.currentTime);animationFrame.current=requestAnimationFrame(tick)};animationFrame.current=requestAnimationFrame(tick)},[stopSync,syncCaption]);
 useEffect(()=>{syncCaption(videoRef.current?.currentTime??playbackTime)},[captions,playbackTime,syncCaption]);
 useEffect(()=>stopSync,[stopSync]);
 useEffect(()=>{if(seekRequest&&videoRef.current)videoRef.current.currentTime=seekRequest.time},[seekRequest]);
 useEffect(()=>{
  if(!playPauseRequest||!videoRef.current)return;
  const video=videoRef.current;
  if(video.paused){
   if(video.duration&&video.currentTime>=video.duration)video.currentTime=0;
   void video.play();
  }else{
   video.pause();
  }
 },[playPauseRequest]);
 useEffect(()=>{
  const handleFullscreenChange=()=>setIsFullscreen(Boolean(document.fullscreenElement));
  document.addEventListener('fullscreenchange',handleFullscreenChange);
  return()=>document.removeEventListener('fullscreenchange',handleFullscreenChange);
 },[]);
 const toggleFullscreen=async()=>{
  try{
   if(!document.fullscreenElement){
    if(cardRef.current)await cardRef.current.requestFullscreen();
   }else{
    if(document.exitFullscreen)await document.exitFullscreen();
   }
  }catch(err){console.error('Fullscreen toggle failed',err)}
 };
 const updateVideoFrame=useCallback(()=>{
  const video=videoRef.current;const stage=stageRef.current;
  if(!video?.videoWidth||!video.videoHeight||!stage?.clientWidth||!stage.clientHeight){setVideoFrame(null);return}
  const scale=Math.min(stage.clientWidth/video.videoWidth,stage.clientHeight/video.videoHeight);
  const width=video.videoWidth*scale;const height=video.videoHeight*scale;
  setVideoFrame(current=>current?.width===width&&current.height===height&&current.sourceWidth===video.videoWidth&&current.sourceHeight===video.videoHeight?current:{width,height,sourceWidth:video.videoWidth,sourceHeight:video.videoHeight});
 },[]);
 useLayoutEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas||!videoFrame)return;
  if(canvas.width!==videoFrame.sourceWidth)canvas.width=videoFrame.sourceWidth;
  if(canvas.height!==videoFrame.sourceHeight)canvas.height=videoFrame.sourceHeight;
  const context=canvas.getContext('2d');
  if(!context)return;
  const draw=()=>drawCaption(context,{caption:activeCaption,activeWordID,visibleWordCount,style:typeof captionStyle==='string'?{id:styleId,name:styleId,description:''}:captionStyle,size:captionSize,position:captionPosition,width:canvas.width,height:canvas.height});
  draw();
  let cancelled=false;
  void document.fonts.load('800 48px Nunito').then(()=>{if(!cancelled)draw()});
  return()=>{cancelled=true};
 },[activeCaption,activeWordID,visibleWordCount,captionStyle,captionSize,captionPosition,videoFrame,styleId]);
 useEffect(()=>{const stage=stageRef.current;if(!stage)return;const observer=new ResizeObserver(updateVideoFrame);observer.observe(stage);updateVideoFrame();return()=>observer.disconnect()},[updateVideoFrame,videoUrl]);
 const toggle=async()=>{
  const video=videoRef.current;if(!video)return;
  if(video.paused){
   if(video.duration&&video.currentTime>=video.duration)video.currentTime=0;
   await video.play();
  }else video.pause();
 };
 const hasFiles=(event:DragEvent<HTMLDivElement>)=>Array.from(event.dataTransfer.types).includes('Files');
 const onDragEnter=(event:DragEvent<HTMLDivElement>)=>{if(!hasFiles(event))return;event.preventDefault();dragDepth.current+=1;setDragging(true)};
 const onDragOver=(event:DragEvent<HTMLDivElement>)=>{if(!hasFiles(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy'};
 const onDragLeave=(event:DragEvent<HTMLDivElement>)=>{if(!hasFiles(event))return;event.preventDefault();dragDepth.current=Math.max(0,dragDepth.current-1);if(dragDepth.current===0)setDragging(false)};
 const onDrop=(event:DragEvent<HTMLDivElement>)=>{event.preventDefault();dragDepth.current=0;setDragging(false);const file=event.dataTransfer.files[0];if(file)onVideoSelect(file)};
 return <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_58px] overflow-hidden rounded-[15px] border border-[#222b39] bg-[#101620] outline-none focus-within:border-[#2f3b4e] [@media(max-height:820px)]:grid-rows-[minmax(0,1fr)_50px]" ref={cardRef} tabIndex={0} onKeyDown={e=>{if(e.code==='Space'||e.key===' '){e.preventDefault();void toggle()}}}>
  <div ref={stageRef} data-video-drop-target className={`relative grid min-h-0 min-w-0 place-items-center overflow-hidden ${videoUrl ? 'bg-black' : 'video-stage bg-[radial-gradient(circle_at_50%_40%,#1d2635_0,#141b27_42%,#0b1018_100%)]'}`} onDoubleClick={onChooseVideo} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
   {videoUrl?<video className="absolute inset-0 h-full w-full object-contain" ref={videoRef} src={videoUrl} onPlay={()=>{setPlaying(true);startSync();onPlayingChange?.(true)}} onPause={()=>{setPlaying(false);stopSync();syncCaption(videoRef.current?.currentTime??0);onPlayingChange?.(false)}} onEnded={stopSync} onLoadedMetadata={e=>{onDurationChange(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0);updateVideoFrame();if(playbackTime>0){e.currentTarget.currentTime=playbackTime}}} onTimeUpdate={e=>onPlaybackTimeChange(e.currentTarget.currentTime)} onSeeked={e=>{syncCaption(e.currentTarget.currentTime);onPlaybackTimeChange(e.currentTarget.currentTime)}}/>:<div className="relative z-1 flex flex-col items-center text-center"><div className="mb-4 grid size-[60px] place-items-center rounded-[15px] border border-[#323c4d] bg-[#171f2c] text-[#a8b2c4] shadow-[0_12px_28px_rgba(0,0,0,.25)] [&_svg]:size-[27px]"><VideoIcon/></div><strong className="text-[18px] tracking-[-.02em]">{copy.emptyTitle}</strong><span className="mt-[7px] text-xs text-[#8994a6]">{copy.emptyBody}</span></div>}
    {videoUrl&&videoFrame&&captionsVisible&&<canvas ref={canvasRef} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" width={videoFrame.sourceWidth} height={videoFrame.sourceHeight} style={{width:videoFrame.width,height:videoFrame.height}}/>}
   {dragging&&<div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-xl border-2 border-dashed border-[#8b7fff] bg-[#171b2c]/90 text-center" role="status"><div className="px-6"><VideoIcon className="mx-auto mb-3 size-8 text-[#bcb5ff]"/><strong className="text-base text-white">{videoUrl?copy.dropToReplace:copy.dropToAdd}</strong></div></div>}
  </div>
  <div className="flex items-center gap-3 border-t border-[#1d2532] bg-[#101620] px-[17px]">
   <button className={`${iconButtonClass} text-white`} onClick={toggle} disabled={!videoUrl} aria-label={playing?copy.pause:copy.play}>{playing?<PauseIcon/>:<PlayIcon/>}</button>
   <span className="whitespace-nowrap text-xs text-[#d9dee7]">{formatTime(playbackTime)} <i className="text-[#687386] not-italic">/</i> {formatTime(videoDuration)}</span>
   <input className="seek h-1 min-w-20 flex-1 cursor-pointer rounded-[10px] bg-[#30394a] accent-primary" aria-label={copy.position} type="range" min="0" max={videoDuration||0} step="0.1" value={playbackTime} disabled={!videoUrl||videoDuration<=0} onChange={e=>onSeek(Number(e.target.value))}/>
   <button className={`${iconButtonClass} ${captionsVisible?'text-[#f1f2f7]':''}`} onClick={()=>setCaptionsVisible(v=>!v)} aria-label={copy.toggleCaptions}><CaptionsIcon/></button>
   <button className={iconButtonClass} onClick={toggleFullscreen} aria-label={isFullscreen?copy.exitFullscreen:copy.fullscreen} title={isFullscreen?copy.exitFullscreen:copy.fullscreen}>{isFullscreen?<FullscreenExitIcon/>:<FullscreenIcon/>}</button>
  </div>
 </div>
}
