import pytest

from knightmatch_scraper.fetch import PoliteClient, RobotsDisallowed


class FakeResponse:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text
        self.encoding = "utf-8"

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(self.status_code)


class FakeSession:
    def __init__(self, robots="User-agent: *\nDisallow:\n", pages=None):
        self.headers = {}
        self.robots = robots
        self.pages = pages or {}
        self.calls = []

    def get(self, url, timeout):
        self.calls.append(url)
        if url.endswith("/robots.txt"):
            return FakeResponse(text=self.robots)
        status, text = self.pages.get(url, (200, "<html></html>"))
        return FakeResponse(status, text)


class FakeClock:
    """Time only moves when the client sleeps, so we can check the waits exactly."""

    def __init__(self):
        self.now = 0.0
        self.sleeps = []

    def time(self):
        return self.now

    def sleep(self, seconds):
        self.sleeps.append(round(seconds, 3))
        self.now += seconds


def make_client(session, clock, delay=2.5):
    return PoliteClient(delay_seconds=delay, user_agent="TestBot", session=session, sleep=clock.sleep, clock=clock.time)


def test_waits_between_every_request():
    clock = FakeClock()
    client = make_client(FakeSession(), clock)
    client.get("https://site.test/a/")
    client.get("https://site.test/b/")
    # robots.txt, then /a/ and /b/: every request after the first waits the full delay.
    assert clock.sleeps == [2.5, 2.5]
    assert client.request_count == 3


def test_robots_disallow_is_respected():
    session = FakeSession(robots="User-agent: *\nDisallow: /private/\n")
    client = make_client(session, FakeClock())
    with pytest.raises(RobotsDisallowed):
        client.get("https://site.test/private/page/")
    assert all("private" not in url for url in session.calls)


def test_retries_transient_errors_then_succeeds():
    url = "https://site.test/flaky/"
    session = FakeSession()
    responses = iter([FakeResponse(503), FakeResponse(200, "ok")])
    original_get = session.get

    def flaky_get(u, timeout):
        return next(responses) if u == url else original_get(u, timeout)

    session.get = flaky_get
    clock = FakeClock()
    assert make_client(session, clock).get(url) == "ok"


def test_user_agent_is_sent():
    session = FakeSession()
    make_client(session, FakeClock())
    assert session.headers["User-Agent"] == "TestBot"
