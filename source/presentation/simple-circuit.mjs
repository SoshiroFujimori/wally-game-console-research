// Editable reduced circuits. A thick line may represent a word or interface.
export function drawFetch(s, a) {
  const {text:T,box:B,polygon:P,route:R,wire:W,C}=a;
  const t=(v,x,y,w,h=32,z=24,b=false,c=C.ink,al='left')=>T(s,v,x,y,w,h,z,b,c,al);
  const b=(v,x,y,w,h,fill=C.white,z=24)=>B(s,v,x,y,w,h,fill,z);
  const w=(...args)=>W(s,...args);
  const r=(...args)=>R(s,...args);
  const p=(...args)=>P(s,...args);
  t('CPUは、命令の番地を指定して、実行する命令を読む',64,135,1152,48,30,true,C.blue);
  b('',126,332,48,145);t('PC',106,484,88,36,28,true,C.ink,'center');
  t('D',130,386,18,28,18);t('Q',151,386,18,28,18);
  p([[139,332],[150,345],[161,332]],'none');w(150,304,150,332,C.ink,false,1.3);
  t('clk',129,273,48,27,20,false,C.ink,'center');
  w(174,403,332,403,C.blue,true,3.0);t('番地 0',207,360,109,35,25,true,C.blue,'center');
  b('',332,291,338,238);t('命令メモリ',367,303,268,43,30,true,C.ink,'center');
  t('A',342,387,32,30,22);t('RD',621,387,43,30,22);
  t('0 : lw x1, 0(x0)',387,365,222,35,24,true,C.blue);
  t('4 : sw x1, 4(x0)',387,424,222,35,24);
  t('機械語を命令名で表記',367,480,267,30,19,false,C.old,'center');
  w(670,403,810,403,C.blue,true,3.0);t('命令',686,358,106,35,25,true,C.blue,'center');
  b('命令を解読\nする回路',810,315,185,180,C.pale,27);
  [['レジスタ番号',347],['即値',403],['制御信号',459]].forEach(([v,y])=>{w(995,y,1054,y,C.ink,true,y===459?1.3:2.6);t(v,1068,y-20,150,40,23);});
  t('次の番地を作る',65,202,250,36,24,true);
  p([[230,234],[286,248],[286,277],[230,291],[230,272],[242,262],[230,253]],C.white);
  t('+',246,246,30,30,26,true,C.ink,'center');
  r([[205,403],[205,250],[230,250]],C.ink,true,2.6);
  t('4',197,274,24,28,22);w(218,276,230,276,C.ink,true,2.6);
  r([[286,262],[306,262],[306,564],[78,564],[78,403],[126,403]],C.ink,true,2.6);
  t('分岐しない32ビット命令の例：次は 0 + 4 = 4 番地',332,565,870,45,26,true);
  t('PC：次に読む命令の番地を保存するレジスタ',64,615,1146,40,26);
}

