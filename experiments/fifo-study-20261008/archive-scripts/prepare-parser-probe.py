from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'latest/addins/rasterix/rtl/RasterIX/CommandParser.v').read_text()
p=r/'upstream-reproducer';p.mkdir(exist_ok=True)
(p/'CommandParser-original.v').write_text(s)
s=s.replace('tvalid <= s_cmd_axis_tvalid;', 'tvalid <= s_cmd_axis_tvalid && s_cmd_axis_tready;')
s=s.replace('if (s_cmd_axis_tvalid || tvalidSkid)', 'if ((s_cmd_axis_tvalid && s_cmd_axis_tready) || tvalidSkid)')
s=s.replace('if (s_cmd_axis_tvalid && !tvalidSkid)', 'if (s_cmd_axis_tvalid && s_cmd_axis_tready && !tvalidSkid)')
(p/'CommandParser.v').write_text(s)
