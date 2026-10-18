"""The AI step, with a fake endpoint: nothing here calls a real API."""

import json

import pytest

from knightmatch_scraper import ai
from knightmatch_scraper.ai import AiClient, Annotator, clean_answer, person_names, scrub, user_message
from knightmatch_scraper.quals import QualsResult
from knightmatch_scraper.skills import SkillDictionary, extract_project_skills

DICTIONARY = {
    "categories": {"c": "Computing", "s": "Science"},
    "skills": [
        {"id": "programming", "label": "Programming", "category": "c", "aliases": ["programming", "coding"]},
        {"id": "python", "label": "Python", "category": "c", "parent": "programming", "aliases": ["python"]},
        {"id": "statistics", "label": "Statistics", "category": "s", "aliases": ["statistics"]},
    ],
}
TOPICS = [
    {"id": "ai_ml", "label": "AI", "hint": "Models."},
    {"id": "biology", "label": "Biology", "hint": "Life."},
    {"id": "health", "label": "Health", "hint": "Patients."},
    {"id": "physics_space", "label": "Physics", "hint": "Optics."},
]
QUALS = QualsResult(raw="", required=["Python", "Comfortable with a Linux shell"], preferred=["Meetings are recorded"])
ANSWER = {
    "items": [
        {"index": 0, "kind": "skill", "skills": ["programming"]},
        {"index": 1, "kind": "skill", "skills": ["programming"]},
        {"index": 2, "kind": "logistics", "skills": []},
    ],
    "topics": ["ai_ml"],
}
NOW = "2026-10-18T11:17:00Z"


class FakeResponse:
    def __init__(self, status=200, body=None, headers=None):
        self.status_code = status
        self.headers = headers or {}
        self._body = body
        self.text = json.dumps(body) if body is not None else ""

    def json(self):
        if self._body is None:
            raise ValueError("no body")
        return self._body


def chat(answer) -> FakeResponse:
    content = answer if isinstance(answer, str) else json.dumps(answer)
    return FakeResponse(200, {"choices": [{"message": {"content": content}}]})


