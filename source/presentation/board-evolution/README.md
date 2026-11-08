# Presentation diagrams and builder

This is the active builder for the single published intermediate presentation:
[slides and narration](../../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../../docs/presentation/中間発表_主要事項.pptx).
Earlier presentation outputs are not retained beside the current deck.

## Diagram structure

Slide 2 introduces the FPGA board and its physical SD, DDR3 and HDMI
components outside the programmable chip. A SystemVerilog example and its
corresponding AND gate explain describing and implementing a logic circuit.
The gate is an example, not a complete peripheral controller. No photograph
is used. The schematic positions are not physical placement.

Slide 3 gives the research purpose: extend an existing educational CPU with
drawing and display functionality and use the FPGA board as a game console.
It preserves the board, chip and external-component geometry from slide 2,
replacing the AND example with the CPU and graphics functions. This is a
functional overview; detailed peripheral connections appear later.

Slides 4 and 5 use the same enlarged chip view, with instruction and data
memories inside the FPGA. Slide 4 traces `lw x1,8(x0)`: read 3 from data
address 8 into x1. Slide 5 adds PC+4 and traces `sw x1,12(x0)`: store that 3
at data address 12. The address from the ALU and the value from the second
register-file port follow separate routes. The store's immediate is shown
as an extracted value, not as a false contiguous field in the machine word.

Slide 6 returns to the whole board and adds the bus and AMD DDR controller.
It keeps the same store example, replacing the local memories with accesses
to external DDR3. PC+4 remains present. Slides 7-9 detail SD control, RasterIX
and display. `BOARD` in `board-circuit.mjs` preserves datapath relationships;
`chipView` applies one uniform zoom to slides 4-5. The drawing-stage numbers
passed to `drawBoard` are independent of presentation slide numbers. Worked
addresses are teaching examples. The FPGA build does not enable IROM or DTIM.

The MIG generator is `console/fpga/generator/ddr3-nexysvideo.tcl`. Its internals
are omitted. The sender adapter is grouped into RasterIX in the main slides.
Cache/MMU internals, framebuffer internals and arbitration are appendix topics.

Hidden question slide 12 extends the RVSOC Figure 7.11 pipeline layout.
`wally-overview.mjs` keeps the PC, register file, ALU, stage boundaries,
operand selectors and lower writeback/forwarding paths. MMU/cache/bus paths
replace IROM/DTIM. EBU, uncore, memory IP and graphics extend the datapath.
The separate command and response FIFOs show their transfer directions.
It is not an exhaustive or cycle-accurate RTL/netlist drawing. More detailed
module diagrams remain in `../wally-circuit.mjs` for future question slides.
Source and omission notes are in the speaker notes.

## Detailed-diagram connectivity

The question diagram uses product revision
`261832d48832dd6e26c4971ab8893ce61200688b` and the
`fpganexysvideo_rasterix` configuration. It preserves the pipeline layout
while using RVSOC Figure 9.28 for decoding and response selection.
The drawing is a functional projection, not an RTL-equivalent netlist.
Named `HRDATA` and `FlagsE` ports denote the same nets without long return
wires. Crossings without a junction dot do not join nets. Bus lines aggregate
separate channels/signals; the HSEL bundle contains a distinct select for
each destination.

