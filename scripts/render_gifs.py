#!/usr/bin/env python3
"""Create true animated GIF images for GitHub README files (no client-side JS needed)."""
from __future__ import annotations
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent.parent
CATALOG=ROOT/"components"/"catalog.json"

def font(size=20,bold=False):
    name="/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
    return ImageFont.truetype(name,size) if Path(name).is_file() else ImageFont.load_default()

def to_rgb(code):
    return tuple(int(code[i:i+2],16) for i in (1,3,5))

def colors(theme):
    return {key:to_rgb(value) for key,value in {
        "bg":"#101A23" if theme=="dark" else "#ECF3F5",
        "panel":"#1D2C34" if theme=="dark" else "#FFFFFF",
        "ink":"#E1F1EE" if theme=="dark" else "#21373C",
        "mint":"#91F1BB" if theme=="dark" else "#16865C",
        "muted":"#7E9999" if theme=="dark" else "#849CA1",
    }.items()}

def panel(w,h,theme):
    c=colors(theme)
    image=Image.new("RGB",(w,h),c["bg"])
    d=ImageDraw.Draw(image)
    d.rounded_rectangle((4,4,w-5,h-5),radius=16,fill=c["panel"])
    return image,d,c

def typing(theme):
    frames=[]
    title="Hello, world! I build things."
    for tick in range(53):
        im,d,c=panel(640,116,theme)
        d.text((25,16),"~/introduction",fill=c["muted"],font=font(15))
        shown="> "+title[:max(0,min(len(title),tick-2))]
        typeface=font(23,True)
        d.text((25,54),shown,fill=c["mint"],font=typeface)
        x=25+d.textbbox((0,0),shown,font=typeface)[2]+4
        if tick%10<6:
            d.rectangle((x,56,x+9,80),fill=c["ink"])
        frames.append(im)
    return frames,87

def orbit(theme):
    frames=[]
    for tick in range(36):
        im,d,c=panel(550,116,theme)
        d.text((25,43),"Loading creativity",fill=c["ink"],font=font(21,True))
        for i in range(4):
            a=2*math.pi*(tick/36+i/4)
            x,y=465+32*math.cos(a),58+29*math.sin(a)
            r=7 if i==0 else 5
            d.ellipse((x-r,y-r,x+r,y+r),fill=c["mint"] if i==0 else c["muted"])
        frames.append(im)
    return frames,74

def wave(theme):
    frames=[]
    for tick in range(36):
        im,d,c=panel(600,140,theme)
        d.text((25,18),"the rhythm of building",fill=c["muted"],font=font(16))
        for i in range(34):
            height=10+33*abs(math.sin(i*.37+tick*.19)*math.cos(i*.16-tick*.1))
            x=28+i*16
            d.rounded_rectangle((x,101-height,x+8,101+height*.28),radius=4,fill=c["mint"])
        frames.append(im)
    return frames,78

def pulse(theme):
    frames=[]
    for tick in range(36):
        im,d,c=panel(560,108,theme)
        d.text((82,42),"All systems operational",fill=c["ink"],font=font(21,True))
        r=8+7*abs(math.sin(tick*math.pi/18))
        d.ellipse((44-r,55-r,44+r,55+r),outline=c["mint"],width=2)
        d.ellipse((39,50,49,60),fill=c["mint"])
        frames.append(im)
    return frames,77

RENDERERS={"typing":typing,"orbit":orbit,"wave":wave,"pulse":pulse}

def main():
    entries=json.loads(CATALOG.read_text(encoding="utf-8"))
    num=0
    for entry in entries:
        if not entry.get("renderer"):
            continue
        for theme in ("dark","light"):
            frames,delay=RENDERERS[entry["renderer"]](theme)
            target=ROOT/entry["themes"][theme]
            target.parent.mkdir(parents=True,exist_ok=True)
            frames[0].save(target,format="GIF",save_all=True,append_images=frames[1:],duration=delay,loop=0,optimize=True,disposal=2)
            with Image.open(target) as verify:
                assert verify.n_frames > 1, f"{target} not animated"
            print(f"{target.relative_to(ROOT)} — {len(frames)} frames")
            num+=1
    print(f"Generated {num} animated GIFs.")

if __name__=="__main__":
    main()
