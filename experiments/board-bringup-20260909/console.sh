#!/usr/bin/env bash
# Run in WSL Ubuntu. Log names are unique; existing captures are preserved.
set -euo pipefail
test_root=$(cd -- "$(dirname -- "$0")" && pwd)
label=${1:-board}
case "$label" in *[!a-zA-Z0-9_-]*|'') printf 'Use letters, digits, underscores or hyphens for the label.\n' >&2; exit 2 ;; esac
port=/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_UART_SERIAL-if00-port0
[ -e "$port" ] || { printf 'UART not attached to WSL. Check usbipd list for 0403:6001.\n' >&2; exit 1; }
if fuser "$(readlink -f "$port")" >/dev/null 2>&1; then
  printf 'UART is busy. Exit the existing picocom session with Ctrl+A, Ctrl+X.\n' >&2
  exit 1
fi
mkdir -p "$test_root/logs"
log="$test_root/logs/$(date -u +%Y%m%dT%H%M%SZ)-$label-$$.log"
printf 'UART log: %s\n' "$log"
exec picocom -b 115200 --databits 8 --parity n --stopbits 1 --flow n --logfile "$log" "$port"
