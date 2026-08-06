import { useEffect, useState } from 'react';
import { App } from './App';
import { TemplateLab } from './TemplateLab';

export function StudioShell() {
  const [module, setModule] = useState<'project' | 'templates'>(() => window.location.hash === '#templates' ? 'templates' : 'project');

  useEffect(() => {
    const sync = () => setModule(window.location.hash === '#templates' ? 'templates' : 'project');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function open(next: 'project' | 'templates') {
    window.location.hash = next === 'templates' ? 'templates' : '';
    setModule(next);
  }

  return <>
    {module === 'project' ? <App /> : <TemplateLab onBack={() => open('project')} />}
    {module === 'project' && <button className="templateLauncher" onClick={() => open('templates')} title="Öppna bibliotek och projektmallar">📚<span>Mallar</span></button>}
  </>;
}
