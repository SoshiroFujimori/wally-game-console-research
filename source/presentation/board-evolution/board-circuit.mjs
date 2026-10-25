// Native circuit drawings; the first CPU examples enlarge the chip view.
// Bundled links represent interfaces. They do not short independent signals.
export const BOARD = {
  board:[48,218,1184,418], chip:[67,264,960,357], cpu:[85,296,649,307],
  pc:[106,438,33,66], fetch:[168,414,145,122], rf:[398,399,165,156],
  bus:[760,395,60,184], sd:[857,308,147,56], ddr:[857,421,147,67],
  dataMemory:[857,414,147,142],
  gpu:[857,503,147,47], display:[857,566,147,35],
  card:[1051,300,162,72], memory:[1051,407,162,91], hdmi:[1051,552,162,49]
};

// Apply one uniform zoom to the existing datapath, including text and wires.
function chipView(a) {
  const k=1.2, x=v=>64+(v-67)*k, y=v=>206+(v-264)*k;
  const points=p=>p.map(([px,py])=>[x(px),y(py)]);
  return {
    ...a,
    text:(s,v,px,py,w,h,z,b,c,align)=>a.text(s,v,x(px),y(py),w*k,h*k,z*k,b,c,align),
    box:(s,v,px,py,w,h,fill,z,stroke,thick)=>a.box(s,v,x(px),y(py),w*k,h*k,fill,z*k,stroke,thick*k),
    polygon:(s,p,fill,stroke,width)=>a.polygon(s,points(p),fill,stroke,width*k),
    wire:(s,x1,y1,x2,y2,c,arrow,width)=>a.wire(s,x(x1),y(y1),x(x2),y(y2),c,arrow,width*k),
    route:(s,p,c,arrow,width)=>a.route(s,points(p),c,arrow,width*k),
  };
}

