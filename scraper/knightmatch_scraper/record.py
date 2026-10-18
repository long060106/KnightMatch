"""Combine a list entry, a parsed page and extracted skills into one project record."""

from __future__ import annotations

from dataclasses import asdict

from .parse_list import ListEntry
from .parse_project import ParsedProject
from .quals import QualsResult
from .skills import ProjectSkills, SkillDictionary


def beginner_info(quals: QualsResult, skills: ProjectSkills, dictionary: SkillDictionary) -> tuple[bool, str | None]:
    if quals.no_experience_statement:
        return True, "explicit"
    if not any(dictionary.counts(s) for s in skills.required):
        return True, "no_required_skills"
    return False, None


def build_record(
    entry: ListEntry,
    page: ParsedProject,
    quals: QualsResult,
    skills: ProjectSkills,
    dictionary: SkillDictionary,
    topics: list[str] | None = None,
) -> dict:
    """Record with history fields left for diff.merge_snapshot. Still contains emails:
    privacy.public_record must run before anything is written."""
    leaders = [asdict(p) for p in page.team_leaders]
    beginner, reason = beginner_info(quals, skills, dictionary)
    return {
        "id": f"krsp-{page.wp_post_id}",
        "source": "krsp",
        "wp_post_id": page.wp_post_id,
        "title": page.title,
        "url": entry.url,
        # The list page section is how KRSP itself defines open vs full.
        "status": entry.status,
        "semester": page.semester or entry.list_semester,
        "team_size": page.team_size,
        "open_spots": page.open_spots,
        "affiliation": page.affiliation,
        "team_leader": leaders[0] if leaders else None,
        "co_leaders": leaders[1:],
        "faculty_mentor": ", ".join(page.faculty_mentors) or None,
        "required_quals": quals.required,
        "preferred_quals": quals.preferred,
        "quals_raw": quals.raw,
        "quals_hash": quals.hash,
        "required_skills": skills.required,
        "preferred_skills": skills.preferred,
        "ai_skills": skills.ai,
        "beginner_friendly": beginner,
        "beginner_reason": reason,
        "topics": topics or [],
        "description": page.description,
    }


FIELD_ORDER = (
    "id", "source", "wp_post_id", "title", "url", "status", "semester", "team_size",
    "open_spots", "affiliation", "team_leader", "co_leaders", "faculty_mentor",
    "required_quals", "preferred_quals", "quals_raw", "quals_hash", "required_skills",
    "preferred_skills", "ai_skills", "beginner_friendly", "beginner_reason", "topics", "description",
    "first_seen_at", "last_checked_at", "last_changed_at", "status_changed_at",
    "listed", "removed_at",
)


def ordered(record: dict) -> dict:
    """Same keys in the same order every run, so git diffs stay small and readable."""
    return {key: record.get(key) for key in FIELD_ORDER}
