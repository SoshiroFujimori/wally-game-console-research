# Command transport and software comparison results

These results concern the fixed revisions in [README.md](README.md). Functional
simulation and board measurements are separate sections. The product checkout
and official RasterIX submodule remain unchanged.

## Completed simulation

The standalone, unmodified `FrameStreamingCore` passed 224 cases containing
448 transfers. The cases include random AXI stalls, command-consumer stalls,
repeated transfers, 64-byte alignment, and transfer ranges crossing a 4 KiB
address boundary without an individual AXI burst crossing it. See
[dma-sim-result.log](results/dma-sim-result.log) and
[dma-sim.csv](results/dma-sim.csv).

The complete `RasterIX_IF` model uses generic UNITTEST RAM, synthetic DDR,
random AXI backpressure, and a modeled display acknowledgement. It contains no
Wally core, APB bridge, clock-domain crossing, MIG, or HDMI transmitter. The
`apb` case label means direct word delivery to the command stream, with gaps
representing a CPU-fed source. It is not a simulation of the APB bus itself.

Each table entry has 12 cases per transport. Quad workloads cover three game
states, two command gaps, and two random seeds. Every case checks four completed
images, each containing 307,200 pixels. Texture workloads cover three sizes,
two command gaps, and two seeds. They render four images and compare the final
image with the reference. The gap values are 0 and 16 modeled GPU cycles.

| RTL variant | Quad input by words | Quad input by internal DMA | Texture input by words | Texture input by internal DMA |
| --- | ---: | ---: | ---: | ---: |
| Unmodified upstream | 12/12 | 0/12 | 8/12 | 0/12 |
| DMA read buffer | 12/12 | 12/12 | 8/12 | 4/12 |
| DMA read buffer and parser handshake candidate | 12/12 | 12/12 | 12/12 | 12/12 |

All failures are retained alongside successes. Counts can be recalculated from
[functional-cases.csv](results/functional-cases.csv). The selected logs and
their raw/public hashes are listed in [manifest.json](results/manifest.json).
Public copies may have identifying paths replaced; they are not byte-identical
raw originals.

## What the failures establish

In the unmodified DMA case, a command-read response is held while the renderer
waits for framebuffer-read data queued behind it. The renderer cannot consume
more commands until that framebuffer read completes. The command DMA therefore
cannot accept its response, preventing the shared read channel from advancing.
This is a circular wait in this model. Returning accepted reads in request
order is legal AXI behavior; the memory model does not withdraw `RVALID` or
change a held response when `RREADY` is low. The test does not establish that
the board's MIG/interconnect will reproduce the same ordering.

A research-only candidate inserts a 64-word, 32-bit read FIFO before the DMA
port joins the common AXI path. `FIFO_DELAY=1` reserves room for an entire burst
before allowing its address request through. Thus the shared return path can
finish that burst even when the renderer stops consuming commands. This passes
the tested quad cases. Sending only 64-byte command batches without this FIFO
did not resolve the observed stall.

The read FIFO does not resolve every texture error. The independent parser
candidate processes an input word only on a `VALID && READY` acceptance, including
the relevant skid-buffer paths. The combined candidate passes the listed
texture cases. These finite tests do not prove either candidate correct for
every command, texture configuration, or memory implementation.

The DMA FIFO above is different from the published 512-word APB-to-command
asynchronous FIFO: it is on an AXI read-return path in the GPU clock domain.
Its purpose in this experiment is to break the demonstrated shared-memory
dependency, not to cross the CPU/GPU clock boundary.

The unmodified model was also tested with a larger internal working buffer
(`FRAMEBUFFER_SIZE_IN_PIXEL_LG=17`). Quad input by words passed 12/12, word-fed
textures passed 8/12, and both DMA groups passed 0/12. The 48 cases and their
failures are retained in [results-if17](results-if17/functional-cases.csv).
Increasing this image working buffer did not fix the tested command-transport
failures. It is a different buffer from the DMA read-return FIFO.

## Board comparison status

Baseline, unrolled-MMIO, LTO, and larger-working-buffer software builds are
prepared. Payload readback from the selected SD card succeeded, and the boot
partitions remained unchanged. After recovery of the selected SDWire3 sharing
configuration, the qualified baseline booted Linux. All four executable hashes
matched the installed payload. The reserved-memory readback passed six cases:
65,536 bytes at three offsets with two patterns. A baseline 30-frame rendering
trial also passed its final comparison of all 307,200 pixels.

The detailed software comparison completed 120 trials and 21,600 recorded
frames. All game-state, command-volume, and display-counter checks passed;
the selected 40 final images each matched all 307,200 reference pixels.
See [checks](results-board/software/board-software-analysis/checks.json),
[all trials](results-board/software/board-software-analysis/runs.csv), and
[summaries](results-board/software/board-software-analysis/summary.csv).
The three-repeat, lower-instrumentation comparison completed 48 trials and
8,640 frames, with 16 selected full-image checks. Its common trials have the
same game-state and command-volume sequences as the detailed matrix. See
[profile comparison](results-board/frame/board-profile-comparison/summary.csv)
and [cross-profile checks](results-board/frame/board-profile-comparison/checks.json).
The method, timing boundaries, and generated-code differences are described
in [METHODS.md](METHODS.md).

