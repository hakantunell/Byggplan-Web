from pathlib import Path

p=Path('studio/src/StudioShell.tsx')
s=p.read_text()
s=s.replace("type StudioView='projects'|'new-project'|'project-documents'|'governing-documents'|'governing-mapping'|'users'|'control-plan'|'graphical-plan'|'backup'|'system-workspaces';",
"type StudioView='projects'|'new-project'|'project-information'|'project-reports'|'project-settings'|'project-documents'|'governing-documents'|'governing-mapping'|'users'|'control-plan'|'graphical-plan'|'backup'|'system-workspaces';")
s=s.replace("const openProjectInformation=()=>{if(!kaOnly&&projectId){setProjectPage('information');setView('projects')}};const openProjectReports=()=>{if(!kaOnly&&projectId){setProjectPage('reports');setView('projects')}};const openProjectSettings=()=>{if(!kaOnly&&projectId){setProjectPage('settings');setView('projects')}};",
"const openProjectInformation=()=>{if(!kaOnly&&projectId)setView('project-information')};const openProjectReports=()=>{if(!kaOnly&&projectId)setView('project-reports')};const openProjectSettings=()=>{if(!kaOnly&&projectId)setView('project-settings')};")
s=s.replace("const projectsView=view==='projects',newProject=view==='new-project',systemWorkspaces=view==='system-workspaces',projectDocuments=view==='project-documents',mapping=view==='governing-mapping',users=view==='users',controlPlan=view==='control-plan',graphicalPlan=view==='graphical-plan',backup=view==='backup';",
"const projectsView=view==='projects',newProject=view==='new-project',projectInformation=view==='project-information',projectReports=view==='project-reports',projectSettings=view==='project-settings',systemWorkspaces=view==='system-workspaces',projectDocuments=view==='project-documents',mapping=view==='governing-mapping',users=view==='users',controlPlan=view==='control-plan',graphicalPlan=view==='graphical-plan',backup=view==='backup';")
s=s.replace("return <div data-project-page={projectsView?projectPage:undefined} className={`studioShell view-control-plan ${projectsView?'view-projects':newProject?'view-new-project':mapping?'view-governing-mapping':users?'view-users':controlPlan?'view-native-control-plan':graphicalPlan?'view-graphical-plan':backup?'view-backup':'view-governing-documents'}`}>",
"return <div data-project-page={projectsView?projectPage:undefined} className={`studioShell view-control-plan ${projectsView?'view-projects':newProject?'view-new-project':projectInformation?'view-project-information':projectReports?'view-project-reports':projectSettings?'view-project-settings':mapping?'view-governing-mapping':users?'view-users':controlPlan?'view-native-control-plan':graphicalPlan?'view-graphical-plan':backup?'view-backup':'view-governing-documents'}`}>")
s=s.replace("systemWorkspaces?'System · Projektytor':projectsView?PROJECT_PAGE_LABELS[projectPage]:newProject?'Nytt projekt':mapping?",
"systemWorkspaces?'System · Projektytor':projectsView?PROJECT_PAGE_LABELS[projectPage]:newProject?'Nytt projekt':projectInformation?'Projektinformation':projectReports?'Rapporter':projectSettings?'Inställningar':mapping?")
s=s.replace("systemWorkspaces?'Systemadministration för projektytor':projectsView?PROJECT_PAGE_LABELS[projectPage]:newProject?'Nytt projekt':mapping?",
"systemWorkspaces?'Systemadministration för projektytor':projectsView?PROJECT_PAGE_LABELS[projectPage]:newProject?'Nytt projekt':projectInformation?'Projektinformation':projectReports?'Rapporter':projectSettings?'Inställningar':mapping?")
needle="{systemWorkspaces?<SystemWorkspacesView/>:projectsView?<ProjectsView projects={projects} selectedProjectId={projectId} selectedPage={projectPage} onSelectPage={selectProjectPage} onNewProject={()=>setView('new-project')} content={projectId?<ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenProjects={()=>setView('projects')} onOpenProjectDocuments={()=>setView('project-documents')} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} embedded selectedPage={projectPage}/>:undefined}/>:newProject?<MasterProjectsView"
replacement="{systemWorkspaces?<SystemWorkspacesView/>:projectsView?<ProjectsView projects={projects} selectedProjectId={projectId} selectedPage={projectPage} onSelectPage={selectProjectPage} onNewProject={()=>setView('new-project')} content={projectId?<ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenProjects={()=>setView('projects')} onOpenProjectDocuments={()=>setView('project-documents')} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} embedded selectedPage={projectPage}/>:undefined}/>:projectInformation&&projectId?<div className=\"standaloneProjectUtility\"><ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenProjects={()=>setView('projects')} onOpenProjectDocuments={()=>setView('project-documents')} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} embedded selectedPage=\"information\"/></div>:projectReports&&projectId?<div className=\"standaloneProjectUtility\"><ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenProjects={()=>setView('projects')} onOpenProjectDocuments={()=>setView('project-documents')} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} embedded selectedPage=\"reports\"/></div>:projectSettings&&projectId?<div className=\"standaloneProjectUtility\"><ProjectWorkspace projects={projects} projectId={projectId} onProjectChange={selectProject} onOpenProjects={()=>setView('projects')} onOpenProjectDocuments={()=>setView('project-documents')} onOpenGoverningDocuments={()=>setView('governing-documents')} onOpenGoverningMapping={()=>setView('governing-mapping')} mappingWarning={mappingWarning} embedded selectedPage=\"settings\"/></div>:newProject?<MasterProjectsView"
if needle not in s: raise SystemExit('render marker not found')
s=s.replace(needle,replacement,1)
s=s.replace("{projectsView&&projectId&&projectPage==='reports'&&<ProjectReportsMount projectId={projectId}/>}\n",
"{projectReports&&projectId&&<ProjectReportsMount projectId={projectId}/>}\n")
p.write_text(s)

