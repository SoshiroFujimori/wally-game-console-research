# Intermediate presentation

This directory builds the single published presentation:
[slides and narration](../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../docs/presentation/中間発表_主要事項.pptx).
The abstract-based main talk has twelve content slides plus a cover and a
355-second allocation,
including a 30-second video. Clickable contents and six hidden question slides
follow it. See [builder notes](board-evolution/README.md) for sources and scope.

## Build

Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATION_SKILL` to the
bundled Artifact Tool environment. Use a private directory outside OneDrive:

```sh
node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY
```

The entry point delegates to `board-evolution/build.mjs`. Public output is
sanitized with the private redaction settings. The twenty-slide content is
imported in three batches before adding internal slide jumps and the reviewed
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
slide for the observed game behavior. The main drawing source is `board-evolution/abstract-flow.mjs`.
It uses the abstract's address map and the existing RVSOC-inspired palette,
line conventions and fonts. `design-reference.json` retains source provenance.

The original pipeline-based diagrams remain in source and in the hidden
question diagram. They are not a second published presentation. The previous
main talk is recoverable at commit `40d8a51bd1ab0d9c9a469146c349cd31b173bdce`.

Observed behavior is bound to the standard-output recording in
`experiments/dvi-recovery-20261109`, also used by the current abstract. Main slides report movement, rebounds and block removal.
Controller input and home-screen/menu GUI work remain future extensions.
The source and notes retain display-configuration and evidence distinctions.
No educational-effectiveness measurement or universal display compatibility
is claimed. Question-slide datasets preserve their own dates and scope.
