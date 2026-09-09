import { useEffect } from 'react';
import './project-hierarchy-indicators.css';

type Activity = { id: string; title: string; done: boolean };
type Task = { workArea: string; workSection: string; title: string; activities: Activity[] };
type Meta = { activity_id: string; applicability?: string; governing_documents?: unknown[] };
type StatusDetail = { activityId?: string; done?: boolean; projectId?: string };

export function ProjectHierarchyIndicators() {
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let projectId = '';
    let tasks: Task[] = [];
    let metadata = new Map<string, Meta>();
    const governed = new Map<string, Set<string>>();
    const consolidatedV24 = new Set<string>();
    const pathKey = (...parts: string[]) => parts.join('›');

    function addGovernedActivity(path: string, activityId: string) {
      const ids = governed.get(path) ?? new Set<string>();
      ids.add(activityId);
      governed.set(path, ids);
    }

    function activeActivities(task: Task) {
      return (task.activities ?? []).filter(activity => metadata.get(activity.id)?.applicability !== 'deprecated');
    }

    function taskComplete(task: Task | undefined) {
      if (!task) return false;
      const active = activeActivities(task);
      return active.length > 0 && active.every(activity => Boolean(activity.done));
    }

    function sectionComplete(area: string, section: string) {
      const sectionTasks = tasks.filter(task => task.workArea === area && task.workSection === section);
      return sectionTasks.length > 0 && sectionTasks.every(task => taskComplete(task));
    }

    function areaComplete(area: string) {
      const areaTasks = tasks.filter(task => task.workArea === area);
      return areaTasks.length > 0 && areaTasks.every(task => taskComplete(task));
    }

    function setHierarchyStatus(row: HTMLElement, depth: number, complete: boolean) {
      if (depth < 1 || depth > 3) return;
      const icon = Array.from(row.children).find(child =>
        child instanceof HTMLElement
        && child.tagName === 'SPAN'
        && !child.classList.contains('projectTreeLabel')
        && !child.classList.contains('navSpacer')
        && !child.classList.contains('hierGov')
      ) as HTMLElement | undefined;
      if (!icon) return;
      const defaultIcon = depth === 1 ? '⛏' : depth === 2 ? '⌖' : '▣';
      icon.textContent = complete ? '✓' : defaultIcon;
      icon.classList.toggle('hierHierarchyDone', complete);
      row.classList.toggle('hierHierarchyRowDone', complete);
    }

    function rebuildGovernedIndex() {
      governed.clear();
      for (const task of tasks) {
        for (const activity of task.activities ?? []) {
          const activityMeta = metadata.get(activity.id);
          if (activityMeta?.applicability === 'deprecated') continue;
          if (!(activityMeta?.governing_documents?.length)) continue;
          addGovernedActivity(pathKey(task.workArea), activity.id);
          addGovernedActivity(pathKey(task.workArea, task.workSection), activity.id);
          addGovernedActivity(pathKey(task.workArea, task.workSection, task.title), activity.id);
          addGovernedActivity(pathKey(task.workArea, task.workSection, task.title, activity.title), activity.id);
        }
      }
    }

    async function load(id: string) {
      try {
        if (!consolidatedV24.has(id)) {
          const cleanup = await fetch(`/api/studio/projects/${encodeURIComponent(id)}/structure-consolidate-v24`, { method: 'POST' });
          if (cleanup.ok) consolidatedV24.add(id);
        }
        const cacheBust = Date.now().toString(36);
        const [tasksResponse, metadataResponse] = await Promise.all([
          fetch(`/api/tasks?projectId=${encodeURIComponent(id)}&__hier=${cacheBust}`, { cache: 'no-store' }),
          fetch(`/api/project-field-metadata?projectId=${encodeURIComponent(id)}&__hier=${cacheBust}`, { cache: 'no-store' })
        ]);
        tasks = tasksResponse.ok ? ((await tasksResponse.json()).tasks ?? []) : [];
        metadata = metadataResponse.ok
          ? new Map(((await metadataResponse.json()).items ?? []).map((item: Meta) => [item.activity_id, item]))
          : new Map();
        rebuildGovernedIndex();
      } catch {
        tasks = [];
        metadata = new Map();
        governed.clear();
      }
      paint();
    }

    function setGovernedChip(element: HTMLElement, count: number, showCount = true) {
      let chip = Array.from(element.children).find(child => child.classList.contains('hierGov')) as HTMLElement | undefined;
      if (!count) {
        chip?.remove();
        return;
      }
      if (!chip) {
        chip = document.createElement('span');
        chip.className = 'hierGov';
        element.appendChild(chip);
      }
      chip.textContent = showCount ? `📋 ${count}` : '📋';
      chip.title = count === 1
        ? '1 aktivitet har koppling till styrdokument'
        : `${count} aktiviteter har koppling till styrdokument`;
    }

    function paintTree() {
      let area = '';
      let section = '';
      let task = '';
      const rows = Array.from(document.querySelectorAll('.projectTreeRow')) as HTMLElement[];
      for (const row of rows) {
        const depth = Math.max(0, Math.round((parseInt(row.style.paddingLeft || '10', 10) - 10) / 16));
        const label = (row.querySelector('.projectTreeLabel')?.textContent ?? '').trim();
        if (depth === 1) area = label;
        if (depth === 2) section = label;
        if (depth === 3) task = label;
        if (depth < 1) continue;

        const key = depth === 1 ? pathKey(area)
          : depth === 2 ? pathKey(area, section)
          : depth === 3 ? pathKey(area, section, task)
          : pathKey(area, section, task, label);
        setGovernedChip(row, governed.get(key)?.size ?? 0, depth !== 4);

        if (depth === 1) setHierarchyStatus(row, depth, areaComplete(area));
        if (depth === 2) setHierarchyStatus(row, depth, sectionComplete(area, section));
        if (depth === 3) {
          const currentTask = tasks.find(item => item.workArea === area && item.workSection === section && item.title === task);
          setHierarchyStatus(row, depth, taskComplete(currentTask));
        }

        if (depth === 4) {
          const activity = tasks.find(item => item.workArea === area && item.workSection === section && item.title === task)
            ?.activities.find(item => item.title === label && metadata.get(item.id)?.applicability !== 'deprecated');
          const icon = Array.from(row.children).find(child => child.textContent?.trim() === '○' || child.textContent?.trim() === '✓' || child.classList.contains('hierDone')) as HTMLElement | undefined;
          if (icon && activity) {
            icon.classList.add('hierDone');
            icon.textContent = activity.done ? '✓' : '○';
            icon.classList.toggle('done', activity.done);
          }
        }
      }
    }

    function paintDetail() {
      const header = document.querySelector('.projectPage .nodeHeader') as HTMLElement | null;
      if (!header) return;
      const nodeType = (header.querySelector('small')?.textContent ?? '').trim();
      const path = (header.querySelector('p')?.textContent ?? '').split('›').map(value => value.trim()).filter(Boolean);
      if (!path.length) return;

      setGovernedChip(header, governed.get(pathKey(...path))?.size ?? 0, nodeType !== 'AKTIVITET');
      const rows = Array.from(document.querySelectorAll('.projectPage .nodeChildren article')) as HTMLElement[];
      for (const row of rows) {
        const label = (row.querySelector('b')?.textContent ?? '').trim();
        let childPath = '';
        if (nodeType === 'ARBETSOMRÅDE') childPath = pathKey(path[0], label);
        if (nodeType === 'ARBETSAVSNITT') childPath = pathKey(path[0], path[1], label);
        if (nodeType === 'MOMENT') childPath = pathKey(path[0], path[1], path[2], label);
        if (childPath) setGovernedChip(row, governed.get(childPath)?.size ?? 0, nodeType !== 'MOMENT');

        if (nodeType === 'MOMENT') {
          const task = tasks.find(item => item.workArea === path[0] && item.workSection === path[1] && item.title === path[2]);
          const activity = task?.activities.find(item => item.title === label && metadata.get(item.id)?.applicability !== 'deprecated');
          const icon = row.firstElementChild as HTMLElement | null;
          if (activity && icon) {
            icon.textContent = activity.done ? '✓' : '○';
            icon.className = activity.done ? 'momentDone' : 'momentTodo';
            row.classList.toggle('completed', activity.done);
          }
        }

        if (nodeType === 'ARBETSAVSNITT') {
          const task = tasks.find(item => item.workArea === path[0] && item.workSection === path[1] && item.title === label);
          const complete = taskComplete(task);
          const icon = row.firstElementChild as HTMLElement | null;
          if (icon) {
            icon.textContent = complete ? '✓' : '▣';
            icon.className = complete ? 'momentDone hierHierarchyDone' : 'momentTodo';
          }
          row.classList.toggle('completed', complete);
        }
      }
    }

    function paint() {
      if (stopped) return;
      paintTree();
      paintDetail();
    }

    function statusChanged(event: Event) {
      const detail = (event as CustomEvent<StatusDetail>).detail ?? {};
      if (!detail.activityId || typeof detail.done !== 'boolean') return;
      if (detail.projectId && projectId && detail.projectId !== projectId) return;
      let found = false;
      tasks = tasks.map(task => ({
        ...task,
        activities: task.activities.map(activity => {
          if (activity.id !== detail.activityId) return activity;
          found = true;
          return { ...activity, done: detail.done as boolean };
        })
      }));
      if (found) paint();
      if (projectId) window.setTimeout(() => void load(projectId), 250);
    }

    async function tick() {
      const id = (document.querySelector('.projectWorkspace .topbar select') as HTMLSelectElement | null)?.value ?? '';
      if (id && id !== projectId) {
        projectId = id;
        await load(id);
      } else {
        paint();
      }
      timer = window.setTimeout(tick, 500);
    }

    window.addEventListener('byggplan:activity-status-changed', statusChanged as EventListener);
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener('byggplan:activity-status-changed', statusChanged as EventListener);
    };
  }, []);
  return null;
}
