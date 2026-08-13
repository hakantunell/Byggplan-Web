import { useEffect, useMemo, useState } from 'react';

type MappingSummary = {
  item_count: number; mapped_count: number; exception_count: number; project_condition_count?:number; covered_count: number;
  uncovered_count: number; coverage_percent: number;
};
type MappingDocument = {
  id: string; document_type: string; title: string; issuer: string; reference: string;
  item_count: number; mapped_count: number; exception_count: number; project_condition_count?:number; covered_count: number;
  uncovered_count: number; coverage_percent: number;
};
type HandlingKind='work'|'control'|'administration'|'condition'|'operation'|'evidence'|'deadline';
type ContextException={status:string;reason:string};
type CreationMode='existing_task'|'new_task'|'new_section'|'new_area';
type CreationSuggestion={
  mode:CreationMode;
  title:string;activityType:string;confidence:number;
  areaId?:string;areaName:string;sectionId?:string;sectionName:string;taskId?:string;taskTitle:string;
};
type PlacementTask={id:string;title:string};
type PlacementSection={id:string;name:string;tasks:PlacementTask[]};
type PlacementArea={id:string;name:string;sections:PlacementSection[]};
type CreationForm={
  title:string;activityType:string;mode:CreationMode;
  areaId:string;areaName:string;sectionId:string;sectionName:string;taskId:string;taskTitle:string;
};
type MappingItem = {
  id: string; governing_document_id: string; code: string; description: string; section_code: string;
  section_title: string; item_type: string; responsible_role: string; handling_status: string;
  handling_kind?: HandlingKind; handling_kinds?:HandlingKind[]; evidence_type?:string|null; timing_label?:string;
  context_exception?:ContextException|null; interpretation_note?:string; project_condition?:boolean;
  source_note: string; mapped_activity_count: number; mapped_activity_titles?: string | null;
  creation_suggestion?:CreationSuggestion;
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
const isProjectConditionHandled=(item:MappingItem)=>Boolean(item.project_condition&&item.handling_status==='handled');
const isTotalContractorItem=(item:MappingItem)=>/totalentreprenör/i.test(item.description||'');

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

export function GoverningMappingView({ projectId }: Props) {
  const [data, setData] = useState<MappingResponse | null>(null);
  const [deliveryMode,setDeliveryMode]=useState<DeliveryMode>('undecided');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [filter, setFilter] = useState<'all'|'uncovered'|'mapped'|'exceptions'|'conditions'>('uncovered');
  const [busyItemId, setBusyItemId] = useState('');
  const [bulkBusy,setBulkBusy]=useState(false);
  const [message, setMessage] = useState('');
  const [editorItem,setEditorItem]=useState<MappingItem|null>(null);
  const [placementAreas,setPlacementAreas]=useState<PlacementArea[]>([]);
  const [creationForm,setCreationForm]=useState<CreationForm|null>(null);
  const [editorBusy,setEditorBusy]=useState(false);
  const [editorError,setEditorError]=useState('');

  useEffect(() => { void load(); }, [projectId]);

  async function load() {
    if (!projectId) return;
    try {
      const [response,contextResponse]=await Promise.all([
        fetchWithTransientRetry(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-mapping`, { cache: 'no-store' }),
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
      const condition=isProjectConditionHandled(item);
      if (filter === 'uncovered') return !mapped && !exception && !condition;
      if (filter === 'mapped') return mapped && !exception && !condition;
      if (filter === 'exceptions') return exception;
      if (filter === 'conditions') return condition;
      return true;
    });
  }, [data, selectedDocumentId, filter]);

  const reviewedPendingCount=useMemo(()=>{
    if(!data)return 0;
    return data.items.filter(item=>{
      if(Number(item.mapped_activity_count||0)>0||isException(item)||isProjectConditionHandled(item))return false;
      return Boolean(item.project_condition)||(data.suggestions[item.id]||[]).length>0;
    }).length;
  },[data]);

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

  async function openCreationEditor(item:MappingItem){
    const suggestion=item.creation_suggestion;if(!suggestion)return;
    setEditorItem(item);setEditorError('');setEditorBusy(true);
    setCreationForm({
      title:suggestion.title,activityType:suggestion.activityType,mode:suggestion.mode,
      areaId:suggestion.areaId||'',areaName:suggestion.areaName||'',sectionId:suggestion.sectionId||'',sectionName:suggestion.sectionName||'',taskId:suggestion.taskId||'',taskTitle:suggestion.taskTitle||''
    });
    try{
      const response=await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/project-activity-placement-options`,{cache:'no-store'});
      const result=await response.json().catch(()=>({})) as {error?:string;areas?:PlacementArea[]};
      if(!response.ok)throw new Error(result.error||'Kunde inte läsa projektstrukturen.');
      setPlacementAreas(result.areas||[]);
    }catch(error){setEditorError(error instanceof Error?error.message:'Kunde inte läsa projektstrukturen.');}
    finally{setEditorBusy(false)}
  }

  function closeCreationEditor(){if(editorBusy)return;setEditorItem(null);setCreationForm(null);setEditorError('');}

  async function createReviewedProjectActivity(){
    if(!editorItem||!creationForm)return;
    setEditorBusy(true);setEditorError('');
    try{
      const response=await fetch(`${API_BASE}/api/studio/projects/${encodeURIComponent(projectId)}/governing-items/${encodeURIComponent(editorItem.id)}/create-project-activity-reviewed`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(creationForm)
      });
      const result=await response.json().catch(()=>({})) as {error?:string;created?:{title?:string}};
      if(!response.ok)throw new Error(result.error||'Kunde inte skapa den projektspecifika aktiviteten.');
      setMessage(`Skapade och kopplade ${result.created?.title||creationForm.title}.`);
      setEditorItem(null);setCreationForm(null);setPlacementAreas([]);await load();
    }catch(error){setEditorError(error instanceof Error?error.message:'Kunde inte skapa den projektspecifika aktiviteten.');}
    finally{setEditorBusy(false)}
  }

  async function markNotApplicable(item:MappingItem,reason:string,label:string){
    setBusyItemId(item.id);setMessage('');
    try{const response=await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({handlingStatus:'not_applicable',handlingComment:reason})});const result=await response.json().catch(()=>({})) as {error?:string};if(!response.ok)throw new Error(result.error||'Kunde inte markera posten som ej tillämplig.');setMessage(`${item.code||'Posten'} markerades som ej tillämplig ${label}.`);await load()}catch(error){setMessage(error instanceof Error?error.message:'Kunde inte hantera undantaget.')}finally{setBusyItemId('')}
  }
  async function acceptSelfBuildException(item:MappingItem){return markNotApplicable(item,'Projektet genomförs i egen regi och någon totalentreprenör finns därför inte.','utifrån projektets genomförandeform')}
  async function acceptContextException(item:MappingItem){if(!item.context_exception)return;return markNotApplicable(item,item.context_exception.reason,'utifrån projektkontexten')}
  async function markProjectCondition(item:MappingItem){
    setBusyItemId(item.id);setMessage('');
    try{const response=await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({handlingStatus:'handled',handlingComment:'Hanteras som ett bestående projektvillkor och visas under Projektvillkor.'})});const result=await response.json().catch(()=>({})) as {error?:string};if(!response.ok)throw new Error(result.error||'Kunde inte hantera posten som projektvillkor.');setMessage(`${item.code||'Posten'} hanteras nu som projektvillkor.`);await load()}catch(error){setMessage(error instanceof Error?error.message:'Kunde inte hantera projektvillkoret.')}finally{setBusyItemId('')}
  }

  async function applyReviewedMapping(){
    if(!data||bulkBusy)return;
    const pending=data.items.filter(item=>Number(item.mapped_activity_count||0)===0&&!isException(item)&&!isProjectConditionHandled(item)&&Boolean(item.project_condition||(data.suggestions[item.id]||[]).length));
    if(!pending.length){setMessage('Det finns inga granskade förslag kvar att tillämpa.');return}
    setBulkBusy(true);setMessage(`Tillämpar granskad kartläggning för ${pending.length} poster…`);
    let linked=0,conditions=0;
    try{
      const jobs:(()=>Promise<void>)[]=[];
      for(const item of pending){
        if(item.project_condition){jobs.push(async()=>{const r=await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({handlingStatus:'handled',handlingComment:'Hanteras som ett bestående projektvillkor och visas under Projektvillkor.'})});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||`Kunde inte registrera ${item.code||'projektvillkor'}.`);conditions+=1});continue}
        for(const suggestion of data.suggestions[item.id]||[]){jobs.push(async()=>{const r=await fetch(`${API_BASE}/api/studio/governing-items/${encodeURIComponent(item.id)}/mappings/${encodeURIComponent(suggestion.activity_id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({mappingSource:'suggested',confidence:suggestion.confidence,comment:'Accepterad efter gemensam granskning av mapping-v17'})});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||`Kunde inte koppla ${item.code||'posten'}.`);linked+=1})}
      }
      for(let i=0;i<jobs.length;i+=8)await Promise.all(jobs.slice(i,i+8).map(job=>job()));
      await load();setMessage(`Klart: ${linked} aktivitetskopplingar skapades och ${conditions} projektvillkor registrerades.`);
    }catch(error){await load();setMessage(error instanceof Error?`Delvis genomfört: ${error.message}`:'Kartläggningen kunde inte tillämpas fullt ut.')}finally{setBulkBusy(false)}
  }

  function renderSuggestions(item: MappingItem, suggestions: Suggestion[], additional = false) {
    if (!suggestions.length) return null;
    return <div className="mappingSuggestions"><b>{additional ? 'Ytterligare möjliga kopplingar' : 'Föreslagna matchningar'}</b>{suggestions.map(suggestion => <div className="mappingSuggestion" key={suggestion.activity_id}>
      <div><strong>{suggestion.title}</strong><small>{suggestion.area_name} › {suggestion.section_name} › {suggestion.task_title}</small>{suggestion.condition_text&&<small>Villkor: {suggestion.condition_text}</small>}</div>
      <span>{suggestion.confidence}%</span><button disabled={busyItemId === item.id||bulkBusy} onClick={() => void acceptSuggestion(item,suggestion)}>{additional ? 'Lägg till' : 'Koppla'}</button>
    </div>)}</div>;
  }

  function renderCreationSuggestion(item:MappingItem){
    const suggestion=item.creation_suggestion;
    if(!suggestion)return <div className="mappingNoSuggestion"><b>Ingen tydlig matchning hittad</b><span>Posten behöver kopplas manuellt eller få en ny aktivitet i projektstrukturen.</span></div>;
    const modeLabel=suggestion.mode==='existing_task'?'I befintligt moment':suggestion.mode==='new_task'?'Nytt moment i befintligt arbetsavsnitt':suggestion.mode==='new_section'?'Nytt arbetsavsnitt i befintligt arbetsområde':'Nytt projektspecifikt arbetsområde';
    return <div className="mappingNoSuggestion">
      <b>Föreslagen projektspecifik aktivitet</b>
      <strong>{suggestion.title}</strong>
      <span>{modeLabel}</span>
      <span>{suggestion.areaName} › {suggestion.sectionName} › {suggestion.taskTitle}</span>
      <small>Placeringens säkerhet: {suggestion.confidence}% · Aktiviteten skapas bara i det här projektet och kopplas direkt till styrposten.</small>
      <button disabled={busyItemId===item.id||bulkBusy} onClick={()=>void openCreationEditor(item)}>Granska och skapa aktivitet</button>
    </div>;
  }

  function renderCreationEditor(){
    if(!editorItem||!creationForm)return null;
    const area=placementAreas.find(a=>a.id===creationForm.areaId);
    const sections=area?.sections||[];
    const section=sections.find(s=>s.id===creationForm.sectionId);
    const tasks=section?.tasks||[];
    const setForm=(patch:Partial<CreationForm>)=>setCreationForm(current=>current?{...current,...patch}:current);
    const inputStyle={width:'100%',boxSizing:'border-box' as const,padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff'};
    const labelStyle={display:'grid',gap:5,fontSize:13,fontWeight:600};
    return <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.48)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onMouseDown={event=>{if(event.currentTarget===event.target)closeCreationEditor()}}>
      <div style={{width:'min(680px,100%)',maxHeight:'90vh',overflow:'auto',background:'#fff',borderRadius:14,boxShadow:'0 20px 60px rgba(0,0,0,.25)',padding:22}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:18}}>
          <div><small>PROJEKTSPECIFIK AKTIVITET</small><h2 style={{margin:'4px 0'}}>Granska före skapande</h2><p style={{margin:0,color:'#475569'}}>Styrpost {editorItem.code||''}: {editorItem.description}</p></div>
          <button onClick={closeCreationEditor} disabled={editorBusy} aria-label="Stäng">✕</button>
        </div>
        <div style={{display:'grid',gap:14}}>
          <label style={labelStyle}>Titel<input style={inputStyle} value={creationForm.title} onChange={e=>setForm({title:e.target.value})}/></label>
          <label style={labelStyle}>Typ<select style={inputStyle} value={creationForm.activityType} onChange={e=>setForm({activityType:e.target.value})}><option value="check">KONTROLLERA</option><option value="perform">UTFÖR</option><option value="measurement">MÄT</option><option value="document">DOKUMENTERA</option></select></label>
          <label style={labelStyle}>Placering<select style={inputStyle} value={creationForm.mode} onChange={e=>{const mode=e.target.value as CreationMode;setForm({mode,taskId:mode==='existing_task'?creationForm.taskId:'',sectionId:mode==='new_area'?'':creationForm.sectionId,areaId:mode==='new_area'?'':creationForm.areaId})}}><option value="existing_task">Befintligt moment</option><option value="new_task">Nytt moment i befintligt arbetsavsnitt</option><option value="new_section">Nytt arbetsavsnitt i befintligt arbetsområde</option><option value="new_area">Nytt arbetsområde</option></select></label>
          {creationForm.mode!=='new_area'&&<label style={labelStyle}>Arbetsområde<select style={inputStyle} value={creationForm.areaId} onChange={e=>setForm({areaId:e.target.value,sectionId:'',taskId:''})}><option value="">Välj arbetsområde…</option>{placementAreas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          {(creationForm.mode==='existing_task'||creationForm.mode==='new_task')&&<label style={labelStyle}>Arbetsavsnitt<select style={inputStyle} value={creationForm.sectionId} onChange={e=>setForm({sectionId:e.target.value,taskId:''})}><option value="">Välj arbetsavsnitt…</option>{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
          {creationForm.mode==='existing_task'&&<label style={labelStyle}>Moment<select style={inputStyle} value={creationForm.taskId} onChange={e=>setForm({taskId:e.target.value})}><option value="">Välj moment…</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
          {creationForm.mode==='new_task'&&<label style={labelStyle}>Nytt moment<input style={inputStyle} value={creationForm.taskTitle} onChange={e=>setForm({taskTitle:e.target.value})}/></label>}
          {creationForm.mode==='new_section'&&<><label style={labelStyle}>Nytt arbetsavsnitt<input style={inputStyle} value={creationForm.sectionName} onChange={e=>setForm({sectionName:e.target.value})}/></label><label style={labelStyle}>Nytt moment<input style={inputStyle} value={creationForm.taskTitle} onChange={e=>setForm({taskTitle:e.target.value})}/></label></>}
          {creationForm.mode==='new_area'&&<><label style={labelStyle}>Nytt arbetsområde<input style={inputStyle} value={creationForm.areaName} onChange={e=>setForm({areaName:e.target.value})}/></label><label style={labelStyle}>Nytt arbetsavsnitt<input style={inputStyle} value={creationForm.sectionName} onChange={e=>setForm({sectionName:e.target.value})}/></label><label style={labelStyle}>Nytt moment<input style={inputStyle} value={creationForm.taskTitle} onChange={e=>setForm({taskTitle:e.target.value})}/></label></>}
          {editorItem.creation_suggestion&&<small style={{color:'#64748b'}}>Ursprungligt placeringsförslag: {editorItem.creation_suggestion.areaName} › {editorItem.creation_suggestion.sectionName} › {editorItem.creation_suggestion.taskTitle} ({editorItem.creation_suggestion.confidence}%). Master ändras inte.</small>}
          {editorError&&<div style={{padding:10,borderRadius:8,background:'#fef2f2',color:'#991b1b'}}>{editorError}</div>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}><button disabled={editorBusy} onClick={closeCreationEditor}>Avbryt</button><button disabled={editorBusy||!creationForm.title.trim()} onClick={()=>void createReviewedProjectActivity()}>{editorBusy?'Skapar…':'Skapa och koppla'}</button></div>
        </div>
      </div>
    </div>;
  }

  if (!data) return <div className="mappingEmpty"><span>🧭</span><h2>Kartläggning</h2><p>{message || 'Läser projektets täckning…'}</p></div>;
  const selectedDocument = data.documents.find(document => document.id === selectedDocumentId);

  return <div className="mappingView">
    <header className="mappingHeader">
      <div><small>KARTLÄGGNING{data.runtime ? ` · ${data.runtime}` : ''}</small><h1>Projektets täckning</h1><p>En styrande post är täckt när den är kopplad till minst en aktivitet, uttryckligen hanterad som undantag eller registrerad som ett rent projektvillkor.</p><div className="mappingProjectContext"><span>Projektkontext</span><strong>{DELIVERY_LABELS[deliveryMode]}</strong><small>Ändras i projektets konfiguration, inte i kartläggningen.</small></div></div>
      <div className="mappingTotal"><strong>{data.summary.coverage_percent}%</strong><span>{data.summary.covered_count} av {data.summary.item_count} poster omhändertagna</span>{reviewedPendingCount>0&&<button disabled={bulkBusy} onClick={()=>void applyReviewedMapping()}>{bulkBusy?'Tillämpar…':`Tillämpa granskad kartläggning (${reviewedPendingCount})`}</button>}</div>
    </header>

    <div className="mappingProgress"><div style={{ width: `${data.summary.coverage_percent}%` }} /></div>

    <div className="mappingDocumentCards">
      {data.documents.map(document => <button key={document.id} className={selectedDocumentId === document.id ? 'active' : ''} onClick={() => setSelectedDocumentId(document.id)}>
        <div><small>{DOCUMENT_LABELS[document.document_type] || 'Dokument'}</small><strong>{document.title}</strong></div>
        <span className={document.coverage_percent === 100 ? 'coverageOk' : 'coverageWarn'}>{document.coverage_percent}%</span>
        <small>{document.mapped_count} kopplade · {document.project_condition_count||0} villkor · {document.exception_count} undantag · {document.uncovered_count} saknas</small>
      </button>)}
    </div>

    <div className="mappingToolbar">
      <div><strong>{selectedDocument?.title || 'Styrande poster'}</strong><small>{selectedDocument?.uncovered_count || 0} poster är ännu inte omhändertagna</small></div>
      <div className="mappingFilters">
        <button className={filter === 'uncovered' ? 'active' : ''} onClick={() => setFilter('uncovered')}>⚠ Saknar koppling</button>
        <button className={filter === 'mapped' ? 'active' : ''} onClick={() => setFilter('mapped')}>✓ Kopplade</button>
        <button className={filter === 'conditions' ? 'active' : ''} onClick={() => setFilter('conditions')}>◆ Projektvillkor</button>
        <button className={filter === 'exceptions' ? 'active' : ''} onClick={() => setFilter('exceptions')}>— Undantag</button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Alla</button>
      </div>
    </div>

    <div className="mappingItems">
      {visibleItems.map(item => {
        const mapped = Number(item.mapped_activity_count || 0) > 0;
        const exception = isException(item);
        const handledCondition=isProjectConditionHandled(item);
        const suggestions = data.suggestions[item.id] || [];
        const selfBuildException=deliveryMode==='self_build'&&isTotalContractorItem(item)&&!mapped&&!exception&&!handledCondition;
        const contextException=Boolean(item.context_exception)&&!mapped&&!exception&&!handledCondition;
        const stateClass = handledCondition ? 'mapped' : exception ? 'exception' : mapped ? 'mapped' : 'unmapped';
        const kinds=(item.handling_kinds?.length?item.handling_kinds:[item.handling_kind||'work']).filter((v,i,a)=>a.indexOf(v)===i);
        const primary=item.handling_kind||'work';
        const stateTitle=handledCondition?'Hanteras som projektvillkor':exception?'Hanterad som undantag':mapped?'Kopplad till aktivitet':'Saknar aktivitet';
        return <article className={`mappingItem ${stateClass}`} key={item.id}>
          <div className="mappingState" title={stateTitle}>{handledCondition?'◆':exception?'—':mapped?'✓':'!'}</div>
          <div className="mappingItemBody">
            <div className="mappingItemTitle"><small>{[item.section_code,item.section_title].filter(Boolean).join(' · ')}</small><div className="mappingHandlingKind">{kinds.map(kind=><span key={kind} style={{marginRight:10}}>{HANDLING_ICONS[kind]} {HANDLING_LABELS[kind]}</span>)}</div><h3>{item.code ? `${item.code} ` : ''}{item.description}</h3>{item.timing_label&&<small><b>⏱ {item.timing_label}</b></small>}{item.interpretation_note&&<small>{item.interpretation_note}</small>}</div>
            {handledCondition ? <div className="mappedActivities"><b>Projektvillkor</b><span>Registrerat som ett bestående villkor för projektet. Ingen separat aktivitet krävs enbart för att bära villkoret.</span></div>
              : exception ? <div className="mappedActivities"><b>Undantag</b><span>{EXCEPTION_LABELS[item.handling_status]}</span></div>
              : mapped ? <><div className="mappedActivities"><b>Kopplad till</b><span>{String(item.mapped_activity_titles || '').split(' || ').filter(Boolean).join(', ')}</span></div>{renderSuggestions(item,suggestions,true)}</>
              : item.project_condition ? <div className="mappingNoSuggestion"><b>Rent projektvillkor</b><span>Villkoret ska finnas kvar som styrande information för projektet men behöver inget eget arbetskort.</span><button disabled={busyItemId===item.id||bulkBusy} onClick={()=>void markProjectCondition(item)}>Hantera som projektvillkor</button></div>
              : selfBuildException ? <div className="mappingNoSuggestion"><b>Föreslaget undantag utifrån projektkontext</b><span>Projektet är satt till Egen regi. Punkten avser uttryckligen en totalentreprenör och är därför normalt inte tillämplig.</span><button disabled={busyItemId===item.id||bulkBusy} onClick={()=>void acceptSelfBuildException(item)}>Markera ej tillämplig</button></div>
              : contextException ? <div className="mappingNoSuggestion"><b>Föreslaget undantag utifrån projektkontext</b><span>{item.context_exception?.reason}</span><button disabled={busyItemId===item.id||bulkBusy} onClick={()=>void acceptContextException(item)}>Markera ej tillämplig</button></div>
              : suggestions.length ? renderSuggestions(item,suggestions,false)
              : primary==='operation' ? <div className="mappingNoSuggestion"><b>Ingen tydlig matchning hittad</b><span>Posten är ett drift-/förvaltningskrav och behöver hanteras i projektets förvaltningsdel.</span></div>
              : primary==='condition' ? <div className="mappingNoSuggestion"><b>Ingen tydlig matchning hittad</b><span>Posten innehåller ett villkor som också kan behöva kopplas till relevant kontroll eller aktivitet.</span></div>
              : renderCreationSuggestion(item)}
          </div>
        </article>;
      })}
      {!visibleItems.length && <div className="mappingEmptyList">{filter === 'uncovered' ? '✓ Alla poster i dokumentet är omhändertagna.' : 'Inga poster att visa.'}</div>}
    </div>
    {message && <div className="mappingMessage">{message}</div>}
    {renderCreationEditor()}
  </div>;
}
