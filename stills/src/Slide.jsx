import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {tokens, themes, softStack, fontSans} from './brand.js';
import {Wordmark} from './Wordmark.jsx';

const tones = {
  good: [tokens.sageSoft, tokens.sage],
  warn: [tokens.amberSoft, tokens.amber],
  bad: [tokens.redSoft, tokens.red],
  neutral: ['#F1EBED', tokens.muted],
};

// Pick a font size so `text` fits `avail` px in at most 3 balanced lines.
const fitSize = (text, avail, max) => {
  const chars = text.length;
  for (let n = 1; n <= 3; n++) {
    const s = avail / (Math.ceil(chars / n) * 1.06 * 0.5);
    if (s >= max * 0.72 || n === 3) return Math.min(max, s);
  }
  return max;
};

const Headline = ({text, t, u, avail, max, align = 'center', highlight}) => {
  const size = fitSize(text, avail, max);
  let content = text;
  if (highlight && text.includes(highlight)) {
    const [a, ...rest] = text.split(highlight);
    content = (
      <>
        {a}
        <span style={{color: t.hi}}>{highlight}</span>
        {rest.join(highlight)}
      </>
    );
  }
  return (
    <div
      style={{
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.03,
        textAlign: align,
        color: t.fg,
        textWrap: 'balance',
      }}
    >
      {content}
    </div>
  );
};

const Support = ({text, t, u, align = 'center', size = 38, maxWidth}) =>
  text ? (
    <div
      style={{
        marginTop: 26 * u,
        fontSize: size * u,
        lineHeight: 1.3,
        fontWeight: 500,
        color: t.fg2,
        textAlign: align,
        maxWidth,
        textWrap: 'balance',
      }}
    >
      {text}
    </div>
  ) : null;

// Inline SVG icons: no dependence on fallback fonts, so output is identical on any host.
const Icon = ({kind, color, size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0, marginTop: size * 0.12}}>
    {kind === 'check' ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
  </svg>
);

const Pill = ({children, tone = 'neutral', u}) => (
  <div
    style={{
      background: tones[tone][0],
      color: tones[tone][1],
      fontWeight: 600,
      fontSize: 26 * u,
      padding: `${10 * u}px ${22 * u}px`,
      borderRadius: 999,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const Cta = ({t, u, label, url}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 22 * u}}>
    <div
      style={{
        background: t.ctaBg,
        color: t.ctaFg,
        fontWeight: 700,
        fontSize: 32 * u,
        padding: `${18 * u}px ${40 * u}px`,
        borderRadius: 999,
      }}
    >
      {label}
    </div>
    <div style={{color: t.url, fontWeight: 700, fontSize: 34 * u}}>{url}</div>
  </div>
);

// One raised white card, used by list layouts.
const Card = ({children, u, style}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 40 * u,
      boxShadow: softStack,
      padding: `${34 * u}px ${44 * u}px`,
      color: tokens.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------- layouts ----------

const HeadlineCard = ({spec, t, u, W, H}) => {
  const d = spec.data || {};
  const rows = (d.rows || []).slice(0, 5);
  const tabs = d.tabs || [];
  return (
    <>
      <div style={{textAlign: 'center'}}>
        <Headline text={spec.headline} t={t} u={u} avail={W - 140 * u} max={116 * u} />
        <Support text={spec.support} t={t} u={u} />
      </div>
      <Card u={u} style={{width: '100%'}}>
        {tabs.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8 * u,
              width: 'fit-content',
              margin: `0 auto ${14 * u}px`,
              background: tokens.canvas,
              borderRadius: 999,
              padding: 8 * u,
            }}
          >
            {tabs.map((tab, i) => (
              <div
                key={tab}
                style={{
                  padding: `${12 * u}px ${34 * u}px`,
                  borderRadius: 999,
                  fontSize: 27 * u,
                  fontWeight: 600,
                  background: i === 0 ? '#fff' : 'transparent',
                  color: i === 0 ? tokens.ink : tokens.muted,
                  boxShadow: i === 0 ? '0 1px 3px rgba(36,28,32,0.12)' : 'none',
                }}
              >
                {tab}
              </div>
            ))}
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.label + i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: `${24 * u}px 0`,
              borderTop: i === 0 ? 'none' : `${2 * u}px solid ${tokens.line}`,
            }}
          >
            <div style={{fontSize: 34 * u, fontWeight: 600}}>{r.label}</div>
            <Pill tone={r.tone} u={u}>{r.status}</Pill>
          </div>
        ))}
      </Card>
    </>
  );
};

