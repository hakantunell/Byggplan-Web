import { useEffect,useMemo,useRef,useState } from 'react';

type Area={id:string;project_id:string;name:string;sort_order?:number};
type Section={id:string;work_area_id:string;name:string;sort_order?:number};
type Task={id:string;work_section_id:string;title:string;description?:string;status?:string;sort_order?:number};
type Activity={id:string;task_id:string;title:string;description?:string;activity_type:string;required?:number;sort_order?:number};
type Structure={areas:Area[];sections:Section[];tasks:Task[];activities:Activity[]};
type Props={projectId:string;projectName?:string};
type PlanStatus='done'|'active'|'ready'|'blocked'|'planned';
type DependencyMap=Record<string,string[]>;
type PlanNode={task:Task;area:Area;section:Section;activities:Activity[];stop:boolean;status:PlanStatus;requires:string[];stage:number};
type Position={x:number;y:number};
type OffsetMap=Record<string,{dx:number;dy:number}>;
type RouteState={dx:number;dy:number;sourceDy?:number;targetDy?:number};
type RouteMap=Record<string,RouteState>;
type DragState=
 |{kind:'node';id:string;startX:number;startY:number;dx:number;dy:number}
 |{kind:'edge';key:string;startX:number;startY:number;dx:number;dy:number;axis?:'both'|'x'|'y'}
 |{kind:'endpoint';key:string;endpoint:'source'|'target';startY:number;value:number};

const EMPTY:Structure={areas:[],sections:[],tasks:[],activities:[]};
const STOP_WORDS=/kontroll|besikt|inspektion|godkänn|startbesked|slutbesked|samråd|utsättning|lägeskontroll|provtryck/i;
const STORAGE_PREFIX='byggplan.graph.dependencies.v5.';
const POSITION_PREFIX='byggplan.graph.positions.v1.';
const ROUTE_PREFIX='byggplan.graph.routes.v1.';
const NODE_W=190;
const NODE_H=82;
const X_GAP=320;
const Y_GAP=118;
const PORT_LIMIT=NODE_H/2-12;

