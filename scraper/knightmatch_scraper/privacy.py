"""Keep personal contact details out of the public data files.

The repo is public, so team leader emails (many are students) are dropped before writing,
and any email that appears inside free text is masked. Students get contact info from the
original KRSP page, which stays the source of truth.
"""

from __future__ import annotations

import copy
import re
from typing import Any

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
EMAIL_PLACEHOLDER = "[email on the KRSP page]"
FREE_TEXT_FIELDS = ("title", "description", "quals_raw")
FREE_TEXT_LIST_FIELDS = ("required_quals", "preferred_quals")


class PrivateDataLeak(RuntimeError):
    pass


def mask_emails(text: str | None) -> str | None:
    return EMAIL_RE.sub(EMAIL_PLACEHOLDER, text) if text else text


def public_record(record: dict) -> dict:
    """Copy of a project record that is safe to publish."""
    safe = copy.deepcopy(record)
    for person_field in ("team_leader",):
        if safe.get(person_field):
            safe[person_field].pop("email", None)
    for person in safe.get("co_leaders", []):
        person.pop("email", None)
    for name in FREE_TEXT_FIELDS:
        safe[name] = mask_emails(safe.get(name))
    for name in FREE_TEXT_LIST_FIELDS:
        safe[name] = [mask_emails(item) for item in safe.get(name, [])]
    return safe


def assert_no_emails(value: Any, path: str = "$") -> None:
    """Raise if any string anywhere in value looks like an email address."""
    if isinstance(value, str):
        if EMAIL_RE.search(value):
            raise PrivateDataLeak(f"Email address found at {path}")
    elif isinstance(value, dict):
        for key, item in value.items():
            assert_no_emails(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            assert_no_emails(item, f"{path}[{index}]")
