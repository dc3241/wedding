import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { colors, fonts } from './brandKit';

// -----------------------------------------------------------------------
// First Look motion kit (v1, 2026-10-12).
// Reusable motion vocabulary for ad videos: kinetic word-by-word text, stacked
// notification cards, count-ups, self-drawing spine, status pills, progress
// ring, blur-through beat transitions, plus a "+" grid background with soft
// arcs and generic sparkle / starburst accents (not tied to any outside brand).
// Everything is in First Look colors/fonts. Graphics must mirror real app
// screens and numbers -- never invent stats.
// All timing is in absolute composition frames (30fps); components read
// useCurrentFrame() directly, so do NOT wrap them in <Sequence>.
// -----------------------------------------------------------------------

loadFont({ family: 'Figtree', url: staticFile('fonts/figtree-latin-400-normal.woff2'), weight: '400' });
loadFont({ family: 'Figtree', url: staticFile('fonts/figtree-latin-600-normal.woff2'), weight: '600' });
loadFont({ family: 'Figtree', url: staticFile('fonts/figtree-latin-800-normal.woff2'), weight: '800' });
loadFont({ family: 'Cormorant Garamond', url: staticFile('fonts/cormorant-garamond-latin-500-italic.woff2'), weight: '500', style: 'italic' });

export const FPS = 30;
export const sec = (s) => Math.round(s * FPS);
export const roseA = (a) => `rgba(192,57,107,${a})`;

export const sp = (frame, at, config) =>
  spring({ frame: frame - at, fps: FPS, config: config || { damping: 200 } });
export const pop = (frame, at) => sp(frame, at, { damping: 11, stiffness: 170, mass: 0.7 });
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

// Spread words over [startSec, endSec], weighted by character count.
export const dist = (items, startSec, endSec) => {
  const w = items.map((i) => i.t.length + 1.5);
  const total = w.reduce((a, b) => a + b, 0);
  let cum = 0;
  return items.map((it, i) => {
    const at = sec(startSec + (cum / total) * (endSec - startSec));
    cum += w[i];
    return { ...it, at };
  });
};

// ---- Background ------------------------------------------------------
const Sparkle = ({ x, y, size, phase, color = colors.rose }) => {
  const f = useCurrentFrame();
  const t = 0.5 + 0.5 * Math.sin((f + phase) / 14);
  const s = size * (0.55 + 0.45 * t);
  return (
    <svg width={s * 2} height={s * 2} viewBox="-10 -10 20 20" style={{ position: 'absolute', left: x - s, top: y - s, opacity: 0.25 + 0.4 * t }}>
      <path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" fill={color} />
    </svg>
  );
};

export const GridBackground = () => {
  const f = useCurrentFrame();
  const drift = (f * 0.3) % 90;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.blushBg }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <pattern id="fl-plus" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform={`translate(${drift} ${drift})`}>
            <path d="M45 38v14M38 45h14" stroke={colors.rose} strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round" />
          </pattern>
          <radialGradient id="fl-glow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#FFF6F6" stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.blushBg} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#fl-plus)" />
        <rect width="1080" height="1920" fill="url(#fl-glow)" />
        <g fill="none" stroke={colors.rose} strokeOpacity="0.12" strokeWidth="3">
          <circle cx="1040" cy="260" r={520 + Math.sin(f / 60) * 12} />
          <circle cx="1040" cy="260" r={640 + Math.sin(f / 60 + 1) * 12} strokeDasharray="6 18" />
          <circle cx="40" cy="1700" r={560 + Math.sin(f / 70) * 12} />
          <circle cx="40" cy="1700" r={690 + Math.sin(f / 70 + 1) * 12} strokeDasharray="6 18" />
        </g>
      </svg>
      <Sparkle x={90} y={420} size={26} phase={0} />
      <Sparkle x={990} y={1020} size={20} phase={40} />
      <Sparkle x={160} y={1580} size={30} phase={80} />
      <Sparkle x={930} y={1620} size={18} phase={20} />
    </AbsoluteFill>
  );
};

