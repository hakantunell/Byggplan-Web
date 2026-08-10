type StructureActivity={id:string;task_id:string};
type StructureTask={id:string;work_section_id:string};
type StructureSection={id:string;work_area_id:string};
type StructureArea={id:string};
type Structure={areas:StructureArea[];sections:StructureSection[];tasks:StructureTask[];activities:StructureActivity[]};
type ContextItem={activity_id:string;context:'field'|'administrative'};

function requestUrl(input:RequestInfo|URL){
  if(input instanceof Request)return new URL(input.url,window.location.origin);
  return new URL(String(input),window.location.origin);
}

export function installExecutionContextBridge(){
  const baseFetch=window.fetch.bind(window);
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await baseFetch(input,init);
    let url:URL;try{url=requestUrl(input)}catch{return response}
    if(url.pathname!=='/api/studio/structure'||!response.ok)return response;
    const projectId=url.searchParams.get('projectId');
    if(!projectId)return response;
    try{
      const structure=await response.clone().json() as Structure;
      const contextResponse=await baseFetch(`/api/project-execution-contexts?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
      if(!contextResponse.ok)return response;
      const contexts=await contextResponse.json() as {items?:ContextItem[]};
      const administrative=new Set((contexts.items||[]).filter(item=>item.context==='administrative').map(item=>item.activity_id));
      structure.activities=(structure.activities||[]).filter(activity=>!administrative.has(activity.id));
      const taskIds=new Set(structure.activities.map(activity=>activity.task_id));
      structure.tasks=(structure.tasks||[]).filter(task=>taskIds.has(task.id));
      const sectionIds=new Set(structure.tasks.map(task=>task.work_section_id));
      structure.sections=(structure.sections||[]).filter(section=>sectionIds.has(section.id));
      const areaIds=new Set(structure.sections.map(section=>section.work_area_id));
      structure.areas=(structure.areas||[]).filter(area=>areaIds.has(area.id));
      const headers=new Headers(response.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.delete('Content-Length');
      return new Response(JSON.stringify(structure),{status:response.status,statusText:response.statusText,headers});
    }catch(error){
      console.warn('Kunde inte filtrera administrativa aktiviteter i Studio.',error);
      return response;
    }
  };
}
