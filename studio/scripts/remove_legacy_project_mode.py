from pathlib import Path

p=Path('studio/src/StudioShell.tsx')
s=p.read_text()
s=s.replace("type StudioView='projects'|'project'|'new-project'|'project-documents'|'governing-documents'|'governing-mapping'|'users'|'control-plan'|'graphical-plan'|'backup'|'system-workspaces';",
            "type StudioView='projects'|'new-project'|'project-documents'|'governing-documents'|'governing-mapping'|'users'|'control-plan'|'graphical-plan'|'backup'|'system-workspaces';")
s=s.replace("function openCreatedProject(id:string){selectProject(id);void loadProjects(id);setView('project')}",
            "function openCreatedProject(id:string){selectProject(id);setProjectPage('overview');void loadProjects(id);setView('projects')}")
start=s.find(" if(view==='project')return ")
if start<0: raise SystemExit('legacy project view marker not found')
end=s.find(" const projectsView=",start)
if end<0: raise SystemExit('projectsView marker not found')
s=s[:start]+" "+s[end:]
p.write_text(s)

p=Path('studio/src/ProjectWorkspace.tsx')
s=p.read_text()
old=" if(embedded)return <main className=\"projectMain embeddedProjectMain\">{loading?<div className=\"workspaceEmpty\">Hämtar projekt…</div>:<ProjectContent selection={selection} project={project} structure={structure} meta={meta} selectedObject={selectedObject} editMode={editMode} reload={load} setMessage={setMessage}/>}</main>;"
new=" const effectiveSelection:Selection=embedded&&selectedPage?{kind:'page',page:selectedPage}:selection;\n const effectiveSelectedObject=effectiveSelection.kind==='area'?structure.areas.find(x=>x.id===effectiveSelection.id):effectiveSelection.kind==='section'?structure.sections.find(x=>x.id===effectiveSelection.id):effectiveSelection.kind==='task'?structure.tasks.find(x=>x.id===effectiveSelection.id):effectiveSelection.kind==='activity'?structure.activities.find(x=>x.id===effectiveSelection.id):null;\n if(embedded)return <main className=\"projectMain embeddedProjectMain\">{loading?<div className=\"workspaceEmpty\">Hämtar projekt…</div>:<ProjectContent selection={effectiveSelection} project={project} structure={structure} meta={meta} selectedObject={effectiveSelectedObject} editMode={editMode} reload={load} setMessage={setMessage}/>}</main>;"
if old not in s: raise SystemExit('embedded render marker not found')
s=s.replace(old,new,1)
p.write_text(s)
