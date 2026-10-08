from pathlib import Path
import difflib,hashlib,json,subprocess,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008')
d=r/'upstream-reproducer'
a=(d/'CommandParser-original.v').read_text();b=(d/'CommandParser.v').read_text()
(d/'candidate-fix.patch').write_text(''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='a/rtl/RasterIX/CommandParser.v',tofile='b/rtl/RasterIX/CommandParser.v')))
old=subprocess.check_output(['git','-C','/path/to/wally-game-console/addins/rasterix','show','9fdcf97a31b2e4247594e06d605871980cd5e9e1:rtl/RasterIX/CommandParser.v'])
info={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'official_revision':'9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0','prior_revision':'9fdcf97a31b2e4247594e06d605871980cd5e9e1','parser_identical_in_old_and_new':old==a.encode(),'original_sha256':hashlib.sha256(a.encode()).hexdigest(),'unmodified_cases':12,'unmodified_failures':6,'external_candidate_cases':12,'external_candidate_failures':0,'candidate_applied_to_repository':False,'hardware_candidate_tested':False}
(d/'result.json').write_text(json.dumps(info,indent=2)+'\n')
(d/'README.md').write_text('''# CommandParser stalls and sparse source transfers

This is an external diagnostic, not a change to the RasterIX submodule or the game-console repository. The official submodule remains unmodified. A proposed fix is saved only to isolate the cause; it has not been validated as a complete upstream fix or used in any board performance measurement.

## Evidence

The source is held valid with unchanged data until a VALID && READY handshake. Each texture command contains eight distinct 2048-byte page addresses. The texture sink stops for 0, 100 or 500 cycles after each accepted address. Source gaps are 0, 5, 20 or 100 cycles. No Wally, APB bridge, FIFO, SDRAM controller or texture sampler is part of this reproducer.

The unmodified parser passes 6/12 cases and fails the six cases with both gaps and sink stalls. For gap 5 and stall 100 the received page numbers are 0, 1, 1, 2, 2, 3, 4, 5 instead of 0..7. A source word can be copied into the skid register when upstream READY is zero, before it has been accepted. The stream counter can also advance without a source handshake.

The candidate requires a source handshake before taking a source word. It passes all twelve cases. This supports the fault mechanism in the parser, but does not establish an exhaustive repair.

A separate board test shows a 64x64 texture has correct first two pages, then repeats page 1 at page 2, matching this mechanism. The 32x32 texture and the Breakout font are too small to reveal this failure. The board's 256x256 texture also fails. The same parser source was present in the prior pinned revision; this is not a new parser regression introduced by the update.

## Files

- `../scripts/test-command-parser.cpp`: independent input/output scoreboard.
- `../logs/parser-test.log`: unmodified failure output.
- `../logs/parser-fixed-test.log`: candidate comparison.
- `candidate-fix.patch`: diagnostic-only patch; not applied to official sources.
- `../board-v2/mailbox/texture-probe-v3`: real-board observations and RGB565 pixel data.

The observed Breakout correctness and throughput are recorded separately. Do not describe the system as validated for arbitrary textured graphics.
''')
print(json.dumps(info))
