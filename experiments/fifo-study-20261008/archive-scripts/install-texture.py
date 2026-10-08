from pathlib import Path
import subprocess,hashlib,gzip,json,os,datetime,shutil
o=Path('/path/to/research/experiments/fifo-study-20261008')
target=o/'payload/texture2d'
subprocess.run(['/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-strip','-o',str(target),str(o/'software/texture2d')],check=True)
data=target.read_bytes();z=gzip.compress(data,compresslevel=9,mtime=0)
(o/'payload/texture2d.gz').write_bytes(z)
record={'sha256':hashlib.sha256(data).hexdigest(),'gzip_sha256':hashlib.sha256(z).hexdigest(),'size':len(data),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
cards=json.loads(subprocess.check_output(['lsblk','-J','-b','--tree','-o','PATH,TYPE,SIZE,MODEL,SERIAL,TRAN,FSTYPE,PARTLABEL,MOUNTPOINTS']))['blockdevices']
cards=[x for x in cards if x.get('serial')=='SDWIRE_READER_SERIAL'];assert len(cards)==1
card=cards[0];p=card['children']
assert card['type']=='disk' and card['size']==31266439168 and card['tran']=='usb'
assert [(x['partlabel'],x['size']) for x in p]==[('fdt',65536),('opensbi',273408),('kernel',15410176),('filesystem',31249670144)]
assert not any(y for x in [card]+p for y in x['mountpoints'])
expected=json.loads((o/'sd-install.json').read_text())['boot_partitions_after']
def boot_hashes():return {x['partlabel']:hashlib.sha256(Path(x['path']).read_bytes()).hexdigest() for x in p[:3]}
assert boot_hashes()==expected
m=o/'sd-mount';assert not any(m.iterdir())
subprocess.run(['mount','-o','rw',p[3]['path'],str(m)],check=True)
try:
    dst=m/'fifo-study-20261008/texture2d.gz';assert not dst.exists()
    assert json.loads((m/'fifo-study-20261008/manifest.json').read_text())==json.loads((o/'payload/manifest.json').read_text())
    dst.write_bytes(z);os.sync()
finally:subprocess.run(['umount',str(m)],check=True)
subprocess.run(['mount','-o','ro',p[3]['path'],str(m)],check=True)
try:assert hashlib.sha256((m/'fifo-study-20261008/texture2d.gz').read_bytes()).hexdigest()==record['gzip_sha256']
finally:subprocess.run(['umount',str(m)],check=True)
assert boot_hashes()==expected
record.update(boot_unchanged=True,readback_verified=True,unmounted=True)
(o/'texture2d-install.json').write_text(json.dumps(record,indent=2)+'\n')
print('TEXTURE_PAYLOAD_VERIFIED',json.dumps(record))
