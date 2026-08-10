type SupportResource = {
  id: string;
  task_id?: string;
  activity_id?: string;
  resource_type: string;
  title: string;
  content_text: string;
  sort_order: number;
};

type FieldActivity = {
  id: string;
  technicalResourceId?: string;
};

type FieldTask = {
  id: string;
  workArea: string;
  activities: FieldActivity[];
  technical: any[];
};

const HIDDEN_FIELD_AREAS = new Set([
  'Etablering och byggstart'
]);

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return new URL(input.url, window.location.origin);
  return new URL(String(input), window.location.origin);
}

function textLines(resource: SupportResource) {
  const content = resource.content_text?.trim();
  return content ? content.split('\n') : [];
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
          const taskSupport = taskResources.filter(item => item.task_id === task.id);
          for (const resource of taskSupport) {
            task.technical.push({
              id: `project-work:${resource.id}`,
              title: resource.title,
              type: 'text',
              summary: '',
              details: textLines(resource),
              sourceLevel: 'task'
            });
          }

          for (const activity of task.activities) {
            const detailSupport = activityResources.filter(item => item.activity_id === activity.id);
            if (!detailSupport.length) continue;
            const syntheticId = `project-detail:${activity.id}`;
            const details = detailSupport.flatMap(resource => {
              const lines = textLines(resource);
              return detailSupport.length > 1
                ? [resource.title, ...lines]
                : lines;
            });
            task.technical.push({
              id: syntheticId,
              title: detailSupport.length === 1 ? detailSupport[0].title : 'Detaljunderlag',
              type: 'text',
              summary: '',
              details,
              sourceLevel: 'task'
            });
            activity.technicalResourceId = syntheticId;
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