// Spinning decorative burst (generic shape, brand colors).
export const Starburst = ({ x, y, size, points = 12, color = colors.rose, opacity = 0.14, at = 0, speed = 0.6 }) => {
  const f = useCurrentFrame();
  const p = sp(f, at);
  const r1 = size / 2;
  const r2 = size / 2 * 0.72;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-r1} ${-r1} ${size} ${size}`}
      style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, opacity: opacity * p, transform: `rotate(${f * speed}deg) scale(${0.4 + 0.6 * p})` }}
    >
      <polygon points={pts.join(' ')} fill={color} />
    </svg>
  );
};

// ---- Beat wrapper: blur-through transition ----------------------------
export const Beat = ({ from, to, children, pad = 9, enter = true, exit = true }) => {
  const f = useCurrentFrame();
  if (f < from || f > to + (exit ? pad : 0)) return null;
  const inP = enter ? interpolate(f, [from, from + pad], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  const outP = exit ? interpolate(f, [to, to + pad], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const blur = (1 - inP) * 14 + outP * 14;
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        transform: `translateY(${(1 - inP) * 28 - outP * 18}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---- Kinetic text -----------------------------------------------------
// words: [{ t, at (frame), weight, color, italic, marker, instant }]
export const KineticText = ({ words, size = 96, lineHeight = 1.1, gap = 0.26, style }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: size * gap,
        rowGap: size * 0.02,
        fontFamily: fonts.sans,
        fontSize: size,
        lineHeight,
        color: colors.ink,
        textAlign: 'center',
        ...style,
      }}
    >
      {words.map((w, i) => {
        if (w.br) return <div key={i} style={{ flexBasis: '100%', height: 0 }} />;
        const p = w.instant ? 1 : sp(f, w.at);
        const m = w.marker ? sp(f, w.at + 6) : 0;
        const blur = (1 - p) * 10;
        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * size * 0.4}px) scale(${0.94 + 0.06 * p})`,
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              fontWeight: w.weight || 800,
              color: w.color || colors.ink,
              fontStyle: w.italic ? 'italic' : 'normal',
              fontFamily: w.italic ? fonts.serifItalic : fonts.sans,
              fontSize: w.italic ? size * 1.14 : undefined,
              lineHeight: w.italic ? 0.95 : undefined,
            }}
          >
            {w.marker && (
              <span
                style={{
                  position: 'absolute',
                  left: -8,
                  right: -8,
                  bottom: size * 0.05,
                  height: size * 0.36,
                  background: roseA(0.22),
                  borderRadius: 10,
                  transform: `scaleX(${m})`,
                  transformOrigin: 'left center',
                  zIndex: -1,
                }}
              />
            )}
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

// ---- Count up ---------------------------------------------------------
export const CountUp = ({ to, from = 0, at, dur = 36, suffix = '', style }) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [at, at + dur], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return <span style={style}>{Math.round(v)}{suffix}</span>;
};

// ---- Notification card ------------------------------------------------
export const NotificationCard = ({ x, y, w = 600, title, sub, at, accent = colors.rose, lift = 0 }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  const o = Math.min(1, p * 1.4);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y - lift * p,
        width: w,
        padding: '18px 26px',
        boxSizing: 'border-box',
        borderRadius: 28,
        background: colors.white,
        boxShadow: '0 18px 44px rgba(36,28,32,0.14)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        opacity: o,
        transform: `translateY(${(1 - p) * 70}px) scale(${0.92 + 0.08 * p})`,
        fontFamily: fonts.sans,
      }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 23, background: roseA(0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: accent }} />
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 600, color: colors.ink, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 26, fontWeight: 400, color: colors.editorialMauve, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

// ---- Status pill ------------------------------------------------------
const PILLS = [
  { l: 'To do', bg: '#EDE6E9', fg: '#6E6168' },
  { l: 'In progress', bg: '#FBEBC8', fg: '#8A5A00' },
  { l: 'Done', bg: '#D6EBE0', fg: colors.statusGreen },
];
// changes: frames at which the pill moves to state 1, 2, ...
export const StatusPill = ({ changes, size = 34 }) => {
  const f = useCurrentFrame();
  let idx = 0;
  changes.forEach((c, i) => { if (f >= c) idx = i + 1; });
  const last = idx === 0 ? 0 : changes[idx - 1];
  const p = idx === 0 ? 1 : pop(f, last);
  const s = PILLS[idx];
  return (
    <div
      style={{
        padding: `${size * 0.3}px ${size * 0.8}px`,
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontFamily: fonts.sans,
        fontWeight: 800,
        fontSize: size,
        transform: `scale(${0.8 + 0.2 * p})`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.l}
    </div>
  );
};

// ---- Task row (white card + status pill) --------------------------------
export const TaskRow = ({ x, y, w = 960, title, at, changes }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: 128, boxSizing: 'border-box',
        padding: '0 36px', borderRadius: 32, background: colors.white,
        boxShadow: '0 18px 44px rgba(36,28,32,0.13)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 60}px) scale(${0.94 + 0.06 * p})`,
        fontFamily: fonts.sans,
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 600, color: colors.ink }}>{title}</div>
      <StatusPill changes={changes} />
    </div>
  );
};

