#!/usr/bin/env bash
# Run the archived APB test without touching hardware or the source checkout.
set -euo pipefail
if [[ $# != 2 ]]; then
  printf 'Usage: bash run-apb.sh WALLY_CHECKOUT NEW_OUTPUT_DIRECTORY\n' >&2
  exit 2
fi
repo=$(realpath "$1")
output=$(realpath -m "$2")
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
test -f "$repo/fpga/src/rasterix_apb.sv"
test -f "$script_dir/回路試験/tb_apb.sv"
if [[ -e "$output" ]]; then
  printf 'Choose a new output directory; refusing to overwrite: %s\n' "$output" >&2
  exit 2
fi
mkdir -p "$output"
verilator --version > "$output/tool-version.txt"
git -C "$repo" rev-parse HEAD > "$output/source-revision.txt"
sha256sum "$repo/fpga/src/rasterix_apb.sv" \
  "$script_dir/回路試験/tb_apb.sv" > "$output/source-sha256.txt"
verilator --binary --timing --assert -Wno-fatal \
  --top-module tb_apb --Mdir "$output/build" \
  "$repo/fpga/src/rasterix_apb.sv" \
  "$script_dir/回路試験/tb_apb.sv" > "$output/build.log" 2>&1
"$output/build/Vtb_apb" | tee "$output/result.log"
grep -q '^APB_PASS:' "$output/result.log"
