set root /path/to/research/experiments/fifo-study-20261008
set kind [lindex $argv 0]
set dir $root/sim-$kind
create_project channel_$kind $dir -part xc7a200tsbg484-1
if {$kind eq "fifo16"} {
  import_ip $root/variants/fifo16/fpga/generator/IP/axiscommand.srcs/sources_1/ip/axiscommand/axiscommand.xci
  set_property verilog_define {FIFO16} [get_filesets sim_1]
} elseif {$kind eq "fifo512"} {
  import_ip $root/latest/fpga/generator/IP/axiscdc.srcs/sources_1/ip/axiscdc/axiscdc.xci
  set_property verilog_define {FIFO512} [get_filesets sim_1]
} else {
  add_files $root/scripts/command_mailbox.sv
}
if {$kind ne "mailbox"} {generate_target simulation [get_ips]}
add_files $root/latest/fpga/src/rasterix_apb.sv
add_files -fileset sim_1 $root/scripts/tb_channel.sv
set_property top tb_channel [get_filesets sim_1]
set_property xsim.simulate.runtime 0ns [get_filesets sim_1]
launch_simulation
run all
close_sim
close_project
exit
