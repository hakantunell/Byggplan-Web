from pathlib import Path

studio=Path('studio/src/ProjectDocumentsWorkspace.tsx')
s=studio.read_text()
old="type Measurement={id:string;a:Point;b:Point;label:string;description?:string;visible:boolean};"
new="type Measurement={id:string;a:Point;b:Point;label:string;description?:string;visible:boolean;offset?:number};"
assert old in s
s=s.replace(old,new,1)
old="{id:crypto.randomUUID(),a:next[0],b:next[1],label:'',description:'',visible:true}"
new="{id:crypto.randomUUID(),a:next[0],b:next[1],label:'',description:'',visible:true,offset:0}"
assert old in s
s=s.replace(old,new,1)
needle="function editMeasurement(id:string,patch:Partial<Pick<Measurement,'label'|'description'>>){updatePage({...pageState,measurements:pageState.measurements.map(m=>m.id===id?{...m,...patch}:m)})}"
assert needle in s
insert=needle+"\n function setMeasurementOffset(id:string,offset:number,final:boolean){if(!stateKey)return;setStates(current=>{const currentPage=current[stateKey]||{measurements:[]};const nextPage={...currentPage,measurements:currentPage.measurements.map(m=>m.id===id?{...m,offset}:m)};const value={...current,[stateKey]:nextPage};if(final)void saveSharedState(projectId,value);else writeState(projectId,value);return value})}"
s=s.replace(needle,insert,1)
oldcall='<DrawingOverlay targetRef={isPdf?canvasRef:imageRef} pageState={pageState} pending={pending} cursorPoint={cursorPoint} tool={tool} showMeasurements={showMeasurements} measuredMm={measuredMm}/><Magnifier'
newcall='<DrawingOverlay targetRef={isPdf?canvasRef:imageRef} pageState={pageState} pending={pending} cursorPoint={cursorPoint} tool={tool} showMeasurements={false} measuredMm={measuredMm}/><DimensionOverlay targetRef={isPdf?canvasRef:imageRef} pageState={pageState} tool={tool} showMeasurements={showMeasurements} measuredMm={measuredMm} onOffsetChange={setMeasurementOffset}/><Magnifier'
assert oldcall in s
s=s.replace(oldcall,newcall,1)
marker='function DrawingOverlay'
idx=s.find(marker)
assert idx>=0
component='''function DimensionOverlay({targetRef,pageState,tool,showMeasurements,measuredMm,onOffsetChange}:{targetRef:React.RefObject<HTMLCanvasElement|null>|React.RefObject<HTMLImageElement|null>;pageState:PageState;tool:Tool;showMeasurements:boolean;measuredMm:(m:Measurement)=>number;onOffsetChange:(id:string,offset:number,final:boolean)=>void}){
 const[size,setSize]=useState({w:0,h:0});const dragRef=useRef<{id:string;pointerId:number}|null>(null);
 useEffect(()=>{const target=targetRef.current;if(!target)return;const update=()=>{const r=target.getBoundingClientRect();setSize({w:r.width,h:r.height})};update();const ro=new ResizeObserver(update);ro.observe(target);return()=>ro.disconnect()},[targetRef.current]);
 if(!showMeasurements||!size.w||!size.h)return null;
 const min=Math.max(1,Math.min(size.w,size.h));
 const geometry=(m:Measurement)=>{const ax=m.a.x*size.w,ay=m.a.y*size.h,bx=m.b.x*size.w,by=m.b.y*size.h;const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,off=(m.offset||0)*min;return{ax,ay,bx,by,a2x:ax+nx*off,a2y:ay+ny*off,b2x:bx+nx*off,b2y:by+ny*off,mx:(ax+bx)/2+nx*off,my:(ay+by)/2+ny*off,nx,ny}};
 const offsetFromEvent=(m:Measurement,e:React.PointerEvent<SVGLineElement>)=>{const target=targetRef.current;if(!target)return m.offset||0;const r=target.getBoundingClientRect(),g=geometry(m);const ox=(m.a.x+m.b.x)*size.w/2,oy=(m.a.y+m.b.y)*size.h/2;return (((e.clientX-r.left)-ox)*g.nx+((e.clientY-r.top)-oy)*g.ny)/min};
 return <svg className="dimensionOffsetOverlay" width={size.w} height={size.h} style={{position:'absolute',left:0,top:0,overflow:'visible',pointerEvents:'none',zIndex:3}}>{pageState.measurements.filter(m=>m.visible).map(m=>{const g=geometry(m),text=formatMm(measuredMm(m)),label=m.label?`${m.label} · ${text}`:text,w=Math.max(36,label.length*5.6+10);return <g key={m.id}>
   {(m.offset||0)!==0&&<><line x1={g.ax} y1={g.ay} x2={g.a2x} y2={g.a2y} stroke="#d07a22" strokeWidth="1"/><line x1={g.bx} y1={g.by} x2={g.b2x} y2={g.b2y} stroke="#d07a22" strokeWidth="1"/></>}
   <line x1={g.a2x} y1={g.a2y} x2={g.b2x} y2={g.b2y} stroke="#d07a22" strokeWidth="1.5"/>
   <circle cx={g.a2x} cy={g.a2y} r="2.5" fill="#fff" stroke="#d07a22" strokeWidth="1.4"/><circle cx={g.b2x} cy={g.b2y} r="2.5" fill="#fff" stroke="#d07a22" strokeWidth="1.4"/>
   <rect x={g.mx-w/2} y={g.my-8} width={w} height="16" rx="3" fill="rgba(255,255,255,.86)" stroke="rgba(208,122,34,.72)"/><text x={g.mx} y={g.my+3.2} textAnchor="middle" fontSize="9" fontWeight="600" fill="#70420c">{label}</text>
   <line x1={g.a2x} y1={g.a2y} x2={g.b2x} y2={g.b2y} stroke="transparent" strokeWidth="18" style={{pointerEvents:tool==='hand'?'stroke':'none',cursor:'grab'}} onPointerDown={e=>{e.stopPropagation();dragRef.current={id:m.id,pointerId:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(dragRef.current?.id!==m.id)return;e.stopPropagation();onOffsetChange(m.id,offsetFromEvent(m,e),false)}} onPointerUp={e=>{if(dragRef.current?.id!==m.id)return;e.stopPropagation();onOffsetChange(m.id,offsetFromEvent(m,e),true);dragRef.current=null}} onPointerCancel={()=>{dragRef.current=null}}/>
  </g>})}</svg>;
}

'''
s=s[:idx]+component+s[idx:]
studio.write_text(s)