export function drawBoard(s,a,stage){
  const chipOnly=stage===3||stage===4;
  if(chipOnly)a=chipView(a);
  const {text:T,box:B,polygon:P,wire:W,route:R,C}=a;
  const blue=C.blue, gray='#9FA9B9', white=C.white;
  const load=stage===3, store=stage===4||stage===5, busFocus=stage===5;
  const sdFocus=stage===6, command=stage===7, display=stage>=8;
  const t=(v,x,y,w,h=28,z=20,b=false,c=C.ink,align='left')=>T(s,v,x,y,w,h,z,b,c,align);
  const b=(key,label='',fill=white,z=22,stroke=C.ink)=>{
    const sh=B(s,label,...BOARD[key],fill,z,stroke,2.2);sh.name='board-stable-'+key;return sh;
  };
  const r=(p,c=C.ink,arrow=true,w=2.5)=>R(s,p,c,arrow,w);
  const wire=(x1,y1,x2,y2,c=C.ink,arrow=true,w=2.5)=>W(s,x1,y1,x2,y2,c,arrow,w);
  const bi=(p,c=C.ink,w=2.5)=>{r(p,c,true,w);r([p[1],p[0]],c,true,w);};
  const poly=(p,fill=white,stroke=C.ink,width=2.2)=>P(s,p,fill,stroke,width);

  if(!chipOnly){
    b('board','',C.pale);
    t('FPGAボード / Nexys Video',62,224,680,31,24,true);
    t('チップ外の部品',1045,259,176,31,20,true,C.ink,'center');
  }
  b('chip','',C.chip,22,blue);
  t('FPGAチップ',80,266,250,29,23,true,blue);
  const internalMemory = stage <= 4;
  const sdColor=sdFocus?blue:gray;
  const memoryColor=internalMemory?gray:blue;
  const gpuColor=command||display?blue:gray;
  const displayColor=display?blue:gray;

  // Show external parts only when the explanation returns to the whole board.
  if(!chipOnly){
  b('card','SDカード\nスロット',white,22,sdColor);
  b('memory','',white,22,memoryColor);
  if(internalMemory)t('DDR3\nメモリ',1060,420,144,65,24,true,memoryColor,'center');
  else{
    t('DDR3',1060,412,144,30,25,true,memoryColor,'center');
    t(load?'8番地：3':store?'12番地：3':display?'命令・画像':'命令・データ',1058,449,148,40,19,true,memoryColor,'center');
  }
  b('hdmi','HDMI OUT',white,21,displayColor);
  }

  if(internalMemory){
    b('dataMemory');
    t('データメモリ',835,374,190,33,25,true,C.ink,'center');
    t('A',864,452,25,24,16);
    t('WD',864,515,35,24,16);
    t('RD',968,498,30,24,16);
    t(load?'8番地':'12番地',897,434,99,29,21,true,blue,'center');
    t('3',914,469,51,38,29,true,blue,'center');
  }else{
    // The shared bus and vendor memory IP first appear in the bus explanation.
    b('bus','',busFocus?C.pale:white,22,busFocus?blue:gray);
    t('バス',765,442,50,50,20,true,busFocus?blue:gray,'center');
    b('ddr','DDR\nコントローラー',busFocus?C.pale:white,18.5,memoryColor);
    t('AMD提供（MIG）',838,385,188,30,21,true,blue,'center');
    bi([[1004,455],[1051,455]],memoryColor);
    wire(832,stage>=6?336:453,832,stage>=7?526:479,gray,false,2.2);
    bi([[820,479],[832,479]],busFocus||command?blue:gray);
    bi([[832,453],[857,453]],memoryColor);
    if(stage>=6){
      b('sd','SD制御',sdFocus?C.pale:white,23,sdColor);
      bi([[1004,336],[1051,336]],sdColor);
      bi([[832,336],[857,336]],sdColor);
      if(sdFocus)r([[820,479],[832,479],[832,336],[857,336]],blue,true,3);
    }
    if(stage>=7){
      b('gpu','RasterIX',command?C.pale:white,21,gpuColor);
      wire(832,526,857,526,gpuColor);
      if(command)r([[820,479],[832,479],[832,526],[857,526]],blue,true,3);
    }
    if(display){
      b('display','表示回路',C.pale,19,displayColor);
      wire(1004,578,1051,578,displayColor);
    }
  }

  const head=load?'命令の32ビット':'命令から取り出す内容';
  t(head,356,298,374,24,17,true,C.ink);
  const fields=load?
    [['[31:20]','000000001000',132],['[19:15]','00000',62],['[14:12]','010',46],['[11:7]','00001',62],['[6:0]','0000011',62]]:
    [['即値',command?'0':store?'12':'数値',132],['A1',command?'2':store?'0':'番号',62],['A2',command||store?'1':'番号',108],['操作',command||store?'sw':'lw/sw',62]];
  let fx=359;
  for(const[label,value,width]of fields){
    B(s,'',fx,341,width,28,white,16,C.ink,1.1);
    t(label,fx,320,width,21,load?12.5:16,false,gray,'center');
    t(value,fx,341,width,28,load?14.5:17,false,C.ink,'center');
    fx+=width;
  }

  // Keep PC and instruction-read coordinates fixed when replacing local memory.
  b('pc');t('D Q',110,457,26,24,13,false,C.ink,'center');
  poly([[113,438],[122,448],[131,438]],'none');wire(122,423,122,438,C.ink,false,1.2);
  t('clk',102,399,45,23,16);t('PC',100,507,52,29,23,true,C.ink,'center');
  wire(139,468,168,468,blue);
  t(load?'0':store?'4':'番地',140,477,30,28,load||store?22:14,true,blue,'center');
  b('fetch');t(internalMemory?'命令メモリ':'命令読出し',174,418,133,29,22,true,C.ink,'center');
  t('A',175,456,25,24,16);t('RD',281,456,30,24,16);
  t(load?'0：lw x1,8(x0)':store?'4：sw x1,12(x0)':'DDR3から\n命令を読む',182,485,116,47,load||store?14:18,true,load||store?blue:C.ink,'center');
  r([[313,468],[336,468],[336,355],[359,355]],C.ink,true,2.3);

  if(stage>=4){
    poly([[183,357],[227,368],[227,390],[183,401],[183,388],[193,379],[183,367]]);
    t('+',199,365,25,28,25,true,C.ink,'center');
    r([[149,468],[149,368],[183,368]],C.ink);
    t('4',158,382,20,23,19);wire(178,389,183,389,C.ink);
    r([[227,379],[247,379],[247,346],[96,346],[96,468],[106,468]],C.ink);
    t('PC + 4',98,348,80,24,18,true,store?blue:C.ink);
  }

  // The field extraction and unused datapath inputs are intentionally reduced.
  r([[522,369],[522,383],[380,383],[380,442],[398,442]],blue,true,2.1);
  r([[425,369],[425,376],[606,376],[606,508],[629,508]],blue,true,2.3);
  if(load){
    r([[631,369],[631,392],[365,392],[365,515],[398,515]],blue,true,2.1);
    wire(381,484,398,484,gray,true,1.5);
  }else{
    r([[608,369],[608,388],[372,388],[372,484],[398,484]],command||store?blue:gray,true,2.1);
    wire(381,515,398,515,store||command?gray:C.ink,true,1.5);
  }
  b('rf');
  poly([[439,399],[447,408],[455,399]],'none');wire(447,392,447,399,C.ink,false,1.2);
  t('レジスタ\n群',440,451,80,56,19,true,C.ink,'center');
  [['A1',404,427],['A2',404,471],['A3',404,501],['WD3',404,531],['RD1',523,427],['RD2',523,471]].forEach(([v,x,y])=>t(v,x,y,35,22,14,false,(load&&['A2','RD2'].includes(v))||((store||command)&&['A3','WD3'].includes(v))?gray:C.ink));
  t('WE3',521,401,37,22,14,false,store||command?gray:blue);
  wire(563,442,629,442,C.ink,true,2.7);
  t(load||store?'0':command?'B':'値',572,409,28,28,load||store||command?23:20,true,blue,'center');
  poly([[629,427],[697,445],[697,505],[629,525],[629,487],[647,475],[629,454]],white,C.ink,2.3).name='board-stable-alu';
  t('ALU',638,397,60,27,24,true,C.ink,'center');t('+',657,456,33,38,30,false,C.ink,'center');
  t(load?'即値 8':store?'即値 12':command?'即値 0':'即値',592,527,115,28,21,true,blue,'center');

  const addrColor=load||store||command||sdFocus?blue:C.ink;
  wire(697,464,internalMemory?857:760,464,addrColor,true,2.8);
  t(load?'8':store?'12':command?'B':'番地',702,431,51,28,load||store||command?23:19,true,blue,'center');
  const writeTurn=internalMemory?829:746, target=internalMemory?857:760;
  r([[563,484],[575,484],[575,565],[writeTurn,565],[writeTurn,527],[target,527]],load?gray:blue,true,2.7);
  t(store?'3':command?'D':load?'':'値',579,500,24,27,20,true,blue,'center');
  const readRoute=internalMemory?[[1004,512],[1015,512],[1015,610],[380,610],[380,541],[398,541]]:[[760,558],[749,558],[749,610],[380,610],[380,541],[398,541]];
  r(readRoute,store||command?gray:blue,true,2.7);
  if(load)t('3',351,538,24,26,21,true,blue,'center');

  // The local instruction memory has no bus routes.
  if(!internalMemory){
  r([[213,536],[213,580],[752,580],[752,408],[760,408]],busFocus?blue:gray,true,2.1);
  r([[760,428],[740,428],[740,594],[300,594],[300,536]],busFocus?blue:gray,true,2.1);
  if(busFocus){
    t('命令',765,402,50,27,16,true,blue,'center');
    t('データ',764,498,52,27,16,true,blue,'center');
  }
  }

  // Graphics and scanout access shared memory through the DDR controller.
  if(display){
    r([[1004,521],[1011,521],[1011,478],[1004,478]],blue,true,2.8);
    r([[1004,485],[1020,485],[1020,584],[1004,584]],blue,true,2.8);
    t('画素を保存',863,487,130,18,14,true,blue,'center');
    t('画素を読む',863,548,130,18,14,true,blue,'center');
  }
}


