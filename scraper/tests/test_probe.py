import json

from knightmatch_scraper import config, probe
from knightmatch_scraper.fetch import PoliteClient

from .conftest import read_fixture


class FakeResponse:
    def __init__(self, status_code=200, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}
        self.encoding = "utf-8"

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeSession:
    def __init__(self, html, headers=None, status=200):
        self.headers = {}
        self.html, self.page_headers, self.status = html, headers or {}, status
        self.calls = []

    def get(self, url, timeout, headers=None):
        self.calls.append((url, headers))
        if url.endswith("/robots.txt"):
            return FakeResponse(text="User-agent: *\nDisallow:\n")
        if headers:  # a conditional re-check of a page that did not change
            return FakeResponse(304)
        return FakeResponse(self.status, self.html, self.page_headers)


def client_for(session):
    return PoliteClient(delay_seconds=0, user_agent="TestBot", session=session, sleep=lambda s: None)


def record(at, items, raw="r"):
    return {"at": at, "status": 200, "raw_hash": raw, "list_hash": probe.list_hash(items), "items": items, "requests": 2}


ITEM = {"url": "https://x.test/krsp-project/a/", "status": "full", "title": "A", "semester": None, "spots": "Full Team"}


def test_list_hash_ignores_page_order_but_not_content():
    items = probe.list_items(read_fixture("list.html"))
    assert len(items) == 42
    assert probe.list_hash(items) == probe.list_hash(list(reversed(items)))
    flipped = [dict(items[0], spots=items[0]["spots"] + "!")] + items[1:]
    assert probe.list_hash(flipped) != probe.list_hash(items)


def test_check_reads_only_the_list_page_and_keeps_no_html():
    session = FakeSession(read_fixture("list.html"), {"ETag": '"abc"'})
    result = probe.check(client_for(session), "2026-10-20T12:41:00Z")
    assert [url for url, _ in session.calls] == [f"{config.BASE_URL}/robots.txt", config.LIST_URL]
    assert result["requests"] == 2 and result["count"] == 42 and result["etag"] == '"abc"'
    assert "<" not in json.dumps(result)  # no markup stored, only parsed fields and hashes
    assert "conditional_status" not in result


def test_conditional_check_sends_the_validator_once():
    session = FakeSession(read_fixture("list.html"), {"ETag": '"abc"', "Last-Modified": "Mon, 19 Oct 2026 10:00:00 GMT"})
    result = probe.check(client_for(session), "2026-10-20T12:41:00Z", conditional=True)
    assert result["conditional_status"] == 304
    assert session.calls[-1][1] == {"If-None-Match": '"abc"', "If-Modified-Since": "Mon, 19 Oct 2026 10:00:00 GMT"}
    assert result["requests"] == 3


def test_a_failed_check_is_logged_not_raised():
    result = probe.check(client_for(FakeSession("", status=404)), "2026-10-20T12:41:00Z")
    assert "error" in result and "list_hash" not in result


def test_report_counts_real_changes_and_the_daily_delay():
    opened = dict(ITEM, status="open", spots="1 Spots Open")
    new = {**ITEM, "url": "https://x.test/krsp-project/b/", "title": "B", "spots": "3 Spots Open", "status": "open"}
    records = [
        record("2026-10-20T12:41:00Z", [ITEM]),
        record("2026-10-20T13:41:00Z", [ITEM], raw="changed"),  # HTML moved, list did not: noise
        {"at": "2026-10-20T14:41:00Z", "error": "RuntimeError: HTTP 503", "requests": 4},
        record("2026-10-20T15:41:00Z", [opened]),  # daily run is next day 11:17 -> 19.6 h later
        record("2026-10-21T10:41:00Z", [opened, new]),  # daily run at 11:17 the same day -> 0.6 h later
        record("2026-10-21T11:41:00Z", [opened, new]),
    ]
    summary = probe.summarize(records)
    assert summary["checks"] == 6 and summary["failed"] == 1
    assert summary["raw_only_changes"] == 1
    assert summary["longest_gap_minutes"] == 1140.0
    first, second = summary["changes"]
    assert first["daily_delay_hours"] == 19.6
    assert first["what"] == ["A: status 'full' -> 'open', spots 'Full Team' -> '1 Spots Open'"]
    assert second["daily_delay_hours"] == 0.6
    assert second["what"] == ["new: B (3 Spots Open)"]
    assert "Real list changes: 2" in probe.format_report(summary)


