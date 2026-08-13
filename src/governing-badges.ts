let installed=false;
let scheduled=false;

const COUNT_SUFFIX=/\s*📋\s*(\d+)\s*$/;
const COUNT_ATTRIBUTE='data-governing-count';

function ensureBadge(header:Element,count:number){
  let badge=header.querySelector(':scope > .governingBadge') as HTMLElement|null;
  if(count<=0){badge?.remove();return;}
  if(!badge){
    badge=document.createElement('span');
    badge.className='governingBadge';
    const expander=header.querySelector(':scope > em');
    if(expander)header.insertBefore(badge,expander);else header.appendChild(badge);
  }
  badge.textContent=`📋 ${count}`;
  badge.title=`${count} aktiviteter kopplade till styrdokument`;
  badge.setAttribute('aria-label',badge.title);
}

function normalizeHeader(header:Element){
  const title=header.querySelector(':scope > .headerText > b');
  if(!title)return;
  const text=String(title.textContent||'');
  const match=text.match(COUNT_SUFFIX);
  if(match){
    const count=Number(match[1]||0);
    header.setAttribute(COUNT_ATTRIBUTE,String(count));
    title.textContent=text.replace(COUNT_SUFFIX,'').trimEnd();
    ensureBadge(header,count);
    return;
  }

  // React can re-render the header and remove the injected badge while keeping
  // the already-normalized title text. Keep the last known count on the stable
  // header element so the badge can be recreated after that render.
  const storedCount=Number(header.getAttribute(COUNT_ATTRIBUTE)||0);
  if(storedCount>0){
    ensureBadge(header,storedCount);
    return;
  }

  const badge=header.querySelector(':scope > .governingBadge') as HTMLElement|null;
  if(badge&&!/^📋\s*\d+$/.test(String(badge.textContent||'')))badge.remove();
}

function refreshBadges(){
  scheduled=false;
  for(const header of document.querySelectorAll('.areaHeader,.sectionHeader,.taskHeader'))normalizeHeader(header);
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
