import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import App from './App.tsx';
import './index.css';

if (window.location.pathname === '/' || window.location.pathname === '') {
  window.history.replaceState(null, '', '/login');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
