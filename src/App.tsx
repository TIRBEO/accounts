import React, { useState, useEffect, useRef, useCallback, type ReactNode, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Pause,
  Compass,
  MapPin,
  Flame,
  Mountain,
  Route,
  ArrowUpRight,
  MessageCircle,
  Send,
  CheckCheck,
  MoreVertical,
  Music2,
  Heart,
  Play,
} from 'lucide-react';

const AuthCard = lazy(() => import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard })));
import { SessionGate } from './components/auth/SessionGate';
import { CallbackView } from './components/CallbackView';
import { TermsModal } from './components/TermsModal';
import { MagicLinkSentPage } from './components/auth/MagicLinkSentPage';
import { SplitLoader } from './components/SplitLoader';
import { RealtimeBanner } from './components/RealtimeBanner';
import { BrandMark } from './components/ui/ig-ui';
import { getCurrentUser, verifyMagicLink, apiPost } from './lib/api';
import { getRedirectTarget, redirectBlockedToDashboard } from './lib/redirect';
import { subscribeToUser, disconnectRealtime } from './lib/realtime';
import { broadcastSession, clearSessionTrace, parseSessionMessage } from './lib/sessionSync';

const isCallbackPath = () => window.location.pathname.startsWith('/callback');
const isMagicSentPath = () => window.location.pathname.startsWith('/magic-sent');

/* ── "Already have an account? sign in and link" handoff ──
   The dashboard's OAuth create-screen sends people here with link_token when
   the provider email/identity already belongs to an account. Whatever login
   path finishes (password, OTP, magic link, passkey, or an already-live
   session), the token gets attached exactly once before navigating away. */
let linkTokenAtBoot: string | null | undefined;
function takeLinkToken(): string | null {
  if (linkTokenAtBoot !== undefined) return linkTokenAtBoot;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('link_token');
  linkTokenAtBoot = token || null;
  if (token) {
    params.delete('link_token');
    const q = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
  }
  return linkTokenAtBoot;
}
let linkAttachInFlight: Promise<string | null> | null = null;
async function attachLinkToken(showToast: (msg: string, type?: 'success' | 'error' | 'info') => void): Promise<string | null> {
  const token = takeLinkToken();
  if (!token) return null;
  if (!linkAttachInFlight) {
    linkAttachInFlight = apiPost<{ ok?: boolean; redirect_to?: string }>('/api/auth/oauth/attach', { token })
      .then((res) => {
        if (!res.ok) {
          showToast(res.error || 'Could not link that sign-in. You can connect it later from Connected apps.', 'error');
          return null;
        }
        showToast('Provider connected to your account', 'success');
        return res.data?.redirect_to || null;
      })
      .finally(() => { linkTokenAtBoot = null; });
  }
  return linkAttachInFlight;
}
let bootRan = false;
export type ToastType = 'success' | 'error' | 'info';
const inferToastType = (msg: string): ToastType => {
  const m = msg.toLowerCase();
  if (/(error|invalid|failed|expire|unable|wrong|too many|already exists|already registered|could not|couldn.t|not configured|try again|no account)/.test(m)) return 'error';
  if (/(success|signed in|sent to|verified|created|updated|welcome|resent|check your email|logged in)/.test(m)) return 'success';
  return 'info';
};
const TOAST_ICON: Record<ToastType, ReactNode> = { success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };

