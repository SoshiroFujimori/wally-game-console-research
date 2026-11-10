# Research presentation with answer slides

This builder produces the current published presentation, with one cover,
eight content slides, one hidden contents slide and fifteen hidden answer slides. It follows the research outline: FPGA background, prior
implementations and teaching, research overview, software, address decoding,
resource utilization, the recorded game, and the conclusion.

The planned allocation is 330 seconds including the 30-second embedded video.
This is a plan, not a timed rehearsal. The first nine slides form the main talk. Contents is slide 10; answers are
slides 11-25. The total file has 25 slides. Native links connect every page number to contents and each
contents entry to its destination; hidden slides are skipped during ordinary
sequential presentation.

## Content and evidence

`main-slides.mjs` contains the slide text and speaker narration.
`stable-board.mjs` draws the FPGA introduction. `research-context.mjs` keeps
CPU, controllers, removable media and video output in fixed positions across
slides 3-6 and 9. Solid boundaries show board and chip containment; the dashed
boundary identifies existing Wally repository components. The SD controller
connects to the physical slot, with the inserted card drawn beyond the slot.

Slide 3 introduces Wally with existing peripheral controllers and a separate
RasterIX FPGA example. The CPU can load a program from SD into main memory and
execute it. RVSOC adoption examples establish a teaching context. Slide 4 combines
these functions, highlighting graphics integration and the SD card game program.
The summary reuses that composition. The simplified main diagrams aggregate
protocol and clock-domain adaptation into the graphics path. The answer diagrams
retain the implementation details and the original horizontal CPU datapath.

Slide 5 compares conceptual C writes to DDR at `0x80000000` and the drawing
command port at `0x10080000`. The DDR address range is `0x80000000` through
`0x9FFFFFFF`; the enabled external APB range is `0x10080000` through `0x100800FF`.
The companion Markdown identifies the fragments as explanatory examples. Slide 6 draws independent
decoder-enable paths to every illustrated peripheral, with the graphics target
selected for the demonstrated command address.

Slide 7 loads and validates `experiments/standard-display-resources-20261110`.
Both columns include CPU and peripheral circuits; their difference is not an
isolated measurement of the RasterIX core. The After column is tied to the
standard-display bitstream used in the recorded demonstration. Evidence and
revision limitations remain in the companion Markdown. PowerPoint presenter
notes are empty in both public and private copies.

Slide 8 embeds `source/presentation/assets/breakout-standard-dvi-compatible.mp4`
and starts it automatically. The recording and poster come from
`experiments/dvi-recovery-20261109`. It shows automatic play and retains the
latest title-top layout. The embedded media are hash-checked and unchanged.
No controller operation or game frame-rate measurement is claimed.

## Component provenance

| Component | Implementation source |
| --- | --- |
| CPU, bus, SD control | Existing Wally/CVW RTL. |
| DDR memory control | AMD MIG IP integrated through the Wally FPGA build; Nexys Video configuration was added in this work. |
| Drawing core | Official RasterIX, `rtl/RasterIX/RasterIX_IF.v`. |
| Display core | RasterIX-bundled `rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v`, originally from ultraembedded. |
| Integration | Local `rasterix_apb.sv`, `rasterix.sv`, and the control wrapper in `rasterixdisplay.sv`, including instantiated AMD IP. |

The diagram groups drawing and display in one box by repository source. It does
not assign authorship of third-party components to the repository maintainer.
The current physical build and video use the standard RasterIX-bundled display.

## Design and generation

The RVSOC-style blue/black palette, Yu Gothic, Arial and Consolas, and editable
1280 by 720 canvas are retained. `circuit-wiring.mjs` uses native filled shafts
and heads so shafts do not protrude beyond arrowheads. Junction dots mark
connected branches; unconnected crossings use gaps. Board components have shared
positions in the overview and operational diagrams. Keep card labels clear of
the slot outline, signal names clear of block boundaries, and clock symbols
clear of register labels. The contents uses separate row spacing for the main
talk and answers, with a divider before the OpenGL topics.

Run with the bundled Artifact Tool runtime described in the parent README:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The builder creates a 25-slide PPTX and Markdown narration. Editable content
is imported and rendered in five contiguous batches. Package integrity, geometry,
fonts, the native tables on slides 7 and 12, internal navigation, and video relationships are
checked. Inspect all slides in a native PowerPoint render before publication.
Keep build files outside OneDrive and import only selected sanitized output.
Public cover identities are redacted; private school copies remain local.

## Answer slides

The teaching examples and FPGA elements are on slides 11-13. The combined
datapath is on slide 14, the detailed whole-system diagram on slide 15 and the
RasterIX pipeline on slide 16. Slides 17-25 retain the nine OpenGL explanations.
Their body content is retained, with diagram labels aligned to the objects they
describe. The numbering and internal references follow the current positions.
`navigation.mjs` defines contents and native slide targets.

The earlier 29-slide version remains at
`55c3d006e68652b288fdc91a579cf6d6a1f3794d`; the ten-slide main-only checkpoint is
`fd2ca0fd1ae85a17b9693081808dd79a58b40e68`.
