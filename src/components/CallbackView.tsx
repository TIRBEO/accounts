import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';
import { GitHubIcon, GoogleIcon, DiscordIcon } from './SocialIcons';
import { getCurrentUser, apiPost, verifyMagicLink } from '../lib/api';
import { isAllowedRedirectTarget, unwrapHandoffTarget, DEFAULT_DASHBOARD_URL } from '../lib/redirect';
import { haptic } from '../lib/haptics';
import { AuthShell, PrimaryButton, SecondaryButton, Spinner } from './ui/ig-ui';

const PROVIDER_LABELS: Record<string, string> = { github: 'GitHub', google: 'Google', discord: 'Discord' };
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  github: <GitHubIcon className="h-5 w-5 text-fg" />,
  google: <GoogleIcon className="h-5 w-5" />,
  discord: <DiscordIcon className="h-5 w-5 text-[#5865F2]" />,
};

function getParam(key: string): string { return new URLSearchParams(window.location.search).get(key) || ''; }
function sanitizeTarget(raw: string): string { if (!raw) return DEFAULT_DASHBOARD_URL; const clean = unwrapHandoffTarget(raw); if (isAllowedRedirectTarget(clean)) return clean; return DEFAULT_DASHBOARD_URL; }
const verifiedMagicTokens = new Set<string>();

interface CallbackViewProps { onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void; }