/* Everyday micro-updates used as the hero greeting. */
const GREETINGS: string[] = [
  'Eating the most elite snack right now, 10/10.',
  'Current view: my bed, my laptop, and pure chaos.',
  'Proof that I actually got dressed and left the house today.',
  'Drinking my third coffee of the day, please stop me.',
  'My desk looks like a hurricane hit it.',
  'Staring at this spreadsheet until my eyes cross.',
  'Just spent 20 minutes looking for the phone that was in my hand.',
  'The afternoon slump has officially taken over.',
  'I am currently a potato on the couch.',
  'My dog/cat is looking at me like I owe them money.',
  'Just survived the longest meeting in human history.',
  'I walked into this room for a reason but it\u2019s completely gone.',
  'Currently waiting for water to boil like it\u2019s a spectator sport.',
  'My laundry pile is starting to look like a roommate.',
  'I have zero thoughts, head completely empty.',
  'Trying to decide if I\u2019m actually hungry or just bored.',
  'Just heard a weird noise outside and now I\u2019m on high alert.',
  'The weather outside is matching my exact mood right now.',
  'Currently hiding from my responsibilities.',
  'I am one minor inconvenience away from a nap.',
  'Just saw this and instantly thought of you.',
  'How is your day going on a scale of 1 to 10?',
  'No need to reply right now, just sending good vibes.',
  'Hope your Tuesday is treating you gently.',
  'Checking in: did you remember to drink water today?',
  'What is the vibe of your afternoon so far?',
  'Just checking to make sure you\u2019re still alive over there.',
  'Sending you a mental hug for the middle of the week.',
  'What\u2019s one good thing that happened to you today?',
  'How are we feeling about the world today?',
  'Just wanted to say hi and tell you you\u2019re doing great.',
  'Are you having a busy day or a lazy day?',
  'Thinking about you and hoping your week is smooth.',
  'Let me know when you have a second to breathe today.',
  'Is it a chaotic day or a chill day over there?',
  'Just checking the pulse, how are things?',
  'Hope nobody is annoying you today.',
  'Sending love your way just because.',
  'Are you surviving the week?',
  'Ping! Just making sure you\u2019re good.',
  'What are we eating for lunch? Give me inspiration.',
  'I am about to copy whatever your lunch plan is.',
  'Is it too early to start thinking about dinner?',
  'I\u2019m craving something sweet and I\u2019m dangerous close to ordering takeout.',
  'Please tell me I shouldn\u2019t order iced coffee again.',
  'Give me a number between 1 and 3 to choose my lunch.',
  'I just made the most chaotic meal out of leftovers.',
  'Breakfast for dinner is happening tonight.',
  'I need a snack recommendation that isn\u2019t chips.',
  'Accidentally ate the whole bag of snacks in one sitting.',
  'Should I cook or should I let the delivery app win?',
  'My fridge is completely empty, send help.',
  'I\u2019m at the grocery store, do you need anything?',
  'Just cooked something that actually looks edible.',
  'I am currently being sustained entirely by caffeine.',
  'Pizza tonight? Yay or nay?',
  'I ate way too much and now I cannot move.',
  'Looking at restaurant menus instead of doing my work.',
  'Is a cookie a valid breakfast? Asking for a friend.',
  'My kitchen is a disaster but the food was worth it.',
  'This song came on and instantly transported me back to college.',
  'Sending this TikTok because I refuse to be the only one who saw it.',
  'Look at this meme and tell me it isn\u2019t exactly us.',
  'I am currently down a massive Wikipedia rabbit hole.',
  'You need to listen to this track immediately.',
  'Just watched a video that broke my brain.',
  'What show are we binge-watching next?',
  'I\u2019ve listened to this same song 40 times today.',
  'Look at this ridiculous internet drama I just found.',
  'This podcast episode has your name written all over it.',
  'Just found our next movie night pick.',
  'I\u2019m sending this to you without context.',
  'This meme attacked me personally.',
  'Please watch this so we can talk about it later.',
  'My algorithm is completely unhinged today.',
  'I\u2019ve been scrolling for an hour and I can\u2019t stop.',
  'This specific photo is pure art.',
  'Found a new playlist that you are going to love.',
  'We need to recreate this video next time we hang out.',
  'The internet was a mistake today.',
  'Quick vote: left or right?',
  'Do I buy this or behave myself?',
  'Talk me out of buying this right now.',
  'Is this shirt cool or do I look like a pirate?',
  'Need a second opinion on these shoes.',
  'I just bought something highly unnecessary.',
  'Look at this ridiculous thing I found online.',
  'Should I cut my own bangs? (Tell me no).',
  'Does this color suit me or make me look washed out?',
  'Is it worth buying the expensive version or the cheap one?',
  'I\u2019m standing in the aisle trying to make a choice, help.',
  'Rate this outfit from 1 to 10.',
  'I just influenced myself into buying this.',
  'Do I need this or am I just sad?',
  'Help me pick a gift for my sibling.',
  'Should I get the black one or the green one?',
  'Is this too fancy for a casual dinner?',
  'I have a shopping cart open and I\u2019m scared to hit buy.',
  'Does this look like something I would actually wear?',
  'Tell me I don\u2019t need another mug.',
  'Why am I awake right now?',
  'Just woke up from the most vivid, unhinged dream.',
  'If you are awake, please validate my insomnia.',
  'The birds are chirping and I haven\u2019t slept yet.',
  'My brain decided to remember something embarrassing from 2012.',
  'Just realized it\u2019s 2 AM and I\u2019m still scrolling.',
  'Morning! I hope your coffee hits perfectly today.',
  'I woke up feeling like I got hit by a truck.',
  'Too tired to function, please send positive energy.',
  'I had a dream we were secret agents last night.',
  'Why does my brain do its best thinking at midnight?',
  'Just watched the sunrise by accident.',
  'My alarm woke me up from a very important nap.',
  'Can we agree that mornings shouldn\u2019t exist?',
  'I am writing this from the comfort of my blankets.',
  'Late night thoughts: what if we opened a bakery?',
  'I can\u2019t sleep, tell me a boring story.',
  'Woke up craving something very specific.',
  'My eyes are barely open typing this.',
  'Good morning to everyone except my alarm clock.',
  'Are we doing anything tonight or are we rotting at home?',
  'Let\u2019s get coffee and sit in silence.',
  'I need to leave my house, please hang out with me.',
  'What is your schedule looking like this weekend?',
  'Can I come over and do absolutely nothing on your couch?',
  'Let\u2019s go for a walk before it gets dark.',
  'Are you free for a quick dinner later?',
  'We need a catch-up session immediately.',
  'Let\u2019s do a low-key movie night this week.',
  'I am free all afternoon if you want to do something.',
  'Do you want to run errands with me?',
  'Let\u2019s go get a treat, we deserve it.',
  'Are you busy or can I call you in 5 minutes?',
  'Let\u2019s plan something fun so I have something to look forward to.',
  'I\u2019m near your neighborhood, are you around?',
  'We haven\u2019t hung out in forever, let\u2019s fix that.',
  'Can I borrow you for an hour today?',
  'Let\u2019s grab breakfast this weekend.',
  'Are we hanging out today or what?',
  'I have an extra ticket if you want to come.',
];

