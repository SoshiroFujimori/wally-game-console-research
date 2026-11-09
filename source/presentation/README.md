# Intermediate presentation

This directory builds the single published presentation:
[slides and narration](../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../docs/presentation/中間発表_主要事項.pptx).
The abstract-based main talk has twelve content slides plus a cover and a
355-second allocation,
including a 30-second video. Clickable contents and seven hidden question slides
follow it. See [builder notes](board-evolution/README.md) for sources and scope.

## Build

Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATION_SKILL` to the
bundled Artifact Tool environment. Use a private directory outside OneDrive:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The entry point delegates to `board-evolution/build.mjs`. Public output is
sanitized with the private redaction settings. The twenty-one-slide content is
imported in four batches before adding internal slide jumps and the reviewed
video. The complete final package is checked structurally and rendered in
native PowerPoint. Preview images and the Markdown counterpart permit reading
on GitHub. Circuit blocks, signal lines, code, tables and links remain editable.

For a separate school copy, `PRESENTATION_AUDIENCE=private` and
`PRESENTATION_PRIVATE_COVER_JSON` read private cover fields from outside the
repository. A verified cover-only patch of the public build is also possible.
Never publish that copy or the private input. Inspect all output slides, run
the local privacy audit, and keep the publication hooks enabled.

## Content

The main talk explains the FPGA board, the game-console extension, SD read
requests and returned data, DDR3 storage and execution, drawing commands and
image output. It identifies the added circuit/software work and uses one video
slide for the observed game behavior. The main drawing source is `board-evolution/stable-board.mjs`.
Slides 2-11 share fixed board/chip and physical-component positions; slides
4-11 retain the same circuit and signal geometry as each transfer is explained.
Slide 7 extends slide 6 by highlighting the alternating SD-read/DDR-write copy.
The code-panel helper is in `board-evolution/abstract-flow.mjs`. The diagrams use the abstract's address map and the existing RVSOC-inspired palette,
line conventions and fonts. `design-reference.json` retains source provenance.

Question slide 19 integrates the earlier seven explanations into one connected
diagram. It retains the single-cycle CPU arrangement and shows the two memory
interfaces, request multiplexers, address decode, selected response, SD-copy
path, drawing command write, and shared image storage/output. This view is in
`board-evolution/merged-datapath.mjs`. The detailed pipeline diagram and RasterIX
pipeline follow on slides 20 and 21. The former seven-slide section remains
recoverable at commit `e6484b91a443f65896ab058a1204c87ae9fe3360`.

Observed behavior is bound to the standard-output recording in
`experiments/dvi-recovery-20261109`, also used by the current abstract. Main slides report movement, rebounds and block removal.
Controller input and home-screen/menu GUI work remain future extensions.
The source and notes retain display-configuration and evidence distinctions.
No educational-effectiveness measurement or universal display compatibility
is claimed. Question-slide datasets preserve their own dates and scope.
