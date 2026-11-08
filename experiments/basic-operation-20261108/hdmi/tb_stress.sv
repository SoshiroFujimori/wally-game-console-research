module dvi(input logic clk_i,rst_i,clk_x5_i,input logic [7:0] vga_red_i,vga_green_i,vga_blue_i,
 input logic vga_blank_i,vga_hsync_i,vga_vsync_i,output logic dvi_red_o,dvi_green_o,dvi_blue_o,dvi_clock_o);
 assign dvi_red_o=^vga_red_i;assign dvi_green_o=^vga_green_i;assign dvi_blue_o=^vga_blue_i;assign dvi_clock_o=clk_i;
endmodule
module tb;
 timeunit 1ns;timeprecision 1ps;
 logic GPUCLK=0,PixelCLK=0,SerialCLK=0,GPUResetn=0,PixelResetn=0;
 always #5 GPUCLK=~GPUCLK;
 always #7 PixelCLK=~PixelCLK;
 always #1.4 SerialCLK=~SerialCLK;
 logic Swap=0;logic [31:0] FbAddr=0;wire Swapped,FrameDone;wire [31:0] FrameAddr;
 wire [3:0] ARID;wire [31:0] ARADDR;wire [7:0] ARLEN;wire [1:0] ARBURST;wire ARVALID;logic ARREADY=0;
 logic [3:0] RID=0;logic[31:0] RDATA=0;logic [1:0] RRESP=0;logic RLAST=0,RVALID=0;wire RREADY;wire[3:0] TMDS;
 rasterixdisplay dut(.*);
 localparam logic[31:0] BASE0=32'h88000000, BASE1=32'h88200000;
 logic [31:0] Random=32'h82376951;
 logic Busy=0;logic[31:0] Address;integer BeatIndex=0;
 integer Bursts=0,Words=0,Frames=0,Done=0,Errors=0,Checked=0,BlackChecked=0;
 bit FaultEnable=0,FaultSent=0;integer Seed=0;
 integer OldH=-1,OldV=-1;logic[31:0] OldAddr=0;logic OldEnabled=0;
 function automatic logic[15:0] pattern(input logic[31:0] base,input integer x,y);
  logic[4:0] red,blue;logic[5:0] green;
  red=5'(x*7+y*11+(base==BASE1?13:0));
  green=6'(x*3+y*17+(base==BASE1?27:0));
  blue=5'(x*19+y*5+(base==BASE1?9:0));
  return {red,green,blue};
 endfunction
 function automatic logic[31:0] memory(input logic[31:0] address);
  logic[31:0] base;integer offset,x,y;
  base=address>=BASE1?BASE1:BASE0;offset=int'(address-base);x=(offset%1280)/2;y=offset/1280;
  if(y<0 || y>=480 || x<0 || x>=640)$fatal(1,"Out-of-frame read %h",address);
  return {pattern(base,x+1,y),pattern(base,x,y)};
 endfunction
 always @(negedge PixelCLK)begin
  Random={Random[30:0],Random[31]^Random[21]^Random[1]^Random[0]};
  ARREADY=PixelResetn && !Busy && Random[0];
  if(!PixelResetn)begin RVALID=0;RLAST=0;end
  else if(Busy && (!RVALID || RREADY))begin
   RRESP=(FaultEnable && !FaultSent && BeatIndex==0)?2:0;
   RVALID=Random[2] || Random[3];RDATA=memory(Address+32'(BeatIndex*4));RLAST=(BeatIndex==31);
  end else if(!Busy)begin RVALID=0;RLAST=0;end
 end
 always @(posedge PixelCLK)begin
  logic[15:0] expected;
  if(!PixelResetn)begin Busy=0;OldH=-1;OldV=-1;end
  else begin
   if(ARVALID && ARREADY)begin
    if(Busy || ARID!=0 || ARLEN!=31 || ARBURST!=1 || ARADDR[6:0]!=0)$fatal(1,"AXI request");
    Busy=1;Address=ARADDR;BeatIndex=0;Bursts++;
   end
   if(RVALID && RREADY)begin
    if(!Busy)$fatal(1,"Unexpected R channel");
    Words++;if(RRESP!=0)FaultSent=1;
    if(BeatIndex==31)begin Busy=0;BeatIndex=0;end else BeatIndex++;
   end
   if(dut.HPos==0 && dut.VPos==0)Frames++;
   if(OldH>=0)begin
    if(OldEnabled && OldV<720 && OldH>=160 && OldH<1120)begin
     expected=pattern(OldAddr,((OldH-160)*2)/3,(OldV*2)/3);
     if(dut.Pixel !== expected)begin
      if(Errors<8)$display("MISMATCH frame=%0d at%0d,%0d source=%0d,%0d got=%h expected=%h rowvis=%b bank=%b rows=%0d/%0d valid=%b",Frames,OldH,OldV,dut.SourceX,dut.SourceY,dut.Pixel,expected,dut.RowVisible,dut.FrontBank,dut.BankRow[0],dut.BankRow[1],dut.BankValid);
      Errors++;
     end
     Checked++;
    end else begin
     if(dut.Pixel!==0)$fatal(1,"Nonblack border/blank");BlackChecked++;
    end
   end
   OldH=int'(dut.HPos);OldV=int'(dut.VPos);OldAddr=dut.ActiveAddr;OldEnabled=dut.Enabled;
  end
 end
 always @(posedge GPUCLK)if(GPUResetn && FrameDone)begin
  Done++;if(FrameAddr != FbAddr)$fatal(1,"FrameDone address");
  if(dut.VPos<720)$fatal(1,"Swap acknowledged outside vertical blank");
  if(Busy && ((Address>=BASE1)!=(FrameAddr>=BASE1)))$fatal(1,"Old read at acknowledgment");
 end
 task automatic swapto(input logic[31:0] base);
  @(negedge GPUCLK);FbAddr=base;Swap=1;
  @(negedge GPUCLK);
  while(!Swapped)@(negedge GPUCLK);
  repeat(1000)@(negedge GPUCLK);
  Swap=0;
  repeat(20)@(negedge GPUCLK);
 endtask
 integer HistH[2],HistV[2];
 logic HistEnable[2]; logic[31:0] HistAddr[2];
 integer History=0,HDMIPixels=0;
 always @(posedge PixelCLK) begin
  logic[15:0] e; logic[23:0] rgb;
  if(!PixelResetn || dut.EncoderReset)History=0;
  else begin
   if(History>=2)begin
    if((dut.encoder.mode==1) !== (HistH[1]<1280 && HistV[1]<720))
     $fatal(1,"HDMI active period mismatch at %0d,%0d mode=%0d",HistH[1],HistV[1],dut.encoder.mode);
    if(dut.encoder.mode==1)begin
     e=(HistEnable[1] && HistH[1]>=160 && HistH[1]<1120) ?
        pattern(HistAddr[1],((HistH[1]-160)*2)/3,(HistV[1]*2)/3):16'b0;
     rgb={e[15:11],3'b0,e[10:5],2'b0,e[4:0],3'b0};
     if(dut.encoder.video_data!==rgb)
      $fatal(1,"HDMI RGB pipeline mismatch at %0d,%0d got=%h expected=%h",HistH[1],HistV[1],dut.encoder.video_data,rgb);
     HDMIPixels++;
    end
   end
   HistH[1]=HistH[0];HistV[1]=HistV[0];HistEnable[1]=HistEnable[0];HistAddr[1]=HistAddr[0];
   HistH[0]=int'(dut.HPos);HistV[0]=int'(dut.VPos);HistEnable[0]=dut.Enabled;HistAddr[0]=dut.ActiveAddr;
   if(History<3)History++;
  end
 end
 initial begin
  if($value$plusargs("SEED=%h",Seed))Random=32'(Seed);
  FaultEnable=$test$plusargs("FAULT");
  repeat(20)@(negedge PixelCLK);GPUResetn=1;PixelResetn=1;
  repeat(1000)@(negedge PixelCLK);
  swapto(BASE0);
  repeat(1450000)@(negedge PixelCLK);
  swapto(BASE1);
  repeat(1550000)@(negedge PixelCLK);
  swapto(BASE0);
  repeat(1500000)@(negedge PixelCLK);
  // Reset while a read is outstanding; the AXI endpoint shares this reset.
  while(!Busy)@(negedge PixelCLK);
  GPUResetn=0;PixelResetn=0;
  repeat(20)@(negedge PixelCLK);
  GPUResetn=1;PixelResetn=1;
  repeat(1000)@(negedge PixelCLK);
  swapto(BASE1);
  repeat(1500000)@(negedge PixelCLK);
  if(FaultEnable && !FaultSent)$fatal(1,"Fault was not injected");
  if(Done!=4 || Checked<2800000 || Errors!=0)$fatal(1,"errors=%0d checked=%0d done=%0d",Errors,Checked,Done);
  if(HDMIPixels<2000000)$fatal(1,"Too few HDMI pixels");
  $display("HDMI_PIPELINE_PIXELS=%0d",HDMIPixels);
  $display("PASS 720P_SCANOUT checked=%0d border=%0d frames=%0d swaps=%0d bursts=%0d words=%0d",Checked,BlackChecked,Frames,Done,Bursts,Words);$finish;
 end
 integer ResetReleaseClocks=0;
 always @(posedge PixelCLK) if(!PixelResetn)ResetReleaseClocks=0;else ResetReleaseClocks++;
 always @(negedge dut.EncoderReset)
  if(PixelResetn && (PixelCLK!==1 || ResetReleaseClocks<4))$fatal(1,"Unsynchronized reset release");
 always @(negedge PixelResetn)begin
  #0.001;
  if({dut.EncoderReset,dut.EncoderResetSync}!==4'b1111)$fatal(1,"Asynchronous reset assertion");
 end

 initial begin #200000000;$fatal(1,"Timeout");end
endmodule
