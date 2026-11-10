// Functional examples use the same board and chip boundaries as the main talk.
// They illustrate existing implementation categories, not a prior combined SoC.
export function drawPriorImplementations(s,api){
  const {text,box,wire,C}=api;
  const frame='#718299';
  box(s,'',64,175,1152,400,'#F6F8FC',22,frame,1.5);
  text(s,'FPGAボード（実装する回路の例）',80,178,1000,28,23,true,frame);
  box(s,'',84,210,1112,312,'#E8EFF9',22,frame,1.8);
  text(s,'FPGAチップ',100,214,240,25,20,true,frame);
  text(s,'CPUの実装例',128,266,400,35,29,true,C.heading,'center');
  text(s,'描画回路の実装例',716,266,400,35,29,true,C.heading,'center');
  box(s,'CPU Wally',128,330,400,100,C.white,32,C.ink,2.3);
  box(s,'描画・表示回路 RasterIX',716,330,400,100,C.white,27,C.ink,2.3);
  text(s,'プログラムの命令を実行する',128,454,400,34,25,false,C.ink,'center');
  text(s,'画像を作り、映像を出力する',670,454,408,34,25,false,C.ink,'center');
  wire(s,1100,430,1100,533,C.blue,true,2.7);
  box(s,'HDMI端子',1020,533,160,32,C.white,20,C.blue,1.8);
  text(s,'基板上の部品',100,533,290,28,20,true,frame);
}

// Add an address decoder without moving the CPU, controllers or board parts.
// Only the write path needed for this explanation is expanded into signals.
export function drawAddressDecode(s,api){
  const {text,box,route,wire,junction,C}=api;
  const frame='#718299',gray='#A6B2C3',edge='#BBC6D6';
  const T=(v,x,y,w,h=28,size=22,bold=false,col=C.ink,align='left')=>text(s,v,x,y,w,h,size,bold,col,align);
  box(s,'',64,175,1152,400,'#F6F8FC',22,frame,1.5);
  T('FPGAボード / Nexys Video',80,178,760,28,23,true,frame);
  box(s,'',84,210,1112,312,'#E8EFF9',22,frame,1.8);
  T('FPGAチップ',100,214,240,25,20,true,frame);
  T('アドレス：0x10080000',640,214,530,28,23,true,C.blue,'right');
  // Address reaches both the decoder and the selected peripheral's register.
  route(s,[[196,330],[196,285],[355,285]],C.blue,true,3);
  route(s,[[315,285],[315,251],[970,251],[970,330]],C.blue,true,3);
  junction(s,315,285,C.blue,5);
  box(s,'アドレスデコーダ',355,266,240,55,C.white,25,C.blue,2.4);
  route(s,[[595,294],[916,294],[916,330]],C.blue,true,1.4);
  T('領域が一致 → 選択 = 1',611,263,325,25,21,true,C.blue);
  route(s,[[278,357],[330,357],[330,459],[875,459],[875,430]],C.blue,true,3);
  T('WD：描画命令の数値',104,442,205,26,19,true,C.blue);
  T('WD',280,332,48,24,17,true,C.blue);
  route(s,[[278,409],[307,409],[307,496],[956,496],[956,430]],C.blue,true,1.4);
  T('WE = 1：書込み',104,476,205,26,19,true,C.blue);
  T('WE',280,383,48,24,17,true,C.blue);
  route(s,[[995,380],[1030,380]],C.blue,true,3);
  box(s,'CPU\nWally',112,330,166,100,C.white,27,C.ink,2.2);
  box(s,'SDカード制御',440,330,155,100,'#F5F7FB',21,gray,1.2);
  box(s,'',640,330,155,100,'#F5F7FB',20,gray,1.2);
  T('DDRメモリ制御',645,348,145,32,20,true,gray,'center');
  T('AMD製IP',645,385,145,26,21,false,gray,'center');
  box(s,'接続回路',840,330,155,100,C.pale,25,C.blue,2.4);
  box(s,'描画・表示\n回路',1030,330,150,100,C.white,25,C.ink,2.2);
  for(const [x,arrow] of [[490,'both'],[680,'both'],[1150,true]])wire(s,x,430,x,533,gray,arrow,2.2);
  T('基板上の部品',100,533,290,28,20,true,frame);
  for(const [name,x,w] of [['SDカードスロット',415,190],['DDR3メモリ',645,150],['HDMI端子',1030,150]])
    box(s,name,x,533,w,32,'#F5F7FB',20,edge,1.2);
}
