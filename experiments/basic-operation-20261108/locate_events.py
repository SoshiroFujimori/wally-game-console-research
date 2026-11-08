"""Locate visible game events for subsequent image review; not a physics oracle."""
import argparse,csv,hashlib,json,subprocess
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('video',type=Path);p.add_argument('output',type=Path);p.add_argument('--filter',default='crop=1440:1080:240:0,scale=640:480:flags=neighbor,fps=30');a=p.parse_args()
a.output.mkdir(exist_ok=False)
proc=subprocess.Popen(['ffmpeg','-v','error','-nostdin','-i',str(a.video),'-vf',a.filter,'-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
rows=[];size=640*480*3
while True:
    raw=proc.stdout.read(size)
    if not raw:break
    assert len(raw)==size
    im=np.frombuffer(raw,np.uint8).reshape(480,640,3)
    yy,xx=np.nonzero(np.min(im[42:438,20:620],axis=2)>205)
    ball=None
    if 20<=len(xx)<=300 and 4<=xx.max()-xx.min()+1<=18 and 4<=yy.max()-yy.min()+1<=18:
        ball=(float((xx.min()+xx.max())/2+20),float((yy.min()+yy.max())/2+42))
    bits=[]
    for i in range(40):
        x=44+(i%8)*70;y=76+(i//8)*26
        tile=im[y+5:y+13,x+20:x+42]
        bits.append(int(np.mean(np.max(tile,axis=2)>100)>.9))
    rows.append({'frame_30hz':len(rows),'video_seconds':len(rows)/30,'ball_x':ball[0] if ball else None,'ball_y':ball[1] if ball else None,'bricks':sum(bits),'brick_mask':''.join(map(str,bits))})
assert proc.wait()==0
events=[]
for i in range(2,len(rows)-2):
    prev,now,nxt=rows[i-2],rows[i],rows[i+2]
    if all(r['ball_x'] is not None for r in (prev,now,nxt)):
        dx1=now['ball_x']-prev['ball_x'];dx2=nxt['ball_x']-now['ball_x'];dy1=now['ball_y']-prev['ball_y'];dy2=nxt['ball_y']-now['ball_y']
        kind=None
        if dx1*dx2<0 and (now['ball_x']<32 or now['ball_x']>608):kind='side-wall'
        elif dy1<0 and dy2>0 and now['ball_y']<64:kind='top-wall'
        elif dy1>0 and dy2<0 and now['ball_y']>417:kind='paddle'
        if kind and not any(e['kind']==kind and abs(e['video_seconds']-now['video_seconds'])<.3 for e in events):events.append({'kind':kind,**now})
    if prev['bricks']>now['bricks']==nxt['bricks'] and not any(e['kind']=='brick-removal' and abs(e['video_seconds']-now['video_seconds'])<.3 for e in events):events.append({'kind':'brick-removal',**now})
with (a.output/'motion.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
(a.output/'event-candidates.json').write_text(json.dumps({'video_sha256':hashlib.sha256(a.video.read_bytes()).hexdigest(),'filter':a.filter,'decoded_frames':len(rows),'ball_detected_frames':sum(r['ball_x'] is not None for r in rows),'events':events},indent=2)+'\n')
print(json.dumps({'frames':len(rows),'detected':sum(r['ball_x'] is not None for r in rows),'events':events[:15]}))
