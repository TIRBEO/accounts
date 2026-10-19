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
    <div role="status" className="tb-notice">
      <Megaphone size={15} aria-hidden />
      <span>{message}</span>
    </div>
  );
};

