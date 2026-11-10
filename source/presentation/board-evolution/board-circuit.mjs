// Native circuit drawings; the first CPU examples enlarge the chip view.
// Bundled links represent interfaces. They do not short independent signals.
export const BOARD = {
  board:[48,218,1184,418], chip:[67,264,974,357], cpu:[85,296,649,307],
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
    junction:(s,px,py,c,d)=>a.junction(s,x(px),y(py),c,d*k),
  };
}

export function drawBoard(s,a,stage,{ports=false,combined=false}={}){
  const chipOnly=stage===3||stage===4||ports;
  if(chipOnly)a=chipView(a);
  const {text:T,box:B,polygon:P,wire:W,route:R,C}=a;
  const blue=C.blue, gray='#9FA9B9', white=C.white;
  const load=stage===3, store=stage===4||stage===5, busFocus=stage===5;
  const sdFocus=stage===6, command=stage===7, display=stage>=8&&!ports;
  const t=(v,x,y,w,h=28,z=20,b=false,c=C.ink,align='left')=>T(s,v,x,y,w,h,z,b,c,align);
  const b=(key,label='',fill=white,z=22,stroke=C.ink)=>{
    const sh=B(s,label,...BOARD[key],fill,z,stroke,2.2);sh.name='board-stable-'+key;return sh;
  };
  const r=(p,c=C.ink,arrow=true,w=2.5)=>R(s,p,c,arrow,w);
  const wire=(x1,y1,x2,y2,c=C.ink,arrow=true,w=2.5)=>W(s,x1,y1,x2,y2,c,arrow,w);
  const bi=(p,c=C.ink,w=2.5)=>r(p,c,'both',w);
  const dot=(x,y,c=C.ink)=>a.junction(s,x,y,c,4.8);
  const poly=(p,fill=white,stroke=C.ink,width=2.2)=>P(s,p,fill,stroke,width);

  if(!chipOnly){
    // Repositories are acquisition sources, not a claim of sole authorship.
    const wally = stage >= 6 ? 'CPU・バス・SDカード制御・DDR接続' : 'CPU・バス・DDR接続';
    t('Wallyリポジトリ：' + wally,64,181,690,29,20,true);
    if(stage>=7)t('RasterIXリポジトリ：' + (display?'描画・表示':'描画'),765,181,451,29,20,true);
    b('board','',C.pale);
    t('FPGAボード / Nexys Video',62,224,680,31,24,true);
    t('チップ外の部品',1045,259,176,31,20,true,C.ink,'center');
  }
  b('chip','',C.chip,22,blue);
  t(combined?'CPUの読書き（機能図）':'FPGAチップ',80,266,combined?540:250,29,23,true,blue);
  if(!combined)t('●：接続　隙間のある交差：非接続',350,268,650,25,16,false,C.ink);
  const internalMemory = stage <= 4 || ports;
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
    if(ports){
      t('外部への',898,443,98,25,17,true,blue,'center');
      t('接続口 D',897,469,99,28,19,true,blue,'center');
      t('WE',968,415,33,22,14,true,blue);
    }else{
      t(load?'8番地':'12番地',897,434,99,29,21,true,blue,'center');
      t('3',914,469,51,38,29,true,blue,'center');
    }
  }else{
    // The shared bus and vendor memory IP first appear in the bus explanation.
    b('bus','',busFocus?C.pale:white,22,busFocus?blue:gray);
    t('バス',765,442,50,50,20,true,busFocus?blue:gray,'center');
    b('ddr','',C.ip,18.5,C.ink);
    t('DDR\nコントローラー',861,426,139,57,18.5,true,C.ink,'center');
    t('AMD提供（MIG）',838,385,188,30,21,true,blue,'center');
    bi([[1004,455],[1051,455]],memoryColor);
    // Only component ports receive arrowheads; the trunk has explicit junctions.
    const trunk=838;
    if(stage>=6)wire(trunk,336,trunk,453,sdFocus?blue:gray,false,2.2);
    wire(trunk,453,trunk,479,busFocus||sdFocus?blue:gray,false,2.2);
    if(stage>=7)wire(trunk,479,trunk,526,command?blue:gray,false,2.2);
    wire(820,479,trunk,479,busFocus||sdFocus||command?blue:gray,'start');
    wire(trunk,453,857,453,memoryColor);
    if(stage>=6)dot(trunk,453,memoryColor);
    if(stage>=7)dot(trunk,479,command?blue:gray);
    if(stage>=6){
      b('sd','SDカード制御',sdFocus?C.pale:white,23,sdColor);
      bi([[1004,336],[1051,336]],sdColor);
      wire(trunk,336,857,336,sdColor);
    }
    if(stage>=7){
      b('gpu','描画回路',command?C.pale:white,21,gpuColor);
      wire(trunk,526,857,526,gpuColor);
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
    t(label,fx,320,width,21,load?12.5:16,false,C.ink,'center');
    t(value,fx,341,width,28,load?14.5:17,false,C.ink,'center');
    fx+=width;
  }

  // Keep PC and instruction-read coordinates fixed when replacing local memory.
  b('pc');t('D Q',110,457,26,24,13,false,C.ink,'center');
  poly([[113,438],[122,448],[131,438]],'none');wire(122,423,122,438,C.ink,false,1.2);
  t('clk',102,399,45,23,16);t('PC',100,507,52,29,23,true,C.ink,'center');
  wire(139,468,168,468,blue);
  t(load?'0':store?'4':'番地',137,477,36,28,load||store?22:14,true,blue,'center');
  b('fetch');t(internalMemory?'命令メモリ':'命令読出し',174,418,133,29,22,true,C.ink,'center');
  t('A',175,456,25,24,16);t('RD',281,456,30,24,16);
  t(ports?'外部への\n接続口 I':load?'0：lw x1,8(x0)':store?'4：sw x1,12(x0)':'DDR3から\n命令を読む',182,485,116,47,load||store?14:18,true,load||store||ports?blue:C.ink,'center');
  r([[313,468],[336,468],[336,355],[359,355]],C.ink,true,2.3);

  if(stage>=4){
    poly([[183,357],[227,368],[227,390],[183,401],[183,388],[193,379],[183,367]]);
    t('+',199,364,25,30,25,true,C.ink,'center');
    r([[149,468],[149,368],[183,368]],C.ink);dot(149,468,blue);
    t('4',158,382,20,23,19);wire(178,389,183,389,C.ink,false);
    r([[227,379],[247,379],[247,336],[90,336],[90,468],[106,468]],C.ink);
    t('PC + 4',98,348,80,24,18,true,store?blue:C.ink);
  }

  // The field extraction and unused datapath inputs are intentionally reduced.
  r([[522,369],[522,385],[380,385],[380,442],[398,442]],blue,true,2.1);
  r([[425,369],[425,376],[612,376],[612,508],[629,508]],blue,true,2.3);
  if(load){
    r([[631,369],[631,394],[365,394],[365,515],[398,515]],blue,true,2.1);
    wire(381,484,398,484,gray,true,1.5);
  }else{
    r([[585,369],[585,394],[368,394],[368,484],[398,484]],command||store?blue:gray,true,2.1);
    wire(381,515,398,515,store||command?gray:C.ink,true,1.5);
    if(combined)t('rd',350,501,28,23,15,true,C.ink);
  }
  b('rf');
  poly([[439,399],[447,408],[455,399]],'none');
  t('レジスタ群',411,448,139,25,17,true,C.ink,'center');
  [['A1',404,427],['A2',404,471],['A3',404,501],['WD3',404,531],['RD1',523,427],['RD2',523,471]].forEach(([v,x,y])=>t(v,x,y,35,22,14,false,(load&&['A2','RD2'].includes(v))||((store||command)&&['A3','WD3'].includes(v))?gray:C.ink));
  t('WE3',521,401,37,22,14,false,store||command?gray:blue);
  wire(563,442,629,442,C.ink,true,2.7);
  t(load||store?'0':command?'B':'値',572,409,28,28,load||store||command?23:20,true,blue,'center');
  poly([[629,427],[697,445],[697,505],[629,525],[629,487],[647,475],[629,454]],white,C.ink,2.3).name='board-stable-alu';
  t('ALU',638,395,60,31,24,true,C.ink,'center');t('+',657,456,33,38,30,false,C.ink,'center');
  t(load?'即値 8':store?'即値 12':command?'即値 0':'即値',592,527,115,28,21,true,blue,'center');

  const addrColor=load||store||command||sdFocus?blue:C.ink;
  wire(697,464,internalMemory?857:760,464,addrColor,true,2.8);
  t(load?'8':store?'12':command?'B':'番地',internalMemory?702:710,431,internalMemory?51:32,28,load||store||command?23:16,true,blue,'center');
  const writeTurn=internalMemory?829:720, target=internalMemory?857:760;
  r([[563,484],[575,484],[575,565],[writeTurn,565],[writeTurn,527],[target,527]],load?gray:blue,true,2.7);
  t(store?'3':command?'D':load?'':'値',576,500,30,27,20,true,blue,'center');
  const readRoute=internalMemory?[[1004,512],[1015,512],[1015,610],[380,610],[380,541],[398,541]]:[[760,558],[732,558],[732,610],[380,610],[380,541],[398,541]];
  r(readRoute,store||command?gray:blue,true,2.7);
  if(load)t('3',351,538,24,26,21,true,blue,'center');

  if(ports){
    // Keep both original memory rectangles. Here they represent the CPU-side
    // access interfaces, not separate local memories in the implemented SoC.
    for(const [xs,y0,prefix] of [
      [[183,219,255,291],536,'I'],[[875,911,947,983],556,'D']]){
      ['AD','WD','WE','RD'].forEach((name,i)=>{
        const x=xs[i],reading=name==='RD';
        wire(x,y0,x,584,blue,reading?'start':!combined,name==='WE'?1.3:2.5);
        if(combined)t(name,x+3,y0+1,30,20,14,true,blue);
        else t(name,x-17,586,34,21,14,true,blue,'center');
      });
    }
    t('読書き制御',917,309,106,27,17,true,blue,'center');
    r([[1018,338],[1032,338],[1032,425],[1004,425]],blue,true,1.3);
  }

  // The local instruction memory has no bus routes.
  if(!internalMemory){
  r([[213,536],[213,580],[744,580],[744,408],[760,408]],busFocus?blue:gray,true,2.1);
  r([[760,428],[708,428],[708,594],[300,594],[300,536]],busFocus?blue:gray,true,2.1);
  if(busFocus){
    t('命令',765,402,50,27,16,true,blue,'center');
    t('データ',764,498,52,27,16,true,blue,'center');
  }
  }

  // Graphics and scanout access shared memory through the DDR controller.
  if(display){
    r([[1004,521],[1018,521],[1018,470],[1004,470]],blue,true,2.8);
    r([[1004,486],[1032,486],[1032,590],[1004,590]],blue,true,2.8);
    t('画素を保存',863,487,130,18,14,true,blue,'center');
    t('画素を読む',863,548,130,18,14,true,blue,'center');
  }
}


