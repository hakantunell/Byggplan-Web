import { useEffect,useMemo,useState } from 'react';

type Area={id:string;project_id:string;name:string;sort_order?:number};
type Section={id:string;work_area_id:string;name:string;sort_order?:number};
type Task={id:string;work_section_id:string;title:string;description?:string;status?:string;sort_order?:number};
type Activity={id:string;task_id:string;title:string;description?:string;activity_type:string;required?:number;sort_order?:number};
type Structure={areas:Area[];sections:Section[];tasks:Task[];activities:Activity[]};
type Props={projectId:string;projectName?:string};
type PlanStatus='done'|'active'|'ready'|'blocked'|'planned';
type PlanNode={task:Task;area:Area;section:Section;activities:Activity[];stop:boolean;status:PlanStatus;requires:string[];stage:number};
type DependencyMap=Record<string,string[]>;

const EMPTY:Structure={areas:[],sections:[],tasks:[],activities:[]};
const STOP_WORDS=/kontroll|besikt|inspektion|godkänn|startbesked|slutbesked|samråd|utsättning|lägeskontroll|provtryck/i;
const STORAGE_PREFIX='byggplan.graph.dependencies.v2.';

function order<T extends {sort_order?:number;name?:string;title?:string}>(items:T[]){return [...items].sort((a,b)=>(a.sort_order??999999)-(b.sort_order??999999)||String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),'sv'))}
function rawStatus(task:Task){const value=String(task.status||'').toLowerCase();if(['done','completed','complete','closed','klar','finished'].includes(value))return'done' as const;if(['active','in_progress','in-progress','started','pågår','ongoing'].includes(value))return'active' as const;return'planned' as const}
function isStop(task:Task,activities:Activity[]){return activities.some(a=>['approval','control','check','measurement'].includes(String(a.activity_type||'').toLowerCase()))||STOP_WORDS.test(task.title)}
function unique(values:string[]){return Array.from(new Set(values.filter(Boolean)))}
function readDependencies(projectId:string):DependencyMap{try{return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${projectId}`)||'{}') as DependencyMap}catch{return{}}}
function writeDependencies(projectId:string,value:DependencyMap){try{localStorage.setItem(`${STORAGE_PREFIX}${projectId}`,JSON.stringify(value))}catch{}}
function text(task:Task,structure:Structure){const section=structure.sections.find(s=>s.id===task.work_section_id);const area=structure.areas.find(a=>a.id===section?.work_area_id);return `${area?.name||''} ${section?.name||''} ${task.title}`.toLowerCase()}
function add(result:DependencyMap,children:Task[],parents:Task[]){if(!parents.length)return;for(const child of children)result[child.id]=unique([...(result[child.id]||[]),...parents.filter(parent=>parent.id!==child.id).map(parent=>parent.id)])}
function suggestedDependencies(structure:Structure):DependencyMap{
 const sorted=order(structure.tasks);const result:DependencyMap={};const find=(re:RegExp)=>sorted.filter(t=>re.test(text(t,structure)));
 const start=find(/starta byggarbetsplats|startbesked|byggstart/);
 const prepareMark=find(/förbered markarbete|markförbered/);
 const grov=find(/grovutsätt/);
 const schaktGrund=find(/(schakt|gräv).*grund|grund.*(schakt|gräv)|utför schakt/);
 const schaktVa=find(/(schakt|gräv).*(va|avlopp|vatten|brunn)|(va|avlopp|vatten|brunn).*(schakt|gräv)/);
 const allSchakt=find(/schakt|gräv/);
 const undergrund=find(/undergrund|kapillärbryt|geotextil/);
 const fin=find(/finutsätt/);const lage=find(/lägeskontroll/);
 const grund=find(/bygg grundkonstruktion|grundkonstruktion|gjut|mur/);
 const aterfyll=find(/dränera|dränering|återfyll/);
 const botten=find(/bottenbjälklag|syll|bärlina/);
 const yttervagg=find(/yttervägg|timr|timmerstomme|bygg stomme/);
 const invBar=find(/invändigt bärverk|mellanbjälklag|loft/);
 const takstom=find(/takstomme|takbärverk|takstol/);
 const undertak=find(/undertak|råspont|underlagstäck/);
 const yttertak=find(/yttertak|takplåt|klicktak/);
 const fonster=find(/fönster|ytterdörr/);
 const fasad=find(/fasad|yttre väggskikt/);
 const klimatskal=find(/isolering|lufttät|ångbroms|klimatskal/);
 const installation=find(/installation|\bvvs\b|vattenledning|rör|elinstall|elektr|ventilation/);
 const vatrum=find(/våtrum|badrum|tätskikt/);
 const invandigt=find(/innervägg|innertak|invändig|golvbelägg|målning|ytskikt|kök/);
 const kontroll=find(/slutkontroll|funktionskontroll|provtryck|besiktning/);
 const slutdocs=find(/samla slutdokumentation|slutdokumentation/);
 const slutbesked=find(/slutbesked/);

 add(result,prepareMark,start);add(result,grov,start);
 const earthParents=prepareMark.length?prepareMark:(grov.length?grov:start);
 add(result,schaktGrund,earthParents);add(result,schaktVa,earthParents);
 for(const task of allSchakt)if(!schaktGrund.some(x=>x.id===task.id)&&!schaktVa.some(x=>x.id===task.id))add(result,[task],earthParents);
 add(result,undergrund,schaktGrund.length?schaktGrund:allSchakt);
 add(result,fin,schaktGrund.length?schaktGrund:allSchakt);add(result,lage,fin.length?fin:(schaktGrund.length?schaktGrund:allSchakt));
 const groundParents=unique([...(undergrund.length?undergrund:[]),...(lage.length?lage:[])]).map(id=>sorted.find(t=>t.id===id)!).filter(Boolean);
 add(result,grund,groundParents.length?groundParents:(schaktGrund.length?schaktGrund:allSchakt));
 add(result,aterfyll,grund);
 add(result,botten,grund);
 add(result,yttervagg,botten.length?botten:grund);
 add(result,invBar,yttterSafe(yttterUnique(ytttervagg,botten,grund)));
 add(result,takstom,yttterSafe(yttterUnique(ytttervagg,invBar,botten)));
 add(result,undertak,takstom);add(result,yttertak,undertak.length?undertak:takstom);
 add(result,fonster,yttterSafe(yttterUnique(ytttervagg,botten)));
 add(result,fasad,yttterSafe(yttterUnique(fonster,ytttervagg)));
 add(result,klimatskal,yttterSafe(yttterUnique(ytttertak,fonster,ytttervagg)));
 const installParents=yttterSafe(yttterUnique(ytttertak,fonster,ytttervagg));
 add(result,installation,installParents);
 add(result,vatrum,installation.length?installation:installParents);
 add(result,invandigt,installation.length?installation:installParents);
 const finishParents=yttterSafe(yttterUnique(vatrum,invandigt,installation,fasad,aterfyll));
 add(result,kontroll,finishParents);
 add(result,slutdocs,kontroll.length?kontroll:finishParents);
 add(result,slutbesked,slutdocs.length?slutdocs:(kontroll.length?kontroll:finishParents));
 return result;
}
function yttterUnique(...groups:Task[][]){return unique(groups.flat().map(t=>t.id)).map(id=>groups.flat().find(t=>t.id===id)!).filter(Boolean)}
function yttterSafe(tasks:Task[]){return tasks.filter(Boolean)}
function stageFor(id:string,deps:DependencyMap,memo:Map<string,number>,trail:Set<string>):number{if(memo.has(id))return memo.get(id)!;if(trail.has(id))return 0;const nextTrail=new Set(trail).add(id);const req=deps[id]||[];const stage=req.length?1+Math.max(...req.map(parent=>stageFor(parent,deps,memo,nextTrail))):0;memo.set(id,stage);return stage}

export function GraphicalPlanView({projectId,projectName}:Props){
 const[structure,setStructure]=useState<Structure>(EMPTY);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[selected,setSelected]=useState('');const[dependencies,setDependencies]=useState<DependencyMap>({});const[editDeps,setEditDeps]=useState(false);
 useEffect(()=>{let cancelled=false;async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});if(!r.ok)throw new Error('Kunde inte läsa projektplanen.');const data=await r.json() as Structure;if(cancelled)return;setStructure(data);const stored=readDependencies(projectId);setDependencies(Object.keys(stored).length?stored:suggestedDependencies(data));setSelected(cur=>cur&&data.tasks.some(t=>t.id===cur)?cur:data.tasks.find(t=>rawStatus(t)==='active')?.id||data.tasks[0]?.id||'')}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Kunde inte läsa projektplanen.')}finally{if(!cancelled)setLoading(false)}}if(projectId)void load();return()=>{cancelled=true}},[projectId]);
 function saveDeps(next:DependencyMap){setDependencies(next);writeDependencies(projectId,next)}
 const baseNodes=useMemo(()=>order(structure.tasks).map(task=>{const section=structure.sections.find(s=>s.id===task.work_section_id);const area=structure.areas.find(a=>a.id===section?.work_area_id);if(!section||!area)return null;const activities=order(structure.activities.filter(a=>a.task_id===task.id));return{task,area,section,activities,stop:isStop(task,activities)}}),[structure]);
 const validNodes=useMemo(()=>baseNodes.filter(Boolean) as Array<Omit<PlanNode,'status'|'requires'|'stage'>>,[baseNodes]);
 const allNodes=useMemo(()=>{const ids=new Set(validNodes.map(n=>n.task.id));const clean:DependencyMap={};for(const node of validNodes)clean[node.task.id]=unique((dependencies[node.task.id]||[]).filter(id=>ids.has(id)&&id!==node.task.id));const doneIds=new Set(validNodes.filter(n=>rawStatus(n.task)==='done').map(n=>n.task.id));const rootIds=new Set(validNodes.filter(n=>/starta byggarbetsplats|startbesked|byggstart/i.test(`${n.area.name} ${n.section.name} ${n.task.title}`)).map(n=>n.task.id));if(!rootIds.size&&validNodes[0])rootIds.add(validNodes[0].task.id);const memo=new Map<string,number>();return validNodes.map(node=>{const requires=clean[node.task.id]||[];const raw=rawStatus(node.task);const prerequisitesDone=requires.length>0&&requires.every(id=>doneIds.has(id));const status:PlanStatus=raw==='done'?'done':raw==='active'?'active':requires.length&&!prerequisitesDone?'blocked':prerequisitesDone||rootIds.has(node.task.id)?'ready':'planned';return{...node,requires,status,stage:stageFor(node.task.id,clean,memo,new Set())}})},[validNodes,dependencies]);
 const selectedNode=allNodes.find(n=>n.task.id===selected)||allNodes[0];const done=allNodes.filter(n=>n.status==='done').length;const stops=allNodes.filter(n=>n.stop).length;const ready=allNodes.filter(n=>n.status==='ready'||n.status==='active').length;const maxStage=Math.max(0,...allNodes.map(n=>n.stage));
 const stages=useMemo(()=>Array.from({length:maxStage+1},(_,stage)=>allNodes.filter(n=>n.stage===stage)),[allNodes,maxStage]);
 const positions=useMemo(()=>{const map=new Map<string,{x:number;y:number}>();const xGap=250,yGap=112,nodeW=190;for(let stage=0;stage<stages.length;stage++){const nodes=stages[stage];const offset=Math.max(0,(Math.max(...stages.map(s=>s.length),1)-nodes.length)*yGap/2);nodes.forEach((node,index)=>map.set(node.task.id,{x:38+stage*xGap,y:55+offset+index*yGap}))}return{map,width:Math.max(700,80+stages.length*xGap+nodeW),height:Math.max(480,120+Math.max(...stages.map(s=>s.length),1)*yGap)}} ,[stages]);
 function toggleDependency(taskId:string,requiredId:string){const current=dependencies[taskId]||[];const next={...dependencies,[taskId]:current.includes(requiredId)?current.filter(id=>id!==requiredId):unique([...current,requiredId])};saveDeps(next)}
 function resetSuggestions(){saveDeps(suggestedDependencies(structure))}
 if(loading)return <div className="graphPlanState">Hämtar grafisk plan…</div>;if(error)return <div className="graphPlanState error">{error}</div>;
 return <div className="graphPlanPage"><header className="graphPlanHeader"><div><small>GRAFISK PLAN</small><h1>{projectName||'Projektplan'}</h1><p>Beroendegraf: grenar visar arbeten som kan löpa parallellt och går ihop igen när ett senare moment kräver flera föregående steg.</p></div><div className="graphPlanHeaderActions"><div className="graphPlanSummary"><span><b>{done}</b> klara</span><span><b>{ready}</b> kan göras nu</span><span><b>{stops}</b> stoppunkter</span></div><button className={editDeps?'active':''} onClick={()=>setEditDeps(v=>!v)}>↔ {editDeps?'Klar med beroenden':'Redigera beroenden'}</button></div></header><div className="graphLegend"><span><i className="legendDot done">✓</i>Klar</span><span><i className="legendDot active"/>Pågår</span><span><i className="legendDot ready"/>Kan göras nu</span><span><i className="legendDot blocked">🔒</i>Blockerad</span><span><i className="legendDot stop"/>Stoppunkt</span></div>{allNodes.length===0?<div className="graphPlanEmpty"><b>Planen är tom</b><span>Lägg först in moment i projektstrukturen.</span></div>:<div className="graphPlanLayout"><section className="graphCanvas dependencyCanvas" aria-label="Grafisk projektplan"><div className="dependencyGraph" style={{width:positions.width,height:positions.height}}><svg className="dependencyEdges" width={positions.width} height={positions.height} aria-hidden="true">{allNodes.flatMap(node=>node.requires.map(parentId=>{const from=positions.map.get(parentId),to=positions.map.get(node.task.id);if(!from||!to)return null;const x1=from.x+190,y1=from.y+37,x2=to.x,y2=to.y+37,mid=x1+(x2-x1)/2;return <path key={`${parentId}-${node.task.id}`} d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} className={`dependencyEdge ${node.status==='done'?'done':''}`}/> }))}</svg>{allNodes.map(node=>{const pos=positions.map.get(node.task.id)!;return <button key={node.task.id} style={{left:pos.x,top:pos.y}} className={`graphStep dependencyGraphNode ${node.stop?'stop':''} ${node.status} ${selectedNode?.task.id===node.task.id?'selected':''}`} onClick={()=>setSelected(node.task.id)}><span className="graphNode">{node.status==='done'?'✓':node.status==='blocked'?'×':node.stop?'!':''}</span><span className="graphNodeText"><b>{node.task.title}</b><small>{node.stop?'STOPPUNKT · ':''}{node.status==='done'?'Klar':node.status==='active'?'Pågår':node.status==='ready'?'Kan göras nu':node.status==='blocked'?'Blockerad':'Planerad'}</small></span></button>})}</div></section>{selectedNode&&<aside className="graphInspector"><div className="graphInspectorTop"><span className={`graphInspectorNode ${selectedNode.stop?'stop':''} ${selectedNode.status}`}>{selectedNode.status==='done'?'✓':selectedNode.status==='blocked'?'×':selectedNode.stop?'!':''}</span><div><small>{selectedNode.stop?'STOPPUNKT':'MOMENT'}</small><h2>{selectedNode.task.title}</h2><p>{selectedNode.status==='done'?'Klar':selectedNode.status==='active'?'Pågår':selectedNode.status==='ready'?'Kan göras nu':selectedNode.status==='blocked'?'Blockerad':'Planerad'}</p></div></div><dl><div><dt>Arbetsområde</dt><dd>{selectedNode.area.name}</dd></div><div><dt>Arbetsavsnitt</dt><dd>{selectedNode.section.name}</dd></div><div><dt>Aktiviteter</dt><dd>{selectedNode.activities.length}</dd></div></dl><div className="graphDependencies"><div className="graphDependenciesHeader"><small>MÅSTE VARA KLART FÖRST</small>{editDeps&&<button onClick={resetSuggestions}>Återställ förslag</button>}</div>{editDeps?<div className="dependencyEditor">{allNodes.filter(n=>n.task.id!==selectedNode.task.id).map(candidate=><label key={candidate.task.id}><input type="checkbox" checked={selectedNode.requires.includes(candidate.task.id)} onChange={()=>toggleDependency(selectedNode.task.id,candidate.task.id)}/><span>{candidate.task.title}</span><small>{candidate.section.name}</small></label>)}</div>:selectedNode.requires.length?<div className="dependencyList">{selectedNode.requires.map(id=>{const required=allNodes.find(n=>n.task.id===id);return required?<div key={id}><span className={`dependencyState ${required.status}`}>{required.status==='done'?'✓':'•'}</span><b>{required.task.title}</b><small>{required.status==='done'?'Klar':'Inte klar'}</small></div>:null})}</div>:<p className="noDependencies">Inga föregående moment. Moment utan beroenden markeras inte automatiskt som möjliga att göra nu.</p>}</div>{selectedNode.task.description&&<div className="graphDescription"><small>BESKRIVNING</small><p>{selectedNode.task.description}</p></div>}{selectedNode.activities.length>0&&<div className="graphActivities"><small>AKTIVITETER I MOMENTET</small>{selectedNode.activities.map(a=><div key={a.id}><span>{['approval','control','check','measurement'].includes(a.activity_type)?'◆':'○'}</span><b>{a.title}</b></div>)}</div>}</aside>}</div>}</div>
}
