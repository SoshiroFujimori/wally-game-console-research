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
