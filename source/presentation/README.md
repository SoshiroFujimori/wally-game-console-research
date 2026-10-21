# Intermediate presentation

This directory builds the six-minute presentation with ten main slides and one hidden question slide:
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
all eleven slides. Circuit shapes,
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
| 2 | Complete `lw x1,8(x0)` example: PC, instruction word, register selection, effective address, memory read and writeback. The PC feedback path is not yet shown. |
| 3 | Add PC+4 and explain `sw x1,12(x0)` on the same datapath. |
| 4 | Connect both instruction fetch and data access to shared DDR3 through the bus, then trace instruction execution. |
| 5 | Add SD control and explain the CPU reads and writes that copy the program into DDR3 before execution. |
| 6 | Add RasterIX and explain a command-word write using `sw x1,0(x2)`. |
| 7 | Add image writes to DDR3 and display reads leading to HDMI output. |
| 8 | Reuse the same simplified drawing for HDL and FPGA configuration. |
| 9–10 | Existing E6 results and the conclusion, with controller support still future work. |
| 11 | Detailed Wally circuit for questions. Hidden in a normal slide show. |

The narration allocation for the main slides is 335 seconds, leaving 25 seconds
for pointing and transitions. This is a plan, not a timed rehearsal. The hidden
slide has no allocation in the main talk. It remains available in PowerPoint's
slide selector and in the GitHub Markdown for reference.

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

`simple-circuit.mjs` uses one fixed geometry for slides 2–7. PC,
instruction memory/read function, register file, ALU and external memory do not
move. The later stages add bus, SD, graphics and display connections to that
same diagram. `GEOMETRY` lists the shared coordinates; the corresponding
native slide objects have `stable-*` names for verification.

The worked examples distinguish instruction addresses 0 and 4 from data
addresses 8 and 12. They assume a value of 3 at data address 8. Slide 2 retains
the real `lw x1,8(x0)` encoding, `0x00802083`, checked with GNU Binutils. Its
instruction fields are wired to the register selectors and ALU input.

From slide 3 onward, the row above the datapath shows extracted semantic values,
not the physical bit arrangement of an instruction. The immediate occupies one
box in the same location as the load immediate. Bit positions and extraction
logic are omitted. This avoids presenting a false store encoding while keeping
the teaching model simple. Width extension and control decoding are omitted.
On slide 3, PC is already 4 and the PC+4 circuit prepares 8. Only uncompressed,
non-branching instructions are considered.

On slide 4, the former instruction-memory box becomes an instruction-side
connection in the same location. Both the request and returned instruction are
connected to the bus and DDR3. This does not imply that the FPGA build has an
IROM or DTIM. Caches, arbitration and address translation are abstracted, so
not every CPU access is asserted to reach DDR3.

Slide 5 explains a CPU-mediated copy: software requests an SD read, reads the
received data from the controller, and writes the contents into DDR3. Byte
packing, block transfers, file processing and intermediate copies are omitted.
No direct SD-to-DDR DMA link is drawn. Startup code begins the loading process;
the diagram does not imply that execution starts from an empty DDR3.

Slide 6 uses `sw x1,0(x2)`, with command data D in x1 and a mapped register
address B in x2. Preparing those registers is omitted. D is a graphics command
word, distinct from the CPU instruction. B is the software-visible address and
can be mapped. Protocol conversion and command buffering remain inside the
connection block rather than separate main-talk topics.

Slide 7 combines pixel generation, external image storage and display.
Memory-controller details are included in the DDR3 connection abstraction.
CPU code and framebuffer data occupy different regions. Internal working
buffers, pixel encoding and display-format comparisons remain appendix topics.

Slide 8 uses a uniformly scaled instance of exactly the same simplified drawing.
Its PC code is an illustrative `always_ff` fragment, not a complete product
module. The DDR3 chip, SD card and HDMI connector are external to the FPGA.
The diagram is a functional connection drawing, not a physical layout.

`wally-circuit.mjs` draws the hierarchy and datapath on the hidden question slide 11 from the
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

The compact HDL label on the question slide shows `always_ff @(posedge clk)` from
`flopenrc.sv`. The full behavior, including reset, enable and clear priority,
is described in the speaker notes and technical material. It illustrates
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
