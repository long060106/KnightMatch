"""A polite HTTP client: obeys robots.txt, waits between requests, retries transient errors."""

from __future__ import annotations

import time
from typing import Callable
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

from . import config

RETRY_STATUS = {429, 500, 502, 503, 504}


class RobotsDisallowed(RuntimeError):
    pass


class RobotsUnavailable(RuntimeError):
    pass


class PoliteClient:
    def __init__(
        self,
        delay_seconds: float = config.REQUEST_DELAY_SECONDS,
        user_agent: str | None = None,
        session: requests.Session | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.delay_seconds = delay_seconds
        self.user_agent = user_agent or config.user_agent()
        self.session = session or requests.Session()
        self.session.headers["User-Agent"] = self.user_agent
        self._sleep = sleep
        self._clock = clock
        self._last_request_at: float | None = None
        self._robots: dict[str, RobotFileParser] = {}
        self.request_count = 0

    def _wait_turn(self) -> None:
        if self._last_request_at is not None:
            elapsed = self._clock() - self._last_request_at
            if elapsed < self.delay_seconds:
                self._sleep(self.delay_seconds - elapsed)
        self._last_request_at = self._clock()

    def _raw_get(self, url: str, headers: dict[str, str] | None = None) -> requests.Response:
        last_error: Exception | None = None
        extra = {"headers": headers} if headers else {}
        for attempt in range(config.MAX_RETRIES):
            self._wait_turn()
            self.request_count += 1
            try:
                response = self.session.get(url, timeout=config.TIMEOUT_SECONDS, **extra)
            except requests.RequestException as error:
                last_error = error
            else:
                if response.status_code not in RETRY_STATUS:
                    return response
                last_error = requests.HTTPError(f"HTTP {response.status_code} for {url}")
            # Back off a little more each time (2.5s, 5s, 10s on top of the normal delay).
            self._sleep(self.delay_seconds * (2**attempt))
        raise RuntimeError(f"Giving up on {url} after {config.MAX_RETRIES} tries: {last_error}")

    def _robots_for(self, url: str) -> RobotFileParser:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin not in self._robots:
            parser = RobotFileParser()
            response = self._raw_get(f"{origin}/robots.txt")
            if response.status_code == 200:
                parser.parse(response.text.splitlines())
            elif response.status_code == 404:
                parser.parse([])  # no robots.txt means everything is allowed
            else:
                raise RobotsUnavailable(f"robots.txt returned HTTP {response.status_code}")
            self._robots[origin] = parser
        return self._robots[origin]

    def fetch(self, url: str, headers: dict[str, str] | None = None) -> requests.Response:
        """Like get(), but returns the whole response (status and headers too). 304 is not an error."""
        if not self._robots_for(url).can_fetch(self.user_agent, url):
            raise RobotsDisallowed(f"robots.txt disallows {url}")
        response = self._raw_get(url, headers)
        if response.status_code != 304:
            response.raise_for_status()
        response.encoding = response.encoding or "utf-8"
        return response

    def get(self, url: str) -> str:
        return self.fetch(url).text
