#!/usr/bin/env python3
"""Generate a clean, seamless Neon Waveform GIF for GitHub README embeds.

The optional title/caption is HTML adjacent to the GIF in README.md, not baked
into the image. This keeps user editing GitHub-compatible and server-free.
"""
from __future__ import annotations
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "components" / "catalog.json"

def rgb(value):
    return tuple(int(value[i:i+2], 16) for i in (1, 3, 5))

def render(theme):
    dark = theme == "dark"
    bg = rgb("#0D1921" if dark else "#EDF5F5")
    panel = rgb("#172831" if dark else "#FFFFFF")
    stroke = rgb("#385549" if dark else "#BBDCC9")
    mint = rgb("#96F5B8" if dark else "#13825A")
    glow = rgb("#508C70" if dark else "#8BC9AC")
    frames = []
    for tick in range(42):
        image = Image.new("RGB", (620, 158), bg)
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((3, 3, 616, 154), radius=17, fill=panel, outline=stroke, width=2)
        for i in range(37):
            x = 25 + i * 15.6
            wave = abs(math.sin(i * .35 + tick * .155) * math.cos(i * .21 - tick * .09))
            height = 7 + wave * (37 + 11 * math.sin(i * .13) ** 2)
            y = 83
            draw.rounded_rectangle((x-2, y-height-3, x+10, y+height*.72+3),radius=5,fill=glow)
            draw.rounded_rectangle((x, y-height, x+8, y+height*.72),radius=4,fill=mint)
        frames.append(image)
    return frames

def main():
    catalog=json.loads(CATALOG.read_text(encoding="utf-8"))
    assert len(catalog)==1 and catalog[0]["id"]=="neon-wave", "Only Neon Waveform may be active"
    item=catalog[0]
    for theme in ("dark","light"):
        target=ROOT/item["themes"][theme]
        target.parent.mkdir(parents=True,exist_ok=True)
        frames=render(theme)
        frames[0].save(target,save_all=True,append_images=frames[1:],
            duration=90,loop=0,optimize=True,disposal=2,format="GIF")
        with Image.open(target) as verify:
            assert verify.n_frames >= 35 and verify.format=="GIF"
        print("Generated",target.relative_to(ROOT),len(frames),"animated frames")

if __name__=="__main__":
    main()
