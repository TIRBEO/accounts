'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { ArrowLeft, MessageSquare, Clock, User, Send } from 'lucide-react';

interface Reply {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  user: { email: string; name: string };
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  rayId?: string;
  createdAt: string;
  replies: Reply[];
}

export default function UserTicketDetailPage() {
  const params = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) loadTicket();
  }, [params.id]);

  const loadTicket = async () => {
    try {
      const res = await apiFetch(`/api/support/tickets/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
      }
    } catch {}
    setLoading(false);
  };

  const handleReply = async () => {
    if (!reply.trim() || !ticket) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply }),
      });
      if (res.ok) {
        setReply('');
        loadTicket();
      }
    } catch {}
    setSubmitting(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-[var(--color-text-secondary)]">Loading...</div>;
  }

  if (!ticket) {
    return <div className="p-12 text-center text-[var(--color-text-secondary)]">Ticket not found</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm mb-6">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{ticket.subject}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{ticket.message}</p>
          <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.createdAt).toLocaleString()}</span>
            <span className="capitalize">{ticket.category.replace(/_/g, ' ')}</span>
            {ticket.rayId && <span className="font-mono">Ray ID: {ticket.rayId.slice(0, 16)}...</span>}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {ticket.replies.map(r => (
            <div key={r.id} className={`flex gap-3 ${r.isAdmin ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.isAdmin ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'}`}>
                <User className="w-4 h-4" />
              </div>
              <div className={`flex-1 max-w-[80%] ${r.isAdmin ? 'text-right' : ''}`}>
                <div className={`inline-block p-3 rounded-lg text-sm ${r.isAdmin ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-text)]'}`}>
                  {r.message}
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-4">
        <div className="flex gap-3">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm outline-none focus:border-[var(--color-primary)] resize-none"
            rows={2}
          />
          <button
            onClick={handleReply}
            disabled={!reply.trim() || submitting}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
