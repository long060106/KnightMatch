"""Turn qualification text into normalized skill ids using the fixed dictionary in data/skills.json.

No LLM here: every match comes from a hand-written alias pattern, so results are predictable
and testable. Text that matches nothing is reported for human review, never auto-added.
The optional AI step (ai.py) may only fill items this finds nothing in.

Three fairness rules:
  - Parent skills: "Programming (any language)" is the parent of Python, C++, ... If an item
    names a child ("Python programming"), the vaguer parent is dropped.
  - Examples: tools listed as examples ("such as Maya, ZBrush", "Blender, Maya, etc.") are
    folded into their parent ("3D software") so a student does not need every one of them.
  - Interest: "Interest in physics" is not a skill, so such items are skipped entirely.
"""

from __future__ import annotations

import json
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

from .quals import QualsResult

EXAMPLE_RE = re.compile(
    r"\b(?:such as|e\.g\.,?|for example|including|like)\s+(?P<after>[^.;)]*)|(?P<etc>[^.;(]*\betc\b)",
    re.IGNORECASE,
)
INTEREST_ONLY_RE = re.compile(
    r"^(?:(?:an?|strong|genuine)\s+)*(?:interests?(?:ed)?\s+in|passion(?:ate)?\s+(?:for|about)|"
    r"willing(?:ness)?\s+to|eager(?:ness)?\s+to|open(?:ness)?\s+to|excited\s+about|curious|access\s+to)\b",
    re.IGNORECASE,
)
# "experience or interest in VR": interest alone is enough, so this can never be a hard requirement.
EITHER_INTEREST_RE = re.compile(r"\b(?:experience\s+or\s+interest|interests?\s+or\s+experience)\b", re.IGNORECASE)


@dataclass(frozen=True)
class Skill:
    id: str
    label: str
    category: str
    counts_toward_match: bool
    parent: str | None
    patterns: tuple[re.Pattern, ...]


def _compile(alias: str | dict) -> re.Pattern:
    if isinstance(alias, dict):
        pattern, flags = alias["pattern"], 0 if alias.get("case_sensitive") else re.IGNORECASE
    else:
        pattern, flags = alias, re.IGNORECASE
    # Whole-word style boundaries that still allow symbols like C++ and C#.
    return re.compile(rf"(?<![A-Za-z0-9])(?:{pattern})(?![A-Za-z0-9])", flags)


class SkillDictionary:
    def __init__(self, data: dict) -> None:
        self.categories: dict[str, str] = data["categories"]
        self.skills: dict[str, Skill] = {}
        for entry in data["skills"]:
            if entry["id"] in self.skills:
                raise ValueError(f"Duplicate skill id: {entry['id']}")
            if entry["category"] not in self.categories:
                raise ValueError(f"Unknown category for {entry['id']}: {entry['category']}")
            self.skills[entry["id"]] = Skill(
                id=entry["id"],
                label=entry["label"],
                category=entry["category"],
                counts_toward_match=entry.get("counts_toward_match", True),
                parent=entry.get("parent"),
                patterns=tuple(_compile(a) for a in entry["aliases"]),
            )
        for skill in self.skills.values():
            if skill.parent is None:
                continue
            parent = self.skills.get(skill.parent)
            if parent is None:
                raise ValueError(f"{skill.id} has unknown parent {skill.parent}")
            if parent.parent is not None:
                raise ValueError(f"Parents must be top-level: {skill.id} -> {parent.id} -> {parent.parent}")

    @classmethod
    def load(cls, path: Path) -> "SkillDictionary":
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def counts(self, skill_id: str) -> bool:
        return self.skills[skill_id].counts_toward_match

    def extract(self, text: str) -> list[str]:
        """Skill ids in text, ordered by first appearance, with parent and example rules applied."""
        example_spans = [m.span("after") if m.group("after") is not None else m.span("etc") for m in EXAMPLE_RE.finditer(text)]

        def in_example(pos: int) -> bool:
            return any(start <= pos < end for start, end in example_spans)

        found: dict[str, int] = {}
        for skill in self.skills.values():
            positions = [m.start() for p in skill.patterns for m in p.finditer(text)]
            if not positions:
                continue
            outside = [p for p in positions if not in_example(p)]
            if outside:
                skill_id, pos = skill.id, min(outside)
            else:
                skill_id, pos = (skill.parent or skill.id), min(positions)
            found[skill_id] = min(pos, found.get(skill_id, pos))

        kept = self.drop_covered_parents(list(found))
        return sorted(kept, key=lambda s: (found[s], s))

    def drop_covered_parents(self, ids: list[str]) -> list[str]:
        """Drop a vague parent when a more specific child is in the same list."""
        present = set(ids)
        return [s for s in ids if not any(self.skills[c].parent == s for c in present if c in self.skills)]


@dataclass
class ProjectSkills:
    required: list[str]
    preferred: list[str]
    unmatched: list[dict]
    # Skills that came only from the AI step (no word-list match anywhere in the project).
    ai: list[str] = field(default_factory=list)


def extract_project_skills(
    dictionary: SkillDictionary,
    quals: QualsResult,
    filled: Mapping[str, list[str]] | None = None,
) -> ProjectSkills:
    """filled: skill ids from the AI step, keyed by item text. Used only for items the word list
    found nothing in, so the AI can fill gaps but never overrule a literal match."""
    required: list[str] = []
    preferred: list[str] = []
    unmatched: list[dict] = []
    from_words: set[str] = set()
    for bucket, items in (("required", quals.required), ("preferred", quals.preferred)):
        for item in items:
            if INTEREST_ONLY_RE.match(item):
                continue  # an interest, attitude or access, not a skill
            ids = dictionary.extract(item)
            from_words.update(ids)
            if not ids and filled:
                ids = dictionary.drop_covered_parents([s for s in filled.get(item, []) if s in dictionary.skills])
            if not ids:
                unmatched.append({"bucket": bucket, "text": item})
            target = required if bucket == "required" and not EITHER_INTEREST_RE.search(item) else preferred
            for skill_id in ids:
                if skill_id not in target:
                    target.append(skill_id)
    # A skill that is required should not also be listed as merely preferred.
    preferred = [s for s in preferred if s not in required]
    ai = [s for s in required + preferred if s not in from_words]
    return ProjectSkills(required, preferred, unmatched, ai)
