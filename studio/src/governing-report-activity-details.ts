let installed=false;

function refineLinkedActivities(){
  for(const block of Array.from(document.querySelectorAll<HTMLElement>('.governingReports .reportActivities'))){
    if(block.closest('details.reportLinkedActivities'))continue;
    const details=document.createElement('details');
    details.className='reportLinkedActivities';
    const summary=document.createElement('summary');
    summary.textContent='ⓘ Kopplade aktiviteter';
    block.parentNode?.insertBefore(details,block);
    details.append(summary,block);
  }
}

export function installGoverningReportActivityDetails(){
  if(installed)return;
  installed=true;
  const run=()=>refineLinkedActivities();
  const observer=new MutationObserver(run);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
}
