set sourceRoot [file dirname [file normalize [info script]]]
create_project -in_memory -part xc7a200tsbg484-1
read_verilog $sourceRoot/sd_idle.sv
read_xdc $sourceRoot/sd_idle.xdc
synth_design -top sd_idle -part xc7a200tsbg484-1
opt_design
place_design
route_design
write_bitstream sd_idle.bit