export const CallbackView: React.FC<CallbackViewProps> = ({ onToast }) => {
  const [checking, setChecking] = useState(true);
  // Non-empty string means this callback is NOT allowed — holds the plain-language reason.
  const [denied, setDenied] = useState('');
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  const isMerge = getParam('oauth') === 'merge';
  const mergeMode: 'login' | 'transfer' = getParam('mode') === 'transfer' ? 'transfer' : 'login';
  const mergeToken = getParam('token');
  const provider = getParam('provider') || '';
  const providerLabel = PROVIDER_LABELS[provider] || provider || 'sign-in';
  const redirectTo = sanitizeTarget(getParam('redirect_to'));
  const magicToken = getParam('magic_token');

  const [magicStatus, setMagicStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [magicError, setMagicError] = useState('');

  useEffect(() => {
    if (magicToken) {
      if (verifiedMagicTokens.has(magicToken)) return;
      verifiedMagicTokens.add(magicToken);
      setChecking(true); setMagicStatus('verifying');
      try { window.history.replaceState({}, '', window.location.pathname + window.location.search.replace(/[\?&]magic_token=[^&]+/, '').replace(/^\?$/, '')); } catch {}
      verifyMagicLink(magicToken).then((res) => {
        if (res.ok) {
          setMagicStatus('success'); haptic('success');
          onToast?.(`Magic link verified${res.email ? ' for ' + res.email : ''} — redirecting...`, 'success');
          try { localStorage.setItem('tirbeo_session', JSON.stringify({ type: 'login', ts: Date.now() })); } catch {}
          try { new BroadcastChannel('tirbeo:session').postMessage({ type: 'login', ts: Date.now() }); } catch {}
          setTimeout(() => { window.location.href = redirectTo; }, 900);
        } else {
          if (res.error && res.error.includes('already been used') && verifiedMagicTokens.size === 1) {
            getCurrentUser().then((s) => {
              if (s.ok && s.data) { setMagicStatus('success'); setTimeout(() => { window.location.href = redirectTo; }, 900); }
              else { const msg = res.error || 'This magic link is invalid, expired, or already used.'; setMagicStatus('error'); setMagicError(msg); onToast?.(msg, 'error'); haptic('error'); }
              setChecking(false);
            }); return;
          }
          const msg = res.error || 'This magic link is invalid, expired, or already used. Please request a new one.';
          setMagicStatus('error'); setMagicError(msg); onToast?.(msg, 'error'); haptic('error');
        }
        setChecking(false);
      }).catch(() => { setMagicStatus('error'); setMagicError('Could not verify magic link. Please try again.'); setChecking(false); });
      return;
    }
    if (isMerge) { setChecking(false); return; }

    // Explicit denial carried in the callback URL (provider refused / consent denied).
    const deniedParam = getParam('error') || getParam('denied');
    if (deniedParam) { setDenied('This sign-in was not allowed. ' + deniedParam.replace(/[_.-]+/g, ' ').trim()); setChecking(false); return; }
    // Unknown / unsupported provider reaching the callback.
    if (provider && !PROVIDER_LABELS[provider]) { setDenied('We don\'t recognise that sign-in provider, so this request isn\'t allowed.'); setChecking(false); return; }

    let cancelled = false;
    // Verify the session, then hand off automatically. No intermediate step.
    getCurrentUser().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) { window.location.href = redirectTo; return; }
      const block = (res as { block?: { kind?: string; reason?: string | null } }).block;
      if (block) {
        const kind = block.kind === 'banned' ? 'banned' : block.kind === 'deleted' ? 'deleted' : 'suspended';
        setDenied(`This account is ${kind}${block.reason ? ` — ${block.reason}` : '.'} Sign-in is not allowed.`);
      } else {
        const status = (res as { status?: number }).status;
        setDenied(status === 401 || status === 403
          ? 'We couldn\'t confirm you\'re signed in, so we can\'t open this section.'
          : 'We couldn\'t complete your sign-in, so this request isn\'t allowed.');
      }
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleMergeConfirm = async () => {
    setError(''); setMerging(true);
    const result = mergeMode === 'transfer' ? await apiPost<{ ok: boolean }>('/api/integrations/merge', { merge_token: mergeToken, action: 'merge' }) : await apiPost<{ ok: boolean; redirect_to: string }>('/api/auth/oauth/merge', { token: mergeToken });
    if (!result.ok) { const msg = result.error || 'Could not complete the merge. Please sign in again.'; setError(msg); onToast?.(msg, 'error'); setMerging(false); return; }
    window.location.href = mergeMode === 'transfer' ? `${DEFAULT_DASHBOARD_URL}/account/connected-apps?connected=${provider}` : sanitizeTarget((result.data as { redirect_to?: string })?.redirect_to || DEFAULT_DASHBOARD_URL);
  };
  const handleMergeCancel = () => { window.location.href = mergeMode === 'transfer' ? `${DEFAULT_DASHBOARD_URL}/account/connected-apps` : '/'; };

  const cardCls = 'relative z-10 w-full';

  if (magicToken) {
    return (
      <AuthShell wide>
        <div className={cardCls}>
          {magicStatus === 'verifying' || checking ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="grid size-20 place-items-center rounded-3xl border border-white/12 bg-white/[0.05]">
                <Mail size={30} className="text-white/80" />
              </div>
              <div>
                <h1 className="tb-heading">Verifying magic link</h1>
                <p className="tb-sub mt-1.5">One-time link — please wait</p>
              </div>
              <span className="inline-flex items-center gap-2 text-[16px] text-white/55">
                <Spinner /> Verifying…
              </span>
            </div>
          ) : magicStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <div className="grid size-20 place-items-center rounded-3xl border border-white/12 bg-white/[0.05]">
                <CheckCircle2 size={32} className="text-success" />
              </div>
              <div>
                <h1 className="tb-heading">You&apos;re signed in</h1>
                <p className="tb-sub mt-1.5">Magic link verified — opening your workspace.</p>
              </div>
              <div className="mt-2 h-px w-full overflow-hidden rounded-full bg-white/[0.12]">
                <div className="h-full w-full rounded-full bg-white/[0.12]" />
              </div>
              <p className="text-[16px] text-white/50">Redirecting to {redirectTo.replace(/^https?:\/\//,'').slice(0,32)}…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <div className="grid size-20 place-items-center rounded-3xl border border-white/12 bg-white/[0.05]">
                <Mail size={30} className="text-danger" />
              </div>
              <div>
                <h1 className="tb-heading">Link expired or already used</h1>
                <p className="tb-sub mt-2 leading-relaxed">{magicError || 'This magic link is invalid or already used. Each link works once only.'}</p>
              </div>
              <div className="mt-2 flex w-full flex-col gap-3">
                <PrimaryButton type="button" onClick={() => { window.location.href = '/'; }}>Back to login</PrimaryButton>
                <SecondaryButton type="button" onClick={() => { window.location.href = `/login?email=${encodeURIComponent(getParam('email')||'')}`; }}>Request a new link</SecondaryButton>
              </div>
            </div>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <div className={cardCls}>
        {denied ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid size-20 place-items-center rounded-3xl border border-white/12 bg-white/[0.05]">
              <XCircle size={30} className="text-danger" />
            </div>
            <h1 className="tb-heading">Not allowed</h1>
            <p className="tb-sub mt-1.5 max-w-[360px] leading-relaxed">{denied}</p>
          </div>
        ) : isMerge ? (
          <>
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/12 bg-white/[0.05]">
                {PROVIDER_ICONS[provider] || <CheckCircle2 size={24} className="text-white/80" />}
              </div>
              <h1 className="tb-heading">{mergeMode === 'transfer' ? `Transfer ${providerLabel} here?` : `Merge ${providerLabel} account?`}</h1>
              <p className="mt-2 max-w-[320px] text-[16px] leading-relaxed text-white/55">
                {mergeMode === 'transfer' ? `This ${providerLabel} account is linked to another account. Transfer moves sign-in to your current account.` : `An existing account shares this email. Merging links ${providerLabel} sign-in to it.`}
              </p>
            </div>
            {error && <p role="alert" className="mb-3 text-center text-[16px] text-danger">{error}</p>}
            <PrimaryButton type="button" onClick={handleMergeConfirm} disabled={merging} loading={merging}>
              {mergeMode === 'transfer' ? 'Transfer here' : 'Merge & continue'}
            </PrimaryButton>
            <div className="mt-3">
              <SecondaryButton type="button" onClick={handleMergeCancel} disabled={merging}>Cancel</SecondaryButton>
            </div>
            <p className="mt-3 text-center text-[16px] leading-relaxed text-white/50">Accounts are only merged when emails match exactly.</p>
          </>
        ) : (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-7 text-center">
            <Spinner size={20} />
            <p className="text-[16px] text-white/55">Signing in…</p>
          </div>
        )}
      </div>
    </AuthShell>
  );
};