p=Path('studio/src/project-utility-rail.ts')
s=p.read_text()
old="const shell=document.querySelector<HTMLElement>('.studioShell');const projectPage=shell?.dataset.projectPage||'';const pageUtility=projectPage==='information'?'Projektinformation':projectPage==='reports'?'Rapporter':projectPage==='settings'?'Inställningar':'';"
new="const shell=document.querySelector<HTMLElement>('.studioShell');const projectPage=shell?.dataset.projectPage||'';const pageUtility=shell?.classList.contains('view-project-information')?'Projektinformation':shell?.classList.contains('view-project-reports')?'Rapporter':shell?.classList.contains('view-project-settings')?'Inställningar':projectPage==='information'?'Projektinformation':projectPage==='reports'?'Rapporter':projectPage==='settings'?'Inställningar':'';"
if old not in s: raise SystemExit('utility active marker not found')
s=s.replace(old,new,1)
p.write_text(s)

for fn in ['ProjectInformationMount.tsx','ProjectReportsMount.tsx','SystemBackupSettingsMount.tsx','ProjectExecutionResetSettingsMount.tsx']:
 p=Path('studio/src')/fn
 s=p.read_text()
 s=s.replace("document.querySelector('.projectsLandingMain .projectMain .projectPage')","document.querySelector('.controlPlanMainRegion .embeddedProjectMain .projectPage')")
 s=s.replace("document.querySelector('.projectsLandingMain .projectMain')","document.querySelector('.controlPlanMainRegion .embeddedProjectMain')")
 p.write_text(s)

p=Path('studio/src/projects-view.css')
s=p.read_text()
if '.standaloneProjectUtility' not in s:
 s += "\n.standaloneProjectUtility{height:100%;min-height:0;overflow:auto;background:#f4f7f5}.standaloneProjectUtility>.embeddedProjectMain{min-height:100%;box-sizing:border-box}\n"
p.write_text(s)
