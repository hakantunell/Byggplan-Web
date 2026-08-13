function text(value:unknown){return String(value||'').trim()}

function findSourceContext(dialog:HTMLElement){
  const header=dialog.querySelector('p');
  const headerText=text(header?.textContent);
  const match=headerText.match(/Styrpost\s+([^:]+):/i);
  const code=match?.[1]?.trim();
  if(!code)return '';
  for(const article of document.querySelectorAll<HTMLElement>('.mappingItem')){
    const title=text(article.querySelector('h3')?.textContent);
    if(!title.startsWith(code))continue;
    return text(article.querySelector('.mappingItemTitle > small')?.textContent);
  }
  return '';
}

function enhanceDialog(dialog:HTMLElement){
  if(dialog.dataset.bpClarity==='1')return;
  const panel=dialog.querySelector<HTMLElement>(':scope > div');
  if(!panel)return;
  const grid=[...panel.querySelectorAll<HTMLElement>('div')].find(node=>{
    const labels=node.querySelectorAll(':scope > label');
    return labels.length>=3;
  });
  if(!grid)return;
  const labels=[...grid.querySelectorAll<HTMLElement>(':scope > label')];
  if(labels.length<3)return;

  dialog.dataset.bpClarity='1';
  grid.classList.add('bpCreationDialogGrid');
  labels[0].classList.add('bpActivityField','bpActivityFieldFirst');
  labels[1].classList.add('bpActivityField','bpActivityFieldLast');
  labels[2].classList.add('bpPlacementStart');

  const activityHeading=document.createElement('div');
  activityHeading.className='bpDialogSectionHeading bpActivityHeading';
  activityHeading.innerHTML='<strong>Aktivitet</strong><span>Det här är aktiviteten som kommer att skapas i projektet.</span>';
  grid.insertBefore(activityHeading,labels[0]);

  const placementHeading=document.createElement('div');
  placementHeading.className='bpDialogSectionHeading bpPlacementHeading';
  placementHeading.innerHTML='<strong>Placering</strong><span>Välj var aktiviteten ska ligga i projektstrukturen.</span>';
  grid.insertBefore(placementHeading,labels[2]);

  const sourceContext=findSourceContext(dialog);
  const headerBlock=panel.firstElementChild as HTMLElement|null;
  if(headerBlock){
    const requirement=document.createElement('div');
    requirement.className='bpRequirementContext';
    requirement.innerHTML=`<small>STYRANDE KRAV</small><strong>${sourceContext||'Styrande dokument'}</strong><span>${text(headerBlock.querySelector('p')?.textContent).replace(/^Styrpost\s+/i,'')}</span>`;
    headerBlock.insertAdjacentElement('afterend',requirement);
  }
}

function scan(){
  for(const dialog of document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))enhanceDialog(dialog);
}

const observer=new MutationObserver(scan);
observer.observe(document.documentElement,{childList:true,subtree:true});
scan();

// Project hierarchy completion: a work section is complete when every active
// moment in the section is complete. Deprecated activities are ignored.
let sectionStatusTimer=0;
async function refreshSectionStatus(){
  const projectId=(document.querySelector('.projectWorkspace .topbar select') as HTMLSelectElement|null)?.value||'';
  if(!projectId){sectionStatusTimer=window.setTimeout(refreshSectionStatus,1000);return;}
  try{
    const bust=Date.now().toString(36);
    const[taskResponse,metaResponse]=await Promise.all([
      fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}&__section=${bust}`,{cache:'no-store'}),
      fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}&__section=${bust}`,{cache:'no-store'})
    ]);
    const taskData=taskResponse.ok?await taskResponse.json():{tasks:[]};
    const metaData=metaResponse.ok?await metaResponse.json():{items:[]};
    const tasks=Array.isArray(taskData.tasks)?taskData.tasks:[];
    const deprecated=new Set<string>((metaData.items||[]).filter((item:any)=>item.applicability==='deprecated').map((item:any)=>item.activity_id));
    const taskComplete=(task:any)=>{
      const active=(task?.activities||[]).filter((activity:any)=>!deprecated.has(activity.id));
      return active.length>0&&active.every((activity:any)=>activity.done);
    };
    const sectionComplete=(area:string,section:string)=>{
      const sectionTasks=tasks.filter((task:any)=>task.workArea===area&&task.workSection===section);
      return sectionTasks.length>0&&sectionTasks.every(taskComplete);
    };

    let area='';
    for(const row of Array.from(document.querySelectorAll('.projectTreeRow')) as HTMLElement[]){
      const depth=Math.max(0,Math.round((parseInt(row.style.paddingLeft||'10',10)-10)/16));
      const label=(row.querySelector('.projectTreeLabel')?.textContent||'').trim();
      if(depth===1)area=label;
      if(depth!==2)continue;
      const complete=sectionComplete(area,label);
      const icon=Array.from(row.children).find(child=>child instanceof HTMLElement&&child.tagName==='SPAN'&&!child.classList.contains('projectTreeLabel')&&!child.classList.contains('navSpacer')&&!child.classList.contains('hierGov')) as HTMLElement|undefined;
      if(icon){icon.textContent=complete?'✓':'⌖';icon.classList.toggle('hierMomentDone',complete);}
    }

    const header=document.querySelector('.projectPage .nodeHeader') as HTMLElement|null;
    if((header?.querySelector('small')?.textContent||'').trim()==='ARBETSOMRÅDE'){
      const selectedArea=((header?.querySelector('p')?.textContent||'').split('›')[0]||'').trim();
      for(const row of Array.from(document.querySelectorAll('.projectPage .nodeChildren article')) as HTMLElement[]){
        const label=(row.querySelector('b')?.textContent||'').trim();
        const complete=sectionComplete(selectedArea,label);
        const icon=row.firstElementChild as HTMLElement|null;
        if(icon){icon.textContent=complete?'✓':'⌖';icon.className=complete?'momentDone hierMomentDone':'momentTodo';}
        row.classList.toggle('completed',complete);
      }
    }
  }catch{}
  sectionStatusTimer=window.setTimeout(refreshSectionStatus,1200);
}
window.addEventListener('byggplan:activity-status-changed',()=>void refreshSectionStatus());
void refreshSectionStatus();
