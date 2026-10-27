# Pilot: can UCF lab pages feed KnightMatch? (2026-10-26)

Question: if KnightMatch read lab websites beyond KRSP, how many would tell a student "undergrads can
join, here's how"? We said we'd build a lab crawler only if at least about 30% of pages were usable.

## Method

- 30 labs. Sampled from department lab directories where one exists, so the sample isn't only labs
  that advertise: Psychology (14 of the 24 in its directory, random), Computer Science (all 9 linked
  entries in its lab directory). CREOL and Biology have no lab directory, so 4 CREOL group sites and 3
  Biology labs found by search.
- A polite script (2.5 s between requests, robots.txt respected) read each home page and up to 3
  links that looked like join / openings / students pages. Then each relevant page was read by hand.
  No email addresses or names were recorded.
- **Usable** = the page says undergraduates can join **and** says how to apply.
  **Recruiting now** = it also says there is room now (not just "we take undergrads").

## Result

| | Labs | Usable | Recruiting now |
|---|---|---|---|
| Psychology | 14 | 6 | 1 |
| Computer Science | 9 | 1 | 0 |
| CREOL | 4 | 0 | 0 |
| Biology | 3 | 1 | 0 |
| **Total** | **30** | **8 (27%)** | **1 (3%)** |

- **Below the 30% bar**, and only one page says it has room right now. The rest are standing
  invitations ("we regularly offer…", "always looking for…") with no way to tell if a spot is open.
- **6 of 30 links are dead or closed to crawlers**: 2 are 404s and 1 a 503, one lab site now redirects
  to the department home page, and 2 sites block crawlers in robots.txt. Three of the four broken
  ones are linked from the Computer Science department's own lab directory.
- **Stale pages**: one lab still says "no open RA positions for Fall 2024"; others date to 2018 and 2021.
- **Psychology already has a central route**: RA Match (sciences.ucf.edu/psychology/ramatch/), a
  department form where undergrads rank labs and faculty pull applications when they have an opening.
  It shows no openings, so there is nothing to scrape, but it is the right link to give students.
- CREOL group pages only recruit graduate students and postdocs.

## Per lab

| Group | Lab | Usable | Notes |
|---|---|---|---|
| Psychology | Attention and Memory Lab | yes, recruiting | "currently hiring" undergrad RAs; online form; GPA 3.0, 10 h/week, 1 year |
| Psychology | Adult Development & Decision Lab | yes | email the lab manager for an application link; 1-year commitment |
| Psychology | VAAIL | yes | "regularly" takes RAs; form, then email; 1-year commitment |
| Psychology | THE Lab | yes | undergrad RA application form |
| Psychology | LAMP Lab | yes | RA application form |
| Psychology | DREAM Lab | yes | "occasionally accepts" volunteers; online survey |
| Psychology | Transportation Research Lab | no | lists current undergrad RAs; Apply page is empty; latest date 2021 |
| Psychology | Performance Research Lab | no | "Volunteer Opportunities" goes to a contact page |
| Psychology | Minds in Technology | no | "no open RA positions for Fall 2024" |
| Psychology | ROLE Lab | no | no student information |
| Psychology | Work Stress in Context Lab | no | no student information |
| Psychology | UCF RESTORES | no | clinic site, no student information |
| Psychology | Team Performance Lab (IST) | no | no student information |
| Psychology | Applied Cognition and Aging Lab | no | robots.txt blocks crawlers |
| Computer Science | ISUE Lab | yes | "always looking for undergraduate" students; contact the professor |
| Computer Science | APPLeSEEd Lab | no | lists current undergrad RAs, but no way to apply |
| Computer Science | Computational Imaging Lab | no | no student information; latest date 2018 |
| Computer Science | Evolutionary Computation Group | no | no student information |
| Computer Science | Computational Biology and Bioinformatics Lab | no | link goes to a software page |
| Computer Science | AREA67 | no | site redirects to the department home page |
| Computer Science | Data Systems Group | no | 404 |
| Computer Science | Data Integration and Knowledge Discovery Lab | no | 503 |
| Computer Science | Computer Graphics Lab | no | robots.txt blocks crawlers |
| CREOL | Laser Plasma Lab | no | careers link, no undergrad mention |
| CREOL | Nonlinear Optics | no | graduate students and postdocs only |
| CREOL | Kik group | no | no student information |
| CREOL | Ultrafast Photonics Group | no | 404 |
| Biology | Aquatic Biogeochemistry Lab | yes | "routinely" employs undergrads; online form |
| Biology | CEELAB | no | undergrad co-authors listed, no way to apply |
| Biology | Gaither Lab | no | no student information |

## What we did (2026-10-27)

Options 1 and 2 below: the `labs` section of `data/other-places.json` lists RA Match and the 8 usable
labs. Each has a `still_says` phrase from its page, and `links.yml` fails on Mondays if a page stops
showing it, so someone rereads that lab by hand.

## What this means

An automatic lab crawler would mostly produce "unclear" rows and dead links. What the data does
support:

1. **Link, don't crawl**: add Psychology's RA Match to Other places (one entry in
   `data/other-places.json`, checked weekly by `links.yml`).
2. **A short hand-checked list** of labs that say they take undergrads (8 today), each with how to
   apply and a "last checked" date, rechecked by the existing weekly link check.
3. **Bigger bet, not tested here**: match a student's skills to faculty research interests from
   public faculty profiles, then hand off to the email coach. Most labs never post openings, so
   writing to faculty is how most students get in; this would need its own pilot.
