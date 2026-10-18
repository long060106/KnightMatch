"""Merge today's scrape with the previous snapshot and record what changed.

Rules:
- first_seen_at is set once and never overwritten.
- A project that disappears from the list is kept (listed=False, removed_at set), not deleted.
- On the very first run (baseline) no "new" events are emitted, so 42 projects don't all look new.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Fields whose change means the listing content changed.
CONTENT_FIELDS = (
    "url", "title", "status", "semester", "team_size", "open_spots", "affiliation",
    "team_leader", "co_leaders", "faculty_mentor", "quals_hash", "description",
)


@dataclass
class MergeResult:
    records: list[dict]
    events: list[dict] = field(default_factory=list)


def _event(at: str, project_id: str, kind: str, before=None, after=None) -> dict:
    return {"at": at, "project_id": project_id, "type": kind, "before": before, "after": after}


def merge_snapshot(
    previous: list[dict],
    current: list[dict],
    now: str,
    kept_ids: set[str] | None = None,
) -> MergeResult:
    """previous: last saved records. current: freshly parsed records (no history fields yet).
    kept_ids: projects still on the list whose detail page failed today; keep them as-is."""
    kept_ids = kept_ids or set()
    baseline = not previous
    old_by_id = {r["id"]: r for r in previous}
    result = MergeResult(records=[])
    seen: set[str] = set()

    for fresh in current:
        pid = fresh["id"]
        seen.add(pid)
        old = old_by_id.get(pid)
        record = dict(fresh)
        record["last_checked_at"] = now
        record["listed"] = True
        record["removed_at"] = None

        if old is None:
            record["first_seen_at"] = now
            record["last_changed_at"] = now
            record["status_changed_at"] = now
            if not baseline:
                result.events.append(_event(now, pid, "new", after={"status": fresh["status"], "open_spots": fresh["open_spots"]}))
            result.records.append(record)
            continue

        record["first_seen_at"] = old["first_seen_at"]
        record["status_changed_at"] = old.get("status_changed_at") or old["first_seen_at"]
        changed = any(old.get(name) != fresh.get(name) for name in CONTENT_FIELDS)
        record["last_changed_at"] = now if changed else old.get("last_changed_at") or old["first_seen_at"]

        if not old.get("listed", True):
            result.events.append(_event(now, pid, "relisted"))
        if old["status"] != fresh["status"]:
            record["status_changed_at"] = now
            kind = "became_full" if fresh["status"] == "full" else "reopened"
            result.events.append(_event(now, pid, kind, before=old["status"], after=fresh["status"]))
        if old.get("open_spots") != fresh.get("open_spots"):
            result.events.append(_event(now, pid, "spots_changed", before=old.get("open_spots"), after=fresh.get("open_spots")))
        if old.get("quals_hash") != fresh.get("quals_hash"):
            result.events.append(_event(now, pid, "quals_changed"))
        result.records.append(record)

    for old in previous:
        pid = old["id"]
        if pid in seen:
            continue
        record = dict(old)
        if pid in kept_ids:
            pass  # still listed, detail page failed today: keep yesterday's data untouched
        elif old.get("listed", True):
            record["listed"] = False
            record["removed_at"] = now
            result.events.append(_event(now, pid, "removed"))
        result.records.append(record)

    result.records = sort_records(result.records)
    return result


def sort_records(records: list[dict]) -> list[dict]:
    """Listed first, open before full, newest first, then id. Python's sort is stable,
    so sorting by the least important key first gives the combined order."""
    ordered = sorted(records, key=lambda r: r["id"])
    ordered.sort(key=lambda r: r.get("first_seen_at", ""), reverse=True)
    ordered.sort(key=lambda r: (not r.get("listed", True), r["status"] != "open"))
    return ordered
