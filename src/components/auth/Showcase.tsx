import React from 'react';
import {
  Compass, MapPin, Play, Heart, MessageCircle, Send,
  CheckCheck, Pause, MoreVertical,
} from 'lucide-react';

/* Side showcase for the auth screens — the full old rich system (a hero photo
   collage on the left, a scrolling feed-rail column on the right) restyled to
   the Apple language: rounded plates, 1px hairline rings, deep soft shadows,
   glass chips with saturate+blur, and accent blue only where something looks
   pressable (Follow pill, play button). The like heart is var(--danger) red.

   Motion: the right column carries vertical marquee rails (CSS translateY
   loops; the card sequence is duplicated so the loop is seamless) and fanned
   story cards. Photo slots are DISJOINT between variants — a given image can
   never appear on /login and /signup at the same time. Hidden below 1280px,
   so phones and small windows keep the clean centered form. */

export type ShowcaseVariant = 'login' | 'signup';

const HERO_SEED = Math.floor(Date.now() / (1000 * 60 * 60 * 2));

const HERO_PHOTOS = [
  'stupa.jpg', 'peace1.jpg', 'lake1.jpg', 'streets.jpg', 'hills.jpg',
  'village.jpg', 'sheeps.jpg', 'ponds.jpg', 'waterfall1.jpg', 'kathmandu1.jpg',
  'dharahara.jpg', 'bestone.jpg', 'peace2.jpg', 'peace3.jpg', 'lake4.jpg',
  'girlinlake.jpg', 'nepal.jpg', 'bridge.jpg', 'goodone.jpg', 'kaalbhairav.jpg',
  'pease.jpg', 'lake2.jpg', 'stupa1.jpg', 'pasupatinath.jpg',
];

const N = HERO_PHOTOS.length; // 24, and 11 is coprime with it → slot→photo is a bijection

/* slot → photo, seeded by the clock (same set for every visitor at a given
   time — photos rotate with time, not on refresh). */
const heroPhoto = (slot: number): string =>
  `/${HERO_PHOTOS[((HERO_SEED * 7 + slot * 11) % N + N) % N]}`;

/* Disjoint slot ranges: login draws absolute slots 0–11, signup 12–23. The
   mapping is injective over a full period, so no image ever repeats across
   the two pages. */
const SLOT_BASE: Record<ShowcaseVariant, number> = { login: 0, signup: 12 };
const ph = (v: ShowcaseVariant, rel: number): string =>
  heroPhoto(SLOT_BASE[v] + (rel % (N / 2)));

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
const place = (slot: number): string => PLACES[((HERO_SEED + slot * 3) % PLACES.length + PLACES.length) % PLACES.length];

const HANDLES = ['nepal.diaries', 'himal.travel', 'trek.himal', 'sagar.ko', 'thamel.walks', 'mustang.road'];

const CAPS = [
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
];
const CHAT_OUT = [
  'My alarm woke me up from a very important nap.',
  'Let’s go for a walk before it gets dark.',
  'Are you free for a quick dinner later?',
];

const likeCount = (n: number) => `${(1.2 + (n % 7) * 0.9).toFixed(1)}k`;
const cmtCount = (n: number) => 84 + (n % 5) * 47;

/* ── shared atoms ───────────────────────────────────────────────────── */

const Ring: React.FC<{ src: string }> = ({ src }) => (
  <span className="sc-ring"><img src={src} alt="" loading="lazy" /></span>
);

const Tick: React.FC = () => <img className="sc-tick" src="/bluetick.png" alt="" loading="lazy" />;

const GlassChip: React.FC<{ slot: number }> = ({ slot }) => (
  <figcaption className="sc-chip">
    <MapPin size={12} strokeWidth={2.2} />
    <span>{place(slot)}</span>
  </figcaption>
);

const Badge: React.FC = () => (
  <span className="sc-badge">
    <Compass size={11} strokeWidth={2.4} />
    Tirbeo
  </span>
);

/* ══ LEFT — hero collage: tagline, 3 staggered portrait plates, mini post ══ */

