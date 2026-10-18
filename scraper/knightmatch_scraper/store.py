"""Read and write the JSON files in data/, validating projects against the JSON Schema."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from . import config

PROJECTS_FILE = "projects.json"
EVENTS_FILE = "events.json"
META_FILE = "meta.json"
REVIEW_FILE = "review/unmatched_quals.json"
SCHEMA_FILE = "schema/project.schema.json"
SKILLS_FILE = "skills.json"


def data_path(name: str, data_dir: Path | None = None) -> Path:
    return (data_dir or config.DATA_DIR) / name


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")


def validate_projects(records: list[dict], data_dir: Path | None = None) -> None:
    schema = read_json(data_path(SCHEMA_FILE, data_dir), None)
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(records), key=lambda e: list(e.path))
    if errors:
        details = "\n".join(f"  {list(e.path)}: {e.message}" for e in errors[:10])
        raise ValueError(f"projects.json failed schema validation:\n{details}")
