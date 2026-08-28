import {useEffect,useMemo,useState} from 'react';
import './activity-evidence.css';

type FileItem={id:string;originalName:string;contentType:string;sizeBytes?:number;url:string};
type Entry={id:string;valueText?:string|null;valueNumber?:number|null;valueBoolean?:boolean|null;originalName?:string|null;contentType?:string|null;url?:string|null};
type Field={id:string;type:string;label:string;unit?:string;required:boolean;entries:Entry[]};
type Evidence={activityId:string;activityTitle:string;activityType:string;note:string;ownFiles:FileItem[];requiredFields:Field[]};
type ActivityComment={activityId:string;activityTitle:string;comment:string};

const evidenceCache=new Map<string,Promise<Evidence[]>>();
const commentCache=new Map<string,Promise<ActivityComment[]>>();
function loadEvidence(projectId:string){
 let current=evidenceCache.get(projectId);
 if(!current){
  current=fetch(`/api/projects/${encodeURIComponent(projectId)}/activity-documentation-summary`,{cache:'no-store'}).then(async r=>{if(!r.ok){const d=await r.json().catch(()=>({})) as {error?:string};throw new Error(d.error||`Kunde inte läsa bifogat underlag (${r.status}).`)}const d=await r.json() as {items?:Evidence[]};return d.items||[]}).catch(error=>{evidenceCache.delete(projectId);throw error});
  evidenceCache.set(projectId,current);
 }
 return current;
}
function loadComments(projectId:string){
 let current=commentCache.get(projectId);
 if(!current){
  current=fetch(`/api/projects/${encodeURIComponent(projectId)}/activity-comments`,{cache:'no-store'}).then(async r=>{if(!r.ok){const d=await r.json().catch(()=>({})) as {error?:string};throw new Error(d.error||`Kunde inte läsa aktivitetskommentarer (${r.status}).`)}const d=await r.json() as {items?:ActivityComment[]};return d.items||[]}).catch(error=>{commentCache.delete(projectId);throw error});
  commentCache.set(projectId,current);
 }
 return current;
}

export function ReportEvidence({projectId,activityIds}:{projectId:string;activityIds:string[]}){
 const[items,setItems]=useState<Evidence[]>([]),[comments,setComments]=useState<ActivityComment[]>([]),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setError('');void Promise.all([loadEvidence(projectId),loadComments(projectId)]).then(([rows,commentRows])=>{if(alive){setItems(rows);setComments(commentRows)}}).catch(err=>{if(alive)setError(err instanceof Error?err.message:'Kunde inte läsa rapportunderlaget.')});return()=>{alive=false}},[projectId]);
 const ids=useMemo(()=>new Set(activityIds),[activityIds.join('|')]);
 const selected=useMemo(()=>items.filter(item=>ids.has(item.activityId)&&hasEvidence(item)),[items,ids]);
 const selectedComments=useMemo(()=>comments.filter(item=>ids.has(item.activityId)&&item.comment.trim()),[comments,ids]);
 if(error)return <div className="reportEvidenceError">⚠ {error}</div>;
 if(!selected.length&&!selectedComments.length)return null;
 return <div className="reportEvidence">
   {selectedComments.length>0&&<div className="reportActivityComments"><strong>💬 Kommentarer / ställningstaganden</strong>{selectedComments.map(item=><div className="reportEvidenceActivity" key={`comment:${item.activityId}`}><small>{item.activityTitle||'Aktivitet'}</small><p className="reportEvidenceNote"><b>Kommentar:</b> {item.comment}</p></div>)}</div>}
   {selected.length>0&&<div className="reportAttachedEvidence"><strong>📎 Bifogat underlag</strong>{selected.map(item=><div className="reportEvidenceActivity" key={item.activityId}><small>{item.activityTitle}</small>{item.note.trim()&&<p className="reportEvidenceNote"><b>Egen bygganteckning:</b> {item.note}</p>}<div className="reportEvidenceItems">{item.requiredFields.flatMap(field=>field.entries.map(entry=><EvidenceEntry key={entry.id} field={field} entry={entry}/>))}{item.ownFiles.map(file=><EvidenceFile key={file.id} file={file}/>)}</div></div>)}</div>}
 </div>
}

function hasEvidence(item:Evidence){return Boolean(item.note.trim()||item.ownFiles.length||item.requiredFields.some(field=>field.entries.length))}

function EvidenceEntry({field,entry}:{field:Field;entry:Entry}){
 if(entry.url&&entry.originalName)return <EvidenceFile file={{id:entry.id,originalName:entry.originalName,contentType:entry.contentType||'',url:entry.url}} prefix={field.label}/>;
 const value=entry.valueText??(entry.valueNumber!=null?`${entry.valueNumber}${field.unit?` ${field.unit}`:''}`:entry.valueBoolean==null?'':entry.valueBoolean?'Ja':'Nej');
 if(value==='')return null;
 return <span className="reportEvidenceValue"><b>{field.label}:</b>{String(value)}</span>
}

function EvidenceFile({file,prefix}:{file:FileItem;prefix?:string}){
 const[busy,setBusy]=useState(false);
 async function open(){setBusy(true);try{const r=await fetch(file.url);if(!r.ok)throw new Error();const blob=await r.blob();const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{setBusy(false)}}
 return <button type="button" className="reportEvidenceChip" disabled={busy} onClick={()=>void open()}><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{prefix?`${prefix}: `:''}{file.originalName}</b></span><em>{busy?'Öppnar…':'Öppna'}</em></button>
}

export function invalidateReportEvidence(projectId:string){evidenceCache.delete(projectId);commentCache.delete(projectId)}
