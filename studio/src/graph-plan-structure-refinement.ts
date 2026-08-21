type TaskLike={id:string;title:string;sort_order?:number};
type StructureLike={tasks?:TaskLike[]};
type DependencyMap=Record<string,string[]>;

const DEP_PREFIX='byggplan.graph.dependencies.v5.';
const REFINEMENT_PREFIX='byggplan.graph.refinement.v25.';

const RENAMES:Record<string,string>={
  'kontrollera markförutsättningar':'Kontrollera markförhållanden i öppet schakt',
  'återfyll och färdigställ mark':'Återfyll runt grund',
  'bygg och kontrollera grund':'Gjut grundsulor och bygg grundmurar',
  'bygg bärande tak':'Bygg takstolar och bärande takkonstruktion',
  'bygg åstak':'Montera åsar och sparrar',
  'utför vvs-installation':'Utför invändig VVS-installation',
  'anslut gemensamt vatten':'Förlägg och anslut servisledning för vatten',
  'kontrollera vvs-utformning och funktion':'Slutkontrollera VVS-utformning och funktion',
  'utför ventilation':'Slutför och kontrollera ventilation'
};

function norm(value:string){return value.trim().toLocaleLowerCase('sv-SE')}
function unique(values:string[]){return Array.from(new Set(values.filter(Boolean)))}
function find(tasks:TaskLike[],re:RegExp){return tasks.find(t=>re.test(norm(t.title)))?.id||''}
function readDeps(projectId:string):DependencyMap|null{try{const raw=localStorage.getItem(`${DEP_PREFIX}${projectId}`);if(!raw)return null;const parsed=JSON.parse(raw) as DependencyMap;return parsed&&typeof parsed==='object'?parsed:null}catch{return null}}
function writeDeps(projectId:string,deps:DependencyMap){try{localStorage.setItem(`${DEP_PREFIX}${projectId}`,JSON.stringify(deps));localStorage.setItem(`${REFINEMENT_PREFIX}${projectId}`,'1')}catch{}}
function isRefined(projectId:string){try{return localStorage.getItem(`${REFINEMENT_PREFIX}${projectId}`)==='1'}catch{return false}}

