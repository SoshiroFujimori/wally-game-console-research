from pathlib import Path
import subprocess,shutil,hashlib,json,os
r=Path('/path/to/wally-game-console')
o=Path('/path/to/research/experiments/fifo-study-20261008')
master=o/'latest'
assert (master/'fpga/generator/WallyFPGA.xpr').exists(), 'Wait until vendor IP generation is complete'
for kind,depth in [('fifo512',512),('fifo16',16),('mailbox',1)]:
    d=o/'variants'/kind
    d.mkdir(parents=True,exist_ok=False)
    subprocess.run(['git','-C',str(r),'checkout-index','--all','--prefix='+str(d)+'/'],check=True)
    for mod in (r/'addins').iterdir():
        if mod.is_dir() and (mod/'.git').exists():
            p=d/'addins'/mod.name
            if p.exists():p.rmdir()
            p.symlink_to(mod,target_is_directory=True)
    shutil.copytree(master/'fpga/generator/IP',d/'fpga/generator/IP')
    for p in (d/'fpga/generator/IP').glob('*.log'):os.utime(p,None)
    p=d/'fpga/src/rasterix_apb.sv'
    s=p.read_text()
    s=s.replace('  always_comb\n',"""  logic [31:0] StudyWords, StudyWaits, StudyLongest, StudyCurrent, StudyCycles;
  always_ff @(posedge PCLK)
    if (!PRESETn || (PSEL && PENABLE && PWRITE && PADDR == 8'h7c)) begin
      StudyWords <= '0; StudyWaits <= '0; StudyLongest <= '0;
      StudyCurrent <= '0; StudyCycles <= '0;
    end else begin
      StudyCycles <= StudyCycles + 1'b1;
      if (CommandWrite && CmdReady) StudyWords <= StudyWords + 1'b1;
      if (CommandWrite && !CmdReady) begin
        StudyWaits <= StudyWaits + 1'b1;
        StudyCurrent <= StudyCurrent + 1'b1;
        if (StudyCurrent >= StudyLongest) StudyLongest <= StudyCurrent + 1'b1;
      end else StudyCurrent <= '0;
    end

  always_comb
""")
    s=s.replace("      default: ReadData = '0;",f"""      8'h1c: ReadData = StudyWords;
      8'h20: ReadData = StudyWaits;
      8'h24: ReadData = StudyLongest;
      8'h28: ReadData = StudyCycles;
      8'h2c: ReadData = 32'h4649{depth:04x};
      default: ReadData = '0;""")
    p.write_text(s)
    if kind=='fifo16':
        p=d/'fpga/generator/axiscommand.tcl'
        p.write_text((d/'fpga/generator/axiscdc.tcl').read_text().replace('set ipName axiscdc','set ipName axiscommand').replace('CONFIG.FIFO_DEPTH {512}','CONFIG.FIFO_DEPTH {16}'))
        p=d/'fpga/generator/Makefile'
        p.write_text(p.read_text().replace('IP_NEXYSVIDEO: $(dst)/axiscdc.log','IP_NEXYSVIDEO: $(dst)/axiscommand.log $(dst)/axiscdc.log'))
        p=d/'fpga/generator/wally.tcl'
        p.write_text(p.read_text().replace('    import_ip IP/axiscdc.srcs/', '    import_ip IP/axiscommand.srcs/sources_1/ip/axiscommand/axiscommand.xci\n    import_ip IP/axiscdc.srcs/'))
        p=d/'fpga/src/rasterix.sv'
        p.write_text(p.read_text().replace('axiscdc commandfifo(', 'axiscommand commandfifo('))
    if kind=='mailbox':
        shutil.copy2(o/'scripts/command_mailbox.sv',d/'fpga/src/command_mailbox.sv')
        shutil.copy2(o/'scripts/command_mailbox.xdc',d/'fpga/constraints/command_mailbox.xdc')
        p=d/'fpga/generator/wally.tcl'
        p.write_text(p.read_text().replace('    add_files {../src/rasterix.sv', '    add_files ../src/command_mailbox.sv\n    add_files -fileset constrs_1 ../constraints/command_mailbox.xdc\n    set_property SCOPED_TO_REF command_mailbox [get_files command_mailbox.xdc]\n    add_files {../src/rasterix.sv'))
        p=d/'fpga/src/rasterix.sv'
        p.write_text(p.read_text().replace('axiscdc commandfifo(', 'command_mailbox commandfifo(\n    .m_axis_aresetn(DDRResetn),'))
    touched=['fpga/src/rasterix_apb.sv','fpga/src/rasterix.sv','fpga/generator/Makefile','fpga/generator/wally.tcl']
    (d/'experiment.json').write_text(json.dumps({'kind':kind,'depth':depth,'base_manifest':str(o/'latest-source.json'),'response_fifo_depth':512,'cpu_hz':20000000,'gpu_hz':100000000,'files':{f:hashlib.sha256((d/f).read_bytes()).hexdigest() for f in touched}},indent=2)+'\n')
    print('VARIANT_PREPARED',kind)
