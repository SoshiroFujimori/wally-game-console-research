###########################################
## constraints-nexysvideo.xdc
## Purpose: Nexys Video Rev. A board I/O for the Wally-only design.
## Pin source: Digilent/digilent-xdc, Nexys-Video-Master.xdc.
## DDR3 pin locations and PHY timing come from the MIG profile.
## SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
###########################################

set_property -dict {PACKAGE_PIN R4 IOSTANDARD LVCMOS33} [get_ports clk]
# The Clocking Wizard supplies the 100 MHz primary clock constraint.
set_property -dict {PACKAGE_PIN G4 IOSTANDARD LVCMOS15} [get_ports resetn]

# VADJ is left at the board's default 1.2 V; do not use LVCMOS33 on these pins.
set_property IOSTANDARD LVCMOS12 [get_ports {GPI[*]}]
set_property PACKAGE_PIN E22 [get_ports {GPI[0]}]
set_property PACKAGE_PIN F21 [get_ports {GPI[1]}]
set_property PACKAGE_PIN G21 [get_ports {GPI[2]}]
set_property PACKAGE_PIN G22 [get_ports {GPI[3]}]
set_property PACKAGE_PIN H17 [get_ports {GPI[4]}]
set_property PACKAGE_PIN J16 [get_ports {GPI[5]}]
set_property PACKAGE_PIN K13 [get_ports {GPI[6]}]
set_property PACKAGE_PIN M17 [get_ports {GPI[7]}]

set_property IOSTANDARD LVCMOS25 [get_ports {GPO[*]}]
set_property PACKAGE_PIN T14 [get_ports {GPO[0]}]
set_property PACKAGE_PIN T15 [get_ports {GPO[1]}]
set_property PACKAGE_PIN T16 [get_ports {GPO[2]}]
set_property PACKAGE_PIN U16 [get_ports {GPO[3]}]
set_property PACKAGE_PIN V15 [get_ports {GPO[4]}]
set_property PACKAGE_PIN W16 [get_ports {GPO[5]}]
set_property PACKAGE_PIN W15 [get_ports {GPO[6]}]
set_property PACKAGE_PIN Y13 [get_ports {GPO[7]}]

# UART signal directions are from the FPGA's point of view.
set_property -dict {PACKAGE_PIN V18 IOSTANDARD LVCMOS33} [get_ports UARTSin]
set_property -dict {PACKAGE_PIN AA19 IOSTANDARD LVCMOS33} [get_ports UARTSout]

# microSD: DAT0 = MISO, CMD = MOSI, DAT3 = chip select.
set_property -dict {PACKAGE_PIN V19 IOSTANDARD LVCMOS33} [get_ports SDCIn]
set_property -dict {PACKAGE_PIN W20 IOSTANDARD LVCMOS33} [get_ports SDCCmd]
set_property -dict {PACKAGE_PIN U18 IOSTANDARD LVCMOS33} [get_ports SDCCS]
set_property -dict {PACKAGE_PIN W19 IOSTANDARD LVCMOS33} [get_ports SDCCLK]
set_property -dict {PACKAGE_PIN T18 IOSTANDARD LVCMOS33} [get_ports SDCCD]
set_property -dict {PACKAGE_PIN V20 IOSTANDARD LVCMOS33} [get_ports SDCReset]
set_property PULLUP true [get_ports {SDCIn SDCCmd SDCCS SDCCD UARTSin}]
set_property SLEW SLOW [get_ports {GPO[*] UARTSout SDCCmd SDCCS SDCCLK SDCReset}]
set_property DRIVE 8 [get_ports {GPO[*] UARTSout SDCCmd SDCCS SDCCLK SDCReset}]

# Asynchronous controls and UART are synchronized before use.
set_false_path -from [get_ports {resetn GPI[*] UARTSin SDCCD}]
set_false_path -to [get_ports {GPO[*] UARTSout SDCReset}]
# MIG sequences the asynchronous DDR3 reset independently of data transfers.
set_false_path -to [get_ports DDR3Resetn]

# SPI edges are generated on CPU clock edges. Use conservative single-cycle budgets
# at 20 MHz: 10 ns for FPGA output, 25 ns for card/PCB return, 35 ns input arrival.
# The selected card must meet this return budget at the configured <=5 MHz SPI rate.
# Vendor IP supplies the internal AXI CDC and DDR3 timing exceptions.
set cpuClock [get_clocks -of_objects [get_pins mmcm/clk_out3]]
set_input_delay -clock $cpuClock -max 35.0 [get_ports SDCIn]
set_input_delay -clock $cpuClock -min 0.0 [get_ports SDCIn]
set_output_delay -clock $cpuClock -max 0.0 [get_ports {SDCCmd SDCCS SDCCLK}]
set_output_delay -clock $cpuClock -min 0.0 [get_ports {SDCCmd SDCCS SDCCLK}]
set_max_delay -datapath_only 10.0 -to [get_ports {SDCCmd SDCCS SDCCLK}]

set_property CONFIG_VOLTAGE 3.3 [current_design]
set_property CFGBVS VCCO [current_design]
set_property BITSTREAM.GENERAL.COMPRESS true [current_design]
