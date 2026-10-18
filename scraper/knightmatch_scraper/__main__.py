"""Run the scraper:  python -m knightmatch_scraper [--dry-run] [--limit N] [--no-ai]"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

from . import ai, config, store
from .diff import merge_snapshot
from .fetch import PoliteClient
from .parse_list import parse_list
from .parse_project import parse_project
from .privacy import assert_no_emails, public_record
from .quals import split_quals
from .record import beginner_info, build_record, ordered
from .skills import SkillDictionary, extract_project_skills
from .text import text_to_html


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def by_project(review: list[dict]) -> list[dict]:
    """Same order whether written by a scrape or by --reextract, so diffs show real changes only."""
    return sorted(review, key=lambda r: int(r["project_id"].removeprefix("krsp-")))


def make_annotator(dictionary: SkillDictionary, use_ai: bool, now: str) -> ai.Annotator:
    client = ai.AiClient.from_env() if use_ai else None
    if use_ai and client is None:
        print("NOTE: AI_API_KEY is not set; skills come from the word list only.", file=sys.stderr)
    topics = ai.load_topics(store.data_path(store.TOPICS_FILE))
    cache = store.read_json(store.data_path(store.AI_CACHE_FILE), {})
    return ai.Annotator(dictionary, topics, cache, client, now)


def write_ai_files(annotator: ai.Annotator, keep: dict[str, dict] | None = None) -> ai.AiReport:
    cache = {**(keep or {}), **annotator.cache_out}
    cache = {pid: cache[pid] for pid in sorted(cache)}
    assert_no_emails(cache)
    assert_no_emails(annotator.review)
    store.write_json(store.data_path(store.AI_CACHE_FILE), cache)
    store.write_json(store.data_path(store.AI_REVIEW_FILE), by_project(annotator.review))
    return print_ai_report(annotator)


def print_ai_report(annotator: ai.Annotator) -> ai.AiReport:
    report = annotator.report()
    print(f"AI: {report.status} (model {report.model or '-'}): {report.answered} new answers, "
          f"{report.cached} cached, {report.failed} failed, {report.waiting} waiting, {report.requests} requests.")
    if report.message:
        print(f"AI: {report.message}")
    return report


def run(dry_run: bool = False, limit: int | None = None, use_ai: bool = True) -> int:
    if not os.environ.get("SCRAPER_CONTACT_EMAIL", "").strip():
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print("ERROR: set the SCRAPER_CONTACT_EMAIL secret so KRSP admins can reach us.", file=sys.stderr)
            return 2
        print("WARNING: SCRAPER_CONTACT_EMAIL is not set; the User-Agent has no contact email.", file=sys.stderr)
    now = utc_now()
    client = PoliteClient()
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    previous = store.read_json(store.data_path(store.PROJECTS_FILE), [])
    old_meta = store.read_json(store.data_path(store.META_FILE), {})

    entries = parse_list(client.get(config.LIST_URL))
    previously_listed = sum(1 for r in previous if r.get("listed", True))
    if previously_listed and len(entries) < previously_listed * config.MIN_LISTED_RATIO:
        print(f"ABORT: list shows {len(entries)} projects, last run had {previously_listed}. "
              "The page layout may have changed; nothing was written.", file=sys.stderr)
        return 1
    if limit:
        entries = entries[:limit]

    old_id_by_url = {r["url"]: r["id"] for r in previous}
    kept_ids: set[str] = set()
    errors: list[dict] = []

    def keep_old(url: str, error: Exception) -> None:
        # One bad page should not sink the whole run: keep yesterday's record instead.
        errors.append({"url": url, "error": f"{type(error).__name__}: {error}"})
        if url in old_id_by_url:
            kept_ids.add(old_id_by_url[url])

    parsed = []
    for index, entry in enumerate(entries, 1):
        print(f"[{index}/{len(entries)}] {entry.status:4}  {entry.url}")
        try:
            page = parse_project(client.get(entry.url), entry.url)
            parsed.append((entry, page, split_quals(page.quals_html)))
        except Exception as error:
            keep_old(entry.url, error)

    # Second pass, after all KRSP requests: AI notes (cached, so usually zero calls), then records.
    annotator = make_annotator(dictionary, use_ai and not dry_run, now)
    current: list[dict] = []
    review: list[dict] = []
    for entry, page, quals in parsed:
        try:
            project_id = f"krsp-{page.wp_post_id}"
            names = ai.person_names(*(p.name for p in page.team_leaders), *page.faculty_mentors)
            note = annotator.annotate(project_id, page.title, page.description, quals, names)
            skills = extract_project_skills(dictionary, quals, note.filled)
            record = public_record(build_record(entry, page, quals, skills, dictionary, note.topics))
        except Exception as error:
            keep_old(entry.url, error)
            continue
        current.append(record)
        annotator.add_review(record["id"], record["title"], quals, note)
        if skills.unmatched:
            review.append({"project_id": record["id"], "title": record["title"], "unmatched": skills.unmatched})

    merged = merge_snapshot(previous, current, now, kept_ids)
    records = [ordered(r) for r in merged.records]
    assert_no_emails(records)
    assert_no_emails(review)
    store.validate_projects(records)

    listed = [r for r in records if r["listed"]]
    meta = {
        "scraper_version": config.SCRAPER_VERSION,
        "source_url": config.LIST_URL,
        "last_run_at": now,
        "baseline_at": old_meta.get("baseline_at") or now,
        "counts": {
            "listed": len(listed),
            "open": sum(r["status"] == "open" for r in listed),
            "full": sum(r["status"] == "full" for r in listed),
        },
        "request_count": client.request_count,
        "errors": errors,
    }

    print(f"\nParsed {len(current)}/{len(entries)} project pages, {len(errors)} errors, "
          f"{len(merged.events)} events, {client.request_count} requests.")
    for event in merged.events:
        print(f"  event: {event['type']:14} {event['project_id']}  {event['before']} -> {event['after']}")
    if dry_run:
        print_ai_report(annotator)
        print("Dry run: nothing written (and no AI calls).")
        return 0

    # Keep AI answers for pages that failed today, so they are not asked again tomorrow.
    old_cache = store.read_json(store.data_path(store.AI_CACHE_FILE), {})
    meta["ai"] = write_ai_files(annotator, keep={pid: old_cache[pid] for pid in kept_ids if pid in old_cache}).as_dict()
    store.write_json(store.data_path(store.PROJECTS_FILE), records)
    events = store.read_json(store.data_path(store.EVENTS_FILE), [])
    store.write_json(store.data_path(store.EVENTS_FILE), events + merged.events)
    store.write_json(store.data_path(store.META_FILE), meta)
    store.write_json(store.data_path(store.REVIEW_FILE), by_project(review))
    print(f"Wrote data/: {meta['counts']}")
    return 1 if errors and not current else 0


def reextract(use_ai: bool = True) -> int:
    """Re-run qualification splitting and skill extraction on the stored text (no KRSP requests).
    Use after editing data/skills.json or data/topics.json. History fields are left untouched.
    With AI_API_KEY set, projects whose prompt changed are asked again (listed ones only)."""
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    records = store.read_json(store.data_path(store.PROJECTS_FILE), [])
    annotator = make_annotator(dictionary, use_ai, utc_now())
    review: list[dict] = []
    for record in records:
        quals = split_quals(text_to_html(record["quals_raw"]))
        people = [p["name"] for p in [record["team_leader"], *record["co_leaders"]] if p]
        names = ai.person_names(*people, record["faculty_mentor"])
        note = annotator.annotate(
            record["id"], record["title"], record["description"], quals, names, allow_calls=record["listed"]
        )
        skills = extract_project_skills(dictionary, quals, note.filled)
        beginner, reason = beginner_info(quals, skills, dictionary)
        record.update(
            required_quals=quals.required,
            preferred_quals=quals.preferred,
            required_skills=skills.required,
            preferred_skills=skills.preferred,
            ai_skills=skills.ai,
            beginner_friendly=beginner,
            beginner_reason=reason,
            topics=note.topics,
        )
        if record["listed"]:
            annotator.add_review(record["id"], record["title"], quals, note)
            if skills.unmatched:
                review.append({"project_id": record["id"], "title": record["title"], "unmatched": skills.unmatched})
    records = [ordered(r) for r in records]
    assert_no_emails(records)
    assert_no_emails(review)
    store.validate_projects(records)
    write_ai_files(annotator)
    store.write_json(store.data_path(store.PROJECTS_FILE), records)
    store.write_json(store.data_path(store.REVIEW_FILE), by_project(review))
    unmatched = sum(len(r["unmatched"]) for r in review)
    print(f"Re-extracted {len(records)} projects; {unmatched} unmatched qualification items for review.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape the public KRSP project list.")
    parser.add_argument("--dry-run", action="store_true", help="fetch and parse but do not write files")
    parser.add_argument("--limit", type=int, help="only fetch the first N project pages (for testing)")
    parser.add_argument("--reextract", action="store_true", help="recompute skills from stored text, no KRSP requests")
    parser.add_argument("--no-ai", action="store_true", help="never call the AI endpoint (cached answers still apply)")
    args = parser.parse_args()
    if args.limit and not args.dry_run:
        # A partial scrape would mark every project beyond the limit as removed.
        parser.error("--limit only works together with --dry-run")
    if args.reextract:
        sys.exit(reextract(use_ai=not args.no_ai))
    sys.exit(run(dry_run=args.dry_run, limit=args.limit, use_ai=not args.no_ai))


if __name__ == "__main__":
    main()
