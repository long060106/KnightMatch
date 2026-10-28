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
| `--spots-high` | `#15803D` | `#4ADE80` | open spots ≥ 70% of the team |
| `--spots-mid` | `#A16207` | `#FACC15` | open spots 30–70% of the team |
| `--spots-low` | `#B91C1C` | `#F87171` | open spots < 30% of the team |

**Open spots** are always shown as open over team size ("8 / 20"), because KRSP's open count is team
size minus the members already on it. The number takes one of the three spots colors
(`src/lib/spots.ts`), and a short bar beside it fills to the open share, so the band reads without
color. Full teams stay neutral ("Full team"). These three colors are only for spots.

No UCF logos, mascots or official brand styling. Footer always says "Not affiliated with UCF."

## Type

Three voices, each with one job. Size says what to read first; the font says what kind of thing it is.

- **Newsreader** (display serif, variable weight + optical size): headlines, big numbers, project
  titles, step titles. Calm and readable at length; large sizes automatically get finer strokes.
  Weight 400 for display; hierarchy still comes from size.
- **Public Sans**: body text, buttons, form controls. Body 16px / 1.6.
- **IBM Plex Mono**: small uppercase labels (`km-label`: 12px, 500, +0.06em tracking) for the dateline,
  nav links, section labels, stat captions and ticker meta; the short hero lead paragraph (`km-lead`:
  15px / 1.65, uppercase, justified from 640px, left aligned on phones); also UCF course codes (`COP3502C`).
- Scale (px): 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48, plus two display sizes:
  hero headline `clamp(2.5rem, 8.6vw, 5.5rem)` below 1024px and container width ÷ 12.6 from 1024px
  (≈91px), project titles 28px / 34px from 768px, and the recruiting count `clamp(8rem, 5rem + 10vw, 13rem)`.
- Uppercase is for the hero headline, `km-label` labels and the short `km-lead` hero paragraph.
  Everything else (project titles, body, buttons) is sentence case. Never use `km-lead` for more
  than a few lines.
- No single highlighted word in headlines, no `→` appended to button text.

## What you can click

One rule, everywhere: **anything clickable carries a signal, anything that isn't never does.**

- **Buttons**: a honey block (main action) or a 1px outline in `--input` (secondary, ≥3:1). No ghost
  buttons: Cancel, Start over and Clear my profile are outlines too.
- **Text links**: always a hairline underline that darkens on hover (`km-link`). Going to another page
  adds →, leaving the site adds ↗, going back ("All projects") starts with ←. Mono label links follow
  the same rule ("Browse all 42 projects →", the topics above a project title). Inline text actions
  that stay on the page (Undo, Paste text instead) get the underline and no arrow.
- **Toggles in the match picker** (skills, added courses) are clickable, so they are 1px-outline boxes;
  that is the only place a skill is boxed. Disclosures (skill groups, the collapsed "How it works")
  carry a chevron.
- **Examples**: the How-it-works demo card is labelled "Example · not a real project" and nothing on it
  is underlined, arrowed or shaped like a button.
- **Project rows**: the title is underlined and followed by →; the whole row lightens a touch and its
  top hairline draws across on hover. The full row is the link.
- **Ticker items**: underlined titles with →.
- **Never clickable, never styled like it**: skill tags are plain text separated by "·" (✓ honey ink =
  you have it, hollow ring = not yet), mono labels (topic, College, Semester), numbers, the team grid.
- Nav links are the one exception to the underline rule: the dot marks them (filled = here, hollow = hover).

## Layout

- Breakpoints: 375 / 768 / 1024 / 1440. Container max 1200px, 16px side gutter on phones.
- ≥1024px: sticky filter sidebar (260px) + one column of cards.
- <1024px: "Filters" button opens a bottom sheet.
- <768px: bottom tab bar (Home, Projects, Match me, Other places, About); ≥768px: links in the header.
- Touch targets ≥44px on phones; spacing on a 4px grid.

## Pages

- **`/` (introduction)**: says what KnightMatch is for and gets out of the way. Title page → recruiting
  numbers → ticker → how it works → closing call to action ("See all N projects").
- **`/projects` (the tool)**: page title, filters and the full list. Old links to `/?topic=…` or
  `/#projects` are forwarded here with their filters.
- **Your list** (`/projects?list=mine`): a second tab above the list with the projects the student saved
  or emailed, open or full, follow-ups that are due first. Stages: Saved → Emailed → Followed up →
  Heard back → Joined / Not this time ("Not this time", never "rejected"). Set from the "Save to my
  list" button / Progress menu under a project's title, or "Mark as emailed" after the email dialog
  opens or copies the email (the site never marks anything on its own). Cards carry a mono chip;
  honey only for "Follow up now" and "Joined". A week after "Emailed", step 3 of How to apply offers
  the follow-up draft; before that, a calendar reminder (.ics, made in the browser). Stored in
  `km.tracker.v1`, and in the student's account too when they sign in.
