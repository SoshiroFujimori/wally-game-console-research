from pathlib import Path
p=Path('/path/to/research/experiments/fifo-study-20261008/scripts/run-board.py')
s=p.read_text()
s=s.replace("""            text=command(label,f'/tmp/fifo-bench""","""            hashes='sha256sum /tmp/fifo-check.rgb565 /tmp/fifo-check.rgb565.expected;' if dump else ''
            text=command(label,f'/tmp/fifo-bench""")
s=s.replace('if [ "$fifo_rc" = 0 ]; then printf', 'if [ "$fifo_rc" = 0 ]; then {hashes} printf',1)
s=s.replace("""    label=f'replay-{repeat}'
    text=command""","""    label=f'replay-{repeat}'
    record=out/(label+'.json')
    if record.exists():rows.append(json.loads(record.read_text()));continue
    text=command""")
p.write_text(s)
compile(s,str(p),'exec')
print('runner syntax OK')
