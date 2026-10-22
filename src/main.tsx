import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import {initSentry} from './lib/sentry';
import {initA11yDevTools} from './lib/a11y';
import {publishDeviceId} from './lib/device';
import {startSessionSync} from './hooks/useSession';
import {applyTheme, onSystemThemeChange, readTheme} from './lib/theme';
import App from './App.tsx';
import './index.css';

initSentry();
initA11yDevTools();
// A device flip must re-paint the palette even on screens that mount no
// theme toggle (the auth pages), so the listener lives here, not in a hook.
onSystemThemeChange(() => applyTheme(readTheme()));
// Before the first request: the sign-in alert gates on the device, and a
// top-level navigation (an OAuth callback) can only carry the id as a cookie.
publishDeviceId();
// Who is signed in is asked here, not from a component — the answer arrives
// while the auth chunk is still downloading, so no screen waits on it.
startSessionSync();

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
