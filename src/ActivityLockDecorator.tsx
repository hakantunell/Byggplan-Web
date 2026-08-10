import { useEffect, useRef, useState } from 'react';

type Blocker={id:string;type:'administrative'|'activity';label:string;hard:boolean;source:string};
type LockItem={activityId:string;locked:boolean;blockers:Blocker[]};

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');

function decorateActivityLocks(items:LockItem[]){
  const locks=new Map(items.map(item=>[item.activityId,item]));
  document.querySelectorAll<HTMLElement>('[data-activity-id]').forEach(row=>{
    const activityId=row.dataset.activityId||'';
    const lock=locks.get(activityId);
    const status=row.querySelector<HTMLElement>('.activityStatus');

    row.querySelectorAll<HTMLElement>('[data-dependency-lock-notice]').forEach(node=>node.remove());
    row.classList.toggle('dependencyLocked',Boolean(lock?.locked));

    if(status){
      if(!status.dataset.dependencyOriginalText)status.dataset.dependencyOriginalText=status.textContent||'';
      if(lock?.locked){status.textContent='Låst';status.classList.add('dependencyLockedStatus');}
      else{status.textContent=status.dataset.dependencyOriginalText||status.textContent;status.classList.remove('dependencyLockedStatus');}
    }

    row.querySelectorAll<HTMLElement>('[data-dependency-disabled="true"]').forEach(element=>{
      if(element instanceof HTMLButtonElement||element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement||element instanceof HTMLSelectElement)element.disabled=false;
      delete element.dataset.dependencyDisabled;
    });

    if(!lock?.locked)return;

    const details=row.querySelector<HTMLElement>('.activityDetails');
    if(details){
      const notice=document.createElement('div');
      notice.className='dependencyLockNotice';
      notice.dataset.dependencyLockNotice='true';
      const labels=lock.blockers.filter(item=>item.hard).map(item=>item.label);
      notice.textContent=`🔒 Låst: ${labels.join(', ')} måste vara klar innan den här aktiviteten kan utföras.`;
      const firstDescription=details.querySelector('p');
      if(firstDescription?.nextSibling)details.insertBefore(notice,firstDescription.nextSibling);
      else details.insertBefore(notice,details.firstChild);
    }

    row.querySelectorAll<HTMLElement>('.activityAction, .documentationFields input, .documentationFields textarea, .documentationFields select, .documentationFields button, .documentationFields .filePicker').forEach(element=>{
      if(element instanceof HTMLButtonElement||element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement||element instanceof HTMLSelectElement)element.disabled=true;
      element.dataset.dependencyDisabled='true';
      element.classList.add('dependencyDisabled');
    });
  });
}

export function ActivityLockDecorator(){
  const[projectId,setProjectId]=useState<string|null>(null);
  const[locks,setLocks]=useState<LockItem[]>([]);
  const projectRef=useRef<string|null>(null);

  useEffect(()=>{
    const onProject=(event:Event)=>{
      const id=(event as CustomEvent<{projectId?:string}>).detail?.projectId||null;
      projectRef.current=id;setProjectId(id);
    };
    window.addEventListener('byggplan:active-project',onProject);
    return()=>window.removeEventListener('byggplan:active-project',onProject);
  },[]);

  useEffect(()=>{
    if(!projectId){setLocks([]);return;}
    let cancelled=false;
    const load=async()=>{
      try{
        const response=await fetch(`${API_BASE}/api/activity-locks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
        if(!response.ok)return;
        const data=await response.json() as {items?:LockItem[]};
        if(!cancelled&&projectRef.current===projectId)setLocks(data.items||[]);
      }catch(error){console.warn('Kunde inte läsa aktivitetslås.',error);}
    };
    void load();
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},15000);
    const onVisible=()=>{if(document.visibilityState==='visible')void load();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[projectId]);

  useEffect(()=>{
    const apply=()=>decorateActivityLocks(locks);
    apply();
    const observer=new MutationObserver(()=>apply());
    const root=document.getElementById('root');
    if(root)observer.observe(root,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[locks]);

  return null;
}
