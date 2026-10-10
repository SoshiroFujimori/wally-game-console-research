#!/usr/bin/env python3
"""Build a larger IF working buffer in a separate, manifested source tree."""
import argparse, datetime, hashlib, json, os, shutil, subprocess
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--console', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--vivado-settings', type=Path, required=True)
p.add_argument('--riscv', type=Path, required=True)
a = p.parse_args()
def git(*args): return subprocess.check_output(['git','-C',str(a.console),*args])
assert git('rev-parse','HEAD').decode().strip() == '261832d48832dd6e26c4971ab8893ce61200688b'
assert not git('diff','HEAD','--').strip(), 'Tracked product changes need a separate review'
a.output.mkdir(parents=True, exist_ok=False)
tree = a.output/'source'; tree.mkdir()
manifest = {'console_commit':git('rev-parse','HEAD').decode().strip(), 'files':{}, 'submodules':{}}
for entry in git('ls-files','--stage','-z').split(b'\0'):
    if not entry: continue
    info, name = entry.decode().split('\t',1)
    src = a.console/name; dst = tree/name; dst.parent.mkdir(parents=True,exist_ok=True)
    if info.startswith('160000'):
        expected = info.split()[1]
        actual = subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD']).decode().strip()
        assert actual == expected
        assert not subprocess.check_output(['git','-C',str(src),'diff','HEAD','--']).strip()
        dst.symlink_to(src, target_is_directory=True); manifest['submodules'][name] = actual
    elif src.is_symlink(): dst.symlink_to(os.readlink(src))
    else:
        shutil.copy2(src,dst); manifest['files'][name] = hashlib.sha256(dst.read_bytes()).hexdigest()
rtl = tree/'fpga/src/rasterix.sv'
before = rtl.read_text(); assert before.count('.FRAMEBUFFER_SIZE_IN_PIXEL_LG(16)') == 1
after = before.replace('.FRAMEBUFFER_SIZE_IN_PIXEL_LG(16)', '.FRAMEBUFFER_SIZE_IN_PIXEL_LG(17)')
rtl.write_text(after)
manifest['change'] = {'file':'fpga/src/rasterix.sv','before_sha256':manifest['files']['fpga/src/rasterix.sv'],
                      'after_sha256':hashlib.sha256(rtl.read_bytes()).hexdigest(),
                      'parameter':'FRAMEBUFFER_SIZE_IN_PIXEL_LG','before':16,'after':17}
(a.output/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
env = os.environ.copy(); env['WALLY'] = str(tree); env['RISCV'] = str(a.riscv)
env['PATH'] = str(tree/'bin')+':'+str(a.riscv/'bin')+':'+env['PATH']
status = {'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':os.getpid(),'generated_ip_reused':False}
(a.output/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print('IF17_BUILD_STARTED',flush=True)
with (a.output/'build.log').open('w') as log:
    run = subprocess.run(['bash','-c','source "$1" && make nexysvideo-rasterix < /dev/null',
                         'build',str(a.vivado_settings)],cwd=tree/'fpga/generator',env=env,stdout=log,stderr=subprocess.STDOUT)
status['build_exit'] = run.returncode
status['errors'] = [line for line in (a.output/'build.log').read_text(errors='replace').splitlines() if line.startswith('ERROR:')]
if not run.returncode and not status['errors']:
    with (a.output/'qualification.log').open('w') as log:
        run = subprocess.run(['bash','-c','source "$1" && vivado -mode batch -nojournal -nolog -source "$2" -tclargs "$3" "$4"',
            'qualify',str(a.vivado_settings),str(Path(__file__).parent/'qualify.tcl'),str(tree),str(a.output/'qualification')],cwd=a.output,env=env,stdout=log,stderr=subprocess.STDOUT)
    status['qualification_exit'] = run.returncode
status['finished_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
(a.output/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print('IF17_BUILD_FINISHED',json.dumps(status),flush=True)
raise SystemExit(0 if status.get('qualification_exit') == 0 else 1)
