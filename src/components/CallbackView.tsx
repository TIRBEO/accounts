import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Camera, Loader2, ShieldCheck } from 'lucide-react';
import { GitHubIcon, GoogleIcon, DiscordIcon } from './SocialIcons';
import { ImageCropEditor } from './ImageCropEditor';
import { uploadAvatar } from '../lib/supabase';
import { getCurrentUser, oauthConsent, updateProfile, apiPost } from '../lib/api';
import type { CurrentUserData } from '../lib/api';

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  discord: 'Discord',
};

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  github: <GitHubIcon className="w-6 h-6 text-[var(--wave-text)]" />,
  google: <GoogleIcon className="w-6 h-6" />,
  discord: <DiscordIcon className="w-6 h-6 text-[#5865F2]" />,
};

function getParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) || '';
}

function sanitizeTarget(raw: string): string {
  const fallback = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard.tirbeo.app';
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    const isTirbeo = u.hostname === 'tirbeo.app' || u.hostname.endsWith('.tirbeo.app');
    if (!isLocal && !isTirbeo) return fallback;
    if (!isLocal && u.protocol !== 'https:') return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

/**
 * Landing view after an OAuth provider returns the user to the accounts app
 * (the API redirects here with ?oauth=new&provider=…&redirect_to=…).
 *
 * Brand-new social accounts arrive without recorded policy consent — this
 * screen collects it (required) and then releases the user to their redirect
 * target. Optional password setup is intentionally left to dashboard settings;
 * the goal here is to get the user through in one click.
 */
interface CallbackViewProps {
  /** Shared toast emitter (message, optional explicit type). */
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CallbackView: React.FC<CallbackViewProps> = ({ onToast }) => {
  const [user, setUser] = useState<CurrentUserData | null>(null);
  const [checking, setChecking] = useState(true);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  // Merge flow: API redirected here with ?oauth=merge&mode=login|transfer&provider=…&token=…
  const isMerge = getParam('oauth') === 'merge';
  const mergeMode: 'login' | 'transfer' = getParam('mode') === 'transfer' ? 'transfer' : 'login';
  const mergeToken = getParam('token');
  const provider = getParam('provider') || '';
  const providerLabel = PROVIDER_LABELS[provider] || provider || 'sign-in';
  const redirectTo = sanitizeTarget(getParam('redirect_to'));
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard.tirbeo.app';
  const isNewOAuthUser = getParam('oauth') === 'new';

  // Optional password setup for freshly-created OAuth accounts.
  const [pwOpen, setPwOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState('');

  // Profile picture
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMerge) { setChecking(false); return; } // merge screen needs no session check
    let cancelled = false;
    getCurrentUser().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setUser(res.data);
      else onToast?.('Your session could not be verified. Please sign in again.', 'error');
      setChecking(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMergeConfirm = async () => {
    setError('');
    setMerging(true);
    // login-merge: guest, authorized purely by the signed token.
    // transfer: session-based → authed integrations endpoint (CSRF via apiPost).
    const result = mergeMode === 'transfer'
      ? await apiPost<{ ok: boolean }>('/api/integrations/merge', { merge_token: mergeToken, action: 'merge' })
      : await apiPost<{ ok: boolean; redirect_to: string }>('/api/auth/oauth/merge', { token: mergeToken });
    if (!result.ok) {
      const msg = result.error || 'Could not complete the merge. Please sign in again.';
      setError(msg);
      onToast?.(msg, 'error');
      setMerging(false);
      return;
    }
    window.location.href = mergeMode === 'transfer'
      ? `${dashboardUrl}/account/apps?connected=${provider}`
      : sanitizeTarget((result.data as { redirect_to?: string })?.redirect_to || dashboardUrl);
  };

  const handleMergeCancel = () => {
    window.location.href = mergeMode === 'transfer' ? `${dashboardUrl}/account/apps` : '/';
  };

  const handleSendCode = async () => {
    setPwError('');
    setSendingCode(true);
    const r = await apiPost('/api/auth/email-otp/request', {});
    setSendingCode(false);
    if (!r.ok) { setPwError(r.error || 'Could not send the verification code.'); return; }
    setOtpSent(true);
  };

  const handleSavePassword = async () => {
    setPwError('');
    if (otp.trim().length !== 6) { setPwError('Enter the 6-digit code we emailed you.'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setSavingPw(true);
    const r = await apiPost('/api/security/set-password', { password: newPw, otpCode: otp.trim() });
    setSavingPw(false);
    if (!r.ok) { setPwError(r.error || 'Could not set your password. Try again.'); return; }
    setPwDone(true);
    onToast?.('Password added — you can now sign in with email too.', 'success');
  };

  const handleContinue = async () => {
    setError('');
    setSaving(true);
    // Record policy consent via the dedicated OAuth consent endpoint, which
    // also marks the account as emailVerified (social providers already
    // verified the email).
    const result = await oauthConsent({
      policyAccepted: true,
    });
    setSaving(false);
    if (!result.ok) {
      const msg = result.error || 'Could not save your consent. Please try again.';
      setError(msg);
      onToast?.(msg, 'error');
      return;
    }
    // Upload profile picture if one was selected (best-effort, don't block redirect)
    if (profilePic && user?.id) {
      try {
        const { url, error: uploadErr } = await uploadAvatar(user.id, profilePic);
        if (url) {
          await updateProfile({ photoUrl: url }).catch(() => {});
        } else if (uploadErr) {
          console.warn('Avatar upload error:', uploadErr);
        }
      } catch (err) {
        console.warn('Avatar upload failed:', err);
      }
    }
    window.location.href = redirectTo;
  };

  // ═══ PROFILE PICTURE HANDLERS ═══
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { onToast?.('Please select a JPEG, PNG, GIF, or WebP image.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { onToast?.('Image must be less than 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (!url || url.length < 100) { onToast?.('Failed to read image file.', 'error'); return; }
      setTempImageUrl(url);
      setShowImageEditor(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onToast]);

  const handleCropImage = useCallback((cropped: string) => {
    setProfilePic(cropped);
    setShowImageEditor(false);
    setTempImageUrl(null);
  }, []);

  const handleCancelCrop = useCallback(() => {
    setTempImageUrl(null);
    setShowImageEditor(false);
  }, []);

  const handleRemovePic = useCallback(() => {
    setProfilePic(null);
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--wave-bg)] text-[var(--wave-text)] overflow-hidden flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px] wave-card p-7 sm:p-8"
      >
        {checking ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--wave-text)]" />
            <p className="text-sm text-[var(--wave-on-surface-variant)]">Finishing sign-in…</p>
          </div>
        ) : isMerge ? (
          <>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[var(--wave-surface-container)] border border-[var(--wave-outline-variant)] flex items-center justify-center mb-4">
                {PROVIDER_ICONS[provider] || <ShieldCheck className="w-6 h-6 text-[var(--wave-text)]" />}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--wave-text)] mb-1.5">
                {mergeMode === 'transfer' ? `Transfer ${providerLabel} here?` : `Merge ${providerLabel} account?`}
              </h1>
              <p className="text-sm text-[var(--wave-on-surface-variant)] leading-relaxed">
                {mergeMode === 'transfer'
                  ? `This ${providerLabel} account is currently linked to a different Tirbeo account. Transferring moves the sign-in to your current account and disconnects it there.`
                  : `We found an existing Tirbeo account with the same email as your ${providerLabel} account. Merging links ${providerLabel} sign-in to that account — nothing else changes.`}
              </p>
            </div>

            {error && <p className="text-xs text-[var(--wave-error)] mb-3 text-center">{error}</p>}

            <button type="button" onClick={handleMergeConfirm} disabled={merging} className="wave-btn wave-btn-primary">
              {merging ? (
                <Loader2 className="w-5 h-5 animate-spin text-[var(--wave-on-primary)] relative z-10" />
              ) : (
                <>
                  <span className="relative z-10">{mergeMode === 'transfer' ? 'Transfer here' : 'Merge & continue'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
                </>
              )}
            </button>

            <button type="button" onClick={handleMergeCancel} disabled={merging} className="wave-btn wave-btn-secondary mt-3">
              Cancel
            </button>

            <p className="text-xs text-[var(--wave-on-surface-variant)] text-center leading-relaxed mt-4">
              Accounts are only ever merged when the email addresses match exactly.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--wave-surface-container)] border border-[var(--wave-outline-variant)] flex items-center justify-center mb-4">
                {PROVIDER_ICONS[provider] || <CheckCircle2 className="w-6 h-6 text-[var(--wave-text)]" />}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--wave-text)] mb-1.5">
                {isNewOAuthUser ? 'Create your Tirbeo account' : "You're signed in"}
              </h1>
              <p className="text-sm text-[var(--wave-on-surface-variant)] leading-relaxed">
                {isNewOAuthUser ? (
                  <>
                    No Tirbeo account exists for this email yet — continuing will
                    create one linked to your {providerLabel} sign-in.
                    {user?.email && (
                      <>
                        <br />
                        <span className="text-[var(--wave-text)] font-medium">{user.email}</span>
                      </>
                    )}
                  </>
                ) : (
                  'One last step before we take you to your workspace.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConsent(!consent)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left ${
                consent
                  ? 'bg-[var(--wave-surface-container-low)] border-[var(--wave-outline-variant)]'
                  : 'bg-[var(--wave-surface-container-low)] border-[var(--wave-outline-variant)] hover:bg-[var(--wave-surface-container-low)]'
              }`}
              role="checkbox"
              aria-checked={consent}
            >
              <span
                className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${
                  consent ? 'bg-[var(--wave-primary)] border-[var(--wave-primary)]' : 'border-[var(--wave-outline-variant)]'
                }`}
              >
                {consent && <CheckCircle2 className="w-4 h-4 text-[var(--wave-on-primary)]" />}
              </span>
              <span className="text-sm text-[var(--wave-on-surface-variant)] leading-relaxed">
                I agree to the Tirbeo Terms of Service and acknowledge the Privacy Policy,
                including data processing for my account. <span className="text-[var(--wave-text)]">*</span>
              </span>
            </button>

            {/* ── Profile picture (new OAuth users) ── */}
            {isNewOAuthUser && (
              <div className="mt-4">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full bg-[var(--wave-surface-container-low)] border-2 border-dashed border-[var(--wave-outline-variant)] flex items-center justify-center overflow-hidden group-hover:border-[var(--wave-primary)] transition-all">
                      {uploadingPic ? (
                        <Loader2 className="w-6 h-6 text-[var(--wave-text)] animate-spin" />
                      ) : profilePic ? (
                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-[var(--wave-on-surface-variant)] group-hover:text-[var(--wave-text)] transition-colors" />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--wave-primary)] flex items-center justify-center shadow-lg">
                      {uploadingPic ? (
                        <Loader2 className="w-3 h-3 text-[var(--wave-on-primary)] animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3 text-[var(--wave-on-primary)]" />
                      )}
                    </span>
                  </button>
                  <div className="text-left">
                    <p className="text-sm text-[var(--wave-on-surface-variant)]">Profile photo</p>
                    <p className="text-xs text-[var(--wave-on-surface-variant)] mt-0.5">Optional — JPEG, PNG, GIF, WebP • Max 5MB</p>
                    {profilePic && (
                      <button
                        type="button"
                        onClick={handleRemovePic}
                        className="mt-1 text-xs text-[var(--wave-error)] hover:text-[var(--wave-error)] font-medium cursor-pointer transition-colors"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isNewOAuthUser && (
              <div className="mt-4">
                {!pwOpen ? (
                  pwDone ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--wave-success)]/30 bg-[var(--wave-success-container)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--wave-success)]" />
                      <span className="text-sm text-[var(--wave-success)]">Password added to your account</span>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setPwOpen(true)} className="wave-btn wave-btn-secondary">
                      Add a password (optional)
                    </button>
                  )
                ) : (
                  <div className="p-4 rounded-xl border border-[var(--wave-outline-variant)] bg-[var(--wave-surface-container-low)] space-y-3">
                    {!otpSent ? (
                      <>
                        <p className="text-xs text-[var(--wave-on-surface-variant)]">We'll email you a 6-digit code to verify it's you.</p>
                        <button type="button" onClick={handleSendCode} disabled={sendingCode} className="wave-btn wave-btn-secondary">
                          {sendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Email me a verification code'}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          className="wave-input text-center tracking-[0.3em]"
                          placeholder="••••••"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        />
                        <input
                          className="wave-input"
                          type="password"
                          placeholder="New password (min 8 characters)"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                        />
                        <input
                          className="wave-input"
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                        />
                      </>
                    )}
                    {pwError && <p className="text-xs text-[var(--wave-error)]">{pwError}</p>}
                    {otpSent && (
                      <div className="flex gap-2">
                        <button type="button" onClick={handleSavePassword} disabled={savingPw} className="wave-btn wave-btn-primary flex-1">
                          {savingPw ? <Loader2 className="w-4 h-4 animate-spin text-[var(--wave-on-primary)] relative z-10" /> : <span className="relative z-10">Save password</span>}
                        </button>
                        <button type="button" onClick={() => { setPwOpen(false); setOtpSent(false); setOtp(''); setNewPw(''); setConfirmPw(''); setPwError(''); }} className="wave-btn wave-btn-secondary flex-1">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-[var(--wave-error)] mt-3">{error}</p>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!consent || saving}
              className="wave-btn wave-btn-primary mt-5"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin text-[var(--wave-on-primary)] relative z-10" />
              ) : (
                <>
                  <span className="relative z-10">{isNewOAuthUser ? 'Create account & continue' : 'Continue'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
                </>
              )}
            </button>

            <p className="text-xs text-[var(--wave-on-surface-variant)] text-center leading-relaxed mt-4">
              You can set a password and manage connected services anytime from your
              dashboard settings.
            </p>
          </>
        )}
      </motion.div>

      {/* Image Crop Editor */}
      {showImageEditor && tempImageUrl && (
        <ImageCropEditor
          imageUrl={tempImageUrl}
          onCrop={handleCropImage}
          onCancel={handleCancelCrop}
          outputSize={512}
        />
      )}
    </div>
  );
};
