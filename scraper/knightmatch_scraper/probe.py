"""Measure how often the KRSP list page changes, without touching data/ (see .github/workflows/probe.yml).

    python -m knightmatch_scraper.probe check --log probe.jsonl [--conditional]
    python -m knightmatch_scraper.probe report probe.jsonl [more files or folders] [--daily-utc 11:17]

`check` reads only the list page (robots.txt + 1 request) and appends one line to the log: when, the
HTTP status, a hash of the raw HTML, a hash of what the list actually says (title, semester, open/full,
spots for every project), and the ETag / Last-Modified headers if UCF sends them. No HTML is kept.
Two hashes because a page can change for reasons that mean nothing (a new script tag, a nonce); only
`list_hash` moving is a real change.

`report` reads the log and says how many real changes there were, what changed, and how many hours
later the daily scrape would have picked each one up.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import config
from .fetch import PoliteClient
from .parse_list import parse_list
from .privacy import assert_no_emails

FIELDS = ("status", "title", "semester", "spots")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def list_items(html: str) -> list[dict]:
    """What the list says, one dict per project, sorted by URL so the page order does not matter."""
    items = [
        {"url": e.url, "status": e.status, "title": e.list_title, "semester": e.list_semester, "spots": e.spots_text}
        for e in parse_list(html)
    ]
    return sorted(items, key=lambda item: item["url"])


def list_hash(items: list[dict]) -> str:
    ordered = sorted(items, key=lambda item: item["url"])
    return _hash(json.dumps(ordered, sort_keys=True, separators=(",", ":"), ensure_ascii=False))


def check(client: PoliteClient, at: str, conditional: bool = False) -> dict:
    record: dict = {"at": at}
    try:
        response = client.fetch(config.LIST_URL)
        items = list_items(response.text)
    except Exception as error:  # noqa: BLE001 - a failed check is data too; the next hour tries again
        record.update(error=f"{type(error).__name__}: {error}"[:300], requests=client.request_count)
        return record
    etag = response.headers.get("ETag")
    modified = response.headers.get("Last-Modified")
    record.update(
        status=response.status_code,
        raw_hash=_hash(response.text),
        list_hash=list_hash(items),
        count=len(items),
        open=sum(1 for item in items if item["status"] == "open"),
        etag=etag,
        last_modified=modified,
    )
    if conditional and (etag or modified):
        # Ask again right away with the validators we just got: 304 means UCF supports cheap "anything new?" checks.
        headers = {k: v for k, v in (("If-None-Match", etag), ("If-Modified-Since", modified)) if v}
        record["conditional_status"] = client.fetch(config.LIST_URL, headers).status_code
    record["requests"] = client.request_count
    record["items"] = items
    assert_no_emails(record)
    return record


def read_records(paths: list[Path]) -> list[dict]:
    """Every record from .jsonl logs (files, or folders searched recursively), oldest first, duplicates dropped."""
    files: list[Path] = []
    for path in paths:
        files.extend(sorted(path.rglob("*.jsonl")) if path.is_dir() else [path])
    by_time: dict[str, dict] = {}
    for file in files:
        for line in file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                record = json.loads(line)
                by_time[record["at"]] = record
    return [by_time[at] for at in sorted(by_time)]


def _time(at: str) -> datetime:
    return datetime.fromisoformat(at.replace("Z", "+00:00"))


def next_daily(after: datetime, daily_utc: str) -> datetime:
    hour, minute = (int(part) for part in daily_utc.split(":"))
    run = after.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return run if run > after else run + timedelta(days=1)


def describe(before: list[dict], after: list[dict]) -> list[str]:
    old = {item["url"]: item for item in before}
    new = {item["url"]: item for item in after}
    lines = [f"new: {new[url]['title']} ({new[url]['spots']})" for url in sorted(new.keys() - old.keys())]
    lines += [f"gone: {old[url]['title']}" for url in sorted(old.keys() - new.keys())]
    for url in sorted(old.keys() & new.keys()):
        moved = [f"{f} {old[url][f]!r} -> {new[url][f]!r}" for f in FIELDS if old[url][f] != new[url][f]]
        if moved:
            lines.append(f"{new[url]['title']}: " + ", ".join(moved))
    return lines


def summarize(records: list[dict], daily_utc: str = "11:17") -> dict:
    ok = [r for r in records if "error" not in r]
    gaps = [(_time(b["at"]) - _time(a["at"])).total_seconds() / 60 for a, b in zip(records, records[1:])]
    changes, noise = [], 0
    for prev, cur in zip(ok, ok[1:]):
        if prev["list_hash"] == cur["list_hash"]:
            noise += prev["raw_hash"] != cur["raw_hash"]
            continue
        # The change happened somewhere between the two checks. The daily scrape sees it at its first run after
        # `prev`; if that run fell inside the gap, it may already have it, so count that as no delay.
        delay = next_daily(_time(prev["at"]), daily_utc) - _time(cur["at"])
        changes.append({
            "between": [prev["at"], cur["at"]],
            "daily_delay_hours": round(max(delay.total_seconds(), 0) / 3600, 1),
            "what": describe(prev.get("items", []), cur.get("items", [])),
        })
    conditional = [r["conditional_status"] for r in ok if "conditional_status" in r]
    return {
        "checks": len(records),
        "failed": len(records) - len(ok),
        "first": records[0]["at"] if records else None,
        "last": records[-1]["at"] if records else None,
        "longest_gap_minutes": round(max(gaps), 1) if gaps else None,
        "requests": sum(r.get("requests", 0) for r in records),
        "changes": changes,
        "raw_only_changes": noise,
        "etag": sum(1 for r in ok if r.get("etag")),
        "last_modified": sum(1 for r in ok if r.get("last_modified")),
        "conditional_statuses": conditional,
        "ok": len(ok),
    }


def format_report(summary: dict) -> str:
    lines = [
        f"Checks: {summary['checks']} ({summary['failed']} failed), {summary['first']} to {summary['last']}",
        f"Longest gap between checks: {summary['longest_gap_minutes']} min. Requests to UCF: {summary['requests']}.",
        f"Real list changes: {len(summary['changes'])}. HTML changed but the list did not: {summary['raw_only_changes']}.",
        f"ETag sent: {summary['etag']}/{summary['ok']}. Last-Modified sent: {summary['last_modified']}/{summary['ok']}. "
        f"Conditional re-checks: {summary['conditional_statuses'] or 'none'}.",
    ]
    for change in summary["changes"]:
        lines.append("")
        lines.append(f"{change['between'][0]} .. {change['between'][1]}  (daily scrape: +{change['daily_delay_hours']} h)")
        lines += [f"  - {what}" for what in change["what"]] or ["  - (no item details in the log)"]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m knightmatch_scraper.probe")
    sub = parser.add_subparsers(dest="command", required=True)
    check_cmd = sub.add_parser("check", help="read the list page once and append a line to the log")
    check_cmd.add_argument("--log", type=Path, required=True)
    check_cmd.add_argument("--conditional", action="store_true", help="also test a 304 re-check (1 more request)")
    report_cmd = sub.add_parser("report", help="summarize one or more logs")
    report_cmd.add_argument("paths", type=Path, nargs="+")
    report_cmd.add_argument("--daily-utc", default="11:17")
    args = parser.parse_args(argv)

    if args.command == "report":
        print(format_report(summarize(read_records(args.paths), args.daily_utc)))
        return 0

    record = check(PoliteClient(), utc_now(), args.conditional)
    args.log.parent.mkdir(parents=True, exist_ok=True)
    with args.log.open("a", encoding="utf-8", newline="\n") as log:
        log.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    line = (f"{record['at']}: error {record['error']}" if "error" in record else
            f"{record['at']}: {record['count']} listed, {record['open']} open, list {record['list_hash']}, "
            f"html {record['raw_hash']}, {record['requests']} requests")
    print(line)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as out:
            out.write(f"- {line}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
