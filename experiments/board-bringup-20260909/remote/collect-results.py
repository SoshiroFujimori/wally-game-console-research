#!/usr/bin/env python3
"""Summarize saved UART evidence without opening or operating any device."""
import datetime
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent
captures = {}
for path in sorted(root.glob('*.json')):
    value = json.loads(path.read_text())
    if 'label' in value and 'log' in value:
        raw = Path(value['log'])
        value['raw_sha256'] = hashlib.sha256(raw.read_bytes()).hexdigest()
        value['metadata_file'] = path.name
        captures[value['label']] = value

def readable(data):
    chars = []
    for char in data:
        if char == '\b':
            if chars:
                chars.pop()
        elif char != '\r':
            chars.append(char)
    return ''.join(chars)

def body(label):
    value = captures.get(label)
    return Path(value['log']).read_text() if value else ''

def command_pass(label, token):
    value = captures.get(label, {})
    return value.get('command_exit') == 0 and token in body(label)

coremark = {}
for label in ('coremark-performance', 'coremark-validation'):
    log = body(label)
    def number(pattern):
        found = re.search(pattern, log)
        return float(found[1]) if found else None
    seconds = number(r'Total time \(secs\):\s*([\d.]+)')
    coremark[label] = {
        'passed': command_pass(label, 'Correct operation validated.') and seconds >= 10,
        'iterations': number(r'Iterations\s*:\s*(\d+)'),
        'seconds': seconds, 'iterations_per_second': number(r'Iterations/Sec\s*:\s*([\d.]+)'),
    }

memory_path = root / '20260908T194035Z-ddr-memory.raw'
memory_text = readable(memory_path.read_text())
(root / 'ddr-memory-readable.txt').write_text(memory_text)
memory = {'capture_finished': 'ddr-memory' in captures, 'stages': {}}
for stage, amount in (('WIDE', 256), ('PATTERNS', 16)):
    segment = re.search(r'Starting ' + stage + r':.*?(?=Starting |\Z)', memory_text, re.S)
    log = segment[0] if segment else ''
    start = re.search(r'Stage start uptime:\s*([\d.]+)', log)
    end = re.search(r'Stage end uptime:\s*([\d.]+)', log)
    locked = f'got  {amount}MB ({amount * 1048576} bytes), trying mlock ...locked.' in log
    memory['stages'][stage] = {
        'mib': amount, 'locked': locked,
        'passed': locked and f'{stage}_PASS' in log and 'MEMTESTER_EXIT=0' in log
                  and not re.search(r'FAILURE|unlocked|reducing', log),
        'seconds': round(float(end[1]) - float(start[1]), 2) if start and end else None,
        'tests_reported_ok': re.findall(r'^\s*([^:\n]+?)\s*:\s*ok\s*$', log, re.M),
    }
memory['passed'] = (command_pass('ddr-memory', 'MEMORY_PASS')
                    and all(value['passed'] for value in memory['stages'].values()))

boots = {}
for label in ('boot-2-usb-detached', 'boot-repeat-2', 'boot-repeat-3'):
    value = captures.get(label, {})
    log = body(label)
    boots[label] = bool(value.get('login_sent') and log.rstrip().endswith('#')
                        and 'Linux version 6.19.14' in log)

result = {
    'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'coremark': coremark, 'memory': memory,
    'successful_reconfiguration_boots': sum(boots.values()), 'reconfiguration_boots': boots,
    'info_passes': {label: command_pass(label, 'INFO_PASS')
                    for label in ('board-info', 'info-repeat-2', 'info-repeat-3')},
    'post_memory_info_pass': command_pass('post-memory', 'INFO_PASS'),
    'sd_write_read_pass': command_pass('sd-write-read-finish', 'SD_WRITE_READ_PASS'),
    'sd_persistence_passes': {label: command_pass(label, 'SD_PERSISTENCE_PASS')
                              for label in ('info-repeat-2', 'info-repeat-3')},
    'final_board_state_pass': command_pass('final-board-state', 'BOARD_LEFT_RUNNING_SD_UNMOUNTED'),
    'sd_roundtrip_bytes': 23608,
    'sd_roundtrip_sha256': '42cbe69b28b1929235af054b20b61282f54e6f105c5f93807bcfd19778775943',
    'captures': captures,
    'physical_cold_power_cycle_tested': False,
    'all_physical_switch_positions_tested_by_assistant': False,
}
result['remote_checks_complete'] = (
    all(item['passed'] for item in coremark.values()) and memory['passed']
    and all(boots.values()) and all(result['info_passes'].values())
    and result['post_memory_info_pass'] and result['sd_write_read_pass']
    and all(result['sd_persistence_passes'].values()) and result['final_board_state_pass'])
(root / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: value for key, value in result.items() if key != 'captures'}, indent=2))
