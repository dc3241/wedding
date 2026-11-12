import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { colors, fonts } from './brandKit';
import { Beat, CtaOutro, GridBackground, KineticText, Starburst, ease, pop, roseA, sec, sp } from './motionKit';

// -----------------------------------------------------------------------
// Data-driven video. The admin builds a "spec": ordered beats with exact
// start/end seconds (from the voiceover alignment, already sped up and with
// pauses spliced in) and a visual per beat. No frame numbers are hand-tuned.
// Visuals: text | cards | footage | pause | ask | cta. Audio is muxed by
// render.mjs afterwards, so there is no <Audio> here.
// -----------------------------------------------------------------------

const lin = (f, a, b, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9$']/g, '');

const sizeFor = (n) => (n <= 8 ? 112 : n <= 14 ? 92 : n <= 22 ? 76 : 62);

/** Kinetic words from the real spoken word times. */
const spokenWords = (beat, highlight = [], dim = true) => {
  const hl = new Set(highlight.flatMap((h) => String(h).split(/\s+/)).map(norm).filter(Boolean));
  return beat.words.map((w, i) => {
    const hit = hl.has(norm(w.w));
    return { t: w.w, at: sec(w.s) - 1, weight: hit ? 800 : dim ? 600 : 800, color: hit ? colors.rose : undefined, marker: hit };
  });
};

const TextBeat = ({ beat }) => {
  const words = spokenWords(beat, beat.visual.highlight);
  return (
    <AbsoluteFill>
      <Starburst x={880} y={420} size={520} at={sec(beat.start)} opacity={0.07} points={14} />
      <div style={{ position: 'absolute', left: 60, top: 420, width: 960, height: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <KineticText words={words} size={sizeFor(words.length)} />
      </div>
    </AbsoluteFill>
  );
};

const orderFor = (n, k) => {
  const id = Array.from({ length: n }, (_, i) => i);
  const rev = [...id].reverse();
  const rot = (a, s) => a.map((_, i) => a[(i + s) % n]);
  const pool = [rev, rot(id, 2 % n || 1), rot(rev, 1), rot(id, 1), id];
  return k === 0 ? id : pool[(k - 1) % pool.length];
};

const CardsBeat = ({ beat }) => {
  const f = useCurrentFrame();
  const v = beat.visual;
  const n = Math.max(1, v.items.length);
  const top = v.title ? 470 : 330;
  const avail = 1500 - top;
  const gap = 18;
  const cardH = Math.min(190, Math.floor((avail - gap * (n - 1)) / n));
  const slotY = (p) => top + p * (cardH + gap);

  // each card pops when its first meaningful word is spoken; fallback is evenly spaced
  const popAt = v.items.map((it, i) => {
    const key = it.label.split(/\s+/).map(norm).filter((x) => x.length > 2)[0];
    const hit = key ? beat.words.find((w) => norm(w.w).startsWith(key)) : null;
    const t = hit ? hit.s : beat.start + 0.4 + (i / n) * Math.max(0.5, (beat.end - beat.start) * 0.7);
    return sec(t) - 2;
  });
  // keep pops strictly increasing so cards arrive in list order
  for (let i = 1; i < popAt.length; i += 1) if (popAt[i] <= popAt[i - 1]) popAt[i] = popAt[i - 1] + 6;

  const lastPop = Math.max(...popAt);
  const shuffleStart = lastPop + 24;
  const shuffleEnd = sec(beat.end) - 20;
  const STEP = 26;
  const steps = v.shuffle ? Math.max(0, Math.min(4, Math.floor((shuffleEnd - shuffleStart) / STEP))) : 0;

  const posOf = (i) => {
    let cur = i;
    let prev = i;
    for (let k = 1; k <= steps; k += 1) {
      const t = shuffleStart + (k - 1) * STEP;
      const target = orderFor(n, k).indexOf(i);
      if (f >= t) {
        const p = lin(f, t, t + 16);
        cur = prev + (target - prev) * p;
        prev = target;
      } else break;
    }
    return cur;
  };

  const titleP = sp(f, sec(beat.start));
  return (
    <AbsoluteFill>
      {v.title ? (
        <div style={{ position: 'absolute', left: 60, width: 960, top: 215, textAlign: 'center', fontFamily: fonts.sans, fontWeight: 800, fontSize: v.title.length > 40 ? 62 : 78, lineHeight: 1.08, color: colors.ink, opacity: titleP, transform: `translateY(${(1 - titleP) * 20}px)` }}>
          {v.title}
        </div>
      ) : null}
      {v.items.map((it, i) => {
        const p = pop(f, popAt[i]);
        if (f < popAt[i] - 2) return null;
        const y = slotY(posOf(i));
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: 90, top: y, width: 900, height: cardH, borderRadius: 30, background: colors.white,
              boxShadow: '0 10px 28px rgba(36,28,32,0.10)', display: 'flex', alignItems: 'center', padding: '0 36px', gap: 26, boxSizing: 'border-box',
              outline: it.correct ? `6px solid ${colors.rose}` : '0px solid transparent',
              opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * -70}px) scale(${0.96 + 0.04 * p})`, transformOrigin: 'left center',
            }}
          >
            {v.numbered ? (
              <div style={{ width: 70, height: 70, borderRadius: 70, background: it.correct ? colors.rose : roseA(0.16), color: it.correct ? '#fff' : colors.rose, fontFamily: fonts.sans, fontWeight: 800, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: fonts.sans, fontWeight: 800, fontSize: it.label.length > 28 ? 40 : 50, color: colors.ink, lineHeight: 1.1 }}>{it.label}</div>
              {it.sub ? <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 34, color: '#7A4F4D', marginTop: 4, lineHeight: 1.15 }}>{it.sub}</div> : null}
            </div>
            {it.correct ? (
              <div style={{ marginLeft: 'auto', width: 62, height: 62, borderRadius: 62, background: colors.rose, color: '#fff', fontSize: 40, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: `scale(${p})` }}>✓</div>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const FootageBeat = ({ beat }) => {
  const f = useCurrentFrame();
  const v = beat.visual;
  const dur = Math.max(0.5, beat.end - beat.start);
  const p = sp(f, sec(beat.start), { damping: 16, stiffness: 120, mass: 0.9 });
  const words = spokenWords(beat, []);
  const remaining = Math.max(0.5, (v.clipDuration || dur) - (v.trim_start || 0));
  const rate = Math.min(4, Math.max(0.6, remaining / dur));
  const capP = pop(f, sec(beat.start) + 14);
  const bob = Math.sin(f / 22) * 6;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 50, top: 190, width: 980, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <KineticText words={words} size={words.length <= 8 ? 78 : words.length <= 14 ? 66 : 56} />
      </div>
      <div
        style={{
          position: 'absolute', left: 190, top: 520 + bob, width: 700, height: 1180, borderRadius: 48, overflow: 'hidden', background: colors.white,
          boxShadow: '0 30px 80px rgba(36,28,32,0.22)', border: `6px solid ${colors.white}`, boxSizing: 'border-box',
          opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 90}px) scale(${0.95 + 0.05 * p}) rotate(${(1 - p) * 2}deg)`,
        }}
      >
        {v.mediaType === 'image' ? (
          <Img src={staticFile(v.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: `scale(${1 + 0.06 * lin(f, sec(beat.start), sec(beat.end))})` }} />
        ) : (
          <OffthreadVideo src={staticFile(v.src)} muted startFrom={sec(v.trim_start || 0)} playbackRate={rate} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        )}
      </div>
      {v.caption ? (
        <div style={{ position: 'absolute', left: 0, width: 1080, top: 1660, display: 'flex', justifyContent: 'center', opacity: Math.min(1, capP * 1.4), transform: `translateY(${(1 - capP) * 20}px)` }}>
          <div style={{ background: colors.rose, color: colors.white, fontFamily: fonts.sans, fontWeight: 800, fontSize: 44, padding: '20px 46px', borderRadius: 999, boxShadow: '0 20px 50px rgba(192,57,107,0.32)', maxWidth: 940, textAlign: 'center' }}>{v.caption}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const PauseBeat = ({ beat }) => {
  const f = useCurrentFrame();
  const total = beat.end - beat.start;
  const t = (f - sec(beat.start)) / 30;
  const digit = Math.max(1, Math.ceil(total - t));
  const prog = Math.min(1, Math.max(0, t / total));
  const inP = pop(f, sec(beat.start));
  const R = 150;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 60, width: 960, top: 420, textAlign: 'center', fontFamily: fonts.sans, fontWeight: 800, fontSize: 96, color: colors.ink, opacity: inP }}>Pause and look</div>
      <div style={{ position: 'absolute', left: 290, top: 760, width: 500, height: 500, opacity: Math.min(1, inP * 1.4), transform: `scale(${0.8 + 0.2 * inP})` }}>
        <svg width="500" height="500" viewBox="0 0 500 500">
          <circle cx="250" cy="250" r={R} fill={colors.white} stroke={roseA(0.18)} strokeWidth="30" />
          <circle cx="250" cy="250" r={R} fill="none" stroke={colors.rose} strokeWidth="30" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * prog} transform="rotate(-90 250 250)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, fontWeight: 800, fontSize: 210, color: colors.rose }}>{digit}</div>
      </div>
    </AbsoluteFill>
  );
};

const AskBeat = ({ beat }) => {
  const f = useCurrentFrame();
  const v = beat.visual;
  const dur = beat.end - beat.start;
  const words = spokenWords(beat, [], false);
  const pillP = pop(f, sec(beat.start + dur * 0.45));
  const logoP = pop(f, sec(beat.end - Math.min(1.1, dur * 0.3)));
  return (
    <AbsoluteFill>
      <Starburst x={540} y={900} size={820} at={sec(beat.start)} opacity={0.07} points={14} />
      <div style={{ position: 'absolute', left: 60, top: 300, width: 960, height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <KineticText words={words} size={words.length <= 6 ? 118 : words.length <= 12 ? 92 : 72} />
      </div>
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 900, display: 'flex', justifyContent: 'center', opacity: Math.min(1, pillP * 1.4), transform: `scale(${0.8 + 0.2 * pillP})` }}>
        <div style={{ background: colors.rose, color: colors.white, fontFamily: fonts.sans, fontWeight: 800, fontSize: 66, padding: '32px 70px', borderRadius: 999, boxShadow: '0 24px 60px rgba(192,57,107,0.35)' }}>{v.pill}</div>
      </div>
      {v.chips.map((c, i) => {
        const p = pop(f, sec(beat.start + dur * 0.55) + i * 8);
        return (
          <div key={c} style={{ position: 'absolute', left: 0, width: 1080, top: 1110 + i * 120, display: 'flex', justifyContent: 'center', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px) scale(${0.88 + 0.12 * p})` }}>
            <div style={{ background: colors.white, color: colors.ink, fontFamily: fonts.sans, fontWeight: 800, fontSize: 56, padding: '16px 60px', borderRadius: 40, boxShadow: '0 14px 36px rgba(36,28,32,0.12)', outline: `5px solid ${roseA(0.5)}`, minWidth: 460, textAlign: 'center' }}>{c}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 1560, display: 'flex', justifyContent: 'center', opacity: logoP, transform: `scale(${0.7 + 0.3 * logoP})` }}>
        <Img src={staticFile('first-look-logo-transparent.png')} style={{ width: 380 }} />
      </div>
    </AbsoluteFill>
  );
};

const BeatView = ({ beat }) => {
  switch (beat.visual.type) {
    case 'cards':
      return <CardsBeat beat={beat} />;
    case 'footage':
      return <FootageBeat beat={beat} />;
    case 'pause':
      return <PauseBeat beat={beat} />;
    case 'ask':
      return <AskBeat beat={beat} />;
    case 'cta':
      return <CtaOutro at={sec(beat.start)} text={`Free access to the app that will ${String(beat.visual.outcome || 'keep your planning on track').replace(/\.$/, '')}.`} />;
    default:
      return <TextBeat beat={beat} />;
  }
};

export const Spec = ({ spec }) => {
  const total = Math.ceil(spec.durationSec * 30);
  return (
    <AbsoluteFill>
      <GridBackground />
      {spec.beats.map((beat, i) => (
        <Beat key={beat.id} from={sec(beat.start)} to={Math.min(total, sec(beat.end))} enter={i !== 0} exit={i !== spec.beats.length - 1}>
          <BeatView beat={beat} />
        </Beat>
      ))}
    </AbsoluteFill>
  );
};