| Diagram element | RTL correspondence |
| --- | --- |
| Address decoding | `uncore.sv` instantiates `adrdecs(HADDR, ..., HSIZE[1:0], HSELRegions)`. It produces selects, not read/write data. |
| Selected return | `uncore.sv` holds select state and selects `HRDATA`, `HREADY` and `HRESP`. Their exact per-signal expressions remain in the RTL. |
| EBU | `ebu.sv` arbitrates IFU/LSU requests. `wallypipelinedcore.sv` distributes `HRDATA` directly to IFU and LSU; it does not traverse EBU. |
| Boot ROM and RAM | `rom_ahb` and `ram_ahb` are enabled in the FPGA configuration. IROM/DTIM are disabled. |
| SD control | Instance `sdc` uses module `spi_apb` with `PSEL[5]` and the SDC pins. The separate `spi` instance is not connected to the SD slot. |
| External drawing port | `ahbapbbridge` passes `PSEL[7]` as `PSELEXT` to `rasterix_apb`. |
| Forwarding | `datapath.sv` uses two mux3 selectors for register data, `ResultW` and `IFResultM`, before its two ALU operand selectors. |
| Result routing | Execute alternative-result selection is grouped; the Memory-stage FPU integer selection is separate. Result data and `ResultSrcW` control use distinct lines. |
| Store routing | `lsu.sv` routes store data to D-cache or the uncached bus path. Byte selection, alignment and atomic processing are grouped. |
| Register-file clock | `regfile.sv` writes on `negedge clk`, shown by an inverted clock input. Pipeline registers use rising edges. |
| Shared DDR | `rasterixmem.tcl` connects CPU, buffered GPU AXI and read-only display AXI to SmartConnect and MIG. The GPU AXI buffer differs from command/response FIFOs. |
| Display | `rasterixdisplay.sv` exchanges read requests/responses with memory and swap control with RasterIX. Pixel data do not travel on the swap-control link. |

The `rasterix` wrapper outline, IFU uncached-instruction selection, compressed
instruction expansion, load/store formatting, prediction, privilege/FPU/MDU
internals and many control/reset/clock/interrupt nets are omitted. Speaker
notes describe the aggregation boundaries. AMD IP fill is independent of
the blue outlines used for functions covered in the main presentation.

## Embedded demonstration

Slide 10 embeds the reviewed 30-second E8 clip without further transcoding:
`experiments/basic-operation-20261108/video/breakout-30s.mp4`.
It was recorded on November 8, 2026 using the isolated research HDMI display
variant documented in the same experiment directory. The default product
checkout is unchanged. The clip derivation and complete recordings are retained.
Click the video in a slideshow to play it. It needs no external media file.
Markdown links to the same recording. This is deterministic autoplay, not
manual controller input. Recorded video rate is not a game-FPS measurement.

`embed_video.py` adds Office video relationships and click-to-play timing to
the Artifact Tool poster. Public text, notes and image metadata are sanitized
before adding the reviewed video. The helper rejects a video whose exact hash
is absent from the media-review record. Publication hooks remain unchanged.
Static rendering is not a native PowerPoint playback test. The builder
validates and imports the still-frame edition before embedding the video.
The final video-bearing package receives the same integrity and layout checks
without re-importing the video into Artifact Tool, whose picture construction
limit rejects the existing recording. Native PowerPoint rendering and the
exact reviewed video hash supplement these checks.

## Build

Use the bundled Artifact Tool environment described in the parent README.
`node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY`
delegates to this builder. It produces a PPTX, Markdown, PNG previews and
private validation records. Private cover input remains outside the repository.
Review final slides and media, run the privacy audit, and import selected public
outputs into `docs/presentation`. Do not import private build records.

There are eleven main slides and five hidden question slides. The main narration
allocation is 355 seconds including 30 seconds of video; slide 2 receives
20 seconds and slide 3 receives 15 seconds. This is not a timed rehearsal. Controller support
remains future work.

Presentation labels and Japanese narration use 描画回路 for the rendering core.
Actual source paths retain RasterIX identifiers. On question slide 12,
描画回路 denotes RasterIX_IF and 描画接続回路 denotes rasterix_apb; this wording
change does not rename or alter the product modules.

## DDCA course-listing question slide

Hidden slide 13 uses `ddca-map.mjs` and the curated data in
`../ddca-adoption/`. It draws one editable prefecture map for Kosen, undergraduate and graduate
courses. Multicolor stripes show overlapping categories. Total institution
counts deduplicate universities with both undergraduate and graduate records. Reference-book listings and
historical years are explicitly included; this is not an adoption-rate survey.
The source dataset generates both the colored prefectures and institution
counts. See the [course evidence table](../../../docs/presentation/DDCA授業利用の出典.md).
For a private build with prepared, unimported data,
`PRESENTATION_DDCA_ASSET_DIRECTORY` can point at that data directory.
The normal build reads `source/presentation/ddca-adoption` in this repository.

