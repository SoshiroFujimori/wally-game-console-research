# Explicit-target FPGA programming for the external experiment only.
if {$argc != 2} { error "Supply the complete JTAG target and bitstream path." }
set target [lindex $argv 0]
set bitfile [file normalize [lindex $argv 1]]
if {![file isfile $bitfile]} { error "Missing bitstream" }
open_hw_manager
connect_hw_server -url localhost:3121
set targets [get_hw_targets -quiet $target]
if {[llength $targets] != 1 || [lindex $targets 0] ne $target} { error "Target mismatch" }
current_hw_target [lindex $targets 0]
open_hw_target
set devices [get_hw_devices -quiet xc7a200t_0]
if {[llength $devices] != 1} { error "Expected exactly one xc7a200t_0" }
current_hw_device [lindex $devices 0]
set_property PROGRAM.FILE $bitfile [current_hw_device]
program_hw_devices [current_hw_device]
refresh_hw_device [current_hw_device]
set crc [get_property REGISTER.CONFIG_STATUS.BIT00_CRC_ERROR [current_hw_device]]
set done [get_property REGISTER.CONFIG_STATUS.BIT14_DONE_PIN [current_hw_device]]
puts "PROGRAM_RESULT crc_error=$crc done=$done"
if {$crc ne "0" || $done ne "1"} { error "Configuration failed" }
close_hw_target
disconnect_hw_server
close_hw_manager
