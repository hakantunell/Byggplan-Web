const PROJECT_STORAGE_KEY='byggplan.studio.projectId';

export function installMasterRepairBridge(){
 let busy=false;
 document.addEventListener('click',event=>{
  const button=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>('button');
  if(!button||button.textContent?.trim()!=='Reparera projekt från Master')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(busy)return;
  const projectId=localStorage.getItem(PROJECT_STORAGE_KEY)||'';
  if(!projectId){window.alert('Inget projekt är valt.');return}
  busy=true;
  const oldText=button.textContent;
  button.disabled=true;
  button.textContent='Uppdaterar från Master…';
  void (async()=>{
   try{
    const response=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/repair-from-master`,{method:'POST'});
    const data=await response.json().catch(()=>({})) as {error?:string;master?:{version?:number};created?:{areas?:number;sections?:number;tasks?:number;activities?:number;retired?:number;refreshedTasks?:number}};
    if(!response.ok)throw new Error(data.error||'Projektet kunde inte uppdateras från Master.');

    const descriptionResponse=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/refresh-master-task-descriptions`,{method:'POST'});
    const descriptions=await descriptionResponse.json().catch(()=>({})) as {error?:string;updated?:number;linkedRecovered?:number};
    if(!descriptionResponse.ok)throw new Error(descriptions.error||'Momentbeskrivningarna kunde inte uppdateras.');

    const c=data.created||{};
    const parts=[
     c.refreshedTasks?`${c.refreshedTasks} moment synkroniserade`:'',
     descriptions.updated?`${descriptions.updated} beskrivningar uppdaterade`:'',
     descriptions.linkedRecovered?`${descriptions.linkedRecovered} äldre moment återkopplade till Master`:'',
     c.tasks?`${c.tasks} moment skapade`:'',
     c.activities?`${c.activities} aktiviteter skapade`:'',
     c.retired?`${c.retired} äldre aktiviteter pensionerade`:''
    ].filter(Boolean);
    button.textContent='Klart';
    window.alert(`Projektet är uppdaterat från Master${data.master?.version?` v${data.master.version}`:''}.${parts.length?`\n${parts.join(' · ')}`:''}\n\nSidan laddas om så att den nya strukturen och momentbeskrivningarna visas.`);
    window.location.reload();
   }catch(error){window.alert(error instanceof Error?error.message:'Projektet kunde inte uppdateras från Master.');button.disabled=false;button.textContent=oldText;busy=false}
  })();
 },true);
}
