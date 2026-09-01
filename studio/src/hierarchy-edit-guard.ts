function refreshCreateButtonLabel(){
 const headers=document.querySelectorAll<HTMLElement>('.projectMain .nodeHeader');
 for(const header of headers){
  const level=(header.querySelector('small')?.textContent||'').trim().toUpperCase();
  const button=[...header.querySelectorAll<HTMLButtonElement>('button')].find(b=>(b.textContent||'').includes('Lägg till underliggande')||(b.dataset.hierarchyCreateButton==='1'));
  if(!button)continue;
  const label=level.includes('EDITERA AREA')?'＋ Nytt avsnitt':level.includes('EDITERA SECTION')?'＋ Nytt moment':level.includes('EDITERA TASK')?'＋ Ny aktivitet':'';
  if(!label)continue;
  button.dataset.hierarchyCreateButton='1';
  if(button.textContent!==label)button.textContent=label;
 }
}

export function installHierarchyEditGuard(){
 if(typeof document==='undefined')return;
 document.addEventListener('click',event=>{
  const target=event.target as HTMLElement|null;
  const toggleButton=target?.closest<HTMLButtonElement>('.projectTreeRow > button');
  if(!toggleButton)return;
  const row=toggleButton.closest<HTMLElement>('.projectTreeRow');
  if(!row||!row.closest('.projectTree'))return;
  // Expanding/collapsing a hierarchy row must also select that hierarchy level.
  // Otherwise the editor can keep the previously selected task and create an
  // activity there even though the user is visually working on an avsnitt.
  queueMicrotask(()=>{if(!row.classList.contains('selected'))row.click()});
 },true);
 const observer=new MutationObserver(()=>refreshCreateButtonLabel());
 observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
 refreshCreateButtonLabel();
}
