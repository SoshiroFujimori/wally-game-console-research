# Presentation diagrams and builder

This is the active builder for the single published intermediate presentation:
[slides and narration](../../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../../docs/presentation/中間発表_主要事項.pptx).
Earlier presentation outputs are not retained beside the current deck.

## Diagram structure

Slide 2 identifies the FPGA beneath the black heat sink in the Nexys Video
photograph. The AND gate and SystemVerilog show the same small circuit example.
The SD slot is on the underside. Schematic positions are not physical placement.

Slides 3 and 4 use the same enlarged chip view, with instruction and data
memories inside the FPGA. Slide 3 traces `lw x1,8(x0)`: read 3 from data
address 8 into x1. Slide 4 adds PC+4 and traces `sw x1,12(x0)`: store that 3
at data address 12. The address from the ALU and the value from the second
register-file port follow separate routes. The store's immediate is shown
as an extracted value, not as a false contiguous field in the machine word.

Slide 5 returns to the whole board and adds the bus and AMD DDR controller.
It keeps the same store example, replacing the local memories with accesses
to external DDR3. PC+4 remains present. Slides 6-8 add SD control, RasterIX
and display. `BOARD` in `board-circuit.mjs` preserves datapath relationships;
`chipView` applies one uniform zoom to slides 3-4. Worked addresses are teaching
examples. The FPGA build does not enable IROM or DTIM.

The MIG generator is `console/fpga/generator/ddr3-nexysvideo.tcl`. Its internals
are omitted. The sender adapter is grouped into RasterIX in the main slides.
Cache/MMU internals, framebuffer internals and arbitration are appendix topics.

The hidden question slide extends the RVSOC Figure 7.11 pipeline layout.
`wally-overview.mjs` keeps the PC, register file, ALU, stage boundaries,
operand selectors and lower writeback/forwarding paths. MMU/cache/bus paths
replace IROM/DTIM. EBU, uncore, memory IP and graphics extend the datapath.
The separate command and response FIFOs show their transfer directions.
It is not an exhaustive or cycle-accurate RTL/netlist drawing. More detailed
module diagrams remain in `../wally-circuit.mjs` for future question slides.
Source and omission notes are in the speaker notes.

## Embedded demonstration

Slide 9 embeds the reviewed 30-second E6 recording without transcoding:
`docs/thesis/再現資料/実験記録/E6/report/results/video/breakout-latest-30s.mp4`.
Click the video in a slideshow to play it. It needs no external media file.
Markdown links to the same recording. This is deterministic autoplay, not
manual controller input. Recorded video rate is not a game-FPS measurement.

`embed_video.py` adds Office video relationships and click-to-play timing to
the Artifact Tool poster. Public text, notes and image metadata are sanitized
before adding the reviewed video. The helper rejects a video whose exact hash
is absent from the media-review record. Publication hooks remain unchanged.
Static rendering is not a native PowerPoint playback test.

## Build

Use the bundled Artifact Tool environment described in the parent README.
`node source/presentation/build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY`
delegates to this builder. It produces a PPTX, Markdown, PNG previews and
private validation records. Private cover input remains outside the repository.
Review final slides and media, run the privacy audit, and import selected public
outputs into `docs/presentation`. Do not import private build records.

There are ten main slides and one hidden question slide. The main narration
allocation is 355 seconds including 30 seconds of video; it is not a timed
rehearsal. Existing E6 results and scope are unchanged. Controller support
remains future work.
