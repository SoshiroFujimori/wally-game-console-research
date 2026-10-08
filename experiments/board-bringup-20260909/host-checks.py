#!/usr/bin/env python3
"""Check SD selection failures without accessing block devices or mounting anything."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
from unittest.mock import patch

root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('sd_installer', root / 'install-to-sd.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

with tempfile.TemporaryDirectory(prefix='nexys-host-check-') as scratch:
    fixture = Path(scratch)
    manifest = {'boot_images': {}}
    parts = []
    for index, label in enumerate(installer.LABELS):
        path = fixture / f'partition{index + 1}'
        payload = f'fixture-{label}'.encode()
        path.write_bytes(payload)
        parts.append({'path': str(path), 'type': 'part', 'partlabel': label,
                      'fstype': 'ext4' if index == 3 else None, 'mountpoints': [None]})
        if index < 3:
            manifest['boot_images'][installer.IMAGES[index]] = {
                'size': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}
    (fixture / 'provenance.json').write_text(json.dumps(manifest))
    disk = {'path': '/dev/nexys-fixture', 'type': 'disk', 'tran': 'usb', 'ro': False,
            'model': 'fixture only', 'size': 1024, 'children': parts}

    def check(name, disks, passes):
        with patch.object(installer, 'ROOT', fixture), \
             patch.object(installer.os, 'geteuid', return_value=0), \
             patch.object(installer, 'run', return_value=json.dumps({'blockdevices': disks})), \
             patch.object(installer.subprocess, 'run') as mutation, \
             patch('sys.argv', ['install-to-sd.py', '--check-only']), \
             contextlib.redirect_stdout(io.StringIO()):
            try:
                installer.main()
                succeeded = True
            except RuntimeError:
                succeeded = False
            assert succeeded == passes, name
            mutation.assert_not_called()
        print(f'PASS: {name}')

    check('matching card accepted by read-only check', [disk], True)
    check('no card rejected', [], False)
    check('ambiguous cards rejected', [disk, dict(disk, path='/dev/second-fixture')], False)
    check('WSL virtual disk rejected', [dict(disk, tran=None)], False)
    check('read-only disk rejected', [dict(disk, ro=True)], False)
    parts[3]['mountpoints'] = ['/already-mounted']
    check('existing mount rejected', [disk], False)
    parts[3]['mountpoints'] = [None]
    (fixture / 'partition3').write_bytes(b'wrong kernel!!')
    check('wrong boot image rejected', [disk], False)

print('Host SD selection checks passed. No hardware operation was performed.')
