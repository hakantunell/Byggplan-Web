import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioShell } from './StudioShell';
import './styles.css';
import './palette.css';
import './classifications.css';
import './control-plan.css';
import './governing-documents.css';
import './governing-verifications.css';
import './governing-verification-lock.css';
import './studio-shell.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioShell />
  </React.StrictMode>
);
