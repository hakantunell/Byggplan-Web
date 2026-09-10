from pathlib import Path
import re

studio=Path('studio/src/ProjectDocumentsWorkspace.tsx')
s=studio.read_text()

old="type AngleMeasurement={id:string;center:Point;a:Point;b:Point;label:string;description?:string;visible:boolean;labelOffset?:Point};"
new="type AngleMeasurement={id:string;center:Point;a:Point;b:Point;label:string;description?:string;visible:boolean;labelOffset?:Point;arcRadius?:number};"
assert old in s
s=s.replace(old,new,1)

old="const canvasRef=useRef<HTMLCanvasElement|null>(null);const imageRef=useRef<HTMLImageElement|null>(null);const stageRef=useRef<HTMLDivElement|null>(null);const viewportRef=useRef<HTMLDivElement|null>(null);const offsetSaveTimerRef=useRef<number|null>(null);"
new="const canvasRef=useRef<HTMLCanvasElement|null>(null);const imageRef=useRef<HTMLImageElement|null>(null);const stageRef=useRef<HTMLDivElement|null>(null);const viewportRef=useRef<HTMLDivElement|null>(null);const offsetSaveTimerRef=useRef<number|null>(null);const snapCanvasRef=useRef<HTMLCanvasElement|null>(null);"
assert old in s
s=s.replace(old,new,1)

old="function snapPoint(origin:Point,point:Point,enabled:boolean):Point{if(!enabled)return point;const target=isPdf?canvasRef.current:imageRef.current;if(!target)return point;const rect=target.getBoundingClientRect();const dx=(point.x-origin.x)*rect.width,dy=(point.y-origin.y)*rect.height;const length=Math.hypot(dx,dy);if(!length)return point;const step=Math.PI/4;const angle=Math.round(Math.atan2(dy,dx)/step)*step;return{x:origin.x+Math.cos(angle)*length/rect.width,y:origin.y+Math.sin(angle)*length/rect.height}}\n function previewPoint(point:Point|null,shift:boolean){return point&&pending.length>=1?snapPoint(pending[0],point,shift):point}"
new="""function snapPoint(origin:Point,point:Point,enabled:boolean):Point{if(!enabled)return point;const target=isPdf?canvasRef.current:imageRef.current;if(!target)return point;const rect=target.getBoundingClientRect();const dx=(point.x-origin.x)*rect.width,dy=(point.y-origin.y)*rect.height;const length=Math.hypot(dx,dy);if(!length)return point;const step=Math.PI/4;const angle=Math.round(Math.atan2(dy,dx)/step)*step;return{x:origin.x+Math.cos(angle)*length/rect.width,y:origin.y+Math.sin(angle)*length/rect.height}}
 function altGraphHeld(e:React.PointerEvent<HTMLDivElement>){return Boolean(e.getModifierState?.('AltGraph')||(e.altKey&&e.ctrlKey))}
 function snapToDrawing(point:Point,enabled:boolean):Point{if(!enabled)return point;const target=isPdf?canvasRef.current:imageRef.current;if(!target)return point;const rect=target.getBoundingClientRect();if(!rect.width||!rect.height)return point;const sourceW=target instanceof HTMLCanvasElement?target.width:target.naturalWidth,sourceH=target instanceof HTMLCanvasElement?target.height:target.naturalHeight;if(!sourceW||!sourceH)return point;const sample=snapCanvasRef.current||(snapCanvasRef.current=window.document.createElement('canvas'));const n=31;sample.width=n;sample.height=n;const ctx=sample.getContext('2d',{willReadFrequently:true});if(!ctx)return point;const screenRadius=14,rx=screenRadius*sourceW/rect.width,ry=screenRadius*sourceH/rect.height,sx=point.x*sourceW,sy=point.y*sourceH;try{ctx.clearRect(0,0,n,n);ctx.drawImage(target,sx-rx,sy-ry,rx*2,ry*2,0,0,n,n);const data=ctx.getImageData(0,0,n,n).data;const lum=(x:number,y:number)=>{if(x<0||y<0||x>=n||y>=n)return 255;const i=(y*n+x)*4;if(data[i+3]<80)return 255;return data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722};let bestX=-1,bestY=-1,best=1e9;const c=(n-1)/2;for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const l=lum(x,y);if(l>195)continue;const dist=Math.hypot(x-c,y-c);const h=lum(x-2,y)<205||lum(x+2,y)<205,v=lum(x,y-2)<205||lum(x,y+2)<205,d1=lum(x-2,y-2)<205||lum(x+2,y+2)<205,d2=lum(x+2,y-2)<205||lum(x-2,y+2)<205;const dirs=Number(h)+Number(v)+Number(d1)+Number(d2),cornerBonus=dirs>=2?2.4:0;const score=dist-cornerBonus-(255-l)/255*.7;if(score<best){best=score;bestX=x;bestY=y}}if(bestX<0)return point;const snappedX=(sx-rx+(bestX+.5)/n*(rx*2))/sourceW,snappedY=(sy-ry+(bestY+.5)/n*(ry*2))/sourceH;return{x:Math.max(0,Math.min(1,snappedX)),y:Math.max(0,Math.min(1,snappedY))}}catch{return point}}
 function previewPoint(point:Point|null,shift:boolean,objectSnap:boolean){if(!point)return point;const ink=snapToDrawing(point,objectSnap);return pending.length>=1&&!objectSnap?snapPoint(pending[0],ink,shift):ink}"""
