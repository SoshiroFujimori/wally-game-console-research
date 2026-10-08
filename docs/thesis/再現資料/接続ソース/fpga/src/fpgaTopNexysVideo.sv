///////////////////////////////////////////
// fpgaTopNexysVideo.sv
// Written: SoshiroFujimori <research@example.invalid> 8 September 2026
// Purpose: Wally, DDR3, UART, GPIO, and SPI-mode microSD on the Nexys Video.
// A component of the CORE-V-WALLY configurable RISC-V project.
// SPDX-License-Identifier: Apache-2.0 WITH SHL-2.1
///////////////////////////////////////////

`include "config.vh"
import cvw::*;

module fpgaTop #(parameter logic RASTERIX_SUPPORTED = 0) (
  input  logic        clk, resetn,
  input  logic [7:0]  GPI,
  output logic [7:0]  GPO,
  input  logic        UARTSin,
  output logic        UARTSout,
  input  logic        SDCIn, SDCCD,
  output logic        SDCCLK, SDCCmd, SDCCS, SDCReset,
  inout  tri   [15:0] DDR3DQ,
  inout  tri   [1:0]  DDR3DQSn, DDR3DQSp,
  output logic [14:0] DDR3Addr,
  output logic [2:0]  DDR3BA,
  output logic        DDR3RASn, DDR3CASn, DDR3WEn, DDR3Resetn,
  output logic [0:0]  DDR3CKp, DDR3CKn, DDR3CKE, DDR3ODT,
  output logic [1:0]  DDR3DM,
  output logic [2:0]  HDMITXp, HDMITXn,
  output logic        HDMITXCLKp, HDMITXCLKn);

  `include "parameter-defs.vh"

  logic               CPUCLK, DDRCLK, DDRRefCLK, DDRSysCLK, PixelCLK, SerialCLK;
  logic               ClockLocked, DDRCalibComplete, DDRSyncReset;
  logic               CPUReset, CPUResetn, DDRResetn;
  logic [31:0]         GPIOIN, GPIOOUT;
  logic [3:0]          SDCCSAll;
  logic [P.PA_BITS-1:0] HADDR;
  logic [P.AHBW-1:0]   HWDATA, HRDATAEXT;
  logic               HWRITE, HREADY, HREADYEXT, HRESPEXT, HSELEXT;
  logic [2:0]          HSIZE, HBURST;
  logic [3:0]          HPROT;
  logic [1:0]          HTRANS;
  (* ASYNC_REG = "TRUE" *) logic [9:0] BoardInputMeta, BoardInputSync;

  // 20 MHz CPU clock domain; 64-bit AXI data throughout.
  logic [3:0]   CPUAXIAWID;
  logic [31:0]  CPUAXIAWADDR;
  logic [7:0]   CPUAXIAWLEN;
  logic [2:0]   CPUAXIAWSIZE;
  logic [1:0]   CPUAXIAWBURST;
  logic         CPUAXIAWLOCK;
  logic [3:0]   CPUAXIAWCACHE;
  logic [2:0]   CPUAXIAWPROT;
  logic         CPUAXIAWVALID;
  logic         CPUAXIAWREADY;
  logic [63:0]  CPUAXIWDATA;
  logic [7:0]   CPUAXIWSTRB;
  logic         CPUAXIWLAST;
  logic         CPUAXIWVALID;
  logic         CPUAXIWREADY;
  logic [3:0]   CPUAXIBID;
  logic [1:0]   CPUAXIBRESP;
  logic         CPUAXIBVALID;
  logic         CPUAXIBREADY;
  logic [3:0]   CPUAXIARID;
  logic [31:0]  CPUAXIARADDR;
  logic [7:0]   CPUAXIARLEN;
  logic [2:0]   CPUAXIARSIZE;
  logic [1:0]   CPUAXIARBURST;
  logic         CPUAXIARLOCK;
  logic [3:0]   CPUAXIARCACHE;
  logic [2:0]   CPUAXIARPROT;
  logic         CPUAXIARVALID;
  logic         CPUAXIARREADY;
  logic [3:0]   CPUAXIRID;
  logic [63:0]  CPUAXIRDATA;
  logic [1:0]   CPUAXIRRESP;
  logic         CPUAXIRLAST;
  logic         CPUAXIRVALID;
  logic         CPUAXIRREADY;

  // 100 MHz DDR3 user-interface clock domain; 64-bit AXI data throughout.
  logic [3:0]   DDRAXIAWID;
  logic [31:0]  DDRAXIAWADDR;
  logic [7:0]   DDRAXIAWLEN;
  logic [2:0]   DDRAXIAWSIZE;
  logic [1:0]   DDRAXIAWBURST;
  logic         DDRAXIAWLOCK;
  logic [3:0]   DDRAXIAWCACHE;
  logic [2:0]   DDRAXIAWPROT;
  logic         DDRAXIAWVALID;
  logic         DDRAXIAWREADY;
  logic [63:0]  DDRAXIWDATA;
  logic [7:0]   DDRAXIWSTRB;
  logic         DDRAXIWLAST;
  logic         DDRAXIWVALID;
  logic         DDRAXIWREADY;
  logic [3:0]   DDRAXIBID;
  logic [1:0]   DDRAXIBRESP;
  logic         DDRAXIBVALID;
  logic         DDRAXIBREADY;
  logic [3:0]   DDRAXIARID;
  logic [31:0]  DDRAXIARADDR;
  logic [7:0]   DDRAXIARLEN;
  logic [2:0]   DDRAXIARSIZE;
  logic [1:0]   DDRAXIARBURST;
  logic         DDRAXIARLOCK;
  logic [3:0]   DDRAXIARCACHE;
  logic [2:0]   DDRAXIARPROT;
  logic         DDRAXIARVALID;
  logic         DDRAXIARREADY;
  logic [3:0]   DDRAXIRID;
  logic [63:0]  DDRAXIRDATA;
  logic [1:0]   DDRAXIRRESP;
  logic         DDRAXIRLAST;
  logic         DDRAXIRVALID;
  logic         DDRAXIRREADY;

  logic               PixelResetn, PSELEXT, PENABLEEXT, PWRITEEXT, PREADYEXT;
  logic [31:0]        PADDREXT;
  logic [63:0]        PWDATAEXT, PRDATAEXT;
  logic [7:0]         PSTRBEXT;
  logic [3:0]         TMDS;
  logic [3:0]    SharedAXIAWID;
  logic [31:0]   SharedAXIAWADDR;
  logic [7:0]    SharedAXIAWLEN;
  logic [2:0]    SharedAXIAWSIZE;
  logic [1:0]    SharedAXIAWBURST;
  logic          SharedAXIAWLOCK;
  logic [3:0]    SharedAXIAWCACHE;
  logic [2:0]    SharedAXIAWPROT;
  logic          SharedAXIAWVALID;
  logic          SharedAXIAWREADY;
  logic [63:0]   SharedAXIWDATA;
  logic [7:0]    SharedAXIWSTRB;
  logic          SharedAXIWLAST;
  logic          SharedAXIWVALID;
  logic          SharedAXIWREADY;
  logic [3:0]    SharedAXIBID;
  logic [1:0]    SharedAXIBRESP;
  logic          SharedAXIBVALID;
  logic          SharedAXIBREADY;
  logic [3:0]    SharedAXIARID;
  logic [31:0]   SharedAXIARADDR;
  logic [7:0]    SharedAXIARLEN;
  logic [2:0]    SharedAXIARSIZE;
  logic [1:0]    SharedAXIARBURST;
  logic          SharedAXIARLOCK;
  logic [3:0]    SharedAXIARCACHE;
  logic [2:0]    SharedAXIARPROT;
  logic          SharedAXIARVALID;
  logic          SharedAXIARREADY;
  logic [3:0]    SharedAXIRID;
  logic [63:0]   SharedAXIRDATA;
  logic [1:0]    SharedAXIRRESP;
  logic          SharedAXIRLAST;
  logic          SharedAXIRVALID;
  logic          SharedAXIRREADY;

  // Synchronize asynchronous inputs before the GPIO enable and UART loopback muxes.
  // ASYNC_REG keeps these stages together during placement.
  always_ff @(posedge CPUCLK) begin
    BoardInputMeta <= {UARTSin, SDCCD, GPI};
    BoardInputSync <= BoardInputMeta;
  end
  assign GPIOIN = {23'b0, BoardInputSync[8:0]};
  assign GPO = GPIOOUT[7:0];
  assign SDCCS = SDCCSAll[0];

  // Drive the board's active-high SD_RESET low to power the microSD slot.
  assign SDCReset = 1'b0;

  mmcm mmcm(
    .clk_in1(clk), .reset(~resetn), .locked(ClockLocked),
    .clk_out1(DDRSysCLK), .clk_out2(DDRRefCLK), .clk_out3(CPUCLK));

  // Each AXI endpoint has reset deassertion synchronized to its own clock.
  // The CPU cannot access DDR3 until calibration has completed.
  sysrst cpureset(
    .slowest_sync_clk(CPUCLK), .ext_reset_in(~resetn | DDRSyncReset | ~ClockLocked),
    .aux_reset_in(1'b0), .mb_debug_sys_rst(1'b0), .dcm_locked(DDRCalibComplete),
    .mb_reset(), .bus_struct_reset(CPUReset), .peripheral_reset(),
    .interconnect_aresetn(), .peripheral_aresetn(CPUResetn));

  sysrst ddrreset(
    .slowest_sync_clk(DDRCLK), .ext_reset_in(DDRSyncReset), .aux_reset_in(~resetn),
    .mb_debug_sys_rst(1'b0), .dcm_locked(ClockLocked),
    .mb_reset(), .bus_struct_reset(), .peripheral_reset(),
    .interconnect_aresetn(), .peripheral_aresetn(DDRResetn));

  wallypipelinedsoc #(P) wallypipelinedsoc(
    .clk(CPUCLK), .reset_ext(CPUReset), .reset(), .ExternalStall(1'b0),
    .PSELEXT, .PENABLEEXT, .PWRITEEXT, .PADDREXT, .PWDATAEXT, .PSTRBEXT, .PRDATAEXT, .PREADYEXT,
    .HRDATAEXT, .HREADYEXT, .HRESPEXT, .HSELEXT, .HCLK(), .HRESETn(),
    .HADDR, .HWDATA, .HWSTRB(), .HWRITE, .HSIZE, .HBURST, .HPROT, .HTRANS,
    .HMASTLOCK(), .HREADY, .TIMECLK(1'b0), .GPIOIN, .GPIOOUT, .GPIOEN(),
    .UARTSin(BoardInputSync[9]), .UARTSout, .SPIIn(1'b1), .SPIOut(), .SPICS(), .SPICLK(),
    .SDCIn, .SDCCmd, .SDCCS(SDCCSAll), .SDCCLK, .PWMGPIO());

  // Wally selects only 0x80000000-0x9fffffff on this external AHB port.
  // The vendor bridge derives AXI byte strobes from HSIZE and HADDR.
  ahbaxibridge ahbaxibridge(
    .s_ahb_hclk(CPUCLK), .s_ahb_hresetn(CPUResetn), .s_ahb_hsel(HSELEXT),
    .s_ahb_haddr(HADDR[31:0]), .s_ahb_hprot(HPROT), .s_ahb_htrans(HTRANS),
    .s_ahb_hsize(HSIZE), .s_ahb_hwrite(HWRITE), .s_ahb_hburst(HBURST),
    .s_ahb_hwdata(HWDATA), .s_ahb_hready_out(HREADYEXT), .s_ahb_hready_in(HREADY),
    .s_ahb_hrdata(HRDATAEXT), .s_ahb_hresp(HRESPEXT), .m_axi_awid(CPUAXIAWID),
    .m_axi_awaddr(CPUAXIAWADDR), .m_axi_awlen(CPUAXIAWLEN), .m_axi_awsize(CPUAXIAWSIZE),
    .m_axi_awburst(CPUAXIAWBURST), .m_axi_awlock(CPUAXIAWLOCK),
    .m_axi_awcache(CPUAXIAWCACHE), .m_axi_awprot(CPUAXIAWPROT),
    .m_axi_awvalid(CPUAXIAWVALID), .m_axi_awready(CPUAXIAWREADY), .m_axi_wdata(CPUAXIWDATA),
    .m_axi_wstrb(CPUAXIWSTRB), .m_axi_wlast(CPUAXIWLAST), .m_axi_wvalid(CPUAXIWVALID),
    .m_axi_wready(CPUAXIWREADY), .m_axi_bid(CPUAXIBID), .m_axi_bresp(CPUAXIBRESP),
    .m_axi_bvalid(CPUAXIBVALID), .m_axi_bready(CPUAXIBREADY), .m_axi_arid(CPUAXIARID),
    .m_axi_araddr(CPUAXIARADDR), .m_axi_arlen(CPUAXIARLEN), .m_axi_arsize(CPUAXIARSIZE),
    .m_axi_arburst(CPUAXIARBURST), .m_axi_arlock(CPUAXIARLOCK),
    .m_axi_arcache(CPUAXIARCACHE), .m_axi_arprot(CPUAXIARPROT),
    .m_axi_arvalid(CPUAXIARVALID), .m_axi_arready(CPUAXIARREADY), .m_axi_rid(CPUAXIRID),
    .m_axi_rdata(CPUAXIRDATA), .m_axi_rresp(CPUAXIRRESP), .m_axi_rlast(CPUAXIRLAST),
    .m_axi_rvalid(CPUAXIRVALID), .m_axi_rready(CPUAXIRREADY));

  clkconverter clkconverter(
    .s_axi_aclk(CPUCLK), .s_axi_aresetn(CPUResetn), .s_axi_awregion(4'b0),
    .s_axi_arregion(4'b0), .s_axi_awqos(4'b0), .s_axi_arqos(4'b0), .s_axi_awid(CPUAXIAWID),
    .s_axi_awaddr(CPUAXIAWADDR), .s_axi_awlen(CPUAXIAWLEN), .s_axi_awsize(CPUAXIAWSIZE),
    .s_axi_awburst(CPUAXIAWBURST), .s_axi_awlock(CPUAXIAWLOCK),
    .s_axi_awcache(CPUAXIAWCACHE), .s_axi_awprot(CPUAXIAWPROT),
    .s_axi_awvalid(CPUAXIAWVALID), .s_axi_awready(CPUAXIAWREADY), .s_axi_wdata(CPUAXIWDATA),
    .s_axi_wstrb(CPUAXIWSTRB), .s_axi_wlast(CPUAXIWLAST), .s_axi_wvalid(CPUAXIWVALID),
    .s_axi_wready(CPUAXIWREADY), .s_axi_bid(CPUAXIBID), .s_axi_bresp(CPUAXIBRESP),
    .s_axi_bvalid(CPUAXIBVALID), .s_axi_bready(CPUAXIBREADY), .s_axi_arid(CPUAXIARID),
    .s_axi_araddr(CPUAXIARADDR), .s_axi_arlen(CPUAXIARLEN), .s_axi_arsize(CPUAXIARSIZE),
    .s_axi_arburst(CPUAXIARBURST), .s_axi_arlock(CPUAXIARLOCK),
    .s_axi_arcache(CPUAXIARCACHE), .s_axi_arprot(CPUAXIARPROT),
    .s_axi_arvalid(CPUAXIARVALID), .s_axi_arready(CPUAXIARREADY), .s_axi_rid(CPUAXIRID),
    .s_axi_rdata(CPUAXIRDATA), .s_axi_rresp(CPUAXIRRESP), .s_axi_rlast(CPUAXIRLAST),
    .s_axi_rvalid(CPUAXIRVALID), .s_axi_rready(CPUAXIRREADY), .m_axi_aclk(DDRCLK),
    .m_axi_aresetn(DDRResetn), .m_axi_awregion(), .m_axi_arregion(), .m_axi_awqos(),
    .m_axi_arqos(), .m_axi_awid(SharedAXIAWID), .m_axi_awaddr(SharedAXIAWADDR),
    .m_axi_awlen(SharedAXIAWLEN), .m_axi_awsize(SharedAXIAWSIZE), .m_axi_awburst(SharedAXIAWBURST),
    .m_axi_awlock(SharedAXIAWLOCK), .m_axi_awcache(SharedAXIAWCACHE), .m_axi_awprot(SharedAXIAWPROT),
    .m_axi_awvalid(SharedAXIAWVALID), .m_axi_awready(SharedAXIAWREADY), .m_axi_wdata(SharedAXIWDATA),
    .m_axi_wstrb(SharedAXIWSTRB), .m_axi_wlast(SharedAXIWLAST), .m_axi_wvalid(SharedAXIWVALID),
    .m_axi_wready(SharedAXIWREADY), .m_axi_bid(SharedAXIBID), .m_axi_bresp(SharedAXIBRESP),
    .m_axi_bvalid(SharedAXIBVALID), .m_axi_bready(SharedAXIBREADY), .m_axi_arid(SharedAXIARID),
    .m_axi_araddr(SharedAXIARADDR), .m_axi_arlen(SharedAXIARLEN), .m_axi_arsize(SharedAXIARSIZE),
    .m_axi_arburst(SharedAXIARBURST), .m_axi_arlock(SharedAXIARLOCK),
    .m_axi_arcache(SharedAXIARCACHE), .m_axi_arprot(SharedAXIARPROT),
    .m_axi_arvalid(SharedAXIARVALID), .m_axi_arready(SharedAXIARREADY), .m_axi_rid(SharedAXIRID),
    .m_axi_rdata(SharedAXIRDATA), .m_axi_rresp(SharedAXIRRESP), .m_axi_rlast(SharedAXIRLAST),
    .m_axi_rvalid(SharedAXIRVALID), .m_axi_rready(SharedAXIRREADY));

  // Optional RasterIX shares DDR3 through the existing external memory interface.
  if (RASTERIX_SUPPORTED) begin : rasterixgen
    logic VideoLocked;
    // Reuse the buffered 100 MHz clock; the board input has one input buffer.
    videoclock videoclock(
      .clk_in1(DDRSysCLK), .reset(~resetn | ~ClockLocked), .locked(VideoLocked),
      .clk_out1(PixelCLK), .clk_out2(SerialCLK));
    // Synchronize DDR reset and calibration separately, before combining them.
    // The board reset also resets videoclock; VideoLocked holds the display in reset.
    sysrst pixelreset(
      .slowest_sync_clk(PixelCLK), .ext_reset_in(DDRSyncReset), .aux_reset_in(~DDRCalibComplete),
      .mb_debug_sys_rst(1'b0), .dcm_locked(VideoLocked),
      .mb_reset(), .bus_struct_reset(), .peripheral_reset(),
      .interconnect_aresetn(), .peripheral_aresetn(PixelResetn));
    rasterix rasterix(
      .CPUCLK, .CPUResetn, .DDRCLK, .DDRResetn, .PixelCLK, .SerialCLK, .PixelResetn,
      .PSEL(PSELEXT), .PENABLE(PENABLEEXT), .PWRITE(PWRITEEXT), .PADDR(PADDREXT),
      .PWDATA(PWDATAEXT), .PSTRB(PSTRBEXT), .PRDATA(PRDATAEXT), .PREADY(PREADYEXT), .TMDS,
      .CPUAWID(SharedAXIAWID), .CPUAWADDR(SharedAXIAWADDR), .CPUAWLEN(SharedAXIAWLEN), .CPUAWSIZE(SharedAXIAWSIZE),
      .CPUAWBURST(SharedAXIAWBURST), .CPUAWLOCK(SharedAXIAWLOCK), .CPUAWCACHE(SharedAXIAWCACHE), .CPUAWPROT(SharedAXIAWPROT),
      .CPUAWVALID(SharedAXIAWVALID), .CPUAWREADY(SharedAXIAWREADY), .CPUWDATA(SharedAXIWDATA), .CPUWSTRB(SharedAXIWSTRB),
      .CPUWLAST(SharedAXIWLAST), .CPUWVALID(SharedAXIWVALID), .CPUWREADY(SharedAXIWREADY), .CPUBID(SharedAXIBID),
      .CPUBRESP(SharedAXIBRESP), .CPUBVALID(SharedAXIBVALID), .CPUBREADY(SharedAXIBREADY), .CPUARID(SharedAXIARID),
      .CPUARADDR(SharedAXIARADDR), .CPUARLEN(SharedAXIARLEN), .CPUARSIZE(SharedAXIARSIZE), .CPUARBURST(SharedAXIARBURST),
      .CPUARLOCK(SharedAXIARLOCK), .CPUARCACHE(SharedAXIARCACHE), .CPUARPROT(SharedAXIARPROT), .CPUARVALID(SharedAXIARVALID),
      .CPUARREADY(SharedAXIARREADY), .CPURID(SharedAXIRID), .CPURDATA(SharedAXIRDATA), .CPURRESP(SharedAXIRRESP),
      .CPURLAST(SharedAXIRLAST), .CPURVALID(SharedAXIRVALID), .CPURREADY(SharedAXIRREADY), .DDRAWID(DDRAXIAWID),
      .DDRAWADDR(DDRAXIAWADDR), .DDRAWLEN(DDRAXIAWLEN), .DDRAWSIZE(DDRAXIAWSIZE), .DDRAWBURST(DDRAXIAWBURST),
      .DDRAWLOCK(DDRAXIAWLOCK), .DDRAWCACHE(DDRAXIAWCACHE), .DDRAWPROT(DDRAXIAWPROT), .DDRAWVALID(DDRAXIAWVALID),
      .DDRAWREADY(DDRAXIAWREADY), .DDRWDATA(DDRAXIWDATA), .DDRWSTRB(DDRAXIWSTRB), .DDRWLAST(DDRAXIWLAST),
      .DDRWVALID(DDRAXIWVALID), .DDRWREADY(DDRAXIWREADY), .DDRBID(DDRAXIBID), .DDRBRESP(DDRAXIBRESP),
      .DDRBVALID(DDRAXIBVALID), .DDRBREADY(DDRAXIBREADY), .DDRARID(DDRAXIARID), .DDRARADDR(DDRAXIARADDR),
      .DDRARLEN(DDRAXIARLEN), .DDRARSIZE(DDRAXIARSIZE), .DDRARBURST(DDRAXIARBURST), .DDRARLOCK(DDRAXIARLOCK),
      .DDRARCACHE(DDRAXIARCACHE), .DDRARPROT(DDRAXIARPROT), .DDRARVALID(DDRAXIARVALID), .DDRARREADY(DDRAXIARREADY),
      .DDRRID(DDRAXIRID), .DDRRDATA(DDRAXIRDATA), .DDRRRESP(DDRAXIRRESP), .DDRRLAST(DDRAXIRLAST),
      .DDRRVALID(DDRAXIRVALID), .DDRRREADY(DDRAXIRREADY));
  end else begin : rasterixgen
    assign PRDATAEXT = '0;
    assign PREADYEXT = 1'b1;
    assign TMDS = '0;
    assign DDRAXIAWID = SharedAXIAWID;
    assign DDRAXIAWADDR = SharedAXIAWADDR;
    assign DDRAXIAWLEN = SharedAXIAWLEN;
    assign DDRAXIAWSIZE = SharedAXIAWSIZE;
    assign DDRAXIAWBURST = SharedAXIAWBURST;
    assign DDRAXIAWLOCK = SharedAXIAWLOCK;
    assign DDRAXIAWCACHE = SharedAXIAWCACHE;
    assign DDRAXIAWPROT = SharedAXIAWPROT;
    assign DDRAXIAWVALID = SharedAXIAWVALID;
    assign SharedAXIAWREADY = DDRAXIAWREADY;
    assign DDRAXIWDATA = SharedAXIWDATA;
    assign DDRAXIWSTRB = SharedAXIWSTRB;
    assign DDRAXIWLAST = SharedAXIWLAST;
    assign DDRAXIWVALID = SharedAXIWVALID;
    assign SharedAXIWREADY = DDRAXIWREADY;
    assign SharedAXIBID = DDRAXIBID;
    assign SharedAXIBRESP = DDRAXIBRESP;
    assign SharedAXIBVALID = DDRAXIBVALID;
    assign DDRAXIBREADY = SharedAXIBREADY;
    assign DDRAXIARID = SharedAXIARID;
    assign DDRAXIARADDR = SharedAXIARADDR;
    assign DDRAXIARLEN = SharedAXIARLEN;
    assign DDRAXIARSIZE = SharedAXIARSIZE;
    assign DDRAXIARBURST = SharedAXIARBURST;
    assign DDRAXIARLOCK = SharedAXIARLOCK;
    assign DDRAXIARCACHE = SharedAXIARCACHE;
    assign DDRAXIARPROT = SharedAXIARPROT;
    assign DDRAXIARVALID = SharedAXIARVALID;
    assign SharedAXIARREADY = DDRAXIARREADY;
    assign SharedAXIRID = DDRAXIRID;
    assign SharedAXIRDATA = DDRAXIRDATA;
    assign SharedAXIRRESP = DDRAXIRRESP;
    assign SharedAXIRLAST = DDRAXIRLAST;
    assign SharedAXIRVALID = DDRAXIRVALID;
    assign DDRAXIRREADY = SharedAXIRREADY;
  end
  for (genvar i=0; i<3; i++) begin : hdmi
    OBUFDS #(.IOSTANDARD("TMDS_33")) data(.I(TMDS[i]), .O(HDMITXp[i]), .OB(HDMITXn[i]));
  end
  OBUFDS #(.IOSTANDARD("TMDS_33")) hdmiclock(.I(TMDS[3]), .O(HDMITXCLKp), .OB(HDMITXCLKn));

  // Dropping address bits [31:29] converts the selected physical address to a
  // byte offset in the 512 MiB device. Narrow AXI transfers remain enabled in MIG.
  ddr3 ddr3(
    .ddr3_dq(DDR3DQ), .ddr3_dqs_n(DDR3DQSn), .ddr3_dqs_p(DDR3DQSp), .ddr3_addr(DDR3Addr),
    .ddr3_ba(DDR3BA), .ddr3_ras_n(DDR3RASn), .ddr3_cas_n(DDR3CASn), .ddr3_we_n(DDR3WEn),
    .ddr3_reset_n(DDR3Resetn), .ddr3_ck_p(DDR3CKp), .ddr3_ck_n(DDR3CKn), .ddr3_cke(DDR3CKE),
    .ddr3_dm(DDR3DM), .ddr3_odt(DDR3ODT), .sys_clk_i(DDRSysCLK), .clk_ref_i(DDRRefCLK),
    .ui_clk(DDRCLK), .ui_clk_sync_rst(DDRSyncReset), .aresetn(DDRResetn),
    .sys_rst(resetn & ClockLocked), .init_calib_complete(DDRCalibComplete), .mmcm_locked(),
    .app_sr_req(1'b0), .app_ref_req(1'b0), .app_zq_req(1'b0), .app_sr_active(),
    .app_ref_ack(), .app_zq_ack(), .device_temp(), .s_axi_awqos(4'b0), .s_axi_arqos(4'b0),
    .s_axi_awid(DDRAXIAWID), .s_axi_awaddr(DDRAXIAWADDR[28:0]), .s_axi_awlen(DDRAXIAWLEN),
    .s_axi_awsize(DDRAXIAWSIZE), .s_axi_awburst(DDRAXIAWBURST), .s_axi_awlock(DDRAXIAWLOCK),
    .s_axi_awcache(DDRAXIAWCACHE), .s_axi_awprot(DDRAXIAWPROT),
    .s_axi_awvalid(DDRAXIAWVALID), .s_axi_awready(DDRAXIAWREADY), .s_axi_wdata(DDRAXIWDATA),
    .s_axi_wstrb(DDRAXIWSTRB), .s_axi_wlast(DDRAXIWLAST), .s_axi_wvalid(DDRAXIWVALID),
    .s_axi_wready(DDRAXIWREADY), .s_axi_bid(DDRAXIBID), .s_axi_bresp(DDRAXIBRESP),
    .s_axi_bvalid(DDRAXIBVALID), .s_axi_bready(DDRAXIBREADY), .s_axi_arid(DDRAXIARID),
    .s_axi_araddr(DDRAXIARADDR[28:0]), .s_axi_arlen(DDRAXIARLEN),
    .s_axi_arsize(DDRAXIARSIZE), .s_axi_arburst(DDRAXIARBURST), .s_axi_arlock(DDRAXIARLOCK),
    .s_axi_arcache(DDRAXIARCACHE), .s_axi_arprot(DDRAXIARPROT),
    .s_axi_arvalid(DDRAXIARVALID), .s_axi_arready(DDRAXIARREADY), .s_axi_rid(DDRAXIRID),
    .s_axi_rdata(DDRAXIRDATA), .s_axi_rresp(DDRAXIRRESP), .s_axi_rlast(DDRAXIRLAST),
    .s_axi_rvalid(DDRAXIRVALID), .s_axi_rready(DDRAXIRREADY));

endmodule
