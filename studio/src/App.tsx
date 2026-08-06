import { useEffect, useMemo, useState } from 'react';

type Activity = {
  id: string;
  task_id: string;
  title: string;
  description: string;
  activity_type: string;
  required: number;
  documentation_field_count: number;
};

type Task = {
  id: string;
  work_section_id: string;
  title: string;
  description: string;
  status: string;
};

type Section = { id: string; work_area_id: string; name: string };
type Area = { id: string; project_id: string; name: string };

type Project = {
  id: string;
  name: string;
  property_designation?: string;
  status: string;
  work_area_count: number;
  work_section_count: number;
  task_count: number;
};

type Structure = { areas: Area[]; sections: Section[]; tasks: Task[]; activities: Activity[] };

type Selection =
  | { kind: 'project'; id: string }
  | { kind: 'area'; id: string }
  | { kind: 'section'; id: string }
  | { kind: 'task'; id: string }
  | { kind: 'activity'; id: string };

const EMPTY_STRUCTURE: Structure = { areas: [], sections: [], tasks: [], activities: [] };
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [structure, setStructure] = useState<Structure>(EMPTY_STRUCTURE);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadProjects(false);
  }, []);

  useEffect(() => {
    if (projectId) void loadStructure();
  }, [projectId]);

  async function loadProjects(preserveSelection: boolean) {
    try {
      const response = await fetch(`${API_BASE}/api/projects`);
      if (!response.ok) throw new Error('Kunde inte hämta projekt.');
      const data = await response.json() as { projects: Project[] };
      setProjects(data.projects);
      if (!preserveSelection) {
        const first = data.projects[0]?.id || '';
        setProjectId(first);
        if (first) setSelection({ kind: 'project', id: first });
      }
    } catch (error) {
      console.error(error);
      setState('error');
    }
  }

  async function loadStructure(selectAfter?: Selection) {
    try {
      setState('loading');
      const response = await fetch(`${API_BASE}/api/studio/structure?projectId=${encodeURIComponent(projectId)}`);
      if (!response.ok) throw new Error('Kunde inte hämta projektstrukturen.');
      setStructure(await response.json() as Structure);
      if (selectAfter) setSelection(selectAfter);
      setState('ready');
    } catch (error) {
      console.error(error);
      setState('error');
    }
  }

  async function api(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown>) {
    setMessage(method === 'DELETE' ? 'Tar bort…' : 'Sparar…');
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({})) as { ok?: boolean; id?: string; error?: string };
    if (!response.ok) throw new Error(data.error || 'Åtgärden misslyckades.');
    setMessage(method === 'DELETE' ? 'Borttaget' : 'Sparat');
    window.setTimeout(() => setMessage(''), 1600);
    return data;
  }

  const tree = useMemo(() => structure.areas.map(area => ({
    ...area,
    sections: structure.sections.filter(section => section.work_area_id === area.id).map(section => ({
      ...section,
      tasks: structure.tasks.filter(task => task.work_section_id === section.id).map(task => ({
        ...task,
        activities: structure.activities.filter(activity => activity.task_id === task.id)
      }))
    }))
  })), [structure]);

  const selectedObject = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'project') return projects.find(project => project.id === selection.id) || null;
    if (selection.kind === 'area') return structure.areas.find(item => item.id === selection.id) || null;
    if (selection.kind === 'section') return structure.sections.find(item => item.id === selection.id) || null;
    if (selection.kind === 'task') return structure.tasks.find(item => item.id === selection.id) || null;
    return structure.activities.find(item => item.id === selection.id) || null;
  }, [selection, projects, structure]);

  const toggle = (key: string) => setExpanded(current => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  async function createChild() {
    if (!selection || selection.kind === 'activity') return;
    const labels = { project: 'arbetsområde', area: 'arbetsavsnitt', section: 'moment', task: 'aktivitet' } as const;
    const name = window.prompt(`Namn på nytt ${labels[selection.kind]}:`)?.trim();
    if (!name) return;
    try {
      let result: { id?: string };
      let next: Selection;
      if (selection.kind === 'project') {
        result = await api('/api/studio/work-areas', 'POST', { projectId, name });
        next = { kind: 'area', id: result.id! };
      } else if (selection.kind === 'area') {
        result = await api('/api/studio/work-sections', 'POST', { workAreaId: selection.id, name });
        next = { kind: 'section', id: result.id! };
        setExpanded(current => new Set(current).add(`area:${selection.id}`));
      } else if (selection.kind === 'section') {
        result = await api('/api/studio/tasks', 'POST', { workSectionId: selection.id, title: name, description: '' });
        next = { kind: 'task', id: result.id! };
        setExpanded(current => new Set(current).add(`section:${selection.id}`));
      } else {
        result = await api('/api/studio/activities', 'POST', { taskId: selection.id, title: name, description: '', activityType: 'work' });
        next = { kind: 'activity', id: result.id! };
        setExpanded(current => new Set(current).add(`task:${selection.id}`));
      }
      await loadStructure(next);
      await loadProjects(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte skapa objektet.');
    }
  }

  async function saveSelection(form: { name: string; description: string; activityType: string }) {
    if (!selection || selection.kind === 'project') return;
    if (selection.kind === 'area') await api(`/api/studio/work-areas/${selection.id}`, 'PUT', { name: form.name });
    if (selection.kind === 'section') await api(`/api/studio/work-sections/${selection.id}`, 'PUT', { name: form.name });
    if (selection.kind === 'task') await api(`/api/studio/tasks/${selection.id}`, 'PUT', { title: form.name, description: form.description });
    if (selection.kind === 'activity') await api(`/api/studio/activities/${selection.id}`, 'PUT', { title: form.name, description: form.description, activityType: form.activityType });
    await loadStructure(selection);
  }

  async function deleteSelection() {
    if (!selection || selection.kind === 'project') return;
    const object = selectedObject;
    const name = object?.title || object?.name || selectionLabel(selection);
    if (!window.confirm(`Ta bort ${selectionLabel(selection).toLowerCase()} ”${name}”?`)) return;
    try {
      let path = '';
      let parent: Selection = { kind: 'project', id: projectId };
      if (selection.kind === 'area') path = `/api/studio/work-areas/${selection.id}`;
      if (selection.kind === 'section') {
        path = `/api/studio/work-sections/${selection.id}`;
        parent = { kind: 'area', id: object.work_area_id };
      }
      if (selection.kind === 'task') {
        path = `/api/studio/tasks/${selection.id}`;
        parent = { kind: 'section', id: object.work_section_id };
      }
      if (selection.kind === 'activity') {
        path = `/api/studio/activities/${selection.id}`;
        parent = { kind: 'task', id: object.task_id };
      }
      await api(path, 'DELETE');
      await loadStructure(parent);
      await loadProjects(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte ta bort objektet.');
    }
  }

  const currentProject = projects.find(project => project.id === projectId);

  return <div className="studio">
    <header className="topbar">
      <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>Projekteditor</small></div></div>
      <select value={projectId} onChange={event => { setProjectId(event.target.value); setSelection({ kind: 'project', id: event.target.value }); }}>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      {message && <div className="saveMessage">{message}</div>}
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
      <div className="panelHeader"><div><small>PROJEKTSTRUKTUR</small><strong>{currentProject?.name || 'Projekt'}</strong></div><button title="Skapa under markerat objekt" onClick={() => void createChild()} disabled={!selection || selection.kind === 'activity'}>＋</button></div>
      <div className="tree">
        {state === 'loading' && <p className="muted">Hämtar struktur…</p>}
        {tree.map(area => {
          const areaKey = `area:${area.id}`;
          return <div className="treeGroup" key={area.id}>
            <TreeRow depth={0} icon="⛏" label={area.name} open={expanded.has(areaKey)} selected={selection?.kind === 'area' && selection.id === area.id} onToggle={() => toggle(areaKey)} onSelect={() => setSelection({ kind: 'area', id: area.id })} />
            {expanded.has(areaKey) && area.sections.map(section => {
              const sectionKey = `section:${section.id}`;
              return <div key={section.id}>
                <TreeRow depth={1} icon="⌖" label={section.name} open={expanded.has(sectionKey)} selected={selection?.kind === 'section' && selection.id === section.id} onToggle={() => toggle(sectionKey)} onSelect={() => setSelection({ kind: 'section', id: section.id })} />
                {expanded.has(sectionKey) && section.tasks.map(task => {
                  const taskKey = `task:${task.id}`;
                  return <div key={task.id}>
                    <TreeRow depth={2} icon="▣" label={task.title} open={expanded.has(taskKey)} selected={selection?.kind === 'task' && selection.id === task.id} onToggle={() => toggle(taskKey)} onSelect={() => setSelection({ kind: 'task', id: task.id })} badge={task.activities.length.toString()} />
                    {expanded.has(taskKey) && task.activities.map(activity => <TreeRow key={activity.id} depth={3} icon="○" label={activity.title} selected={selection?.kind === 'activity' && selection.id === activity.id} onSelect={() => setSelection({ kind: 'activity', id: activity.id })} />)}
                  </div>;
                })}
              </div>;
            })}
          </div>;
        })}
      </div>
    </aside>

    <main className="workspace">
      <div className="workspaceHeader"><div><small>INSPEKTÖR</small><h1>{selectionLabel(selection)}</h1></div><div className="headerActions"><button className="primary" onClick={() => void createChild()} disabled={!selection || selection.kind === 'activity'}>{createLabel(selection)}</button><button disabled>Förhandsgranska ↗</button></div></div>
      <Inspector selection={selection} value={selectedObject} structure={structure} project={currentProject} onSave={saveSelection} onDelete={deleteSelection} />
    </main>
  </div>;
}

function TreeRow({ depth, icon, label, open, selected, badge, onToggle, onSelect }: { depth: number; icon: string; label: string; open?: boolean; selected: boolean; badge?: string; onToggle?: () => void; onSelect: () => void }) {
  return <div className={`treeRow ${selected ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 18 }} onClick={onSelect}>
    {onToggle ? <button onClick={event => { event.stopPropagation(); onToggle(); }}>{open ? '⌄' : '›'}</button> : <span className="spacer" />}
    <span className="nodeIcon">{icon}</span><span className="nodeLabel">{label}</span>{badge && <small className="badge">{badge}</small>}
  </div>;
}

function Inspector({ selection, value, structure, project, onSave, onDelete }: { selection: Selection | null; value: any; structure: Structure; project?: Project; onSave: (form: { name: string; description: string; activityType: string }) => Promise<void>; onDelete: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState('work');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(value?.title || value?.name || '');
    setDescription(value?.description || '');
    setActivityType(value?.activity_type || 'work');
    setSaving(false);
  }, [selection?.kind, selection?.id, value]);

  if (!selection || !value) return <EmptyInspector />;
  if (selection.kind === 'project') {
    return <section className="overview"><div className="hero"><span>🏗</span><div><small>AKTIVT PROJEKT</small><h2>{project?.name}</h2><p>{project?.property_designation || 'Ingen fastighetsbeteckning angiven'}</p></div></div><div className="stats"><Stat label="Arbetsområden" value={structure.areas.length} /><Stat label="Arbetsavsnitt" value={structure.sections.length} /><Stat label="Moment" value={structure.tasks.length} /><Stat label="Aktiviteter" value={structure.activities.length} /></div></section>;
  }

  const childCount = selection.kind === 'area'
    ? structure.sections.filter(item => item.work_area_id === selection.id).length
    : selection.kind === 'section'
      ? structure.tasks.filter(item => item.work_section_id === selection.id).length
      : selection.kind === 'task'
        ? structure.activities.filter(item => item.task_id === selection.id).length
        : value.documentation_field_count;

  async function save() {
    setSaving(true);
    try {
      await onSave({ name, description, activityType });
    } finally {
      setSaving(false);
    }
  }

  return <section className="inspectorCard">
    <div className="objectType">{selectionLabel(selection)}</div>
    <label><span>Namn</span><input value={name} onChange={event => setName(event.target.value)} /></label>
    {(selection.kind === 'task' || selection.kind === 'activity') && <label><span>Beskrivning / instruktion</span><textarea value={description} onChange={event => setDescription(event.target.value)} /></label>}
    {selection.kind === 'activity' && <label><span>Aktivitetstyp</span><select value={activityType} onChange={event => setActivityType(event.target.value)}><option value="work">Utför</option><option value="documentation">Dokumentera</option><option value="measurement">Mät</option><option value="control">Kontrollera</option><option value="approval">Godkänn</option><option value="wait">Vänta</option></select></label>}
    {selection.kind === 'task' && <div className="propertyRow"><span>Status</span><b>{value.status}</b></div>}
    <div className="propertyRow"><span>{selection.kind === 'activity' ? 'Dokumentationsfält' : 'Underliggande objekt'}</span><b>{childCount}</b></div>
    <div className="formActions"><button className="danger" disabled={saving} onClick={() => void onDelete()}>Ta bort</button><button className="primary" disabled={saving || !name.trim()} onClick={() => void save()}>{saving ? 'Sparar…' : 'Spara ändringar'}</button></div>
  </section>;
}

function EmptyInspector() { return <div className="empty"><span>⌁</span><h2>Välj ett objekt i projektträdet</h2><p>Inspektören visar och redigerar arbetsområden, arbetsavsnitt, moment och aktiviteter.</p></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <article><strong>{value}</strong><span>{label}</span></article>; }
function selectionLabel(selection: Selection | null) { if (!selection) return 'Projektöversikt'; return ({ project: 'Projektöversikt', area: 'Arbetsområde', section: 'Arbetsavsnitt', task: 'Moment', activity: 'Aktivitet' } as const)[selection.kind]; }
function createLabel(selection: Selection | null) { if (!selection || selection.kind === 'activity') return 'Inget att skapa'; return ({ project: '+ Nytt arbetsområde', area: '+ Nytt arbetsavsnitt', section: '+ Nytt moment', task: '+ Ny aktivitet' } as const)[selection.kind]; }
