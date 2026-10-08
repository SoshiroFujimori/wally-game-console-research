###########################################
## mmcm-nexysvideo.tcl
## Purpose: Generate 100 MHz MIG, 200 MHz reference, and CPU clocks for Nexys Video.
## SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
###########################################

set partNumber $::env(XILINX_PART)
set boardName  $::env(XILINX_BOARD)
set SYSTEMCLOCK $::env(SYSTEMCLOCK)
set ipName mmcm

set SYSTEMCLOCK_MHz [expr $SYSTEMCLOCK/1000000.0]

create_project $ipName . -force -part $partNumber
set_property board_part $boardName [current_project]

create_ip -name clk_wiz -vendor xilinx.com -library ip -module_name $ipName

set_property -dict [list CONFIG.PRIM_IN_FREQ {100.000} \
                        CONFIG.NUM_OUT_CLKS {3} \
                        CONFIG.CLKOUT2_USED {true} \
                        CONFIG.CLKOUT3_USED {true} \
                        CONFIG.CLKOUT1_REQUESTED_OUT_FREQ {100} \
                        CONFIG.CLKOUT2_REQUESTED_OUT_FREQ {200} \
                        CONFIG.CLKOUT3_REQUESTED_OUT_FREQ $SYSTEMCLOCK_MHz \
                        CONFIG.CLKIN1_JITTER_PS {100.0} \
                       ] [get_ips $ipName]

generate_target {instantiation_template} [get_files ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
generate_target all [get_files  ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
create_ip_run [get_files -of_objects [get_fileset sources_1] ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
launch_run -jobs 8 ${ipName}_synth_1
wait_on_run ${ipName}_synth_1