// ---- Chip ---------------------------------------------------------------
export const Chip = ({ x, y, label, at, size = 34 }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, padding: `${size * 0.26}px ${size * 0.7}px`,
        borderRadius: 999, background: colors.white, border: `2.5px solid ${roseA(0.45)}`,
        color: colors.ink, fontFamily: fonts.sans, fontWeight: 600, fontSize: size, whiteSpace: 'nowrap',
        opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * p})`, transformOrigin: 'left center',
        boxShadow: '0 8px 20px rgba(36,28,32,0.08)',
      }}
    >
      {label}
    </div>
  );
};

// ---- Progress ring --------------------------------------------------------
export const ProgressRing = ({ cx, cy, r = 130, pct, at, dur = 36, stroke = 26, label }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const c = 2 * Math.PI * r;
  const appear = sp(f, at - 6);
  return (
    <div style={{ position: 'absolute', left: cx - r - stroke, top: cy - r - stroke, width: (r + stroke) * 2, height: (r + stroke) * 2, opacity: appear, transform: `scale(${0.85 + 0.15 * appear})` }}>
      <svg width={(r + stroke) * 2} height={(r + stroke) * 2}>
        <g transform={`translate(${r + stroke} ${r + stroke}) rotate(-90)`}>
          <circle r={r} fill={colors.white} stroke={roseA(0.16)} strokeWidth={stroke} />
          <circle r={r} fill="none" stroke={colors.rose} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (pct / 100) * t)} />
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, fontWeight: 800, fontSize: r * 0.62, color: colors.ink }}>
        <CountUp to={pct} at={at} dur={dur} suffix="%" />
      </div>
    </div>
  );
};

// ---- Spine: self-drawing vertical connector line ---------------------------
// Draws from (x, yFrom) to (x, yTo) between frames [a, b].
export const Spine = ({ x, yFrom, yTo, a, b, width = 8 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const len = Math.abs(yTo - yFrom);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={roseA(0.18)} strokeWidth={width} strokeLinecap="round" strokeDasharray="1 16" />
      <line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={colors.rose} strokeWidth={width} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - t)} />
    </svg>
  );
};

export const SpineNode = ({ x, y, at, big = false }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  const d = big ? 52 : 36;
  return (
    <div style={{ position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d, background: big ? colors.rose : colors.white, border: `${big ? 0 : 8}px solid ${colors.rose}`, boxSizing: 'border-box', transform: `scale(${p})`, boxShadow: `0 0 0 ${10 * p}px ${roseA(0.14)}` }} />
  );
};

export const Label = ({ x, y, at, children, size = 48, weight = 800, color = colors.ink, w }) => {
  const f = useCurrentFrame();
  const p = sp(f, at);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, fontFamily: fonts.sans, fontSize: size, fontWeight: weight, color, lineHeight: 1.05, opacity: p, transform: `translateX(${(1 - p) * -30}px)`, filter: p < 0.98 ? `blur(${(1 - p) * 6}px)` : undefined, whiteSpace: 'nowrap' }}>
      {children}
    </div>
  );
};

// ---- Animated check mark ----------------------------------------------------
export const CheckMark = ({ x, y, size = 64, at, color = colors.statusGreen }) => {
  const f = useCurrentFrame();
  const bg = pop(f, at);
  const d = interpolate(f, [at + 4, at + 16], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, background: color, transform: `scale(${bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 30 30" fill="none">
        <path d="M6 16l6 6 12-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset={40 * d} />
      </svg>
    </div>
  );
};

