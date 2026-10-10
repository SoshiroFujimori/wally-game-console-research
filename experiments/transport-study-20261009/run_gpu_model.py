#!/usr/bin/env python3
"""Preserve each RTL functional trial; distinguish failures from timing results."""
import argparse, concurrent.futures, datetime, hashlib, json, re, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--binary',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--texture',action='store_true')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False)
cases=[]
for mode in ('apb','dma'):
    for state in ((32,64,256) if a.texture else (0,1800,3600)):
        for gap in (0,16):
            for seed in (1,27):
                label=f'{mode}-s{state}-g{gap}-r{seed}'
                args=[str(state),mode,str(gap),str(seed)] if a.texture else [mode,str(state),str(gap),str(seed)]
                cases.append((label,args))
def run(case):
    label,args=case
    with (a.output/(label+'.log')).open('w') as log:
        try:
            done=subprocess.run([str(a.binary),*args],stdout=log,stderr=subprocess.STDOUT,timeout=180)
            status=done.returncode
        except subprocess.TimeoutExpired:status='timeout'
    text=(a.output/(label+'.log')).read_text(errors='replace')
    lines=[x for x in text.splitlines() if x.startswith(('GPU_FRAME','TEXTURE_CHECK','GPU_FUNCTIONAL_','TEXTURE_PROBE_','COMMAND_TIMEOUT','INTERNAL'))]
    result={'case':label,'arguments':args,'exit':status,'checks':lines}
    print(json.dumps(result),flush=True)
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(run,cases))
report={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'binary_sha256':hashlib.sha256(a.binary.read_bytes()).hexdigest(),
        'scope':'Functional RTL model with UNITTEST RAM, synthetic DDR stalls and display acknowledgement. No Wally CPU, APB CDC, MIG, HDMI or FPGA timing is modeled. Glyphs in gpu-functional are quads; gpu-texture separately exercises textures.',
        'cases':results,'passed':all(r['exit']==0 for r in results)}
(a.output/'result.json').write_text(json.dumps(report,indent=2)+'\n')
raise SystemExit(0 if report['passed'] else 1)
