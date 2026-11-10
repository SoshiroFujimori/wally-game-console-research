// Stable functional view for the main talk. Detailed signal paths remain in
// the answer slides. A path summarizes the named transfer, not a single wire.
export function drawCoreBoard(s,a,{mode='overview'}={}) {
  const {text,box,route,C}=a;
  const faded='#A6B2C3',edge='#BBC6D6',frame='#718299';
  const hierarchy=mode==='hierarchy';
  const provenance=mode==='overview'||mode==='abstract'||hierarchy;
  const on=(...m)=>provenance||m.includes(mode);
  const cpu=on('copy','execute','command','adapter');
  const sd=on('copy'),ddr=on('copy','execute','image','image-write','image-read');
  const graphics=on('command','adapter','image','image-write','image-read');
  const command=on('command','adapter');
  const col=active=>provenance?frame:active?C.blue:faded;
  const T=(v,x,y,w,h=28,size=22,bold=false,color=C.ink,align='left')=>text(s,v,x,y,w,h,size,bold,color,align);
  const B=(name,x,y,w,h,active,fill=C.white)=>{
    const shape=box(s,'',x,y,w,h,active?fill:'#F5F7FB',22,provenance?frame:active?C.blue:edge,active?2.2:1.2);
    shape.name='core-board-'+name;
    return shape;
  };
  const R=(pts,active,arrows=true,width=2.7)=>route(s,pts,col(active),arrows,width);
  box(s,'',64,175,1152,400,hierarchy?'#F5F5F5':'#F6F8FC',22,hierarchy?C.ink:frame,hierarchy?2.5:1.5).name='core-board-outline';
  T('FPGAボード / Nexys Video',80,178,760,28,23,true,hierarchy?C.ink:frame);
  box(s,'',84,210,1112,312,hierarchy?'#CCD9F1':'#E8EFF9',22,hierarchy?C.blue:frame,hierarchy?2.8:1.8).name='core-chip-outline';
  T('FPGAチップ',100,214,240,25,hierarchy?22:20,true,hierarchy?C.ink:frame);
  if(hierarchy)T('HDLで実装した回路',440,214,720,25,20,true,C.ink,'right');
  const origin=box(s,'',96,244,719,270,hierarchy?'#F6F8FC':'none',22,edge,1.1);
  origin.line={style:'dashed',fill:provenance?frame:edge,width:provenance?1.8:1.1};
  T('Wallyリポジトリ',105,248,230,24,19,true,provenance?C.ink:faded);
  const gpuOrigin=box(s,'',1020,320,170,122,hierarchy?'#F6F8FC':'none',22,edge,1.1);
  gpuOrigin.line={style:'dashed',fill:provenance?frame:edge,width:provenance?1.8:1.1};
  T('RasterIXリポジトリ',1016,287,184,27,18,true,provenance?C.ink:faded,'center');

  if(mode==='abstract'){
    // Aggregate only the CPU and its peripheral controllers. Retain the
    // positions of the adapter, graphics core and external board components.
    box(s,'CPU Wally と周辺制御回路',112,330,683,100,C.white,30,C.ink,2.3);
    const adapter=B('adapter',840,330,155,100,true,C.pale);
    adapter.line={fill:C.blue,width:3.1};
    T('接続回路',845,347,145,34,25,true,C.blue,'center');
    T('本研究で追加',845,386,145,26,18,true,C.blue,'center');
    B('rasterix',1030,330,150,100,true);
    T('描画・表示\n回路',1035,346,140,66,25,true,C.ink,'center');
    route(s,[[795,380],[840,380]],C.blue,true,3);
    route(s,[[995,380],[1030,380]],C.blue,true,3);
    for(const x of [490,680])route(s,[[x,430],[x,533]],faded,'both',2.4);
    route(s,[[1150,430],[1150,533]],faded,true,2.4);
    route(s,[[1080,430],[1080,481],[752,481],[752,430]],faded,'both',2.7);
    T('基板上の部品',100,533,290,28,20,true,frame);
    for(const [name,label,x] of [['sd-card','SDスロット',435],['ddr-memory','DDR3メモリ',645],['hdmi','HDMI端子',1030]]){
      B(name,x,533,150,32,false);
      T(label,x+4,535,142,26,20,true,faded,'center');
    }
    return;
  }

  const programPath=[[196,330],[196,289],[710,289],[710,330]];
  R(mode==='execute'?[...programPath].reverse():programPath,ddr&&cpu,provenance?'both':true);
  T('プログラムの保存・読出し',365,254,369,29,20,true,col(ddr&&cpu),'center');
  R([[278,380],[440,380]],sd,'both');
  T('読出し要求\n受信データ',291,390,136,51,19,true,col(sd),'center');
  R([[278,351],[349,351],[349,313],[916,313],[916,330]],command,true,3);
  T('描画命令',837,280,160,28,21,true,col(command),'center');
  R([[995,380],[1030,380]],command,true,3);

  B('cpu',112,330,166,100,cpu);
  T('CPU',121,340,148,35,27,true,cpu?C.ink:faded,'center');
  T('Wally',121,377,148,31,26,false,cpu?C.ink:faded,'center');
  B('sd',440,330,155,100,sd);
  T('SD制御',445,348,145,32,25,true,sd?C.ink:faded,'center');
  T('カードと通信',445,385,145,26,19,false,sd?C.ink:faded,'center');
  B('ddr',640,330,155,100,ddr,provenance?C.white:C.pale);
  T('DDR制御',645,348,145,32,25,true,ddr?C.ink:faded,'center');
  T('AMD製IP',645,385,145,26,21,false,ddr?C.ink:faded,'center');
  const adapter=B('adapter',840,330,155,100,command,C.pale);
  if(provenance)adapter.line={fill:C.blue,width:3.1};
  T('接続回路',845,347,145,34,25,true,command?C.blue:faded,'center');
  T('本研究で追加',845,386,145,26,18,true,command?C.blue:faded,'center');
  B('rasterix',1030,330,150,100,graphics);
  T('描画・表示\n回路',1035,346,140,66,25,true,graphics?C.ink:faded,'center');

  R([[490,430],[490,533]],sd,'both',2.4);
  R(mode==='image-read'?[[680,533],[680,430]]:[[680,430],[680,533]],ddr,mode.startsWith('image-')?true:'both',2.4);
  R([[1150,430],[1150,533]],on('image','image-read'),true,2.4);
  const imagePath=[[1080,430],[1080,481],[752,481],[752,430]];
  R(mode==='image-read'?[...imagePath].reverse():imagePath,on('image','image-write','image-read'),mode.startsWith('image-')?true:'both',2.7);
  T(mode==='image-write'?'画像の保存':mode==='image-read'?'読み出した画像':'画像の保存・読出し',845,486,235,26,18,true,col(on('image','image-write','image-read')),'center');
  T(hierarchy?'チップ外の部品':'基板上の部品',100,533,290,28,20,true,hierarchy?C.ink:frame);
  for(const [name,label,x,active] of [['sd-card','SDスロット',435,sd],['ddr-memory','DDR3メモリ',645,ddr],['hdmi','HDMI端子',1030,on('image','image-read')]]) {
    B(name,x,533,150,32,active);
    T(label,x+4,535,142,26,20,true,active?C.ink:faded,'center');
  }
}

export function drawCoreTable(s,api,values,{top=222,height=330,widths=[330,822]}={}) {
  const {C}=api;
  const table=s.tables.add({rows:values.length,columns:values[0].length,left:64,top,width:1152,height,columnWidths:widths,values});
  table.styleOptions={headerRow:false,bandedRows:false,firstColumn:false,lastColumn:false};
  table.borders.assign({fill:C.ink,width:1.0,style:'solid'});
  table.rows[0].height=62;
  for(let r=1;r<values.length;r++)table.rows[r].height=(height-62)/(values.length-1);
  for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++) {
    const cell=table.getCell(r,c);
    cell.fill=r===0?C.heading:r%2===0?C.pale:C.white;
    cell.text.style={typeface:'Yu Gothic',fontSize:r===0?25:26,bold:r===0||c===0,color:r===0?C.white:C.ink,alignment:'left',verticalAlignment:'middle',wrap:'square'};
    cell.text.insets={left:18,right:18,top:10,bottom:10};
  }
  return table;
}
