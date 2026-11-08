"""Extract reviewed event frames from the immutable E6 recording."""
import argparse, hashlib, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('video',type=Path)
p.add_argument('output',type=Path)
a=p.parse_args()
assert hashlib.sha256(a.video.read_bytes()).hexdigest()=='40a2891cecb7f7b56fa93cbbae3ccaa1c2c9f9282eed7b247a0a21e8542705ca'
a.output.mkdir(parents=True,exist_ok=True)
for label,times in [('paddle',[.3,.5,.7]),('brick',[1.65,1.8,1.95]),('wall',[14.1,14.2667,14.43])]:
    for index,seconds in enumerate(times,1):
        output=a.output/f'{label}-{index}.png'
        assert not output.exists(), output
        subprocess.run(['ffmpeg','-v','error','-nostdin','-ss',str(seconds),'-i',str(a.video),'-vf','crop=1440:1080:240:0,scale=640:480:flags=neighbor','-frames:v','1','-update','1',str(output)],check=True)
