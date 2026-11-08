"""Run an explicitly selected serial command and retain its complete response."""
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
p.add_argument('--command')
p.add_argument('--command-file', type=Path)
p.add_argument('--login', action='store_true')
a = p.parse_args()
assert not (a.command and a.command_file)
if a.command_file:
    a.command = a.command_file.read_text(encoding='utf-8').strip()
assert not a.output.exists(), a.output
a.output.parent.mkdir(parents=True, exist_ok=True)
marker = 'TEST_DONE_' + uuid.uuid4().hex[:12]
buffer = bytearray()
sent_login = False
matched = None
stream = serial.Serial()
stream.port, stream.baudrate, stream.timeout = a.port, 115200, 0.15
stream.dtr = stream.rts = False
started = time.monotonic()
utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
with stream, a.output.open('wb') as log:
    if a.command:
        command = a.command + '; test_status=$?; printf "\\n' + marker + '=%s\\n" "$test_status"\r'
        for byte in command.encode():
            stream.write(bytes([byte]))
            time.sleep(0.002)
    elif not a.login:
        stream.write(b'\r')
    while time.monotonic() - started < a.seconds:
        data = stream.read(4096)
        if not data:
            continue
        buffer.extend(data)
        log.write(data)
        log.flush()
        if a.login and not sent_login and b'login:' in buffer[-500:]:
            stream.write(b'root\r')
            sent_login = True
        if a.command:
            matched = re.search(rb'(?:\r?\n)' + marker.encode() + rb'=(\d+)\r?\n', buffer)
            if matched:
                break
        elif a.login and sent_login and buffer.rstrip().endswith(b'#'):
            break
record = {'started_utc': utc, 'elapsed_seconds': time.monotonic()-started,
          'port': a.port, 'command': a.command, 'bytes_received': len(buffer),
          'command_exit': int(matched[1]) if matched else None, 'login_sent': sent_login}
a.output.with_suffix('.json').write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
print(json.dumps(record), flush=True)
if a.command and (not matched or int(matched[1])):
    raise SystemExit(1)
if a.login and not (sent_login and buffer.rstrip().endswith(b'#')):
    raise SystemExit(1)
