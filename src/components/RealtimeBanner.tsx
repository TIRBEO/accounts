import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { subscribe, type RealtimeChannel } from '../lib/realtime';

/**
 * Live announcements banner for the auth screens.
 *
 * Subscribes to the public `announcements` channel. The backend (or anyone
 * with the dashboard console) publishes `{ message: string }` events named
 * `announcement`. Renders nothing until a message arrives, so there is zero
 * visual/CLS cost when no announcement is live.
 */
export const RealtimeBanner: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let unbind: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Defer the socket open until well after first paint / LCP — realtime
    // must never compete with rendering the auth form.
    timer = setTimeout(() => {
      subscribe('announcements')
        .then((channel) => {
          if (!channel || disposed) return;
          const handler = (data: unknown) => {
            const msg =
              typeof data === 'string'
                ? data
                : (data as { message?: string } | null)?.message;
            if (typeof msg === 'string' && msg.trim()) setMessage(msg.trim());
          };
          channel.bind('announcement', handler);
          unbind = () => channel.unbind('announcement', handler);
        })
        .catch(() => {});
    }, 2500);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unbind?.();
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-16 z-40 flex max-w-[min(560px,calc(100vw-32px))] -translate-x-1/2 items-center gap-2 glass rounded-full px-4 py-2 text-[13px] font-medium text-white shadow-pop"
    >
      <Megaphone size={15} className="shrink-0 text-accent" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message}</span>
    </div>
  );
};

export default RealtimeBanner;
