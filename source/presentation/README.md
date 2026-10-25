# Intermediate presentation

This directory builds the single published presentation:
[slides and narration](../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../docs/presentation/中間発表_主要事項.pptx).
It contains ten main slides and one hidden question slide. Earlier editions
remain in Git history rather than beside the current output.

## Build and publication

Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATION_SKILL` to the
installed Artifact Tool runtime and presentation skill. Use a private build
directory outside the repository:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The entry point delegates to `board-evolution/build.mjs`. Its default is the
public edition: it sanitizes the package with the private redaction settings,
validates the PPTX, re-imports it, and renders all eleven slides. The question
slide is rendered at twice the slide resolution for reading on GitHub.
Diagrams, wires and labels are editable. The gameplay video is embedded.

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

Slides 3-4 explain `lw` and `sw` using the same FPGA-internal memories. Slide 5
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
not encode clock domains. See [assets](assets/README.md) for the board photograph.
The source includes unused detailed module drawings for possible question
slides; they are not additional published presentation editions.

Results retain the existing E6 scope: four image comparisons, 300.011 seconds
of autoplay, and a separate 30-second capture. No new hardware measurement,
educational-effectiveness test or universal display compatibility is claimed.
Controller support remains future work. The 355-second narration allocation
includes the 30-second video and is not a timed rehearsal.
