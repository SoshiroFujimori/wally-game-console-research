///////////////////////////////////////////
// rasterix.sv
// Written: Codex <codex@openai.com> 9 September 2026
// Purpose: RasterIX, display, and shared DDR3 interface on Nexys Video.
// A component of the CORE-V-WALLY configurable RISC-V project.
// SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
///////////////////////////////////////////

// The unmodified RasterIX_IF uses a 64-bit memory interface, 65536-pixel
// internal framebuffer, one texture unit, and depth and stencil buffers.
// Software must use the same configuration and reserve its external buffers.
module rasterix(
  input  logic        CPUCLK, CPUResetn, DDRCLK, DDRResetn, PixelCLK, SerialCLK, PixelResetn,
  input  logic        PSEL, PENABLE, PWRITE,
  input  logic [31:0] PADDR,
  input  logic [63:0] PWDATA,
  input  logic [7:0]  PSTRB,
  output logic [63:0] PRDATA,
  output logic        PREADY,
  output logic [3:0]  TMDS,
  input  logic [3:0]  CPUAWID,
  input  logic [31:0] CPUAWADDR,
  input  logic [7:0]  CPUAWLEN,
  input  logic [2:0]  CPUAWSIZE,
  input  logic [1:0]  CPUAWBURST,
  input  logic        CPUAWLOCK,
  input  logic [3:0]  CPUAWCACHE,
  input  logic [2:0]  CPUAWPROT,
  input  logic        CPUAWVALID,
  output logic        CPUAWREADY,
  input  logic [63:0] CPUWDATA,
  input  logic [7:0]  CPUWSTRB,
  input  logic        CPUWLAST,
  input  logic        CPUWVALID,
  output logic        CPUWREADY,
  output logic [3:0]  CPUBID,
  output logic [1:0]  CPUBRESP,
  output logic        CPUBVALID,
  input  logic        CPUBREADY,
  input  logic [3:0]  CPUARID,
  input  logic [31:0] CPUARADDR,
  input  logic [7:0]  CPUARLEN,
  input  logic [2:0]  CPUARSIZE,
  input  logic [1:0]  CPUARBURST,
  input  logic        CPUARLOCK,
  input  logic [3:0]  CPUARCACHE,
  input  logic [2:0]  CPUARPROT,
  input  logic        CPUARVALID,
  output logic        CPUARREADY,
  output logic [3:0]  CPURID,
  output logic [63:0] CPURDATA,
  output logic [1:0]  CPURRESP,
  output logic        CPURLAST,
  output logic        CPURVALID,
  input  logic        CPURREADY,
  output logic [3:0]  DDRAWID,
  output logic [31:0] DDRAWADDR,
  output logic [7:0]  DDRAWLEN,
  output logic [2:0]  DDRAWSIZE,
  output logic [1:0]  DDRAWBURST,
  output logic        DDRAWLOCK,
  output logic [3:0]  DDRAWCACHE,
  output logic [2:0]  DDRAWPROT,
  output logic        DDRAWVALID,
  input  logic        DDRAWREADY,
  output logic [63:0] DDRWDATA,
  output logic [7:0]  DDRWSTRB,
  output logic        DDRWLAST,
  output logic        DDRWVALID,
  input  logic        DDRWREADY,
  input  logic [3:0]  DDRBID,
  input  logic [1:0]  DDRBRESP,
  input  logic        DDRBVALID,
  output logic        DDRBREADY,
  output logic [3:0]  DDRARID,
  output logic [31:0] DDRARADDR,
  output logic [7:0]  DDRARLEN,
  output logic [2:0]  DDRARSIZE,
  output logic [1:0]  DDRARBURST,
  output logic        DDRARLOCK,
  output logic [3:0]  DDRARCACHE,
  output logic [2:0]  DDRARPROT,
  output logic        DDRARVALID,
  input  logic        DDRARREADY,
  input  logic [3:0]  DDRRID,
  input  logic [63:0] DDRRDATA,
  input  logic [1:0]  DDRRRESP,
  input  logic        DDRRLAST,
  input  logic        DDRRVALID,
  output logic        DDRRREADY
);
  logic [3:0]  GPUAWID;
  logic [31:0] GPUAWADDR;
  logic [7:0]  GPUAWLEN;
  logic [2:0]  GPUAWSIZE;
  logic [1:0]  GPUAWBURST;
  logic        GPUAWLOCK;
  logic [3:0]  GPUAWCACHE;
  logic [2:0]  GPUAWPROT;
  logic        GPUAWVALID;
  logic        GPUAWREADY;
  logic [63:0] GPUWDATA;
  logic [7:0]  GPUWSTRB;
  logic        GPUWLAST;
  logic        GPUWVALID;
  logic        GPUWREADY;
  logic [3:0]  GPUBID;
  logic [1:0]  GPUBRESP;
  logic        GPUBVALID;
  logic        GPUBREADY;
  logic [3:0]  GPUARID;
  logic [31:0] GPUARADDR;
  logic [7:0]  GPUARLEN;
  logic [2:0]  GPUARSIZE;
  logic [1:0]  GPUARBURST;
  logic        GPUARLOCK;
  logic [3:0]  GPUARCACHE;
  logic [2:0]  GPUARPROT;
  logic        GPUARVALID;
  logic        GPUARREADY;
  logic [3:0]  GPURID;
  logic [63:0] GPURDATA;
  logic [1:0]  GPURRESP;
  logic        GPURLAST;
  logic        GPURVALID;
  logic        GPURREADY;
  logic [3:0]  VideoARID;
  logic [31:0] VideoARADDR;
  logic [7:0]  VideoARLEN;
  logic [2:0]  VideoARSIZE;
  logic [1:0]  VideoARBURST;
  logic        VideoARLOCK;
  logic [3:0]  VideoARCACHE;
  logic [2:0]  VideoARPROT;
  logic        VideoARVALID;
  logic        VideoARREADY;
  logic [3:0]  VideoRID;
  logic [31:0] VideoRDATA;
  logic [1:0]  VideoRRESP;
  logic        VideoRLAST;
  logic        VideoRVALID;
  logic        VideoRREADY;

  logic        CmdValid, CmdReady, CmdLast, RespValid, RespReady, GPUCmdValid, GPUCmdReady, GPUCmdLast;
  logic        GPURespValid, GPURespReady, GPURespLast, Busy, Swap, Swapped, GPUFrameDone;
  logic [31:0] CmdData, RespData, GPUCmdData, GPURespData, FbAddr, GPUFrameAddr;
  logic        FrameToggle, FrameSeen;
  (* ASYNC_REG = "TRUE" *) logic [1:0] FrameSync, BusySync;

  always_ff @(posedge DDRCLK)
    if (~DDRResetn) FrameToggle <= 1'b0;
    else if (GPUFrameDone) FrameToggle <= ~FrameToggle;
  always_ff @(posedge CPUCLK)
    if (~CPUResetn) begin
      FrameSync <= '0;
      FrameSeen <= 1'b0;
      BusySync <= '0;
    end else begin
      FrameSync <= {FrameSync[0], FrameToggle};
      FrameSeen <= FrameSync[1];
      BusySync <= {BusySync[0], Busy};
    end

  rasterix_apb apb(
    .PCLK(CPUCLK), .PRESETn(CPUResetn), .PSEL, .PENABLE, .PWRITE,
    .PADDR(PADDR[7:0]), .PWDATA, .PSTRB, .PRDATA, .PREADY,
    .CmdValid, .CmdReady, .CmdLast, .CmdData, .RespValid, .RespReady, .RespData,
    .Busy(BusySync[1]), .FrameDone(FrameSync[1] ^ FrameSeen), .FrameAddr(GPUFrameAddr));

  axiscdc commandfifo(
    .s_axis_aresetn(CPUResetn), .s_axis_aclk(CPUCLK), .m_axis_aclk(DDRCLK),
    .s_axis_tvalid(CmdValid), .s_axis_tready(CmdReady), .s_axis_tlast(CmdLast), .s_axis_tdata(CmdData),
    .m_axis_tvalid(GPUCmdValid), .m_axis_tready(GPUCmdReady), .m_axis_tlast(GPUCmdLast), .m_axis_tdata(GPUCmdData));
  axiscdc responsefifo(
    .s_axis_aresetn(DDRResetn), .s_axis_aclk(DDRCLK), .m_axis_aclk(CPUCLK),
    .s_axis_tvalid(GPURespValid), .s_axis_tready(GPURespReady), .s_axis_tlast(GPURespLast), .s_axis_tdata(GPURespData),
    .m_axis_tvalid(RespValid), .m_axis_tready(RespReady), .m_axis_tlast(), .m_axis_tdata(RespData));

  RasterIX_IF #(.FRAMEBUFFER_SIZE_IN_PIXEL_LG(16), .TMU_COUNT(1), .DATA_WIDTH(64), .ID_WIDTH(4)) gpu(
    .aclk(DDRCLK), .resetn(DDRResetn),
    .s_cmd_axis_tvalid(GPUCmdValid), .s_cmd_axis_tready(GPUCmdReady),
    .s_cmd_axis_tlast(GPUCmdLast), .s_cmd_axis_tdata(GPUCmdData),
    .m_cmd_resp_axis_tvalid(GPURespValid), .m_cmd_resp_axis_tready(GPURespReady),
    .m_cmd_resp_axis_tlast(GPURespLast), .m_cmd_resp_axis_tdata(GPURespData),
    .swap_fb(Swap), .swap_fb_enable_vsync(), .fb_addr(FbAddr), .fb_size(), .fb_swapped(Swapped),
    .perfBusy(Busy), .perfTriangleRendering(), .perfRasterizerStall(),
    .m_axi_awid(GPUAWID), .m_axi_awaddr(GPUAWADDR), .m_axi_awlen(GPUAWLEN), .m_axi_awsize(GPUAWSIZE),
    .m_axi_awburst(GPUAWBURST), .m_axi_awlock(GPUAWLOCK), .m_axi_awcache(GPUAWCACHE), .m_axi_awprot(GPUAWPROT),
    .m_axi_awvalid(GPUAWVALID), .m_axi_awready(GPUAWREADY), .m_axi_wdata(GPUWDATA), .m_axi_wstrb(GPUWSTRB),
    .m_axi_wlast(GPUWLAST), .m_axi_wvalid(GPUWVALID), .m_axi_wready(GPUWREADY), .m_axi_bid(GPUBID),
    .m_axi_bresp(GPUBRESP), .m_axi_bvalid(GPUBVALID), .m_axi_bready(GPUBREADY), .m_axi_arid(GPUARID),
    .m_axi_araddr(GPUARADDR), .m_axi_arlen(GPUARLEN), .m_axi_arsize(GPUARSIZE), .m_axi_arburst(GPUARBURST),
    .m_axi_arlock(GPUARLOCK), .m_axi_arcache(GPUARCACHE), .m_axi_arprot(GPUARPROT), .m_axi_arvalid(GPUARVALID),
    .m_axi_arready(GPUARREADY), .m_axi_rid(GPURID), .m_axi_rdata(GPURDATA), .m_axi_rresp(GPURRESP),
    .m_axi_rlast(GPURLAST), .m_axi_rvalid(GPURVALID), .m_axi_rready(GPURREADY));

  rasterixdisplay display(
    .GPUCLK(DDRCLK), .GPUResetn(DDRResetn), .PixelCLK, .SerialCLK, .PixelResetn,
    .Swap, .FbAddr, .Swapped, .FrameDone(GPUFrameDone), .FrameAddr(GPUFrameAddr),
    .ARID(VideoARID), .ARADDR(VideoARADDR), .ARLEN(VideoARLEN), .ARBURST(VideoARBURST),
    .ARVALID(VideoARVALID), .ARREADY(VideoARREADY), .RID(VideoRID), .RDATA(VideoRDATA),
    .RRESP(VideoRRESP), .RLAST(VideoRLAST), .RVALID(VideoRVALID), .RREADY(VideoRREADY), .TMDS);

  // SmartConnect routes response IDs internally on its single DDR master port.
  assign DDRAWID = '0;
  assign DDRARID = '0;
  logic [28:0] DDRWriteOffset, DDRReadOffset;
  assign DDRAWADDR = {3'b0, DDRWriteOffset};
  assign DDRARADDR = {3'b0, DDRReadOffset};
  assign VideoARSIZE = 3'd2;
  assign VideoARLOCK = 1'b0;
  assign VideoARCACHE = 4'b0;
  assign VideoARPROT = 3'b0;

  rasterixmem_wrapper memory(
    .aclk(DDRCLK), .aclk1(PixelCLK), .aresetn(DDRResetn),
    .S00_AXI_awid(CPUAWID), .S00_AXI_awaddr({3'b0, CPUAWADDR[28:0]}), .S00_AXI_awlen(CPUAWLEN),
    .S00_AXI_awsize(CPUAWSIZE), .S00_AXI_awburst(CPUAWBURST), .S00_AXI_awlock(CPUAWLOCK),
    .S00_AXI_awcache(CPUAWCACHE), .S00_AXI_awprot(CPUAWPROT), .S00_AXI_awvalid(CPUAWVALID),
    .S00_AXI_awready(CPUAWREADY), .S00_AXI_wdata(CPUWDATA), .S00_AXI_wstrb(CPUWSTRB),
    .S00_AXI_wlast(CPUWLAST), .S00_AXI_wvalid(CPUWVALID), .S00_AXI_wready(CPUWREADY),
    .S00_AXI_bid(CPUBID), .S00_AXI_bresp(CPUBRESP), .S00_AXI_bvalid(CPUBVALID),
    .S00_AXI_bready(CPUBREADY), .S00_AXI_arid(CPUARID), .S00_AXI_araddr({3'b0, CPUARADDR[28:0]}),
    .S00_AXI_arlen(CPUARLEN), .S00_AXI_arsize(CPUARSIZE), .S00_AXI_arburst(CPUARBURST),
    .S00_AXI_arlock(CPUARLOCK), .S00_AXI_arcache(CPUARCACHE), .S00_AXI_arprot(CPUARPROT),
    .S00_AXI_arvalid(CPUARVALID), .S00_AXI_arready(CPUARREADY), .S00_AXI_rid(CPURID),
    .S00_AXI_rdata(CPURDATA), .S00_AXI_rresp(CPURRESP), .S00_AXI_rlast(CPURLAST),
    .S00_AXI_rvalid(CPURVALID), .S00_AXI_rready(CPURREADY), .S00_AXI_awqos(4'b0),
    .S00_AXI_arqos(4'b0), .S01_AXI_awid(GPUAWID), .S01_AXI_awaddr({3'b0, GPUAWADDR[28:0]}),
    .S01_AXI_awlen(GPUAWLEN), .S01_AXI_awsize(GPUAWSIZE), .S01_AXI_awburst(GPUAWBURST),
    .S01_AXI_awlock(GPUAWLOCK), .S01_AXI_awcache(GPUAWCACHE), .S01_AXI_awprot(GPUAWPROT),
    .S01_AXI_awvalid(GPUAWVALID), .S01_AXI_awready(GPUAWREADY), .S01_AXI_wdata(GPUWDATA),
    .S01_AXI_wstrb(GPUWSTRB), .S01_AXI_wlast(GPUWLAST), .S01_AXI_wvalid(GPUWVALID),
    .S01_AXI_wready(GPUWREADY), .S01_AXI_bid(GPUBID), .S01_AXI_bresp(GPUBRESP),
    .S01_AXI_bvalid(GPUBVALID), .S01_AXI_bready(GPUBREADY), .S01_AXI_arid(GPUARID),
    .S01_AXI_araddr({3'b0, GPUARADDR[28:0]}), .S01_AXI_arlen(GPUARLEN), .S01_AXI_arsize(GPUARSIZE),
    .S01_AXI_arburst(GPUARBURST), .S01_AXI_arlock(GPUARLOCK), .S01_AXI_arcache(GPUARCACHE),
    .S01_AXI_arprot(GPUARPROT), .S01_AXI_arvalid(GPUARVALID), .S01_AXI_arready(GPUARREADY),
    .S01_AXI_rid(GPURID), .S01_AXI_rdata(GPURDATA), .S01_AXI_rresp(GPURRESP),
    .S01_AXI_rlast(GPURLAST), .S01_AXI_rvalid(GPURVALID), .S01_AXI_rready(GPURREADY),
    .S01_AXI_awqos(4'b0), .S01_AXI_arqos(4'b0), .S02_AXI_arid(VideoARID),
    .S02_AXI_araddr({3'b0, VideoARADDR[28:0]}), .S02_AXI_arlen(VideoARLEN), .S02_AXI_arsize(VideoARSIZE),
    .S02_AXI_arburst(VideoARBURST), .S02_AXI_arlock(VideoARLOCK), .S02_AXI_arcache(VideoARCACHE),
    .S02_AXI_arprot(VideoARPROT), .S02_AXI_arvalid(VideoARVALID), .S02_AXI_arready(VideoARREADY),
    .S02_AXI_rid(VideoRID), .S02_AXI_rdata(VideoRDATA), .S02_AXI_rresp(VideoRRESP),
    .S02_AXI_rlast(VideoRLAST), .S02_AXI_rvalid(VideoRVALID), .S02_AXI_rready(VideoRREADY),
    .S02_AXI_arqos(4'b0), .M00_AXI_awaddr(DDRWriteOffset), .M00_AXI_awlen(DDRAWLEN),
    .M00_AXI_awsize(DDRAWSIZE), .M00_AXI_awburst(DDRAWBURST), .M00_AXI_awlock(DDRAWLOCK),
    .M00_AXI_awcache(DDRAWCACHE), .M00_AXI_awprot(DDRAWPROT), .M00_AXI_awvalid(DDRAWVALID),
    .M00_AXI_awready(DDRAWREADY), .M00_AXI_wdata(DDRWDATA), .M00_AXI_wstrb(DDRWSTRB),
    .M00_AXI_wlast(DDRWLAST), .M00_AXI_wvalid(DDRWVALID), .M00_AXI_wready(DDRWREADY),
    .M00_AXI_bresp(DDRBRESP), .M00_AXI_bvalid(DDRBVALID), .M00_AXI_bready(DDRBREADY),
    .M00_AXI_araddr(DDRReadOffset), .M00_AXI_arlen(DDRARLEN), .M00_AXI_arsize(DDRARSIZE),
    .M00_AXI_arburst(DDRARBURST), .M00_AXI_arlock(DDRARLOCK), .M00_AXI_arcache(DDRARCACHE),
    .M00_AXI_arprot(DDRARPROT), .M00_AXI_arvalid(DDRARVALID), .M00_AXI_arready(DDRARREADY),
    .M00_AXI_rdata(DDRRDATA), .M00_AXI_rresp(DDRRRESP), .M00_AXI_rlast(DDRRLAST),
    .M00_AXI_rvalid(DDRRVALID), .M00_AXI_rready(DDRRREADY), .M00_AXI_awqos(),
    .M00_AXI_arqos());
endmodule
