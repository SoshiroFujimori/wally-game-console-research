"""Check captured frames for the game's border and fixed HUD labels.

This detects lost/blank acquisition and missing labels; it is not a pixel oracle
or a physics test. The game image is centered in a 1920x1080 OBS recording.
"""
import argparse, csv, hashlib, json, subprocess
from fractions import Fraction
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument('video',type=Path);p.add_argument('output',type=Path)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False)
metadata=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_streams','-show_frames','-show_entries','stream=width,height,avg_frame_rate,nb_frames:frame=best_effort_timestamp_time','-of','json',str(a.video)]))
probe=metadata['streams'][0]
timestamps=[float(f['best_effort_timestamp_time']) for f in metadata['frames']]
assert (probe['width'],probe['height'])==(1920,1080)
rate=float(Fraction(probe['avg_frame_rate']))
assert abs(rate-60)<.001
proc=subprocess.Popen(['ffmpeg','-v','error','-nostdin','-i',str(a.video),'-vf','crop=1440:1080:240:0,scale=640:480:flags=neighbor','-an','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
size=640*480*3;rows=[]
while True:
    data=proc.stdout.read(size)
    if not data:break
    assert len(data)==size
    im=np.frombuffer(data,np.uint8).reshape(480,640,3)
    blue=(im[:,:,2]>110)&(im[:,:,0]<90)&(im[:,:,1]<90)
    white=np.min(im,axis=2)>180
    left=float(blue[65:420,13:16].mean());right=float(blue[65:420,625:628].mean())
    score=int(white[16:31,24:83].sum());lives=int(white[16:31,440:499].sum())
    valid=left>.8 and right>.8 and score>70 and lives>70
    rows.append({'frame':len(rows),'seconds':timestamps[len(rows)],'left_wall':left,'right_wall':right,'score_white':score,'lives_white':lives,'visible_game_and_labels':int(valid)})
assert proc.wait()==0 and len(rows)==len(timestamps)
first=next((i for i in range(len(rows)-14) if all(r['visible_game_and_labels'] for r in rows[i:i+15])),None)
bad=[] if first is None else [r['frame'] for r in rows[first:] if not r['visible_game_and_labels']]
result={'video_sha256':hashlib.sha256(a.video.read_bytes()).hexdigest(),'decoded_frames':len(rows),'container_reported_frames':int(probe['nb_frames']),'recording_rate_hz':rate,'first_complete_game_seconds':None if first is None else timestamps[first],'invalid_frames_after_first_complete':bad,'frames_after_first_complete':0 if first is None else len(rows)-first,'passed_visible_frame_check':first is not None and timestamps[first]<=5 and not bad,'scope':__doc__}
with (a.output/'frame-observations.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
(a.output/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
