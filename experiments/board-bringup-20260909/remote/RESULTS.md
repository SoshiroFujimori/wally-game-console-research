# Nexys Video Wally hardware qualification — 2026-09-09

Status: REMOTE CHECKS COMPLETED. CoreMark, both DDR3 stages, SD write/readback, and three reconfiguration boots passed. Physical cold power cycling and all slide-switch positions remain untested by the assistant. This file is outside the CVW checkout and is not part of the proposed board-support changes.

The target checkout is `/path/to/wally-game-console`, branch `main`, HEAD `dfd37833a7f5d243998e41e301ec1a86178afe2f`. No commit or staging operation was performed. The design is Wally alone, with a 20 MHz CPU and 512 MiB DDR3 on `xc7a200tsbg484-1`.

## Results

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Source and programmed-artifact identity | PASS | All hardware source hashes and the Wally bitstream match the original build manifest. Only the README was corrected afterward. See `reviewed-source-provenance.json`. |
| Routed timing | PASS under the declared constraints | WNS 0.059 ns, WHS 0.022 ns, zero failing setup/hold endpoints. |
| Vivado design checks | No DRC errors; warnings remain | 80 DRC warnings; CDC warnings occur inside vendor MIG / AXI converter IP. This is not a warning-free build. |
| Test-package SD transfer | PASS | Host copied only `/nexys-video-tests` into partition 4, unmounted/remounted, and verified SHA-256. The three boot partitions matched the prepared images and were unchanged. The board subsequently verified the package hashes. |
| Linux boot and board information | PASS, three successive reconfiguration boots after correcting the SDWire3 handoff | Captures labelled `boot-2-usb-detached`, `boot-repeat-2`, and `boot-repeat-3`; each reached root login without an extra CPU-reset-button operation. All three corresponding information checks reported `INFO_PASS`, MemTotal 503340 KiB, and the SD partition. |
| SD write, remount, and persistence | PASS | Wrote 23608 bytes to a new file in the external test folder on partition 4. SHA-256 matched after unmount/remount and again after both subsequent FPGA reconfigurations. |
| Existing CoreMark, performance inputs | PASS | 600 iterations in 13.142 s; 45.655151 iterations/s; `Correct operation validated.` and exit 0. |
| Existing CoreMark, validation inputs | PASS | 600 iterations in 13.230 s; `Correct operation validated.` and exit 0. |
| DDR3, 256 MiB selected tests | PASS | 3027.58 s; locked allocation; one iteration, mask `0x18081`; all five tests reported `ok`, `MEMTESTER_EXIT=0`, and `WIDE_PASS`. |
| DDR3, 16 MiB all patterns | PASS | 3084.10 s; full locked allocation; all 18 checks reported `ok`, `MEMTESTER_EXIT=0`, `PATTERNS_PASS`, and `MEMORY_PASS`. Overall UART command exit was 0. |
| Linux after memory stress | PASS within observed scope | `INFO_PASS`; MemTotal 503340 KiB, MemAvailable 429064 KiB; no memtester process remained. Saved dmesg contains no kernel panic, Oops, OOM event, or I/O error. |
| Physical cold power cycling / all switch positions | Not performed by the assistant | SDWire3 does not operate the board power switch or slide switches. Previous user-reported LED and SW0 checks are separate evidence. |

The run counts and memory sizes are initial board-bring-up checks selected for this task, not an official CVW acceptance standard. Memtester exercises the normal cached Linux memory path. It does not cover every physical address, reserved Linux regions, or all electrical/temperature conditions, and its narrow stores do not independently prove every AXI transfer size. The complete memory command took 6115.23 seconds (1 h 41 min 55 s), including setup and both stages. The original raw UART capture and a version with terminal progress editing resolved are `20260908T194035Z-ddr-memory.raw` and `ddr-memory-readable.txt`.

