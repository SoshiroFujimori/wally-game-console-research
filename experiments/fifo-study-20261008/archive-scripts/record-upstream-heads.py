from pathlib import Path
import subprocess,json,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008')
d={'verified_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
for name,url,expected in [('wally','https://github.com/openhwgroup/cvw.git','2064ca2bb8a88e3e3ec43753be93d00bef49345b'),('rasterix','https://github.com/ToNi3141/RasterIX.git','9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0')]:
    value=subprocess.check_output(['git','ls-remote',url,'refs/heads/main'],text=True).strip();sha=value.split()[0]
    d[name]={'url':url,'ls_remote':value,'matches_measured_version':sha==expected};assert sha==expected
(r/'upstream-refresh.json').write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps(d))
