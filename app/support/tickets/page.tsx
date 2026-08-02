'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { Plus, MessageSquare, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
}

export default function UserTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '', category: 'general', rayId: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await apiFetch('/api/support/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch {}
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.message) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ subject: '', message: '', category: 'general', rayId: '' });
        loadTickets();
      }
    } catch {}
    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-[var(--color-text-secondary)]">Loading...</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] leading-tight">Support Tickets</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Get help with access issues, CAPTCHA appeals, and more</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Create Support Ticket</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Subject</label>
              <input
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                <option value="general">General</option>
                <option value="captcha_block">CAPTCHA Block Appeal</option>
                <option value="access">Access Issue</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Ray ID (if applicable)</label>
              <input
                value={formData.rayId}
                onChange={e => setFormData({ ...formData, rayId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                placeholder="From CAPTCHA block page"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Message</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] resize-none"
                rows={4}
                placeholder="Describe your issue in detail..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting || !formData.subject || !formData.message}
                className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-tertiary)]" />
            <p className="font-medium text-[var(--color-text)] mb-1">No tickets yet</p>
            <p className="text-sm">Create a ticket if you need help</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {tickets.map(ticket => (
              <div key={ticket.id} onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                className="p-4 hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[var(--color-text)] truncate">{ticket.subject}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-1 mb-2">{ticket.message}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      <span className="capitalize">{ticket.category.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