def test_daily_run_inside_the_gap_counts_as_no_delay():
    later = dict(ITEM, spots="Full")
    summary = probe.summarize([record("2026-10-20T10:41:00Z", [ITEM]), record("2026-10-20T12:41:00Z", [later])])
    assert summary["changes"][0]["daily_delay_hours"] == 0


def test_read_records_merges_logs_and_drops_duplicates(tmp_path):
    a, b = record("2026-10-20T12:41:00Z", [ITEM]), record("2026-10-20T13:41:00Z", [ITEM])
    (tmp_path / "one").mkdir()
    (tmp_path / "one" / "probe.jsonl").write_text(json.dumps(a) + "\n" + json.dumps(b) + "\n", encoding="utf-8")
    (tmp_path / "two.jsonl").write_text(json.dumps(b) + "\n", encoding="utf-8")
    assert [r["at"] for r in probe.read_records([tmp_path])] == [a["at"], b["at"]]


def test_check_command_appends_to_the_log(tmp_path, monkeypatch):
    monkeypatch.setattr(probe, "PoliteClient", lambda: client_for(FakeSession(read_fixture("list.html"))))
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    log = tmp_path / "log" / "probe.jsonl"
    assert probe.main(["check", "--log", str(log)]) == 0
    assert probe.main(["check", "--log", str(log)]) == 0
    lines = log.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2 and json.loads(lines[0])["count"] == 42


def test_project_list_is_only_logged_when_it_changes(tmp_path, monkeypatch):
    pages = [read_fixture("list.html")] * 2 + [read_fixture("list.html").replace("5 Spots Open", "4 Spots Open", 1)]
    times = [f"2026-10-20T{h}:41:00Z" for h in (12, 13, 14)]
    monkeypatch.setattr(probe, "PoliteClient", lambda: client_for(FakeSession(pages.pop(0))))
    monkeypatch.setattr(probe, "utc_now", lambda: times.pop(0))
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    log = tmp_path / "probe.jsonl"
    for _ in range(3):
        probe.main(["check", "--log", str(log)])
    lines = [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()]
    assert ["items" in line for line in lines] == [True, False, True]
    summary = probe.summarize(probe.read_records([log]))
    assert [len(c["what"]) for c in summary["changes"]] == [1]
    assert "'5 Spots Open' -> '4 Spots Open'" in summary["changes"][0]["what"][0]


def hash_only(at, items, raw="r"):
    line = record(at, items, raw)
    del line["items"]
    return line


def test_since_counts_only_the_window_but_knows_the_list_from_before():
    b = dict(ITEM, spots="2 Spots Open", status="open")
    c = dict(b, spots="1 Spots Open")
    records = [
        record("2026-10-20T10:41:00Z", [ITEM]),
        hash_only("2026-10-20T11:41:00Z", [ITEM]),
        record("2026-10-20T12:41:00Z", [b]),  # before the window
        hash_only("2026-10-31T23:41:00Z", [b]),
        record("2026-11-01T00:41:00Z", [c]),  # inside the window
        hash_only("2026-11-01T01:41:00Z", [c], raw="x"),
    ]
    summary = probe.summarize(records, since="2026-11-01")
    assert summary["checks"] == 2 and summary["first"] == "2026-11-01T00:41:00Z"
    assert [ch["what"] for ch in summary["changes"]] == [["A: spots '2 Spots Open' -> '1 Spots Open'"]]
    assert summary["raw_only_changes"] == 1
    assert len(probe.summarize(records)["changes"]) == 2
