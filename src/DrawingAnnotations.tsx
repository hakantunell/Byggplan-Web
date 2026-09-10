import {useCallback,useEffect,useRef,useState} from 'react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();

type Attachment={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
type AnnotationNote={id:string;note:string;createdAt:string};
type AnnotationPhoto={id:string;originalName:string;contentType:string;sizeBytes:number;createdAt:string;url:string};
type Annotation={id:string;documentId:string;pageNumber:number;x:number;y:number;createdAt:string;notes:AnnotationNote[];photos:AnnotationPhoto[]};
type Point={x:number;y:number;pageNumber:number};
type DrawingPoint={x:number;y:number};
type DrawingCalibration={a:DrawingPoint;b:DrawingPoint;distanceMm:number};
type DrawingMeasurement={id:string;a:DrawingPoint;b:DrawingPoint;label:string;description?:string;visible:boolean;offset?:number};
type DrawingAngle={id:string;center:DrawingPoint;a:DrawingPoint;b:DrawingPoint;label:string;description?:string;visible:boolean;labelOffset?:DrawingPoint};
type DrawingPageState={calibration?:DrawingCalibration;scale?:number;measurements:DrawingMeasurement[];angles?:DrawingAngle[]};
type DrawingState=Record<string,DrawingPageState>;

const annotationApi=(path:string)=>`/api${path.startsWith('/')?'':'/'}${path}`;
const DRAWING_STORAGE_PREFIX='byggplan.drawingMeasurements.v1.';

function readDrawingState(projectId:string):DrawingState{
  if(!projectId)return {};
  try{return JSON.parse(localStorage.getItem(DRAWING_STORAGE_PREFIX+projectId)||'{}') as DrawingState}catch{return {}}
}
async function loadDrawingState(projectId:string):Promise<DrawingState>{
  const local=readDrawingState(projectId);
  try{
    const r=await fetch(`${annotationApi('/project-drawing-measurements')}?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
    if(!r.ok)return local;
    const data=await r.json() as {state?:DrawingState};
    return data.state&&typeof data.state==='object'?data.state:local;
  }catch{return local}
}
function formatMm(value:number){
  if(!Number.isFinite(value))return '';
  if(value>=1000)return `${(value/1000).toLocaleString('sv-SE',{minimumFractionDigits:0,maximumFractionDigits:3})} m`;
  return `${Math.round(value).toLocaleString('sv-SE')} mm`;
}

async function apiError(response:Response,fallback:string){
  const text=await response.text().catch(()=>'');
  try{const data=JSON.parse(text) as {error?:string};if(data.error)return data.error}catch{}
  const compact=text.replace(/\s+/g,' ').trim().slice(0,180);
  return `${fallback} (HTTP ${response.status}${compact?`: ${compact}`:''})`;
}

async function runtimeDiagnostic(){
  try{
    const r=await fetch(annotationApi('/project-document-annotations-version'),{cache:'no-store'});
    const text=await r.text().catch(()=>'');
    return `Runtimekontroll: HTTP ${r.status}${text?` ${text.replace(/\s+/g,' ').trim().slice(0,120)}`:''}`;
  }catch(error){return `Runtimekontroll misslyckades: ${error instanceof Error?error.message:String(error)}`}
}

async function requestWithMethodFallback(url:string,init:RequestInit,fallbackLabel:string){
  const first=await fetch(url,{...init,method:'PUT'});
  if(first.status!==405)return first;
  const second=await fetch(url,{...init,method:'POST'});
  if(second.status!==405)return second;
  const diagnostic=await runtimeDiagnostic();
  throw new Error(`${fallbackLabel} (PUT HTTP 405, POST HTTP 405). ${diagnostic}`);
}

function ReadOnlyDimensionOverlay({targetRef,measurements,measuredMm}:{targetRef:React.RefObject<HTMLCanvasElement|null>|React.RefObject<HTMLImageElement|null>;measurements:DrawingMeasurement[];measuredMm:(m:DrawingMeasurement)=>number}){
  const[size,setSize]=useState({w:0,h:0});
  useEffect(()=>{const target=targetRef.current;if(!target)return;const update=()=>{const r=target.getBoundingClientRect();setSize({w:r.width,h:r.height})};update();const ro=new ResizeObserver(update);ro.observe(target);return()=>ro.disconnect()},[targetRef.current]);
  if(!size.w||!size.h)return null;const min=Math.max(1,Math.min(size.w,size.h));
  const geometry=(m:DrawingMeasurement)=>{const ax=m.a.x*size.w,ay=m.a.y*size.h,bx=m.b.x*size.w,by=m.b.y*size.h,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,off=(m.offset||0)*min;return{ax,ay,bx,by,a2x:ax+nx*off,a2y:ay+ny*off,b2x:bx+nx*off,b2y:by+ny*off,mx:(ax+bx)/2+nx*off,my:(ay+by)/2+ny*off}};
  return <svg width={size.w} height={size.h} aria-hidden="true" style={{position:'absolute',left:0,top:0,overflow:'visible',pointerEvents:'none',zIndex:2}}>{measurements.map(m=>{const g=geometry(m),mm=measuredMm(m),text=[m.label,mm?formatMm(mm):''].filter(Boolean).join(' · '),w=Math.max(40,text.length*6+10);return <g key={m.id}>{(m.offset||0)!==0&&<><line x1={g.ax} y1={g.ay} x2={g.a2x} y2={g.a2y} stroke="#c56f18" strokeWidth="1"/><line x1={g.bx} y1={g.by} x2={g.b2x} y2={g.b2y} stroke="#c56f18" strokeWidth="1"/></>}<line x1={g.a2x} y1={g.a2y} x2={g.b2x} y2={g.b2y} stroke="#c56f18" strokeWidth="1.5"/><circle cx={g.a2x} cy={g.a2y} r="2.5" fill="#fff" stroke="#c56f18" strokeWidth="1.4"/><circle cx={g.b2x} cy={g.b2y} r="2.5" fill="#fff" stroke="#c56f18" strokeWidth="1.4"/>{text&&<><rect x={g.mx-w/2} y={g.my-9} width={w} height="18" rx="4" fill="rgba(255,255,255,.86)" stroke="rgba(197,111,24,.65)"/><text x={g.mx} y={g.my+3.7} textAnchor="middle" fontSize="11" fontWeight="600" fill="#6d430d">{text}</text></>}</g>})}</svg>;
}

function ReadOnlyAngleOverlay({targetRef,angles}:{targetRef:React.RefObject<HTMLCanvasElement|null>|React.RefObject<HTMLImageElement|null>;angles:DrawingAngle[]}){
  const[size,setSize]=useState({w:0,h:0});
  useEffect(()=>{const target=targetRef.current;if(!target)return;const update=()=>{const r=target.getBoundingClientRect();setSize({w:r.width,h:r.height})};update();const ro=new ResizeObserver(update);ro.observe(target);return()=>ro.disconnect()},[targetRef.current]);
  if(!size.w||!size.h)return null;
  return <svg width={size.w} height={size.h} aria-hidden="true" style={{position:'absolute',left:0,top:0,overflow:'visible',pointerEvents:'none',zIndex:2}}>{angles.map(a=>{const cx=a.center.x*size.w,cy=a.center.y*size.h,ax=a.a.x*size.w,ay=a.a.y*size.h,bx=a.b.x*size.w,by=a.b.y*size.h,a1=Math.atan2(ay-cy,ax-cx),a2=Math.atan2(by-cy,bx-cx);let d=a2-a1;while(d<=-Math.PI)d+=Math.PI*2;while(d>Math.PI)d-=Math.PI*2;const deg=Math.abs(d)*180/Math.PI,r=Math.min(34,Math.max(18,Math.min(Math.hypot(ax-cx,ay-cy),Math.hypot(bx-cx,by-cy))*.24)),mid=a1+d/2,endA={x:cx+Math.cos(a1)*r,y:cy+Math.sin(a1)*r},endB={x:cx+Math.cos(a2)*r,y:cy+Math.sin(a2)*r},arc=`M ${endA.x} ${endA.y} A ${r} ${r} 0 0 ${d>=0?1:0} ${endB.x} ${endB.y}`,off=a.labelOffset||{x:0,y:0},lx=cx+Math.cos(mid)*(r+20)+off.x*size.w,ly=cy+Math.sin(mid)*(r+20)+off.y*size.h,text=[a.label,`${deg.toFixed(1).replace('.',',')}°`].filter(Boolean).join(' · '),w=Math.max(40,text.length*6+10);return <g key={a.id}><line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#c56f18" strokeWidth="1.5"/><line x1={cx} y1={cy} x2={bx} y2={by} stroke="#c56f18" strokeWidth="1.5"/><path d={arc} fill="none" stroke="#c56f18" strokeWidth="1.5"/><circle cx={cx} cy={cy} r="2.8" fill="#fff" stroke="#c56f18" strokeWidth="1.4"/><rect x={lx-w/2} y={ly-9} width={w} height="18" rx="4" fill="rgba(255,255,255,.86)" stroke="rgba(197,111,24,.65)"/><text x={lx} y={ly+3.7} textAnchor="middle" fontSize="11" fontWeight="600" fill="#6d430d">{text}</text></g>})}</svg>;
}

export function DrawingAnnotations({projectId,documentId,title,file,objectUrl}:{projectId:string;documentId:string;title:string;file:Attachment;objectUrl:string;apiBase:string}){
  const[annotations,setAnnotations]=useState<Annotation[]>([]);
  const[pageNumber,setPageNumber]=useState(1);
  const[pageCount,setPageCount]=useState(1);
  const[pending,setPending]=useState<Point|null>(null);
  const[selected,setSelected]=useState<string|null>(null);
  const[noteText,setNoteText]=useState('');
  const[addingNote,setAddingNote]=useState(false);
  const[busy,setBusy]=useState(false);
  const[loadError,setLoadError]=useState('');
  const[photoTarget,setPhotoTarget]=useState<{annotationId?:string;point?:Point}|null>(null);
  const[showMeasurements,setShowMeasurements]=useState(true);
  const[drawingState,setDrawingState]=useState<DrawingState>(()=>readDrawingState(projectId));
  const[pdfPageMm,setPdfPageMm]=useState<{w:number;h:number}|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const surfaceRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const imageRef=useRef<HTMLImageElement>(null);
  const longPress=useRef<number|null>(null);
  const pointerStart=useRef<{x:number;y:number}|null>(null);

  const loadAnnotations=useCallback(async()=>{
    try{
      const r=await fetch(`${annotationApi('/project-document-annotations')}?documentId=${encodeURIComponent(documentId)}`,{cache:'no-store'});
      if(!r.ok)throw new Error(await apiError(r,'Kunde inte läsa markeringar.'));
      const d=await r.json() as {annotations?:Annotation[]};
      setAnnotations(d.annotations||[]);setLoadError('');
    }catch(error){setLoadError(error instanceof Error?error.message:'Kunde inte läsa markeringar.');}
  },[documentId]);

  useEffect(()=>{setAnnotations([]);setSelected(null);setPending(null);setPageNumber(1);void loadAnnotations()},[documentId,loadAnnotations]);
  useEffect(()=>{let cancelled=false;setDrawingState(readDrawingState(projectId));setShowMeasurements(true);void loadDrawingState(projectId).then(state=>{if(!cancelled)setDrawingState(state)});return()=>{cancelled=true}},[projectId,file.id]);
  useEffect(()=>{let cancelled=false;const refresh=()=>{void loadDrawingState(projectId).then(state=>{if(!cancelled)setDrawingState(state)})};const onVisible=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',onVisible);const id=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},1500);return()=>{cancelled=true;window.clearInterval(id);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',onVisible)}},[projectId]);
  useEffect(()=>{
    const key=DRAWING_STORAGE_PREFIX+projectId;
    const onStorage=(event:StorageEvent)=>{if(event.key===key)setDrawingState(readDrawingState(projectId))};
    window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);
  },[projectId]);

  useEffect(()=>{
    if(!objectUrl||file.contentType!=='application/pdf')return;
    let cancelled=false;let task:any;
    void(async()=>{
      try{
        task=pdfjs.getDocument(objectUrl);const pdf=await task.promise;if(cancelled)return;setPageCount(pdf.numPages);if(pageNumber>pdf.numPages)setPageNumber(1);
        const page=await pdf.getPage(Math.min(pageNumber,pdf.numPages));if(cancelled)return;
        const base=page.getViewport({scale:1});setPdfPageMm({w:base.width*25.4/72,h:base.height*25.4/72});
        const available=Math.max(360,(surfaceRef.current?.parentElement?.clientWidth||base.width)-6);const scale=Math.min(2,available/base.width);const viewport=page.getViewport({scale});
        const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext('2d');if(!context)return;
        canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);canvas.style.width=`${Math.floor(viewport.width)}px`;canvas.style.height=`${Math.floor(viewport.height)}px`;
        const render=page.render({canvasContext:context,viewport});await render.promise;
      }catch(error){if(!cancelled)setLoadError(error instanceof Error?error.message:'PDF-sidan kunde inte visas.');}
    })();
    return()=>{cancelled=true;try{task?.destroy()}catch{}}
  },[objectUrl,file.contentType,pageNumber]);

  const positionFromEvent=(event:React.PointerEvent<HTMLDivElement>):Point|null=>{
    const rect=surfaceRef.current?.getBoundingClientRect();if(!rect||rect.width<=0||rect.height<=0)return null;
    return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)),pageNumber};
  };
  const cancelLongPress=()=>{if(longPress.current!=null){window.clearTimeout(longPress.current);longPress.current=null}};
  const onPointerDown=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(event.button!==0&&event.pointerType==='mouse')return;pointerStart.current={x:event.clientX,y:event.clientY};cancelLongPress();
    longPress.current=window.setTimeout(()=>{const point=positionFromEvent(event);if(point){setSelected(null);setPending(point);setAddingNote(false);setNoteText('')}longPress.current=null},550);
  };
  const onPointerMove=(event:React.PointerEvent<HTMLDivElement>)=>{const start=pointerStart.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)cancelLongPress()};
  const onPointerEnd=()=>{cancelLongPress();pointerStart.current=null};

  const createAnnotation=async(point:Point)=>{
    const r=await requestWithMethodFallback(annotationApi('/project-document-annotations'),{headers:{'Content-Type':'application/json'},body:JSON.stringify({documentId,pageNumber:point.pageNumber,x:point.x,y:point.y})},'Markeringen kunde inte skapas.');
    if(!r.ok)throw new Error(await apiError(r,'Markeringen kunde inte skapas.'));
    const d=await r.json().catch(()=>({})) as {id?:string};if(!d.id)throw new Error(`Markeringen kunde inte skapas. API:t svarade HTTP ${r.status} utan id.`);return d.id;
  };
  const saveNote=async()=>{
    const note=noteText.trim();if(!note)return;setBusy(true);
    try{
      let annotationId=selected||undefined;if(!annotationId){if(!pending)return;annotationId=await createAnnotation(pending)}
      const r=await requestWithMethodFallback(annotationApi(`/project-document-annotations/${encodeURIComponent(annotationId)}/notes`),{headers:{'Content-Type':'application/json'},body:JSON.stringify({note})},'Notisen kunde inte sparas.');if(!r.ok)throw new Error(await apiError(r,'Notisen kunde inte sparas.'));
      setNoteText('');setAddingNote(false);setPending(null);setSelected(annotationId);await loadAnnotations();
    }catch(error){alert(error instanceof Error?error.message:'Notisen kunde inte sparas.')}finally{setBusy(false)}
  };
  const choosePhoto=(target:{annotationId?:string;point?:Point})=>{setPhotoTarget(target);fileInput.current?.click()};
  const uploadPhoto=async(fileToUpload:File)=>{
    if(!photoTarget)return;setBusy(true);
    try{
      let annotationId=photoTarget.annotationId;if(!annotationId){if(!photoTarget.point)return;annotationId=await createAnnotation(photoTarget.point)}
      const form=new FormData();form.append('file',fileToUpload,fileToUpload.name);const r=await requestWithMethodFallback(annotationApi(`/project-document-annotations/${encodeURIComponent(annotationId)}/photos`),{body:form},'Fotot kunde inte sparas.');if(!r.ok)throw new Error(await apiError(r,'Fotot kunde inte sparas.'));
      setPending(null);setSelected(annotationId);await loadAnnotations();
    }catch(error){alert(error instanceof Error?error.message:'Fotot kunde inte sparas.')}finally{setBusy(false);setPhotoTarget(null)}
  };

  const current=annotations.filter(item=>item.pageNumber===pageNumber);
  const selectedAnnotation=annotations.find(item=>item.id===selected);
  const measurementPage=drawingState[`${file.id}:p${pageNumber}`];
  const currentMeasurements=(measurementPage?.measurements||[]).filter(item=>item.visible!==false);
  const currentAngles=(measurementPage?.angles||[]).filter(item=>item.visible!==false);
  const measuredMm=(measurement:DrawingMeasurement)=>{
    const calibration=measurementPage?.calibration;
    if(calibration){
      const rect=surfaceRef.current?.getBoundingClientRect();if(!rect)return 0;
      const distance=(a:DrawingPoint,b:DrawingPoint)=>Math.hypot((b.x-a.x)*rect.width,(b.y-a.y)*rect.height);
      const reference=distance(calibration.a,calibration.b);return reference?distance(measurement.a,measurement.b)*calibration.distanceMm/reference:0;
    }
    if(measurementPage?.scale&&pdfPageMm){
      const dx=(measurement.b.x-measurement.a.x)*pdfPageMm.w,dy=(measurement.b.y-measurement.a.y)*pdfPageMm.h;
      return Math.hypot(dx,dy)*measurementPage.scale;
    }
    return 0;
  };
  const media=file.contentType.startsWith('image/')?<img ref={imageRef} className="drawingAnnotatedImage" src={objectUrl} alt={title}/>:<canvas ref={canvasRef}/>;

  return <div className="drawingAnnotationViewer">
    {(file.contentType==='application/pdf'&&pageCount>1||currentMeasurements.length>0||currentAngles.length>0)&&<div className="drawingPageNav">
      {file.contentType==='application/pdf'&&pageCount>1?<><button disabled={pageNumber<=1} onClick={()=>setPageNumber(value=>Math.max(1,value-1))}>‹</button><span>Sida {pageNumber} av {pageCount}</span><button disabled={pageNumber>=pageCount} onClick={()=>setPageNumber(value=>Math.min(pageCount,value+1))}>›</button></>:<span/>}
      {(currentMeasurements.length>0||currentAngles.length>0)&&<button onClick={()=>setShowMeasurements(value=>!value)}>{showMeasurements?'◉ Dölj mått':'○ Visa mått'}</button>}
    </div>}
    <div className="drawingAnnotationScroller">
      <div ref={surfaceRef} className="drawingAnnotationSurface" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={onPointerEnd} onContextMenu={event=>event.preventDefault()}>
        {media}
        {showMeasurements&&currentMeasurements.length>0&&<ReadOnlyDimensionOverlay targetRef={file.contentType.startsWith('image/')?imageRef:canvasRef} measurements={currentMeasurements} measuredMm={measuredMm}/>}
        {showMeasurements&&currentAngles.length>0&&<ReadOnlyAngleOverlay targetRef={file.contentType.startsWith('image/')?imageRef:canvasRef} angles={currentAngles}/>}
        <div className="drawingMarkerLayer">{current.map(item=><button key={item.id} className="drawingMarker" style={{left:`${item.x*100}%`,top:`${item.y*100}%`}} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();setPending(null);setSelected(item.id);setAddingNote(false);setNoteText('')}} title={`${item.photos.length} foto · ${item.notes.length} notis`}>{item.photos.length>0?'📷':'●'}<small>{item.photos.length+item.notes.length>1?item.photos.length+item.notes.length:''}</small></button>)}</div>
        {pending&&pending.pageNumber===pageNumber&&<div className="drawingAddMenu" style={{left:`${pending.x*100}%`,top:`${pending.y*100}%`}} onPointerDown={event=>event.stopPropagation()}><button onClick={()=>choosePhoto({point:pending})}>📷 Foto</button><button onClick={()=>{setAddingNote(true);setNoteText('')}}>📝 Notis</button><button className="close" onClick={()=>setPending(null)}>×</button></div>}
      </div>
    </div>
    <input ref={fileInput} hidden type="file" accept="image/*" capture="environment" onChange={event=>{const selectedFile=event.target.files?.[0];event.target.value='';if(selectedFile)void uploadPhoto(selectedFile);else setPhotoTarget(null)}}/>
    {addingNote&&pending&&<div className="drawingComposer"><b>Notis på ritningen</b><textarea autoFocus value={noteText} onChange={event=>setNoteText(event.target.value)} placeholder="Skriv vad som finns eller har gjorts här…"/><div><button onClick={()=>{setAddingNote(false);setPending(null)}}>Avbryt</button><button disabled={busy||!noteText.trim()} onClick={()=>void saveNote()}>Spara</button></div></div>}
    {selectedAnnotation&&<div className="drawingAnnotationPanel"><div className="drawingAnnotationPanelHead"><div><b>Dokumentation på denna plats</b><small>{selectedAnnotation.photos.length} foto · {selectedAnnotation.notes.length} notis{selectedAnnotation.notes.length===1?'':'er'}</small></div><button onClick={()=>setSelected(null)}>×</button></div>
      {selectedAnnotation.photos.length>0&&<div className="drawingPhotoGrid">{selectedAnnotation.photos.map(photo=><a key={photo.id} href={annotationApi(`/project-document-annotation-photos/${encodeURIComponent(photo.id)}`)} target="_blank" rel="noreferrer"><img src={annotationApi(`/project-document-annotation-photos/${encodeURIComponent(photo.id)}`)} alt={photo.originalName}/></a>)}</div>}
      {selectedAnnotation.notes.map(note=><p className="drawingSavedNote" key={note.id}>{note.note}</p>)}
      {addingNote&&<div className="drawingPanelNote"><textarea autoFocus value={noteText} onChange={event=>setNoteText(event.target.value)} placeholder="Ny notis…"/><button disabled={busy||!noteText.trim()} onClick={()=>void saveNote()}>Spara notis</button></div>}
      <div className="drawingAnnotationPanelActions"><button disabled={busy} onClick={()=>choosePhoto({annotationId:selectedAnnotation.id})}>📷 Lägg till foto</button><button disabled={busy} onClick={()=>{setAddingNote(true);setNoteText('')}}>📝 Lägg till notis</button></div>
    </div>}
    {loadError&&<div className="drawingAnnotationError">{loadError}</div>}
    {!loadError&&!pending&&!selectedAnnotation&&<div className="drawingAnnotationHint">Håll fingret på ritningen för att lägga till foto eller notis.</div>}
  </div>;
}
