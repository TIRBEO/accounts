import React from 'react';
import { Flame, MessageCircle, Send, Heart, CheckCheck } from 'lucide-react';

/* Side art for the auth screens (≥1280px only): two quiet columns of
   static cards — nothing scrolls, overlaps, or clips.

     • login:  one feed post (left) + one DM chat (right)
     • signup: one friend-suggestions card (left) + one story photo (right)

   Photos rotate on a 2-hour clock seed (same set for everyone at a given
   time) and the slot ranges are DISJOINT per variant — login draws 0–11,
   signup 12–23 — so an image can never appear on /login and /signup at the
   same time. Purely decorative: aria-hidden, no state, no animation. */

export type ShowcaseVariant = 'login' | 'signup';

const HERO_SEED = Math.floor(Date.now() / (1000 * 60 * 60 * 2));

const HERO_PHOTOS = [
  'stupa.jpg',
  'peace1.jpg',
  'lake1.jpg',
  'streets.jpg',
  'hills.jpg',
  'village.jpg',
  'sheeps.jpg',
  'ponds.jpg',
  'waterfall1.jpg',
  'kathmandu1.jpg',
  'dharahara.jpg',
  'bestone.jpg',
  'peace2.jpg',
  'peace3.jpg',
  'lake4.jpg',
  'girlinlake.jpg',
  'nepal.jpg',
  'bridge.jpg',
  'goodone.jpg',
  'kaalbhairav.jpg',
  'pease.jpg',
  'lake2.jpg',
  'stupa1.jpg',
  'pasupatinath.jpg',
];

const N = HERO_PHOTOS.length; // 24; slot → photo is a bijection
const SLOT_BASE: Record<ShowcaseVariant, number> = { login: 0, signup: 12 };

const ph = (v: ShowcaseVariant, rel: number): string => {
  const half = N / 2; // 12 slots per variant
  const slot = SLOT_BASE[v] + (((rel % half) + half) % half);
  return `/${HERO_PHOTOS[(HERO_SEED * 7 + slot * 11) % N]}`;
};

const HANDLES = ['nepal.diaries', 'himal.travel', 'trek.himal', 'sagar.ko', 'thamel.walks', 'mustang.road'];
const CAPS = [
  'Golden hour over the stupa, no filter needed.',
  'The trail to the lake was worth every step.',
  'Somewhere above the clouds today.',
  'Old streets, new stories.',
  'Chasing waterfalls this weekend.',
  'Tea on the ridge, zero plans.',
];

const CardHead: React.FC<{ v: ShowcaseVariant; n: number; sub?: string; time?: string }> = ({ v, n, sub, time }) => (
  <figcaption className="rail-head">
    <span className="rail-ring"><img src={ph(v, n * 7 + 3)} alt="" loading="lazy" /></span>
    <span className="rail-head-txt">
      <span className="rail-user">
        {HANDLES[n % HANDLES.length]}
        <img src="/bluetick.png" alt="" className="rail-tick" loading="lazy" />
      </span>
      <span className="rail-sub">{sub ?? `#${(n % 9) + 2} shared trails`}</span>
    </span>
    {time ? <span className="rail-time">{time}</span> : null}
  </figcaption>
);

const PostCard: React.FC<{ v: ShowcaseVariant }> = ({ v }) => (
  <figure className="rail-card rail-post">
    <CardHead v={v} n={1} sub="Phewa Lake · #4 shared trails" time="1h" />
    <img className="rail-photo" src={ph(v, 1)} alt="" loading="lazy" />
    <div className="rail-actions">
      <span className="rail-act rail-act--on"><Heart size={16} strokeWidth={2.2} fill="currentColor" /></span>
      <span className="rail-act"><MessageCircle size={16} strokeWidth={2.2} /></span>
      <span className="rail-act"><Send size={16} strokeWidth={2.2} /></span>
      <span className="rail-count">3.7k roars</span>
    </div>
    <p className="rail-caption"><b>{HANDLES[1]}</b> {CAPS[1]}</p>
  </figure>
);

const ChatCard: React.FC<{ v: ShowcaseVariant }> = ({ v }) => (
  <figure className="rail-card rail-chat">
    <CardHead v={v} n={4} sub="On a trail" time="" />
    <div className="chat-body">
      <span className="bubble bubble--in">The trail to the lake was worth every step. Come with me?</span>
      <span className="bubble bubble--out">
        Leave in the morning — I’m in.
        <CheckCheck size={12} strokeWidth={2.5} className="chat-ticks" />
      </span>
    </div>
  </figure>
);

const SuggCard: React.FC<{ v: ShowcaseVariant }> = ({ v }) => (
  <figure className="rail-card rail-sugg">
    <div className="sugg-head"><span>Suggestions</span><span className="sugg-see">See all</span></div>
    {[0, 1, 2].map((k) => {
      const m = k + 2;
      return (
        <div className="sugg-row" key={k}>
          <span className="rail-ring"><img src={ph(v, m * 7 + 3)} alt="" loading="lazy" /></span>
          <span className="rail-head-txt">
            <span className="rail-user">{HANDLES[m % HANDLES.length]}</span>
            <span className="rail-sub">{(m % 9) + 2} shared trails</span>
          </span>
          <span className={`connect-btn${k === 1 ? ' connect-btn--on' : ''}`}>
            {k === 1 ? 'Connected' : 'Connect'}
          </span>
        </div>
      );
    })}
  </figure>
);

const StoryCard: React.FC<{ v: ShowcaseVariant }> = ({ v }) => (
  <figure className="rail-card rail-story">
    <img className="rail-photo" src={ph(v, 6)} alt="" loading="lazy" />
    <figcaption className="rail-strip">
      <span className="rail-ring"><img src={ph(v, 9)} alt="" loading="lazy" /></span>
      <span className="rail-head-txt">
        <span className="rail-user">{HANDLES[5]}</span>
        <span className="rail-sub">{CAPS[5]}</span>
      </span>
      <span className="rail-act rail-act--on"><Flame size={16} strokeWidth={2.2} fill="currentColor" /></span>
    </figcaption>
  </figure>
);

export const Showcase: React.FC<{ variant?: ShowcaseVariant }> = ({ variant = 'login' }) => (
  <>
    <aside className="sc-col sc-col--left" aria-hidden="true">
      {variant === 'login' ? <PostCard v={variant} /> : <SuggCard v={variant} />}
    </aside>
    <aside className="sc-col sc-col--right" aria-hidden="true">
      {variant === 'login' ? <ChatCard v={variant} /> : <StoryCard v={variant} />}
    </aside>
  </>
);
