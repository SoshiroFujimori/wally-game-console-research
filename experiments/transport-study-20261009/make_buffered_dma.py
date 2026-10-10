#!/usr/bin/env python3
"""Generate an isolated, experimental DMA read-buffer top; never edit upstream."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--wally',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--depth',type=int,default=64)
p.add_argument('--reserve',type=int,choices=(0,1),default=1)
p.add_argument('--parser-handshake',action='store_true',help='Also apply the experimental E6 handshake correction')
a=p.parse_args()
assert a.depth>=16 and not (a.depth & (a.depth-1))
a.output.mkdir(parents=True,exist_ok=False)
path=a.wally/'addins/rasterix/rtl/RasterIX/RasterIX_IF.v'
original=path.read_text(); start=original.index('    FrameStreamingCore #('); end=original.index('    wire commit_fb;',start)
block=original[start:end]
fields={'arid':'ID_WIDTH_LOC - 1 : 0','araddr':'ADDR_WIDTH - 1 : 0','arlen':'7 : 0','arsize':'2 : 0','arburst':'1 : 0','arlock':'','arcache':'3 : 0','arprot':'2 : 0','arvalid':'','arready':'','rid':'ID_WIDTH_LOC - 1 : 0','rdata':'CMD_STREAM_WIDTH - 1 : 0','rresp':'1 : 0','rlast':'','rvalid':'','rready':''}
wires=''
for field,width in fields.items():
    wires+='    wire '+('['+width+'] ' if width else '')+'buffered_dma_'+field+';\n'
    assert block.count('common_axi_'+field)==1,field
    block=block.replace('common_axi_'+field,'buffered_dma_'+field)
ports=['.clk(aclk)','.rst(!resetn)']
for side,prefix in [('s','buffered_dma'),('m','common_axi')]:
    ports += [f'.{side}_axi_{field}({prefix}_{field})' for field in fields]
    ports += [f'.{side}_axi_arqos('+('0' if side=='s' else '')+')',f'.{side}_axi_arregion('+('0' if side=='s' else '')+')',f'.{side}_axi_aruser('+('0' if side=='s' else '')+')',f'.{side}_axi_ruser('+('0' if side=='m' else '')+')']
fifo=f'    axi_fifo_rd #(.DATA_WIDTH(CMD_STREAM_WIDTH), .ADDR_WIDTH(ADDR_WIDTH), .ID_WIDTH(ID_WIDTH_LOC), .FIFO_DEPTH({a.depth}), .FIFO_DELAY({a.reserve})) experimentalDmaReadBuffer (\n        '+',\n        '.join(ports)+'\n    );\n'
modified=original[:start]+wires+block+fifo+original[end:]
(a.output/'RasterIX_IF.v').write_text(modified)
(a.output/'dma-read-buffer.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),modified.splitlines(True),fromfile='a/rtl/RasterIX/RasterIX_IF.v',tofile='b/rtl/RasterIX/RasterIX_IF.v')))
(a.output/'manifest.json').write_text(json.dumps({'upstream_sha256':hashlib.sha256(original.encode()).hexdigest(),'experimental_sha256':hashlib.sha256(modified.encode()).hexdigest(),'depth':a.depth,'reserve_full_bursts':a.reserve},indent=2)+'\n')

if a.parser_handshake:
    parser=(a.wally/'addins/rasterix/rtl/RasterIX/CommandParser.v').read_text()
    fixed=parser
    for old,new in [('tvalid <= s_cmd_axis_tvalid;','tvalid <= s_cmd_axis_tvalid && s_cmd_axis_tready;'),('if (s_cmd_axis_tvalid || tvalidSkid)','if ((s_cmd_axis_tvalid && s_cmd_axis_tready) || tvalidSkid)'),('if (s_cmd_axis_tvalid && !tvalidSkid)','if (s_cmd_axis_tvalid && s_cmd_axis_tready && !tvalidSkid)')]:
        assert fixed.count(old)==1,old
        fixed=fixed.replace(old,new)
    (a.output/'CommandParser.v').write_text(fixed)
    (a.output/'parser-handshake.patch').write_text(''.join(difflib.unified_diff(parser.splitlines(True),fixed.splitlines(True),fromfile='a/rtl/RasterIX/CommandParser.v',tofile='b/rtl/RasterIX/CommandParser.v')))
