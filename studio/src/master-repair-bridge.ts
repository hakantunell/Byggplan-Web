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
  if(!window.confirm('Detta är en strukturell reparation från Master och kan skapa, flytta eller synkronisera moment och aktiviteter.\n\nFör enbart nya momenttexter använder du ”Uppdatera momentbeskrivningar”.\n\nVill du fortsätta med strukturreparationen?'))return;
  busy=true;
  const oldText=button.textContent;
  button.disabled=true;
  button.textContent='Reparerar struktur…';
  void (async()=>{
   try{
    const response=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/repair-from-master`,{method:'POST'});
    const data=await response.json().catch(()=>({})) as {error?:string;master?:{version?:number};created?:{areas?:number;sections?:number;tasks?:number;activities?:number;retired?:number;refreshedTasks?:number}};
    if(!response.ok)throw new Error(data.error||'Projektet kunde inte repareras från Master.');
    const c=data.created||{};
    const parts=[c.refreshedTasks?`${c.refreshedTasks} moment synkroniserade`:'',c.tasks?`${c.tasks} moment skapade`:'',c.activities?`${c.activities} aktiviteter skapade`:'',c.retired?`${c.retired} äldre aktiviteter pensionerade`:''].filter(Boolean);
    button.textContent='Klart';
    window.alert(`Projektstrukturen är reparerad från Master${data.master?.version?` v${data.master.version}`:''}.${parts.length?`\n${parts.join(' · ')}`:''}`);
    window.location.reload();
   }catch(error){window.alert(error instanceof Error?error.message:'Projektet kunde inte repareras från Master.');button.disabled=false;button.textContent=oldText;busy=false}
  })();
 },true);
}
