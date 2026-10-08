from pathlib import Path
import csv,hashlib,json,math,shutil,subprocess
import numpy as np
from PIL import Image
source_dir=Path.home()/'.codex/tmp/rasterix-integration-20260909/fifo-study-normal-product-40s-20261008'
source=list(source_dir.glob('*.mp4'));assert len(source)==1;source=source[0]
out=Path.cwd()/'experiment-fifo-20261008/results/video';out.mkdir(exist_ok=False)
video=out/'breakout-latest-30s.mp4'
ffmpeg=shutil.which('ffmpeg');ffprobe=shutil.which('ffprobe');assert ffmpeg and ffprobe
subprocess.run([ffmpeg,'-hide_banner','-v','error','-nostdin','-i',str(source),'-t','30','-map','0:v:0','-c','copy','-an','-movflags','+faststart',str(video)],check=True)
probe=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_format','-show_streams','-of','json',str(video)],text=True))
v=next(s for s in probe['streams'] if s['codec_type']=='video');duration=float(probe['format']['duration'])
assert (v['width'],v['height'])==(1920,1080) and 29.9<=duration<=30.3,(v,duration)
rows=[];positions=[];max_still=0;still=0;last=None;detected=0;bad_border=0
with (out/'decode.log').open('wb') as err:
    proc=subprocess.Popen([ffmpeg,'-hide_banner','-v','error','-xerror','-nostdin','-i',str(video),'-map','0:v:0','-vf','crop=1440:1080:240:0,scale=640:480:flags=neighbor','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE,stderr=err)
    index=0;size=640*480*3
    while True:
        raw=proc.stdout.read(size)
        if not raw:break
        assert len(raw)==size
        im=np.frombuffer(raw,np.uint8).reshape(480,640,3)
        wall=im[80:420,8:25]
        blue=(wall[:,:,2]>120)&(wall[:,:,0]<70)&(wall[:,:,1]<70)
        border=float(np.mean(np.any(blue,axis=1)));bad_border+=border<0.99
        roi=im[40:435,8:632]
        ys,xs=np.nonzero(np.min(roi,axis=2)>210)
        ball=None
        if len(xs)>=20:
            x0,x1=int(xs.min()),int(xs.max());y0,y1=int(ys.min()),int(ys.max())
            width=x1-x0+1;height=y1-y0+1
            if 4<=width<=16 and 4<=height<=16 and len(xs)<=256:
                ball=((x0+x1)/2+8,(y0+y1)/2+40)
        moved=None
        if ball is not None:
            detected+=1;positions.append(ball)
            if last is not None:
                moved=math.hypot(ball[0]-last[0],ball[1]-last[1])>=0.9
                still=0 if moved else still+1;max_still=max(max_still,still)
            else:still=0
            last=ball
        else:last=None;still=0
        rows.append({'frame':index,'left_wall_fraction':border,'ball_x':ball[0] if ball else '', 'ball_y':ball[1] if ball else '', 'ball_moved':moved if moved is not None else ''});index+=1
    code=proc.wait()
assert code==0,'Video decode failed'
assert index>=1750 and bad_border==0,(index,bad_border)
assert detected/index>0.9,(detected,index)
moves=[r['ball_moved'] for r in rows if isinstance(r['ball_moved'],bool)]
assert sum(moves)/len(moves)>0.85,(sum(moves),len(moves))
assert max_still<=20,max_still
frames=[]
for number,seconds in enumerate((1,8,15,22,29),1):
    target=out/f'verified-frame-{number:02d}.png'
    subprocess.run([ffmpeg,'-hide_banner','-v','error','-nostdin','-ss',str(seconds),'-i',str(video),'-frames:v','1',str(target)],check=True)
    im=np.asarray(Image.open(target).convert('RGB'))
    border=np.concatenate((im[:,:230].reshape(-1,3),im[:,1690:].reshape(-1,3)))
    black=float(np.mean(np.max(border,axis=1)<=16));assert black>0.999,black
    frames.append({'file':target.name,'seconds':seconds,'black_side_fraction':black,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
record=json.loads((source_dir/'recording.json').read_text())
assert record['cleanup_errors']==[] and record['previous_directory']==record['restored_directory']['recordDirectory']
for name,state in record['previous_mutes'].items():assert record['restored_mutes'][name]['inputMuted']==state
with (out/'motion.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
result={'passed':True,'video':str(video.resolve()),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'source_video':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'duration_seconds':duration,'video_stream':v,'decoded_frames':index,'decode_exit':code,'frames_with_game_border':index-bad_border,'ball_detected_frames':detected,'eligible_motion_pairs':len(moves),'moving_pairs':sum(moves),'motion_threshold_pixels':0.9,'longest_consecutive_pairs_below_motion_threshold':max_still,'longest_run_frames_without_motion_above_threshold':max_still+1,'frames':frames,'recording_cleanup_verified':True,'scope':'Every encoded video frame decoded and checked for the playfield border; white-ball bounding-box motion tracked in the logical 640x480 crop. Full-resolution sampled images verify 4:3 pillarboxing. Encoding rate is not a game-FPS measurement.','selection':'First 30 seconds of a 40-second recording; the source recording includes the intentional end of the 75-second game run near its end. Original recording and UART log retained.','bitstream_sha256':'16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf','input':'Built-in deterministic demo mode; no physical controller input.'}
(out/'validation.json').write_text(json.dumps(result,indent=2,ensure_ascii=True)+'\n',encoding='utf-8')
print(json.dumps({k:result[k] for k in ('passed','video','duration_seconds','decoded_frames','frames_with_game_border','ball_detected_frames','moving_pairs','eligible_motion_pairs','longest_consecutive_pairs_below_motion_threshold')},ensure_ascii=True),flush=True)