// Board overview without a photograph. The code and gate are the same
// small logic example. The research view retains the board geometry.
function drawIntroBoard(s,a,research){
  const {text:T,box:B,polygon:P,wire:W,route:R,C}=a;
  const t=(v,x,y,w,h=30,z=23,b=false,c=C.ink,align='left')=>T(s,v,x,y,w,h,z,b,c,align);
  const box=(name,x,y,w,h,fill=C.white,stroke=C.ink)=>{
    const sh=B(s,'',x,y,w,h,fill,23,stroke,2.2);sh.name='implementation-'+name;return sh;
  };

  if(research){
    t('本研究の目的',64,259,468,40,29,true,C.heading);
    t('教育用CPUを\nゲーム機へ拡張する\n例を示す',64,326,468,153,36,true);
  }else{
    t('回路をコードで記述',64,259,458,40,29,true,C.heading);
    box('hdl',64,326,468,153,'#F5F7FB');
    const code=['module example(input logic a, b,', '               output logic y);', '  assign y = a & b;', 'endmodule'];
    code.forEach((line,i)=>{
      const sh=t(line,79,341+i*29,438,29,20,false,i===2?C.blue:C.ink);
      sh.name='implementation-code-'+i;
      sh.text.style={typeface:'Consolas',fontSize:20,bold:false,color:i===2?C.blue:C.ink,alignment:'left',verticalAlignment:'middle',wrap:'none'};
    });
    t('論理回路の記述例',64,493,468,32,23,false,C.ink,'center');
  }

  box('board',638,242,578,308,C.pale);
  t('FPGAボード',654,251,546,34,27,true);
  box('chip',656,293,350,239,C.chip,C.blue);
  t('FPGAチップ',669,306,320,35,26,true,C.blue);
  if(research){
    box('education-cpu',678,375,126,88);
    t('Wally',678,344,126,28,21,true,C.ink,'center');
    t('教育用\nCPU',686,382,110,74,25,true,C.ink,'center');
    box('graphics-function',851,375,133,88,C.pale,C.blue);
    t('RasterIX',851,344,133,28,21,true,C.ink,'center');
    t('描画\n機能',859,382,117,74,25,true,C.blue,'center');
    W(s,804,419,851,419,C.blue,true,2.6);
    t('描画機能を追加',673,479,316,33,23,true,C.blue,'center');
  }else{
    const gate=[[736,375],[769,375]];
    for(let i=1;i<=16;i++){
      const theta=-Math.PI/2+i*Math.PI/16;
      gate.push([769+39*Math.cos(theta),414+39*Math.sin(theta)]);
    }
    gate.push([736,453]);
    P(s,gate,C.white,C.ink,2.2).name='implementation-and-gate';
    W(s,695,395,736,395,C.ink,false,2.4);
    W(s,695,433,736,433,C.ink,false,2.4);
    W(s,808,414,941,414,C.ink,true,2.4);
    t('a',671,378,28,30,25,true);t('b',671,418,28,30,25,true);
    t('y',948,397,28,30,25,true);
    t('回路の例（AND）',672,479,318,33,23,true,C.ink,'center');
  }
  for(const [name,label,y]of[['card','SDカードスロット',304],['memory','DDR3メモリ',388],['hdmi','HDMI OUT',472]]){
    box(name,1041,y,157,57);
    t(label,1047,y+10,145,37,21,true,C.ink,'center');
    W(s,1006,y+28.5,1041,y+28.5,C.ink,false,2.3);
  }
  if(!research){
    R(s,[[534,418],[656,418]],C.blue,true,3);
    t('回路を\n実装',535,362,102,52,21,true,C.blue,'center');
  }
}

export function drawImplementationFlow(s,a){drawIntroBoard(s,a,false);}
export function drawResearchPurpose(s,a){drawIntroBoard(s,a,true);}
