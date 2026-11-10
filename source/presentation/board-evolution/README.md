# Research presentation with answer slides

This builder produces the current published presentation, with one cover,
eight content slides, one hidden contents slide and seventeen hidden answer slides. It follows the research outline: FPGA background, prior
implementations and teaching, research overview, software, address decoding,
resource utilization, the recorded game, and the conclusion.

The planned allocation is 330 seconds including the 30-second embedded video.
This is a plan, not a timed rehearsal. The first nine slides form the main talk. Contents is slide 10; answers are
slides 11-27. The total file has 27 slides. Native links connect every page number to contents and each
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
clear of register labels. The contents has one column for the main talk and two columns for answers.
Six category headings group the answer topics. Each answer slide repeats its
category above the title, and a category heading links to its first slide.

Run with the bundled Artifact Tool runtime described in the parent README:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The builder creates a 27-slide PPTX and Markdown narration. Editable content
is imported and rendered in six contiguous batches. Package integrity, geometry,
fonts, the native tables on slides 7, 12, 14 and 15, internal navigation, and video relationships are
checked. Inspect all slides in a native PowerPoint render before publication.
Keep build files outside OneDrive and import only selected sanitized output.
Public cover identities are redacted; private school copies remain local.

## Answer slides

The teaching examples and FPGA elements are on slides 11-13. Wally's active
features are native tables on slides 14-15. The combined datapath is on slide
16, the whole-system diagram on slide 17, and the RasterIX pipeline on slide 18.
Slides 19-27 retain the nine OpenGL explanations. Existing slide bodies are
retained; their page numbers and internal references follow these positions.
`navigation.mjs` defines contents and native slide targets. The six categories
are textbook adoption (11-12), FPGA and CPU (13-17), graphics hardware (18),
OpenGL geometry (19-21), OpenGL text (22-25), and OpenGL execution/display
(26-27). Main slides and contents retain their positions.

`wally-features.mjs` draws the two tables. `wally-features.json` records the
configuration inheritance, effective parameters, hardware revision, bitstream
hash and the hashes of nineteen supporting configuration/RTL files. The builder
checks those hashes against `console/` and checks the recorded bitstream identity.
The selected files match both the frozen hardware source and the current console
reference. The tables describe configured hardware, not new runtime tests of
every ISA extension or virtual-memory mode. In particular, the FPGA configuration
overrides `BPRED_SIZE` to 12: Gshare has 4,096 two-bit entries, the BTB has 1,024
entries, and the return-address stack has sixteen entries. Each cache is 16 KiB,
four-way, with 64-byte lines. Extended explanations and source links are in the
companion Markdown for slides 14-15.

The earlier 29-slide version remains at
`55c3d006e68652b288fdc91a579cf6d6a1f3794d`; the ten-slide main-only checkpoint is
`fd2ca0fd1ae85a17b9693081808dd79a58b40e68`.

Diagram labels use `描画回路` as the short name for the combined drawing and display functions.
