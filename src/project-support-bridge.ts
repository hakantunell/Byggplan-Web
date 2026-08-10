type Attachment = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
};

type SupportResource = {
  id: string;
  task_id?: string;
  activity_id?: string;
  resource_type: string;
  title: string;
  content_text: string;
  sort_order: number;
  attachments?: Attachment[];
};

type SupportItem = {
  id: string;
  title: string;
  type: 'text';
  summary: string;
  details: string[];
  attachments?: Attachment[];
};

type GoverningDocumentLink = {
  documentId:string;
  documentType:string;
  documentTitle:string;
  issuer?:string;
  itemId:string;
  code:string;
  label:string;
  responsibleRole?:string;
};

type FieldActivity = {
  id: string;
  title:string;
  detailSupport?: SupportItem[];
  executorType?:'self'|'third_party';
  executorLabel?:string|null;
  governingDocuments?:GoverningDocumentLink[];
};

type FieldTask = {
  id: string;
  workArea: string;
  activities: FieldActivity[];
  workSupport?: SupportItem[];
};

type ExecutionContextItem = {
  activity_id:string;
  context:'field'|'administrative';
  executor_type?:'self'|'third_party';
  executor_label?:string|null;
  governing_documents?:GoverningDocumentLink[];
};

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return new URL(input.url, window.location.origin);
  return new URL(String(input), window.location.origin);
}

function supportItem(resource: SupportResource, apiOrigin: string): SupportItem {
  const content = resource.content_text?.trim();
  return {
    id: resource.id,
    title: resource.title,
    type: 'text',
    summary: '',
    details: content ? content.split('\n') : [],
    attachments: (resource.attachments || []).map(file => ({
      ...file,
      url: new URL(file.url, apiOrigin).toString()
    }))
  };
}

async function fetchWithTimeout(baseFetch:typeof window.fetch,input:RequestInfo|URL,init:RequestInit,timeoutMs=1800){
  const controller=new AbortController();
  const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{return await baseFetch(input,{...init,signal:controller.signal})}finally{window.clearTimeout(timer)}
}

export function installProjectSupportBridge() {
  const baseFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await baseFetch(input, init);
    let url: URL;
    try { url = requestUrl(input); }
    catch { return response; }

    if (url.pathname !== '/api/tasks' || !response.ok) return response;

    const projectId = url.searchParams.get('projectId');
    if (!projectId) return response;

    window.dispatchEvent(new CustomEvent('byggplan:active-project', { detail: { projectId } }));

    try {
      const data = await response.clone().json() as { tasks?: FieldTask[] };
      if (!Array.isArray(data.tasks)) return response;

      const [supportResult,contextResult] = await Promise.allSettled([
        fetchWithTimeout(baseFetch,`${url.origin}/api/project-support?projectId=${encodeURIComponent(projectId)}`, { cache:'no-store' }),
        fetchWithTimeout(baseFetch,`${url.origin}/api/project-execution-contexts?projectId=${encodeURIComponent(projectId)}`, { cache:'no-store' })
      ]);

      const supportResponse=supportResult.status==='fulfilled'?supportResult.value:null;
      const contextResponse=contextResult.status==='fulfilled'?contextResult.value:null;

      if (supportResponse?.ok) {
        const support = await supportResponse.json() as {
          taskResources?: SupportResource[];
          activityResources?: SupportResource[];
        };
        const taskResources = support.taskResources || [];
        const activityResources = support.activityResources || [];

        for (const task of data.tasks) {
          task.workSupport = taskResources
            .filter(item => item.task_id === task.id)
            .map(item => supportItem(item,url.origin));

          for (const activity of task.activities) {
            activity.detailSupport = activityResources
              .filter(item => item.activity_id === activity.id)
              .map(item => supportItem(item,url.origin));
          }
        }
      }

      if(contextResponse?.ok){
        const contexts=await contextResponse.json() as {items?:ExecutionContextItem[]};
        const items=contexts.items||[];
        const administrative=new Set(items.filter(item=>item.context==='administrative').map(item=>item.activity_id));
        const executorByActivity=new Map(items.map(item=>[item.activity_id,item]));
        for(const task of data.tasks){
          for(const activity of task.activities){
            const execution=executorByActivity.get(activity.id);
            if(!execution||execution.context==='administrative')continue;
            activity.executorType=execution.executor_type||'self';
            activity.executorLabel=execution.executor_label||null;
            activity.governingDocuments=execution.governing_documents||[];

            if(activity.governingDocuments.length>0){
              const responsibilityIcon=activity.executorType==='third_party'?'👥':'👤';
              activity.title=`${responsibilityIcon} 📋 ${activity.title}`;
            }
          }
          task.activities=task.activities.filter(activity=>!administrative.has(activity.id));
        }
        data.tasks=data.tasks.filter(task=>task.activities.length>0);
      }

      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      headers.delete('Content-Length');
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.warn('Kunde inte berika fältappen med projektunderlag, ansvar och styrdokumentskopplingar.', error);
      return response;
    }
  };
}
