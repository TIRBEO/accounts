import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import {initSentry} from './lib/sentry';
import {initA11yDevTools} from './lib/a11y';
import {publishDeviceId} from './lib/device';
import App from './App.tsx';
import './index.css';

initSentry();
initA11yDevTools();
// Before the first request: the sign-in alert gates on the device, and a
// top-level navigation (an OAuth callback) can only carry the id as a cookie.
publishDeviceId();

if (window.location.pathname === '/' || window.location.pathname === '') {
  window.history.replaceState(null, '', '/login');
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
