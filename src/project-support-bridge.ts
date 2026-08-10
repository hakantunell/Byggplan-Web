type SupportResource = {
  id: string;
  task_id?: string;
  activity_id?: string;
  resource_type: string;
  title: string;
  content_text: string;
  sort_order: number;
};

type SupportItem = {
  id: string;
  title: string;
  type: 'text';
  summary: string;
  details: string[];
};

type FieldActivity = {
  id: string;
  detailSupport?: SupportItem[];
};

type FieldTask = {
  id: string;
  workArea: string;
  activities: FieldActivity[];
  workSupport?: SupportItem[];
};

const HIDDEN_FIELD_AREAS = new Set([
  'Etablering och byggstart'
]);

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return new URL(input.url, window.location.origin);
  return new URL(String(input), window.location.origin);
}

function supportItem(resource: SupportResource): SupportItem {
  const content = resource.content_text?.trim();
  return {
    id: resource.id,
    title: resource.title,
    type: 'text',
    summary: '',
    details: content ? content.split('\n') : []
  };
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

    try {
      const data = await response.clone().json() as { tasks?: FieldTask[] };
      if (!Array.isArray(data.tasks)) return response;

      const supportResponse = await baseFetch(
        `${url.origin}/api/project-support?projectId=${encodeURIComponent(projectId)}`,
        { cache: 'no-store' }
      );

      if (supportResponse.ok) {
        const support = await supportResponse.json() as {
          taskResources?: SupportResource[];
          activityResources?: SupportResource[];
        };
        const taskResources = support.taskResources || [];
        const activityResources = support.activityResources || [];

        for (const task of data.tasks) {
          task.workSupport = taskResources
            .filter(item => item.task_id === task.id)
            .map(supportItem);

          for (const activity of task.activities) {
            activity.detailSupport = activityResources
              .filter(item => item.activity_id === activity.id)
              .map(supportItem);
          }
        }
      }

      data.tasks = data.tasks.filter(task => !HIDDEN_FIELD_AREAS.has(task.workArea));

      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      headers.delete('Content-Length');
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.warn('Kunde inte berika fältappen med projektunderlag.', error);
      return response;
    }
  };
}
