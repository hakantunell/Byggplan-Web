type GraphState={
  dependencies:Record<string,string[]>;
  positions:Record<string,{dx:number;dy:number}>;
  routes:Record<string,{dx:number;dy:number;sourceDy?:number;targetDy?:number;targetDx?:number}>;
};

const PROJECT_KEY='byggplan.studio.projectId';
const DEP_PREFIX='byggplan.graph.dependencies.v5.';
const POS_PREFIX='byggplan.graph.positions.v1.';
const ROUTE_PREFIX='byggplan.graph.routes.v1.';
const WRITE_DEBOUNCE_MS=1500;
const timers=new Map<string,number>();
const loading=new Set<string>();
const lastSent=new Map<string,string>();
let suppress=false;
let installed=false;
let originalSetItem:typeof Storage.prototype.setItem|undefined;

function parse(raw:string|null){try{return JSON.parse(raw||'{}')}catch{return{}}}
function stateFor(projectId:string):GraphState{return{
  dependencies:parse(localStorage.getItem(`${DEP_PREFIX}${projectId}`)),
  positions:parse(localStorage.getItem(`${POS_PREFIX}${projectId}`)),
  routes:parse(localStorage.getItem(`${ROUTE_PREFIX}${projectId}`))
}}
function hasState(state:GraphState){return Object.keys(state.dependencies).length>0||Object.keys(state.positions).length>0||Object.keys(state.routes).length>0}
function projectFromGraphKey(key:string){for(const prefix of[DEP_PREFIX,POS_PREFIX,ROUTE_PREFIX])if(key.startsWith(prefix))return key.slice(prefix.length);return''}
function serialized(state:GraphState){return JSON.stringify(state)}

async function putState(projectId:string){
  if(!projectId||loading.has(projectId))return;
  const state=stateFor(projectId),body=serialized(state);
  if(lastSent.get(projectId)===body)return;
  try{
    const response=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/graph-state`,{method:'PUT',headers:{'content-type':'application/json'},body});
    if(response.ok)lastSent.set(projectId,body);
  }catch{}
}

function schedulePut(projectId:string){
  if(!projectId)return;
  const old=timers.get(projectId);if(old)window.clearTimeout(old);
  timers.set(projectId,window.setTimeout(()=>{timers.delete(projectId);void putState(projectId)},WRITE_DEBOUNCE_MS));
}

function setLocal(key:string,value:unknown){originalSetItem!.call(localStorage,key,JSON.stringify(value??{}))}

async function loadOrMigrate(projectId:string){
  if(!projectId||loading.has(projectId))return;
  loading.add(projectId);
  try{
    const response=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/graph-state`,{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json() as any;
    if(data?.exists){
      suppress=true;
      try{
        setLocal(`${DEP_PREFIX}${projectId}`,data.dependencies||{});
        setLocal(`${POS_PREFIX}${projectId}`,data.positions||{});
        setLocal(`${ROUTE_PREFIX}${projectId}`,data.routes||{});
        lastSent.set(projectId,serialized({dependencies:data.dependencies||{},positions:data.positions||{},routes:data.routes||{}}));
      }finally{suppress=false}
      window.dispatchEvent(new CustomEvent('byggplan:graph-state-hydrated',{detail:{projectId}}));
    }else{
      const local=stateFor(projectId);
      if(hasState(local)){
        const body=serialized(local);
        const saved=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/graph-state`,{method:'PUT',headers:{'content-type':'application/json'},body});
        if(saved.ok)lastSent.set(projectId,body);
      }
    }
  }catch{}finally{
    loading.delete(projectId);
    if(timers.has(projectId))schedulePut(projectId);
  }
}

export async function initializeGraphStateSync(){
  if(!installed){
    installed=true;
    originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key:string,value:string){
      originalSetItem!.call(this,key,value);
      if(this!==localStorage||suppress)return;
      if(key===PROJECT_KEY){void loadOrMigrate(String(value||''));return}
      const projectId=projectFromGraphKey(key);if(projectId)schedulePut(projectId);
    };
  }
  const current=localStorage.getItem(PROJECT_KEY)||'';
  if(current)await loadOrMigrate(current);
}
