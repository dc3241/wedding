# First Look stills: handoff for Cursor

Replace KIE/Seedream with a Remotion still renderer behind the existing content queue. Ideation, review board, approve/deny, the bank, storage in `content-queue-assets`, and the "wait until every slide path is filled" rule do not change.

## Decisions already made (with Dom)

- Renderer: **Remotion `renderStill`**, one composition (`Slide`) driven by a JSON spec. After the visuals are approved, port one layout to **Satori** (`next/og`) and compare. Wire Satori into Produce only if its shadow and phone bezel hold up at pin size. Otherwise keep Remotion on a render host. Do not let the visual proof decide the renderer.
- Accent is **`#C0396B`** (`--accent` in `globals.css`). Update the video kit (`brandKit.js`, currently `#C13868`) to match.
- Phones: a **drawn bezel** (component-built, contents authored by the template) on the `headline-phone` layout. Flat raised card on list layouts. The "no phone frames" line in `product-shots.ts` was a Seedream guard, not a brand rule, and should not apply to this renderer.
- Wordmark: use the real `components/brand/Wordmark.tsx` SVG. `src/Wordmark.jsx` here is a **stand-in** (Figtree "First", Cormorant italic "Look", dot). Replace it. Headlines and body stay Figtree only.
- Layout, theme, and format variety come from templates and code, **not from prompts**. The user only clicks Generate.

## What's in this folder

```
src/brand.js       tokens, themes, formats, soft-stack shadow, font loading
src/Wordmark.jsx   STAND-IN wordmark (replace with real SVG)
src/Slide.jsx      7 layouts + shared Card/Pill/Cta/Icon/PhoneShell; exports Slide
src/index.jsx      registers the single Still "Slide"; calculateMetadata sets size from spec.format
render.mjs         renderSlides(specs, outDir): bundles once, renders one PNG per spec
sample-specs.json  one example spec per layout (use as fixtures and as the schema reference)
public/fonts/      Figtree 400-800 + Cormorant Garamond 500 italic (woff2, from @fontsource, OFL)
```

Run: `node render.mjs specs.json out/` where `specs.json` is an array of specs. It renders about 49 slides in around 30 seconds on the container I used. `BROWSER_EXECUTABLE` overrides the Chromium path. On a normal host or Remotion Lambda, remove the hardcoded `browserExecutable` and `gl: 'swiftshader'` options.

## The spec (the whole contract between the app and the renderer)

```ts
type Slide = {
  format: 'tiktok' | 'pin' | 'ig';        // 1080x1920 | 1000x1500 | 1080x1350 (exact 4:5)
  layout: 'headline-card' | 'headline-phone' | 'big-number' | 'before-after'
        | 'tip-list' | 'steps' | 'statement';
  theme: 'blush' | 'white' | 'ink' | 'rose' | 'sage';
  headline: string;
  support?: string;
  cta?: boolean;            // default true. false for pure-tip slides and non-final carousel slides
  ctaLabel?: string;        // default "Start free"
  url?: string;             // default "usefirstlook.app"
  data?: LayoutData;        // per layout, below
};
```

| layout | data | notes |
|---|---|---|
| `headline-card` | `{tabs?: string[]; rows: {label, status, tone: 'good'\|'warn'\|'bad'\|'neutral'}[]}` | max 5 rows. List slides (guests, leads, vendors). |
| `headline-phone` | `{hero:{label,value,chip?,sub}, listTitle?, items?:{label,note,tone}[], progress?:{label,value,pct}, bulletsTitle?, bullets?: string[]}` | max 4 items, 5 bullets. Left-aligned. Draws its own CTA text; `url` shown via bullets column. |
| `big-number` | `{value: string}` | `headline` is the caption under the number. |
| `before-after` | `{beforeTitle?, before: string[], afterTitle?, after: string[]}` | max 4 per side. Side by side when the frame is under 1.4 aspect, stacked otherwise. |
| `tip-list` | `{tips: {title, body?}[]}` | max 5. Numbered. Good for type A (Pure Tip). |
| `steps` | `{steps: {word, caption}[]}` | max 4. Big one-word steps. |
| `statement` | `{highlight?: string}` | text only. `highlight` must be a substring of `headline`. Works for `[surface: none]` slides. |

