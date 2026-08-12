let installed=false;

const LEGACY_ADMIN=/^(registrera bas-|genomför startmöte|beställ och genomför (ka-besök|byggnadsnämndens arbetsplatsbesök|slutsamråd|lägeskontroll)|samla (ifylld och signerad kontrollplan|egenkontroller och intyg|myndighetsintyg)|upprätta eller samla brandskyddsbeskrivning|upprätta eller samla slutlig brandskyddsdokumentation|spara intyg eller protokoll från sotarbesiktning|verifiera behörighet eller dokumentera vald våtrumsmetod|kontrollera att arbetsmiljöorganisation och arbetsmiljöplan är ordnade|kontrollera att aktuella projekthandlingar finns tillgängliga|säkerställ att startbesked har erhållits före byggstart|hantera avvikelser från bygglov och upprätta relationshandling vid behov|kontrollera att fuktsäkerhetsprojektering har beaktats i projekteringen|säkerställ att erforderlig geoteknisk utredning finns|kontrollera radonförutsättningar och eventuell radonklass|kontrollera geotekniskt underlag och markförhållanden)/i;

type MobileActivity={id?:string;type?:string;title?:string};
type MobileTask={activities?:MobileActivity[]};
type ExecutionItem={activity_id?:string;context?:'field'|'administrative'};

function isLegacyAdministrative(activity:MobileActivity){
  return activity.type==='administration'||LEGACY_ADMIN.test(activity.title||'');
}

function legacyFilter(tasks:MobileTask[]){
  return tasks
    .map(task=>({...task,activities:(task.activities||[]).filter(activity=>!isLegacyAdministrative(activity))}))
    .filter(task=>(task.activities||[]).length>0);
}

function jsonResponse(response:Response,payload:unknown){
  const headers=new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.delete('content-length');
  return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
}

export function installMobileActivityScope(){
  if(installed)return;installed=true;
  const original=window.fetch.bind(window);
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await original(input,init);
    const rawUrl=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
    if(!rawUrl.includes('/api/tasks')||!response.ok)return response;
    try{
      const data=await response.clone().json() as {tasks?:MobileTask[]};
      if(!Array.isArray(data.tasks))return response;

      const taskUrl=new URL(rawUrl,window.location.href);
      const projectId=taskUrl.searchParams.get('projectId');
      if(!projectId)return jsonResponse(response,{...data,tasks:legacyFilter(data.tasks)});

      try{
        const contextUrl=new URL('/api/project-execution-contexts',taskUrl.origin);
        contextUrl.searchParams.set('projectId',projectId);
        const contextResponse=await original(contextUrl.toString(),{cache:'no-store'});
        if(contextResponse.ok){
          const contextData=await contextResponse.json() as {items?:ExecutionItem[]};
          if(Array.isArray(contextData.items)&&contextData.items.length>0){
            const fieldIds=new Set(contextData.items.filter(item=>item.context==='field').map(item=>String(item.activity_id||'')).filter(Boolean));
            const tasks=data.tasks
              .map(task=>({...task,activities:(task.activities||[]).filter(activity=>Boolean(activity.id)&&fieldIds.has(String(activity.id))&&!isLegacyAdministrative(activity))}))
              .filter(task=>(task.activities||[]).length>0);
            return jsonResponse(response,{...data,tasks});
          }
        }
      }catch(error){console.warn('Kunde inte läsa aktivitetskontext för mobilvyn.',error)}

      return jsonResponse(response,{...data,tasks:legacyFilter(data.tasks)});
    }catch{return response}
  };
}
