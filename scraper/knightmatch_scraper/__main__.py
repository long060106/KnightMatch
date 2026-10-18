"""Run the scraper:  python -m knightmatch_scraper [--dry-run] [--limit N]"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

from . import config, store
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


def run(dry_run: bool = False, limit: int | None = None) -> int:
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
    current: list[dict] = []
    kept_ids: set[str] = set()
    errors: list[dict] = []
    review: list[dict] = []
    for index, entry in enumerate(entries, 1):
        print(f"[{index}/{len(entries)}] {entry.status:4}  {entry.url}")
        try:
            page = parse_project(client.get(entry.url), entry.url)
            quals = split_quals(page.quals_html)
            skills = extract_project_skills(dictionary, quals)
        except Exception as error:  # one bad page should not sink the whole run
            errors.append({"url": entry.url, "error": f"{type(error).__name__}: {error}"})
            if entry.url in old_id_by_url:
                kept_ids.add(old_id_by_url[entry.url])
            continue
        record = public_record(build_record(entry, page, quals, skills, dictionary))
        current.append(record)
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
        print("Dry run: nothing written.")
        return 0

    store.write_json(store.data_path(store.PROJECTS_FILE), records)
    events = store.read_json(store.data_path(store.EVENTS_FILE), [])
    store.write_json(store.data_path(store.EVENTS_FILE), events + merged.events)
    store.write_json(store.data_path(store.META_FILE), meta)
    store.write_json(store.data_path(store.REVIEW_FILE), review)
    print(f"Wrote data/: {meta['counts']}")
    return 1 if errors and not current else 0


def reextract() -> int:
    """Re-run qualification splitting and skill extraction on the stored text (no network).
    Use after editing data/skills.json. History fields are left untouched."""
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    records = store.read_json(store.data_path(store.PROJECTS_FILE), [])
    review: list[dict] = []
    for record in records:
        quals = split_quals(text_to_html(record["quals_raw"]))
        skills = extract_project_skills(dictionary, quals)
        beginner, reason = beginner_info(quals, skills, dictionary)
        record.update(
            required_quals=quals.required,
            preferred_quals=quals.preferred,
            required_skills=skills.required,
            preferred_skills=skills.preferred,
            beginner_friendly=beginner,
            beginner_reason=reason,
        )
        if skills.unmatched and record["listed"]:
            review.append({"project_id": record["id"], "title": record["title"], "unmatched": skills.unmatched})
    assert_no_emails(records)
    assert_no_emails(review)
    store.validate_projects(records)
    store.write_json(store.data_path(store.PROJECTS_FILE), records)
    store.write_json(store.data_path(store.REVIEW_FILE), review)
    unmatched = sum(len(r["unmatched"]) for r in review)
    print(f"Re-extracted {len(records)} projects; {unmatched} unmatched qualification items for review.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape the public KRSP project list.")
    parser.add_argument("--dry-run", action="store_true", help="fetch and parse but do not write files")
    parser.add_argument("--limit", type=int, help="only fetch the first N project pages (for testing)")
    parser.add_argument("--reextract", action="store_true", help="recompute skills from stored text, no network")
    args = parser.parse_args()
    if args.limit and not args.dry_run:
        # A partial scrape would mark every project beyond the limit as removed.
        parser.error("--limit only works together with --dry-run")
    if args.reextract:
        sys.exit(reextract())
    sys.exit(run(dry_run=args.dry_run, limit=args.limit))


if __name__ == "__main__":
    main()
