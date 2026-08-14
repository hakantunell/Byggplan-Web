import {useEffect,useState} from 'react';
import './activity-evidence.css';

type OwnFile={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};

export function ActivityOwnDocumentationReadout({activityId}:{activityId:string}){
 const[note,setNote]=useState('');
 const[files,setFiles]=useState<OwnFile[]>([]);
 const[loading,setLoading]=useState(true);
 const[message,setMessage]=useState('');
 async function load(){setLoading(true);setMessage('');try{const r=await fetch(`/api/activities/${encodeURIComponent(activityId)}/own-documentation`,{cache:'no-store'});if(!r.ok)throw new Error('Kunde inte läsa dokumentation från fältappen.');const d=await r.json() as {note?:string;files?:OwnFile[]};setNote(d.note||'');setFiles(d.files||[])}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa dokumentationen.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[activityId]);
 const has=Boolean(note.trim()||files.length);
 return <section className="activityEvidence"><small>EGEN DOKUMENTATION FRÅN FÄLT</small><h3>Registrerat underlag</h3>{loading?<p>Laddar…</p>:message?<p>{message}</p>:!has?<p>Ingen egen anteckning, bild eller fil har registrerats på aktiviteten.</p>:<>{note.trim()&&<div className="activityEvidenceNote"><b>Registrering / anteckning</b><p>{note}</p></div>}{files.length>0&&<div className="activityEvidenceFiles">{files.map(file=><EvidenceFile key={file.id} file={file}/>)}</div>}</>}</section>
}

function EvidenceFile({file}:{file:OwnFile}){
 const[busy,setBusy]=useState(false);
 async function open(){setBusy(true);try{const r=await fetch(file.url);if(!r.ok)throw new Error();const blob=await r.blob();const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{setBusy(false)}}
 return <button type="button" className="activityEvidenceFile" disabled={busy} onClick={()=>void open()}><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{file.contentType.startsWith('image/')?'Foto':'Fil'} · {formatBytes(file.sizeBytes)}</small></span><em>{busy?'Öppnar…':'Öppna ↗'}</em></button>
}

function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} kB`;return `${(value/(1024*1024)).toFixed(1)} MB`}