const ShowcaseHero: React.FC<{ variant: ShowcaseVariant }> = ({ variant }) => (
  <aside className="sc-hero" aria-hidden="true">
    <h2 className="sc-tagline">{pick(variant === 'signup' ? SIGNUP_TAGLINES : LOGIN_TAGLINES)}</h2>

    <div className="sc-collage">
      <figure className="sc-photo sc-photo--l">
        <img src={ph(variant, 0)} alt="" loading="eager" />
        <Badge />
        <GlassChip slot={0} />
      </figure>
      <figure className="sc-photo sc-photo--c">
        <img src={ph(variant, 1)} alt="" loading="eager" />
        <GlassChip slot={1} />
      </figure>
      <figure className="sc-photo sc-photo--r">
        <img src={ph(variant, 2)} alt="" loading="eager" />
        <GlassChip slot={2} />
      </figure>

      {/* mini feed post — the "app preview" card overlapping the collage */}
      <figure className="sc-mini-post">
        <figcaption className="mp-head">
          <Ring src={ph(variant, 3)} />
          <span className="mp-id">
            <span className="mp-user">{HANDLES[3]}<Tick /></span>
            <span className="mp-place">{place(4)}</span>
          </span>
          <span className="mp-time">now</span>
        </figcaption>
        <div className="mp-shot">
          <img src={ph(variant, 4)} alt="" loading="eager" />
        </div>
        <div className="mp-acts">
          <span className="mp-act mp-act--on"><Heart size={15} strokeWidth={2.2} fill="currentColor" />{likeCount(2)}</span>
          <span className="mp-act"><MessageCircle size={15} strokeWidth={2.2} />{cmtCount(3)}</span>
          <span className="mp-act"><Send size={15} strokeWidth={2.2} />{12}</span>
        </div>
        <p className="mp-cap"><b>{HANDLES[3]}</b> {CAPS[0]}</p>
      </figure>
    </div>
  </aside>
);

/* ══ Rail cards — six mixed feed variants, static glass-ware plates ══════ */

type RailKind = 'post' | 'story' | 'reels' | 'chat' | 'sugg' | 'photo';

const RailCard: React.FC<{ v: ShowcaseVariant; rel: number; kind: RailKind }> = ({ v, rel, kind }) => {
  const src = ph(v, rel);
  const h = HANDLES[rel % HANDLES.length];

  switch (kind) {
    case 'story':
      return (
        <figure className="rc rc-story">
          <img className="rc-fill" src={src} alt="" loading="lazy" />
          <span className="rc-bars"><i className="on" /><i /><i /></span>
          <figcaption className="rc-over rc-over--top">
            <Ring src={src} />
            <span className="rc-id">
              <span className="rc-user">{h}<Tick /></span>
              <span className="rc-sub">{(rel % 12) + 1}h · {((rel % 6) + 2) * 412} views</span>
            </span>
          </figcaption>
        </figure>
      );
    case 'reels':
      return (
        <figure className="rc rc-reels">
          <img className="rc-fill" src={src} alt="" loading="lazy" />
          <span className="rc-play"><Play size={15} fill="currentColor" strokeWidth={0} /></span>
          <figcaption className="rc-over rc-over--bottom">
            <span className="rc-user">{h}</span>
            <span className="rc-likes"><Heart size={13} strokeWidth={2.2} fill="currentColor" className="rc-heart" />{likeCount(rel)}</span>
          </figcaption>
        </figure>
      );
    case 'chat':
      return (
        <figure className="rc rc-chat">
          <figcaption className="rc-head">
            <Ring src={src} />
            <span className="rc-id">
              <span className="rc-user">{h}</span>
              <span className="rc-sub rc-sub--on">Active now</span>
            </span>
            <MoreVertical size={14} className="rc-more" />
          </figcaption>
          <span className="rc-bubble rc-bubble--in">{CHAT_IN[rel % CHAT_IN.length]}</span>
          <span className="rc-bubble rc-bubble--out">
            {CHAT_OUT[(rel + 1) % CHAT_OUT.length]}
            <CheckCheck size={11} strokeWidth={2.5} className="rc-ticks" />
          </span>
          <span className="rc-bubble rc-bubble--in rc-typing"><i /><i /><i /></span>
        </figure>
      );
    case 'sugg':
      return (
        <figure className="rc rc-sugg">
          <div className="rc-sugg-title">Suggested for you</div>
          {[0, 1, 2].map((k) => (
            <div className="rc-row" key={k}>
              <Ring src={ph(v, rel + k)} />
              <span className="rc-id">
                <span className="rc-user">{HANDLES[(rel + k) % HANDLES.length]}</span>
                <span className="rc-sub">{(k % 9) + 2} mutual friends</span>
              </span>
              <span className="sc-follow">Follow</span>
            </div>
          ))}
        </figure>
      );
    case 'photo':
      return (
        <figure className="rc rc-photo">
          <img className="rc-fill" src={src} alt="" loading="lazy" />
          <figcaption className="rc-over rc-over--bottom">
            <Ring src={src} />
            <span className="rc-id">
              <span className="rc-user">{h}</span>
              <span className="rc-sub"><Heart size={11} strokeWidth={2.4} fill="currentColor" className="rc-heart" /> {likeCount(rel)}</span>
            </span>
          </figcaption>
        </figure>
      );
    default: /* post */
      return (
        <figure className="rc rc-post">
          <figcaption className="rc-head">
            <Ring src={src} />
            <span className="rc-id">
              <span className="rc-user">{h}<Tick /></span>
              <span className="rc-sub">{place(rel)}</span>
            </span>
            <span className="rc-time">{(rel % 8) + 1}h</span>
          </figcaption>
          <img className="rc-img" src={src} alt="" loading="lazy" />
          <div className="rc-acts">
            <span className="rc-act"><Heart size={15} strokeWidth={2.2} className={rel % 2 ? '' : 'rc-heart'} /></span>
            <span className="rc-act"><MessageCircle size={15} strokeWidth={2.2} /></span>
            <span className="rc-act"><Send size={15} strokeWidth={2.2} /></span>
            <span className="rc-count">{likeCount(rel)} likes</span>
          </div>
          <p className="rc-cap"><b>{h}</b> {CAPS[rel % CAPS.length]}</p>
        </figure>
      );
  }
};