assert old in s
s=s.replace(old,new,1)

pattern=r" function handleStageClick\(e:React\.PointerEvent<HTMLDivElement>\)\{.*?\n function measuredMm"
m=re.search(pattern,s,re.S)
assert m
replacement=""" function handleStageClick(e:React.PointerEvent<HTMLDivElement>){if(tool==='hand'||!attachment)return;let point=pointFromEvent(e);if(!point)return;const objectSnap=altGraphHeld(e);point=snapToDrawing(point,objectSnap);if(pending.length>=1&&!objectSnap)point=snapPoint(pending[0],point,e.shiftKey);const next=[...pending,point];if(tool==='angle'){if(next.length<3){setPending(next);return}setPending([]);const angle:AngleMeasurement={id:crypto.randomUUID(),center:next[0],a:next[1],b:next[2],label:'',description:'',visible:true,labelOffset:{x:0,y:0}};if(measuredAngle(angle)<0.1){setMessage('Vinkeln är för liten för att sparas.');return}updatePage({...pageState,angles:[...(pageState.angles||[]),angle]});return}if(next.length<2){setPending(next);return}setPending([]);if(tool==='calibrate'){const raw=window.prompt('Ange verkligt avstånd mellan punkterna i mm:','1000');if(!raw)return;const distanceMm=Number(raw.replace(',','.'));if(!Number.isFinite(distanceMm)||distanceMm<=0){setMessage('Ogiltigt kalibreringsmått.');return}updatePage({...pageState,calibration:{a:next[0],b:next[1],distanceMm}});setTool('hand');setMessage('Skalan är kalibrerad för den här sidan.');return}if(!pageState.calibration&&!pageState.scale){setMessage('Välj ritningsskala eller kalibrera innan du mäter.');return}updatePage({...pageState,measurements:[...pageState.measurements,{id:crypto.randomUUID(),a:next[0],b:next[1],label:'',description:'',visible:true,offset:0}]});}
 function measuredMm"""
s=s[:m.start()]+replacement+s[m.end():]

old="function setAngleLabelOffset(id:string,labelOffset:Point,final:boolean){if(!stateKey)return;setStates(current=>{const currentPage=current[stateKey]||{measurements:[]};const nextPage={...currentPage,angles:(currentPage.angles||[]).map(a=>a.id===id?{...a,labelOffset}:a)};const value={...current,[stateKey]:nextPage};writeState(projectId,value);if(final)void saveSharedState(projectId,value);return value})}"
new="function setAngleGeometry(id:string,patch:Partial<Pick<AngleMeasurement,'labelOffset'|'arcRadius'|'a'|'b'>>,final:boolean){if(!stateKey)return;setStates(current=>{const currentPage=current[stateKey]||{measurements:[]};const nextPage={...currentPage,angles:(currentPage.angles||[]).map(a=>a.id===id?{...a,...patch}:a)};const value={...current,[stateKey]:nextPage};writeState(projectId,value);if(final)void saveSharedState(projectId,value);return value})}"
assert old in s
s=s.replace(old,new,1)

s=s.replace("<AngleOverlay targetRef={isPdf?canvasRef:imageRef} angles={pageState.angles||[]} tool={tool} showMeasurements={showMeasurements} onOffsetChange={setAngleLabelOffset}/>","<AngleOverlay targetRef={isPdf?canvasRef:imageRef} angles={pageState.angles||[]} tool={tool} showMeasurements={showMeasurements} onChange={setAngleGeometry}/>",1)

