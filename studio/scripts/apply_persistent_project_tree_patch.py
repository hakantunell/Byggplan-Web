from pathlib import Path

# ProjectWorkspace: add embedded/content-only mode and externally controlled top page
p=Path('studio/src/ProjectWorkspace.tsx')
s=p.read_text()
s=s.replace("type Props={projects:Project[];projectId:string;onProjectChange:(id:string)=>void;onOpenProjects:()=>void;onOpenProjectDocuments:()=>void;onOpenGoverningDocuments:()=>void;onOpenGoverningMapping:()=>void;mappingWarning?:number};",
            "type Props={projects:Project[];projectId:string;onProjectChange:(id:string)=>void;onOpenProjects:()=>void;onOpenProjectDocuments:()=>void;onOpenGoverningDocuments:()=>void;onOpenGoverningMapping:()=>void;mappingWarning?:number;embedded?:boolean;selectedPage?:Page};")
s=s.replace("export function ProjectWorkspace({projects,projectId,onProjectChange,onOpenProjects,onOpenProjectDocuments,onOpenGoverningDocuments,onOpenGoverningMapping,mappingWarning=0}:Props){",
            "export function ProjectWorkspace({projects,projectId,onProjectChange,onOpenProjects,onOpenProjectDocuments,onOpenGoverningDocuments,onOpenGoverningMapping,mappingWarning=0,embedded=false,selectedPage}:Props){")
needle=" useEffect(()=>{setSelection({kind:'page',page:'overview'});setExpanded(new Set(['page:activities']));setEditMode(false);void load()},[projectId]);\n"
if needle not in s: raise SystemExit('ProjectWorkspace project effect not found')
s=s.replace(needle, needle+" useEffect(()=>{if(selectedPage)setSelection({kind:'page',page:selectedPage})},[selectedPage]);\n",1)
old=" return <div className={`projectWorkspace ${editMode?'editMode':''}`}><header className=\"topbar\">"
if old not in s: raise SystemExit('ProjectWorkspace return marker not found')
new=" if(embedded)return <main className=\"projectMain embeddedProjectMain\">{loading?<div className=\"workspaceEmpty\">Hämtar projekt…</div>:<ProjectContent selection={selection} project={project} structure={structure} meta={meta} selectedObject={selectedObject} editMode={editMode} reload={load} setMessage={setMessage}/>}</main>;\n return <div className={`projectWorkspace ${editMode?'editMode':''}`}><header className=\"topbar\">"
s=s.replace(old,new,1)
p.write_text(s)

# ProjectsView: permanent expandable tree with project pages and content slot
p=Path('studio/src/ProjectsView.tsx')
p.write_text("""import type { ReactNode } from 'react';
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
""")

# StudioShell: keep project tree view and render ProjectWorkspace content-only inside it
p=Path('studio/src/StudioShell.tsx')
s=p.read_text()
s=s.replace("const[view,setView]=useState<StudioView>(()=>kaOnly?'control-plan':'projects');const[projects,setProjects]=useState<Project[]>([]);const[projectId,setProjectId]=useState('');",
            "const[view,setView]=useState<StudioView>(()=>kaOnly?'control-plan':'projects');const[projects,setProjects]=useState<Project[]>([]);const[projectId,setProjectId]=useState('');const[projectPage,setProjectPage]=useState<'overview'|'activities'|'administration'|'conditions'|'information'|'reports'|'settings'>('overview');")
s=s.replace(" function openProjectFromTree(id:string){selectProject(id);setView('project')}",
            " function selectProjectPage(id:string,page:'overview'|'activities'|'administration'|'conditions'|'information'|'reports'|'settings'){selectProject(id);setProjectPage(page);setView('projects')}")
old="projectsView?<ProjectsView projects={projects} selectedProjectId={projectId} onOpenProject={openProjectFromTree} onNewProject={()=>setView('new-project')}/>:newProject?"
if old not in s: raise SystemExit('ProjectsView invocation not found')
content="projectsView?<ProjectsView projects={projects} selectedProjectId={projectId} selectedPage={projectPage} onSelectPage={selectProjectPage} onNewProject={()=>setView('new-project')} content={projectId?<ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenProjects={()=>setView('projects')} onOpenProjectDocuments={()=>setView('project-documents')} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} embedded selectedPage={projectPage}/>:undefined}/>:newProject?"
s=s.replace(old,content,1)
p.write_text(s)

# CSS
p=Path('studio/src/projects-view.css')
s=p.read_text()
s += """
.projectsProjectNode{display:grid;gap:2px}.projectsProjectRow{display:grid;grid-template-columns:24px minmax(0,1fr);align-items:stretch;border-radius:7px}.projectsProjectRow.active{background:#eef6f1}.projectsTreeGroup .projectsTreeToggle{display:flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:#60756a;border-radius:6px;cursor:pointer}.projectsTreeGroup .projectsTreeToggle:hover{background:#e4eee8}.projectsTreeGroup .projectsProjectSelect{display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:5px;padding:9px 8px;border:0;background:transparent;text-align:left;color:#244336;cursor:pointer;border-radius:7px}.projectsProjectSelect>span:last-child{display:grid;gap:2px;min-width:0}.projectsProjectSelect b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.projectsProjectSelect small{font-size:10px;color:#728178}.projectsProjectChildren{display:grid;gap:1px;margin:1px 0 6px 28px;padding-left:8px;border-left:1px solid #d9e4dd}.projectsTreeGroup .projectsProjectChildren button{display:grid;grid-template-columns:20px minmax(0,1fr);gap:5px;align-items:center;padding:7px 8px;border:0;background:transparent;border-radius:6px;text-align:left;color:#52665b;cursor:pointer}.projectsTreeGroup .projectsProjectChildren button:hover{background:#f1f6f3}.projectsTreeGroup .projectsProjectChildren button.active{background:#dfeee5;color:#173f2d;font-weight:800;box-shadow:inset 0 0 0 1px #bfd5c6}.projectsLandingMain.hasProjectContent{display:block;padding:0;overflow:auto;background:#f4f7f5}.embeddedProjectMain{width:100%;min-height:100%;padding:0}.embeddedProjectMain>.projectPage{min-height:100%;box-sizing:border-box}
"""
p.write_text(s)
