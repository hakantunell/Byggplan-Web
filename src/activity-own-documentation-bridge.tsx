import {createRoot,Root} from 'react-dom/client';
import {ActivityOwnDocumentation} from './ActivityOwnDocumentation';

type ActivityType='perform'|'document'|'measurement'|'check'|'approval'|'note'|'choice';
let installed=false;
const roots=new Map<HTMLElement,Root>();
const types:ActivityType[]=['perform','document','measurement','check','approval','note','choice'];

function activityType(row:HTMLElement):ActivityType{
  const icon=row.querySelector('.activityIcon');
  return types.find(type=>icon?.classList.contains(type))||'perform';
}

function scan(){
  for(const row of document.querySelectorAll<HTMLElement>('.activityRow[data-activity-id]')){
    const details=row.querySelector<HTMLElement>('.activityDetails');
    if(!details||details.querySelector('.ownDocumentationMount'))continue;
    const activityId=String(row.dataset.activityId||'');if(!activityId)continue;
    const mount=document.createElement('div');mount.className='ownDocumentationMount';
    const action=details.querySelector('.activityAction');
    if(action)details.insertBefore(mount,action);else details.appendChild(mount);
    const readOnly=row.classList.contains('future')||!action;
    const root=createRoot(mount);roots.set(mount,root);
    root.render(<ActivityOwnDocumentation activityId={activityId} activityType={activityType(row)} readOnly={readOnly}/>);
  }
  for(const [mount,root] of [...roots.entries()]){
    if(document.documentElement.contains(mount))continue;
    root.unmount();roots.delete(mount);
  }
}

export function installActivityOwnDocumentation(){
  if(installed)return;installed=true;
  const observer=new MutationObserver(()=>queueMicrotask(scan));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  scan();
}
