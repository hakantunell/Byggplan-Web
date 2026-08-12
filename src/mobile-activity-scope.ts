let installed=false;

const LEGACY_ADMIN=/^(registrera bas-|genomför startmöte|beställ och genomför (ka-besök|byggnadsnämndens arbetsplatsbesök|slutsamråd|lägeskontroll)|samla (ifylld och signerad kontrollplan|egenkontroller och intyg|myndighetsintyg)|upprätta eller samla brandskyddsbeskrivning|upprätta eller samla slutlig brandskyddsdokumentation|spara intyg eller protokoll från sotarbesiktning|verifiera behörighet eller dokumentera vald våtrumsmetod)/i;

export function installMobileActivityScope(){
  if(installed)return;installed=true;
  const original=window.fetch.bind(window);
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await original(input,init);
    const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
    if(!url.includes('/api/tasks')||!response.ok)return response;
    try{
      const data=await response.clone().json() as {tasks?:Array<{activities?:Array<{type?:string;title?:string}>}>};
      if(!Array.isArray(data.tasks))return response;
      const tasks=data.tasks.map(task=>({...task,activities:(task.activities||[]).filter(activity=>activity.type!=='administration'&&!LEGACY_ADMIN.test(activity.title||''))})).filter(task=>(task.activities||[]).length>0);
      return new Response(JSON.stringify({...data,tasks}),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
    }catch{return response}
  };
}
