#!/usr/bin/env python3
"""Prepare the recorded HDMI output variant without modifying either input checkout.

The output is an expendable source archive, not a product branch. Dependencies
are linked from explicitly selected, clean checkouts. Run on Linux/WSL.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args]).decode().strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--product', type=Path, required=True)
    parser.add_argument('--hdmi-source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    product = args.product.resolve()
    hdmi = args.hdmi_source.resolve()
    output = args.output.resolve()
    meta = json.loads((HERE/'source-manifest.json').read_text())
    patch = HERE/'output.patch'
    assert hashlib.sha256(patch.read_bytes()).hexdigest() == meta['patch_sha256']
    assert git(product, 'rev-parse', 'HEAD') == meta['product_revision']
    assert not git(product, 'status', '--porcelain'), 'Product checkout must be clean'
    assert git(product/'addins/rasterix', 'rev-parse', 'HEAD') == meta['rasterix_revision']
    assert not git(product/'addins/rasterix', 'status', '--porcelain')
    assert git(hdmi, 'rev-parse', 'HEAD') == meta['hdmi_revision']
    assert not git(hdmi, 'status', '--porcelain'), 'HDMI dependency must be clean'
    assert not output.exists(), 'Output must be a new directory'
    assert product not in output.parents and hdmi not in output.parents
    output.mkdir(parents=True)
    data = subprocess.check_output(['git', '-C', str(product), 'archive', meta['product_revision']])
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        archive.extractall(output, filter='data')
    tree = subprocess.check_output(['git', '-C', str(product), 'ls-tree', '-rz', meta['product_revision']])
    for entry in tree.split(b'\0'):
        if not entry:
            continue
        fields, name = entry.split(b'\t')
        if not fields.startswith(b'160000 '):
            continue
        relative = name.decode()
        target = product/relative
        revision = fields.split()[2].decode()
        assert git(target, 'rev-parse', 'HEAD') == revision, f'Submodule revision differs: {relative}'
        link = output/relative
        if link.exists():
            link.rmdir()
        link.symlink_to(target, target_is_directory=True)
    (output/'addins/hdmi').symlink_to(hdmi, target_is_directory=True)
    command = ['patch', '--batch', '--forward', '-p1', '--input', str(patch)]
    subprocess.run(command+['--dry-run'], cwd=output, check=True)
    subprocess.run(command, cwd=output, check=True)
    for name, digest in meta['files_after_patch'].items():
        assert hashlib.sha256((output/name).read_bytes()).hexdigest() == digest, name
    (output/'hdmi-variant.json').write_text(json.dumps(meta, indent=2)+'\n')
    print('Prepared the source variant; all changed-file hashes match the recorded build.')


if __name__ == '__main__':
    main()
