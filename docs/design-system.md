# KnightMatch design system

Source of truth for the UI. Tokens live in `src/app/globals.css`; this file explains why.

## Principles

1. **Honey means good news for you.** The honey accent appears only where something is in the
   student's favor: a skill they have, a filled match segment, a new opening, the main action.
   Everything else stays neutral, so gold is never decoration.
2. **The source is always one click away.** Every card shows when it was last checked and links
   to the original KRSP page, which stays the source of truth.
3. **Quiet chrome.** Hairline borders, square corners, no drop shadows, no gradients. Hierarchy
   comes from type size and spacing, not boxes: lists are ruled rows, not cards.
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
- **Public Sans**: body text, buttons, form controls. Body 16px / 1.6.
- **IBM Plex Mono**: small uppercase labels (`km-label`: 12px, 500, +0.06em tracking) for the dateline,
  nav links, section labels, stat captions and ticker meta; the short hero lead paragraph (`km-lead`:
  15px / 1.65, uppercase, justified from 640px, left aligned on phones); also UCF course codes (`COP3502C`).
- Scale (px): 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48, plus two display sizes:
  hero headline `clamp(2.75rem, 11.5vw, 6.5rem)` below 1024px and container width ÷ 11.2 from 1024px
  (≈103px), and the recruiting count `clamp(8rem, 5rem + 10vw, 13rem)`.
- Uppercase is for the hero headline, `km-label` labels and the short `km-lead` hero paragraph.
  Everything else (project titles, body, buttons) is sentence case. Never use `km-lead` for more
  than a few lines.
- No single highlighted word in headlines, no `→` appended to button text.

## Layout

- Breakpoints: 375 / 768 / 1024 / 1440. Container max 1200px, 16px side gutter on phones.
- ≥1024px: sticky filter sidebar (260px) + one column of cards.
- <1024px: "Filters" button opens a bottom sheet.
- <768px: bottom tab bar (Projects, Match me, Other places); ≥768px: links in the header.
- Touch targets ≥44px on phones; spacing on a 4px grid.

## Pages

- **`/` (introduction)**: says what KnightMatch is for and gets out of the way. Title page → recruiting
  numbers → ticker → how it works → closing call to action ("See all N projects").
- **`/projects` (the tool)**: page title, filters and the full list. Old links to `/?topic=…` or
  `/#projects` are forwarded here with their filters.
- `/match`, `/projects/[id]` and `/other-places` as before. Nav "Projects" points at `/projects`.

## Homepage title page

One screen tall (`100svh` minus header, and minus the tab bar on phones), with only three things
to read, biggest first:

1. **Headline** (display caps): "Find the research team that's looking for you." From 1024px it is
   two lines justified edge to edge; the first line's hairline stretches to fill, the second spreads
   its words. Phones and tablets wrap it naturally, left aligned (up to 104px).
2. **One sentence** (`km-lead`) on what the site does, and the main button. From 1024px the sentence
   sits left and the button right, on the same baseline.
3. **Dateline** (top) and **foot bar** (bottom, behind hairlines): what this is and when it was last
   checked; "Scroll" with a nudging arrow, and "Browse all N projects". Small on purpose.

Below it, **Recruiting right now** has its own section: the open count huge (up to 208px), one
sentence, spots · colleges · new this week, and one cell per listed team (honey fill = recruiting,
outline = full). The cells pop in when the section scrolls into view.
The **ticker** follows: recruiting teams' real titles drifting slowly, each a link to its project.

## Shape

Square everywhere (`--radius: 0`): buttons, inputs, tags, the switch, the match meter. Borders 1px.
No shadows, no pills. The only round things are status dots (the nav dot, the dateline dot, the New dot).

- **Project list**: each project is a ruled row (hairline above, one below the list). Left: running
  number and topic as a mono label ("01 — Biology & life sciences"), the title in the display serif
  (32px phones, 40px from 768px), skills below. Right (15rem from 768px, stacked on phones): facts as
  label/value pairs (College, Semester, Spots, Experience), then "Checked …" and the KRSP link.
  Full teams are one short row with the title at 20px, dimmed.
- **Filters**: ruled lists, not chips. Each option is a row: square marker (honey fill + check when
  on), label, count as two mono digits. The sidebar sits behind a vertical hairline.
- **Background grid**: 48px hairline squares fixed to the screen (`.km-grid`), faded toward the bottom
  corners. With a mouse, a brighter patch of grid (220px) follows the pointer. Neutral colors only.
  Ruled lists (`data-grid-quiet`: the project list, your matches) fade the grid out while they fill
  the middle of the screen, so the background lines never cross the rows' own hairlines.

## Motion

Tokens: fast 150ms (hover/press), base 220ms (meter fill, tags), move 300ms (card reorder).
Ease-out `cubic-bezier(.2,.8,.2,1)` for arrivals; exits are ~65% of enter time.

1. **Cards glide** to their new place when filters or sort change (React `<ViewTransition>`,
   browser-native, transition type `filter`).
2. **Match segments fill** one by one (40ms stagger) and tags turn from dashed to ✓.
3. **Title morph** from card to detail page heading (`title-<id>`).
4. **Hover/press**: a project row's top hairline draws across in ink (300ms), buttons press to 0.97.
5. **Hero entrance** (CSS keyframes only, plays from the prerendered HTML): headline words rise out
   of their own masks (55ms stagger), the headline rule draws, the lead and button fade up. Plays once
   per page load. The recruiting cells fill one by one (45ms stagger) when their section enters view.
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
6. **Hover scramble** (`HoverScramble`): nav links and the hero "Browse all N projects" link shuffle into
   random characters and settle back left to right (~0.5s) on hover or focus. Mono labels only, so
   widths never change. Reduced motion: no effect.

Without JavaScript nothing is hidden: hidden start states only apply under `html.js`.
