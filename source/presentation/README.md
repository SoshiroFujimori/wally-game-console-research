# Intermediate presentation

This directory builds the canonical thirteen-slide, six-minute presentation:
[slides and narration](../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../docs/presentation/中間発表_主要事項.pptx).
Earlier editions remain in Git history.

## Build and publication

Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATION_SKILL` to the
installed artifact-tool runtime and presentation skill. Use a build directory
outside the repository:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The default is the public edition. The builder sanitizes the package with the
private redaction settings, validates it, re-imports the final PPTX and renders
all thirteen slides. Slide 9 contains a native editable table. Circuit shapes,
wires, labels and the HDL excerpt are editable. Slide 11 is rendered at twice
the slide resolution for reading the detailed diagram on GitHub.

For a private school copy, explicitly set `PRESENTATION_AUDIENCE=private` and
`PRESENTATION_PRIVATE_COVER_JSON` to a private JSON file outside this repository.
That file supplies only the `student` and `supervisor` cover lines. The private
build keeps those lines and must never be imported or published. Public builds
do not load the private cover file. The circuit and narration sources are
shared between editions. Do not put private names into this source tree.

Import only the public PPTX, Markdown, slide PNGs and named source files through
`tools/publication/sanitize.py`. Review every image, update the media review
record, run the local privacy audit and refresh `publication/files.json` from
the intended Git index. Build receipts and private school examples remain
outside the public repository.

## Narrative and scope

| Slides | Explanation |
| --- | --- |
| 1 | Conventional title and presenter/supervisor fields. Identity is withheld in the public edition. |
| 2 | PC, instruction memory, instruction decoding and the sequential PC update. |
| 3–4 | Load and store data paths, with the same register-file and ALU positions. |
| 5–7 | External memory through a bus, software loaded from SD into DDR3, and an added graphics port on the same APB bridge. |
| 8–10 | APB-to-stream adaptation, accepted writes, and the path from rendering commands to displayed pixels. |
| 11 | One detailed Wally circuit, an actual register behavior in HDL, and FPGA configuration. |
| 12–13 | Existing E6 results, the connection-design contribution and controller work still to do. |

The narration allocation is 330 seconds plus 30 seconds for pointing and
transitions. This is a plan, not a timed rehearsal. The detailed circuit is a
visual reference; the oral explanation does not read every label.

The title slide follows the content convention of the supplied school
presentations: title, student information and supervisor. It does not contain
a research summary. Private reference decks are not included or identified in
the public material.

## RVSOC design reference

The circuit notation and typography follow Harris et al., *RISC-V
System-on-Chip Design*, using the
[authors' figure resources](https://pages.hmc.edu/harris/ddca/rvsocd.html).
Source filenames and hashes are retained in
[design-reference.json](design-reference.json). Figures were inspected as
references, not copied from a private book into this repository.

| Element | Application |
| --- | --- |
| Register | White rectangle with a triangular clock input, as in Fig.7.11. The register file remains a multiport block, not a single flip-flop. |
| MUX, ALU, immediate extension | Native trapezoid, notched ALU and wedge symbols. Immediate generation is combinational, not a storage register. |
| Signals | Approximately 3.0 px for word data, 1.2–1.3 px for scalar control and 2.2 px for block outlines in the simplified drawings. |
| Hierarchy | Pale blue functional groups, medium blue FPGA boundary, darker blue previously explained functions in the detailed diagram. |
| Labels | Arial for ASCII circuit labels and Yu Gothic for Japanese. The code excerpt uses Consolas. These are font adaptations, not redistributed book fonts. |
| Table | Blue header, white header text, pale alternating rows and restrained horizontal rules. |

Blue marks the currently discussed route or function. The detailed diagram's
blue fill links back to the simplified functions; blue outlines identify the
added graphics connection. These colors do not encode clock domains or runtime
activity. The board photograph and its attribution are in [assets](assets/README.md).

## Source-derived diagrams and simplifications

`simple-circuit.mjs` implements the reduced circuits. Slide 2 uses two 32-bit,
non-branching instructions. Their instruction addresses, 0 and 4, are distinct
from the data addresses used by the load/store examples. Machine instructions
are printed as assembly mnemonics for readability. A shared external DDR3 is
introduced later, without claiming that every access bypasses the cache.

Slides 5–7 retain fixed CPU and peripheral positions. The single APB bridge
branches to SPI/SD and the added graphics connection. The vertical blue SD-to-
DDR3 arrow on slide 6 describes software loading under Linux; it is not a wire
or a new DMA engine. The CPU executes the game and RasterIX software from RAM.
The RasterIX hardware is configured in the FPGA, as explained on slide 11.
The graphics command register is at physical address `0x10080000`; the CPU's
software address can be a mapped virtual address. A drawing command word is
data written by a CPU `sw`, not the RISC-V instruction itself.

`wally-circuit.mjs` draws the hierarchy and datapath on slide 11 from the
pinned product source. `integrated-internals.mjs` adds editable circuit
symbols and internal connections within those module boundaries. The figure
is a functional RTL drawing, not a complete gate netlist, synthesis export
or physical placement diagram. It keeps the following hierarchy:

```text
fpgaTop
  wallypipelinedsoc
    uncore
    wallypipelinedcore
      ifu
      ieu / datapath
      lsu
      ebu
  memory interfaces
  graphics connection, RasterIX and display
