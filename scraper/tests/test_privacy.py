import pytest

from knightmatch_scraper import store
from knightmatch_scraper.diff import merge_snapshot
from knightmatch_scraper.parse_list import parse_list
from knightmatch_scraper.parse_project import parse_project
from knightmatch_scraper.privacy import (
    EMAIL_PLACEHOLDER,
    PrivateDataLeak,
    assert_no_emails,
    public_record,
)
from knightmatch_scraper.quals import split_quals
from knightmatch_scraper.record import build_record, ordered
from knightmatch_scraper.skills import SkillDictionary, extract_project_skills


def test_public_record_drops_and_masks_emails():
    record = {
        "title": "T",
        "team_leader": {"name": "A", "email": "a@example.edu", "role": "PhD"},
        "co_leaders": [{"name": "B", "email": "b@example.edu", "role": None}],
        "description": "Questions? Write to a@example.edu today.",
        "quals_raw": "Email b@school.example.edu first",
        "required_quals": ["contact x@y.com"],
        "preferred_quals": [],
    }
    safe = public_record(record)
    assert safe["team_leader"] == {"name": "A", "role": "PhD"}
    assert safe["co_leaders"] == [{"name": "B", "role": None}]
    assert safe["description"] == f"Questions? Write to {EMAIL_PLACEHOLDER} today."
    assert EMAIL_PLACEHOLDER in safe["quals_raw"]
    assert record["team_leader"]["email"] == "a@example.edu"  # original is not mutated
    assert_no_emails(safe)


def test_assert_no_emails_finds_nested_values():
    with pytest.raises(PrivateDataLeak, match=r"\$\.a\[1\]\.b"):
        assert_no_emails({"a": ["ok", {"b": "x@example.edu"}]})


def test_full_pipeline_record_is_public_and_matches_schema(fixture_html):
    """Fixture page -> record -> public record: no emails, valid against the JSON Schema."""
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    entries = {e.url: e for e in parse_list(fixture_html("list.html"))}
    entry = next(e for url, e in entries.items() if "secure-and-fault-tolerant" in url)
    page = parse_project(fixture_html("project_534.html"), entry.url)
    quals = split_quals(page.quals_html)
    record = public_record(build_record(entry, page, quals, extract_project_skills(dictionary, quals), dictionary))
    records = [ordered(r) for r in merge_snapshot([], [record], "2026-10-17T11:00:00Z").records]
    assert_no_emails(records)
    store.validate_projects(records)
    assert records[0]["id"] == "krsp-534"
    assert records[0]["team_leader"] == {"name": "Chanhee Lee, PhD", "role": "Postdoctoral Scholar"}


def test_published_data_files_contain_no_emails():
    """CI guard: fails if anything in data/ ever contains an email address."""
    for name in (store.PROJECTS_FILE, store.EVENTS_FILE, store.META_FILE, store.REVIEW_FILE):
        path = store.data_path(name)
        if path.exists():
            assert_no_emails(store.read_json(path, None), path.name)
