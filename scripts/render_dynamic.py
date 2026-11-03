#!/usr/bin/env python3
"""Fetch public GitHub repository metadata and render README-safe SVG cards.

This uses only GitHub's API and standard Python libraries. No backend or key
is needed for users. GitHub Actions uses GITHUB_TOKEN for dependable limits.
SVG output is plain static shapes/text (no JS, remote fonts or external files).
"""
from __future__ import annotations
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "components" / "catalog.json"

def number(value: object) -> str:
    n = int(value)
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 10_000:
        return f"{n / 1_000:.1f}k"
    return f"{n:,}"

def date_label(value: str | None) -> str:
    if not value:
        return "Unknown"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%d %b %Y")
    except ValueError:
        return "Unknown"

def get_metadata(repo: str) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}", repo) or ".." in repo:
        raise ValueError(f"Invalid GitHub repository: {repo}")
    url = f"https://api.github.com/repos/{repo}"
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "readme-component-hub"}
    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=25) as response:
            data = json.load(response)
    except (HTTPError, URLError) as exc:
        raise RuntimeError(f"GitHub API request for {repo} failed: {exc}") from exc
    return data

def make_card(repo: str, stats: dict, theme: str, generated_at: datetime) -> str:
    dark = theme == "dark"
    bg = "#121C24" if dark else "#F5F8FA"
    border = "#39534F" if dark else "#C9DBD2"
    muted = "#8FA9A6" if dark else "#617775"
    text = "#E6F3F0" if dark else "#153B36"
    accent = "#9AEFBC" if dark else "#137B55"
    panel = "#1B2B32" if dark else "#FFFFFF"

    # Truncate untrusted API data before escaping, including control characters.
    clean = lambda s: escape("".join(ch for ch in str(s) if ch.isprintable())[:120])
    short_repo = clean(repo.split("/", 1)[1][:35])
    owner = clean(repo.split("/", 1)[0][:35])
    stars = number(stats.get("stargazers_count", 0))
    forks = number(stats.get("forks_count", 0))
    issues = number(stats.get("open_issues_count", 0))
    last_push = date_label(stats.get("pushed_at"))
    synced = generated_at.strftime("%d %b %Y %H:%M UTC")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="700" height="250" viewBox="0 0 700 250" role="img" aria-label="GitHub repository stats for {clean(repo)}">
  <rect x="1" y="1" width="698" height="248" rx="21" fill="{bg}" stroke="{border}" stroke-width="2"/>
  <rect x="22" y="19" width="656" height="212" rx="14" fill="{panel}"/>
  <circle cx="51" cy="51" r="6" fill="{accent}"/>
  <text x="70" y="57" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="bold" fill="{accent}" letter-spacing="1.7">GITHUB REPOSITORY</text>
  <text x="39" y="105" font-family="Arial,Helvetica,sans-serif" font-size="29" font-weight="bold" fill="{text}">{short_repo}</text>
  <text x="40" y="130" font-family="Arial,Helvetica,sans-serif" font-size="16" fill="{muted}">by {owner}</text>
  <line x1="39" y1="149" x2="661" y2="149" stroke="{border}"/>
  <text x="40" y="174" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="{muted}">STARS</text>
  <text x="40" y="207" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="bold" fill="{accent}">{stars}</text>
  <text x="170" y="174" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="{muted}">FORKS</text>
  <text x="170" y="207" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="bold" fill="{text}">{forks}</text>
  <text x="291" y="174" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="{muted}">OPEN ISSUES*</text>
  <text x="291" y="207" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="bold" fill="{text}">{issues}</text>
  <text x="479" y="174" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="{muted}">LATEST PUSH</text>
  <text x="479" y="203" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="bold" fill="{text}">{last_push}</text>
  <text x="40" y="230" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="{muted}">* Includes pull requests · Synced {synced}</text>
</svg>
'''

def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)
    count = 0
    for entry in catalog:
        if entry.get("renderer") != "github-repo":
            continue
        repository = entry["repository"]
        print(f"Fetching {repository} from GitHub API...", flush=True)
        data = get_metadata(repository)
        for theme in ("dark", "light"):
            target = ROOT / entry["themes"][theme]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(make_card(repository, data, theme, now), encoding="utf-8")
            print(f"Generated {target.relative_to(ROOT)}", flush=True)
            count += 1
    print(f"Generated {count} dynamic SVG assets.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"Error generating dynamic cards: {exc}", file=sys.stderr)
        sys.exit(1)
