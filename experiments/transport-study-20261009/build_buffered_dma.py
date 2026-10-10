#!/usr/bin/env python3
"""Build an isolated DMA read-buffer experiment without changing either checkout."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--console', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--vivado-settings', type=Path, required=True)
p.add_argument('--riscv', type=Path, required=True)
p.add_argument('--parser-handshake', action='store_true')
a = p.parse_args()
source = Path(__file__).resolve().parent

def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assert git(a.console, 'rev-parse', 'HEAD').decode().strip() == '261832d48832dd6e26c4971ab8893ce61200688b'
assert not git(a.console, 'diff', 'HEAD', '--').strip()
a.output.mkdir(parents=True, exist_ok=False)
tree = a.output / 'source'
manifest = {'console_commit': git(a.console, 'rev-parse', 'HEAD').decode().strip(),
            'files': {}, 'submodules': {}, 'changes': []}

def copy_tracked(repo, destination, prefix=''):
    for entry in git(repo, 'ls-files', '--stage', '-z').split(b'\0'):
        if not entry:
            continue
        info, name = entry.decode().split('\t', 1)
        mode, revision, stage = info.split()
        assert stage == '0'
        src, dst = repo / name, destination / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        key = prefix + name
        if mode == '160000':
            assert git(src, 'rev-parse', 'HEAD').decode().strip() == revision
            assert not git(src, 'diff', 'HEAD', '--').strip()
            manifest['submodules'][key] = revision
            if key == 'addins/rasterix':
                copy_tracked(src, dst, key + '/')
            else:
                dst.symlink_to(src, target_is_directory=True)
        elif src.is_symlink():
            dst.symlink_to(os.readlink(src))
        else:
            shutil.copy2(src, dst)
            manifest['files'][key] = digest(dst)

copy_tracked(a.console, tree)
patches = a.output / 'experimental-rtl'
command = [sys.executable, str(source / 'make_buffered_dma.py'), '--wally', str(a.console),
           '--output', str(patches)]
if a.parser_handshake:
    command.append('--parser-handshake')
subprocess.run(command, check=True)
for name in ['RasterIX_IF.v'] + (['CommandParser.v'] if a.parser_handshake else []):
    dst = tree / 'addins/rasterix/rtl/RasterIX' / name
    assert not dst.is_symlink() and dst.resolve().is_relative_to(tree.resolve())
    before = digest(dst)
    shutil.copyfile(patches / name, dst)
    manifest['changes'].append({'file': str(dst.relative_to(tree)),
                                'before_sha256': before, 'after_sha256': digest(dst)})
dst = tree / 'addins/rasterix/rtl/3rdParty/verilog-axi/axi_fifo_rd.v'
assert not dst.exists()
shutil.copyfile(source / 'vendor/axi_fifo_rd.v', dst)
manifest['changes'].append({'file': str(dst.relative_to(tree)), 'after_sha256': digest(dst),
                            'source': 'vendor/SOURCE.json'})
(a.output / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
env = os.environ.copy()
env['WALLY'] = str(tree)
env['RISCV'] = str(a.riscv)
env['PATH'] = str(tree / 'bin') + ':' + str(a.riscv / 'bin') + ':' + env['PATH']
status = {'started_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'pid': os.getpid(), 'parser_handshake': a.parser_handshake,
          'generated_ip_reused': False}
(a.output / 'status.json').write_text(json.dumps(status, indent=2) + '\n')
with (a.output / 'build.log').open('w') as log:
    run = subprocess.run(['bash', '-c', 'source "$1" && make nexysvideo-rasterix < /dev/null',
                          'build', str(a.vivado_settings)], cwd=tree / 'fpga/generator',
                         env=env, stdout=log, stderr=subprocess.STDOUT)
status['build_exit'] = run.returncode
status['errors'] = [line for line in (a.output / 'build.log').read_text(errors='replace').splitlines()
                    if line.startswith('ERROR:')]
if run.returncode == 0 and not status['errors']:
    with (a.output / 'qualification.log').open('w') as log:
        run = subprocess.run(['bash', '-c',
            'source "$1" && vivado -mode batch -nojournal -nolog -source "$2" -tclargs "$3" "$4"',
            'qualify', str(a.vivado_settings), str(source / 'qualify.tcl'),
            str(tree), str(a.output / 'qualification')],
            cwd=a.output, env=env, stdout=log, stderr=subprocess.STDOUT)
    status['qualification_exit'] = run.returncode
status['finished_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
(a.output / 'status.json').write_text(json.dumps(status, indent=2) + '\n')
print(json.dumps(status), flush=True)
raise SystemExit(0 if status.get('qualification_exit') == 0 else 1)
