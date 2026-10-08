# Wally / official RasterIX integration: current qualified results

Status: the current integration refinement passed implementation checks and the bounded hardware tests below on 9 September 2026. The capture startup issue described below remains unresolved. The qualified source was committed and pushed to main as e3fa2b94 and b3c4f6b9; this is not a guarantee of arbitrary game performance or of capture recovery after every reconfiguration.

This report supersedes the earlier bitstream results. The previous report is preserved in `upstream-refinement/resumed-20260909T184812/RESULTS-before-resume.md`.

Linux evidence root: `/path/to/research/experiments/rasterix-integration-20260909`. Paths below are relative to this root unless marked otherwise. Windows capture root: `C:/Users/researcher/.codex/tmp/rasterix-integration-20260909`.

## Source and hardware identity

- Checkout: `/path/to/wally-game-console`, branch main, published commit `b3c4f6b91be0b3a3729a0aa72142d45b76aedcab` (CPU fix `e3fa2b94faf160f7edfcc3f1b615f1e3c5367c45`, integration `b3c4f6b91be0b3a3729a0aa72142d45b76aedcab`). The qualified source bytes are unchanged from the pre-publication manifest based on `f0764f003f7c55197882bc1b2f90c84132395472`.
- Official submodule: `https://github.com/ToNi3141/RasterIX.git`, commit `9fdcf97a31b2e4247594e06d605871980cd5e9e1`. RasterIX and its recursive Float and HyperRAM dependencies are unmodified.
- Board: Nexys Video, `xc7a200tsbg484-1`, Digilent target `210276BE7FCBB`.
- Clocks: Wally 20 MHz, RasterIX/DDR UI 100 MHz, pixel clock approximately 25.2 MHz, serial clock approximately 126 MHz.
- DDR3: 512 MiB. Its last 32 MiB, starting at `0x9e000000`, is reserved for graphics. Live CPU, timebase and UART device-tree clocks all report 20 MHz; live memory and reserved-region properties match the bitstream configuration.
- RasterIX_IF: 64-bit memory port, one texture unit, 65536-pixel internal buffer; the unchanged upstream software draws the 640x480 image in strips.
- Current bitstream: `upstream-refinement/fpgaTop.bit`, SHA256 `f7bc0386db7da40077f04691feb45e50df4118d513bbe4985a84e00a07d29a13`. It is byte-identical to the checkout's `fpga/generator/WallyFPGA.runs/impl_1/fpgaTop.bit`.
- `upstream-refinement/source-manifest.json` matches all 39 recorded source files. No source changes were made after the saved synthesis or during this resumption. `upstream-refinement/final-verification.json` records the final check.

## RVSOC/CVW refinement

The CPU exposes a generic external APB interface using `EXT_IO_SUPPORTED`, `EXT_IO_BASE` and `EXT_IO_RANGE`. The optional FPGA `RASTERIX_SUPPORTED` selection belongs to the board integration. The ordinary Makefile option controls the renderer's IP prerequisites and board selection, and Tcl rejects unsupported board/configuration combinations. This follows the existing separation of configuration parameters, bus interfaces and FPGA wiring; it does not imply upstream author approval.

DDR reset and loss of DDR calibration enter the existing processor-system-reset IP through its separate external and auxiliary inputs. The previous combinational OR before the pixel-domain reset synchronizer is removed. Clock-lock loss and board reset retain the video clock reset path. The reset tests and current CDC report check this exact wiring.

The independent Wally LSU correctness fix remains: a page/access-faulting memory request is blocked immediately, even when an outstanding instruction fetch delays trap entry. Previously, the first command through a newly faulted Linux MMIO mapping could be sent twice. Hardware ILA captures identified the faulting request and delayed trap. A separate simulation regression with an injected instruction-fetch delay observed 20 command transfers for 10 faults before the fix and 10 afterward. This is a correctness issue, not a GPU performance measurement. See `fault-fix-production/delayed-page-fault.md` and the separate review patch `upstream-refinement/cpu-fault-fix.patch`.

