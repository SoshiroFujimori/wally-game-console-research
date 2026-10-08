set_param general.maxThreads 8
open_checkpoint /path/to/research/experiments/fifo-study-20261008/latest/qualification-wldriven/routed.dcp
foreach cr [get_clock_regions] {
  puts "REGION $cr SLICE=[llength [get_sites -of_objects $cr -filter {SITE_TYPE =~ SLICE*}]] DSP=[llength [get_sites -of_objects $cr -filter {SITE_TYPE =~ DSP*}]]"
}
set cells [get_cells -hier -filter {NAME =~ */tex0ComputeRecip/* && IS_PRIMITIVE}]
puts "RECIP_CELLS=[llength $cells]"
report_utilization -cells [get_cells -hier -filter {NAME =~ */tex0ComputeRecip}] -file /path/to/research/experiments/fifo-study-20261008/logs/recip-utilization.rpt
foreach c $cells { if {[get_property REF_NAME $c] == "DSP48E1"} { puts "DSP_CELL $c LOC=[get_property LOC $c]" } }
puts "INSPECTION_COMPLETE"
exit
