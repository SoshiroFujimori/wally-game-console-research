#!/usr/bin/env python3
"""Record or verify published Git blob bytes, including line-ending normalization."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECORD = 'publication/files.json'

def snapshot():
    index = subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', '--stage', '-z'])
    files = {}; submodules = {}
    for entry in index.split(b'\0'):
        if not entry:
            continue
        fields, name = entry.split(b'\t', 1)
        mode, sha, stage = fields.decode('ascii').split()
        path = name.decode('utf-8')
        if stage != '0':
            raise ValueError('Resolve the Git index conflict before recording a snapshot.')
        if mode == '160000':
            submodules[path] = sha
            continue
        if path == RECORD:
            continue
        if mode not in ('100644', '100755'):
            raise ValueError('Only regular files and the reference submodule are supported.')
        data = subprocess.check_output(['git', '-C', str(ROOT), 'cat-file', 'blob', sha])
        files[path] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    return {'version': 1, 'scope': 'Git index blobs; excludes this manifest and submodule contents',
            'submodules': submodules, 'files': files}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true', help='Stage intended files first, then generate this record.')
    mode.add_argument('--check', action='store_true', help='Compare the record with the current Git index.')
    args = parser.parse_args()
    actual = snapshot(); path = ROOT / RECORD
    if args.write:
        path.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    else:
        expected = json.loads(path.read_text(encoding='utf-8'))
        if expected != actual:
            print('Publication snapshot differs from the index. Review changes, stage them, and regenerate the record.', file=sys.stderr)
            return 1
    print(json.dumps({'files': len(actual['files']), 'bytes': sum(v['bytes'] for v in actual['files'].values()),
                      'submodules': actual['submodules'], 'action': 'written' if args.write else 'verified'}))
    return 0

if __name__ == '__main__':
    sys.exit(main())
