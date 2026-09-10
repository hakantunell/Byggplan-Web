from pathlib import Path

# Studio auth model
p=Path('studio/src/AuthGate.tsx');s=p.read_text()
s=s.replace("export type AuthUser={id:string;email:string;displayName:string;globalRoles:string[];projects:Array<{id:string;name:string;roles:string[]}>};",
"export type AuthUser={id:string;email:string;displayName:string;globalRoles:string[];systemAdmin?:boolean;workspaces?:Array<{id:string;name:string;role:string}>;projects:Array<{id:string;name:string;workspaceId?:string;workspaceName?:string;roles:string[]}>};")
p.write_text(s)

# Field app auth model: project visibility now comes from workspace-scoped auth profile.
p=Path('src/AuthGate.tsx');s=p.read_text()
s=s.replace("type User={id:string;email:string;displayName:string;globalRoles:string[];projects:Array<{id:string;name:string;roles:string[]}>};",
"type User={id:string;email:string;displayName:string;globalRoles:string[];systemAdmin?:boolean;workspaces?:Array<{id:string;name:string;role:string}>;projects:Array<{id:string;name:string;workspaceId?:string;workspaceName?:string;roles:string[]}>};")
s=s.replace("const isAdmin=user.globalRoles.includes('admin');", "const isAdmin=Boolean(user.systemAdmin||user.globalRoles.includes('admin'));")
p.write_text(s)

# Master project creation attaches the new project to the currently selected workspace.
p=Path('studio/src/MasterProjectsView.tsx');s=p.read_text()
s=s.replace("type Props={onProjectCreated?:(projectId:string)=>void};", "type Props={onProjectCreated?:(projectId:string)=>void;workspaceId?:string};")
s=s.replace("export function MasterProjectsView({onProjectCreated}:Props){", "export function MasterProjectsView({onProjectCreated,workspaceId}:Props){")
s=s.replace("body:JSON.stringify({name:projectName.trim(),propertyDesignation:propertyDesignation.trim(),deliveryMode,selectedModuleCodes:[...selectedModules]})", "body:JSON.stringify({name:projectName.trim(),propertyDesignation:propertyDesignation.trim(),deliveryMode,selectedModuleCodes:[...selectedModules],workspaceId})")
p.write_text(s)

# Studio shell: system-only workspace administration menu and workspace-aware projects.
p=Path('studio/src/StudioShell.tsx');s=p.read_text()
s=s.replace("import { ProjectDocumentsWorkspace } from './ProjectDocumentsWorkspace';", "import { ProjectDocumentsWorkspace } from './ProjectDocumentsWorkspace';\nimport { SystemWorkspacesView } from './SystemWorkspacesView';")
s=s.replace("type StudioView='project'|'project-documents'|'governing-documents'|'governing-mapping'|'master-projects'|'users'|'control-plan'|'graphical-plan'|'backup';", "type StudioView='project'|'project-documents'|'governing-documents'|'governing-mapping'|'master-projects'|'users'|'control-plan'|'graphical-plan'|'backup'|'system-workspaces';")
s=s.replace("type Project={id:string;name:string;property_designation?:string;status?:string};", "type Project={id:string;name:string;property_designation?:string;status?:string;workspaceId?:string;workspaceName?:string};")
s=s.replace("const auth=useAuth();const isAdmin=Boolean(auth.user?.globalRoles.includes('admin'));", "const auth=useAuth();const isSystemAdmin=Boolean(auth.user?.systemAdmin);const isAdmin=Boolean(isSystemAdmin||auth.user?.globalRoles.includes('admin'));")
old="async function loadProjects(selectId?:string){if(auth.configured&&auth.user&&!isAdmin){applyProjects(auth.user.projects.map(p=>({id:p.id,name:p.name})),selectId);return}try{const response=await fetch(`${API_BASE}/api/projects`,{cache:'no-store'});const data=await response.json() as {projects?:Project[]};applyProjects(data.projects||[],selectId)}catch{setProjects([])}}"
new="async function loadProjects(selectId?:string){if(auth.configured&&auth.user){applyProjects(auth.user.projects.map(p=>({id:p.id,name:p.name,workspaceId:p.workspaceId,workspaceName:p.workspaceName})),selectId);return}try{const response=await fetch(`${API_BASE}/api/projects`,{cache:'no-store'});const data=await response.json() as {projects?:Project[]};applyProjects(data.projects||[],selectId)}catch{setProjects([])}}"
assert old in s;s=s.replace(old,new)
s=s.replace("const master=view==='master-projects',projectDocuments=view==='project-documents',mapping=view==='governing-mapping',users=view==='users',controlPlan=view==='control-plan',graphicalPlan=view==='graphical-plan',backup=view==='backup';", "const master=view==='master-projects',systemWorkspaces=view==='system-workspaces',projectDocuments=view==='project-documents',mapping=view==='governing-mapping',users=view==='users',controlPlan=view==='control-plan',graphicalPlan=view==='graphical-plan',backup=view==='backup';")
s=s.replace("<small>{master?'Masterprojekt':mapping?", "<small>{systemWorkspaces?'System · Projektytor':master?'Masterprojekt':mapping?")
s=s.replace("{!master&&<select value={projectId}", "{!master&&!systemWorkspaces&&<select value={projectId}")
rail="<button className={master?'active':''} title=\"Masterprojekt\" onClick={()=>setView('master-projects')}>🏠<span>Masterprojekt</span></button>"
assert rail in s
s=s.replace(rail, "{isSystemAdmin&&<button className={systemWorkspaces?'active':''} title=\"Systemadministration · Projektytor\" onClick={()=>setView('system-workspaces')}>🛡️<span>System</span></button>}"+rail)
s=s.replace("aria-label={master?'Masterprojekt':mapping?", "aria-label={systemWorkspaces?'Systemadministration för projektytor':master?'Masterprojekt':mapping?")
s=s.replace("{master?<MasterProjectsView onProjectCreated={openCreatedProject}/>:projectId?", "{systemWorkspaces?<SystemWorkspacesView/>:master?<MasterProjectsView onProjectCreated={openCreatedProject} workspaceId={current?.workspaceId}/>:projectId?")
p.write_text(s)
