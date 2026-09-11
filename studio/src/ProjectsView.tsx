import type { ReactNode } from 'react';
import { useEffect,useState } from 'react';

type Project={id:string;name:string;property_designation?:string;status?:string;workspaceId?:string;workspaceName?:string};
type ProjectPage='overview'|'activities'|'administration'|'conditions'|'information'|'reports'|'settings';
type Props={projects:Project[];selectedProjectId:string;selectedPage:ProjectPage;onSelectPage:(projectId:string,page:ProjectPage)=>void;onNewProject:()=>void;content?:ReactNode};
const PAGES:{id:ProjectPage;label:string;icon:string}[]=[
 {id:'overview',label:'Översikt',icon:'⌂'},
 {id:'activities',label:'Aktiviteter',icon:'☑'},
 {id:'administration',label:'Administrativa kontrollpunkter',icon:'✓'},
 {id:'conditions',label:'Projektvillkor',icon:'◆'},
 {id:'information',label:'Projektinformation',icon:'ℹ'},
 {id:'reports',label:'Rapporter',icon:'▥'},
 {id:'settings',label:'Inställningar',icon:'⚙'},
];

export function ProjectsView({projects,selectedProjectId,selectedPage,onSelectPage,onNewProject,content}:Props){
 const[expanded,setExpanded]=useState<Set<string>>(()=>new Set(selectedProjectId?[selectedProjectId]:[]));
 useEffect(()=>{if(selectedProjectId)setExpanded(cur=>{const next=new Set(cur);next.add(selectedProjectId);return next})},[selectedProjectId]);
 const groups=new Map<string,{name:string;projects:Project[]}>();
 for(const project of projects){const key=project.workspaceId||'default';const group=groups.get(key)||{name:project.workspaceName||'Projekt',projects:[]};group.projects.push(project);groups.set(key,group)}
 const grouped=[...groups.values()];
 function toggleProject(id:string){setExpanded(cur=>{const next=new Set(cur);next.has(id)?next.delete(id):next.add(id);return next})}
 function selectProject(project:Project){setExpanded(cur=>new Set(cur).add(project.id));onSelectPage(project.id,'overview')}
 return <div className="projectsLanding">
  <aside className="projectsTreePanel">
   <div className="projectsTreeHeader"><small>PROJEKT</small><strong>Projekt</strong><button className="projectsNewButton" onClick={onNewProject}>＋ Nytt projekt</button></div>
   <div className="projectsTree" role="tree">
    {!projects.length?<div className="projectsTreeEmpty"><span>🌳</span><b>Inga projekt ännu</b><p>Skapa ditt första projekt för att börja bygga upp projektstrukturen.</p></div>:grouped.map((group,groupIndex)=><div className="projectsTreeGroup" key={`${group.name}-${groupIndex}`}>
     {grouped.length>1&&<div className="projectsWorkspaceNode"><span>⌄</span><b>{group.name}</b></div>}
     {group.projects.map(project=>{const open=expanded.has(project.id),active=project.id===selectedProjectId;return <div className="projectsProjectNode" key={project.id}>
      <div className={`projectsProjectRow ${active?'active':''}`} role="treeitem">
       <button className="projectsTreeToggle" aria-label={open?'Fäll ihop projekt':'Expandera projekt'} onClick={()=>toggleProject(project.id)}>{open?'⌄':'›'}</button>
       <button className="projectsProjectSelect" onClick={()=>selectProject(project)}><span className="projectsTreeIcon">🏠</span><span><b>{project.name}</b>{project.property_designation&&<small>{project.property_designation}</small>}</span></button>
      </div>
      {open&&<div className="projectsProjectChildren">{PAGES.map(page=><button key={page.id} className={active&&selectedPage===page.id?'active':''} onClick={()=>onSelectPage(project.id,page.id)}><span>{page.icon}</span><span>{page.label}</span></button>)}</div>}
     </div>})}
    </div>)}
   </div>
  </aside>
  <main className={`projectsLandingMain ${content?'hasProjectContent':''}`}>{content||<div className="projectsLandingHero"><small>PROJEKT</small><h1>{projects.length?'Välj ett projekt':'Skapa ditt första projekt'}</h1><p>{projects.length?'Expandera ett projekt i trädet och välj den del du vill arbeta med.':'Projektytan är tom. Börja med att skapa ett projekt från projektmallen.'}</p><button className="primary projectsHeroCreate" onClick={onNewProject}>＋ Nytt projekt</button></div>}</main>
 </div>
}