app=Path('src/DrawingAnnotations.tsx')
a=app.read_text()
old="type DrawingMeasurement={id:string;a:DrawingPoint;b:DrawingPoint;label:string;description?:string;visible:boolean};"
new="type DrawingMeasurement={id:string;a:DrawingPoint;b:DrawingPoint;label:string;description?:string;visible:boolean;offset?:number};"
assert old in a
a=a.replace(old,new,1)
old='  const canvasRef=useRef<HTMLCanvasElement>(null);'
new='  const canvasRef=useRef<HTMLCanvasElement>(null);\n  const imageRef=useRef<HTMLImageElement>(null);'
assert old in a
a=a.replace(old,new,1)
old='  const media=file.contentType.startsWith(\'image/\')?<img className="drawingAnnotatedImage" src={objectUrl} alt={title}/>:<canvas ref={canvasRef}/>;'
new='  const media=file.contentType.startsWith(\'image/\')?<img ref={imageRef} className="drawingAnnotatedImage" src={objectUrl} alt={title}/>:<canvas ref={canvasRef}/>;'
assert old in a
a=a.replace(old,new,1)
start=a.find('        {showMeasurements&&currentMeasurements.length>0&&<div aria-hidden="true"')
end=a.find('        <div className="drawingMarkerLayer">',start)
assert start>=0 and end>start
replacement='        {showMeasurements&&currentMeasurements.length>0&&<ReadOnlyDimensionOverlay targetRef={file.contentType.startsWith(\'image/\')?imageRef:canvasRef} measurements={currentMeasurements} measuredMm={measuredMm}/>}\n'
a=a[:start]+replacement+a[end:]
marker='export function DrawingAnnotations'
idx=a.find(marker)
assert idx>=0
component='''function ReadOnlyDimensionOverlay({targetRef,measurements,measuredMm}:{targetRef:React.RefObject<HTMLCanvasElement|null>|React.RefObject<HTMLImageElement|null>;measurements:DrawingMeasurement[];measuredMm:(m:DrawingMeasurement)=>number}){
  const[size,setSize]=useState({w:0,h:0});
  useEffect(()=>{const target=targetRef.current;if(!target)return;const update=()=>{const r=target.getBoundingClientRect();setSize({w:r.width,h:r.height})};update();const ro=new ResizeObserver(update);ro.observe(target);return()=>ro.disconnect()},[targetRef.current]);
  if(!size.w||!size.h)return null;const min=Math.max(1,Math.min(size.w,size.h));
  const geometry=(m:DrawingMeasurement)=>{const ax=m.a.x*size.w,ay=m.a.y*size.h,bx=m.b.x*size.w,by=m.b.y*size.h,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,off=(m.offset||0)*min;return{ax,ay,bx,by,a2x:ax+nx*off,a2y:ay+ny*off,b2x:bx+nx*off,b2y:by+ny*off,mx:(ax+bx)/2+nx*off,my:(ay+by)/2+ny*off}};
  return <svg width={size.w} height={size.h} aria-hidden="true" style={{position:'absolute',left:0,top:0,overflow:'visible',pointerEvents:'none',zIndex:2}}>{measurements.map(m=>{const g=geometry(m),mm=measuredMm(m),text=[m.label,mm?formatMm(mm):''].filter(Boolean).join(' · '),w=Math.max(40,text.length*6+10);return <g key={m.id}>{(m.offset||0)!==0&&<><line x1={g.ax} y1={g.ay} x2={g.a2x} y2={g.a2y} stroke="#c56f18" strokeWidth="1"/><line x1={g.bx} y1={g.by} x2={g.b2x} y2={g.b2y} stroke="#c56f18" strokeWidth="1"/></>}<line x1={g.a2x} y1={g.a2y} x2={g.b2x} y2={g.b2y} stroke="#c56f18" strokeWidth="1.5"/><circle cx={g.a2x} cy={g.a2y} r="2.5" fill="#fff" stroke="#c56f18" strokeWidth="1.4"/><circle cx={g.b2x} cy={g.b2y} r="2.5" fill="#fff" stroke="#c56f18" strokeWidth="1.4"/>{text&&<><rect x={g.mx-w/2} y={g.my-9} width={w} height="18" rx="4" fill="rgba(255,255,255,.86)" stroke="rgba(197,111,24,.65)"/><text x={g.mx} y={g.my+3.7} textAnchor="middle" fontSize="11" fontWeight="600" fill="#6d430d">{text}</text></>}</g>})}</svg>;
}

'''
a=a[:idx]+component+a[idx:]
app.write_text(a)
