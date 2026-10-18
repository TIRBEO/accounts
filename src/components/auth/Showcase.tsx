import React from 'react';
import { Flame, MessageCircle, Send, Play, CheckCheck, Heart } from 'lucide-react';

/* Side showcase for the auth screens — the full photo-era system:
   • signup (≥1280px only): two vertical rails of mixed feed cards
     (posts, stories, reels, DM chats, suggestions, photos) scrolling in
     opposite directions;
   • login (≥1280px only): an Instagram-style fan of three story previews
     on the left and one post with a continuously scrolling comment feed on
     the right.
   Which set shows is gated in CSS by :has(.mode-login) / :has(.mode-signup)
   on the AuthCard root — everything is rendered at every width and simply
   hidden below 1280px, exactly like the original sheets.

   Photos rotate with a 2-hour seed (same set for everyone at a given time,
   they change with time, not on refresh). Photo slots are DISJOINT between
   variants — login draws absolute slots 0–11, signup 12–23, so an image can
   never appear on /login and /signup at the same time. Decorative: aria-
   hidden; interactions inside rail cards are local play-state only. */

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

const N = HERO_PHOTOS.length; // 24, and 11 is coprime with it → slot→photo is a bijection

/* slot → photo, seeded by the clock. */
const heroPhoto = (slot: number): string =>
  `/${HERO_PHOTOS[((HERO_SEED * 7 + slot * 11) % N + N) % N]}`;

/* Disjoint slot ranges per variant; 12 slots each, wrapped. */
const SLOT_BASE: Record<ShowcaseVariant, number> = { login: 0, signup: 12 };
const ph = (v: ShowcaseVariant, rel: number): string =>
  heroPhoto(SLOT_BASE[v] + ((rel % (N / 2)) + N / 2) % (N / 2));

const RAIL_HANDLES = ['nepal.diaries', 'himal.travel', 'trek.himal', 'sagar.ko', 'thamel.walks', 'mustang.road'];

const RAIL_CAPS = [
  'Golden hour over the stupa, no filter needed.',
  'The trail to the lake was worth every step.',
  'Somewhere above the clouds today.',
  'Old streets, new stories.',
  'Chasing waterfalls this weekend.',
  'Tea on the ridge, zero plans.',
];

const CHAT_IN = [
  'Are we doing anything tonight or are we rotting at home?',
  'Let’s get coffee and sit in silence.',
  'I’m near your neighborhood, are you around?',
  'Can I borrow you for an hour today?',
];

const CHAT_OUT = [
  'My alarm woke me up from a very important nap.',
  'Let’s go for a walk before it gets dark.',
  'Are you free for a quick dinner later?',
  'Let’s grab breakfast this weekend.',
];

