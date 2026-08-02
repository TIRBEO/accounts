'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Mail, Clock, MessageSquare, Send } from 'lucide-react';
import { img } from '../../components/ui-constants';
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <img src={img("captcha-block-1")} alt="Access blocked"
            className="w-full max-w-[320px] mx-auto rounded-xl border border-red-100 mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Access Blocked
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-4">
            <AlertTriangle className="w-4 h-4" />
            Error 4404
          </div>

          <p className="text-gray-600 mb-6">
            Your access has been temporarily blocked due to suspicious activity.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ray ID:</span>
              <span className="font-mono text-gray-900">{rayId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reason:</span>
              <span className="text-gray-900 capitalize">{reason.replace(/_/g, ' ')}</span>
            </div>
            {timeRemaining !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time remaining:</span>
                <span className="font-mono text-gray-900 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>

          {!showTicketForm ? (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-gray-500">
                If you believe this is an error, you can submit an appeal.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowTicketForm(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Submit Appeal
                </button>
                <a
                  href={`mailto:support@tirbeo.app?subject=${encodeURIComponent('Access Blocked - Ray ID ' + rayId)}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Support
                </a>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4 text-left space-y-3">
              <h3 className="font-medium text-gray-900">Submit Appeal</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Subject</label>
                <input
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="CAPTCHA Block Appeal"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Message</label>
                <textarea
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Explain why you think this is an error..."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowTicketForm(false)} className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmitTicket} disabled={submitting || !ticketMessage.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                  {submitting ? 'Submitting...' : <><Send className="w-3 h-3" /> Submit</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Tirbeo Security System
        </p>
      </div>
    </div>
  );
}

export default function CaptchaBlockedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    }>
      <CaptchaBlockedContent />
    </Suspense>
  );
}
