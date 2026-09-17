// Sentry is fully deferred: the SDK (~150KB min) used to be parsed
// synchronously in the main bundle before first paint. Now nothing touches
// the SDK until 2.5s after window load, when it's fetched as an async chunk.
// Captures made before init are buffered and replayed.

let mod: typeof import('@sentry/react') | null = null;
let ready = false;
const buffer: Array<() => void> = [];

export function initSentry() {
  if (!import.meta.env.PROD) return;
  const start = () => {
    setTimeout(async () => {
      try {
        mod = await import('@sentry/react');
        mod.init({
          dsn: import.meta.env.VITE_SENTRY_DSN || '',
          environment: import.meta.env.MODE,
          integrations: [
            mod.browserTracingIntegration(),
            // Session replay records the DOM continuously — heavy on low-end
            // devices. Kept for error reports only.
            mod.replayIntegration({ maskAllText: true, blockAllMedia: true }),
          ],
          // 2% of sessions traced + replay only on errors: was 20% / 10%, which
          // added noticeable main-thread overhead on mobile.
          tracesSampleRate: 0.02,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0.5,
          beforeSend(event) {
            if (event.request?.cookies) delete event.request.cookies;
            return event;
          },
        });
        ready = true;
        buffer.splice(0).forEach((fn) => fn());
      } catch {
        // monitoring must never break the app
      }
    }, 2500);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

/** Safe capture that buffers until the SDK has loaded. */
export function captureException(err: unknown): void {
  if (!import.meta.env.PROD) return;
  const send = () => mod?.captureException(err);
  if (ready) send();
  else buffer.push(send);
}

export function captureMessage(msg: string): void {
  if (!import.meta.env.PROD) return;
  const send = () => mod?.captureMessage(msg);
  if (ready) send();
  else buffer.push(send);
}
