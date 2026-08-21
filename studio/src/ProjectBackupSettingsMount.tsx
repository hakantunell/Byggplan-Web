import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ProjectBackupView} from './ProjectBackupView';

export function ProjectBackupSettingsMount(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[projectId,setProjectId]=useState('');
 const[projectName,setProjectName]=useState('');
 useEffect(()=>{
  let host:HTMLElement|null=null;
  const sync=()=>{
   const workspace=document.querySelector('.projectWorkspace') as HTMLElement|null;
   const select=workspace?.querySelector('.topbar select') as HTMLSelectElement|null;
   const page=workspace?.querySelector('.projectMain .projectPage') as HTMLElement|null;
   const isSettings=page?.querySelector('.pageHero small')?.textContent?.trim()==='INSTÄLLNINGAR';
   const nextId=select?.value||'';
   if(!workspace||!page||!isSettings||!nextId){host?.remove();host=null;setTarget(null);setProjectId('');setProjectName('');return;}
   if(!host||!host.isConnected){
    host=document.createElement('section');
    host.className='infoCard projectBackupSettingsHost';
    const danger=Array.from(page.querySelectorAll(':scope > .infoCard')).find(card=>card.classList.contains('dangerZone')) as HTMLElement|undefined;
    if(danger)danger.insertAdjacentElement('beforebegin',host);else page.appendChild(host);
    setTarget(host);
   }
   setProjectId(nextId);
   setProjectName(select?.selectedOptions?.[0]?.textContent?.trim()||'Projekt');
  };
  sync();
  const timer=window.setInterval(sync,180);
  return()=>{window.clearInterval(timer);host?.remove();setTarget(null)};
 },[]);
 if(!target||!projectId)return null;
 return createPortal(<ProjectBackupView projectId={projectId} projectName={projectName}/>,target);
}
