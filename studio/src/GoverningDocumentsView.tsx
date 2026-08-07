import { useEffect, useMemo, useState } from 'react';
import { VK4410_ENVIRONMENT_DECISION } from './governingDocumentEnvironmentVk4410';

type DocumentSummary = {
  id: string;
  project_id: string;
  document_type: string;
  title: string;
  issuer: string;
  reference: string;
  source_filename: string;
  status: string;
  item_count: number;
  handled_count: number;
  linked_item_count: number;
};

type GoverningDocument = {
  id: string;
  document_type: string;
  title: string;
  issuer: string;
  reference: string;
  source_filename: string;
  source_mime_type: string;
  status: string;
};

type GoverningItem = {
  id: string;
  code: string;
  description: string;
  section_code: string;
  section_title: string;
  item_type: string;
  responsible_role: string;
  evidence_required: string;
  handling_status: string;
  handling_comment: string;
  linked_activity_count: number;
};

type ActivityLink = {
  id: string;
  title: string;
  activity_type: string;
  task_title: string;
  section_name: string;
  area_name: string;
  linked: number;
};

type Props = { projectId: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

const STATUS_LABELS: Record<string, string> = {
  unhandled: 'Ej behandlad',
  in_progress: 'Pågår',
  handled: 'Hanterad',
  not_applicable: 'Ej tillämplig (N/A)',
  cannot_verify: 'Kan inte verifieras',
  alternative_evidence: 'Ersatt av annat underlag'
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  control: 'Kontrollpunkt',
  visit: 'Besök',
  documentation: 'Dokumentation',
  measurement: 'Mätning',
  condition: 'Villkor',
  information: 'Information',
  administration: 'Administration',
  other: 'Styrande post'
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  control_plan: 'Kontrollplan',
  authority_decision: 'Myndighetsbeslut',
  building_permit: 'Bygglov',
  technical_consultation: 'Tekniskt samråd',
  work_environment: 'Arbetsmiljö',
  other: 'Styrande dokument'
};

export function GoverningDocumentsView({ projectId }: Props) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<GoverningDocument | null>(null);
  const [items, setItems] = useState<GoverningItem[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkItemId, setLinkItemId] = useState('');
  const [linkActivities, setLinkActivities] = useState<ActivityLink[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    setSelectedId('');
    setDetail(null);
    setItems([]);
    void loadDocuments();
  }, [projectId]);

  useEffect(() => {
    if (selectedId) void loadDocument(selectedId);
  }, [selectedId]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { code: string; title: string; items: GoverningItem[] }>();
    for (const item of items) {
      const code = item.section_code || 'Ö';
      const title = item.section_title || 'Övriga poster';
      const key = `${code}:${title}`;
      const group = groups.get(key) || { code, title, items: [] };
      group.items.push(item);
      groups.set(key, group);
    }
    return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
  }, [items]);

  async function loadDocuments() {
    if (!projectId) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-documents`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { documents?: DocumentSummary[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte hämta styrande dokument.');
      const next = data.documents || [];
      setDocuments(next);
      setSelectedId(current => next.some(document => document.id === current) ? current : next[0]?.id || '');
      if (!next.length) {
        setDetail(null);
        setItems([]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte hämta styrande dokument.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDocument(id: string) {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-documents/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { document?: GoverningDocument; items?: GoverningItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte läsa det styrande dokumentet.');
      const nextItems = data.items || [];
      setDetail(data.document || null);
      setItems(nextItems);
      const sections = new Set(nextItems.map(item => `${item.section_code || 'Ö'}:${item.section_title || 'Övriga poster'}`));
      setCollapsedSections(sections);
      setLinkItemId('');
      setLinkActivities([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte läsa det styrande dokumentet.');
    } finally {
      setLoading(false);
    }
  }

  async function importEnvironmentDecision() {
    if (!projectId) return;
    if (documents.some(document => document.reference.includes('m-2026-617')) && !window.confirm('Miljöbeslutet verkar redan vara importerat. Vill du skapa ytterligare en digital kopia?')) return;
    setLoading(true);
    setMessage('Läser in miljöbeslutet…');
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-documents/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...VK4410_ENVIRONMENT_DECISION })
      });
      const data = await response.json().catch(() => ({})) as { id?: string; createdItems?: number; error?: string };
      if (!response.ok) throw new Error(data.error || 'Importen misslyckades.');
      setMessage(`Miljöbeslutet importerades med ${data.createdItems || 0} styrande poster.`);
      await loadDocuments();
      if (data.id) setSelectedId(data.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Importen misslyckades.');
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(item: GoverningItem, status: string, comment: string) {
    const next = { ...item, handling_status: status, handling_comment: comment };
    setItems(current => current.map(value => value.id === item.id ? next : value));
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handlingStatus: status, handlingComment: comment })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara posten.');
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte spara posten.');
    }
  }

  async function openActivityLinks(item: GoverningItem) {
    if (linkItemId === item.id) {
      setLinkItemId('');
      setLinkActivities([]);
      return;
    }
    setLinkBusy(true);
    setLinkItemId(item.id);
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/activity-links`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { activities?: ActivityLink[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte läsa aktiviteterna.');
      setLinkActivities(data.activities || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte läsa aktiviteterna.');
    } finally {
      setLinkBusy(false);
    }
  }

  async function saveActivityLinks(item: GoverningItem) {
    setLinkBusy(true);
    try {
      const activityIds = linkActivities.filter(activity => activity.linked).map(activity => activity.id);
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/activity-links`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityIds })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara aktivitetskopplingarna.');
      setItems(current => current.map(value => value.id === item.id ? { ...value, linked_activity_count: activityIds.length } : value));
      setMessage(`${activityIds.length} aktiviteter kopplade till ${item.code || 'posten'}.`);
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte spara aktivitetskopplingarna.');
    } finally {
      setLinkBusy(false);
    }
  }

  function toggleSection(key: string) {
    setCollapsedSections(current => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return <div className="governingPrimaryView">
    <aside className="governingListPanel">
      <div className="governingListHeader"><small>STYRANDE DOKUMENT</small><strong>Projektets dokument</strong></div>
      <div className="governingList">
        {documents.map(document => <button key={document.id} className={selectedId === document.id ? 'active' : ''} onClick={() => setSelectedId(document.id)}>
          <b>{DOCUMENT_TYPE_LABELS[document.document_type] || 'Dokument'}</b>
          <span>{document.title}</span>
          <small>{document.handled_count}/{document.item_count} hanterade · {document.linked_item_count} kopplade</small>
        </button>)}
        {!documents.length && !loading && <p>Inga styrande dokument importerade.</p>}
      </div>
      <div className="governingImportBox">
        <small>GRANSKAT UNDERLAG</small>
        <strong>Miljöbeslut m-2026-617</strong>
        <p>Tillstånd och fotobilaga för enskilt avlopp.</p>
        <button disabled={loading} onClick={() => void importEnvironmentDecision()}>{loading ? 'Läser in…' : '+ Läs in miljöbeslutet'}</button>
      </div>
    </aside>

    <main className="governingContent">
      {detail ? <>
        <header className="governingPageHeader">
          <div><small>{DOCUMENT_TYPE_LABELS[detail.document_type] || 'STYRANDE DOKUMENT'}</small><h1>{detail.title}</h1><p>{[detail.issuer, detail.reference].filter(Boolean).join(' · ')}</p></div>
          <button disabled>Skriv ut sammanställning</button>
        </header>
        <div className="governingSource"><span className="objectType">{detail.status}</span><span>Original: {detail.source_filename}</span></div>

        <div className="governingSections">
          {groupedItems.map(group => {
            const collapsed = collapsedSections.has(group.key);
            return <section className="governingSection" key={group.key}>
              <button className="governingSectionHeader" onClick={() => toggleSection(group.key)}>
                <span>{collapsed ? '›' : '⌄'}</span><b>{group.code}</b><strong>{group.title}</strong><small>{group.items.length} poster</small>
              </button>
              {!collapsed && <div className="governingItems">{group.items.map(item => <article className="governingItem" key={item.id}>
                <div className="governingItemTop">
                  <div><span className="pointTypeBadge">{ITEM_TYPE_LABELS[item.item_type] || 'Styrande post'}</span><h3>{item.code} {item.description}</h3></div>
                  <span className={`governingStatus status-${item.handling_status}`}>{STATUS_LABELS[item.handling_status] || item.handling_status}</span>
                </div>
                {(item.responsible_role || item.evidence_required) && <p className="governingMeta">{[item.responsible_role, item.evidence_required].filter(Boolean).join(' · ')}</p>}
                <div className="governingItemControls">
                  <label><span>Hantering</span><select value={item.handling_status} onChange={event => void updateItem(item, event.target.value, item.handling_comment || '')}>
                    {Object.entries(STATUS_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                  <label className="governingComment"><span>Kommentar</span><textarea value={item.handling_comment || ''} onChange={event => setItems(current => current.map(value => value.id === item.id ? { ...value, handling_comment: event.target.value } : value))} onBlur={event => void updateItem(item, item.handling_status, event.target.value)} placeholder="Kommentar, avvikelse eller förklaring…" /></label>
                </div>
                <div className="governingLinksHeader"><button onClick={() => void openActivityLinks(item)}>🔗 {item.linked_activity_count || 0} kopplade aktiviteter</button></div>
                {linkItemId === item.id && <div className="governingActivityLinker">
                  <div className="governingActivityLinkerHeader"><strong>Koppla till aktiviteter i projektet</strong><button disabled={linkBusy} onClick={() => void saveActivityLinks(item)}>Spara kopplingar</button></div>
                  {linkBusy && !linkActivities.length ? <p>Hämtar aktiviteter…</p> : <div className="governingActivityList">{linkActivities.map(activity => <label key={activity.id}>
                    <input type="checkbox" checked={Boolean(activity.linked)} onChange={event => setLinkActivities(current => current.map(value => value.id === activity.id ? { ...value, linked: event.target.checked ? 1 : 0 } : value))} />
                    <span><b>{activity.title}</b><small>{activity.area_name} › {activity.section_name} › {activity.task_title}</small></span>
                  </label>)}</div>}
                </div>}
              </article>)}</div>}
            </section>;
          })}
        </div>
      </> : <div className="empty"><span>📚</span><h2>Styrande dokument</h2><p>Kontrollplan, myndighetsbeslut och andra externa dokument samlas här och kopplas till aktiviteterna i projektet.</p></div>}
      {message && <div className="controlPlanMessage">{message}</div>}
    </main>
  </div>;
}
