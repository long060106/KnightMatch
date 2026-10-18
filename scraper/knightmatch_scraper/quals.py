"""Split free-form "Team Member Qualifications" text into required / preferred items.

KRSP pages mix several styles (all seen on the live site):
  - Labeled lines:  "Preferred: ...<br>Required: ..."  or  "REQUIRED SKILLS: ..."
  - Label sentences: "Required qualifications are CITI Training ..."
  - Heading lines:   "Minimum Requirements" on its own line, items on the next lines
  - Prose with cues: "... is preferred but not required", "You must be able to ..."
  - A bare list:     "PyTorch. CNN. Deep learning."  (no cue words anywhere)

Rules, in order:
  1. A sentence saying no experience is needed sets a flag and is never a requirement.
  2. "not required / optional" always means preferred.
  3. Under a Required label, a sentence with preferred wording becomes preferred.
  4. Under a Preferred label everything stays preferred (we never upgrade to required).
  5. Unlabeled sentences: "must / required" wording -> required, preferred wording -> preferred.
  6. Unlabeled, no cue: if the whole section has no markers at all it is a plain list of
     what the team expects -> required; otherwise it is surrounding prose -> preferred.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field

from .text import blocks_to_text, clean as _clean, rich_text_blocks

_REQ_WORDS = (
    r"required(?:\s+(?:qualifications?|skills?|experience|background))?|requirements?|"
    r"minimum(?:\s+(?:requirements?|qualifications?))?|must[\s-]+haves?|"
    r"skills?\s+needed|needed\s+skills?|qualifications?"
)
_PREF_WORDS = (
    r"p(?:re|er)ferred(?:\s+(?:qualifications?|skills?(?:\s+and\s+experience)?|experience|background))?|"
    r"nice[\s-]+to[\s-]+have|bonus|helpful(?:\s+skills?)?|desired(?:\s+(?:qualifications?|skills?))?|"
    r"(?:a\s+)?plus"
)
# "Required: ...", "Preferred skills and experience include: ..."
LABEL_COLON_RE = re.compile(rf"^\s*(?P<label>{_REQ_WORDS}|{_PREF_WORDS})(?:\s+include)?\s*[:\-–—]\s*", re.IGNORECASE)
# "Required qualifications are CITI Training ..."
LABEL_SENTENCE_RE = re.compile(r"^\s*(?P<label>required|p(?:re|er)ferred)\s+qualifications?\s+(?:are|is|include)\s+", re.IGNORECASE)
# "Minimum Requirements" alone on a line
LABEL_HEADING_RE = re.compile(rf"^\s*(?P<label>{_REQ_WORDS}|{_PREF_WORDS})\s*:?\s*$", re.IGNORECASE)
# "Preferred Digital art over ..." (no colon, next word capitalized)
LABEL_BARE_PREFERRED_RE = re.compile(r"^\s*(?P<label>[Pp](?:re|er)ferred)\s+(?=[A-Z])")
PREFERRED_LABEL_RE = re.compile(rf"^(?:{_PREF_WORDS})$", re.IGNORECASE)

_NO_EXP_ADJ = r"(?:(?:prior|previous|specialized|specific|formal|professional|technical|real|research|lab(?:oratory)?)\s+)*"
NO_EXPERIENCE_RE = re.compile(
    # "No specialized professional experience is required", "No prior research experience necessary"
    rf"\bno\s+{_NO_EXP_ADJ}(?:experience|skills|knowledge|background)(?:\s+\w+){{0,3}}?\s+(?:is\s+|are\s+)?(?:required|necessary|needed)\b"
    # "Experience is not required"
    r"|\bexperience\s+(?:is\s+)?not\s+(?:required|necessary|needed)\b"
    # "There are no real technical requirements"
    rf"|\bno\s+{_NO_EXP_ADJ}requirements\b"
    r"|\bnone\s+required\b",
    re.IGNORECASE,
)
NOT_REQUIRED_RE = re.compile(r"\bnot\s+(?:required|mandatory|necessary|needed)\b|\boptional\b", re.IGNORECASE)
REQUIRED_CUE_RE = re.compile(
    r"\b(?:must|required|requires?|need(?:ed|s)?\s+to|should\s+(?:have|be|know)|"
    r"expected\s+to\s+(?:have|know)|mandatory|necessary)\b",
    re.IGNORECASE,
)
PREFERRED_CUE_RE = re.compile(
    r"\b(?:p(?:re|er)fer(?:red|ably|ence)?|helpful|useful|a\s+plus|bonus|nice\s+to\s+have|"
    r"encouraged|ideal(?:ly)?|desired|desirable|beneficial|welcomed?|good\s+fits?|opportunit(?:y|ies))\b",
    re.IGNORECASE,
)
# Temporarily swap the dots in abbreviations so they do not end a sentence.
DOT_PLACEHOLDER = "\N{ONE DOT LEADER}"  # looks like "." but is a different character
ABBREVIATIONS = ("e.g.", "i.e.", "etc.", "vs.", "Dr.", "Ph.D.", "St.", "approx.")
MAX_LIST_SEGMENT = 70
EXAMPLE_LIST_RE = re.compile(r"\b(?:etc|such as|e\.g\.|for example)\b", re.IGNORECASE)
# Bullets, "(3)" / "3." numbering, and a leading "and"/"or" left over from list splitting.
LEADING_MARKER_RE = re.compile(r"^(?:[-•*]\s*|\(\d{1,2}\)\s*|\d{1,2}[.)]\s+|(?:and|or)\s+)+", re.IGNORECASE)


@dataclass
class QualsResult:
    raw: str
    required: list[str] = field(default_factory=list)
    preferred: list[str] = field(default_factory=list)
    no_experience_statement: bool = False

    @property
    def hash(self) -> str:
        return quals_hash(self.raw)


def quals_hash(raw: str) -> str:
    normalized = re.sub(r"\s+", " ", raw).strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def split_sentences(text: str) -> list[str]:
    protected = text
    for abbr in ABBREVIATIONS:
        protected = protected.replace(abbr, abbr.replace(".", DOT_PLACEHOLDER))
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z(\"'])", protected)
    return [_clean(p.replace(DOT_PLACEHOLDER, ".")) for p in parts if _clean(p)]


def _items_from_sentence(sentence: str, split_commas: bool) -> list[str]:
    """Split a sentence into qualification items.
    Always split on ";" and on numbering like "(1) ... (2) ...".
    With split_commas, "C/C++, Python, and embedded systems" becomes three items, but only when
    every piece is short (a list, not prose). Example lists ("Blender, Maya, etc.") stay whole."""
    clauses = [c for c in re.split(r"\s*;\s*|\s+(?:(?:and|or)\s+)?(?=\(\d{1,2}\)\s)", sentence) if c.strip()]
    items = []
    for clause in clauses:
        segments = [s for s in re.split(r"\s*,\s*", clause) if s]
        is_list = (
            split_commas
            and not EXAMPLE_LIST_RE.search(clause)
            and len(segments) > 1
            and all(len(s) <= MAX_LIST_SEGMENT for s in segments)
        )
        for piece in segments if is_list else [clause]:
            piece = LEADING_MARKER_RE.sub("", piece.strip())
            piece = piece.strip(" .:-")
            if piece and piece.lower() not in ("and", "or"):
                items.append(piece)
    return items


def _match_label(line: str) -> tuple[str | None, str, bool]:
    """(label, rest of line, is_heading). label is 'required' | 'preferred' | None."""
    for pattern, is_heading in (
        (LABEL_HEADING_RE, True),
        (LABEL_COLON_RE, False),
        (LABEL_SENTENCE_RE, False),
        (LABEL_BARE_PREFERRED_RE, False),
    ):
        if match := pattern.match(line):
            words = re.sub(r"\s+include$", "", match.group("label").strip(), flags=re.IGNORECASE)
            kind = "preferred" if PREFERRED_LABEL_RE.match(words) else "required"
            return kind, line[match.end():], is_heading
    return None, line, False


def _bucket(mode: str | None, sentence: str, section_is_marked: bool) -> str:
    if NOT_REQUIRED_RE.search(sentence):
        return "preferred"
    if mode == "required":
        return "preferred" if PREFERRED_CUE_RE.search(sentence) else "required"
    if mode == "preferred":
        return "preferred"
    if REQUIRED_CUE_RE.search(sentence):
        return "required"
    if PREFERRED_CUE_RE.search(sentence) or section_is_marked:
        return "preferred"
    return "required"


def split_quals(html: str) -> QualsResult:
    blocks = rich_text_blocks(html)
    result = QualsResult(raw=blocks_to_text(blocks))

    # Pass 1: attach the active label (if any) to every sentence.
    pieces: list[tuple[str | None, str]] = []
    mode: str | None = None
    carry = False  # a heading that ended its block keeps applying to the next paragraph
    for kind, lines in blocks:
        if kind == "p" and not carry:
            mode = None
        carry = False
        for line in lines:
            label, rest, _ = _match_label(line)
            if label:
                mode = label
                line = rest
            carry = bool(label) and not rest.strip()
            if not line.strip():
                continue
            for sentence in split_sentences(line):
                # A label can also start a later sentence: "... assessments. Required: 3-hour windows"
                inline_label, inline_rest, _ = _match_label(sentence)
                if inline_label:
                    mode, sentence = inline_label, inline_rest
                    if not sentence.strip():
                        continue
                if NO_EXPERIENCE_RE.search(sentence):
                    result.no_experience_statement = True
                    continue
                pieces.append((mode, sentence))

    # Pass 2: decide each sentence's bucket.
    section_is_marked = any(
        mode or REQUIRED_CUE_RE.search(s) or PREFERRED_CUE_RE.search(s) or NOT_REQUIRED_RE.search(s)
        for mode, s in pieces
    )
    for mode, sentence in pieces:
        bucket = _bucket(mode, sentence, section_is_marked)
        # Labeled text and bare lists are item lists; surrounding prose keeps its commas.
        split_commas = mode is not None or not section_is_marked
        getattr(result, bucket).extend(_items_from_sentence(sentence, split_commas))
    return result
