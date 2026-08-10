import { useEffect,useState } from 'react';
import { ProjectDocumentsEditor } from './ProjectDocumentsEditor';

export function ProjectDocumentsDock(){
  const[projectId,setProjectId]=useState('');const[open,setOpen]=useState(false);
  useEffect(()=>{
    let select:HTMLSelectElement|null=null;
    const sync=()=>{const next=(document.querySelector('.studio .topbar select') as HTMLSelectElement|null);if(next!==select){select?.removeEventListener('change',sync);select=next;select?.addEventListener('change',sync)}const value=select?.value||'';setProjectId(current=>current===value?current:value)};
    sync();const timer=window.setInterval(sync,500);return()=>{window.clearInterval(timer);select?.removeEventListener('change',sync)};
  },[]);
  if(!projectId)return null;
  return <aside className={`projectDocumentsDock ${open?'open':''}`}><button className="projectDocumentsDockButton" onClick={()=>setOpen(v=>!v)}><span>📚</span><span><b>Projektdokument</b><small>Dokument som gäller hela projektet</small></span><em>{open?'−':'+'}</em></button>{open&&<div className="projectDocumentsDockBody"><ProjectDocumentsEditor projectId={projectId}/></div>}</aside>
}
