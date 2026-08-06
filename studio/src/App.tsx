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

type StudioModule = 'project' | 'library';
type ActivityType = 'work' | 'documentation' | 'measurement' | 'control' | 'approval' | 'wait';

type ModuleActivity = { title: string; description?: string; type: ActivityType };
type ModuleTask = { title: string; description?: string; activities: ModuleActivity[] };
type ModuleSection = { name: string; tasks: ModuleTask[] };
type LibraryModule = {
  id: string;
  icon: string;
  name: string;
  description: string;
  status: 'utkast' | 'publicerad';
  sections: ModuleSection[];
};

const EMPTY_STRUCTURE: Structure = { areas: [], sections: [], tasks: [], activities: [] };
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

const LIBRARY_MODULES: LibraryModule[] = [
  {
    id: 'module-electrical',
    icon: '⚡',
    name: 'EL-installation',
    description: 'Grundstruktur för elcentral, ledningsdragning, uttag, belysning, kontroll och dokumentation.',
    status: 'utkast',
    sections: [
      {
        name: 'Planering och förberedelse',
        tasks: [
          {
            title: 'Planera elinstallationen',
            description: 'Gå igenom ritningar, belastning, placeringar och installationsvägar innan arbetet påbörjas.',
            activities: [
              { title: 'Kontrollera elritning och placeringar', type: 'control' },
              { title: 'Märk ut central, dosor, uttag och strömbrytare', type: 'work' },
              { title: 'Dokumentera överenskomna ändringar', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Elcentral och matning',
        tasks: [
          {
            title: 'Förbered och montera elcentral',
            activities: [
              { title: 'Förbered infästning och kabelvägar', type: 'work' },
              { title: 'Montera elcentral', type: 'work' },
              { title: 'Dokumentera centralens placering och inkommande ledningar', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Rör, dosor och ledningsvägar',
        tasks: [
          {
            title: 'Montera rör och dosor',
            activities: [
              { title: 'Montera apparat- och kopplingsdosor', type: 'work' },
              { title: 'Dra och fixera installationsrör', type: 'work' },
              { title: 'Kontrollera böjradier och åtkomlighet', type: 'control' },
              { title: 'Fotografera dolda rör och dosor före igenbyggnad', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Uttag och belysning',
        tasks: [
          {
            title: 'Installera uttag, brytare och belysningspunkter',
            activities: [
              { title: 'Kontrollera höjder och placeringar', type: 'measurement' },
              { title: 'Montera apparater och anslutningar', type: 'work' },
              { title: 'Dokumentera avvikelser från ritning', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Kontroll och relationsunderlag',
        tasks: [
          {
            title: 'Kontrollera och dokumentera färdig installation',
            activities: [
              { title: 'Genomför föreskrivna kontroller och provningar', type: 'control' },
              { title: 'Märk central och grupper', type: 'work' },
              { title: 'Samla relationsunderlag och kontrollresultat', type: 'documentation' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'module-crawlspace',
    icon: '🏗',
    name: 'Torpargrund',
    description: 'Grundläggning med schakt, sulor, grundmurar, ventilation, återfyllning och dokumentation.',
    status: 'utkast',
    sections: [
      {
        name: 'Utsättning och schakt',
        tasks: [
          {
            title: 'Sätt ut och schakta för grund',
            activities: [
              { title: 'Sätt ut grundens läge och referensnivåer', type: 'measurement' },
              { title: 'Dokumentera mark och utsättning före schakt', type: 'documentation' },
              { title: 'Schakta till projekterade nivåer', type: 'work' },
              { title: 'Kontrollera schaktbotten och nivåer', type: 'control' }
            ]
          }
        ]
      },
      {
        name: 'Sulor och grundmurar',
        tasks: [
          {
            title: 'Bygg sulor och grundmurar',
            activities: [
              { title: 'Förbered bärlager och formsättning', type: 'work' },
              { title: 'Kontrollera armering före gjutning', type: 'control' },
              { title: 'Dokumentera armering och genomföringar', type: 'documentation' },
              { title: 'Gjut sulor och mura grundväggar', type: 'work' }
            ]
          }
        ]
      },
      {
        name: 'Ventilation och fuktskydd',
        tasks: [
          {
            title: 'Ordna ventilation och fuktskydd',
            activities: [
              { title: 'Montera ventiler enligt plan', type: 'work' },
              { title: 'Utför mark- och väggfuktskydd', type: 'work' },
              { title: 'Dokumentera fuktskydd före återfyllning', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Återfyllning och slutkontroll',
        tasks: [
          {
            title: 'Återfyll och kontrollera grunden',
            activities: [
              { title: 'Kontrollera dolda installationer före återfyllning', type: 'control' },
              { title: 'Återfyll och packa i lager', type: 'work' },
              { title: 'Mät och dokumentera färdiga nivåer', type: 'measurement' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'module-log-frame',
    icon: '🪵',
    name: 'Timmerstomme',
    description: 'Förberedelse, timring, knutar, dymlingar, öppningar, kontrollmätning och byggdokumentation.',
    status: 'utkast',
    sections: [
      {
        name: 'Förberedelse',
        tasks: [
          {
            title: 'Förbered timmer och upplag',
            activities: [
              { title: 'Kontrollera dimensioner och märkning', type: 'control' },
              { title: 'Sortera stockar efter vägg och läge', type: 'work' }
            ]
          }
        ]
      },
      {
        name: 'Timring',
        tasks: [
          {
            title: 'Timra väggar och knutar',
            activities: [
              { title: 'Lägg och rikta syllvarv', type: 'work' },
              { title: 'Kontrollera diagonaler och nivåer', type: 'measurement' },
              { title: 'Timra väggvarv, knutar och vindspår', type: 'work' },
              { title: 'Dokumentera kritiska knutar och infästningar', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Öppningar och sättning',
        tasks: [
          {
            title: 'Utför öppningar och sättningslösningar',
            activities: [
              { title: 'Märk ut och kapa öppningar', type: 'work' },
              { title: 'Montera gåtar och sättningsmån', type: 'work' },
              { title: 'Kontrollera öppningsmått', type: 'measurement' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'module-roof',
    icon: '🏠',
    name: 'Tak',
    description: 'Takbärverk, råspont, underlagstäckning, plåt, genomföringar, säkerhet och kontroll.',
    status: 'utkast',
    sections: [
      {
        name: 'Takbärverk',
        tasks: [
          {
            title: 'Montera och kontrollera takbärverk',
            activities: [
              { title: 'Montera åsar, sparrar eller takstolar', type: 'work' },
              { title: 'Kontrollera upplag, infästningar och geometri', type: 'control' },
              { title: 'Dokumentera bärverk före inklädnad', type: 'documentation' }
            ]
          }
        ]
      },
      {
        name: 'Underlagstak',
        tasks: [
          {
            title: 'Montera råspont och underlagstäckning',
            activities: [
              { title: 'Montera råspont', type: 'work' },
              { title: 'Montera underlagstäckning och anslutningar', type: 'work' },
              { title: 'Kontrollera genomföringar och tätningar', type: 'control' }
            ]
          }
        ]
      },
      {
        name: 'Yttertak och säkerhet',
        tasks: [
          {
            title: 'Montera yttertak och taksäkerhet',
            activities: [
              { title: 'Montera plåt och beslag', type: 'work' },
              { title: 'Montera taksäkerhet och snörasskydd', type: 'work' },
              { title: 'Dokumentera färdigt tak och genomföringar', type: 'documentation' }
            ]
          }
        ]
      }
    ]
  }
];

export function App() {
  const [activeModule, setActiveModule] = useState<StudioModule>('project');
  const [selectedLibraryId, setSelectedLibraryId] = useState(LIBRARY_MODULES[0].id);
  const [installingModule, setInstallingModule] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [structure, setStructure] = useState<Structure>(EMPTY_STRUCTURE);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => { void loadProjects(false); }, []);
  useEffect(() => { if (projectId) void loadStructure(); }, [projectId]);

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

  async function api(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown>, quiet = false) {
    if (!quiet) setMessage(method === 'DELETE' ? 'Tar bort…' : 'Sparar…');
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({})) as { ok?: boolean; id?: string; error?: string };
    if (!response.ok) throw new Error(data.error || 'Åtgärden misslyckades.');
    if (!quiet) {
      setMessage(method === 'DELETE' ? 'Borttaget' : 'Sparat');
      window.setTimeout(() => setMessage(''), 1600);
    }
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

  const selectedLibraryModule = LIBRARY_MODULES.find(item => item.id === selectedLibraryId) ?? LIBRARY_MODULES[0];
  const currentProject = projects.find(project => project.id === projectId);

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

  async function installLibraryModule() {
    if (!projectId || !currentProject || installingModule) return;
    const module = selectedLibraryModule;
    const duplicate = structure.areas.some(area => area.name.trim().toLocaleLowerCase('sv') === module.name.trim().toLocaleLowerCase('sv'));
    if (duplicate && !window.confirm(`Projektet innehåller redan arbetsområdet ”${module.name}”. Vill du lägga till ytterligare en kopia?`)) return;
    if (!window.confirm(`Lägg till modulen ”${module.name}” i projektet ”${currentProject.name}”?\n\nModulen kopieras till projektet och kan därefter redigeras fritt.`)) return;

    setInstallingModule(true);
    setMessage(`Lägger till ${module.name}…`);
    try {
      const areaResult = await api('/api/studio/work-areas', 'POST', { projectId, name: module.name }, true);
      if (!areaResult.id) throw new Error('API:t returnerade inget id för arbetsområdet.');

      for (const section of module.sections) {
        const sectionResult = await api('/api/studio/work-sections', 'POST', { workAreaId: areaResult.id, name: section.name }, true);
        if (!sectionResult.id) throw new Error(`Kunde inte skapa arbetsavsnittet ${section.name}.`);

        for (const task of section.tasks) {
          const taskResult = await api('/api/studio/tasks', 'POST', {
            workSectionId: sectionResult.id,
            title: task.title,
            description: task.description || ''
          }, true);
          if (!taskResult.id) throw new Error(`Kunde inte skapa momentet ${task.title}.`);

          for (const activity of task.activities) {
            await api('/api/studio/activities', 'POST', {
              taskId: taskResult.id,
              title: activity.title,
              description: activity.description || '',
              activityType: activity.type
            }, true);
          }
        }
      }

      setExpanded(current => new Set(current).add(`area:${areaResult.id}`));
      await loadStructure({ kind: 'area', id: areaResult.id });
      await loadProjects(true);
      setActiveModule('project');
      setMessage(`${module.name} har lagts till i projektet`);
      window.setTimeout(() => setMessage(''), 2600);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Kunde inte lägga till modulen.');
    } finally {
      setInstallingModule(false);
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
    let path: string;
    let parent: Selection;
    let name: string;

    switch (selection.kind) {
      case 'area': {
        const area = structure.areas.find(item => item.id === selection.id);
        if (!area) return;
        path = `/api/studio/work-areas/${area.id}`;
        parent = { kind: 'project', id: projectId };
        name = area.name;
        break;
      }
      case 'section': {
        const section = structure.sections.find(item => item.id === selection.id);
        if (!section) return;
        path = `/api/studio/work-sections/${section.id}`;
        parent = { kind: 'area', id: section.work_area_id };
        name = section.name;
        break;
      }
      case 'task': {
        const task = structure.tasks.find(item => item.id === selection.id);
        if (!task) return;
        path = `/api/studio/tasks/${task.id}`;
        parent = { kind: 'section', id: task.work_section_id };
        name = task.title;
        break;
      }
      case 'activity': {
        const activity = structure.activities.find(item => item.id === selection.id);
        if (!activity) return;
        path = `/api/studio/activities/${activity.id}`;
        parent = { kind: 'task', id: activity.task_id };
        name = activity.title;
        break;
      }
    }

    if (!window.confirm(`Ta bort ${selectionLabel(selection).toLowerCase()} ”${name}”?`)) return;
    try {
      await api(path, 'DELETE');
      await loadStructure(parent);
      await loadProjects(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte ta bort objektet.');
    }
  }

  return <div className="studio">
    <header className="topbar">
      <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>{activeModule === 'project' ? 'Projekteditor' : 'Modulbibliotek'}</small></div></div>
      <select value={projectId} onChange={event => { setProjectId(event.target.value); setSelection({ kind: 'project', id: event.target.value }); }} disabled={installingModule}>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      {message && <div className="saveMessage">{message}</div>}
      <div className={`connection ${state}`}>{state === 'ready' ? '● Ansluten' : state === 'loading' ? 'Hämtar…' : 'API-fel'}</div>
    </header>

    <aside className="rail">
      <button className={activeModule === 'project' ? 'active' : ''} title="Projektstruktur" onClick={() => setActiveModule('project')} disabled={installingModule}>🌳<span>Struktur</span></button>
      <button className={activeModule === 'library' ? 'active' : ''} title="Bibliotek" onClick={() => setActiveModule('library')} disabled={installingModule}>📚<span>Bibliotek</span></button>
      <button disabled title="Kontrollplan">📋<span>Kontrollplan</span></button>
      <button disabled title="Dokument">📄<span>Dokument</span></button>
      <button disabled title="Användare">👥<span>Användare</span></button>
    </aside>

    {activeModule === 'project' ? <>
      <aside className="treePanel">
        <div className="panelHeader"><div><small>PROJEKTSTRUKTUR</small><strong>{currentProject?.name || 'Projekt'}</strong></div><button title="Skapa under markerat objekt" onClick={() => void createChild()} disabled={!selection || selection.kind === 'activity'}>＋</button></div>
        <div className="tree">
          {state === 'loading' && <p className="muted">Hämtar struktur…</p>}
          {currentProject && <TreeRow depth={0} icon="🏗" label={currentProject.name} selected={selection?.kind === 'project' && selection.id === currentProject.id} onSelect={() => setSelection({ kind: 'project', id: currentProject.id })} badge={structure.areas.length.toString()} />}
          {tree.map(area => {
            const areaKey = `area:${area.id}`;
            return <div className="treeGroup" key={area.id}>
              <TreeRow depth={1} icon="⛏" label={area.name} open={expanded.has(areaKey)} selected={selection?.kind === 'area' && selection.id === area.id} onToggle={() => toggle(areaKey)} onSelect={() => setSelection({ kind: 'area', id: area.id })} />
              {expanded.has(areaKey) && area.sections.map(section => {
                const sectionKey = `section:${section.id}`;
                return <div key={section.id}>
                  <TreeRow depth={2} icon="⌖" label={section.name} open={expanded.has(sectionKey)} selected={selection?.kind === 'section' && selection.id === section.id} onToggle={() => toggle(sectionKey)} onSelect={() => setSelection({ kind: 'section', id: section.id })} />
                  {expanded.has(sectionKey) && section.tasks.map(task => {
                    const taskKey = `task:${task.id}`;
                    return <div key={task.id}>
                      <TreeRow depth={3} icon="▣" label={task.title} open={expanded.has(taskKey)} selected={selection?.kind === 'task' && selection.id === task.id} onToggle={() => toggle(taskKey)} onSelect={() => setSelection({ kind: 'task', id: task.id })} badge={task.activities.length.toString()} />
                      {expanded.has(taskKey) && task.activities.map(activity => <TreeRow key={activity.id} depth={4} icon="○" label={activity.title} selected={selection?.kind === 'activity' && selection.id === activity.id} onSelect={() => setSelection({ kind: 'activity', id: activity.id })} />)}
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
    </> : <>
      <aside className="treePanel">
        <div className="panelHeader"><div><small>BIBLIOTEK</small><strong>Moduler</strong></div><button title="Ny modul – kommer senare" disabled>＋</button></div>
        <div className="tree">
          {LIBRARY_MODULES.map(item => <TreeRow key={item.id} depth={0} icon={item.icon} label={item.name} selected={selectedLibraryId === item.id} onSelect={() => setSelectedLibraryId(item.id)} badge={item.status === 'publicerad' ? '✓' : 'U'} />)}
        </div>
      </aside>

      <main className="workspace">
        <div className="workspaceHeader"><div><small>MODULBIBLIOTEK</small><h1>{selectedLibraryModule.name}</h1></div><div className="headerActions"><button className="primary" onClick={() => void installLibraryModule()} disabled={!projectId || installingModule}>{installingModule ? 'Lägger till…' : 'Lägg till i projekt'}</button><button disabled>Redigera modul</button></div></div>
        <LibraryInspector module={selectedLibraryModule} project={currentProject} />
      </main>
    </>}
  </div>;
}

function TreeRow({ depth, icon, label, open, selected, badge, onToggle, onSelect }: { depth: number; icon: string; label: string; open?: boolean; selected: boolean; badge?: string; onToggle?: () => void; onSelect: () => void }) {
  return <div className={`treeRow ${selected ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 18 }} onClick={onSelect}>
    {onToggle ? <button onClick={event => { event.stopPropagation(); onToggle(); }}>{open ? '⌄' : '›'}</button> : <span className="spacer" />}
    <span className="nodeIcon">{icon}</span><span className="nodeLabel">{label}</span>{badge && <small className="badge">{badge}</small>}
  </div>;
}

function moduleCounts(module: LibraryModule) {
  const tasks = module.sections.reduce((sum, section) => sum + section.tasks.length, 0);
  const activities = module.sections.reduce((sum, section) => sum + section.tasks.reduce((taskSum, task) => taskSum + task.activities.length, 0), 0);
  return { sections: module.sections.length, tasks, activities };
}

function LibraryInspector({ module, project }: { module: LibraryModule; project?: Project }) {
  const counts = moduleCounts(module);
  return <section className="inspectorCard">
    <div className="objectType">Biblioteksmodul · {module.status}</div>
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: 14, background: '#e8f0ea', fontSize: 30, flex: '0 0 auto' }}>{module.icon}</span>
      <div><h2 style={{ margin: '2px 0 7px' }}>{module.name}</h2><p style={{ margin: 0, color: '#66756d', lineHeight: 1.55 }}>{module.description}</p></div>
    </div>
    <div className="propertyRow"><span>Arbetsavsnitt</span><b>{counts.sections}</b></div>
    <div className="propertyRow"><span>Moment</span><b>{counts.tasks}</b></div>
    <div className="propertyRow"><span>Aktiviteter</span><b>{counts.activities}</b></div>
    <div className="propertyRow"><span>Målprojekt</span><b>{project?.name || 'Inget projekt valt'}</b></div>
    <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: '#f3f7f4', color: '#53645a', fontSize: 13, lineHeight: 1.55 }}>
      När modulen läggs till skapas en fristående kopia i projektet. Kopian kan ändras, byggas ut och kompletteras med egna aktiviteter utan att biblioteksmodulen påverkas.
    </div>
  </section>;
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
    try { await onSave({ name, description, activityType }); }
    finally { setSaving(false); }
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
