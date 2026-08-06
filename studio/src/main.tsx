import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioWorkspace } from './StudioWorkspace';
import { ControlPlanOverlay } from './ControlPlanOverlay';
import { ControlPlanRailBridge } from './ControlPlanRailBridge';
import { ControlPlanInlineMode } from './ControlPlanInlineMode';
import './styles.css';
import './palette.css';
import './classifications.css';
import './control-plan.css';
import './control-plan-hotfix.css';
import './control-plan-inline.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioWorkspace />
    <ControlPlanOverlay />
    <ControlPlanRailBridge />
    <ControlPlanInlineMode />
  </React.StrictMode>
);
