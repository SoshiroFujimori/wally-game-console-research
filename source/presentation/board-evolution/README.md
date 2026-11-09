# Abstract-based presentation

This builder produces the single published intermediate presentation:
[slides and narration](../../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../../docs/presentation/中間発表_主要事項.pptx).
A cover and twelve presentation slides explain the integration design and its functional evidence. Slide 14
is clickable contents; slides 15-23 are hidden answer slides. The narration allocation
is 335 seconds including the 30-second embedded video, not a timed rehearsal.

## Main explanation

| Slide | Subject | Evidence or role |
| --- | --- | --- |
| 1 | Title | Private cover retained in the school copy. |
| 2 | FPGA and external components | HDL and an AND gate illustrate circuit implementation. |
| 3 | Wally and the objective | A working extension example for Wally learners. |
| 4 | Existing and added parts | Reused CPU/peripheral/graphics components and local integration. |
| 5 | Program loading | SD control returns data to the CPU, which stores it through DDR control. |
| 6 | Game execution | CPU execution updates positions, collisions and score. |
| 7 | Drawing commands | The CPU library prepares commands for the graphics block. |
| 8 | Interface design | Local bus adaptation and an AMD IP for clock-domain transfer. |
| 9 | Image output | Graphics and display use DDR3 through its controller. |
| 10 | Functional checks | Visible objects, motion, brick removal and score updates. |
| 11 | Actual video | The unchanged reviewed 30-second standard-output recording. |
| 12 | Published extension example | Source, execution instructions and functional evidence for learners. |
| 13 | Conclusion and next steps | Verified game behavior and optional controller/GUI work. |

`core-board.mjs` provides a stable functional diagram. It summarizes the
transfers rather than drawing individual bus wires. `stable-board.mjs` retains
the earlier detailed signal diagram and the introductory board views.
The detailed OpenGL and architecture slides remain hidden answer material.
The notes and [presentation essentials](../../../docs/presentation/発表の要点.md)
describe the scope of the claims. No measured educational benefit, global
novelty, comparative speedup or universal reliability is asserted.
The previous deck is preserved at commit
`cbec7498c75ca0e17876c7ea99760ed144367732`.

## Design and circuit lines

The board/chip/IP palette follows RVSOC Figure 23.2: `#E5EBF8`, `#CCD9F1`,
and `#77A3DC`, with `#231F20` ink. The code panels use a pale fill, monospaced
code and horizontal rules. Yu Gothic, Arial and Consolas adapt the book's
style to an editable 1280 by 720 slide canvas.

`circuit-wiring.mjs` draws editable filled shaft polygons and solid heads.
Shafts end at the head base; PowerPoint line caps cannot protrude through
the tip. Heads are placed after the other diagram objects. Junction dots
retain continuous connections when crossings are cut.
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
| Display used in the embedded video | The unchanged standard display configuration, using the RasterIX-bundled `dvi_framebuffer`. See [the recorded configuration](../../../experiments/dvi-recovery-20261109/README.md). |

