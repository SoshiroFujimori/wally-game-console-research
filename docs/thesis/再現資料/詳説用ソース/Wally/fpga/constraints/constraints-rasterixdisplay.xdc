# The display uses a separate MMCM. The four-phase handshake holds the address
# until acknowledged; bound each crossing to one 100 MHz GPU clock period.
# Synchronizer stages within each clock domain retain normal setup/hold checks.
# SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
set_max_delay -datapath_only 10.0 -from [get_cells Request_reg] \
    -to [get_cells {RequestSync_reg[0]}]
set_max_delay -datapath_only 10.0 -from [get_cells Ack_reg] \
    -to [get_cells {AckSync_reg[0]}]
set_max_delay -datapath_only 10.0 -from [get_cells {RequestAddr_reg[*]}] \
    -to [get_cells {PendingAddr_reg[*]}]
