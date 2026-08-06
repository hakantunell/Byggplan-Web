import { useEffect, useMemo, useState } from 'react';

type ActivityTemplate = { title: string; description: string; activityType: string };
type TaskTemplate = { title: string; description: string; activities: ActivityTemplate[] };
type SectionTemplate = { name: string; tasks: TaskTemplate[] };
type AreaTemplate = { id: string; name: string; description: string; icon: string; sections: SectionTemplate[] };
type Project = { id: string; name: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

const LIBRARY: AreaTemplate[] = [
  {
    id: 'electricity', name: 'EL-installation', icon: '⚡',
    description: 'Grundstruktur för planering, utförande och dokumentation av elinstallationen.',
    sections: [
      { name: 'Planering och förläggning', tasks: [
        { title: 'Planera elinstallation', description: 'Gå igenom ritning, grupper, placeringar och ledningsvägar före arbetet.', activities: [
          { title: 'Kontrollera elritning och gruppförteckning', description: 'Verifiera att underlaget är aktuellt och anpassat till projektet.', activityType: 'control' },
          { title: 'Märk ut central, dosor och uttag', description: 'Märk ut placeringar innan håltagning och förläggning.', activityType: 'work' }
        ]},
        { title: 'Förlägg rör och kabelvägar', description: 'Utför förläggning innan konstruktionen byggs igen.', activities: [
          { title: 'Förlägg rör och kabelskydd', description: 'Följ planerade ledningsvägar och böjradier.', activityType: 'work' },
          { title: 'Dokumentera dold el', description: 'Fotografera ledningsvägar med fasta referenser innan de täcks.', activityType: 'documentation' }
        ]}
      ]},
      { name: 'Central och slutkontroll', tasks: [
        { title: 'Montera och kontrollera elcentral', description: 'Installation och kontroll utförs av behörigt elinstallationsföretag.', activities: [
          { title: 'Montera och märka central', description: 'Märk grupper och dokumentera gruppförteckningen.', activityType: 'work' },
          { title: 'Samla intyg och kontrollresultat', description: 'Registrera dokumentation från elinstallationsföretaget.', activityType: 'documentation' }
        ]}
      ]}
    ]
  },
  {
    id: 'crawlspace', name: 'Torpargrund', icon: '🧱',
    description: 'Arbetsstruktur för ventilerad kryp-/torpargrund med sula och mur.',
    sections: [
      { name: 'Grundsula', tasks: [
        { title: 'Förbered och armera grundsula', description: 'Kontrollera nivå, mått, underlag och armering före gjutning.', activities: [
          { title: 'Kontrollera schaktbotten och nivå', description: 'Verifiera bärighet och referensnivå.', activityType: 'control' },
          { title: 'Montera form och armering', description: 'Utför enligt konstruktionsunderlag.', activityType: 'work' },
          { title: 'Dokumentera före gjutning', description: 'Fotografera mått, armering och genomföringar.', activityType: 'documentation' }
        ]}
      ]},
      { name: 'Grundmur', tasks: [
        { title: 'Mura grundmur', description: 'Mura, förankra och kontrollera grundens geometri.', activities: [
          { title: 'Mura grundblock', description: 'Följ nivåer och förband.', activityType: 'work' },
          { title: 'Kontrollera diagonaler och höjder', description: 'Registrera kontrollmått innan bjälklaget monteras.', activityType: 'measurement' }
        ]}
      ]}
    ]
  },
  {
    id: 'timber', name: 'Timmerstomme', icon: '🪵',
    description: 'Grundstruktur för sortering, timring, öppningar och dokumentation av timmerstommen.',
    sections: [
      { name: 'Timring', tasks: [
        { title: 'Sortera och märk timmer', description: 'Bestäm vägg, varv och orientering för stockarna.', activities: [
          { title: 'Märk stockar och registrera placering', description: 'Använd beständig märkning och dokumentera avvikelser.', activityType: 'work' }
        ]},
        { title: 'Timra väggar', description: 'Bearbeta knutar, långdrag och dymlingar enligt vald profil.', activities: [
          { title: 'Bearbeta och passa in stock', description: 'Kontrollera anliggning innan permanent infästning.', activityType: 'work' },
          { title: 'Dokumentera kritiska mått', description: 'Registrera stödmått och avvikande lösningar.', activityType: 'documentation' }
        ]}
      ]}
    ]
  }
];

async function request(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({})) as { id?: string; error?: string };
  if (!response.ok || !data.id) throw new Error(data.error || 'Kunde inte skapa mallens objekt.');
  return data.id;
}

async function installArea(projectId: string, template: AreaTemplate) {
  const areaId = await request('/api/studio/work-areas', { projectId, name: template.name });
  for (const section of template.sections) {
    const sectionId = await request('/api/studio/work-sections', { workAreaId: areaId, name: section.name });
    for (const task of section.tasks) {
      const taskId = await request('/api/studio/tasks', { workSectionId: sectionId, title: task.title, description: task.description });
      for (const activity of task.activities) {
        await request('/api/studio/activities', {
          taskId, title: activity.title, description: activity.description, activityType: activity.activityType
        });
      }
    }
  }
}

