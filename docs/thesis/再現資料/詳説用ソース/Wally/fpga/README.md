Wally supports the following boards

1. ArtyA7
2. vcu108
3. vcu118 (Do not recommend.)
4. Nexys Video (`nexysvideo`)

# Quick Start

## Build FPGA

```bash
cd generator
make <board name>
```

Example:
```bash
make vcu108
```

For Nexys Video, use `make nexysvideo`. The CPU runs at 20 MHz and uses the
onboard 512 MiB DDR3. Run `make cleanIP` before switching between boards, since
the generated IP directory is shared.

## Make flash card image
`ls /dev/sd*` or `ls /dev/mmc*` to see which flash card devices you have.
Insert the flash card into the reader and `ls /dev/sd*` or `/dev/mmc*` again.  The new device is the one you want to use.  Make sure you select the root device (i.e. `/dev/sdb`) not the partition (i.e. `/dev/sdb1`).

```bash
cd $WALLY/linux/sdcard
```

This following script requires root.

```bash
./flash-sd.sh -b <path to buildroot> -d <path to compiled device tree file> <flash card device>
```

Example with vcu108, buildroot installed to `/opt/riscv/buildroot`, and the flash card is device `/dev/sdc`

```bash
./flash-sd.sh -b /opt/riscv/buildroot -d /opt/riscv/buildroot/output/images/wally-vcu108.dtb /dev/sdc
```

Wait until the the script completes then remove the card.

For Nexys Video, pass the compiled `wally-nexysvideo.dtb` to `flash-sd.sh` with
`-d`. It describes 512 MiB of RAM and a 20 MHz CPU, timebase, and UART clock.

## FPGA setup

For the Arty A7 insert the PMOD daughter board into the right most slot and insert the sd card.

For the VCU108 and VCU118 boards insert the PMOD daughter board into the only PMOD slot on the right side of the boards.

For Nexys Video, use the onboard microSD slot and the 12 V power supply. Connect
USB PROG (J12) for JTAG and the separate USB UART connector (J13) for the console.
Leave VADJ at its default 1.2 V and select JTAG configuration on JP4.

Power on the boards. For Arty A7 just plug in the USB connector. For the VCU boards make sure the power supply is connected and the two usb cables are connected. Flip on the switch.
The VCU118's on board UART converter does not work. Use a spark fun FTDI usb to UART adapter and plug into the mail PMOD on the right side of the board.  Also the level sifters on the
VCU118 do not work correctly with the digilent sd PMOD board.  We have a custom board which works instead.

```bash
cd $WALLY/fpga/generator
vivado &
```

Open the design in the current directory `WallyFPGA.xpr`.

Then click "Open Target" under "PROGRAM AND DEBUG".  Then Program the device.

On Nexys Video, LD0-LD7 connect directly to GPIO output bits 0-7. SW0-SW7 connect
to GPIO input bits 0-7; input bit 8 is active-low card detect. CPU RESET restarts
the system. The microSD slot stays powered while the FPGA is configured.

## Connect to UART

In another terminal `ls /dev/ttyUSB*`. One of these devices will be the UART connected to Wally. You may have to experiment by the running the following command multiple times.

```bash
screen /dev/ttyUSB1 115200
```

Swap out the `USB1` for `USB0` or `USB1` as needed.

## RasterIX on Nexys Video

The optional `nexysvideo-rasterix` target adds [RasterIX](https://github.com/ToNi3141/RasterIX)
and DVI video on HDMI OUT. RasterIX is an unmodified upstream submodule in
`addins/rasterix`; its source and software library retain their upstream licenses.
Initialize its nested dependencies before building:

```bash
cd $WALLY
git submodule update --init --recursive addins/rasterix
cd fpga/generator
make nexysvideo-rasterix
```

The `nexysvideo-rasterix` target selects the `fpganexysvideo_rasterix`
derivative and sets `RASTERIX=1` for both IP generation and the board's
`RASTERIX_SUPPORTED` parameter. The derivative enables Wally's external APB
port; enabling that port alone does not select a particular peripheral.
An asynchronous command FIFO connects that port to `RasterIX_IF`, with a
64-bit memory interface, a 65536-pixel internal framebuffer, one texture unit,
and depth and stencil buffers. Wally and RasterIX share DDR3 with the upstream
DVI framebuffer through an AXI interconnect. Wally runs at 20 MHz, RasterIX at
100 MHz, and video uses a 25.2 MHz pixel clock (640x480, approximately 60 Hz).
Packet FIFOs buffer complete GPU memory bursts before they reach the shared DDR3
port, so CPU-controlled stream backpressure cannot block CPU memory access.
The display acknowledges a swap after it starts reading the new framebuffer
and drains reads from the previous buffer.

Use `wally-nexysvideo-rasterix.dts` with this design. It reserves the last
32 MiB of DDR3 for textures and display buffers. Build its device tree and pass
the resulting file to `flash-sd.sh -d` as above:

```bash
dtc -I dts -O dtb -i $WALLY/linux/devicetree \
    -o wally-nexysvideo-rasterix.dtb \
    $WALLY/linux/devicetree/wally-nexysvideo-rasterix.dts
```

### Linux example

`examples/rasterix` supplies a Linux implementation of RasterIX's
`IBusConnector` and a small OpenGL example. Build it with a RISC-V Linux C/C++
toolchain; the toolchain must support C++17 and static linking. For example,
with a Buildroot host toolchain directory on `PATH`:

```bash
cmake -S $WALLY/examples/rasterix -B rasterix-build \
    -DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=riscv64 \
    -DCMAKE_C_COMPILER=riscv64-buildroot-linux-gnu-gcc \
    -DCMAKE_CXX_COMPILER=riscv64-buildroot-linux-gnu-g++ \
    -DCMAKE_BUILD_TYPE=Release
cmake --build rasterix-build -j
```

The example uses the upstream command processor to divide each frame into
five strips that fit the internal framebuffer. Its `NoThreadRunner` executes
the processing and transfers sequentially on Wally's single CPU.

Copy `rasterix-build/rasterix-demo` to the board through the SD card. Run as
root because the connector accesses the command registers through `/dev/mem`:

```bash
./rasterix-demo triangle 120
./rasterix-demo cube 120
```

The cube uses RasterIX's upstream `Minimal` example, including texture mapping,
lighting, and depth testing. Solid `red`, `green`, and `blue` scenes are also
available. The driver configuration must match the hardware: display buffers
are at physical addresses `0x9fe00000` and `0x9fc00000`, with textures starting
at `0x9e000000`. Depth and stencil buffers are at `0x9fa00000` and
`0x9f800000`, respectively. RasterIX's buffer locations in CMake are offsets from that
texture-memory base. The reserved device tree is required before running the
example.

### Command registers

Registers occupy `0x10080000` through `0x100800ff`. Only aligned 32-bit accesses
are supported. The region is uncached, non-idempotent, and non-executable.

| Offset | Access | Description |
| --- | --- | --- |
| `0x00` | W | Command word; wait if the FIFO is full |
| `0x04` | W | Last command word of a transfer (`TLAST`) |
| `0x08` | R | Status: bit 0 command ready, bit 1 response available, bit 2 GPU busy |
| `0x0c` | R | Interface ID, `0x52495831` |
| `0x10` | R | Completed display swap count |
| `0x14` | R | Most recently acknowledged framebuffer address |
| `0x18` | R | Response word; wait if the response FIFO is empty |