const RailActs: React.FC<{ v: ShowcaseVariant; n: number }> = ({ v, n }) => {
  const [liked, setLiked] = React.useState(n % 2 === 0);
  const [connected, setConnected] = React.useState(false);
  return (
    <div className="rail-actions">
      <button type="button" className={`rail-act${liked ? ' rail-act--on' : ''}`} aria-label="Like" onClick={() => setLiked((x) => !x)}>
        <Flame size={15} strokeWidth={2.2} fill={liked ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="rail-act" aria-label="Comment"><MessageCircle size={15} strokeWidth={2.2} /></button>
      <button type="button" className="rail-act" aria-label="Share"><Send size={15} strokeWidth={2.2} /></button>
      <span className="rail-count">{(2.4 + (n % 5) * 1.3).toFixed(1)}k roars</span>
      <button type="button" className={`connect-btn${connected ? ' connect-btn--on' : ''}`} onClick={() => setConnected((x) => !x)}>
        {connected ? 'Connected' : 'Connect'}
      </button>
    </div>
  );
};

const RailSugg: React.FC<{ v: ShowcaseVariant; n: number }> = ({ v, n }) => {
  const [on, setOn] = React.useState<boolean[]>([true, false, false]);
  return (
    <figure className="rail-card rail-sugg rv-sugg">
      <div className="sugg-head"><span>Suggestions</span><span className="sugg-see">See all</span></div>
      {[0, 1, 2].map((k) => {
        const m = n + k;
        return (
          <div className="sugg-row" key={k}>
            <span className="rail-ring"><img src={ph(v, m * 7 + 3)} alt="" loading="lazy" /></span>
            <span className="rail-head-txt">
              <span className="rail-user">{RAIL_HANDLES[m % RAIL_HANDLES.length]}</span>
              <span className="rail-sub">{(m % 9) + 2} shared trails</span>
            </span>
            <button type="button" className={`connect-btn${on[k] ? ' connect-btn--on' : ''}`} onClick={() => setOn((x) => x.map((y, i) => (i === k ? !y : y)))}>
              {on[k] ? 'Connected' : 'Connect'}
            </button>
          </div>
        );
      })}
    </figure>
  );
};

const RailCard: React.FC<{ v: ShowcaseVariant; n: number }> = ({ v, n }) => {
  const src = ph(v, n * 5 + 1);
  const av = ph(v, n * 7 + 3);
  const h = RAIL_HANDLES[n % RAIL_HANDLES.length];
  switch (n % 6) {
    case 1: /* plain photo card */
      return (
        <figure className="rail-card rv-photo">
          <img className="rail-photo" src={src} alt="" loading="lazy" />
          <figcaption className="rail-strip">
            <span className="rail-ring"><img src={av} alt="" loading="lazy" /></span>
            <span className="rail-user">{h}</span>
          </figcaption>
          <RailActs v={v} n={n} />
        </figure>
      );
    case 2: /* story preview */
      return (
        <figure className="rail-card rail-story rv-story">
          <img className="rail-photo" src={src} alt="" loading="lazy" />
          <span className="story-bars"><i className="on" /><i /><i /></span>
          <figcaption className="story-head">
            <span className="story-ring"><img src={av} alt="" loading="lazy" /></span>
            <span className="rail-head-txt">
              <span className="rail-user">{h}<img src="/bluetick.png" alt="" className="rail-tick" loading="lazy" /></span>
              <span className="rail-sub">{(n % 12) + 1}h · {((n % 6) + 2) * 412} views</span>
            </span>
          </figcaption>
        </figure>
      );
    case 3: /* reels / live */
      return (
        <figure className="rail-card rail-reels rv-reels">
          <img className="rail-photo" src={src} alt="" loading="lazy" />
          <span className="reels-live">Live</span>
          <span className="reels-play"><Play size={18} fill="currentColor" strokeWidth={0} /></span>
          <div className="reels-rail">
            <span className="reels-btn reels-btn--on"><Flame size={17} strokeWidth={2.2} fill="currentColor" /><b>{(3.2 + (n % 4) * 1.1).toFixed(1)}k</b></span>
            <span className="reels-btn"><MessageCircle size={17} strokeWidth={2.2} /><b>{120 + (n % 5) * 47}</b></span>
            <span className="reels-btn"><Send size={17} strokeWidth={2.2} /><b>{(n % 3) * 31 + 18}</b></span>
          </div>
          <figcaption className="reels-foot">
            <span className="rail-user"><img src={av} alt="" className="reels-avatar" loading="lazy" />{h}</span>
            <p className="reels-cap">{RAIL_CAPS[n % RAIL_CAPS.length]}</p>
          </figcaption>
        </figure>
      );
    case 4: /* DM chat */
      return (
        <figure className="rail-card rail-chat rv-chat">
          <figcaption className="rail-head">
            <span className="rail-ring"><img src={av} alt="" loading="lazy" /></span>
            <span className="rail-head-txt">
              <span className="rail-user">{h}</span>
              <span className="rail-sub rail-sub--on">On a trail</span>
            </span>
          </figcaption>
          <div className="chat-body">
            <span className="bubble bubble--in">{CHAT_IN[n % CHAT_IN.length]}</span>
            <span className="bubble bubble--out">
              {CHAT_OUT[(n + 2) % CHAT_OUT.length]}
              <CheckCheck size={12} strokeWidth={2.5} className="chat-ticks" />
            </span>
            <span className="bubble bubble--in bubble--typing" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </figure>
      );
    case 5: /* friend suggestions */
      return <RailSugg v={v} n={n} />;
    default: /* feed post */
      return (
        <figure className="rail-card rail-post rv-post">
          <figcaption className="rail-head">
            <span className="rail-ring"><img src={av} alt="" loading="lazy" /></span>
            <span className="rail-head-txt">
              <span className="rail-user">{h}</span>
              <span className="rail-sub">{(n % 9) + 2} shared trails</span>
            </span>
            <span className="rail-time">{(n % 8) + 1}h</span>
          </figcaption>
          <img className="rail-photo" src={src} alt="" loading="lazy" />
          <RailActs v={v} n={n} />
          <p className="rail-caption"><b>{h}</b> {RAIL_CAPS[n % RAIL_CAPS.length]}</p>
        </figure>
      );
  }
};

/* Two vertical tracks, opposite directions; each 12-card sequence is
   duplicated so the -50% translate loop is seamless. */
const RailsScroll: React.FC<{ v: ShowcaseVariant }> = ({ v }) => {
  const seq = (base: number) => Array.from({ length: 12 }, (_, i) => base + i);
  const left = seq(0);
  const right = seq(3);
  return (
    <>
      <div className="scroll-rail scroll-rail--left">
        <div className="scroll-rail__track">
          {[...left, ...left].map((n, i) => <RailCard key={i} v={v} n={n} />)}
        </div>
      </div>
      <div className="scroll-rail scroll-rail--right">
        <div className="scroll-rail__track">
          {[...right, ...right].map((n, i) => <RailCard key={i} v={v} n={n} />)}
        </div>
      </div>
    </>
  );
};

/* Login side art: a fan of three story previews (left) — fixed photos, the
   composition itself is the artwork — and one post with a continuously
   scrolling comments feed (right). */
const StoryFan: React.FC = () => (
  <div className="story-fan" aria-hidden="true">
    <figure className="fan-card fan-card--left">
      <img src="/girlinlake.jpg" alt="" loading="lazy" />
      <span className="fan-bars"><i className="on" /><i /><i /></span>
    </figure>
    <figure className="fan-card fan-card--right">
      <img src="/waterfall1.jpg" alt="" loading="lazy" />
      <span className="fan-bars"><i className="on" /><i /><i /></span>
    </figure>
    <figure className="fan-card fan-card--center">
      <img src="/maninfog.jpg" alt="" loading="lazy" />
      <span className="fan-bars"><i className="on" /><i /><i /></span>
      <span className="fan-foot">
        <span className="fan-reply" />
        <Heart size={19} strokeWidth={2} />
      </span>
    </figure>
    <span className="fan-love"><Heart size={30} fill="currentColor" strokeWidth={0} /></span>
  </div>
);

const PC_COMMENTS: [string, string][] = [
  ['madhav.k', 'This lake at sunrise is unreal.'],
  ['priya.t', 'Adding boating here to my list right now.'],
  ['nikesh_', 'Taken last week — the water is even bluer.'],
  ['anisha.travels', 'Nepal never misses.'],
  ['budha.s', 'Which trail do you recommend first?'],
  ['muna.vlogs', 'Saved for my next Pokhara trip.'],
];

const PostComments: React.FC = () => (
  <div className="pc-side" aria-hidden="true">
    <figure className="rail-card rail-post pc-post">
      <figcaption className="rail-head">
        <span className="rail-ring"><img src="/lake1.jpg" alt="" loading="lazy" /></span>
        <span className="rail-head-txt">
          <span className="rail-user">
            sagar.ko
            <img src="/bluetick.png" alt="" className="rail-tick" loading="lazy" />
          </span>
          <span className="rail-sub">Phewa Lake · 4 shared trails</span>
        </span>
        <span className="rail-time">1h</span>
      </figcaption>
      <img className="rail-photo" src="/lake1.jpg" alt="" loading="lazy" />
      <div className="pc-comments">
        <div className="pc-track">
          {[...PC_COMMENTS, ...PC_COMMENTS].map(([u, t], i) => (
            <p key={i}><b>{u}</b> {t}</p>
          ))}
        </div>
      </div>
    </figure>
  </div>
);

export const Showcase: React.FC<{ variant?: ShowcaseVariant }> = ({ variant = 'login' }) => (
  <>
    <RailsScroll v={variant} />
    <StoryFan />
    <PostComments />
  </>
);
