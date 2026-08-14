import { useEffect,useState } from 'react';
import { GoverningDocumentsView } from './GoverningDocumentsView';
import { GoverningMappingView } from './GoverningMappingView';
import { GoverningActionsView } from './GoverningActionsView';
import { GoverningDocumentsImportAction } from './GoverningDocumentsImportAction';
import { GoverningDocumentAnalysisAction } from './GoverningDocumentAnalysisAction';

type Props = { projectId: string };
type Tab = 'documents' | 'mapping' | 'actions';
type MappingStatus={summary?:{coverage_percent?:number;uncovered_count?:number};items?:Array<{mapping_needs_repair?:boolean}>};

export function GoverningDocumentsWorkspace({ projectId }: Props) {
  const [tab,setTab] = useState<Tab>('documents');
  const [mappingWarning,setMappingWarning] = useState(0);

  async function loadMappingStatus(){
    try{
      const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-mapping`,{cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json() as MappingStatus;
      const repairs=(d.items||[]).filter(item=>item.mapping_needs_repair).length;
      const uncovered=Number(d.summary?.uncovered_count||0);
      setMappingWarning(Math.max(repairs,uncovered));
    }catch{}
  }

  useEffect(()=>{setTab('documents');void loadMappingStatus()},[projectId]);
  function open(next:Tab){setTab(next);if(next==='mapping'||next==='actions')void loadMappingStatus()}

  return <div className="governingWorkspace governingWorkspaceWithNav">
    <aside className="governingWorkspaceNav" aria-label="Styrdokument">
      <div className="governingWorkspaceNavHeader"><small>STYRDOKUMENT</small><strong>Arbetsytor</strong></div>
      <button className={tab==='documents'?'active':''} onClick={()=>open('documents')}><span>📚</span><span>Dokument</span></button>
      <button className={tab==='mapping'?'active':''} onClick={()=>open('mapping')}><span>🧭</span><span>Kartläggning</span>{mappingWarning>0&&<em title={`${mappingWarning} styrpunkt${mappingWarning===1?'':'er'} behöver kartläggas eller repareras`}>⚠</em>}</button>
      <button className={tab==='actions'?'active':''} onClick={()=>open('actions')}><span>☑</span><span>Åtgärder</span></button>
    </aside>
    <div className="governingWorkspaceBody governingWorkspaceMain">
      {tab==='documents'&&<><div className="governingWorkspaceDocumentActions"><GoverningDocumentsImportAction projectId={projectId}/></div><GoverningDocumentsView projectId={projectId}/><GoverningDocumentAnalysisAction projectId={projectId} onOpenMapping={()=>open('mapping')} /></>}
      {tab==='mapping'&&<GoverningMappingView projectId={projectId}/>} 
      {tab==='actions'&&<GoverningActionsView projectId={projectId} onOpenMapping={()=>open('mapping')}/>} 
    </div>
  </div>;
}