/* Time-seeded rotation: same photos for every visitor at the same time —
   they change with time, not on refresh. */
const HERO_SEED = Math.floor(Date.now() / (1000 * 60 * 60 * 2));

/* Greeting is per-user and per-load: re-randomizes on every refresh. */
const HERO_GREETING =
  GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

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

const heroPhoto = (slot: number): string => {
  const o = (HERO_SEED * 7 + slot * 11) % HERO_PHOTOS.length;
  return `/${HERO_PHOTOS[(o + HERO_PHOTOS.length) % HERO_PHOTOS.length]}`;
};

/* Signup (wide screens only): two vertical rails scrolling in opposite
   directions — a mix of story, photo and post cards. */
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

const RailActs: React.FC<{ n: number }> = ({ n }) => {
  const [liked, setLiked] = React.useState(n % 2 === 0);
  const [connected, setConnected] = React.useState(false);
  return (
    <div className="rail-actions">
      <button type="button" className={`rail-act${liked ? ' rail-act--on' : ''}`} aria-label="Like" onClick={() => setLiked((v) => !v)}>
        <Flame size={15} strokeWidth={2.2} fill={liked ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="rail-act" aria-label="Comment"><MessageCircle size={15} strokeWidth={2.2} /></button>
      <button type="button" className="rail-act" aria-label="Share"><Send size={15} strokeWidth={2.2} /></button>
      <span className="rail-count">{(2.4 + (n % 5) * 1.3).toFixed(1)}k roars</span>
      <button type="button" className={`connect-btn${connected ? ' connect-btn--on' : ''}`} onClick={() => setConnected((v) => !v)}>
        {connected ? 'Connected' : 'Connect'}
      </button>
    </div>
  );
};

const RailSugg: React.FC<{ n: number }> = ({ n }) => {
  const [on, setOn] = React.useState<boolean[]>([true, false, false]);
  return (
    <figure className="rail-card rail-sugg rv-sugg">
      <div className="sugg-head"><span>Suggestions</span><span className="sugg-see">See all</span></div>
      {[0, 1, 2].map((k) => {
        const m = n + k;
        return (
          <div className="sugg-row" key={k}>
            <span className="rail-ring"><img src={`/${HERO_PHOTOS[(m * 7 + 3) % HERO_PHOTOS.length]}`} alt="" loading="lazy" /></span>
            <span className="rail-head-txt">
              <span className="rail-user">{RAIL_HANDLES[m % RAIL_HANDLES.length]}</span>
              <span className="rail-sub">{(m % 9) + 2} shared trails</span>
            </span>
            <button type="button" className={`connect-btn${on[k] ? ' connect-btn--on' : ''}`} onClick={() => setOn((v) => v.map((x, i) => (i === k ? !x : x)))}>
              {on[k] ? 'Connected' : 'Connect'}
            </button>
          </div>
        );
      })}
    </figure>
  );
};

const RailCard: React.FC<{ n: number }> = ({ n }) => {
  const src = `/${HERO_PHOTOS[(n * 5 + 1) % HERO_PHOTOS.length]}`;
  const av = `/${HERO_PHOTOS[(n * 7 + 3) % HERO_PHOTOS.length]}`;
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
          <RailActs n={n} />
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
      return <RailSugg n={n} />;
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
          <RailActs n={n} />
          <p className="rail-caption"><b>{h}</b> {RAIL_CAPS[n % RAIL_CAPS.length]}</p>
        </figure>
      );
  }
};

