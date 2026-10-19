# Intermediate presentation

This directory builds the canonical twelve-slide, six-minute presentation:
[slides and narration](../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../docs/presentation/中間発表_主要事項.pptx).
The earlier eight-slide presentation is preserved in Git history.

## Build and publication

Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATION_SKILL` to the
installed artifact-tool runtime and presentation skill. Use a build directory
outside the repository:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The builder sanitizes the package using private redaction settings, validates
it, re-imports the final PPTX and renders all twelve slides. Slide 9 is a native
editable table. Circuit shapes, wires and labels are editable. The only
embedded bitmap is the reviewed game image. Keep build receipts private.

Import only the reviewed PPTX, Markdown, slide PNGs and named source files
through `tools/publication/sanitize.py`. Update the media review record and
run the local privacy audit before publication. Review the rendered diagrams
as well as the package checks. Refresh `publication/files.json` from the
intended Git index when publishing a new snapshot.

## RVSOC design reference

The design follows Harris et al., *RISC-V System-on-Chip Design*, rather than
an unrelated slide template. The reference is the
[authors' book and figure resources](https://pages.hmc.edu/harris/ddca/rvsocd.html).
Source filenames and hashes are recorded in [design-reference.json](design-reference.json).
The official files were inspected as reference material; they are not copied
into this presentation directory.

| Element | Reference | Application |
| --- | --- | --- |
| Core notation | Chapter 7, printed p.303, and Fig.7.11 | Bold block labels, ordinary signal labels, white register and logic symbols, blue emphasis, grey inactive ports, and thinner one-bit control lines. |
| Circuit hierarchy | Fig.9.20 and Fig.23.2 | Pale blue groups, a medium-blue FPGA boundary, darker blue memory-interface IP and white individual circuits. |
| Heading hierarchy | Chapter 7 opening and section headings | Black numbering, blue headings, white page background and generous margins. |
| Table | Table 7.2, printed p.303 | Blue header with white text, pale alternating rows, horizontal rules and one separator after the row labels. |
| Captions and summary | Chapter 7 captions and text | Blue figure/table identifiers and blue triangular text bullets. |

The board palette is sampled from the published Fig.23.2: `#E5EBF8`,
`#CCD9F1`, `#77A3DC` and `#231F20`. The heading/table blue `#0078BA` is sampled
from printed p.303, rendered at 1500 pixels on its long side. Highlighted
paths use `#1572C3`. These are screen RGB values, not a claim about print CMYK.

English-only circuit labels use Arial, found in the official figure/PDF
resources. Japanese text uses Yu Gothic as a local adaptation. The source
book is in English and does not prescribe a Japanese font. Some book text
uses proprietary embedded fonts; this deck does not redistribute those fonts
or claim an identical typeface for every text element. The 16:9 slide canvas
and projected text sizes are retained instead of reproducing a portrait page.

Blue denotes emphasis, not a particular clock domain. Group backgrounds
indicate hierarchy, not additional logic. The grey ports in slides 2–3 are
unused by the illustrated instruction. Grey explanatory text elsewhere is
annotation, not a claim that the described hardware is absent. Individual
control wires are thinner than data wires. Connections grouping multiple
interfaces use one representative line and do not encode every constituent
signal's width.

## Diagram and source correspondence

The simplified datapaths refer to Harris and Harris, *Digital Design and
Computer Architecture: RISC-V Edition* (2021), Figures 7.8 and 7.12:
[official resources](https://pages.hmc.edu/harris/ddca/ddcarv.html).
With data[0]=3, `lw x1,0(x0)` reads 3 into x1 and `sw x1,4(x0)` writes it to
data[4]. These are teaching addresses, not the Linux program's addresses.

Slides 2–5 omit the EBU and instruction fetch. They keep the register file,
ALU, immediate value and data port in fixed positions while introducing
external memory and the SD-card controller. Slide 6 shows a more detailed
functional circuit. Slide 7 retains its layout and adds RasterIX. Both show
DDR3 and the SD card outside the FPGA chip and their controllers inside it.

The detailed diagrams were drawn from product revision
`261832d48832dd6e26c4971ab8893ce61200688b` in [`console/`](../../console/).
They are not official textbook figures or complete RTL schematics.

| Diagram element | Source relative to console/ |
| --- | --- |
| Register file, immediate generation, forwarding, ALU and result selection | `src/ieu/datapath.sv`: `regfile`, `extend`, `faemux`, `fbemux`, `srcbmux`, `alu`, `resultmuxW` |
| Fetch and decode | `src/ifu/ifu.sv`: PC, instruction memory/cache, MMU and instruction registers |
| Data cache and uncached MMIO | `src/lsu/lsu.sv`: address register, MMU, cache, `ahbcacheinterface`, `UnCachedDataMux`, read-data register |
| Request arbitration and destination selection | `src/ebu/ebu.sv`, `src/uncore/uncore.sv`, `src/uncore/ahbapbbridge.sv` |
| DDR3 and SPI/SD connection | `fpga/src/fpgaTopNexysVideo.sv`, `src/uncore/uncore.sv`, `linux/devicetree/wally-nexysvideo.dts` |
| Added graphics connection | `fpga/src/rasterix_apb.sv`, `fpga/src/rasterix.sv`, `fpga/src/rasterixdisplay.sv`, `fpga/generator/rasterixmem.tcl` |

Vertical white boxes group pipeline registers. The diagram draws the W-stage
forwarding example, not every forwarding path. It shows integer and load
results while omitting the other result-selector inputs. The store-data
route in M shows the MMIO path; the cache store-data input is omitted.
Byte extraction, cache internals, prediction, exception handling and many
control wires are also omitted. Speaker notes explain these boundaries.

EBU arbitration selects among requesters, whereas address decoding selects
destinations. DDR3 starts at `0x80000000` and has 512 MiB in this board
configuration. The SD-card controller is the second SPI instance, mapped
at `0x00013000`. Software operates its registers to perform card transfers;
the card is not directly accessed as RAM. Linux loads required program
content into DDR3 rather than fetching instructions directly from the card.

The physical graphics register region is `0x10080000`–`0x100800ff`.
For the aligned 32-bit CMD write at offset zero, the adapter passes the
low 32 data bits and returns `CmdReady` as `PREADY`. This rule does not
describe every adapter register. The CPU-side base address may differ from
the bus physical address under Linux address translation. Slide 9 is an
illustration of acceptance rules, not a measured waveform.

## Evidence and presentation scope

The first six slides explain existing designs. The study adds the external
graphics connection and verifies the resulting system; it does not claim
a new CPU or rasterizer. The official RasterIX submodule is unmodified.
The command path crosses from the 20 MHz CPU domain to the 100 MHz graphics
domain. The display sends DVI-format video through the HDMI connector.

Results come from E6 at the pinned revision. Four whole-frame comparisons,
a 300.011-second autoplay run and a separate 30-second recording are distinct
observations. No new hardware qualification was performed for this revision
of the presentation. The dedicated controller remains future work, as does
identifying conditions causing occasional video acquisition failure.
Educational use is proposed; learning effectiveness was not measured.

The twelve-slide count includes the title. The planned allocation is 180
seconds for the first half and 150 for the second, leaving 30 seconds for
pointing and transitions. This is not a timed rehearsal. In slides 6–7,
trace the familiar register/ALU path and added connection instead of reading
every label aloud.
