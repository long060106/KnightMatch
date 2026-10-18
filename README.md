# KnightMatch

Find UCF undergraduate research projects you can actually join, and see how your skills and
courses line up with what each team asks for.

KnightMatch reads the public [Knight Research Scholars Program (KRSP) project list](https://knight.research.ucf.edu/project-list/)
every day and turns it into a searchable, filterable site with skill matching.
**Not affiliated with UCF.** The original KRSP listing is always the source of truth.

## How it works

```
KRSP public pages ──(daily GitHub Action, Python)──> data/*.json ──(Next.js static export)──> Vercel
```

- **`scraper/`**: Python. Reads the list page and every project page, splits the free-form
  qualifications into required / nice-to-have items, maps them to a fixed skill dictionary,
  and diffs against yesterday (new, became full, spots changed, removed).
- **`data/`**: the committed output (`projects.json`, `events.json`, `meta.json`) plus the
  hand-written dictionaries (`skills.json`, `course_skills.json`, `other-places.json`).
- **`src/`**: Next.js 16 + Tailwind + shadcn/ui, exported as plain static files. Your skills and
  courses are stored only in your browser (localStorage). No accounts, no server, no database.

## Rules we follow

1. **Public pages only.** The Office of Undergraduate Research positions database is for internal
   use and its faculty contacts are protected on purpose: we only link to it and explain how to
   get access through OUR (workshop or peer mentor). We never copy it.
2. **Polite scraping.** robots.txt is checked on every run, at least 2 seconds between requests
   (we use 2.5s), and the User-Agent includes a contact email (`SCRAPER_CONTACT_EMAIL`).
3. **Source and freshness on everything.** Every listing links to its KRSP page and shows when it
   was last checked.
4. **We never email anyone.** The email helper only drafts text that students edit and send
   themselves. Team leader emails are not stored in this repo (a test fails if one ever appears);
   students get them from the KRSP page.
5. **Matching is fixed rules, never an LLM at request time.** "You meet 2 of 4 listed
   requirements" is plain set arithmetic over `data/skills.json`. We never say "not qualified".

## Run it locally

Needs Node 22+ and Python 3.12+.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # matching, filters, email draft
npm run build        # static site in out/
```

```bash
cd scraper
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m pytest                                    # parser tests on saved KRSP pages
SCRAPER_CONTACT_EMAIL=you@example.com python -m knightmatch_scraper --dry-run
python -m knightmatch_scraper --reextract           # after editing data/skills.json (no network)
python -m knightmatch_scraper.check_links           # check the Other places links
```

Qualification text that matched no skill is written to `data/review/unmatched_quals.json`.
Review it and add aliases to `data/skills.json` by hand; nothing is added automatically.
Only add a course to `data/course_skills.json` after checking its code on a UCF page.

## Deploy (one-time setup)

1. **GitHub secret**: Settings → Secrets and variables → Actions → New repository secret
   `SCRAPER_CONTACT_EMAIL` = an address KRSP admins can reach you at. The daily scrape refuses
   to run without it.
2. **Vercel**: Add New Project → import this repo → keep the detected Next.js settings → Deploy.
   Every push to `main` redeploys, including the daily data commit.
3. **First run**: Actions → "Daily KRSP scrape" → Run workflow.
4. **If Vercel says a deployment was blocked** ("commit author did not have contributing access"):
   in Vercel, Settings → Git → Deploy Hooks → create a hook for `main`, then save its URL as the
   secret `VERCEL_DEPLOY_HOOK_URL`. The workflow calls it after each data commit.

Data commits are authored with the repo owner's GitHub noreply address, because Vercel's Hobby
plan only deploys commits by the account owner and no personal email gets published.

## Workflows

| Workflow | When | What |
|---|---|---|
| `scrape.yml` | daily 11:17 UTC, or by hand | tests, scrape, privacy check, commit `data/`, optional deploy hook |
| `ci.yml` | every push / PR | scraper tests, lint, unit tests, static build |
| `links.yml` | Mondays, or by hand | checks every Other places link |

## Known quirk: building on Windows

Next.js 16.4 writes the client router's segment-prefetch files (`__next.*.txt`) into nested
folders when the build runs on Windows, so those prefetches 404 on a local Windows preview.
Navigation still works. Builds on Linux (Vercel, GitHub Actions) are not affected.

## More

- Design decisions and tokens: [`docs/design-system.md`](docs/design-system.md)
- Phase 2 ideas: email alerts from `data/events.json`, more public sources (lab pages),
  application tracking, plain-language project summaries, GPA / class-standing fields.
