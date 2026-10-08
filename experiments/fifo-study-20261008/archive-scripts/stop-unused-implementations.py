from pathlib import Path
import os,signal,json,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008');records=[]
for p in Path('/proc').iterdir():
    if not p.name.isdigit():continue
    try:
        cmd=(p/'cmdline').read_bytes().split(b'\0');args=[x.decode(errors='replace') for x in cmd if x]
        if not args or not args[0].endswith('/unwrapped/lnx64.o/vivado'):continue
        if not any(x in args for x in ('scripts/place-reciprocal.tcl','scripts/place-explore.tcl')):continue
        assert (p/'cwd').resolve()==r,(p,args)
        item={'pid':int(p.name),'start_ticks':(p/'stat').read_text().split()[21],'args':args,'reason':'The unmodified official-source product has passed static qualification with the synthesis-retiming recipe.'}
        records.append(item);os.kill(item['pid'],signal.SIGTERM)
    except (FileNotFoundError,ProcessLookupError):pass
(r/'logs/unused-implementation-cancellation.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'processes':records},indent=2)+'\n')
print(json.dumps({'stopped_owned_pids':[x['pid'] for x in records]}))
