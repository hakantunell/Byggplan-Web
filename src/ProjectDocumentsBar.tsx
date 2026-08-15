import { useCallback,useEffect,useMemo,useState } from 'react';
import {DrawingAnnotations} from './DrawingAnnotations';

type Attachment={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
type ProjectDocument={id:string;title:string;description:string;attachments:Attachment[]};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');

export function ProjectDocumentsBar({projectId:projectIdProp}:{projectId?:string}){
  const[activeProjectId,setActiveProjectId]=useState(projectIdProp||'');
  const[documents,setDocuments]=useState<ProjectDocument[]>([]);const[open,setOpen]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
  const[viewer,setViewer]=useState<{document:ProjectDocument;file:Attachment}|null>(null);const[objectUrl,setObjectUrl]=useState('');const[viewerError,setViewerError]=useState('');
  const projectId=projectIdProp||activeProjectId;

  useEffect(()=>{
    if(projectIdProp){setActiveProjectId(projectIdProp);return;}
    const onProject=(event:Event)=>{const id=(event as CustomEvent<{projectId?:string}>).detail?.projectId||'';if(id)setActiveProjectId(id)};
    window.addEventListener('byggplan:active-project',onProject);
    return()=>window.removeEventListener('byggplan:active-project',onProject);
  },[projectIdProp]);

  const loadDocuments=useCallback(async()=>{
    if(!projectId)return;
    setLoading(true);setError('');
    try{
      const r=await fetch(`${API_BASE}/api/project-documents?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
      const raw=await r.text();
      let d:{documents?:ProjectDocument[];error?:string}={};
      try{d=raw?JSON.parse(raw):{}}catch{}
      if(!r.ok)throw new Error(d.error||raw||`API ${r.status}`);
      setDocuments(d.documents||[]);
    }catch(error){console.error('Kunde inte läsa projektdokument',error);setDocuments([]);setError(error instanceof Error?error.message:'Kunde inte läsa projektdokument.')}finally{setLoading(false)}
  },[projectId]);

  useEffect(()=>{if(!projectId)return;setDocuments([]);setOpen(false);setViewer(null);void loadDocuments()},[projectId,loadDocuments]);
  useEffect(()=>{const onVisible=()=>{if(document.visibilityState==='visible')void loadDocuments()};document.addEventListener('visibilitychange',onVisible);return()=>document.removeEventListener('visibilitychange',onVisible)},[loadDocuments]);
  useEffect(()=>{
    let cancelled=false;
    setViewerError('');setObjectUrl(current=>{if(current)URL.revokeObjectURL(current);return''});
    if(!viewer)return;
    void(async()=>{
      try{
        const fileUrl=/^https?:\/\//i.test(viewer.file.url)?viewer.file.url:`${API_BASE}${viewer.file.url.startsWith('/')?'':'/'}${viewer.file.url}`;
        const response=await fetch(fileUrl,{cache:'no-store'});if(!response.ok)throw new Error(`Kunde inte öppna ritningen (HTTP ${response.status}).`);
        const blob=await response.blob();if(cancelled)return;setObjectUrl(URL.createObjectURL(blob));
      }catch(error){if(!cancelled)setViewerError(error instanceof Error?error.message:'Kunde inte öppna ritningen.');}
    })();
    return()=>{cancelled=true};
  },[viewer?.document.id,viewer?.file.id]);

  const fileCount=useMemo(()=>documents.reduce((sum,d)=>sum+(d.attachments?.length||0),0),[documents]);
  if(!projectId)return null;
  const toggleOpen=()=>{setOpen(value=>{const next=!value;if(next)void loadDocuments();return next})};
  return <>
    <aside className={`projectDocumentsBar ${open?'open':''}`}><button className="projectDocumentsBarButton" onClick={toggleOpen}><span>📚</span><span><b>Projektdokument</b><small>{loading?'Laddar…':error?'Kunde inte läsa dokument':`${documents.length} dokument${fileCount?` · ${fileCount} filer`:''}`}</small></span><em>{open?'−':'+'}</em></button>{open&&<div className="projectDocumentsBarBody">{error&&<p>{error}</p>}{!loading&&!error&&!documents.length&&<p>Inga projektdokument har lagts in.</p>}{documents.map(doc=><article key={doc.id}><b>{doc.title}</b>{doc.description&&<p>{doc.description}</p>}{doc.attachments?.map(file=>isDrawing(doc,file)?<button key={file.id} className="projectDocumentFileButton" onClick={()=>{setOpen(false);setViewer({document:doc,file})}}><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>Ritning · {formatBytes(file.sizeBytes)}</small></span><em>Öppna</em></button>:<a key={file.id} href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer"><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{file.contentType.startsWith('image/')?'Bild':'PDF'} · {formatBytes(file.sizeBytes)}</small></span><em>Öppna ↗</em></a>)}</article>)}</div>}</aside>
    {viewer&&<div className="mobileDrawingViewer"><header><button onClick={()=>setViewer(null)}>‹ Tillbaka</button><div><small>RITNING</small><strong>{viewer.document.title}</strong></div></header><main>{viewerError&&<div className="mobileDrawingMessage">{viewerError}</div>}{!viewerError&&!objectUrl&&<div className="mobileDrawingMessage">Öppnar ritning…</div>}{!viewerError&&objectUrl&&<DrawingAnnotations documentId={viewer.document.id} title={viewer.document.title} file={viewer.file} objectUrl={objectUrl} apiBase={API_BASE}/>}</main></div>}
  </>;
}
function isDrawing(document:ProjectDocument,file:Attachment){const value=`${document.title} ${document.description||''} ${file.originalName}`.toLocaleLowerCase('sv-SE');return /(ritning|situationsplan|planritning|fasad|sektion|grundplan|takplan|konstruktionsritning)/.test(value)}
function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} kB`;return `${(value/(1024*1024)).toFixed(1)} MB`}
