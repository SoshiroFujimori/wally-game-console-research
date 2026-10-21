// Native editable datapath. All simplified stages share the same component coordinates.
// A bundled bus line represents several signals, not an electrical short.
export const GEOMETRY = {
  pc:[80,365,42,80], instruction:[160,335,180,150], registers:[440,325,180,225],
  alu:[720,345,90,120], bus:[900,325,90,225], memory:[1110,335,140,160],
  sd:[1110,515,140,60], card:[1110,598,140,44], graphics:[1110,235,140,65],
  display:[1110,150,140,62]
};

export function drawProgressive(s,a,stage) {
  const {text:T,box:B,polygon:P,route:R,wire:W,C}=a;
  const gray='#B9BEC6', blue=C.blue;
  const t=(v,x,y,w,h=30,z=22,b=false,c=C.ink,al='left')=>T(s,v,x,y,w,h,z,b,c,al);
  const box=(key,label='',fill=C.white,z=23,stroke=C.ink)=> {
    const shape=B(s,label,...GEOMETRY[key],fill,z,stroke,2.2);
    shape.name='stable-'+key;return shape;
  };
  const w=(...args)=>W(s,...args),r=(...args)=>R(s,...args),p=(...args)=>P(s,...args);
  const bi=(pts,c=C.ink)=>{r(pts,c,true,2.8);r([pts[1],pts[0]],c,true,2.8);};
  const load=stage===2, bus=stage>=4, sd=stage>=5, shared=stage>=4, gpu=stage>=6;
  const command=stage===6, pixel=stage>=7, display=stage>=7;
  const storeOnly=stage===3||command;
  const literal=stage<=3, selected=command?'sw x1, 0(x2)':load?'lw x1, 8(x0)':'sw x1, 12(x0)';

  // Slide 2 retains the real load encoding. Later stages show extracted
  // values in a common layout, without claiming a physical bit arrangement.
  const ix=360, iy=199;
  t(load?'命令の32ビット':'命令から取り出す内容',64,193,286,40,23,true);
  const fields=load?
    [['[31:20]','000000001000',216],['[19:15]','00000',90],['[14:12]','010',54],['[11:7]','00001',90],['[6:0]','0000011',126]]:
    [['即値',literal?'12':command?'0':'数値',216],['A1の番号',literal?'0':command?'2':'番号',90],['A2の番号',literal||command?'1':'番号',144],['操作',literal||command?'sw':'lw / sw',126]];
  let fx=ix;
  for(const [label,value,width] of fields){
    B(s,'',fx,iy,width,31,C.white,18,C.ink,1.2);
    t(value,fx+2,iy,width-4,31,18,false,C.ink,'center');
    t(label,fx,iy-25,width,24,load?15:17,false,C.old,'center');
    fx+=width;
  }
  if(load)t('0x00802083',953,198,139,32,19,false,C.old);
  r([[621,230],[621,284],[416,284],[416,370],[440,370]],blue,true,2.1);
  if(load){
    r([[765,230],[765,304],[398,304],[398,475],[440,475]],blue,true,2.1);
    w(416,425,440,425,gray,true,1.5);
  }else{
    r([[738,230],[738,295],[425,295],[425,425],[440,425]],blue,true,2.1);
    w(416,475,440,475,storeOnly?gray:C.ink,true,1.5);
  }
  r([[468,230],[468,260],[687,260],[687,440],[720,440]],blue,true,2.5);
  t(literal||command?'即値 '+(load?'8':command?'0':'12'):'即値',686,469,126,30,23,true,blue);

  // PC and instruction memory stay in place from slide 2 onwards.
  box('pc'); t('D',84,389,15,28,16);t('Q',103,389,15,28,16);
  p([[92,365],[101,376],[110,365]],'none');w(101,341,101,365,C.ink,false,1.2);
  t('clk',77,310,49,27,19,false,C.ink,'center');t('PC',77,452,55,30,26,true,C.ink,'center');
  w(122,405,160,405,blue,true,2.8);
  t(literal?(load?'0':'4'):'命令の番地',literal?125:149,literal?413:510,literal?28:130,30,literal?23:20,true,blue,'center');
  box('instruction');
  t(shared?'命令側の接続':'命令メモリ',166,344,168,34,shared?22:25,true,C.ink,'center');
  t('A',167,390,24,28,18);t('RD',304,390,33,28,18);
  if(!shared){
    t('0: lw x1,8(x0)',188,385,118,29,15,load,load?blue:C.old,'center');
    t('4: sw x1,12(x0)',180,426,139,29,15,!load,load?C.old:blue,'center');
  }else{
    t('バス経由で\n命令を読む',185,394,120,65,20,false,C.ink,'center');
  }
  r([[340,405],[352,405],[352,214],[360,214]],C.ink,true,2.5);
  t('命令',345,435,66,27,20,false,C.ink,'center');
  if(stage>=3){
    p([[180,272],[230,284],[230,304],[180,316],[180,302],[190,294],[180,285]],C.white);
    t('+',197,279,30,30,25,true,C.ink,'center');
    r([[140,405],[140,283],[180,283]],C.ink,true,2.5);
    t('4',147,301,25,28,22);w(172,305,180,305,C.ink,true,2.5);
    r([[230,294],[246,294],[246,260],[50,260],[50,405],[80,405]],C.ink,true,2.5);
    t('PC + 4',61,230,155,28,22,true,blue);
  }

  box('registers');
  t('レジスタ群',489,472,123,30,19,true,C.ink,'center');
  t('Register\nFile',479,385,99,57,22,true,C.ink,'center');
  [['A1',449,355],['A2',449,410],['A3',449,460],['WD3',449,495],['RD1',574,355],['RD2',574,410]].forEach(([v,x,y])=>t(v,x,y,43,29,17,false,(load&&['A2','RD2'].includes(v))||(storeOnly&&['A3','WD3'].includes(v))?gray:C.ink));
  p([[481,325],[490,335],[499,325]],'none');w(490,311,490,325,C.ink,false,1.1);
  t('WE3',568,326,44,25,16,false,storeOnly?gray:blue);
  if(literal)t(load?'1':'0',582,301,22,22,18,true,load?blue:gray,'center');
  w(620,370,720,370,C.ink,true,3);
  t(literal||command?(command?'B':'0'):'基準値',624,337,60,31,literal||command?24:19,true,blue,'center');
  p([[720,345],[810,367],[810,443],[720,465],[720,421],[743,405],[720,387]],C.white,C.ink,2.3).name='stable-alu';
  t('+',757,385,44,42,35,false,C.ink,'center');t('ALU',740,305,75,31,26,true,C.ink,'center');

  // Keep the address, write-data and return-data paths present on every slide.
  const target=bus?900:1110;
  w(810,405,target,405,command||stage===5?blue:C.ink,true,3);
  t(literal?'番地 '+(load?'8':'12'):command?'B':'番地',bus?853:824,366,bus?45:210,31,literal?23:20,true,blue,'center');
  r([[620,425],[649,425],[649,550],[879,550],[879,455],[target,455]],load?gray:command||stage===5?blue:C.ink,true,3);
  t(literal?(load?'':'書く値 3'):command?'書く値 D':'書く値',700,bus?514:555,176,30,23,true,blue,'center');
  if(!bus){
    box('memory');t('データメモリ',1093,293,168,36,24,true,C.ink,'center');
    t('A',1118,390,28,28,18);t('WD',1118,441,39,28,18,false,load?gray:C.ink);t('RD',1211,425,34,28,18,false,load?C.ink:gray);
    t(load?'8番地\n値 3':'12番地\n3を書く',1149,364,82,62,22,true,blue,'center');
    t('WE = '+(load?'0':'1'),1143,459,101,28,17,false,load?gray:blue,'center');
    r([[1250,440],[1262,440],[1262,603],[405,603],[405,510],[440,510]],load?blue:gray,true,3);
    if(load)t('読んだ値 3 → x1',737,571,298,32,25,true,blue,'center');
  }else{
    box('bus','バス\n接続',stage===4?C.pale:C.white,25);
    t('命令',910,332,70,27,18,false,stage===4?blue:C.ink,'center');
    bi([[990,405],[1055,405]],command?blue:C.ink);
    w(1055,gpu?265:405,1055,sd?545:455,C.ink,false,3.2);
    t('バス',995,567,102,33,25,true,C.ink,'center');
    bi([[1055,405],[1110,405]],stage===4||stage===5?blue:C.ink);
    box('memory');
    t('DDR3',1117,345,126,37,25,true,C.ink,'center');
    t(pixel||display?'命令・データ\n画素の色':stage===5?'コピーした\nプログラム':'命令とデータ',1117,405,126,67,19,false,C.ink,'center');
    r([[900,500],[891,500],[891,603],[405,603],[405,510],[440,510]],stage===5?blue:C.ink,true,2.5);
    t('読んだ値',700,609,176,29,21,false,C.ink,'center');
  }
  if(sd){
    bi([[1055,545],[1110,545]],stage===5?blue:C.ink);
    box('sd','SD制御',stage===5?C.pale:C.white,23);
    bi([[1180,575],[1180,598]],stage===5?blue:C.ink);
    box('card','SDカード',C.white,23);
  }
  if(shared){
    // Route the instruction request and response separately; do not join them.
    r([[200,485],[200,570],[851,570],[851,340],[900,340]],stage===4?blue:C.ink,true,2.2);
    r([[900,360],[837,360],[837,585],[325,585],[325,485]],stage===4?blue:C.ink,true,2.2);
  }
  if(gpu){
    box('graphics','接続回路\n＋ RasterIX',stage===6?C.pale:C.white,22,stage===6?blue:C.ink);
    r([[1055,265],[1110,265]],command||stage===5?blue:C.ink,true,3);
    if(command){r([[990,405],[1055,405],[1055,265],[1110,265]],blue,true,3);}
  }
  if(pixel||display){
    r([[1250,274],[1260,274],[1260,355],[1250,355]],pixel?blue:C.ink,true,3);
    t('画素の書込み',1110,302,140,28,18,true,pixel?blue:C.ink,'center');
  }
  if(display){
    box('display','表示回路',C.pale,24);
    r([[1250,465],[1270,465],[1270,181],[1250,181]],blue,true,3);
    r([[1180,150],[1180,138]],blue,true,2.8);
    t('HDMI OUT',1108,111,148,28,21,true,blue,'center');
  }
}