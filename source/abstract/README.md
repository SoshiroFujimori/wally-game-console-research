# Abstract figures

`game-flow.svg` uses three nested levels: the pale board, the inset blue FPGA
chip, and white circuit blocks within the chip. Dashed rectangular outlines
identify the sources of the circuits and IP settings. Gaps around crossing
signals keep those outlines clear of arrowheads.

Readback paths run toward the selector below the CPU.
The selected read data returns to the CPU at the input labelled `RD`. The
legend uses `AD` for the address and pairs `WD` (write data) with `RD`
(read data). `WE` is the one-bit write enable: 0 selects reading and 1 selects writing during an active
transfer. The figure and body both state this mapping explicitly. Drawing commands run
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

The abstract uses a separately numbered `コード1` caption below an editable,
monospaced C fragment. A Japanese comment above each access explains its
purpose without wrapping beside the code. A pale background, black horizontal
rules and monospaced code follow
the visual treatment of RVSOC Code Example 3.1 (printed p. 92). The abstract
adds restrained syntax highlighting: dark blue for C keywords and types,
muted purple for numeric literals, and dark gray for comments. Identifiers and
punctuation remain black. These token colors are an adaptation for this
abstract, not a claim that the book uses the same C syntax palette. All colors
remain dark enough for monochrome printing. RVSOC puts that
caption above its example; this abstract places it below for consistency with
the figure captions. The label and placement are editorial choices, not a
universal rule for abstracts. The fragment illustrates physical-address accesses;
it is not the Linux game program or a complete SD driver. Declarations of
`request`, `data`, and `cmd`, the `<stdint.h>` header, controller initialization,
SD protocol exchanges, transfer waits, and address mapping are omitted.
The conceptual fragment also omits `volatile`; actual MMIO accesses require
the appropriate compiler and platform access semantics. This omission is for
explaining address selection and must not be copied into the real driver.
The Japanese SD comments refer to communication through the SD controller;
the CPU does not access the card's pins directly.
`request` is one request byte; `cmd` is an intermediate 32-bit word of a
prepared drawing command list. The final-word port is omitted from this
fragment to focus on address-based access. The actual driver still sends the
last word through `CMD_LAST`; a normal-port write alone does not complete a
transfer. The 32-bit variable
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

### Publication precedents

The following examples support including a short, discussed code fragment in
a summary or proceedings manuscript. They do not establish one mandatory
caption name or position. Full-paper abstracts consisting of a short opening
paragraph are not the format being compared here.

- [Kyoto Sangyo University, R06 graduation thesis summaries](https://www.cc.kyoto-su.ac.jp/~ogihara/lab/R06_ogihara_labo.pdf#page=4),
  PDF p. 4: one page, two columns; five lines of shell code in a box, followed
  by `図3. パス文字列型の配列の使用例`. The text refers to the figure and its lines.
- [Kyoto Sangyo University, R07 graduation thesis summaries](https://www.cc.kyoto-su.ac.jp/~ogihara/lab/R07_ogihara_labo.pdf#page=2),
  PDF p. 2: a one-page summary uses a source-code image with a caption below,
  `図1 日本語識別子を部分的に利用したソースコード例`.
- [IPSJ 72nd National Convention, pp. 553-554](https://ir.library.osaka-u.ac.jp/repo/ouka/all/50437/ipij-z_72_1_553.pdf#page=2):
  a two-page paper uses code fragments in a diagram and places `図1` below it.
  The deposited PDF includes a repository cover sheet before the two pages.
- [JSSST 2021 convention paper 46-L](https://jssst.or.jp/files/user/taikai/2021/papers/46-L.pdf#page=4),
  PDF p. 4: boxed code uses `コード1`, `コード2`, and captions below. This is
  a twelve-page paper, cited only as a naming and layout precedent, not as a
  short-abstract example.

The code is limited to four address accesses. Its caption, preceding paragraph,
and Japanese comments explain the purpose and scope. Declaration boilerplate,
initialization, waits, and the complete SD transaction sequence are omitted.
The fragment remains editable in Word and fenced as C in the Markdown version.
Review the full one-page layout in both color and grayscale after rebuilding.

## Display provenance

The functional figure separates official RasterIX drawing from the display
circuit. The demonstrated system uses the E8 research scanout with hdl-util/hdmi.
Only the drawing block belongs inside the RasterIX source outline. Display
implementation details and the standard-output comparison remain in
[the reproduction record](../../experiments/dvi-standard-check-20261108/README.md).
The abstract body reports observed gameplay without discussing capture software.
