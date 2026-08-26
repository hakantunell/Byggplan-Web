import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {GoverningReportsView} from './GoverningReportsView';
import {BuildDocumentationReport} from './BuildDocumentationReport';

export function ProjectReportsMount({projectId}:{projectId:string}){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[mode,setMode]=useState<'documentation'|'governing'>('documentation');
 const[projectName,setProjectName]=useState('Projekt');
 useEffect(()=>{let timer=0;function sync(){const workspace=document.querySelector('.projectWorkspace') as HTMLElement|null;const main=workspace?.querySelector('.projectMain') as HTMLElement|null;const pages=main?.querySelectorAll(':scope > .projectPage')||[];let reportPlaceholder:HTMLElement|null=null;for(const page of Array.from(pages) as HTMLElement[]){if(page.querySelector('.pageHero h1')?.textContent?.trim()==='Rapporter'){reportPlaceholder=page;break}}if(reportPlaceholder&&main){reportPlaceholder.style.display='none';const select=workspace?.querySelector('.topbar select') as HTMLSelectElement|null;setProjectName(select?.selectedOptions?.[0]?.textContent?.trim()||'Projekt');setTarget(main)}else setTarget(null);timer=window.setTimeout(sync,250)}sync();return()=>window.clearTimeout(timer)},[projectId]);
 if(!target)return null;
 return createPortal(<div className="projectReportsHub"><div className="projectReportTabs"><button className={mode==='documentation'?'active':''} onClick={()=>setMode('documentation')}>📘 Byggdokumentation</button><button className={mode==='governing'?'active':''} onClick={()=>setMode('governing')}>📋 Styrdokument</button></div>{mode==='documentation'?<BuildDocumentationReport projectId={projectId} projectName={projectName}/>:<GoverningReportsView projectId={projectId}/>}</div>,target);
}
