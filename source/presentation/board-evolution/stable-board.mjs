// One editable board coordinate system throughout the main circuit explanation.
// Physical components, functional ports and their routes keep their positions.
export const MAIN_BOARD = {
  board:[64,175,1152,400], chip:[84,210,1112,306],
  wally:[96,244,719,254], cpu:[112,342,126,96], decoder:[305,250,178,48],
  sd:[440,383,145,56], ddr:[640,383,155,56], adapter:[840,383,150,56],
  rasterix:[1030,383,150,56], card:[435,527,150,36],
  memory:[645,527,150,36], hdmi:[1030,527,150,36]
};

export function drawStableBoard(s,a,{mode='request'}={}){
  const {text,box,polygon,wire,route,junction,C}=a;
  const gray='#9BA7B8',ink=C.ink,blue=C.blue;
  const T=(v,x,y,w,h=26,z=20,b=false,c=ink,align='left')=>text(s,v,x,y,w,h,z,b,c,align);
  const B=(name,label='',fill=C.white,z=22,stroke=ink,width=2.2)=>{
    const sh=box(s,label,...MAIN_BOARD[name],fill,z,stroke,width);
    sh.name='main-board-'+name;return sh;
  };
  const R=(p,c=ink,ar=true,w=2.7)=>route(s,p,c,ar,w);
  const active=(...modes)=>modes.includes(mode);
  const memory=active('write','copy','execute','image'),sd=active('request','receive','copy');
  const command=active('command','contribution'),reading=active('receive','copy','execute');
  const transfer=active('request','receive','write','copy','execute','command','contribution');
  const image=mode==='image';
  const forward=transfer?blue:gray,write=active('request','write','copy','command','contribution');
  const rd=reading?blue:gray;

  B('board','',C.pale,22,ink,2);
  T('FPGAボード / Nexys Video',80,177,760,29,24,true);
  B('chip','',C.chip,22,ink,2.3);
  T('FPGAチップ',100,214,240,25,20,true);
  T('基板上の部品',100,530,300,29,22,true);
  B('card','SDスロット',C.white,20);
  B('memory','DDR3メモリ',C.white,20);
  B('hdmi','HDMI端子',C.white,20);

  if(mode==='implementation'){
    T('HDLによる記述例',112,269,415,30,25,true,C.heading);
    const lines=['module example(input logic a, b,',
      '               output logic y);','  assign y = a & b;','endmodule'];
    box(s,'',112,309,444,132,C.white,20,ink,1.8).name='main-board-code-example';
    lines.forEach((v,i)=>{
      const sh=T(v,127,318+i*28,415,28,20,false,i===2?blue:ink);
      sh.text.style={typeface:'Consolas',fontSize:20,color:i===2?blue:ink,wrap:'none',verticalAlignment:'middle'};
    });
    const gate=[[757,333],[797,333]];
    for(let i=1;i<=18;i++){
      const angle=-Math.PI/2+i*Math.PI/18;
      gate.push([797+43*Math.cos(angle),376+43*Math.sin(angle)]);
    }
    gate.push([757,419]);
    polygon(s,gate,C.white,ink,2.2).name='main-board-logic-example';
    wire(s,708,354,757,354,ink,false,2.5);wire(s,708,398,757,398,ink,false,2.5);
    wire(s,840,376,924,376,ink,true,2.5);
    T('a',678,340,30,29,25,true);T('b',678,384,30,29,25,true);T('y',935,361,30,29,25,true);
    T('論理回路の例（AND）',689,449,341,32,25,true,ink,'center');
    wire(s,568,376,666,376,blue,true,3);
    T('回路を\n実装',570,309,97,55,22,true,blue,'center');
    return;
  }

  const reused=B('wally','','none',20,C.old,1.3);reused.line={style:'dashed',fill:C.old,width:1.3};
  T('Wallyから流用',105,248,190,25,19,true);
  const rixGroup=box(s,'',1020,375,170,72,'none',20,C.old,1.3);
  rixGroup.name='main-board-rasterix-origin';rixGroup.line={style:'dashed',fill:C.old,width:1.3};
  T('RasterIXから流用',1022,340,174,28,19,true,ink,'center');
  B('adapter','',C.white,20,command||mode==='purpose'?blue:ink,command?3:2.2);
  T('接続回路',845,387,140,25,23,true,command||mode==='purpose'?blue:ink,'center');
  T('本研究で追加',845,414,140,21,17,true,command||mode==='purpose'?blue:ink,'center');
  B('rasterix','描画・表示\n回路',C.white,22,command||image?blue:ink);
  R([[990,410],[1030,410]],command||mode==='purpose'?blue:gray,true,3);
  T('描画命令',982,449,122,25,18,true,command?blue:ink,'center');

  // Physical device links are distinct from the CPU's AD/WD/WE/RD lanes.
  R(mode==='purpose'?[[440,439],[440,456],[420,456],[420,545],[435,545]]:
    [[440,412],[420,412],[420,545],[435,545]],sd||mode==='purpose'?blue:gray,'both',2.4);
  R([[mode==='purpose'?792:795,412],[825,412],[825,545],[795,545]],memory||mode==='purpose'?blue:gray,'both',2.4);
  R([[1150,439],[1150,527]],image||mode==='purpose'?blue:gray,true,2.4);
  R([[1080,439],[1080,506],[752,506],[752,439]],image?blue:gray,'both',2.7);
  T('画像の保存・読出し',862,483,205,22,17,false,image?blue:ink,'center');

  if(mode==='purpose'){
    box(s,'Wally\nCPUと周辺制御回路',112,307,680,132,C.white,32,ink,2.3).name='main-board-wally-summary';
    // The summary covers the same CPU/decoder/SD/DDR footprint as the next view.
    R([[792,400],[840,400]],blue,true,3);
    T('読書き',791,354,55,28,17,true,blue,'center');
    return;
  }

  B('cpu');T('CPU',122,350,77,29,25,true,ink,'center');T('Wally',122,385,77,26,21,false,ink,'center');
  for(const [name,y]of [['AD',345],['WD',375],['WE',405]])T(name,201,y,33,22,18,true);
  T('RD',151,414,34,22,18,true);
  B('decoder','アドレス\nデコーダ',C.white,21,transfer?blue:gray);
  const values={request:['AD = 0x13048','WD = request[i]','WE = 1'],
    receive:['AD = 0x1304C','WD：使わない','WE = 0'],
    write:['AD = 0x80000000','WD = 受信値','WE = 1'],
    copy:['ADを交互に変更','WD = 受信値','WE：0 → 1'],
    execute:['AD = 命令の番地','WD：使わない','WE = 0'],
    command:['AD = 0x10080000','WD = cmd','WE = 1'],
    contribution:['AD = 0x10080000','WD = 描画命令','WE = 1'],
    image:['AD：アドレス','WD：書込みデータ','WE（1 bit）']}[mode];
  T(values[0],102,275,196,22,18,true,forward);
  T(values[1],102,298,196,22,18,true,write?blue:ink);
  T(values[2],102,321,196,20,17,true,forward);
  const defs=[
    {name:'sd',x:440,label:'SD制御',sub:mode==='request'?'送信用レジスタ':active('receive','copy')?'受信用レジスタ':'送受信レジスタ',select:'S0',on:sd},
    {name:'ddr',x:640,label:'DDR制御',sub:'AMD製IP',select:'S1',on:memory},
    {name:'adapter',x:840,select:'S2',on:command}];
  for(const [signal,y0,railX,yRail,offset,c,w] of [
    ['AD',356,265,299,24,forward,3],['WD',386,285,324,62,write?blue:gray,3],
    ['WE',416,305,349,100,forward,1.35]]){
    R([[238,y0],[railX,y0],[railX,yRail],[940-(100-offset),yRail]],c,false,w);
    for(const [i,d]of defs.entries()){
      wire(s,d.x+offset,yRail,d.x+offset,383,c,true,w);
      if(i<2)junction(s,d.x+offset,yRail,c,5);
      T(signal,d.x+offset-15,357,30,23,16,true,c,'center');
    }
  }
  R([[265,299],[265,273],[305,273]],forward,true,3);junction(s,265,299,forward,5);
  defs.forEach((d,i)=>{
    const c=d.on?blue:gray,selectColor=transfer&&d.on?blue:gray,selX=d.x+125,y=260+i*16;
    R([[483,y],[selX,y],[selX,383]],selectColor,true,1.35);
    // Copy consists of alternating SD reads and DDR writes, not two selects at once.
    const suffix=mode==='copy'||mode==='image'?'':d.on?'=1':'=0';
    T(d.select+suffix,selX+3,354,60,25,17,true,selectColor);
    if(d.name!=='adapter'){
      B(d.name,'',d.name==='ddr'?C.ip:C.white,20,c,d.on?2.7:2.2);
      T(d.label,d.x+6,388,MAIN_BOARD[d.name][2]-12,24,22,true,ink,'center');
      T(d.sub,d.x+6,414,MAIN_BOARD[d.name][2]-12,21,17,true,ink,'center');
    }
    const ry=454+i*16,x=d.x+72;
    R([[x,439],[x,ry],[375,ry]],reading&&d.on?blue:gray,true,2.7);
  });
  polygon(s,[[375,443],[330,454],[330,487],[375,498]],C.white,rd,2.2).name='main-board-read-selector';
  T('選択',333,459,40,29,18,true,rd,'center');
  T('S0〜S2',331,405,89,25,17,true,rd);
  wire(s,352,431,352,448,rd,true,1.3);
  R([[330,471],[175,471],[175,438]],rd,true,2.7);
  T(reading?'RD = '+(mode==='execute'?'命令':'受信値'):'RD：読出しデータ',105,472,214,24,18,true,rd);
}
