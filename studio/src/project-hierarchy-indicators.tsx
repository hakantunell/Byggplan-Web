import { useEffect } from 'react';
import './project-hierarchy-indicators.css';

type Activity={id:string;title:string;done:boolean};
type Task={workArea:string;workSection:string;title:string;activities:Activity[]};
type Meta={activity_id:string;applicability?:string;governing_documents?:unknown[]};
type StatusDetail={activityId?:string;done?:boolean;projectId?:string};

export function ProjectHierarchyIndicators(){
 useEffect(()=>{
  let stopped=false;
  let timer=0;
  let projectId='';
  let tasks:Task[]=[];
  let metadata=new Map<string,Meta>();
  const governed=new Map<string,Set<string>>();
  const pathKey=(...parts:string[])=>parts.join('›');

  function activeActivities(task:Task){return (task.activities||[]).filter(a=>metadata.get(a.id)?.applicability!=='deprecated')}
  function taskComplete(task:Task|undefined){if(!task)return false;const active=activeActivities(task);return active.length>0&&active.every(a=>Boolean(a.done))}
  function sectionComplete(area:string,section:string){const list=tasks.filter(t=>t.workArea===area&&t.workSection===section);return list.length>0&&list.every(taskComplete)}
  function areaComplete(area:string){const list=tasks.filter(t=>t.workArea===area);return list.length>0&&list.every(taskComplete)}
  function addGoverned(path:string,id:string){const ids=governed.get(path)||new Set<string>();ids.add(id);governed.set(path,ids)}
  function rebuildGoverned(){governed.clear();for(const task of tasks)for(const a of task.activities||[]){const meta=metadata.get(a.id);if(meta?.applicability==='deprecated'||!meta?.governing_documents?.length)continue;addGoverned(pathKey(task.workArea),a.id);addGoverned(pathKey(task.workArea,task.workSection),a.id);addGoverned(pathKey(task.workArea,task.workSection,task.title),a.id);addGoverned(pathKey(task.workArea,task.workSection,task.title,a.title),a.id)}}

  async function load(id:string){
   try{
    const [tr,mr]=await Promise.all([
     fetch(`/api/tasks?projectId=${encodeURIComponent(id)}`,{cache:'no-store'}),
     fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(id)}`,{cache:'no-store'})
    ]);
    tasks=tr.ok?((await tr.json()).tasks||[]):[];
    metadata=mr.ok?new Map(((await mr.json()).items||[]).map((x:Meta)=>[x.activity_id,x])):new Map();
    rebuildGoverned();
   }catch{tasks=[];metadata=new Map();governed.clear()}
   paint();
  }

  function setChip(host:HTMLElement,count:number,showCount=true){
   let chip=host.querySelector(':scope > .hierGov') as HTMLElement|null;
   if(!count){chip?.remove();return}
   if(!chip){chip=document.createElement('span');chip.className='hierGov';host.appendChild(chip)}
   chip.textContent=showCount?`📋 ${count}`:'📋';
   chip.title=count===1?'1 aktivitet har koppling till styrdokument':`${count} aktiviteter har koppling till styrdokument`;
  }

  function paintNewTree(){
   let area='',section='',task='';
   const rows=Array.from(document.querySelectorAll<HTMLElement>('.projectsHierarchyRow:not(.projectsHierarchyPage)'));
   for(const row of rows){
    const left=parseInt(row.style.paddingLeft||'0',10);const depth=Math.max(1,Math.round(left/13));
    const select=row.querySelector<HTMLElement>('.projectsHierarchySelect');if(!select)continue;
    const spans=select.querySelectorAll('span');const icon=spans[0] as HTMLElement|undefined;const label=(spans[1]?.textContent||'').trim();
    if(depth===1)area=label;if(depth===2)section=label;if(depth===3)task=label;
    const key=depth===1?pathKey(area):depth===2?pathKey(area,section):depth===3?pathKey(area,section,task):pathKey(area,section,task,label);
    setChip(select,governed.get(key)?.size||0,depth!==4);
    if(icon&&depth<=3){const complete=depth===1?areaComplete(area):depth===2?sectionComplete(area,section):taskComplete(tasks.find(t=>t.workArea===area&&t.workSection===section&&t.title===task));icon.textContent=complete?'✓':depth===1?'⛏':depth===2?'⌖':'▣';icon.classList.toggle('hierHierarchyDone',complete);row.classList.toggle('hierHierarchyRowDone',complete)}
    if(icon&&depth===4){const activity=tasks.find(t=>t.workArea===area&&t.workSection===section&&t.title===task)?.activities.find(a=>a.title===label&&metadata.get(a.id)?.applicability!=='deprecated');if(activity){icon.textContent=activity.done?'✓':'○';icon.classList.add('hierDone');icon.classList.toggle('done',activity.done)}}
   }
  }

  function paintOldTree(){
   let area='',section='',task='';
   for(const row of Array.from(document.querySelectorAll<HTMLElement>('.projectTreeRow'))){
    const depth=Math.max(0,Math.round((parseInt(row.style.paddingLeft||'10',10)-10)/16));const label=(row.querySelector('.projectTreeLabel')?.textContent||'').trim();if(depth===1)area=label;if(depth===2)section=label;if(depth===3)task=label;if(depth<1)continue;
    const key=depth===1?pathKey(area):depth===2?pathKey(area,section):depth===3?pathKey(area,section,task):pathKey(area,section,task,label);setChip(row,governed.get(key)?.size||0,depth!==4);
   }
  }
  function paint(){if(stopped)return;paintNewTree();paintOldTree()}
  function statusChanged(event:Event){const d=(event as CustomEvent<StatusDetail>).detail||{};if(d.projectId&&projectId&&d.projectId!==projectId)return;if(d.activityId&&typeof d.done==='boolean'){for(const t of tasks)for(const a of t.activities)if(a.id===d.activityId)a.done=d.done;paint()}if(projectId)window.setTimeout(()=>void load(projectId),250)}
  async function tick(){const id=(document.querySelector('.controlPlanTopbar select') as HTMLSelectElement|null)?.value||(document.querySelector('.projectWorkspace .topbar select') as HTMLSelectElement|null)?.value||'';if(id&&id!==projectId){projectId=id;await load(id)}else paint();timer=window.setTimeout(tick,500)}
  window.addEventListener('byggplan:activity-status-changed',statusChanged as EventListener);void tick();return()=>{stopped=true;window.clearTimeout(timer);window.removeEventListener('byggplan:activity-status-changed',statusChanged as EventListener)}
 },[]);
 return null;
}
