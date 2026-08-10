import { useEffect, useState } from 'react';

type ClassificationCategory = 'documentation' | 'control_plan' | 'requirement';
type ExecutorType = 'self' | 'third_party';

export type ActivityClassification = {
  id?: string;
  activity_id?: string;
  category: ClassificationCategory;
  code: string;
  label: string;
  source?: string;
};

type ExecutionContext={context:'field'|'administrative';executor_type?:ExecutorType;executor_label?:string|null};

const CATEGORY_OPTIONS: { value: ClassificationCategory; label: string; icon: string }[] = [
  { value: 'documentation', label: 'Dokumentationsändamål', icon: '📄' },
  { value: 'control_plan', label: 'Kontrollplan', icon: '☑' },
  { value: 'requirement', label: 'Relaterat krav', icon: '§' }
];

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.byggplan.tunell.org').replace(/\/$/, '');

export function ClassificationEditor({ activityId }: { activityId: string }) {
  const [items, setItems] = useState<ActivityClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<ClassificationCategory>('documentation');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [executorType,setExecutorType]=useState<ExecutorType>('self');
  const [executorLabel,setExecutorLabel]=useState('');
  const [context,setContext]=useState<'field'|'administrative'>('field');
  const [executorSaving,setExecutorSaving]=useState(false);

  useEffect(() => { void load(); }, [activityId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [classificationResponse,executionResponse]=await Promise.all([
        fetch(`${API_BASE}/api/studio/activities/${activityId}/classifications`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/studio/activities/${activityId}/execution-context`, { cache:'no-store' })
      ]);
      const data = await classificationResponse.json().catch(() => ({})) as { classifications?: ActivityClassification[]; error?: string };
      if (!classificationResponse.ok) throw new Error(data.error || 'Kunde inte läsa klassificeringarna.');
      setItems(data.classifications || []);
      if(executionResponse.ok){
        const execution=await executionResponse.json() as {item?:ExecutionContext};
        const item=execution.item;
        setContext(item?.context||'field');
        setExecutorType(item?.executor_type==='third_party'?'third_party':'self');
        setExecutorLabel(item?.executor_label||'');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kunde inte läsa klassificeringarna.');
    } finally {
      setLoading(false);
    }
  }

  function add() {
    const cleanCode = code.trim();
    const cleanLabel = label.trim();
    if (!cleanCode || !cleanLabel) return;
    if (items.some(item => item.category === category && item.code.toLocaleLowerCase('sv') === cleanCode.toLocaleLowerCase('sv'))) {
      setError('Den klassificeringen finns redan på aktiviteten.');
      return;
    }
    setItems(current => [...current, { category, code: cleanCode, label: cleanLabel, source: 'project' }]);
    setCode('');
    setLabel('');
    setError('');
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/studio/activities/${activityId}/classifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classifications: items.map(({ category, code, label }) => ({ category, code, label, source: 'project' })) })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara klassificeringarna.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kunde inte spara klassificeringarna.');
    } finally {
      setSaving(false);
    }
  }

  async function saveExecutor(){
    setExecutorSaving(true);setError('');
    try{
      const response=await fetch(`${API_BASE}/api/studio/activities/${activityId}/execution-context`,{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({context,executorType,executorLabel:executorType==='third_party'?(executorLabel.trim()||null):null})
      });
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte spara utföraren.');
      await load();
    }catch(reason){setError(reason instanceof Error?reason.message:'Kunde inte spara utföraren.')}finally{setExecutorSaving(false)}
  }

  return <div className="classificationEditor">
    <section className="classificationGroup">
      <div className="classificationHeading">
        <div><small>UTFÖRARE</small><strong>Vem ska utföra aktiviteten?</strong></div>
        <button type="button" onClick={()=>void saveExecutor()} disabled={executorSaving||loading}>{executorSaving?'Sparar…':'Spara utförare'}</button>
      </div>
      <div className="classificationAdd">
        <select value={executorType} onChange={event=>setExecutorType(event.target.value as ExecutorType)}>
          <option value="self">👤 Jag / egen regi</option>
          <option value="third_party">👥 Tredje part</option>
        </select>
        {executorType==='third_party'&&<input value={executorLabel} onChange={event=>setExecutorLabel(event.target.value)} placeholder="Vem? t.ex. Kommun eller KA"/>}
      </div>
      <p className="classificationHelp">Telefonappen visar 👤 för egen regi och 👥 tillsammans med namnet för tredje part.</p>
    </section>

    <div className="classificationHeading">
      <div><small>KLASSIFICERING</small><strong>Projektets användning av aktiviteten</strong></div>
      <button type="button" onClick={() => void save()} disabled={saving || loading}>{saving ? 'Sparar…' : 'Spara klassificering'}</button>
    </div>

    {loading ? <p className="muted">Hämtar klassificeringar…</p> : <>
      {CATEGORY_OPTIONS.map(group => {
        const groupItems = items.filter(item => item.category === group.value);
        return <section className="classificationGroup" key={group.value}>
          <h3><span>{group.icon}</span>{group.label}</h3>
          {groupItems.length === 0 ? <p>Ingen klassificering angiven.</p> : <div className="classificationItems">
            {groupItems.map((item, index) => <div className="classificationItem" key={`${item.category}:${item.code}:${index}`}>
              <div><strong>{item.label}</strong><small>{item.code}{item.source === 'module' ? ' · från komponent' : ' · projektspecifik'}</small></div>
              <button type="button" title="Ta bort klassificering" onClick={() => setItems(current => current.filter(candidate => candidate !== item))}>×</button>
            </div>)}
          </div>}
        </section>;
      })}

      <div className="classificationAdd">
        <select value={category} onChange={event => setCategory(event.target.value as ClassificationCategory)}>
          {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input value={code} onChange={event => setCode(event.target.value)} placeholder="Kod, t.ex. KP-03" />
        <input value={label} onChange={event => setLabel(event.target.value)} placeholder="Benämning" />
        <button type="button" onClick={add} disabled={!code.trim() || !label.trim()}>＋ Lägg till</button>
      </div>
    </>}
    {error && <div className="classificationError">{error}</div>}
    <p className="classificationHelp">Ändringarna gäller bara projektkopian. Komponenten i biblioteket påverkas inte.</p>
  </div>;
}
