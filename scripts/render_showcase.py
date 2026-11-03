#!/usr/bin/env python3
"""Build ten reproducible README-safe showcase assets (SVG/GIF).

Dynamic cards use the public GitHub REST API, refreshed by GitHub Actions.
Stars history starts with the first *observed* snapshot: no invented past data.
Only static file assets are emitted; no server, JavaScript in SVG, or token in URLs.
"""
from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "components" / "catalog.json"
HISTORY_FILE = ROOT / "generated" / "data" / "stars-history.json"
RENDERERS = {"github-stars-history","github-ci","github-heatmap","github-languages","github-release","github-progress","identity-card","divider-pack","typing-banner","workflow-gif"}

def api(url):
    headers = {"Accept":"application/vnd.github+json","User-Agent":"readme-component-hub"}
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = "Bearer " + token
    req = Request("https://api.github.com" + url, headers=headers)
    try:
        with urlopen(req,timeout=24) as response:
            return json.load(response)
    except HTTPError as err:
        if err.code == 404:
            return None
        raise RuntimeError(f"GitHub API {url}: HTTP {err.code}") from err
    except URLError as err:
        raise RuntimeError(f"GitHub API network error {url}: {err}") from err

def safe(value, limit=70):
    return escape("".join(x for x in str(value) if x.isprintable())[:limit])

def short(n):
    if n >= 1000000:
        return f"{n/1000000:.1f}m"
    if n >= 10000:
        return f"{n/1000:.1f}k"
    return str(n)

def palette(name):
    return {
        "dark": dict(bg="#101A22",panel="#1B2B34",text="#E5F7EF",muted="#8BA8A4",line="#344D50",accent="#8FF0BC",sub="#2B5144"),
        "light":dict(bg="#F0F5F5",panel="#FFFFFF",text="#1B3939",muted="#587672",line="#C5D8D2",accent="#13815C",sub="#DAF3E5"),
        "neon": dict(bg="#140F28",panel="#211C3B",text="#F0E9FF",muted="#A59DCA",line="#554673",accent="#C2A8FF",sub="#44325E")
    }[name]

def root_svg(name,title,eyebrow,repo=None,w=720,h=280):
    p = palette(name)
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{safe(title)}">',
         f'<rect x="1" y="1" width="{w-2}" height="{h-2}" rx="21" fill="{p["bg"]}" stroke="{p["line"]}" stroke-width="2"/>',
         f'<rect x="17" y="16" width="{w-34}" height="{h-32}" rx="15" fill="{p["panel"]}"/>',
         f'<circle cx="39" cy="42" r="5" fill="{p["accent"]}"/>',
         f'<text x="54" y="47" font-family="Arial,sans-serif" font-size="14" font-weight="bold" letter-spacing="1.6" fill="{p["accent"]}">{safe(eyebrow)}</text>',
         f'<text x="36" y="91" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="{p["text"]}">{safe(title,46)}</text>']
    if repo:
        out.append(f'<text x="38" y="116" font-family="Arial,sans-serif" font-size="13" fill="{p["muted"]}">{safe(repo,77)}</text>')
    return out,p

def txt(x,y,value,size=16,color="#FFF",weight="normal",anchor=None):
    a=f' text-anchor="{anchor}"' if anchor else ""
    return f'<text x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}"{a}>{safe(value)}</text>'

def finish(o,when=None,p=None):
    if when:
        o.append(txt(38,261,"Synced " + when.strftime("%d %b %Y %H:%M UTC"),11,p["muted"]))
    o.append("</svg>\n")
    return "\n".join(o)

def fetch_commits(repo, since, max_pages=5):
    items=[]
    date = quote(since.isoformat().replace("+00:00","Z"))
    for page in range(1,max_pages+1):
        part=api(f"/repos/{repo}/commits?since={date}&per_page=100&page={page}")
        if not isinstance(part,list):
            break
        items.extend(part)
        if len(part)<100:
            break
    return items, len(items)>=100*max_pages

def fetch_issues(repo):
    result=[]
    capped=False
    for page in range(1,4):
        part=api(f"/repos/{repo}/issues?state=all&per_page=100&page={page}")
        if not isinstance(part,list):
            break
        result.extend(x for x in part if "pull_request" not in x)
        if len(part)<100:
            break
        if page==3:
            capped=True
    return result,capped

