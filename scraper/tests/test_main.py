from knightmatch_scraper.__main__ import list_fingerprint, list_unchanged
from knightmatch_scraper.parse_list import ListEntry, parse_list

from .conftest import read_fixture


def entry(url: str, status: str = "open", spots: str = "3 of 5 spots") -> ListEntry:
    return ListEntry(url, status, "A project", "Fall 2026", spots)


def test_fingerprint_ignores_order_but_not_status_or_spots():
    a, b = entry("https://x/1/"), entry("https://x/2/")
    assert list_fingerprint([a, b]) == list_fingerprint([b, a])
    assert list_fingerprint([a, b]) != list_fingerprint([a, entry("https://x/2/", status="full")])
    assert list_fingerprint([a, b]) != list_fingerprint([a, entry("https://x/2/", spots="4 of 5 spots")])


def test_fingerprint_of_the_real_list_page_is_stable():
    entries = parse_list(read_fixture("list.html"))
    assert list_fingerprint(entries) == list_fingerprint(list(reversed(entries)))


def test_hourly_run_skips_only_when_the_list_matches_a_recent_full_run():
    meta = {"list_fingerprint": "abc", "last_run_at": "2026-10-25T11:17:00Z"}
    assert list_unchanged("abc", meta, "2026-10-25T20:17:00Z")
    # A day later: full run anyway, project pages can change without the list noticing.
    assert not list_unchanged("abc", meta, "2026-10-26T10:17:00Z")
    assert not list_unchanged("abd", meta, "2026-10-25T12:17:00Z")
    # Data written before the hourly mode has no fingerprint: always a full run.
    assert not list_unchanged("abc", {"last_run_at": "2026-10-25T11:17:00Z"}, "2026-10-25T12:17:00Z")
    assert not list_unchanged("abc", {"list_fingerprint": "abc"}, "2026-10-25T12:17:00Z")
