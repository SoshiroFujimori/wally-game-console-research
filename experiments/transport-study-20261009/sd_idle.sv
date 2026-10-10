// SPDX-License-Identifier: Apache-2.0
// Temporary fixture: power the SD slot while keeping all data pins undriven.
module sd_idle(output wire SDCReset);
  assign SDCReset = 1'b0;
endmodule
