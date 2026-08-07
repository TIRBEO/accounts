'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Clock, Mail, MessageSquare, Send } from 'lucide-react';
import { apiFetch } from '../../lib/api';

function CaptchaBlockedContent() {
  const searchParams = useSearchParams();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rayId = searchParams.get('rayId') || 'unknown';
  const reason = searchParams.get('reason') || 'suspicious_activity';
  const expiresAt = searchParams.get('expiresAt');

  useEffect(() => {
    if (expiresAt) {
      const updateTime = () => {
        const now = Date.now();
        const expiry = new Date(expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        setTimeRemaining(remaining);
      };
      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [expiresAt]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/support/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `CAPTCHA Block Appeal - ${rayId}`,
          description: `I believe my access was blocked in error.\n\nRay ID: ${rayId}\nReason: ${reason}\n\nDetails: ${ticketMessage}`,
        }),
      });
      setShowTicketForm(false);
      setTicketSubject('');
      setTicketMessage('');
      alert('Ticket submitted successfully. We will review your appeal.');
    } catch {}
    setSubmitting(false);
  };

  return (
    <main
      className="auth-soft min-h-screen px-4 py-6 sm:px-6 sm:py-10"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[520px] items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <section className="w-full">
          <div
            className="overflow-hidden rounded-[26px] border shadow-[0_20px_70px_rgba(0,0,0,0.14)]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface, var(--bg))' }}
          >
            <div className="h-1 w-full" style={{ background: 'var(--error)' }} />
            <div className="p-6 sm:p-8">
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border"
                style={{ borderColor: 'var(--error)', color: 'var(--error)', background: 'var(--error-surface)' }}
              >
                <AlertTriangle size={20} />
              </div>

              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
                Tirbeo security
              </p>
              <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[34px]">Access blocked</h1>

              <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                Your access has been temporarily blocked due to suspicious activity.
              </p>

              <div
                className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                style={{ background: 'var(--error-surface)', color: 'var(--error)', borderColor: 'color-mix(in srgb, var(--error) 45%, var(--border))' }}
              >
                <AlertTriangle className="h-4 w-4" />
                Error 4404
              </div>

              <div
                className="mt-6 space-y-2.5 rounded-2xl border p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
              >
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Ray ID:</span>
                  <span className="font-mono" style={{ color: 'var(--text)' }}>{rayId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                  <span className="capitalize" style={{ color: 'var(--text)' }}>{reason.replace(/_/g, ' ')}</span>
                </div>
                {timeRemaining !== null && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>Time remaining:</span>
                    <span className="flex items-center gap-1 font-mono" style={{ color: 'var(--text)' }}>
                      <Clock className="h-3 w-3" />
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                )}
              </div>

              {!showTicketForm ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    If you believe this is an error, you can submit an appeal.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button onClick={() => setShowTicketForm(true)} className="btn-primary">
                      <MessageSquare className="h-4 w-4" />
                      Submit Appeal
                    </button>
                    <a
                      href={`mailto:support@tirbeo.app?subject=${encodeURIComponent('Access Blocked - Ray ID ' + rayId)}`}
                      className="btn-secondary"
                    >
                      <Mail className="h-4 w-4" />
                      Email Support
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em]">Submit Appeal</h3>
                  <div>
                    <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>Subject</label>
                    <input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="CAPTCHA Block Appeal"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>Message</label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      rows={3}
                      placeholder="Explain why you think this is an error..."
                    />
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={() => setShowTicketForm(false)} className="btn-secondary flex-1">
                      Cancel
                    </button>
                    <button onClick={handleSubmitTicket} disabled={submitting || !ticketMessage.trim()} className="btn-primary flex-1">
                      {submitting ? 'Submitting...' : <><Send className="h-3 w-3" /> Submit</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
            Tirbeo Security System
          </p>
        </section>
      </div>
    </main>
  );
}

export default function CaptchaBlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
          <span className="spinner" />
        </div>
      }
    >
      <CaptchaBlockedContent />
    </Suspense>
  );
}