/* A seamless marquee column: the sequence renders twice and the track
   translates exactly -50% and loops. */
const Rail: React.FC<{
  className?: string;
  v: ShowcaseVariant;
  cards: [rel: number, kind: RailKind][];
  dur: number;
  dir?: 'up' | 'down';
}> = ({ className, v, cards, dur, dir = 'up' }) => {
  const seq = (
    <>
      {cards.map(([rel, kind], i) => <RailCard key={i} v={v} rel={rel} kind={kind} />)}
    </>
  );
  return (
    <div className={`sc-rail${className ? ` ${className}` : ''}`}>
      <div className="sc-rail__track" style={{ animationDuration: `${dur}s` }} data-dir={dir}>
        <div className="sc-rail__seq">{seq}</div>
        <div className="sc-rail__seq" aria-hidden="true">{seq}</div>
      </div>
    </div>
  );
};

/* ══ RIGHT, LOGIN — story fan + one upward rail ══════════════════════════ */

const StoryFan: React.FC<{ v: ShowcaseVariant }> = ({ v }) => (
  <div className="sc-fan">
    <figure className="fan fan--l">
      <img src={ph(v, 5)} alt="" loading="eager" />
      <span className="rc-bars"><i className="on" /><i /><i /></span>
    </figure>
    <figure className="fan fan--r">
      <img src={ph(v, 6)} alt="" loading="eager" />
      <span className="rc-bars"><i className="on" /><i /><i /></span>
    </figure>
    <figure className="fan fan--c">
      <img src={ph(v, 7)} alt="" loading="eager" />
      <span className="rc-bars"><i className="on" /><i /><i /></span>
      <span className="fan-head">
        <Ring src={ph(v, 7)} />
        <span className="rc-user">{HANDLES[1]}<Tick /></span>
      </span>
      <span className="fan-foot">
        <span className="fan-reply" />
        <Heart size={16} strokeWidth={2.2} />
      </span>
    </figure>
  </div>
);

const LoginRight: React.FC = () => (
  <aside className="sc-side sc-side--login" aria-hidden="true">
    <StoryFan v="login" />
    <Rail
      v="login"
      dur={52}
      cards={[
        [8, 'post'],
        [9, 'story'],
        [10, 'reels'],
        [11, 'chat'],
        [12, 'sugg'],
        [13, 'photo'],
      ]}
    />
  </aside>
);

/* ══ RIGHT, SIGNUP — mini profile + music + two counter-scrolling rails ══ */

const SignupRight: React.FC = () => (
  <aside className="sc-side sc-side--signup" aria-hidden="true">
    <figure className="sc-card sc-profile">
      <span className="sc-avatar sc-avatar--ring"><img src={ph('signup', 5)} alt="" loading="eager" /></span>
      <span className="sc-id">
        <strong>{HANDLES[1]}<img className="sc-tick" src="/bluetick.png" alt="" loading="lazy" /></strong>
        <small>128 followers · 6 mutual</small>
      </span>
      <span className="sc-follow">Follow</span>
    </figure>

    <figure className="sc-card sc-music">
      <span className="sc-art"><img src={ph('signup', 6)} alt="" loading="eager" /></span>
      <span className="sc-id">
        <strong>Alchi</strong>
        <small>Bheko Timleshi</small>
        <span className="sc-progress"><i /></span>
      </span>
      <span className="sc-play"><Pause size={13} fill="currentColor" strokeWidth={0} /></span>
    </figure>

    <div className="sc-rails">
      <Rail
        v="signup"
        dur={46}
        dir="up"
        cards={[
          [7, 'reels'],
          [8, 'post'],
          [9, 'chat'],
        ]}
      />
      <Rail
        v="signup"
        dur={54}
        dir="down"
        cards={[
          [5, 'sugg'],
          [6, 'story'],
          [4, 'photo'],
        ]}
      />
    </div>
  </aside>
);

export const Showcase: React.FC<{ variant?: ShowcaseVariant }> = ({ variant = 'login' }) => (
  <>
    <ShowcaseHero variant={variant} />
    {variant === 'signup' ? <SignupRight /> : <LoginRight />}
  </>
);