export function drawLoadStore(s, a, load) {
  const {text:T,box:B,polygon:P,route:R,wire:W,C}=a;
  const active=C.blue, inactive='#B9BEC6';
  const t=(v,x,y,w,h=32,z=24,b=false,c=C.ink,al='left')=>T(s,v,x,y,w,h,z,b,c,al);
  const b=(v,x,y,w,h,fill=C.white,z=24)=>B(s,v,x,y,w,h,fill,z);
  const w=(...args)=>W(s,...args),r=(...args)=>R(s,...args),p=(...args)=>P(s,...args);
  b('',128,298,176,234);
  t('Register\nFile',170,364,121,56,21,true,C.ink,'center');
  [['A1',138,330],['A2',138,404],['A3',138,450],['WD3',138,494],['RD1',252,330],['RD2',252,404]].forEach(([v,x,y])=>t(v,x,y,48,27,18,false,(v==='A2'||v==='RD2')&&load?inactive:(!load&&(v==='A3'||v==='WD3'))?inactive:C.ink));
  t('レジスタ群',128,198,176,34,25,true,C.ink,'center');
  p([[163,298],[173,310],[183,298]],'none');w(173,274,173,298,C.ink,false,1.3);t('clk',148,246,52,25,19,false,C.ink,'center');
  t('WE3',234,300,55,27,18,false,load?active:inactive);t(load?'1':'0',242,248,41,25,20,true,load?active:inactive,'center');w(261,275,261,298,load?active:inactive,true,1.3);
  [[344,'0',true],[418,load?'—':'1',!load],[464,load?'1':'—',load]].forEach(([y,val,on])=>{w(93,y,128,y,on?C.ink:inactive,true,1.8);t(val,57,y-17,32,34,23,false,on?C.ink:inactive,'center');});
  w(304,344,390,344,C.ink,true,3.0);t('0',320,307,49,31,24,true,active,'center');
  p([[390,320],[480,343],[480,418],[390,440],[390,397],[418,381],[390,365]],C.white,C.ink,2.3);
  t('＋',425,350,48,56,37,false,C.ink,'center');t('ALU',382,268,117,35,26,true,C.ink,'center');
  // The wedge denotes immediate generation, not a storage element.
  p([[380,533],[500,511],[500,570],[380,570]],C.white,C.ink,2.2);
  t('extend',390,537,97,28,22,true,C.ink,'center');
  t('即値を作る',370,585,144,31,22,false,C.ink,'center');
  r([[500,549],[520,549],[520,475],[350,475],[350,418],[390,418]],C.ink,true,3.0);
  t(load?'0':'4',350,439,40,31,24,true,active,'center');
  w(480,380,580,380,C.ink,true,3.0);t('番地 '+(load?'0':'4'),482,338,95,34,21,true,active,'center');
  if(load){w(304,418,328,418,inactive);w(553,470,580,470,inactive);}
  else {r([[304,418],[326,418],[326,625],[550,625],[550,470],[580,470]],active,true,3.0);t('書く値 3',354,630,170,30,24,true,active,'center');}
  b('',580,298,174,234);t('Data\nMemory',611,325,126,59,22,true,C.ink,'center');
  t('A',590,365,30,29,20);t('WD',590,454,42,31,20,false,load?inactive:C.ink);t('RD',707,422,40,30,20,false,load?C.ink:inactive);t('WE',653,301,43,29,20,false,load?inactive:C.ink);
  t('データメモリ',580,198,190,35,25,true,C.ink,'center');t(load?'0':'1',654,248,40,25,20,true,load?inactive:active,'center');w(675,275,675,298,load?inactive:active,true,1.3);
  if(load){r([[754,438],[787,438],[787,648],[73,648],[73,508],[128,508]],active,true,3.0);t('読んだ値 3',570,598,200,34,24,true,active,'center');}
  else {w(754,438,780,438,inactive);w(103,508,128,508,inactive);}
  t(load?'① 0 + 0で番地を作る\n\n② 0番地の3を読む\n\n③ x1へ3を保存する':'① 0 + 4で番地を作る\n\n② x1の3を別の線へ出す\n\n③ 4番地へ3を書く',850,290,365,265,26);
  t(load?'初期状態：0番地に3':'読み出した3を、別の番地へ保存',850,580,365,70,24,true);
  t('x0は常に0\nx1はCPU内の保存場所',850,199,365,73,24);
}

