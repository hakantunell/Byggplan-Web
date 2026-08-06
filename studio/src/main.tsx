import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioWorkspace } from './StudioWorkspace';
import './styles.css';
import './palette.css';
import './classifications.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StudioWorkspace /></React.StrictMode>
);
