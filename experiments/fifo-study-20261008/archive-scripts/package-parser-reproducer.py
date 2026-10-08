from pathlib import Path
import datetime,hashlib,json,shutil
root=Path('/path/to/research/experiments/fifo-study-20261008')
source=Path('/path/to/wally-game-console/addins/rasterix')
out=root/'upstream-reproducer/portable';assert not out.exists();out.mkdir()
items={root/'upstream-reproducer/CommandParser-original.v':'CommandParser-original.v',root/'upstream-reproducer/CommandParser.v':'CommandParser-candidate.v',root/'scripts/test-command-parser.cpp':'test-command-parser.cpp',root/'upstream-reproducer/candidate-fix.patch':'candidate-fix.patch',source/'rtl/RasterIX/RegisterAndDescriptorDefines.vh':'RegisterAndDescriptorDefines.vh',source/'LICENSE':'LICENSE'}
for origin,name in items.items():shutil.copy2(origin,out/name)
original=(out/'CommandParser-original.v').read_bytes()
assert original==(source/'rtl/RasterIX/CommandParser.v').read_bytes()
manifest={'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'official_revision':'9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0','original_parser_sha256':hashlib.sha256(original).hexdigest(),'files':{name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in items.values()},'scope':'Diagnostic-only copies; official RasterIX and the product checkout are not modified. The candidate is not an accepted product fix or a complete correctness proof.'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(str(out))
