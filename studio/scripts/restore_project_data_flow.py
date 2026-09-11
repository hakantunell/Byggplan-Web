from pathlib import Path
import subprocess

BASE='b511ad268170881994252beb9602659d7d7ceb8d'
FILES=[
 'studio/src/ProjectWorkspace.tsx',
 'studio/src/ProjectActivitiesView.tsx',
 'studio/src/ProjectAdministrationEditor.tsx',
 'studio/src/ProjectConditionsView.tsx',
 'studio/src/ProjectsView.tsx',
]
for path in FILES:
    content=subprocess.check_output(['git','show',f'{BASE}:{path}'])
    Path(path).write_bytes(content)

# Keep the permanent project tree fix but make only the selected child page visually active.
p=Path('studio/src/ProjectsView.tsx')
s=p.read_text()
s=s.replace("<div className={`projectsProjectRow ${active?'active':''}`} role=\"treeitem\">","<div className=\"projectsProjectRow\" role=\"treeitem\">")
p.write_text(s)

# The global Project rail is a section selector. Do not show it with the same primary active state
# while a concrete project subpage is selected; the tree child is the active navigation target.
p=Path('studio/src/StudioShell.tsx')
s=p.read_text()
old='<button className={projectsView||newProject?\'active\':\'\'} title="Projekt" onClick={()=>setView(\'projects\')}>🌳<span>Projekt</span></button>'
new='<button className={newProject||(!projectId&&projectsView)?\'active\':\'\'} title="Projekt" onClick={()=>setView(\'projects\')}>🌳<span>Projekt</span></button>'
if old not in s:
    raise SystemExit('Project rail active marker not found')
s=s.replace(old,new,1)
p.write_text(s)

cache=Path('studio/src/project-data-cache.ts')
if cache.exists(): cache.unlink()
