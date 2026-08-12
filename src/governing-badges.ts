let installed=false;
let scheduled=false;

function governedActivityCount(root:ParentNode){
  return [...root.querySelectorAll('.activitySummaryText > b')]
    .filter(node=>String(node.textContent||'').includes('📋')).length;
}

function ensureBadge(header:Element,count:number,label:string){
  let badge=header.querySelector(':scope > .governingBadge') as HTMLElement|null;
  if(count<=0){badge?.remove();return;}
  if(!badge){
    badge=document.createElement('span');
    badge.className='governingBadge';
    const expander=header.querySelector(':scope > em');
    if(expander)header.insertBefore(badge,expander);else header.appendChild(badge);
  }
  badge.textContent=`📋 ${count}`;
  badge.title=`${count} ${label} kopplade till styrdokument`;
  badge.setAttribute('aria-label',badge.title);
}

function refreshBadges(){
  scheduled=false;
  for(const task of document.querySelectorAll('.taskCard')){
    const count=governedActivityCount(task);
    const header=task.querySelector(':scope > .taskHeader');
    if(header)ensureBadge(header,count,'aktiviteter');
  }
  for(const area of document.querySelectorAll('.areaCard')){
    const count=governedActivityCount(area);
    const header=area.querySelector(':scope > .areaHeader');
    if(header)ensureBadge(header,count,'aktiviteter');
  }
}

function scheduleRefresh(){
  if(scheduled)return;
  scheduled=true;
  window.requestAnimationFrame(refreshBadges);
}

export function installGoverningBadges(){
  if(installed)return;
  installed=true;
  const observer=new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('byggplan:active-project',scheduleRefresh);
  scheduleRefresh();
}
