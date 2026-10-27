"""Consistency checks for the hand-written dictionaries in data/."""

import re

from knightmatch_scraper import store
from knightmatch_scraper.skills import SkillDictionary

COURSE_CODE_RE = re.compile(r"^[A-Z]{3}\d{4}[CLH]?$")


def test_course_skills_reference_real_skills():
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    courses = store.read_json(store.data_path("course_skills.json"), None)["courses"]
    codes = [c["code"] for c in courses]
    assert len(codes) == len(set(codes)), "duplicate course code"
    for course in courses:
        assert COURSE_CODE_RE.match(course["code"]), course["code"]
        assert course["title"]
        assert course["skills"], course["code"]
        for skill_id in course["skills"]:
            assert skill_id in dictionary.skills, f"{course['code']} -> unknown skill {skill_id}"


def test_other_places_links_are_clean():
    from knightmatch_scraper.check_links import OTHER_PLACES_FILE, all_links
    from knightmatch_scraper.privacy import assert_no_emails

    data = store.read_json(store.data_path(OTHER_PLACES_FILE), None)
    links = all_links(data)
    assert links
    for link in links:
        assert link["url"].startswith("https://"), link["url"]
        assert link["title"].strip()
    assert_no_emails(data)
    # The OUR database access code must only come from OUR (workshop / peer mentor), never from us.
    assert "password" not in str(data).lower()


def test_lab_links_say_where_they_are_and_what_to_look_for():
    from knightmatch_scraper.check_links import OTHER_PLACES_FILE

    data = store.read_json(store.data_path(OTHER_PLACES_FILE), None)
    labs = next(s for s in data["sections"] if s["id"] == "labs")
    assert re.match(r"^\d{4}-\d{2}-\d{2}$", labs["checked_on"])
    assert labs["links"]
    for link in labs["links"]:
        assert link["department"].strip(), link["url"]
        # A short phrase copied from the page; the weekly check fails when it disappears.
        assert 2 <= len(link["still_says"].split()) <= 10, link["url"]


def test_projects_only_use_known_skills():
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    for project in store.read_json(store.data_path(store.PROJECTS_FILE), []):
        for skill_id in project["required_skills"] + project["preferred_skills"]:
            assert skill_id in dictionary.skills, f"{project['id']} uses unknown skill {skill_id}"
        assert set(project["ai_skills"]) <= set(project["required_skills"] + project["preferred_skills"])


def test_topics_file_and_tagged_projects():
    from knightmatch_scraper.ai import load_topics

    topics = load_topics(store.data_path(store.TOPICS_FILE))
    ids = {t["id"] for t in topics}
    for topic in topics:
        assert re.match(r"^[a-z0-9_]+$", topic["id"]), topic["id"]
        assert topic["label"].strip() and topic["hint"].strip()
    for project in store.read_json(store.data_path(store.PROJECTS_FILE), []):
        assert set(project["topics"]) <= ids, project["id"]
    for project_id, entry in store.read_json(store.data_path(store.AI_CACHE_FILE), {}).items():
        assert set(entry["topics"]) <= ids, project_id
        assert all(set(item.keys()) == {"kind", "skills"} for item in entry["items"]), project_id
