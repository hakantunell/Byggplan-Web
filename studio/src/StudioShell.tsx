import { useEffect, useState } from 'react';
import { StudioWorkspace } from './StudioWorkspace';
import { GoverningDocumentsWorkspace } from './GoverningDocumentsWorkspace';
import { MasterProjectsView } from './MasterProjectsView';

type StudioView = 'project' | 'governing-documents' | 'master-projects';
type Project = { id: string; name: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');
const PROJECT_STORAGE_KEY = 'byggplan.studio.projectId';

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

function ProjectSelectionBridge({ projectId, onProjectChange }: { projectId: string; onProjectChange: (id: string) => void }) {
  useEffect(() => {
    let select: HTMLSelectElement | null = null;

    const handleChange = () => {
      const next = select?.value || '';
      if (next && next !== projectId) onProjectChange(next);
    };

    const sync = () => {
      const nextSelect = document.querySelector('.studio .topbar select') as HTMLSelectElement | null;
      if (nextSelect !== select) {
        select?.removeEventListener('change', handleChange);
        select = nextSelect;
        select?.addEventListener('change', handleChange);
      }
      if (!select || !projectId) return;
      const optionExists = Array.from(select.options).some(option => option.value === projectId);
      if (optionExists && select.value !== projectId) {
        select.value = projectId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    sync();
    const timer = window.setInterval(sync, 100);
    return () => {
      window.clearInterval(timer);
      select?.removeEventListener('change', handleChange);
    };
  }, [projectId, onProjectChange]);

  return null;
}

export function StudioShell() {
  const [view, setView] = useState<StudioView>('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    void loadProjects();
  }, []);

  function selectProject(id: string) {
    if (!id) return;
    setProjectId(id);
    try { window.localStorage.setItem(PROJECT_STORAGE_KEY, id); } catch { /* ignore unavailable storage */ }
  }

  async function loadProjects(selectId?: string) {
    try {
      const response = await fetch(`${API_BASE}/api/projects`, { cache: 'no-store' });
      const data = await response.json() as { projects?: Project[] };
      const next = data.projects || [];
      setProjects(next);
      let stored = '';
      try { stored = window.localStorage.getItem(PROJECT_STORAGE_KEY) || ''; } catch { /* ignore unavailable storage */ }
      setProjectId(current => {
        const candidate =
          (selectId && next.some(project => project.id === selectId) ? selectId : '') ||
          (current && next.some(project => project.id === current) ? current : '') ||
          (stored && next.some(project => project.id === stored) ? stored : '') ||
          next[0]?.id || '';
        if (candidate) {
          try { window.localStorage.setItem(PROJECT_STORAGE_KEY, candidate); } catch { /* ignore unavailable storage */ }
        }
        return candidate;
      });
    } catch {
      setProjects([]);
    }
  }

  function openCreatedProject(createdProjectId: string) {
    selectProject(createdProjectId);
    void loadProjects(createdProjectId);
    setView('project');
  }

  if (view === 'project') {
    return <div className="studioShell view-project">
      <StudioWorkspace />
      <ProjectSelectionBridge projectId={projectId} onProjectChange={selectProject} />
      <ProjectRailBridge onOpenGoverningDocuments={() => setView('governing-documents')} onOpenMasterProjects={() => setView('master-projects')} />
    </div>;
  }

  const currentProject = projects.find(project => project.id === projectId);
  const masterView = view === 'master-projects';

  return <div className={`studioShell view-control-plan ${masterView ? 'view-master-projects' : 'view-governing-documents'}`}>
    <div className="controlPlanStudioFrame">
      <header className="topbar controlPlanTopbar">
        <div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>{masterView ? 'Masterprojekt' : 'Projekteditor'}</small></div></div>
        {!masterView && <select value={projectId} onChange={event => selectProject(event.target.value)}>
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
