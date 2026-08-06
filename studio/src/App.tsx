import { useEffect, useMemo, useState } from 'react';

type Activity = {
  id: string;
  title: string;
  description?: string;
  type: string;
  required: boolean;
  done: boolean;
  documentationFields: { id: string; type: string; label: string; required: boolean }[];
};

type Task = {
  id: string;
  projectId: string;
  project: string;
  workAreaId: string;
  workArea: string;
  workSectionId: string;
  workSection: string;
  title: string;
  description: string;
  status: string;
  activities: Activity[];
  technical: { id: string; title: string; type: string }[];
};

type Project = {
  id: string;
  name: string;
  property_designation?: string;
  status: string;
  work_area_count: number;
  work_section_count: number;
  task_count: number;
};

type Selection =
  | { kind: 'project'; id: string }
  | { kind: 'area'; id: string }
  | { kind: 'section'; id: string }
  | { kind: 'task'; id: string }
  | { kind: 'activity'; id: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/projects`);
        if (!response.ok) throw new Error('Kunde inte hämta projekt.');
        const data = await response.json() as { projects: Project[] };
        setProjects(data.projects);
        const first = data.projects[0]?.id || '';
        setProjectId(first);
        if (first) setSelection({ kind: 'project', id: first });
      } catch (error) {
        console.error(error);
        setState('error');
      }
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        setState('loading');
        const response = await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(projectId)}`);
        if (!response.ok) throw new Error('Kunde inte hämta projektstrukturen.');
        const data = await response.json() as { tasks: Task[] };
        setTasks(data.tasks);
        setState('ready');
      } catch (error) {
        console.error(error);
        setState('error');
      }
    })();
  }, [projectId]);

  const tree = useMemo(() => {
    const areas = new Map<string, { id: string; name: string; sections: Map<string, { id: string; name: string; tasks: Task[] }> }>();
    for (const task of tasks) {
      if (!areas.has(task.workAreaId)) areas.set(task.workAreaId, { id: task.workAreaId, name: task.workArea, sections: new Map() });
      const area = areas.get(task.workAreaId)!;
      if (!area.sections.has(task.workSectionId)) area.sections.set(task.workSectionId, { id: task.workSectionId, name: task.workSection, tasks: [] });
      area.sections.get(task.workSectionId)!.tasks.push(task);
    }
    return [...areas.values()].map(area => ({ ...area, sections: [...area.sections.values()] }));
  }, [tasks]);

  const selectedObject = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'project') return projects.find(project => project.id === selection.id) || null;
    for (const area of tree) {
      if (selection.kind === 'area' && area.id === selection.id) return area;
      for (const section of area.sections) {
        if (selection.kind === 'section' && section.id === selection.id) return section;
        for (const task of section.tasks) {
          if (selection.kind === 'task' && task.id === selection.id) return task;
          const activity = task.activities.find(item => selection.kind === 'activity' && item.id === selection.id);
          if (activity) return activity;
        }
      }
    }
    return null;
  }, [selection, projects, tree]);

  const toggle = (key: string) => setExpanded(current => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const currentProject = projects.find(project => project.id === projectId);

  return <div className="studio">
    <header className="topbar">
      <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>Projekteditor</small></div></div>
      <select value={projectId} onChange={event => { setProjectId(event.target.value); setSelection({ kind: 'project', id: event.target.value }); }}>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <div className={`connection ${state}`}>{state === 'ready' ? '● Ansluten' : state === 'loading' ? 'Hämtar…' : 'API-fel'}</div>
    </header>

    <aside className="rail">
      <button className="active" title="Projektstruktur">🌳<span>Struktur</span></button>
      <button disabled title="Bibliotek">📚<span>Bibliotek</span></button>
      <button disabled title="Kontrollplan">📋<span>Kontrollplan</span></button>
      <button disabled title="Dokument">📄<span>Dokument</span></button>
      <button disabled title="Användare">👥<span>Användare</span></button>
    </aside>

    <aside className="treePanel">
      <div className="panelHeader"><div><small>PROJEKTSTRUKTUR</small><strong>{currentProject?.name || 'Projekt'}</strong></div><button title="Ny post">＋</button></div>
      <div className="tree">
        {state === 'loading' && <p className="muted">Hämtar struktur…</p>}
        {tree.map(area => {
          const areaKey = `area:${area.id}`;
          const areaOpen = expanded.has(areaKey);
          return <div className="treeGroup" key={area.id}>
            <TreeRow depth={0} icon="⛏" label={area.name} open={areaOpen} selected={selection?.kind === 'area' && selection.id === area.id} onToggle={() => toggle(areaKey)} onSelect={() => setSelection({ kind: 'area', id: area.id })} />
            {areaOpen && area.sections.map(section => {
              const sectionKey = `section:${section.id}`;
              const sectionOpen = expanded.has(sectionKey);
              return <div key={section.id}>
                <TreeRow depth={1} icon="⌖" label={section.name} open={sectionOpen} selected={selection?.kind === 'section' && selection.id === section.id} onToggle={() => toggle(sectionKey)} onSelect={() => setSelection({ kind: 'section', id: section.id })} />
                {sectionOpen && section.tasks.map(task => {
                  const taskKey = `task:${task.id}`;
                  const taskOpen = expanded.has(taskKey);
                  return <div key={task.id}>
                    <TreeRow depth={2} icon="▣" label={task.title} open={taskOpen} selected={selection?.kind === 'task' && selection.id === task.id} onToggle={() => toggle(taskKey)} onSelect={() => setSelection({ kind: 'task', id: task.id })} badge={task.activities.length.toString()} />
                    {taskOpen && task.activities.map(activity => <TreeRow key={activity.id} depth={3} icon="○" label={activity.title} selected={selection?.kind === 'activity' && selection.id === activity.id} onSelect={() => setSelection({ kind: 'activity', id: activity.id })} />)}
                  </div>;
                })}
              </div>;
            })}
          </div>;
        })}
      </div>
    </aside>

    <main className="workspace">
      <div className="workspaceHeader"><div><small>INSPEKTÖR</small><h1>{selectionLabel(selection)}</h1></div><button disabled>Förhandsgranska ↗</button></div>
      <Inspector selection={selection} value={selectedObject} tasks={tasks} project={currentProject} />
    </main>
  </div>;
}

