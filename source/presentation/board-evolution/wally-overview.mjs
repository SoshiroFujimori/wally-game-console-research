// Editable expansion of the RVSOC Figure 7.11 pipeline layout.
// Preserve stage-register, operand-selection and writeback geometry; replace
// the introductory IROM/DTIM blocks with the configured memory interfaces.
// Coordinates describe functional connections, not placement on the FPGA.
export function drawWallyOverview(s, api) {
  const expanded=true;
  const { text, box, polygon, route, wire, C } = api;
  const ox=64, oy=123, k=1.0, kx=1.03, ky=0.94;
  const X=x=>ox+kx*x, Y=y=>oy+ky*y;
  const T=(v,x,y,w,h=22,z=16,b=false,c=C.ink,a='left')=>{
    // Preserve the intended center while fitting native font line metrics.
    z=Math.max(z,10);
    const height=Math.max(h*ky,v.split('\n').length*z*k*1.2+0.4);
    return text(s,v,X(x),Y(y)+(h*ky-height)/2,w*kx,height,z*k,b,c,a);
  };
  const B=(v,x,y,w,h,fill=C.white,z=16,stroke=C.ink,thick=1.5)=>{
    const shape=box(s,'',X(x),Y(y),w*kx,h*ky,fill,z*k,stroke,thick*k);
    if(v)T(v,x+3,y+1,w-6,h-2,z,true,stroke,'center');
    return shape;
  };
  const W=(x1,y1,x2,y2,c=C.ink,arrow=true,w=1.8)=>{
    if(x1===x2&&y1===y2)return;
    wire(s,X(x1),Y(y1),X(x2),Y(y2),c,arrow,w*k);
  };
  const R=(pts,c=C.ink,arrow=true,w=1.8)=>route(s,pts.map(([x,y])=>[X(x),Y(y)]),c,arrow,w*k);
  const P=(pts,fill=C.white,stroke=C.ink,width=1.5)=>polygon(s,pts.map(([x,y])=>[X(x),Y(y)]),fill,stroke,width*k);
  const J=(x,y,c=C.ink)=>api.junction(s,X(x),Y(y),c,4*k);
  const blue=C.ink, known=C.white;
  const M=(x,y,h=44,fill=C.white,inputs=2,ports=null)=>{
    P([[x,y],[x+17,y+6],[x+17,y+h-6],[x,y+h]],fill);
    const centers=ports||Array.from({length:inputs},(_,i)=>10+i*(h-20)/(inputs-1));
    const size=inputs===3||h<40?8.5:10;
    centers.forEach((v,i)=>T(String(i),x+2,y+v-6,11,12,size));
  };
  const F=(x,y,h=42,c=C.ink)=>{B('',x,y,12,h,C.white,16,c);P([[x+2,y],[x+6,y+5],[x+10,y]],'none',c);W(x+6,y-6,x+6,y,c,false,0.8);};
  const BI=(pts,c=C.ink,w=2)=>R(pts,c,'both',w);

  // The abstract-based talk does not introduce pipeline internals. Keep the
  // reference diagram's signal outlines neutral rather than marking them taught.
  // Vendor-IP fill and pale hierarchy backgrounds have independent meanings.
  T('CPU内部を含む主要回路の接続',0,0,405,23,16,false,blue);
  T('●：接続　隙間のある交差：非接続',410,0,380,23,14,false,C.ink);
  T('濃い塗り：AMD製IP　[R]：RasterIXリポジトリ由来',0,24,780,23,14,false,C.ink);

  // Board components outside the programmable chip.
  B('DDR3メモリ',800,0,144,36,C.white,19,blue);
  B('SD card',970,0,135,36,C.white,19,blue);
  B('',0,51,1140,544,C.chip,18,C.ink,2.2);
  T('FPGA / fpgaTop',15,55,355,29,24,true);
  T('Artix-7',703,55,125,27,20,true);

  // Preserve the HDL hierarchy: RasterIX and memory IP are outside the SoC.
  B('',15,91,875,481,C.white,15,C.ink,1.8);
  T('Wallyリポジトリ：wallypipelinedsoc',30,94,350,25,17,true);
  B('',28,124,847,110,C.pale,16,C.ink,1.6);
  T('uncore',38,128,95,23,18,true);
  // HADDR fans out to the decoder and AHB endpoints. Decoding produces
  // selects; no read/write data passes through adrdecs (RVSOC Fig. 9.28).
  B('アドレス判定\nadrdecs',152,141,114,34,known,13,blue);
  B('Boot ROM\nrom_ahb',340,141,90,34,C.white,13);
  B('RAM\nram_ahb',443,141,90,34,C.white,13);
  B('ahbapbbridge',546,141,140,34,C.white,13);
  R([[130,190],[880,190],[902,190],[902,106],[922,106]],blue,true,2.1);
  T('HADDR / HWDATA\n制御',35,185,95,27,9.5,false,blue);
  R([[130,190],[130,158],[152,158]],blue,true,1.5);J(130,190,blue);
  T('HADDR / HSIZE',35,165,95,13,10,false,blue);
  for(const x of [355,458,561]){W(x,190,x,175,blue,true,1.3);J(x,190,blue);}
  // Distinct HSEL bits go to ROM, RAM, the APB bridge and external memory.
  R([[266,158],[282,158],[282,132],[616,132]],blue,false,1.5);
  for(const x of [385,488,616]){W(x,132,x,141,blue,true,1.2);J(x,132,blue);}
  T('HSEL：接続先ごとに別の選択信号',389,103,314,15,10.5,false,blue);
  R([[282,132],[282,120],[910,120],[910,95],[922,95]],blue,true,1.3);J(282,132,blue);
  T('HSELEXT',838,103,77,14,10.5,false,blue);

  // Data-phase selection and the return mux live in uncore. HRDATA goes
  // directly to IFU/LSU; only status/ready is consumed by EBU.
  F(300,148,20);
  W(282,158,300,158,C.ink,true,1.0);J(282,158);
  R([[312,158],[325,158],[325,199],[342,199]],C.ink,true,1.0);
  R([[342,199],[355,199],[355,205]],C.ink,false,1.0);
  T('選択保持',270,169,61,13,9.5);
  T('HSEL…D',272,203,55,11,9);
  B('応答選択  (HRDATA / HREADY / HRESP)',340,205,345,22,C.white,12);
  for(const x of [414,517,669])W(x,175,x,205,C.ink,true,1.0);
  R([[922,114],[895,114],[895,174],[704,174],[704,216],[685,216]],C.ink,true,1.2);
  R([[340,216],[160,216]],blue,true,1.6);
  T('HRDATA → IFU / LSU',139,218,177,13,10.5,false,blue);
  R([[650,227],[650,231],[828,231],[828,248]],C.ink,true,1.2);

  // APB responses are selected inside ahbapbbridge. SDC is a second
  // spi_apb instance, not the unrelated spi instance tied off at fpgaTop.
  B('SDカード制御\nsdc / spi_apb',750,136,108,33,known,12.5,blue);
  B('UART / GPIO / SPI\nCLINT / PLIC / PWM',750,198,108,27,C.white,10);
  W(686,158,720,158,blue,'start',1.5);J(720,158,blue);
  W(720,152,720,207,blue,false,1.5);
  W(720,152,750,152,blue,true,1.3);
  W(720,207,750,207,C.ink,true,1.1);
  T('APB',690,138,28,14,10.5,true);
  BI([[825,136],[825,80],[1038,80],[1038,36]],blue,1.6);
  T('SPI',838,63,42,14,10.5);
  R([[720,182],[883,182],[883,315],[1008,315],[1008,326]],blue,true,1.8);J(720,182,blue);

  B('ahbaxibridge',922,89,181,30,C.ip,16);
  B('clkconverter',922,138,181,30,C.ip,16);
  B(expanded?'SmartConnect':'AXI connection',922,188,181,30,C.ip,15);
  B('',922,238,181,34,C.ip,14,blue,2.2);
  T('DDRメモリ制御\nMIG（AMD製IP）',925,239,175,32,13,true,C.ink,'center');
  BI([[1012,119],[1012,138]],blue);
  BI([[1012,168],[1012,188]],blue);
  BI([[1012,218],[1012,238]],blue);
  BI([[1103,255],[1128,255],[1128,60],[872,60],[872,36]],blue);

  // CPU blocks follow the source units. Functional routes remain readable
  // without showing every prediction, exception, or arithmetic extension.
  B('',28,240,847,328,C.white,16,C.ink,1.6);
  T('CPU Wally / wallypipelinedcore',38,241,310,24,18,true);
  T('20 MHz',370,243,110,22,17);
  T('整数系の主な経路',489,245,180,19,12);
  B('ebu',755,248,104,29,C.white,17);
  R([[786,248],[786,238],[130,238],[130,190]],blue,false,2.1);
  T('AHB',710,246,42,17,12.5);

  // Light, borderless unit backgrounds match the book's pipeline diagram.
  B('',39,277,136,246,C.pale,14,'none',0);
  B('',184,277,350,246,C.pale,14,'none',0);
  B('',551,277,238,246,C.pale,14,'none',0);
  B('',800,277,64,246,C.pale,14,'none',0);
  T('ifu',44,278,90,20,17,true);
  T('ieu',194,278,95,20,17,true);
  T('lsu',602,278,90,20,17,true);

  // IFU: source names are grouped for MMU/cache/next-PC logic.
  F(77,365,43,blue);T('PC',53,344,25,18,13,true,blue);
  B('MMU',118,328,49,29,C.white,16);
  B('I-cache',111,375,57,40,C.white,14);
  B('bus I/F',112,445,54,27,C.white,12);
  R([[89,386],[104,386],[104,343],[118,343]],blue);
  W(139,357,139,375,blue);
  BI([[139,415],[139,445]],blue,1.6);
  R([[166,458],[171,458],[171,450]],blue,false,1.3);
  W(171,440,171,450,blue,true,1.3);
  R([[171,440],[171,269],[755,269]],blue,true,1.3);
  T('HRDATA',55,448,53,14,10,false,blue);W(99,463,112,463,blue,true,1.1);
  // PC increment and next-PC selection stay above/left of the PC as in 7.11.
  B('',48,308,54,27,C.white,14);
  T('+2 /',50,309,27,25,14,true);
  T('+4',77,309,23,25,14,true,blue);
  R([[96,386],[96,347],[75,347],[75,335]],blue,true,1.2);
  J(96,386,blue);
  M(45,365,43);
  R([[48,322],[36,322],[36,376],[45,376]],blue,true,1.3);
  W(62,386,77,386,blue,true,1.3);
  T('Next PC',40,415,69,20,13);
  // Branch target comes from the address sum, not the comparator flags.
  R([[530,349],[530,301],[30,301],[30,399],[45,399]],C.ink,true,1.0);
  F(177,364,158);
  T('Fetch',49,575,113,16,12,true,C.ink,'center');
  T('Decode',204,575,102,16,12,true,C.ink,'center');
  T('Execute',345,575,185,16,12,true,C.ink,'center');
  T('Memory',576,575,174,16,12,true,C.ink,'center');
  T('Writeback',777,575,88,16,12,true,C.ink,'center');
  R([[168,395],[177,395]],blue,false,1.6);
  R([[189,395],[194,395],[194,386],[204,386]],blue,true,1.4);
  R([[194,395],[194,406],[204,406]],blue,true,1.4);J(194,395,blue);
  R([[194,406],[194,490],[204,490]],blue,true,1.4);J(194,406,blue);
  R([[194,386],[194,325],[205,325]],C.ink,true,1.1);J(194,386);

  // Representative control paths cross the pipeline register boundaries.
  B('controller',205,310,101,34,C.white,16);
  T('FlagsE',245,347,43,13,9.5);W(293,359,293,344,C.ink,true,1.0);
  T('ResultSrcW',365,283,120,18,12);
  R([[306,318],[325,318]],C.ink,false,1.0);
  R([[337,318],[548,318]],C.ink,false,1.0);
  R([[560,318],[791,318]],C.ink,false,1.0);
  R([[803,318],[828,318],[828,349]],C.ink,true,1.0);
  R([[306,329],[325,329]],C.ink,false,1.0);
  R([[337,329],[392,329],[392,351],[414,351],[414,359]],C.ink,true,1.0);
  R([[306,339],[325,339]],C.ink,false,1.0);
  R([[337,339],[342,339],[342,480],[414,480],[414,468]],C.ink,true,1.0);

  // Previously explained datapath functions use blue outlines, not the
  // dark fill reserved for AMD IP.
  B('',204,365,102,102,known,14,blue);
  T('regfile',219,392,80,17,13.5,true,C.ink,'center');
  T('A1',207,374,27,17,13);T('A2',207,411,27,17,13);
  T('A3',207,430,27,16,13);T('WD3',207,448,41,17,12);
  T('RD1',271,374,34,17,13);T('RD2',271,411,34,17,13);
  T('WE3',234,366,37,14,11);
  P([[296,365],[300,370],[304,365]],'none');
  // regfile writes on the falling edge; the pipeline registers use rising edges.
  s.shapes.add({geometry:'ellipse',position:{left:X(300)-2*k,top:Y(362)-2*k,width:4*k,height:4*k},fill:C.white,line:{fill:C.ink,width:0.8}});
  W(300,356,300,360,C.ink,false,0.8);
  P([[204,488],[306,477],[306,506],[204,506]],C.white,C.ink);
  T('extend',232,484,72,19,14,true);
  F(325,310,207);
  T('D / E',305,281,57,21,14,true);
  W(306,384,325,384,blue,false);W(306,419,325,419,blue,false);W(306,495,325,495,blue,false);
  // The forwarding selectors are mux3: register, ResultW, IFResultM.
  M(356,360,44,C.white,3);M(356,411,47,C.white,3,[8,23,37]);M(405,359,48);M(405,421,47);
  R([[337,384],[356,370]],blue);
  W(337,419,356,419,blue);
  R([[373,382],[393,382],[393,372],[405,372]],blue);
  R([[373,434],[394,434],[394,430],[405,430]],blue);
  R([[337,495],[391,495],[391,454],[405,454]],blue);
  W(384,395,405,395,C.ink,true,1.2);
  T('PCE',383,400,22,12,9);
  // A representative branch comparator and its two operand connections.
  B('comp',448,326,66,27,C.white,13);
  R([[378,382],[378,335],[448,335]],C.ink,true,1);J(378,382);
  R([[386,434],[386,345],[448,345]],C.ink,true,1);J(386,434);
  T('FlagsE',472,304,67,11,9);
  W(481,326,481,322,C.ink,false,0.8);
  P([[449,375],[511,391],[511,441],[449,456],[449,429],[466,416],[449,403]],known,blue);
  T('ALU',465,397,46,30,17.5,true,C.ink,'center');
  W(422,383,449,390,blue);
  R([[422,444],[435,444],[435,440],[449,440]],blue);
  T('SrcAE',423,357,65,20,13);T('SrcBE',423,458,65,20,13);

  // Address and integer-result ports are separate in datapath.sv.
  F(548,309,208);
  T('E / M',529,281,57,21,14,true);
  R([[511,398],[530,398],[530,349],[548,349]],blue);
  J(530,349,blue);
  T('IEUAdrE',481,355,63,16,11,false,blue);
  W(560,349,580,349,blue);
  B('MMU',580,333,160,30,C.white,15);
  T('PAdrM',688,375,70,17,12);
  // The Execute selector groups altresultmux/ieuresultmux; resultmuxM
  // separately selects the FPU integer result in the Memory stage.
  // Keep the result data separate from the ResultSrcW control at y=318.
  B('結果\n選択',518,416,27,33,C.white,9.5);
  W(511,431,518,431,C.ink,false,1.1);
  T('他',519,452,18,12,9);W(540,462,540,449,C.ink,true,1.0);
  W(545,431,548,431,C.ink,false,1.1);
  R([[560,431],[567,431],[567,326],[744,326],[744,338],[756,338]],C.ink,true,1.3);
  M(756,324,38,C.white,2,[14,29]);
  T('FIntResM',739,363,62,11,9);
  W(747,353,756,353,C.ink,true,1.0);
  R([[773,343],[786,343],[786,326],[791,326]],C.ink,false,1.3);
  R([[803,326],[809,326],[809,354]],C.ink,true,1.3);
  R([[809,354],[809,360],[816,360]],C.ink,false,1.3);
  T('IEUResultM / IFResultW',580,301,180,12,9.5);
  R([[386,434],[386,517],[529,517],[529,503],[548,503]],blue,false,2.1);
  J(386,434,blue);
  R([[560,503],[570,503],[570,486],[580,486]],blue,true,2.1);
  // A cached store writes the cache as well; the uncached path goes to I/F.
  R([[570,486],[570,436],[580,436]],blue,true,1.6);J(570,486,blue);
  T('WriteDataM',440,497,93,17,11,false,blue);

  // Cache, uncached MMIO path and read-data selection.
  B('D-cache',580,395,83,51,C.white,17);
  B('ahbcacheinterface',580,475,160,33,C.white,14);
  R([[660,363],[660,375],[618,375],[618,395]],blue,true,1.4);
  R([[660,375],[751,375],[751,484],[740,484]],blue,true,1.7);J(660,375);
  T('MMIO',691,396,62,17,11,false,blue);
  BI([[622,446],[622,475]],blue,1.5);
  M(754,413,47);
  R([[663,420],[754,424]],blue,true,1.5);
  R([[699,475],[699,448],[754,448]],blue,true,1.5);
  F(791,309,208);
  T('M / W',792,281,65,21,14,true);
  W(771,437,791,437,blue,false,1.6);W(803,437,816,437,blue,true,1.6);
  T('ReadDataW',635,453,80,14,11,false,blue);
  BI([[740,495],[778,495],[778,277],[797,277]],blue,2.1);
  T('HRDATA',671,510,68,13,10,false,blue);W(716,527,716,508,blue,true,1.1);

  // Writeback selector. Other result inputs are explicitly aggregated.
  M(816,349,103,C.white,2,[11,88]);T('…',817,388,15,18,11);
  T('resultmuxW',805,457,55,14,9.5);
  R([[833,400],[858,400],[858,534],[201,534],[201,470]],blue,true,2.0);
  R([[201,470],[201,450],[204,450]],blue,false,2.0);
  T('ResultW',810,516,48,13,11,false,blue);
  R([[347,534],[347,434],[356,434]],C.ink,true,1.2);J(347,534);
  R([[347,434],[347,382],[356,382]],C.ink,true,1.2);J(347,434);
  R([[786,343],[786,525],[354,525],[354,458]],C.ink,true,1.1);
  R([[354,458],[354,448],[356,448]],C.ink,false,1.1);J(786,343);
  R([[354,448],[354,404]],C.ink,true,1.1);
  R([[354,404],[354,394],[356,394]],C.ink,false,1.1);J(354,448);
  // Stall/flush bundle is represented, not asserted to be a single wire.
  B('hazard  (Stall / Flush)',49,543,694,23,C.white,15,C.ink,1.4);
  [183,331,554,797].forEach((x,i)=>R([[Math.min(x,737),543],[Math.min(x,737),540],[x,540],[x,i===0?522:517]],C.ink,true,0.9));

  if (!expanded) {
    T('EXT_IO',939,287,155,23,17,true,blue,'center');
    T('本研究ではここに',917,345,190,32,22,true,blue,'center');
    T('描画回路を追加',917,382,190,32,22,true,blue,'center');
    R([[951,315],[1008,315],[1008,338]],blue,true,2.7);
    T('既存のAPB接続',920,435,184,27,18,false,C.ink,'center');
    T('前の図と同じ\n番地・値の書込み',915,473,196,52,18,false,C.ink,'center');
  } else {
    T('EXT_IO (APB)',939,286,155,23,15,true,C.ink,'center');
    B('描画接続回路',939,326,164,38,C.white,18,blue,2);
    B('命令',939,389,76,30,C.ip,16,C.ink,2);
    B('応答',1027,389,76,30,C.ip,16,C.ink,2);
    T('非同期FIFO',983,368,77,19,13.5,true,C.ink,'center');
    W(975,364,975,389,blue,true,1.7);
    W(1065,389,1065,364,C.ink,true,1.7);
    B('描画回路 [R]',949,437,154,40,C.white,19,blue,2);
    W(975,419,975,437,blue,true,1.7);
    W(1065,437,1065,419,C.ink,true,1.7);
    B('表示回路 [R]',939,515,164,35,C.white,18,blue,2);
    W(958,477,958,515,C.ink,true,1.5);
    W(1094,515,1094,477,C.ink,true,1.5);
    T('表示先・完了',956,482,130,27,14,false,C.ink,'center');
    B('AXI\nFIFO',905,429,31,47,C.ip,9.5);
    BI([[949,454],[936,454]],blue,1.4);
    R([[905,454],[899,454],[899,446]],blue,false,1.6);
    W(899,436,899,446,blue,true,1.6);
    R([[899,436],[899,232],[984,232],[984,218]],blue,true,1.6);
    // Display sends read requests and receives pixels on separate AXI channels.
    BI([[1034,218],[1034,229],[1116,229],[1116,533],[1103,533]],blue,1.7);
    R([[1021,550],[1021,565],[1102,565]],blue,true,2);
    T('HDMI OUT',939,565,165,23,17,true,blue,'center');
  }

}
