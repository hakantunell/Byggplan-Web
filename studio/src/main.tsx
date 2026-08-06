import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioShell } from './StudioShell';
import './styles.css';
import './templates.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StudioShell /></React.StrictMode>
);
