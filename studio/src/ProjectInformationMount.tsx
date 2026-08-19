import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ProjectInformationEditor} from './ProjectInformationEditor';

export function ProjectInformationMount(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[projectId,setProjectId]=useState('');
 useEffect(()=>{
  let currentCard:HTMLElement|null=null;
  let host:HTMLElement|null=null;
  const sync=()=>{
   const workspace=document.querySelector('.projectWorkspace') as HTMLElement|null;
   const select=workspace?.querySelector('.topbar select') as HTMLSelectElement|null;
   const page=workspace?.querySelector('.projectMain .projectPage') as HTMLElement|null;
   const isInformation=page?.querySelector('.pageHero small')?.textContent?.trim()==='PROJEKTINFORMATION';
   const nextId=select?.value||'';
   if(!workspace||!page||!isInformation||!nextId){
    if(currentCard)currentCard.style.display='';
    host?.remove();currentCard=null;host=null;setTarget(null);setProjectId('');return;
   }
   const cards=Array.from(page.querySelectorAll(':scope > .infoCard')) as HTMLElement[];
   const card=cards.find(x=>x.querySelector('h3')?.textContent?.trim()==='KA och myndighetsinformation')||null;
   if(!card)return;
   if(card!==currentCard){
    if(currentCard)currentCard.style.display='';
    host?.remove();
    currentCard=card;
    card.style.display='none';
    host=document.createElement('div');
    host.className='projectInformationLiveHost';
    card.insertAdjacentElement('afterend',host);
    setTarget(host);
   }
   setProjectId(nextId);
  };
  sync();
  const timer=window.setInterval(sync,200);
  return()=>{window.clearInterval(timer);if(currentCard)currentCard.style.display='';host?.remove();setTarget(null)};
 },[]);
 if(!target||!projectId)return null;
 return createPortal(<ProjectInformationEditor projectId={projectId}/>,target);
}
