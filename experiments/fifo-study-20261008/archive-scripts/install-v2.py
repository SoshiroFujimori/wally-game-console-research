from pathlib import Path
import subprocess,os,json,hashlib,shutil,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008')
rows=json.loads(subprocess.check_output(['lsblk','-J','-b','--tree','-o','PATH,TYPE,SIZE,MODEL,SERIAL,TRAN,FSTYPE,PARTLABEL,MOUNTPOINTS']))['blockdevices']
cards=[x for x in rows if x['type']=='disk' and x.get('serial')=='SDWIRE_READER_SERIAL']
assert len(cards)==1
card=cards[0];parts=card['children']
assert card['size']==31266439168 and card['model'].strip()=='SD/MMC' and card['tran']=='usb'
assert not any(m for row in [card]+parts for m in row['mountpoints'])
assert [(p['partlabel'],p['size']) for p in parts]==[('fdt',65536),('opensbi',273408),('kernel',15410176),('filesystem',31249670144)]
before={p['partlabel']:hashlib.sha256(Path(p['path']).read_bytes()).hexdigest() for p in parts[:3]}
assert before==json.loads((r/'sd-install.json').read_text())['boot_partitions_before']
manifest=json.loads((r/'payload-v2/manifest.json').read_text())
m=r/'sd-mount'
subprocess.run(['mount','-o','rw',parts[3]['path'],str(m)],check=True)
try:
    dest=m/'fifo-study-20261008-v2';dest.mkdir(exist_ok=False)
    for p in (r/'payload-v2').glob('*.gz'):shutil.copy2(p,dest/p.name)
    shutil.copy2(r/'payload-v2/manifest.json',dest/'manifest.json')
    os.sync()
finally:subprocess.run(['umount',str(m)],check=True)
subprocess.run(['mount','-o','ro',parts[3]['path'],str(m)],check=True)
try:
    for name,v in manifest.items():assert hashlib.sha256((m/'fifo-study-20261008-v2'/(name+'.gz')).read_bytes()).hexdigest()==v['gzip_sha256']
finally:subprocess.run(['umount',str(m)],check=True)
after={p['partlabel']:hashlib.sha256(Path(p['path']).read_bytes()).hexdigest() for p in parts[:3]}
assert before==after
record=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),boot_partitions_before=before,boot_partitions_after=after,readback_verified=True,unmounted=True,manifest=manifest)
(r/'sd-install-v2.json').write_text(json.dumps(record,indent=2)+'\n')
print('SD_INSTALL_V2_PASS')
subprocess.run(['sdwire','switch','--serial','SDWIRE_CONTROL_SERIAL','target'],check=True)
print('SDWIRE_TARGET_COMMAND_DONE')

