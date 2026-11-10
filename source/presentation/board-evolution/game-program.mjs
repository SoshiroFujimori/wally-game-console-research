// Conceptual RISC-V fragments. The loader copies received bytes and jumps
// to DDR; the game fragment illustrates a command-port write after loading.
export const LOAD_ASM = [
  ["li   s0,0x1304C", "SDカードの受信口"],
  ["li   s1,0x80000000", "DDRメモリの先頭"],
  ["li   s2,0x80001000", "読込終端（例）"],
  ["copy:", ""],
  ["lbu  t0,0(s0)", "1バイト読む"],
  ["sb   t0,0(s1)", "DDRメモリへ保存"],
  ["addi s1,s1,1", "保存先を+1"],
  ["bltu s1,s2,copy", "終端まで繰返す"],
  ["li   t0,0x80000000", "実行先"],
  ["jr   t0", "DDRメモリへ分岐"]
];
export const GAME_ASM = [
  ["game:", "DDRメモリの先頭"],
  ["...", "ゲームの計算"],
  ["...", "描画命令を用意"],
  ["li   t0,0x10080000", "描画命令の送信口"],
  ["lw   t1,0(a0)", "命令列から1語"],
  ["sw   t1,0(t0)", "回路へ送信"],
  ["...", "続きの処理"]
];

export function drawGameProgram(s, api) {
  const {text,box,wire,route,C}=api;
  const frame='#718299', faded='#A6B2C3', edge='#BBC6D6';
  const code=(rows,x)=>rows.forEach(([value,comment],i)=>{
    const active=/^(lbu|sb |jr |sw )/.test(value);
    const sh=text(s,value,x,316+i*25,251,26,23,false,active?C.blue:C.ink);
    sh.text.style={typeface:'Consolas',fontSize:23,bold:false,color:active?C.blue:C.ink,
      alignment:'left',verticalAlignment:'middle',wrap:'none'};
    if(comment)text(s,comment,x+257,316+i*25,145,26,17,false,active?C.blue:C.ink);
  });
  box(s,'',64,175,1152,471,'#F6F8FC',22,frame,1.5);
  text(s,'FPGAボード / Nexys Video',80,178,760,28,23,true,frame);
  box(s,'',84,210,1112,378,'#E8EFF9',22,frame,1.8);
  text(s,'FPGAチップ',100,214,240,25,20,true,frame);
  box(s,'',112,244,880,332,C.white,22,C.ink,2.2);
  text(s,'CPU Wallyが実行する命令の例',128,249,848,31,25,true,C.ink);
  text(s,'読込み側のプログラム',128,283,404,28,23,true,C.blue);
  text(s,'DDR3に読み込んだゲーム',580,283,396,28,23,true,C.blue);
  code(LOAD_ASM,128);
  code(GAME_ASM,580);
  route(s,[[538,554],[558,554],[558,329],[578,329]],C.blue,true,2.3);
  text(s,'a0：描画命令列の先頭アドレス',580,520,396,28,18,false,frame);

  box(s,'接続回路',1030,401,150,83,C.pale,25,C.blue,2.4);
  box(s,'描画・表示\n回路',1030,510,150,64,'#F5F7FB',22,edge,1.2);
  wire(s,992,454,1030,454,C.blue,true,3);
  wire(s,1105,484,1105,510,C.blue,true,2.5);
  wire(s,1150,574,1150,599,faded,true,2.4);
  text(s,'基板上の部品',100,599,290,28,20,true,frame);
  for(const [label,sub,x] of [['SDカード','ゲームを保存',435],['DDR3メモリ','コピーしたゲーム',645]]){
    box(s,'',x,595,150,43,C.white,20,C.blue,1.6);
    text(s,label,x+4,596,142,22,18,true,C.ink,'center');
    text(s,sub,x+4,617,142,20,16,false,C.blue,'center');
  }
  box(s,'',1030,599,150,35,'#F5F7FB',20,edge,1.2);
  text(s,'HDMI端子',1034,601,142,28,20,true,faded,'center');
}
