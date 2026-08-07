import { useState } from 'react';
import { GoverningDocumentsView } from './GoverningDocumentsView';
import { GoverningMappingView } from './GoverningMappingView';

type Props = { projectId: string };
type Tab = 'documents' | 'mapping';

export function GoverningDocumentsWorkspace({ projectId }: Props) {
  const [tab,setTab] = useState<Tab>('documents');

  return <div className="governingWorkspace">
    <div className="governingWorkspaceTabs" role="tablist" aria-label="Styrande dokument">
      <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>📚 Dokument</button>
      <button className={tab === 'mapping' ? 'active' : ''} onClick={() => setTab('mapping')}>🧭 Kartläggning</button>
    </div>
    <div className="governingWorkspaceBody">
      {tab === 'documents' ? <GoverningDocumentsView projectId={projectId} /> : <GoverningMappingView projectId={projectId} />}
    </div>
  </div>;
}
