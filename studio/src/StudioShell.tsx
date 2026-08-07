import { useEffect, useState } from 'react';
import { StudioWorkspace } from './StudioWorkspace';
import { GoverningDocumentsWorkspace } from './GoverningDocumentsWorkspace';
import { MasterProjectsView } from './MasterProjectsView';

type StudioView = 'project' | 'governing-documents' | 'master-projects';
type Project = { id: string; name: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

function ProjectRailBridge({ onOpenGoverningDocuments, onOpenMasterProjects }: { onOpenGoverningDocuments: () => void; onOpenMasterProjects: () => void }) {
  useEffect(() => {
    let governingButton: HTMLButtonElement | null = null;
    let masterButton: HTMLButtonElement | null = null;
    let timer = 0;

    const connect = () => {
      const rail = document.querySelector('.studio .rail');
      const buttons = rail ? rail.querySelectorAll('button') : [];
      governingButton = (buttons[1] as HTMLButtonElement | undefined) || null;
      masterButton = (buttons[2] as HTMLButtonElement | undefined) || null;
      if (!governingButton) {
        timer = window.setTimeout(connect, 50);
        return;
      }
      governingButton.disabled = false;
      governingButton.title = 'Öppna styrande dokument';
      const governingLabel = governingButton.querySelector('span');
      if (governingLabel) governingLabel.textContent = 'Styrdokument';
      governingButton.addEventListener('click', onOpenGoverningDocuments);

      if (masterButton) {
        masterButton.disabled = false;
        masterButton.title = 'Öppna masterprojekt';
        masterButton.textContent = '';
        const icon = document.createElement('span');
        icon.textContent = '🏠';
        const label = document.createElement('span');
        label.textContent = 'Masterprojekt';
        masterButton.append(icon, label);
        masterButton.addEventListener('click', onOpenMasterProjects);
      }
    };

    connect();
    return () => {
      window.clearTimeout(timer);
      governingButton?.removeEventListener('click', onOpenGoverningDocuments);
      masterButton?.removeEventListener('click', onOpenMasterProjects);
    };
  }, [onOpenGoverningDocuments, onOpenMasterProjects]);

  return null;
}

export function StudioShell() {
  const [view, setView] = useState<StudioView>('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects(selectId?: string) {
    try {
      const response = await fetch(`${API_BASE}/api/projects`, { cache: 'no-store' });
      const data = await response.json() as { projects?: Project[] };
      const next = data.projects || [];
      setProjects(next);
      setProjectId(current => selectId && next.some(project => project.id === selectId) ? selectId : current || next[0]?.id || '');
    } catch {
      setProjects([]);
    }
  }

  function openCreatedProject(createdProjectId: string) {
    void loadProjects(createdProjectId);
    setView('project');
    let attempts = 0;
    const selectWhenReady = () => {
      const select = document.querySelector('.studio .topbar select') as HTMLSelectElement | null;
      const optionExists = select ? Array.from(select.options).some(option => option.value === createdProjectId) : false;
      if (select && optionExists) {
        select.value = createdProjectId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      attempts += 1;
      if (attempts < 50) window.setTimeout(selectWhenReady, 100);
    };
    window.setTimeout(selectWhenReady, 50);
  }

  if (view === 'project') {
    return <div className="studioShell view-project">
      <StudioWorkspace />
      <ProjectRailBridge onOpenGoverningDocuments={() => setView('governing-documents')} onOpenMasterProjects={() => setView('master-projects')} />
    </div>;
  }

  const currentProject = projects.find(project => project.id === projectId);
  const masterView = view === 'master-projects';

  return <div className={`studioShell view-control-plan ${masterView ? 'view-master-projects' : 'view-governing-documents'}`}>
    <div className="controlPlanStudioFrame">
      <header className="topbar controlPlanTopbar">
        <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>{masterView ? 'Masterprojekt' : 'Projekteditor'}</small></div></div>
        {!masterView && <select value={projectId} onChange={event => setProjectId(event.target.value)}>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>}
        {masterView && <div className="masterTopbarLabel">Bibliotek</div>}
        <div className="connection ready">● Ansluten</div>
      </header>

      <aside className="rail controlPlanRail">
        <button type="button" title="Projekt" onClick={() => setView('project')}>🌳<span>Projekt</span></button>
        <button type="button" className={view === 'governing-documents' ? 'active' : ''} title="Styrande dokument" onClick={() => setView('governing-documents')}>📚<span>Styrdokument</span></button>
        <button type="button" className={masterView ? 'active' : ''} title="Masterprojekt" onClick={() => setView('master-projects')}>🏠<span>Masterprojekt</span></button>
        <button type="button" disabled title="Användare">👥<span>Användare</span></button>
      </aside>

      <section className="controlPlanMainRegion" aria-label={masterView ? 'Masterprojekt' : `Styrande dokument för ${currentProject?.name || 'projektet'}`}>
        {masterView ? <MasterProjectsView onProjectCreated={openCreatedProject} /> : projectId ? <GoverningDocumentsWorkspace projectId={projectId} /> : <div className="empty"><span>📚</span><h2>Inget projekt valt</h2></div>}
      </section>
    </div>
  </div>;
}
