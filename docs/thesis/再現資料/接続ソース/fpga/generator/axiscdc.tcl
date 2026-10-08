# Asynchronous 32-bit command/response FIFO for external FPGA peripherals.
# SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
set partNumber $::env(XILINX_PART)
set ipName axiscdc
create_project $ipName . -force -part $partNumber
create_ip -name axis_data_fifo -vendor xilinx.com -library ip -module_name $ipName
set_property -dict [list CONFIG.TDATA_NUM_BYTES {4} CONFIG.FIFO_DEPTH {512} \
    CONFIG.IS_ACLK_ASYNC {1} CONFIG.HAS_TLAST {1} CONFIG.HAS_TKEEP {0} CONFIG.HAS_TSTRB {0}] [get_ips $ipName]
generate_target all [get_files ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
create_ip_run [get_files ./$ipName.srcs/sources_1/ip/$ipName/$ipName.xci]
launch_run -jobs 8 ${ipName}_synth_1
wait_on_run ${ipName}_synth_1
