#!/usr/bin/env python3
"""Copy the test package to an existing, matching Wally SD card; never format it."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
PACKAGE = ROOT / 'package'
LABELS = ['fdt', 'opensbi', 'kernel', 'filesystem']
IMAGES = ['wally-nexysvideo.dtb', 'fw_jump.bin', 'Image']


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def digest(path, size=None):
    value = hashlib.sha256()
    with Path(path).open('rb') as stream:
        remaining = size
        while remaining is None or remaining:
            chunk = stream.read(1048576 if remaining is None else min(1048576, remaining))
            if not chunk:
                require(remaining in (None, 0), f'Short read: {path}')
                break
            value.update(chunk)
            if remaining is not None:
                remaining -= len(chunk)
    return value.hexdigest()


def verify_package(directory, expected):
    for name, expected_hash in expected.items():
        path = directory / name
        require(path.is_file() and not path.is_symlink(), f'Missing regular file: {path}')
        require(digest(path) == expected_hash, f'Checksum mismatch: {path}')


def verify_boot(parts, manifest):
    for part, image in zip(parts[:3], IMAGES):
        expected = manifest['boot_images'][image]
        require(digest(part['path'], expected['size']) == expected['sha256'],
                f'{part["path"]}: boot image does not match {image}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('device', nargs='?', help='Optional whole USB disk, e.g. /dev/sde. Default: find exactly one matching card.')
    parser.add_argument('--check-only', action='store_true', help='Verify the card without mounting or writing it.')
    args = parser.parse_args()
    require(os.geteuid() == 0, 'Run with sudo in WSL Ubuntu.')
    manifest = json.loads((ROOT / 'provenance.json').read_text())
    expected = {}
    for line in (PACKAGE / 'SHA256SUMS').read_text().splitlines():
        value, name = line.split(None, 1)
        require('/' not in name and name not in ('.', '..'), 'Unexpected package filename.')
        expected[name] = value
    verify_package(PACKAGE, expected)
    expected['SHA256SUMS'] = digest(PACKAGE / 'SHA256SUMS')

    disks = json.loads(run('lsblk', '--json', '--tree', '--bytes', '--paths', '--output',
                          'PATH,TYPE,SIZE,MODEL,TRAN,FSTYPE,PARTLABEL,MOUNTPOINTS,RO'))['blockdevices']
    candidates = []
    failures = []
    for disk in disks:
        if args.device and Path(disk['path']).resolve() != Path(args.device).resolve():
            continue
        if disk['type'] != 'disk' or disk['tran'] != 'usb':
            continue
        try:
            require(not disk['ro'], f'{disk["path"]}: disk is read-only.')
            children = disk.get('children', [])
            require(len(children) == 4 and all(p['type'] == 'part' for p in children),
                    f'{disk["path"]}: expected four plain partitions.')
            by_label = {p['partlabel']: p for p in children}
            require(set(by_label) == set(LABELS), f'{disk["path"]}: Wally partition labels do not match.')
            parts = [by_label[label] for label in LABELS]
            require(parts[3]['fstype'] == 'ext4', f'{parts[3]["path"]}: expected ext4.')
            require(not any(m for p in parts for m in p.get('mountpoints', []) or []),
                    f'{disk["path"]}: a partition is already mounted; unmount it yourself first.')
            verify_boot(parts, manifest)
            candidates.append((disk, parts))
        except (RuntimeError, OSError) as error:
            failures.append(str(error))
    for message in failures:
        print('Skipped:', message)
    require(len(candidates) == 1,
            f'Found {len(candidates)} matching cards. Attach the test SD reader to WSL. '
            'If multiple cards match, pass the exact whole-disk device as an argument.')
    disk, parts = candidates[0]
    print(f'Verified card: {disk["path"]}, {disk["model"]}, {disk["size"]} bytes')
    print('Device tree, OpenSBI and kernel match the recorded boot images.')
    if args.check_only:
        print('CHECK_ONLY_PASS: no mount or write performed.')
        return

    mountpoint = Path(tempfile.mkdtemp(prefix='nexys-video-sd-', dir='/mnt'))
    mounted = False
    try:
        subprocess.run(['mount', '-t', 'ext4', '-o', 'rw,nosuid,nodev,noexec',
                        parts[3]['path'], str(mountpoint)], check=True)
        mounted = True
        destination = mountpoint / 'nexys-video-tests'
        require(not destination.is_symlink(), 'The destination is a symbolic link.')
        if destination.exists():
            verify_package(destination, expected)
            print('An identical package is already installed.')
        else:
            staging = Path(tempfile.mkdtemp(prefix='.nexys-video-tests-', dir=mountpoint))
            try:
                for name in expected:
                    shutil.copyfile(PACKAGE / name, staging / name)
                    (staging / name).chmod(0o755 if name in ('memtester', 'coremark.exe', 'board-tests.sh') else 0o644)
                    with (staging / name).open('rb') as stream:
                        os.fsync(stream.fileno())
                staging.chmod(0o755)
                verify_package(staging, expected)
                staging.rename(destination)
            finally:
                if staging.exists():
                    # Only this invocation's newly created staging directory is removed.
                    shutil.rmtree(staging)
        os.sync()
        subprocess.run(['umount', str(mountpoint)], check=True)
        mounted = False
        subprocess.run(['mount', '-t', 'ext4', '-o', 'ro,noload,nosuid,nodev,noexec',
                        parts[3]['path'], str(mountpoint)], check=True)
        mounted = True
        verify_package(mountpoint / 'nexys-video-tests', expected)
        verify_boot(parts, manifest)
        subprocess.run(['umount', str(mountpoint)], check=True)
        mounted = False
    finally:
        if mounted:
            subprocess.run(['umount', str(mountpoint)], check=True)
        mountpoint.rmdir()
    print('SD_INSTALL_PASS: package verified after remount; boot images unchanged; card unmounted.')
    print('On the board: mount -t ext4 -o ro /dev/mmcblk0p4 /mnt/nexys-test')
    print('Then: sh /mnt/nexys-test/nexys-video-tests/board-tests.sh info')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
