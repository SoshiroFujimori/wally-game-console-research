#!/usr/bin/env python3
"""Record the source and artifact identity for this external hardware test run."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parent
repo = Path('/path/to/wally-game-console')
original = json.loads((root / 'original-bitstream-manifest.json').read_text())
prepared = json.loads((root.parent / 'provenance.json').read_text())

def git(*args):
    return subprocess.check_output(['git', '-C', str(repo), *args])

def digest(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()

head = git('rev-parse', 'HEAD').decode().strip()
branch = git('branch', '--show-current').decode().strip()
assert head == original['head'] and branch == 'main', 'Unexpected checkout identity'
tracked = git('diff', '--name-only', 'HEAD', '-z').decode().split('\0')
untracked = git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
changed = sorted(set(tracked + untracked) - {''})
assert changed == sorted(original['source_sha256']), 'Unexpected changed source paths'
source_hashes = {name: digest(repo / name) for name in changed}
mismatches = [name for name, value in source_hashes.items()
              if value != original['source_sha256'][name]]
assert mismatches == ['fpga/README.md'], 'Hardware source changed since the tested build'
assert not git('diff', 'HEAD', '--', 'setup.sh'), 'setup.sh was modified'
assert not git('diff', '--cached', '--name-only'), 'The index is not empty'
subprocess.run(['git', '-C', str(repo), 'diff', '--check'], check=True)

diff = git('diff', 'HEAD').decode()
new_files = '\n'.join((repo / name).read_text() for name in untracked if name)
added = '\n'.join(line[1:] for line in diff.splitlines()
                  if line.startswith('+') and not line.startswith('+++'))
assert not re.search(r'sdwire|nexys_repo', added + new_files, re.I)
assert not re.search(r'[\u3040-\u30ff\u3400-\u9fff]', added + new_files)

bit = repo / 'fpga/generator/WallyFPGA.runs/impl_1/fpgaTop.bit'
assert digest(bit) == original['bitstream_sha256'], 'The Wally bitstream changed'
for name, info in prepared['boot_images'].items():
    path = repo / 'linux/buildroot/output/images' / name
    assert path.stat().st_size == info['size'] and digest(path) == info['sha256'], name
coremark = repo / 'addins/coremark'
assert not subprocess.check_output(['git', '-C', str(coremark), 'status', '--porcelain'])

result = {
    'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'head': head, 'branch': branch, 'source_sha256': source_hashes,
    'changes_since_bitstream_build': mismatches,
    'setup_sh_sha256': digest(repo / 'setup.sh'),
    'bitstream': str(bit), 'bitstream_sha256': digest(bit),
    'boot_images': prepared['boot_images'],
    'test_fixture_bitstream_sha256': digest(root / 'sd_poweroff_nexysvideo.bit'),
    'coremark_head': subprocess.check_output(
        ['git', '-C', str(coremark), 'rev-parse', 'HEAD']).decode().strip(),
    'package_sha256': {path.name: digest(path) for path in sorted((root.parent / 'package').iterdir())
                       if path.is_file()},
    'status': 'SOURCE_AND_ARTIFACT_IDENTITY_PASS',
}
(root / 'reviewed-source-provenance.json').write_text(json.dumps(result, indent=2) + '\n')
(root / 'reviewed-tracked.patch').write_text(diff)
complete_diff = diff
for name in sorted(name for name in untracked if name):
    addition = subprocess.run(['git', 'diff', '--no-index', '--', '/dev/null', name],
                              cwd=repo, capture_output=True, text=True)
    assert addition.returncode in (0, 1), addition.stderr
    complete_diff += addition.stdout
(root / 'reviewed-complete.patch').write_text(complete_diff)
(root / 'reviewed-status.txt').write_bytes(git('status', '--short', '--branch'))
print(json.dumps(result, indent=2))
