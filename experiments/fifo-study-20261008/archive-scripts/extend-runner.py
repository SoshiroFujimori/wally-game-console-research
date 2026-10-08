from pathlib import Path
p=Path('/path/to/research/experiments/fifo-study-20261008/scripts/run-board.py')
s=p.read_text()
s=s.replace('&& chmod +x /tmp/fifo-bench /tmp/fifo-game && sha256sum /tmp/fifo-bench /tmp/fifo-game',
'&& gzip -dc /mnt/fifo-study/fifo-study-20261008/texture2d.gz > /tmp/fifo-texture2d && chmod +x /tmp/fifo-bench /tmp/fifo-game /tmp/fifo-texture2d && sha256sum /tmp/fifo-bench /tmp/fifo-game /tmp/fifo-texture2d')
s=s.replace("    assert manifest['bench']['sha256'] in text and manifest['game']['sha256'] in text","    assert manifest['bench']['sha256'] in text and manifest['game']['sha256'] in text\n    assert json.loads((o/'texture2d-install.json').read_text())['sha256'] in text")
# Keep the texture regression separate from performance cases and run it after the initial smoke gate.
s=s.replace("# A latest-source product validation is separate", """if not (out/'texture2d.json').exists():
    text=command('texture2d','/tmp/fifo-texture2d',240)
    assert 'TEXTURE_2D_PASS' in text and text.count('pixels=307200 mismatches=0')==3
    (out/'texture2d.json').write_text(json.dumps({'passed':True,'checks':re.findall(r'TEXTURE_CHECK.*',text)},indent=2)+'\\n')
    print(kind,'TEXTURE_2D_PASS',flush=True)
# A latest-source product validation is separate""")
p.write_text(s)
with (p.parent.parent/'PROTOCOL.md').open('a') as f:
    f.write('\n## Additional upstream-update regression\nBefore the first updated-board run, add independent 2D checker textures sized 32x32, 64x64 and 256x256. This covers one-page and multi-page upload paths changed by the official RasterIX update. The analytical RGB565 reference checks the whole framebuffer. It is a correctness test, not a 3D workload or a new rendering optimization.\n')
print('RUNNER_TEXTURE_REGRESSION_ADDED')
