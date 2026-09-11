import type { ReactNode } from 'react';
import { useEffect,useState } from 'react';

type Project={id:string;name:string;property_designation?:string;status?:string;workspaceId?:string;workspaceName?:string};
type ProjectPage='overview'|'activities'|'administration'|'conditions'|'information'|'reports'|'settings';
type Area={id:string;project_id:string;name:string;sort_order?:number};
type Section={id:string;work_area_id:string;name:string;sort_order?:number};
type Task={id:string;work_section_id:string;title:string;description:string;status:string;sort_order?:number};
type Activity={id:string;task_id:string;title:string;description:string;activity_type:string;required:number;documentation_field_count:number;sort_order?:number};
type Structure={areas:Area[];sections:Section[];tasks:Task[];activities:Activity[]};
type NodeKind='area'|'section'|'task'|'activity';
type SelectedNode={projectId:string;kind:NodeKind;id:string}|null;
type Props={projects:Project[];selectedProjectId:string;selectedPage:ProjectPage;onSelectPage:(projectId:string,page:ProjectPage)=>void;onNewProject:()=>void;content?:ReactNode};
const PAGES:{id:ProjectPage;label:string;icon:string}[]=[
 {id:'overview',label:'Översikt',icon:'⌂'},
 {id:'activities',label:'Aktiviteter',icon:'☑'},
 {id:'administration',label:'Administrativa kontrollpunkter',icon:'✓'},
 {id:'conditions',label:'Projektvillkor',icon:'◆'},
];

export function ProjectsView({projects,selectedProjectId,selectedPage,onSelectPage,onNewProject,content}:Props){
 const[expanded,setExpanded]=useState<Set<string>>(()=>new Set(selectedProjectId?[selectedProjectId,`activities:${selectedProjectId}`]:[]));
 const[structures,setStructures]=useState<Record<string,Structure>>({});
 const[selectedNode,setSelectedNode]=useState<SelectedNode>(null);
 useEffect(()=>{if(selectedProjectId)setExpanded(cur=>{const next=new Set(cur);next.add(selectedProjectId);next.add(`activities:${selectedProjectId}`);return next})},[selectedProjectId]);
 useEffect(()=>{
  const onStructure=(event:Event)=>{const detail=(event as CustomEvent<{projectId?:string;structure?:Structure}>).detail;if(!detail?.projectId||!detail.structure)return;setStructures(cur=>({...cur,[detail.projectId!]:detail.structure!}))};
  window.addEventListener('byggplan:project-structure-loaded',onStructure);
  return()=>window.removeEventListener('byggplan:project-structure-loaded',onStructure);
 },[]);
 const groups=new Map<string,{name:string;projects:Project[]}>();
 for(const project of projects){const key=project.workspaceId||'default';const group=groups.get(key)||{name:project.workspaceName||'Projekt',projects:[]};group.projects.push(project);groups.set(key,group)}
 const grouped=[...groups.values()];
 function toggle(key:string){setExpanded(cur=>{const next=new Set(cur);next.has(key)?next.delete(key):next.add(key);return next})}
 function selectProject(project:Project){setExpanded(cur=>{const next=new Set(cur);next.add(project.id);next.add(`activities:${project.id}`);return next});setSelectedNode(null);window.dispatchEvent(new CustomEvent('byggplan:project-tree-clear-selection',{detail:{projectId:project.id}}));onSelectPage(project.id,'overview')}
 function selectPage(projectId:string,page:ProjectPage){setSelectedNode(null);window.dispatchEvent(new CustomEvent('byggplan:project-tree-clear-selection',{detail:{projectId}}));onSelectPage(projectId,page)}
 function selectNode(projectId:string,kind:NodeKind,id:string){setSelectedNode({projectId,kind,id});onSelectPage(projectId,'activities');window.setTimeout(()=>window.dispatchEvent(new CustomEvent('byggplan:project-tree-select',{detail:{projectId,kind,id}})),0)}
 return <div className="projectsLanding">
  <aside className="projectsTreePanel">
   <div className="projectsTreeHeader"><small>PROJEKT</small><strong>Projekt</strong><button className="projectsNewButton" onClick={onNewProject}>＋ Nytt projekt</button></div>
   <div className="projectsTree" role="tree">
    {!projects.length?<div className="projectsTreeEmpty"><span>🌳</span><b>Inga projekt ännu</b><p>Skapa ditt första projekt för att börja bygga upp projektstrukturen.</p></div>:grouped.map((group,groupIndex)=><div className="projectsTreeGroup" key={`${group.name}-${groupIndex}`}>
     {grouped.length>1&&<div className="projectsWorkspaceNode"><span>⌄</span><b>{group.name}</b></div>}
     {group.projects.map(project=>{const open=expanded.has(project.id),active=project.id===selectedProjectId,structure=structures[project.id];return <div className="projectsProjectNode" key={project.id}>
      <div className="projectsProjectRow" role="treeitem">
       <button className="projectsTreeToggle" aria-label={open?'Fäll ihop projekt':'Expandera projekt'} onClick={()=>toggle(project.id)}>{open?'⌄':'›'}</button>
       <button className="projectsProjectSelect" onClick={()=>selectProject(project)}><span className="projectsTreeIcon">🏠</span><span><b>{project.name}</b>{project.property_designation&&<small>{project.property_designation}</small>}</span></button>
      </div>
      {open&&<div className="projectsProjectChildren">{PAGES.map(page=>page.id==='activities'?<ActivitiesBranch key={page.id} project={project} active={active} selectedPage={selectedPage} structure={structure} expanded={expanded} selectedNode={selectedNode} toggle={toggle} selectPage={selectPage} selectNode={selectNode}/>:<PageButton key={page.id} projectId={project.id} page={page} selected={active&&selectedPage===page.id&&!selectedNode} selectPage={selectPage}/>)}</div>}
     </div>})}
    </div>)}
   </div>
  </aside>
  <main className={`projectsLandingMain ${content?'hasProjectContent':''}`}>{content||<div className="projectsLandingHero"><small>PROJEKT</small><h1>{projects.length?'Välj ett projekt':'Skapa ditt första projekt'}</h1><p>{projects.length?'Expandera ett projekt i trädet och välj den del du vill arbeta med.':'Projektytan är tom. Börja med att skapa ett projekt från projektmallen.'}</p><button className="primary projectsHeroCreate" onClick={onNewProject}>＋ Nytt projekt</button></div>}</main>
 </div>
}