The upstream sources are [Wally/CVW](https://github.com/openhwgroup/cvw) and
[official RasterIX at the recorded revision](https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0).
The main functional diagrams group circuitry from the Wally repository and the
RasterIX drawing/display circuits by acquisition source. The command adapter
is marked as integration work. The drawing and display share one box, with
image traffic through the AMD controller and output at the HDMI connector.
The exact modules and connection wrappers remain identified in the notes.

Slide 13 repeats the circuit layout to explain the contribution. Dashed frames
identify the Wally and RasterIX repositories as acquisition sources. A solid blue adapter
frame identifies added integration work. The conclusion is the demonstrated
combination into a game console; it does not claim a worldwide first or that
every primitive inside an adapter is newly invented. The AMD controller remains
identified as vendor IP, and peripheral address selection includes the added
configuration for the drawing circuit.

## Embedded demonstration

The presentation embeds [the compatible distribution copy](../assets/breakout-standard-dvi-compatible.mp4)
and starts it automatically when slide 11 is entered in the slideshow.
The original experiment recording is preserved. The distribution file uses
H.264 High, level 4.2, yuv420p and retains the original 1920 by 1080 frame size,
60 frames per second, 1800 frames and 30-second duration. See the
[encoding and source record](../assets/breakout-standard-dvi-compatible.json).
The video is packaged internally, with no local-file dependency.

## Detailed-diagram connectivity

The answer diagram follows the CPU and drawing connections of product revision
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

Slide 11 embeds the compatible H.264 distribution copy of
`experiments/dvi-recovery-20261109/media/latest-standard-dvi-30s.mp4`, using its
reviewed `latest-start.png` poster. This is the sole execution-result slide.
Slide 8 explains the adapter roles; slide 10 introduces the functional checks.
The latest title-top executable
is shown using the unchanged standard display bitstream and RasterIX-bundled
drawing/display cores. Local connection and control wrappers remain integration
work. The player is automatic; controller input is not implemented. Recorded
video rate is not a game-FPS measurement.

The main talk reports motion, removal of hit blocks and score updates.
It makes no repeated-boot, long-duration or universal display claim.
The acquisition conditions, revisions and hashes are retained in the experiment
record. The historical utilization table has its own earlier display variant;
its After column is not the bitstream used in this updated video.

The video starts automatically in a slideshow. Internal slide
jumps and return links are native OOXML relationships. `embed_video.py` checks
the input video against the approved media hashes; `link_slides.py` adds links.

## Answer slides

- 15: DDCA teaching/reference-book listings on one prefecture map, including
  historical examples. See `../ddca-adoption/` for sources and counting scope.
- 16: three documented RVSOC textbook-use examples, including draft use.
  See `../rvsoc-adoption/`.
- 17: generic FPGA logic cells, routing and dedicated macro cells, following
  Chu (2018), Sections 2.1.1-2.1.2 and Figure 2.1.
- 18: Before/After whole-design resource percentages from
  `experiments/fpga-resource-comparison-20261108/comparison.json`. This is a
  historical comparison, not isolated attribution to the drawing core.
- 19: one connected functional diagram integrates the earlier seven load/store,
  memory-interface, decode, SD-copy, drawing-command and image-output views.
  The horizontal CPU layout is retained inside the FPGA board. AD/WD/WE from
  the two memory interfaces enter three coordinated request multiplexers.
  Decoding selects the target, and a response selector returns RD to the
  interfaces. S0-S2 are named connections rather than long overlapping wires.
  The same drawing includes SD registers, the AMD DDR controller, drawing
  command adapter, RasterIX drawing/display and physical board components.
  The load/store examples use x2 as the DDR3 base; the drawing example first
  sets x2 to the command address. The notes distinguish these independent cases.
- 20: the RVSOC pipeline-derived detailed whole-system diagram. Signal outlines
  are neutral; CPU internals are not marked as explained in the main talk.
- 21: the official RasterIX FPGA pipeline redrawn for the presentation. Its
  version and differences from measured hardware are in `../rasterix-pipeline/`.

- 22: Core OpenGL drawing calls for the complete Breakout screen. The code
  connects four vertex positions and a color to a rectangle, while the
  unchanged game capture locates bricks, walls, paddle, ball and text. A
  separate two-line excerpt explains background initialization.
- 23: Texture mapping for one character. Editable diagrams reproduce the
  pinned game's font pixels, select its A cell, and pair image coordinates
  with screen coordinates in the code. The notes include image registration,
  coordinate normalization, color and alpha blending. Both slides explain
  ordinary API usage, without optimization or implementation-tuning claims.
  See `opengl-functions.mjs`.

## Build and publication

Use the bundled Artifact Tool runtime described in the parent README:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The builder creates PPTX, Markdown, preview images and private QA records.
The still-frame content is re-imported in four contiguous batches to keep
the runtime XML construction size bounded. The final
video-bearing package receives integrity/layout checks and native PowerPoint
rendering. Inspect all slides, private cover, video identity and internal links.
Keep build data outside OneDrive. Import only reviewed public outputs, update
the media hashes and publication manifest, and run the local privacy audit.

## Previous version

The original pipeline-based presentation is preserved at commit
`40d8a51bd1ab0d9c9a469146c349cd31b173bdce`:
[published files at that revision](https://github.com/SoshiroFujimori/wally-game-console-research/tree/40d8a51bd1ab0d9c9a469146c349cd31b173bdce/docs/presentation).
The earlier abstract-based deck is preserved at commit
`1c826a0363901f2a77e8bbb0e8748c168bbb2cbc` and local annotated tag
`presentation-before-latest-abstract-20261109`. The tag is a local checkpoint;
the commit is also available in public Git history. Export old files into a
separate directory when comparing or restoring; do not reset unrelated work
or the product checkout.

The version before splitting the two compound explanations into twelve content
slides is commit `fbb34c27ab0f1e5fab338257976076bea32fdbbc`.

The revision before the SD-first explanation is commit
`b0cdac50bbcc638a736b7e1737b33dbf72b6c8d3`.

`merged-datapath.mjs` defines the integrated answer slide.
`board-circuit.mjs` preserves the earlier datapath coordinates and provides a
combined view with externally connected ports. `memory-ports.mjs` supplies
the retained functional correspondence and scope notes. The legacy seven-view
builder `datapath-backups.mjs` remains source material and is not invoked by
the current deck. Independent request outputs are never shorted together.

The revision before unifying the main-talk board geometry is commit
`f4c3d1d13ade4ef0db3428ac08e6d8bd105bf09f`.

The seven-view question section before integration is preserved at commit
`e6484b91a443f65896ab058a1204c87ae9fe3360`.
