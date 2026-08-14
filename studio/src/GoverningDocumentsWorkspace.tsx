import { useEffect,useState } from 'react';
import { GoverningDocumentsView } from './GoverningDocumentsView';
import { GoverningActionsView } from './GoverningActionsView';
import { GoverningDocumentsImportAction } from './GoverningDocumentsImportAction';
import { GoverningDocumentAnalysisAction } from './GoverningDocumentAnalysisAction';

type Props = { projectId: string; onOpenMapping:()=>void };
type Tab = 'documents' | 'actions';

export function GoverningDocumentsWorkspace({ projectId,onOpenMapping }: Props) {
  const [tab,setTab] = useState<Tab>('documents');
  useEffect(()=>{setTab('documents')},[projectId]);

  return <div className="governingWorkspace governingWorkspaceWithNav">
    <aside className="governingWorkspaceNav" aria-label="Styrdokument">
      <div className="governingWorkspaceNavHeader"><small>STYRDOKUMENT</small><strong>Arbetsytor</strong></div>
      <button className={tab==='documents'?'active':''} onClick={()=>setTab('documents')}><span>📚</span><span>Dokument</span></button>
      <button className={tab==='actions'?'active':''} onClick={()=>setTab('actions')}><span>☑</span><span>Åtgärder</span></button>
    </aside>
    <div className="governingWorkspaceBody governingWorkspaceMain">
      {tab==='documents'&&<><div className="governingWorkspaceDocumentActions"><GoverningDocumentsImportAction projectId={projectId}/></div><GoverningDocumentsView projectId={projectId}/><GoverningDocumentAnalysisAction projectId={projectId} onOpenMapping={onOpenMapping} /></>}
      {tab==='actions'&&<GoverningActionsView projectId={projectId} onOpenMapping={onOpenMapping}/>} 
    </div>
  </div>;
}