The initial SD write/read command completed its copy and sync, then could not unmount because the interactive shell's current directory was still on the card from the earlier CoreMark command. This procedural failure is preserved in `20260908T212345Z-sd-write-read.raw`. After `cd /`, the ordinary unmount/remount and checksum check succeeded in `20260908T212449Z-sd-write-read-finish.raw`; no forced unmount or overwrite was used. Both later `info-repeat-*` captures also report `SD_PERSISTENCE_PASS`. The test file is `nexys-video-tests/sd-roundtrip-20260909-1.bin`, with SHA-256 `42cbe69b28b1929235af054b20b61282f54e6f105c5f93807bcfd19778775943`.

## Use of existing CVW tests

The unmodified `addins/coremark` submodule at `f3e8f2e0941e42961aadcc52750b1b5577c157c9` was built through its existing Linux/POSIX port using the target Buildroot GCC 15.2.0 toolchain, `-O2 -march=rv64gc -mabi=lp64d`, automatic iteration selection, and a 2000-byte working size. Output was placed outside the checkout and copied to SD. Both runs exceeded ten seconds and passed the benchmark's expected CRC checks.

Commands on the board:

```sh
/mnt/nexys-test/nexys-video-tests/coremark.exe 0 0 0x66 0 7 1 2000
/mnt/nexys-test/nexys-video-tests/coremark.exe 0x3415 0x3415 0x66 0 7 1 2000
```

The bundled `make check` MD5 manifest is stale relative to this clean submodule revision: three files differ from the manifest. Upstream changes since `4250c56` consist of comment spelling corrections and zero-initialization of the local `list_data info`. No source or checksum file was altered to hide this discrepancy. These results are functional runs of the recorded CVW dependency, not an independently certified benchmark submission. See `coremark-source-check.log` and the two `coremark-*.raw` captures.

The CVW `tests/custom/lpddrtest/lpddr_test.s` writes and reads only ten 64-bit words and does not compare the readback with expected values. The GPIO examples and architecture tests use bare-metal/simulation startup or privileged execution; they are not directly executable as Linux user programs. They were inspected but not misreported as hardware test passes.

For broader memory coverage, unmodified memtester 4.7.1 was built outside the checkout with the same target toolchain. Its source archive SHA-256 matches Buildroot's existing `package/memtester/memtester.hash`. The external `board-tests.sh` requires the full requested allocation to be locked, rejects allocation reduction or failure messages, and requires successful process exit.

## SDWire3 fixture and initial failed attempt

The first attempt with the SDWire3 USB device still attached to the host stalled during SD initialization. A driver handoff performed during that attempt changed its behavior, but the capture ultimately timed out. That attempt remains recorded as unsuccessful in `20260908T193125Z-boot-1.raw`; it is excluded from successful boot counts.

After force-binding the identified SDWire3 device and leaving its USB side detached, the unchanged Wally bitstream initialized the card and booted Linux. The fixture uses a separate external FPGA image that drives the board's SD reset pin high to switch off the slot before reconfiguration. Its source, Tcl, bitstream, and logs are all outside the target repository. It does not add a reset delay, counter, or SDWire3 mode to Wally's HDL.

Device identities: JTAG target `Digilent/210276BE7FCBB`; UART `FT232R_USB_UART_UART_SERIAL`, 115200 baud; SDWire3 serial `SDWIRE_CONTROL_SERIAL`. Operations on these devices were serialized. The device's host/target handoff is a test-fixture condition, not a new board-support feature.

Repeated loading of the fixture and Wally images resets/reconfigures the FPGA and cycles the SD-slot supply. It does not switch off the board's 12 V supply, so those trials must be called reconfiguration boots rather than cold power-on tests.

The existing Linux image also prints missing `/sbin/ifup` and cron-directory messages. These image-configuration issues were not changed or claimed fixed by this board-support review. OpenSBI 1.7 successfully relocates the FDT to `0x82200000`, within available RAM; the README's previous instruction to rebuild OpenSBI to preserve `0x9f000000` was removed as unnecessary.

