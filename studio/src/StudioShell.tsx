import { useEffect, useState } from 'react';
import { StudioWorkspace } from './StudioWorkspace';
import { ControlPlanView } from './ControlPlanView';

type StudioView = 'project' | 'control-plan';
type Project = { id: string; name: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

export function StudioShell() {
  const [view, setView] = useState<StudioView>('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/projects`, { cache: 'no-store' });
        const data = await response.json() as { projects?: Project[] };
        const next = data.projects || [];
        setProjects(next);
        setProjectId(current => current || next[0]?.id || '');
      } catch {
        setProjects([]);
      }
    })();
  }, []);

  const currentProject = projects.find(project => project.id === projectId);

  return <div className={`studioShell view-${view}`}>
    {view === 'project' ? <StudioWorkspace /> : <div className="controlPlanStudioFrame">
      <header className="topbar controlPlanTopbar">
        <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>Projekteditor</small></div></div>
        <select value={projectId} onChange={event => setProjectId(event.target.value)}>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <div className="connection ready">● Ansluten</div>
      </header>

      <aside className="rail controlPlanRail" aria-hidden="true" />

      <section className="controlPlanMainRegion" aria-label={`Kontrollplan för ${currentProject?.name || 'projektet'}`}>
        {projectId ? <ControlPlanView projectId={projectId} /> : <div className="empty"><span>📋</span><h2>Inget projekt valt</h2></div>}
      </section>
    </div>}

    <nav className="studioPrimaryNavigation" aria-label="Huvudmeny">
      <button type="button" className={view === 'project' ? 'active' : ''} onClick={() => setView('project')} title="Projekt">
        <span className="studioNavIcon">🌳</span><span>Projekt</span>
      </button>
      <button type="button" className={view === 'control-plan' ? 'active' : ''} onClick={() => setView('control-plan')} title="Kontrollplan">
        <span className="studioNavIcon">📋</span><span>Kontrollplan</span>
      </button>
      <button type="button" disabled title="Dokument">
        <span className="studioNavIcon">📄</span><span>Dokument</span>
      </button>
      <button type="button" disabled title="Användare">
        <span className="studioNavIcon">👥</span><span>Användare</span>
      </button>
    </nav>
  </div>;
}