const RailsScroll: React.FC = () => {
  const seq = (base: number) => Array.from({ length: 12 }, (_, i) => base + i);
  const left = seq(0);
  const right = seq(3);
  return (
    <>
      <div className="scroll-rail scroll-rail--left">
        <div className="scroll-rail__track">
          {[...left, ...left].map((n, i) => <RailCard key={i} n={n} />)}
        </div>
      </div>
      <div className="scroll-rail scroll-rail--right">
        <div className="scroll-rail__track">
          {[...right, ...right].map((n, i) => <RailCard key={i} n={n} />)}
        </div>
      </div>
    </>
  );
};

/* Login (wide screens only): an Instagram-style fan of three
   story previews on the left, and a post with a continuously scrolling
   comments feed on the right. */
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

/* Desktop marketing hero — a staggered photo collage plus small "app
   preview" cards (a post and a profile) using the time/blue-tick
   sticker assets. Hidden below 1280px (wide PC screens only). */
const AuthHero: React.FC = () => (
  <aside className="auth-hero" aria-hidden="true">
    <BrandMark className="hero-brand" />
    <p className="hero-tagline">{HERO_GREETING}</p>
    <div className="hero-stack">
      <figure className="hero-card hero-card--left">
        <img src={heroPhoto(0)} alt="" loading="eager" />
        <span className="tb-badge">
          <Compass size={12} strokeWidth={2.2} />
          Tirbeo
        </span>
        <span className="tb-place">
          <MapPin size={13} strokeWidth={2} />
          Swayambhu Hill
        </span>
      </figure>
      <figure className="hero-card hero-card--right">
        <img src={heroPhoto(2)} alt="" loading="eager" />
        <span className="tb-badge">
          <Compass size={12} strokeWidth={2.2} />
          Tirbeo
        </span>
        <span className="tb-place">
          <MapPin size={13} strokeWidth={2} />
          Nagarkot Ridge
        </span>
      </figure>
      <figure className="hero-card hero-card--front">
        <img src={heroPhoto(4)} alt="" loading="eager" />
        <span className="tb-place tb-place--top">
          <img src={heroPhoto(5)} alt="" loading="eager" />
          himal.travel
        </span>
        <img src="/time.png" alt="" className="story-time" loading="eager" />
        <span className="tb-go">
          <ArrowUpRight size={15} strokeWidth={2.4} />
        </span>
        <span className="tb-alt">
          <Mountain size={13} strokeWidth={2} />
          5,364 m
        </span>
      </figure>

      {/* mini post preview — classic roomy IG feed post */}
      <figure className="mini-card mini-post">
        <figcaption className="mini-head">
          <img src="/maninfog.jpg" alt="" loading="eager" />
          <div className="mini-head-txt">
            <span className="mini-user">
              sagar.kc
              <img src="/bluetick.png" alt="" className="mini-tick" />
            </span>
            <span className="mini-place">Thamel, Kathmandu</span>
          </div>
          <span className="mini-time">now</span>
        </figcaption>
        <p className="mini-caption">
          Proof that I actually got dressed and left the house today.
        </p>
        <div className="mini-shot">
          <img src={heroPhoto(6)} alt="" loading="eager" />
        </div>
        <div className="mini-stats">
          <span>
            <Route size={14} strokeWidth={2} />
            12.4 km
          </span>
          <span>
            <Mountain size={14} strokeWidth={2} />
            3,210 m
          </span>
          <span>
            <Flame size={14} strokeWidth={2} />
            Trending
          </span>
        </div>
        <span className="mini-cta">View trail</span>
      </figure>

      {/* mini profile preview — ringed avatar, handle, connect button */}
      <figure className="mini-card mini-profile">
        <span className="mini-avatar">
          <img src={heroPhoto(10)} alt="" loading="eager" />
        </span>
        <div className="mini-id">
          <span className="mini-user">
            himal.travel
            <img src="/bluetick.png" alt="" className="mini-tick" />
          </span>
          <span className="mini-sub">128 followers</span>
        </div>
        <span className="mini-add">Connect</span>
      </figure>

      {/* now-playing widget — art + meta + play */}
      <figure className="mini-card mini-music">
        <span className="music-art">
          <img src="/girlinlake.jpg" alt="" loading="eager" />
        </span>
        <div className="music-meta">
          <span className="music-title">Alchi</span>
          <span className="music-artist">Bheko Timleshi</span>
          <span className="music-progress">
            <i />
          </span>
        </div>
        <span className="music-play">
          <Pause size={15} fill="currentColor" strokeWidth={0} />
        </span>
      </figure>

      <figure className="hero-tile hero-tile--a">
        <img src={heroPhoto(11)} alt="" loading="eager" />
      </figure>
      <span className="hero-avatar">
        <img src={heroPhoto(12)} alt="" loading="eager" />
      </span>
    </div>
  </aside>
);


