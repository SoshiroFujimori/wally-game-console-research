# Shared DDR3 interconnect: Wally and RasterIX at 100 MHz; display at 25.2 MHz.
# SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
create_bd_design rasterixmem
set interconnect [create_bd_cell -type ip -vlnv xilinx.com:ip:smartconnect:1.0 interconnect]
set_property -dict [list CONFIG.NUM_SI {3} CONFIG.NUM_MI {1} CONFIG.NUM_CLKS {2}] $interconnect
# Complete memory bursts are buffered before reaching the shared DDR3 port.
# CPU-controlled command/response backpressure must not hold a DDR3 transaction
# while the CPU needs that same memory to supply or consume the stream.
set gpubuffer [create_bd_cell -type ip -vlnv xilinx.com:ip:axi_data_fifo:2.1 gpubuffer]
set_property -dict [list CONFIG.WRITE_FIFO_DEPTH {512} CONFIG.WRITE_FIFO_DELAY {1} \
    CONFIG.READ_FIFO_DEPTH {512} CONFIG.READ_FIFO_DELAY {1}] $gpubuffer
foreach {name mode width ids addrwidth access freq} {
    S00_AXI Slave 64 4 32 READ_WRITE 100000000
    S01_AXI Slave 64 4 32 READ_WRITE 100000000
    S02_AXI Slave 32 4 32 READ_ONLY   25200000
    M00_AXI Master 64 0 29 READ_WRITE 100000000
} {
    set port [create_bd_intf_port -mode $mode -vlnv xilinx.com:interface:aximm_rtl:1.0 $name]
    set_property -dict [list CONFIG.PROTOCOL AXI4 CONFIG.DATA_WIDTH $width \
        CONFIG.ADDR_WIDTH $addrwidth CONFIG.READ_WRITE_MODE $access CONFIG.FREQ_HZ $freq \
        CONFIG.HAS_BURST {1} CONFIG.HAS_LOCK {1} CONFIG.HAS_CACHE {1} CONFIG.HAS_QOS {1}] $port
    if {$mode == "Slave"} {
        set_property CONFIG.ID_WIDTH $ids $port
    }
    if {$name == "S01_AXI"} {
        connect_bd_intf_net $port [get_bd_intf_pins gpubuffer/S_AXI]
        connect_bd_intf_net [get_bd_intf_pins gpubuffer/M_AXI] [get_bd_intf_pins interconnect/$name]
    } else {
        connect_bd_intf_net $port [get_bd_intf_pins interconnect/$name]
    }
}
set aclk [create_bd_port -dir I -type clk -freq_hz 100000000 aclk]
set aclk1 [create_bd_port -dir I -type clk -freq_hz 25200000 aclk1]
set aresetn [create_bd_port -dir I -type rst aresetn]
set_property CONFIG.POLARITY ACTIVE_LOW $aresetn
set_property CONFIG.ASSOCIATED_BUSIF {S00_AXI:S01_AXI:M00_AXI} $aclk
set_property CONFIG.ASSOCIATED_BUSIF {S02_AXI} $aclk1
set_property CONFIG.ASSOCIATED_RESET {aresetn} $aclk
connect_bd_net $aclk [get_bd_pins interconnect/aclk]
connect_bd_net $aclk [get_bd_pins gpubuffer/aclk]
connect_bd_net $aclk1 [get_bd_pins interconnect/aclk1]
connect_bd_net $aresetn [get_bd_pins interconnect/aresetn]
connect_bd_net $aresetn [get_bd_pins gpubuffer/aresetn]
foreach port {S00_AXI S01_AXI S02_AXI} {
    assign_bd_address -target_address_space [get_bd_addr_spaces $port] \
        -offset 0x00000000 -range 0x20000000 [get_bd_addr_segs M00_AXI/Reg] -force
}
validate_bd_design
save_bd_design
set design [get_files rasterixmem.bd]
set_property synth_checkpoint_mode None $design
generate_target all $design
add_files -norecurse [make_wrapper -files $design -top]