## Implementation qualification

The normal `make nexysvideo-rasterix` project had completed synthesis before the requested pause. After reboot, the saved source and synthesis hashes were verified; ordinary placement, routing, post-route optimization and bitstream generation were rerun in the same project with unchanged settings. No incremental placement/routing reference was used. `upstream-refinement/resumed-20260909T184812/` contains the resumption scripts and logs.

| Check | Final result |
| --- | --- |
| Setup slack | +0.170 ns |
| Hold slack | +0.008 ns |
| Pulse-width violations | 0 |
| Routed nets | 115858 / 115858 |
| Routing errors | 0 |
| DRC errors | 0 |
| DRC warnings | 220, expanded without message truncation and reviewed |
| Bus-skew constraints | All 19 pass; minimum slack 8.858 ns |
| Unconstrained internal endpoints | 0 |
| Critical CDC rows | 0 |
| SD maximum-delay constraints | Pass for clock, command and chip select |

The expanded DRC report retains the original rule severities. The 88 asynchronous-RAM warnings concern two unchanged upstream DVI FIFO memories; reset discards FIFO pointers and valid state and refills the FIFO, rather than relying on retained reset-time contents. Remaining warnings include upstream/AMD DSP, FIFO and MIG recommendations. CDC warnings cover the reviewed address handshake and AMD IP crossings; functional simulation does not prove absence of analog metastability. See `upstream-refinement/report-review.json`, `drc-expanded.rpt`, `cdc.rpt`, `check_timing.rpt`, `bus_skew.rpt`, `timing_summary.rpt` and `hardware-qualified.json`.

## Tests of the unchanged source before the build

| Check | Result and evidence under upstream-refinement |
| --- | --- |
| Existing CVW integer tests | 50 pass: `arch64i.log` |
| Existing CVW Sv39 tests | 37 pass: `sv39.log` |
| External APB adapter | Data lanes, backpressure, response wait, ID and frame count pass: `test-apb.log` |
| Display swap adapter | Four swaps with asynchronous clocks, backpressure and delayed read responses pass: `test-display.log` |
| Reset wiring with actual AMD functional models | 13 releases: initial plus three each of DDR reset, calibration loss, board reset and clock-lock loss: `reset-test.log` |
| Configuration selection | Two Make dependency cases and six Tcl cases pass: `configuration-tests.json` |
| Renderer-disabled configurations | Two configurations elaborate with vendor port stubs: `disabled-elaboration.json` |
| Repository hooks | Pass without changing files: `pre-commit.log` |

## Hardware tests on the current bitstream

All tests in this section used the same current bitstream listed above. `upstream-refinement/hardware-results.json` binds the boot records, commands and UART logs to its SHA256.

| Check | Result |
| --- | --- |
| Reconfiguration and Linux boot | Three consecutive cycles pass; these are reconfiguration tests, not physical board power cycles |
| Live device tree | CPU/timebase/UART clocks, RAM and graphics reservation match |
| Red framebuffer | All 307200 pixels equal RGB565 f800; FNV-1a 4ed49dc5 |
| Cold MMIO readback | Three additional red full-frame reads after Linux page-cache drops pass |
| Green framebuffer | All 307200 pixels equal 07e0; FNV-1a 9db75dc5 |
| Blue framebuffer | All 307200 pixels equal 001f; FNV-1a cea0ddc5 |
| Triangle | Whole-frame FNV-1a ac4762fd; 1118 colors; matches the recorded reference |
| Official Minimal cube, four frames | Whole-frame FNV-1a 785d98a6; 282 colors; matches the recorded reference |
| Upstream DeviceDataUploader | Pseudorandom read/write comparisons pass at 64, 256, 4096 and 65536 bytes |
| Existing CoreMark | Correct operation validated: 600 iterations, 13.359 seconds, 44.913541 iterations/second |
| memtester | 4 MiB locked test, mask 0x18081: address, random, sequential, 8-bit and 16-bit checks all pass |
| Executable identity | All three on-board SHA256 values match the supplied demo, frame checker and memory test |
| Sustained cube | 3600 frames complete; every sampled software progress value matches the hardware completion count |

