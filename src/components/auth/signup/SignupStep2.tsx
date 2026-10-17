'use client';

import React, { useEffect, useState } from 'react';
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Trash2, UserRound } from 'lucide-react';
import { Field, PrimaryButton, SelectField, TextAreaField } from '../../ui/ig-ui';
import { GENDERS, WORK_FIELDS, WORK_KEYS, type WorkKey } from '../../../lib/profile-fields';

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
const MAX_AGE_YEAR = CURRENT_YEAR - 13;
const MIN_AGE_YEAR = CURRENT_YEAR - 100;
// Mirrors `GENDERS` in apps/myprofile/app/settings/edit-profile/page.tsx.
// The stored value IS the label, so a signup answer matches what the settings
// app's Gender picker compares against instead of painting an unselected
// `male`.
const GENDER_OPTIONS = GENDERS.map((g) => ({ value: g, label: g }));

function parseDob(v:string){ if(!v) return {year:0,month:-1,day:0}; const p=v.split('-').map(Number); return {year:p[0]||0, month:p.length>1&&p[1]?p[1]-1:-1, day:p.length>2?p[2]||0:0}; }
function formatDate(y:number,m:number,d:number){ if(y<=0||m<0||m>11||d<=0) return ''; return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function daysInMonth(y:number,m:number){ return new Date(y,m+1,0).getDate(); }

const calNavCls =
  'flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-field text-text-2 transition-colors hover:border-btn-line-hover hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';
const footBtnCls =
  'h-12 rounded-xl border border-border bg-field px-4 text-[15px] font-semibold text-text-2 transition-colors hover:border-btn-line-hover hover:bg-hover hover:text-fg';
const gridBtnCls = (sel: boolean, dis = false) =>
  `rounded-xl text-[16px] transition-colors ${
    dis
      ? 'cursor-not-allowed text-text-4'
      : sel
        ? 'bg-accent text-accent-fg'
        : 'text-text-3 hover:bg-hover'
  }`;

export const SignupStep2: React.FC<SignupStep2Props> = ({
  gender,setGender,dob,setDob,jobRole,setJobRole,jobCompany,setJobCompany,jobPlace,setJobPlace,jobStartedOn,setJobStartedOn,
  profilePic,fileInputRef,onFileSelect,onRemoveProfilePic,errors,touched,handleBlur,isSubmitting,step2Complete,onSubmit,
})=>{
  const workValue: Record<WorkKey, string> = { jobRole, jobCompany, jobPlace, jobStartedOn };
  const workSetter: Record<WorkKey, (v: string) => void> = {
    jobRole: setJobRole, jobCompany: setJobCompany, jobPlace: setJobPlace, jobStartedOn: setJobStartedOn,
  };
  const genderError = touched.gender?errors.gender:undefined;
  const dobError = touched.dob?errors.dob:undefined;
  const parsed = parseDob(dob);
  const today=new Date();
  const maxDate=new Date(today.getFullYear()-13,today.getMonth(),today.getDate());
  const minDate=new Date(today.getFullYear()-100,today.getMonth(),today.getDate());
  const [viewYear,setViewYear]=useState(parsed.year||CURRENT_YEAR-22);
  const [viewMonth,setViewMonth]=useState(parsed.month>=0?parsed.month:5);
  const [pickerMode,setPickerMode]=useState<'days'|'months'|'years'>('days');
  const [dobOpen,setDobOpen]=useState(false);

  useEffect(()=>{ const p=parseDob(dob); if(p.year&&p.month>=0){setViewYear(p.year); setViewMonth(p.month);} },[]);
  useEffect(()=>{ if(!dobOpen) return; const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape'){setDobOpen(false); handleBlur('dob');}}; window.addEventListener('keydown',onKey); return()=>window.removeEventListener('keydown',onKey); },[dobOpen]);
  useEffect(()=>{ if(dobOpen) setPickerMode('days'); },[dobOpen]);

  const selectDay=(d:number)=>{ setDob(formatDate(viewYear,viewMonth,d)); handleBlur('dob'); };
  const isSelected=(d:number)=>parsed.year===viewYear&&parsed.month===viewMonth&&parsed.day===d;
  const isToday=(d:number)=>{ const n=new Date(); return n.getFullYear()===viewYear&&n.getMonth()===viewMonth&&n.getDate()===d; };
  const isDisabled=(d:number)=>{ const dt=new Date(viewYear,viewMonth,d); return dt>maxDate||dt<minDate; };
  const canPrev=()=> new Date(viewYear,viewMonth-1,1) >= new Date(minDate.getFullYear(),minDate.getMonth(),1);
  const canNext=()=> new Date(viewYear,viewMonth+1,1) <= new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
  const goPrev=()=>{ if(!canPrev())return; if(viewMonth===0){setViewMonth(11); setViewYear(v=>v-1);} else setViewMonth(m=>m-1); };
  const goNext=()=>{ if(!canNext())return; if(viewMonth===11){setViewMonth(0); setViewYear(v=>v+1);} else setViewMonth(m=>m+1); };

  const years = Array.from({length: MAX_AGE_YEAR-MIN_AGE_YEAR+1},(_,i)=>MAX_AGE_YEAR-i);
  const dobDisplay = dob ? new Date(dob).toLocaleDateString('en-US',{year:'numeric', month:'long', day:'numeric'}) : '';

  return (
    <form onSubmit={onSubmit} className="signup-fields" noValidate>
      <p className="step2-lede">
        Square photo, gender and birthday to finish your profile. Work details are optional.
      </p>

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

      {/* Gender + DOB */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <SelectField
            label="Gender *"
            value={gender}
            onChange={(v)=>{ if(!v) return; setGender(v); handleBlur('gender'); }}
            options={[{ value:'', label:'Select gender' }, ...GENDER_OPTIONS]}
          />
          {genderError && (
            <p role="alert" className="tb-hint tb-error">{genderError}</p>
          )}
        </div>

        <div>
          <span className="tb-label">Date of birth</span>
          <button
            type="button"
            onClick={()=> setDobOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={dobOpen}
            aria-label="Select date of birth"
            className={`flex h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-[16px] outline-none transition-[border-color,background-color,box-shadow] ${dobError?'border-danger':'border-btn-line bg-field hover:border-btn-line-hover'}`}
          >
            <span className={`truncate ${dob?'text-fg':'text-text-4'}`}>{dobDisplay || 'Pick a date'}</span>
            <ChevronDown className="size-5 shrink-0 text-text-4" />
          </button>
          {dobError && (
            <p role="alert" className="tb-hint tb-error">{dobError}</p>
          )}
          {dobOpen && (
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-scrim p-3 backdrop-blur-sm"
              onClick={(e)=>{ if(e.target===e.currentTarget){ setDobOpen(false); handleBlur('dob'); } }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Select date of birth"
                className="w-full max-w-sm overflow-hidden rounded-2xl glass"
                onClick={e=>e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border p-3">
                  <button type="button" className={calNavCls} onClick={goPrev} disabled={!canPrev()} aria-label="Previous month">
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={()=>setPickerMode(pickerMode==='days'?'months': pickerMode==='months'?'years':'days')}
                    className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[16px] text-text-3 transition-colors hover:bg-hover"
                  >
                    {pickerMode==='days' && <>{MONTHS[viewMonth]} {viewYear}</>}
                    {pickerMode==='months' && <>{viewYear}</>}
                    {pickerMode==='years' && <>{years[0]} – {years[years.length-1]}</>}
                    <ChevronDown className={`size-5 text-muted transition-transform ${pickerMode!=='days'?'rotate-180':''}`} />
                  </button>
                  <button type="button" className={calNavCls} onClick={goNext} disabled={!canNext()} aria-label="Next month">
                    <ChevronRight className="size-6" />
                  </button>
                </div>

                {pickerMode==='years' ? (
                  <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4">
                    {years.map(y=> (
                      <button key={y} type="button" onClick={()=>{setViewYear(y); setPickerMode('days');}} className={`h-12 ${gridBtnCls(viewYear===y)}`}>{y}</button>
                    ))}
                  </div>
                ) : pickerMode==='months' ? (
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {MONTHS.map((m,i)=>{
                      const isM = viewMonth===i;
                      const disabled = new Date(viewYear,i,1) < new Date(minDate.getFullYear(),minDate.getMonth(),1) || new Date(viewYear,i,1) > new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
                      return <button key={m} type="button" disabled={disabled} onClick={()=>{setViewMonth(i); setPickerMode('days');}} className={`h-12 ${gridBtnCls(isM, disabled)}`}>{m.slice(0,3)}</button>;
                    })}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-1 p-3">
                      {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=> (
                        <div key={d} className="py-2 text-center text-[14px] font-semibold uppercase tracking-wide text-text-4">{d}</div>
                      ))}
                      {Array.from({length: new Date(viewYear,viewMonth,1).getDay()}).map((_,i)=><div key={'e'+i}/>)}
                      {Array.from({length: daysInMonth(viewYear,viewMonth)},(_,i)=>{
                        const d=i+1; const sel=isSelected(d), tod=isToday(d), dis=isDisabled(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={dis}
                            onClick={()=>{ selectDay(d); setDobOpen(false); }}
                            className={`h-12 ${gridBtnCls(sel, dis)} ${tod&&!sel&&!dis?'ring-1 ring-inset ring-muted/60':''}`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-divider p-3">
                      <button type="button" onClick={()=>{ const t=new Date(); if(t>=minDate && t<=maxDate){ setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); selectDay(t.getDate()); setDobOpen(false);} }} className={footBtnCls}>Today</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={()=>{setDob(''); setDobOpen(false);}} className={footBtnCls}>Clear</button>
                        <button
                          type="button"
                          onClick={()=>{handleBlur('dob'); setDobOpen(false);}}
                          className="h-12 rounded-xl px-5 text-[15px] font-semibold bg-accent text-accent-fg transition-colors hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:bg-field disabled:text-text-4"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work — collapsed by default; same four questions as the settings
          app's "Personal details → Work" sheet. Optional; updateable later. */}
      <details className="work-box">
        <summary>
          <span>
            Work details <em>Optional — add later any time</em>
          </span>
          <ChevronDown aria-hidden />
        </summary>
        <div className="work-body">
          {WORK_KEYS.map((key) =>
            key === 'jobStartedOn' ? (
              <Field
                key={key}
                label={WORK_FIELDS[key].label}
                placeholder={WORK_FIELDS[key].placeholder}
                value={workValue[key]}
                onChange={(e) => workSetter[key](e.target.value)}
                onBlur={() => handleBlur(key)}
                maxLength={WORK_FIELDS[key].maxLength}
                disabled={isSubmitting}
                error={touched[key] ? errors[key] : undefined}
              />
            ) : (
              <TextAreaField
                key={key}
                label={WORK_FIELDS[key].label}
                placeholder={WORK_FIELDS[key].placeholder}
                value={workValue[key]}
                onChange={(e) => workSetter[key](e.target.value)}
                onBlur={() => handleBlur(key)}
                maxLength={WORK_FIELDS[key].maxLength}
                disabled={isSubmitting}
                error={touched[key] ? errors[key] : undefined}
              />
            ),
          )}
        </div>
      </details>

      <PrimaryButton type="submit" disabled={!step2Complete} loading={isSubmitting}>
        {isSubmitting ? 'Please wait…' : 'Next'}
      </PrimaryButton>
    </form>
  );
};
SignupStep2.displayName='SignupStep2';