// ---- Hand-drawn style arrow ---------------------------------------------------
export const DrawArrow = ({ d, a, b, head }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const h = interpolate(f, [b - 4, b + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <path d={d} fill="none" stroke={colors.rose} strokeWidth="9" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - t} />
      <path d={head} fill="none" stroke={colors.rose} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity={h} />
    </svg>
  );
};

// ---- CTA outro (added 2026-10-12) ------------------------------------------
// Closing beat for every video: a generic comment box types "Look", a rose
// headline above it, the spoken outcome line sits under it, then the
// logo. `at` = frame of the first spoken CTA word. `text` = the outcome clause
// exactly as spoken, e.g. "the app that will keep your budget in check."
export const CtaOutro = ({ at, text }) => {
  const f = useCurrentFrame();
  const boxP = sp(f, at);
  const typed = Math.max(0, Math.min(4, Math.floor((f - (at + 12)) / 4)));
  const cursorOn = Math.floor(f / 8) % 2 === 0;
  const postP = pop(f, at + 30);
    const textP = sp(f, at + 18);
  const logoP = pop(f, at + 90);
  return (
    <AbsoluteFill>
      <Starburst x={540} y={620} size={760} at={at} opacity={0.07} points={14} />
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 250, textAlign: 'center', fontFamily: fonts.sans, fontWeight: 800, fontSize: 84, color: colors.ink, lineHeight: 1.08, opacity: textP, transform: `translateY(${(1 - textP) * 30}px)` }}>
        Comment <span style={{ color: colors.rose }}>“Look”</span>
        <br />to get <span style={{ background: roseA(0.18), borderRadius: 14, padding: '0 14px' }}>free access</span>
      </div>
      <div style={{ position: 'absolute', left: 140, width: 800, top: 640, height: 150, borderRadius: 80, background: colors.white, boxShadow: '0 24px 60px rgba(36,28,32,0.14)', display: 'flex', alignItems: 'center', padding: '0 34px', gap: 24, opacity: boxP, transform: `scale(${0.88 + 0.12 * boxP}) translateY(${(1 - boxP) * 40}px)`, boxSizing: 'border-box' }}>
        <div style={{ width: 76, height: 76, borderRadius: 76, background: roseA(0.22), flexShrink: 0 }} />
        <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 60, color: colors.ink, flex: 1, whiteSpace: 'nowrap' }}>
          {typed === 0 ? <span style={{ color: 'rgba(36,28,32,0.35)', fontWeight: 400 }}>Add a comment</span> : 'Look'.slice(0, typed)}
          {typed > 0 && typed < 4 && cursorOn ? <span style={{ color: colors.rose }}>|</span> : null}
        </div>
        <div style={{ padding: '18px 38px', borderRadius: 999, background: colors.rose, color: colors.white, fontFamily: fonts.sans, fontWeight: 800, fontSize: 44, transform: `scale(${postP})`, opacity: Math.min(1, postP * 1.4) }}>Post</div>
      </div>
      <div style={{ position: 'absolute', left: 90, width: 900, top: 930, textAlign: 'center', fontFamily: fonts.sans, fontWeight: 600, fontSize: 54, lineHeight: 1.2, color: colors.ink, opacity: sp(f, at + 62), transform: `translateY(${(1 - sp(f, at + 62)) * 24}px)` }}>
        {text}
      </div>
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 1280, display: 'flex', justifyContent: 'center', opacity: logoP, transform: `scale(${0.7 + 0.3 * logoP})` }}>
        <Img src={staticFile('first-look-logo-transparent.png')} style={{ width: 470 }} />
      </div>
    </AbsoluteFill>
  );
};

