# Abstract figures

`game-flow.svg` uses three nested levels: the pale board, the inset blue FPGA
chip, and white circuit blocks within the chip. Dashed rectangular outlines
identify the sources of the circuits and IP settings. Gaps around crossing
signals keep those outlines clear of arrowheads.

Readback paths run toward the selector below the CPU. Drawing commands run
below the added command port, while the image-memory path runs between RasterIX
and the DDR controller. Distinct signals use separate routing lanes. A gap at
a wire crossing indicates no connection; a black dot marks a connected branch.
The SVG `data-net`, `data-source`, and `data-target` attributes identify the
signal roles for layout review. Text and signal lines remain black for both
color and monochrome distribution. Transfer timing is omitted in this concept
diagram.

The chip header explains that HDL describes the implemented circuitry. Notes
above the external components identify them as physical board parts; the note
below DDR3 states that it stores programs and images. These notes occupy unused
space without changing signal routing.

Figure 2 uses the recorded color frame at `docs/thesis/figs/current-game.png`
without a color or tone transformation. Review the circuit diagram in color and
grayscale at its one-column print size, as well as enlarged.
