if {$argc != 2} {error "Usage: qualify.tcl source-tree fresh-output-directory"}
set repo [file normalize [lindex $argv 0]]
set out [file normalize [lindex $argv 1]]
if {[file exists $out]} {error "Output directory already exists"}
file mkdir $out
open_project $repo/fpga/generator/WallyFPGA.xpr
set run [get_runs impl_1]
set status [get_property STATUS $run]
puts "IMPLEMENTATION_STATUS=$status"
if {![string match "write_bitstream Complete*" $status]} {error "Normal build did not complete bitstream generation"}
open_run impl_1
report_timing_summary -delay_type min_max -report_unconstrained -file $out/timing_summary.rpt
report_drc -file $out/drc.rpt
report_route_status -file $out/route_status.rpt
report_bus_skew -warn_on_violation -file $out/bus_skew.rpt
report_timing -to [get_ports {SDCCmd SDCCS SDCCLK}] -max_paths 10 -file $out/sd_timing.rpt
report_cdc -details -file $out/cdc.rpt
report_clocks -file $out/clocks.rpt
check_timing -verbose -file $out/check_timing.rpt
report_utilization -file $out/utilization.rpt
report_exceptions -file $out/exceptions.rpt
# The dedicated serializers check their data and reset against CLKDIV.
set serializers [get_cells -hier -filter {REF_NAME == OSERDESE2 && NAME =~ rasterixgen.rasterix/display/encoder/serializer/*}]
puts "HDMI_SERIALIZER_COUNT=[llength $serializers] CELLS=$serializers"
if {[llength $serializers] != 8} {error "Expected four master/slave serializer pairs"}
foreach cell $serializers {
    foreach {pin expected} {CLKDIV 13.468 CLK 2.694} {
        set clocks [get_clocks -of_objects [get_pins $cell/$pin]]
        if {[llength $clocks] != 1} {error "Missing serializer clock"}
        set period [get_property PERIOD $clocks]
        if {abs($period-$expected) > 0.003} {error "Unexpected serializer clock: $cell $pin $period"}
    }
}
# Verify each FPGA HDMI buffer is driven by its actual serializer OQ.
# This supplements the functional netlist simulation of the resolved ports.
set buffers [list {hdmi[0].data} {hdmi[1].data} {hdmi[2].data} hdmiclock]
set channel 0
foreach buffer $buffers {
    set input [get_pins $buffer/I]
    if {[llength $input] != 1} {error "Missing HDMI buffer input: $buffer"}
    set nets [get_nets -segments -of_objects $input]
    set drivers [get_pins -of_objects $nets -filter {DIRECTION == OUT && REF_PIN_NAME == OQ}]
    if {[llength $drivers] != 1} {error "Expected one serializer output for $buffer: $drivers"}
    set driverCell [get_cells -of_objects $drivers]
    set driverName [get_property NAME $driverCell]
    if {[get_property REF_NAME $driverCell] ne "OSERDESE2"} {error "HDMI output does not come from OSERDESE2"}
    if {![regexp {xilinx_serialize\[([0-3])\]\.primary$} $driverName -> actualChannel] || $actualChannel != $channel} {error "HDMI channel mismatch: $buffer $driverName"}
    puts "HDMI_BUFFER_DRIVER channel=$channel buffer=$buffer driver=$driverName"
    incr channel
}
puts "HDMI_OUTPUT_CONNECTIONS_VERIFIED"
set dataPins [get_pins -of_objects $serializers -filter {REF_PIN_NAME =~ D?}]
set resetPins [get_pins -of_objects $serializers -filter {REF_PIN_NAME == RST}]
set dataPaths [get_timing_paths -to $dataPins -max_paths 32]
set resetPaths [get_timing_paths -to $resetPins -max_paths 8]
if {[llength $dataPaths] < 1 || [llength $resetPaths] < 1} {error "Missing serializer data or reset timing paths"}
foreach path [concat $dataPaths $resetPaths] {
    set requirement [get_property REQUIREMENT $path]
    if {$requirement < 13.465 || $requirement > 13.471} {error "Serializer path is not timed against CLKDIV: $requirement"}
}
report_timing -to $dataPins -max_paths 32 -file $out/serializer_data.rpt
report_timing -to $resetPins -max_paths 8 -file $out/serializer_reset.rpt
puts "DEDICATED_SERIALIZERS_CLKDIV_TIMING_VERIFIED"
report_exceptions -ignored -file $out/ignored_exceptions.rpt
report_exceptions -coverage -file $out/exception_coverage.rpt
set setup [get_timing_paths -delay_type max -max_paths 1]
set hold [get_timing_paths -delay_type min -max_paths 1]
if {[llength $setup] != 1 || [llength $hold] != 1} {error "Missing timing paths"}
set wns [get_property SLACK $setup]
set whs [get_property SLACK $hold]
puts "QUALIFY_WNS=$wns QUALIFY_WHS=$whs"
if {$wns < 0 || $whs < 0} {error "Timing has not closed"}
set errors [get_drc_violations -quiet -filter {SEVERITY == Error}]
if {[llength $errors]} {error "DRC errors remain: $errors"}
set bit [file join [get_property DIRECTORY $run] fpgaTop.bit]
if {![file isfile $bit] || [file exists $out/fpgaTop.bit]} {error "Missing build bitstream or existing archive"}
file copy $bit $out/fpgaTop.bit
write_checkpoint $out/fpgaTop-qualified.dcp
puts "NORMAL_BUILD_TIMING_DRC_QUALIFIED"
close_project
exit
