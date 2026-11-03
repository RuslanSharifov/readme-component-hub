#!/usr/bin/env python3
"""Render GitHub API backed README component SVGs for the calling repository."""
from __future__ import annotations
import argparse
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from render_dynamic import make_card
from render_showcase import api, draw_repo_card, fetch_commits, fetch_issues

ROOT = Path(__file__).resolve().parent.parent
BUILTIN = ("repository-stats","chrome-ui-gallery-stats","star-growth-chart","ci-status-card",
    "contribution-heatmap","language-analytics","latest-release-card","project-progress-tracker")
THEMES = ("dark","light","neon")
SLUG = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$")

def write(repo, root):
    if not SLUG.fullmatch(repo) or ".." in repo:
        raise ValueError("Invalid repository name")
    meta=api("/repos/"+repo)
    if not isinstance(meta,dict):
        raise ValueError("Repository not publicly accessible: "+repo)
    root.mkdir(parents=True,exist_ok=True)
    now=datetime.now(timezone.utc)
    history_path=root/"data"/"stars-history.json"
    history=json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else {}
    old=[entry for entry in history.get(repo,[]) if entry.get("date")!=now.date().isoformat()]
    old.append({"date":now.date().isoformat(),"stars":int(meta.get("stargazers_count",0))})
    history[repo]=sorted(old,key=lambda x:x["date"])[-365:]
    data={"repo":meta,"history":history}
    count=0
    for id in BUILTIN:
        entry=json.loads((ROOT/"components"/id/"component.json").read_text(encoding="utf-8"))
        kind=entry.get("renderer")
        if kind=="github-ci":
            result=api("/repos/"+repo+"/actions/runs?per_page=15")
            data["runs"]=(result or {}).get("workflow_runs",[])
        elif kind=="github-heatmap":
            data["commits"],data["commits_capped"]=fetch_commits(repo,now-timedelta(days=84))
        elif kind=="github-languages":
            data["languages"]=api("/repos/"+repo+"/languages") or {}
        elif kind=="github-release":
            data["release"]=api("/repos/"+repo+"/releases/latest")
        elif kind=="github-progress":
            data["issues"],data["issues_capped"]=fetch_issues(repo)
        for theme in THEMES:
            svg=make_card(repo,meta,theme,now) if kind=="github-repo" else \
                draw_repo_card({"renderer":kind,"repository":repo},theme,now,data)
            path=root/id/(theme+".svg")
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(svg,encoding="utf-8")
            print("Generated",path.as_posix(),flush=True)
            count+=1
    history_path.parent.mkdir(parents=True,exist_ok=True)
    history_path.write_text(json.dumps(history,indent=2)+"\n",encoding="utf-8")
    return count

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",required=True)
    p.add_argument("--output",required=True)
    args=p.parse_args()
    out=Path(args.output).resolve()
    if not out.is_relative_to(Path.cwd().resolve()):
        raise ValueError("Output must be within checked out repository")
    print("Updated",write(args.repo,out),"repository-specific SVG cards.")

if __name__=="__main__":
    try: main()
    except (OSError,RuntimeError,ValueError,KeyError,TypeError,json.JSONDecodeError) as err:
        print("Dynamic card generation failed:",err,file=sys.stderr)
        sys.exit(1)
