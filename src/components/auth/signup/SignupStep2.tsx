'use client';

import React, { useState } from 'react';
import { Camera, ChevronDown, Trash2, UserRound } from 'lucide-react';
import { Field, PrimaryButton, SelectField, TextAreaField } from '../../ui/ig-ui';
import { GENDERS, WORK_KEYS, type WorkKey } from '../../../lib/profile-fields';
import { validateDob } from '../../../lib/validations';

interface SignupStep2Props {
  gender: string;
  setGender: (value: string) => void;
  dob: string;
  setDob: (value: string) => void;
  jobRole: string;
  setJobRole: (value: string) => void;
  jobCompany: string;
  setJobCompany: (value: string) => void;
  jobPlace: string;
  setJobPlace: (value: string) => void;
  jobStartedOn: string;
  setJobStartedOn: (value: string) => void;
  profilePic: string | null;
  // React 19 types useRef<HTMLInputElement>(null) as RefObject<HTMLInputElement | null>,
  // and RefObject is invariant in T, so the prop must include the null.
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveProfilePic: () => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  step2Complete: boolean;
  onSubmit: (event: React.FormEvent) => void;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
// Year range mirrors `validateDob` (min age 13, max 150) so a selectable date is
// always a valid one.
const MAX_AGE_YEAR = CURRENT_YEAR - 13;
const MIN_AGE_YEAR = CURRENT_YEAR - 100;
// Mirrors `GENDERS` in apps/myprofile/app/settings/edit-profile/page.tsx.
// The stored value IS the label, so a signup answer matches what the settings
// app's Gender picker compares against instead of painting an unselected
// `male`.
const GENDER_OPTIONS = GENDERS.map((g) => ({ value: g, label: g }));

function parseDob(v: string) {
  if (!v) return { year: 0, month: -1, day: 0 };
  const p = v.split('-').map(Number);
  return { year: p[0] || 0, month: p.length > 1 && p[1] ? p[1] - 1 : -1, day: p.length > 2 ? p[2] || 0 : 0 };
}
function formatDate(y: number, m: number, d: number) {
  if (y <= 0 || m < 0 || m > 11 || d <= 0) return '';
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
/** How many days to offer for a month — Feb depends on the chosen year, so fall
 *  back to 29 (the leap-day bound) until a year is picked. */
function daysFor(m: number, y: number) {
  if (m < 0) return 31;
  if (m === 1) return y > 0 ? daysInMonth(y, 1) : 29;
  return daysInMonth(2000, m);
}

const YEARS = Array.from({ length: MAX_AGE_YEAR - MIN_AGE_YEAR + 1 }, (_, i) => MAX_AGE_YEAR - i);

export const SignupStep2: React.FC<SignupStep2Props> = ({
  gender, setGender, dob, setDob, jobRole, setJobRole, jobCompany, setJobCompany, jobPlace, setJobPlace, jobStartedOn, setJobStartedOn,
  profilePic, fileInputRef, onFileSelect, onRemoveProfilePic, errors, touched, handleBlur, isSubmitting, step2Complete, onSubmit,
}) => {
  const workValue: Record<WorkKey, string> = { jobRole, jobCompany, jobPlace, jobStartedOn };
  const workSetter: Record<WorkKey, (v: string) => void> = {
    jobRole: setJobRole, jobCompany: setJobCompany, jobPlace: setJobPlace, jobStartedOn: setJobStartedOn,
  };
  const genderError = touched.gender ? errors.gender : undefined;

  const parsed = parseDob(dob);
  // Local cells seeded from the canonical ISO value. The composed ISO in `dob`
  // stays the single source the form submits — the selects are only a control
  // surface over it.
  const [mSel, setMSel] = useState(parsed.month >= 0 ? String(parsed.month) : '');
  const [dSel, setDSel] = useState(parsed.day ? String(parsed.day) : '');
  const [ySel, setYSel] = useState(parsed.year ? String(parsed.year) : '');

  const month = mSel === '' ? -1 : Number(mSel);
  const year = ySel === '' ? 0 : Number(ySel);
  const day = dSel === '' ? 0 : Number(dSel);

  const commit = (nextM: number, nextD: number, nextY: number) => {
    // Respect the chosen month's length: clamp the day when it would overflow.
    let d = nextD;
    if (nextM >= 0 && nextY > 0) d = Math.min(d, daysInMonth(nextY, nextM));
    setMSel(nextM >= 0 ? String(nextM) : '');
    setDSel(d > 0 ? String(d) : '');
    setYSel(nextY > 0 ? String(nextY) : '');
    setDob(nextM >= 0 && d > 0 && nextY > 0 ? formatDate(nextY, nextM, d) : '');
  };

  const dayCount = daysFor(month, year);
  // dobError is read live from the canonical value once touched, so a partially
  // built date never shows a premature "required" while the picker is mid-use.
  const dobError = touched.dob ? validateDob(dob) : undefined;

  return (
    <form onSubmit={onSubmit} className="signup-fields" noValidate>
      {/* Avatar picker — the plate shows the photo, the overlay carries the
          camera action and a trash badge removes it. */}
      <div className="avatar-pick">
        <div className="avatar-plate">
          {profilePic ? (
            <img src={profilePic} alt="Profile" className="size-full object-cover" />
          ) : (
            <UserRound className="avatar-ph" strokeWidth={1.4} />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            aria-label={profilePic ? 'Change profile photo' : 'Upload profile photo'}
            className="avatar-cta"
          >
            <span>
              <Camera className="size-5" />
              {profilePic ? 'Change' : 'Upload'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={onFileSelect}
            disabled={isSubmitting}
            className="hidden"
          />
          {profilePic && (
            <button
              type="button"
              onClick={onRemoveProfilePic}
              disabled={isSubmitting}
              aria-label="Remove profile photo"
              className="avatar-x"
            >
              <Trash2 className="size-5" />
            </button>
          )}
        </div>
        <p className="avatar-cap">
          Profile photo
          <span>Square • JPG PNG WebP • 5 MB — optional</span>
        </p>
      </div>

      {/* Gender */}
      <div>
        <SelectField
          label="Gender"
          value={gender}
          onChange={(v) => { if (!v) return; setGender(v); handleBlur('gender'); }}
          options={[{ value: '', label: 'Select gender' }, ...GENDER_OPTIONS]}
        />
        {genderError && (
          <p role="alert" className="tb-hint tb-error">{genderError}</p>
        )}
      </div>

      {/* Date of birth — three grouped selects composing one ISO value. */}
      <div>
        <span className="tb-label">Date of birth</span>
        <div className="dob-group">
          <div className="dob-cell">
            <select
              aria-label="Birth month"
              className={mSel === '' ? 'placeholder' : ''}
              value={mSel}
              onChange={(e) => commit(e.target.value === '' ? -1 : Number(e.target.value), day, year)}
              onBlur={() => handleBlur('dob')}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i)}>{m}</option>
              ))}
            </select>
            <ChevronDown aria-hidden />
          </div>
          <div className="dob-cell">
            <select
              aria-label="Birth day"
              className={dSel === '' ? 'placeholder' : ''}
              value={dSel}
              onChange={(e) => commit(month, e.target.value === '' ? 0 : Number(e.target.value), year)}
              onBlur={() => handleBlur('dob')}
            >
              <option value="">Day</option>
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>{d}</option>
              ))}
            </select>
            <ChevronDown aria-hidden />
          </div>
          <div className="dob-cell">
            <select
              aria-label="Birth year"
              className={ySel === '' ? 'placeholder' : ''}
              value={ySel}
              onChange={(e) => commit(month, day, e.target.value === '' ? 0 : Number(e.target.value))}
              onBlur={() => handleBlur('dob')}
            >
              <option value="">Year</option>
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <ChevronDown aria-hidden />
          </div>
        </div>
        {dobError && (
          <p role="alert" className="tb-hint tb-error">{dobError}</p>
        )}
      </div>

      {/* Work — collapsed by default; same four questions as the settings
          app's "Personal details → Work" sheet. Optional; updateable later. */}
      <details className="work-box">
        <summary>
          <span>
            Work details <em>Optional</em>
          </span>
          <ChevronDown aria-hidden />
        </summary>
        <div className="work-body">
          {WORK_KEYS.map((key) =>
            key === 'jobStartedOn' ? (
              <Field
                key={key}
                label={WORK_FIELDS_LABEL[key]}
                placeholder={WORK_FIELDS_PLACEHOLDER[key]}
                value={workValue[key]}
                onChange={(e) => workSetter[key](e.target.value)}
                onBlur={() => handleBlur(key)}
                maxLength={10}
                disabled={isSubmitting}
                error={touched[key] ? errors[key] : undefined}
              />
            ) : (
              <TextAreaField
                key={key}
                label={WORK_FIELDS_LABEL[key]}
                placeholder={WORK_FIELDS_PLACEHOLDER[key]}
                value={workValue[key]}
                onChange={(e) => workSetter[key](e.target.value)}
                onBlur={() => handleBlur(key)}
                maxLength={120}
                disabled={isSubmitting}
                error={touched[key] ? errors[key] : undefined}
              />
            ),
          )}
        </div>
      </details>

      <PrimaryButton type="submit" disabled={!step2Complete} loading={isSubmitting}>
        Next
      </PrimaryButton>
    </form>
  );
};

/* Work field labels/placeholders kept inline so the optional block stays calm;
   sourced from the shared profile-fields contract. */
const WORK_FIELDS_LABEL: Record<WorkKey, string> = {
  jobRole: 'Job title',
  jobCompany: 'Company',
  jobPlace: 'Work location',
  jobStartedOn: 'Started in',
};
const WORK_FIELDS_PLACEHOLDER: Record<WorkKey, string> = {
  jobRole: 'Product engineer',
  jobCompany: 'Tirbeo',
  jobPlace: 'Kathmandu, Nepal',
  jobStartedOn: '2022',
};

SignupStep2.displayName = 'SignupStep2';