function refineDependencies(projectId:string,tasks:TaskLike[]){
  if(isRefined(projectId))return;
  const current=readDeps(projectId);if(!current)return;
  const next:DependencyMap={...current};
  const set=(child:string,parents:string[])=>{if(child)next[child]=unique(parents)};
  const add=(child:string,parents:string[])=>{if(child)next[child]=unique([...(next[child]||[]),...parents])};

  const prepareStart=find(tasks,/förbered byggstart|startbesked|byggstart/);
  const genericStart=find(tasks,/hantera generella byggstartskontroller/);
  const planEst=find(tasks,/planera etablering och arbetsplats/);
  const establish=find(tasks,/etablera byggarbetsplats/);
  const schakt=find(tasks,/förbered och schakta byggyta|schakta byggyta/);
  const markCheck=find(tasks,/kontrollera markför(hållanden|utsättningar)/);
  const undergrund=find(tasks,/färdigställ undergrund/);
  const location=find(tasks,/lägeskontroll|kontrollmätning.*byggnad/);
  const groundControl=find(tasks,/genomför extern kontroll av grund/);
  const foundation=find(tasks,/bygg och kontrollera grund|gjut grundsulor och bygg grundmurar/);
  const crawl=find(tasks,/utför krypgrund/);
  const basement=find(tasks,/utför (källar|förråds|suterräng)|källar.*suterräng|förråds.*suterräng/);
  const sewage=find(tasks,/utför enskilt avlopp/);
  const water=find(tasks,/anslut gemensamt vatten|förlägg och anslut servisledning för vatten/);
  const vaCheck=find(tasks,/kontrollera va före övertäckning/);
  const backfill=find(tasks,/återfyll runt grund|återfyll och färdigställ mark/);
  const frame=find(tasks,/res bärande stomme/);
  const frameControl=find(tasks,/genomför extern stomkontroll/);
  const floorStructure=find(tasks,/bygg och kontrollera bärande bjälklag/);
  const roofPrimary=find(tasks,/bygg takstolar och bärande takkonstruktion|bygg bärande tak/);
  const roofSecondary=find(tasks,/montera åsar och sparrar|bygg åstak/);
  const outerRoof=find(tasks,/färdigställ yttertak/);
  const roofSafety=find(tasks,/utför och kontrollera taksäkerhet/);
  const windows=find(tasks,/montera fönster och ytterdörrar/);
  const climateShell=find(tasks,/färdigställ klimatskal|klimatskal/);
  const internalVvs=find(tasks,/utför invändig vvs-installation|utför vvs-installation/);
  const vvsDoc=find(tasks,/dokumentera vvs-provning/);
  const vvsFinal=find(tasks,/slutkontrollera vvs-utformning och funktion|kontrollera vvs-utformning och funktion/);
  const wetroom=find(tasks,/utför våtrum|färdigställ våtrum/);
  const commissioning=find(tasks,/prova och driftsätt installationer|driftsätt installationer/);
  const fixedInterior=find(tasks,/montera fast inredning/);
  const stairs=find(tasks,/montera trappor och skydd/);
  const useSafety=find(tasks,/kontrollera säkerhet vid användning/);
  const finalDocs=find(tasks,/samla slutdokumentation/);
  const authority=find(tasks,/hantera myndighetskontroller/);
  const buildingDocs=find(tasks,/dokumentera byggnadens/);
  const endProject=find(tasks,/avsluta projektet/);

  set(planEst,[prepareStart,genericStart].filter(Boolean));
  set(establish,[planEst||prepareStart||genericStart].filter(Boolean));
  if(schakt&&establish)set(schakt,[establish]);
  if(markCheck&&schakt)set(markCheck,[schakt]);
  set(groundControl,[undergrund,location].filter(Boolean).length?[undergrund,location].filter(Boolean):[markCheck].filter(Boolean));
  set(foundation,[groundControl||location||undergrund||markCheck].filter(Boolean));
  if(crawl&&foundation)set(crawl,[foundation]);
  if(basement&&foundation)set(basement,[foundation]);

  // Yttre VA hör till markskedet. Vattenservisen slutar vid huset/anslutningspunkten här.
  if(sewage&&schakt)set(sewage,[schakt]);
  if(water&&schakt)set(water,[schakt]);
  set(vaCheck,[sewage,water].filter(Boolean));
  set(backfill,[crawl,basement,vaCheck].filter(Boolean).length?[crawl,basement,vaCheck].filter(Boolean):[foundation].filter(Boolean));

  set(frame,[backfill||foundation].filter(Boolean));
  if(frameControl&&frame)set(frameControl,[frame]);
  set(floorStructure,[frameControl||frame].filter(Boolean));
  set(roofPrimary,[floorStructure,frameControl].filter(Boolean).length?[floorStructure,frameControl].filter(Boolean):[frame].filter(Boolean));
  if(roofSecondary&&roofPrimary)set(roofSecondary,[roofPrimary]);
  if(outerRoof&&(roofSecondary||roofPrimary))set(outerRoof,[roofSecondary||roofPrimary]);
  if(roofSafety&&outerRoof)set(roofSafety,[outerRoof]);
  if(windows&&frame)set(windows,[frame]);

  // Invändig VVS är en senare fas: ledningar/installationer i huset och inkoppling av inkommande servis.
  // Behåll befintliga relevanta förutsättningar men säkerställ att huset finns och yttre servis är framdragen.
  if(internalVvs){const existing=(next[internalVvs]||[]).filter(id=>id!==vvsFinal);set(internalVvs,unique([...existing,...[climateShell||windows||frame,water].filter(Boolean)]));}
  if(vvsDoc&&internalVvs)set(vvsDoc,[internalVvs]);

  // TS-16-kontrollen hör hemma först när golvbrunnar/våtrum, invändig VVS och provning faktiskt finns.
  // Den får aldrig ligga direkt efter den tidiga vattenservisen.
  if(vvsFinal){const lateParents=[internalVvs,vvsDoc,wetroom,commissioning].filter(Boolean);set(vvsFinal,lateParents.length?lateParents:[internalVvs||vvsDoc||wetroom].filter(Boolean));}

  set(useSafety,[stairs,fixedInterior,windows].filter(Boolean));
  add(finalDocs,[useSafety,vvsFinal].filter(Boolean));
  if(authority&&finalDocs)set(authority,[finalDocs]);
  if(buildingDocs&&authority)set(buildingDocs,[authority]);
  if(endProject){for(const id of Object.keys(next))next[id]=(next[id]||[]).filter(parent=>parent!==endProject);set(endProject,[buildingDocs||authority||finalDocs].filter(Boolean));}

  writeDeps(projectId,next);
}

async function persistRenames(originalFetch:typeof window.fetch,tasks:TaskLike[]){
  for(const task of tasks){const title=RENAMES[norm(task.title)];if(!title)continue;void originalFetch(`/api/studio/structure-rename/task/${encodeURIComponent(task.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})}).catch(()=>{});task.title=title;}
}

async function refineVvsActivities(originalFetch:typeof window.fetch,projectId:string){
  try{await originalFetch(`/api/studio/projects/${encodeURIComponent(projectId)}/refine-vvs-v25`,{method:'POST',headers:{'Content-Type':'application/json'}})}catch{}
}

export function installGraphPlanStructureRefinement(){
  const marker='__byggplanGraphPlanStructureRefinementV25';const w=window as typeof window&Record<string,unknown>;if(w[marker])return;w[marker]=true;
  const originalFetch=window.fetch.bind(window);
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await originalFetch(input,init);
    try{
      const method=(init?.method||((input instanceof Request)?input.method:'GET')).toUpperCase();
      const rawUrl=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      const url=new URL(rawUrl,window.location.origin);
      if(method!=='GET'||url.pathname!=='/api/studio/structure'||!response.ok)return response;
      const projectId=url.searchParams.get('projectId')||'';if(!projectId)return response;
      const data=await response.clone().json() as StructureLike;const tasks=Array.isArray(data.tasks)?data.tasks:[];
      if(!tasks.length)return response;
      const signature=tasks.some(t=>/avsluta projektet/i.test(t.title))&&tasks.some(t=>/utför enskilt avlopp/i.test(t.title))&&tasks.some(t=>/genomför extern kontroll av grund/i.test(t.title));
      if(!signature)return response;
      const needsV25=!isRefined(projectId);
      if(needsV25)await refineVvsActivities(originalFetch,projectId);
      refineDependencies(projectId,tasks);
      await persistRenames(originalFetch,tasks);
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
    }catch{return response;}
  }) as typeof window.fetch;
}
