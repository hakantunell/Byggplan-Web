import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProjectActivitiesView } from './ProjectActivitiesView';

type Activity={id:string;task_id:string;title:string;activity_type?:string};
type Structure={activities?:Activity[]};
type Meta={activity_id:string;governing_documents?:unknown[];applicability?:string};
type TaskActivity={id:string;done?:boolean};
type TaskResponse={tasks?:Array<{id:string;status?:string;activities?:TaskActivity[]}>};

let currentProjectId='';
let structure:Structure={};
let metadata=new Map<string,Meta>();
let doneByActivity=new Map<string,boolean>();
let taskStatusById=new Map<string,string>();
let overlayRoot:Root|null=null;
let observer:MutationObserver|null=null;
let refreshTimer=0;
let transportFetch:typeof window.fetch=window.fetch.bind(window);
const syncedTasks=new Set<string>();

function norm(v:string){return v.trim().toLocaleLowerCase('sv-SE')}
function isControlActivity(activity:Activity){return ['approval','control','check','measurement'].includes(String(activity.activity_type||'').toLowerCase())}
function isMomentActivity(id:string){const applicability=metadata.get(id)?.applicability;return applicability!=='deprecated'&&applicability!=='project_condition'}

function applyTaskVisualStatus(taskId:string,status:string){
  const node=document.querySelector<HTMLElement>(`.dependencyGraphNode[data-node-id="${CSS.escape(taskId)}"]`);
  if(node){node.classList.remove('done','active','ready','blocked','planned');node.classList.add(status==='done'?'done':status==='active'?'active':'planned');const glyph=node.querySelector<HTMLElement>('.graphNode');if(glyph){glyph.textContent=status==='done'?'✓':'';}const label=node.querySelector<HTMLElement>('.graphNodeText small');if(label){const prefix=label.textContent?.includes('STOPPUNKT')?'STOPPUNKT · ':'';label.textContent=`${prefix}${status==='done'?'Klar':status==='active'?'Pågår':'Planerad'}`;}}
  if(selectedTaskId()===taskId){const inspector=document.querySelector<HTMLElement>('.graphInspector');const state=inspector?.querySelector<HTMLElement>('.graphInspectorTop p');if(state)state.textContent=status==='done'?'Klar':status==='active'?'Pågår':'Planerad';const icon=inspector?.querySelector<HTMLElement>('.graphInspectorNode');if(icon){icon.classList.remove('done','active','ready','blocked','planned');icon.classList.add(status==='done'?'done':status==='active'?'active':'planned');icon.textContent=status==='done'?'✓':'';}}
}

function deriveTaskStatus(taskId:string){
  const activities=(structure.activities||[]).filter(a=>a.task_id===taskId&&isMomentActivity(a.id));
  if(!activities.length)return taskStatusById.get(taskId)||'todo';
  const done=activities.filter(a=>doneByActivity.get(a.id)===true).length;
  return done===activities.length?'done':done>0?'active':'todo';
}

async function syncTaskStatus(taskId:string){
  if(!taskId||syncedTasks.has(taskId))return;
  syncedTasks.add(taskId);
  try{const r=await transportFetch(`/api/studio/tasks/${encodeURIComponent(taskId)}/sync-status`,{method:'PUT'});if(!r.ok)return;const d=await r.json() as {status?:string};if(d.status){taskStatusById.set(taskId,d.status);applyTaskVisualStatus(taskId,d.status);window.dispatchEvent(new CustomEvent('byggplan:task-status-changed',{detail:{taskId,status:d.status,projectId:currentProjectId}}));}}catch{}
}

async function loadContext(projectId:string){
  if(!projectId)return;
  currentProjectId=projectId;
  try{
    const [sr,mr,tr]=await Promise.all([
      transportFetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),
      transportFetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),
      transportFetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'})
    ]);
    if(sr.ok)structure=await sr.json() as Structure;
    if(mr.ok){const data=await mr.json() as {items?:Meta[]};metadata=new Map((data.items||[]).map(x=>[x.activity_id,x]));}
    if(tr.ok){const data=await tr.json() as TaskResponse;doneByActivity=new Map((data.tasks||[]).flatMap(t=>(t.activities||[]).map(a=>[a.id,Boolean(a.done)] as const)));taskStatusById=new Map((data.tasks||[]).map(t=>[t.id,String(t.status||'todo')]));}
  }catch{}
  decorateInspector();
}

function ensureOverlayHost(){
  let host=document.getElementById('graphActivityOverlayHost');
  if(!host){host=document.createElement('div');host.id='graphActivityOverlayHost';document.body.appendChild(host);}
  return host;
}

function closeOverlay(){
  overlayRoot?.unmount();overlayRoot=null;
  const host=document.getElementById('graphActivityOverlayHost');if(host)host.innerHTML='';
}