const WEBSITE_SHOTS = new Set(['where-when', 'timeline', 'look']);

const PhoneShell = ({w, ring = 'transparent', shot, children}) => {
  const p = w / 500;
  const baked = WEBSITE_SHOTS.has(shot);
  return (
    <div
      style={{
        width: w,
        height: w * 2.05,
        borderRadius: 74 * p,
        background: '#1B1417',
        padding: 12 * p,
        boxShadow: `0 0 0 ${4 * p}px ${ring}, ${softStack}`,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 62 * p,
          background: tokens.canvas,
          overflow: 'hidden',
          position: 'relative',
          padding: baked ? 0 : `${74 * p}px ${28 * p}px ${28 * p}px`,
          boxSizing: 'border-box',
          color: tokens.ink,
        }}
      >
        {baked ? (
          <Img
            src={staticFile(`website/${shot}.png`)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
        ) : (
          children(p)
        )}
        <div
          style={{
            position: 'absolute',
            top: 16 * p,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 130 * p,
            height: 36 * p,
            borderRadius: 999,
            background: '#1B1417',
          }}
        />
      </div>
    </div>
  );
};

const HeadlinePhone = ({spec, t, u, W, H}) => {
  const d = spec.data || {};
  const hero = d.hero || {};
  const items = (d.items || []).slice(0, 4);
  const prog = d.progress;
  const bullets = (d.bullets || []).slice(0, 5);
  const visible = H - 640 * u;
  const phoneW = Math.min(500 * u, visible / 1.54);
  return (
    <>
      <div style={{alignSelf: 'flex-start', marginTop: 44 * u}}>
        <Headline text={spec.headline} t={t} u={u} avail={W - 140 * u} max={92 * u} align="left" />
        <Support text={spec.support} t={t} u={u} align="left" maxWidth={780 * u} size={36} />
      </div>
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: -H * 0.0,
        }}
      >
        <div style={{transform: `translateY(${phoneW * 0.06}px)`}}>
          <PhoneShell w={phoneW} ring={t.ring} shot={d.shot}>
            {(p) => (
              <div>
                <div style={{background: '#fff', borderRadius: 28 * p, padding: 26 * p, boxShadow: softStack}}>
                  <div style={{fontSize: 22 * p, color: tokens.muted, fontWeight: 600}}>{hero.label}</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 14 * p, marginTop: 6 * p}}>
                    <div style={{fontSize: 60 * p, fontWeight: 800, letterSpacing: -1.5 * p}}>{hero.value}</div>
                    {hero.chip && (
                      <div style={{background: tokens.accentSoft, color: tokens.accent, fontWeight: 700, fontSize: 20 * p, padding: `${6 * p}px ${14 * p}px`, borderRadius: 999}}>
                        {hero.chip}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize: 24 * p, marginTop: 8 * p, fontWeight: 500}}>{hero.sub}</div>
                </div>
                {d.listTitle && (
                  <div style={{fontSize: 24 * p, fontWeight: 700, margin: `${26 * p}px 0 ${12 * p}px`}}>{d.listTitle}</div>
                )}
                {items.map((it, i) => (
                  <div
                    key={it.label + i}
                    style={{
                      background: '#fff',
                      borderRadius: 22 * p,
                      padding: `${18 * p}px ${22 * p}px`,
                      marginBottom: 12 * p,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 22 * p,
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(36,28,32,0.06)',
                    }}
                  >
                    <span>{it.label}</span>
                    <span style={{color: tones[it.tone || 'neutral'][1], fontWeight: 700}}>{it.note}</span>
                  </div>
                ))}
                {prog && (
                  <div style={{background: '#fff', borderRadius: 22 * p, padding: `${20 * p}px ${22 * p}px`, marginTop: 14 * p, boxShadow: '0 1px 2px rgba(36,28,32,0.06)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 21 * p, fontWeight: 600}}>
                      <span style={{color: tokens.muted}}>{prog.label}</span>
                      <span>{prog.value}</span>
                    </div>
                    <div style={{height: 14 * p, borderRadius: 999, background: tokens.canvas, marginTop: 14 * p}}>
                      <div style={{width: `${prog.pct}%`, height: '100%', borderRadius: 999, background: tokens.sage}} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </PhoneShell>
        </div>
        <div style={{width: 340 * u, paddingBottom: (H / W > 1.6 ? 280 : 130) * u, color: t.fg}}>
          {d.bulletsTitle && <div style={{fontSize: 34 * u, fontWeight: 800, marginBottom: 20 * u}}>{d.bulletsTitle}</div>}
          {bullets.map((b) => (
            <div key={b} style={{display: 'flex', gap: 14 * u, fontSize: 27 * u, lineHeight: 1.25, fontWeight: 500, marginBottom: 16 * u}}>
              <Icon kind="check" color={t.hi} size={27 * u} />
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const BigNumber = ({spec, t, u, W}) => {
  const d = spec.data || {};
  const size = fitSize(d.value || '', W - 140 * u, 300 * u);
  return (
    <div style={{textAlign: 'center', width: '100%'}}>
      <div style={{fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.04, color: t.hi}}>{d.value}</div>
      <div style={{marginTop: 30 * u, fontWeight: 800, fontSize: 60 * u, lineHeight: 1.08, letterSpacing: -1.5 * u, color: t.fg, textWrap: 'balance'}}>
        {spec.headline}
      </div>
      <Support text={spec.support} t={t} u={u} />
    </div>
  );
};

const BeforeAfter = ({spec, t, u, W, H}) => {
  const d = spec.data || {};
  const side = H / W < 1.4;
  const List = ({items, good}) =>
    items.slice(0, 4).map((x) => (
      <div key={x} style={{display: 'flex', gap: 16 * u, fontSize: 31 * u, lineHeight: 1.25, fontWeight: 500, marginBottom: 20 * u}}>
        <Icon kind={good ? 'check' : 'cross'} color={good ? tokens.sage : tokens.red} size={31 * u} />
        <span>{x}</span>
      </div>
    ));
  return (
    <>
      <div style={{textAlign: 'center'}}>
        <Headline text={spec.headline} t={t} u={u} avail={W - 140 * u} max={100 * u} />
        <Support text={spec.support} t={t} u={u} />
      </div>
      <div style={{display: 'flex', flexDirection: side ? 'row' : 'column', gap: 28 * u, width: '100%'}}>
        <Card u={u} style={{flex: 1, background: '#EFE8EA', boxShadow: 'none'}}>
          <div style={{fontSize: 26 * u, fontWeight: 700, color: tokens.muted, marginBottom: 22 * u, letterSpacing: 1.5 * u}}>{(d.beforeTitle || 'Before').toUpperCase()}</div>
          <List items={d.before || []} />
        </Card>
        <Card u={u} style={{flex: 1}}>
          <div style={{fontSize: 26 * u, fontWeight: 700, color: tokens.accent, marginBottom: 22 * u, letterSpacing: 1.5 * u}}>{(d.afterTitle || 'After').toUpperCase()}</div>
          <List items={d.after || []} good />
        </Card>
      </div>
    </>
  );
};

const TipList = ({spec, t, u, W}) => {
  const tips = ((spec.data || {}).tips || []).slice(0, 5);
  return (
    <>
      <div style={{alignSelf: 'flex-start'}}>
        <Headline text={spec.headline} t={t} u={u} avail={W - 140 * u} max={92 * u} align="left" />
        <Support text={spec.support} t={t} u={u} align="left" />
      </div>
      <div style={{width: '100%'}}>
        {tips.map((tip, i) => (
          <div key={tip.title} style={{display: 'flex', gap: 32 * u, alignItems: 'baseline', padding: `${28 * u}px 0`, borderTop: `${2 * u}px solid ${t.rule}`}}>
            <div style={{fontWeight: 800, fontSize: 84 * u, lineHeight: 1, color: t.hi, minWidth: 70 * u}}>{i + 1}</div>
            <div>
              <div style={{fontWeight: 700, fontSize: 44 * u, lineHeight: 1.15, color: t.fg}}>{tip.title}</div>
              {tip.body && <div style={{fontWeight: 500, fontSize: 34 * u, lineHeight: 1.3, marginTop: 8 * u, color: t.fg2}}>{tip.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const Steps = ({spec, t, u, W}) => {
  const steps = ((spec.data || {}).steps || []).slice(0, 4);
  return (
    <>
      <div style={{alignSelf: 'flex-start'}}>
        <Headline text={spec.headline} t={t} u={u} avail={W - 140 * u} max={76 * u} align="left" />
      </div>
      <div style={{width: '100%'}}>
        {steps.map((s, i) => (
          <div key={s.word} style={{padding: `${26 * u}px 0`, borderTop: `${2 * u}px solid ${t.rule}`}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 26 * u}}>
              <div style={{fontWeight: 700, fontSize: 34 * u, color: t.hi}}>0{i + 1}</div>
              <div style={{fontWeight: 800, fontSize: 118 * u, lineHeight: 1, letterSpacing: -3 * u, color: t.fg}}>{s.word}</div>
            </div>
            <div style={{fontWeight: 500, fontSize: 36 * u, marginTop: 10 * u, marginLeft: 76 * u, color: t.fg2}}>{s.caption}</div>
          </div>
        ))}
      </div>
    </>
  );
};

const Statement = ({spec, t, u, W}) => (
  <div style={{width: '100%'}}>
    <Headline text={spec.headline} t={t} u={u} avail={W - 140 * u} max={132 * u} align="left" highlight={(spec.data || {}).highlight} />
    <Support text={spec.support} t={t} u={u} align="left" size={40} maxWidth={820 * u} />
  </div>
);

const layouts = {
  'headline-card': HeadlineCard,
  'headline-phone': HeadlinePhone,
  'big-number': BigNumber,
  'before-after': BeforeAfter,
  'tip-list': TipList,
  steps: Steps,
  statement: Statement,
};
export const layoutNames = Object.keys(layouts);

// The one component the renderer calls. `spec` is the whole contract.
export const Slide = ({spec, width, height}) => {
  const t = themes[spec.theme] || themes.blush;
  const u = width / 1080;
  const tall = height / width > 1.6;
  // Same 280px TikTok inset as satori-slide.tsx. Equal top and bottom.
  const edge = (tall ? 280 : 70) * u;
  const Layout = layouts[spec.layout] || Statement;
  const left = ['headline-phone', 'tip-list', 'steps', 'statement'].includes(spec.layout);
  const showCta = spec.cta !== false;
  return (
    <AbsoluteFill
      style={{
        background: t.bg,
        fontFamily: fontSans,
        alignItems: left ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        padding: `${edge}px ${70 * u}px ${spec.layout === 'headline-phone' ? 0 : edge}px`,
        overflow: 'hidden',
        color: t.fg,
      }}
    >
      <Wordmark size={(left ? 54 : 62) * u} color={t.wm} dot={t.dot} />
      <Layout spec={spec} t={t} u={u} W={width} H={height} />
      {showCta && spec.layout !== 'headline-phone' ? (
        <Cta t={t} u={u} label={spec.ctaLabel || 'Start free'} url={spec.url || 'usefirstlook.app'} />
      ) : spec.layout === 'headline-phone' ? null : <div />}
    </AbsoluteFill>
  );
};
