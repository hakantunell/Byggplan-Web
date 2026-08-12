import { useEffect, useMemo, useState } from 'react';
import { VK4410_ENVIRONMENT_DECISION } from './governingDocumentEnvironmentVk4410';

type DocumentSummary = {
  id: string; project_id: string; document_type: string; title: string; issuer: string;
  reference: string; source_filename: string; status: string; item_count: number;
  handled_count: number; linked_item_count: number;
};

type GoverningDocument = {
  id: string; document_type: string; title: string; issuer: string; reference: string;
  source_filename: string; source_mime_type: string; status: string;
};

type GoverningItem = {
  id: string; code: string; description: string; section_code: string; section_title: string;
  item_type: string; responsible_role: string; evidence_required: string; handling_status: string;
  handling_comment: string; linked_activity_count: number;
};

type VerificationStep = {
  id: string; governing_item_id: string; role_code: string; required: number; status: string;
  comment: string; verified_at?: string | null; verified_by_name?: string | null;
};

type SourceInfo = { id: string; source_basis: string; source_note: string };

type ActivityLink = {
  id: string; title: string; activity_type: string; task_title: string; section_name: string;
  area_name: string; linked: number;
};

type HistoryActivity = {
  id: string; title: string; done?: number; completed_at?: string | null; updated_at?: string | null;
  completed_by_name?: string | null;
};

type HistoryVerification = {
  role_code: string; status: string; comment: string; verified_at?: string | null;
  verified_by_name?: string | null;
};

