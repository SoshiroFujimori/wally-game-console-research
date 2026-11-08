# Abstract-based presentation

This builder produces the single published intermediate presentation:
[slides and narration](../../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../../docs/presentation/中間発表_主要事項.pptx).
Its eleven main slides follow the current abstract. Slide 12 is clickable
contents; slides 13-18 are hidden question slides. The narration allocation
is 355 seconds including the 30-second embedded video, not a timed rehearsal.

## Main explanation

| Slide | Subject | Diagram or evidence |
| --- | --- | --- |
| 1 | Title | Public identities are withheld; the school copy retains its private cover. |
| 2 | FPGA circuit implementation | HDL and an AND gate, with physical SD, DDR3 and HDMI parts. |
| 3 | Game-console extension | Existing CPU/drawing circuits and the added adapter, inside the FPGA. |
| 4 | Writing by address | A, D, W and separate select signals; an example DDR3 write of 7. |
| 5 | Reading by address | The same layout with selected return data routed to the CPU. |
| 6 | SD-to-DDR loading | CPU-controlled transfers and three concrete C address accesses. |
| 7 | Drawing-command submission | CPU library, command words, adapter, and one address-write example. |
| 8 | Image storage and output | Drawing to DDR3 and display reads through the memory controller. |
| 9 | Hardware checks | Three FPGA reconfiguration/boot trials, each with a 30-second recording. |
| 10 | Demonstration | The later reviewed 30-second autoplay video. |
| 11 | Conclusion | A published Wally extension example; controller/GUI work remains planned. |

`abstract-flow.mjs` draws editable functional diagrams and code panels.
Slides 3 and 6-8 keep the same component positions. Slides 4-5 show the
CPU/peripheral access portion in an enlarged signal view. Blue emphasizes
the path being discussed. Wally's processor datapath and instruction encoding
are not prerequisites for this main explanation.

The access view separates address A, write data D, write indicator W, and
selection signals S0-S2. Only one destination accepts a transfer, and a
selector returns that destination's read value. The selects are explanatory
names, not RTL bit indices. Timing, wait states, transfer width, bus conversion,
and clock-domain logic are omitted. The source correspondence is preserved
in the notes and the detailed question diagram.

The C fragments use the same addresses as the abstract. They omit initialization,
complete SD transactions, waits, declarations, address mapping and `volatile`.
The final-word write is also omitted from the main fragment; the notes
identify the actual completion port. They are conceptual excerpts, not an
executable driver. The real MMIO code
is unchanged. See [the address checks and scope](../../abstract/README.md).

## Design and circuit lines

The board/chip/IP palette follows RVSOC Figure 23.2: `#E5EBF8`, `#CCD9F1`,
and `#77A3DC`, with `#231F20` ink. The code panels use a pale fill, monospaced
code and horizontal rules. Yu Gothic, Arial and Consolas adapt the book's
style to an editable 1280 by 720 slide canvas.

`circuit-wiring.mjs` draws native lines, trimmed arrow shafts and solid heads.
Unconnected crossings have gaps in the line geometry; connected branches have
dots. Distinct signals use separate lanes. Package geometry checks must be
supplemented with native PowerPoint rendering and inspection.

## Component provenance

Repository labels identify where the reused components are obtained; they do
not imply that one project authored every included component. The component positions stay fixed across the repeated functional views.

| Diagram component | Acquisition source and implementation |
| --- | --- |
| CPU, bus and SD control | Wally/CVW RTL: `console/src/wally/wallypipelinedcore.sv`, `console/src/ebu/ebu.sv`, `console/src/uncore/uncore.sv`, and `console/src/uncore/spi_apb.sv`. |
| DDR control | Wally's FPGA build integrates AMD MIG IP. `console/fpga/generator/ddr3-nexysvideo.tcl` generates the IP; the Nexys Video settings were added in this work. This is not Wally-authored DDR-controller RTL. |
| Drawing core | Official RasterIX: `rtl/RasterIX/RasterIX_IF.v`. |
| Standard display core | The same official RasterIX repository includes `rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v`, originally from ultraembedded. |
| Integration logic | This work adds `rasterix_apb.sv`, `rasterix.sv` and the swap/configuration wrapper in `rasterixdisplay.sv` on the Wally side. These wrappers are not labeled as upstream RasterIX components. |
| Display used in the embedded video | The research variant replaces the standard display core with research scanout logic and `hdl-util/hdmi`. Its exact sources are recorded in [E8](../../../experiments/basic-operation-20261108/hdmi/README.md). |