class FakePost:
    """Returns the given responses in order (the last one repeats) and records each request."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]


@pytest.fixture
def dictionary():
    return SkillDictionary(DICTIONARY)


def make_client(post, sleeps=None):
    return AiClient(
        "test-key", "test-model", "https://ai.example/v1",
        post=post, sleep=(sleeps.append if sleeps is not None else lambda s: None), clock=lambda: 0.0,
    )


def annotate(annotator, description="A project about code.", quals=QUALS):
    return annotator.annotate("krsp-1", "Title", description, quals, ["Chanhee Lee"])


def test_person_names_and_scrub_remove_people_and_emails():
    names = person_names("Chanhee Lee, PhD", "Dr. Ana Ruiz, Dr. Bo Kim")
    assert names == ["Chanhee Lee", "Ana Ruiz", "Bo Kim"]
    text = scrub("Ask Chanhee Lee or Dr. Lee (cl@ucf.edu). Dr. Ruiz's lab, with Bo Kim.", names)
    assert "@" not in text
    for word in ("Chanhee", "Lee", "Ruiz", "Kim"):
        assert word not in text
    assert text.count(ai.NAME_PLACEHOLDER) == 4


def test_user_message_sends_only_title_description_and_items():
    message = json.loads(user_message("T", "Email a@b.edu, ask Dr. Lee", ["Python"], ["Chanhee Lee"]))
    assert set(message) == {"title", "description", "qualification_items"}
    assert message["qualification_items"] == [{"index": 0, "text": "Python"}]
    assert "@" not in message["description"] and "Lee" not in message["description"]


def test_request_uses_json_schema_and_bearer_key(dictionary):
    post = FakePost(chat(ANSWER))
    annotate(Annotator(dictionary, TOPICS, {}, make_client(post), NOW))
    url, kwargs = post.calls[0]
    assert url == "https://ai.example/v1/chat/completions"
    assert kwargs["headers"]["Authorization"] == "Bearer test-key"
    body = kwargs["json"]
    assert body["model"] == "test-model" and body["temperature"] == 0
    assert body["response_format"]["type"] == "json_schema"
    schema = body["response_format"]["json_schema"]["schema"]
    assert schema["properties"]["topics"]["items"]["enum"] == ["ai_ml", "biology", "health", "physics_space"]
    assert "python: Python [Computing] (a specific kind of programming)" in body["messages"][0]["content"]


def test_ai_only_fills_items_the_word_list_missed(dictionary):
    annotator = Annotator(dictionary, TOPICS, {}, make_client(FakePost(chat(ANSWER))), NOW)
    note = annotate(annotator)
    skills = extract_project_skills(dictionary, QUALS, note.filled)
    # "Python" keeps its literal match; the AI's "programming" for it is ignored.
    assert skills.required == ["python", "programming"]
    assert skills.ai == ["programming"]
    assert skills.unmatched == [{"bucket": "preferred", "text": "Meetings are recorded"}]
    assert note.topics == ["ai_ml"]

    annotator.add_review("krsp-1", "Title", QUALS, note)
    [entry] = annotator.review
    assert entry["filled"] == [{"bucket": "required", "text": "Comfortable with a Linux shell", "ai": ["programming"]}]
    assert entry["differs"][0]["word_list"] == ["python"]


def test_unknown_ids_bad_indexes_and_extra_topics_are_dropped(dictionary):
    answer = {
        "items": [
            {"index": 0, "kind": "skill", "skills": ["made_up", "python", "programming"]},
            {"index": 7, "kind": "skill", "skills": ["statistics"]},
            {"index": 1, "kind": "weird", "skills": ["statistics"]},
        ],
        "topics": ["nope", "health", "ai_ml", "health", "biology", "physics_space"],
    }
    cleaned = clean_answer(answer, 2, dictionary, [t["id"] for t in TOPICS])
    assert cleaned["items"] == [{"kind": "skill", "skills": ["python"]}, {"kind": "other", "skills": []}]
    assert cleaned["topics"] == ["health", "ai_ml", "biology"]


def test_cached_answer_makes_no_new_request(dictionary):
    first = Annotator(dictionary, TOPICS, {}, make_client(FakePost(chat(ANSWER))), NOW)
    annotate(first)
    post = FakePost(chat(ANSWER))
    second = Annotator(dictionary, TOPICS, first.cache_out, make_client(post), NOW)
    note = annotate(second)
    assert post.calls == []
    assert note.topics == ["ai_ml"] and second.report().cached == 1


def test_changed_text_is_asked_again(dictionary):
    first = Annotator(dictionary, TOPICS, {}, make_client(FakePost(chat(ANSWER))), NOW)
    annotate(first)
    post = FakePost(chat(ANSWER))
    annotate(Annotator(dictionary, TOPICS, first.cache_out, make_client(post), NOW), description="New text.")
    assert len(post.calls) == 1


def test_429_is_retried_after_the_given_delay(dictionary):
    sleeps = []
    post = FakePost(FakeResponse(429, headers={"Retry-After": "2"}), chat(ANSWER))
    annotator = Annotator(dictionary, TOPICS, {}, make_client(post, sleeps), NOW)
    assert annotate(annotator).topics == ["ai_ml"]
    assert len(post.calls) == 2 and 2.0 in sleeps
    assert annotator.report().status == "ok"


def test_used_up_quota_stops_calls_and_falls_back_to_the_word_list(dictionary):
    post = FakePost(FakeResponse(429))
    annotator = Annotator(dictionary, TOPICS, {}, make_client(post), NOW)
    first = annotate(annotator)
    requests_after_first = len(post.calls)
    second = annotator.annotate("krsp-2", "Other", "Text", QUALS, [])
    assert requests_after_first == 4  # first try + 3 retries
    assert len(post.calls) == requests_after_first  # no more calls once stopped
    assert first.filled == {} and second.topics == []
    report = annotator.report()
    assert report.status == "stopped" and report.waiting == 2 and "429" in report.message


def test_unreadable_answer_is_skipped_but_others_continue(dictionary):
    annotator = Annotator(dictionary, TOPICS, {}, make_client(FakePost(chat("not json"), chat(ANSWER))), NOW)
    assert annotate(annotator).filled == {}
    assert annotator.annotate("krsp-2", "Other", "Text", QUALS, []).topics == ["ai_ml"]
    report = annotator.report()
    assert (report.status, report.failed, report.answered) == ("partial", 1, 1)


GEMINI_400 = FakeResponse(400, [{"error": {"code": 400, "message": "Request contains an invalid argument."}}])


def test_rejected_schema_switches_to_plain_json_for_the_rest_of_the_run(dictionary):
    post = FakePost(GEMINI_400, chat(ANSWER))
    annotator = Annotator(dictionary, TOPICS, {}, make_client(post), NOW)
    assert annotate(annotator).topics == ["ai_ml"]
    annotator.annotate("krsp-2", "Other", "Text", QUALS, [])
    formats = [kwargs["json"]["response_format"]["type"] for _, kwargs in post.calls]
    assert formats == ["json_schema", "json_object", "json_object"]
    report = annotator.report()
    assert (report.status, report.answered, report.response_format) == ("ok", 2, "json_object")


def test_bad_request_in_plain_json_mode_stops_the_ai_step(dictionary):
    post = FakePost(GEMINI_400)
    annotator = Annotator(dictionary, TOPICS, {}, make_client(post), NOW)
    annotate(annotator)
    assert len(post.calls) == 2
    report = annotator.report()
    assert report.status == "stopped" and "invalid argument" in report.message


def test_refused_key_stops_the_ai_step(dictionary):
    annotator = Annotator(dictionary, TOPICS, {}, make_client(FakePost(FakeResponse(403, {"error": {"message": "bad key"}}))), NOW)
    annotate(annotator)
    assert annotator.report().status == "stopped" and "refused" in annotator.report().message


def test_missing_key_means_word_list_only(dictionary, monkeypatch):
    monkeypatch.delenv("AI_API_KEY", raising=False)
    assert AiClient.from_env() is None
    annotator = Annotator(dictionary, TOPICS, {}, None, NOW)
    note = annotate(annotator)
    assert extract_project_skills(dictionary, QUALS, note.filled) == extract_project_skills(dictionary, QUALS)
    assert annotator.report().status == "off"


def test_without_a_client_earlier_answers_for_the_same_text_are_kept(dictionary):
    first = Annotator(dictionary, TOPICS, {}, make_client(FakePost(chat(ANSWER))), NOW)
    annotate(first)
    # The model or prompt changed (different key) but nobody can ask: keep the old answer.
    edited_topics = [{**t, "hint": t["hint"] + " Edited."} for t in TOPICS]
    offline = Annotator(dictionary, edited_topics, first.cache_out, None, NOW)
    note = annotate(offline)
    assert extract_project_skills(dictionary, QUALS, note.filled).ai == ["programming"]
    assert offline.cache_out["krsp-1"]["key"] == first.cache_out["krsp-1"]["key"]  # asked again next time


def test_answer_limit_per_run(dictionary):
    post = FakePost(chat(ANSWER))
    annotator = Annotator(dictionary, TOPICS, {}, make_client(post), NOW, max_answers=1)
    annotate(annotator)
    annotator.annotate("krsp-2", "Other", "Text", QUALS, [])
    assert len(post.calls) == 1 and annotator.report().waiting == 1
