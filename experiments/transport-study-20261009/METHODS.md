# Board comparison methods

## What changes

The FPGA configuration, CPU/GPU clocks, reserved memory, upstream RasterIX,
game logic, and image dimensions stay fixed. Four software variants combine
two command-write paths with two compiler settings:

| Label | Compiler | Command writes |
| --- | --- | --- |
| `o3-apb` | GCC 14.2.0, `-O3 -DNDEBUG` | Published `WallyBusConnector` |
| `o3-unrolled` | Same executable as `o3-apb` | Eight normal writes per loop, with the final write outside that loop |
| `lto-apb` | Same source and options, plus CMake interprocedural optimization | Published connector |
| `lto-unrolled` | Same executable as `lto-apb` | Unrolled path |

The generated LTO options are `-flto=auto -fno-fat-lto-objects`. The unrolled
path reduces loop overhead and moves the last-word register selection outside
the main loop. It still sends the same number of 32-bit APB writes. It is not
a wider bus transaction, DMA, or a change to the asynchronous FIFO. Inspect
`StudyBus::writeData` and the saved disassembly for the actual generated code.

Both builds use the same single-threaded execution adapter inside this test.
The RasterIX build option named `THREADED_RASTERIZATION` enables that interface;
it does not by itself establish that this benchmark uses multiple CPU threads.
The source's `TimedRunner` invokes the supplied work synchronously.

## Work and timing boundaries

`full`, `grouped`, and `retained` render the same deterministic game-state
sequence, starting from states 0, 1800, and 3600. The `replay` condition holds
the initial state fixed and alternates the two prepared command lists. It
removes repeated command construction, so it is a transport-oriented reference,
not a playable game's measured frame rate.

Each trial primes the drawing and image buffers, runs 30 warm-up frames, and
then records 180 frames. There are three repetitions. The four software
variants rotate their execution order between repetitions. This reduces a
fixed order effect; it is not a claim of random sampling or statistical
significance. Report the three trial values, median, and observed range.

The primary matrix has 40 conditions and three repetitions (120 trials).
The lower-instrumentation comparison uses state 0 and the four rendering modes
with the same variants and repetitions (48 trials). `--profile frame` keeps
frame boundaries and counters while disabling internal timing calls. Empty
internal-time fields in its summary mean **not measured**, not zero cost.

The denominator of `swaps_per_second` is the measured time spanning completed
frame-switch observations. It includes game and drawing work and frame waiting.
It excludes CSV export and the final full-image readback. The value is not an
optical measurement of distinct frames accepted by an external display.
Nested worker/upload/write timers overlap; do not add them as disjoint costs.

## Correctness checks

- Every recorded frame has a game-state hash and consecutive display counter.
- Within each rendering mode, command byte/call counts must match across the
  four software variants and repetitions.
- The three moving-game modes must have the same game-state sequence.
- In repetition one, every condition compares all 307,200 pixels of its final
  framebuffer against the independent software drawing reference. Selected
  image hashes must also agree across equivalent modes and software variants.
- This checks selected complete images, not every image generated during a run.
  A source-framebuffer comparison does not verify the external HDMI receiver.

## Reproduction and analysis

Prepare the executable files in the target's `/tmp` and verify their hashes
against the published payload manifest. Keep the bitstream and device tree
from the fixed reference in `README.md`. Set `BOARD_UART` locally to the
explicitly selected `/dev/serial/by-id/...` path. No UART binary transfer is
required; the command runner sends only shell text.

```bash
python3 experiments/transport-study-20261009/run_board_matrix.py \
  --uart "$BOARD_UART" --output build/transport-board/detailed
python3 experiments/transport-study-20261009/run_board_matrix.py \
  --uart "$BOARD_UART" --output build/transport-board/frame \
  --profile frame --states 0
python3 experiments/transport-study-20261009/analyze_board_matrix.py \
  --input build/transport-board/detailed \
  --output build/transport-board/detailed-analysis
python3 experiments/transport-study-20261009/analyze_board_matrix.py \
  --input build/transport-board/frame \
  --output build/transport-board/frame-analysis
```

Run the board matrices sequentially. They need exclusive UART and GPU access.
The scripts preserve earlier output directories and stop on failed trials.
`--partial` is only for observing progress; a partial analysis must not be
reported as the completed comparison.

## Command DMA on an experimental circuit

The unmodified board timed out while waiting for the ordered DMA completion
token. Do not calculate a throughput value from that failed trial or reuse
its DMA storage. Reconfigure the FPGA before continuing.

The read-FIFO/parser candidate is qualified separately. Its APB and DMA paths
then use the same FPGA image, executable, game states, and compilation options.
This isolates the software transport selection within that experimental
circuit. It is not a comparison between an unmodified FPGA and a faster DMA
FPGA, and it does not establish that either experimental RTL change is needed
in every upstream integration.