function openOverlay(activityId:string){
  if(!currentProjectId||!activityId)return;
  const host=ensureOverlayHost();
  overlayRoot?.unmount();
  overlayRoot=createRoot(host);
  overlayRoot.render(<div className="graphActivityOverlayBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeOverlay()}}>
    <section className="graphActivityOverlay" role="dialog" aria-modal="true" aria-label="Aktivitet">
      <div className="graphActivityOverlayBar"><button onClick={closeOverlay} aria-label="Stäng aktivitet">✕</button></div>
      <div className="graphActivityOverlayBody"><ProjectActivitiesView projectId={currentProjectId} focusActivityId={activityId} detailOnly/></div>
    </section>
  </div>);
}

function selectedTaskId(){return document.querySelector<HTMLElement>('.dependencyGraphNode.selected[data-node-id]')?.dataset.nodeId||''}

function decorateInspector(){
  const taskId=selectedTaskId();
  const box=document.querySelector<HTMLElement>('.graphActivities');
  if(!taskId||!box)return;
  const localStatus=deriveTaskStatus(taskId);applyTaskVisualStatus(taskId,localStatus);
  void syncTaskStatus(taskId);
  const activities=(structure.activities||[]).filter(a=>a.task_id===taskId);
  const rows=Array.from(box.querySelectorAll<HTMLElement>(':scope > div'));
  for(const row of rows){
    const title=row.querySelector('b')?.textContent||'';
    const candidates=activities.filter(a=>norm(a.title)===norm(title));
    const activity=candidates.find(a=>isMomentActivity(a.id))||candidates[0];
    if(!activity)continue;
    if(!isMomentActivity(activity.id)){row.style.display='none';continue;}else row.style.removeProperty('display');
    row.dataset.activityId=activity.id;
    row.classList.add('graphActivityRowInteractive');
    row.setAttribute('role','button');row.setAttribute('tabindex','0');

    const status=row.querySelector<HTMLElement>(':scope > span:first-child');
    const isDone=doneByActivity.get(activity.id)===true;
    if(status){
      status.classList.toggle('graphActivityDone',isDone);
      status.classList.toggle('graphActivityControl',!isDone&&isControlActivity(activity));
      status.textContent=isDone?'✓':isControlActivity(activity)?'◆':'○';
      status.title=isDone?'Aktiviteten är klar':isControlActivity(activity)?'Kontroll-/mätningsaktivitet':'Arbetsaktivitet';
    }

    const meta=metadata.get(activity.id);const count=(meta?.governing_documents||[]).length;
    let badge=row.querySelector<HTMLElement>('.graphActivityGoverningBadge');
    if(count>0){
      if(!badge){badge=document.createElement('span');badge.className='graphActivityGoverningBadge';row.appendChild(badge);}
      badge.textContent='📋';badge.title=`${count} koppling${count===1?'':'ar'} till styrdokument`;
      badge.setAttribute('aria-label',`${count} koppling${count===1?'':'ar'} till styrdokument`);
    }else badge?.remove();

    row.onclick=()=>openOverlay(activity.id);
    row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openOverlay(activity.id)}};
  }
}

function scheduleDecorate(){window.clearTimeout(refreshTimer);refreshTimer=window.setTimeout(decorateInspector,30)}

export function installGraphActivityOverlay(){
  const w=window as typeof window&Record<string,unknown>;const marker='__byggplanGraphActivityOverlayV5';if(w[marker])return;w[marker]=true;
  transportFetch=window.fetch.bind(window);
  const originalFetch=transportFetch;
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await originalFetch(input,init);
    try{
      const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      const url=new URL(raw,window.location.origin);
      if((init?.method||'GET').toUpperCase()==='GET'&&url.pathname==='/api/studio/structure'){
        const projectId=url.searchParams.get('projectId')||'';
        if(projectId){currentProjectId=projectId;if(response.ok)structure=await response.clone().json() as Structure;void loadContext(projectId);}
      }
    }catch{}
    return response;
  }) as typeof window.fetch;
  observer=new MutationObserver(scheduleDecorate);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlayRoot)closeOverlay()});
  window.addEventListener('byggplan:activity-status-changed',((event:Event)=>{const detail=(event as CustomEvent<{activityId?:string;done?:boolean;projectId?:string}>).detail;if(detail?.activityId){doneByActivity.set(detail.activityId,Boolean(detail.done));const taskId=(structure.activities||[]).find(a=>a.id===detail.activityId)?.task_id;if(taskId){applyTaskVisualStatus(taskId,deriveTaskStatus(taskId));syncedTasks.delete(taskId);void syncTaskStatus(taskId);}decorateInspector();}}) as EventListener);
}
