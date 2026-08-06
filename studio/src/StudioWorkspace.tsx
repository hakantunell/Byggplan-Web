import { useState } from 'react';
import { App } from './App';

type ActivityType = 'work' | 'documentation' | 'measurement' | 'control' | 'approval' | 'wait';
type ClassificationCategory = 'documentation' | 'control_plan' | 'requirement';
type ActivityClassification = {
  category: ClassificationCategory;
  code: string;
  label: string;
  source?: string;
};
type PaletteActivity = {
  title: string;
  type: ActivityType;
  classifications?: ActivityClassification[];
};
type PaletteTask = { title: string; activities: PaletteActivity[] };
type PaletteSection = { name: string; tasks: PaletteTask[] };
type PaletteModule = { id: string; icon: string; name: string; sections: PaletteSection[] };
type DragPayload =
  | { kind: 'module'; moduleId: string }
  | { kind: 'section'; moduleId: string; sectionName: string };

type ProjectStructure = {
  areas: { id: string; name: string }[];
};

type ImportResult = {
  ok?: boolean;
  error?: string;
  created?: { sections: number; tasks: number; activities: number; classifications?: number };
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

const DOC_AUTHORITY: ActivityClassification = { category: 'documentation', code: 'authority', label: 'Myndighetsdokumentation' };
const DOC_OWN: ActivityClassification = { category: 'documentation', code: 'own', label: 'Egen byggdokumentation' };
const DOC_KA: ActivityClassification = { category: 'documentation', code: 'ka', label: 'Underlag till KA' };

const MODULES: PaletteModule[] = [
  {
    id: 'electrical', icon: '⚡', name: 'EL-installation', sections: [
      { name: 'Planering och förberedelse', tasks: [{ title: 'Planera elinstallationen', activities: [
        { title: 'Kontrollera elritning och placeringar', type: 'control', classifications: [
          { category: 'requirement', code: 'electrical-plan', label: 'Elprojektering' }
        ] },
        { title: 'Märk ut central, dosor, uttag och strömbrytare', type: 'work' },
        { title: 'Dokumentera överenskomna ändringar', type: 'documentation', classifications: [DOC_OWN] }
      ] }] },
      { name: 'Elcentral och matning', tasks: [{ title: 'Förbered och montera elcentral', activities: [
        { title: 'Förbered infästning och kabelvägar', type: 'work' },
        { title: 'Montera elcentral', type: 'work' },
        { title: 'Dokumentera centralens placering', type: 'documentation', classifications: [DOC_OWN] }
      ] }] },
      { name: 'Rör, dosor och ledningsvägar', tasks: [{ title: 'Montera rör och dosor', activities: [
        { title: 'Montera apparat- och kopplingsdosor', type: 'work' },
        { title: 'Dra och fixera installationsrör', type: 'work' },
        { title: 'Fotografera dolda rör och dosor', type: 'documentation', classifications: [
          DOC_OWN,
          { category: 'requirement', code: 'relationsunderlag', label: 'Relationsunderlag' }
        ] }
      ] }] }
    ]
  },
  {
    id: 'crawlspace', icon: '🏗', name: 'Torpargrund', sections: [
      { name: 'Utsättning och schakt', tasks: [{ title: 'Sätt ut och schakta för grund', activities: [
        { title: 'Sätt ut grundens läge och referensnivåer', type: 'measurement', classifications: [
          { category: 'control_plan', code: 'KP-GRUND-01', label: 'Utsättning och nivåer' },
          { category: 'requirement', code: 'building-permit', label: 'Bygglovshandlingar' }
        ] },
        { title: 'Dokumentera mark och utsättning', type: 'documentation', classifications: [
          DOC_AUTHORITY,
          DOC_OWN,
          { category: 'control_plan', code: 'KP-GRUND-01', label: 'Utsättning och nivåer' }
        ] },
        { title: 'Schakta till projekterade nivåer', type: 'work' }
      ] }] },
      { name: 'Sulor och grundmurar', tasks: [{ title: 'Bygg sulor och grundmurar', activities: [
        { title: 'Förbered bärlager och formsättning', type: 'work' },
        { title: 'Kontrollera armering före gjutning', type: 'control', classifications: [
          { category: 'control_plan', code: 'KP-GRUND-03', label: 'Armering före gjutning' },
          { category: 'requirement', code: 'structural-design', label: 'Konstruktionsunderlag' }
        ] },
        { title: 'Dokumentera armering och genomföringar', type: 'documentation', classifications: [
          DOC_AUTHORITY,
          DOC_KA,
          DOC_OWN,
          { category: 'control_plan', code: 'KP-GRUND-03', label: 'Armering före gjutning' }
        ] }
      ] }] },
      { name: 'Ventilation och fuktskydd', tasks: [{ title: 'Ordna ventilation och fuktskydd', activities: [
        { title: 'Montera ventiler enligt plan', type: 'work' },
        { title: 'Utför mark- och väggfuktskydd', type: 'work' },
        { title: 'Dokumentera före återfyllning', type: 'documentation', classifications: [
          DOC_AUTHORITY,
          DOC_OWN,
          { category: 'control_plan', code: 'KP-GRUND-05', label: 'Fuktskydd och dolda delar' }
        ] }
      ] }] }
    ]
  },
  {
    id: 'log-frame', icon: '🪵', name: 'Timmerstomme', sections: [
      { name: 'Förberedelse', tasks: [{ title: 'Förbered timmer och upplag', activities: [
        { title: 'Kontrollera dimensioner och märkning', type: 'control', classifications: [
          { category: 'control_plan', code: 'KP-STOMME-01', label: 'Material och dimensioner' }
        ] },
        { title: 'Sortera stockar efter vägg och läge', type: 'work' }
      ] }] },
      { name: 'Timring', tasks: [{ title: 'Timra väggar och knutar', activities: [
        { title: 'Lägg och rikta syllvarv', type: 'work' },
        { title: 'Kontrollera diagonaler och nivåer', type: 'measurement', classifications: [
          { category: 'control_plan', code: 'KP-STOMME-02', label: 'Geometri och nivåer' }
        ] },
        { title: 'Dokumentera kritiska knutar', type: 'documentation', classifications: [
          DOC_OWN,
          DOC_KA,
          { category: 'control_plan', code: 'KP-STOMME-03', label: 'Knutar och infästningar' }
        ] }
      ] }] }
    ]
  },
  {
    id: 'roof', icon: '🏠', name: 'Tak', sections: [
      { name: 'Takbärverk', tasks: [{ title: 'Montera och kontrollera takbärverk', activities: [
        { title: 'Montera åsar, sparrar eller takstolar', type: 'work' },
        { title: 'Kontrollera upplag och infästningar', type: 'control', classifications: [
          { category: 'control_plan', code: 'KP-TAK-01', label: 'Bärverk och infästningar' },
          { category: 'requirement', code: 'structural-design', label: 'Konstruktionsunderlag' }
        ] },
        { title: 'Dokumentera bärverk före inklädnad', type: 'documentation', classifications: [
          DOC_AUTHORITY,
          DOC_KA,
          DOC_OWN,
          { category: 'control_plan', code: 'KP-TAK-01', label: 'Bärverk och infästningar' }
        ] }
      ] }] },
      { name: 'Underlagstak', tasks: [{ title: 'Montera råspont och underlagstäckning', activities: [
        { title: 'Montera råspont', type: 'work' },
        { title: 'Montera underlagstäckning', type: 'work' },
        { title: 'Kontrollera genomföringar och tätningar', type: 'control', classifications: [
          { category: 'control_plan', code: 'KP-TAK-03', label: 'Täthet och genomföringar' }
        ] }
      ] }] }
    ]
  }
];

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  work: '●',
  documentation: '📷',
  measurement: '📏',
  control: '✓',
  approval: '✍',
  wait: '📝'
};