type ItemHistory = { activities: HistoryActivity[]; verifications: HistoryVerification[]; status: string };
type Props = { projectId: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

function delay(ms:number){return new Promise<void>(resolve=>window.setTimeout(resolve,ms))}
async function fetchWithTransientRetry(input:RequestInfo|URL,init?:RequestInit){
  let lastError:unknown;
  for(let attempt=0;attempt<3;attempt+=1){
    try{
      const response=await fetch(input,init);
      if(response.status<500||attempt===2)return response;
    }catch(error){lastError=error;if(attempt===2)throw error}
    await delay(250*(attempt+1));
  }
  throw lastError instanceof Error?lastError:new Error('Tillfälligt fel vid hämtning.');
}

const DERIVED_STATUS_LABELS: Record<string,string> = {
  waiting_activity: 'Väntar på aktivitet',
  in_progress: 'Pågår',
  ready_for_verification: 'Klar för verifiering',
  waiting_ka: 'Väntar på KA',
  verified: 'Verifierad',
  rejected: 'Avvisad',
  not_applicable: 'Ej tillämplig (N/A)',
  cannot_verify: 'Kan inte verifieras',
  alternative_evidence: 'Ersatt av annat underlag'
};

const EXCEPTION_OPTIONS = [
  ['', 'Inget undantag'],
  ['not_applicable', 'Ej tillämplig (N/A)'],
  ['cannot_verify', 'Kan inte verifieras'],
  ['alternative_evidence', 'Ersatt av annat underlag']
] as const;

const ITEM_TYPE_LABELS: Record<string, string> = {
  control: 'Kontrollpunkt', visit: 'Besök', documentation: 'Dokumentation', measurement: 'Mätning',
  condition: 'Villkor', information: 'Information', administration: 'Administration', other: 'Styrande post'
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  control_plan: 'Kontrollplan', authority_decision: 'Myndighetsbeslut', building_permit: 'Bygglov',
  technical_consultation: 'Tekniskt samråd', work_environment: 'Arbetsmiljö', other: 'Styrande dokument'
};

const ROLE_LABELS: Record<string, string> = {
  builder: 'Byggherre / egenkontroll', ka: 'KA', authority: 'Myndighet', external: 'Extern sakkunnig'
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ','T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
}

export function GoverningDocumentsView({ projectId }: Props) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<GoverningDocument | null>(null);
  const [items, setItems] = useState<GoverningItem[]>([]);
  const [verifications, setVerifications] = useState<Record<string, VerificationStep[]>>({});
  const [sourceInfo, setSourceInfo] = useState<Record<string, SourceInfo>>({});
  const [derivedStatus, setDerivedStatus] = useState<Record<string,string>>({});
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkItemId, setLinkItemId] = useState('');
  const [linkActivities, setLinkActivities] = useState<ActivityLink[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);
  const [historyItemId, setHistoryItemId] = useState('');
  const [history, setHistory] = useState<Record<string,ItemHistory>>({});

  useEffect(() => {
    setSelectedId(''); setDetail(null); setItems([]); setVerifications({}); setSourceInfo({});
    setDerivedStatus({}); setHistory({}); void loadDocuments();
  }, [projectId]);

  useEffect(() => { if (selectedId) void loadDocument(selectedId); }, [selectedId]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { code: string; title: string; items: GoverningItem[] }>();
    for (const item of items) {
      const code = item.section_code || 'Ö'; const title = item.section_title || 'Övriga poster';
      const key = `${code}:${title}`; const group = groups.get(key) || { code, title, items: [] };
      group.items.push(item); groups.set(key, group);
    }
    return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
  }, [items]);

  async function loadDocuments() {
    if (!projectId) return;
    setLoading(true); setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-documents`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { documents?: DocumentSummary[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte hämta styrande dokument.');
      const next = data.documents || []; setDocuments(next);
      setSelectedId(current => next.some(document => document.id === current) ? current : next[0]?.id || '');
      if (!next.length) { setDetail(null); setItems([]); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte hämta styrande dokument.'); }
    finally { setLoading(false); }
  }

  async function loadDocument(id: string) {
    setLoading(true); setMessage('');
    try {
      const documentResponse = await fetch(`${API_BASE}/api/studio/governing-documents/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await documentResponse.json().catch(() => ({})) as { document?: GoverningDocument; items?: GoverningItem[]; error?: string };
      if (!documentResponse.ok) throw new Error(data.error || 'Kunde inte läsa det styrande dokumentet.');

      const nextItems = data.items || [];
      setDetail(data.document || null); setItems(nextItems);
      setVerifications({}); setSourceInfo({}); setDerivedStatus({});
      setCollapsedSections(new Set(nextItems.map(item => `${item.section_code || 'Ö'}:${item.section_title || 'Övriga poster'}`)));
      setLinkItemId(''); setLinkActivities([]); setHistoryItemId('');

      try {
        const verificationResponse = await fetchWithTransientRetry(`${API_BASE}/api/studio/governing-documents/${encodeURIComponent(id)}/verification-map`, { cache: 'no-store' });
        const verificationData = await verificationResponse.json().catch(() => ({})) as {
          verifications?: VerificationStep[]; source?: SourceInfo[]; status?: Record<string,string>; error?: string
        };
        if (!verificationResponse.ok) throw new Error(verificationData.error || 'Kunde inte läsa verifieringsflödet.');
        const verificationMap: Record<string, VerificationStep[]> = {};
        for (const step of verificationData.verifications || []) (verificationMap[step.governing_item_id] ||= []).push(step);
        const sourceMap: Record<string, SourceInfo> = {};
        for (const source of verificationData.source || []) sourceMap[source.id] = source;
        setVerifications(verificationMap); setSourceInfo(sourceMap); setDerivedStatus(verificationData.status || {});
      } catch (verificationError) {
        const text = verificationError instanceof Error ? verificationError.message : 'Kunde inte läsa verifieringsflödet.';
        setMessage(`Dokumentet är inläst, men verifieringsdelen kunde inte hämtas: ${text}`);
      }
    } catch (error) { setDetail(null); setItems([]); setMessage(error instanceof Error ? error.message : 'Kunde inte läsa det styrande dokumentet.'); }
    finally { setLoading(false); }
  }

  async function importEnvironmentDecision() {
    if (!projectId) return;
    if (documents.some(document => document.reference.includes('m-2026-617')) && !window.confirm('Miljöbeslutet verkar redan vara importerat. Vill du skapa ytterligare en digital kopia?')) return;
    setLoading(true); setMessage('Läser in miljöbeslutet…');
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-documents/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, ...VK4410_ENVIRONMENT_DECISION })
      });
      const data = await response.json().catch(() => ({})) as { id?: string; createdItems?: number; error?: string };
      if (!response.ok) throw new Error(data.error || 'Importen misslyckades.');
      setMessage(`Miljöbeslutet importerades med ${data.createdItems || 0} styrande poster.`);
      await loadDocuments(); if (data.id) setSelectedId(data.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Importen misslyckades.'); }
    finally { setLoading(false); }
  }

  async function setException(item: GoverningItem, exception: string) {
    const status = exception || 'unhandled';
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handlingStatus: status, handlingComment: item.handling_comment || '' })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara undantaget.');
      await loadDocument(selectedId); await loadDocuments();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte spara undantaget.'); }
  }

  async function saveComment(item: GoverningItem, comment: string) {
    const status = ['not_applicable','cannot_verify','alternative_evidence'].includes(item.handling_status) ? item.handling_status : 'unhandled';
    setItems(current => current.map(value => value.id === item.id ? { ...value, handling_comment: comment } : value));
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handlingStatus: status, handlingComment: comment })
      });
      if (!response.ok) throw new Error('Kunde inte spara kommentaren.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte spara kommentaren.'); }
  }

  async function updateVerification(item: GoverningItem, step: VerificationStep, status: string) {
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/verifications/${encodeURIComponent(step.role_code)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, comment: step.comment || '' })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara verifieringen.');
      setMessage(status === 'verified' ? `${ROLE_LABELS[step.role_code] || step.role_code} har verifierat posten.` : 'Verifieringen återställdes.');
      await loadDocument(selectedId); await loadDocuments();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte spara verifieringen.'); }
  }

  async function openHistory(item: GoverningItem) {
    if (historyItemId === item.id) { setHistoryItemId(''); return; }
    setHistoryItemId(item.id);
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/history`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as ItemHistory & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte läsa historiken.');
      setHistory(current => ({ ...current, [item.id]: data }));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte läsa historiken.'); }
  }

  async function openActivityLinks(item: GoverningItem) {
    if (linkItemId === item.id) { setLinkItemId(''); setLinkActivities([]); return; }
    setLinkBusy(true); setLinkItemId(item.id);
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/activity-links`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { activities?: ActivityLink[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte läsa aktiviteterna.');
      setLinkActivities(data.activities || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte läsa aktiviteterna.'); }
    finally { setLinkBusy(false); }
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
      setMessage(`${activityIds.length} aktiviteter kopplade till ${item.code || 'posten'}.`);
      await loadDocument(selectedId); await loadDocuments();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kunde inte spara aktivitetskopplingarna.'); }
    finally { setLinkBusy(false); }
  }

  function toggleSection(key: string) {
    setCollapsedSections(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }
  return <div className="governingPrimaryView">
    <aside className="governingListPanel">
      <div className="governingListHeader"><small>STYRANDE DOKUMENT</small><strong>Projektets dokument</strong></div>
      <div className="governingList">
        {documents.map(document => <button key={document.id} className={selectedId === document.id ? 'active' : ''} onClick={() => setSelectedId(document.id)}>
          <b>{DOCUMENT_TYPE_LABELS[document.document_type] || 'Dokument'}</b><span>{document.title}</span>
          <small>{document.item_count} poster · {document.linked_item_count} kopplade</small>
        </button>)}
        {!documents.length && !loading && <p>Inga styrande dokument importerade.</p>}
      </div>
      <div className="governingImportBox"><small>GRANSKAT UNDERLAG</small><strong>Miljöbeslut m-2026-617</strong><p>Tillstånd och fotobilaga för enskilt avlopp.</p>
        <button disabled={loading} onClick={() => void importEnvironmentDecision()}>{loading ? 'Läser in…' : '+ Läs in miljöbeslutet'}</button></div>
    </aside>

    <main className="governingContent">
      {detail ? <>
        <header className="governingPageHeader"><div><small>{DOCUMENT_TYPE_LABELS[detail.document_type] || 'STYRANDE DOKUMENT'}</small><h1>{detail.title}</h1><p>{[detail.issuer, detail.reference].filter(Boolean).join(' · ')}</p></div><button disabled>Skriv ut sammanställning</button></header>
        <div className="governingSource"><span className="objectType">{detail.status}</span><span>Original: {detail.source_filename}</span></div>

        <div className="governingSections">{groupedItems.map(group => {
          const collapsed = collapsedSections.has(group.key);
          return <section className="governingSection" key={group.key}>
            <button className="governingSectionHeader" onClick={() => toggleSection(group.key)}><span>{collapsed ? '›' : '⌄'}</span><b>{group.code}</b><strong>{group.title}</strong><small>{group.items.length} poster</small></button>
            {!collapsed && <div className="governingItems">{group.items.map(item => {
              const steps = verifications[item.id] || []; const source = sourceInfo[item.id];
              const status = derivedStatus[item.id] || 'waiting_activity';
              const exception = ['not_applicable','cannot_verify','alternative_evidence'].includes(item.handling_status) ? item.handling_status : '';
              const itemHistory = history[item.id];
              return <article className="governingItem" key={item.id}>
                <div className="governingItemTop"><div><span className="pointTypeBadge">{ITEM_TYPE_LABELS[item.item_type] || 'Styrande post'}</span><h3>{item.code} {item.description}</h3></div>
                  <span className={`governingStatus status-${status}`}>{DERIVED_STATUS_LABELS[status] || status}</span></div>

                {(source?.source_basis || item.responsible_role || source?.source_note || item.evidence_required) && <div className="governingSourceFacts">
                  {source?.source_basis && <div><b>Utfört enligt</b><span>{source.source_basis}</span></div>}
                  {item.responsible_role && <div><b>Egenkontr/alt KA</b><span>{item.responsible_role}</span></div>}
                  {source?.source_note && <div><b>Anteckningar</b><span>{source.source_note}</span></div>}
                  {!source?.source_note && item.evidence_required && <div><b>Underlag</b><span>{item.evidence_required}</span></div>}
                </div>}

                <div className="governingVerification"><div className="governingVerificationHeading"><b>Verifiering</b><small>{steps.length ? `${steps.filter(step => step.status === 'verified').length}/${steps.length} klara` : 'Inget verifieringssteg angivet'}</small></div>
                  {!!steps.length && <div className="governingVerificationSteps">{steps.map(step => <div className={`verificationStep verification-${step.status}`} key={step.id}>
                    <span className="verificationMark">{step.status === 'verified' ? '✓' : step.status === 'rejected' ? '!' : '○'}</span>
                    <div><b>{ROLE_LABELS[step.role_code] || step.role_code}</b><small>{step.status === 'verified' ? `Verifierad${step.verified_by_name ? ` av ${step.verified_by_name}` : ''}${step.verified_at ? ` · ${formatDate(step.verified_at)}` : ''}` : step.role_code === 'builder' ? 'Sker automatiskt när kopplade aktiviteter är klara' : step.status === 'rejected' ? 'Avvisad' : 'Väntar på verifiering'}</small></div>
                    {step.role_code !== 'builder' && <button onClick={() => void updateVerification(item, step, step.status === 'verified' ? 'pending' : 'verified')}>{step.status === 'verified' ? 'Återställ' : 'Verifiera'}</button>}
                  </div>)}</div>}
                </div>

                <div className="governingExceptionControls"><label><span>Undantag</span><select value={exception} onChange={event => void setException(item, event.target.value)}>{EXCEPTION_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="governingComment"><span>Kommentar</span><textarea value={item.handling_comment || ''} onChange={event => setItems(current => current.map(value => value.id === item.id ? { ...value, handling_comment: event.target.value } : value))} onBlur={event => void saveComment(item, event.target.value)} placeholder={exception ? 'Förklara undantaget…' : 'Kommentar eller förklaring…'} /></label></div>

                <div className="governingLinksHeader"><button onClick={() => void openActivityLinks(item)}>🔗 {item.linked_activity_count || 0} kopplade aktiviteter</button><button onClick={() => void openHistory(item)}>🕘 Historik</button></div>
                {historyItemId === item.id && <div className="governingHistory">
                  {!itemHistory ? <p>Hämtar historik…</p> : <>
                    <strong>Aktiviteter och egenkontroll</strong>
                    {!itemHistory.activities.length && <p>Inga aktiviteter är kopplade ännu.</p>}
                    {itemHistory.activities.map(activity => <div className="historyRow" key={activity.id}><span>{activity.done ? '✓' : '○'}</span><div><b>{activity.title}</b><small>{activity.done ? `Klar${activity.completed_by_name ? ` av ${activity.completed_by_name}` : ''}${activity.completed_at ? ` · ${formatDate(activity.completed_at)}` : ''}` : activity.updated_at ? `Påbörjad/uppdaterad ${formatDate(activity.updated_at)}` : 'Ej påbörjad'}</small></div></div>)}
                    <strong>Verifieringar</strong>
                    {itemHistory.verifications.map((verification,index) => <div className="historyRow" key={`${verification.role_code}-${index}`}><span>{verification.status === 'verified' ? '✓' : verification.status === 'rejected' ? '!' : '○'}</span><div><b>{ROLE_LABELS[verification.role_code] || verification.role_code}</b><small>{verification.status === 'verified' ? `Verifierad${verification.verified_by_name ? ` av ${verification.verified_by_name}` : ''}${verification.verified_at ? ` · ${formatDate(verification.verified_at)}` : ''}` : verification.status === 'rejected' ? 'Avvisad' : 'Väntar'}{verification.comment ? ` · ${verification.comment}` : ''}</small></div></div>)}
                  </>}
                </div>}

                {linkItemId === item.id && <div className="governingActivityLinker"><div className="governingActivityLinkerHeader"><strong>Koppla till aktiviteter i projektet</strong><button disabled={linkBusy} onClick={() => void saveActivityLinks(item)}>Spara kopplingar</button></div>
                  {linkBusy && !linkActivities.length ? <p>Hämtar aktiviteter…</p> : <div className="governingActivityList">{linkActivities.map(activity => <label key={activity.id}><input type="checkbox" checked={Boolean(activity.linked)} onChange={event => setLinkActivities(current => current.map(value => value.id === activity.id ? { ...value, linked: event.target.checked ? 1 : 0 } : value))} /><span><b>{activity.title}</b><small>{activity.area_name} › {activity.section_name} › {activity.task_title}</small></span></label>)}</div>}
                </div>}
              </article>;
            })}</div>}
          </section>;
        })}</div>
      </> : <div className="empty"><span>📚</span><h2>Styrande dokument</h2><p>Kontrollplan, myndighetsbeslut och andra externa dokument samlas här och kopplas till aktiviteterna i projektet.</p></div>}
      {message && <div className="controlPlanMessage">{message}</div>}
    </main>
  </div>;
}