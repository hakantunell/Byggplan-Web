type Activity={id:string};
type Task={id:string;projectId:string;workAreaId:string;workArea:string;workSectionId:string;workSection:string;title:string;status:string;activities:Activity[]};
type TasksResponse={tasks:Task[]};

let installed=false;
let observer:MutationObserver|null=null;

export function installActivityMoveBridge(){
  if(installed)return;
  installed=true;
  const enhance=()=>document.querySelectorAll<HTMLElement>('.activityRow[data-activity-id]').forEach(enhanceActivity);
  observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
}

function enhanceActivity(row:HTMLElement){
  const details=row.querySelector<HTMLElement>('.activityDetails');
  if(!details||details.querySelector('.moveActivityButton'))return;
  const taskCard=row.closest<HTMLElement>('.taskCard');
  if(taskCard?.querySelector('.pill.review,.pill.done'))return;
  const activityId=row.dataset.activityId;
  if(!activityId)return;
  const button=document.createElement('button');
  button.type='button';
  button.className='moveActivityButton';
  button.innerHTML='<span>↪</span><span><b>Flytta aktivitet</b><small>Välj ett annat moment</small></span>';
  button.addEventListener('click',()=>void openMoveDialog(activityId));
  details.append(button);
}

async function openMoveDialog(activityId:string){
  const existing=document.querySelector('.activityMoveBackdrop');
  existing?.remove();

  const backdrop=document.createElement('div');
  backdrop.className='activityMoveBackdrop';
  backdrop.innerHTML=`<section class="activityMoveDialog" role="dialog" aria-modal="true" aria-labelledby="activityMoveTitle">
    <header><div><small>FLYTTA AKTIVITET</small><h2 id="activityMoveTitle">Välj nytt moment</h2></div><button class="activityMoveClose" type="button" aria-label="Stäng">×</button></header>
    <div class="activityMoveBody"><div class="activityMoveLoading">Hämtar projektstrukturen…</div></div>
    <footer><span class="activityMoveMessage"></span><div><button class="activityMoveCancel" type="button">Avbryt</button><button class="activityMoveConfirm" type="button" disabled>Flytta hit</button></div></footer>
  </section>`;
  document.body.append(backdrop);

  const close=()=>backdrop.remove();
  backdrop.querySelector('.activityMoveClose')?.addEventListener('click',close);
  backdrop.querySelector('.activityMoveCancel')?.addEventListener('click',close);
  backdrop.addEventListener('click',event=>{if(event.target===backdrop)close();});
  const keyHandler=(event:KeyboardEvent)=>{if(event.key==='Escape'){close();document.removeEventListener('keydown',keyHandler);}};
  document.addEventListener('keydown',keyHandler);

  const body=backdrop.querySelector<HTMLElement>('.activityMoveBody')!;
  const message=backdrop.querySelector<HTMLElement>('.activityMoveMessage')!;
  const confirm=backdrop.querySelector<HTMLButtonElement>('.activityMoveConfirm')!;

  try{
    const response=await fetch('/api/tasks',{cache:'no-store'});
    const data=await response.json().catch(()=>({tasks:[]})) as TasksResponse&{error?:string};
    if(!response.ok)throw new Error(data.error||'Kunde inte hämta projektstrukturen.');
    const source=data.tasks.find(task=>task.activities?.some(activity=>activity.id===activityId));
    if(!source)throw new Error('Kunde inte hitta aktivitetens nuvarande moment.');
    const projectTasks=data.tasks.filter(task=>task.projectId===source.projectId);
    renderTree(body,projectTasks,source.id,targetTaskId=>{
      confirm.dataset.targetTaskId=targetTaskId;
      confirm.disabled=false;
      message.textContent='';
    });
    confirm.addEventListener('click',async()=>{
      const targetTaskId=confirm.dataset.targetTaskId;
      if(!targetTaskId)return;
      confirm.disabled=true;
      message.textContent='Flyttar…';
      try{
        const moveResponse=await fetch(`/api/activities/${encodeURIComponent(activityId)}/move`,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetTaskId})
        });
        const result=await moveResponse.json().catch(()=>({})) as {error?:string};
        if(!moveResponse.ok)throw new Error(result.error||'Aktiviteten kunde inte flyttas.');
        message.textContent='Aktiviteten är flyttad.';
        window.setTimeout(()=>window.location.reload(),250);
      }catch(error){message.textContent=error instanceof Error?error.message:'Aktiviteten kunde inte flyttas.';confirm.disabled=false;}
    });
  }catch(error){
    body.innerHTML=`<div class="activityMoveError">${escapeHtml(error instanceof Error?error.message:'Kunde inte hämta projektstrukturen.')}</div>`;
  }
}

function renderTree(container:HTMLElement,tasks:Task[],sourceTaskId:string,onSelect:(taskId:string)=>void){
  const areas=new Map<string,{name:string;sections:Map<string,{name:string;tasks:Task[]}>}>();
  for(const task of tasks){
    if(!areas.has(task.workAreaId))areas.set(task.workAreaId,{name:task.workArea,sections:new Map()});
    const area=areas.get(task.workAreaId)!;
    if(!area.sections.has(task.workSectionId))area.sections.set(task.workSectionId,{name:task.workSection,tasks:[]});
    area.sections.get(task.workSectionId)!.tasks.push(task);
  }
  container.innerHTML='';
  const tree=document.createElement('div');
  tree.className='activityMoveTree';
  let selectedButton:HTMLButtonElement|null=null;

  for(const area of areas.values()){
    const areaNode=document.createElement('details');
    areaNode.className='moveTreeArea';
    areaNode.open=true;
    const areaSummary=document.createElement('summary');
    areaSummary.innerHTML=`<span>▣</span><b>${escapeHtml(area.name)}</b>`;
    areaNode.append(areaSummary);

    for(const section of area.sections.values()){
      const sectionNode=document.createElement('details');
      sectionNode.className='moveTreeSection';
      sectionNode.open=section.tasks.some(task=>task.id===sourceTaskId);
      const sectionSummary=document.createElement('summary');
      sectionSummary.innerHTML=`<span>⌖</span><b>${escapeHtml(section.name)}</b>`;
      sectionNode.append(sectionSummary);
      const taskList=document.createElement('div');
      taskList.className='moveTreeTasks';

      for(const task of section.tasks){
        const current=task.id===sourceTaskId;
        const unavailable=task.status==='review'||task.status==='done';
        const button=document.createElement('button');
        button.type='button';
        button.className=`moveTreeTask${current?' current':''}${unavailable?' unavailable':''}`;
        button.disabled=current||unavailable;
        const label=current?'Nuvarande':unavailable?(task.status==='done'?'Klart':'Under kontroll'):'';
        button.innerHTML=`<span>🧩</span><b>${escapeHtml(task.title)}</b>${label?`<small>${label}</small>`:''}`;
        if(!button.disabled)button.addEventListener('click',()=>{
          selectedButton?.classList.remove('selected');
          button.classList.add('selected');
          selectedButton=button;
          onSelect(task.id);
        });
        taskList.append(button);
      }
      sectionNode.append(taskList);
      areaNode.append(sectionNode);
    }
    tree.append(areaNode);
  }
  container.append(tree);
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]||char));}
