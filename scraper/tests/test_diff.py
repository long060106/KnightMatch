from knightmatch_scraper.diff import merge_snapshot

DAY1, DAY2, DAY3 = "2026-10-17T11:00:00Z", "2026-10-18T11:00:00Z", "2026-10-19T11:00:00Z"


def fresh(pid, status="open", spots=2, quals_hash="a" * 16, title="T"):
    return {"id": pid, "url": f"https://x/{pid}/", "title": title, "status": status, "open_spots": spots,
            "quals_hash": quals_hash}


def event_types(result):
    return [(e["type"], e["project_id"]) for e in result.events]


def test_baseline_run_sets_history_without_events():
    result = merge_snapshot([], [fresh("krsp-1"), fresh("krsp-2")], DAY1)
    assert result.events == []
    for record in result.records:
        assert record["first_seen_at"] == DAY1
        assert record["listed"] is True and record["removed_at"] is None


def test_unchanged_rerun_keeps_first_seen_and_emits_nothing():
    day1 = merge_snapshot([], [fresh("krsp-1")], DAY1).records
    result = merge_snapshot(day1, [fresh("krsp-1")], DAY2)
    record = result.records[0]
    assert result.events == []
    assert record["first_seen_at"] == DAY1
    assert record["last_checked_at"] == DAY2
    assert record["last_changed_at"] == DAY1


def test_new_project_after_baseline():
    day1 = merge_snapshot([], [fresh("krsp-1")], DAY1).records
    result = merge_snapshot(day1, [fresh("krsp-1"), fresh("krsp-2")], DAY2)
    assert event_types(result) == [("new", "krsp-2")]


def test_became_full_and_spots_changed():
    day1 = merge_snapshot([], [fresh("krsp-1", spots=1)], DAY1).records
    result = merge_snapshot(day1, [fresh("krsp-1", status="full", spots=0)], DAY2)
    assert event_types(result) == [("became_full", "krsp-1"), ("spots_changed", "krsp-1")]
    spots = next(e for e in result.events if e["type"] == "spots_changed")
    assert (spots["before"], spots["after"]) == (1, 0)
    record = result.records[0]
    assert record["status_changed_at"] == DAY2
    assert record["last_changed_at"] == DAY2
    assert record["first_seen_at"] == DAY1


def test_quals_change_is_tracked():
    day1 = merge_snapshot([], [fresh("krsp-1")], DAY1).records
    result = merge_snapshot(day1, [fresh("krsp-1", quals_hash="b" * 16)], DAY2)
    assert event_types(result) == [("quals_changed", "krsp-1")]


def test_removed_then_relisted_keeps_history():
    day1 = merge_snapshot([], [fresh("krsp-1"), fresh("krsp-2")], DAY1).records
    day2 = merge_snapshot(day1, [fresh("krsp-1")], DAY2)
    removed = next(r for r in day2.records if r["id"] == "krsp-2")
    assert event_types(day2) == [("removed", "krsp-2")]
    assert removed["listed"] is False and removed["removed_at"] == DAY2

    # Removed again on day 3 should not emit a second "removed" event.
    assert merge_snapshot(day2.records, [fresh("krsp-1")], DAY3).events == []

    day3 = merge_snapshot(day2.records, [fresh("krsp-1"), fresh("krsp-2")], DAY3)
    back = next(r for r in day3.records if r["id"] == "krsp-2")
    assert event_types(day3) == [("relisted", "krsp-2")]
    assert back["listed"] is True and back["removed_at"] is None
    assert back["first_seen_at"] == DAY1


def test_failed_detail_page_keeps_yesterday_record():
    day1 = merge_snapshot([], [fresh("krsp-1"), fresh("krsp-2")], DAY1).records
    result = merge_snapshot(day1, [fresh("krsp-1")], DAY2, kept_ids={"krsp-2"})
    kept = next(r for r in result.records if r["id"] == "krsp-2")
    assert result.events == []
    assert kept["listed"] is True
    assert kept["last_checked_at"] == DAY1


def test_records_sorted_open_first_then_newest():
    day1 = merge_snapshot([], [fresh("krsp-1", status="full", spots=0), fresh("krsp-2")], DAY1).records
    result = merge_snapshot(day1, [fresh("krsp-1", status="full", spots=0), fresh("krsp-2"), fresh("krsp-3")], DAY2)
    assert [r["id"] for r in result.records] == ["krsp-3", "krsp-2", "krsp-1"]
