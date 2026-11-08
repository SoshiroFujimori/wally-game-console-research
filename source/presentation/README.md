# Intermediate presentation

This directory builds the single published presentation:
[slides and narration](../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../docs/presentation/中間発表_主要事項.pptx).
It contains eleven main slides, one clickable contents slide, and six hidden
question slides. Earlier editions
remain in Git history rather than beside the current output.

## Build and publication

Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATION_SKILL` to the
installed Artifact Tool runtime and presentation skill. Use a private build
directory outside the repository:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The entry point delegates to `board-evolution/build.mjs`. Its default is the
public edition: it sanitizes the package with the private redaction settings
and validates its structure and layout. Content import checks cover all eighteen
slides in two contiguous batches (1-11 and 12-18), because the complete deck
exceeds the runtime's default aggregate XML import limit. The builder then adds
native slide-jump links and the reviewed video, and validates the completed
package. Native PowerPoint review checks that final deck's rendering and
navigation. Question previews use twice the slide resolution for reading on
GitHub. Diagrams, wires, labels and contents entries remain editable; the
gameplay video is embedded.

For a school copy, set `PRESENTATION_AUDIENCE=private` and
`PRESENTATION_PRIVATE_COVER_JSON` to a private JSON file outside this repository.
Only that private edition reads the `student` and `supervisor` cover fields.
Do not import or publish it. Both editions share the circuit and narration
sources. No private names belong in this source tree.

Review the public slides and media, import selected outputs through
`tools/publication/sanitize.py`, update the media-review record, and run the
privacy and reference checks. Refresh `publication/files.json` from the intended
Git index. Keep build receipts, old local variants and private copies outside
the public repository. Publication hooks must remain enabled.

## Content and design

Slides 4-5 explain `lw` and `sw` using the same FPGA-internal memories. Slide 6
adds the bus and AMD DDR controller to that datapath. SD control, RasterIX and
display are then added in turn. The RVSOC Figure 7.11-derived pipeline remains
the basis of the hidden whole-system diagram. Detailed scope, omissions and
embedded-video handling are in the [builder notes](board-evolution/README.md).

The notation and typography follow Harris et al., *RISC-V System-on-Chip
Design* and the [authors' figure resources](https://pages.hmc.edu/harris/ddca/rvsocd.html).
Source hashes are retained in [design-reference.json](design-reference.json).
White register symbols, ALU/MUX shapes and word-versus-control line weights
follow those references. Arial, Yu Gothic and Consolas are font adaptations.
Blue highlights the current route or previously explained functions; it does
not encode clock domains. Slide 2 uses a code example and an editable board
schematic without a photograph. Slide 3 retains the board geometry and
shows the research purpose using the CPU and graphics functions inside the
chip. The source paths retain upstream identifiers,
while audience-facing labels call RasterIX the drawing circuit (描画回路).
The source includes unused detailed module drawings for possible question
slides; they are not additional published presentation editions.

Results retain the existing E6 scope: four image comparisons, 300.011 seconds
of autoplay, and a separate 30-second capture. No new hardware measurement,
educational-effectiveness test or universal display compatibility is claimed.
Controller support remains future work. The 355-second narration allocation
includes the 30-second video and is not a timed rehearsal.

Hidden slide 13 summarizes selected DDCA syllabus listings on one prefecture map.
Multicolor stripes show overlapping categories.
The [dataset and map provenance](ddca-adoption/README.md) preserve institution,
course, year, book role and public sources. The map includes historical
reference-book listings; gray prefectures are unverified, not known non-users.

Hidden slide 15 follows Chu (2018), Chapter 2, Sections 2.1.1-2.1.2,
Figure 2.1: generic logic cells, programmable interconnect and dedicated
macro cells. The lookup table and D-type flip-flop are inside the cell;
block random access memory is a separate macro-cell resource. Full names
appear on the editable diagram in `board-evolution/fpga-resources.mjs`.
The cell has a direct output path and a registered output path. Notes
explain the actual Artix-7 slice/CLB grouping separately from this generic
schematic. No resource counts, utilization or physical placement are
claimed, and external DDR3 remains distinct from on-chip block memory.

## FPGA utilization question slide

Hidden slide 16 is an editable Before/After percentage table built by
`fpga-utilization.mjs` from
`experiments/fpga-resource-comparison-20261108/comparison.json`.
Before uses the saved September 8, 2026 routed Wally-only report; After uses
experiment E8's November 8, 2026 research HDMI implementation, which also
supplied the circuit configuration for the embedded demonstration.
LUTs, slice registers, block-memory tile equivalents and DSP blocks are
reported for each complete design on the same FPGA. The slide shows
percentages, while the linked records retain the counts used to verify them.
Generation checks the report hash, resource capacities, percentages and the
qualified After bitstream identity.

This is a historical comparison of two archived implementations, not a
controlled measurement of the cost of adding only RasterIX. The Before
report does not identify an exact source revision or bitstream hash. The
source register preserves that limitation and distinguishes original and
sanitized report hashes. The existing eleven-slide narration remains
355 seconds.

## RVSOC textbook adoption question slide

Hidden slide 14 summarizes three documented textbook-designation or use
examples, including historical draft use. Its editable table is generated
by `rvsoc-adoption.mjs` from `source/presentation/rvsoc-adoption/records.json`.
The sources are official course materials and an instructor-authored ASEE
paper. See the published source register for the dates, scope and exclusions.
Reference-only listings, matching course titles, author affiliations and
library holdings are not counted as textbook adoption. This is not an
exhaustive inventory of current users. The main narration remains 355 seconds.
