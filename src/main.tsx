import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './glow.css';
import './learn-easy.css';
import './story.css';
import './hand-guide.css';
import './mobile-refine.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
