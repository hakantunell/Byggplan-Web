type Project={id:string;name:string;property_designation?:string;status?:string;workspaceId?:string;workspaceName?:string};

type Props={
 projects:Project[];
 selectedProjectId:string;
 onOpenProject:(id:string)=>void;
 onNewProject:()=>void;
};

export function ProjectsView({projects,selectedProjectId,onOpenProject,onNewProject}:Props){
 const groups=new Map<string,{name:string;projects:Project[]}>();
 for(const project of projects){
  const key=project.workspaceId||'default';
  const group=groups.get(key)||{name:project.workspaceName||'Projekt',projects:[]};
  group.projects.push(project);
  groups.set(key,group);
 }
 const grouped=[...groups.values()];
 return <div className="projectsLanding">
  <aside className="projectsTreePanel">
   <div className="projectsTreeHeader"><small>PROJEKT</small><strong>Projekt</strong><button className="projectsNewButton" onClick={onNewProject}>＋ Nytt projekt</button></div>
   <div className="projectsTree" role="tree">
    {!projects.length?<div className="projectsTreeEmpty"><span>🌳</span><b>Inga projekt ännu</b><p>Skapa ditt första projekt för att börja bygga upp projektstrukturen.</p></div>:grouped.map((group,groupIndex)=><div className="projectsTreeGroup" key={`${group.name}-${groupIndex}`}>
      {grouped.length>1&&<div className="projectsWorkspaceNode"><span>⌄</span><b>{group.name}</b></div>}
      {group.projects.map(project=><button key={project.id} role="treeitem" className={project.id===selectedProjectId?'active':''} onClick={()=>onOpenProject(project.id)}><span className="projectsTreeBranch">└</span><span className="projectsTreeIcon">🏠</span><span><b>{project.name}</b>{project.property_designation&&<small>{project.property_designation}</small>}</span></button>)}
     </div>)}
   </div>
  </aside>
  <main className="projectsLandingMain">
   <div className="projectsLandingHero"><small>PROJEKT</small><h1>{projects.length?'Välj ett projekt':'Skapa ditt första projekt'}</h1><p>{projects.length?'Välj ett projekt i trädet till vänster eller skapa ett nytt.':'Projektytan är tom. Börja med att skapa ett projekt från projektmallen.'}</p><button className="primary projectsHeroCreate" onClick={onNewProject}>＋ Nytt projekt</button></div>
  </main>
 </div>
}