## Repository scope review

The review applies the general requirement that changes should be suitable for ordinary CVW board support. Excluding SDWire3 is one consequence of that requirement. RVSOC section 4.3 and the existing board top levels / generator files were used for naming, signal types, port connections, and placement of board-specific configuration.

| Paths in the proposed change | Why retained |
| --- | --- |
| `config/derivlist.txt` | A `fpganexysvideo` derivative limits external memory to 512 MiB. |
| `fpga/src/fpgaTopNexysVideo.sv` | Board ports, Wally-to-DDR3 connection, clock/reset domains, UART, GPIO, and SPI microSD. Slot power is held on with the board's normal reset-pin level. |
| `fpga/constraints/constraints-nexysvideo.xdc` | Nexys Video pin locations, correct board voltages, synchronizer exceptions, and SPI timing budgets. |
| `fpga/generator/ddr3-nexysvideo.tcl`, `xlnx_ddr3-nexysvideo-mig.prj` | Generate MIG for the board's 512 MiB DDR3, physical pinout, and 64-bit AXI interface. |
| `fpga/generator/mmcm-nexysvideo.tcl` | Generate the 100 MHz MIG input, 200 MHz reference, and 20 MHz CPU clock. |
| `fpga/generator/Makefile`, `wally.tcl` | Add the board to the existing generation flow and select its top, constraints, and memory/clock IP. Create the existing simulation-output directory before writing the synthesized netlist. |
| `fpga/generator/ahbaxibridge.tcl`, `clkconverter.tcl` | Set the Nexys Video bridge's narrow-burst option and clock-frequency metadata without changing other board settings. |
| `linux/devicetree/wally-nexysvideo.dts` | Describe the actual memory size and CPU/timebase/UART clocks to Linux. |
| `fpga/README.md` | Add ordinary build, SD-image, connector, GPIO, and reset usage to the shared board documentation. Correct the existing SD-directory typo. |

The change set contains 12 paths. `setup.sh` is identical to HEAD and retains `WALLY`; there is no new `nexys_repo` environment convention. No SDWire3-specific code, helper script, test program, separate board Markdown file, RasterIX change, or Japanese text has been added to the target checkout. `git diff --check` passes; the index is empty and the CoreMark submodule worktree is clean.

The recorded DRC warnings are BUFC-1 (2), DPIP-1 (50), DPOP-1 (11), DPOP-2 (15), REQP-1709 (1), and RTSTAT-10 (1). The buffer / PLL warnings point into MIG; DSP pipeline suggestions concern the inherited Wally FPU/multiplier. CDC-8 (2) points into MIG reset synchronization and CDC-15 (1) into the vendor AXI clock converter. These warnings were retained in the evidence, not suppressed by changes to vendor or CPU RTL.

The main bitstream SHA-256 is `0d562f25ea7ab34ca70d2b87fee9ff53cd4f8f10ff49da2d99291e496b828c3d`. Exact source, boot-image, external-fixture, and test-binary hashes are in `reviewed-source-provenance.json`; the original build manifest is preserved separately. `reviewed-complete.patch` also preserves the added files without staging them. Routed timing, DRC, and CDC reports were copied to `build-evidence/`. The old parent-directory `provenance.json` describes pre-test preparation and is not the current hardware-results record; use this document and `results.json` for the completed run.

## State left after testing

The standard Wally bitstream is running Linux with a root console ready. Partition 4 is unmounted, as shown in `20260908T213323Z-final-board-state.raw`. UART capture processes are closed and the owned `hw_server` process was stopped. JTAG (USB bus 9-2) and UART (10-2) remain attached to WSL. SDWire3 (8-3) remains force-bound and detached from host access, in the target-usable configuration that passed these tests. Test data and all host evidence remain outside the proposed Git change set.
