import { useEffect, useState } from 'react';
import { StudioWorkspace } from './StudioWorkspace';
import { ControlPlanOverlay } from './ControlPlanOverlay';

type StudioView = 'project' | 'control-plan';

function MountedControlPlan() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const launcher = document.querySelector('.controlPlanRailButton') as HTMLButtonElement | null;
      launcher?.click();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <ControlPlanOverlay />;
}

export function StudioShell() {
  const [view, setView] = useState<StudioView>('project');

  return <div className={`studioShell view-${view}`}>
    <StudioWorkspace />

    <nav className="studioPrimaryNavigation" aria-label="Huvudvyer">
      <button type="button" className={view === 'project' ? 'active' : ''} onClick={() => setView('project')} title="Projekt">
        <span className="studioNavIcon">🌳</span><span>Projekt</span>
      </button>
      <button type="button" className={view === 'control-plan' ? 'active' : ''} onClick={() => setView('control-plan')} title="Kontrollplan">
        <span className="studioNavIcon">📋</span><span>Kontrollplan</span>
      </button>
    </nav>

    {view === 'control-plan' && <MountedControlPlan />}
  </div>;
}