old="onPointerMove={e=>{const raw=tool==='hand'?null:pointFromEvent(e);setCursorPoint(previewPoint(raw,e.shiftKey))}}"
new="onPointerMove={e=>{const raw=tool==='hand'?null:pointFromEvent(e);setCursorPoint(previewPoint(raw,e.shiftKey,altGraphHeld(e)))}}"
assert old in s
s=s.replace(old,new,1)

pattern=r"function AngleOverlay\(.*?\n\}\n\nfunction DrawingOverlay"
m=re.search(pattern,s,re.S)
assert m
angle_component=r'''function AngleOverlay({targetRef,angles,tool,showMeasurements,onChange}:{targetRef:React.RefObject<HTMLCanvasElement|null>|React.RefObject<HTMLImageElement|null>;angles:AngleMeasurement[];tool:Tool;showMeasurements:boolean;onChange:(id:string,patch:Partial<Pick<AngleMeasurement,'labelOffset'|'arcRadius'|'a'|'b'>>,final:boolean)=>void}){
 const[size,setSize]=useState({w:0,h:0});const dragRef=useRef<{id:string;kind:'label'|'arc'|'a'|'b';pointerId:number}|null>(null);
 useEffect(()=>{const target=targetRef.current;if(!target)return;const update=()=>{const r=target.getBoundingClientRect();setSize({w:r.width,h:r.height})};update();const ro=new ResizeObserver(update);ro.observe(target);return()=>ro.disconnect()},[targetRef.current]);
 if(!showMeasurements||!size.w||!size.h)return null;const min=Math.max(1,Math.min(size.w,size.h));
 const geom=(a:AngleMeasurement)=>{const cx=a.center.x*size.w,cy=a.center.y*size.h,ax=a.a.x*size.w,ay=a.a.y*size.h,bx=a.b.x*size.w,by=a.b.y*size.h;const a1=Math.atan2(ay-cy,ax-cx),a2=Math.atan2(by-cy,bx-cx);let d=a2-a1;while(d<=-Math.PI)d+=Math.PI*2;while(d>Math.PI)d-=Math.PI*2;const abs=Math.abs(d),lenA=Math.hypot(ax-cx,ay-cy),lenB=Math.hypot(bx-cx,by-cy),maxR=Math.max(6,Math.min(lenA,lenB)*.88),defaultR=Math.min(34,Math.max(18,Math.min(lenA,lenB)*.24)),r=Math.min(maxR,Math.max(6,a.arcRadius!=null?a.arcRadius*min:defaultR)),mid=a1+d/2;const endA={x:cx+Math.cos(a1)*r,y:cy+Math.sin(a1)*r},endB={x:cx+Math.cos(a2)*r,y:cy+Math.sin(a2)*r};const arc=`M ${endA.x} ${endA.y} A ${r} ${r} 0 0 ${d>=0?1:0} ${endB.x} ${endB.y}`;const off=a.labelOffset||{x:0,y:0};const lx=cx+Math.cos(mid)*(r+20)+off.x*size.w,ly=cy+Math.sin(mid)*(r+20)+off.y*size.h;return{cx,cy,ax,ay,bx,by,arc,lx,ly,deg:abs*180/Math.PI,r}};
 const localPoint=(e:React.PointerEvent<SVGElement>):Point=>{const target=targetRef.current;if(!target)return{x:0,y:0};const r=target.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/size.w)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/size.h))}};
 const labelOffset=(a:AngleMeasurement,e:React.PointerEvent<SVGElement>)=>{const target=targetRef.current;if(!target)return a.labelOffset||{x:0,y:0};const r=target.getBoundingClientRect(),g=geom({...a,labelOffset:{x:0,y:0}});return{x:(e.clientX-r.left-g.lx)/size.w,y:(e.clientY-r.top-g.ly)/size.h}};
 const arcRadius=(a:AngleMeasurement,e:React.PointerEvent<SVGElement>)=>{const target=targetRef.current;if(!target)return a.arcRadius;const r=target.getBoundingClientRect(),cx=a.center.x*size.w,cy=a.center.y*size.h,px=e.clientX-r.left,py=e.clientY-r.top;return Math.max(.01,Math.min(.45,Math.hypot(px-cx,py-cy)/min))};
 const begin=(e:React.PointerEvent<SVGElement>,a:AngleMeasurement,kind:'label'|'arc'|'a'|'b')=>{if(tool!=='hand')return;e.stopPropagation();dragRef.current={id:a.id,kind,pointerId:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId)};
 const move=(e:React.PointerEvent<SVGElement>,a:AngleMeasurement)=>{const d=dragRef.current;if(!d||d.id!==a.id)return;e.stopPropagation();if(d.kind==='label')onChange(a.id,{labelOffset:labelOffset(a,e)},false);else if(d.kind==='arc')onChange(a.id,{arcRadius:arcRadius(a,e)},false);else onChange(a.id,{[d.kind]:localPoint(e)} as Partial<Pick<AngleMeasurement,'a'|'b'>>,false)};
 const end=(e:React.PointerEvent<SVGElement>,a:AngleMeasurement)=>{const d=dragRef.current;if(!d||d.id!==a.id)return;e.stopPropagation();if(d.kind==='label')onChange(a.id,{labelOffset:labelOffset(a,e)},true);else if(d.kind==='arc')onChange(a.id,{arcRadius:arcRadius(a,e)},true);else onChange(a.id,{[d.kind]:localPoint(e)} as Partial<Pick<AngleMeasurement,'a'|'b'>>,true);dragRef.current=null};
 return <svg width={size.w} height={size.h} style={{position:'absolute',left:0,top:0,overflow:'visible',pointerEvents:'none',zIndex:4}}>{angles.filter(a=>a.visible!==false).map(a=>{const g=geom(a),text=a.label?`${a.label} · ${formatAngle(g.deg)}`:formatAngle(g.deg),w=Math.max(38,text.length*5.8+10);return <g key={a.id}><line x1={g.cx} y1={g.cy} x2={g.ax} y2={g.ay} stroke="#d07a22" strokeWidth="1.5"/><line x1={g.cx} y1={g.cy} x2={g.bx} y2={g.by} stroke="#d07a22" strokeWidth="1.5"/><path d={g.arc} fill="none" stroke="#d07a22" strokeWidth="1.5"/><circle cx={g.cx} cy={g.cy} r="2.8" fill="#fff" stroke="#d07a22" strokeWidth="1.4"/><circle cx={g.ax} cy={g.ay} r="3.2" fill="#fff" stroke="#d07a22" strokeWidth="1.5"/><circle cx={g.bx} cy={g.by} r="3.2" fill="#fff" stroke="#d07a22" strokeWidth="1.5"/><rect x={g.lx-w/2} y={g.ly-8} width={w} height="16" rx="3" fill="rgba(255,255,255,.86)" stroke="rgba(208,122,34,.72)"/><text x={g.lx} y={g.ly+3.2} textAnchor="middle" fontSize="9" fontWeight="600" fill="#70420c">{text}</text><path d={g.arc} fill="none" stroke="transparent" strokeWidth="18" style={{pointerEvents:tool==='hand'?'stroke':'none',cursor:'grab'}} onPointerDown={e=>begin(e,a,'arc')} onPointerMove={e=>move(e,a)} onPointerUp={e=>end(e,a)} onPointerCancel={e=>end(e,a)}/><circle cx={g.ax} cy={g.ay} r="11" fill="transparent" style={{pointerEvents:tool==='hand'?'all':'none',cursor:'grab'}} onPointerDown={e=>begin(e,a,'a')} onPointerMove={e=>move(e,a)} onPointerUp={e=>end(e,a)} onPointerCancel={e=>end(e,a)}/><circle cx={g.bx} cy={g.by} r="11" fill="transparent" style={{pointerEvents:tool==='hand'?'all':'none',cursor:'grab'}} onPointerDown={e=>begin(e,a,'b')} onPointerMove={e=>move(e,a)} onPointerUp={e=>end(e,a)} onPointerCancel={e=>end(e,a)}/><rect x={g.lx-w/2-5} y={g.ly-13} width={w+10} height="26" fill="transparent" style={{pointerEvents:tool==='hand'?'all':'none',cursor:'grab'}} onPointerDown={e=>begin(e,a,'label')} onPointerMove={e=>move(e,a)} onPointerUp={e=>end(e,a)} onPointerCancel={e=>end(e,a)}/></g>})}</svg>;
}

function DrawingOverlay'''
s=s[:m.start()]+angle_component+s[m.end():]

