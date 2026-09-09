type Activity={id:string;task_id:string;title:string};
type Structure={activities?:Activity[]};
type Meta={activity_id:string;applicability?:string};

function norm(value:string){return value.trim().toLocaleLowerCase('sv-SE')}

export function installGraphActivityDeduplicate(){
  const marker='__byggplanGraphActivityDeduplicateV1';
  const w=window as typeof window&Record<string,unknown>;
  if(w[marker])return;
  w[marker]=true;

  let projectId='';
  let structure:Structure={};
  let meta=new Map<string,Meta>();
  let loading=false;

  async function load(id:string){
    if(!id||loading)return;
    loading=true;
    try{
      const [sr,mr]=await Promise.all([
        fetch(`/api/studio/structure?projectId=${encodeURIComponent(id)}`,{cache:'no-store'}),
        fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(id)}`,{cache:'no-store'})
      ]);
      if(sr.ok)structure=await sr.json() as Structure;
      if(mr.ok){const data=await mr.json() as {items?:Meta[]};meta=new Map((data.items||[]).map(item=>[item.activity_id,item]));}
      projectId=id;
    }catch{}finally{loading=false;}
  }

  function isActive(id:string){
    const applicability=meta.get(id)?.applicability;
    return applicability!=='deprecated'&&applicability!=='project_condition';
  }

  function paint(){
    if(!document.querySelector('.view-graphical-plan'))return;
    const id=(document.querySelector('.controlPlanTopbar select') as HTMLSelectElement|null)?.value||'';
    if(id&&id!==projectId){void load(id);return;}
    const taskId=document.querySelector<HTMLElement>('.dependencyGraphNode.selected[data-node-id]')?.dataset.nodeId||'';
    const box=document.querySelector<HTMLElement>('.graphActivities');
    if(!taskId||!box)return;

    const allowed=new Map<string,number>();
    for(const activity of structure.activities||[]){
      if(activity.task_id!==taskId||!isActive(activity.id))continue;
      const key=norm(activity.title);
      allowed.set(key,(allowed.get(key)||0)+1);
    }

    const used=new Map<string,number>();
    for(const row of Array.from(box.querySelectorAll<HTMLElement>(':scope > div'))){
      const title=row.querySelector('b')?.textContent||'';
      const key=norm(title);
      const index=used.get(key)||0;
      const keep=index<(allowed.get(key)||0);
      used.set(key,index+1);
      if(keep){
        if(row.dataset.graphDedupeHidden==='true'){
          delete row.dataset.graphDedupeHidden;
          row.style.removeProperty('display');
        }
      }else{
        row.dataset.graphDedupeHidden='true';
        row.style.display='none';
      }
    }
  }

  const observer=new MutationObserver(()=>window.setTimeout(paint,0));
  observer.observe(document.body,{subtree:true,childList:true});
  window.setInterval(paint,250);
  window.addEventListener('byggplan:activity-status-changed',paint);
  void load((document.querySelector('.controlPlanTopbar select') as HTMLSelectElement|null)?.value||'');
}
