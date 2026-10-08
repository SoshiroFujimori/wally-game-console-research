module tb_apb;
  logic clk=0;
  always #5 clk=~clk;
  logic Resetn=0, Sel=0, Enable=0, Write=0, Ready;
  logic [7:0] Addr=0, Strb=0;
  logic [63:0] WData=0, RData;
  logic CmdValid, CmdReady=0, CmdLast, RespValid=0, RespReady;
  logic [31:0] CmdData, RespData=32'h76543210;
  logic FrameDone=0;
  int Commands=0, Responses=0;
  rasterix_apb dut(.PCLK(clk),.PRESETn(Resetn),.PSEL(Sel),.PENABLE(Enable),.PWRITE(Write),
    .PADDR(Addr),.PWDATA(WData),.PSTRB(Strb),.PRDATA(RData),.PREADY(Ready),
    .CmdValid,.CmdReady,.CmdLast,.CmdData,.RespValid,.RespReady,.RespData,
    .Busy(1'b0),.FrameDone,.FrameAddr(32'h9fe00000));
  always @(posedge clk) begin
    if(CmdValid && CmdReady) Commands++;
    if(RespValid && RespReady) Responses++;
  end
  task automatic send(input logic [7:0] address,input logic [63:0] data,input logic [7:0] strobes,input logic [31:0] expected);
    @(negedge clk); Sel=1;Enable=0;Write=1;Addr=address;WData=data;Strb=strobes;CmdReady=0;
    @(negedge clk); Enable=1;
    repeat(7) begin
      @(posedge clk);
      assert(!Ready && CmdValid && CmdData==expected && CmdLast==address[2]) else $fatal(1,"command changed during backpressure");
    end
    @(negedge clk); CmdReady=1;
    @(posedge clk); assert(Ready) else $fatal;
    @(negedge clk); Sel=0;Enable=0;
  endtask
  initial begin
    repeat(3) @(negedge clk); Resetn=1;
    send(0,64'hbadbadbad1234567,8'h0f,32'hd1234567);
    send(4,64'h89abcdefbadbadba,8'hf0,32'h89abcdef);
    assert(Commands==2) else $fatal(1,"duplicated/dropped command");
    @(negedge clk); Sel=1;Enable=1;Write=0;Addr=8'h18;
    repeat(4) begin @(posedge clk);assert(!Ready && RespReady) else $fatal;end
    @(negedge clk); RespValid=1;
    @(posedge clk);assert(Ready && RData==64'h7654321076543210) else $fatal;
    @(negedge clk); Sel=0;Enable=0;RespValid=0;
    assert(Responses==1) else $fatal;
    Addr=8'h0c;
    @(posedge clk);assert(RData==64'h5249583152495831) else $fatal(1,"ID read");
    @(negedge clk);FrameDone=1;
    @(negedge clk);FrameDone=0;Addr=8'h10;
    @(posedge clk);assert(RData==64'h0000000100000001) else $fatal(1,"frame counter");
    $display("APB_PASS: 32-bit lanes, FIFO backpressure, response wait, ID and frame count");$finish;
  end
  initial begin #10000;$fatal(1,"timeout");end
endmodule
