import React from 'react';
import { MapPin, Play, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

/* Side showcase for the auth screens — the Nepal photo collage, restyled to the
   Apple language (rounded plates, hairline rings, glass chips). It reads as a
   SOCIAL app now, and the two variants show different things: a live feed /
   story / reel moment on login, and the "join a community" proof — a post, a
   chat, suggested follows — on signup. Photo slots are disjoint so a given
   image never appears on both pages at once. Hidden below 1280px, so phones and
   small windows keep the clean centered form. */

export type ShowcaseVariant = 'login' | 'signup';

const HERO_SEED = Math.floor(Date.now() / (1000 * 60 * 60 * 2));

const HERO_PHOTOS = [
  'stupa.jpg', 'peace1.jpg', 'lake1.jpg', 'streets.jpg', 'hills.jpg',
  'village.jpg', 'sheeps.jpg', 'ponds.jpg', 'waterfall1.jpg', 'kathmandu1.jpg',
  'dharahara.jpg', 'bestone.jpg', 'peace2.jpg', 'peace3.jpg', 'lake4.jpg',
  'girlinlake.jpg', 'nepal.jpg', 'bridge.jpg', 'goodone.jpg', 'kaalbhairav.jpg',
  'pease.jpg', 'lake2.jpg', 'stupa1.jpg', 'pasupatinath.jpg',
];

const heroPhoto = (slot: number): string =>
  `/${HERO_PHOTOS[(HERO_SEED * 7 + slot * 11) % HERO_PHOTOS.length]}`;

const LOGIN_TAGLINES = [
  'Where Nepal shares its days.',
  'Nepal, one story at a time.',
  'Catch up with everyone, right now.',
];
const SIGNUP_TAGLINES = [
  'Made here. Shared here.',
  'Find your people in Nepal.',
  'Your feed is waiting.',
];

const pick = (arr: string[]) => arr[HERO_SEED % arr.length];

const PLACES = [
  'Swayambhu Hill', 'Nagarkot Ridge', 'Phewa Lake', 'Thamel, Kathmandu',
  'Chitwan', 'Upper Mustang', 'Bandipur', 'Pokhara',
];
const place = (slot: number): string => PLACES[(HERO_SEED + slot * 3) % PLACES.length];

const Handles = ['sujata.k', 'binod.travels', 'himal.daily', 'pokhara.pulse', 'namaste.ktm', 'anuraag'];

/* ── shared bits ────────────────────────────────────────────────────── */

const StackPlate: React.FC<{ slot: number; className?: string }> = ({ slot, className }) => (
  <figure className={`sc-plate${className ? ` ${className}` : ''}`}>
    <img src={heroPhoto(slot)} alt="" loading="eager" />
    <figcaption className="sc-chip">
      <MapPin size={12} strokeWidth={2.2} />
      {place(slot)}
    </figcaption>
  </figure>
);

const GridPlate: React.FC<{ slot: number }> = ({ slot }) => (
  <figure className="sc-plate">
    <img src={heroPhoto(slot)} alt="" loading="eager" />
  </figure>
);

/* ══ LOGIN — stories + reel + photo stack ═════════════════════════════ */

const LoginShowcase: React.FC = () => (
  <>
    <aside className="showcase showcase--left" aria-hidden="true">
      <h2 className="sc-tagline">{pick(LOGIN_TAGLINES)}</h2>

      <div className="sc-stories">
        {Handles.slice(0, 5).map((h, i) => (
          <div className="sc-story" key={h}>
            <span className={`sc-ring${i === 4 ? ' sc-ring--seen' : ''}`}>
              <img src={heroPhoto(1 + i)} alt="" loading="eager" />
            </span>
            <small>{h}</small>
          </div>
        ))}
      </div>

      <div className="sc-stack">
        <StackPlate slot={0} className="sc-lift-1" />
        <StackPlate slot={6} className="sc-lift-2" />
        <StackPlate slot={7} className="sc-lift-3" />
      </div>
    </aside>

    <aside className="showcase showcase--right" aria-hidden="true">
      <figure className="sc-reel">
        <img src={heroPhoto(2)} alt="" loading="eager" />
        <div className="sc-reel-body">
          <span>@{Handles[1]} · Thamel</span>
          <span className="sc-reel-play"><Play size={13} fill="currentColor" strokeWidth={0} /></span>
        </div>
      </figure>

      <div className="sc-grid">
        <GridPlate slot={4} />
        <GridPlate slot={5} />
      </div>

      <figure className="sc-card">
        <img className="sc-thumb" src={heroPhoto(3)} alt="" loading="lazy" />
        <span className="sc-id">
          <strong>Trending in Nepal</strong>
          <small>1,204 posts right now</small>
        </span>
        <span className="sc-follow">Follow</span>
      </figure>
    </aside>
  </>
);

/* ══ SIGNUP — a post + chat + suggestions ═════════════════════════════ */

const SignupShowcase: React.FC = () => (
  <>
    <aside className="showcase showcase--left" aria-hidden="true">
      <h2 className="sc-tagline">{pick(SIGNUP_TAGLINES)}</h2>

      <figure className="sc-post">
        <div className="sc-post-head">
          <span className="sc-avatar"><img src={heroPhoto(12)} alt="" loading="eager" /></span>
          <span className="sc-id">
            <strong>binod.travels</strong>
            <small>Phewa Lake, Pokhara</small>
          </span>
        </div>
        <img className="sc-post-img" src={heroPhoto(11)} alt="" loading="eager" />
        <div className="sc-post-actions">
          <Heart size={20} className="liked" fill="currentColor" strokeWidth={0} />
          <MessageCircle size={20} strokeWidth={2} />
          <Send size={19} strokeWidth={2} />
          <span style={{ marginLeft: 'auto' }}><Bookmark size={19} strokeWidth={2} /></span>
        </div>
        <p className="sc-post-likes">2,481 likes</p>
        <p className="sc-post-cap"><strong>binod.travels</strong> Morning fog over the lake. No filter needed.</p>
      </figure>
    </aside>

    <aside className="showcase showcase--right" aria-hidden="true">
      <div className="sc-grid">
        <GridPlate slot={10} />
        <GridPlate slot={13} />
        <GridPlate slot={14} />
        <GridPlate slot={15} />
      </div>

      <figure className="sc-chat">
        <div className="sc-chat-head">
          <span className="sc-avatar" style={{ width: 26, height: 26 }}><img src={heroPhoto(16)} alt="" /></span>
          sujata.k
        </div>
        <span className="sc-bubble sc-bubble--in">welcome to Tirbeo 👋</span>
        <span className="sc-bubble sc-bubble--out">just joined — sharing from Ktm!</span>
      </figure>

      <figure className="sc-suggest">
        <div className="sc-suggest-title">
          <span>Suggested for you</span>
        </div>
        <figure className="sc-card">
          <span className="sc-avatar"><img src={heroPhoto(17)} alt="" loading="lazy" /></span>
          <span className="sc-id">
            <strong>himal.travel</strong>
            <small>892 followers · 14 mutual</small>
          </span>
          <span className="sc-follow">Follow</span>
        </figure>
        <figure className="sc-card">
          <span className="sc-avatar"><img src={heroPhoto(19)} alt="" loading="lazy" /></span>
          <span className="sc-id">
            <strong>nepal.eats</strong>
            <small>1.2k followers · 6 mutual</small>
          </span>
          <span className="sc-follow">Follow</span>
        </figure>
      </figure>
    </aside>
  </>
);

export const Showcase: React.FC<{ variant?: ShowcaseVariant }> = ({ variant = 'login' }) =>
  variant === 'signup' ? <SignupShowcase /> : <LoginShowcase />;