// Board overview: a native gate sits directly inside the chip boundary.
// Its HDL describes the gate example, not the peripheral control circuits.
export function drawImplementationFlow(s,a){
  const {text:T,box:B,polygon:P,wire:W,route:R,C}=a;
  const t=(v,x,y,w,h=30,z=23,b=false,c=C.ink,align='left')=>T(s,v,x,y,w,h,z,b,c,align);
  const box=(name,x,y,w,h,fill=C.white,stroke=C.ink)=>{
    const sh=B(s,'',x,y,w,h,fill,23,stroke,2.2);sh.name='implementation-'+name;return sh;
  };

  t('FPGAボード：Nexys Video',64,218,525,36,27,true,C.heading);
  // The photograph is inserted before this function so these marks stay visible.
  box('photo-fpga',232,390,64,72,'none',C.blue);
  R(s,[[296,426],[555,426],[555,327],[646,327]],C.blue,true,2.6);
  t('黒い放熱器の下に\nFPGAがある',435,444,187,63,23,true,C.blue);

  box('board',630,228,586,255,C.pale);
  t('チップと周囲の部品',646,236,550,31,23,true);
  box('chip',646,278,370,186,C.chip,C.blue);
  t('FPGAチップ',659,284,238,32,25,true,C.blue);
  const gate=[[736,338],[769,338]];
  for(let i=1;i<=16;i++){
    const theta=-Math.PI/2+i*Math.PI/16;
    gate.push([769+39*Math.cos(theta),377+39*Math.sin(theta)]);
  }
  gate.push([736,416]);
  P(s,gate,C.white,C.ink,2.2).name='implementation-and-gate';
  W(s,695,358,736,358,C.ink,false,2.4);
  W(s,695,396,736,396,C.ink,false,2.4);
  W(s,808,377,941,377,C.ink,true,2.4);
  t('a',671,341,28,30,25,true);t('b',671,381,28,30,25,true);
  t('y',948,360,28,30,25,true);
  t('AND回路の例',697,424,262,30,23,true,C.ink,'center');
  for(const [name,label,y]of[['card','SDスロット',287],['memory','DDR3メモリ',350],['hdmi','HDMI OUT',413]]){
    box(name,1041,y,157,47);
    t(label,1047,y+6,145,35,21,true,C.ink,'center');
    W(s,1016,y+23.5,1041,y+23.5,C.ink,false,2.3);
  }

  t('この回路はコードで記述できる',646,490,562,31,25,true,C.heading);
  box('hdl',646,526,562,107,'#F5F7FB');
  const code=['module example(input logic a, b,', '               output logic y);', '  assign y = a & b;', 'endmodule'];
  code.forEach((line,i)=>{
    const sh=t(line,661,534+i*23,532,23,20,false,i===2?C.blue:C.ink);
    sh.name='implementation-code-'+i;
    sh.text.style={typeface:'Consolas',fontSize:20,bold:false,color:i===2?C.blue:C.ink,alignment:'left',verticalAlignment:'middle',wrap:'none'};
  });
}
