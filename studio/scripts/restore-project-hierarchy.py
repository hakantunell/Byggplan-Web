from pathlib import Path
p=Path('studio/src/ProjectWorkspace.tsx')
s=p.read_text()
old="const[structure,setStructure]=useState<Structure>(EMPTY),[meta,setMeta]=useState<Map<string,Meta>>(new Map()),[selection,setSelection]=useState<Selection>({kind:'page',page:'overview'}),[expanded,setExpanded]=useState<Set<string>>(new Set(['page:activities'])),[editMode,setEditMode]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState('');"
new="const[structure,setStructure]=useState<Structure>(EMPTY),[meta,setMeta]=useState<Map<string,Meta>>(new Map()),[selection,setSelection]=useState<Selection>({kind:'page',page:'overview'}),[externalSelection,setExternalSelection]=useState<Node|null>(null),[expanded,setExpanded]=useState<Set<string>>(new Set(['page:activities'])),[editMode,setEditMode]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState('');"
assert old in s
s=s.replace(old,new,1)
old="setStructure(next);setMeta(nextMeta)"
new="setStructure(next);setMeta(nextMeta);window.dispatchEvent(new CustomEvent('byggplan:project-structure-loaded',{detail:{projectId,structure:next}}))"
assert old in s
s=s.replace(old,new,1)
old="useEffect(()=>{if(selectedPage)setSelection({kind:'page',page:selectedPage})},[selectedPage]);"
new="useEffect(()=>{if(selectedPage){setSelection({kind:'page',page:selectedPage});if(selectedPage!=='activities')setExternalSelection(null)}},[selectedPage]);\n useEffect(()=>{if(!embedded)return;const onSelect=(event:Event)=>{const detail=(event as CustomEvent<{projectId?:string;kind?:Node['kind'];id?:string}>).detail;if(detail?.projectId!==projectId||!detail.kind||!detail.id)return;setExternalSelection({kind:detail.kind,id:detail.id})};const onClear=(event:Event)=>{const detail=(event as CustomEvent<{projectId?:string}>).detail;if(detail?.projectId===projectId)setExternalSelection(null)};window.addEventListener('byggplan:project-tree-select',onSelect);window.addEventListener('byggplan:project-tree-clear-selection',onClear);return()=>{window.removeEventListener('byggplan:project-tree-select',onSelect);window.removeEventListener('byggplan:project-tree-clear-selection',onClear)}},[embedded,projectId]);"
assert old in s
s=s.replace(old,new,1)
old="const effectiveSelection:Selection=embedded&&selectedPage?{kind:'page',page:selectedPage}:selection;"
new="const effectiveSelection:Selection=embedded&&selectedPage?(selectedPage==='activities'&&externalSelection?externalSelection:{kind:'page',page:selectedPage}):selection;"
assert old in s
s=s.replace(old,new,1)
p.write_text(s)

css=Path('studio/src/projects-view.css')
c=css.read_text()
c += '''\n/* Full project hierarchy, matching the former ProjectWorkspace tree. */\n.projectsHierarchyBranch{display:grid;gap:1px}.projectsHierarchyRow{display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;min-width:0}.projectsHierarchyPage{padding-left:0}.projectsTreeGroup .projectsHierarchyToggle{display:flex;align-items:center;justify-content:center;width:18px;min-width:18px;padding:0;border:0;background:transparent;color:#60756a;cursor:pointer}.projectsHierarchySpacer{width:18px}.projectsTreeGroup .projectsHierarchySelect{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:5px;min-width:0;padding:7px 8px;border:0;background:transparent;border-radius:6px;text-align:left;color:#52665b;cursor:pointer}.projectsHierarchySelect>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projectsHierarchySelect small{font-size:10px;color:#7b8b82}.projectsHierarchyRow:hover>.projectsHierarchySelect{background:#f1f6f3}.projectsHierarchyRow.selectedProjectPage>.projectsHierarchySelect,.projectsHierarchyRow.selectedProjectNode>.projectsHierarchySelect{background:#dfeee5;color:#173f2d;font-weight:800;box-shadow:inset 0 0 0 1px #bfd5c6}.projectsHierarchyRow.selectedProjectPage>.projectsHierarchyToggle,.projectsHierarchyRow.selectedProjectNode>.projectsHierarchyToggle{color:#173f2d}\n'''
css.write_text(c)
