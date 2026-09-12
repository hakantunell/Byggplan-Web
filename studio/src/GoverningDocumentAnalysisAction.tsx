import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {VK4410_CONTROL_PLAN} from './controlPlanVk4410';
import {VK4410_PROJECT_CONTROL_PLAN} from './controlPlanProjectProposalVk4410';
import {VK4410_ENVIRONMENT_DECISION} from './governingDocumentEnvironmentVk4410';
import {VK4410_TECHNICAL_CONSULTATION} from './governingDocumentTechnicalConsultationVk4410';

type DocumentSummary={id:string;document_type:string;title:string;reference:string;source_filename:string;item_count:number};
type Props={projectId:string;onOpenMapping:()=>void};
type AnalysisItem={code?:string;description:string;sectionCode?:string;sectionTitle?:string;itemType?:string;responsibleRole?:string;evidenceRequired?:string;handlingStatus?:string;sourceNote?:string};
type GenericAnalysisResponse={createdItems?:number;error?:string;documentSummary?:string;analyzer?:string;model?:string;status?:string;stage?:string;analysisRunId?:string;result?:GenericAnalysisResponse};

function reviewedPlanItems(points:readonly any[]):AnalysisItem[]{
  return points.map(point=>({
    code:point.code,description:point.description,sectionCode:point.categoryCode,sectionTitle:point.categoryTitle,
    itemType:point.pointType==='document'?'documentation':point.pointType==='not_applicable'?'other':point.pointType,
    responsibleRole:point.responsibleRole,evidenceRequired:point.evidenceRequired,
    handlingStatus:point.applicable===false?'not_applicable':'unhandled',sourceNote:point.method
  }));
}
function environmentItems():AnalysisItem[]{return VK4410_ENVIRONMENT_DECISION.items.map(item=>({...item,responsibleRole:item.responsibleRole||''}))}
function technicalConsultationItems():AnalysisItem[]{return VK4410_TECHNICAL_CONSULTATION.items.map(item=>({...item,handlingStatus:'handlingStatus' in item?item.handlingStatus:'unhandled'}))}
function compact(value:string){return value.toLocaleLowerCase('sv-SE').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function reviewedFallback(document:DocumentSummary):AnalysisItem[]|null{
  const source=compact(document.source_filename||''),title=compact(document.title||''),reference=compact(document.reference||'');
  if(document.document_type==='control_plan'){
    if(source.includes('kontrollplankavk4410')||source.includes('tekniskaegenskapskrav')||source.includes('teknegenskapskrav'))return reviewedPlanItems(VK4410_CONTROL_PLAN.points);
    if(source.includes('kontrollplanvemdalenskyrkby4410fritidshus')||title.includes('kontrollplandelfritidshus'))return reviewedPlanItems(VK4410_PROJECT_CONTROL_PLAN.points);
    return null;
  }
  if(document.document_type==='authority_decision'&&(source.includes('avlopp')||source.includes('infiltration')||reference.includes('m2026617')||title.includes('avlopp')))return environmentItems();
  if(document.document_type==='technical_consultation'||source.includes('protokollteknisktsamrad')||title.includes('teknisktsamrad'))return technicalConsultationItems();
  return null;
}

function wait(ms:number){return new Promise(resolve=>window.setTimeout(resolve,ms))}

export function GoverningDocumentAnalysisAction({projectId,onOpenMapping}:Props){
  const[target,setTarget]=useState<Element|null>(null);const[documents,setDocuments]=useState<DocumentSummary[]>([]);const[selectedTitle,setSelectedTitle]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  useEffect(()=>{void loadDocuments()},[projectId]);
  useEffect(()=>{const sync=()=>{const header=document.querySelector('.governingPrimaryView .governingPageHeader');setTarget(current=>current===header?current:header);setSelectedTitle(header?.querySelector('h1')?.textContent?.trim()||'')};sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer)},[]);
  async function loadDocuments(){try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-documents`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {documents?:DocumentSummary[]};if(r.ok)setDocuments((d.documents||[]).map(item=>({...item,item_count:Number(item.item_count||0)})))}catch{}}
  const selected=useMemo(()=>documents.find(item=>item.title===selectedTitle)||null,[documents,selectedTitle]);

  async function postReviewedFallback(selectedDocument:DocumentSummary,items:AnalysisItem[]){
    const r=await fetch(`/api/studio/governing-documents/${encodeURIComponent(selectedDocument.id)}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analyzer:'reviewed-document-specific-structure-fallback',items})});
    const d=await r.json().catch(()=>({})) as GenericAnalysisResponse;if(!r.ok)throw new Error(d.error||'Fallback-analysen misslyckades.');return Number(d.createdItems||0)
  }

  async function waitForQueuedAnalysis(selectedDocument:DocumentSummary){
    const started=Date.now();
    while(Date.now()-started<12*60*1000){
      await wait(2000);
      const r=await fetch(`/api/studio/governing-documents/${encodeURIComponent(selectedDocument.id)}/analysis-status`,{cache:'no-store'});
      const d=await r.json().catch(()=>({})) as GenericAnalysisResponse;
      if(!r.ok)throw new Error(d.error||'Kunde inte läsa analysstatus.');
      if(d.status==='completed'){
        const result=d.result||{};
        return {created:Number(result.createdItems||0),fallback:false,summary:result.documentSummary||''};
      }
      if(d.status==='failed')throw new Error(d.error||d.result?.error||'Analysen misslyckades i bakgrundskön.');
      if(d.status==='processing')setMessage('Dokumentet analyseras i bakgrunden…');
      else setMessage('Dokumentet väntar på analys…');
    }
    throw new Error('Analysen tar längre tid än väntat. Den fortsätter i bakgrunden; prova att öppna dokumentet igen om en stund.');
  }

  async function runGenericAnalysis(selectedDocument:DocumentSummary){
    const r=await fetch(`/api/studio/governing-documents/${encodeURIComponent(selectedDocument.id)}/analyze-generic`,{method:'POST'});
    const d=await r.json().catch(()=>({})) as GenericAnalysisResponse;
    if(r.ok){
      if(d.status==='queued'||d.status==='processing')return waitForQueuedAnalysis(selectedDocument);
      return {created:Number(d.createdItems||0),fallback:false,summary:d.documentSummary||''};
    }
    if(r.status===503){
      const fallback=reviewedFallback(selectedDocument);
      if(fallback?.length){const created=await postReviewedFallback(selectedDocument,fallback);return {created,fallback:true,summary:''}}
    }
    throw new Error(d.error||'Analysen misslyckades.');
  }

  async function analyze(){
    if(!selected)return;setBusy(true);setMessage('Startar dokumentanalysen…');
    try{
      const result=await runGenericAnalysis(selected);
      setMessage(result.fallback?`${result.created} styrande poster hittades med den verifierade reservanalysen.`:result.created?`${result.created} styrande poster hittades.`:'Analysen hittade inga tydligt styrande poster i dokumentet.');
      await loadDocuments();if(result.created>0)window.setTimeout(()=>onOpenMapping(),650);
    }catch(e){setMessage(e instanceof Error?e.message:'Analysen misslyckades.')}finally{setBusy(false)}
  }

  async function reanalyze(){
    if(!selected)return;
    if(!window.confirm('Analysera om dokumentet? Befintliga styrposter och deras aktivitetskopplingar för just detta dokument tas bort och byggs upp på nytt från originalfilen.'))return;
    setBusy(true);setMessage('Nollställer och startar om analysen…');
    try{
      const reset=await fetch(`/api/studio/governing-documents/${encodeURIComponent(selected.id)}/analysis`,{method:'DELETE'});
      const resetData=await reset.json().catch(()=>({})) as {error?:string};if(!reset.ok)throw new Error(resetData.error||'Kunde inte nollställa analysen.');
      const result=await runGenericAnalysis(selected);
      setMessage(result.fallback?`Analysen byggdes om med ${result.created} poster via verifierad reservanalys.`:result.created?`Analysen byggdes om med ${result.created} styrande poster.`:'Analysen byggdes om men hittade inga tydligt styrande poster.');
      await loadDocuments();if(result.created>0)window.setTimeout(()=>onOpenMapping(),650);
    }catch(e){setMessage(e instanceof Error?e.message:'Kunde inte analysera om dokumentet.')}finally{setBusy(false)}
  }

  if(!target||!selected)return null;
  return createPortal(<div className="governingAnalysisAction">
    {selected.item_count>0?<><button className="primary" onClick={onOpenMapping}>🧭 Kartlägg aktiviteter</button><button disabled={busy} onClick={()=>void reanalyze()}>{busy?'Analyserar…':'↻ Analysera om'}</button></>:<button className="primary" disabled={busy} onClick={()=>void analyze()}>{busy?'Analyserar…':'🔎 Analysera dokument'}</button>}
    {message&&<small>{message}</small>}
  </div>,target);
}
