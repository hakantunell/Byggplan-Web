import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {VK4410_CONTROL_PLAN} from './controlPlanVk4410';
import {VK4410_PROJECT_CONTROL_PLAN} from './controlPlanProjectProposalVk4410';
import {VK4410_ENVIRONMENT_DECISION} from './governingDocumentEnvironmentVk4410';

type DocumentSummary={id:string;document_type:string;title:string;reference:string;source_filename:string;item_count:number};
type Props={projectId:string;onOpenMapping:()=>void};
type AnalysisItem={code?:string;description:string;sectionCode?:string;sectionTitle?:string;itemType?:string;responsibleRole?:string;evidenceRequired?:string;handlingStatus?:string;sourceNote?:string};

function reviewedPlanItems(points:readonly any[]):AnalysisItem[]{
  return points.map(point=>({
    code:point.code,description:point.description,sectionCode:point.categoryCode,sectionTitle:point.categoryTitle,
    itemType:point.pointType==='document'?'documentation':point.pointType==='not_applicable'?'other':point.pointType,
    responsibleRole:point.responsibleRole,evidenceRequired:point.evidenceRequired,
    handlingStatus:point.applicable===false?'not_applicable':'unhandled',sourceNote:point.method
  }));
}

function environmentItems():AnalysisItem[]{
  return VK4410_ENVIRONMENT_DECISION.items.map(item=>({
    ...item,
    responsibleRole:item.itemType==='information'?'':item.itemType==='administration'?'BH':item.code==='V-02'?'Fackkunnig/entreprenör':'EK'
  }));
}

function compact(value:string){return value.toLocaleLowerCase('sv-SE').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}

function analysisFor(document:DocumentSummary):AnalysisItem[]|null{
  const source=compact(document.source_filename||'');
  const title=compact(document.title||'');
  if(document.document_type==='control_plan'){
    if(source.includes('kontrollplankavk4410')||source.includes('tekniskaegenskapskrav')||source.includes('teknegenskapskrav'))return reviewedPlanItems(VK4410_CONTROL_PLAN.points);
    if(source.includes('kontrollplanvemdalenskyrkby4410fritidshus')||title.includes('kontrollplandelfritidshus'))return reviewedPlanItems(VK4410_PROJECT_CONTROL_PLAN.points);
    return null;
  }
  if(document.document_type==='authority_decision'&&(source.includes('avlopp')||source.includes('infiltration')||compact(document.reference||'').includes('m2026617')||title.includes('avlopp')))return environmentItems();
  return null;
}

export function GoverningDocumentAnalysisAction({projectId,onOpenMapping}:Props){
  const[target,setTarget]=useState<Element|null>(null);const[documents,setDocuments]=useState<DocumentSummary[]>([]);const[selectedTitle,setSelectedTitle]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  useEffect(()=>{void loadDocuments()},[projectId]);
  useEffect(()=>{const sync=()=>{const header=document.querySelector('.governingPrimaryView .governingPageHeader');setTarget(current=>current===header?current:header);setSelectedTitle(header?.querySelector('h1')?.textContent?.trim()||'')};sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer)},[]);
  async function loadDocuments(){try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-documents`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {documents?:DocumentSummary[]};if(r.ok)setDocuments((d.documents||[]).map(item=>({...item,item_count:Number(item.item_count||0)})))}catch{}}
  const selected=useMemo(()=>documents.find(item=>item.title===selectedTitle)||null,[documents,selectedTitle]);
  const analysis=selected?analysisFor(selected):null;

  async function postAnalysis(selectedDocument:DocumentSummary,items:AnalysisItem[]){
    const r=await fetch(`/api/studio/governing-documents/${encodeURIComponent(selectedDocument.id)}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analyzer:'reviewed-document-specific-structure',items})});
    const d=await r.json().catch(()=>({})) as {createdItems?:number;error?:string};
    if(!r.ok)throw new Error(d.error||'Analysen misslyckades.');
    return Number(d.createdItems||0);
  }

  async function analyze(){if(!selected||!analysis)return;setBusy(true);setMessage('Analyserar dokumentet…');try{const created=await postAnalysis(selected,analysis);setMessage(`${created} styrande poster hittades.`);await loadDocuments();window.setTimeout(()=>onOpenMapping(),500)}catch(e){setMessage(e instanceof Error?e.message:'Analysen misslyckades.')}finally{setBusy(false)}}

  async function reanalyze(){
    if(!selected||!analysis)return;
    if(!window.confirm('Analysera om dokumentet? Befintliga styrpunkter och deras aktivitetskopplingar för just detta dokument tas bort och byggs upp på nytt från originalets granskade struktur.'))return;
    setBusy(true);setMessage('Nollställer och analyserar om dokumentet…');
    try{
      const reset=await fetch(`/api/studio/governing-documents/${encodeURIComponent(selected.id)}/analysis`,{method:'DELETE'});
      const resetData=await reset.json().catch(()=>({})) as {error?:string};
      if(!reset.ok)throw new Error(resetData.error||'Kunde inte nollställa analysen.');
      const created=await postAnalysis(selected,analysis);
      setMessage(`Analysen byggdes om med ${created} styrande poster.`);
      await loadDocuments();window.setTimeout(()=>onOpenMapping(),500);
    }catch(e){setMessage(e instanceof Error?e.message:'Kunde inte analysera om dokumentet.')}finally{setBusy(false)}
  }

  if(!target||!selected)return null;
  return createPortal(<div className="governingAnalysisAction">
    {selected.item_count>0?<><button className="primary" onClick={onOpenMapping}>🧭 Kartlägg aktiviteter</button>{analysis&&<button disabled={busy} onClick={()=>void reanalyze()}>{busy?'Analyserar…':'↻ Analysera om'}</button>}</>:analysis?<button className="primary" disabled={busy} onClick={()=>void analyze()}>{busy?'Analyserar…':'🔎 Analysera dokument'}</button>:<button disabled title="Ingen dokumentanalysator är konfigurerad för just detta dokument ännu.">Analys ej tillgänglig</button>}
    {message&&<small>{message}</small>}
  </div>,target);
}
