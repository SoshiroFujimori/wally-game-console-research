# Pixel and TMDS serializer clocks for a 640x480 display.
# SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
set partNumber $::env(XILINX_PART)
set ipName videoclock
create_project $ipName . -force -part $partNumber
create_ip -name clk_wiz -vendor xilinx.com -library ip -module_name $ipName
set_property -dict [list CONFIG.PRIM_IN_FREQ {100.000} CONFIG.PRIM_SOURCE {No_buffer} \
    CONFIG.NUM_OUT_CLKS {2} \
    CONFIG.CLKOUT2_USED {true} CONFIG.CLKOUT1_REQUESTED_OUT_FREQ {25.2} \
    CONFIG.CLKOUT2_REQUESTED_OUT_FREQ {126} CONFIG.CLKIN1_JITTER_PS {150.0}] [get_ips $ipName]
generate_target all [get_files ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
create_ip_run [get_files ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
launch_run -jobs 8 ${ipName}_synth_1
wait_on_run ${ipName}_synth_1
