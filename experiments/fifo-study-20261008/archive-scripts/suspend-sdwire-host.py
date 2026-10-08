from pathlib import Path
import json,datetime,time
o=Path('/path/to/research/experiments/fifo-study-20261008')
p=Path('/sys/bus/usb/devices/1-3')
assert (p/'idVendor').read_text().strip()=='0bda'
assert (p/'idProduct').read_text().strip()=='0316'
assert (p/'serial').read_text().strip()=='SDWIRE_READER_SERIAL'
assert not any((i/'driver').exists() for i in p.parent.glob(p.name+':*'))
record={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'device':str(p),'before':{k:(p/'power'/k).read_text().strip() for k in ('control','autosuspend_delay_ms','runtime_status')},'source':'https://github.com/Mr-Bossman/SD_Swap#software'}
(p/'power/autosuspend_delay_ms').write_text('0')
(p/'power/control').write_text('auto')
assert (p/'driver').resolve()==Path('/sys/bus/usb/drivers/usb')
Path('/sys/bus/usb/drivers/usb/unbind').write_text(p.name)
time.sleep(2)
record['after']={k:(p/'power'/k).read_text().strip() for k in ('control','autosuspend_delay_ms','runtime_status')}
(o/'sdwire-usb-suspend.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))
