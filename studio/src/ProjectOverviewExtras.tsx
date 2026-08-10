import { useEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import { ProjectDocumentsEditor } from './ProjectDocumentsEditor';
import { ProjectAdministrationEditor } from './ProjectAdministrationEditor';
import { ProjectDeleteControl } from './ProjectDeleteControl';

export function ProjectOverviewExtras(){
  const[target,setTarget]=useState<Element|null>(null);const[projectId,setProjectId]=useState('');const[projectName,setProjectName]=useState('');
  useEffect(()=>{
    const sync=()=>{
      const overview=document.querySelector('.studio .workspace .overview');
      const select=document.querySelector('.studio .topbar select') as HTMLSelectElement|null;
      setTarget(current=>current===overview?current:overview);
      const next=select?.value||'';setProjectId(current=>current===next?current:next);
      const name=select?.selectedOptions?.[0]?.textContent?.trim()||'';setProjectName(current=>current===name?current:name);
    };
    sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer);
  },[]);
  if(!target||!projectId)return null;
  return createPortal(<div className="projectOverviewExtras"><ProjectAdministrationEditor projectId={projectId}/><ProjectDocumentsEditor projectId={projectId}/><ProjectDeleteControl projectId={projectId} projectName={projectName||'Projekt'}/></div>,target);
}
