export type StatusTask={workArea:string;workSection:string;title:string;activities:{id:string;title:string;done:boolean}[]};

function taskComplete(task:StatusTask|undefined){return Boolean(task?.activities?.length)&&task!.activities.every(activity=>activity.done)}

export function paintHierarchyStatus(tasks:StatusTask[]){
 let area='',section='',taskTitle='';
 for(const row of Array.from(document.querySelectorAll('.projectTreeRow')) as HTMLElement[]){
  const depth=Math.max(0,Math.round((parseInt(row.style.paddingLeft||'10',10)-10)/16));
  const label=(row.querySelector('.projectTreeLabel')?.textContent||'').trim();
  if(depth===1)area=label;if(depth===2)section=label;if(depth===3)taskTitle=label;
  if(depth===3){
   const task=tasks.find(item=>item.workArea===area&&item.workSection===section&&item.title===taskTitle);const done=taskComplete(task);
   const icon=Array.from(row.children).find(child=>child instanceof HTMLElement&&child.tagName==='SPAN'&&!child.classList.contains('projectTreeLabel')&&!child.classList.contains('navSpacer')&&!child.classList.contains('hierGov')) as HTMLElement|undefined;
   if(icon){icon.textContent=done?'✓':'▣';icon.classList.toggle('hierMomentDone',done)}
  }
  if(depth===4){
   const activity=tasks.find(item=>item.workArea===area&&item.workSection===section&&item.title===taskTitle)?.activities.find(item=>item.title===label);
   const icon=Array.from(row.children).find(child=>child instanceof HTMLElement&&child.tagName==='SPAN'&&!child.classList.contains('projectTreeLabel')&&!child.classList.contains('navSpacer')&&!child.classList.contains('hierGov')) as HTMLElement|undefined;
   if(icon&&activity){icon.textContent=activity.done?'✓':'○';icon.classList.toggle('done',activity.done)}
  }
 }
 const header=document.querySelector('.projectPage .nodeHeader') as HTMLElement|null;if(!header)return;
 const nodeType=(header.querySelector('small')?.textContent||'').trim();
 const path=(header.querySelector('p')?.textContent||'').split('›').map(value=>value.trim()).filter(Boolean);
 const rows=Array.from(document.querySelectorAll('.projectPage .nodeChildren article')) as HTMLElement[];
 if(nodeType==='ARBETSAVSNITT')for(const row of rows){const label=(row.querySelector('b')?.textContent||'').trim();const task=tasks.find(item=>item.workArea===path[0]&&item.workSection===path[1]&&item.title===label);const done=taskComplete(task);const icon=row.firstElementChild as HTMLElement|null;if(icon){icon.textContent=done?'✓':'▣';icon.className=done?'momentDone hierMomentDone':'momentTodo'}row.classList.toggle('completed',done)}
 if(nodeType==='MOMENT'){const task=tasks.find(item=>item.workArea===path[0]&&item.workSection===path[1]&&item.title===path[2]);for(const row of rows){const label=(row.querySelector('b')?.textContent||'').trim();const activity=task?.activities.find(item=>item.title===label);const icon=row.firstElementChild as HTMLElement|null;if(icon&&activity){icon.textContent=activity.done?'✓':'○';icon.className=activity.done?'momentDone':'momentTodo';row.classList.toggle('completed',activity.done)}}}
}
