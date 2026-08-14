import {useEffect,useRef,useState} from 'react';
import {ActivityCamera} from './ActivityCamera';
import './activity-own-documentation.css';

type ActivityType='perform'|'document'|'measurement'|'check'|'approval'|'note'|'choice';
type OwnFile={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');

export function ActivityOwnDocumentation({activityId,activityType,readOnly}:{activityId:string;activityType:ActivityType;readOnly:boolean}){
  const[open,setOpen]=useState(activityType==='measurement');
  const[loaded,setLoaded]=useState(false);
  const[note,setNote]=useState('');
  const[files,setFiles]=useState<OwnFile[]>([]);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[addOpen,setAddOpen]=useState(false);
  const[cameraOpen,setCameraOpen]=useState(false);
  const photosInput=useRef<HTMLInputElement>(null);
  const filesInput=useRef<HTMLInputElement>(null);

  async function load(){
    try{
      const response=await fetch(`${API_BASE}/api/activities/${encodeURIComponent(activityId)}/own-documentation`,{cache:'no-store'});
      if(!response.ok)throw new Error('Kunde inte läsa egen dokumentation.');
      const data=await response.json() as {note?:string;files?:OwnFile[]};
      setNote(data.note||'');setFiles(data.files||[]);setLoaded(true);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte läsa egen dokumentation.');}
  }

  useEffect(()=>{setOpen(activityType==='measurement');setLoaded(false);setNote('');setFiles([]);setMessage('');setAddOpen(false);setCameraOpen(false)},[activityId,activityType]);
  useEffect(()=>{if(open&&!loaded)void load()},[open,loaded,activityId]);

  async function saveNote(value:string){
    setNote(value);setMessage('');
    try{
      const response=await fetch(`${API_BASE}/api/activities/${encodeURIComponent(activityId)}/own-documentation`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:value})});
      if(!response.ok){const data=await response.json().catch(()=>({})) as {error?:string};throw new Error(data.error||'Kunde inte spara anteckningen.');}
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte spara anteckningen.');}
  }

  async function uploadOne(file:File){
    try{
      const form=new FormData();form.append('file',file,file.name);
      const response=await fetch(`${API_BASE}/api/activities/${encodeURIComponent(activityId)}/own-documentation/files`,{method:'POST',body:form});
      return response.ok;
    }catch{return false}
  }

  async function upload(selected:File[]){
    if(!selected.length)return;setBusy(true);setAddOpen(false);setMessage(`Laddar upp ${selected.length} fil${selected.length===1?'':'er'}…`);
    let failed=0;
    for(const file of selected)if(!await uploadOne(file))failed++;
    await load();setBusy(false);
    setMessage(failed?`${selected.length-failed} uppladdade, ${failed} misslyckades.`:'');
  }

  async function capture(file:File){return uploadOne(file)}

  async function closeCamera(){setCameraOpen(false);await load()}

  async function remove(file:OwnFile){
    if(!confirm(`Ta bort ”${file.originalName}”?`))return;
    const response=await fetch(`${API_BASE}/api/activity-own-documentation-files/${encodeURIComponent(file.id)}`,{method:'DELETE'});
    if(response.ok)setFiles(current=>current.filter(item=>item.id!==file.id));
  }

  async function openFile(file:OwnFile){
    try{
      const response=await fetch(`${API_BASE}${file.url}`);
      if(!response.ok)throw new Error();
      const blob=await response.blob();const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch{setMessage('Kunde inte öppna filen.')}
  }

  const label=activityType==='measurement'?'Registrering och egen dokumentation':'Egen dokumentation';
  const noteLabel=activityType==='measurement'?'Mätvärde / registrering':'Egen anteckning';
  const count=files.length+(note.trim()?1:0);
  return <section className={`ownDocumentation ${open?'open':''}`}>
    <button type="button" className="ownDocumentationHeader" onClick={()=>setOpen(value=>!value)}><span>📝</span><span><b>{label}</b><small>{count?`${count} sparade poster`:'Frivilligt · för eget bruk'}</small></span><em>{open?'−':'+'}</em></button>
    {open&&<div className="ownDocumentationBody">{!loaded?<p>Laddar…</p>:<>
      <label className="ownNote"><span><b>{noteLabel}</b><small>{activityType==='measurement'?'Skriv in mätvärde, referens eller annan relevant information.':'Spara sådant du själv vill komma ihåg om aktiviteten.'}</small></span><textarea disabled={readOnly} value={note} placeholder={activityType==='measurement'?'Ex. koordinat, höjd, mått eller kommentar…':'Anteckning…'} onChange={event=>setNote(event.target.value)} onBlur={event=>{if(!readOnly)void saveNote(event.target.value)}}/></label>
      <div className="ownPhotos"><div className="ownFilesHeading"><div><b>Foton och filer</b><small>Allt sparas direkt på den här aktiviteten.</small></div>{!readOnly&&<div className="ownAddWrap"><button type="button" className="ownAddButton" disabled={busy} onClick={()=>setAddOpen(value=>!value)} aria-expanded={addOpen}>+</button>{addOpen&&<div className="ownAddMenu"><button type="button" onClick={()=>{setAddOpen(false);setCameraOpen(true)}}><span>📷</span><span><b>Kamera</b><small>Ta flera bilder i följd</small></span></button><button type="button" onClick={()=>photosInput.current?.click()}><span>🖼</span><span><b>Foton</b><small>Välj en eller flera bilder</small></span></button><button type="button" onClick={()=>filesInput.current?.click()}><span>📎</span><span><b>Filer</b><small>Välj bild eller PDF</small></span></button></div>}</div>}</div>
      {!readOnly&&<><input ref={photosInput} className="ownHiddenInput" type="file" accept="image/*" multiple disabled={busy} onChange={event=>{const selected=Array.from(event.target.files||[]);event.target.value='';if(selected.length)void upload(selected)}}/><input ref={filesInput} className="ownHiddenInput" type="file" accept="image/*,application/pdf" multiple disabled={busy} onChange={event=>{const selected=Array.from(event.target.files||[]);event.target.value='';if(selected.length)void upload(selected)}}/></>}
      {busy&&<small className="ownUploadState">Laddar upp…</small>}
      {files.length>0&&<div className="ownPhotoList">{files.map(file=><div key={file.id}><button type="button" className="ownPhotoOpen" onClick={()=>void openFile(file)}><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{file.contentType.startsWith('image/')?'Bild':'PDF'} · {formatBytes(file.sizeBytes)}</small></span></button>{!readOnly&&<button type="button" className="ownPhotoDelete" onClick={()=>void remove(file)} aria-label="Ta bort">×</button>}</div>)}</div>}</div>
      {message&&<small className="ownDocumentationMessage">{message}</small>}
    </>}</div>}
    {cameraOpen&&<ActivityCamera onCapture={capture} onClose={()=>void closeCamera()}/>} 
  </section>;
}

function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} kB`;return `${(value/(1024*1024)).toFixed(1)} MB`}