Headline size auto-fits (`fitSize` in `Slide.jsx`, assumes about 0.5em average glyph width and up to 3 balanced lines). Everything else scales from `u = width / 1080`.

## What the app needs to build (mapping to the existing repo)

1. **Planner output** (`lib/admin/content-queue/plan.ts`): keep caption, content types A/B/C/D, the plug rule, `[surface: slug]` / `[surface: none]`. Change the slide output from an image prompt to a spec fragment: `layout` (from an allowed list by content shape), `headline`, `support`, `data`. Validate with zod. On failure retry once, then fall back to `statement`.
2. **Selection in code, not in the model:**
   - `theme`: rotate. Query the last ~6 `content_queue` rows for the same platform and avoid repeating the same theme or the same layout + theme pair. Keep a `disabledThemes` / `disabledLayouts` config so a denied style can be switched off in one place.
   - `layout` suitability: list/status content -> `headline-card`; product screens (`[surface: slug]`) -> `headline-card` or `headline-phone`; a single stat -> `big-number`; contrast content -> `before-after`; numbered advice -> `tip-list`; process -> `steps`; everything else -> `statement`.
   - Carousels: choose one theme for the whole carousel. Slide 1 = `statement` or `big-number` (cover), middle slides vary layout, last slide has `cta: true`, earlier slides `cta: false`.
   - Format: pin -> `pin`; TikTok -> `tiktok`; Instagram -> `ig` (drops the 3:4 workaround in `kie-aspect.ts`). **LinkedIn size is not built yet** (add to `formats` in `brand.js`, then test each layout).
3. **Surface data** (`matchProductShot`, 18 slugs): each slug needs a small builder that returns the `data` for `headline-card` or `headline-phone`, drawing the labels itself (for example the budget wells from `product-shots.ts`). This is the main remaining template work. Never embed the raw screenshots.
4. **Persist the spec.** Store each slide's full spec JSON on the queue row (for example `slide_specs jsonb`). Then:
   - **Regenerate** re-renders the same spec (fixes small problems).
   - **Shuffle** keeps the copy and re-picks layout and/or theme via the selector, excluding the current one.
5. **Produce / Regenerate:** call the renderer with the specs, upload PNGs to `content-queue-assets`, write `image_paths`. Remove `requestGeneration`, the KIE webhook, `kie_task_ids`, and the reference PNG once parity is reached.
6. **Render host** (Chromium cannot run in the 300s Vercel function): a small container with `POST /render {spec} -> PNG` around `renderSlides`, or Remotion Lambda. Stills render in a few seconds each. Produce can wait.

## Satori check (after the visuals are approved)

Port `headline-card` (blush theme) and `headline-phone` to `ImageResponse`. Pass criteria at pin size: the soft-stack shadow (two layers, second at -8px spread) looks equivalent, the phone bezel border radius and inner clipping hold, and text wraps the same. Satori needs TTF/OTF/WOFF (not woff2) and supports a CSS subset (flexbox only, limited shadows). If both pass, wire Satori into Produce and skip the render host.

## Known gaps and things I did not verify

- **Wordmark is a stand-in** (see above). Replace with the real SVG.
- **Sample numbers are placeholders**: "$18,400 of $32,600" and the "17 days" florist example are invented for layout testing. Only Allocated $32,600 came from `product-shots.ts`.
- **Text fit is heuristic.** Headlines auto-size, but long list labels, long pill text, and long bullets are not measured. Add length limits in the zod schema and render-test worst-case copy (for example a 70-character headline or a 40-character row label).
- Fonts are the **Latin subset** only. Non-Latin characters or emoji in AI copy will fall back to system fonts and differ by host. Strip or reject them in validation.
- Checks and crosses are inline SVG on purpose (Figtree has no such glyphs, so text glyphs would render from host-dependent fallbacks). Keep icons as SVG.
- Only `pin`, `tiktok`, and `ig` are tested (all seven layouts at each). `square` and LinkedIn are not built.
- Contrast: pink highlight text on the `rose` theme is intentionally lightened but is worth a manual look. The `ink` theme uses `#F08DB2` for accent text (a lighter tint of the accent) because `#C0396B` is low-contrast on the dark background.
- Not built: photo backgrounds (nothing in the live format list needs them). If added later, use a separate background image with these stills placing type on top.
- No animation: `renderStill` only. The video project is separate; do not import from it.
