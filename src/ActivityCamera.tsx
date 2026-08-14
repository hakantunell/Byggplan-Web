import {useEffect,useRef,useState} from 'react';

type Props={onCapture:(file:File)=>Promise<boolean>;onClose:()=>void};

export function ActivityCamera({onCapture,onClose}:Props){
  const videoRef=useRef<HTMLVideoElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const[cameraReady,setCameraReady]=useState(false);
  const[capturing,setCapturing]=useState(false);
  const[saved,setSaved]=useState(0);
  const[error,setError]=useState('');
  const[flash,setFlash]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    async function start(){
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('Kameran stöds inte av den här webbläsaren.');
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
        if(cancelled){for(const track of stream.getTracks())track.stop();return;}
        streamRef.current=stream;
        if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();setCameraReady(true);}
      }catch(err){
        const name=err instanceof DOMException?err.name:'';
        setError(name==='NotAllowedError'?'ByggPlan fick inte tillgång till kameran. Tillåt kamera för webbplatsen och försök igen.':err instanceof Error?err.message:'Kunde inte starta kameran.');
      }
    }
    void start();
    return()=>{cancelled=true;for(const track of streamRef.current?.getTracks()||[])track.stop();streamRef.current=null};
  },[]);

  function close(){for(const track of streamRef.current?.getTracks()||[])track.stop();streamRef.current=null;onClose()}

  async function takePhoto(){
    const video=videoRef.current;if(!video||!video.videoWidth||!video.videoHeight||capturing)return;
    setCapturing(true);setError('');setFlash(true);window.setTimeout(()=>setFlash(false),110);
    try{
      const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      const context=canvas.getContext('2d');if(!context)throw new Error('Kunde inte skapa bilden.');
      context.drawImage(video,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
      if(!blob)throw new Error('Kunde inte skapa bilden.');
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      const ok=await onCapture(new File([blob],`foto-${stamp}.jpg`,{type:'image/jpeg'}));
      if(ok)setSaved(value=>value+1);else setError('Bilden kunde inte sparas. Försök igen.');
    }catch(err){setError(err instanceof Error?err.message:'Bilden kunde inte sparas.');}
    finally{setCapturing(false)}
  }

  return <div className="activityCamera" role="dialog" aria-modal="true" aria-label="Kamera">
    <div className="activityCameraTop"><button type="button" onClick={close}>Stäng</button><b>Kamera</b><span>{saved?`${saved} sparade`:''}</span></div>
    <div className="activityCameraView"><video ref={videoRef} autoPlay playsInline muted/><div className={`activityCameraFlash ${flash?'show':''}`}/>{!cameraReady&&!error&&<div className="activityCameraLoading">Startar kameran…</div>}{error&&<div className="activityCameraError">{error}</div>}</div>
    <div className="activityCameraBottom"><small>{capturing?'Sparar bilden…':saved?`✓ ${saved} ${saved===1?'bild':'bilder'} sparade på aktiviteten`:'Ta så många bilder du behöver'}</small><button type="button" className="activityCameraShutter" disabled={!cameraReady||capturing} onClick={()=>void takePhoto()} aria-label="Ta bild"><span/></button><button type="button" className="activityCameraDone" onClick={close}>Klar</button></div>
  </div>;
}
