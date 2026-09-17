import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Camera, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { GitHubIcon, GoogleIcon, DiscordIcon } from './SocialIcons';
import { MobileConsentSheet } from './auth/MobileConsentSheet';
const ImageCropEditor = React.lazy(() => import('./ImageCropEditor'));
import { uploadAvatarViaApi } from '../lib/api';
import { getCurrentUser, oauthConsent, updateProfile, apiPost, verifyMagicLink } from '../lib/api';
import type { CurrentUserData } from '../lib/api';
import { isAllowedRedirectTarget, DEFAULT_DASHBOARD_URL } from '../lib/redirect';
import { haptic } from '../lib/haptics';

const PROVIDER_LABELS: Record<string, string> = { github: 'GitHub', google: 'Google', discord: 'Discord' };
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  github: <GitHubIcon className="w-5 h-5 text-[#FAFAFA]" />,
  google: <GoogleIcon className="w-5 h-5" />,
  discord: <DiscordIcon className="w-5 h-5 text-[#5865F2]" />,
};

function getParam(key: string): string { return new URLSearchParams(window.location.search).get(key) || ''; }
function sanitizeTarget(raw: string): string { if (!raw) return DEFAULT_DASHBOARD_URL; if (isAllowedRedirectTarget(raw)) return raw; return DEFAULT_DASHBOARD_URL; }
const verifiedMagicTokens = new Set<string>();

interface CallbackViewProps { onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void; }

