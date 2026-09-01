#!/usr/bin/env python3
"""Fail on common identity leaks in the anonymous static site."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".html", ".css", ".js", ".md", ".json", ".txt", ".xml"}
EMAIL = re.compile(r"(?i)\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b")
HOME_PATH = re.compile(r"/(?:root|home|mnt|data)/[^\s\"'<>]+")
URL = re.compile(r"https?://[^\s\"'<>]+", re.IGNORECASE)
FORBIDDEN_HOST_HINTS = ("github.com/", "github.io", "modelscope", "huggingface.co/")


def load_local_terms() -> list[str]:
    local_file = ROOT / ".anon-forbidden.txt"
    env_terms = os.environ.get("ANON_FORBIDDEN_TERMS", "")
    terms = [term.strip() for term in env_terms.split(",") if term.strip()]
    if local_file.exists():
        terms.extend(
            line.strip()
            for line in local_file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        )
    return terms


def main() -> int:
    findings: list[str] = []
    forbidden_terms = load_local_terms()

    for path in sorted(ROOT.rglob("*")):
        if (
            not path.is_file()
            or ".git" in path.parts
            or "scripts" in path.relative_to(ROOT).parts
            or path.suffix.lower() not in TEXT_SUFFIXES
        ):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        relative = path.relative_to(ROOT)

        for match in EMAIL.finditer(text):
            findings.append(f"{relative}: email-like token: {match.group(0)}")
        for match in HOME_PATH.finditer(text):
            findings.append(f"{relative}: absolute host path: {match.group(0)}")
        for match in URL.finditer(text):
            url = match.group(0).rstrip("`.,)")
            if not url.startswith(("http://127.0.0.1", "http://localhost")):
                findings.append(f"{relative}: external URL present: {url}")
        lowered = text.lower()
        for hint in FORBIDDEN_HOST_HINTS:
            if hint in lowered:
                findings.append(f"{relative}: external identity host hint: {hint}")
        for term in forbidden_terms:
            if term.casefold() in text.casefold():
                findings.append(f"{relative}: configured forbidden term: {term}")

    if findings:
        print("Anonymous-site audit failed:")
        for finding in findings:
            print(f"  - {finding}")
        return 1

    print("Anonymous-site audit passed: no common text-level identity leaks found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
