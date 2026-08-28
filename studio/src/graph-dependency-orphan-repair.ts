type Area={id:string;project_id:string;name:string;sort_order?:number};
type Section={id:string;work_area_id:string;name:string;sort_order?:number};
type Task={id:string;work_section_id:string;title:string;sort_order?:number};
type Structure={areas:Area[];sections:Section[];tasks:Task[];activities:unknown[]};
type DependencyMap=Record<string,string[]>;

const PROJECT_STORAGE_KEY='byggplan.studio.projectId';
const DEPENDENCY_PREFIX='byggplan.graph.dependencies.v5.';
const REPAIR_PREFIX='byggplan.graph.orphan-repair.v2.';

function order<T extends {sort_order?:number;name?:string;title?:string}>(items:T[]){return [...items].sort((a,b)=>(a.sort_order??999999)-(b.sort_order??999999)||String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),'sv'))}
function unique(values:string[]){return Array.from(new Set(values.filter(Boolean)))}
function text(task:Task,structure:Structure){const section=structure.sections.find(s=>s.id===task.work_section_id);const area=structure.areas.find(a=>a.id===section?.work_area_id);return `${area?.name||''} ${section?.name||''} ${task.title}`.toLowerCase()}
function normalized(value:unknown){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function isTrueRoot(task:Task){const title=normalized(task.title);return title==='förbered byggstart'||title==='starta byggarbetsplats'||title==='starta byggprojektet'}
function read(key:string):DependencyMap{try{return JSON.parse(localStorage.getItem(key)||'{}') as DependencyMap}catch{return{}}}
function write(key:string,value:DependencyMap){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}

function structural(structure:Structure){const result:DependencyMap={};let previousAreaTail:Task|undefined;for(const area of order(structure.areas)){let previousSectionTail:Task|undefined;for(const section of order(structure.sections.filter(s=>s.work_area_id===area.id))){const tasks=order(structure.tasks.filter(t=>t.work_section_id===section.id));tasks.forEach((task,index)=>{const parent=index>0?tasks[index-1]:previousSectionTail||previousAreaTail;result[task.id]=parent?[parent.id]:[]});if(tasks.length)previousSectionTail=tasks[tasks.length-1]}if(previousSectionTail)previousAreaTail=previousSectionTail}return result}
function suggestions(structure:Structure){const sorted=order(structure.tasks),result=structural(structure);const find=(re:RegExp)=>sorted.filter(t=>re.test(text(t,structure)));const set=(children:Task[],parents:Task[])=>{if(!parents.length)return;for(const child of children)result[child.id]=unique(parents.filter(p=>p.id!==child.id).map(p=>p.id))};const combine=(...groups:Task[][])=>{const flat=groups.flat();return unique(flat.map(t=>t.id)).map(id=>flat.find(t=>t.id===id)!).filter(Boolean)};
 const start=sorted.filter(isTrueRoot),prepare=find(/förbered markarbete|markförbered|etablera byggarbetsplats/),schakt=find(/förbered och schakta byggyta|(schakt|gräv).*grund|utför schakt/),under=find(/undergrund|kapillärbryt|geotextil/),fin=find(/finutsätt/),lage=find(/lägeskontroll/),grund=find(/krypgrund|bygg grundkonstruktion|grundkonstruktion|gjut|mur/),botten=find(/bottenbjälklag|syll|bärlina|bärande bjälklag/),ytter=find(/yttervägg|timr|timmerstomme|bygg stomme/),tak=find(/åsar och sparrar|takstomme|takbärverk|takstol|bärande tak|åstak/);
 set(prepare,start);set(schakt,prepare.length?prepare:start);set(under,schakt);set(fin,schakt);set(lage,fin.length?fin:schakt);set(grund,combine(under,lage).length?combine(under,lage):schakt);set(botten,grund);set(ytter,botten.length?botten:grund);set(tak,combine(ytter,botten));return result}

export function installGraphDependencyOrphanRepair(){
 const run=async()=>{
  const projectId=localStorage.getItem(PROJECT_STORAGE_KEY)||'';if(!projectId)return;
  const doneKey=`${REPAIR_PREFIX}${projectId}`;if(sessionStorage.getItem(doneKey)==='1')return;
  sessionStorage.setItem(doneKey,'1');
  try{
   const response=await fetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});if(!response.ok)return;
   const structure=await response.json() as Structure;const ids=new Set(structure.tasks.map(t=>t.id));if(!ids.size)return;
   const key=`${DEPENDENCY_PREFIX}${projectId}`,stored=read(key);if(!Object.keys(stored).length)return;
   const valid:DependencyMap={};for(const id of ids)valid[id]=unique((stored[id]||[]).filter(parent=>ids.has(parent)&&parent!==id));
   const suggested=suggestions(structure);const roots=new Set(structure.tasks.filter(isTrueRoot).map(t=>t.id));
   let repaired=0;
   for(const task of order(structure.tasks)){
    const id=task.id;if(roots.has(id))continue;
    if((valid[id]||[]).length>0)continue;
    const parents=unique((suggested[id]||[]).filter(parent=>ids.has(parent)&&parent!==id));if(!parents.length)continue;
    valid[id]=parents;repaired++;
   }
   const staleKeys=Object.keys(stored).some(id=>!ids.has(id));if(repaired||staleKeys){write(key,valid);window.dispatchEvent(new CustomEvent('byggplan:graph-dependencies-repaired',{detail:{projectId,repaired}}));}
  }catch{}
 };
 void run();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void run()});
}
