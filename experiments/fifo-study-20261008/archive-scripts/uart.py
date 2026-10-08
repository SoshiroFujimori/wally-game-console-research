#!/usr/bin/env python3
"""Serial capture for this board only. Commands are text; binaries use SDWire3."""
import argparse
import datetime
import json
from pathlib import Path
import re
import sys
import time
import uuid
import serial

parser = argparse.ArgumentParser()
parser.add_argument('--label', required=True)
parser.add_argument('--seconds', type=float, default=15)
parser.add_argument('--command')
parser.add_argument('--login', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
base = root / f'{stamp}-{args.label}'
port = '/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_UART_SERIAL-if00-port0'
marker = f'NV_DONE_{uuid.uuid4().hex[:12]}'
buffer = bytearray()
started = time.monotonic()
sent_login = False
matched = None
with base.with_suffix('.raw').open('wb') as log, serial.Serial(port, 115200, timeout=0.2, exclusive=True) as stream:
    if args.command:
        command = args.command + '; nv_status=$?; printf "\\n' + marker + '=%s\\n" "$nv_status"\r'
        for byte in command.encode():
            stream.write(bytes([byte]))
            time.sleep(0.002)
    elif not args.login:
        stream.write(b'\r')
    while time.monotonic() - started < args.seconds:
        data = stream.read(4096)
        if not data:
            continue
        buffer.extend(data)
        log.write(data)
        log.flush()
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()
        if args.login and not sent_login and b'login:' in buffer[-500:]:
            stream.write(b'root\r')
            sent_login = True
        if args.command:
            matched = re.search(rb'(?:\r?\n)' + marker.encode() + rb'=(\d+)\r?\n', buffer)
            if matched:
                break
        elif args.login and sent_login and (buffer.endswith(b'# ') or buffer.endswith(b'#')):
            break
status = {'label': args.label, 'elapsed_seconds': time.monotonic() - started,
          'bytes_received': len(buffer), 'command': args.command,
          'command_exit': int(matched[1]) if matched else None,
          'login_sent': sent_login, 'log': str(base.with_suffix('.raw'))}
base.with_suffix('.json').write_text(json.dumps(status, indent=2) + '\n')
print('\nCAPTURE:', json.dumps(status), flush=True)
if args.command and (not matched or int(matched[1])):
    sys.exit(1)
if args.login and not (sent_login and (buffer.endswith(b'# ') or buffer.endswith(b'#'))):
    sys.exit(1)
