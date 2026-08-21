import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {SystemBackupView} from './SystemBackupView';

export function SystemBackupSettingsMount(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  let host:HTMLElement|null=null;
  const sync=()=>{
   const workspace=document.querySelector('.projectWorkspace') as HTMLElement|null;
   const page=workspace?.querySelector('.projectMain .projectPage') as HTMLElement|null;
   const isSettings=page?.querySelector('.pageHero small')?.textContent?.trim()==='INSTÄLLNINGAR';
   if(!workspace||!page||!isSettings){host?.remove();host=null;setTarget(null);return;}
   if(!host||!host.isConnected){
    host=document.createElement('section');host.className='infoCard systemBackupSettingsHost';
    const danger=Array.from(page.querySelectorAll(':scope > .infoCard')).find(card=>card.classList.contains('dangerZone')) as HTMLElement|undefined;
    if(danger)danger.insertAdjacentElement('beforebegin',host);else page.appendChild(host);
    setTarget(host);
   }
  };
  sync();const timer=window.setInterval(sync,180);
  return()=>{window.clearInterval(timer);host?.remove();setTarget(null)};
 },[]);
 if(!target)return null;
 return createPortal(<SystemBackupView/>,target);
}
