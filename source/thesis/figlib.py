from pathlib import Path
from html import escape
import json, copy

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'figs'; OUT.mkdir(exist_ok=True)
# Published Fig. 23.2 / Tables 23.2 and 23.5, sampled from the retained book.
INK='#231F20'; BLUE='#1673C3'; LIGHT='#E5EBF8'; MID='#CCD9F1'; BLOCK='#77A3DC'
WHITE='#FFFFFF'; GREY='#D8D8D8'
FIGS={}

class Fig:
    def __init__(self,key,w=1200,h=570): self.key=key; self.w=w; self.h=h; self.items=[]
    def text(self,x,y,w,h,text,size=28,color=INK,bold=False,align='center'):
        self.items.append(dict(kind='text',x=x,y=y,w=w,h=h,text=text,size=size,color=color,bold=bold,align=align))
    def box(self,x,y,w,h,text='',fill=WHITE,stroke=INK,size=28,bold=False):
        self.items.append(dict(kind='box',x=x,y=y,w=w,h=h,fill=fill,stroke=stroke))
        if text:self.text(x+9,y+6,w-18,h-12,text,size,INK,bold)
    def line(self,pts,color=INK,arrow=True,dash=False):
        self.items.append(dict(kind='line',pts=pts,color=color,arrow=arrow,dash=dash))
    def poly(self,pts,fill=WHITE,stroke=INK):
        self.items.append(dict(kind='poly',pts=pts,fill=fill,stroke=stroke))
    def dot(self,x,y,r=5):
        self.items.append(dict(kind='ellipse',x=x-r,y=y-r,w=2*r,h=2*r,fill=INK,stroke=INK))
    def save(self):
        FIGS[self.key]=dict(width=self.w,height=self.h,items=self.items)
        svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}"><rect width="100%" height="100%" fill="white"/>']
        for a in self.items:
            k=a['kind']
            if k=='box':svg.append(f'<rect x="{a["x"]}" y="{a["y"]}" width="{a["w"]}" height="{a["h"]}" fill="{a["fill"]}" stroke="{a["stroke"]}" stroke-width="2"/>')
            if k=='ellipse':svg.append(f'<ellipse cx="{a["x"]+a["w"]/2}" cy="{a["y"]+a["h"]/2}" rx="{a["w"]/2}" ry="{a["h"]/2}" fill="{a["fill"]}" stroke="{a["stroke"]}" stroke-width="2"/>')
            if k=='poly':svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in a['pts'])+f'" fill="{a["fill"]}" stroke="{a["stroke"]}" stroke-width="2"/>')
            if k=='line':
                pts=a['pts']; ds=' stroke-dasharray="10 7"' if a['dash'] else ''
                svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in pts)+f'" fill="none" stroke="{a["color"]}" stroke-width="2"{ds}/>')
                if a['arrow']:
                    (x0,y0),(x,y)=pts[-2:];dx=x-x0;dy=y-y0;dist=(dx*dx+dy*dy)**.5;dx/=dist;dy/=dist
                    pp=[(x,y),(x-12*dx-5*dy,y-12*dy+5*dx),(x-12*dx+5*dy,y-12*dy-5*dx)]
                    svg.append('<polygon points="'+' '.join(f'{xx},{yy}' for xx,yy in pp)+f'" fill="{a["color"]}"/>')
            if k=='text':
                lines=a['text'].split('\n'); sz=a['size']; lh=sz*1.3
                yy=a['y']+(a['h']-lh*len(lines))/2+sz
                anchor='middle' if a['align']=='center' else ('end' if a['align']=='right' else 'start')
                xx=a['x']+a['w']/2 if anchor=='middle' else (a['x']+a['w'] if anchor=='end' else a['x'])
                for ln in lines:
                    svg.append(f'<text x="{xx}" y="{yy}" text-anchor="{anchor}" font-family="Arial,Noto Sans JP,Meiryo,sans-serif" font-size="{sz}" font-weight="{700 if a["bold"] else 400}" fill="{a["color"]}">{escape(ln)}</text>')
                    yy+=lh
        (OUT/(self.key+'.svg')).write_text(''.join(svg)+'</svg>',encoding='utf-8')