// =======================================================================
// Chat kit (added 2026-10-15 for "Nobody reads your invitation").
// iMessage-style guest bubbles, typing dots, a link-reply card, a stamped
// invitation card and a blank page wireframe. First Look colors only; no
// outside-brand look. Illustrative chat text only -- no stats.
// =======================================================================

// Guest bubble (left, white) or reply bubble (right, rose). `buzz` shakes it on arrival.
export const ChatBubble = ({ x, y, w, text, at, side = 'left', size = 42, buzz = false, name }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  const mine = side === 'right';
  const shakeT = f - at;
  const shake = buzz && shakeT > 0 && shakeT < 14 ? Math.sin(shakeT * 2.1) * (14 - shakeT) * 1.1 : 0;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, boxSizing: 'border-box',
        fontFamily: fonts.sans, opacity: Math.min(1, p * 1.5),
        transform: `translate(${shake + (mine ? (1 - p) * 60 : (1 - p) * -60)}px, ${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
        transformOrigin: mine ? 'right bottom' : 'left bottom',
      }}
    >
      {name && <div style={{ fontSize: 26, fontWeight: 600, color: colors.editorialMauve, margin: '0 0 6px 26px' }}>{name}</div>}
      <div
        style={{
          padding: '22px 34px', borderRadius: 46,
          borderBottomLeftRadius: mine ? 46 : 14, borderBottomRightRadius: mine ? 14 : 46,
          background: mine ? colors.rose : colors.white, color: mine ? colors.white : colors.ink,
          fontSize: size, fontWeight: 600, lineHeight: 1.15,
          boxShadow: '0 14px 34px rgba(36,28,32,0.12)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Typing indicator: three dots that keep bouncing (never settles).
export const TypingDots = ({ x, y, at }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: 190, height: 94, borderRadius: 47, borderBottomLeftRadius: 14,
        background: colors.white, boxShadow: '0 14px 34px rgba(36,28,32,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        opacity: Math.min(1, p * 1.5), transform: `scale(${0.8 + 0.2 * p})`, transformOrigin: 'left bottom',
      }}
    >
      {[0, 1, 2].map((i) => {
        const t = Math.sin((f - at - i * 5) / 4.5);
        return <div key={i} style={{ width: 20, height: 20, borderRadius: 20, background: '#B9AAB0', transform: `translateY(${-Math.max(0, t) * 10}px)`, opacity: 0.55 + 0.45 * Math.max(0, t) }} />;
      })}
    </div>
  );
};

// Reply bubble (right, rose) holding a white link preview card.
export const LinkReplyCard = ({ x, y, w = 760, at, title = 'Our wedding details', url }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  const d = sp(f, at + 14);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, boxSizing: 'border-box', fontFamily: fonts.sans,
        opacity: Math.min(1, p * 1.5), transform: `translate(${(1 - p) * 70}px, ${(1 - p) * 40}px) scale(${0.92 + 0.08 * p})`, transformOrigin: 'right bottom',
      }}
    >
      <div style={{ padding: 14, borderRadius: 46, borderBottomRightRadius: 14, background: colors.rose, boxShadow: '0 16px 38px rgba(192,57,107,0.28)' }}>
        <div style={{ background: colors.white, borderRadius: 34, padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 78, height: 78, borderRadius: 24, background: roseA(0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.rose} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: colors.ink, lineHeight: 1.1 }}>{title}</div>
            {url && <div style={{ fontSize: 28, fontWeight: 400, color: colors.editorialMauve, marginTop: 4, whiteSpace: 'nowrap' }}>{url}</div>}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 26, fontWeight: 600, color: colors.editorialMauve, margin: '8px 14px 0 0', opacity: d }}>Delivered</div>
    </div>
  );
};

// Invitation card whose detail lines get stamped one by one.
// rows: [{ label, at }]  (frames)
export const InviteCard = ({ x, y, w = 700, h = 980, at = 0, names, rows, rotate = -2 }) => {
  const f = useCurrentFrame();
  const p = sp(f, at);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box',
        background: '#FFFDFB', borderRadius: 40, border: `2px solid ${roseA(0.18)}`,
        boxShadow: '0 40px 80px rgba(36,28,32,0.2), 0 10px 24px rgba(36,28,32,0.1)',
        opacity: p, transform: `translateY(${(1 - p) * 120}px) rotate(${rotate * p}deg) scale(${0.92 + 0.08 * p})`,
        fontFamily: fonts.sans, textAlign: 'center', padding: '70px 56px',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 6, color: colors.editorialMauve }}>TOGETHER WITH THEIR FAMILIES</div>
      <div style={{ fontFamily: fonts.serifItalic, fontStyle: 'italic', fontWeight: 500, fontSize: 118, lineHeight: 1, color: colors.ink, margin: '34px 0 14px' }}>{names}</div>
      <div style={{ fontSize: 34, color: colors.editorialMauve }}>invite you to celebrate</div>
      <div style={{ margin: '44px auto 40px', width: 220, height: 3, background: roseA(0.35), borderRadius: 2 }} />
      {rows.map((r, i) => {
        const rp = pop(f, r.at);
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 26, height: 128 }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ height: 22, width: `${78 - i * 12}%`, background: '#EFE6E8', borderRadius: 11, marginBottom: 16 }} />
              <div style={{ height: 22, width: `${48 + i * 6}%`, background: '#F4ECEE', borderRadius: 11 }} />
            </div>
            <div
              style={{
                padding: '12px 26px', borderRadius: 999, background: roseA(0.12), border: `3px solid ${colors.rose}`,
                color: colors.rose, fontWeight: 800, fontSize: 34, letterSpacing: 1, whiteSpace: 'nowrap',
                opacity: Math.min(1, rp * 1.5), transform: `scale(${0.5 + 0.5 * rp}) rotate(${(1 - rp) * -14 + 4}deg)`,
              }}
            >
              {r.label} ✓
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Blank page wireframe: "somewhere easier to look".
export const WireCard = ({ x, y, w = 620, h = 820, at }) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  const bars = [0.9, 0.62, 0.8, 0.5];
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', borderRadius: 40,
        background: colors.white, boxShadow: '0 34px 70px rgba(36,28,32,0.16)', padding: 44,
        opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 90}px) scale(${0.9 + 0.1 * p})`,
      }}
    >
      <div style={{ height: 150, borderRadius: 26, background: roseA(0.16), marginBottom: 40 }} />
      {bars.map((b, i) => {
        const bp = sp(f, at + 8 + i * 5);
        return <div key={i} style={{ height: 26, width: `${b * 100 * bp}%`, borderRadius: 13, background: '#EFE6E8', marginBottom: 30 }} />;
      })}
      <div style={{ marginTop: 50, height: 92, width: '58%', borderRadius: 46, background: roseA(0.3) }} />
    </div>
  );
};
