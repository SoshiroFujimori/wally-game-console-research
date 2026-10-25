// Editable expansion of the RVSOC Figure 7.11 pipeline layout.
// Preserve stage-register, operand-selection and writeback geometry; replace
// the introductory IROM/DTIM blocks with the configured memory interfaces.
// Coordinates describe functional connections, not placement on the FPGA.
export function drawWallyOverview(s, api) {
  const expanded=true;
  const { text, box, polygon, route, wire, C } = api;
  const ox=64, oy=123, k=1.0, kx=1.03, ky=0.94;
  const X=x=>ox+kx*x, Y=y=>oy+ky*y;
  const T=(v,x,y,w,h=22,z=16,b=false,c=C.ink,a='left')=>text(s,v,X(x),Y(y),w*kx,h*ky,z*k,b,c,a);
  const B=(v,x,y,w,h,fill=C.white,z=16,stroke=C.ink,thick=1.5)=>{
    const shape=box(s,'',X(x),Y(y),w*kx,h*ky,fill,z*k,stroke,thick*k);
    if(v)T(v,x+3,y+1,w-6,h-2,z,true,stroke,'center');
    return shape;
  };
  const W=(x1,y1,x2,y2,c=C.ink,arrow=true,w=1.8)=>{
    wire(s,X(x1),Y(y1),X(x2),Y(y2),c,false,w*k);
    if(arrow){const d=Math.hypot(x2-x1,y2-y1),dx=(x2-x1)/d,dy=(y2-y1)/d;
      P([[x2,y2],[x2-5*dx+2.1*dy,y2-5*dy-2.1*dx],[x2-5*dx-2.1*dy,y2-5*dy+2.1*dx]],c,c,0.5);}
  };
  const R=(pts,c=C.ink,arrow=true,w=1.8)=>pts.slice(1).forEach((p,i)=>W(...pts[i],...p,c,arrow&&i===pts.length-2,w));
  const P=(pts,fill=C.white,stroke=C.ink,width=1.5)=>polygon(s,pts.map(([x,y])=>[X(x),Y(y)]),fill,stroke,width*k);
  const J=(x,y,c=C.ink)=>s.shapes.add({geometry:'ellipse',position:{left:X(x)-1.5*k,top:Y(y)-1.5*k,width:3*k,height:3*k},fill:c,line:{fill:c,width:0}});
  const blue=C.blue, known=C.ip;
  const M=(x,y,h=44,fill=C.white)=>{P([[x,y],[x+17,y+6],[x+17,y+h-6],[x,y+h]],fill);T('0',x+1,y+3,13,14,11);T('1',x+1,y+h-18,13,14,11);};
  const F=(x,y,h=42)=>{B('',x,y,12,h);P([[x+2,y],[x+6,y+5],[x+10,y]],'none');W(x+6,y-6,x+6,y,C.ink,false,0.8);};
  const BI=(pts,c=C.ink,w=2)=>{R(pts,c,true,w);R([pts[1],pts[0]],c,true,w);};

  // Board components outside the programmable chip.
  B('DDR3',800,0,144,36,C.white,19);
  B('SD card',970,0,135,36,C.white,19);
  B('',0,51,1120,539,C.chip,18,C.ink,2.2);
  T('FPGA / fpgaTop',15,55,355,29,24,true);
  T('Artix-7',739,55,135,27,20,true);

  // Preserve the HDL hierarchy: RasterIX and memory IP are outside the SoC.
  B('',15,91,875,482,C.white,15,C.ink,1.8);
  T('wallypipelinedsoc',30,94,330,25,21,true);
  B('',28,124,847,104,C.pale,16,C.ink,1.6);
  T('uncore',38,128,95,23,18,true);
  B('adrdecs',140,135,90,31,known,15);
  B('Boot ROM',258,135,98,31,C.white,15);
  B('ahbapbbridge',426,151,149,45,known,15);
  T('AHB',93,195,68,20,16,true,blue);
  T('APB',594,195,70,20,16,true,blue);
  R([[104,184],[426,184]],blue,false,2.4);
  W(185,166,185,184,blue,false,1);
  W(306,166,306,184,C.ink,false,1.7);
  R([[575,175],[871,175],[912,175],[912,315],[951,315]],blue,true,2.4);
  B('uart_apb',593,136,93,29,C.white,14);
  B('gpio_apb',698,136,88,29,C.white,14);
  B('spi_apb',796,136,69,29,known,14);
  [638,741,830].forEach(x=>W(x,165,x,175,C.ink,false,1.4));
  BI([[845,136],[845,119],[903,119],[903,80],[1038,80],[1038,36]],blue,1.7);
  T('SPI',863,81,38,20,13,false,C.ink);
  T('CLINT / PLIC 等',663,200,199,20,13,false,C.ink);
  // Peripheral output and memory response channels are aggregated.
  BI([[359,184],[394,184],[394,106],[906,106],[922,106]],blue,2.2);

  B('ahbaxibridge',922,89,181,34,known,16);
  B('clkconverter',922,138,181,34,known,16);
  B(expanded?'AXI shared fabric':'AXI connection',922,188,181,34,expanded?C.pale:known,15);
  B('DDR controller / MIG',922,238,181,34,known,14);
  BI([[1012,123],[1012,138]],blue);
  BI([[1012,172],[1012,188]],blue);
  BI([[1012,222],[1012,238]],blue);
  BI([[1103,255],[1111,255],[1111,43],[872,43],[872,36]],blue);

  // CPU blocks follow the source units. Functional routes remain readable
  // without showing every prediction, exception, or arithmetic extension.
  B('',28,240,847,321,C.white,16,C.ink,1.6);
  T('wallypipelinedcore',38,241,310,24,20,true);
  T('20 MHz',370,243,110,22,17);
  B('ebu',755,248,104,29,C.white,17);
  BI([[806,248],[806,237],[105,237],[105,184]],blue,2.1);
  T('AHB',708,252,48,20,14,false,blue);

  // Light, borderless unit backgrounds match the book's pipeline diagram.
  B('',39,277,136,246,C.pale,14,'none',0);
  B('',184,277,350,246,C.pale,14,'none',0);
  B('',551,277,238,246,C.pale,14,'none',0);
  B('',800,277,64,246,C.pale,14,'none',0);
  T('ifu',44,280,90,24,18,true);
  T('ieu',194,280,95,24,18,true);
  T('lsu',602,280,90,24,18,true);

  // IFU: source names are grouped for MMU/cache/next-PC logic.
  F(77,365,43);T('PC',63,343,47,22,17,true);
  B('MMU',112,328,55,29,C.white,16);
  B('I-cache',111,375,57,40,C.white,14);
  B('bus I/F',112,445,54,27,C.white,12);
  R([[89,386],[100,386],[100,343],[112,343]]);
  W(139,357,139,375);
  BI([[139,415],[139,445]],C.ink,1.6);
  BI([[166,458],[171,458],[171,269],[767,269]],C.ink,1.3);
  // PC increment and next-PC selection stay above/left of the PC as in 7.11.
  B('+2 / +4',48,308,54,27,C.white,14);
  R([[89,386],[96,386],[96,340],[75,340],[75,335]],C.ink,true,1.2);
  M(45,365,43);
  R([[48,322],[36,322],[36,376],[45,376]],C.ink,true,1.3);
  W(62,386,77,386,C.ink,true,1.3);
  T('Next PC',40,415,69,20,13);
  // Branch target comes from the address sum, not the comparator flags.
  R([[530,349],[530,301],[30,301],[30,399],[45,399]],C.ink,true,1.0);
  F(177,364,158);
  T('Fetch',49,568,113,21,15,true,blue,'center');
  T('Decode',204,568,102,21,15,true,blue,'center');
  T('Execute',345,568,185,21,15,true,blue,'center');
  T('Memory',576,568,174,21,15,true,blue,'center');
  T('Writeback',777,568,88,21,15,true,blue,'center');
  R([[168,395],[177,395]],C.ink,false,1.6);
  R([[189,395],[194,395],[194,386],[204,386]],C.ink,true,1.4);
  R([[194,395],[194,406],[204,406]],C.ink,true,1.4);J(194,395);
  R([[194,406],[194,490],[204,490]],C.ink,true,1.4);J(194,406);
  R([[194,386],[194,325],[205,325]],C.ink,true,1.1);J(194,386);

  // Representative control paths cross the pipeline register boundaries.
  B('controller',205,310,101,34,C.white,16);
  T('ResultSrcW',662,284,108,20,13);
  R([[306,318],[325,318]],C.ink,false,1.0);
  R([[337,318],[548,318]],C.ink,false,1.0);
  R([[560,318],[791,318]],C.ink,false,1.0);
  R([[803,318],[828,318],[828,349]],C.ink,true,1.0);
  R([[306,329],[325,329]],C.ink,false,1.0);
  R([[337,329],[392,329],[392,351],[414,351],[414,359]],C.ink,true,1.0);
  R([[306,339],[325,339]],C.ink,false,1.0);
  R([[337,339],[342,339],[342,474],[414,474],[414,468]],C.ink,true,1.0);

  // Familiar register file, immediate generator and ALU are blue-filled.
  B('',204,365,102,102,known,14);
  T('regfile',216,392,78,18,17,true,C.ink,'center');
  T('A1',207,374,27,17,13);T('A2',207,411,27,17,13);
  T('A3',207,430,27,16,13);T('WD3',207,448,41,17,12);
  T('RD1',271,374,34,17,13);T('RD2',271,411,34,17,13);
  T('WE3',234,366,37,14,11);
  P([[261,365],[265,370],[269,365]],'none');
  P([[204,488],[306,477],[306,506],[204,506]],known);
  T('extend',232,484,72,19,14,true);
  F(325,310,207);
  T('D / E',305,281,57,21,14,true);
  W(306,384,325,384,blue,false);W(306,419,325,419,blue,false);W(306,495,325,495,blue,false);
  M(360,366,38);M(360,407,45);M(405,359,48);M(405,421,47);
  R([[337,384],[350,384],[350,378],[360,378]],blue);W(337,419,360,419,blue);
  R([[377,385],[393,385],[393,372],[405,372]],blue);W(377,430,405,430,blue);
  R([[337,495],[391,495],[391,454],[405,454]],blue);
  W(384,395,405,395,C.ink,true,1.2);
  T('PCE',369,399,36,19,13);
  // A representative branch comparator and its two operand connections.
  B('comp',448,326,66,27,C.white,13);
  R([[387,385],[387,337],[448,337]],C.ink,true,1);
  R([[386,430],[386,348],[448,348]],C.ink,true,1);
  T('FlagsE',472,308,67,15,10);
  W(481,326,481,322,C.ink,true,0.8);
  P([[449,375],[511,391],[511,441],[449,456],[449,429],[466,416],[449,403]],known);
  T('ALU',469,397,40,30,19,true,C.ink,'center');
  W(422,383,449,390,blue);
  R([[422,444],[435,444],[435,440],[449,440]],blue);
  T('SrcAE',423,357,65,20,13);T('SrcBE',423,458,65,20,13);

  // Address and integer-result ports are separate in datapath.sv.
  F(548,309,208);
  T('E / M',529,281,57,21,14,true);
  R([[511,398],[530,398],[530,349],[548,349]],blue);
  T('IEUAdrE',481,355,63,16,11,false,blue);
  W(560,349,580,349,blue);
  B('MMU',580,333,160,30,C.white,15);
  T('PAdrM',688,375,70,17,12);
  R([[511,431],[548,431]],C.ink,false,1.5);
  R([[560,431],[567,431],[567,318],[779,318]],C.ink,false,1.3);
  R([[779,318],[803,318],[803,360],[816,360]],C.ink,true,1.3);
  T('IEUResultM / IFResultW',585,315,181,17,12);
  R([[386,430],[386,517],[529,517],[529,503],[548,503]],blue,false,2.1);
  R([[560,503],[573,503],[573,486],[580,486]],blue,true,2.1);
  T('WriteDataM',440,497,93,17,11,false,blue);

  // Cache, uncached MMIO path and read-data selection.
  B('D-cache',580,395,83,51,C.white,17);
  B('ahbcacheinterface',580,475,160,33,known,14);
  R([[660,363],[660,375],[618,375],[618,395]],C.ink,true,1.4);
  R([[660,375],[751,375],[751,484],[740,484]],blue,true,1.7);J(660,375);
  T('MMIO',691,396,62,17,11,false,blue);
  BI([[622,446],[622,475]],C.ink,1.5);
  M(754,413,47);
  R([[663,420],[754,424]],C.ink,true,1.5);
  R([[699,475],[699,448],[754,448]],C.ink,true,1.5);
  F(791,309,208);
  T('M / W',769,281,62,21,14,true);
  W(771,437,791,437,C.ink,false,1.6);W(803,437,816,437,C.ink,true,1.6);
  T('ReadDataW',715,458,111,19,11);
  BI([[740,495],[782,495],[782,277],[797,277]],blue,2.1);

  // Writeback selector. Other result inputs are explicitly aggregated.
  M(816,349,103);T('…',819,388,13,18,12);
  T('resultmuxW',785,465,81,18,12);
  R([[833,400],[858,400],[858,534],[198,534],[198,450],[204,450]],blue,true,2.0);
  T('ResultW',769,513,88,18,12,false,blue);
  R([[347,534],[347,444],[360,444]],C.ink,true,1.2);J(347,534);
  R([[347,444],[347,394],[360,394]],C.ink,true,1.2);J(347,444);
  // Stall/flush bundle is represented, not asserted to be a single wire.
  B('hazard  (Stall / Flush)',49,543,694,23,C.white,15,C.ink,1.4);
  [183,331,554,797].forEach((x,i)=>R([[Math.min(x,737),543],[Math.min(x,737),539-i],[x,539-i],[x,i===0?522:517]],C.ink,true,0.9));

  if (!expanded) {
    T('EXT_IO',939,287,155,23,17,true,blue,'center');
    T('本研究ではここに',917,345,190,32,22,true,blue,'center');
    T('描画回路を追加',917,382,190,32,22,true,blue,'center');
    R([[951,315],[1008,315],[1008,338]],blue,true,2.7);
    T('既存のAPB接続',920,435,184,27,18,false,C.ink,'center');
    T('前の図と同じ\n番地・値の書込み',915,473,196,52,18,false,C.ink,'center');
  } else {
    T('EXT_IO',939,286,155,23,17,true,blue,'center');
    B('rasterix_apb',939,326,164,38,C.pale,18,blue,2);
    W(1008,315,1008,326,blue,true,2);
    B('命令',939,389,76,30,C.pale,16,blue,2);
    B('応答',1027,389,76,30,C.pale,16,blue,2);
    T('非同期FIFO',939,367,164,22,15,true,blue,'center');
    W(975,364,975,389,blue,true,1.7);
    W(1065,389,1065,364,blue,true,1.7);
    B('RasterIX_IF',939,437,164,40,C.pale,21,blue,2);
    W(975,419,975,437,blue,true,1.7);
    W(1065,437,1065,419,blue,true,1.7);
    B('表示回路',939,515,164,35,C.pale,19,blue,2);
    W(948,477,948,515,blue,true,1.5);
    W(1094,515,1094,477,blue,true,1.5);
    T('表示先・完了',956,482,130,27,14,false,blue,'center');
    BI([[939,454],[924,454],[924,229],[984,229],[984,222]],blue,1.8);
    R([[1034,222],[1034,230],[1110,230],[1110,533],[1103,533]],blue,true,1.7);
    R([[1021,550],[1021,565],[1102,565]],blue,true,2);
    T('HDMI OUT',939,565,165,23,17,true,blue,'center');
  }

}
