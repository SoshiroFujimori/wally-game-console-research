#!/usr/bin/env python3
"""Select one SDWire explicitly; mutation is opt-in and never formats media."""
import argparse,json,os,subprocess,sys
from pathlib import Path

def unmounted_usb_disk(path, listing):
    wanted=os.path.realpath(path)
    disks=[d for d in listing.get('blockdevices',[]) if os.path.realpath(d['path'])==wanted]
    if len(disks)!=1 or disks[0].get('type')!='disk' or disks[0].get('tran')!='usb':
        raise ValueError('Selected reader must resolve to exactly one USB disk.')
    def mounted(row):
        return any(row.get('mountpoints') or []) or any(mounted(c) for c in row.get('children',[]))
    if mounted(disks[0]):raise ValueError('Reader or a child partition is mounted.')

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('action',choices=['state','host','target','off'])
    p.add_argument('--serial',required=True,help='Control interface serial reported by sdwire list')
    p.add_argument('--reader-device',help='Explicit host USB disk; required when leaving the host')
    p.add_argument('--target-quiesced',action='store_true',help='Confirm the target no longer accesses the card')
    p.add_argument('--execute',action='store_true',help='Without this flag only show the command')
    a=p.parse_args(argv)
    if a.serial.startswith('-') or not a.serial.strip():p.error('Invalid serial')
    cmd=['sdwire','state','--serial',a.serial] if a.action=='state' else ['sdwire','switch','--serial',a.serial,a.action]
    if not a.execute:
        print(json.dumps({'command':cmd,'executed':False}));return 0
    if a.action!='state':
        if not a.target_quiesced:p.error('Confirm the FPGA no longer accesses the SD card with --target-quiesced.')
        if a.action in ('target','off') and not a.reader_device:p.error('Specify --reader-device so mounted filesystems can be checked.')
        if a.reader_device:
            state=json.loads(subprocess.check_output(['lsblk','--json','--paths','--output','PATH,TYPE,TRAN,MOUNTPOINTS'],text=True))
            unmounted_usb_disk(a.reader_device,state)
        os.sync()
    return subprocess.run(cmd,check=False).returncode

if __name__=='__main__':sys.exit(main())
