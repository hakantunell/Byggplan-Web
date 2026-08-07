import { useEffect, useState } from 'react';
import { StudioWorkspace } from './StudioWorkspace';
import { GoverningDocumentsWorkspace } from './GoverningDocumentsWorkspace';

type StudioView = 'project' | 'governing-documents';
type Project = { id: string; name: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

function ProjectRailBridge({ onOpenGoverningDocuments }: { onOpenGoverningDocuments: () => void }) {
  useEffect(() => {
    let button: HTMLButtonElement | null = null;
    let timer = 0;

    const connect = () => {
      const rail = document.querySelector('.studio .rail');
      button = rail ? (rail.querySelectorAll('button')[1] as HTMLButtonElement | undefined) || null : null;
      if (!button) {
        timer = window.setTimeout(connect, 50);
        return;
      }
      button.disabled = false;
      button.title = 'Öppna styrande dokument';
      const label = button.querySelector('span');
      if (label) label.textContent = 'Styrdokument';
      button.addEventListener('click', onOpenGoverningDocuments);
    };

    connect();
    return () => {
      window.clearTimeout(timer);
      button?.removeEventListener('click', onOpenGoverningDocuments);
    };
  }, [onOpenGoverningDocuments]);

  return null;
}

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

  if (view === 'project') {
    return <div className="studioShell view-project">
      <StudioWorkspace />
      <ProjectRailBridge onOpenGoverningDocuments={() => setView('governing-documents')} />
    </div>;
  }

  const currentProject = projects.find(project => project.id === projectId);

  return <div className="studioShell view-control-plan view-governing-documents">
    <div className="controlPlanStudioFrame">
      <header className="topbar controlPlanTopbar">
        <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>Projekteditor</small></div></div>
        <select value={projectId} onChange={event => setProjectId(event.target.value)}>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <div className="connection ready">● Ansluten</div>
      </header>

      <aside className="rail controlPlanRail">
        <button type="button" title="Projekt" onClick={() => setView('project')}>🌳<span>Projekt</span></button>
        <button type="button" className="active" title="Styrande dokument">📚<span>Styrdokument</span></button>
        <button type="button" disabled title="Dokument">📄<span>Dokument</span></button>
        <button type="button" disabled title="Användare">👥<span>Användare</span></button>
      </aside>

      <section className="controlPlanMainRegion" aria-label={`Styrande dokument för ${currentProject?.name || 'projektet'}`}>
        {projectId ? <GoverningDocumentsWorkspace projectId={projectId} /> : <div className="empty"><span>📚</span><h2>Inget projekt valt</h2></div>}
      </section>
    </div>
  </div>;
}
