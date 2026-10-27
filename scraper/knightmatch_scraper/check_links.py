"""Check every link on the Other places page:  python -m knightmatch_scraper.check_links

Uses the same polite client as the scraper (robots.txt, 2.5s between requests). Hosts that
disallow bots are skipped and reported, never fetched. Links with `still_says` (the labs that say
they take undergraduates) must also still show that phrase, so a lab that stops recruiting gets
looked at by hand. Exits 1 if any link is broken or any phrase is gone.
"""

from __future__ import annotations

import re
import sys

from bs4 import BeautifulSoup

from . import store
from .fetch import PoliteClient

OTHER_PLACES_FILE = "other-places.json"


def all_links(data: dict) -> list[dict]:
    links = []
    for section in data["sections"]:
        links.extend(section["links"])
        callout = section.get("callout")
        if callout:
            links.append({"title": callout["title"], "url": callout["url"]})
            links.extend({"title": step["label"], "url": step["url"]} for step in callout.get("steps", []))
    unique: dict[str, dict] = {}
    for link in links:
        unique.setdefault(link["url"], link)
    return list(unique.values())


def _normalize(text: str) -> str:
    # Curly quotes and odd spaces vary between edits of the same sentence; case and spacing too.
    text = text.translate(str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', " ": " "}))
    return re.sub(r"\s+", " ", text).strip().lower()


def page_says(html: str, phrase: str) -> bool:
    """Whether the page's visible text still contains the phrase."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return _normalize(phrase) in _normalize(soup.get_text(" "))


def main() -> int:
    data = store.read_json(store.data_path(OTHER_PLACES_FILE), None)
    client = PoliteClient()
    broken = 0
    for link in all_links(data):
        url = link["url"]
        if not client._robots_for(url).can_fetch(client.user_agent, url):
            print(f"SKIP (robots.txt)  {url}")
            continue
        response = None
        try:
            response = client._raw_get(url)
            status = response.status_code
        except Exception as error:  # network trouble counts as broken
            status = f"{type(error).__name__}"
        ok = isinstance(status, int) and 200 <= status < 400
        phrase = link.get("still_says")
        if ok and phrase and not page_says(response.text, phrase):
            ok = False
            status = f'{status}, no longer says "{phrase}"'
        broken += not ok
        print(f"{'OK  ' if ok else 'FAIL'} {status}  {url}")
    print(f"\n{broken} broken link(s).")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