export const CallbackView: React.FC<CallbackViewProps> = ({ onToast }) => {
  const [user, setUser] = useState<CurrentUserData | null>(null);
  const [checking, setChecking] = useState(true);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => { const onResize = () => setIsMobile(window.innerWidth < 640); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);

  const isMerge = getParam('oauth') === 'merge';
  const mergeMode: 'login' | 'transfer' = getParam('mode') === 'transfer' ? 'transfer' : 'login';
  const mergeToken = getParam('token');
  const provider = getParam('provider') || '';
  const providerLabel = PROVIDER_LABELS[provider] || provider || 'sign-in';
  const redirectTo = sanitizeTarget(getParam('redirect_to'));
  const isNewOAuthUser = getParam('oauth') === 'new';
  const magicToken = getParam('magic_token');

  const [magicStatus, setMagicStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [magicError, setMagicError] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          try { new BroadcastChannel('tirbeo:session')?.postMessage({ type: 'login', ts: Date.now() }); } catch {}
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
    let cancelled = false;
    getCurrentUser().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setUser(res.data);
      else { const status = (res as any)?.status; if (status === 401 || status === 403) onToast?.('Please sign in to continue.', 'info'); else onToast?.('Unable to verify session. Please sign in again.', 'error'); }
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
  const handleContinue = async () => {
    setError(''); setSaving(true);
    const result = await oauthConsent({ policyAccepted: true });
    setSaving(false);
    if (!result.ok) { const msg = result.error || 'Could not save your consent. Please try again.'; setError(msg); onToast?.(msg, 'error'); haptic('error'); return; }
    haptic('success');
    if (profilePic && user?.id) {
      try {
        const m = profilePic.match(/^data:([^;]+);base64,(.+)$/);
        let blob: Blob;
        if (m) { const raw = atob(m[2]); const bytes = new Uint8Array(raw.length); for (let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i); blob = new Blob([bytes], { type: m[1] }); }
        else blob = new Blob([profilePic], { type: 'image/jpeg' });
        const { url } = await uploadAvatarViaApi(blob); if (url) await updateProfile({ photoUrl: url }).catch(()=>{});
      } catch {}
    }
    window.location.href = redirectTo;
  };
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!allowed.includes(file.type)) { onToast?.('Please select a JPEG, PNG, GIF, or WebP image.', 'error'); return; }
    if (file.size > 5*1024*1024) { onToast?.('Image must be less than 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; if (!url || url.length < 100) { onToast?.('Failed to read image file.', 'error'); return; } setTempImageUrl(url); setShowImageEditor(true); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onToast]);
  const handleCropImage = useCallback((cropped: string) => { setProfilePic(cropped); setShowImageEditor(false); setTempImageUrl(null); }, []);
  const handleCancelCrop = useCallback(() => { setTempImageUrl(null); setShowImageEditor(false); }, []);
  const handleRemovePic = useCallback(() => setProfilePic(null), []);

  const cardStyle: React.CSSProperties = {
    position: 'relative', zIndex: 10, width: '100%', maxWidth: 'min(580px, 100vw - 32px)',
    background: 'rgba(18,18,20,0.90)', backdropFilter: 'blur(24px) saturate(1.25)', WebkitBackdropFilter: 'blur(24px) saturate(1.25)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
    padding: typeof window !== 'undefined' && window.innerWidth <= 640 ? '20px' : '28px', boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset, 0 32px 80px rgba(0,0,0,0.60), 0 0 40px rgba(0,149,246,0.05)',
    overflow: 'hidden',
  };

  if (magicToken) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : '28px' }}>
        <motion.div initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }} style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '68%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,149,246,0.20), transparent)' }} />
          {magicStatus === 'verifying' || checking ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '24px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FFFFFF', display: 'grid', placeItems: 'center', boxShadow: '0 4px 18px rgba(255,255,255,0.10), 0 0 20px rgba(0,149,246,0.12)' }}>
                <Mail size={24} color="#09090B" style={{ animation: 'pulse-glow 1.6s ease infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color: '#FAFAFA', margin: 0, lineHeight: 1.1 }}>Verifying <em style={{ fontStyle: 'normal', color: '#0095F6', fontWeight: 700 }}>magic link</em></h1>
                <p style={{ fontSize: '13.5px', color: '#71717A', margin: '8px 0 0' }}>One-time link — please wait</p>
              </div>
              <p style={{ fontSize: '15px', color: '#71717A', margin: 0, padding: '8px 14px', background: 'rgba(0,149,246,0.06)', border: '1px solid rgba(0,149,246,0.10)', borderRadius: '999px' }}>Verifying magic link…</p>
            </div>
          ) : magicStatus === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#10B981', display: 'grid', placeItems: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.28)' }}>
                <CheckCircle2 size={26} color="#fff" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color: '#FAFAFA', margin: 0, lineHeight: 1.1 }}>You&apos;re <em style={{ fontStyle: 'normal', color: '#0095F6', fontWeight: 700 }}>signed in</em></h1>
                <p style={{ fontSize: '17px', color: '#A1A1AA', margin: '8px 0 0', lineHeight: 1.6 }}>Magic link verified — opening your workspace.</p>
              </div>
              <div style={{ width: '100%', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: '8px' }}>
                <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, #0095F6, #0095F6)', borderRadius: '999px' }} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 0.85, ease: 'easeOut' }} />
              </div>
              <p style={{ fontSize: '11px', color: '#52525B' }}>Redirecting to {redirectTo.replace(/^https?:\/\//,'').slice(0,32)}…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.14)', display: 'grid', placeItems: 'center' }}>
                <Mail size={24} color="#F43F5E" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color: '#FAFAFA', margin: 0 }}>Link expired or already used</h1>
                <p style={{ fontSize: '17px', color: '#A1A1AA', margin: '8px 0 0', lineHeight: 1.6 }}>{magicError || 'This magic link is invalid or already used. Each link works once only.'}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button onClick={() => window.location.href = '/'} style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#0095F6', color: '#FFFFFF', fontSize: '17px', fontWeight: 700, border: '1px solid #0095F6', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,149,246,0.28)' }}>Back to login</button>
                <button onClick={() => window.location.href = `/login?email=${encodeURIComponent(getParam('email')||'')}`} style={{ flex: 1, height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: '#FAFAFA', fontSize: '17px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>New link</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: typeof window !== 'undefined' && window.innerWidth <= 640 ? '12px' : '28px' }}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }} style={cardStyle}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '68%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,149,246,0.20), transparent)' }} />
        {checking ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '28px 0' }}>
            <p style={{ fontSize: '19px', color: '#71717A' }}>Finishing sign-in…</p>
          </div>
        ) : isMerge ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', marginBottom: '12px' }}>
                {PROVIDER_ICONS[provider] || <ShieldCheck size={20} color="#FAFAFA" />}
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: '#FAFAFA', margin: 0 }}>{mergeMode === 'transfer' ? `Transfer ${providerLabel} here?` : `Merge ${providerLabel} account?`}</h1>
              <p style={{ fontSize: '19px', color: '#A1A1AA', lineHeight: 1.6, maxWidth: '320px', margin: '8px 0 0' }}>
                {mergeMode === 'transfer' ? `This ${providerLabel} account is linked to another account. Transfer moves sign-in to your current account.` : `An existing account shares this email. Merging links ${providerLabel} sign-in to it.`}
              </p>
            </div>
            {error && <p style={{ fontSize: '15px', color: '#F43F5E', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
            <button type="button" onClick={handleMergeConfirm} disabled={merging} style={{ width: '100%', height: '44px', borderRadius: '12px', background: '#0095F6', color: '#FFFFFF', fontSize: '17px', fontWeight: 700, border: '1px solid #0095F6', cursor: merging ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: merging ? 0.6 : 1, boxShadow: '0 4px 16px rgba(0,149,246,0.28)' }}>
              {merging ? <span>Please wait…</span> : <><span>{mergeMode === 'transfer' ? 'Transfer here' : 'Merge & continue'}</span><ArrowRight size={16} /></>}
            </button>
            <button type="button" onClick={handleMergeCancel} disabled={merging} style={{ width: '100%', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', color: '#A1A1AA', fontSize: '17px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', marginTop: '10px' }}>Cancel</button>
            <p style={{ fontSize: '11px', color: '#52525B', textAlign: 'center', lineHeight: 1.5, marginTop: '10px' }}>Accounts are only merged when emails match exactly.</p>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', marginBottom: '12px' }}>
                {PROVIDER_ICONS[provider] || <Sparkles size={20} color="#FAFAFA" />}
              </div>
              <p style={{ fontSize: '19px', color: '#A1A1AA', lineHeight: 1.6, maxWidth: '320px', margin: 0 }}>
                {isNewOAuthUser ? <>No account yet — continuing creates one linked to your {providerLabel} sign-in.{user?.email && <><br /><span style={{ color: '#FAFAFA', fontWeight: 600 }}>{user.email}</span></>}</> : 'One last step before your workspace.'}
              </p>
            </div>
            {isMobile ? (
              <MobileConsentSheet isOpen={true} onClose={handleMergeCancel} provider={provider} isNewOAuthUser={isNewOAuthUser} email={user?.email} saving={saving} error={error} onContinue={({ consent: c, profilePic: pic }) => { setConsent(c); if (pic) setProfilePic(pic); handleContinue(); }} />
            ) : (
              <>
                <button type="button" onClick={() => setConsent(!consent)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '12px', border: `1px solid ${consent ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)'}`, background: consent ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ marginTop: '1px', width: '18px', height: '18px', borderRadius: '5px', display: 'grid', placeItems: 'center', flexShrink: 0, border: `1.5px solid ${consent ? '#FFFFFF' : 'rgba(255,255,255,0.18)'}`, background: consent ? '#FFFFFF' : 'transparent' }}>
                    {consent && <CheckCircle2 size={12} color="#09090B" />}
                  </span>
                  <span style={{ fontSize: '19px', color: '#A1A1AA', lineHeight: 1.6 }}>I agree to the Tirbeo Terms and Privacy Policy.<span style={{ color: '#F43F5E' }}>*</span></span>
                </button>
                {isNewOAuthUser && (
                  <div style={{ marginTop: '14px' }}>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileSelect} style={{ display: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload profile photo" style={{ position: 'relative', flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <div style={{ width: '56px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                          {profilePic ? <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={20} color="#71717A" />}
                        </div>
                        <span style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF', display: 'grid', placeItems: 'center', border: '2px solid #141416' }}><Camera size={9} color="#09090B" /></span>
                      </button>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '19px', fontWeight: 600, color: '#FAFAFA', margin: 0 }}>Profile photo</p>
                        <p style={{ fontSize: '14px', color: '#71717A', margin: '2px 0 0' }}>Optional — JPG, PNG, GIF, WebP · 5MB</p>
                        {profilePic && <button type="button" onClick={handleRemovePic} style={{ marginTop: '4px', fontSize: '14px', color: '#F43F5E', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Remove photo</button>}
                      </div>
                    </div>
                  </div>
                )}
                {error && <p style={{ fontSize: '15px', color: '#F43F5E', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
                <button type="button" onClick={handleContinue} disabled={!consent || saving} style={{ width: '100%', height: '44px', borderRadius: '12px', background: !consent || saving ? 'rgba(255,255,255,0.08)' : '#0095F6', color: !consent || saving ? '#71717A' : '#FFFFFF', fontSize: '17px', fontWeight: 700, border: `1px solid ${!consent || saving ? 'rgba(255,255,255,0.06)' : '#0095F6'}`, cursor: !consent || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px', boxShadow: !consent || saving ? 'none' : '0 4px 16px rgba(0,149,246,0.28)', opacity: !consent ? 0.9 : 1 }}>
                  {saving ? <span>Please wait…</span> : <><span>{isNewOAuthUser ? 'Create account & continue' : 'Continue to workspace'}</span><ArrowRight size={16} /></>}
                </button>
                <p style={{ fontSize: '11px', color: '#52525B', textAlign: 'center', lineHeight: 1.5, marginTop: '10px' }}>Set a password and manage connected services from dashboard settings.</p>
              </>
            )}
          </>
        )}
      </motion.div>
      {showImageEditor && tempImageUrl && (
        <React.Suspense fallback={null}>
          <ImageCropEditor imageUrl={tempImageUrl} onCrop={handleCropImage} onCancel={handleCancelCrop} outputSize={512} />
        </React.Suspense>
      )}
    </div>
  );
};
