import { GoverningDocumentsView } from './GoverningDocumentsView';
import { GoverningDocumentsImportAction } from './GoverningDocumentsImportAction';
import { GoverningDocumentAnalysisAction } from './GoverningDocumentAnalysisAction';

type Props = { projectId: string; onOpenMapping:()=>void };

export function GoverningDocumentsWorkspace({ projectId,onOpenMapping }: Props) {
  return <div className="governingDirectWorkspace">
    <div className="governingWorkspaceDocumentActions"><GoverningDocumentsImportAction projectId={projectId}/></div>
    <GoverningDocumentsView projectId={projectId}/>
    <GoverningDocumentAnalysisAction projectId={projectId} onOpenMapping={onOpenMapping}/>
  </div>;
}
