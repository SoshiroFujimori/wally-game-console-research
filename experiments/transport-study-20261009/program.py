#!/usr/bin/env python3
"""Program one explicit FPGA and capture the subsequent boot."""
import argparse, datetime, hashlib, json, socket, subprocess, time
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--target', required=True)
p.add_argument('--uart', required=True)
p.add_argument('--bit', type=Path, required=True)
p.add_argument('--sha256', required=True)
p.add_argument('--vivado-bin', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--fixture', action='store_true', help='Do not expect Linux from a diagnostic fixture')
a = p.parse_args()
assert hashlib.sha256(a.bit.read_bytes()).hexdigest() == a.sha256
a.output.mkdir(parents=True, exist_ok=False)
source = Path(__file__).resolve().parent
record = {'started_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'bit': str(a.bit), 'sha256': a.sha256, 'target': a.target}
try:
    with socket.create_connection(('127.0.0.1', 3121), timeout=1): pass
except OSError:
    with (a.output/'hw-server.log').open('w') as f:
        server = subprocess.Popen([str(a.vivado_bin/'hw_server'), '-s', 'tcp::3121'], stdout=f, stderr=subprocess.STDOUT, start_new_session=True)
    record['owned_hw_server_pid'] = server.pid
    record['owned_hw_server_start_ticks'] = Path(f'/proc/{server.pid}/stat').read_text().split()[21]
    time.sleep(2)
listener = None
if not a.fixture:
    with (a.output/'listener.log').open('w') as f:
        listener = subprocess.Popen(['python3', '-u', str(source/'uart_run.py'), '--port', a.uart,
            '--output', str(a.output/'boot.log'), '--login', '--seconds', '240'], stdout=f, stderr=subprocess.STDOUT)
    time.sleep(1)
with (a.output/'program.log').open('w') as f:
    result = subprocess.run([str(a.vivado_bin/'vivado'), '-mode', 'batch', '-nojournal', '-nolog',
        '-source', str(source/'program.tcl'), '-tclargs', a.target, str(a.bit)], cwd=a.output, stdout=f, stderr=subprocess.STDOUT)
record['program_exit'] = result.returncode
record['listener_exit'] = listener.wait() if listener else None
record['finished_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
(a.output/'result.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps(record), flush=True)
assert result.returncode == 0 and 'PROGRAM_RESULT crc_error=0 done=1' in (a.output/'program.log').read_text()
if listener:
    assert record['listener_exit'] == 0, 'Boot was not confirmed; inspect preserved log.'
print('PROGRAM_FIXTURE_PASS' if a.fixture else 'PROGRAM_AND_BOOT_PASS', flush=True)