For the lower-instrumentation comparison, use three repetitions of 180 measured
frames after 30 warm-up frames, state 0, and the four rendering modes. Compare
the entire final image in every repetition. The command and state sequences
must match. The DMA path includes copying each command list into reserved
uncached DDR, ordering those stores, launching the existing reader, and waiting
for a returned ordered token before storage reuse. Those costs are part of the
result; they must not be excluded to make DMA appear faster.

```bash
python3 experiments/transport-study-20261009/run_board_matrix.py \
  --uart "$BOARD_UART" --output build/transport-board/dma-frame \
  --profile frame --states 0 --pixel-every-repeat \
  --variant o3-apb /tmp/app apb 64 \
  --variant o3-dma /tmp/app dma 64
```

## Larger internal image working buffer

The IF-size experiment changes `FRAMEBUFFER_SIZE_IN_PIXEL_LG` from 16 to 17
in both RTL and the matching software build. The CPU clock remains 20 MHz,
the rendering clock remains 100 MHz, and the output remains 640 by 480 RGB565.
This is the renderer's temporary image working memory, not the command FIFO or
the two DDR framebuffers used for display. The larger memory permits fewer
image strips, so the number of generated commands is allowed to change.

Use `/tmp/app-if17` only with the matching qualified FPGA image. Compare its
state hashes and final pixels against the IF16 reference. Do not require equal
command counts across those two configurations: reducing repeated strip work
is the intended independent variable. Report the changed command volume and
the extra FPGA memory alongside time measurements.

From the research repository root, set `WALLY` to the pinned console checkout,
`RISCV` to its installed toolchain root, and `VIVADO_SETTINGS` to the Vivado
2025.2 `settings64.sh` file. All output directories below must be new.

```bash
python3 experiments/transport-study-20261009/build_if17.py \
  --console "$WALLY" --output build/transport-board/if17 \
  --vivado-settings "$VIVADO_SETTINGS" --riscv "$RISCV"
cmake -S experiments/transport-study-20261009 \
  -B build/transport-board/software-if17 -DCMAKE_BUILD_TYPE=Release \
  -DWALLY_REPO="$WALLY" \
  -DCMAKE_C_COMPILER="$RISCV/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-gcc" \
  -DCMAKE_CXX_COMPILER="$RISCV/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-g++" \
  -DRIX_CORE_FRAMEBUFFER_SIZE_IN_PIXEL_LG=17 -DRIX_ENABLE_SPDLOG=OFF
cmake --build build/transport-board/software-if17 --target transport-study
```

The hardware builder copies tracked console sources and changes only the
capacity parameter in that experimental wrapper; upstream submodule sources
are not edited. Qualify the resulting implementation before programming. Copy
the matching executable to the board as `/tmp/app-if17` through the selected
SD payload, and retain its hash. With exclusive board access:

```bash
python3 experiments/transport-study-20261009/run_board_matrix.py \
  --uart "$BOARD_UART" --output build/transport-board/if17-frame \
  --profile frame --states 0 --pixel-every-repeat \
  --variant if17-apb /tmp/app-if17 apb 64
python3 experiments/transport-study-20261009/compare_buffer_capacity.py \
  --reference build/transport-board/frame \
  --candidate build/transport-board/if17-frame \
  --output build/transport-board/capacity-analysis
```

The reference input is the completed 48-trial software matrix. The comparison
selects its 12 `o3-apb` trials and pairs them with the 12 IF17 trials. Four
reference final images and all 12 IF17 final images were checked. The observed
three-repeat ranges are retained. The builds run in separate FPGA/Linux boots;
small differences are not treated as statistical significance or a universal
capacity effect.

## Physical implementation and qualification

The experimental sources are separate copies with file hashes and explicit
patch records. `implement_incremental.py` takes their post-optimization logical
checkpoint and a qualified reference's physical checkpoint. Vivado reuses
placement and routing where cells match; it does not replace the candidate's
logical design with the reference design. The exact input checkpoint hashes,
source manifest, reuse reports, and output bitstream hash are retained. See
AMD's [incremental checkpoint documentation](https://docs.amd.com/r/en-US/ug835-vivado-tcl-commands/read_checkpoint).

Before programming, check setup and hold timing, complete routing, DRC, clock
definitions, unconstrained internal endpoints, exceptions, CDC structures, and
bus skew. Existing warnings are compared with the qualified reference, rather
than described as absent. Passing implementation checks permits functional
board testing; it does not prove the new logic or images correct. Congested
from-scratch implementation attempts are retained even when a qualified
incremental result makes continued routing of that duplicate unnecessary.
