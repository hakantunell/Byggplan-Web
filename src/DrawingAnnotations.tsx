import {useCallback,useEffect,useRef,useState} from 'react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();

type Attachment={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
type AnnotationNote={id:string;note:string;createdAt:string};
type AnnotationPhoto={id:string;originalName:string;contentType:string;sizeBytes:number;createdAt:string;url:string};
type Annotation={id:string;documentId:string;pageNumber:number;x:number;y:number;createdAt:string;notes:AnnotationNote[];photos:AnnotationPhoto[]};
type Point={x:number;y:number;pageNumber:number};

export function DrawingAnnotations({documentId,title,file,objectUrl,apiBase}:{documentId:string;title:string;file:Attachment;objectUrl:string;apiBase:string}){
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
  const fileInput=useRef<HTMLInputElement>(null);
  const surfaceRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const longPress=useRef<number|null>(null);
  const pointerStart=useRef<{x:number;y:number}|null>(null);

  const loadAnnotations=useCallback(async()=>{
    try{
      const r=await fetch(`${apiBase}/api/project-document-annotations?documentId=${encodeURIComponent(documentId)}`,{cache:'no-store'});
      const d=await r.json().catch(()=>({})) as {annotations?:Annotation[];error?:string};
      if(!r.ok)throw new Error(d.error||'Kunde inte läsa markeringar.');
      setAnnotations(d.annotations||[]);
    }catch(error){setLoadError(error instanceof Error?error.message:'Kunde inte läsa markeringar.');}
  },[apiBase,documentId]);

  useEffect(()=>{setAnnotations([]);setSelected(null);setPending(null);setPageNumber(1);void loadAnnotations()},[documentId,loadAnnotations]);

  useEffect(()=>{
    if(!objectUrl||file.contentType!=='application/pdf')return;
    let cancelled=false;let task:any;
    void(async()=>{
      try{
        setLoadError('');
        task=pdfjs.getDocument(objectUrl);const pdf=await task.promise;if(cancelled)return;setPageCount(pdf.numPages);if(pageNumber>pdf.numPages)setPageNumber(1);
        const page=await pdf.getPage(Math.min(pageNumber,pdf.numPages));if(cancelled)return;
        const base=page.getViewport({scale:1});const available=Math.max(360,(surfaceRef.current?.parentElement?.clientWidth||base.width)-6);const scale=Math.min(2,available/base.width);const viewport=page.getViewport({scale});
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
    const r=await fetch(`${apiBase}/api/project-document-annotations`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documentId,pageNumber:point.pageNumber,x:point.x,y:point.y})});
    const d=await r.json().catch(()=>({})) as {id?:string;error?:string};if(!r.ok||!d.id)throw new Error(d.error||'Markeringen kunde inte skapas.');return d.id;
  };
  const saveNote=async()=>{
    const note=noteText.trim();if(!note)return;setBusy(true);
    try{
      let annotationId=selected||undefined;if(!annotationId){if(!pending)return;annotationId=await createAnnotation(pending)}
      const r=await fetch(`${apiBase}/api/project-document-annotations/${encodeURIComponent(annotationId)}/notes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error||'Notisen kunde inte sparas.');
      setNoteText('');setAddingNote(false);setPending(null);setSelected(annotationId);await loadAnnotations();
    }catch(error){alert(error instanceof Error?error.message:'Notisen kunde inte sparas.')}finally{setBusy(false)}
  };
  const choosePhoto=(target:{annotationId?:string;point?:Point})=>{setPhotoTarget(target);fileInput.current?.click()};
  const uploadPhoto=async(fileToUpload:File)=>{
    if(!photoTarget)return;setBusy(true);
    try{
      let annotationId=photoTarget.annotationId;if(!annotationId){if(!photoTarget.point)return;annotationId=await createAnnotation(photoTarget.point)}
      const form=new FormData();form.append('file',fileToUpload,fileToUpload.name);const r=await fetch(`${apiBase}/api/project-document-annotations/${encodeURIComponent(annotationId)}/photos`,{method:'POST',body:form});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error||'Fotot kunde inte sparas.');
      setPending(null);setSelected(annotationId);await loadAnnotations();
    }catch(error){alert(error instanceof Error?error.message:'Fotot kunde inte sparas.')}finally{setBusy(false);setPhotoTarget(null)}
  };

  const current=annotations.filter(item=>item.pageNumber===pageNumber);
  const selectedAnnotation=annotations.find(item=>item.id===selected);
  const media=file.contentType.startsWith('image/')?<img className="drawingAnnotatedImage" src={objectUrl} alt={title}/>:<canvas ref={canvasRef}/>;

  return <div className="drawingAnnotationViewer">
    {file.contentType==='application/pdf'&&pageCount>1&&<div className="drawingPageNav"><button disabled={pageNumber<=1} onClick={()=>setPageNumber(value=>Math.max(1,value-1))}>‹</button><span>Sida {pageNumber} av {pageCount}</span><button disabled={pageNumber>=pageCount} onClick={()=>setPageNumber(value=>Math.min(pageCount,value+1))}>›</button></div>}
    <div className="drawingAnnotationScroller">
      <div ref={surfaceRef} className="drawingAnnotationSurface" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={onPointerEnd} onContextMenu={event=>event.preventDefault()}>
        {media}
        <div className="drawingMarkerLayer">{current.map(item=><button key={item.id} className="drawingMarker" style={{left:`${item.x*100}%`,top:`${item.y*100}%`}} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();setPending(null);setSelected(item.id);setAddingNote(false);setNoteText('')}} title={`${item.photos.length} foto · ${item.notes.length} notis`}>{item.photos.length>0?'📷':'●'}<small>{item.photos.length+item.notes.length>1?item.photos.length+item.notes.length:''}</small></button>)}</div>
        {pending&&pending.pageNumber===pageNumber&&<div className="drawingAddMenu" style={{left:`${pending.x*100}%`,top:`${pending.y*100}%`}} onPointerDown={event=>event.stopPropagation()}><button onClick={()=>choosePhoto({point:pending})}>📷 Foto</button><button onClick={()=>{setAddingNote(true);setNoteText('')}}>📝 Notis</button><button className="close" onClick={()=>setPending(null)}>×</button></div>}
      </div>
    </div>
    <input ref={fileInput} hidden type="file" accept="image/*" capture="environment" onChange={event=>{const selectedFile=event.target.files?.[0];event.target.value='';if(selectedFile)void uploadPhoto(selectedFile);else setPhotoTarget(null)}}/>
    {addingNote&&pending&&<div className="drawingComposer"><b>Notis på ritningen</b><textarea autoFocus value={noteText} onChange={event=>setNoteText(event.target.value)} placeholder="Skriv vad som finns eller har gjorts här…"/><div><button onClick={()=>{setAddingNote(false);setPending(null)}}>Avbryt</button><button disabled={busy||!noteText.trim()} onClick={()=>void saveNote()}>Spara</button></div></div>}
    {selectedAnnotation&&<div className="drawingAnnotationPanel"><div className="drawingAnnotationPanelHead"><div><b>Dokumentation på denna plats</b><small>{selectedAnnotation.photos.length} foto · {selectedAnnotation.notes.length} notis{selectedAnnotation.notes.length===1?'':'er'}</small></div><button onClick={()=>setSelected(null)}>×</button></div>
      {selectedAnnotation.photos.length>0&&<div className="drawingPhotoGrid">{selectedAnnotation.photos.map(photo=><a key={photo.id} href={`${apiBase}${photo.url}`} target="_blank" rel="noreferrer"><img src={`${apiBase}${photo.url}`} alt={photo.originalName}/></a>)}</div>}
      {selectedAnnotation.notes.map(note=><p className="drawingSavedNote" key={note.id}>{note.note}</p>)}
      {addingNote&&<div className="drawingPanelNote"><textarea autoFocus value={noteText} onChange={event=>setNoteText(event.target.value)} placeholder="Ny notis…"/><button disabled={busy||!noteText.trim()} onClick={()=>void saveNote()}>Spara notis</button></div>}
      <div className="drawingAnnotationPanelActions"><button disabled={busy} onClick={()=>choosePhoto({annotationId:selectedAnnotation.id})}>📷 Lägg till foto</button><button disabled={busy} onClick={()=>{setAddingNote(true);setNoteText('')}}>📝 Lägg till notis</button></div>
    </div>}
    {loadError&&<div className="drawingAnnotationError">{loadError}</div>}
    {!loadError&&!pending&&!selectedAnnotation&&<div className="drawingAnnotationHint">Håll fingret på ritningen för att lägga till foto eller notis.</div>}
  </div>;
}