/**
 * Tirbeo Accounts — minimal dark shell.
 * Branding lives in AuthShell's centered wordmark; no top bar.
 */

/** 'checking' → auth probe in flight · 'guest' → show auth UI · 'redirecting' → signed in, navigating away */
type AuthState = 'checking' | 'guest' | 'redirecting';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    // Routes that manage their own auth state start as 'guest' so the boot
    // loader never sits on top of them.
    isCallbackPath() || isMagicSentPath() ? 'guest' : 'checking',
  );
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const authStateRef = useRef<AuthState>(authState);
  useEffect(() => { authStateRef.current = authState; }, [authState]);

  const showToast = useCallback((msg: string, type?: ToastType) => {
    setToast({ msg, type: type || inferToastType(msg) });
    setTimeout(() => setToast((c) => (c?.msg === msg ? null : c)), 3200);
  }, []);

  // ── Route-change loader (split screen) ──
  const [pageChanging, setPageChanging] = useState(false);
  /* The pathname as state — the view switch below must re-render on SPA
     navigations. Reading window.location during render only updates when
     something else happens to repaint, which made routes stick. */
  const [routePath, setRoutePath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  /* No artificial delay on entry. This used to hold a 700ms split-screen on
     /magic-sent and /callback, so the screen that exists purely to say "we sent
     it" showed a loading animation first — on a phone, half a second of
     nothing before any content. The callback route genuinely waits on the token
     exchange, but that wait belongs to the page, not to a loader laid over it. */
  const [initialSplit] = useState(false);
  const pathRef = useRef(typeof window !== 'undefined' ? window.location.pathname : '/');
  useEffect(() => {
    // Wrap history mutations to detect SPA navigations instantly — no polling.
    const trigger = () => {
      if (window.location.pathname !== pathRef.current) {
        const prev = pathRef.current;
        pathRef.current = window.location.pathname;
        setRoutePath(pathRef.current);
        // The auth screens share one mounted app and need no data — flashing
        // the full-screen loader over them reads as a black page.
        const authSpa = (p: string) => p.startsWith('/magic-sent') || p === '/login' || p === '/signup' || p === '/';
        if (authSpa(pathRef.current) && authSpa(prev)) return;
        setPageChanging(true);
        setTimeout(() => setPageChanging(false), 500);
      }
    };
    window.addEventListener('popstate', trigger);
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    (history as any).pushState = (...a: any[]) => { (origPush as any)(...a); trigger(); };
    (history as any).replaceState = (...a: any[]) => { (origReplace as any)(...a); trigger(); };
    return () => {
      window.removeEventListener('popstate', trigger);
      (history as any).pushState = origPush;
      (history as any).replaceState = origReplace;
    };
  }, []);

  const showLoader = authState !== 'guest' || pageChanging || initialSplit;

  // ── Boot: magic-link exchange + session probe (runs once) ──
  // Module-level guard: StrictMode's second effect pass must not re-read the
  // URL (magic_token is stripped by the first pass) nor cancel its in-flight
  // exchange — otherwise /login?magic_token= never signs in during dev.
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath()) return;
    if (bootRan) return;
    bootRan = true;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = getRedirectTarget();
      const magicToken = params.get('magic_token');
      if (magicToken) {
        window.history.replaceState({}, '', window.location.pathname);
        const result = await verifyMagicLink(magicToken);
        if (result.block) { redirectBlockedToDashboard(result.block); return; }
        if (result.ok) {
          setAuthState('redirecting');
          showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`);
          broadcastSession('login');
          const linked = await attachLinkToken(showToast);
          setTimeout(() => { window.location.href = linked || redirectTarget; }, 800);
          return;
        }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.block) { redirectBlockedToDashboard(session.block); return; }
      if (session.ok && session.data) {
        lastIdRef.current = session.data.id;
        setUserId(session.data.id);
        setAuthState('redirecting');
        const linked = await attachLinkToken(showToast);
        window.location.href = linked || redirectTarget;
        return;
      }
      setAuthState('guest');
    };
    init();
  }, [showToast]);

  // ── Cross-tab / cross-app session sync ──
  // Event-driven only: BroadcastChannel + storage events cover same-origin tabs;
  // visibilitychange/focus re-probes the shared cookie session when the user
  // returns to the tab (covers logins made in dashboard/forms subdomains).
  // The previous 5-second polling loop burned battery and caused reload loops.
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath()) return;
    let lastCheck = 0;
    const checkOnce = (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheck < 1000) return; // debounce focus+visibility firing together
      lastCheck = now;
      getCurrentUser().then((s) => {
        if (s.block) { redirectBlockedToDashboard(s.block); return; }
        const authed = !!s.ok && !!s.data;
        const newId = s.data?.id || null;
        if (authed && newId !== lastIdRef.current) {
          lastIdRef.current = newId;
          if (authStateRef.current !== 'redirecting') {
            setAuthState('redirecting');
            attachLinkToken(showToast).then((linked) => { window.location.href = linked || getRedirectTarget(); });
          }
        } else if (!authed && lastIdRef.current) {
          // Signed out elsewhere — drop back to the auth form without a reload.
          lastIdRef.current = null;
          if (authStateRef.current !== 'guest') setAuthState('guest');
        }
      }).catch(() => {});
    };
    const onLogout = () => {
      lastIdRef.current = null;
      setAuthState('guest');
      window.location.reload();
    };
    const bc = (() => { try { return new BroadcastChannel('tirbeo:session'); } catch { return null; } })();
    const onBc = (e: MessageEvent) => {
      const ev = parseSessionMessage(e.data);
      if (ev?.type === 'login') checkOnce(true);
      else if (ev?.type === 'logout') onLogout();
    };
    bc?.addEventListener('message', onBc);
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'tirbeo_session') return;
      const ev = parseSessionMessage(e.newValue);
      if (ev?.type === 'logout') { onLogout(); return; }
      if (ev?.type === 'login') checkOnce(true);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') checkOnce(); };
    bc && window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      bc?.removeEventListener('message', onBc);
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const handleSuccessAuth = useCallback((email: string, provider: string) => {
    showToast(provider === 'Email Registration' ? 'Account created — welcome to Tirbeo' : `Signed in as ${email}`);
    broadcastSession('login');
    setAuthState('redirecting');
    setTimeout(async () => {
      const linked = await attachLinkToken(showToast);
      window.location.href = linked || getRedirectTarget();
    }, 600);
  }, [showToast]);

  // ── Realtime (Pusher Channels) ──
  // When a session id is known, subscribe to the user's private channel so
  // server-driven events (session revoked elsewhere, notifications) arrive
  // instantly. pusher-js is lazy-loaded — zero cost on the critical path.
  useEffect(() => {
    if (!userId) return;
    let cleanup: (() => void) | null = null;
    let disposed = false;
    subscribeToUser(userId, (data) => {
      // Event contract (apps/api/lib/notifications.ts createNotification):
      //   'notification' → { id, type, title, body?, message?, link? }
      //   'session'      → { type: 'session_revoked' }
      const ev = data as {
        type?: string;
        message?: string;
        title?: string;
        body?: string | null;
      } | null;
      if (ev?.type === 'session_revoked') {
        window.location.reload();
        return;
      }
      // createNotification sends title/body; legacy/pusherToastUser sends message.
      const text = ev?.message || (ev?.title ? (ev?.body ? `${ev.title} — ${ev.body}` : ev.title) : '');
      if (text) showToast(text);
    }).then((unsub) => {
      if (disposed && unsub) unsub();
      else cleanup = unsub;
    });
    return () => {
      disposed = true;
      cleanup?.();
      disconnectRealtime();
    };
  }, [userId, showToast]);

  const toastNode = (
    <div role="region" aria-label="Notifications" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.msg}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={`tb-toast tb-toast--${toast.type}`}
            role="status"
          >
            <span aria-hidden="true">{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );


  const page = (content: ReactNode) => (
    <div className="login-page">
      <BrandMark className="page-brand" />
      <AuthHero />
      <RailsScroll />
      <StoryFan />
      <PostComments />
      <RealtimeBanner />
      <SplitLoader active={showLoader} />
      {/* display:contents lets the .login-card inside become a direct flex
          child of .login-page — centring and the portrait bottom-sheet pin
          come from the page, exactly like the social login. */}
      <main id="main-content" className="contents">
        {content}
      </main>
      {/* Instagram-style footer: a muted link row over a language/copyright row. */}
      <footer className="legal-bar">
        <nav className="legal-links" aria-label="Footer">
          <button type="button" onClick={() => setModalType('terms')}>
            Terms of Service
          </button>
          <button type="button" onClick={() => setModalType('privacy')}>
            Privacy Policy
          </button>
          <a href="https://tirbeo.com" target="_blank" rel="noreferrer">
            About
          </a>
          <a href="https://tirbeo.com/help" target="_blank" rel="noreferrer">
            Help
          </a>
          <a href="https://tirbeo.com" target="_blank" rel="noreferrer">
            Popular
          </a>
        </nav>
        <p className="legal-meta">
          <span>English</span>
          <span aria-hidden="true">·</span>
          <span>© 2026 Tirbeo</span>
        </p>
      </footer>
      <TermsModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
      {toastNode}
    </div>
  );

  // Wrap in MotionConfig so every animation respects prefers-reduced-motion.
  return (
    <MotionConfig reducedMotion="user">
      {routePath.startsWith('/callback')
        ? page(<CallbackView onToast={showToast} />)
        : routePath.startsWith('/magic-sent')
          ? page(<MagicLinkSentPage />)
          : page(
              <SessionGate onShowToast={showToast}>
                <Suspense fallback={null}>
                  <AuthCard key="authcard" onSuccessAuth={handleSuccessAuth} onOpenLegalModal={(t) => setModalType(t)} onShowToast={showToast} />
                </Suspense>
              </SessionGate>,
            )}
    </MotionConfig>
  );
}
