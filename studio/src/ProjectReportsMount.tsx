import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {GoverningReportsView} from './GoverningReportsView';

export function ProjectReportsMount({projectId}:{projectId:string}){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{let timer=0;function sync(){const main=document.querySelector('.projectWorkspace .projectMain') as HTMLElement|null;const pages=main?.querySelectorAll(':scope > .projectPage')||[];let reportPlaceholder:HTMLElement|null=null;for(const page of Array.from(pages) as HTMLElement[]){if(page.querySelector('.pageHero h1')?.textContent?.trim()==='Rapporter'){reportPlaceholder=page;break}}if(reportPlaceholder&&main){reportPlaceholder.style.display='none';setTarget(main)}else setTarget(null);timer=window.setTimeout(sync,250)}sync();return()=>window.clearTimeout(timer)},[projectId]);
 if(!target)return null;
 return createPortal(<GoverningReportsView projectId={projectId}/>,target);
}
