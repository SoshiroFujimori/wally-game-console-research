// Editable functional views shared by the abstract-based presentation.
// Interface paths aggregate timing details. The access view separates AD/WD/WE/RD
// and decode/select signals; it is not an AHB/APB cycle-level diagram.
export function drawAbstractSystem(s, api, focus='all', {compact=false}={}) {
  const {text,box,route,C}=api;
  const ox=64,oy=compact?180:185,sy=compact?0.82:1,gray='#8B96A8';
  const T=(v,x,y,w,h=30,z=23,b=false,c=C.ink,a='left')=>text(s,v,ox+x,oy+y*sy,w,h*sy,z*(compact?0.94:1),b,c,a);
  const B=(v,x,y,w,h,fill=C.white,z=23,stroke=C.ink,width=2.2)=>box(s,v,ox+x,oy+y*sy,w,h*sy,fill,z*(compact?0.94:1),stroke,width);
  const active=key=>focus==='all'||({request:['request'],copy:['request','memory','ddr'],execute:['memory','ddr'],command:['command'],image:['image','ddr']}[focus]||[]).includes(key);
  const R=(points,key,arrow=true)=>route(s,points.map(([x,y])=>[ox+x,oy+y*sy]),active(key)?C.blue:gray,arrow,active(key)?3:1.6);
  B('',0,0,1152,355,C.pale,23,C.ink,2);
  T('FPGAボード / Nexys Video',14,5,680,34,25,true);
  if(focus==='request')T('SD制御：0x13000〜0x13FFF',573,8,560,29,20,true,C.blue,'right');
  if(focus==='command')T('接続回路：0x10080000〜0x100800FF',517,8,616,29,20,true,C.blue,'right');
  B('',20,44,930,292,C.chip,23,C.ink,2.4);
  T('FPGAチップ',34,46,220,28,22,true);
  T('基板上の部品',970,48,170,27,20,true,C.ink,'center');
  const reused=B('',40,79,890,128,'none',23,C.old,1.3);
  reused.line={style:'dashed',fill:C.old,width:1.3};
  T('Wallyの既存構成を利用',52,80,435,28,20,true,C.ink);
  B('CPU\nWally',65,121,120,64,C.white,24);
  B('SD制御',360,121,165,60,C.white,25);
  B('DDR制御\nAMD製IP',725,121,185,60,C.ip,22);
  B('接続回路\n本研究で追加',360,264,165,61,C.white,21,C.blue,3);
  const rix=B('',680,250,250,80,'none',23,C.old,1.3);
  rix.line={style:'dashed',fill:C.old,width:1.3};
  T('RasterIXから流用',684,224,206,27,20,true,C.ink,'center');
  B('描画・表示回路',700,264,210,61,C.white,25);
  B('SDカード\nスロット',1000,90,132,65,C.white,21);
  B('DDR3\nメモリ',1000,186,132,69,C.white,23);
  B('HDMI端子',1000,281,132,54,C.white,21);
  R([[185,145],[360,145]],'request','both');
  R([[185,166],[260,166],[260,195],[795,195],[795,181]],'memory','both');
  R([[125,185],[125,295],[360,295]],'command');
  R([[525,295],[700,295]],'command');
  R([[525,145],[560,145],[560,110],[975,110],[975,122],[1000,122]],'request','both');
  R([[910,152],[965,152],[965,220],[1000,220]],'ddr','both');
  R([[885,181],[885,215],[900,215],[900,264]],'image','both');
  R([[910,307],[1000,307]],'image');
  T('読書き',210,113,125,29,21,false,active('request')?C.blue:C.ink,'center');
  T('読書き',549,163,137,29,21,false,active('memory')?C.blue:C.ink,'center');
  T('描画命令',542,259,142,29,22,true,active('command')?C.blue:C.ink,'center');
  T('画像',817,182,61,23,18,false,C.ink);
}