The following medians use three 180-frame trials from initial game state 0,
with internal timing calls disabled. Values are completed swaps per second.

| Software | Full redraw | Grouped calls | Retained drawing |
| --- | ---: | ---: | ---: |
| O3, published writes | 14.728 | 14.953 | 58.199 |
| O3, unrolled writes | 14.850 | 16.796 | 58.190 |
| LTO, published writes | 14.953 | 19.611 | 58.511 |
| LTO, unrolled writes | 14.974 | 19.682 | 58.195 |

In detailed timing, unrolling reduced the full-redraw write time from 7.904 ms
to 6.074 ms. The whole-frame rate did not rise by the same proportion. LTO had
a larger effect with grouped calls; the retained cases remained near 58 swaps/s.
These are workload-specific outcomes, not a general compiler speedup claim.
The grouped O3/unrolled case's median differed by about 4.1% between profiles;
the other 15 initial-state cases differed by at most about 0.6%. The observed
trial ranges are retained, and no statistical significance claim is made.

## Command DMA on the board

The unmodified FPGA completed the 32, 64, and 256 square texture checks with
word input in this run. That single run does not negate the intermittent
texture failures recorded in E6. Its command-DMA drawing trial timed out after
30 seconds waiting for the ordered completion token. It produced no qualified
DMA throughput result. The FPGA was reconfigured before further buffer use.

The experimental read-FIFO/parser circuit passed a 30-frame quad trial and all
three texture sizes through both APB and DMA. Each checked image matched all
307,200 reference pixels. The exact commands, failures, and results are in
[transport-probes](results-board/transport-probes/manifest.json). The observed
board timeout does not, by itself, prove that its internal cause was the same
circular wait traced in the synthetic memory model.

APB and DMA were then compared on the **same experimental circuit**, using the
same executable. The 24 lower-instrumentation trials recorded 4,320 frames and
24 full-image checks. Game-state and command-volume sequences agreed, display
counters were consecutive, and all checked images matched. Medians of three
180-frame trials after 30 warm-up frames are completed swaps per second:

| Drawing method | APB writes | DMA, 64-byte minimum |
| --- | ---: | ---: |
| Full redraw | 14.728 | 11.844 |
| Grouped calls | 14.953 | 14.355 |
| Retained drawing | 58.512 | 57.883 |
| Repeated fixed command lists | 58.831 | 29.823 |

The last row holds the game state fixed and is not moving-game performance.
This DMA implementation copies cached command data into uncached reserved DDR
before starting the reader. Copy, launch, ordering, and completion costs are
included. These results do not support adopting this implementation for higher
game throughput. They also do not establish that every DMA or coherent-memory
design would be slower. See [all trials and checks](results-board/dma-frame/manifest.json).

Minimum DMA lengths of 1,024 and 8,192 bytes were also tested, falling back to
APB below that size. At 8,192 bytes, full redraw used two DMA lists per frame
instead of five, but its median remained 11.962 swaps/s. Retained drawing used
no DMA lists at that threshold and measured 58.195 swaps/s. The three-repeat
ranges are retained; small differences are not claimed statistically significant.

In three detailed full-redraw trials, the median per-frame APB write time was
7.916 ms. DMA copying alone took 17.530 ms, launch took 0.051 ms, and completion
waiting took 3.987 ms. Timer scopes overlap other nested write/upload timers;
do not add these again to those totals. The CPU copy cost is included in the
whole-frame result. Across the baseline transport, threshold, and detailed
matrices, 54 trials/9,720 frames and 54 final full-image checks agreed.
The threshold and detailed trials, including the copy/launch/wait breakdown,
are preserved in [DMA followups](results-board/dma-followups/manifest.json).

## Qualified implementation variants

### Isolating the parser candidate on the board

The read-FIFO-only circuit and the read-FIFO/parser circuit use the same
executable, clock configuration, image dimensions, and working-buffer size.
Each was tested with five repetitions of APB and DMA texture input, alternating
the transport order between repetitions. Each repetition renders four images
per texture size and checks the complete final image for that size.

| Parser | Transport | 32 x 32 matches | 64 x 64 matches | 256 x 256 matches |
| --- | --- | ---: | ---: | ---: |
| Unmodified | APB | 5/5 | 5/5 | 5/5 |
| Unmodified | DMA | 5/5 | 0/5 | 0/5 |
| Handshake candidate | APB | 5/5 | 5/5 | 5/5 |
| Handshake candidate | DMA | 5/5 | 5/5 | 5/5 |

The failed DMA cases complete but mismatch 1,024 pixels at size 64 and 30,720
pixels at size 256 in every repetition. Thus the read FIFO alone does not fix
the tested texture input. The parser candidate resolves those particular
repeated failures. Both APB versions pass here, so this result does not prove
that every intermittent APB failure in E6 has the same cause. All trials,
including failed image checks, are in the [parser comparison evidence](results-board/parser-comparison/manifest.json).

