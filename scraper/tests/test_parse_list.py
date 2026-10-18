import pytest

from knightmatch_scraper.parse_list import ListPageLayoutError, normalize_url, parse_list

BASE = "https://knight.research.ucf.edu/krsp-project/"


@pytest.fixture
def entries(fixture_html):
    return parse_list(fixture_html("list.html"))


def test_finds_every_project_in_both_sections(entries):
    assert len(entries) == 42
    assert sum(e.status == "open" for e in entries) == 14
    assert sum(e.status == "full" for e in entries) == 28
    assert len({e.url for e in entries}) == 42


def test_urls_are_normalized_project_pages(entries):
    for entry in entries:
        assert entry.url.startswith(BASE)
        assert entry.url.endswith("/")


def test_open_entry_splits_semester_from_title(entries):
    entry = next(e for e in entries if "secure-and-fault-tolerant" in e.url)
    assert entry.status == "open"
    assert entry.list_semester == "Fall 2026"
    assert entry.list_title == "Secure and Fault-Tolerant Large Language Models for Embedded Systems"
    assert entry.spots_text == "1 Spots Open"


def test_full_entry_has_no_semester_prefix(entries):
    entry = next(e for e in entries if e.url.endswith("/the-access-study/"))
    assert entry.status == "full"
    assert entry.list_semester is None
    assert entry.list_title == "The ACCESS Study"


def test_missing_sections_raise_instead_of_returning_nothing():
    with pytest.raises(ListPageLayoutError):
        parse_list("<html><body><h3>Something else</h3></body></html>")


def test_normalize_url_strips_query_and_adds_slash():
    assert normalize_url("/krsp-project/abc?utm=x#top") == BASE + "abc/"
