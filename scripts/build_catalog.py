#!/usr/bin/env python3
"""Validate community image components and build the JSON gallery catalog."""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPONENTS = ROOT / "components"
CATEGORIES = {"Animations", "Badges", "Dividers", "Cards", "Dynamic"}
RENDERERS = {"typing", "orbit", "wave", "pulse"}
DYNAMIC_RENDERER = "github-repo"
REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$")
ID_PATTERN = re.compile(r"^[a-z][a-z0-9-]{2,47}$")
AUTHOR_PATTERN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")

def validate(file: Path) -> dict:
    data = json.loads(file.read_text(encoding="utf-8"))
    allowed = {"id","title","description","category","tags","author","format","featured","order","addedAt","themes","renderer","repository"}
    required = allowed - {"renderer", "repository"}
    assert isinstance(data, dict) and required <= data.keys() <= allowed, f"{file}: invalid keys"
    ident = data["id"]
    assert isinstance(ident,str) and ID_PATTERN.fullmatch(ident) and ident == file.parent.name, f"{file}: invalid ID"
    assert isinstance(data["title"],str) and 3 <= len(data["title"]) <= 60
    assert isinstance(data["description"],str) and 10 <= len(data["description"]) <= 220
    assert data["category"] in CATEGORIES
    assert isinstance(data["tags"],list) and 1 <= len(data["tags"]) <= 12
    assert all(isinstance(tag,str) and re.fullmatch(r"[a-z0-9-]{2,24}",tag) for tag in data["tags"])
    assert isinstance(data["author"],str) and AUTHOR_PATTERN.fullmatch(data["author"])
    assert data["format"] in {"svg","gif"} and type(data["featured"]) is bool
    assert type(data["order"]) is int and 0 <= data["order"] <= 10000
    assert isinstance(data["addedAt"],str) and re.fullmatch(r"20[0-9]{2}-[01][0-9]-[0-3][0-9]",data["addedAt"])
    assert isinstance(data["themes"],dict) and set(data["themes"]) == {"dark","light"}
    renderer = data.get("renderer")
    generated = renderer is not None
    dynamic = renderer == DYNAMIC_RENDERER
    if dynamic:
        assert data["format"] == "svg" and data["category"] == "Dynamic"
        assert isinstance(data.get("repository"), str) and REPO_PATTERN.fullmatch(data["repository"]), f"{file}: invalid repository"
        assert ".." not in data["repository"], f"{file}: unsafe repository path"
    else:
        assert "repository" not in data, f"{file}: repository only applies to dynamic cards"
        if generated:
            assert data["format"] == "gif" and renderer in RENDERERS, f"{file}: invalid renderer"
    for theme,path in data["themes"].items():
        expected = f"generated/{ident}/{theme}.svg" if dynamic else (
            f"generated/{ident}/{theme}.gif" if generated else f"components/{ident}/{theme}.{data['format']}"
        )
        assert path == expected, f"{file}: expected {expected}"
        if not generated:
            asset = ROOT / path
            assert asset.is_file() and 0 < asset.stat().st_size <= 2_000_000, f"{file}: missing or oversized asset"
            if data["format"] == "gif":
                with asset.open("rb") as handle:
                    assert handle.read(6) in (b"GIF87a",b"GIF89a"), f"{asset}: invalid GIF"
            else:
                contents = asset.read_text(encoding="utf-8").lower()
                assert "<svg" in contents and "</svg>" in contents
                forbidden = ("<script","onload=","onerror=","onclick=","javascript:","<foreignobject","<iframe","<image","<use","href=","<animate","<set","<style","<filter","url(","<!entity","<!doctype")
                assert not any(s in contents for s in forbidden), f"{asset}: unsafe SVG"
    return data

def main():
    components=[]
    for directory in sorted(COMPONENTS.iterdir()):
        if directory.is_dir():
            manifest=directory/"component.json"
            assert manifest.is_file(), f"{directory}: missing component.json"
            components.append(validate(manifest))
    assert components, "no components"
    ids=[d["id"] for d in components]
    assert len(ids) == len(set(ids)), "duplicate IDs"
    components.sort(key=lambda c: (c["order"],c["title"].lower()))
    dest=COMPONENTS/"catalog.json"
    dest.write_text(json.dumps(components,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"Validated {len(components)} components; wrote {dest.relative_to(ROOT)}")

if __name__=="__main__":
    try:
        main()
    except (AssertionError,OSError,ValueError,TypeError) as error:
        print(f"Validation error: {error}",file=sys.stderr)
        sys.exit(1)