export function drawAbstractAccess(s,api,{reading=false,target='ddr',address='0x80000000',value='受信値'}={}) {
  const {text,box,polygon,wire,route,junction,C}=api;
  const gray='#9DA7B6', ink=C.ink, blue=C.blue;
  const T=(v,x,y,w,h=30,z=24,b=false,c=ink,a='left')=>text(s,v,x,y,w,h,z,b,c,a);
  box(s,'',64,165,1152,468,C.chip,24,ink,2.3);
  T('CPUと周辺回路の読書き',80,173,260,35,22,true);
  box(s,'',95,325,150,145,C.white,24,ink,2.4);
  T('CPU',110,355,95,45,29,true,ink,'center');
  T('Wally',110,401,95,34,22,false,ink,'center');
  [['AD',338],['WD',383],['WE',428]].forEach(([v,y])=>T(v,202,y,40,25,20,true));
  T('RD',147,443,44,24,20,true);
  T('WE：書込みイネーブル（1 bit）',710,169,482,25,20,true);
  box(s,'アドレス\nデコーダ',350,185,210,64,C.white,23,blue,2.4);
  T('AD = '+address,88,239,212,28,22,true,blue);
  T(reading?'WD：使わない':'WD = '+value,350,282,330,29,23,true,reading?gray:blue);
  T(reading?'WE = 0（読む）':'WE = 1（書く）',350,326,300,29,23,true,blue);
  const defs=[{x:520,name:target==='sd'?'SD制御\n'+(reading?'受信用レジスタ':'送信用レジスタ'):'SD制御',select:'S0',on:target==='sd'},
              {x:750,name:'DDR制御',select:'S1',on:target==='ddr'},
              {x:980,name:'描画命令の\n接続回路',select:'S2',on:false}];
  // Shared forward signals have a single trunk with explicit branch dots.
  for(const [signal,y0,railX,yRail,offset,col] of [
    ['AD',350,280,275,28,blue],['WD',395,305,315,75,reading?gray:blue],
    ['WE',440,330,355,115,blue]]){
    const width=signal==='WE'?1.4:3;
    route(s,[[245,y0],[railX,y0],[railX,yRail],[defs.at(-1).x+offset,yRail]],col,false,width);
    for(const d of defs){
      wire(s,d.x+offset,yRail,d.x+offset,405,col,true,width);
      if(d!==defs.at(-1))junction(s,d.x+offset,yRail,col,5);
      T(signal,d.x+offset-35,378,32,22,17,true,col,'center');
    }
  }
  route(s,[[280,275],[280,220],[350,220]],blue,true,2.2);junction(s,280,275,blue,5);
  defs.forEach((d,i)=>{
    const col=d.on?blue:gray,y=197+i*21,selX=d.x+155;
    route(s,[[560,y],[selX,y],[selX,405]],col,true,1.4);
    T(d.select+(d.on?'=1':'=0'),selX+5,366,64,28,19,true,col);
    box(s,d.name,d.x,405,180,95,d.on?C.pale:C.white,d.on&&target==='sd'?22:24,col,d.on?3:2);
    const ry=541+i*33,x=d.x+90;
    route(s,[[x,500],[x,ry],[425,ry]],reading&&d.on?blue:gray,true,3);
  });
  polygon(s,[[425,525],[350,539],[350,609],[425,623]],C.white,reading?blue:gray,2.3);
  T('選択',359,557,60,34,20,true,reading?blue:gray,'center');
  T('S0〜S2',346,490,112,25,18,true,reading?blue:gray,'center');
  wire(s,387,516,387,532,reading?blue:gray,true,1.8);
  route(s,[[350,574],[170,574],[170,470]],reading?blue:gray,true,2.6);
  T(reading?'RD = '+value:'RD（読出し値）',91,587,252,31,22,true,reading?blue:gray,'center');
}

export function drawWallyExtension(s,api) {
  const {text,box,wire,C}=api;
  text(s,'既存の回路',64,316,330,33,24,true,C.heading,'center');
  text(s,'本研究で追加',526,316,230,33,24,true,C.heading,'center');
  text(s,'既存の回路',888,316,328,33,24,true,C.heading,'center');
  box(s,'Wally\nCPUと周辺制御',64,362,330,118,C.pale,30);
  box(s,'接続回路',526,362,230,118,C.white,30,C.blue,3);
  box(s,'RasterIX\n描画・表示回路',888,362,328,118,C.pale,29);
  wire(s,394,421,526,421,C.blue,true,3);
  wire(s,756,421,888,421,C.blue,true,3);
}

export function drawIntegrationContribution(s,api) {
  const {text,box,wire,C}=api;
  text(s,'既存のCPU',64,206,280,34,24,true,C.heading,'center');
  text(s,'本研究で実装',490,206,300,34,24,true,C.heading,'center');
  text(s,'既存の描画・表示',955,206,261,34,24,true,C.heading,'center');
  box(s,'Wally',64,267,280,94,C.pale,32);
  box(s,'接続回路',490,267,300,94,C.white,32,C.blue,3);
  box(s,'RasterIX',955,267,261,94,C.pale,32);
  wire(s,344,314,490,314,C.blue,true,3);
  wire(s,790,314,955,314,C.blue,true,3);
  text(s,'AD / WD / WE',346,272,142,32,20,true,C.blue,'center');
  text(s,'描画命令',798,272,149,32,23,true,C.blue,'center');
}

export function drawConceptCode(s,api,rows,y=579,{step=34,codeSize=23,commentSize=21}={}) {
  const {text,box,wire,C}=api;
  const h=rows.length*step+12;
  box(s,'',64,y,1152,h,'#EEF0FC',24,'#EEF0FC',0);
  wire(s,64,y,1216,y,C.ink,false,1.1);
  wire(s,64,y+h,1216,y+h,C.ink,false,1.1);
  rows.forEach(([code,comment],i)=>{
    const shape=text(s,code,78,y+5+i*step,724,step,codeSize,false,C.ink);
    shape.text.style={typeface:'Consolas',fontSize:codeSize,bold:false,color:C.ink,verticalAlignment:'middle',wrap:'none'};
    shape.text=[{runs:code.split(/(0x[0-9a-fA-F]+|\b(?:uint32_t|uint8_t|int|void|for)\b)/).filter(Boolean).map(run=>({run,style:{color:run.startsWith('0x')?'#703077':/^(uint32_t|uint8_t|int|void|for)$/.test(run)?C.blue:C.ink,typeface:'Consolas'}}))}];
    text(s,'// '+comment,823,y+5+i*step,380,step,commentSize,false,'#445369');
  });
}
