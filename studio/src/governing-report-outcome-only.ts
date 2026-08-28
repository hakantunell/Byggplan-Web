let installed=false;

function cleanGoverningReport(){
  for(const node of Array.from(document.querySelectorAll<HTMLElement>('.governingReports .reportComment'))){
    // reportComment is the governing item's internal handling_comment.
    // Activity outcome comments are rendered separately in ReportEvidence
    // as .reportActivityComments and must remain visible for KA/municipality.
    node.hidden=true;
    node.setAttribute('aria-hidden','true');
    node.dataset.internalHandlingComment='1';
  }
}

export function installGoverningReportOutcomeOnly(){
  if(installed)return;
  installed=true;
  const run=()=>cleanGoverningReport();
  const observer=new MutationObserver(run);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
}
