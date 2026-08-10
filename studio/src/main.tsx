import React from 'react';
import ReactDOM from 'react-dom/client';
import './same-origin-api';
import { StudioShell } from './StudioShell';
import { ProjectOverviewExtras } from './ProjectOverviewExtras';
import './styles.css';
import './palette.css';
import './classifications.css';
import './control-plan.css';
import './governing-documents.css';
import './governing-verifications.css';
import './governing-verification-lock.css';
import './governing-mapping.css';
import './governing-mapping-exception.css';
import './studio-shell.css';
import './master-projects.css';
import './project-support.css';
import './project-documents.css';
import './project-administration.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioShell />
    <ProjectOverviewExtras />
  </React.StrictMode>
);
