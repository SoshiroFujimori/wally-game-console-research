module tb_channel;
  timeunit 1ns;timeprecision 1ps;
  logic sc=0,mc=0,rn=0;
  always #25 sc=~sc;
  initial begin #3;forever #5 mc=~mc;end
  logic sel=0,en=0,wr=0,ready,cv,cr,cl,rv,rl,rr=0;
  logic [7:0] addr=0,strb=0;
  logic [63:0] wd=0,rd;
  logic [31:0] cd,data;
  int sent=0,got=0,cycles=0,waits=0;
  bit check_data=0,forced_stop=1;
  int unsigned rng=32'h295ac013;
  function automatic logic [31:0] value_at(input int i); return 32'h25176235*(i+1)^32'hafe86523;endfunction
  rasterix_apb apb(.PCLK(sc),.PRESETn(rn),.PSEL(sel),.PENABLE(en),.PWRITE(wr),
    .PADDR(addr),.PWDATA(wd),.PSTRB(strb),.PRDATA(rd),.PREADY(ready),
    .CmdValid(cv),.CmdReady(cr),.CmdLast(cl),.CmdData(cd),
    .RespValid(1'b0),.RespData(32'b0),.RespReady(),.Busy(1'b0),.FrameDone(1'b0),.FrameAddr(32'b0));
`ifdef FIFO16
  axiscommand link(
`elsif FIFO512
  axiscdc link(
`else
  command_mailbox link(.m_axis_aresetn(rn),
`endif
    .s_axis_aresetn(rn),.s_axis_aclk(sc),.m_axis_aclk(mc),
    .s_axis_tvalid(cv),.s_axis_tready(cr),.s_axis_tlast(cl),.s_axis_tdata(cd),
    .m_axis_tvalid(rv),.m_axis_tready(rr),.m_axis_tlast(rl),.m_axis_tdata(data));
  always @(negedge mc) begin
    cycles++;
    rng ^= rng<<13;rng ^= rng>>17;rng ^= rng<<5;
    rr=rn && !forced_stop && (cycles>20000) && rng[2:0]>1;
  end
  logic [32:0] held;
  bit stalled=0;
  always @(posedge mc) begin
    if(!rn)stalled=0;
    else begin
      if(stalled)assert(rv && {rl,data}==held)else $fatal(1,"changed stalled stream");
      held={rl,data};stalled=rv&&!rr;
      if(rv&&rr&&check_data) begin
        assert(data==value_at(got) && rl==(got%29==28))
          else $fatal(1,"data/last/order got=%0d actual=%x expected=%x",got,data,value_at(got));
        got++;
      end
    end
  end
  always @(posedge sc) if(rn&&cv&&!cr) waits++;
  task automatic reset_link;
    rn=0;sel=0;en=0;wr=0;check_data=0;
    repeat(32)@(negedge sc);
    sent=0;got=0;waits=0;cycles=0;
    rn=1;repeat(64)@(negedge sc);check_data=1;
  endtask
  task automatic put(input int i);
    @(negedge sc);sel=1;en=0;wr=1;
    addr=i%29==28?8'h04:8'h00;strb=addr[2]?8'hf0:8'h0f;
    wd={value_at(i),value_at(i)};
    @(negedge sc);en=1;
    do @(posedge sc);while(!ready);
    sent++;
    @(negedge sc);sel=0;en=0;
  endtask
  initial begin
    reset_link();forced_stop=0;
    for(int i=0;i<3000;i++)put(i);
    wait(got==3000);
    repeat(64)@(negedge sc);
    assert(got==sent)else $fatal(1,"count mismatch");
    $display("CHANNEL_SEGMENT words=%0d APB_wait_cycles=%0d",got,waits);
    // Reset while an APB write is outstanding and the GPU refuses commands.
    forced_stop=1;check_data=0;
    @(negedge sc);sel=1;en=0;wr=1;wd=64'hdeadbeefdeadbeef;strb=8'h0f;addr=0;
    @(negedge sc);en=1;
    repeat(5)@(negedge sc);
    reset_link();forced_stop=0;
    for(int i=0;i<3000;i++)put(i);
    wait(got==3000);repeat(64)@(negedge sc);
    assert(got==sent)else $fatal(1,"count mismatch after reset");
    $display("CHANNEL_PASS words=6000 APB_wait_cycles_after_reset=%0d",waits);
    $finish;
  end
  initial begin #10000000;$fatal(1,"timeout");end
endmodule
