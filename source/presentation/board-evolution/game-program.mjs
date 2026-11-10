// Conceptual MMIO operations inside the CPU. Board and graphics positions
// follow the adjacent integration diagrams.
export function drawGameProgram(s, api) {
  const {text,box,wire,C}=api;
  const frame='#718299', faded='#A6B2C3', edge='#BBC6D6';
  const mono=(value,x,y,w,color=C.ink)=>{
    const sh=text(s,value,x,y,w,32,24,false,color);
    sh.text.style={typeface:'Consolas',fontSize:24,bold:false,color,
      alignment:'left',verticalAlignment:'middle',wrap:'none'};
    return sh;
  };
  box(s,'',64,175,1152,400,'#F6F8FC',22,frame,1.5);
  text(s,'FPGAボード / Nexys Video',80,178,760,28,23,true,frame);
  box(s,'',84,210,1112,312,'#E8EFF9',22,frame,1.8);
  text(s,'FPGAチップ',100,214,240,25,20,true,frame);

  box(s,'',112,252,600,252,C.white,22,C.ink,2.2);
  text(s,'CPU Wally上のプログラム',128,259,568,34,27,true,C.ink);
  text(s,'接続プログラムの操作を表す概念コード',128,297,568,24,18,false,frame);
  text(s,'// 描画命令を接続回路へ送る',128,329,568,28,22,false,C.ink);
  mono('*(uint32_t *)0x10080000 = command;',128,362,568,C.blue);
  text(s,'// 接続回路の状態を読み出す',128,411,568,28,22,false,C.ink);
  mono('status = *(uint32_t *)0x10080008;',128,444,568,C.blue);

  box(s,'',840,330,155,148,C.pale,22,C.blue,2.4);
  text(s,'接続回路',845,337,145,34,25,true,C.blue,'center');
  text(s,'命令の受取り',845,384,145,28,19,false,C.ink,'center');
  text(s,'状態の読出し',845,441,145,28,19,false,C.ink,'center');
  box(s,'描画・表示\n回路',1030,330,150,100,'#F5F7FB',24,edge,1.2);
  wire(s,712,378,840,378,C.blue,true,3);
  text(s,'書込み',719,343,114,28,22,true,C.blue,'center');
  wire(s,840,460,712,460,C.blue,true,3);
  text(s,'読出し',719,423,114,28,22,true,C.blue,'center');
  wire(s,995,380,1030,380,faded,true,2.5);
  wire(s,1150,430,1150,533,faded,true,2.4);
  text(s,'基板上の部品',100,533,290,28,20,true,frame);
  for(const [label,x] of [['SDスロット',435],['DDR3メモリ',645],['HDMI端子',1030]]) {
    box(s,'',x,533,150,32,'#F5F7FB',20,edge,1.2);
    text(s,label,x+4,535,142,26,20,true,faded,'center');
  }
}
