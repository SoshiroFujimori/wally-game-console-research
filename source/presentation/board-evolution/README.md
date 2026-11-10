# Ten-slide research presentation

This builder produces the current published presentation, with one cover and
nine content slides. It follows the research outline: FPGA background, prior
implementations and teaching, research overview, software, two hardware topics,
resource utilization, the recorded game, and the conclusion.

The planned allocation is 330 seconds including the 30-second embedded video.
This is a plan, not a timed rehearsal. No hidden or answer slides are appended.
The prior complete deck and its answer slides remain in Git history at
`55c3d006e68652b288fdc91a579cf6d6a1f3794d`.

## Content and evidence

`main-slides.mjs` contains the slide text and speaker narration.
`core-board.mjs`, `stable-board.mjs` and `research-context.mjs` retain the board,
chip and component positions used in the earlier presentation. Solid boundaries
show physical containment; dashed boundaries show component repositories.
Only the paths relevant to the current explanation are emphasized.

Slide 3 introduces Wally and RasterIX as examples of FPGA implementations.
Wally's educational system is described by Thompson et al., *RISC-V System-on-Chip
Design Textbook and Course* (2025), DOI 10.18260/1-2--57147. RasterIX is cited
through its official implementation. The listed schools use CPU/circuit-design
textbooks; the slide does not claim that every listed course builds the entire
CPU on an FPGA. Sources and scope are retained in the notes.

Slide 5 uses one conceptual C write to the command port at `0x10080000`.
The notes identify the code as an explanatory fragment and explain the real
transfer and runtime requirements. Slide 6 uses the enabled existing APB region
`0x10080000` through `0x100800FF`; it does not imply a newly written decoder.
Slide 7 distinguishes the locally written protocol adapter from the AMD IP
used for clock-domain crossing.

Slide 8 loads and validates `experiments/standard-display-resources-20261110`.
Both columns include CPU and peripheral circuits; their difference is not an
isolated measurement of the RasterIX core. The After column is tied to the
standard-display bitstream used in the recorded demonstration. Evidence and
revision limitations remain in the speaker notes.

Slide 9 embeds `source/presentation/assets/breakout-standard-dvi-compatible.mp4`
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
connected branches; unconnected crossings use gaps.

Run with the bundled Artifact Tool runtime described in the parent README:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The builder creates a ten-slide PPTX and Markdown narration. Editable content
is imported and rendered in two contiguous batches. Package integrity, geometry,
fonts, the native utilization table on slide 8, and video relationships are
checked. Inspect all slides in a native PowerPoint render before publication.
Keep build files outside OneDrive and import only selected sanitized output.
Public cover identities are redacted; private school copies remain local.

The prior answer-slide modules remain as reusable source and are not invoked by
this ten-slide builder. Their numbering belongs to the archived complete deck.