### Implementation checks

These are complete placed-and-routed designs, not synthesis estimates. The
reference clocks and output resolution are unchanged. The CDC endpoints,
timing exceptions, and DRC warning categories/counts were compared with the
qualified reference; there are no new DRC errors or routing errors, no
unconstrained internal endpoints, and all 19 reported bus-skew checks pass.

| Circuit | LUT | FF | BRAM36-equivalent tiles | Setup slack (ns) | Hold slack (ns) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Published IF16 reference | 67,166 | 50,890 | 215 | 0.018 | 0.014 |
| IF16, read FIFO only | 67,251 | 50,979 | 216 | 0.020 | 0.014 |
| IF16, read FIFO and parser candidate | 67,251 | 50,979 | 216 | 0.020 | 0.014 |
| IF17, upstream renderer | 67,226 | 50,914 | 285.5 | 0.081 | 0.014 |

These total design counts include physical optimization; differences should
not be described as isolated module costs. DSP use is 61 in all four designs.
The two read-FIFO candidates have identical total resource counts but different
parser logic and bitstreams; their source manifests distinguish them.
The enlarged buffer's implementation occupies 78.22% of the available BRAM
tiles, compared with 58.90% for the reference.
Reports and input/output hashes are retained in
[read-FIFO qualification](results-board/buffered-only-qualification/manifest.json),
[read-FIFO/parser qualification](results-board/buffered-parser-qualification/manifest.json),
and [IF17 qualification](results-board/if17-qualification/manifest.json).

## Larger internal working buffer on the board

The IF17 circuit and matching executable completed 12 trials/2,160 measured
frames and 12 final full-image checks. Their game-state sequences match the
12 corresponding `o3-apb` reference trials from the software matrix. Final
image hashes match the four checked reference images; all checked images also
match the independent reference at every pixel. Command volumes are deliberately
allowed to change because the capacity changes image-strip partitioning.

| Drawing method | IF16 median swaps/s | IF17 median swaps/s | IF16 bytes/frame | IF17 bytes/frame |
| --- | ---: | ---: | ---: | ---: |
| Full redraw | 14.728 | 14.748 | 30,951.6 | 28,820.0 |
| Grouped calls | 14.953 | 15.249 | 30,951.6 | 28,820.0 |
| Retained drawing | 58.199 | 58.196 | 3,578.7 | 2,595.7 |
| Repeated fixed command lists | 58.831 | 59.154 | 34,372.0 | 30,420.0 |

Both configurations use normal O3 software, published APB writes, and the same
clocks and image dimensions. The last row is a fixed-state reference, not a
moving game. Each value summarizes three 180-frame trials after 30 warm-up
frames; byte values are per-trial frame means. The number of strips and write
calls falls from five to three. The grouped median rises by about 2%, while
full and retained drawing show little change. The three-trial ranges and
separate FPGA/Linux boots do not establish statistical significance for small
differences. See the [capacity comparison](results-board/capacity/capacity-comparison-analysis/summary.csv)
and [state/image checks](results-board/capacity/capacity-comparison-analysis/checks.json).

The additional 70.5 BRAM tiles did not yield a large throughput improvement in
this game. Keep the published IF16 setting for this workload; do not describe
it as optimal for all scenes or resolutions. Build and measurement details are
in [METHODS.md](METHODS.md), with [selected evidence](results-board/capacity/manifest.json).

## External video observation

After the experiments, the exact published reference bitstream was restored and
Linux booted. Five APB texture repetitions passed at all three sizes, followed
by a 30-frame game trial with a successful complete-image comparison. These
repetitions do not negate earlier intermittent failures. The [restoration
record](results-board/reference-restored/manifest.json) includes the bitstream,
executable hashes, boot, tests, and completed sequence status.

The Windows capture source currently returns the receiver's
`Video Format Not Supported` image, including after a source deactivate/reactivate
cycle. Source-framebuffer checks above do not override that failed visual check.
Completed swap rates are not optically measured display FPS.
The reviewed [receiver image](results-board/capture/receiver-message.png) and
[observation record](results-board/capture/observation.json) retain this failure.

## Reproduction

Use [CMakeLists.txt](CMakeLists.txt) and `TRANSPORT_BUILD_MODEL=ON` to build the
functional model against the pinned product checkout. An example is given in
the thesis technical appendix, chapter 30. `make_buffered_dma.py` generates an
experimental top in a new build directory, with optional
`--parser-handshake`. It writes a patch rather than modifying official files.
The read-FIFO source and its pinned upstream attribution are in
[vendor/SOURCE.json](vendor/SOURCE.json).

AXI handshake and ordering background:
[Arm AMBA AXI Protocol Specification](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/IHI0022H_amba_axi_protocol_spec.pdf).
For the exact RasterIX command and memory paths, consult the pinned
[upstream source](https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0).
