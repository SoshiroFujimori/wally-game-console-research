from pathlib import Path
import subprocess,json
r=Path('/path/to/research/experiments/fifo-study-20261008')
out=r/'board/fifo16-diagnostics';out.mkdir(exist_ok=False)
commands=[
('difference', 'cmp -l /tmp/fifo-smoke.rgb565 /tmp/fifo-smoke.rgb565.expected; code=$?; echo CMP_EXIT=$code; test "$code" = 1',60),
('texture2d', '/tmp/fifo-texture2d',240),
('full', '/tmp/fifo-bench --frames 180 --warmup 30 --wait spin --state-frame 0 --csv /tmp/fifo-full.csv --dump /tmp/fifo-full.rgb565',150),
('grouped', '/tmp/fifo-bench --frames 180 --warmup 30 --grouped --wait spin --state-frame 0 --csv /tmp/fifo-grouped.csv --dump /tmp/fifo-grouped.rgb565',150),
('difference-full', 'cmp -l /tmp/fifo-full.rgb565 /tmp/fifo-full.rgb565.expected; code=$?; echo CMP_EXIT=$code; test "$code" -le 1',90),
('difference-grouped', 'cmp -l /tmp/fifo-grouped.rgb565 /tmp/fifo-grouped.rgb565.expected; code=$?; echo CMP_EXIT=$code; test "$code" -le 1',90)]
for name,cmd,seconds in commands:
    with (out/(name+'.log')).open('w') as f:
        run=subprocess.run(['python3',str(r/'uart.py'),'--label','fifo16-diagnostic-'+name,'--seconds',str(seconds),'--command',cmd],stdout=f,stderr=subprocess.STDOUT)
    text=(out/(name+'.log')).read_text(errors='replace')
    (out/(name+'.json')).write_text(json.dumps({'name':name,'exit':run.returncode,'command':cmd},indent=2)+'\n')
    print(name,run.returncode,'\n'.join(text.splitlines()[-10:]),flush=True)
    if '"command_exit": null' in text: raise RuntimeError('Command timed out; do not run the next command')

