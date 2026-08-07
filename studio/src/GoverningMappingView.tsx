import { useEffect, useMemo, useState } from 'react';

type MappingSummary = {
  item_count: number; mapped_count: number; exception_count: number; covered_count: number;
  uncovered_count: number; coverage_percent: number;
};
type MappingDocument = {
  id: string; document_type: string; title: string; issuer: string; reference: string;
  item_count: number; mapped_count: number; exception_count: number; covered_count: number;
  uncovered_count: number; coverage_percent: number;
};
type MappingItem = {
  id: string; governing_document_id: string; code: string; description: string; section_code: string;
  section_title: string; item_type: string; responsible_role: string; handling_status: string;
  source_note: string; mapped_activity_count: number; mapped_activity_titles?: string | null;
};
type MappingActivity = {
  id: string; title: string; description: string; activity_type: string; task_title: string;
  section_name: string; area_name: string; governing_item_count: number;
};
type Suggestion = {
  activity_id: string; title: string; task_title: string; section_name: string; area_name: string; confidence: number;
};
type MappingResponse = {
  summary: MappingSummary; documents: MappingDocument[]; items: MappingItem[]; activities: MappingActivity[];
  suggestions: Record<string,Suggestion[]>; error?: string;
};
type Props = { projectId: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');
const DOCUMENT_LABELS: Record<string,string> = {
  control_plan: 'Kontrollplan', authority_decision: 'Myndighetsbeslut', building_permit: 'Bygglov',
  technical_consultation: 'Tekniskt samråd', work_environment: 'Arbetsmiljö', other: 'Styrande dokument'
};
const EXCEPTION_LABELS: Record<string,string> = {
  not_applicable: 'Ej tillämplig (N/A)', cannot_verify: 'Kan inte verifieras', alternative_evidence: 'Ersatt av annat underlag'
};
const isException = (item: MappingItem) => Boolean(EXCEPTION_LABELS[item.handling_status]);

export function GoverningMappingView({ projectId }: Props) {
  const [data, setData] = useState<MappingResponse | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [filter, setFilter] = useState<'all'|'uncovered'|'mapped'|'exceptions'>('uncovered');
  const [busyItemId, setBusyItemId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { void load(); }, [projectId]);

  async function load() {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-mapping`, { cache: 'no-store' });
      const next = await response.json().catch(() => ({})) as MappingResponse;
      if (!response.ok) throw new Error(next.error || 'Kunde inte läsa kartläggningen.');
      setData(next);
      setSelectedDocumentId(current => next.documents.some(document => document.id === current) ? current : next.documents[0]?.id || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte läsa kartläggningen.');
    }
  }

  const visibleItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter(item => {
      if (selectedDocumentId && item.governing_document_id !== selectedDocumentId) return false;
      const mapped = Number(item.mapped_activity_count || 0) > 0;
      const exception = isException(item);
      if (filter === 'uncovered') return !mapped && !exception;
      if (filter === 'mapped') return mapped;
      if (filter === 'exceptions') return exception;
      return true;
    });
  }, [data, selectedDocumentId, filter]);

  async function acceptSuggestion(item: MappingItem, suggestion: Suggestion) {
    setBusyItemId(item.id); setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/activity-links`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityIds: [suggestion.activity_id] })
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Kunde inte skapa kopplingen.');
      setMessage(`Kopplade ${item.code || 'posten'} till ${suggestion.title}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte skapa kopplingen.');
    } finally { setBusyItemId(''); }
  }

  if (!data) return <div className="mappingEmpty"><span>🧭</span><h2>Kartläggning</h2><p>{message || 'Läser projektets täckning…'}</p></div>;
  const selectedDocument = data.documents.find(document => document.id === selectedDocumentId);

  return <div className="mappingView">
    <header className="mappingHeader">
      <div><small>KARTLÄGGNING</small><h1>Projektets täckning</h1><p>En styrande post är täckt när den är kopplad till minst en aktivitet eller uttryckligen hanterad som undantag.</p></div>
      <div className="mappingTotal"><strong>{data.summary.coverage_percent}%</strong><span>{data.summary.covered_count} av {data.summary.item_count} poster omhändertagna</span></div>
    </header>

    <div className="mappingProgress"><div style={{ width: `${data.summary.coverage_percent}%` }} /></div>

    <div className="mappingDocumentCards">
      {data.documents.map(document => <button key={document.id} className={selectedDocumentId === document.id ? 'active' : ''} onClick={() => setSelectedDocumentId(document.id)}>
        <div><small>{DOCUMENT_LABELS[document.document_type] || 'Dokument'}</small><strong>{document.title}</strong></div>
        <span className={document.coverage_percent === 100 ? 'coverageOk' : 'coverageWarn'}>{document.coverage_percent}%</span>
        <small>{document.mapped_count} kopplade · {document.exception_count} undantag · {document.uncovered_count} saknas</small>
      </button>)}
    </div>

    <div className="mappingToolbar">
      <div><strong>{selectedDocument?.title || 'Styrande poster'}</strong><small>{selectedDocument?.uncovered_count || 0} poster är ännu inte omhändertagna</small></div>
      <div className="mappingFilters">
        <button className={filter === 'uncovered' ? 'active' : ''} onClick={() => setFilter('uncovered')}>⚠ Saknar koppling</button>
        <button className={filter === 'mapped' ? 'active' : ''} onClick={() => setFilter('mapped')}>✓ Kopplade</button>
        <button className={filter === 'exceptions' ? 'active' : ''} onClick={() => setFilter('exceptions')}>— Undantag</button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Alla</button>
      </div>
    </div>

    <div className="mappingItems">
      {visibleItems.map(item => {
        const mapped = Number(item.mapped_activity_count || 0) > 0;
        const exception = isException(item);
        const suggestions = data.suggestions[item.id] || [];
        const stateClass = mapped ? 'mapped' : exception ? 'exception' : 'unmapped';
        return <article className={`mappingItem ${stateClass}`} key={item.id}>
          <div className="mappingState" title={mapped ? 'Kopplad till aktivitet' : exception ? 'Hanterad som undantag' : 'Saknar aktivitet'}>{mapped ? '✓' : exception ? '—' : '!'}</div>
          <div className="mappingItemBody">
            <div className="mappingItemTitle"><small>{[item.section_code,item.section_title].filter(Boolean).join(' · ')}</small><h3>{item.code ? `${item.code} ` : ''}{item.description}</h3></div>
            {mapped ? <div className="mappedActivities"><b>Kopplad till</b><span>{String(item.mapped_activity_titles || '').split(' || ').filter(Boolean).join(', ')}</span></div>
              : exception ? <div className="mappedActivities"><b>Undantag</b><span>{EXCEPTION_LABELS[item.handling_status]}</span></div>
              : suggestions.length ? <div className="mappingSuggestions"><b>Föreslagna matchningar</b>{suggestions.map(suggestion => <div className="mappingSuggestion" key={suggestion.activity_id}>
                  <div><strong>{suggestion.title}</strong><small>{suggestion.area_name} › {suggestion.section_name} › {suggestion.task_title}</small></div>
                  <span>{suggestion.confidence}%</span><button disabled={busyItemId === item.id} onClick={() => void acceptSuggestion(item,suggestion)}>Koppla</button>
                </div>)}</div>
              : <div className="mappingNoSuggestion"><b>Ingen tydlig matchning hittad</b><span>Posten behöver kopplas manuellt eller få en ny aktivitet i projektstrukturen.</span></div>}
          </div>
        </article>;
      })}
      {!visibleItems.length && <div className="mappingEmptyList">{filter === 'uncovered' ? '✓ Alla poster i dokumentet är omhändertagna.' : 'Inga poster att visa.'}</div>}
    </div>
    {message && <div className="mappingMessage">{message}</div>}
  </div>;
}