function order<T extends {sort_order?:number;name?:string;title?:string}>(items:T[]){
 return [...items].sort((a,b)=>(a.sort_order??999999)-(b.sort_order??999999)||String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),'sv'));
}
function rawStatus(task:Task){
 const value=String(task.status||'').toLowerCase();
 if(['done','completed','complete','closed','klar','finished'].includes(value))return'done' as const;
 if(['active','in_progress','in-progress','started','pågår','ongoing'].includes(value))return'active' as const;
 return'planned' as const;
}
function isStop(task:Task,activities:Activity[]){
 return activities.some(a=>['approval','control','check','measurement'].includes(String(a.activity_type||'').toLowerCase()))||STOP_WORDS.test(task.title);
}
function unique(values:string[]){return Array.from(new Set(values.filter(Boolean)));}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function readDependencies(projectId:string):DependencyMap{try{return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${projectId}`)||'{}') as DependencyMap}catch{return{}}}
function writeDependencies(projectId:string,value:DependencyMap){try{localStorage.setItem(`${STORAGE_PREFIX}${projectId}`,JSON.stringify(value))}catch{}}
function readOffsets(projectId:string):OffsetMap{try{return JSON.parse(localStorage.getItem(`${POSITION_PREFIX}${projectId}`)||'{}') as OffsetMap}catch{return{}}}
function writeOffsets(projectId:string,value:OffsetMap){try{localStorage.setItem(`${POSITION_PREFIX}${projectId}`,JSON.stringify(value))}catch{}}
function readRoutes(projectId:string):RouteMap{try{return JSON.parse(localStorage.getItem(`${ROUTE_PREFIX}${projectId}`)||'{}') as RouteMap}catch{return{}}}
function writeRoutes(projectId:string,value:RouteMap){try{localStorage.setItem(`${ROUTE_PREFIX}${projectId}`,JSON.stringify(value))}catch{}}
function wouldCreateCycle(source:DependencyMap,taskId:string,requiredId:string){
 if(taskId===requiredId)return true;
 const visited=new Set<string>();
 const stack=[requiredId];
 while(stack.length){
  const id=stack.pop()!;
  if(id===taskId)return true;
  if(visited.has(id))continue;
  visited.add(id);
  for(const parent of source[id]||[])stack.push(parent);
 }
 return false;
}
function sanitizeDependencies(ids:string[],source:DependencyMap):DependencyMap{
 const valid=new Set(ids);
 const result:DependencyMap={};
 for(const id of ids)result[id]=[];
 for(const childId of ids){
  for(const parentId of unique(source[childId]||[])){
   if(!valid.has(parentId)||parentId===childId)continue;
   if(wouldCreateCycle(result,childId,parentId))continue;
   result[childId].push(parentId);
  }
 }
 return result;
}
function roundedPath(points:Position[],radius=9){
 if(points.length<2)return'';
 let d=`M ${points[0].x} ${points[0].y}`;
 for(let i=1;i<points.length-1;i++){
  const prev=points[i-1],cur=points[i],next=points[i+1];
  const ax=cur.x-prev.x,ay=cur.y-prev.y,bx=next.x-cur.x,by=next.y-cur.y;
  const al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
  if(!al||!bl){d+=` L ${cur.x} ${cur.y}`;continue;}
  const r=Math.min(radius,al/2,bl/2);
  const p1={x:cur.x-ax/al*r,y:cur.y-ay/al*r};
  const p2={x:cur.x+bx/bl*r,y:cur.y+by/bl*r};
  d+=` L ${p1.x} ${p1.y} Q ${cur.x} ${cur.y} ${p2.x} ${p2.y}`;
 }
 const last=points[points.length-1];
 return `${d} L ${last.x} ${last.y}`;
}
function text(task:Task,structure:Structure){
 const section=structure.sections.find(s=>s.id===task.work_section_id);
 const area=structure.areas.find(a=>a.id===section?.work_area_id);
 return `${area?.name||''} ${section?.name||''} ${task.title}`.toLowerCase();
}
function combineTasks(...groups:Task[][]){
 const flat=groups.flat();
 return unique(flat.map(t=>t.id)).map(id=>flat.find(t=>t.id===id)!).filter(Boolean);
}
function structuralDependencies(structure:Structure):DependencyMap{
 const result:DependencyMap={};
 let previousAreaTail:Task|undefined;
 for(const area of order(structure.areas)){
  let previousSectionTail:Task|undefined;
  const sections=order(structure.sections.filter(s=>s.work_area_id===area.id));
  for(const section of sections){
   const tasks=order(structure.tasks.filter(t=>t.work_section_id===section.id));
   tasks.forEach((task,index)=>{
    const parent=index>0?tasks[index-1]:previousSectionTail||previousAreaTail;
    result[task.id]=parent?[parent.id]:[];
   });
   if(tasks.length)previousSectionTail=tasks[tasks.length-1];
  }
  if(previousSectionTail)previousAreaTail=previousSectionTail;
 }
 return result;
}
function suggestedDependencies(structure:Structure):DependencyMap{
 const sorted=order(structure.tasks);
 const structural=structuralDependencies(structure);
 const result:DependencyMap={...structural};
 const find=(re:RegExp)=>sorted.filter(t=>re.test(text(t,structure)));
 const setParents=(children:Task[],parents:Task[])=>{
  if(!parents.length)return;
  for(const child of children)result[child.id]=unique(parents.filter(p=>p.id!==child.id).map(p=>p.id));
 };
 const first=(re:RegExp)=>find(re);
 const start=first(/starta byggarbetsplats|startbesked|byggstart/);
 const prepareMark=first(/förbered markarbete|markförbered/);
 const grov=first(/grovutsätt/);
 const schaktGrund=first(/(schakt|gräv).*grund|grund.*(schakt|gräv)|utför schakt/);
 const schaktVa=first(/(schakt|gräv).*(va|avlopp|vatten|brunn)|(va|avlopp|vatten|brunn).*(schakt|gräv)/);
 const undergrund=first(/undergrund|kapillärbryt|geotextil/);
 const fin=first(/finutsätt/);
 const lage=first(/lägeskontroll/);
 const grund=first(/bygg grundkonstruktion|grundkonstruktion|gjut|mur/);
 const aterfyll=first(/dränera|dränering|återfyll/);
 const botten=first(/bottenbjälklag|syll|bärlina/);
 const yttervagg=first(/yttervägg|timr|timmerstomme|bygg stomme/);
 const invBar=first(/invändigt bärverk|mellanbjälklag|loft/);
 const takstom=first(/takstomme|takbärverk|takstol|bärande tak|bygg bärande tak|åstak/);
 const undertak=first(/undertak|råspont|underlagstäck/);
 const yttertak=first(/yttertak|takplåt|klicktak/);
 const taksakerhet=first(/taksäkerhet|snörasskydd|takstege/);
 const fonster=first(/fönster|ytterdörr/);
 const fasad=first(/färdigställ fasad|fasad och yttre|yttre väggskikt/);
 const klimatskal=first(/isolera och lufttäta|isolering och lufttäthet|ångbroms|klimatskal/);
 const vvsPrep=first(/förbered vvs-installation/);
 const vvsInstall=first(/montera spillvatten och vatten/);
 const elPrep=first(/förbered elinstallation/);
 const elHidden=first(/utför dold elinstallation/);
 const ventilation=first(/^.*ventilation.*montera ventilation|installationer ventilation montera ventilation/);
 const heating=first(/installera uppvärmningssystem/);
 const fireplace=first(/installera eldstad och rökkanal/);
 const releaseFloor=first(/frigör golv för igenbyggnad/);
 const releaseWalls=first(/frigör väggar för igenbyggnad/);
 const releaseCeiling=first(/frigör innertak för igenbyggnad/);
 const floor=first(/färdigställ golvkonstruktion/);
 const innerWalls=first(/bygg innerväggar/);
 const innerCeiling=first(/montera innertak/);
 const wetCheck=first(/kontrollera våtrumsförutsättningar/);
 const wetBase=first(/bygg våtrumsunderlag/);
 const wetSeal=first(/utför tätskikt/);
 const wetFinish=first(/färdigställ våtrum/);
 const innerFinish=first(/färdigställ invändiga ytskikt/);
 const fixedInterior=first(/montera fast inredning/);
 const stairs=first(/montera trappor och skydd/);
 const outsideVa=first(/färdigställ utvändigt va/);
 const outsideMark=first(/färdigställ dagvatten och mark/);
 const commission=first(/prova och driftsätt installationer/);
 const finalBuilding=first(/kontrollera färdig byggnad/);
 const slutdocs=first(/samla slutdokumentation/);
 const slutbesked=first(/förbered och avsluta slutbesked|slutbesked/);
 for(const task of start)result[task.id]=[];
 setParents(prepareMark,start);
 setParents(grov,start);
 const earthRoot=combineTasks(prepareMark,grov.length?grov:start);
 setParents(schaktGrund,earthRoot.length?earthRoot:start);
 setParents(schaktVa,earthRoot.length?earthRoot:start);
 setParents(undergrund,schaktGrund);
 setParents(fin,schaktGrund);
 setParents(lage,fin.length?fin:schaktGrund);
 const groundParents=combineTasks(undergrund,lage);
 setParents(grund,groundParents.length?groundParents:schaktGrund);
 setParents(aterfyll,grund);
 setParents(botten,grund);
 setParents(yttervagg,botten.length?botten:grund);
 setParents(invBar,yttervagg.length?yttervagg:botten);
 setParents(takstom,combineTasks(yttervagg,invBar));
 setParents(undertak,takstom);
 setParents(yttertak,undertak.length?undertak:takstom);
 setParents(taksakerhet,yttertak.length?yttertak:(undertak.length?undertak:takstom));
 setParents(fonster,yttervagg.length?yttervagg:botten);
 setParents(fasad,combineTasks(fonster,yttervagg));
 setParents(klimatskal,combineTasks(yttertak,fonster));
 const weatherTight=klimatskal.length?klimatskal:combineTasks(yttertak,fonster,yttervagg);
 setParents(vvsPrep,weatherTight);
 setParents(vvsInstall,vvsPrep.length?vvsPrep:weatherTight);
 setParents(elPrep,weatherTight);
 setParents(innerWalls,combineTasks(weatherTight,elPrep));
 setParents(elHidden,combineTasks(elPrep,innerWalls));
 setParents(ventilation,weatherTight);
 setParents(heating,weatherTight);
 setParents(fireplace,combineTasks(takstom,weatherTight));
 const hiddenFloor=combineTasks(vvsInstall,elHidden);
 const hiddenWalls=combineTasks(vvsInstall,elHidden,ventilation);
 const hiddenCeiling=combineTasks(elHidden,ventilation,fireplace);
 setParents(releaseFloor,hiddenFloor.length?hiddenFloor:weatherTight);
 setParents(releaseWalls,hiddenWalls.length?hiddenWalls:weatherTight);
 setParents(releaseCeiling,hiddenCeiling.length?hiddenCeiling:weatherTight);
 setParents(floor,releaseFloor.length?releaseFloor:hiddenFloor);
 setParents(innerCeiling,releaseCeiling.length?releaseCeiling:hiddenCeiling);
 const wetStart=combineTasks(floor,innerWalls,vvsInstall);
 setParents(wetCheck,wetStart.length?wetStart:weatherTight);
 setParents(wetBase,wetCheck);
 setParents(wetSeal,wetBase);
 setParents(wetFinish,wetSeal);
 const constructionClosed=combineTasks(floor,innerWalls,innerCeiling,releaseWalls);
 setParents(innerFinish,constructionClosed.length?constructionClosed:weatherTight);
 setParents(fixedInterior,combineTasks(innerFinish,vvsInstall,elHidden));
 setParents(stairs,innerFinish.length?innerFinish:(invBar.length?invBar:yttervagg));
 setParents(outsideVa,schaktVa.length?schaktVa:(schaktGrund.length?schaktGrund:earthRoot));
 setParents(outsideMark,combineTasks(aterfyll,yttertak));
 const installed=combineTasks(vvsInstall,elHidden,ventilation,heating,fireplace,outsideVa);
 setParents(commission,installed.length?installed:weatherTight);
 const finished=combineTasks(commission,wetFinish,innerFinish,fixedInterior,stairs,fasad,outsideMark,taksakerhet);
 setParents(finalBuilding,finished.length?finished:commission);
 setParents(slutdocs,finalBuilding.length?finalBuilding:finished);
 setParents(slutbesked,slutdocs.length?slutdocs:finalBuilding);
 const rootIds=new Set(start.map(t=>t.id));
 const fallbackRoot=start[0];
 for(const task of sorted){
  if(rootIds.has(task.id))continue;
  if((result[task.id]||[]).length)continue;
  const fallback=(structural[task.id]||[]).filter(id=>id!==task.id);
  result[task.id]=fallback.length?fallback:(fallbackRoot&&fallbackRoot.id!==task.id?[fallbackRoot.id]:[]);
 }
 return sanitizeDependencies(sorted.map(t=>t.id),result);
}
function stageFor(id:string,deps:DependencyMap,memo:Map<string,number>,trail:Set<string>):number{
 if(memo.has(id))return memo.get(id)!;
 if(trail.has(id))return 0;
 const req=deps[id]||[];
 const stage=req.length?1+Math.max(...req.map(parent=>stageFor(parent,deps,memo,new Set(trail).add(id)))):0;
 memo.set(id,stage);
 return stage;
}
function spreadOffsets(count:number,step=12){
 if(count<=1)return[0];
 const start=-((count-1)*step)/2;
 return Array.from({length:count},(_,i)=>start+i*step);
}

export function GraphicalPlanView({projectId,projectName}:Props){
 const[structure,setStructure]=useState<Structure>(EMPTY);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState('');
 const[selected,setSelected]=useState('');
 const[dependencies,setDependencies]=useState<DependencyMap>({});
 const[editDeps,setEditDeps]=useState(false);
 const[offsets,setOffsets]=useState<OffsetMap>({});
 const[routes,setRoutes]=useState<RouteMap>({});
 const[hoveredEdge,setHoveredEdge]=useState('');
 const dragRef=useRef<DragState|null>(null);

 useEffect(()=>{
  setOffsets(projectId?readOffsets(projectId):{});
  setRoutes(projectId?readRoutes(projectId):{});
 },[projectId]);
 useEffect(()=>{
  const move=(e:PointerEvent)=>{
   const drag=dragRef.current;if(!drag)return;
   if(drag.kind==='node'){
    const dx=drag.dx+e.clientX-drag.startX;
    const dy=drag.dy+e.clientY-drag.startY;
    setOffsets(current=>({...current,[drag.id]:{dx,dy}}));
   }else if(drag.kind==='edge'){
    const nextDx=drag.axis==='y'?drag.dx:drag.dx+e.clientX-drag.startX;
    const nextDy=drag.axis==='x'?drag.dy:drag.dy+e.clientY-drag.startY;
    setRoutes(current=>({...current,[drag.key]:{...(current[drag.key]||{dx:0,dy:0}),dx:nextDx,dy:nextDy}}));
   }else{
    const value=clamp(drag.value+e.clientY-drag.startY,-PORT_LIMIT,PORT_LIMIT);
    setRoutes(current=>{
     const route=current[drag.key]||{dx:0,dy:0};
     return{...current,[drag.key]:{...route,[drag.endpoint==='source'?'sourceDy':'targetDy']:value}};
    });
   }
  };
  const up=()=>{
   const drag=dragRef.current;if(!drag)return;
   dragRef.current=null;
   if(drag.kind==='node')setOffsets(current=>{writeOffsets(projectId,current);return current;});
   else setRoutes(current=>{writeRoutes(projectId,current);return current;});
  };
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up);
  window.addEventListener('pointercancel',up);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
 },[projectId]);

 useEffect(()=>{
  let cancelled=false;
  async function load(){
   setLoading(true);setError('');
   try{
    const r=await fetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
    if(!r.ok)throw new Error('Kunde inte läsa projektplanen.');
    const data=await r.json() as Structure;
    if(cancelled)return;
    setStructure(data);
    const ids=order(data.tasks).map(t=>t.id);
    const stored=readDependencies(projectId);
    const source=Object.keys(stored).length?stored:suggestedDependencies(data);
    const safe=sanitizeDependencies(ids,source);
    setDependencies(safe);
    writeDependencies(projectId,safe);
    setSelected(cur=>cur&&data.tasks.some(t=>t.id===cur)?cur:data.tasks.find(t=>rawStatus(t)==='active')?.id||data.tasks[0]?.id||'');
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Kunde inte läsa projektplanen.');}
   finally{if(!cancelled)setLoading(false);}
  }
  if(projectId)void load();
  return()=>{cancelled=true};
 },[projectId]);

 function saveDeps(next:DependencyMap){
  const safe=sanitizeDependencies(order(structure.tasks).map(t=>t.id),next);
  setDependencies(safe);
  writeDependencies(projectId,safe);
 }
 function toggleDependency(taskId:string,requiredId:string){
  const current=dependencies[taskId]||[];
  if(!current.includes(requiredId)&&wouldCreateCycle(dependencies,taskId,requiredId))return;
  saveDeps({...dependencies,[taskId]:current.includes(requiredId)?current.filter(id=>id!==requiredId):unique([...current,requiredId])});
 }
 function resetSuggestions(){saveDeps(suggestedDependencies(structure));}
 function resetPositions(){setOffsets({});writeOffsets(projectId,{});}
 function resetRoutes(){setRoutes({});writeRoutes(projectId,{});}

 const validNodes=useMemo(()=>order(structure.tasks).map(task=>{
  const section=structure.sections.find(s=>s.id===task.work_section_id);
  const area=structure.areas.find(a=>a.id===section?.work_area_id);
  if(!section||!area)return null;
  const activities=order(structure.activities.filter(a=>a.task_id===task.id));
  return{task,area,section,activities,stop:isStop(task,activities)};
 }).filter(Boolean) as Array<Omit<PlanNode,'status'|'requires'|'stage'>>,[structure]);

 const allNodes=useMemo(()=>{
  const clean=sanitizeDependencies(validNodes.map(n=>n.task.id),dependencies);
  const doneIds=new Set(validNodes.filter(n=>rawStatus(n.task)==='done').map(n=>n.task.id));
  const roots=new Set(validNodes.filter(n=>/starta byggarbetsplats|startbesked|byggstart/i.test(`${n.area.name} ${n.section.name} ${n.task.title}`)).map(n=>n.task.id));
  if(!roots.size&&validNodes[0])roots.add(validNodes[0].task.id);
  const memo=new Map<string,number>();
  return validNodes.map(node=>{
   const requires=clean[node.task.id]||[];
   const raw=rawStatus(node.task);
   const prerequisitesDone=requires.length>0&&requires.every(id=>doneIds.has(id));
   const status:PlanStatus=raw==='done'?'done':raw==='active'?'active':requires.length&&!prerequisitesDone?'blocked':prerequisitesDone||roots.has(node.task.id)?'ready':'planned';
   return{...node,requires,status,stage:stageFor(node.task.id,clean,memo,new Set())};
  });
 },[validNodes,dependencies]);

 const selectedNode=allNodes.find(n=>n.task.id===selected)||allNodes[0];
 const done=allNodes.filter(n=>n.status==='done').length;
 const stops=allNodes.filter(n=>n.stop).length;
 const ready=allNodes.filter(n=>n.status==='ready'||n.status==='active').length;
 const children=useMemo(()=>{
  const map=new Map<string,string[]>();
  for(const node of allNodes)for(const parent of node.requires)map.set(parent,[...(map.get(parent)||[]),node.task.id]);
  return map;
 },[allNodes]);

 const stages=useMemo(()=>{
  const maxStage=Math.max(0,...allNodes.map(n=>n.stage));
  const result=Array.from({length:maxStage+1},(_,stage)=>allNodes.filter(n=>n.stage===stage));
  const stableOrder=new Map(allNodes.map((node,index)=>[node.task.id,index]));
  const posIndex=()=>{const map=new Map<string,number>();result.forEach(nodes=>nodes.forEach((n,i)=>map.set(n.task.id,i)));return map;};
  const sortNear=(nodes:PlanNode[],ids:(n:PlanNode)=>string[],positions:Map<string,number>)=>[...nodes].sort((a,b)=>{
   const score=(n:PlanNode)=>{const vals=ids(n).map(id=>positions.get(id)).filter((v):v is number=>v!==undefined);return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:Number.POSITIVE_INFINITY;};
   return score(a)-score(b)||(stableOrder.get(a.task.id)??0)-(stableOrder.get(b.task.id)??0);
  });
  for(let pass=0;pass<8;pass++){
   let indices=posIndex();
   for(let stage=1;stage<result.length;stage++)result[stage]=sortNear(result[stage],n=>n.requires,indices);
   indices=posIndex();
   for(let stage=result.length-2;stage>=0;stage--)result[stage]=sortNear(result[stage],n=>children.get(n.task.id)||[],indices);
  }
  return result;
 },[allNodes,children]);

 const autoPositions=useMemo(()=>{
  const map=new Map<string,Position>();
  const maxRows=Math.max(...stages.map(s=>s.length),1);
  const graphHeight=Math.max(520,120+(maxRows-1)*Y_GAP+NODE_H);
  for(let stage=0;stage<stages.length;stage++){
   const nodes=stages[stage];
   const blockHeight=(nodes.length-1)*Y_GAP+NODE_H;
   const top=Math.max(42,(graphHeight-blockHeight)/2);
   nodes.forEach((node,index)=>map.set(node.task.id,{x:30+stage*X_GAP,y:top+index*Y_GAP}));
  }
  return{map,width:Math.max(760,90+Math.max(0,stages.length-1)*X_GAP+NODE_W),height:graphHeight};
 },[stages]);

 const positions=useMemo(()=>{
  const map=new Map<string,Position>();
  let width=autoPositions.width,height=autoPositions.height;
  for(const node of allNodes){
   const base=autoPositions.map.get(node.task.id);if(!base)continue;
   const offset=offsets[node.task.id]||{dx:0,dy:0};
   const pos={x:Math.max(20,base.x+offset.dx),y:Math.max(20,base.y+offset.dy)};
   map.set(node.task.id,pos);
   width=Math.max(width,pos.x+NODE_W+170);
   height=Math.max(height,pos.y+NODE_H+170);
  }
  return{map,width,height};
 },[allNodes,autoPositions,offsets]);

 const edgeMeta=useMemo(()=>{
  const outgoing=new Map<string,string[]>();
  const incoming=new Map<string,string[]>();
  const approachScore=(parentId:string,childId:string)=>{
   const parent=positions.map.get(parentId);
   const route=routes[`${parentId}->${childId}`];
   return(parent?.y??0)+NODE_H/2+(route?.dy??0);
  };
  for(const node of allNodes){
   incoming.set(node.task.id,[...node.requires].sort((a,b)=>approachScore(a,node.task.id)-approachScore(b,node.task.id)));
   for(const parent of node.requires)outgoing.set(parent,[...(outgoing.get(parent)||[]),node.task.id]);
  }
  for(const [parent,list] of outgoing)list.sort((a,b)=>{
   const pa=positions.map.get(a),pb=positions.map.get(b);
   const ra=routes[`${parent}->${a}`],rb=routes[`${parent}->${b}`];
   return((pa?.y??0)+(ra?.dy??0))-((pb?.y??0)+(rb?.dy??0));
  });
  return{outgoing,incoming};
 },[allNodes,positions,routes]);

 function edgeGeometry(parentId:string,childId:string){
  const from=positions.map.get(parentId),to=positions.map.get(childId);
  if(!from||!to)return null;
  const key=`${parentId}->${childId}`;
  const route=routes[key]||{dx:0,dy:0};
  const outgoing=edgeMeta.outgoing.get(parentId)||[childId];
  const incoming=edgeMeta.incoming.get(childId)||[parentId];
  const outOffsets=spreadOffsets(outgoing.length,11);
  const inOffsets=spreadOffsets(incoming.length,11);
  const outIndex=Math.max(0,outgoing.indexOf(childId));
  const inIndex=Math.max(0,incoming.indexOf(parentId));
  const sourceDy=route.sourceDy??clamp(outOffsets[outIndex],-PORT_LIMIT,PORT_LIMIT);
  const targetDy=route.targetDy??clamp(inOffsets[inIndex],-PORT_LIMIT,PORT_LIMIT);
  const sourceCenterX=from.x+NODE_W/2;
  const targetCenterX=to.x+NODE_W/2;
  const forward=targetCenterX>=sourceCenterX;
  const x1=forward?from.x+NODE_W:from.x;
  const x2=forward?to.x:to.x+NODE_W;
  const y1=from.y+NODE_H/2+sourceDy;
  const y2=to.y+NODE_H/2+targetDy;
  const siblingBias=(outIndex-(outgoing.length-1)/2)*10+(inIndex-(incoming.length-1)/2)*7;
  const clearGap=forward?x2-x1:x1-x2;
  const customRoute=Math.abs(route.dx)>1||Math.abs(route.dy)>1;

  if(clearGap>=78){
   const laneBase=forward?x1+Math.min(110,Math.max(42,clearGap*.42)):x1-Math.min(110,Math.max(42,clearGap*.42));
   const lane=forward?clamp(laneBase+siblingBias,x1+34,x2-34):clamp(laneBase-siblingBias,x2+34,x1-34);
   if(!customRoute){
    const points=[{x:x1,y:y1},{x:lane,y:y1},{x:lane,y:y2},{x:x2,y:y2}];
    return{key,path:roundedPath(points),handle:{x:lane,y:(y1+y2)/2},verticalHandle:{x:lane,y:(y1+y2)/2},source:{x:x1,y:y1},target:{x:x2,y:y2}};
   }
   const baseY=(y1+y2)/2;
   const controlY=Math.max(16,baseY+route.dy);
   if(forward){
    const controlX=lane+route.dx;
    const exitX=x2-32;
    const points=[{x:x1,y:y1},{x:controlX,y:y1},{x:controlX,y:controlY},{x:exitX,y:controlY},{x:exitX,y:y2},{x:x2,y:y2}];
    return{key,path:roundedPath(points),handle:{x:(controlX+exitX)/2,y:controlY},verticalHandle:{x:controlX,y:(y1+controlY)/2},source:{x:x1,y:y1},target:{x:x2,y:y2}};
   }
   const controlX=lane-route.dx;
   const exitX=x2+32;
   const points=[{x:x1,y:y1},{x:controlX,y:y1},{x:controlX,y:controlY},{x:exitX,y:controlY},{x:exitX,y:y2},{x:x2,y:y2}];
   return{key,path:roundedPath(points),handle:{x:(controlX+exitX)/2,y:controlY},verticalHandle:{x:controlX,y:(y1+controlY)/2},source:{x:x1,y:y1},target:{x:x2,y:y2}};
  }

  const left=Math.min(from.x,to.x);
  const right=Math.max(from.x+NODE_W,to.x+NODE_W);
  const down=y2>=y1;
  const bridgeY=Math.max(14,(down?Math.max(from.y+NODE_H,to.y+NODE_H)+48:Math.min(from.y,to.y)-48)+route.dy);
  const outerX=forward?right+58+route.dx:left-58+route.dx;
  const targetApproach=forward?to.x-34:to.x+NODE_W+34;
  const points=[{x:x1,y:y1},{x:outerX,y:y1},{x:outerX,y:bridgeY},{x:targetApproach,y:bridgeY},{x:targetApproach,y:y2},{x:x2,y:y2}];
  return{key,path:roundedPath(points,11),handle:{x:(outerX+targetApproach)/2,y:bridgeY},verticalHandle:{x:outerX,y:(y1+bridgeY)/2},source:{x:x1,y:y1},target:{x:x2,y:y2}};
 }

 if(loading)return <div className="graphPlanState">Hämtar grafisk plan…</div>;
 if(error)return <div className="graphPlanState error">{error}</div>;
 return <div className="graphPlanPage">
  <header className="graphPlanHeader"><div><small>GRAFISK PLAN</small><h1>{projectName||'Projektplan'}</h1><p>Dra boxarna för att flytta dem. Dra linjerna för att ändra vägen och dra anslutningspunkterna längs boxkanten när flera samband behöver separeras.</p></div><div className="graphPlanHeaderActions"><div className="graphPlanSummary"><span><b>{done}</b> klara</span><span><b>{ready}</b> kan göras nu</span><span><b>{stops}</b> stoppunkter</span></div><div className="graphPlanButtons"><button className={editDeps?'active':''} onClick={()=>setEditDeps(v=>!v)}>↔ {editDeps?'Klar med beroenden':'Redigera beroenden'}</button><button onClick={resetPositions}>Återställ boxar</button><button onClick={resetRoutes}>Återställ linjer</button></div></div></header>
  <div className="graphLegend"><span><i className="legendDot done">✓</i>Klar</span><span><i className="legendDot active"/>Pågår</span><span><i className="legendDot ready"/>Kan göras nu</span><span><i className="legendDot blocked">🔒</i>Blockerad</span><span><i className="legendDot stop"/>Stoppunkt</span></div>
  {allNodes.length===0?<div className="graphPlanEmpty"><b>Planen är tom</b><span>Lägg först in moment i projektstrukturen.</span></div>:<div className="graphPlanLayout">
   <section className="graphCanvas dependencyCanvas" aria-label="Grafisk projektplan"><div className="dependencyGraph" style={{width:positions.width,height:positions.height}}><svg className="dependencyEdges" width={positions.width} height={positions.height}><defs><marker id="dependencyArrow" markerWidth="4.5" markerHeight="4.5" refX="4" refY="2.25" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L4,2.25 L0,4.5 z" className="dependencyArrowHead"/></marker><marker id="dependencyArrowRelated" markerWidth="4.5" markerHeight="4.5" refX="4" refY="2.25" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L4,2.25 L0,4.5 z" className="dependencyArrowHead related"/></marker></defs>{allNodes.flatMap(node=>node.requires.flatMap(parentId=>{const geometry=edgeGeometry(parentId,node.task.id);if(!geometry)return[];const related=!!selectedNode&&(selectedNode.task.id===node.task.id||selectedNode.task.id===parentId);const route=routes[geometry.key]||{dx:0,dy:0};const beginEdge=(axis:'both'|'x'|'y'='both')=>(e:React.PointerEvent<SVGElement>)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();setSelected(node.task.id);setHoveredEdge(geometry.key);dragRef.current={kind:'edge',key:geometry.key,startX:e.clientX,startY:e.clientY,dx:route.dx,dy:route.dy,axis};};const beginEndpoint=(endpoint:'source'|'target',value:number)=>(e:React.PointerEvent<SVGElement>)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();setSelected(node.task.id);setHoveredEdge(geometry.key);dragRef.current={kind:'endpoint',key:geometry.key,endpoint,startY:e.clientY,value};};const keep=()=>setHoveredEdge(geometry.key);const leave=()=>{if(!dragRef.current)setHoveredEdge('');};return [<path key={`${geometry.key}-visible`} d={geometry.path} markerEnd={related?'url(#dependencyArrowRelated)':'url(#dependencyArrow)'} className={`dependencyEdge ${node.status==='done'?'done':''} ${selectedNode&&!related?'dimmed':''} ${related?'related':''}`}/>,<path key={`${geometry.key}-hit`} d={geometry.path} className="dependencyEdgeHit" onPointerEnter={keep} onPointerLeave={leave} onPointerDown={beginEdge('both')}/>,...(hoveredEdge===geometry.key?[<circle key={`${geometry.key}-route`} cx={geometry.handle.x} cy={geometry.handle.y} r="5" className={`dependencyRouteHandle ${related?'related':''}`} onPointerEnter={keep} onPointerLeave={leave} onPointerDown={beginEdge('y')}/>,<circle key={`${geometry.key}-vertical`} cx={geometry.verticalHandle.x} cy={geometry.verticalHandle.y} r="5" className={`dependencyLaneHandle ${related?'related':''}`} onPointerEnter={keep} onPointerLeave={leave} onPointerDown={beginEdge('x')}/>,<circle key={`${geometry.key}-source`} cx={geometry.source.x} cy={geometry.source.y} r="4" className={`dependencyEndpointHandle ${related?'related':''}`} onPointerEnter={keep} onPointerLeave={leave} onPointerDown={beginEndpoint('source',route.sourceDy??0)}/>,<circle key={`${geometry.key}-target`} cx={geometry.target.x} cy={geometry.target.y} r="4" className={`dependencyEndpointHandle ${related?'related':''}`} onPointerEnter={keep} onPointerLeave={leave} onPointerDown={beginEndpoint('target',route.targetDy??0)}/>]:[])];}))}</svg>{allNodes.map(node=>{const pos=positions.map.get(node.task.id)!;const off=offsets[node.task.id]||{dx:0,dy:0};return <button key={node.task.id} style={{left:pos.x,top:pos.y}} className={`graphStep dependencyGraphNode draggable ${node.stop?'stop':''} ${node.status} ${selectedNode?.task.id===node.task.id?'selected':''}`} onPointerDown={e=>{if(e.button!==0)return;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);dragRef.current={kind:'node',id:node.task.id,startX:e.clientX,startY:e.clientY,dx:off.dx,dy:off.dy};}} onClick={()=>setSelected(node.task.id)}><span className="graphNode">{node.status==='done'?'✓':node.status==='blocked'?'×':node.stop?'!':''}</span><span className="graphNodeText"><b>{node.task.title}</b><small>{node.stop?'STOPPUNKT · ':''}{node.status==='done'?'Klar':node.status==='active'?'Pågår':node.status==='ready'?'Kan göras nu':node.status==='blocked'?'Blockerad':'Planerad'}</small></span></button>;})}</div></section>
   {selectedNode&&<aside className="graphInspector"><div className="graphInspectorTop"><span className={`graphInspectorNode ${selectedNode.stop?'stop':''} ${selectedNode.status}`}>{selectedNode.status==='done'?'✓':selectedNode.status==='blocked'?'×':selectedNode.stop?'!':''}</span><div><small>{selectedNode.stop?'STOPPUNKT':'MOMENT'}</small><h2>{selectedNode.task.title}</h2><p>{selectedNode.status==='done'?'Klar':selectedNode.status==='active'?'Pågår':selectedNode.status==='ready'?'Kan göras nu':selectedNode.status==='blocked'?'Blockerad':'Planerad'}</p></div></div><dl><div><dt>Arbetsområde</dt><dd>{selectedNode.area.name}</dd></div><div><dt>Arbetsavsnitt</dt><dd>{selectedNode.section.name}</dd></div><div><dt>Aktiviteter</dt><dd>{selectedNode.activities.length}</dd></div></dl><div className="graphDependencies"><div className="graphDependenciesHeader"><small>MÅSTE VARA KLART FÖRST</small>{editDeps&&<button onClick={resetSuggestions}>Återställ grundordning</button>}</div>{editDeps?<div className="dependencyEditor">{allNodes.filter(n=>n.task.id!==selectedNode.task.id).map(candidate=>{const checked=selectedNode.requires.includes(candidate.task.id);const cyclic=!checked&&wouldCreateCycle(dependencies,selectedNode.task.id,candidate.task.id);return <label key={candidate.task.id} className={cyclic?'disabled':''}><input type="checkbox" disabled={cyclic} checked={checked} onChange={()=>toggleDependency(selectedNode.task.id,candidate.task.id)}/><span>{candidate.task.title}</span><small>{cyclic?'Skulle skapa cirkulärt beroende':candidate.section.name}</small></label>;})}</div>:selectedNode.requires.length?<div className="dependencyList">{selectedNode.requires.map(id=>{const required=allNodes.find(n=>n.task.id===id);return required?<div key={id}><span className={`dependencyState ${required.status}`}>{required.status==='done'?'✓':'•'}</span><b>{required.task.title}</b><small>{required.status==='done'?'Klar':'Inte klar'}</small></div>:null;})}</div>:<p className="noDependencies">Detta är ett rotmoment i planen.</p>}</div>{selectedNode.task.description&&<div className="graphDescription"><small>BESKRIVNING</small><p>{selectedNode.task.description}</p></div>}{selectedNode.activities.length>0&&<div className="graphActivities"><small>AKTIVITETER I MOMENTET</small>{selectedNode.activities.map(a=><div key={a.id}><span>{['approval','control','check','measurement'].includes(a.activity_type)?'◆':'○'}</span><b>{a.title}</b></div>)}</div>}</aside>}
  </div>}
 </div>;
}
