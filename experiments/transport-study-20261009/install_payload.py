#!/usr/bin/env python3
"""Add experiment binaries to a selected SD filesystem; preserve boot partitions."""
import argparse, datetime, gzip, hashlib, json, os, re, shutil, subprocess
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--disk', type=Path, required=True)
p.add_argument('--serial', required=True)
p.add_argument('--bytes', type=int, required=True)
p.add_argument('--boot-manifest', type=Path, required=True)
p.add_argument('--payload', type=Path, required=True)
p.add_argument('--folder', required=True)
p.add_argument('--mount', type=Path, required=True)
p.add_argument('--record', type=Path, required=True)
p.add_argument('--uncompressed', action='store_true', help='Expand verified binaries on the host, before mounting the target filesystem')
p.add_argument('--target-quiesced', action='store_true', required=True)
a = p.parse_args()
assert re.fullmatch(r'[a-z0-9][a-z0-9-]+', a.folder)
assert not a.record.exists()
rows = json.loads(subprocess.check_output(['lsblk','--tree','-J','-b','-o','PATH,TYPE,SIZE,MODEL,SERIAL,TRAN,PARTLABEL,MOUNTPOINTS']))['blockdevices']
cards = [d for d in rows if Path(d['path']).resolve() == a.disk.resolve()]
assert len(cards) == 1
card = cards[0]
assert card['type'] == 'disk' and card['serial'] == a.serial and card['size'] == a.bytes
assert card['model'].strip() == 'SD/MMC' and card['tran'] == 'usb'
parts = card.get('children', [])
assert [(d['partlabel'], d['size']) for d in parts] == [('fdt',65536),('opensbi',273408),('kernel',15410176),('filesystem',31249670144)]
assert not any(m for d in [card]+parts for m in d['mountpoints'])
def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
before = {d['partlabel']:digest(d['path']) for d in parts[:3]}
assert before == json.loads(a.boot_manifest.read_text())['boot_partitions_before']
manifest = json.loads((a.payload/'manifest.json').read_text())
expanded = {}
for name, record in manifest.items():
    assert re.fullmatch(r'[a-z0-9-]+', name)
    assert digest(a.payload/(name+'.gz')) == record['gzip_sha256']
    if a.uncompressed:
        data = gzip.decompress((a.payload/(name+'.gz')).read_bytes())
        assert len(data) == record['bytes'] and hashlib.sha256(data).hexdigest() == record['sha256']
        expanded[name] = data
a.mount.mkdir(parents=True, exist_ok=True)
assert not os.path.ismount(a.mount)
assert not any(a.mount.iterdir())
subprocess.run(['mount','-t','ext4','-o','rw',parts[3]['path'],str(a.mount)],check=True)
try:
    dest = a.mount/a.folder; dest.mkdir(exist_ok=False)
    for name in manifest:
        if a.uncompressed:
            (dest/name).write_bytes(expanded[name])
            (dest/name).chmod(0o755)
        else:
            shutil.copyfile(a.payload/(name+'.gz'), dest/(name+'.gz'))
    shutil.copyfile(a.payload/'manifest.json', dest/'manifest.json')
    os.sync()
finally: subprocess.run(['umount',str(a.mount)],check=True)
subprocess.run(['mount','-t','ext4','-o','ro',parts[3]['path'],str(a.mount)],check=True)
try:
    for name, record in manifest.items():
        filename = name if a.uncompressed else name+'.gz'
        key = 'sha256' if a.uncompressed else 'gzip_sha256'
        assert digest(a.mount/a.folder/filename) == record[key]
finally: subprocess.run(['umount',str(a.mount)],check=True)
after = {d['partlabel']:digest(d['path']) for d in parts[:3]}
assert before == after
a.record.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'disk':str(a.disk),'folder':a.folder,'storage':'uncompressed' if a.uncompressed else 'gzip','boot_partitions_before':before,
    'boot_partitions_after':after,'manifest':manifest,'readback_verified':True,'unmounted':True},indent=2)+'\n')
print('SD_PAYLOAD_READBACK_PASS')