// Keep these locations stable while adding the SD path and then graphics.
export function drawConsole(s,a,mode) {
  const {text:T,box:B,polygon:P,route:R,wire:W,C}=a;
  const t=(v,x,y,w,h=32,z=24,b=false,c=C.ink,al='left')=>T(s,v,x,y,w,h,z,b,c,al);
  const b=(v,x,y,w,h,fill=C.white,z=24)=>B(s,v,x,y,w,h,fill,z);
  const w=(...args)=>W(s,...args),r=(...args)=>R(s,...args),p=(...args)=>P(s,...args);
  const bi=(pts,c=C.ink,z=3)=>{r(pts,c,true,z);r([pts[1],pts[0]],c,true,z);};
  const gpu=mode==='graphics', sd=mode!=='bus';
  b('',64,224,551,380,C.pale);
  t('CPU',77,232,100,32,27,true);
  // Fetch and execution share the bus connection but remain distinct paths.
  b('',94,295,31,74);p([[102,295],[109,304],[117,295]],'none');w(109,280,109,295,C.ink,false,1.1);t('PC',89,369,44,25,19,true,C.ink,'center');
  b('命令を解読',190,284,176,55,C.white,23);
  r([[125,320],[160,320],[160,267],[509,267],[509,326]],C.ink,true,2.7);t('命令の番地',330,234,150,27,20);
  r([[483,345],[396,345],[396,311],[366,311]],C.blue,true,2.7);t('読んだ命令',386,352,116,29,18,false,C.blue);
  r([[278,339],[278,359],[165,359],[165,397]],C.ink,true,1.2);
  b('',112,397,130,118);t('regfile',121,444,112,31,24,true,C.ink,'center');
  p([[166,397],[175,407],[184,397]],'none');w(175,383,175,397,C.ink,false,1.1);
  t('RD1',195,407,42,24,15);t('RD2',195,482,42,24,15);
  p([[327,394],[397,412],[397,462],[327,480],[327,450],[344,436],[327,421]],C.white);
  t('ALU',344,422,48,30,23,true,C.ink,'center');
  w(242,420,327,420,C.ink,true,3.0);t(gpu?'B':'基準番地',245,382,82,28,20,false,gpu?C.blue:C.ink,'center');
  p([[291,527],[384,510],[384,547],[291,547]],C.white);t('extend',300,520,78,25,18,true,C.ink,'center');
  r([[384,529],[405,529],[405,491],[306,491],[306,463],[327,463]],C.ink,true,2.6);
  w(397,436,483,436,C.ink,true,3.0);t('番地',408,398,65,30,22,true,C.blue,'center');
  r([[242,496],[267,496],[267,558],[453,558],[453,493],[483,493]],gpu?C.blue:C.ink,true,3.0);t('値 D',319,555,118,27,21,true,gpu?C.blue:C.ink,'center');
  b('バス\n接続',483,326,116,204,C.white,27);
  bi([[599,415],[713,415]],C.ink,3.4);t('番地・値',618,364,87,33,21);t('応答',623,429,80,29,21,false,C.blue);
  w(713,268,713,564,C.ink,false,3.4);t('AHB',674,582,86,34,25,true,C.ink,'center');
  // DDR is always visible. SD and RasterIX are introduced in later slides.
  b('DDR3制御',797,237,169,65,C.white,25);b('DDR3',1018,210,198,120,C.white,27);
  bi([[713,270],[797,270]],C.ink);bi([[966,270],[1018,270]],C.ink);
  t('命令・データ',1019,287,196,30,20,false,C.ink,'center');
  if(sd){
    // A single AHB/APB bridge serves both the existing SD controller and
    // the added graphics port. Avoid suggesting two separate bridges.
    b('APB変換',797,403,125,65,C.white,23);
    bi([[713,435],[797,435]],C.ink);
    bi([[922,435],[957,435]],C.ink);
    w(957,403,957,gpu?536:435,C.ink,false,3.0);
    t('APB',926,350,63,31,22,true,C.ink,'center');
    b('SPI\n制御',990,370,95,65,C.white,22);
    b('SD\nカード',1125,370,91,65,C.white,23);
    bi([[957,403],[990,403]],C.ink);bi([[1085,403],[1125,403]],C.ink);
    if(!gpu){
      t('ゲーム・描画ソフト',1000,440,232,34,21,true,C.blue,'center');
      r([[1202,369],[1233,369],[1233,235],[1216,235]],C.blue,true,3.0);
      t('① Linuxが読み込む',980,156,248,36,23,true,C.blue,'center');
      t('② DDR3の命令を、CPUが読み出して実行',64,627,1152,37,29,true);
    }
  }
  if(gpu){
    b('接続回路\n＋ RasterIX',990,490,226,90,C.pale,25);
    bi([[957,536],[990,536]],C.blue);
    r([[599,415],[713,415],[713,435],[797,435]],C.blue,true,2.2);
    r([[922,435],[957,435],[957,536],[990,536]],C.blue,true,2.2);
    t('0x10080000',1019,592,196,33,24,true,C.blue,'center');
    t('sw x1, 0(x2)　：　番地 B の窓口へ、描画命令の1語 D を書く',64,635,1152,34,26,true,C.blue);
  }else if(!sd){
    t('命令もデータも、外のメモリへアクセスする',767,386,451,90,29,true);
    t('相手から応答が返るまで待つ',767,520,451,61,27);
    t('左の演算回路を残し、メモリへの接続をバスへ延ばす',64,627,1152,37,28,true);
  }
}
