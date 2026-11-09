// One editable board coordinate system throughout the main explanation.
// Emphasis follows the operation being explained, not logic-high/low levels.
export const MAIN_BOARD = {
  board:[64,175,1152,400], chip:[84,210,1112,312],
  wally:[96,244,719,270], cpu:[112,342,126,96], decoder:[318,250,180,54],
  sd:[440,381,155,72], ddr:[640,381,155,72], adapter:[840,381,155,72],
  rasterix:[1030,381,150,72], card:[435,533,150,32],
  memory:[645,533,150,32], hdmi:[1030,533,150,32]
};

export function drawStableBoard(s,a,{mode='request'}={}){
  const {text,box,polygon,wire,route,junction,C}=a;
  const muted='#A6B2C3',edge='#BBC6D6',frame='#718299',ink=C.ink,blue=C.blue;
  const fadedFill='#F5F7FB',chipFill='#E8EFF9';
  const is=(...modes)=>modes.includes(mode);
  const purpose=mode==='purpose',intro=mode==='implementation',image=mode==='image';
  const provenance=mode==='provenance';
  const sd=is('request','receive','copy','provenance'),memory=is('write','copy','execute','image','provenance');
  const command=is('command','contribution','provenance'),reading=is('receive','copy','execute','provenance');
  const transfer=is('request','receive','write','copy','execute','command','contribution','provenance');
  const writing=is('request','write','copy','command','contribution','provenance');
  const color=on=>provenance?'#8999AE':on?blue:muted;
  const T=(v,x,y,w,h=26,z=20,b=false,c=ink,align='left')=>text(s,v,x,y,w,h,z,b,c,align);
  const B=(name,label='',fill=C.white,z=22,stroke=ink,width=2.2)=>{
    const sh=box(s,label,...MAIN_BOARD[name],fill,z,stroke,width);
    sh.name='main-board-'+name;return sh;
  };
  const R=(p,c=ink,ar=true,w=2.7)=>route(s,p,c,ar,w);

  B('board','','#F6F8FC',22,frame,1.5);
  T('FPGAボード / Nexys Video',80,178,760,28,23,true,intro?ink:frame);
  B('chip','',chipFill,22,frame,1.8);
  T('FPGAチップ',100,214,240,25,20,true,intro?ink:frame);
  T('基板上の部品',100,533,290,28,20,true,intro?ink:frame);
  for(const [name,label,on] of [['card','SDスロット',sd||intro],['memory','DDR3メモリ',memory||intro],['hdmi','HDMI端子',image||intro]]){
    B(name,'',on?C.white:fadedFill,20,provenance?frame:on?blue:edge,provenance?1.3:on?2.2:1.3);
    T(label,MAIN_BOARD[name][0]+4,535,142,26,20,true,provenance?frame:on?ink:muted,'center');
  }

  if(intro){
    T('HDLによる記述例',112,263,450,32,25,true,C.heading);
    box(s,'',112,307,450,136,C.white,20,ink,1.8).name='main-board-code-example';
    const lines=['module example(input logic a, b,','               output logic y);','  assign y = a & b;','endmodule'];
    lines.forEach((v,i)=>{
      const sh=T(v,127,316+i*28,423,28,20,false,i===2?blue:ink);
      sh.text.style={typeface:'Consolas',fontSize:20,color:i===2?blue:ink,wrap:'none',verticalAlignment:'middle'};
    });
    const gate=[[780,332],[823,332]];
    for(let i=1;i<=18;i++){
      const angle=-Math.PI/2+i*Math.PI/18;
      gate.push([823+43*Math.cos(angle),375+43*Math.sin(angle)]);
    }
    gate.push([780,418]);
    polygon(s,gate,C.white,ink,2.2).name='main-board-logic-example';
    wire(s,730,353,780,353,ink,false,2.5);wire(s,730,397,780,397,ink,false,2.5);
    wire(s,866,375,973,375,ink,true,2.5);
    T('a',699,339,30,29,25,true);T('b',699,383,30,29,25,true);T('y',989,361,30,29,25,true);
    T('論理回路の例（AND）',714,452,341,32,25,true,ink,'center');
    wire(s,586,375,686,375,blue,true,3);
    T('回路を実装',574,325,126,30,22,true,blue,'center');
    return;
  }

  const reused=B('wally','',provenance?'#F4F6FA':'none',20,edge,1.1);reused.line={style:'dashed',fill:provenance?frame:edge,width:provenance?2:1.1};
  T('既存回路 Wally',105,248,190,23,18,true,purpose||provenance?ink:muted);
  const origin=box(s,'',1020,373,170,88,provenance?'#F4F6FA':'none',20,edge,1.1);
  origin.name='main-board-rasterix-origin';origin.line={style:'dashed',fill:provenance?frame:edge,width:provenance?2:1.1};
  T('既存回路 RasterIX',1020,341,178,27,18,true,purpose||provenance?ink:muted,'center');
  B('adapter','',provenance?'#DCEAF9':command||purpose?C.white:fadedFill,20,command||purpose?blue:edge,provenance?3.3:command||purpose?2.6:1.3);
  T('接続回路',845,purpose?395:409,145,26,22,true,command||purpose?blue:muted,'center');
  T('本研究で追加',845,purpose?426:433,145,18,16,true,command||purpose?blue:muted,'center');
  B('rasterix','',command||image||purpose?C.white:fadedFill,20,provenance?frame:command||image||purpose?blue:edge,command||image||purpose?2.3:1.3);
  T('描画・表示\n回路',1035,392,140,49,23,true,command||image||purpose?ink:muted,'center');
  R([[995,417],[1030,417]],provenance?blue:color(command||purpose),true,3);
  T('描画命令',984,459,122,23,17,true,provenance?blue:color(command||purpose),'center');

  // External-component links stay clear of the read-return lanes.
  R(purpose?[[440,453],[440,470],[420,470],[420,549],[435,549]]:
    [[440,423],[420,423],[420,549],[435,549]],color(sd),'both',2.4);
  R(purpose?[[712,453],[712,481],[820,481],[820,549],[795,549]]:
    [[795,423],[820,423],[820,549],[795,549]],color(memory),'both',2.4);
  R([[1150,453],[1150,533]],color(image),true,2.4);
  R([[1080,453],[1080,510],[752,510],[752,453]],color(image),'both',2.7);
  T('画像の保存・読出し',916,485,160,22,16,false,color(image),'center');

  if(purpose){
    box(s,'Wally\nCPUと周辺制御回路',112,307,668,146,C.white,31,ink,2.3).name='main-board-wally-summary';
    R([[780,417],[840,417]],blue,true,3);
    T('読書き',782,385,56,25,17,true,blue,'center');
    return;
  }

  B('cpu','',transfer?C.white:fadedFill,20,transfer?ink:edge,transfer?2.3:1.3);
  T('CPU',121,351,78,28,25,true,transfer?ink:muted,'center');
  T('Wally',121,385,78,26,21,false,transfer?ink:muted,'center');
  for(const [name,y,on]of [['AD',345,transfer],['WD',375,writing],['WE',405,transfer]])T(name,201,y,33,22,18,true,color(on));
  T('RD',151,414,34,22,18,true,color(reading));
  B('decoder','アドレス\nデコーダ',transfer?C.white:fadedFill,20,provenance?ink:color(transfer),transfer?2.3:1.3);
  const values={request:['AD = 0x13048','WD = request[i]','WE = 1'],
    receive:['AD = 0x1304C','WD：使わない','WE = 0'],
    write:['AD = 0x80000000','WD = 受信値','WE = 1'],
    copy:['ADを交互に変更','WD = 受信値','WE：0 → 1'],
    execute:['AD = 命令の番地','WD：使わない','WE = 0'],
    command:['AD = 0x10080000','WD = cmd','WE = 1'],
    contribution:['AD = 0x10080000','WD = 描画命令','WE = 1'],
    provenance:['AD：アドレス','WD：書込みデータ','WE（1 bit）'],
    image:['AD：アドレス','WD：書込みデータ','WE（1 bit）']}[mode];
  T(values[0],102,275,196,22,18,true,color(transfer));
  T(values[1],102,298,196,22,18,true,color(writing));
  T(values[2],102,321,196,20,17,true,color(transfer));
  const defs=[
    {name:'sd',x:440,label:'SD制御',sub:mode==='request'?'送信用レジスタ':is('receive','copy')?'受信用レジスタ':'送受信レジスタ',select:'S0',on:sd,write:mode==='request',read:is('receive','copy')},
    {name:'ddr',x:640,label:'DDR制御',sub:'AMD製IP',select:'S1',on:memory,write:is('write','copy'),read:mode==='execute'},
    {name:'adapter',x:840,select:'S2',on:command,write:command,read:false}];

  // Shared lines remain connected. Only the path relevant to the described
  // operation is blue; muted branches do not imply physical disconnection.
  for(const [signal,y0,railX,yRail,offset,w] of [
    ['AD',356,265,314,20,3],['WD',386,285,337,55,3],['WE',416,305,360,90,1.35]]){
    const involved=defs.map(d=>transfer&&(signal==='WD'?d.write:d.on));
    const last=involved.lastIndexOf(true),trunkColor=color(last>=0);
    R([[238,y0],[railX,y0],[railX,yRail],[defs[0].x+offset,yRail]],trunkColor,false,w);
    defs.forEach((d,i)=>{
      const x=d.x+offset;
      if(i<2)wire(s,x,yRail,defs[i+1].x+offset,yRail,color(last>i),false,w);
      wire(s,x,yRail,x,381,color(involved[i]),true,w);
      if(i<2)junction(s,x,yRail,color(involved[i]||last>i),4.6);
    });
  }
  R([[265,314],[265,277],[318,277]],color(transfer),true,3);
  junction(s,265,314,color(transfer),4.6);

  defs.forEach((d,i)=>{
    const sel=transfer&&d.on,selX=d.x+130,y=262+i*16;
    R([[498,y],[selX,y],[selX,381]],color(sel),true,1.35);
    if(d.name!=='adapter'){
      B(d.name,'',provenance?C.white:d.on?(d.name==='ddr'?C.ip:C.white):fadedFill,20,provenance?frame:d.on?blue:edge,d.on?2.4:1.3);
      T(d.label,d.x+5,409,145,24,22,true,d.on?ink:muted,'center');
      T(d.sub,d.x+5,433,145,18,16,true,d.on?ink:muted,'center');
    }
    // Labels are inside the input row, so no shaft passes through a letter.
    for(const [sig,offset,on]of [['AD',20,sel],['WD',55,d.write],['WE',90,sel]]){
      T(sig,d.x+offset-15,384,30,21,16,true,d.name==='ddr'&&on&&!provenance?ink:color(on),'center');
    }
    const suffix=mode==='copy'||image||provenance?'':d.on?'=1':'=0';
    T(d.select+suffix,d.x+106,384,48,21,15,true,d.name==='ddr'&&sel&&!provenance?ink:color(sel),'center');
    const ry=465+i*16;
    R([[d.x+72,453],[d.x+72,ry],[375,ry]],color(d.read),true,2.7);
  });
  polygon(s,[[375,454],[330,465],[330,497],[375,508]],reading?C.white:fadedFill,color(reading),reading?2.3:1.3).name='main-board-read-selector';
  T('選択',333,468,40,26,18,true,color(reading),'center');
  T('S0〜S2',320,423,90,24,17,true,color(reading),'center');
  wire(s,352,449,352,460,color(reading),true,1.35);
  R([[330,481],[175,481],[175,438]],color(reading),true,2.7);
  T(reading&&!provenance?'RD = '+(mode==='execute'?'命令':'受信値'):'RD：読出しデータ',105,489,214,24,18,true,color(reading));
}