The triangle/cube reference hashes are regression comparisons, not independent proofs of rasterizer mathematics. The memory test covers 4 MiB rather than all DDR3. CoreMark used GCC 15.2.0 with `-O2 -march=rv64gc -mabi=lp64d -lrt`. The 3600-frame command took 124.9016 seconds including program startup, final sync and SD unmount; it is not an isolated GPU throughput measurement. Detailed motion evidence is `upstream-refinement/motion-result.json` and its referenced raw UART log.

The first device-tree inspection command failed because the target BusyBox build does not include `od`. The external test runner was changed to the available `xxd` applet, and all five properties were checked individually. Three already completed boot tests were retained. The failed attempt is preserved as `hardware-results.json.before-hexdump` and in `hardware-results.json` under `harness_issues`; no repository or target software change was needed.

## Fresh HDMI recording and remaining capture limitation

Current recording under the Windows capture root:

`refined-final-cube-4-3-40s/2026-09-09 20-15-55.mp4`

SHA256: `f13085241ac642d4c5c8ac287fbd84046165bbfc43e252824d1a4fbb8f21223d`.

The file contains 2397 H.264 frames over 39.95 seconds at a 60 Hz capture rate. Full decode succeeds. Freeze detection at -50 dB with a one-second threshold reports no events. Four actual recorded frames were extracted, and the 10- and 30-second frames were visually inspected. They show coherent, different cube orientations and centered 4:3 content. The entire recording falls within the successful 3600-frame run; `hardware-provenance.json` alongside it binds the video to the exact bitstream, source manifest and UART evidence.

OBS requests 1280x960, scales uniformly by 1.125, and centers the 1440x1080 image at (240,0) in a 1920x1080 canvas, with no crop. The earlier horizontal stretching is absent. The official example deliberately places the red bar at the image's left edge and leaves a 40-pixel source-image margin after the blue bar on the right. The prior independent square geometry evidence remains in `capture-aspect-ratio.md`.

After the three FPGA reconfigurations, capture initially showed an unsupported-format or black image. Short source reopen operations and a temporary format change did not reliably restore it. The attempted Windows administrative device restart was canceled, so no tool-driven USB restart occurred. The source was later reactivated with its original settings during the cube run and the picture recovered. The sequence does not establish whether the root cause is transmitter startup, receiver locking or capture firmware, nor does it establish reliable automatic recovery after arbitrary reconfiguration. Stable cube capture and recording are verified; this startup issue remains an explicit limitation. Evidence is in the Windows `upstream-refinement-validation` directory.

Capture rate is not the number of new frames rendered by the GPU. The recording does not establish pixel-perfect color reproduction or exclude every possible tearing artifact. Complex game performance remains unmeasured.

## Final state and scope

The board is running the current f7bc0386 bitstream and displaying the final cube frame. The SD data partition is unmounted. Task-owned build/test/recording processes have ended, the UART has no reader, and the previously established JTAG hardware server is left available. OBS retains its corrected capture and scene settings; recording and streaming are inactive, and the previous recording directory and audio mute state are restored.

The checkout is clean on main at b3c4f6b91be0b3a3729a0aa72142d45b76aedcab, which matches origin/main and the remote main branch. RasterIX and its recursive submodules are clean; `setup.sh` is unchanged. Necessary existing testbench interface tie-offs remain in the integration diff. All new diagnostic tests, SDWire operations, recording scripts, logs and copied evidence remain outside the target repository. No SDWire-specific HDL is included. Two commits were published to origin/main under Codex <codex@openai.com>: e3fa2b94 separates the LSU fault fix, and b3c4f6b9 contains the RasterIX integration. No upstream messages were sent. Publication verification and commit logs are preserved in `upstream-refinement/publication-20260909T135218Z/`. Historical qualification and recording records retain the checkout state at the time of testing.
