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
      style={{
        position: 'fixed',
        top: '64px',
        left: '50%',
        translate: '-50% 0',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: 'min(560px, calc(100vw - 32px))',
        padding: '9px 14px',
        background: 'rgba(9,9,11,0.82)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        border: '1px solid rgba(0,149,246,0.22)',
        borderRadius: '12px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        fontSize: '19px',
        fontWeight: 550,
        color: '#E4E4E7',
      }}
    >
      <Megaphone size={15} color="#0095F6" style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message}</span>
    </div>
  );
};

export default RealtimeBanner;
