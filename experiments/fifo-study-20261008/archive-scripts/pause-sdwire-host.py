from pathlib import Path
import json,subprocess,datetime
o=Path('/path/to/research/experiments/fifo-study-20261008')
root=Path('/sys/bus/usb/devices')
devs=[p for p in root.iterdir() if (p/'idVendor').exists() and (p/'idVendor').read_text().strip()=='0bda' and (p/'idProduct').read_text().strip()=='0316' and (p/'serial').read_text().strip()=='SDWIRE_READER_SERIAL']
assert len(devs)==1
dev=devs[0]
rows=json.loads(subprocess.check_output(['lsblk','-J','-b','--tree','-o','PATH,TYPE,SIZE,SERIAL,MOUNTPOINTS']))['blockdevices']
cards=[r for r in rows if r.get('serial')=='SDWIRE_READER_SERIAL']
assert len(cards)==1 and cards[0]['size']==31266439168
assert not any(m for r in [cards[0]]+cards[0].get('children',[]) for m in r['mountpoints'])
ints=list(root.glob(dev.name+':*'));assert len(ints)==1
interface=ints[0];driver=(interface/'driver').resolve()
assert driver==Path('/sys/bus/usb/drivers/usb-storage')
record={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'device':str(dev),'interface':interface.name,'driver':str(driver),'card':cards[0]}
(driver/'unbind').write_text(interface.name)
assert not (interface/'driver').exists()
record['paused']=True
(o/'sdwire-driver-pause.json').write_text(json.dumps(record,indent=2)+'\n')
print('SDWIRE_HOST_DRIVER_PAUSED',interface.name)
