const PROJECT_STORAGE_KEY='byggplan.studio.projectId';

export function installTaskDescriptionRefreshBridge(){
 let busy=false;
 const ensureButton=()=>{
  const repair=Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.textContent?.trim()==='Reparera projekt från Master');
  if(!repair||document.querySelector('.refreshTaskDescriptionsButton'))return;
  const button=document.createElement('button');button.type='button';button.className='refreshTaskDescriptionsButton';button.textContent='Uppdatera momentbeskrivningar';button.title='Uppdaterar endast generiska eller tomma momentbeskrivningar. Projektstruktur och grafberoenden ändras inte.';
  button.addEventListener('click',()=>{if(busy)return;const projectId=localStorage.getItem(PROJECT_STORAGE_KEY)||'';if(!projectId){window.alert('Inget projekt är valt.');return}busy=true;const old=button.textContent;button.disabled=true;button.textContent='Uppdaterar texter…';void(async()=>{try{const response=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/refresh-master-task-descriptions`,{method:'POST'});const data=await response.json().catch(()=>({})) as {error?:string;updated?:number;linkedRecovered?:number;unmatched?:number};if(!response.ok)throw new Error(data.error||'Momentbeskrivningarna kunde inte uppdateras.');window.alert(`${data.updated||0} momentbeskrivningar uppdaterades.\nProjektstruktur och grafberoenden lämnades oförändrade.`);window.location.reload()}catch(error){window.alert(error instanceof Error?error.message:'Momentbeskrivningarna kunde inte uppdateras.');button.disabled=false;button.textContent=old;busy=false}})()});
  repair.insertAdjacentElement('beforebegin',button);
 };
 ensureButton();const observer=new MutationObserver(ensureButton);observer.observe(document.documentElement,{childList:true,subtree:true});
}
