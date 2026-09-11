from pathlib import Path

# ProjectsView: only subpage is active; root project row should not look selected.
p=Path('studio/src/ProjectsView.tsx')
s=p.read_text()
s=s.replace("const open=expanded.has(project.id),active=project.id===selectedProjectId;return <div className=\"projectsProjectNode\" key={project.id}>\n      <div className={`projectsProjectRow ${active?'active':''}`} role=\"treeitem\">",
            "const open=expanded.has(project.id),active=project.id===selectedProjectId;return <div className=\"projectsProjectNode\" key={project.id}>\n      <div className=\"projectsProjectRow\" role=\"treeitem\">")
p.write_text(s)

# ProjectWorkspace: cache structure + metadata between menu switches / remounts.
p=Path('studio/src/ProjectWorkspace.tsx')
s=p.read_text()
s=s.replace("import { ApiBrowser } from './ApiBrowser';\n", "import { ApiBrowser } from './ApiBrowser';\nimport { readProjectCache,writeProjectCache,invalidateProjectCachePrefix } from './project-data-cache';\n")
old="async function load(){if(!projectId)return;setLoading(true);try{const[sr,mr]=await Promise.all([fetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'})]);if(!sr.ok)throw new Error('Kunde inte läsa projektstrukturen.');const next=await sr.json() as Structure;let nextMeta=new Map<string,Meta>();if(mr.ok){const md=await mr.json() as {items?:Meta[]};nextMeta=new Map((md.items||[]).map(x=>[x.activity_id,x]));next.activities=next.activities.filter(a=>nextMeta.get(a.id)?.applicability!=='deprecated')}setStructure(next);setMeta(nextMeta)}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa projektet.')}finally{setLoading(false)}}"
new="async function load(force=false){if(!projectId)return;const key=`workspace:${projectId}`;if(!force){const cached=readProjectCache<{structure:Structure;meta:Meta[]}>(key);if(cached){setStructure(cached.structure);setMeta(new Map(cached.meta.map(x=>[x.activity_id,x])));setLoading(false);return}}setLoading(true);try{const[sr,mr]=await Promise.all([fetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'})]);if(!sr.ok)throw new Error('Kunde inte läsa projektstrukturen.');const next=await sr.json() as Structure;let metaItems:Meta[]=[];let nextMeta=new Map<string,Meta>();if(mr.ok){const md=await mr.json() as {items?:Meta[]};metaItems=md.items||[];nextMeta=new Map(metaItems.map(x=>[x.activity_id,x]));next.activities=next.activities.filter(a=>nextMeta.get(a.id)?.applicability!=='deprecated')}setStructure(next);setMeta(nextMeta);writeProjectCache(key,{structure:next,meta:metaItems})}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa projektet.')}finally{setLoading(false)}}"
if old not in s: raise SystemExit('ProjectWorkspace load marker missing')
s=s.replace(old,new,1)
# After structural mutations, invalidate project caches before reload.
s=s.replace("setMessage('Sparat');await reload()", "setMessage('Sparat');invalidateProjectCachePrefix(`workspace:${projectIdFor(selection,structure)}`);await reload(true as any)")
s=s.replace("if(r.ok)await reload();else setMessage('Kunde inte skapa objektet.')", "if(r.ok){invalidateProjectCachePrefix(`workspace:${projectIdFor(selection,structure)}`);await reload(true as any)}else setMessage('Kunde inte skapa objektet.')")
s=s.replace("setMessage('Borttaget');await reload()", "setMessage('Borttaget');invalidateProjectCachePrefix(`workspace:${projectIdFor(selection,structure)}`);await reload(true as any)")
# Keep type compatible with functions receiving reload.
s=s.replace("reload:()=>Promise<void>", "reload:(force?:boolean)=>Promise<void>")
p.write_text(s)

