module tb_mailbox;
  timeunit 1ns; timeprecision 1ps;
  parameter integer SHALF=25, MHALF=5, PHASE=3;
  logic sc=0, mc=0, sr=0, mr=0, sv=0, sl=0, ready;
  logic [31:0] sd=0, md;
  logic mv, ml, mready=0;
  integer got=0, completed=0, cycle=0, epoch=0;
  bit checking=0;
  int unsigned randomstate=32'hf1f0a523;
  function automatic logic [31:0] word_at(input int n);
    return (32'h31415927 * (n+1)) ^ 32'habcdef01;
  endfunction
  function automatic int unsigned randstep(input int unsigned x);
    x ^= x<<13; x ^= x>>17; x ^= x<<5; return x;
  endfunction
  always #(SHALF) sc=~sc;
  initial begin #(PHASE); forever #(MHALF) mc=~mc; end
  command_mailbox dut(sc,sr,mc,mr,sv,sl,sd,ready,mv,ml,md,mready);
  always @(negedge mc) begin
    randomstate=randstep(randomstate);
    cycle++;
    // Long block followed by random gaps, independent of the sending clock.
    mready=checking && (cycle % 1300 > 350) && (randomstate[3:0] > 3);
  end
  logic [32:0] held;
  bit was_stalled=0;
  always @(posedge mc) begin
    if (!sr || !mr || !checking) was_stalled=0;
    else begin
      if (was_stalled) assert(mv && {ml,md}==held) else $fatal(1,"changed while stalled");
      was_stalled=mv && !mready; held={ml,md};
      if (mv && mready) begin
        assert(md==word_at(got) && ml==(got%37==36))
          else $fatal(1,"word/order/last mismatch got=%0d data=%x",got,md);
        got++;
      end
    end
  end
  task automatic reset_link;
    checking=0; sr=0; mr=0; sv=0;
    repeat(8) @(negedge sc);
    got=0;completed=0;
    mr=1; repeat(3) @(negedge sc); sr=1;
    repeat(8) @(negedge sc); checking=1;
  endtask
  task automatic send_words(input integer count);
    for(integer i=0;i<count;i++) begin
      repeat(i%7) @(negedge sc);
      @(negedge sc); sd=word_at(i);sl=(i%37==36);sv=1;
      do @(posedge sc); while(!ready);
      completed++;
      assert(got==completed) else $fatal(1,"APB completed before consumption");
      @(negedge sc);sv=0;
    end
    repeat(12) @(negedge sc);
    assert(got==count && completed==count) else $fatal(1,"count mismatch");
  endtask
  initial begin
    reset_link();send_words(2000);
    // Reset with an outstanding request deliberately held at the receiving side.
    checking=0;
    @(negedge sc);sv=1;sd=32'hdeadbeef;sl=1;
    repeat(15) @(negedge sc);
    assert(!ready) else $fatal(1,"unexpected acceptance");
    reset_link();send_words(2000);
    $display("MAILBOX_PASS SHALF=%0d MHALF=%0d PHASE=%0d words=4000 reset_inflight=1",SHALF,MHALF,PHASE);
    $finish;
  end
  initial begin #100000000; $fatal(1,"watchdog"); end
endmodule
