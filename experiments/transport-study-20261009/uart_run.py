#!/usr/bin/env python3
"""Run a text command on an explicitly selected board and retain its output."""
import argparse
import datetime
import json
from pathlib import Path
import re
import time
import uuid
import serial

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--port', required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--seconds', type=float, default=30)
commands = p.add_mutually_exclusive_group()
commands.add_argument('--command')
commands.add_argument('--command-file', type=Path, help='Read a command without host-shell interpolation')
p.add_argument('--login', action='store_true')
p.add_argument('--until-text', help='For a read-only continuation, stop after this text is received')
a = p.parse_args()
if a.command_file:
    a.command = a.command_file.read_text(encoding='utf-8').strip()
    if '\n' in a.command or '\r' in a.command:
        p.error('Use a single shell command line in the command file.')
if not a.port.startswith('/dev/serial/by-id/'):
    p.error('Select the board by its stable /dev/serial/by-id path.')
a.output.parent.mkdir(parents=True, exist_ok=True)
if a.output.exists() or a.output.with_suffix('.json').exists():
    p.error('Output already exists; preserve earlier trials.')
marker = 'STUDY_DONE_' + uuid.uuid4().hex[:12]
received = bytearray()
matched = None
login_sent = False
started = time.monotonic()
started_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
with a.output.open('xb') as out, serial.Serial(a.port, 115200, timeout=.2, exclusive=True) as uart:
    if a.command:
        command = a.command + '; study_status=$?; printf "\\n' + marker + '=%s\\n" "$study_status"\r'
        for value in command.encode():
            uart.write(bytes([value]))
            time.sleep(.002)
    elif not a.until_text:
        uart.write(b'\r')
    while time.monotonic() - started < a.seconds:
        chunk = uart.read(4096)
        if not chunk:
            continue
        received.extend(chunk)
        out.write(chunk)
        out.flush()
        if a.until_text and a.until_text.encode() in received:
            break
        if a.login and not login_sent and b'login:' in received[-500:]:
            uart.write(b'root\r')
            login_sent = True
        if a.command:
            matched = re.search(rb'\r?\n' + marker.encode() + rb'=(\d+)\r?\n', received)
            if matched:
                break
        elif a.login and login_sent and received.endswith(b'# '):
            break
status = {'started_utc': started_utc,
          'elapsed_seconds': time.monotonic() - started, 'bytes_received': len(received),
          'command': a.command, 'command_exit': int(matched[1]) if matched else None,
          'login_sent': login_sent}
if a.until_text:
    status['until_text_found'] = a.until_text.encode() in received
a.output.with_suffix('.json').write_text(json.dumps(status, indent=2) + '\n')
print(received.decode(errors='replace'))
print(json.dumps(status))
if a.command and (not matched or int(matched[1])):
    raise SystemExit(1)
if a.login and not (login_sent and received.endswith(b'# ')):
    raise SystemExit(1)
if a.until_text and not status['until_text_found']:
    raise SystemExit(1)
