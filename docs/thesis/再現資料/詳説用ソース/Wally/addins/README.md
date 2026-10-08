verilog-ethernet contains many ethernet devices.  Wally's synthesizable RVVI interface only requires a small subset of these files.
To do a sparse checkout of this repo copy sparse-checkout to cvw/.git/modules/addins/verilog-ethernet/info
This will make the working directory only contain the necessary files.

`rasterix` contains the unmodified upstream RasterIX renderer and its software
library. The optional Nexys Video video configuration uses it; see
[the FPGA instructions](../fpga/README.md#rasterix-on-nexys-video). Initialize
its recursive submodules before building.
