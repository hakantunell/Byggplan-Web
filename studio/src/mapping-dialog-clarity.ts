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
