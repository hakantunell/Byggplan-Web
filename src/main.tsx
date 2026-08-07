import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DemoProfileSwitcher, installDemoFetchIdentity } from './DemoProfileSwitcher';
import './styles.css';
import './responsive.css';
import './layout-fixes.css';
import './uploads.css';
import './demo-profile.css';
import './supervisor.css';
import './navigation.css';

installDemoFetchIdentity();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /><DemoProfileSwitcher /></React.StrictMode>
);
