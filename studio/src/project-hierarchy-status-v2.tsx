import { useEffect } from 'react';

export function ProjectHierarchyStatusV2() {
  useEffect(() => {
    let timer = 0;
    let stopped = false;

    function taskComplete(task: any) {
      return Boolean(task?.activities?.length) && task.activities.every((activity: any) => activity.done);
    }

    async function refresh() {
      if (stopped) return;
      const projectId = (document.querySelector('.projectWorkspace .topbar select') as HTMLSelectElement | null)?.value || '';
      if (!projectId) {
        timer = window.setTimeout(refresh, 1000);
        return;
      }
      try {
        const response = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
        const data = response.ok ? await response.json() : { tasks: [] };
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];

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
          const complete = taskComplete(task);
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
            const complete = taskComplete(task);
            const icon = row.firstElementChild as HTMLElement | null;
            if (icon) {
              icon.textContent = complete ? '✓' : '▣';
              icon.className = complete ? 'momentDone hierMomentDone' : 'momentTodo';
            }
            row.classList.toggle('completed', complete);
          }
        }
      } catch {}
      timer = window.setTimeout(refresh, 1200);
    }

    void refresh();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
