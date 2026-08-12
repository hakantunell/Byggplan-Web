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
type HandlingKind='work'|'control'|'administration'|'condition'|'operation'|'evidence'|'deadline';
type ContextException={status:string;reason:string};
type MappingItem = {
  id: string; governing_document_id: string; code: string; description: string; section_code: string;
  section_title: string; item_type: string; responsible_role: string; handling_status: string;
  handling_kind?: HandlingKind; handling_kinds?:HandlingKind[]; evidence_type?:string|null; timing_label?:string;
  context_exception?:ContextException|null; interpretation_note?:string;
  source_note: string; mapped_activity_count: number; mapped_activity_titles?: string | null;
};
type MappingActivity = {
  id: string; title: string; description: string; activity_type: string; task_title: string;
  section_name: string; area_name: string; governing_item_count: number;
};
type Suggestion = {
  activity_id: string; title: string; task_title: string; section_name: string; area_name: string; confidence: number;
  lifecycle_stage?:string; surface?:string; applicability?:string; condition_text?:string;
};
type MappingResponse = {
  runtime?: string;
  summary: MappingSummary; documents: MappingDocument[]; items: MappingItem[]; activities: MappingActivity[];
  suggestions: Record<string,Suggestion[]>; error?: string;
};
type DeliveryMode='self_build'|'general_contractor'|'split_contract'|'undecided';
type Props = { projectId: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');
const DOCUMENT_LABELS: Record<string,string> = {
  control_plan: 'Kontrollplan', authority_decision: 'Myndighetsbeslut', building_permit: 'Bygglov',
  technical_consultation: 'Tekniskt samråd', work_environment: 'Arbetsmiljö', other: 'Styrande dokument'
};
const EXCEPTION_LABELS: Record<string,string> = {
  not_applicable: 'Ej tillämplig (N/A)', cannot_verify: 'Kan inte verifieras', alternative_evidence: 'Ersatt av annat underlag'
};
const DELIVERY_LABELS:Record<DeliveryMode,string>={self_build:'Egen regi',general_contractor:'General-/totalentreprenad',split_contract:'Delad entreprenad',undecided:'Inte bestämt'};
const HANDLING_LABELS:Record<HandlingKind,string>={work:'Arbete / åtgärd',control:'Kontroll',administration:'Administration / dokumentation',condition:'Projektvillkor',operation:'Drift / förvaltning',evidence:'Bevis i fält',deadline:'Tidsfrist / milstolpe'};
const HANDLING_ICONS:Record<HandlingKind,string>={work:'🔨',control:'✓',administration:'🗂',condition:'◆',operation:'↻',evidence:'📷',deadline:'⏱'};
const isException = (item: MappingItem) => Boolean(EXCEPTION_LABELS[item.handling_status]);
const isTotalContractorItem=(item:MappingItem)=>/totalentreprenör/i.test(item.description||'');

export function GoverningMappingView({ projectId }: Props) {
  const [data, setData] = useState<MappingResponse | null>(null);
  const [deliveryMode,setDeliveryMode]=useState<DeliveryMode>('undecided');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [filter, setFilter] = useState<'all'|'uncovered'|'mapped'|'exceptions'>('uncovered');
  const [busyItemId, setBusyItemId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { void load(); }, [projectId]);

  async function load() {
    if (!projectId) return;
    try {
      const [response,contextResponse]=await Promise.all([
        fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-mapping`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/context`,{cache:'no-store'})
      ]);
      const next = await response.json().catch(() => ({})) as MappingResponse;
      if (!response.ok) throw new Error(next.error || 'Kunde inte läsa kartläggningen.');
      const contextData=await contextResponse.json().catch(()=>({})) as {context?:{deliveryMode?:DeliveryMode}};
      if(contextResponse.ok)setDeliveryMode(contextData.context?.deliveryMode||'undecided');
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
      if (filter === 'mapped') return mapped && !exception;
      if (filter === 'exceptions') return exception;
      return true;
    });
  }, [data, selectedDocumentId, filter]);

  async function acceptSuggestion(item: MappingItem, suggestion: Suggestion) {
    setBusyItemId(item.id); setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/mappings/${encodeURIComponent(suggestion.activity_id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingSource: 'suggested', confidence: suggestion.confidence, comment: 'Accepterad i kartläggningsvyn' })
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Kunde inte skapa kopplingen.');
      setMessage(`Kopplade ${item.code || 'posten'} till ${suggestion.title}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte skapa kopplingen.');
    } finally { setBusyItemId(''); }
  }

  async function markNotApplicable(item:MappingItem,reason:string,label:string){
    setBusyItemId(item.id);setMessage('');
    try{const response=await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({handlingStatus:'not_applicable',handlingComment:reason})});const result=await response.json().catch(()=>({})) as {error?:string};if(!response.ok)throw new Error(result.error||'Kunde inte markera posten som ej tillämplig.');setMessage(`${item.code||'Posten'} markerades som ej tillämplig ${label}.`);await load()}catch(error){setMessage(error instanceof Error?error.message:'Kunde inte hantera undantaget.')}finally{setBusyItemId('')}
  }
  async function acceptSelfBuildException(item:MappingItem){return markNotApplicable(item,'Projektet genomförs i egen regi och någon totalentreprenör finns därför inte.','utifrån projektets genomförandeform')}
  async function acceptContextException(item:MappingItem){if(!item.context_exception)return;return markNotApplicable(item,item.context_exception.reason,'utifrån projektkontexten')}

  function renderSuggestions(item: MappingItem, suggestions: Suggestion[], additional = false) {
    if (!suggestions.length) return null;
    return <div className="mappingSuggestions"><b>{additional ? 'Ytterligare möjliga kopplingar' : 'Föreslagna matchningar'}</b>{suggestions.map(suggestion => <div className="mappingSuggestion" key={suggestion.activity_id}>
      <div><strong>{suggestion.title}</strong><small>{suggestion.area_name} › {suggestion.section_name} › {suggestion.task_title}</small>{suggestion.condition_text&&<small>Villkor: {suggestion.condition_text}</small>}</div>
      <span>{suggestion.confidence}%</span><button disabled={busyItemId === item.id} onClick={() => void acceptSuggestion(item,suggestion)}>{additional ? 'Lägg till' : 'Koppla'}</button>
    </div>)}</div>;
  }

  if (!data) return <div className="mappingEmpty"><span>🧭</span><h2>Kartläggning</h2><p>{message || 'Läser projektets täckning…'}</p></div>;
  const selectedDocument = data.documents.find(document => document.id === selectedDocumentId);

  return <div className="mappingView">
    <header className="mappingHeader">
      <div><small>KARTLÄGGNING{data.runtime ? ` · ${data.runtime}` : ''}</small><h1>Projektets täckning</h1><p>En styrande post är täckt när den är kopplad till minst en aktivitet eller uttryckligen hanterad som undantag.</p><div className="mappingProjectContext"><span>Projektkontext</span><strong>{DELIVERY_LABELS[deliveryMode]}</strong><small>Ändras i projektets konfiguration, inte i kartläggningen.</small></div></div>
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
        const selfBuildException=deliveryMode==='self_build'&&isTotalContractorItem(item)&&!mapped&&!exception;
        const contextException=Boolean(item.context_exception)&&!mapped&&!exception;
        const stateClass = exception ? 'exception' : mapped ? 'mapped' : 'unmapped';
        const kinds=(item.handling_kinds?.length?item.handling_kinds:[item.handling_kind||'work']).filter((v,i,a)=>a.indexOf(v)===i);
        const primary=item.handling_kind||'work';
        return <article className={`mappingItem ${stateClass}`} key={item.id}>
          <div className="mappingState" title={exception ? 'Hanterad som undantag' : mapped ? 'Kopplad till aktivitet' : 'Saknar aktivitet'}>{exception ? '—' : mapped ? '✓' : '!'}</div>
          <div className="mappingItemBody">
            <div className="mappingItemTitle"><small>{[item.section_code,item.section_title].filter(Boolean).join(' · ')}</small><div className="mappingHandlingKind">{kinds.map(kind=><span key={kind} style={{marginRight:10}}>{HANDLING_ICONS[kind]} {HANDLING_LABELS[kind]}</span>)}</div><h3>{item.code ? `${item.code} ` : ''}{item.description}</h3>{item.timing_label&&<small><b>⏱ {item.timing_label}</b></small>}{item.interpretation_note&&<small>{item.interpretation_note}</small>}</div>
            {exception ? <div className="mappedActivities"><b>Undantag</b><span>{EXCEPTION_LABELS[item.handling_status]}</span></div>
              : mapped ? <><div className="mappedActivities"><b>Kopplad till</b><span>{String(item.mapped_activity_titles || '').split(' || ').filter(Boolean).join(', ')}</span></div>{renderSuggestions(item,suggestions,true)}</>
              : selfBuildException ? <div className="mappingNoSuggestion"><b>Föreslaget undantag utifrån projektkontext</b><span>Projektet är satt till Egen regi. Punkten avser uttryckligen en totalentreprenör och är därför normalt inte tillämplig.</span><button disabled={busyItemId===item.id} onClick={()=>void acceptSelfBuildException(item)}>Markera ej tillämplig</button></div>
              : contextException ? <div className="mappingNoSuggestion"><b>Föreslaget undantag utifrån projektkontext</b><span>{item.context_exception?.reason}</span><button disabled={busyItemId===item.id} onClick={()=>void acceptContextException(item)}>Markera ej tillämplig</button></div>
              : suggestions.length ? renderSuggestions(item,suggestions,false)
              : <div className="mappingNoSuggestion"><b>Ingen tydlig matchning hittad</b><span>{primary==='operation'?'Posten är ett drift-/förvaltningskrav och behöver hanteras i projektets förvaltningsdel.':primary==='condition'?'Posten är ett projektvillkor och behöver kopplas till relevant kontroll/aktivitet eller hanteras som villkor.':'Posten behöver kopplas manuellt eller få en ny aktivitet i projektstrukturen.'}</span></div>}
          </div>
        </article>;
      })}
      {!visibleItems.length && <div className="mappingEmptyList">{filter === 'uncovered' ? '✓ Alla poster i dokumentet är omhändertagna.' : 'Inga poster att visa.'}</div>}
    </div>
    {message && <div className="mappingMessage">{message}</div>}
  </div>;
}