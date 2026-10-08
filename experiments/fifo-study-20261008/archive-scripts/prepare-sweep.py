from pathlib import Path
o=Path('/path/to/research/experiments/fifo-study-20261008')
s=(o/'scripts/tb_channel.sv').read_text()
s=s.replace('int sent=0,got=0,cycles=0,waits=0;','int sent=0,got=0,cycles=0,waits=0;\n  int stop_cycles=0,gap_cycles=0;')
s=s.replace('(cycles>20000)','(cycles>stop_cycles)')
s=s.replace('rn=1;repeat(64)@(negedge sc);check_data=1;','rn=1;repeat(64)@(negedge sc);cycles=0;check_data=1;')
s=s.replace('@(negedge sc);sel=0;en=0;','@(negedge sc);sel=0;en=0;repeat(gap_cycles)@(negedge sc);')
a=s.index('  initial begin\n    reset_link();')
b=s.index('  initial begin #10000000;',a)
s=s[:a]+'''  initial begin
    for(int gap=0;gap<2;gap++) begin
      gap_cycles=gap*20;
      for(int level=0;level<3;level++) begin
        stop_cycles=level==0?0:level==1?1000:20000;
        forced_stop=1;reset_link();forced_stop=0;
        for(int i=0;i<3000;i++)put(i);
        wait(got==3000);repeat(64)@(negedge sc);
        assert(got==sent)else $fatal(1,"sweep count mismatch");
        $display("SWEEP_PASS stop_gpu_cycles=%0d extra_gap_cpu_cycles=%0d words=%0d APB_wait_cycles=%0d",stop_cycles,gap_cycles,got,waits);
      end
    end
    $finish;
  end
'''+s[b:].replace('#10000000;','#100000000;')
(o/'scripts/tb_stall_sweep.sv').write_text(s)
t=(o/'scripts/simulate-channel.tcl').read_text().replace('set dir $root/sim-$kind','set dir $root/sim-sweep-$kind').replace('create_project channel_$kind','create_project sweep_$kind').replace('scripts/tb_channel.sv','scripts/tb_stall_sweep.sv')
(o/'scripts/simulate-sweep.tcl').write_text(t)
with (o/'PROTOCOL.md').open('a') as f:f.write('\n## Added synthetic stall sweep\nBefore any updated-board result, sweep forced receiver stalls of 0/1000/20000 GPU cycles and added sender gaps of 0/20 CPU cycles, with 3000 words per case. This isolates queue-capacity behavior for a known artificial workload, and is not a measurement of real game stalls or FPS. Original reset tests remain separate.\n')
