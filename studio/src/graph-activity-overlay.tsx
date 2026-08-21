import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProjectActivitiesView } from './ProjectActivitiesView';

type Activity={id:string;task_id:string;title:string;activity_type?:string};
type Structure={activities?:Activity[]};
type Meta={activity_id:string;governing_documents?:unknown[];applicability?:string};
type TaskActivity={id:string;done?:boolean};
type TaskResponse={tasks?:Array<{activities?:TaskActivity[]}>};

let currentProjectId='';
let structure:Structure={};
let metadata=new Map<string,Meta>();
let doneByActivity=new Map<string,boolean>();
let overlayRoot:Root|null=null;
let observer:MutationObserver|null=null;
let refreshTimer=0;

function norm(v:string){return v.trim().toLocaleLowerCase('sv-SE')}
function isControlActivity(activity:Activity){return ['approval','control','check','measurement'].includes(String(activity.activity_type||'').toLowerCase())}

async function loadContext(projectId:string){
  if(!projectId)return;
  currentProjectId=projectId;
  try{
    const [sr,mr,tr]=await Promise.all([
      fetch(`/api/studio/structure?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),
      fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'}),
      fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'})
    ]);
    if(sr.ok)structure=await sr.json() as Structure;
    if(mr.ok){const data=await mr.json() as {items?:Meta[]};metadata=new Map((data.items||[]).map(x=>[x.activity_id,x]));}
    if(tr.ok){const data=await tr.json() as TaskResponse;doneByActivity=new Map((data.tasks||[]).flatMap(t=>(t.activities||[]).map(a=>[a.id,Boolean(a.done)] as const)));}
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
  const activities=(structure.activities||[]).filter(a=>a.task_id===taskId);
  const rows=Array.from(box.querySelectorAll<HTMLElement>(':scope > div'));
  for(const row of rows){
    const title=row.querySelector('b')?.textContent||'';
    const activity=activities.find(a=>norm(a.title)===norm(title));
    if(!activity)continue;
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

    const meta=metadata.get(activity.id);const count=meta?.applicability==='deprecated'?0:(meta?.governing_documents||[]).length;
    let badge=row.querySelector<HTMLElement>('.graphActivityGoverningBadge');
    if(count>0){
      if(!badge){badge=document.createElement('span');badge.className='graphActivityGoverningBadge';const heading=row.querySelector('b');heading?.insertAdjacentElement('afterend',badge);}
      badge.textContent='📋';badge.title=`${count} koppling${count===1?'':'ar'} till styrdokument`;
      badge.setAttribute('aria-label',`${count} koppling${count===1?'':'ar'} till styrdokument`);
    }else badge?.remove();

    if(row.dataset.overlayBound!=='1'){
      row.dataset.overlayBound='1';
      row.addEventListener('click',()=>openOverlay(activity.id));
      row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openOverlay(activity.id)}});
    }
  }
}

function scheduleDecorate(){window.clearTimeout(refreshTimer);refreshTimer=window.setTimeout(decorateInspector,30)}

export function installGraphActivityOverlay(){
  const w=window as typeof window&Record<string,unknown>;const marker='__byggplanGraphActivityOverlayV2';if(w[marker])return;w[marker]=true;
  const originalFetch=window.fetch.bind(window);
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
  window.addEventListener('byggplan:activity-status-changed',((event:Event)=>{const detail=(event as CustomEvent<{activityId?:string;done?:boolean;projectId?:string}>).detail;if(detail?.activityId){doneByActivity.set(detail.activityId,Boolean(detail.done));decorateInspector();}}) as EventListener);
}
