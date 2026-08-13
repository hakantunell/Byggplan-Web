import { useEffect } from 'react';

type MetaItem={activity_id:string;applicability?:string};

export function ProjectSectionStatus(){
  useEffect(()=>{
    let stopped=false;
    let timer=0;

    function taskComplete(task:any,deprecated:Set<string>){
      const active=(task?.activities||[]).filter((activity:any)=>!deprecated.has(activity.id));
      return active.length>0&&active.every((activity:any)=>activity.done);
    }

    function sectionComplete(tasks:any[],area:string,section:string,deprecated:Set<string>){
      const sectionTasks=tasks.filter((task:any)=>task.workArea===area&&task.workSection===section);
      return sectionTasks.length>0&&sectionTasks.every((task:any)=>taskComplete(task,deprecated));
    }

    function setTreeIcon(row:HTMLElement,complete:boolean){
      const icon=Array.from(row.children).find(child=>child instanceof HTMLElement&&child.tagName==='SPAN'&&!child.classList.contains('projectTreeLabel')&&!child.classList.contains('navSpacer')&&!child.classList.contains('hierGov')) as HTMLElement|undefined;
      if(!icon)return;
      icon.textContent=complete?'✓':'⌖';
      icon.classList.toggle('hierMomentDone',complete);
    }

    async function refresh(){
      if(stopped)return;
      const projectId=(document.querySelector('.projectWorkspace .topbar select') as HTMLSelectElement|null)?.value||'';
      if(!projectId){timer=window.setTimeout(refresh,1000);return;}
      try{
        const bust=Date.now().toString(36);
        const[taskResponse,metaResponse]=await Promise.all([
          fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}&__section=${bust}`,{cache:'no-store'}),
          fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}&__section=${bust}`,{cache:'no-store'})
        ]);
        const taskData=taskResponse.ok?await taskResponse.json():{tasks:[]};
        const metaData=metaResponse.ok?await metaResponse.json():{items:[]};
        const tasks=Array.isArray(taskData.tasks)?taskData.tasks:[];
        const deprecated=new Set<string>((metaData.items||[]).filter((item:MetaItem)=>item.applicability==='deprecated').map((item:MetaItem)=>item.activity_id));

        let area='';
        for(const row of Array.from(document.querySelectorAll('.projectTreeRow')) as HTMLElement[]){
          const depth=Math.max(0,Math.round((parseInt(row.style.paddingLeft||'10',10)-10)/16));
          const label=(row.querySelector('.projectTreeLabel')?.textContent||'').trim();
          if(depth===1)area=label;
          if(depth===2)setTreeIcon(row,sectionComplete(tasks,area,label,deprecated));
        }

        const header=document.querySelector('.projectPage .nodeHeader') as HTMLElement|null;
        const nodeType=(header?.querySelector('small')?.textContent||'').trim();
        if(header&&nodeType==='ARBETSOMRÅDE'){
          const selectedArea=((header.querySelector('p')?.textContent||'').split('›')[0]||'').trim();
          for(const row of Array.from(document.querySelectorAll('.projectPage .nodeChildren article')) as HTMLElement[]){
            const label=(row.querySelector('b')?.textContent||'').trim();
            const complete=sectionComplete(tasks,selectedArea,label,deprecated);
            const icon=row.firstElementChild as HTMLElement|null;
            if(icon){
              icon.textContent=complete?'✓':'⌖';
              icon.className=complete?'momentDone hierMomentDone':'momentTodo';
            }
            row.classList.toggle('completed',complete);
          }
        }
      }catch{}
      timer=window.setTimeout(refresh,1200);
    }

    const changed=()=>void refresh();
    window.addEventListener('byggplan:activity-status-changed',changed);
    void refresh();
    return()=>{
      stopped=true;
      window.clearTimeout(timer);
      window.removeEventListener('byggplan:activity-status-changed',changed);
    };
  },[]);
  return null;
}