def draw_repo_card(entry, theme, now, data):
    repo=entry["repository"]
    kind=entry["renderer"]
    labels={"github-stars-history":("Star Growth","GITHUB / GROWTH"),
            "github-ci":("Workflow Health","GITHUB / CI STATUS"),
            "github-heatmap":("Commit Activity","GITHUB / ACTIVITY"),
            "github-languages":("Languages","GITHUB / STACK"),
            "github-release":("Latest Release","GITHUB / RELEASES"),
            "github-progress":("Issue Progress","GITHUB / TRACKER")}
    title,eyebrow=labels[kind]
    o,p=root_svg(theme,title,eyebrow,repo)
    if kind=="github-stars-history":
        stars=int(data["repo"]["stargazers_count"])
        hist=data["history"][repo]
        o.extend([txt(40,153,short(stars),40,p["accent"],"bold"),txt(148,149,"total stars",16,p["muted"])])
        known=sorted([x for x in hist if isinstance(x.get("stars"),int) and "date" in x],key=lambda x:x["date"])[-30:]
        if len(known)<2:
            o.append(txt(41,204,"History starts with our first recorded snapshot.",15,p["muted"]))
            o.append(txt(41,230,"No historical growth is estimated.",13,p["muted"]))
        else:
            ys=[x["stars"] for x in known]
            low,high=min(ys),max(ys)
            spread=max(high-low,1)
            pts=[(300+(i/(len(known)-1))*370,228-((v-low)/spread)*86) for i,v in enumerate(ys)]
            coords=" ".join(f"{x:.1f},{y:.1f}" for x,y in pts)
            o.append(f'<polyline points="{coords}" fill="none" stroke="{p["accent"]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
            x,y=pts[-1]
            o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{p["accent"]}"/>')
            o.append(txt(303,246,f"Observed {known[0]['date']} to {known[-1]['date']}",12,p["muted"]))
    elif kind=="github-ci":
        runs=data["runs"] or []
        if not runs:
            o.append(txt(40,179,"No accessible workflow runs",22,p["muted"],"bold"))
        else:
            latest=runs[0]
            state=latest.get("conclusion") or latest.get("status","unknown")
            good=state=="success"
            o.append(txt(40,165,state.upper().replace("_"," "),29,p["accent"] if good else p["text"],"bold"))
            o.append(txt(40,191,safe(latest.get("name","Workflow"),50),14,p["muted"]))
            for i,run in enumerate(runs[:15]):
                status=run.get("conclusion") or run.get("status")
                fill=p["accent"] if status=="success" else ("#E9B66A" if status in ("in_progress","queued","waiting") else "#E68485")
                o.append(f'<rect x="{40+i*43}" y="213" width="29" height="20" rx="5" fill="{fill}"/>')
            o.append(txt(40,247,f"{len(runs[:15])} most recent runs • latest first",12,p["muted"]))
    elif kind=="github-heatmap":
        commits=data["commits"]
        counts=Counter()
        for item in commits:
            stamp=(item.get("commit",{}).get("author") or {}).get("date")
            if stamp:
                counts[stamp[:10]]+=1
        today=now.date()
        # 84 real UTC calendar days, no simulated activity.
        begin=today-timedelta(days=83)
        mx=max(counts.values(),default=0)
        for i in range(84):
            day=begin+timedelta(days=i)
            n=counts.get(day.isoformat(),0)
            intensity=0 if n==0 else max(1,math.ceil(n/max(mx,1)*4))
            fill=([p["sub"],"#265B4D","#308F64","#60C58E",p["accent"]] if theme!="neon" else [p["sub"],"#54417B","#7961A9","#A78BE3",p["accent"]])[intensity]
            x=42+(i//7)*51
            y=144+(i%7)*14
            o.append(f'<rect x="{x}" y="{y}" width="35" height="10" rx="3" fill="{fill}"/>')
        label="Latest 84 days • "+str(len(commits))+" commits fetched"
        if data["commits_capped"]:
            label+=" (API sample capped)"
        o.append(txt(40,249,label,12,p["muted"]))
    elif kind=="github-languages":
        langs=data["languages"] or {}
        total=sum(langs.values())
        if total<=0:
            o.append(txt(40,181,"No language breakdown available",20,p["muted"]))
        else:
            names=sorted(langs,key=langs.get,reverse=True)[:4]
            x=40
            for lang in names:
                width=round(langs[lang]/total*620)
                color=["#7DC8D9","#B59DF0","#E8C977","#83D7AA"][names.index(lang)]
                o.append(f'<rect x="{x}" y="148" width="{max(0,width-2)}" height="19" rx="3" fill="{color}"/>')
                x+=width
            for i,lang in enumerate(names):
                x=40+(i%2)*315; y=198+(i//2)*32
                o.append(f'<circle cx="{x+6}" cy="{y-5}" r="6" fill="{["#7DC8D9","#B59DF0","#E8C977","#83D7AA"][i]}"/>')
                o.append(txt(x+20,y,f"{lang}: {langs[lang]/total*100:.1f}%",16,p["text"]))
    elif kind=="github-release":
        release=data["release"]
        if not release:
            o.append(txt(40,178,"NO PUBLISHED RELEASE",25,p["accent"],"bold"))
            o.append(txt(40,213,"No release found for this repository.",15,p["muted"]))
        else:
            tag=str(release.get("tag_name") or "Untitled")[:28]
            o.append(txt(40,177,tag,35,p["accent"],"bold"))
            o.append(txt(40,210,(release.get("name") or "Published release")[:49],17,p["text"]))
            o.append(txt(40,238,"Published "+str(release.get("published_at") or "Unknown")[:10],13,p["muted"]))
    elif kind=="github-progress":
        issues=data["issues"]
        closed=sum(1 for item in issues if item.get("state")=="closed")
        total=len(issues)
        if total<=0:
            o.append(txt(40,180,"NO TRACKED ISSUES",27,p["accent"],"bold"))
            o.append(txt(40,213,"Issue-based progress needs tracked issues.",15,p["muted"]))
        else:
            percent=round(closed/total*100)
            o.append(txt(40,183,f"{percent}%",49,p["accent"],"bold"))
            o.append(txt(200,170,f"{closed}/{total} issues closed",22,p["text"]))
            o.append(f'<rect x="201" y="191" width="435" height="20" rx="10" fill="{p["sub"]}"/>')
            if closed:
                o.append(f'<rect x="201" y="191" width="{max(10,435*closed/total):.1f}" height="20" rx="10" fill="{p["accent"]}"/>')
            o.append(txt(203,238,"Sample limited to 300 issues" if data["issues_capped"] else "Based on GitHub issues (PRs excluded)",13,p["muted"]))
    return finish(o,now,p)

def static_svg(kind,theme):
    p=palette(theme)
    if kind=="identity-card":
        o,p=root_svg(theme,"Creative Developer","DEVELOPER / PROFILE",w=720,h=280)
        o.append(f'<rect x="40" y="127" width="85" height="85" rx="20" fill="{p["sub"]}" stroke="{p["line"]}"/>')
        o.append(txt(82,181,"</>",24,p["accent"],"bold","middle"))
        o.append(txt(148,162,"Full Stack Engineer",23,p["text"],"bold"))
        o.append(txt(148,190,"Crafting thoughtful software.",16,p["muted"]))
        for i,name in enumerate(("PYTHON",".NET","TYPESCRIPT")):
            x=45+i*185
            o.append(f'<rect x="{x}" y="226" width="160" height="31" rx="9" fill="{p["sub"]}"/>')
            o.append(txt(x+80,247,name,12,p["accent"],"bold","middle"))
        return finish(o)
    o,p=root_svg(theme,"Precision Dividers","DESIGN / DIVIDER PACK",w=720,h=280)
    o.append(f'<path d="M44 144H300 M420 144H676" stroke="{p["muted"]}" stroke-width="2"/>')
    o.append(f'<path d="M360 123 381 144 360 165 339 144Z" stroke="{p["accent"]}" stroke-width="2" fill="none"/>')
    o.append(f'<circle cx="360" cy="144" r="5" fill="{p["accent"]}"/>')
    for i in range(24):
        x=44+i*27
        o.append(f'<circle cx="{x}" cy="191" r="{5 if i in (11,12) else 2}" fill="{p["accent"] if i in (11,12) else p["muted"]}"/>')
    o.append(f'<path d="M44 239H250l22-18 19 34 25-33 22 17H676" fill="none" stroke="{p["accent"]}" stroke-width="2"/>')
    return finish(o)

def font(size=21,bold=False):
    filename="/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
    return ImageFont.truetype(filename,size) if Path(filename).is_file() else ImageFont.load_default()

def rgb(hexcode):
    return tuple(int(hexcode[i:i+2],16) for i in (1,3,5))

def animated_gif(kind,theme,target):
    p=palette(theme)
    frames=[]
    for tick in range(44 if kind=="typing-banner" else 30):
        im=Image.new("RGB",(720,225),rgb(p["bg"]))
        d=ImageDraw.Draw(im)
        d.rounded_rectangle((3,3,716,221),radius=18,fill=rgb(p["panel"]),outline=rgb(p["line"]),width=2)
        d.text((28,22),"~/terminal • readme.hub" if kind=="typing-banner" else "WORKFLOW / CODE TO DEPLOY",font=font(17),fill=rgb(p["accent"]))
        if kind=="typing-banner":
            words="npm run build"
            length=max(0,min(len(words),tick-5))
            d.text((33,91),"$ "+words[:length],font=font(30,True),fill=rgb(p["text"]))
            if tick%10 < 6:
                xx=33+d.textbbox((0,0),"$ "+words[:length],font=font(30,True))[2]+6
                d.rectangle((xx,89,xx+12,123),fill=rgb(p["accent"]))
            if tick>21:
                d.text((33,158),"✓  Build successful. Ready to ship.",font=font(17),fill=rgb(p["accent"]))
        else:
            step=(tick//10)%3
            for i,label in enumerate(("CODE","TEST","DEPLOY")):
                x=24+i*238
                active=(i<=step)
                fill=rgb(p["sub"] if active else p["bg"])
                d.rounded_rectangle((x,92,x+204,161),radius=12,fill=fill,outline=rgb(p["accent"] if active else p["line"]),width=3)
                d.text((x+21,112),label,font=font(22,True),fill=rgb(p["accent"] if active else p["muted"]))
                d.text((x+22,142),"✓ done" if i<step else ("running..." if i==step else "queued"),font=font(12),fill=rgb(p["text"] if active else p["muted"]))
                if i<2:
                    d.text((x+211,115),"›",font=font(28,True),fill=rgb(p["accent"]))
        frames.append(im)
    target.parent.mkdir(parents=True,exist_ok=True)
    frames[0].save(target,format="GIF",save_all=True,append_images=frames[1:],duration=90,loop=0,optimize=True,disposal=2)
    with Image.open(target) as check:
        assert check.n_frames>1,f"Animation is not animated: {target}"

def build(now=None,fetcher=api):
    now=now or datetime.now(timezone.utc)
    entries=json.loads(INDEX.read_text(encoding="utf-8"))
    chosen=[entry for entry in entries if entry.get("renderer") in RENDERERS]
    repositories=sorted({entry["repository"] for entry in chosen if "repository" in entry})
    history=json.loads(HISTORY_FILE.read_text(encoding="utf-8")) if HISTORY_FILE.is_file() else {}
    cache={}
    for repo in repositories:
        meta=fetcher("/repos/"+repo)
        if not isinstance(meta,dict):
            raise RuntimeError("Unknown repository: "+repo)
        old=history.get(repo,[])
        today=now.date().isoformat()
        old=[item for item in old if item.get("date")!=today]
        old.append({"date":today,"stars":int(meta["stargazers_count"])})
        history[repo]=sorted(old,key=lambda d:d["date"])[-365:]
        cache[repo]={"repo":meta,"history":history}
    for entry in chosen:
        kind=entry["renderer"]
        repo=entry.get("repository")
        data=cache.get(repo)
        if data is not None:
            if kind=="github-ci":
                obj=fetcher("/repos/"+repo+"/actions/runs?per_page=15")
                data["runs"]=(obj or {}).get("workflow_runs",[])
            elif kind=="github-heatmap":
                data["commits"],data["commits_capped"]=fetch_commits(repo,now-timedelta(days=84))
            elif kind=="github-languages":
                data["languages"]=fetcher("/repos/"+repo+"/languages") or {}
            elif kind=="github-release":
                data["release"]=fetcher("/repos/"+repo+"/releases/latest")
            elif kind=="github-progress":
                data["issues"],data["issues_capped"]=fetch_issues(repo)
        for theme,rel in entry["themes"].items():
            target=ROOT/rel
            target.parent.mkdir(parents=True,exist_ok=True)
            if entry["format"]=="gif":
                animated_gif(kind,theme,target)
            else:
                svg=draw_repo_card(entry,theme,now,data) if data else static_svg(kind,theme)
                target.write_text(svg,encoding="utf-8")
            print("Rendered",target.relative_to(ROOT),flush=True)
    HISTORY_FILE.parent.mkdir(parents=True,exist_ok=True)
    HISTORY_FILE.write_text(json.dumps(history,indent=2)+"\n",encoding="utf-8")
    print(f"Generated {len(chosen)} showcase components across their theme variants.")

if __name__=="__main__":
    try:
        build()
    except (OSError,RuntimeError,ValueError,KeyError,TypeError) as error:
        print("Showcase build failed:",error,file=sys.stderr)
        sys.exit(1)
