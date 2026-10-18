"""Check every link on the Other places page:  python -m knightmatch_scraper.check_links

Uses the same polite client as the scraper (robots.txt, 2.5s between requests). Hosts that
disallow bots are skipped and reported, never fetched. Exits 1 if any link is broken.
"""

from __future__ import annotations

import sys

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


def main() -> int:
    data = store.read_json(store.data_path(OTHER_PLACES_FILE), None)
    client = PoliteClient()
    broken = 0
    for link in all_links(data):
        url = link["url"]
        if not client._robots_for(url).can_fetch(client.user_agent, url):
            print(f"SKIP (robots.txt)  {url}")
            continue
        try:
            response = client._raw_get(url)
            status = response.status_code
        except Exception as error:  # network trouble counts as broken
            status = f"{type(error).__name__}"
        ok = isinstance(status, int) and 200 <= status < 400
        broken += not ok
        print(f"{'OK  ' if ok else 'FAIL'} {status}  {url}")
    print(f"\n{broken} broken link(s).")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