- **Accounts** (optional; only shown when `NEXT_PUBLIC_ACCOUNTS=on`): a mono km-label "Sign in" in
  the header next to the theme toggle, at every width (the tab bar keeps its five items; from 768 to
  1023px the header nav drops Home to make room, since the logo links home). Signed in,
  it becomes a 28px outlined circle with the first letter of the email, linking to `/account`. The
  sign-in dialog has one outlined "Continue with Google" button with Google's "G" (their guidelines),
  one sentence on what is kept and a link to `/about#your-data`. `/account`: email, three serif
  counts (skills, courses, projects on the list), Sign out (outline) and Delete my account
  (destructive, with a confirm dialog). The only nudge is one muted line, "On another device? Sign in
  to keep this in sync", shown signed out and only once there is a profile or a list.
- **`/about`**: "Developed by / Long Nguyen" as two lines that never wrap (sized to the 8-column
  text block, up to 84px), the portrait (340px wide) in the other 4 columns, and the four rules the site keeps (public pages
  only, fixed rules, data stays on the device, you write the email), then a Contact row (email, Instagram,
  GitHub). Last item in the nav and the tab bar, and linked from the footer.
- **`/other-places`**: second section is **Labs**, the labs whose own pages say undergraduates can join
  (plus Psychology's RA Match), as ordinary ruled link rows with the department before the host
  ("Psychology · sciences.ucf.edu") and "Read by hand on …" under the intro. No status badges: the
  description says in plain words what the page says ("Says it is hiring … now", "Occasionally takes …").
- `/match` and `/projects/[id]` as before. Nav: Home (`/`), Projects (`/projects`),
  Match me, Other places, About; the phone tab bar has the same five.

## Share images

The 1200 × 630 card that link previews show (`src/lib/og-card.tsx`), drawn at build time and always
on light paper, since previews don't follow the reader's theme. Knight mark and wordmark top left,
a mono label top right (the project's first topic), a hairline, the title in Newsreader (70 / 62 /
52px by length, four lines at most), then a hairline footer: college · semester on the left, "Not
affiliated with UCF" on the right. Hairlines are 2px because previews shrink the card to about 500px.

- **Open project**: "2 / 4" in its spots color with the share bar and a mono "spots open".
- **Full team**: a quiet mono line ("Full team of 5"), no big number, no color.
- **Every other page**: one site card with the recruiting count in honey ink (good news).

## Homepage title page

One screen tall (`100svh` minus header, and minus the tab bar on phones), with only three things
to read, biggest first:

1. **Headline** (display caps): "Find the research team that's looking for you." From 1024px it is
   three left-aligned rows (Find the research / team that's / looking for you.), with the globe in the
   space on the right. Phones and tablets wrap it naturally.
2. **One sentence** (`km-lead`) on what the site does, and the main button. From 1024px the sentence
   sits left and the button right, on the same baseline.
3. **Dateline** (top) and **foot bar** (bottom, behind hairlines): what this is and when it was last
   checked; "Scroll" with a nudging arrow, and "Browse all N projects". Small on purpose.

Behind the headline, a **wireframe sphere** (`WireSphere`, ink at 20%) turns slowly: the type sits over
it like a title over a cover image. A small one (ink at 40%) sits above the closing call to action.
Black and white only, decoration only (aria-hidden).

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
  label/value pairs (College, Semester, Open spots "8 / 20", Experience), then "Checked …" and the KRSP link.
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
7. **Wireframe sphere**: each meridian is a circle squashed with `scaleX`, swinging 1 → -1 → 1
   (ease-in-out, close to a cosine), offset along the cycle so together they turn like a globe.
   About 14s per half turn. Pure CSS from the prerendered HTML. Reduced motion: it holds still.

8. **About page shapes** (`FloatingShapes`): a cube, an elliptic paraboloid and a sphere as ink
   hairlines on one canvas, spinning and drifting along slow orbits, a little with the pointer.
   Far-side lines are fainter so they read as solid. Pauses off screen or in a background tab.
   Reduced motion: one still frame.
   The page headers of Projects, Match me and Other places get two smaller ones each (`set` prop), to
   the right of the headline (on phones: a band in the top-right corner above it): a hyperbolic
   paraboloid (saddle) and a sphere; an elliptic paraboloid and an ellipsoid; a hyperboloid of one
   sheet and an ellipsoid. Never more than two per page header.
9. **Page entrance** (Projects, Match me, Other places): the headline words rise out of their masks
   (`RisingWords`, same as the home page), then the intro, the shapes and the content fade up one after
   another (`km-page-in`, ~0.3–0.7s apart). Plays on load and on every in-app navigation. `backwards`
   fill so nothing lingers; blocks with fixed children (the Match workbench) only fade (`km-page-fade`).
10. **About page portrait** (`Portrait`): the photo is uncovered tile by tile in the same square cells
   as the team grid; with a mouse the frame leans up to 5° while the photo and the outline behind it
   slide the other way. Reduced motion: no tiles, no lean.

Only `transform` and `opacity` animate (the canvas shapes are drawn by script, not CSS). `prefers-reduced-motion` turns all of it off, including
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
