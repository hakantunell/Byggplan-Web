let installed=false;

function decorateReportComments(){
  for(const activity of Array.from(document.querySelectorAll<HTMLElement>('.buildDocReport .paperActivity'))){
    for(const note of Array.from(activity.querySelectorAll<HTMLParagraphElement>(':scope > p'))){
      if(note.dataset.activityComment==='1')continue;
      note.dataset.activityComment='1';
      note.classList.add('reportActivityComment');
      const label=document.createElement('strong');
      label.className='reportActivityCommentLabel';
      label.textContent='Kommentar:';
      note.prepend(label,document.createTextNode(' '));
    }
  }
  for(const label of Array.from(document.querySelectorAll<HTMLElement>('.buildDocReport .buildDocMaterial .materialBody > b'))){
    if(label.textContent?.trim()==='Anteckning')label.textContent='Kommentar';
  }
}

export function installReportActivityComments(){
  if(installed)return;
  installed=true;
  const run=()=>decorateReportComments();
  const observer=new MutationObserver(run);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
}
