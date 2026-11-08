#!/usr/bin/env python3
"""Refresh one-click repository language SVG cards from GitHub's language bytes API."""
from __future__ import annotations
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
REPO = "RuslanSharifov/readme-component-hub"
COLORS = ("#78b9ff", "#8a88ff", "#5be0c2", "#ffb879", "#f78ec2", "#e0dc83")

def query():
    url = f"https://api.github.com/repos/{REPO}/languages"
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "readme-component-hub"}
    if os.environ.get("GH_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    with urlopen(Request(url, headers=headers), timeout=15) as response:
        result = json.load(response)
    if not isinstance(result, dict) or not result:
        raise ValueError("No languages returned by GitHub API")
    values = sorted(((name, int(value)) for name, value in result.items() if int(value) > 0), key=lambda pair: -pair[1])
    all_bytes = sum(value for _, value in values)
    shown = values[:5]
    if len(values) > 5:
        shown.append(("Other", sum(value for _, value in values[5:])))
    return [(name, value * 100 / all_bytes, COLORS[i]) for i, (name, value) in enumerate(shown)]

def graphic(mode, light, data):
    ink = "#273455" if light else "#eaf2ff"
    muted = "#536585" if light else "#a5b7d9"
    bg = "#f0f4ff" if light else "#202f58"
    edge = "#b3c2e1" if light else "#6476a8"
    title = {"donut": "Languages · Donut", "row": "Languages · Row", "column": "Languages · Column"}[mode]
    base = [f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400">',
        f'<rect width="720" height="400" fill="{bg}" rx="25"/>',
        f'<rect x="1" y="1" width="718" height="398" rx="24" fill="none" stroke="{edge}"/>',
        f'<text x="36" y="49" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="{ink}">{title}</text>',
        f'<text x="36" y="75" font-family="Arial,sans-serif" font-size="12" letter-spacing="2" fill="{muted}">{escape(REPO)}</text>']
    if mode == "donut":
        import math
        circ = 2 * math.pi * 92
        offset = 0
        base.append(f'<circle cx="224" cy="220" r="92" fill="none" stroke="{edge}" stroke-opacity=".20" stroke-width="35"/>')
        for name, pct, color in data:
            dash = circ * pct / 100
            base.append(f'<circle cx="224" cy="220" r="92" fill="none" stroke="{color}" stroke-width="35" stroke-dasharray="{max(0, dash - 1):.2f} {circ:.2f}" stroke-dashoffset="{-offset:.2f}" transform="rotate(-90 224 220)"/>')
            offset += dash
        base.append(f'<text x="224" y="229" text-anchor="middle" fill="{ink}" font-family="Arial,sans-serif" font-size="29" font-weight="bold">100%</text>')
        for i, (name, pct, color) in enumerate(data):
            y = 138 + i * 42
            base.extend([f'<circle cx="420" cy="{y}" r="7" fill="{color}"/>',
                f'<text x="437" y="{y+6}" fill="{ink}" font-family="Arial,sans-serif" font-size="16">{escape(name[:17])}</text>',
                f'<text x="663" y="{y+6}" text-anchor="end" fill="{ink}" font-family="Arial,sans-serif" font-size="16" font-weight="bold">{pct:.1f}%</text>'])
    elif mode == "row":
        for i, (name, pct, color) in enumerate(data):
            y = 105 + i * 49
            base.extend([f'<text x="40" y="{y}" fill="{ink}" font-family="Arial,sans-serif" font-size="16">{escape(name[:24])}</text>',
                f'<text x="664" y="{y}" text-anchor="end" fill="{ink}" font-family="Arial,sans-serif" font-size="16" font-weight="bold">{pct:.1f}%</text>',
                f'<rect x="40" y="{y+11}" width="624" height="16" rx="8" fill="{edge}" fill-opacity=".22"/>',
                f'<rect x="40" y="{y+11}" width="{624*pct/100:.2f}" height="16" rx="8" fill="{color}"/>'])
    else:
        n = len(data)
        space = 620 / max(n, 1)
        for i, (name, pct, color) in enumerate(data):
            x = 56 + i * space
            h = max(4, pct * 2.65)
            base.extend([f'<rect x="{x:.1f}" y="{327-h:.1f}" width="{space*0.67:.1f}" height="{h:.1f}" rx="8" fill="{color}"/>',
                f'<text x="{x+space*.335:.1f}" y="{318-h:.1f}" text-anchor="middle" fill="{ink}" font-family="Arial,sans-serif" font-size="16" font-weight="bold">{pct:.1f}%</text>',
                f'<text x="{x+space*.335:.1f}" y="351" text-anchor="middle" fill="{ink}" font-family="Arial,sans-serif" font-size="13">{escape(name[:10])}</text>'])
    base.append("</svg>\n")
    return "\n".join(base)

def main():
    try:
        languages = query()
    except (URLError, HTTPError, OSError, ValueError) as error:
        print(f"GitHub languages unavailable; retaining published SVG assets: {error}")
        return
    for mode in ("donut", "row", "column"):
        for theme in ("dark", "light"):
            path = ROOT / "components" / f"repository-languages-{mode}" / f"{theme}.svg"
            path.write_text(graphic(mode, theme == "light", languages), encoding="utf-8")
            print("Refreshed", path.relative_to(ROOT))

if __name__ == "__main__":
    main()
