# KnightMatch

Find UCF undergraduate research projects you can actually join, and see how your skills and
courses line up with what each team asks for.

KnightMatch reads the public [Knight Research Scholars Program (KRSP) project list](https://knight.research.ucf.edu/project-list/)
every hour and turns it into a searchable, filterable site with skill matching.
**Not affiliated with UCF.** The original KRSP listing is always the source of truth.

## How it works

```
KRSP public pages ──(hourly GitHub Action, Python)──> data/*.json ──(Next.js, prerendered)──> Vercel
```

- **`scraper/`**: Python. Every hour it reads the list page; when the list changed (or once a day
  anyway) it reads every project page, splits the free-form
  qualifications into required / nice-to-have items, maps them to a fixed skill dictionary,
  and diffs against the last run (new, became full, spots changed, removed).
- **`data/`**: the committed output (`projects.json`, `events.json`, `meta.json`) plus the
  hand-written dictionaries (`skills.json`, `course_skills.json`, `other-places.json`).
- **`src/`**: Next.js 16 + Tailwind + shadcn/ui. Every page is prerendered; three small routes in
  `src/app/api` run on Vercel: the AI email coach, the team leader's email read live from KRSP, and
  the last-check time. Your skills and courses are stored only in your browser (localStorage).
  No accounts, no database.

## Rules we follow

1. **Public pages only.** The Office of Undergraduate Research positions database is for internal
   use and its faculty contacts are protected on purpose: we only link to it and explain how to
   get access through OUR (workshop or peer mentor). We never copy it.
2. **Polite scraping.** robots.txt is checked on every run, at least 2 seconds between requests
   (we use 2.5s), and the User-Agent includes a contact email (`SCRAPER_CONTACT_EMAIL`).
3. **Source and freshness on everything.** Every listing links to its KRSP page and shows when it
   was last checked.
4. **We never email anyone.** The email helper only drafts text that students edit and send
   themselves. Team leader emails are not stored in this repo (a test fails if one ever appears):
   `/api/contact` reads the address from the live KRSP page when a student opens the draft, so it
   can go in the To: line, and keeps it only in an hour-long fetch cache.
5. **The resume leaves the device only when the student asks.** Filling the profile from a resume
   happens in the browser. The AI email coach asks first, removes email, phone and street address
   in the browser, and the route keeps nothing.
6. **Matching is fixed rules, never an LLM.** "You meet 2 of 4 listed
   requirements" is plain set arithmetic over `data/skills.json`. The AI coach only writes advice
   and a draft; it never scores anyone. We never say "not qualified".

## Run it locally

Needs Node 22+ and Python 3.12+.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # matching, filters, email draft
npm run build        # prerendered site in .next/
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
   `SCRAPER_CONTACT_EMAIL` = an address KRSP admins can reach you at. The scrape refuses
   to run without it.
2. **Vercel**: Add New Project → import this repo → keep the detected Next.js settings → Deploy.
   Every push to `main` redeploys, including each data commit.
3. **First run**: Actions → "Hourly KRSP scrape" → Run workflow.
4. **AI email coach (optional, free)**: create a key at Google AI Studio, then in Vercel →
   Settings → Environment Variables add `GEMINI_API_KEY` and redeploy. Without it the dialog keeps
   the template and the AI button says it isn't set up. `COACH_AI_MODEL` switches the model
   (default `gemini-3.5-flash`, the strongest on Gemini's free tier when this was written).
5. **If Vercel says a deployment was blocked** ("commit author did not have contributing access"):
   in Vercel, Settings → Git → Deploy Hooks → create a hook for `main`, then save its URL as the
   secret `VERCEL_DEPLOY_HOOK_URL`. The workflow calls it after each data commit.
6. **A check every hour, for real**: GitHub runs scheduled workflows late or skips them (on this
   repo, 3 to 7 hours apart), and Vercel's Hobby cron only runs daily. So:
   - On GitHub, Settings → Developer settings → Fine-grained tokens → Generate: only this
     repository, permission **Actions: Read and write**, nothing else. In Vercel add it as
     `GITHUB_TOKEN` and redeploy. `/api/refresh` can now start the scrape workflow, at most
     once every 50 minutes, and "Last check" asks for it whenever the time it shows is over an hour old.
   - At cron-job.org (free) create a job: URL `https://<your site>/api/refresh`, every hour.
     The URL needs no secret: calling it more often changes nothing.

Data commits are authored with the repo owner's GitHub noreply address, because Vercel's Hobby
plan only deploys commits by the account owner and no personal email gets published.

## Workflows

| Workflow | When | What |
|---|---|---|
| `scrape.yml` | hourly at :17 (best-effort), from `/api/refresh`, or by hand | tests, list check; on a change (or daily) full scrape, privacy check, commit `data/`, optional deploy hook |
| `probe.yml` | hourly at :41 | logs how often the list changes; never commits |
| `ci.yml` | every push / PR | scraper tests, lint, unit tests, build |
| `links.yml` | Mondays, or by hand | checks every Other places link |

## Known quirk: building on Windows

Next.js 16.4 writes the client router's segment-prefetch files (`__next.*.txt`) into nested
folders when the build runs on Windows, so those prefetches 404 on a local Windows preview.
Navigation still works. Builds on Linux (Vercel, GitHub Actions) are not affected.

## More

- Design decisions and tokens: [`docs/design-system.md`](docs/design-system.md)
- Phase 2 ideas: email alerts from `data/events.json`, more public sources (lab pages),
  application tracking, plain-language project summaries, GPA / class-standing fields.
