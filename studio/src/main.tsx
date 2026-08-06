import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioWorkspaceAtomic } from './StudioWorkspaceAtomic';
import './styles.css';
import './palette.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StudioWorkspaceAtomic /></React.StrictMode>
);
