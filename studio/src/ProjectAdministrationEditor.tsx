import { useEffect,useState } from 'react';

type Item={id:string;code:string;title:string;completed:number;value_text:string;note:string;sort_order:number;data?:Record<string,string>};

type FieldDef={key:string;label:string;placeholder?:string;type?:'text'|'date'};
const FIELDS:Record<string,FieldDef[]>={
  startbesked:[
    {key:'date',label:'Datum för startbesked',type:'date'},
    {key:'reference',label:'Diarienummer / referens',placeholder:'Ex. BYGG.2026.123'}
  ],
  arbetsmiljoplan:[
    {key:'date',label:'Upprättad datum',type:'date'},
    {key:'responsible',label:'Ansvarig / upprättad av',placeholder:'Namn eller organisation'},
    {key:'posted_date',label:'Anslagen / tillgänglig på arbetsplatsen från',type:'date'}
  ],
  bas_p:[
    {key:'name',label:'BAS-P',placeholder:'Namn'},
    {key:'organization',label:'Organisation / företag',placeholder:'Valfritt'},
    {key:'competence',label:'Kompetens / erfarenhet',placeholder:'Kort underlag för teoretiska och praktiska kunskaper'}
  ],
  bas_u:[
    {key:'name',label:'BAS-U',placeholder:'Namn'},
    {key:'organization',label:'Organisation / företag',placeholder:'Valfritt'},
    {key:'competence',label:'Kompetens / erfarenhet',placeholder:'Kort underlag för teoretiska och praktiska kunskaper'}
  ]
};

export function ProjectAdministrationEditor({projectId}:{projectId:string}){
  const[items,setItems]=useState<Item[]>([]);const[loading,setLoading]=useState(true);const[message,setMessage]=useState('');const[editingId,setEditingId]=useState('');const[title,setTitle]=useState('');const[valueText,setValueText]=useState('');const[note,setNote]=useState('');const[busy,setBusy]=useState(false);
  useEffect(()=>{void load()},[projectId]);
  async function load(){setLoading(true);setMessage('');try{const r=await fetch(`/api/studio/project-administration?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {items?:Item[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa administrativa kontrollpunkter.');setItems(d.items||[])}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa administrativa kontrollpunkter.')}finally{setLoading(false)}}
  async function update(item:Item,patch:Partial<{title:string;completed:boolean;valueText:string;note:string;data:Record<string,string>}>){setBusy(true);try{const r=await fetch(`/api/studio/project-administration/${encodeURIComponent(item.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:patch.title??item.title,completed:patch.completed??Boolean(item.completed),valueText:patch.valueText??item.value_text,note:patch.note??item.note,data:patch.data??item.data??{}})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte spara punkten.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte spara punkten.')}finally{setBusy(false)}}
  function newItem(){setEditingId('new');setTitle('');setValueText('');setNote('')}
  function cancel(){setEditingId('');setTitle('');setValueText('');setNote('')}
  async function saveNew(){if(!title.trim())return;setBusy(true);try{const r=await fetch('/api/studio/project-administration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,title:title.trim(),valueText,note,completed:false})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte skapa punkten.');cancel();await load()}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte skapa punkten.')}finally{setBusy(false)}}
  async function remove(item:Item){if(!confirm(`Ta bort ”${item.title}”?`))return;const r=await fetch(`/api/studio/project-administration/${encodeURIComponent(item.id)}`,{method:'DELETE'});if(r.ok)await load()}
  const done=items.filter(item=>Boolean(item.completed)).length;
  return <section className="projectAdministration"><div className="projectAdministrationHeader"><div><small>ADMINISTRATION</small><h2>Administrativa kontrollpunkter</h2><p>Projektuppgifter som ska kunna verifieras och återanvändas i exempelvis kontrollplan och slutdokumentation.</p></div><button className="primary" onClick={newItem}>＋ Ny punkt</button></div><div className="projectAdministrationProgress"><b>{done}/{items.length}</b><span>klara</span></div>{message&&<div className="projectSupportMessage">{message}</div>}{loading&&<div className="projectSupportEmpty">Laddar administrativa punkter…</div>}{!loading&&editingId==='new'&&<div className="projectSupportForm"><label><span>Rubrik</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Försäkringsbevis inskickat"/></label><label><span>Uppgift / värde</span><input value={valueText} onChange={e=>setValueText(e.target.value)} placeholder="Namn, datum eller referens"/></label><label><span>Kommentar</span><textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Valfri kommentar…"/></label><div><button onClick={cancel}>Avbryt</button><button className="primary" disabled={busy||!title.trim()} onClick={()=>void saveNew()}>{busy?'Sparar…':'Spara'}</button></div></div>}{!loading&&editingId!=='new'&&<div className="projectAdministrationList">{items.map(item=>{
    const fields=FIELDS[item.code]||[];
    return <article className={item.completed?'done':''} key={item.id}><label className="adminCheck"><input type="checkbox" checked={Boolean(item.completed)} disabled={busy} onChange={e=>void update(item,{completed:e.target.checked})}/><span><b>{item.title}</b><small>{item.completed?'Verifierad':'Ej verifierad'}</small></span></label>
      {fields.length>0 ? <div className="adminStructuredFields">{fields.map(field=><label key={field.key}><span>{field.label}</span><input type={field.type||'text'} defaultValue={item.data?.[field.key]||''} placeholder={field.placeholder} onBlur={e=>{const next={...(item.data||{}),[field.key]:e.target.value};if(e.target.value!==(item.data?.[field.key]||''))void update(item,{data:next})}}/></label>)}</div> : <label><span>Uppgift / värde</span><input defaultValue={item.value_text||''} placeholder="Namn, datum eller referens" onBlur={e=>{if(e.target.value!==item.value_text)void update(item,{valueText:e.target.value})}}/></label>}
      <label><span>Kommentar</span><textarea rows={2} defaultValue={item.note||''} placeholder="Valfri kommentar…" onBlur={e=>{if(e.target.value!==item.note)void update(item,{note:e.target.value})}}/></label><button className="danger adminDelete" onClick={()=>void remove(item)}>Ta bort</button></article>
  })}</div>}</section>
}
