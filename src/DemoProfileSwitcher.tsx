import { useEffect, useState } from 'react';

const profiles = [
  { email: 'worker@demo.byggplan.local', label: 'Arbetare' },
  { email: 'supervisor@demo.byggplan.local', label: 'Arbetsledare' }
];

export const DEMO_USER_KEY = 'byggplan.demoUser';
export const DEFAULT_DEMO_USER = profiles[0].email;

export function installDemoFetchIdentity() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('X-Demo-User', localStorage.getItem(DEMO_USER_KEY) || DEFAULT_DEMO_USER);
    return originalFetch(input, { ...init, headers });
  };
}

export function DemoProfileSwitcher() {
  const [selected, setSelected] = useState(() => localStorage.getItem(DEMO_USER_KEY) || DEFAULT_DEMO_USER);
  const [open, setOpen] = useState(false);
  const profile = profiles.find(item => item.email === selected) || profiles[0];

  useEffect(() => { localStorage.setItem(DEMO_USER_KEY, selected); }, [selected]);

  const choose = (email: string) => {
    localStorage.setItem(DEMO_USER_KEY, email);
    setSelected(email);
    setOpen(false);
    window.location.reload();
  };

  return <div className="demoProfile">
    <button className="demoProfileButton" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <span>👤</span><span><small>Demoläge</small><b>{profile.label}</b></span><em>{open ? '−' : '+'}</em>
    </button>
    {open && <div className="demoProfileMenu">
      {profiles.map(item => <button key={item.email} className={item.email === selected ? 'selected' : ''} onClick={() => choose(item.email)}>
        <span>{item.email === selected ? '✓' : ''}</span><span><b>{item.label}</b><small>{item.email}</small></span>
      </button>)}
    </div>}
  </div>;
}