const CLASSIFICATION_ICONS: Record<ClassificationCategory, string> = {
  documentation: '📄',
  control_plan: '☑',
  requirement: '§'
};

export function StudioWorkspace() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([
    'module:crawlspace',
    'section:crawlspace:Utsättning och schakt',
    'task:crawlspace:Utsättning och schakt:Sätt ut och schakta för grund'
  ]));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [dropTarget, setDropTarget] = useState(false);
  const [projectRevision, setProjectRevision] = useState(0);

  function toggle(key: string) {
    setExpanded(current => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function beginDrag(event: React.DragEvent, payload: DragPayload) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-byggplan-library', JSON.stringify(payload));
  }

  function getProjectId() {
    return (document.querySelector('.topbar select') as HTMLSelectElement | null)?.value || '';
  }

  async function loadProjectStructure(projectId: string): Promise<ProjectStructure> {
    const response = await fetch(`${API_BASE}/api/studio/structure?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Kunde inte läsa projektstrukturen (${response.status}).`);
    return response.json() as Promise<ProjectStructure>;
  }

  async function importTree(body: Record<string, unknown>): Promise<ImportResult> {
    const response = await fetch(`${API_BASE}/api/studio/import-tree`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({})) as ImportResult;
    if (!response.ok) throw new Error(data.error || `Importen misslyckades (${response.status}).`);
    return data;
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDropTarget(false);
    if (busy) return;

    const raw = event.dataTransfer.getData('application/x-byggplan-library');
    if (!raw) return;

    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      setNotice('Det gick inte att läsa det dragna objektet.');
      return;
    }

    const module = MODULES.find(item => item.id === payload.moduleId);
    const projectId = getProjectId();
    if (!module || !projectId) return;

    setBusy(true);
    setNotice('Lägger till komponenten…');

    try {
      let result: ImportResult;
      if (payload.kind === 'module') {
        result = await importTree({ projectId, areaName: module.name, sections: module.sections });
      } else {
        const targetRow = (event.target as HTMLElement).closest('.treeRow') as HTMLElement | null;
        const targetLabel = targetRow?.querySelector('.nodeLabel')?.textContent?.trim() || '';
        const structure = await loadProjectStructure(projectId);
        const area = structure.areas.find(item => item.name === targetLabel);
        if (!area) throw new Error('Släpp arbetsavsnittet på ett arbetsområde i projektträdet.');
        const section = module.sections.find(item => item.name === payload.sectionName);
        if (!section) throw new Error('Arbetsavsnittet kunde inte hittas i komponenten.');
        result = await importTree({ projectId, targetWorkAreaId: area.id, sections: [section] });
      }

      const created = result.created;
      setNotice(created
        ? `Klart: ${created.sections} avsnitt, ${created.tasks} moment, ${created.activities} aktiviteter och ${created.classifications ?? 0} klassificeringar skapades.`
        : 'Komponenten lades till.');
      setProjectRevision(current => current + 1);
      window.setTimeout(() => setNotice(''), 5000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Kunde inte lägga till komponenten.');
      setProjectRevision(current => current + 1);
    } finally {
      setBusy(false);
    }
  }

  return <div className="studioWorkspace">
    <aside className="palette">
      <div className="paletteHeader">
        <small>KOMPONENTER</small>
        <strong>Byggblock</strong>
        <input placeholder="Sök komponenter…" disabled />
      </div>
      <div className="paletteHint">Expandera för att granska aktiviteter och klassificeringar. Dra en modul till projektet eller ett avsnitt till ett arbetsområde.</div>
      <div className="paletteList">
        {MODULES.map(module => {
          const moduleKey = `module:${module.id}`;
          const taskCount = module.sections.reduce((sum, section) => sum + section.tasks.length, 0);
          const activityCount = module.sections.reduce((sum, section) => sum + section.tasks.reduce((taskSum, task) => taskSum + task.activities.length, 0), 0);
          return <div className="paletteModule" key={module.id}>
            <div className="paletteModuleRow" draggable={!busy} onDragStart={event => beginDrag(event, { kind: 'module', moduleId: module.id })}>
              <button onClick={event => { event.stopPropagation(); toggle(moduleKey); }}>{expanded.has(moduleKey) ? '⌄' : '›'}</button>
              <span>{module.icon}</span>
              <div className="paletteNodeText"><strong>{module.name}</strong><small>{module.sections.length} avsnitt · {taskCount} moment · {activityCount} aktiviteter</small></div>
            </div>
            {expanded.has(moduleKey) && <div className="paletteSections">
              {module.sections.map(section => {
                const sectionKey = `section:${module.id}:${section.name}`;
                const sectionActivities = section.tasks.reduce((sum, task) => sum + task.activities.length, 0);
                return <div className="paletteSectionGroup" key={section.name}>
                  <div className="paletteSection" draggable={!busy} onDragStart={event => beginDrag(event, { kind: 'section', moduleId: module.id, sectionName: section.name })}>
                    <button onClick={event => { event.stopPropagation(); toggle(sectionKey); }}>{expanded.has(sectionKey) ? '⌄' : '›'}</button>
                    <span className="paletteNodeIcon">⌖</span>
                    <div className="paletteNodeText"><span>{section.name}</span><small>{section.tasks.length} moment · {sectionActivities} aktiviteter</small></div>
                  </div>
                  {expanded.has(sectionKey) && <div className="paletteTasks">
                    {section.tasks.map(task => {
                      const taskKey = `task:${module.id}:${section.name}:${task.title}`;
                      return <div className="paletteTaskGroup" key={task.title}>
                        <div className="paletteTask">
                          <button onClick={() => toggle(taskKey)}>{expanded.has(taskKey) ? '⌄' : '›'}</button>
                          <span className="paletteNodeIcon">▣</span>
                          <div className="paletteNodeText"><span>{task.title}</span><small>{task.activities.length} aktiviteter</small></div>
                        </div>
                        {expanded.has(taskKey) && <div className="paletteActivities">
                          {task.activities.map(activity => <div className={`paletteActivity type-${activity.type}`} key={`${activity.title}:${activity.type}`}>
                            <div className="paletteActivityTitle">
                              <span className="activityTypeIcon" title={activity.type}>{ACTIVITY_ICONS[activity.type]}</span>
                              <span>{activity.title}</span>
                            </div>
                            {!!activity.classifications?.length && <div className="classificationChips">
                              {activity.classifications.map(classification => <span
                                className={`classificationChip category-${classification.category}`}
                                key={`${classification.category}:${classification.code}`}
                                title={`${classification.code} · ${classification.label}`}
                              >
                                <b>{CLASSIFICATION_ICONS[classification.category]}</b>{classification.label}
                              </span>)}
                            </div>}
                          </div>)}
                        </div>}
                      </div>;
                    })}
                  </div>}
                </div>;
              })}
            </div>}
          </div>;
        })}
      </div>
      {notice && <div className="paletteNotice">{notice}</div>}
    </aside>

    <div
      className={`projectDropSurface ${dropTarget ? 'dragActive' : ''}`}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDropTarget(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(false); }}
      onDrop={event => void handleDrop(event)}
    >
      {dropTarget && <div className="dropOverlay">Släpp i projektträdet</div>}
      <App key={projectRevision} />
    </div>
  </div>;
}
