import { useState } from 'react';
import { App } from './App';

type ActivityType = 'work' | 'documentation' | 'measurement' | 'control' | 'approval' | 'wait';
type PaletteActivity = { title: string; type: ActivityType };
type PaletteTask = { title: string; activities: PaletteActivity[] };
type PaletteSection = { name: string; tasks: PaletteTask[] };
type PaletteModule = { id: string; icon: string; name: string; sections: PaletteSection[] };
type DragPayload = { kind: 'module'; moduleId: string } | { kind: 'section'; moduleId: string; sectionName: string };

type ApiResult = { id?: string; error?: string };
type ProjectStructure = {
  areas: { id: string; name: string }[];
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

const MODULES: PaletteModule[] = [
  {
    id: 'electrical', icon: '⚡', name: 'EL-installation', sections: [
      { name: 'Planering och förberedelse', tasks: [{ title: 'Planera elinstallationen', activities: [
        { title: 'Kontrollera elritning och placeringar', type: 'control' },
        { title: 'Märk ut central, dosor, uttag och strömbrytare', type: 'work' },
        { title: 'Dokumentera överenskomna ändringar', type: 'documentation' }
      ] }] },
      { name: 'Elcentral och matning', tasks: [{ title: 'Förbered och montera elcentral', activities: [
        { title: 'Förbered infästning och kabelvägar', type: 'work' },
        { title: 'Montera elcentral', type: 'work' },
        { title: 'Dokumentera centralens placering', type: 'documentation' }
      ] }] },
      { name: 'Rör, dosor och ledningsvägar', tasks: [{ title: 'Montera rör och dosor', activities: [
        { title: 'Montera apparat- och kopplingsdosor', type: 'work' },
        { title: 'Dra och fixera installationsrör', type: 'work' },
        { title: 'Fotografera dolda rör och dosor', type: 'documentation' }
      ] }] }
    ]
  },
  {
    id: 'crawlspace', icon: '🏗', name: 'Torpargrund', sections: [
      { name: 'Utsättning och schakt', tasks: [{ title: 'Sätt ut och schakta för grund', activities: [
        { title: 'Sätt ut grundens läge och referensnivåer', type: 'measurement' },
        { title: 'Dokumentera mark och utsättning', type: 'documentation' },
        { title: 'Schakta till projekterade nivåer', type: 'work' }
      ] }] },
      { name: 'Sulor och grundmurar', tasks: [{ title: 'Bygg sulor och grundmurar', activities: [
        { title: 'Förbered bärlager och formsättning', type: 'work' },
        { title: 'Kontrollera armering före gjutning', type: 'control' },
        { title: 'Dokumentera armering och genomföringar', type: 'documentation' }
      ] }] },
      { name: 'Ventilation och fuktskydd', tasks: [{ title: 'Ordna ventilation och fuktskydd', activities: [
        { title: 'Montera ventiler enligt plan', type: 'work' },
        { title: 'Utför mark- och väggfuktskydd', type: 'work' },
        { title: 'Dokumentera före återfyllning', type: 'documentation' }
      ] }] }
    ]
  },
  {
    id: 'log-frame', icon: '🪵', name: 'Timmerstomme', sections: [
      { name: 'Förberedelse', tasks: [{ title: 'Förbered timmer och upplag', activities: [
        { title: 'Kontrollera dimensioner och märkning', type: 'control' },
        { title: 'Sortera stockar efter vägg och läge', type: 'work' }
      ] }] },
      { name: 'Timring', tasks: [{ title: 'Timra väggar och knutar', activities: [
        { title: 'Lägg och rikta syllvarv', type: 'work' },
        { title: 'Kontrollera diagonaler och nivåer', type: 'measurement' },
        { title: 'Dokumentera kritiska knutar', type: 'documentation' }
      ] }] }
    ]
  },
  {
    id: 'roof', icon: '🏠', name: 'Tak', sections: [
      { name: 'Takbärverk', tasks: [{ title: 'Montera och kontrollera takbärverk', activities: [
        { title: 'Montera åsar, sparrar eller takstolar', type: 'work' },
        { title: 'Kontrollera upplag och infästningar', type: 'control' },
        { title: 'Dokumentera bärverk före inklädnad', type: 'documentation' }
      ] }] },
      { name: 'Underlagstak', tasks: [{ title: 'Montera råspont och underlagstäckning', activities: [
        { title: 'Montera råspont', type: 'work' },
        { title: 'Montera underlagstäckning', type: 'work' },
        { title: 'Kontrollera genomföringar och tätningar', type: 'control' }
      ] }] }
    ]
  }
];

export function StudioWorkspace() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['electrical']));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [dropTarget, setDropTarget] = useState('');

  function toggle(id: string) {
    setExpanded(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function beginDrag(event: React.DragEvent, payload: DragPayload) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-byggplan-library', JSON.stringify(payload));
  }

  function getProjectId(): string {
    return (document.querySelector('.topbar select') as HTMLSelectElement | null)?.value || '';
  }

  async function api(path: string, body: Record<string, unknown>): Promise<ApiResult> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) throw new Error(data.error || 'Åtgärden misslyckades.');
    return data;
  }

  async function createSectionTree(workAreaId: string, section: PaletteSection) {
    const sectionResult = await api('/api/studio/work-sections', { workAreaId, name: section.name });
    if (!sectionResult.id) throw new Error(`Kunde inte skapa arbetsavsnittet ${section.name}.`);
    for (const task of section.tasks) {
      const taskResult = await api('/api/studio/tasks', { workSectionId: sectionResult.id, title: task.title, description: '' });
      if (!taskResult.id) throw new Error(`Kunde inte skapa momentet ${task.title}.`);
      for (const activity of task.activities) {
        await api('/api/studio/activities', { taskId: taskResult.id, title: activity.title, description: '', activityType: activity.type });
      }
    }
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDropTarget('');
    if (busy) return;
    const raw = event.dataTransfer.getData('application/x-byggplan-library');
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    const module = MODULES.find(item => item.id === payload.moduleId);
    const projectId = getProjectId();
    if (!module || !projectId) return;

    const targetRow = (event.target as HTMLElement).closest('.treeRow') as HTMLElement | null;
    const targetLabel = targetRow?.querySelector('.nodeLabel')?.textContent?.trim() || '';

    setBusy(true);
    try {
      if (payload.kind === 'module') {
        const areaResult = await api('/api/studio/work-areas', { projectId, name: module.name });
        if (!areaResult.id) throw new Error('Kunde inte skapa arbetsområdet.');
        for (const section of module.sections) await createSectionTree(areaResult.id, section);
        setNotice(`${module.name} lades till i projektet.`);
      } else {
        const response = await fetch(`${API_BASE}/api/studio/structure?projectId=${encodeURIComponent(projectId)}`);
        if (!response.ok) throw new Error('Kunde inte läsa projektstrukturen.');
        const structure = await response.json() as ProjectStructure;
        const area = structure.areas.find(item => item.name === targetLabel);
        if (!area) throw new Error('Släpp arbetsavsnittet på ett arbetsområde i projektträdet.');
        const section = module.sections.find(item => item.name === payload.sectionName);
        if (!section) throw new Error('Arbetsavsnittet kunde inte hittas i biblioteket.');
        await createSectionTree(area.id, section);
        setNotice(`${section.name} lades till under ${area.name}.`);
      }
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Kunde inte lägga till objektet.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="studioWorkspace">
    <aside className="palette">
      <div className="paletteHeader"><small>BIBLIOTEKSPALET</small><strong>Byggblock</strong><input placeholder="Sök i biblioteket…" disabled /></div>
      <div className="paletteHint">Dra en hel modul till projektet eller ett arbetsavsnitt till önskat arbetsområde.</div>
      <div className="paletteList">
        {MODULES.map(module => <div className="paletteModule" key={module.id}>
          <div className="paletteModuleRow" draggable={!busy} onDragStart={event => beginDrag(event, { kind: 'module', moduleId: module.id })}>
            <button onClick={() => toggle(module.id)}>{expanded.has(module.id) ? '⌄' : '›'}</button>
            <span>{module.icon}</span><strong>{module.name}</strong><small>{module.sections.length}</small>
          </div>
          {expanded.has(module.id) && <div className="paletteSections">
            {module.sections.map(section => <div className="paletteSection" key={section.name} draggable={!busy} onDragStart={event => beginDrag(event, { kind: 'section', moduleId: module.id, sectionName: section.name })}>
              <span>⌖</span><span>{section.name}</span>
            </div>)}
          </div>}
        </div>)}
      </div>
      {notice && <div className="paletteNotice">{notice}</div>}
    </aside>
    <div className={`projectDropSurface ${dropTarget ? 'dragActive' : ''}`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDropTarget('active'); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(''); }} onDrop={event => void handleDrop(event)}>
      {dropTarget && <div className="dropOverlay">Släpp i projektträdet</div>}
      <App />
    </div>
  </div>;
}
