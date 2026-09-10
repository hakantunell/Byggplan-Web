from pathlib import Path

p=Path('studio/src/MasterProjectsView.tsx')
s=p.read_text()
s=s.replace("type Props={onProjectCreated?:(projectId:string)=>void;workspaceId?:string};", "type WorkspaceOption={id:string;name:string;role:string};\ntype Props={onProjectCreated?:(projectId:string)=>void;workspaceId?:string;workspaces?:WorkspaceOption[]};")
s=s.replace("export function MasterProjectsView({onProjectCreated,workspaceId}:Props){", "export function MasterProjectsView({onProjectCreated,workspaceId,workspaces=[]}:Props){")
s=s.replace("const[projects,setProjects]=useState<MasterProjectSummary[]>([]);", "const[targetWorkspaceId,setTargetWorkspaceId]=useState(workspaceId||workspaces[0]?.id||'');const[projects,setProjects]=useState<MasterProjectSummary[]>([]);")
s=s.replace("function openCreate(){setProjectName('');setPropertyDesignation('');setDeliveryMode('undecided');setMessage('');setCreateOpen(true)}", "function openCreate(){setProjectName('');setPropertyDesignation('');setDeliveryMode('undecided');setTargetWorkspaceId(workspaceId&&workspaces.some(w=>w.id===workspaceId)?workspaceId:(workspaces[0]?.id||''));setMessage('');setCreateOpen(true)}")
s=s.replace("body:JSON.stringify({name:projectName.trim(),propertyDesignation:propertyDesignation.trim(),deliveryMode,selectedModuleCodes:[...selectedModules],workspaceId})", "body:JSON.stringify({name:projectName.trim(),propertyDesignation:propertyDesignation.trim(),deliveryMode,selectedModuleCodes:[...selectedModules],workspaceId:targetWorkspaceId})")
needle='<div className="masterCreateFields"><label><span>Projektnamn</span><input autoFocus value={projectName} onChange={e=>setProjectName(e.target.value)}/></label>'
replacement='<div className="masterCreateFields">{workspaces.length>0&&<label><span>Projektyta</span><select value={targetWorkspaceId} onChange={e=>setTargetWorkspaceId(e.target.value)}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}<label><span>Projektnamn</span><input autoFocus value={projectName} onChange={e=>setProjectName(e.target.value)}/></label>'
assert needle in s
s=s.replace(needle,replacement,1)
s=s.replace("disabled={loading||!projectName.trim()}", "disabled={loading||!projectName.trim()||!targetWorkspaceId}",1)
p.write_text(s)

p=Path('studio/src/StudioShell.tsx')
s=p.read_text()
old="<MasterProjectsView onProjectCreated={openCreatedProject} workspaceId={current?.workspaceId}/>"
new="<MasterProjectsView onProjectCreated={openCreatedProject} workspaceId={current?.workspaceId} workspaces={auth.user?.workspaces||[]}/>"
assert old in s
s=s.replace(old,new,1)
p.write_text(s)
