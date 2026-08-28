import {useEffect,useState} from 'react';
import './activity-evidence.css';

type OwnFile={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};

export function ActivityOwnDocumentationReadout({activityId}:{activityId:string}){
 const[comment,setComment]=useState('');
 const[note,setNote]=useState('');
 const[files,setFiles]=useState<OwnFile[]>([]);
 const[loading,setLoading]=useState(true);
 const[message,setMessage]=useState('');
 const[saving,setSaving]=useState(false);
 async function load(){setLoading(true);setMessage('');try{const[cr,dr]=await Promise.all([fetch(`/api/activities/${encodeURIComponent(activityId)}/comment`,{cache:'no-store'}),fetch(`/api/activities/${encodeURIComponent(activityId)}/own-documentation`,{cache:'no-store'})]);if(!cr.ok)throw new Error('Kunde inte läsa aktivitetens kommentar.');if(!dr.ok)throw new Error('Kunde inte läsa aktivitetens byggdokumentation.');const c=await cr.json() as {comment?:string};const d=await dr.json() as {note?:string;files?:OwnFile[]};setComment(c.comment||'');setNote(d.note||'');setFiles(d.files||[])}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa aktivitetsinformationen.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[activityId]);
 async function saveComment(){setSaving(true);setMessage('');try{const r=await fetch(`/api/activities/${encodeURIComponent(activityId)}/comment`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({comment})});if(!r.ok){const d=await r.json().catch(()=>({})) as {error?:string};throw new Error(d.error||'Kunde inte spara kommentaren.')}setMessage('Kommentaren är sparad.');window.setTimeout(()=>setMessage(''),1800)}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte spara kommentaren.')}finally{setSaving(false)}}
 return <section className="activityEvidence"><small>PROJEKTUPPFÖLJNING</small><h3>Kommentar / ställningstagande</h3>{loading?<p>Laddar…</p>:<><label className="activityCommentEditor"><span>Skriv hur aktiviteten har hanterats eller vilket projektspecifikt ställningstagande som gjorts. Kommentaren visas i rapporter för styrdokument som aktiviteten är kopplad till.</span><textarea rows={4} value={comment} placeholder="Ex. Inga bodar inom den egna fastigheten behövs. Endast upplag." onChange={e=>setComment(e.target.value)} onBlur={()=>void saveComment()}/><small>{saving?'Sparar…':message||'Sparas när du lämnar fältet.'}</small></label>{(note.trim()||files.length>0)&&<div className="activityBuildDocumentation"><h3>Egen byggdokumentation</h3>{note.trim()&&<div className="activityEvidenceNote"><b>Egen anteckning</b><p>{note}</p></div>}{files.length>0&&<><h3 className="activityEvidenceFilesTitle">Foton och filer</h3><div className="activityEvidenceFiles">{files.map(file=><EvidenceFile key={file.id} file={file}/>)}</div></>}</div>}</>}</section>
}

function EvidenceFile({file}:{file:OwnFile}){
 const[busy,setBusy]=useState(false);
 async function open(){setBusy(true);try{const r=await fetch(file.url);if(!r.ok)throw new Error();const blob=await r.blob();const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{setBusy(false)}}
 return <button type="button" className="activityEvidenceFile" disabled={busy} onClick={()=>void open()}><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{file.contentType.startsWith('image/')?'Foto':'Fil'} · {formatBytes(file.sizeBytes)}</small></span><em>{busy?'Öppnar…':'Öppna ↗'}</em></button>
}

function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} kB`;return `${(value/(1024*1024)).toFixed(1)} MB`}
