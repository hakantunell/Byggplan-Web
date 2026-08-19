import { useEffect,useMemo,useState } from 'react';

type Area={id:string;project_id:string;name:string;sort_order?:number};
type Section={id:string;work_area_id:string;name:string;sort_order?:number};
type Task={id:string;work_section_id:string;title:string;description?:string;status?:string;sort_order?:number};
type Activity={id:string;task_id:string;title:string;description?:string;activity_type:string;required?:number;sort_order?:number};
type Structure={areas:Area[];sections:Section[];tasks:Task[];activities:Activity[]};
type Props={projectId:string;projectName?:string};
type PlanStatus='done'|'active'|'ready'|'blocked'|'planned';
type DependencyMap=Record<string,string[]>;
type PlanNode={task:Task;area:Area;section:Section;activities:Activity[];stop:boolean;status:PlanStatus;requires:string[];stage:number};

const EMPTY:Structure={areas:[],sections:[],tasks:[],activities:[]};
const STOP_WORDS=/kontroll|besikt|inspektion|godkänn|startbesked|slutbesked|samråd|utsättning|lägeskontroll|provtryck/i;
const STORAGE_PREFIX='byggplan.graph.dependencies.v5.';

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
function readDependencies(projectId:string):DependencyMap{try{return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${projectId}`)||'{}') as DependencyMap}catch{return{}}}
function writeDependencies(projectId:string,value:DependencyMap){try{localStorage.setItem(`${STORAGE_PREFIX}${projectId}`,JSON.stringify(value))}catch{}}
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
 const startParents=start;
 setParents(prepareMark,startParents);
 setParents(grov,startParents);
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
 return result;
}
function stageFor(id:string,deps:DependencyMap,memo:Map<string,number>,trail:Set<string>):number{
 if(memo.has(id))return memo.get(id)!;
 if(trail.has(id))return 0;
 const req=deps[id]||[];
 const stage=req.length?1+Math.max(...req.map(parent=>stageFor(parent,deps,memo,new Set(trail).add(id)))):0;
 memo.set(id,stage);
 return stage;
}

export function GraphicalPlanView({projectId,projectName}:Props){
 const[structure,setStructure]=useState<Structure>(EMPTY);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState('');
 const[selected,setSelected]=useState('');
 const[dependencies,setDependencies]=useState<DependencyMap>({});
 const[editDeps,setEditDeps]=useState(false);

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
    const stored=readDependencies(projectId);
    setDependencies(Object.keys(stored).length?stored:suggestedDependencies(data));
    setSelected(cur=>cur&&data.tasks.some(t=>t.id===cur)?cur:data.tasks.find(t=>rawStatus(t)==='active')?.id||data.tasks[0]?.id||'');
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Kunde inte läsa projektplanen.');}
   finally{if(!cancelled)setLoading(false);}
  }
  if(projectId)void load();
  return()=>{cancelled=true};
 },[projectId]);

 function saveDeps(next:DependencyMap){setDependencies(next);writeDependencies(projectId,next);}
 function toggleDependency(taskId:string,requiredId:string){
  const current=dependencies[taskId]||[];
  saveDeps({...dependencies,[taskId]:current.includes(requiredId)?current.filter(id=>id!==requiredId):unique([...current,requiredId])});
 }
 function resetSuggestions(){saveDeps(suggestedDependencies(structure));}

 const baseNodes=useMemo(()=>order(structure.tasks).map(task=>{
  const section=structure.sections.find(s=>s.id===task.work_section_id);
  const area=structure.areas.find(a=>a.id===section?.work_area_id);
  if(!section||!area)return null;
  const activities=order(structure.activities.filter(a=>a.task_id===task.id));
  return{task,area,section,activities,stop:isStop(task,activities)};
 }),[structure]);
 const validNodes=useMemo(()=>baseNodes.filter(Boolean) as Array<Omit<PlanNode,'status'|'requires'|'stage'>>,[baseNodes]);
 const allNodes=useMemo(()=>{
  const ids=new Set(validNodes.map(n=>n.task.id));
  const clean:DependencyMap={};
  for(const node of validNodes)clean[node.task.id]=unique((dependencies[node.task.id]||[]).filter(id=>ids.has(id)&&id!==node.task.id));
  const doneIds=new Set(validNodes.filter(n=>rawStatus(n.task)==='done').map(n=>n.task.id));
  const rootIds=new Set(validNodes.filter(n=>/starta byggarbetsplats|startbesked|byggstart/i.test(`${n.area.name} ${n.section.name} ${n.task.title}`)).map(n=>n.task.id));
  if(!rootIds.size&&validNodes[0])rootIds.add(validNodes[0].task.id);
  const memo=new Map<string,number>();
  return validNodes.map(node=>{
   const requires=clean[node.task.id]||[];
   const raw=rawStatus(node.task);
   const prerequisitesDone=requires.length>0&&requires.every(id=>doneIds.has(id));
   const status:PlanStatus=raw==='done'?'done':raw==='active'?'active':requires.length&&!prerequisitesDone?'blocked':prerequisitesDone||rootIds.has(node.task.id)?'ready':'planned';
   return{...node,requires,status,stage:stageFor(node.task.id,clean,memo,new Set())};
  });
 },[validNodes,dependencies]);

 const selectedNode=allNodes.find(n=>n.task.id===selected)||allNodes[0];
 const done=allNodes.filter(n=>n.status==='done').length;
 const stops=allNodes.filter(n=>n.stop).length;
 const ready=allNodes.filter(n=>n.status==='ready'||n.status==='active').length;
 const maxStage=Math.max(0,...allNodes.map(n=>n.stage));
 const rawStages=useMemo(()=>Array.from({length:maxStage+1},(_,stage)=>allNodes.filter(n=>n.stage===stage)),[allNodes,maxStage]);
 const stages=useMemo(()=>{
  const result=rawStages.map(nodes=>[...nodes]);
  if(result.length<2)return result;
  const children=new Map<string,string[]>();
  for(const node of allNodes)for(const parent of node.requires)children.set(parent,[...(children.get(parent)||[]),node.task.id]);
  const indexMap=()=>{const map=new Map<string,number>();for(const nodes of result)nodes.forEach((node,index)=>map.set(node.task.id,index));return map;};
  const stableOrder=new Map(allNodes.map((node,index)=>[node.task.id,index]));
  const sortByNeighbors=(nodes:PlanNode[],neighborIds:(node:PlanNode)=>string[],indices:Map<string,number>)=>[...nodes].sort((a,b)=>{
   const av=neighborIds(a).map(id=>indices.get(id)).filter((v):v is number=>v!==undefined);
   const bv=neighborIds(b).map(id=>indices.get(id)).filter((v):v is number=>v!==undefined);
   const aa=av.length?av.reduce((s,v)=>s+v,0)/av.length:Number.POSITIVE_INFINITY;
   const bb=bv.length?bv.reduce((s,v)=>s+v,0)/bv.length:Number.POSITIVE_INFINITY;
   return aa-bb-(aa===bb?0:0)||(stableOrder.get(a.task.id)??0)-(stableOrder.get(b.task.id)??0);
  });
  for(let pass=0;pass<6;pass++){
   let indices=indexMap();
   for(let stage=1;stage<result.length;stage++)result[stage]=sortByNeighbors(result[stage],node=>node.requires,indices);
   indices=indexMap();
   for(let stage=result.length-2;stage>=0;stage--)result[stage]=sortByNeighbors(result[stage],node=>children.get(node.task.id)||[],indices);
  }
  return result;
 },[rawStages,allNodes]);
 const positions=useMemo(()=>{
  const map=new Map<string,{x:number;y:number}>();
  const xGap=225,yGap=96,nodeW=190,maxRows=Math.max(...stages.map(s=>s.length),1);
  for(let stage=0;stage<stages.length;stage++){
   const nodes=stages[stage];
   const offset=Math.max(0,(maxRows-nodes.length)*yGap/2);
   nodes.forEach((node,index)=>map.set(node.task.id,{x:30+stage*xGap,y:42+offset+index*yGap}));
  }
  return{map,width:Math.max(700,70+stages.length*xGap+nodeW),height:Math.max(440,100+maxRows*yGap)};
 },[stages]);

 if(loading)return <div className="graphPlanState">Hämtar grafisk plan…</div>;
 if(error)return <div className="graphPlanState error">{error}</div>;
 return <div className="graphPlanPage">
  <header className="graphPlanHeader"><div><small>GRAFISK PLAN</small><h1>{projectName||'Projektplan'}</h1><p>Grundordningen följer projektstrukturen. Endast verkliga parallella arbetsgrenar bryter den kronologiska kedjan.</p></div><div className="graphPlanHeaderActions"><div className="graphPlanSummary"><span><b>{done}</b> klara</span><span><b>{ready}</b> kan göras nu</span><span><b>{stops}</b> stoppunkter</span></div><button className={editDeps?'active':''} onClick={()=>setEditDeps(v=>!v)}>↔ {editDeps?'Klar med beroenden':'Redigera beroenden'}</button></div></header>
  <div className="graphLegend"><span><i className="legendDot done">✓</i>Klar</span><span><i className="legendDot active"/>Pågår</span><span><i className="legendDot ready"/>Kan göras nu</span><span><i className="legendDot blocked">🔒</i>Blockerad</span><span><i className="legendDot stop"/>Stoppunkt</span></div>
  {allNodes.length===0?<div className="graphPlanEmpty"><b>Planen är tom</b><span>Lägg först in moment i projektstrukturen.</span></div>:<div className="graphPlanLayout">
   <section className="graphCanvas dependencyCanvas" aria-label="Grafisk projektplan"><div className="dependencyGraph" style={{width:positions.width,height:positions.height}}><svg className="dependencyEdges" width={positions.width} height={positions.height} aria-hidden="true">{allNodes.flatMap(node=>node.requires.map(parentId=>{const from=positions.map.get(parentId),to=positions.map.get(node.task.id);if(!from||!to)return null;const x1=from.x+190,y1=from.y+37,x2=to.x,y2=to.y+37;const dx=Math.max(18,Math.min(44,(x2-x1)*.28));return <path key={`${parentId}-${node.task.id}`} d={`M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`} className={`dependencyEdge ${node.status==='done'?'done':''}`}/>;}))}</svg>{allNodes.map(node=>{const pos=positions.map.get(node.task.id)!;return <button key={node.task.id} style={{left:pos.x,top:pos.y}} className={`graphStep dependencyGraphNode ${node.stop?'stop':''} ${node.status} ${selectedNode?.task.id===node.task.id?'selected':''}`} onClick={()=>setSelected(node.task.id)}><span className="graphNode">{node.status==='done'?'✓':node.status==='blocked'?'×':node.stop?'!':''}</span><span className="graphNodeText"><b>{node.task.title}</b><small>{node.stop?'STOPPUNKT · ':''}{node.status==='done'?'Klar':node.status==='active'?'Pågår':node.status==='ready'?'Kan göras nu':node.status==='blocked'?'Blockerad':'Planerad'}</small></span></button>;})}</div></section>
   {selectedNode&&<aside className="graphInspector"><div className="graphInspectorTop"><span className={`graphInspectorNode ${selectedNode.stop?'stop':''} ${selectedNode.status}`}>{selectedNode.status==='done'?'✓':selectedNode.status==='blocked'?'×':selectedNode.stop?'!':''}</span><div><small>{selectedNode.stop?'STOPPUNKT':'MOMENT'}</small><h2>{selectedNode.task.title}</h2><p>{selectedNode.status==='done'?'Klar':selectedNode.status==='active'?'Pågår':selectedNode.status==='ready'?'Kan göras nu':selectedNode.status==='blocked'?'Blockerad':'Planerad'}</p></div></div><dl><div><dt>Arbetsområde</dt><dd>{selectedNode.area.name}</dd></div><div><dt>Arbetsavsnitt</dt><dd>{selectedNode.section.name}</dd></div><div><dt>Aktiviteter</dt><dd>{selectedNode.activities.length}</dd></div></dl><div className="graphDependencies"><div className="graphDependenciesHeader"><small>MÅSTE VARA KLART FÖRST</small>{editDeps&&<button onClick={resetSuggestions}>Återställ grundordning</button>}</div>{editDeps?<div className="dependencyEditor">{allNodes.filter(n=>n.task.id!==selectedNode.task.id).map(candidate=><label key={candidate.task.id}><input type="checkbox" checked={selectedNode.requires.includes(candidate.task.id)} onChange={()=>toggleDependency(selectedNode.task.id,candidate.task.id)}/><span>{candidate.task.title}</span><small>{candidate.section.name}</small></label>)}</div>:selectedNode.requires.length?<div className="dependencyList">{selectedNode.requires.map(id=>{const required=allNodes.find(n=>n.task.id===id);return required?<div key={id}><span className={`dependencyState ${required.status}`}>{required.status==='done'?'✓':'•'}</span><b>{required.task.title}</b><small>{required.status==='done'?'Klar':'Inte klar'}</small></div>:null;})}</div>:<p className="noDependencies">Detta är ett rotmoment i planen.</p>}</div>{selectedNode.task.description&&<div className="graphDescription"><small>BESKRIVNING</small><p>{selectedNode.task.description}</p></div>}{selectedNode.activities.length>0&&<div className="graphActivities"><small>AKTIVITETER I MOMENTET</small>{selectedNode.activities.map(a=><div key={a.id}><span>{['approval','control','check','measurement'].includes(a.activity_type)?'◆':'○'}</span><b>{a.title}</b></div>)}</div>}</aside>}
  </div>}
 </div>;
}