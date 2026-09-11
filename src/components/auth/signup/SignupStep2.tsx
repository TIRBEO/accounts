'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface SignupStep2Props {
  gender: string;
  setGender: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  profilePic: string | null;
  setProfilePic: (v: string | null) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  validateField: (field: string, value: string) => string | undefined;
  isSubmitting: boolean;
  step2Complete: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  height: '52px',
  background: '#111111',
  border: `1px solid ${hasError ? '#ed4956' : '#2a2a2a'}`,
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '16px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 24px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
});

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#a0a0a0',
  marginBottom: '6px',
  fontWeight: 500,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMaxDay(year: number, month: number): number {
  if (year <= 0 || month < 0 || month > 11) return 31;
  return new Date(year, month + 1, 0).getDate();
}

function parseDob(dob: string): { year: number; month: number; day: number } {
  if (!dob) return { year: 0, month: 0, day: 0 };
  const parts = dob.split('-').map(Number);
  return { year: parts[0] || 0, month: (parts[1] || 1) - 1, day: parts[2] || 1 };
}

function formatDate(y: number, m: number, d: number): string {
  if (y <= 0 || m < 0 || m > 11 || d <= 0) return '';
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const CURRENT_YEAR = new Date().getFullYear();
const MAX_AGE_YEAR = CURRENT_YEAR - 13;
const MIN_AGE_YEAR = CURRENT_YEAR - 100;

export const SignupStep2: React.FC<SignupStep2Props> = ({
  gender, setGender, dob, setDob, occupation, setOccupation,
  company, setCompany, role, setRole, profilePic, setProfilePic,
  errors, touched, handleBlur, validateField,
  isSubmitting, step2Complete, onSubmit,
}) => {
  const showDobError = touched.dob && errors.dob;
  const showGenderError = touched.gender && errors.gender;

  const { year, month, day } = parseDob(dob);
  const initialMaxDay = year > 0 && month >= 0 ? getMaxDay(year, month) : 31;
  const initialDay = day > 0 && day <= initialMaxDay ? day : 1;

  const [dobMonth, setDobMonth] = useState(month >= 0 ? month : 0);
  const [dobDay, setDobDay] = useState(day > 0 && day <= initialMaxDay ? day : 1);
  const [dobYear, setDobYear] = useState(year > 0 ? year : 0);

  useEffect(() => {
    setDob(formatDate(dobYear, dobMonth, dobDay));
  }, [dobYear, dobMonth, dobDay]);

  useEffect(() => {
    const max = getMaxDay(dobYear, dobMonth);
    setDobDay(dobDay > max ? max : dobDay);
  }, [dobYear, dobMonth, dobDay]);

  const handleMonthChange = (m: number) => {
    setDobMonth(m);
    const max = getMaxDay(dobYear, m);
    setDobDay(dobDay > max ? max : dobDay);
  };
  const handleDayChange = (d: number) => setDobDay(d);
  const handleYearChange = (y: number) => {
    setDobYear(y);
    const max = getMaxDay(y, dobMonth);
    setDobDay(dobDay > max ? max : dobDay);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) setProfilePic(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
    >
      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0095f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 style={{
          fontSize: '28px', fontWeight: 700, color: '#f5f5f5',
          marginBottom: '8px', fontFamily: TYPOGRAPHY.fontFamily,
        }}>
          Tell us about yourself
        </h2>
        <p style={{
          fontSize: '14px', color: '#707070', lineHeight: '22px',
          fontFamily: TYPOGRAPHY.fontFamily,
        }}>
          Help us personalize your Tirbeo experience.
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* LEFT COLUMN: Profile + Gender */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
          {/* Profile Picture Section */}
          <div style={{ width: '160px', textAlign: 'center' }}>
            <div style={{
              width: '140px', height: '140px', borderRadius: '50%',
              overflow: 'hidden', background: '#161616',
              border: '2px solid #2a2a2a', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}>
              {(profilePic) ? (
                <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#505050" strokeWidth="1.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('profile-pic-input')?.click()
            }
              style={{
                width: '36px', height: '36px', marginTop: '8px',
                borderRadius: '50%', background: '#0095f6',
                border: '2px solid #0d0d0d', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,149,246,0.3)',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,149,246,0.5)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,149,246,0.3)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </button>
            <input
              id="profile-pic-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => handleFileChange(e)}
            />
            <p style={{ fontSize: '12px', color: '#707070', marginTop: '6px' }}>
              Add photo
            </p>
          </div>

          {/* Gender dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <label style={{ ...labelStyle, textAlign: 'center' }}>Gender <span style={{ color: '#ed4956' }}>*</span></label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              onBlur={() => handleBlur('gender')}
              style={{
                ...inputStyle(!!showGenderError),
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23707070' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                paddingRight: '36px', cursor: 'pointer',
                color: gender ? '#f5f5f5' : '#707070',
              }}
            >
              <option value="" disabled>Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
            {touched.gender && errors.gender && (
              <p style={{ fontSize: '14px', color: '#ed4956', margin: 0, textAlign: 'center' }}>{errors.gender}</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DOB + fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* DOB */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ ...labelStyle }}>Date of Birth <span style={{ color: '#ed4956' }}>*</span></label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={dobMonth >= 0 ? dobMonth : ''}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                onBlur={() => handleBlur('dob')}
                style={{
                  ...inputStyle(!!showDobError),
                  flex: 2,
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23707070' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  paddingRight: '28px', paddingLeft: '12px',
                  cursor: 'pointer', color: dobMonth >= 0 ? '#f5f5f5' : '#707070',
                }}
              >
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={dobDay > 0 ? dobDay : ''}
                onChange={(e) => handleDayChange(Number(e.target.value))}
                onBlur={() => handleBlur('dob')}
                style={{
                  ...inputStyle(!!showDobError),
                  flex: 1,
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23707070' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  paddingRight: '28px', paddingLeft: '12px',
                  cursor: 'pointer', color: dobDay > 0 ? '#f5f5f5' : '#707070',
                }}
              >
                <option value="" disabled>Day</option>
                {Array.from({ length: getMaxDay(dobYear >= 0 ? dobYear : 2024, dobMonth >= 0 ? dobMonth : 0) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <select
                value={dobYear > 0 ? dobYear : ''}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                onBlur={() => handleBlur('dob')}
                style={{
                  ...inputStyle(!!showDobError),
                  flex: 1.5,
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23707070' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  paddingRight: '28px', paddingLeft: '12px',
                  cursor: 'pointer', color: dobYear > 0 ? '#f5f5f5' : '#707070',
                }}
              >
                <option value="" disabled>Year</option>
                {Array.from({ length: MAX_AGE_YEAR - MIN_AGE_YEAR + 1 }, (_, i) => {
                  const y = MAX_AGE_YEAR - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            {touched.dob && errors.dob && (
              <p style={{ fontSize: '14px', color: '#ed4956', margin: 0 }}>{errors.dob}</p>
            )}
          </div>

          {/* Occupation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ ...labelStyle }}>Occupation</label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              onBlur={() => handleBlur('occupation')}
              placeholder="e.g., Software Engineer"
              maxLength={100}
              style={inputStyle(false)}
            />
          </div>

          {/* Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ ...labelStyle }}>Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => handleBlur('company')}
              placeholder="e.g., Acme Inc"
              maxLength={100}
              style={inputStyle(false)}
            />
          </div>

          {/* Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ ...labelStyle }}>Role / Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onBlur={() => handleBlur('role')}
              placeholder="e.g., Senior Engineer"
              maxLength={100}
              style={inputStyle(false)}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

SignupStep2.displayName = 'SignupStep2';