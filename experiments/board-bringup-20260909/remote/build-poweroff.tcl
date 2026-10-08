# Rebuild the existing SD power-off fixture in the temporary test directory.
set sourceRoot /home/researcher/cvw-release/fpga/generator
create_project -in_memory -part xc7a200tsbg484-1
read_verilog -sv $sourceRoot/sd_poweroff_nexysvideo.sv
read_xdc $sourceRoot/sd_poweroff_nexysvideo.xdc
synth_design -top sd_poweroff_nexysvideo -part xc7a200tsbg484-1
opt_design
place_design
route_design
write_bitstream -force sd_poweroff_nexysvideo.bit
