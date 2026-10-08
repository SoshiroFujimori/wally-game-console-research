from pathlib import Path
import datetime,json,re,subprocess
root=Path('/path/to/research/experiments/fifo-study-20261008')
out=root/'board-v2/latest'
def run(label,command,seconds):
    target=out/(label+'.log')
    if not target.exists():
        with target.open('w') as stream:
            proc=subprocess.run(['python3',str(root/'uart.py'),'--label','latest-'+label,'--seconds',str(seconds),'--command',command],stdout=stream,stderr=subprocess.STDOUT)
        if proc.returncode:raise RuntimeError(str(target))
    result=target.read_text(errors='replace')
    capture=json.loads(re.search(r'CAPTURE: (\{.*\})',result)[1])
    assert capture['command']==command and capture['command_exit']==0
    return result
text=run('continuous-resumed','/tmp/fifo-game --demo --seconds 300',360)
line=re.search(r'Game ended: score=(\d+) lives=(\d+) frames=(\d+) ticks=(\d+) elapsed=([\d.]+) s',text)
assert line and float(line[5])>=300 and int(line[3])>0
post=run('post-continuous-resumed','/tmp/fifo-bench --frames 180 --warmup 30 --retained --wait spin --state-frame 0 --csv /tmp/product-post.csv --dump /tmp/product-post.rgb565',120)
assert 'BREAKOUT_PASS' in post and 'pixels=307200 mismatches=0' in post
result={'passed':True,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'continuous_log':str(out/'continuous-resumed.log'),'post_check_log':str(out/'post-continuous-resumed.log'),'continuous_summary':line[0],'post_summary':[s.strip() for s in post.splitlines() if s.startswith('RESULT') or s.startswith('FRAME_CHECK')],'harness_correction':'The first wrapper expected the benchmark-only BREAKOUT_PASS token from the product game. The product had exited 0 after 300.011 seconds. Its actual Game ended summary and saved UART exit are checked here; no game rerun or source change.'}
(out/'continuous-resumed.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result),flush=True)
