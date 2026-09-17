'use client';

import React, { useEffect, useState } from 'react';
import { TYPOGRAPHY } from '../../../lib/design';
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Trash2, UserRound } from 'lucide-react';

interface SignupStep2Props {
  gender: string;
  setGender: (value: string) => void;
  dob: string;
  setDob: (value: string) => void;
  occupation: string;
  setOccupation: (value: string) => void;
  company: string;
  setCompany: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
  profilePic: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
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
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function parseDob(v:string){ if(!v) return {year:0,month:-1,day:0}; const p=v.split('-').map(Number); return {year:p[0]||0, month:p.length>1&&p[1]?p[1]-1:-1, day:p.length>2?p[2]||0:0}; }
function formatDate(y:number,m:number,d:number){ if(y<=0||m<0||m>11||d<=0) return ''; return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function daysInMonth(y:number,m:number){ return new Date(y,m+1,0).getDate(); }

export const SignupStep2: React.FC<SignupStep2Props> = ({
  gender,setGender,dob,setDob,occupation,setOccupation,company,setCompany,role,setRole,
  profilePic,fileInputRef,onFileSelect,onRemoveProfilePic,errors,touched,handleBlur,isSubmitting,step2Complete,onSubmit,
})=>{
  const genderError = touched.gender?errors.gender:undefined;
  const dobError = touched.dob?errors.dob:undefined;
  const parsed = parseDob(dob);
  const today=new Date();
  const maxDate=new Date(today.getFullYear()-13,today.getMonth(),today.getDate());
  const minDate=new Date(today.getFullYear()-100,today.getMonth(),today.getDate());
  const [viewYear,setViewYear]=useState(parsed.year||CURRENT_YEAR-22);
  const [viewMonth,setViewMonth]=useState(parsed.month>=0?parsed.month:5);
  const [pickerMode,setPickerMode]=useState<'days'|'months'|'years'>('days');
  const [genderOpen,setGenderOpen]=useState(false);
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
    <form onSubmit={onSubmit} style={{display:'flex', flexDirection:'column', gap:'20px', position:'relative'}} noValidate>
      <style>{`
        .s2-wrap{ position:relative; z-index:1; }
        .s2-head{ text-align:center; padding:20px 0 8px; }
        .s2-title{ font-family:${TYPOGRAPHY.fontFamily}; font-size:28px; font-weight:700; letter-spacing:-0.04em; color:#FAFAFA; margin:0 0:12px; line-height:1.15; }
        .s2-title span{ color:#0095F6; }
        .s2-sub{ font-size:15px; color:#A1A1AA; margin:0; line-height:24px; max-width:420px; margin-inline:auto; }
        .s2-profile-hero{ display:flex; flex-direction:column; align-items:center; gap:16px; padding:28px 24px; background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); border-radius:24px; box-shadow:0 1px 0 rgba(255,255,255,0.04) inset; }
        .s2-square{ width:112px; height:112px; border-radius:20px; background:rgba(255,255,255,0.04); border:2px dashed rgba(0,149,246,0.2); position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .s2-square.has-photo{ border-style:solid; border-color:rgba(0,149,246,0.25); }
        .s2-pair{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .s2-card{ background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:16px; position:relative; }
        .s2-card.has-error{ border-color:#f43f5e; }
        .s2-label{ font-family:${TYPOGRAPHY.fontFamily}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#71717A; display:block; margin-bottom:10px; }
        .s2-label b{ color:#f43f5e; }
        .s2-trigger{ width:100%; height:52px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; cursor:pointer; font-size:15px; font-family:${TYPOGRAPHY.fontFamily}; font-weight:500; color:#71717A; transition:border-color 150ms, box-shadow 150ms, color 150ms; }
        .s2-trigger.has-value{ color:#FAFAFA; }
        .s2-trigger.has-error{ border-color:#f43f5e; }
        .s2-trigger.open{ border-color:rgba(0,149,246,0.5); box-shadow:0 0 0 4px rgba(0,149,246,0.14); color:#FAFAFA; }
        .s2-dropdown{ position:fixed; top:auto; left:0; right:0; background:rgba(18,18,20,0.96); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1); border-radius:16px; overflow:hidden; z-index:1000; box-shadow:0 24px 48px rgba(0,0,0,0.7); animation:s2FadeIn 150ms ease; }
        .s2-dropdown button{ width:100%; text-align:left; padding:14px 18px; background:transparent; border:none; color:#A1A1AA; font-size:15px; font-family:${TYPOGRAPHY.fontFamily}; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition:background 120ms, color 120ms; }
        .s2-dropdown button:hover{ background:rgba(0,149,246,0.08); color:#FAFAFA; }
        .s2-dropdown button.is-selected{ background:rgba(0,149,246,0.12); color:#FFFFFF; }
        .s2-popup-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,0.64); backdrop-filter:blur(8px); z-index:900; display:flex; align-items:center; justify-content:center; padding:12px; }
        .s2-popup{ width:100%; max-width:384px; background:rgba(18,18,20,0.96); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,0.7); animation:s2FadeIn 200ms ease; }
        .s2-cal-head{ display:flex; align-items:center; justify-content:space-between; padding:16px; border-bottom:1px solid rgba(255,255,255,0.08); background:#141416; }
        .s2-cal-title{ font-family:${TYPOGRAPHY.fontFamily}; font-size:15px; font-weight:700; color:#FAFAFA; background:#141416; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px 16px; display:flex; align-items:center; gap:8px; cursor:pointer; }
        .s2-cal-title:hover{ border-color:rgba(255,255,255,0.12); }
        .s2-cal-nav{ width:40px; height:40px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:#141416; color:#71717A; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 120ms; }
        .s2-cal-nav:hover{ background:rgba(255,255,255,0.06); color:#FAFAFA; }
        .s2-cal-nav:disabled{ opacity:0.35; cursor:not-allowed; }
        .s2-cal-grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:14px; }
        .s2-cal-weekday{ font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#484848; text-align:center; padding:8px 0; font-family:${TYPOGRAPHY.fontFamily}; }
        .s2-day{ height:42px; border-radius:12px; border:none; background:transparent; color:#A1A1AA; font-size:15px; font-weight:500; cursor:pointer; position:relative; font-family:${TYPOGRAPHY.fontFamily}; transition:background 120ms; }
        .s2-day:hover:not(:disabled){ background:#141416; color:#FAFAFA; }
        .s2-day.is-today{ box-shadow:inset 0 0 0 1.5px #FFFFFF; }
        .s2-day.is-selected{ background:#FFFFFF; color:#09090B; font-weight:700; }
        .s2-day.is-disabled{ color:rgba(255,255,255,0.07); cursor:not-allowed; opacity:0.45; }
        .s2-month-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:16px; }
        .s2-month{ height:46px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:#141416; color:#A1A1AA; font-size:14px; font-weight:600; cursor:pointer; font-family:${TYPOGRAPHY.fontFamily}; transition:all 120ms; }
        .s2-month:hover{ border-color:rgba(255,255,255,0.12); color:#FAFAFA; }
        .s2-month.is-current{ border-color:#FFFFFF; color:#FFFFFF; }
        .s2-month.is-selected{ background:#FFFFFF; border-color:#FFFFFF; color:#09090B; }
        .s2-year-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:16px; max-height:240px; overflow-y:auto; }
        .s2-year{ height:42px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:#141416; color:#A1A1AA; font-size:14px; font-weight:600; cursor:pointer; font-family:${TYPOGRAPHY.fontFamily}; transition:all 120ms; }
        .s2-year:hover{ border-color:rgba(255,255,255,0.12); color:#FAFAFA; }
        .s2-year.is-selected{ background:#FFFFFF; border-color:#FFFFFF; color:#09090B; }
        .s2-cal-foot{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px; border-top:1px solid rgba(255,255,255,0.08); background:#141416; }
        .s2-foot-btn{ height:42px; padding:0 16px; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#71717A; font-family:${TYPOGRAPHY.fontFamily}; transition:all 120ms; }
        .s2-foot-btn:hover{ background:rgba(255,255,255,0.06); color:#FAFAFA; }
        .s2-foot-btn.primary{ background:#FFFFFF; border-color:#FFFFFF; color:#09090B; }
        .s2-foot-btn.primary:hover{ background:#e4e4e7; }
        .s2-work{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; padding:24px; background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); border-radius:24px; }
        .s2-work-head{ grid-column:1/-1; font-family:${TYPOGRAPHY.fontFamily}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#7DD3FC; display:flex; align-items:center; gap:10px; margin:0; }
        .s2-work-head span{ color:#71717A; font-weight:400; text-transform:none; letter-spacing:0; }
        .s2-input{ width:100%; height:52px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; color:#FAFAFA; font-size:15px; font-family:${TYPOGRAPHY.fontFamily}; padding:0 16px; outline:none; box-sizing:border-box; transition:border-color 150ms, box-shadow 150ms, background 150ms; }
        .s2-input::placeholder{ color:#71717A; }
        .s2-input:hover{ background:rgba(255,255,255,0.06); }
        .s2-input:focus{ border-color:rgba(0,149,246,0.5); background:rgba(255,255,255,0.06); box-shadow:0 0 0 4px rgba(0,149,246,0.10); }
        @keyframes s2FadeIn{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:translateY(0); } }
        @media(max-width:640px){
          .s2-pair{ grid-template-columns:1fr; }
          .s2-work{ grid-template-columns:1fr; }
          .s2-popup{ max-width:94vw; }
          .s2-month-grid{ grid-template-columns:repeat(3,1fr); }
          .s2-year-grid{ grid-template-columns:repeat(3,1fr); }
          .s2-square{ width:96px; height:96px; }
        }
      `}</style>

      <div className="s2-wrap">
        <div className="s2-head">
          <h2 style={{fontFamily:TYPOGRAPHY.fontFamily, fontSize:'28px', fontWeight:700, letterSpacing:'-0.04em', color:'#FAFAFA', margin:'0 0 12px', lineHeight:1.15}}>Personalize your <span style={{color:'#0095F6'}}>account</span></h2>
          <p style={{fontSize:'15px', color:'#A1A1AA', margin:0, lineHeight:'24px', maxWidth:'420px', marginInline:'auto'}}>Complete your profile in seconds — square photo, gender and birthday are required. Work details are optional and can be updated later.</p>
        </div>

        {/* Profile — centered hero */}
        <div className="s2-profile-hero">
          <div className={`s2-square ${profilePic?'has-photo':''}`}>
            {profilePic ? <img src={profilePic} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <UserRound size={40} strokeWidth={1.4} color="rgba(255,255,255,0.08)"/>}
            <button type="button" onClick={()=>fileInputRef.current?.click()} style={{position:'absolute', inset:0, background: profilePic?'linear-gradient(180deg,transparent 45%, rgba(0,0,0,0.6) 100%)':'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:'14px'}}>
              <span style={{display:'inline-flex', alignItems:'center', gap:'6px', padding:'10px 16px', borderRadius:'999px', background:'#FFFFFF', color:'#09090B', fontSize:'13px', fontWeight:700, fontFamily:TYPOGRAPHY.fontFamily}}><Camera size={16}/>{profilePic?'Change':'Upload'}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onFileSelect} disabled={isSubmitting} style={{display:'none'}}/>
            {profilePic && <button type="button" onClick={onRemoveProfilePic} aria-label="Remove profile photo" style={{position:'absolute', top:'10px', right:'10px', width:'28px', height:'28px', borderRadius:'999px', background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.07)', color:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Trash2 size={14}/></button>}
          </div>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'14px', fontWeight:700, color:'#FAFAFA', margin:'0 0 4px', fontFamily:TYPOGRAPHY.fontFamily}}>Profile photo</p>
            <p style={{fontSize:'13px', color:'#71717A', margin:0}}>Square • JPG PNG WebP • 5 MB — optional</p>
          </div>
        </div>

        {/* Gender + DOB side-by-side */}
        <div className="s2-pair">
          <div className={`s2-card ${genderError?'has-error':''}`} style={{position:'relative'}}>
            <span className="s2-label">Gender <b>*</b></span>
            <button type="button" onClick={()=>setGenderOpen(v=>!v)} className={`s2-trigger ${gender?'has-value':''} ${genderError?'has-error':''} ${genderOpen?'open':''}`} disabled={isSubmitting}>
              <span>{gender ? GENDER_OPTIONS.find(g=>g.value===gender)?.label : 'Select gender'}</span>
              <ChevronDown size={16} color="#484848" style={{transform: genderOpen?'rotate(180deg)':''}}/>
            </button>
            {genderOpen && (
              <div className="s2-dropdown">
                {GENDER_OPTIONS.map(o=>{
                  const sel=gender===o.value;
                  return <button key={o.value} type="button" className={sel?'is-selected':''} onClick={()=>{setGender(o.value); handleBlur('gender'); setGenderOpen(false);}}>{o.label}{sel&&<Check size={15}/>}</button>
                })}
              </div>
            )}
            {genderError && <p style={{fontSize:'13px', color:'#f43f5e', margin:'10px 0 0'}}>{genderError}</p>}
          </div>

          <div className={`s2-card ${dobError?'has-error':''}`} style={{position:'relative'}}>
            <span className="s2-label">Date of birth <b>*</b></span>
            <button type="button" onClick={()=> setDobOpen(true)} className={`s2-trigger ${dob?'has-value':''} ${dobError?'has-error':''}`} aria-haspopup="dialog" aria-expanded={dobOpen}>
              <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{dobDisplay || 'Pick a date'}</span>
              <ChevronDown size={16} color="#484848" style={{transform: dobOpen?'rotate(180deg)':''}}/>
            </button>
            {dobError && <p style={{fontSize:'13px', color:'#f43f5e', margin:'10px 0 0'}}>{dobError}</p>}
            {dobOpen && (
              <div className="s2-popup-backdrop" onClick={(e)=>{ if(e.target===e.currentTarget){ setDobOpen(false); handleBlur('dob'); }}}>
                <div className="s2-popup" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
                  <div className="s2-cal-head">
                    <button type="button" className="s2-cal-nav" onClick={goPrev} disabled={!canPrev()} aria-label="Previous month"><ChevronLeft size={18}/></button>
                    <button type="button" onClick={()=>setPickerMode(pickerMode==='days'?'months': pickerMode==='months'?'years':'days')} className="s2-cal-title">
                      {pickerMode==='days' && <>{MONTHS[viewMonth]} {viewYear}</>}
                      {pickerMode==='months' && <>{viewYear}</>}
                      {pickerMode==='years' && <>{years[0]} – {years[years.length-1]}</>}
                      <ChevronDown size={14} style={{opacity:0.5, transform: pickerMode!=='days'?'rotate(180deg)':''}}/>
                    </button>
                    <button type="button" className="s2-cal-nav" onClick={goNext} disabled={!canNext()} aria-label="Next month"><ChevronRight size={18}/></button>
                  </div>

                  {pickerMode==='years' ? (
                    <div className="s2-year-grid">
                      {years.map(y=> <button key={y} type="button" onClick={()=>{setViewYear(y); setPickerMode('days');}} className={`s2-year ${viewYear===y?'is-selected':''}`}>{y}</button>)}
                    </div>
                  ) : pickerMode==='months' ? (
                    <div className="s2-month-grid">
                      {MONTHS.map((m,i)=>{
                        const isM = viewMonth===i;
                        const disabled = new Date(viewYear,i,1) < new Date(minDate.getFullYear(),minDate.getMonth(),1) || new Date(viewYear,i,1) > new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
                        return <button key={m} type="button" disabled={disabled} onClick={()=>{setViewMonth(i); setPickerMode('days');}} className={`s2-month ${isM?'is-selected':''}`}>{m.slice(0,3)}</button>
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="s2-cal-grid">
                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=> <div key={d} className="s2-cal-weekday">{d}</div>)}
                        {Array.from({length: new Date(viewYear,viewMonth,1).getDay()}).map((_,i)=><div key={'e'+i}/>)}
                        {Array.from({length: daysInMonth(viewYear,viewMonth)},(_,i)=>{
                          const d=i+1; const sel=isSelected(d), tod=isToday(d), dis=isDisabled(d);
                          return <button key={d} type="button" disabled={dis} onClick={()=>{ selectDay(d); setDobOpen(false); }} className={`s2-day ${tod?'is-today':''} ${sel?'is-selected':''} ${dis?'is-disabled':''}`}>{d}</button>
                        })}
                      </div>
                      <div className="s2-cal-foot">
                        <button type="button" onClick={()=>{ const t=new Date(); if(t>=minDate && t<=maxDate){ setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); selectDay(t.getDate()); setDobOpen(false);} }} className="s2-foot-btn">Today</button>
                        <div style={{display:'flex', gap:'10px'}}>
                          <button type="button" onClick={()=>{setDob(''); setDobOpen(false);}} className="s2-foot-btn">Clear</button>
                          <button type="button" onClick={()=>{handleBlur('dob'); setDobOpen(false);}} className="s2-foot-btn primary">Done</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="s2-work">
          <p className="s2-work-head">Work <span>— optional</span> <span style={{flex:1, height:'1px', background:'rgba(255,255,255,0.07)', marginLeft:'12px'}}/></p>
          <input value={occupation} onChange={e=>setOccupation(e.target.value)} onBlur={()=>handleBlur('occupation')} placeholder="Occupation" maxLength={100} disabled={isSubmitting} className="s2-input" />
          <input value={company} onChange={e=>setCompany(e.target.value)} onBlur={()=>handleBlur('company')} placeholder="Company" maxLength={100} disabled={isSubmitting} className="s2-input" />
          <input value={role} onChange={e=>setRole(e.target.value)} onBlur={()=>handleBlur('role')} placeholder="Role" maxLength={100} disabled={isSubmitting} className="s2-input" />
        </div>

        <button type="submit" disabled={!step2Complete||isSubmitting} style={{width:'100%', height:'52px', background: step2Complete&&!isSubmitting?'#0095F6':'rgba(255,255,255,0.08)', color: step2Complete&&!isSubmitting?'#FFFFFF':'#71717A', border:`1px solid ${step2Complete&&!isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.06)'}`, borderRadius:'12px', fontSize:'16px', fontWeight:700, fontFamily:TYPOGRAPHY.fontFamily, boxShadow: step2Complete&&!isSubmitting ? '0 4px 16px rgba(0,149,246,0.28)' : 'none', opacity:1, cursor: step2Complete&&!isSubmitting?'pointer':'not-allowed', transition:'all 150ms ease'}}>
          {isSubmitting?'Please wait…':'Continue'}
        </button>
      </div>
    </form>
  );
};
SignupStep2.displayName='SignupStep2';

