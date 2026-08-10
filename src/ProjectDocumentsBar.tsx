import { useCallback,useEffect,useMemo,useState } from 'react';

type Attachment={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
type ProjectDocument={id:string;title:string;description:string;attachments:Attachment[]};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');

export function ProjectDocumentsBar({projectId}:{projectId:string}){
  const[documents,setDocuments]=useState<ProjectDocument[]>([]);const[open,setOpen]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState('');

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

  useEffect(()=>{setDocuments([]);setOpen(false);void loadDocuments()},[loadDocuments]);
  useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void loadDocuments()},15000);return()=>window.clearInterval(timer)},[loadDocuments]);
  useEffect(()=>{const onVisible=()=>{if(document.visibilityState==='visible')void loadDocuments()};document.addEventListener('visibilitychange',onVisible);return()=>document.removeEventListener('visibilitychange',onVisible)},[loadDocuments]);

  const fileCount=useMemo(()=>documents.reduce((sum,d)=>sum+(d.attachments?.length||0),0),[documents]);
  const toggleOpen=()=>{setOpen(value=>{const next=!value;if(next)void loadDocuments();return next})};
  return <aside className={`projectDocumentsBar ${open?'open':''}`}><button className="projectDocumentsBarButton" onClick={toggleOpen}><span>📚</span><span><b>Projektdokument</b><small>{loading?'Laddar…':error?'Kunde inte läsa dokument':`${documents.length} dokument${fileCount?` · ${fileCount} filer`:''}`}</small></span><em>{open?'−':'+'}</em></button>{open&&<div className="projectDocumentsBarBody">{error&&<p>{error}</p>}{!loading&&!error&&!documents.length&&<p>Inga projektdokument har lagts in.</p>}{documents.map(doc=><article key={doc.id}><b>{doc.title}</b>{doc.description&&<p>{doc.description}</p>}{doc.attachments?.map(file=><a key={file.id} href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer"><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{file.contentType.startsWith('image/')?'Bild':'PDF'} · {formatBytes(file.sizeBytes)}</small></span><em>Öppna ↗</em></a>)}</article>)}</div>}</aside>
}
function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} kB`;return `${(value/(1024*1024)).toFixed(1)} MB`}
