import { useEffect,useState } from 'react';
import { GoverningDocumentsWorkspace } from './GoverningDocumentsWorkspace';
import { GoverningMappingView } from './GoverningMappingView';
import { MasterProjectsView } from './MasterProjectsView';
import { ProjectWorkspace } from './ProjectWorkspace';
import { ProjectHierarchyIndicators } from './project-hierarchy-indicators';
import { ProjectHierarchyStatusV2 } from './project-hierarchy-status-v2';
import { ProjectReportsMount } from './ProjectReportsMount';
import { ProjectControlPlanMount } from './ProjectControlPlanMount';
import { GoverningCompletionIndicator } from './governing-completion-indicator';

type StudioView='project'|'governing-documents'|'governing-mapping'|'master-projects';
type Project={id:string;name:string;property_designation?:string;status?:string};
type MappingStatus={summary?:{uncovered_count?:number};items?:Array<{mapping_needs_repair?:boolean}>};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const PROJECT_STORAGE_KEY='byggplan.studio.projectId';

export function StudioShell(){
 const[view,setView]=useState<StudioView>('project');const[projects,setProjects]=useState<Project[]>([]);const[projectId,setProjectId]=useState('');const[statusVersion,setStatusVersion]=useState(0);const[mappingWarning,setMappingWarning]=useState(0);
 useEffect(()=>{void loadProjects()},[]);
 useEffect(()=>{const changed=()=>setStatusVersion(value=>value+1);window.addEventListener('byggplan:activity-status-changed',changed);return()=>window.removeEventListener('byggplan:activity-status-changed',changed)},[]);
 useEffect(()=>{if(projectId)void loadMappingWarning()},[projectId,view,statusVersion]);
 function selectProject(id:string){if(!id)return;setProjectId(id);try{localStorage.setItem(PROJECT_STORAGE_KEY,id)}catch{}}
 async function loadProjects(selectId?:string){try{const response=await fetch(`${API_BASE}/api/projects`,{cache:'no-store'});const data=await response.json() as {projects?:Project[]};const next=data.projects||[];setProjects(next);let stored='';try{stored=localStorage.getItem(PROJECT_STORAGE_KEY)||''}catch{}setProjectId(current=>{const candidate=(selectId&&next.some(p=>p.id===selectId)?selectId:'')||(current&&next.some(p=>p.id===current)?current:'')||(stored&&next.some(p=>p.id===stored)?stored:'')||next[0]?.id||'';if(candidate)try{localStorage.setItem(PROJECT_STORAGE_KEY,candidate)}catch{}return candidate})}catch{setProjects([])}}
 async function loadMappingWarning(){try{const r=await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-mapping`,{cache:'no-store'});if(!r.ok)return;const d=await r.json() as MappingStatus;const repairs=(d.items||[]).filter(item=>item.mapping_needs_repair).length;const uncovered=Number(d.summary?.uncovered_count||0);setMappingWarning(Math.max(repairs,uncovered))}catch{}}
 function openCreatedProject(id:string){selectProject(id);void loadProjects(id);setView('project')}
 if(view==='project')return <div className="studioShell view-project">{projectId?<><ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} onOpenMasterProjects={()=>setView('master-projects')}/><ProjectHierarchyIndicators key={`indicators-${statusVersion}`}/><ProjectHierarchyStatusV2 key={`status-${statusVersion}`}/><GoverningCompletionIndicator/><ProjectReportsMount projectId={projectId}/><ProjectControlPlanMount projectId={projectId}/></>:<div className="workspaceEmpty">Hämtar projekt…</div>}</div>;
 const current=projects.find(p=>p.id===projectId);const master=view==='master-projects',mapping=view==='governing-mapping';
 return <div className={`studioShell view-control-plan ${master?'view-master-projects':mapping?'view-governing-mapping':'view-governing-documents'}`}><div className="controlPlanStudioFrame"><header className="topbar controlPlanTopbar"><div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>{master?'Masterprojekt':mapping?'Kartläggning':'Styrdokument'}</small></div></div>{!master&&<select value={projectId} onChange={e=>selectProject(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}{master&&<div className="masterTopbarLabel">Bibliotek</div>}<div className="connection ready">● Ansluten</div></header><aside className="rail controlPlanRail"><button title="Projekt" onClick={()=>setView('project')}>🌳<span>Projekt</span></button><button className={view==='governing-documents'?'active':''} title="Styrdokument" onClick={()=>setView('governing-documents')}>📚<span>Styrdokument</span></button><button className={`governingMappingRailButton ${mapping?'active':''}`} title={mappingWarning>0?`Kartläggning – ${mappingWarning} punkt${mappingWarning===1?'':'er'} behöver åtgärdas`:'Kartläggning'} onClick={()=>setView('governing-mapping')}><span className="railIconWrap">🧭{mappingWarning>0&&<em className="railWarningBadge">⚠</em>}</span><span>Kartläggning</span></button><button className={master?'active':''} title="Masterprojekt" onClick={()=>setView('master-projects')}>🏠<span>Masterprojekt</span></button><button disabled title="Användare">👥<span>Användare</span></button></aside><section className="controlPlanMainRegion" aria-label={master?'Masterprojekt':mapping?`Kartläggning för ${current?.name||'projektet'}`:`Styrdokument för ${current?.name||'projektet'}`}>{master?<MasterProjectsView onProjectCreated={openCreatedProject}/>:projectId?(mapping?<GoverningMappingView projectId={projectId}/>:<GoverningDocumentsWorkspace projectId={projectId} onOpenMapping={()=>setView('governing-mapping')}/>):<div className="empty"><span>{mapping?'🧭':'📚'}</span><h2>Inget projekt valt</h2></div>}</section></div></div>
}
