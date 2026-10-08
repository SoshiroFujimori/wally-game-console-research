///////////////////////////////////////////
// rasterixdisplay.sv
// Written: Codex <codex@openai.com> 9 September 2026
// Purpose: Connect RasterIX swaps to the upstream DVI framebuffer configuration port.
// A component of the CORE-V-WALLY configurable RISC-V project.
// SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
///////////////////////////////////////////

// The request and address remain stable until acknowledged across the clock domains.
// The display changes its fetch base between frames. A swap completes only after
// the first burst from the new buffer has returned, so the old buffer can be reused.
module rasterixdisplay(
  input  logic        GPUCLK, GPUResetn, PixelCLK, SerialCLK, PixelResetn,
  input  logic        Swap,
  input  logic [31:0] FbAddr,
  output logic        Swapped, FrameDone,
  output logic [31:0] FrameAddr,
  output logic [3:0]  ARID,
  output logic [31:0] ARADDR,
  output logic [7:0]  ARLEN,
  output logic [1:0]  ARBURST,
  output logic        ARVALID,
  input  logic        ARREADY,
  input  logic [3:0]  RID,
  input  logic [31:0] RDATA,
  input  logic [1:0]  RRESP,
  input  logic        RLAST, RVALID,
  output logic        RREADY,
  output logic [3:0]  TMDS
);
  typedef enum logic [1:0] {IDLE, WAITACK, WAITDROP, WAITCLEAR} requeststate;
  requeststate RequestState;
  logic       Request, Ack;
  logic [31:0] RequestAddr, PendingAddr;
  (* ASYNC_REG = "TRUE" *) logic [1:0] RequestSync, AckSync;

  always_ff @(posedge GPUCLK)
    if (~GPUResetn) AckSync <= '0;
    else AckSync <= {AckSync[0], Ack};
  always_ff @(posedge PixelCLK)
    if (~PixelResetn) RequestSync <= '0;
    else RequestSync <= {RequestSync[0], Request};

  assign Swapped = ~Swap | (RequestState == WAITDROP);
  always_ff @(posedge GPUCLK)
    if (~GPUResetn) begin
      RequestState <= IDLE;
      Request <= 1'b0;
      RequestAddr <= '0;
      FrameDone <= 1'b0;
      FrameAddr <= '0;
    end else begin
      FrameDone <= 1'b0;
      case (RequestState)
        IDLE: if (Swap) begin
          RequestAddr <= FbAddr;
          Request <= 1'b1;
          RequestState <= WAITACK;
        end
        WAITACK: if (AckSync[1]) begin
          FrameDone <= 1'b1;
          FrameAddr <= RequestAddr;
          RequestState <= WAITDROP;
        end
        WAITDROP: if (~Swap) begin
          Request <= 1'b0;
          RequestState <= WAITCLEAR;
        end
        WAITCLEAR: if (~AckSync[1]) RequestState <= IDLE;
        default: RequestState <= IDLE;
      endcase
    end

  typedef enum logic [2:0] {WAITREQ, SETADDR, ADDRRESP, ENABLE, ENABLERESP,
                            WAITFETCH, WAITREAD, COMPLETE} displaystate;
  displaystate DisplayState;
  logic       ConfigValid, ConfigAWReady, ConfigWReady, ConfigBValid;
  logic [31:0] ConfigAddr, ConfigData;
  logic [7:0] Outstanding, Remaining;
  logic       ReadAccepted, ReadCompleted;
  assign ReadAccepted = ARVALID & ARREADY;
  assign ReadCompleted = RVALID & RREADY & RLAST;
  assign ConfigValid = (DisplayState == SETADDR) | (DisplayState == ENABLE);
  assign ConfigAddr = (DisplayState == SETADDR) ? 32'h8 : 32'h0;
  assign ConfigData = (DisplayState == SETADDR) ? PendingAddr : 32'h1;

  always_ff @(posedge PixelCLK)
    if (~PixelResetn) Outstanding <= '0;
    else case ({ReadAccepted, ReadCompleted})
      2'b10: Outstanding <= Outstanding + 1'b1;
      2'b01: Outstanding <= Outstanding - 1'b1;
      default: ;
    endcase

  always_ff @(posedge PixelCLK)
    if (~PixelResetn) begin
      DisplayState <= WAITREQ;
      PendingAddr <= '0;
      Remaining <= '0;
      Ack <= 1'b0;
    end else
      case (DisplayState)
        WAITREQ: if (RequestSync[1]) begin
          PendingAddr <= RequestAddr;
          DisplayState <= SETADDR;
        end
        SETADDR: if (ConfigAWReady & ConfigWReady) DisplayState <= ADDRRESP;
        ADDRRESP: if (ConfigBValid) DisplayState <= ENABLE;
        ENABLE: if (ConfigAWReady & ConfigWReady) DisplayState <= ENABLERESP;
        ENABLERESP: if (ConfigBValid) DisplayState <= WAITFETCH;
        WAITFETCH: if (ReadAccepted & (ARADDR == PendingAddr)) begin
          Remaining <= Outstanding + 1'b1 - {7'b0, ReadCompleted};
          DisplayState <= WAITREAD;
        end
        WAITREAD: if (ReadCompleted) begin
          Remaining <= Remaining - 1'b1;
          if (Remaining == 1) begin
            Ack <= 1'b1;
            DisplayState <= COMPLETE;
          end
        end
        COMPLETE: if (~RequestSync[1]) begin
          Ack <= 1'b0;
          DisplayState <= WAITREQ;
        end
        default: DisplayState <= WAITREQ;
      endcase

  dvi_framebuffer #(.VIDEO_WIDTH(640), .VIDEO_HEIGHT(480), .VIDEO_REFRESH(60),
    .VIDEO_ENABLE(0), .VIDEO_X2_MODE(0), .VIDEO_FB_RAM(0)) display(
    .clk_i(PixelCLK), .rst_i(~PixelResetn), .clk_x5_i(SerialCLK),
    .cfg_awvalid_i(ConfigValid), .cfg_awaddr_i(ConfigAddr), .cfg_wvalid_i(ConfigValid),
    .cfg_wdata_i(ConfigData), .cfg_wstrb_i(4'hf), .cfg_bready_i(1'b1),
    .cfg_arvalid_i(1'b0), .cfg_araddr_i(32'b0), .cfg_rready_i(1'b1),
    .cfg_awready_o(ConfigAWReady), .cfg_wready_o(ConfigWReady), .cfg_bvalid_o(ConfigBValid),
    .cfg_bresp_o(), .cfg_arready_o(), .cfg_rvalid_o(), .cfg_rdata_o(), .cfg_rresp_o(), .intr_o(),
    .outport_awready_i(1'b0), .outport_wready_i(1'b0), .outport_bvalid_i(1'b0),
    .outport_bresp_i(2'b0), .outport_bid_i(4'b0),
    .outport_awvalid_o(), .outport_awaddr_o(), .outport_awid_o(), .outport_awlen_o(),
    .outport_awburst_o(), .outport_wvalid_o(), .outport_wdata_o(), .outport_wstrb_o(),
    .outport_wlast_o(), .outport_bready_o(),
    .outport_arvalid_o(ARVALID), .outport_arready_i(ARREADY), .outport_araddr_o(ARADDR),
    .outport_arid_o(ARID), .outport_arlen_o(ARLEN), .outport_arburst_o(ARBURST),
    .outport_rvalid_i(RVALID), .outport_rready_o(RREADY), .outport_rdata_i(RDATA),
    .outport_rresp_i(RRESP), .outport_rid_i(RID), .outport_rlast_i(RLAST),
    .dvi_red_o(TMDS[2]), .dvi_green_o(TMDS[1]), .dvi_blue_o(TMDS[0]), .dvi_clock_o(TMDS[3]));
endmodule
