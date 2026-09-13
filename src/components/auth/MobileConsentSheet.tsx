import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Camera } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  discord: 'Discord',
};

interface MobileConsentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (opts: {
    consent: boolean;
    profilePic: string | null;
  }) => void;
  provider: string;
  isNewOAuthUser: boolean;
  email?: string;
  saving?: boolean;
  error?: string;
}

export const MobileConsentSheet: React.FC<MobileConsentSheetProps> = ({
  isOpen,
  onClose,
  onContinue,
  provider,
  isNewOAuthUser,
  email,
  saving = false,
  error,
}) => {
  const [consent, setConsent] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setConsent(false);
      setProfilePic(null);
      setPwOpen(false);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowed.includes(file.type)) return;
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfilePic(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [],
  );

  const handleContinue = () => {
    onContinue({ consent, profilePic });
  };

  const providerLabel = PROVIDER_LABELS[provider] || provider || 'sign-in';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Complete sign-in">
      <div className="flex flex-col gap-5">
        {/* Provider info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tb-surface-container)] border border-[var(--tb-outline-variant)]">
            <CheckCircle2 className="w-5 h-5 text-[var(--tb-text)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--tb-text)]">
              {isNewOAuthUser
                ? `Sign up with ${providerLabel}`
                : `Signed in with ${providerLabel}`}
            </p>
            {email && (
              <p className="text-xs text-[var(--tb-on-surface-variant)]">
                {email}
              </p>
            )}
          </div>
        </div>

        {/* Consent checkbox */}
        <button
          type="button"
          onClick={() => setConsent(!consent)}
          className={`w-full flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left ${
            consent
              ? 'bg-[var(--tb-surface-container-low)] border-[var(--tb-outline-variant)]'
              : 'bg-[var(--tb-surface-container-low)] border-[var(--tb-outline-variant)]'
          }`}
          role="checkbox"
          aria-checked={consent}
        >
          <span
            className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${
              consent
                ? 'bg-[var(--tb-primary)] border-[var(--tb-primary)]'
                : 'border-[var(--tb-outline-variant)]'
            }`}
          >
            {consent && (
              <CheckCircle2 className="w-4 h-4 text-[var(--tb-on-primary)]" />
            )}
          </span>
          <span className="text-sm text-[var(--tb-on-surface-variant)] leading-relaxed">
            I agree to the Tirbeo Terms of Service and acknowledge the Privacy
            Policy, including data processing for my account.{' '}
            <span className="text-[var(--tb-text)]">*</span>
          </span>
        </button>

        {/* Profile picture (new users only) */}
        {isNewOAuthUser && (
          <div>
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
                <div className="w-14 h-14 rounded-full bg-[var(--tb-surface-container-low)] border-2 border-dashed border-[var(--tb-outline-variant)] flex items-center justify-center overflow-hidden group-hover:border-[var(--tb-primary)] transition-all">
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-[var(--tb-on-surface-variant)] group-hover:text-[var(--tb-text)] transition-colors" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--tb-primary)] flex items-center justify-center shadow-lg">
                  <Camera className="w-3 h-3 text-[var(--tb-on-primary)]" />
                </span>
              </button>
              <div className="text-left">
                <p className="text-sm text-[var(--tb-on-surface-variant)]">
                  Profile photo
                </p>
                <p className="text-xs text-[var(--tb-on-surface-variant)] mt-0.5">
                  Optional — JPEG, PNG, GIF, WebP
                </p>
                {profilePic && (
                  <button
                    type="button"
                    onClick={() => setProfilePic(null)}
                    className="mt-1 text-xs text-[var(--tb-error)] hover:text-[var(--tb-error)] font-medium cursor-pointer"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Password toggle (new users) */}
        {isNewOAuthUser && (
          <button
            type="button"
            onClick={() => setPwOpen(!pwOpen)}
            className="text-sm text-[var(--tb-on-surface-variant)] underline underline-offset-2 hover:text-[var(--tb-text)] transition-colors text-left"
          >
            {pwOpen ? 'Hide password setup' : 'Add a password (optional)'}
          </button>
        )}

        {isNewOAuthUser && pwOpen && (
          <div className="p-4 rounded-xl border border-[var(--tb-outline-variant)] bg-[var(--tb-surface-container-low)]">
            <p className="text-xs text-[var(--tb-on-surface-variant)] mb-3">
              You can set a password from your dashboard settings after signup.
            </p>
            <button
              type="button"
              onClick={() => setPwOpen(false)}
              className="text-xs text-[var(--tb-on-surface-variant)] underline"
            >
              Skip for now
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-[var(--tb-error)]">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-full border border-[var(--tb-outline-variant)] py-3 text-sm font-medium text-[var(--tb-on-surface-variant)] transition hover:bg-[var(--tb-state-hover)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!consent || saving}
            className="flex-[1.4] flex items-center justify-center gap-2 rounded-full bg-[var(--tb-primary)] py-3 text-sm font-bold text-[var(--tb-on-primary)] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span>Please wait…</span>
            ) : (
              <>
                <span className="relative z-10">
                  {isNewOAuthUser ? 'Create account' : 'Continue'}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
              </>
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default MobileConsentSheet;
