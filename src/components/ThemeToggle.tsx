import { useEffect, useSyncExternalStore } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import {
  applyTheme,
  readTheme,
  subscribeTheme,
  DEFAULT_THEME,
  type ThemeId,
} from '../lib/theme';

const ORDER: ThemeId[] = ['system', 'dark', 'light'];
const ICON = { system: Laptop, dark: Moon, light: Sun };
const LABEL = { system: 'Auto', dark: 'Dark', light: 'Light' };

/**
 * The landing header's theme control — same order, icon and hit area.
 *
 * The saved choice lives in localStorage, so it is read through
 * useSyncExternalStore: a tablet open on the landing page and this app share
 * the same `tirbeo:theme` key and flip together.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => DEFAULT_THEME);

  // Correct a stale data-theme (e.g. a choice saved by another Tirbeo app on
  // the same origin) even when nothing dispatches a change.
  useEffect(() => {
    applyTheme(readTheme());
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    applyTheme(next);
  }

  const Icon = ICON[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Click to change.`}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-fill hover:text-foreground"
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}
