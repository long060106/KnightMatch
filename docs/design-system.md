# KnightMatch design system

Source of truth for the UI. Tokens live in `src/app/globals.css`; this file explains why.

## Principles

1. **Honey means good news for you.** The honey accent appears only where something is in the
   student's favor: a skill they have, a filled match segment, a new opening, the main action.
   Everything else stays neutral, so gold is never decoration.
2. **The source is always one click away.** Every card shows when it was last checked and links
   to the original KRSP page, which stays the source of truth.
3. **Quiet chrome.** Hairline borders, no drop shadows, no gradients. Hierarchy comes from type
   size, weight and spacing, not boxes.
4. **Encouraging, never gatekeeping.** Say "You meet 2 of 4 listed requirements" and invite people
   to reach out. Never write "not qualified" or "not a fit".
5. **Form follows state.** Open projects get full cards; full teams collapse to one quiet row.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` (paper) | `#FAFAF9` | `#0C0A09` | page |
| `--card` | `#FFFFFF` | `#161412` | cards, panels |
| `--foreground` (ink) | `#1C1917` | `#F5F5F4` | text |
| `--muted-foreground` (graphite) | `#57534E` | `#A8A29E` | secondary text (≥7:1) |
| `--border` (rule) | `#E7E5E4` | `#292524` | hairlines |
| `--input` | `#8C8681` | `#78716C` | form control borders (≥3:1) |
| `--primary` (honey) | `#F2C14E` | `#F2C14E` | main button, checked controls |
| `--honey-ink` | `#8A6100` | `#F2C14E` | honey-colored text (≥5:1) |
| `--honey-wash` | `#FDF3D7` | `#352C1A` | matched skill tags, New pill |
| `--meter-on` | `#B8860B` | `#F2C14E` | filled match segment (≥3:1) |
| `--urgent-ink` / `--urgent-wash` | `#9A3412` / `#FFEDD5` | `#FDBA74` / `#3B2412` | "1 spot left" |

No UCF logos, mascots or official brand styling. Footer always says "Not affiliated with UCF."

## Type

Three voices, each with one job. Size says what to read first; the font says what kind of thing it is.

- **Instrument Serif** (condensed display serif, one weight): headlines, big numbers, project titles,
  step titles. It only has 400, so hierarchy comes from size, never from bold (no `font-semibold`,
  the browser would fake it).
- **Public Sans**: body text, buttons, form controls. Body 16px / 1.6, hero lead 18–20px.
- **IBM Plex Mono**: small uppercase labels (`km-label`: 12px, 500, +0.06em tracking) for the dateline,
  nav links, section labels, stat captions and ticker meta; also UCF course codes (`COP3502C`).
- Scale (px): 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48, plus two display sizes:
  hero headline `clamp(2.75rem, 11.5vw, 5rem)` on phones and container width ÷ 11.2 from 1024px
  (≈103px), and the hero count `clamp(6rem, 4.5rem + 4vw, 8.5rem)`.
- Uppercase is for exactly two things: the hero headline and `km-label` labels. Everything else
  (project titles, body, buttons) is sentence case. Never uppercase a sentence of body text.
- No single highlighted word in headlines, no `→` appended to button text.

## Layout

- Breakpoints: 375 / 768 / 1024 / 1440. Container max 1200px, 16px side gutter on phones.
- ≥1024px: sticky filter sidebar (260px) + one column of cards.
- <1024px: "Filters" button opens a bottom sheet.
- <768px: bottom tab bar (Projects, Match me, Other places); ≥768px: links in the header.
- Touch targets ≥44px on phones; spacing on a 4px grid.

## Homepage hero

Reading order, biggest to smallest:

1. **Headline** (display caps): "Find the research team that's looking for you." From 1024px it is
   two lines justified edge to edge; the first line's hairline stretches to fill, the second spreads
   its words. Phones wrap it naturally, left aligned.
2. **Lead + main button** (left): what to do and the one primary action. "Browse all N projects" is a
   mono label link, clearly secondary.
3. **Proof panel** (right, behind a column rule): the open count huge, "of N teams have open spots",
   one cell per listed team (honey fill = recruiting, outline = full; shape differs, not only color),
   and spots · colleges · new this week as a label row.
4. **Dateline** (top, mono label): "Unofficial guide to Knight Research Scholars" and when the list
   was last checked. Small on purpose: it frames the page, it doesn't lead it.
5. **Ticker** (full bleed under the hero): the recruiting teams' real titles drifting slowly, each a
   link to its project. Pauses on hover, on keyboard focus, off screen and with its own button.

## Shape

Card radius 10px, buttons 8px, tags 6px. Borders 1px. No shadows.

## Motion

Tokens: fast 150ms (hover/press), base 220ms (meter fill, tags), move 300ms (card reorder).
Ease-out `cubic-bezier(.2,.8,.2,1)` for arrivals; exits are ~65% of enter time.

1. **Cards glide** to their new place when filters or sort change (React `<ViewTransition>`,
   browser-native, transition type `filter`).
2. **Match segments fill** one by one (40ms stagger) and tags turn from dashed to ✓.
3. **Title morph** from card to detail page heading (`title-<id>`).
4. **Hover/press**: card lifts 2px with a stronger border (pointer devices only), buttons press to 0.97.
5. **Hero entrance** (CSS keyframes only, plays from the prerendered HTML): headline words rise out
   of their own masks (55ms stagger), the headline rule draws, the lead and buttons fade up, then the
   open cells fill one by one (45ms stagger). Plays once per page load.
6. **Ticker**: one row duplicated and slid by half its width, `linear`, about 10s per team.
   Reduced motion: it stands still and scrolls sideways instead, and the pause button is hidden.

Only `transform` and `opacity` animate. `prefers-reduced-motion` turns all of it off, including
the New pulse. Browsers without View Transitions simply swap content instantly.

## Scroll

Inspired by the scroll storytelling on 3d-discovery.fr, adapted for a tool that must stay fast.

1. **Inertial scrolling** (Lenis) only at ≥1024px with a mouse/trackpad and no reduced-motion
   preference. Phones keep native scrolling. Lenis scrolls the real window, so sticky, anchors
   and Back keep working.
2. **"How KnightMatch works"** sits under the hero. At ≥1024px with motion it pins (CSS
   `position: sticky`, 400vh tall) and scroll walks through steps 01–04. A script writes scroll
   progress to `--p` (0..1) each frame; demo pieces fade in between their own `--a`/`--b`, so the
   example card assembles itself in step with the scroll. A 4-segment rail on the left fills as you go.
   Elsewhere (phones, tablets, reduced motion) it is a plain list that fades in on view, and the
   demo shows only the finished example card.
3. **Returning students** (a saved profile) see it collapsed to one line, decided before first
   paint by the head script, so the list stays near the top and nothing shifts.
4. **Hairlines draw themselves** from the left when they enter view (header, section dividers, footer).
5. **Decode text**: short labels and numbers (the hero count, step numbers, section labels)
   resolve from random characters. Never on paragraphs. Screen readers always get the real text.
6. "Skip to projects" in the hero jumps past the story and moves focus to the list.

Without JavaScript nothing is hidden: hidden start states only apply under `html.js`.
