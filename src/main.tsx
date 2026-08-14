import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppErrorBoundary } from './AppErrorBoundary';
import { DemoProfileSwitcher, installDemoFetchIdentity } from './DemoProfileSwitcher';
import { installProjectSupportBridge } from './project-support-bridge';
import { installMobileActivityScope } from './mobile-activity-scope';
import { installActivityOwnDocumentation } from './activity-own-documentation-bridge';
import { ProjectDocumentsBar } from './ProjectDocumentsBar';
import './styles.css';
import './responsive.css';
import './layout-fixes.css';
import './uploads.css';
import './demo-profile.css';
import './supervisor.css';
import './navigation.css';
import './support-attachments.css';
import './project-documents-bar.css';

installDemoFetchIdentity();
installProjectSupportBridge();
installMobileActivityScope();
installActivityOwnDocumentation();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
    <ProjectDocumentsBar />
    <DemoProfileSwitcher />
  </React.StrictMode>
);