export function TemplateLab({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'library' | 'project'>('library');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [selected, setSelected] = useState(LIBRARY[0].id);
  const [foundation, setFoundation] = useState<'crawlspace' | 'slab'>('crawlspace');
  const [frame, setFrame] = useState<'timber' | 'stud'>('timber');
  const [includeElectricity, setIncludeElectricity] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`).then(r => r.json()).then((data: { projects: Project[] }) => {
      setProjects(data.projects || []); setProjectId(data.projects?.[0]?.id || '');
    }).catch(() => setMessage('Kunde inte hämta projekt.'));
  }, []);

  const current = LIBRARY.find(item => item.id === selected) || LIBRARY[0];
  const projectModules = useMemo(() => {
    const items: AreaTemplate[] = [];
    if (foundation === 'crawlspace') items.push(LIBRARY.find(item => item.id === 'crawlspace')!);
    if (frame === 'timber') items.push(LIBRARY.find(item => item.id === 'timber')!);
    if (includeElectricity) items.push(LIBRARY.find(item => item.id === 'electricity')!);
    return items;
  }, [foundation, frame, includeElectricity]);

  async function addTemplates(templates: AreaTemplate[]) {
    if (!projectId || working) return;
    setWorking(true); setMessage('Lägger in mall…');
    try {
      for (const template of templates) await installArea(projectId, template);
      setMessage(`${templates.length === 1 ? templates[0].name : 'Projektmallen'} har lagts till i projektet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mallen kunde inte läggas till.');
    } finally { setWorking(false); }
  }

  return <div className="templateLab">
    <header className="templateTopbar">
      <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>Mallar och bibliotek</small></div></div>
      <select value={projectId} onChange={event => setProjectId(event.target.value)}>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <button onClick={onBack}>← Projektstruktur</button>
    </header>
    <nav className="templateTabs">
      <button className={mode === 'library' ? 'active' : ''} onClick={() => setMode('library')}>📚 Bibliotek</button>
      <button className={mode === 'project' ? 'active' : ''} onClick={() => setMode('project')}>🏠 Projektmallar</button>
    </nav>

    {mode === 'library' ? <main className="templateLayout">
      <aside className="templateList">
        <h2>Byggblock</h2><p>Välj ett färdigt arbetsområde och lägg in hela strukturen i projektet.</p>
        {LIBRARY.map(item => <button key={item.id} className={selected === item.id ? 'active' : ''} onClick={() => setSelected(item.id)}>
          <span>{item.icon}</span><div><strong>{item.name}</strong><small>{item.sections.length} arbetsavsnitt</small></div>
        </button>)}
      </aside>
      <section className="templatePreview">
        <div className="templateHero"><span>{current.icon}</span><div><small>BIBLIOTEKSKOMPONENT</small><h1>{current.name}</h1><p>{current.description}</p></div></div>
        <TemplateTree template={current} />
        <div className="templateActions"><span>{message}</span><button disabled={!projectId || working} onClick={() => void addTemplates([current])}>{working ? 'Lägger till…' : `Lägg till ${current.name}`}</button></div>
      </section>
    </main> : <main className="projectTemplate">
      <section className="projectConfigurator">
        <small>PROJEKTMALL</small><h1>Fritidshus</h1><p>Sätt samman en första projektstruktur genom att välja byggnadens huvudutförande.</p>
        <fieldset><legend>Grund</legend>
          <label><input type="radio" checked={foundation === 'crawlspace'} onChange={() => setFoundation('crawlspace')} /> Torpargrund</label>
          <label className="disabled"><input type="radio" checked={foundation === 'slab'} onChange={() => setFoundation('slab')} /> Platta på mark <em>kommer senare</em></label>
        </fieldset>
        <fieldset><legend>Stomme</legend>
          <label><input type="radio" checked={frame === 'timber'} onChange={() => setFrame('timber')} /> Timmerstomme</label>
          <label className="disabled"><input type="radio" checked={frame === 'stud'} onChange={() => setFrame('stud')} /> Lösvirkesstomme <em>kommer senare</em></label>
        </fieldset>
        <fieldset><legend>Installationer</legend>
          <label><input type="checkbox" checked={includeElectricity} onChange={event => setIncludeElectricity(event.target.checked)} /> EL-installation</label>
        </fieldset>
        <div className="templateActions"><span>{message}</span><button disabled={!projectId || working || projectModules.length === 0} onClick={() => void addTemplates(projectModules)}>{working ? 'Skapar projektstruktur…' : 'Lägg till vald projektmall'}</button></div>
      </section>
      <section className="projectSummary"><h2>Detta läggs till</h2>{projectModules.map(item => <TemplateTree key={item.id} template={item} compact />)}</section>
    </main>}
  </div>;
}

function TemplateTree({ template, compact = false }: { template: AreaTemplate; compact?: boolean }) {
  return <div className={`templateTree ${compact ? 'compact' : ''}`}>
    <h3>{template.icon} {template.name}</h3>
    {template.sections.map(section => <div className="templateSection" key={section.name}><strong>📁 {section.name}</strong>
      {section.tasks.map(task => <div className="templateTask" key={task.title}><span>▣ {task.title}</span><small>{task.activities.length} aktiviteter</small>
        {!compact && <ul>{task.activities.map(activity => <li key={activity.title}>{activity.activityType === 'documentation' ? '📷' : activity.activityType === 'measurement' ? '📏' : activity.activityType === 'control' ? '✓' : '🔨'} {activity.title}</li>)}</ul>}
      </div>)}
    </div>)}
  </div>;
}
