import { useEffect, useMemo, useState } from 'react';

type ControlPlanSummary = {
  id: string;
  title: string;
  source_filename: string;
  status: string;
  imported_at: string;
  point_count: number;
  completed_count: number;
};

type ControlPlanPoint = {
  id: string;
  code: string;
  description: string;
  control_method: string;
  responsible_role: string;
  evidence_required: string;
  category_code: string;
  category_title: string;
  point_type: string;
  applicable: number;
  result: string;
  completed: number;
};

type ControlPlanDetail = {
  id: string;
  title: string;
  source_filename: string;
  source_mime_type: string;
  status: string;
};

type Props = {
  projectId: string;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

function pointTypeLabel(type: string) {
  return ({
    control: 'Kontroll',
    visit: 'Besök',
    document: 'Dokumentkrav',
    administration: 'Administration',
    not_applicable: 'Ej aktuell'
  } as Record<string, string>)[type] || 'Kontroll';
}

export function ControlPlanView({ projectId }: Props) {
  const [plans, setPlans] = useState<ControlPlanSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<ControlPlanDetail | null>(null);
  const [points, setPoints] = useState<ControlPlanPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedId('');
    setDetail(null);
    setPoints([]);
    void loadPlans();
  }, [projectId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId]);

  const groupedPoints = useMemo(() => {
    const groups = new Map<string, { code: string; title: string; points: ControlPlanPoint[] }>();
    for (const point of points) {
      const code = point.category_code || 'Ö';
      const title = point.category_title || 'Övriga kontrollpunkter';
      const key = `${code}:${title}`;
      const group = groups.get(key) || { code, title, points: [] };
      group.points.push(point);
      groups.set(key, group);
    }
    return [...groups.values()];
  }, [points]);

  async function loadPlans() {
    if (!projectId) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/control-plans`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { controlPlans?: ControlPlanSummary[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte hämta kontrollplaner.');
      const next = data.controlPlans || [];
      setPlans(next);
      setSelectedId(current => next.some(plan => plan.id === current) ? current : next[0]?.id || '');
      if (!next.length) {
        setDetail(null);
        setPoints([]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte hämta kontrollplaner.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/studio/control-plans/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { controlPlan?: ControlPlanDetail; points?: ControlPlanPoint[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte läsa kontrollplanen.');
      setDetail(data.controlPlan || null);
      setPoints(data.points || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte läsa kontrollplanen.');
    } finally {
      setLoading(false);
    }
  }

  async function updatePoint(point: ControlPlanPoint, patch: Partial<ControlPlanPoint>) {
    const next = { ...point, ...patch };
    setPoints(current => current.map(item => item.id === point.id ? next : item));
    try {
      const response = await fetch(`${API_BASE}/api/studio/control-plan-points/${encodeURIComponent(point.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: next.result, completed: Boolean(next.completed) })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte uppdatera kontrollpunkten.');
      await loadPlans();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte uppdatera kontrollpunkten.');
      await loadDetail(point.id);
    }
  }

  function toggleCategory(key: string) {
    setCollapsedCategories(current => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const applicable = points.filter(point => point.applicable !== 0);
  const completed = applicable.filter(point => point.completed).length;

  return <div className="controlPlanPrimaryView">
    <aside className="controlPlanListPanel">
      <div className="controlPlanListHeader">
        <small>KONTROLLPLANER</small>
        <strong>Projektets planer</strong>
      </div>
      <div className="controlPlanList">
        {plans.map(plan => <button key={plan.id} className={selectedId === plan.id ? 'active' : ''} onClick={() => setSelectedId(plan.id)}>
          <span>{plan.title}</span>
          <small>{plan.completed_count}/{plan.point_count} klara</small>
        </button>)}
        {!plans.length && !loading && <p>Ingen kontrollplan importerad.</p>}
        {loading && !plans.length && <p>Hämtar kontrollplan…</p>}
      </div>
    </aside>

    <main className="controlPlanContent">
      <div className="controlPlanPageHeader">
        <div><small>KONTROLLPLAN</small><h1>{detail?.title || 'Kontrollplan'}</h1></div>
        <div className="controlPlanPageActions"><button disabled>Skriv ut ifylld kontrollplan</button></div>
      </div>

      {detail ? <>
        <div className="controlPlanDocumentMeta"><span className="objectType">{detail.status}</span><span>Original: {detail.source_filename}</span></div>
        <div className="controlPlanProgress"><span>Färdigställda tillämpliga kontrollpunkter</span><strong>{completed} / {applicable.length}</strong></div>
        <div className="controlPlanPoints">
          {groupedPoints.map(group => {
            const key = `${group.code}:${group.title}`;
            const collapsed = collapsedCategories.has(key);
            return <section className="controlPlanCategory" key={key}>
              <button className="controlPlanCategoryHeader" onClick={() => toggleCategory(key)}>
                <span>{collapsed ? '›' : '⌄'}</span><b>{group.code}</b><strong>{group.title}</strong><small>{group.points.filter(point => point.completed).length}/{group.points.length}</small>
              </button>
              {!collapsed && <div className="controlPlanCategoryPoints">
                {group.points.map(point => <article key={point.id} className={`${point.completed ? 'completed' : ''} ${point.applicable === 0 ? 'notApplicable' : ''}`}>
                  <label className="controlPlanCheck">
                    <input type="checkbox" checked={Boolean(point.completed)} disabled={point.applicable === 0} onChange={event => void updatePoint(point, { completed: event.target.checked ? 1 : 0 })} />
                    <span>{point.code}</span>
                  </label>
                  <div>
                    <div className="pointTypeBadge">{pointTypeLabel(point.point_type)}</div>
                    <h4>{point.description}</h4>
                    <p>{[point.control_method, point.responsible_role, point.evidence_required].filter(Boolean).join(' · ') || 'Ingen ytterligare information angiven'}</p>
                    {point.applicable !== 0 && <textarea value={point.result || ''} onChange={event => setPoints(current => current.map(item => item.id === point.id ? { ...item, result: event.target.value } : item))} onBlur={event => void updatePoint(point, { result: event.target.value })} placeholder="Resultat, kommentar eller hänvisning till dokumentation…" />}
                  </div>
                </article>)}
              </div>}
            </section>;
          })}
        </div>
      </> : <div className="empty"><span>📋</span><h2>Ingen digital kontrollplan</h2><p>Importfunktionen återansluts till denna vy i nästa steg. Den tidigare importerade planen visas automatiskt när den finns i projektet.</p></div>}
      {message && <div className="controlPlanMessage">{message}</div>}
    </main>
  </div>;
}
