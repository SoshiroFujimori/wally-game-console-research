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

## Code example

The abstract uses a separately numbered code caption above an editable,
monospaced C fragment. The fragment illustrates physical-address accesses;
it is not the Linux game program or a complete SD driver. Declarations of
`request`, `data`, `cmd`, and `last`, the `<stdint.h>` header, controller initialization,
SD protocol exchanges, transfer waits, and address mapping are omitted.
`request` is one request byte; `cmd` is an intermediate 32-bit word of a
prepared drawing command list; `last` is its final word. The 32-bit variable
`data` holds the SD receive register value; the `uint8_t` store keeps its low
eight payload bits. The receive operation represents a payload-byte read after
the SD protocol has reached the data phase.
The DDR store illustrates one byte at the start of DDR3, not a safe application
buffer or the actual game's load address. Repeated transfers and subsequent
game execution are explained in the surrounding prose.

Addresses are checked against the pinned console sources:

| Access | Physical address | Source |
| --- | --- | --- |
| SD transmit | `0x00013048` | `SDC_BASE` in `console/config/rv64gc/config.vh`, the `sdc` instance in `console/src/uncore/uncore.sv`, and `SPI_TXDATA` in `console/src/uncore/spi_apb.sv` |
| SD receive | `0x0001304C` | The same SD controller, with `SPI_RXDATA` at offset `0x4C` |
| DDR3 start | `0x80000000` | `EXT_MEM_BASE` in `console/config/derivlist.txt` |
| Drawing command word | `0x10080000` | `console/examples/rasterix/WallyBusConnector.hpp` and `console/fpga/src/rasterix_apb.sv` |
| Final word of a transfer | `0x10080004` | The same command port, with `CMD_LAST` at offset `4` |

The SD controller is the SPI instance at `SDC_BASE`, not the general-purpose
instance at `SPI_BASE`. The addresses also agree with the Nexys Video device
tree and the bootloader's `console/fpga/zsbl/spi.h`. The Linux game maps the
drawing port with `mmap`; direct physical pointers here make the hardware
address selection visible without reproducing that operating-system setup.
