import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioWorkspace } from './StudioWorkspace';
import { ControlPlanOverlay } from './ControlPlanOverlay';
import './styles.css';
import './palette.css';
import './classifications.css';
import './control-plan.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioWorkspace />
    <ControlPlanOverlay />
  </React.StrictMode>
);
