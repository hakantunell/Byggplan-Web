import {useEffect,useMemo,useState} from 'react';
import './activity-evidence.css';

type FileItem={id:string;originalName:string;contentType:string;sizeBytes?:number;url:string};
type Entry={id:string;valueText?:string|null;valueNumber?:number|null;valueBoolean?:boolean|null;originalName?:string|null;contentType?:string|null;url?:string|null};
type Field={id:string;type:string;label:string;unit?:string;required:boolean;entries:Entry[]};
type Evidence={activityId:string;activityTitle:string;activityType:string;note:string;ownFiles:FileItem[];requiredFields:Field[]};

const cache=new Map<string,Promise<Evidence[]>>();
function loadProject(projectId:string){
 let current=cache.get(projectId);
 if(!current){current=fetch(`/api/projects/${encodeURIComponent(projectId)}/activity-documentation-summary`,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Kunde inte läsa bifogat underlag.');const d=await r.json() as {items?:Evidence[]};return d.items||[]});cache.set(projectId,current)}
 return current;
}

export function ReportEvidence({projectId,activityIds}:{projectId:string;activityIds:string[]}){
 const[items,setItems]=useState<Evidence[]>([]);
 useEffect(()=>{let alive=true;void loadProject(projectId).then(rows=>{if(alive)setItems(rows)}).catch(()=>{});return()=>{alive=false}},[projectId]);
 const selected=useMemo(()=>{const ids=new Set(activityIds);return items.filter(item=>ids.has(item.activityId)&&hasEvidence(item))},[items,activityIds.join('|')]);
 if(!selected.length)return null;
 return <div className="reportEvidence"><strong>📎 Bifogat underlag</strong>{selected.map(item=><div className="reportEvidenceActivity" key={item.activityId}><small>{item.activityTitle}</small>{item.note.trim()&&<p className="reportEvidenceNote">{item.note}</p>}<div className="reportEvidenceItems">{item.requiredFields.flatMap(field=>field.entries.map(entry=><EvidenceEntry key={entry.id} field={field} entry={entry}/>))}{item.ownFiles.map(file=><EvidenceFile key={file.id} file={file}/>)}</div></div>)}</div>
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

export function invalidateReportEvidence(projectId:string){cache.delete(projectId)}
