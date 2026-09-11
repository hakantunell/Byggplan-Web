type PaletteState={
  lines?:Array<{id:string;kind:string;a:{x:number;y:number};b:{x:number;y:number};aSymbolId?:string;bSymbolId?:string}>;
  symbols?:Array<{id:string;kind:string;point:{x:number;y:number}}>;
  layers?:Record<string,boolean>;
  [key:string]:unknown;
};

type ProjectPaletteState=Record<string,PaletteState>;

const PREFIX='byggplan.drawingPalette.v1.';
const API='/api/project-drawing-palette';
let currentProjectId='';
let loadedProjectId='';
let remoteState:ProjectPaletteState={};
let saveTimer:number|null=null;
let loadingToken=0;
let suppressStorageHook=false;
let currentIdentityKey='';

function clamp01(value:number){return Math.max(0,Math.min(1,Number.isFinite(value)?value:0))}
function normalizePoint(value:any){return{x:clamp01(Number(value?.x)),y:clamp01(Number(value?.y))}}
function normalizePalette(value:any):PaletteState{
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return {
    ...source,
    lines:Array.isArray(source.lines)?source.lines.map((line:any)=>({...line,a:normalizePoint(line.a),b:normalizePoint(line.b)})):[],
    symbols:Array.isArray(source.symbols)?source.symbols.map((symbol:any)=>({...symbol,point:normalizePoint(symbol.point)})):[],
    layers:source.layers&&typeof source.layers==='object'&&!Array.isArray(source.layers)?source.layers:{}
  };
}
function parsePalette(raw:string|null){try{return normalizePalette(raw?JSON.parse(raw):{})}catch{return normalizePalette({})}}
function projectName(){return document.querySelector<HTMLElement>('.projectDocumentsTitle h1')?.textContent?.trim()||''}
function drawingIdentity(){
  const project=projectName()||'projekt';
  const drawing=document.querySelector<HTMLElement>('.drawingList>button.active b')?.textContent?.trim()||'ritning';
  const file=document.querySelector<HTMLSelectElement>('.drawingFilePicker select')?.value||'';
  const page=document.querySelector<HTMLElement>('.drawingPages span')?.textContent?.trim()||'sida1';
  return `${project}|${drawing}|${file}|${page}`;
}
function paletteKey(){return PREFIX+encodeURIComponent(drawingIdentity())}
function belongsToCurrentProject(key:string){
  const name=projectName();if(!name||!key.startsWith(PREFIX))return false;
  try{return decodeURIComponent(key.slice(PREFIX.length)).startsWith(`${name}|`)}catch{return false}
}
function localProjectState(){
  const result:ProjectPaletteState={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!belongsToCurrentProject(key))continue;
      result[key]=parsePalette(localStorage.getItem(key));
    }
  }catch{}
  return result;
}
function hydrateLocal(state:ProjectPaletteState){
  suppressStorageHook=true;
  try{for(const [key,value] of Object.entries(state))localStorage.setItem(key,JSON.stringify(normalizePalette(value)))}catch{}
  suppressStorageHook=false;
}
function notifyPaletteReload(){window.dispatchEvent(new CustomEvent('byggplan:drawing-palette-reload'))}
function requestProjectId(input:RequestInfo|URL,init?:RequestInit){
  try{
    const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
    const url=new URL(raw,window.location.origin);
    const fromQuery=url.searchParams.get('projectId');if(fromQuery)return fromQuery;
    if(init?.body&&typeof init.body==='string'&&init.headers){
      const body=JSON.parse(init.body) as {projectId?:unknown};
      if(typeof body.projectId==='string')return body.projectId;
    }
  }catch{}
  return '';
}
function scheduleSave(){
  if(!currentProjectId||loadedProjectId!==currentProjectId)return;
  if(saveTimer!=null)window.clearTimeout(saveTimer);
  saveTimer=window.setTimeout(()=>{saveTimer=null;void persist()},450);
}
async function persist(){
  if(!currentProjectId||loadedProjectId!==currentProjectId)return;
  try{
    await baseFetch(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:currentProjectId,state:remoteState})});
  }catch{}
}
async function loadProject(projectId:string){
  if(!projectId||projectId===loadedProjectId)return;
  const token=++loadingToken;
  try{
    const response=await baseFetch(`${API}?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
    if(token!==loadingToken||projectId!==currentProjectId)return;
    let server:ProjectPaletteState={};
    if(response.ok){
      const data=await response.json().catch(()=>({})) as {state?:unknown};
      if(data.state&&typeof data.state==='object'&&!Array.isArray(data.state))server=data.state as ProjectPaletteState;
    }
    const local=localProjectState();
    const merged:ProjectPaletteState={...local};
    for(const [key,value] of Object.entries(server))merged[key]=normalizePalette(value);
    remoteState=merged;
    loadedProjectId=projectId;
    hydrateLocal(merged);
    notifyPaletteReload();
    if(Object.keys(local).some(key=>!(key in server)))scheduleSave();
  }catch{
    if(token!==loadingToken||projectId!==currentProjectId)return;
    remoteState=localProjectState();loadedProjectId=projectId;
  }
}
function setProject(projectId:string){
  const id=projectId.trim();if(!id||id===currentProjectId)return;
  currentProjectId=id;loadedProjectId='';remoteState={};currentIdentityKey='';
  if(saveTimer!=null){window.clearTimeout(saveTimer);saveTimer=null}
  void loadProject(id);
}

const baseFetch=window.fetch.bind(window);

export function installDrawingPaletteSync(){
  const storagePrototype=Storage.prototype;
  const originalSetItem=storagePrototype.setItem;
  storagePrototype.setItem=function(key:string,value:string){
    originalSetItem.call(this,key,value);
    if(this!==localStorage||suppressStorageHook||!key.startsWith(PREFIX))return;
    const normalized=normalizePalette((()=>{try{return JSON.parse(value)}catch{return{}}})());
    if(currentProjectId&&loadedProjectId===currentProjectId){remoteState={...remoteState,[key]:normalized};scheduleSave()}
  };

  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const projectId=requestProjectId(input,init);if(projectId)setProject(projectId);
    return baseFetch(input,init);
  }) as typeof window.fetch;

  const scan=()=>{
    if(!currentProjectId||loadedProjectId!==currentProjectId)return;
    const key=paletteKey();if(key===currentIdentityKey)return;currentIdentityKey=key;
    const remote=remoteState[key];
    if(remote){
      suppressStorageHook=true;try{localStorage.setItem(key,JSON.stringify(normalizePalette(remote)))}catch{}suppressStorageHook=false;notifyPaletteReload();return;
    }
    const raw=localStorage.getItem(key);if(raw){remoteState={...remoteState,[key]:parsePalette(raw)};scheduleSave()}
  };
  const observer=new MutationObserver(scan);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','value']});
  window.setInterval(scan,700);scan();
}
