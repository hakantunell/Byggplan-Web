import { useEffect,useState } from 'react';
import { GoverningDocumentsWorkspace } from './GoverningDocumentsWorkspace';
import { MasterProjectsView } from './MasterProjectsView';
import { ProjectWorkspace } from './ProjectWorkspace';
import { ProjectHierarchyIndicators } from './project-hierarchy-indicators';
import { ProjectHierarchyStatusV2 } from './project-hierarchy-status-v2';
import { ProjectReportsMount } from './ProjectReportsMount';
import { GoverningCompletionIndicator } from './governing-completion-indicator';
import { GoverningCountFormat } from './governing-count-format';

type StudioView='project'|'governing-documents'|'master-projects';
type Project={id:string;name:string;property_designation?:string;status?:string};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const PROJECT_STORAGE_KEY='byggplan.studio.projectId';

export function StudioShell(){
 const[view,setView]=useState<StudioView>('project');const[projects,setProjects]=useState<Project[]>([]);const[projectId,setProjectId]=useState('');const[statusVersion,setStatusVersion]=useState(0);
 useEffect(()=>{void loadProjects()},[]);
 useEffect(()=>{const changed=()=>setStatusVersion(value=>value+1);window.addEventListener('byggplan:activity-status-changed',changed);return()=>window.removeEventListener('byggplan:activity-status-changed',changed)},[]);
 function selectProject(id:string){if(!id)return;setProjectId(id);try{localStorage.setItem(PROJECT_STORAGE_KEY,id)}catch{}}
 async function loadProjects(selectId?:string){try{const response=await fetch(`${API_BASE}/api/projects`,{cache:'no-store'});const data=await response.json() as {projects?:Project[]};const next=data.projects||[];setProjects(next);let stored='';try{stored=localStorage.getItem(PROJECT_STORAGE_KEY)||''}catch{}setProjectId(current=>{const candidate=(selectId&&next.some(p=>p.id===selectId)?selectId:'')||(current&&next.some(p=>p.id===current)?current:'')||(stored&&next.some(p=>p.id===stored)?stored:'')||next[0]?.id||'';if(candidate)try{localStorage.setItem(PROJECT_STORAGE_KEY,candidate)}catch{}return candidate})}catch{setProjects([])}}
 function openCreatedProject(id:string){selectProject(id);void loadProjects(id);setView('project')}
 if(view==='project')return <div className="studioShell view-project">{projectId?<><ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenMasterProjects={()=>setView('master-projects')}/><ProjectHierarchyIndicators key={`indicators-${statusVersion}`}/><ProjectHierarchyStatusV2 key={`status-${statusVersion}`}/><GoverningCompletionIndicator/><GoverningCountFormat/><ProjectReportsMount projectId={projectId}/></>:<div className="workspaceEmpty">Hämtar projekt…</div>}</div>;
 const current=projects.find(p=>p.id===projectId);const master=view==='master-projects';
 return <div className={`studioShell view-control-plan ${master?'view-master-projects':'view-governing-documents'}`}><div className="controlPlanStudioFrame"><header className="topbar controlPlanTopbar"><div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>{master?'Masterprojekt':'Styrdokument'}</small></div></div>{!master&&<select value={projectId} onChange={e=>selectProject(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}{master&&<div className="masterTopbarLabel">Bibliotek</div>}<div className="connection ready">● Ansluten</div></header><aside className="rail controlPlanRail"><button title="Projekt" onClick={()=>setView('project')}>🌳<span>Projekt</span></button><button className={view==='governing-documents'?'active':''} title="Styrdokument" onClick={()=>setView('governing-documents')}>📚<span>Styrdokument</span></button><button className={master?'active':''} title="Masterprojekt" onClick={()=>setView('master-projects')}>🏠<span>Masterprojekt</span></button><button disabled title="Användare">👥<span>Användare</span></button></aside><section className="controlPlanMainRegion" aria-label={master?'Masterprojekt':`Styrdokument för ${current?.name||'projektet'}`}>{master?<MasterProjectsView onProjectCreated={openCreatedProject}/>:projectId?<GoverningDocumentsWorkspace projectId={projectId}/>:<div className="empty"><span>📚</span><h2>Inget projekt valt</h2></div>}</section></div></div>
}
