from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
for root in (Path('/path/to/wally-game-console'),r/'latest'):
    p=root/'examples/rasterix/BreakoutRenderer.hpp';s=p.read_text()
    old='// The fixed vocabulary fits one 4096-byte RGBA4444 texture page.'
    new='// The fixed vocabulary uses a 64x32 RGBA4444 texture (4096 bytes).'
    assert s.count(old)==1
    p.write_text(s.replace(old,new))
p=r/'upstream-reproducer/README.md';s=p.read_text()
s=s.replace('The 32x32 texture and the Breakout font are too small to reveal this failure.', 'The 32x32 texture uses one 2048-byte page. The 64x32 Breakout font occupies two pages and matched the reference in the checked game frames; this does not establish immunity under all possible input timings.')
p.write_text(s)
print('Updated the font-size comment to avoid the obsolete one-page claim. No executable code changed.')