## RVSOC design conventions

The palette follows the published Figure 23.2: board background `#E5EBF8`,
FPGA background `#CCD9F1`, AMD IP `#77A3DC`, and ink `#231F20`.
The published PDF and the editable Visio source have different RGB values;
the published figure is the appearance reference. Pipeline symbols and
stage layout follow Figure 7.11. On question slide 12, blue outlines and
paths map to functions and data movement introduced in main slides 4-9.
PC and the +4 operation, register-file access, address calculation,
instruction/data transfers, address decoding, SD control (`sdc` / `spi_apb`), the DDR
controller, drawing and display are highlighted. Only +4 is blue in the
+2/+4 label because compressed-instruction stepping was not introduced.

A blue route can pass through a black-outlined detail block. It describes
the transfer, not an explanation of that block's internal implementation.
Extension, MMU/cache internals, bus conversion, clock conversion, FIFOs,
pipeline stages, selectors and control remain unhighlighted. Display
handoff and completion signals also remain black. Dark blue fill is
reserved for AMD memory/interconnect IP independently of presentation
coverage, while pale backgrounds identify hierarchy. The slide legend
and speaker notes distinguish these meanings.

Japanese labels use Yu Gothic, Latin circuit labels Arial, and code Consolas.
These are explicit presentation adaptations, not claims to reproduce the
book's exact typefaces. The slide canvas and abstract's required one-page,
two-column layout are retained rather than copying the book's page layout.
Native PowerPoint and Word exports supplement the package/layout checks:
inspect every slide and both public and submission abstract pages after edits.

## FPGA resource question slide

Hidden slide 14 uses `fpga-resources.mjs` and follows the hierarchy in
Pong P. Chu (2018), Chapter 2, Sections 2.1.1-2.1.2 and Figure 2.1.
A generic logic cell contains a lookup table, a D-type flip-flop and
output selection. A separate group of dedicated macro cells includes
block random access memory, arithmetic, clock-management and I/O circuits.
These resources connect through programmable routing. Full names are
visible; the notes also define the usual abbreviations.

The editable cell illustrates both direct and registered output paths;
it does not reproduce a physical Artix-7 slice or imply that block memory
is inside a generic cell. The notes separately explain Artix-7 grouping,
carry logic, distributed memory, memory clocking and resource mapping.
Counts, placement and utilization are outside the diagram's scope.
The external DDR3 chip is distinguished from on-chip block memory.
The original textbook artwork is not embedded or redistributed. Book,
AMD and Digilent references accompany the notes and Markdown.

## FPGA utilization question slide

Hidden slide 15 is an editable table built by `fpga-utilization.mjs` from
`experiments/basic-operation-20261108/results/implementation.json`.
It uses the November 8, 2026 post-route result for the research HDMI variant shown
in the embedded demonstration. LUTs, slice registers, block-memory tile
equivalents and DSP blocks are reported for the complete design. Counts and
percentages are checked against the saved record during generation. The
table does not attribute the whole design to the graphics circuit, include
external DDR3 capacity, or interpret spare resources as frequency headroom.
The existing eleven-slide narration remains 355 seconds.

## RVSOC textbook adoption question slide

Hidden slide 16 summarizes three documented textbook-designation or use
examples, including historical draft use. Its editable table is generated
by `rvsoc-adoption.mjs` from `source/presentation/rvsoc-adoption/records.json`.
The sources are official course materials and an instructor-authored ASEE
paper. See the published source register for the dates, scope and exclusions.
Reference-only listings, matching course titles, author affiliations and
library holdings are not counted as textbook adoption. This is not an
exhaustive inventory of current users. The main narration remains 355 seconds.
