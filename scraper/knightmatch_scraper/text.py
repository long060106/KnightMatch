"""Shared helpers for turning WordPress rich text into plain lines."""

from __future__ import annotations

import re
from html import escape

from bs4 import BeautifulSoup, NavigableString


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def rich_text_blocks(html: str) -> list[tuple[str, list[str]]]:
    """[(kind, lines)]: one entry per <p>/<li> ('p' or 'li'), lines split on <br>."""
    soup = BeautifulSoup(html or "", "lxml")
    for br in soup.find_all("br"):
        br.replace_with(NavigableString("\n"))
    elements = soup.find_all(["p", "li"])
    if not elements:
        lines = [clean(line) for line in soup.get_text().split("\n") if clean(line)]
        return [("p", lines)] if lines else []
    blocks = []
    for el in elements:
        if el.name == "p" and el.find_parent("li"):
            continue
        lines = [clean(line) for line in el.get_text().split("\n") if clean(line)]
        if lines:
            blocks.append((el.name, lines))
    return blocks


def text_to_html(text: str) -> str:
    """Inverse of blocks_to_text, used to re-run extraction on stored text without re-fetching."""
    paragraphs = [p for p in text.split("\n\n") if p.strip()]
    return "".join("<p>" + "<br>".join(escape(line) for line in p.split("\n")) + "</p>" for p in paragraphs)


def blocks_to_text(blocks: list[tuple[str, list[str]]]) -> str:
    """Paragraphs separated by a blank line, <br> breaks kept as single newlines."""
    return "\n\n".join("\n".join(lines) for _, lines in blocks)
