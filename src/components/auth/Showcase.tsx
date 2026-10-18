import React from 'react';
import { MapPin, Play, ArrowUpRight } from 'lucide-react';

/* Side showcase for the auth screens — the Nepal photo collage, restyled to
   the Apple language (rounded plates, hairline rings, glass chips). Hidden
   below 1280px, so phones and small windows keep the clean centered form. */

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

const TAGLINES = [
  'Where Nepal shares its days.',
  'Nepal, one story at a time.',
  'From Himal to Trending',
  'Share today. That is all.',
  'Made here. Shared here.',
];

const tagline = TAGLINES[HERO_SEED % TAGLINES.length];

const PLACES = [
  'Swayambhu Hill', 'Nagarkot Ridge', 'Phewa Lake', 'Thamel, Kathmandu',
  'Chitwan', 'Upper Mustang', 'Bandipur', 'Pokhara',
];

const place = (slot: number): string => PLACES[(HERO_SEED + slot * 3) % PLACES.length];

const PhotoCard: React.FC<{ slot: number; className?: string }> = ({ slot, className }) => (
  <figure className={`sc-plate${className ? ` ${className}` : ''}`}>
    <img src={heroPhoto(slot)} alt="" loading="eager" />
    <figcaption className="sc-chip">
      <MapPin size={12} strokeWidth={2.2} />
      {place(slot)}
    </figcaption>
  </figure>
);

export const Showcase: React.FC = () => (
  <>
    <aside className="showcase showcase--left" aria-hidden="true">
      <h2 className="sc-tagline">{tagline}</h2>
      <div className="sc-stack">
        <PhotoCard slot={0} className="sc-lift-1" />
        <PhotoCard slot={2} className="sc-lift-2" />
        <PhotoCard slot={4} className="sc-lift-3" />
      </div>
    </aside>

    <aside className="showcase showcase--right" aria-hidden="true">
      <div className="sc-grid">
        <PhotoCard slot={8} />
        <PhotoCard slot={10} />
        <PhotoCard slot={12} />
        <PhotoCard slot={14} />
      </div>

      <figure className="sc-card">
        <span className="sc-avatar"><img src={heroPhoto(16)} alt="" loading="lazy" /></span>
        <span className="sc-id">
          <strong>himal.travel</strong>
          <small>128 followers · 14 mutual</small>
        </span>
        <span className="sc-follow">Follow</span>
      </figure>

      <figure className="sc-card">
        <span className="sc-art"><img src="/girlinlake.jpg" alt="" loading="lazy" /></span>
        <span className="sc-id">
          <strong>Alchi</strong>
          <small>Bheko Timleshi</small>
          <span className="sc-progress"><i /></span>
        </span>
        <span className="sc-play"><Play size={13} fill="currentColor" strokeWidth={0} /></span>
      </figure>

      <figure className="sc-card">
        <img className="sc-thumb" src={heroPhoto(18)} alt="" loading="lazy" />
        <span className="sc-id">
          <strong>Trending in Nepal</strong>
          <small>1,204 posts today</small>
        </span>
        <span className="sc-go"><ArrowUpRight size={15} strokeWidth={2.2} /></span>
      </figure>
    </aside>
  </>
);
