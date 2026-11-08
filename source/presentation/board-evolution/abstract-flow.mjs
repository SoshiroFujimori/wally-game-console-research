// Editable functional views shared by the abstract-based presentation.
// Interface paths aggregate timing details. The access view separates AD/WD/WE/RD
// and decode/select signals; it is not an AHB/APB cycle-level diagram.
export function drawAbstractSystem(s, api, focus='all') {
  const {text,box,route,C}=api;
  const ox=64,oy=185,gray='#98A3B5';
  const T=(v,x,y,w,h=30,z=23,b=false,c=C.ink,a='left')=>text(s,v,ox+x,oy+y,w,h,z,b,c,a);
  const B=(v,x,y,w,h,fill=C.white,z=23,stroke=C.ink,width=2.2)=>box(s,v,ox+x,oy+y,w,h,fill,z,stroke,width);
  const active=key=>focus==='all'||({sd:['sd','memory'],command:['command'],image:['image','memory']}[focus]||[]).includes(key);
  const R=(points,key,arrow=true)=>route(s,points.map(([x,y])=>[ox+x,oy+y]),active(key)?C.blue:gray,arrow,active(key)?3:2);
  B('',0,0,1152,384,C.pale,23,C.ink,2);
  T('FPGAボード / Nexys Video',14,5,680,34,25,true);
  B('',20,44,930,320,C.chip,23,C.ink,2.4);
  T('FPGAチップ',34,48,250,29,23,true);
  T('チップ外の部品',974,45,170,29,18,true,C.ink,'center');
  B('CPU\nWally',70,150,130,100,C.white,26);
  B('SD制御\nWally',400,90,175,65,C.white,23);
  B('DDR制御\nAMD製IP',740,180,175,75,C.ip,23);
  B('接続回路\n本研究で追加',400,275,175,65,C.white,21,C.blue,3);
  B('描画回路\nRasterIX',740,275,175,65,C.white,23);
  B('表示回路',740,80,175,65,C.white,25);
  B('SDカード\nスロット',1010,85,120,65,C.white,21);
  B('DDR3\nメモリ',1010,185,120,75,C.white,23);
  B('HDMI端子',1010,300,120,64,C.white,21);
  R([[200,170],[300,170],[300,122],[400,122]],'sd','both');
  R([[200,200],[700,200],[700,218],[740,218]],'memory','both');
  R([[200,230],[300,230],[300,307],[400,307]],'command');
  R([[575,307],[740,307]],'command');
  R([[825,275],[825,255]],'image');
  R([[825,180],[825,145]],'image');
  R([[575,122],[600,122],[600,62],[980,62],[980,117],[1010,117]],'sd','both');
  R([[915,218],[1010,218]],'memory','both');
  R([[915,112],[965,112],[965,332],[1010,332]],'image');
  T('読書き',322,163,130,30,21,false,active('sd')?C.blue:C.ink);
  T('読書き',465,204,140,30,21,false,active('memory')?C.blue:C.ink);
  T('描画命令',588,272,145,30,22,true,active('command')?C.blue:C.ink,'center');
  T('画像',850,255,65,22,17,false,C.ink);
  T('読出し',846,149,80,26,19,false,C.ink);
}

export function drawAbstractAccess(s,api,reading=false) {
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
  T('AD = 0x80000000',88,239,212,28,22,true,blue);
  T(reading?'WD：使わない':'WD = 7',350,282,300,29,23,true,reading?gray:blue);
  T(reading?'WE = 0（読む）':'WE = 1（書く）',350,326,300,29,23,true,blue);
  const defs=[{x:520,name:'SD制御',select:'S0',on:false},
              {x:750,name:'DDR制御',select:'S1',on:true},
              {x:980,name:'描画命令の\n接続回路',select:'S2',on:false}];
  // Shared forward signals have a single trunk with explicit branch dots.
  for(const [signal,y0,railX,yRail,offset,col] of [
    ['AD',350,280,275,28,blue],['WD',395,305,315,75,reading?gray:blue],
    ['WE',440,330,355,115,blue]]){
    route(s,[[245,y0],[railX,y0],[railX,yRail],[defs.at(-1).x+offset,yRail]],col,false,2.5);
    for(const d of defs){
      wire(s,d.x+offset,yRail,d.x+offset,405,col,true,2.1);
      if(d!==defs.at(-1))junction(s,d.x+offset,yRail,col,5);
      T(signal,d.x+offset-35,378,32,22,17,true,col,'center');
    }
  }
  route(s,[[280,275],[280,220],[350,220]],blue,true,2.2);junction(s,280,275,blue,5);
  defs.forEach((d,i)=>{
    const col=d.on?blue:gray,y=197+i*21,selX=d.x+155;
    route(s,[[560,y],[selX,y],[selX,405]],col,true,2.0);
    T(d.select+(d.on?'=1':'=0'),selX+5,366,64,28,19,true,col);
    box(s,d.name,d.x,405,180,95,d.on?C.pale:C.white,24,col,d.on?3:2);
    const ry=541+i*33,x=d.x+90;
    route(s,[[x,500],[x,ry],[425,ry]],reading&&d.on?blue:gray,true,2.2);
  });
  polygon(s,[[425,525],[350,539],[350,609],[425,623]],C.white,reading?blue:gray,2.3);
  T('選択',359,557,60,34,20,true,reading?blue:gray,'center');
  T('S0〜S2',346,490,112,25,18,true,reading?blue:gray,'center');
  wire(s,387,516,387,532,reading?blue:gray,true,1.8);
  route(s,[[350,574],[170,574],[170,470]],reading?blue:gray,true,2.6);
  T(reading?'RD = 7（読出し値）':'RD（読出し値）',91,587,252,31,22,true,reading?blue:gray,'center');
}

export function drawConceptCode(s,api,rows,y=579) {
  const {text,box,wire,C}=api;
  const h=rows.length*29+12;
  box(s,'',64,y,1152,h,'#EEF0FC',24,'#EEF0FC',0);
  wire(s,64,y,1216,y,C.ink,false,1.1);
  wire(s,64,y+h,1216,y+h,C.ink,false,1.1);
  rows.forEach(([code,comment],i)=>{
    const shape=text(s,code,78,y+5+i*29,710,29,24,false,C.ink);
    shape.text.style={typeface:'Consolas',fontSize:24,bold:false,color:C.ink,verticalAlignment:'middle',wrap:'none'};
    text(s,'// '+comment,805,y+5+i*29,395,29,23,false,C.ink);
  });
}
