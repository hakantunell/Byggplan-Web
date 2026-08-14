import { useEffect } from 'react';

type MetaItem={activity_id:string;applicability?:string};

export function ProjectHierarchyStatusV2() {
  useEffect(() => {
    let stopped = false;
    let refreshGeneration = 0;

    function taskComplete(task: any, deprecated: Set<string>) {
      const active = (task?.activities || []).filter((activity: any) => !deprecated.has(activity.id));
      return active.length > 0 && active.every((activity: any) => activity.done);
    }

    async function refresh() {
      if (stopped) return;
      const generation = ++refreshGeneration;
      const projectId = (document.querySelector('.projectWorkspace .topbar select') as HTMLSelectElement | null)?.value || '';
      if (!projectId) return;
      try {
        const [taskResponse, metadataResponse] = await Promise.all([
          fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' }),
          fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' })
        ]);
        if (stopped || generation !== refreshGeneration) return;
        const data = taskResponse.ok ? await taskResponse.json() : { tasks: [] };
        const metadataData = metadataResponse.ok ? await metadataResponse.json() : { items: [] };
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const deprecated = new Set<string>((metadataData.items || []).filter((item: MetaItem) => item.applicability === 'deprecated').map((item: MetaItem) => item.activity_id));

        let area = '';
        let section = '';
        let taskTitle = '';
        for (const row of Array.from(document.querySelectorAll('.projectTreeRow')) as HTMLElement[]) {
          const depth = Math.max(0, Math.round((parseInt(row.style.paddingLeft || '10', 10) - 10) / 16));
          const label = (row.querySelector('.projectTreeLabel')?.textContent || '').trim();
          if (depth === 1) area = label;
          if (depth === 2) section = label;
          if (depth === 3) taskTitle = label;
          if (depth !== 3) continue;
          const task = tasks.find((item: any) => item.workArea === area && item.workSection === section && item.title === taskTitle);
          const complete = taskComplete(task, deprecated);
          const icon = Array.from(row.children).find(child => child instanceof HTMLElement && child.tagName === 'SPAN' && !child.classList.contains('projectTreeLabel') && !child.classList.contains('navSpacer') && !child.classList.contains('hierGov')) as HTMLElement | undefined;
          if (icon) {
            icon.textContent = complete ? '✓' : '▣';
            icon.classList.toggle('hierMomentDone', complete);
          }
        }

        const header = document.querySelector('.projectPage .nodeHeader') as HTMLElement | null;
        const nodeType = (header?.querySelector('small')?.textContent || '').trim();
        if (header && nodeType === 'ARBETSAVSNITT') {
          const path = (header.querySelector('p')?.textContent || '').split('›').map(value => value.trim()).filter(Boolean);
          const selectedArea = path[0] || '';
          const selectedSection = path[1] || '';
          for (const row of Array.from(document.querySelectorAll('.projectPage .nodeChildren article')) as HTMLElement[]) {
            const label = (row.querySelector('b')?.textContent || '').trim();
            const task = tasks.find((item: any) => item.workArea === selectedArea && item.workSection === selectedSection && item.title === label);
            const complete = taskComplete(task, deprecated);
            const icon = row.firstElementChild as HTMLElement | null;
            if (icon) {
              icon.textContent = complete ? '✓' : '▣';
              icon.className = complete ? 'momentDone hierMomentDone' : 'momentTodo';
            }
            row.classList.toggle('completed', complete);
          }
        }
      } catch {}
    }

    function statusClick(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.activityDone, .activityQuickStatus button')) return;
      window.setTimeout(() => void refresh(), 220);
    }
    const changed=()=>void refresh();

    document.addEventListener('click', statusClick, true);
    window.addEventListener('byggplan:activity-status-changed',changed);
    void refresh();
    return () => {
      stopped = true;
      refreshGeneration += 1;
      document.removeEventListener('click', statusClick, true);
      window.removeEventListener('byggplan:activity-status-changed',changed);
    };
  }, []);
  return null;
}