# Activities cache.
p=Path('studio/src/ProjectActivitiesView.tsx')
s=p.read_text()
s=s.replace("import { ActivityOwnDocumentationReadout } from './ActivityOwnDocumentationReadout';\n", "import { ActivityOwnDocumentationReadout } from './ActivityOwnDocumentationReadout';\nimport { readProjectCache,writeProjectCache,invalidateProjectCache } from './project-data-cache';\n")
old="async function load(){setLoading(true);setMessage('');try{const[tr,mr]=await Promise.all([fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'})]);if(!tr.ok)throw new Error('Kunde inte läsa aktiviteter.');const td=await tr.json() as {tasks?:Task[]};setTasks(td.tasks||[]);if(mr.ok){const md=await mr.json() as {items?:Meta[]};setMeta(new Map((md.items||[]).map(x=>[x.activity_id,x])))}else setMeta(new Map())}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa aktiviteter.')}finally{setLoading(false)}}"
new="async function load(force=false){const key=`activities:${projectId}`;if(!force){const cached=readProjectCache<{tasks:Task[];meta:Meta[]}>(key);if(cached){setTasks(cached.tasks);setMeta(new Map(cached.meta.map(x=>[x.activity_id,x])));setLoading(false);return}}setLoading(true);setMessage('');try{const[tr,mr]=await Promise.all([fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'})]);if(!tr.ok)throw new Error('Kunde inte läsa aktiviteter.');const td=await tr.json() as {tasks?:Task[]};const nextTasks=td.tasks||[];let metaItems:Meta[]=[];setTasks(nextTasks);if(mr.ok){const md=await mr.json() as {items?:Meta[]};metaItems=md.items||[];setMeta(new Map(metaItems.map(x=>[x.activity_id,x])))}else setMeta(new Map());writeProjectCache(key,{tasks:nextTasks,meta:metaItems})}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa aktiviteter.')}finally{setLoading(false)}}"
if old not in s: raise SystemExit('activities load marker missing')
s=s.replace(old,new,1)
s=s.replace("window.dispatchEvent(new CustomEvent('byggplan:activity-status-changed',{detail:{activityId:a.id,done:nextDone,projectId}}));void load()", "invalidateProjectCache(`activities:${projectId}`);window.dispatchEvent(new CustomEvent('byggplan:activity-status-changed',{detail:{activityId:a.id,done:nextDone,projectId}}))")
s=s.replace("<button onClick={()=>void load()}>↻ Uppdatera</button>", "<button onClick={()=>void load(true)}>↻ Uppdatera</button>")
s=s.replace("await reload()", "await reload(true)")
s=s.replace("reload:()=>Promise<void>", "reload:(force?:boolean)=>Promise<void>")
p.write_text(s)

# Administration cache.
p=Path('studio/src/ProjectAdministrationEditor.tsx')
s=p.read_text()
s=s.replace("import { useEffect,useState } from 'react';\n", "import { useEffect,useState } from 'react';\nimport { readProjectCache,writeProjectCache,invalidateProjectCache } from './project-data-cache';\n")
old="async function load(){setLoading(true);setMessage('');try{const r=await fetch(`/api/studio/project-administration?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {items?:Item[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa administrativa kontrollpunkter.');setItems(d.items||[])}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa administrativa kontrollpunkter.')}finally{setLoading(false)}}"
new="async function load(force=false){const key=`administration:${projectId}`;if(!force){const cached=readProjectCache<Item[]>(key);if(cached){setItems(cached);setLoading(false);return}}setLoading(true);setMessage('');try{const r=await fetch(`/api/studio/project-administration?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {items?:Item[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa administrativa kontrollpunkter.');const next=d.items||[];setItems(next);writeProjectCache(key,next)}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa administrativa kontrollpunkter.')}finally{setLoading(false)}}"
if old not in s: raise SystemExit('admin load marker missing')
s=s.replace(old,new,1)
s=s.replace("await load()", "invalidateProjectCache(`administration:${projectId}`);await load(true)")
p.write_text(s)

# Conditions cache.
p=Path('studio/src/ProjectConditionsView.tsx')
s=p.read_text()
s=s.replace("import { useEffect,useMemo,useState } from 'react';\n", "import { useEffect,useMemo,useState } from 'react';\nimport { readProjectCache,writeProjectCache,invalidateProjectCache } from './project-data-cache';\n")
old="async function load(){setLoading(true);setMessage('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/project-conditions`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {conditions?:Condition[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa projektvillkor.');setItems(d.conditions||[])}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa projektvillkor.')}finally{setLoading(false)}}"
new="async function load(force=false){const key=`conditions:${projectId}`;if(!force){const cached=readProjectCache<Condition[]>(key);if(cached){setItems(cached);setLoading(false);return}}setLoading(true);setMessage('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/project-conditions`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {conditions?:Condition[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa projektvillkor.');const next=d.conditions||[];setItems(next);writeProjectCache(key,next)}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa projektvillkor.')}finally{setLoading(false)}}"
if old not in s: raise SystemExit('conditions load marker missing')
s=s.replace(old,new,1)
s=s.replace("await load()", "invalidateProjectCache(`conditions:${projectId}`);await load(true)")
p.write_text(s)

# Project information diagnostics cache.
p=Path('studio/src/ProjectWorkspace.tsx')
s=p.read_text()
old="async function load(){try{await fetch('/api/studio/master-projects',{cache:'no-store'});const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/master-diagnostics`,{cache:'no-store'});const d=await r.json();setData(d.diagnostics||null)}catch{setData(null)}}"
new="async function load(force=false){const key=`project-info:${projectId}`;if(!force){const cached=readProjectCache<any>(key);if(cached!==undefined){setData(cached);return}}try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/master-diagnostics`,{cache:'no-store'});const d=await r.json();const next=d.diagnostics||null;setData(next);writeProjectCache(key,next)}catch{setData(null)}}"
if old not in s: raise SystemExit('project info load marker missing')
s=s.replace(old,new,1)
s=s.replace("await load();setMessage(`Klart:", "invalidateProjectCache(`project-info:${projectId}`);await load(true);setMessage(`Klart:")
p.write_text(s)
