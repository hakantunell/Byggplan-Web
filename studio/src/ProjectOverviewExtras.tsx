import { useEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import { ProjectDocumentsEditor } from './ProjectDocumentsEditor';
import { ProjectAdministrationEditor } from './ProjectAdministrationEditor';

export function ProjectOverviewExtras(){
  const[target,setTarget]=useState<Element|null>(null);const[projectId,setProjectId]=useState('');
  useEffect(()=>{
    const sync=()=>{
      const overview=document.querySelector('.studio .workspace .overview');
      const select=document.querySelector('.studio .topbar select') as HTMLSelectElement|null;
      setTarget(current=>current===overview?current:overview);
      const next=select?.value||'';setProjectId(current=>current===next?current:next);
    };
    sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer);
  },[]);
  if(!target||!projectId)return null;
  return createPortal(<div className="projectOverviewExtras"><ProjectAdministrationEditor projectId={projectId}/><ProjectDocumentsEditor projectId={projectId}/></div>,target);
}
