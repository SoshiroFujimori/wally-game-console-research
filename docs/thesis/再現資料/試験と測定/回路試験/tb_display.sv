module dvi(input clk_i,rst_i,clk_x5_i,input [7:0] vga_red_i,vga_green_i,vga_blue_i,
  input vga_blank_i,vga_hsync_i,vga_vsync_i,output dvi_red_o,dvi_green_o,dvi_blue_o,dvi_clock_o);
  assign {dvi_red_o,dvi_green_o,dvi_blue_o,dvi_clock_o}=4'b0;
endmodule
module tb_display;
  logic GPUCLK=0,PixelCLK=0,SerialCLK=0;
  always #5 GPUCLK=~GPUCLK;
  always #20 PixelCLK=~PixelCLK;
  always #4 SerialCLK=~SerialCLK;
  logic Resetn=0,Swap=0,Swapped,FrameDone;
  logic [31:0] FbAddr=0,FrameAddr,ARADDR,RDATA;
  logic [3:0] ARID,RID=0,TMDS;
  logic [7:0] ARLEN;
  logic [1:0] ARBURST,RRESP=0;
  logic ARVALID,ARREADY=0,RLAST=0,RVALID=0,RREADY;
  int Head=0,Tail=0,Beat=0,Cycle=0,Swaps=0;
  logic [31:0] Queue[0:16383];
  logic [31:0] LastCompleted=0;
  rasterixdisplay dut(.GPUCLK,.GPUResetn(Resetn),.PixelCLK,.SerialCLK,.PixelResetn(Resetn),
    .Swap,.FbAddr,.Swapped,.FrameDone,.FrameAddr,.ARID,.ARADDR,.ARLEN,.ARBURST,.ARVALID,.ARREADY,
    .RID,.RDATA,.RRESP,.RLAST,.RVALID,.RREADY,.TMDS);
  always @(posedge PixelCLK) if(Resetn) begin
    if(ARVALID && ARREADY) begin
      assert(ARLEN==31 && ARBURST==1 && ARID==0) else $fatal(1,"invalid AXI burst");
      Queue[Tail%16384]=ARADDR;Tail++;
    end
    if(RVALID && RREADY) begin
      if(RLAST) begin LastCompleted=Queue[Head%16384];Head++;Beat=0;end
      else Beat++;
    end
    assert(Tail-Head>=0 && Tail-Head<128) else $fatal(1,"outstanding count");
  end
  always @(negedge PixelCLK) begin
    Cycle++;
    ARREADY=Resetn && Cycle%5!=0;
    RVALID=Resetn && Tail>Head && Cycle%8!=0;
    RLAST=Beat==31;
    RDATA=Queue[Head%16384]+32'(Beat*4);
  end
  always @(posedge GPUCLK) if(FrameDone) begin
    assert(LastCompleted[31:20]==FrameAddr[31:20]) else $fatal(1,"swap acknowledged before new-buffer response");
    Swaps++;
  end
  task automatic present(input logic [31:0] address);
    @(negedge GPUCLK);FbAddr=address;Swap=1;
    @(posedge GPUCLK);
    while(!Swapped) @(posedge GPUCLK);
    repeat(2) @(negedge GPUCLK);
    Swap=0;
    repeat(30) @(negedge GPUCLK);
  endtask
  initial begin
    repeat(10) @(negedge PixelCLK);Resetn=1;
    present(32'h9fe00000);
    present(32'h9fc00000);
    present(32'h9fe00000);
    present(32'h9fc00000);
    assert(Swaps==4) else $fatal(1,"lost/duplicated swap");
    $display("DISPLAY_PASS: four swaps with asynchronous clocks, AXI backpressure and delayed responses");$finish;
  end
  initial begin #200000000;$fatal(1,"display timeout");end
endmodule
