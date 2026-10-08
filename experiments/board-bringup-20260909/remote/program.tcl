# Temporary hardware automation. Not part of the CVW checkout.
if {$argc != 1} { error "Supply one bitstream path, or read." }
set bitfile [lindex $argv 0]
if {$bitfile ne "read" && ![file isfile $bitfile]} { error "Bitstream is missing: $bitfile" }
open_hw_manager
connect_hw_server -url localhost:3121
set targets [get_hw_targets -quiet {localhost:3121/xilinx_tcf/Digilent/210276BE7FCBB}]
if {[llength $targets] != 1} { error "Expected the single Nexys Video target 210276BE7FCBB: $targets" }
current_hw_target [lindex $targets 0]
open_hw_target
set devices [get_hw_devices -quiet xc7a200t_0]
if {[llength $devices] != 1} { error "Expected the single xc7a200t_0 device: $devices" }
current_hw_device [lindex $devices 0]
if {$bitfile ne "read"} {
    set_property PROGRAM.FILE [file normalize $bitfile] [current_hw_device]
    program_hw_devices [current_hw_device]
}
refresh_hw_device [current_hw_device]
foreach property {PART PROGRAM.FILE REGISTER.CONFIG_STATUS.BIT00_CRC_ERROR REGISTER.CONFIG_STATUS.BIT13_DONE_INTERNAL_SIGNAL_STATUS REGISTER.CONFIG_STATUS.BIT14_DONE_PIN} {
    puts "$property = [get_property $property [current_hw_device]]"
}
if {[get_property REGISTER.CONFIG_STATUS.BIT00_CRC_ERROR [current_hw_device]] ne "0"} { error "Configuration CRC error" }
if {[get_property REGISTER.CONFIG_STATUS.BIT14_DONE_PIN [current_hw_device]] ne "1"} { error "FPGA DONE is not asserted" }
close_hw_target
disconnect_hw_server
close_hw_manager
