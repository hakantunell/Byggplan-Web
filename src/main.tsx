import React from 'react';
import ReactDOM from 'react-dom/client';
import './same-origin-api';
import { AppErrorBoundary } from './AppErrorBoundary';
import { installProjectSupportBridge } from './project-support-bridge';
import { installMobileActivityScope } from './mobile-activity-scope';
import { installActivityOwnDocumentation } from './activity-own-documentation-bridge';
import { installActivityMoveBridge } from './activity-move-bridge';
import { FieldResponsiveShell } from './FieldResponsiveShell';
import { AuthGate } from './AuthGate';
import './styles.css';
import './responsive.css';
import './layout-fixes.css';
import './uploads.css';
import './supervisor.css';
import './navigation.css';
import './support-attachments.css';
import './project-documents-bar.css';
import './field-responsive-shell.css';
import './field-task-detail.css';
import './field-compact-desktop.css';
import './activity-move.css';

installProjectSupportBridge();
installMobileActivityScope();
installActivityOwnDocumentation();
installActivityMoveBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate><AppErrorBoundary><FieldResponsiveShell /></AppErrorBoundary></AuthGate>
  </React.StrictMode>
);
