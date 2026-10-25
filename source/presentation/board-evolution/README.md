# Presentation diagrams and builder

This is the active builder for the single published intermediate presentation:
[slides and narration](../../../docs/presentation/中間発表_主要事項.md) and
[PowerPoint](../../../docs/presentation/中間発表_主要事項.pptx).
Earlier presentation outputs are not retained beside the current deck.

## Diagram structure

Slide 2 introduces the FPGA board and its physical SD, DDR3 and HDMI
components outside the programmable chip. A SystemVerilog example and its
corresponding AND gate explain describing and implementing a logic circuit.
The gate is an example, not a complete peripheral controller. No photograph
is used. The schematic positions are not physical placement.

Slide 3 gives the research purpose: extend an existing educational CPU with
drawing and display functionality and use the FPGA board as a game console.
It preserves the board, chip and external-component geometry from slide 2,
replacing the AND example with the CPU and graphics functions. This is a
functional overview; detailed peripheral connections appear later.

Slides 4 and 5 use the same enlarged chip view, with instruction and data
memories inside the FPGA. Slide 4 traces `lw x1,8(x0)`: read 3 from data
address 8 into x1. Slide 5 adds PC+4 and traces `sw x1,12(x0)`: store that 3
at data address 12. The address from the ALU and the value from the second
register-file port follow separate routes. The store's immediate is shown
as an extracted value, not as a false contiguous field in the machine word.

Slide 6 returns to the whole board and adds the bus and AMD DDR controller.
It keeps the same store example, replacing the local memories with accesses
to external DDR3. PC+4 remains present. Slides 7-9 detail SD control, RasterIX
and display. `BOARD` in `board-circuit.mjs` preserves datapath relationships;
`chipView` applies one uniform zoom to slides 4-5. The drawing-stage numbers
passed to `drawBoard` are independent of presentation slide numbers. Worked
addresses are teaching examples. The FPGA build does not enable IROM or DTIM.

The MIG generator is `console/fpga/generator/ddr3-nexysvideo.tcl`. Its internals
are omitted. The sender adapter is grouped into RasterIX in the main slides.
Cache/MMU internals, framebuffer internals and arbitration are appendix topics.

Hidden question slide 12 extends the RVSOC Figure 7.11 pipeline layout.
`wally-overview.mjs` keeps the PC, register file, ALU, stage boundaries,
operand selectors and lower writeback/forwarding paths. MMU/cache/bus paths
replace IROM/DTIM. EBU, uncore, memory IP and graphics extend the datapath.
The separate command and response FIFOs show their transfer directions.
It is not an exhaustive or cycle-accurate RTL/netlist drawing. More detailed
module diagrams remain in `../wally-circuit.mjs` for future question slides.
Source and omission notes are in the speaker notes.

## Embedded demonstration

Slide 10 embeds the reviewed 30-second E6 recording without transcoding:
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

There are eleven main slides and two hidden question slides. The main narration
allocation is 355 seconds including 30 seconds of video; slide 2 receives
20 seconds and slide 3 receives 15 seconds. This is not a timed rehearsal. Existing E6 results and scope are unchanged. Controller support
remains future work.

Presentation labels and Japanese narration use 描画回路 for the rendering core.
Actual source paths retain RasterIX identifiers. On question slide 12,
描画回路 denotes RasterIX_IF and 描画接続回路 denotes rasterix_apb; this wording
change does not rename or alter the product modules.

## DDCA course-listing question slide

Hidden slide 13 uses `ddca-map.mjs` and the curated data in
`../ddca-adoption/`. It draws one editable prefecture map for Kosen, undergraduate and graduate
courses. Multicolor stripes show overlapping categories. Total institution
counts deduplicate universities with both undergraduate and graduate records. Reference-book listings and
historical years are explicitly included; this is not an adoption-rate survey.
The source dataset generates both the colored prefectures and institution
counts. See the [course evidence table](../../../docs/presentation/DDCA授業利用の出典.md).
For a private build with prepared, unimported data,
`PRESENTATION_DDCA_ASSET_DIRECTORY` can point at that data directory.
The normal build reads `source/presentation/ddca-adoption` in this repository.
