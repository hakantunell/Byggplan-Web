import { useEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import { ProjectDocumentsEditor } from './ProjectDocumentsEditor';
import { ProjectAdministrationEditor } from './ProjectAdministrationEditor';
import { ProjectDeleteControl } from './ProjectDeleteControl';

type MasterDiagnostics={
  hasSnapshot:boolean;masterProjectCode?:string;masterProjectName?:string;snapshotVersion?:number;currentMasterVersion?:number;
  selectedModuleCodes?:string[];activityCount?:number;linkedActivityCount?:number;
  canonicalCheck?:{present:string[];missing:string[];presentCount:number;total:number};
};

function MasterSnapshotInfo({projectId}:{projectId:string}){
  const[data,setData]=useState<MasterDiagnostics|null>(null);
  useEffect(()=>{let cancelled=false;void(async()=>{try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/master-diagnostics`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {diagnostics?:MasterDiagnostics};if(!cancelled&&r.ok)setData(d.diagnostics||null)}catch{if(!cancelled)setData(null)}})();return()=>{cancelled=true}},[projectId]);
  if(!data)return null;
  if(!data.hasSnapshot)return <section className="projectSupportCard"><small>MASTER-SNAPSHOT</small><strong>Ingen Master-snapshot registrerad</strong><p>Projektet verkar inte vara skapat med den nuvarande Master-kloningen.</p></section>;
  const check=data.canonicalCheck;const missing=check?.missing||[];
  return <section className="projectSupportCard"><small>MASTER-SNAPSHOT</small><strong>{data.masterProjectName||data.masterProjectCode||'Masterprojekt'} · v{data.snapshotVersion||'?'}</strong><p>Kod: {data.masterProjectCode||'—'} · Nuvarande Master: v{data.currentMasterVersion||'?'} · {data.activityCount||0} projektaktiviteter · {data.linkedActivityCount||0} Master-kopplade.</p><p><b>Valda moduler:</b> {(data.selectedModuleCodes||[]).join(', ')||'inga'}</p>{check&&<p><b>Diagnostik:</b> {check.presentCount}/{check.total} kontrollaktiviteter som ska finnas i v9–v11 hittades.</p>}{missing.length>0&&<details><summary>{missing.length} förväntade aktiviteter saknas</summary><ul>{missing.map(title=><li key={title}>{title}</li>)}</ul></details>}</section>;
}

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
  return createPortal(<div className="projectOverviewExtras"><MasterSnapshotInfo projectId={projectId}/><ProjectAdministrationEditor projectId={projectId}/><ProjectDocumentsEditor projectId={projectId}/><ProjectDeleteControl projectId={projectId} projectName={projectName||'Projekt'}/></div>,target);
}
