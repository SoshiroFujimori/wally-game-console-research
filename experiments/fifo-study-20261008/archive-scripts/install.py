from pathlib import Path
import subprocess,os,json,hashlib,gzip,shutil,datetime
o=Path('/path/to/research/experiments/fifo-study-20261008')
package=o/'payload';package.mkdir(exist_ok=False)
items={'bench':o/'software/breakout','game':o/'software/cvw-example/rasterix-breakout','demo':o/'software/cvw-example/rasterix-demo'}
manifest={}
for name,src in items.items():
    dest=package/name
    subprocess.run(['/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-strip','-o',str(dest),str(src)],check=True)
    data=dest.read_bytes();compressed=gzip.compress(data,compresslevel=9,mtime=0)
    (package/(name+'.gz')).write_bytes(compressed)
    manifest[name]={'sha256':hashlib.sha256(data).hexdigest(),'gzip_sha256':hashlib.sha256(compressed).hexdigest(),'size':len(data)}
(package/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
rows=json.loads(subprocess.check_output(['lsblk','-J','-b','--tree','-o','PATH,TYPE,SIZE,MODEL,SERIAL,TRAN,FSTYPE,PARTLABEL,MOUNTPOINTS']))['blockdevices']
cards=[x for x in rows if x['type']=='disk' and x.get('serial')=='SDWIRE_READER_SERIAL']
assert len(cards)==1
card=cards[0];parts=card['children']
assert card['size']==31266439168 and card['model'].strip()=='SD/MMC' and card['tran']=='usb'
assert not any(m for row in [card]+parts for m in row['mountpoints'])
assert [(p['partlabel'],p['size']) for p in parts]==[('fdt',65536),('opensbi',273408),('kernel',15410176),('filesystem',31249670144)]
assert parts[3]['fstype']=='ext4'
backup=o/'sd-boot-before';backup.mkdir(exist_ok=False)
before={}
for p in parts[:3]:
    data=Path(p['path']).read_bytes()
    (backup/(p['partlabel']+'.bin')).write_bytes(data)
    before[p['partlabel']]=hashlib.sha256(data).hexdigest()
for node,prop in [('/cpus','timebase-frequency'),('/cpus/cpu@0','clock-frequency')]:
    print('DEVICE_TREE',node,prop,subprocess.check_output(['fdtget',str(backup/'fdt.bin'),node,prop],text=True).strip())
assert subprocess.check_output(['fdtget',str(backup/'fdt.bin'),'/cpus','timebase-frequency'],text=True).strip()=='20000000'
m=o/'sd-mount';m.mkdir(exist_ok=False)
subprocess.run(['mount','-o','rw',parts[3]['path'],str(m)],check=True)
try:
    dest=m/'fifo-study-20261008';dest.mkdir(exist_ok=False)
    for p in package.glob('*.gz'):shutil.copy2(p,dest/p.name)
    shutil.copy2(package/'manifest.json',dest/'manifest.json')
    os.sync()
finally:subprocess.run(['umount',str(m)],check=True)
subprocess.run(['mount','-o','ro',parts[3]['path'],str(m)],check=True)
try:
    for name,v in manifest.items():assert hashlib.sha256((m/'fifo-study-20261008'/(name+'.gz')).read_bytes()).hexdigest()==v['gzip_sha256']
finally:subprocess.run(['umount',str(m)],check=True)
after={p['partlabel']:hashlib.sha256(Path(p['path']).read_bytes()).hexdigest() for p in parts[:3]}
assert before==after
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'card':card,'payloads':manifest,'boot_partitions_before':before,'boot_partitions_after':after,'unmounted':True,'readback_verified':True}
(o/'sd-install.json').write_text(json.dumps(result,indent=2)+'\n')
print('SD_INSTALL_PASS',json.dumps(manifest))
