// Functional software flow inside the CPU, using the board outline and
// peripheral positions shared by the following circuit slides.
export function drawGameProgram(s, api) {
  const {text,box,wire,route,C}=api;
  const frame='#718299', faded='#A6B2C3', edge='#BBC6D6';
  box(s,'',64,175,1152,400,'#F6F8FC',22,frame,1.5);
  text(s,'FPGAボード / Nexys Video',80,178,760,28,23,true,frame);
  box(s,'',84,210,1112,312,'#E8EFF9',22,frame,1.8);
  text(s,'FPGAチップ',100,214,240,25,20,true,frame);

  box(s,'',112,252,750,252,C.white,22,C.ink,2.2);
  text(s,'CPU Wallyが実行する処理',128,259,718,35,27,true,C.ink);
  text(s,'作成したゲームプログラム',130,305,448,29,23,true,C.blue,'center');
  text(s,'既存ライブラリ',609,305,235,29,23,true,C.ink,'center');
  box(s,'',130,345,210,91,C.pale,22,C.blue,2.2);
  text(s,'位置を更新',138,352,194,31,24,true,C.ink,'center');
  text(s,'衝突・得点を計算',138,390,194,30,22,false,C.ink,'center');
  box(s,'',372,345,210,91,C.pale,22,C.blue,2.2);
  text(s,'図形と文字を指定',380,352,194,31,22,true,C.ink,'center');
  text(s,'位置・色を渡す',380,390,194,30,22,false,C.ink,'center');
  box(s,'',614,345,230,91,C.white,22,C.ink,2.2);
  text(s,'描画命令を作る',622,352,214,31,23,true,C.ink,'center');
  text(s,'OpenGL互換',622,390,214,30,22,false,C.ink,'center');
  wire(s,340,391,372,391,C.blue,true,2.8);
  wire(s,582,391,614,391,C.blue,true,2.8);
  route(s,[[729,436],[729,480],[235,480],[235,436]],C.blue,true,2.5);
  text(s,'繰り返す',382,442,202,32,23,true,C.blue,'center');

  box(s,'接続回路',886,345,122,91,'#F5F7FB',23,edge,1.2);
  box(s,'描画・表示\n回路',1030,345,150,91,'#F5F7FB',24,edge,1.2);
  wire(s,844,391,886,391,C.blue,true,2.8);
  wire(s,1008,391,1030,391,faded,true,2.3);
  text(s,'描画命令を送信',874,294,306,32,22,true,C.blue,'center');
  wire(s,1150,436,1150,533,faded,true,2.4);
  text(s,'基板上の部品',100,533,290,28,20,true,frame);
  for(const [label,x] of [['SDスロット',435],['DDR3メモリ',645],['HDMI端子',1030]]) {
    box(s,'',x,533,150,32,'#F5F7FB',20,edge,1.2);
    text(s,label,x+4,535,142,26,20,true,faded,'center');
  }
}
