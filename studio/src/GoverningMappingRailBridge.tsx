import {useEffect} from 'react';

type Props={warningCount:number;onOpen:()=>void};

export function GoverningMappingRailBridge({warningCount,onOpen}:Props){
  useEffect(()=>{
    let button:HTMLButtonElement|null=null;
    let observer:MutationObserver|null=null;

    const sync=()=>{
      const rail=document.querySelector('.projectWorkspace .rail') as HTMLElement|null;
      if(!rail)return;
      const governing=Array.from(rail.querySelectorAll(':scope > button')).find(b=>b.getAttribute('title')==='Styrdokument') as HTMLButtonElement|undefined;
      if(!governing)return;

      let existing=rail.querySelector(':scope > button.governingMappingRailButton') as HTMLButtonElement|null;
      if(!existing){
        existing=document.createElement('button');
        existing.type='button';
        existing.className='governingMappingRailButton';
        governing.insertAdjacentElement('afterend',existing);
      }
      button=existing;
      button.title=warningCount>0?`Kartläggning – ${warningCount} punkt${warningCount===1?'':'er'} behöver åtgärdas`:'Kartläggning';
      button.innerHTML=`<span class="railIconWrap">🧭${warningCount>0?'<em class="railWarningBadge">⚠</em>':''}</span><span>Kartläggning</span>`;
      button.onclick=(event)=>{event.preventDefault();onOpen()};
    };

    sync();
    observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{
      observer?.disconnect();
      if(button){button.onclick=null;button.remove()}
    };
  },[warningCount,onOpen]);
  return null;
}