The upstream sources are [Wally/CVW](https://github.com/openhwgroup/cvw) and
[official RasterIX at the recorded revision](https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0).
The main functional diagrams label Wally CPU/SD control, AMD memory control,
the reused RasterIX drawing core, and this work's command adapter. The display
block is labeled by its function. It does not assign the recorded display
implementation to the upstream RasterIX repository. Exact implementation
provenance remains in the source records and speaker-note supplements.

## Detailed-diagram connectivity

The question diagram follows the CPU and drawing connections of product revision
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

## Recorded demonstration and scope

Slide 10 embeds `experiments/breakout-title-top-20261108/video/breakout-30s.mp4`
without transcoding, using its reviewed `playing.png` poster. The software
is product `ed6a1c09`; its recording used the same E8 display bitstream as the
earlier boot trials. It is not one of those three trials or the 300-second run.
The player is automatic; controller input is not implemented. Recorded video
rate is not a game-FPS measurement.

The main explanation reports observable output at the FPGA's HDMI connector.
Receiver software and signaling internals are not main-talk topics. The
functional display block is common to the explanations; its exact implementation
and the scope of verified configurations remain recorded in E8 and the later
video's source manifest. Standard-output compatibility is not inferred merely
from successful capture of the E8 configuration.

The video is played by clicking its area during a slideshow. Internal slide
jumps and return links are native OOXML relationships. `embed_video.py` checks
the input video against the approved media hashes; `link_slides.py` adds links.

## Question slides

- 13: DDCA teaching/reference-book listings on one prefecture map, including
  historical examples. See `../ddca-adoption/` for sources and counting scope.
- 14: three documented RVSOC textbook-use examples, including draft use.
  See `../rvsoc-adoption/`.
- 15: generic FPGA logic cells, routing and dedicated macro cells, following
  Chu (2018), Sections 2.1.1-2.1.2 and Figure 2.1.
- 16: Before/After whole-design resource percentages from
  `experiments/fpga-resource-comparison-20261108/comparison.json`. This is a
  historical comparison, not isolated attribution to the drawing core.
- 17: the RVSOC pipeline-derived detailed whole-system diagram. Signal outlines
  are neutral; CPU internals are not marked as explained in the main talk.
- 18: the official RasterIX FPGA pipeline redrawn for the presentation. Its
  version and differences from measured hardware are in `../rasterix-pipeline/`.

## Build and publication

Use the bundled Artifact Tool runtime described in the parent README:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The builder creates PPTX, Markdown, preview images and private QA records.
The still-frame content is re-imported in two contiguous batches because the
full eighteen-slide package exceeds the runtime import limit. The final
video-bearing package receives integrity/layout checks and native PowerPoint
rendering. Inspect all slides, private cover, video identity and internal links.
Keep build data outside OneDrive. Import only reviewed public outputs, update
the media hashes and publication manifest, and run the local privacy audit.

## Previous version

The previous presentation is preserved at commit
`40d8a51bd1ab0d9c9a469146c349cd31b173bdce`:
[published files at that revision](https://github.com/SoshiroFujimori/wally-game-console-research/tree/40d8a51bd1ab0d9c9a469146c349cd31b173bdce/docs/presentation).
The local annotated tag `presentation-before-abstract-20261108` identifies
that commit. Do not assume the local tag has been published. Export the old
files into a separate directory when comparing or restoring a presentation;
do not reset unrelated work or the product checkout.

The display box is generic in the detailed diagram as well. Source notes
record the E8 implementation used for the video and the product-default
display implementation. See the [standard-output comparison](../../../experiments/dvi-standard-check-20261108/README.md).