function PageButton({projectId,page,selected,selectPage}:{projectId:string;page:{id:ProjectPage;label:string;icon:string};selected:boolean;selectPage:(projectId:string,page:ProjectPage)=>void}){return <button className={selected?'selectedProjectPage':''} aria-current={selected?'page':undefined} data-project-page={page.id} onClick={()=>selectPage(projectId,page.id)}><span>{page.icon}</span><span>{page.label}</span></button>}

function ActivitiesBranch({project,active,selectedPage,structure,expanded,selectedNode,toggle,selectPage,selectNode}:{project:Project;active:boolean;selectedPage:ProjectPage;structure?:Structure;expanded:Set<string>;selectedNode:SelectedNode;toggle:(key:string)=>void;selectPage:(projectId:string,page:ProjectPage)=>void;selectNode:(projectId:string,kind:NodeKind,id:string)=>void}){
 const key=`activities:${project.id}`,open=expanded.has(key),selected=active&&selectedPage==='activities'&&!selectedNode;
 return <div className="projectsHierarchyBranch"><div className={`projectsHierarchyRow projectsHierarchyPage ${selected?'selectedProjectPage':''}`}>
  <button className="projectsHierarchyToggle" aria-label={open?'Fäll ihop aktiviteter':'Expandera aktiviteter'} onClick={()=>toggle(key)}>{open?'⌄':'›'}</button>
  <button className="projectsHierarchySelect" onClick={()=>selectPage(project.id,'activities')}><span>☑</span><span>Aktiviteter</span>{structure&&<small>{structure.activities.length}</small>}</button>
 </div>{open&&structure?.areas.map(area=><AreaBranch key={area.id} projectId={project.id} area={area} structure={structure} expanded={expanded} selectedNode={selectedNode} toggle={toggle} selectNode={selectNode}/>)}</div>
}
function AreaBranch({projectId,area,structure,expanded,selectedNode,toggle,selectNode}:{projectId:string;area:Area;structure:Structure;expanded:Set<string>;selectedNode:SelectedNode;toggle:(key:string)=>void;selectNode:(projectId:string,kind:NodeKind,id:string)=>void}){const key=`area:${projectId}:${area.id}`,open=expanded.has(key),sections=structure.sections.filter(x=>x.work_area_id===area.id),selected=selectedNode?.projectId===projectId&&selectedNode.kind==='area'&&selectedNode.id===area.id;return <div className="projectsHierarchyBranch"><HierarchyRow depth={1} icon="⛏" label={area.name} count={sections.length} open={open} selected={selected} onToggle={()=>toggle(key)} onSelect={()=>selectNode(projectId,'area',area.id)}/>{open&&sections.map(section=><SectionBranch key={section.id} projectId={projectId} section={section} structure={structure} expanded={expanded} selectedNode={selectedNode} toggle={toggle} selectNode={selectNode}/>)}</div>}
function SectionBranch({projectId,section,structure,expanded,selectedNode,toggle,selectNode}:{projectId:string;section:Section;structure:Structure;expanded:Set<string>;selectedNode:SelectedNode;toggle:(key:string)=>void;selectNode:(projectId:string,kind:NodeKind,id:string)=>void}){const key=`section:${projectId}:${section.id}`,open=expanded.has(key),tasks=structure.tasks.filter(x=>x.work_section_id===section.id),selected=selectedNode?.projectId===projectId&&selectedNode.kind==='section'&&selectedNode.id===section.id;return <div className="projectsHierarchyBranch"><HierarchyRow depth={2} icon="⌖" label={section.name} count={tasks.length} open={open} selected={selected} onToggle={()=>toggle(key)} onSelect={()=>selectNode(projectId,'section',section.id)}/>{open&&tasks.map(task=><TaskBranch key={task.id} projectId={projectId} task={task} structure={structure} expanded={expanded} selectedNode={selectedNode} toggle={toggle} selectNode={selectNode}/>)}</div>}
function TaskBranch({projectId,task,structure,expanded,selectedNode,toggle,selectNode}:{projectId:string;task:Task;structure:Structure;expanded:Set<string>;selectedNode:SelectedNode;toggle:(key:string)=>void;selectNode:(projectId:string,kind:NodeKind,id:string)=>void}){const key=`task:${projectId}:${task.id}`,open=expanded.has(key),activities=structure.activities.filter(x=>x.task_id===task.id),selected=selectedNode?.projectId===projectId&&selectedNode.kind==='task'&&selectedNode.id===task.id;return <div className="projectsHierarchyBranch"><HierarchyRow depth={3} icon="▣" label={task.title} count={activities.length} open={open} selected={selected} onToggle={()=>toggle(key)} onSelect={()=>selectNode(projectId,'task',task.id)}/>{open&&activities.map(activity=><HierarchyRow key={activity.id} depth={4} icon="○" label={activity.title} selected={selectedNode?.projectId===projectId&&selectedNode.kind==='activity'&&selectedNode.id===activity.id} onSelect={()=>selectNode(projectId,'activity',activity.id)}/>)}</div>}
function HierarchyRow({depth,icon,label,count,open,selected,onToggle,onSelect}:{depth:number;icon:string;label:string;count?:number;open?:boolean;selected:boolean;onToggle?:()=>void;onSelect:()=>void}){return <div className={`projectsHierarchyRow ${selected?'selectedProjectNode':''}`} style={{paddingLeft:depth*13}}>{onToggle?<button className="projectsHierarchyToggle" onClick={onToggle}>{open?'⌄':'›'}</button>:<span className="projectsHierarchySpacer"/>}<button className="projectsHierarchySelect" onClick={onSelect}><span>{icon}</span><span>{label}</span>{count!==undefined&&<small>{count}</small>}</button></div>}
