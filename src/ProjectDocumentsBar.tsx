import { useCallback,useEffect,useMemo,useState } from 'react';

type Project={id:string;name:string};
type Attachment={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
type ProjectDocument={id:string;title:string;description:string;attachments:Attachment[]};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');

export function ProjectDocumentsBar(){
  const[projects,setProjects]=useState<Project[]>([]);const[projectId,setProjectId]=useState('');const[documents,setDocuments]=useState<ProjectDocument[]>([]);const[open,setOpen]=useState(false);const[loading,setLoading]=useState(false);
  useEffect(()=>{void (async()=>{try{const r=await fetch(`${API_BASE}/api/projects`,{cache:'no-store'});const d=await r.json() as {projects?:Project[]};setProjects(d.projects||[]);}catch{setProjects([])}})()},[]);
  useEffect(()=>{const sync=()=>{const name=document.querySelector('.app>header strong')?.textContent?.trim()||'';const match=projects.find(p=>p.name===name)??(projects.length===1?projects[0]:undefined);if(match)setProjectId(current=>current===match.id?current:match.id)};sync();const timer=window.setInterval(sync,500);return()=>window.clearInterval(timer)},[projects]);

  const loadDocuments=useCallback(async()=>{
    if(!projectId)return;
    setLoading(true);
    try{
      const r=await fetch(`${API_BASE}/api/project-documents?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
      if(!r.ok)throw new Error(`API ${r.status}`);
      const d=await r.json() as {documents?:ProjectDocument[]};
      setDocuments(d.documents||[]);
    }catch(error){console.error('Kunde inte läsa projektdokument',error);setDocuments([])}finally{setLoading(false)}
  },[projectId]);

  useEffect(()=>{void loadDocuments()},[loadDocuments]);
  useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void loadDocuments()},15000);return()=>window.clearInterval(timer)},[loadDocuments]);
  useEffect(()=>{const onVisible=()=>{if(document.visibilityState==='visible')void loadDocuments()};document.addEventListener('visibilitychange',onVisible);return()=>document.removeEventListener('visibilitychange',onVisible)},[loadDocuments]);

  const fileCount=useMemo(()=>documents.reduce((sum,d)=>sum+(d.attachments?.length||0),0),[documents]);
  if(!projectId)return null;
  const toggleOpen=()=>{setOpen(value=>{const next=!value;if(next)void loadDocuments();return next})};
  return <aside className={`projectDocumentsBar ${open?'open':''}`}><button className="projectDocumentsBarButton" onClick={toggleOpen}><span>📚</span><span><b>Projektdokument</b><small>{loading?'Laddar…':`${documents.length} dokument${fileCount?` · ${fileCount} filer`:''}`}</small></span><em>{open?'−':'+'}</em></button>{open&&<div className="projectDocumentsBarBody">{!loading&&!documents.length&&<p>Inga projektdokument har lagts in.</p>}{documents.map(doc=><article key={doc.id}><b>{doc.title}</b>{doc.description&&<p>{doc.description}</p>}{doc.attachments?.map(file=><a key={file.id} href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer"><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{file.contentType.startsWith('image/')?'Bild':'PDF'} · {formatBytes(file.sizeBytes)}</small></span><em>Öppna ↗</em></a>)}</article>)}</div>}</aside>
}
function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} kB`;return `${(value/(1024*1024)).toFixed(1)} MB`}