function TreeRow({ depth, icon, label, open, selected, badge, onToggle, onSelect }: { depth: number; icon: string; label: string; open?: boolean; selected: boolean; badge?: string; onToggle?: () => void; onSelect: () => void }) {
  return <div className={`treeRow ${selected ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 18 }} onClick={onSelect}>
    {onToggle ? <button onClick={event => { event.stopPropagation(); onToggle(); }}>{open ? '⌄' : '›'}</button> : <span className="spacer" />}
    <span className="nodeIcon">{icon}</span><span className="nodeLabel">{label}</span>{badge && <small className="badge">{badge}</small>}
  </div>;
}

function Inspector({ selection, value, tasks, project }: { selection: Selection | null; value: any; tasks: Task[]; project?: Project }) {
  if (!selection || !value) return <EmptyInspector />;
  if (selection.kind === 'project') {
    const activities = tasks.reduce((sum, task) => sum + task.activities.length, 0);
    return <section className="overview"><div className="hero"><span>🏗</span><div><small>AKTIVT PROJEKT</small><h2>{project?.name}</h2><p>{project?.property_designation || 'Ingen fastighetsbeteckning angiven'}</p></div></div><div className="stats"><Stat label="Arbetsområden" value={project?.work_area_count || 0} /><Stat label="Arbetsavsnitt" value={project?.work_section_count || 0} /><Stat label="Moment" value={project?.task_count || 0} /><Stat label="Aktiviteter" value={activities} /></div></section>;
  }
  return <section className="inspectorCard">
    <div className="objectType">{selectionLabel(selection)}</div>
    <label><span>Namn</span><input value={value.title || value.name || ''} readOnly /></label>
    {'description' in value && <label><span>Beskrivning</span><textarea value={value.description || ''} readOnly /></label>}
    {selection.kind === 'task' && <><div className="propertyRow"><span>Status</span><b>{value.status}</b></div><div className="propertyRow"><span>Aktiviteter</span><b>{value.activities.length}</b></div><div className="propertyRow"><span>Arbetsunderlag</span><b>{value.technical.length}</b></div></>}
    {selection.kind === 'activity' && <><div className="propertyRow"><span>Typ</span><b>{value.type}</b></div><div className="propertyRow"><span>Obligatorisk</span><b>{value.required ? 'Ja' : 'Nej'}</b></div><div className="propertyRow"><span>Dokumentationsfält</span><b>{value.documentationFields.length}</b></div></>}
    <div className="comingSoon"><b>Redigering aktiveras i nästa steg</b><p>Studio läser nu projektstrukturen från samma API som arbetsappen. Nästa version får spara namn, beskrivningar och nya objekt.</p></div>
  </section>;
}

function EmptyInspector() { return <div className="empty"><span>⌁</span><h2>Välj ett objekt i projektträdet</h2><p>Inspektören visar egenskaper för arbetsområden, arbetsavsnitt, moment och aktiviteter.</p></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <article><strong>{value}</strong><span>{label}</span></article>; }
function selectionLabel(selection: Selection | null) { if (!selection) return 'Projektöversikt'; return ({ project: 'Projektöversikt', area: 'Arbetsområde', section: 'Arbetsavsnitt', task: 'Moment', activity: 'Aktivitet' } as const)[selection.kind]; }