```

| Drawing element | Product source |
| --- | --- |
| Register file, immediate generation, operand/forwarding selectors, comparator and ALU | `console/src/ieu/datapath.sv` |
| RD1EReg, RD2EReg, ImmExtEReg and other pipeline storage | `console/src/ieu/datapath.sv`, `console/src/generic/flop/flopenrc.sv` |
| Address register, MMU, cache, uncached path and read selection | `console/src/lsu/lsu.sv` |
| Instruction path and next-PC functions | `console/src/ifu/ifu.sv` |
| Address decoding and APB bridge | `console/src/uncore/uncore.sv`, `console/src/uncore/ahbapbbridge.sv` |
| DDR3 and graphics connections | `console/fpga/src/fpgaTopNexysVideo.sv` |

The internal diagrams use RVSOC figures and the corresponding RTL as
references. Native editable shapes share the surrounding circuit's
typography, line weights and terminals.

| Internal detail | Reference and scope |
| --- | --- |
| ALU and comparator | Figs.7.3 and 7.6; representative arithmetic, shift, logic and comparison functions. The comparator does not assert the book example's bit width for this configuration. |
| Controller and hazard | Figs.7.7 and 7.19; decoder groups and representative stall/flush equations. |
| MMU | Fig.11.15; TLB, untranslated-address selection and physical-address checks. |
| Caches | Figs.10.13 and 10.24; tag/data arrays, comparison, controller and read selection. The instruction-cache view omits the CPU store path. |
| EBU | Fig.9.25; request registers, arbitration and selection. |
| AHB/APB bridge | Fig.9.14; address/control storage, write-data forwarding and read-data selection. |
| UART and GPIO | Figs.20.11 and 20.4; the UART transmit path and GPIO output path, respectively. |
| Register file | `console/src/ieu/regfile.sv`; storage, write decoding, two read selectors and constant-zero reads of x0. |

These details retain the module boundaries and datapath routes. Internal
branches can represent signal groups; omitted control inputs must not be
inferred to be absent from the RTL. Next-PC selection and vendor interfaces
remain functional boxes. Prediction, exceptions, HPTW, subword extraction,
arithmetic extensions and many control paths are omitted. Forwarding
selectors have three inputs in the source; the IFResultM path is omitted in
the drawing. The five-input writeback selection
shows integer/load paths and aggregates the remaining inputs. PCE originates
in the instruction pipeline; its long route is omitted. Hazard lines represent
groups of related enable/clear signals, not one wire tied to every input.
Top-level bidirectional lines aggregate requests, data and responses.

The HDL excerpt on slide 11 is the `always_ff` body of `flopenrc.sv`: reset has
priority, and clear is effective only when enable is asserted. It illustrates
the meaning of the pipeline-register symbols. The figure is not claimed to
have been automatically translated into HDL. Synthesis and place-and-route
produce the FPGA configuration; the CPU does not execute this HDL as game code.

The HDL excerpt retains the upstream attribution: Copyright (C) 2021–23 Harvey
Mudd College & Oklahoma State University, SPDX `Apache-2.0 WITH SHL-2.1`.
See the source file and [Solderpad Hardware License 2.1](https://solderpad.org/licenses/SHL-2.1/).

## Evidence boundaries

Results remain those of the existing E6 records: image comparison under four
conditions, 300.011 seconds of autoplay, and a separate 30-second capture.
No new hardware measurement is implied. Controller support remains future
work. This presentation does not establish educational effectiveness or
universal display compatibility. Optimization comparisons and detailed
reproduction procedures remain in the technical appendix.
