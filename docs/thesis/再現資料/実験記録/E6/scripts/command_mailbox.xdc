# External experiment. Bound held-data crossings before the synchronized request.
set_max_delay -datapath_only 10.0 -from [get_cells Request_reg] -to [get_cells {RequestSync_reg[0]}]
set_max_delay -datapath_only 10.0 -from [get_cells Ack_reg] -to [get_cells {AckSync_reg[0]}]
set_max_delay -datapath_only 10.0 -from [get_cells {SourceData_reg[*]}] -to [get_cells {DestData_reg[*]}]
