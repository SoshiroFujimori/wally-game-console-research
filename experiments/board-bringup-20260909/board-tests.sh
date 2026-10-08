#!/bin/sh
# Temporary tests for the existing Nexys Video image; BusyBox ash needs no arithmetic.
set -eu
test_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$test_root"
fail() { printf '\nFAIL: %s\n' "$*" >&2; exit 1; }
trap 'printf "\nINTERRUPTED: this run is incomplete.\n" >&2; exit 130' INT TERM
[ "$(id -u)" = 0 ] || fail 'Run on the board as root.'
model=$(tr -d '\000' < /proc/device-tree/model)
[ "$model" = 'Wally on Digilent Nexys Video' ] || fail "Unexpected board: $model"
sha256sum -c SHA256SUMS || fail 'The SD test files failed verification.'

read_meminfo() {
  available_kib=0
  total_kib=0
  while read -r key value units; do
    case "$key" in
      MemTotal:) total_kib=$value ;;
      MemAvailable:) available_kib=$value ;;
    esac
  done < /proc/meminfo
}

info() {
  printf '\nBoard: %s\n' "$model"
  uname -a
  printf 'Uptime: '
  cat /proc/uptime
  read_meminfo
  printf 'MemTotal: %s KiB\nMemAvailable: %s KiB\n' "$total_kib" "$available_kib"
  [ "$total_kib" -ge 450000 ] && [ "$total_kib" -le 524288 ] || fail 'Unexpected Linux RAM capacity.'
  [ -b /dev/mmcblk0p4 ] || fail 'The SD filesystem partition is missing.'
  printf 'INFO_PASS\n'
}

switches() {
  saved_enable=$(devmem 0x10060004 32)
  trap 'devmem 0x10060004 32 "$saved_enable" >/dev/null' EXIT
  devmem 0x10060004 32 0xff
  for item in OFF:0x00000000 SW0:0x00000001 SW1:0x00000002 SW2:0x00000004 SW3:0x00000008 SW4:0x00000010 SW5:0x00000020 SW6:0x00000040 SW7:0x00000080 ALL:0x000000FF OFF:0x00000000; do
    label=${item%%:*}
    expected=${item#*:}
    case "$label" in
      OFF) printf '\nSet ALL switches OFF, then press Enter: ' ;;
      ALL) printf '\nSet ALL switches ON, then press Enter: ' ;;
      *) printf '\nSet ONLY %s ON (all others OFF), then press Enter: ' "$label" ;;
    esac
    read -r answer
    actual=$(devmem 0x10060000 32)
    printf '%s: expected=%s actual=%s\n' "$label" "$expected" "$actual"
    [ "$actual" = "$expected" ] || fail "Switch mapping mismatch at $label."
  done
  printf '\nSWITCHES_PASS\n'
}

memory_stage() {
  stage=$1
  amount=$2
  bytes=$3
  mask=$4
  output="$run_dir/$stage.log"
  printf '\nStarting %s: %s MiB, one iteration, mask=%s\n' "$stage" "$amount" "$mask"
  printf 'Stage start uptime: '
  cat /proc/uptime
  (
    if [ "$mask" = all ]; then
      unset MEMTESTER_TEST_MASK
    else
      MEMTESTER_TEST_MASK=$mask
      export MEMTESTER_TEST_MASK
    fi
    if "$test_root/memtester" "${amount}M" 1; then code=0; else code=$?; fi
    printf '\nMEMTESTER_EXIT=%s\n' "$code"
  ) 2>&1 | tee "$output"
  grep -qx 'MEMTESTER_EXIT=0' "$output" || fail "$stage did not finish successfully."
  grep -Fq "got  ${amount}MB (${bytes} bytes), trying mlock ...locked." "$output" || fail "$stage did not lock the requested memory allocation."
  if grep -Eq 'FAILURE|unlocked|reducing' "$output"; then fail "$stage reported an error or a reduced allocation."; fi
  printf 'Stage end uptime: '
  cat /proc/uptime
  printf '%s_PASS\n' "$stage"
}

memory() {
  read_meminfo
  [ "$available_kib" -ge 393216 ] || fail 'Need at least 384 MiB MemAvailable before the 256 MiB test.'
  ulimit -l unlimited || fail 'Could not raise the memory-lock limit.'
  run_dir="/tmp/nexys-video-memory-$(date +%Y%m%d-%H%M%S)-$$"
  mkdir "$run_dir"
  printf 'Detailed logs in RAM: %s\n' "$run_dir"
  printf 'The test has a finite run count. Runtime on this board has not been measured.\n'
  memory_stage WIDE 256 268435456 0x18081
  memory_stage PATTERNS 16 16777216 all
  printf '\nMEMORY_PASS\n'
}

case "${1:-}" in
  info) info ;;
  switches) switches ;;
  memory) memory ;;
  *) printf 'Usage: sh board-tests.sh {info|switches|memory}\n' >&2; exit 2 ;;
esac
