# Command transport experiments

This study compares command delivery while keeping the published console RTL
and the official RasterIX sources unchanged. It does not claim that DMA replaces
clock-domain crossing, or that a shorter MMIO loop alone improves a game.

## Fixed reference

- Console: `261832d48832dd6e26c4971ab8893ce61200688b`.
- Wally upstream: `2064ca2bb8a88e3e3ec43753be93d00bef49345b`.
- RasterIX: `9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0`.
- Baseline FPGA image SHA-256:
  `16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf`.
- 20 MHz CPU, 100 MHz rendering domain, 640 x 480 RGB565, IF log2 size 16.

## Questions and acceptance criteria

1. Can the existing FrameStreamingCore read command lists from shared DDR and
   deliver them to the renderer? Check the official RTL in simulation first,
   including input gaps, output stalls, repeated transfers, and 4 KiB crossings.
2. Can the CPU and the renderer see the same bytes? Verify a reserved, uncached
   mapping by reading patterns back through the GPU. Never pass a process virtual
   address to DMA. Do not reuse a buffer until a returned ordered token proves
   that the transfer has consumed it.
3. Does DMA improve end-to-end work? Measure CPU copy, launch, transport wait,
   command generation, and completed frame intervals. DMA setup/copy/wait costs
   are part of the result. A submitted command is not a completed image.
4. Does the answer change for full, grouped, retained, or replayed rendering?
   Use one executable, deterministic game states, repeated trials, and identical
   commands. Check game-state hashes and all 307,200 framebuffer pixels against
   the software reference. Include a low-instrumentation comparison.
5. Does continuous command delivery change the known texture-input failure?
   Recheck small and multi-page textures; report a failure even if speed improves.

## Candidate selection

| Candidate | Reason to test | Decision gate |
| --- | --- | --- |
| Existing internal DMA | Avoid one APB write per command word without new RTL | Visibility and transport correctness before game timing |
| Unrolled MMIO | Low-cost alternative to DMA setup/copy | Same commands and images; include generated-code inspection |
| DMA minimum batch size | Small lists may cost more to launch than to send | Only after a correct DMA path exists |
| Cached staging versus direct uncached generation | Copy removal may slow all command construction | Verify ownership and cache behavior first |
| Compiler/link-time optimization | Command construction dominated earlier full redraw | Same-source build; state/pixel equivalence before timing |
| Larger IF working buffer | Fewer strips may reduce repeated CPU work | RAM estimate and timing-qualified build before board use |
| FIFO retuning | DMA changes traffic; the previous depth result may not transfer | Only if measured transport stalls remain significant |
| External AXI DMA IP | Alternative to the built-in reader | Pursue if built-in DMA has a demonstrated limitation |

Record completed, rejected, and deferred candidates with evidence. Do not present
untested candidates as improvements or claim an exhaustive global optimum.
The resulting [decision record](DECISIONS.md) separates measured outcomes from
unimplemented designs.

## Storage and publication

Use `build/transport-study-20261009/` for raw logs, binaries, and temporary
checkouts. Explicit device selections belong in local arguments/private settings.
Import selected evidence through the publication sanitizer. Preserve E6 and the
private originals. Do not change the product checkout or the official submodule.

Use the host-side installer to prepare the SD payload. `--uncompressed` expands
the verified package on the host, allowing the target to copy executables to RAM
from a read-only mount. Large target-side SD writes produced a Linux soft-lockup
warning in this setup after the software matrices had completed; they are not a
qualified installation method. Keep payload setup separate from measured runs.

The thesis explains the principal design choices and results. The appendix keeps
the complete protocol and limitations. The abstract and six-minute presentation
both select only the facts needed to understand the system and its main finding;
they are not inventories of every experiment.
