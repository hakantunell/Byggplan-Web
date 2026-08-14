import {useEffect,useMemo,useState} from 'react';

type MappingDocument={id:string;title:string;document_type?:string};
type MappingItem={
  id:string;governing_document_id:string;code?:string;description:string;section_title?:string;
  handling_status?:string;handling_kind?:string;mapped_activity_count?:number;project_condition?:boolean;
  mapping_needs_repair?:boolean;deprecated_mapping_count?:number;
};
type MappingResponse={documents?:MappingDocument[];items?:MappingItem[]};
type Filter='attention'|'all'|'handled';

export function GoverningActionsView({projectId,onOpenMapping}:{projectId:string;onOpenMapping:()=>void}){
  const[documents,setDocuments]=useState<MappingDocument[]>([]);
  const[items,setItems]=useState<MappingItem[]>([]);
  const[filter,setFilter]=useState<Filter>('attention');
  const[loading,setLoading]=useState(true);
  const[message,setMessage]=useState('');

  async function load(){
    setLoading(true);setMessage('');
    try{
      const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-mapping`,{cache:'no-store'});
      const d=await r.json().catch(()=>({})) as MappingResponse&{error?:string};
      if(!r.ok)throw new Error(d.error||'Kunde inte läsa åtgärder.');
      setDocuments(d.documents||[]);setItems(d.items||[]);
    }catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa åtgärder.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[projectId]);

  const documentNames=useMemo(()=>new Map(documents.map(d=>[d.id,d.title])),[documents]);
  const rows=useMemo(()=>items.map(item=>({...item,state:itemState(item)})).filter(item=>filter==='all'||(filter==='attention'?item.state==='repair'||item.state==='unmapped':item.state==='handled'||item.state==='condition'||item.state==='exception')),[items,filter]);
  const repair=items.filter(i=>i.mapping_needs_repair).length;
  const unmapped=items.filter(i=>itemState(i)==='unmapped').length;
  const handled=items.length-repair-unmapped;

  return <div className="governingActionsView">
    <header className="governingActionsHeader"><div><small>STYRDOKUMENT</small><h1>Åtgärder</h1><p>Samlad lista över styrpunkter och sådant som behöver hanteras i projektet.</p></div><button onClick={()=>void load()}>↻ Uppdatera</button></header>
    <div className="governingActionsSummary"><article className={repair?'attention':''}><b>{repair}</b><span>kopplingar att reparera</span></article><article className={unmapped?'attention':''}><b>{unmapped}</b><span>saknar kartläggning</span></article><article><b>{handled}</b><span>kartlagda/hanterade</span></article></div>
    <div className="governingActionsToolbar"><button className={filter==='attention'?'active':''} onClick={()=>setFilter('attention')}>Behöver åtgärd</button><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Alla</button><button className={filter==='handled'?'active':''} onClick={()=>setFilter('handled')}>Hanterade</button></div>
    {message&&<div className="reportMessage">{message}</div>}
    {loading?<div className="workspaceEmpty">Hämtar åtgärder…</div>:<div className="governingActionsList">{rows.map(item=><article key={item.id} className={`governingActionRow ${item.state}`}><span className="governingActionState">{stateIcon(item.state)}</span><div><small>{documentNames.get(item.governing_document_id)||'Styrdokument'}{item.section_title?` · ${item.section_title}`:''}</small><h3>{item.code&&<em>{item.code}</em>}{item.description}</h3>{item.state==='repair'&&<p>Den befintliga aktivitetskopplingen pekar bara på en aktivitet som inte längre är aktiv.</p>}{item.state==='unmapped'&&<p>Ingen aktiv projektaktivitet är kopplad till styrpunkten.</p>}</div>{(item.state==='repair'||item.state==='unmapped')&&<button onClick={onOpenMapping}>Öppna Kartläggning</button>}</article>)}{rows.length===0&&<div className="workspaceEmpty">Inga styrpunkter i det här filtret.</div>}</div>}
  </div>;
}

function itemState(item:MappingItem){
  if(item.mapping_needs_repair)return'repair';
  if(item.project_condition&&item.handling_status==='handled')return'condition';
  if(['not_applicable','cannot_verify','alternative_evidence'].includes(String(item.handling_status||'')))return'exception';
  if(Number(item.mapped_activity_count||0)>0||item.handling_status==='handled')return'handled';
  return'unmapped';
}
function stateIcon(state:string){return state==='repair'?'⚠':state==='unmapped'?'!':state==='condition'?'◆':state==='exception'?'–':'✓'}
