from pathlib import Path

p=Path('studio/src/ProjectDocumentsWorkspace.tsx')
s=p.read_text()
s=s.replace("import { useEffect,useMemo,useRef,useState } from 'react';", "import { useEffect,useMemo,useRef,useState } from 'react';\nimport { createPortal } from 'react-dom';", 1)
old=""" const[tab,setTab]=useState<'documents'|'drawings'>('documents');
 const[editMode,setEditMode]=useState(false);
 return <div className="projectDocumentsWorkspace"><header className="projectDocumentsWorkspaceHeader"><div><small>PROJEKTDOKUMENT</small><h1>{projectName||'Projektdokument'}</h1><p>Dokument och ritningar för hela projektet.</p></div><div className="projectDocumentsWorkspaceActions"><button className={editMode?'active':''} onClick={()=>setEditMode(v=>!v)}>✎ {editMode?'Klar':'Redigera dokument'}</button></div></header><nav className="projectDocumentsTabs"><button className={tab==='documents'?'active':''} onClick={()=>setTab('documents')}>Dokument</button><button className={tab==='drawings'?'active':''} onClick={()=>setTab('drawings')}>Ritningar & mätning</button></nav>{tab==='documents'?<ProjectDocumentsEditor projectId={projectId} externalEditMode={editMode}/>:<DrawingMeasurementView projectId={projectId}/>}</div>"""
new=""" const[tab,setTab]=useState<'documents'|'drawings'>('documents');
 const[editMode,setEditMode]=useState(false);
 const drawingToolsHostRef=useRef<HTMLDivElement|null>(null);
 return <div className="projectDocumentsWorkspace"><header className="projectDocumentsWorkspaceHeader compact"><div className="projectDocumentsTitle"><small>PROJEKTDOKUMENT</small><h1>{projectName||'Projektdokument'}</h1><p>Dokument och ritningar för hela projektet.</p></div><nav className="projectDocumentsTabs"><button className={tab==='documents'?'active':''} onClick={()=>setTab('documents')}>Dokument</button><button className={tab==='drawings'?'active':''} onClick={()=>setTab('drawings')}>Ritningar & mätning</button></nav><div className="projectDocumentsHeaderTools" ref={drawingToolsHostRef}>{tab==='documents'&&<div className="projectDocumentsWorkspaceActions"><button className={editMode?'active':''} onClick={()=>setEditMode(v=>!v)}>✎ {editMode?'Klar':'Redigera dokument'}</button></div>}</div></header>{tab==='documents'?<ProjectDocumentsEditor projectId={projectId} externalEditMode={editMode}/>:<DrawingMeasurementView projectId={projectId} toolbarHost={drawingToolsHostRef.current}/>}</div>"""
assert old in s, 'workspace header block not found'
s=s.replace(old,new,1)
s=s.replace("function DrawingMeasurementView({projectId}:{projectId:string}){", "function DrawingMeasurementView({projectId,toolbarHost}:{projectId:string;toolbarHost:HTMLDivElement|null}){", 1)
start='<section className="drawingMain"><div className="drawingToolbar">'
end='</div>{message&&<div className="projectSupportMessage compact">{message}</div>}<div className="drawingBody">'
i=s.find(start)
assert i>=0, 'drawing toolbar start not found'
j=s.find(end,i)
assert j>=0, 'drawing toolbar end not found'
toolbar=s[i+len('<section className="drawingMain">'):j+len('</div>')]
replacement='<section className="drawingMain">{toolbarHost&&createPortal('+toolbar+',toolbarHost)}{message&&<div className="projectSupportMessage compact">{message}</div>}<div className="drawingBody">'
s=s[:i]+replacement+s[j+len(end):]
p.write_text(s)

p=Path('studio/src/project-documents-workspace.css')
c=p.read_text()
c += '''
.projectDocumentsWorkspaceHeader.compact{display:grid;grid-template-columns:minmax(210px,auto) auto minmax(0,1fr);align-items:center;gap:14px;padding:8px 18px;min-height:58px}.projectDocumentsTitle{min-width:0}.projectDocumentsWorkspaceHeader.compact h1{font-size:18px;margin:1px 0 0;line-height:1.05}.projectDocumentsWorkspaceHeader.compact .projectDocumentsTitle>small{font-size:8px}.projectDocumentsWorkspaceHeader.compact .projectDocumentsTitle>p{display:none}.projectDocumentsWorkspaceHeader.compact .projectDocumentsTabs{padding:0;border:0;background:transparent;white-space:nowrap}.projectDocumentsHeaderTools{min-width:0;display:flex;justify-content:flex-end;align-items:center}.projectDocumentsHeaderTools .drawingToolbar{width:100%;padding:0;border:0;background:transparent;justify-content:flex-end;flex-wrap:nowrap;gap:7px}.projectDocumentsHeaderTools .drawingTools{flex:0 1 auto;justify-content:flex-end}.projectDocumentsHeaderTools .drawingFilePicker select{max-width:170px}.projectDocumentsHeaderTools .drawingPages{white-space:nowrap}.projectDocumentsHeaderTools .drawingToolbar button{padding:6px 8px}.drawingMain>.drawingToolbar{display:none}.drawingBody{min-height:0;flex:1}.drawingStageViewport{padding-top:18px}
@media(max-width:1250px){.projectDocumentsWorkspaceHeader.compact{grid-template-columns:190px auto minmax(0,1fr);gap:8px;padding-left:12px;padding-right:12px}.projectDocumentsHeaderTools .drawingToolbar{gap:4px}.projectDocumentsHeaderTools .drawingToolbar button{padding:5px 6px;font-size:10px}.projectDocumentsHeaderTools .drawingZoom{min-width:34px}.projectDocumentsHeaderTools .drawingFilePicker{display:none}}
'''
p.write_text(c)
