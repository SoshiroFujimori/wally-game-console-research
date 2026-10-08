///////////////////////////////////////////
// rasterix_apb.sv
// Written: Codex <codex@openai.com> 9 September 2026
// Purpose: APB command and response port for an unmodified RasterIX core.
// A component of the CORE-V-WALLY configurable RISC-V project.
// SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
///////////////////////////////////////////

// Registers are accessed with aligned 32-bit loads and stores.
// 00 CMD: write one stream word; 04 CMD_LAST: write the last word.
// 08 STATUS: bit 0 command ready, bit 1 response valid, bit 2 renderer busy.
// 0c ID: "RIX1"; 10 FRAME_COUNT: completed display swaps.
// 14 FB_ADDR: last displayed physical address; 18 RESP: read one stream word.
// APB waits for stream backpressure. No command is dropped when the FIFO fills.
module rasterix_apb #(
  parameter XLEN = 64
)(
  input  logic              PCLK, PRESETn, PSEL, PENABLE, PWRITE,
  input  logic [7:0]        PADDR,
  input  logic [XLEN-1:0]   PWDATA,
  input  logic [XLEN/8-1:0] PSTRB,
  output logic [XLEN-1:0]   PRDATA,
  output logic              PREADY,
  output logic              CmdValid, CmdLast,
  output logic [31:0]       CmdData,
  input  logic              CmdReady,
  input  logic              RespValid,
  input  logic [31:0]       RespData,
  output logic              RespReady,
  input  logic              Busy, FrameDone,
  input  logic [31:0]       FrameAddr
);
  logic [31:0] ReadData, WriteData, FrameCount, DisplayAddr;
  logic       WordWrite, CommandWrite, ResponseRead;

  if (XLEN == 64) begin : rv64
    assign WriteData = PADDR[2] ? PWDATA[63:32] : PWDATA[31:0];
    assign WordWrite = PADDR[2] ? &PSTRB[7:4] : &PSTRB[3:0];
  end else begin : rv32
    assign WriteData = PWDATA[31:0];
    assign WordWrite = &PSTRB[3:0];
  end
  assign CommandWrite = PSEL & PENABLE & PWRITE & WordWrite & (PADDR[7:3] == 5'b0);
  assign ResponseRead = PSEL & PENABLE & ~PWRITE & (PADDR == 8'h18);
  assign CmdValid = CommandWrite;
  assign CmdLast = PADDR[2];
  assign CmdData = WriteData;
  assign RespReady = ResponseRead;
  assign PREADY = CommandWrite ? CmdReady : ResponseRead ? RespValid : 1'b1;
  assign PRDATA = {(XLEN/32){ReadData}};

  always_ff @(posedge PCLK)
    if (~PRESETn) begin
      FrameCount <= '0;
      DisplayAddr <= '0;
    end else if (FrameDone) begin
      FrameCount <= FrameCount + 1'b1;
      DisplayAddr <= FrameAddr;
    end

  always_comb
    case (PADDR)
      8'h08: ReadData = {29'b0, Busy, RespValid, CmdReady};
      8'h0c: ReadData = 32'h52495831;
      8'h10: ReadData = FrameCount;
      8'h14: ReadData = DisplayAddr;
      8'h18: ReadData = RespData;
      default: ReadData = '0;
    endcase
endmodule
