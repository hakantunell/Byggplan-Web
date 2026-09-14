type MoveActivity={id:string;title:string};
type MoveTask={id:string;workArea:string;workSection:string;title:string;status:string;activities:MoveActivity[]};

const PROJECT_STORAGE_KEY='byggplan.studio.projectId';
const NORMALIZE=(value:string|undefined|null)=>(value||'').replace(/\s+/g,' ').trim();

export function installActivityMoveBridge(){
 let tasks:MoveTask[]=[];
 let loadedProjectId='';
 let loading:Promise<void>|null=null;
 let dragged:{activityId:string;taskId:string}|null=null;
 let syncTimer:number|undefined;

 async function ensureTasks(){
  const projectId=localStorage.getItem(PROJECT_STORAGE_KEY)||'';
  if(!projectId){tasks=[];loadedProjectId='';return}
  if(projectId===loadedProjectId&&tasks.length)return;
  if(loading)return loading;
  loading=(async()=>{
   try{
    const response=await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
    const data=await response.json().catch(()=>({})) as {tasks?:MoveTask[]};
    if(!response.ok)throw new Error('Kunde inte läsa projektstrukturen.');
    tasks=data.tasks||[];loadedProjectId=projectId;
   }catch{tasks=[];loadedProjectId=''}finally{loading=null}
  })();
  return loading;
 }

 function legacyLabel(row:HTMLElement|null){return NORMALIZE(row?.querySelector<HTMLElement>('.projectTreeLabel')?.textContent)}
 function embeddedLabel(row:HTMLElement|null){return NORMALIZE(row?.querySelector<HTMLElement>('.projectsHierarchySelect > span:nth-child(2)')?.textContent)}
 function legacyDepth(row:HTMLElement){return Math.round((parseInt(row.style.paddingLeft||'0',10)-10)/16)}
 function embeddedDepth(row:HTMLElement){return Math.round(parseInt(row.style.paddingLeft||'0',10)/13)}

 function resolveLegacyTask(row:HTMLElement){
  const taskWrapper=row.parentElement;
  const sectionWrapper=taskWrapper?.parentElement;
  const areaWrapper=sectionWrapper?.parentElement;
  const taskTitle=legacyLabel(row);
  const sectionTitle=legacyLabel(sectionWrapper?.querySelector<HTMLElement>(':scope > .projectTreeRow')||null);
  const areaTitle=legacyLabel(areaWrapper?.querySelector<HTMLElement>(':scope > .projectTreeRow')||null);
  return tasks.find(task=>NORMALIZE(task.title)===taskTitle&&NORMALIZE(task.workSection)===sectionTitle&&NORMALIZE(task.workArea)===areaTitle)||null;
 }

 function resolveEmbeddedTask(row:HTMLElement){
  const taskWrapper=row.parentElement;
  const sectionWrapper=taskWrapper?.parentElement;
  const areaWrapper=sectionWrapper?.parentElement;
  const taskTitle=embeddedLabel(row);
  const sectionTitle=embeddedLabel(sectionWrapper?.querySelector<HTMLElement>(':scope > .projectsHierarchyRow')||null);
  const areaTitle=embeddedLabel(areaWrapper?.querySelector<HTMLElement>(':scope > .projectsHierarchyRow')||null);
  return tasks.find(task=>NORMALIZE(task.title)===taskTitle&&NORMALIZE(task.workSection)===sectionTitle&&NORMALIZE(task.workArea)===areaTitle)||null;
 }

 function clearRows(rows:HTMLElement[]){
  for(const row of rows){
   row.draggable=false;
   row.classList.remove('activityTreeDraggable','activityTreeDropTarget','activityTreeDropHover','activityTreeDragging');
   delete row.dataset.activityId;delete row.dataset.taskId;
  }
 }

 function bindLegacyRows(editMode:boolean){
  const rows=Array.from(document.querySelectorAll<HTMLElement>('.projectWorkspace .projectTreeRow'));
  clearRows(rows);
  if(!editMode||!tasks.length)return;
  for(const row of rows.filter(item=>legacyDepth(item)===3)){
   const task=resolveLegacyTask(row);if(!task)continue;
   row.dataset.taskId=task.id;row.classList.add('activityTreeDropTarget');
  }
  for(const taskRow of rows.filter(item=>legacyDepth(item)===3)){
   const taskId=taskRow.dataset.taskId;if(!taskId)continue;
   const task=tasks.find(item=>item.id===taskId);if(!task)continue;
   const wrapper=taskRow.parentElement;if(!wrapper)continue;
   const activityRows=Array.from(wrapper.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node.classList.contains('projectTreeRow')&&legacyDepth(node)===4);
   activityRows.forEach((row,index)=>{
    const activity=task.activities[index];if(!activity)return;
    row.dataset.activityId=activity.id;row.dataset.taskId=task.id;row.draggable=true;row.classList.add('activityTreeDraggable');row.title='Dra aktiviteten till ett annat moment';
   });
  }
 }

 function bindEmbeddedRows(editMode:boolean){
  const rows=Array.from(document.querySelectorAll<HTMLElement>('.projectsTree .projectsHierarchyRow'));
  clearRows(rows);
  if(!editMode||!tasks.length)return;
  for(const row of rows.filter(item=>embeddedDepth(item)===3)){
   const task=resolveEmbeddedTask(row);if(!task)continue;
   row.dataset.taskId=task.id;row.classList.add('activityTreeDropTarget');
   const wrapper=row.parentElement;if(!wrapper)continue;
   const activityRows=Array.from(wrapper.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node.classList.contains('projectsHierarchyRow')&&embeddedDepth(node)===4);
   activityRows.forEach((activityRow,index)=>{
    const activity=task.activities[index];if(!activity)return;
    activityRow.dataset.activityId=activity.id;activityRow.dataset.taskId=task.id;activityRow.draggable=true;activityRow.classList.add('activityTreeDraggable');activityRow.title='Dra aktiviteten till ett annat moment';
   });
  }
 }

 function bindRows(){
  const legacyEditMode=Boolean(document.querySelector('.projectWorkspace.editMode'));
  const embeddedEditMode=Boolean(document.querySelector('.embeddedProjectMain.embeddedEditMode'));
  bindLegacyRows(legacyEditMode);
  bindEmbeddedRows(embeddedEditMode);
 }

 async function sync(){await ensureTasks();bindRows()}
 function scheduleSync(){window.clearTimeout(syncTimer);syncTimer=window.setTimeout(()=>void sync(),40)}

 document.addEventListener('dragstart',event=>{
  const row=(event.target as HTMLElement|null)?.closest<HTMLElement>('.activityTreeDraggable');
  if(!row?.dataset.activityId||!row.dataset.taskId)return;
  dragged={activityId:row.dataset.activityId,taskId:row.dataset.taskId};row.classList.add('activityTreeDragging');
  event.dataTransfer?.setData('text/plain',row.dataset.activityId);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
 });
 document.addEventListener('dragend',()=>{
  dragged=null;document.querySelectorAll('.activityTreeDragging,.activityTreeDropHover').forEach(node=>node.classList.remove('activityTreeDragging','activityTreeDropHover'));
 });
 document.addEventListener('dragover',event=>{
  if(!dragged)return;
  const target=(event.target as HTMLElement|null)?.closest<HTMLElement>('.activityTreeDropTarget');
  if(!target?.dataset.taskId||target.dataset.taskId===dragged.taskId)return;
  event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';
  document.querySelectorAll('.activityTreeDropHover').forEach(node=>{if(node!==target)node.classList.remove('activityTreeDropHover')});target.classList.add('activityTreeDropHover');
 });
 document.addEventListener('dragleave',event=>{
  const target=(event.target as HTMLElement|null)?.closest<HTMLElement>('.activityTreeDropTarget');
  if(target&&!target.contains(event.relatedTarget as Node|null))target.classList.remove('activityTreeDropHover');
 });
 document.addEventListener('drop',event=>{
  if(!dragged)return;
  const target=(event.target as HTMLElement|null)?.closest<HTMLElement>('.activityTreeDropTarget');
  if(!target?.dataset.taskId||target.dataset.taskId===dragged.taskId)return;
  event.preventDefault();target.classList.remove('activityTreeDropHover');
  const move={...dragged};const targetTaskId=target.dataset.taskId;dragged=null;
  void (async()=>{
   try{
    const response=await fetch(`/api/activities/${encodeURIComponent(move.activityId)}/move`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetTaskId})});
    const data=await response.json().catch(()=>({})) as {error?:string};
    if(!response.ok)throw new Error(data.error||'Aktiviteten kunde inte flyttas.');
    showMessage('Aktiviteten flyttad');
    tasks=[];loadedProjectId='';
    const movedRow=document.querySelector<HTMLElement>(`.activityTreeDraggable[data-activity-id="${CSS.escape(move.activityId)}"]`);
    movedRow?.click();
    window.setTimeout(()=>{
     const save=Array.from(document.querySelectorAll<HTMLButtonElement>('.projectMain .editActions button.primary')).find(button=>NORMALIZE(button.textContent)==='Spara ändringar');
     if(save){save.click();return}
     scheduleSync();
    },60);
   }catch(error){showMessage(error instanceof Error?error.message:'Aktiviteten kunde inte flyttas.',true)}
  })();
 });

 const observer=new MutationObserver(scheduleSync);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
 window.addEventListener('storage',scheduleSync);scheduleSync();

 function showMessage(text:string,error=false){
  document.querySelector('.activityTreeMoveNotice')?.remove();const note=document.createElement('div');note.className=`activityTreeMoveNotice${error?' error':''}`;note.textContent=text;document.body.append(note);window.setTimeout(()=>note.remove(),2200);
 }
}