studio.write_text(s)

app=Path('src/DrawingAnnotations.tsx')
a=app.read_text()
old="type DrawingAngle={id:string;center:DrawingPoint;a:DrawingPoint;b:DrawingPoint;label:string;description?:string;visible:boolean;labelOffset?:DrawingPoint};"
new="type DrawingAngle={id:string;center:DrawingPoint;a:DrawingPoint;b:DrawingPoint;label:string;description?:string;visible:boolean;labelOffset?:DrawingPoint;arcRadius?:number};"
assert old in a
a=a.replace(old,new,1)
pattern=r"function ReadOnlyAngleOverlay\(.*?\n\}\n\nexport function DrawingAnnotations"
m=re.search(pattern,a,re.S)
assert m
readonly=r'''function ReadOnlyAngleOverlay({targetRef,angles}:{targetRef:React.RefObject<HTMLCanvasElement|null>|React.RefObject<HTMLImageElement|null>;angles:DrawingAngle[]}){
  const[size,setSize]=useState({w:0,h:0});
  useEffect(()=>{const target=targetRef.current;if(!target)return;const update=()=>{const r=target.getBoundingClientRect();setSize({w:r.width,h:r.height})};update();const ro=new ResizeObserver(update);ro.observe(target);return()=>ro.disconnect()},[targetRef.current]);
  if(!size.w||!size.h)return null;const min=Math.max(1,Math.min(size.w,size.h));
  return <svg width={size.w} height={size.h} aria-hidden="true" style={{position:'absolute',left:0,top:0,overflow:'visible',pointerEvents:'none',zIndex:2}}>{angles.map(a=>{const cx=a.center.x*size.w,cy=a.center.y*size.h,ax=a.a.x*size.w,ay=a.a.y*size.h,bx=a.b.x*size.w,by=a.b.y*size.h,a1=Math.atan2(ay-cy,ax-cx),a2=Math.atan2(by-cy,bx-cx);let d=a2-a1;while(d<=-Math.PI)d+=Math.PI*2;while(d>Math.PI)d-=Math.PI*2;const deg=Math.abs(d)*180/Math.PI,lenA=Math.hypot(ax-cx,ay-cy),lenB=Math.hypot(bx-cx,by-cy),maxR=Math.max(6,Math.min(lenA,lenB)*.88),defaultR=Math.min(34,Math.max(18,Math.min(lenA,lenB)*.24)),r=Math.min(maxR,Math.max(6,a.arcRadius!=null?a.arcRadius*min:defaultR)),mid=a1+d/2,endA={x:cx+Math.cos(a1)*r,y:cy+Math.sin(a1)*r},endB={x:cx+Math.cos(a2)*r,y:cy+Math.sin(a2)*r},arc=`M ${endA.x} ${endA.y} A ${r} ${r} 0 0 ${d>=0?1:0} ${endB.x} ${endB.y}`,off=a.labelOffset||{x:0,y:0},lx=cx+Math.cos(mid)*(r+20)+off.x*size.w,ly=cy+Math.sin(mid)*(r+20)+off.y*size.h,text=[a.label,`${deg.toFixed(1).replace('.',',')}°`].filter(Boolean).join(' · '),w=Math.max(40,text.length*6+10);return <g key={a.id}><line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#c56f18" strokeWidth="1.5"/><line x1={cx} y1={cy} x2={bx} y2={by} stroke="#c56f18" strokeWidth="1.5"/><path d={arc} fill="none" stroke="#c56f18" strokeWidth="1.5"/><circle cx={cx} cy={cy} r="2.8" fill="#fff" stroke="#c56f18" strokeWidth="1.4"/><circle cx={ax} cy={ay} r="2.5" fill="#fff" stroke="#c56f18" strokeWidth="1.3"/><circle cx={bx} cy={by} r="2.5" fill="#fff" stroke="#c56f18" strokeWidth="1.3"/><rect x={lx-w/2} y={ly-9} width={w} height="18" rx="4" fill="rgba(255,255,255,.86)" stroke="rgba(197,111,24,.65)"/><text x={lx} y={ly+3.7} textAnchor="middle" fontSize="11" fontWeight="600" fill="#6d430d">{text}</text></g>})}</svg>;
}

export function DrawingAnnotations'''
a=a[:m.start()]+readonly+a[m.end():]
app.write_text(a)
