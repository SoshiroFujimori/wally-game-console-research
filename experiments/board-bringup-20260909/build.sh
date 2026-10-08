#!/usr/bin/env bash
# Build temporary board-test tools outside the CVW checkout.
set -euo pipefail
test_root=$(cd -- "$(dirname -- "$0")" && pwd)
repo=${WALLY:-/path/to/wally-game-console}
toolchain="$repo/linux/buildroot/output/host/bin/riscv64-buildroot-linux-gnu"
src="$test_root/source/memtester-4.7.1"
mkdir -p "$test_root/package" "$test_root/logs"
cd "$test_root/source"
printf '%s\n' 'e427de663f7bd22d1ebee8af12506a852c010bd4fcbca1e0e6b02972d298b5bb  memtester-4.7.1.tar.gz' | sha256sum -c -
"${toolchain}-gcc" -O2 -march=rv64gc -mabi=lp64d \
  -DPOSIX -D_POSIX_C_SOURCE=200809L -D_FILE_OFFSET_BITS=64 \
  -DTEST_NARROW_WRITES "$src/memtester.c" "$src/tests.c" \
  -Wl,--build-id -s -o "$test_root/package/memtester"
cp "$test_root/board-tests.sh" "$test_root/package/board-tests.sh"
cp "$src/COPYING" "$test_root/package/MEMTESTER-COPYING"
cp "$src/memtester.8" "$test_root/package/memtester.8"
make -C "$repo/addins/coremark" compile PORT_DIR=linux CC="${toolchain}-gcc" \
  OPATH="$test_root/package/" XCFLAGS="-march=rv64gc -mabi=lp64d" ITERATIONS=0
cp "$repo/addins/coremark/LICENSE.md" "$test_root/package/COREMARK-LICENSE.md"
chmod 755 "$test_root/package/memtester" "$test_root/package/board-tests.sh"
cd "$test_root/package"
sha256sum memtester board-tests.sh MEMTESTER-COPYING memtester.8 coremark.exe COREMARK-LICENSE.md > SHA256SUMS
"${toolchain}-readelf" -h -l -A memtester > "$test_root/logs/memtester-elf.txt"
python3 - "$repo" "$test_root" <<'PY'
import hashlib
import json
import pathlib
import subprocess
import sys

repo, root = map(pathlib.Path, sys.argv[1:])
def digest(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()

manifest = json.loads((repo / 'fpga/generator/reports/nexysvideo_manifest.json').read_text())
assert subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip() == manifest['head']
for name, expected in manifest['source_sha256'].items():
    if name == 'fpga/README.md':  # Documentation was corrected after the bitstream build.
        continue
    assert digest(repo / name) == expected, name
bit = repo / 'fpga/generator/WallyFPGA.runs/impl_1/fpgaTop.bit'
assert digest(bit) == manifest['bitstream_sha256']
images = repo / 'linux/buildroot/output/images'
manifest['boot_images'] = {
    name: {'size': (images / name).stat().st_size, 'sha256': digest(images / name)}
    for name in ['wally-nexysvideo.dtb', 'fw_jump.bin', 'Image']
}
manifest['memtester_version'] = '4.7.1'
manifest['memtester_source_sha256'] = 'e427de663f7bd22d1ebee8af12506a852c010bd4fcbca1e0e6b02972d298b5bb'
manifest['memtester_sha256'] = digest(root / 'package/memtester')
manifest['coremark_sha256'] = digest(root / 'package/coremark.exe')
manifest['coremark_head'] = subprocess.check_output(['git', '-C', str(repo / 'addins/coremark'), 'rev-parse', 'HEAD'], text=True).strip()
manifest['compiler_flags'] = '-O2 -march=rv64gc -mabi=lp64d -DPOSIX -D_POSIX_C_SOURCE=200809L -D_FILE_OFFSET_BITS=64 -DTEST_NARROW_WRITES -Wl,--build-id -s'
manifest['hardware_tests_run_by_assistant'] = False
manifest['memory_plan'] = [{'mib': 256, 'iterations': 1, 'mask': '0x18081'}, {'mib': 16, 'iterations': 1, 'mask': 'all'}]
(root / 'provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Build complete. Board execution has not been performed.')
PY
