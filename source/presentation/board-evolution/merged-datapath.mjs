import {drawBoard} from './board-circuit.mjs';
import {MEMORY_PORTS_DETAIL} from './memory-ports.mjs';

// One connected functional view preserves the earlier horizontal CPU datapath.
// Named S0/S1/S2 ports connect the decode, target and response-selection logic.
export function drawMergedDatapath(s,a){
  const {text,box,polygon,wire,route,junction,C}=a;
  const T=(v,x,y,w,h=22,z=17,b=false,c=C.ink,align='left')=>text(s,v,x,y,w,h,z,b,c,align);
  const B=(name,label,x,y,w,h,fill=C.white,z=18,stroke=C.ink,thick=1.8)=>{
    const r=box(s,label,x,y,w,h,fill,z,stroke,thick);r.name='merged-'+name;return r;
  };
  const R=(points,c=C.ink,arrow=true,width=2.1)=>route(s,points,c,arrow,width);
  B('board','',64,126,1152,553,C.pale,18,C.ink,1.8);
  T('FPGAボード / Nexys Video',78,128,353,25,21,true);
  T('AD：アドレス　WD：書込みデータ　WE：1 bit　RD：読出しデータ',434,130,760,23,17,true);
  B('chip','',80,158,1006,492,C.chip,18,C.ink,2.1);
  T('FPGAチップ',92,158,165,24,18,true);
  T('CPU・SDカード制御・DDR接続：Wallyリポジトリ',291,158,554,24,17,true);
  T('チップ外',1096,168,111,24,16,true,C.ink,'center');

  const k=.6,xx=x=>92+(x-64)*k,yy=y=>180+(y-206)*k;
  const pts=p=>p.map(([x,y])=>[xx(x),yy(y)]);
  const color=c=>c==='#9FA9B9'?C.ink:c;
  const fit={...a,
    text:(ss,v,x,y,w,h,z,b,c,align)=>text(ss,v,xx(x),yy(y),w*k,h*k,z*k,b,color(c),align),
    box:(ss,v,x,y,w,h,fill,z,stroke,width)=>box(ss,v,xx(x),yy(y),w*k,h*k,
      x===64&&y===206?'none':fill,z*k,x===64&&y===206?C.old:color(stroke),x===64&&y===206?1:width*k),
    polygon:(ss,p,fill,stroke,width)=>polygon(ss,pts(p),fill,color(stroke),width*k),
    wire:(ss,x1,y1,x2,y2,c,arrow,width)=>wire(ss,xx(x1),yy(y1),xx(x2),yy(y2),color(c),arrow,width*k),
    route:(ss,p,c,arrow,width)=>route(ss,pts(p),color(c),arrow,width*k),
    junction:(ss,x,y,c,d)=>junction(ss,xx(x),yy(y),color(c),d*k)};
  drawBoard(s,fit,9,{ports:true,combined:true});
  T('x0 = 0、x2 = DDR3の先頭',109,214,190,20,14,true);

  // Coordinates of the eight retained memory-interface ports after scaling.
  const ix=[175.52,201.44,227.36,253.28],dx=[673.76,699.68,725.6,751.52],endY=410.4;
  const centers=[350,430,510],names=['AD','WD','WE'];
  for(let i=0;i<3;i++){
    const cx=centers[i],w=i===2?1.1:2.1;
    R([[ix[i],endY],[ix[i],439+i*10],[cx-12,439+i*10],[cx-12,480]],C.ink,true,w);
    R([[dx[i],endY],[dx[i],433+i*10],[cx+12,433+i*10],[cx+12,480]],C.ink,true,w);
    polygon(s,[[cx-24,480],[cx+24,480],[cx+12,512],[cx-12,512]],C.white,C.ink,1.6).name='merged-request-'+names[i];
    T('I',cx-19,482,16,17,12,true,C.ink,'center');T('D',cx+3,482,16,17,12,true,C.ink,'center');
    T(names[i],cx-16,514,34,19,15,true,C.blue,'center');
    R([[cx+41,496],[cx+18,496]],C.ink,true,1);
    T('I/D',cx+29,474,29,18,12,true);
  }
  T('要求I/Dを一方ずつ選ぶ',94,512,211,20,14,true);
  T('I：命令側（WE=0、WD未使用）',94,464,201,21,13,true);
  T('D：データ側（読出し／書込み）',94,486,214,21,13,true);

  const rail=[810,830,850],outY=[532,541,550];
  for(let i=0;i<3;i++)R([[centers[i],512],[centers[i],outY[i]],[rail[i],outY[i]],[rail[i],240+i*15]],C.ink,false,i===2?1.1:2.1);

  B('decode','アドレス\nデコーダ',580,470,145,56,C.white,18);
  R([[810,330],[800,330],[800,458],[650,458],[650,470]],C.ink,true,2.1);
  junction(s,810,330,C.ink,4);
  for(let i=0;i<3;i++){
    const y=485+i*16;
    wire(s,725,y,763,y,C.ink,true,1.1);
    T('S'+i,768,y-8,29,18,14,true);
  }

  const targets=[
    {key:'sd',y:225,label:'SDカード制御',sub:'送信 0x13048\n受信 0x1304C',fill:C.white},
    {key:'ddr',y:355,label:'DDRメモリ制御',sub:'AMD製IP',fill:C.ip},
    {key:'adapter',y:485,label:'接続回路',sub:'本研究で追加\n0x10080000',fill:C.white}];
  targets.forEach((d,i)=>{
    const c=d.key==='adapter'?C.blue:C.ink;
    B(d.key,'',906,d.y,160,70,d.fill,18,c);
    T(d.label,942,d.y+5,116,23,d.key==='adapter'?20:16,true,c,'center');
    T(d.sub,942,d.y+31,116,34,13,true,C.ink,'center');
    for(let q=0;q<3;q++){
      const y=d.y+15+q*15;
      wire(s,rail[q],y,906,y,C.ink,true,q===2?1.1:2.1);
      if(i<2)junction(s,rail[q],y,C.ink,4);
      T(names[q],909,y-8,29,16,12,true);
    }
    T('RD',909,d.y+52,28,16,12,true);
    wire(s,1014,d.y-18,1014,d.y,C.ink,true,1.1);
    T('S'+i,977,d.y-29,35,20,15,true);
    R([[906,d.y+60],[898-i*16,d.y+60],[898-i*16,578+i*14],[630,578+i*14]],C.ink,true,2.1);
  });
  T('0x13000–0x13FFF',908,298,159,23,13,false,C.ink,'center');
  T('0x80000000–0x9FFFFFFF',894,428,184,23,12,false,C.ink,'center');

  polygon(s,[[630,565],[585,576],[585,608],[630,619]],C.white,C.ink,1.8).name='merged-read-selector';
  T('RD\n選択',588,576,36,34,14,true,C.ink,'center');
  T('S0〜S2',647,612,74,18,14,true);
  R([[646,622],[608,622],[608,613]],C.ink,true,1.1);
  R([[585,592],[560,592],[560,632],[86,632],[86,442],[ix[3],442],[ix[3],endY]],C.blue,true,2.1);
  R([[560,632],[dx[3],632],[dx[3],endY]],C.blue,true,2.1);
  junction(s,560,632,C.blue,4);
  T('RDを両接続口へ返す',571,654,238,19,13,true,C.blue);

  R([[1015,555],[1015,590]],C.blue,true,2.1);
  T('描画命令の値',907,562,102,23,14,true,C.blue);
  B('rasterix','描画・表示回路',906,590,160,44,C.white,18,C.blue);
  T('既存回路 RasterIX',906,635,162,14,11.5,true,C.blue,'center');
  R([[1066,612],[1078,612],[1078,330],[1050,330],[1050,355]],C.blue,'both',2.1);
  T('画像',1053,332,32,18,14,true,C.blue);
  B('sd-slot','SDカード\nスロット',1115,225,87,70,C.white,15);
  B('ddr-chip','DDR3\nメモリ',1115,355,87,70,C.white,17);
  B('hdmi','HDMI\nOUT',1115,590,87,44,C.white,15);
  R([[1066,260],[1115,260]],C.ink,'both',2.1);
  R([[1066,390],[1115,390]],C.ink,'both',2.1);
  R([[1066,621],[1115,621]],C.blue,true,2.1);
  T('命令・データ\n画像を保存',1105,432,108,39,13,false,C.ink,'center');

  const examples=[
    'lw x1,8(x2)：AD=x2+8、WE=0、RDをx1へ',
    'sw x1,12(x2)：AD=x2+12、WD=x1、WE=1',
    'SD受信値を読む → DDR3のdst[i++]へ書く',
    '描画：sw x1,0(x2)、x2=0x10080000'];
  examples.forEach((v,i)=>T(v,102,553+i*19,439,19,15,i<2,C.ink));
  T('SD読出しとDDR書込みを交互に繰り返す',102,654,445,19,13,true);
}

export function addMergedDatapath({slide,api,outline,DDCA,RVSOC,PRODUCT}){
  const s=slide('回答用：命令実行から周辺回路への接続',0,
    'PCが命令の番地を出し、命令側の接続口Iから読んだ命令を解読します。レジスタ群とALUが読書きする番地と値を用意し、データ側の接続口Dから要求します。IとDの要求は一方ずつ選び、アドレスデコーダでSDカード制御、DDRメモリ制御、描画用の接続回路を選びます。戻りのデータも対応する回路から選び、CPUへ返します。SD受信値の読出しとDDR3への書込みを繰り返すとプログラムをコピーできます。ゲームは描画命令の値を書き込み、RasterIXがDDR3へ画像を保存して表示します。',
    DDCA+' Chapter 7. '+RVSOC+' Chapters 9, 20, 23. '+PRODUCT+' console/src/ebu/ebu.sv; console/src/mmu/adrdecs.sv; console/src/uncore/uncore.sv; console/fpga/zsbl; console/fpga/src/rasterix_apb.sv; console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl.',
    'CPUの命令実行\nPC、命令メモリの箱、レジスタ群、ALU、データメモリの箱は、先の単純なCPUの横並びの配置を保つ。命令メモリとデータメモリの箱は、ここでは外部への接続口I/Dを表す。実機のローカルIROMやDTIMを有効にしたという意味ではない。実際のCPU Wallyにはパイプライン、キャッシュ、IFU、LSUなどがある。図は読書き機能を対応づけたもので、実機RTLと等価な回路図や同時刻の信号値を示す図ではない。\nPC+4は分岐しない32ビット命令を順に読む例である。命令からA1、A2、A3のレジスタ番号、即値、操作の種類を取り出す。A1/A2は読出し先の番号、RD1/RD2はそのレジスタに保存された値である。rdはlwの書込み先番号で、A3へ入る。WD3はレジスタへ書く値、WE3はその許可である。x0の値は常に0。lwでは基準値と即値の和をADへ出し、返った値をレジスタへ保存する。swでは同様にADを求めるが、RD2の値をWDへ送り、レジスタへの書込みは行わない。命令のビット配置、即値生成、操作の解読と書込み許可の生成はまとめている。\n図下部のlw x1,8(x2)とsw x1,12(x2)ではx2=0x80000000を例とし、それぞれDDR3の0x80000008と0x8000000Cへアクセスする。描画用の例ではx2を0x10080000に準備し直す。各行は独立した使用例であり、同じ瞬間に実行される値ではない。\n\n接続先と応答の選択\n'+MEMORY_PORTS_DETAIL+' S0、S1、S2の同名ラベルは、それぞれ同じ選択信号への接続を示す。長い制御線を図全体に重ねる代わりに、デコーダの出力、接続先の入力、RD選択の入力へ同名を付ける。要求選択のI/Dも三つのMUXに共通する。WEは1ビットで、有効な要求中の0を読出し、1を書込みとして使う。\n\nSDコピーと描画命令\n送信用レジスタ0x13048へ読出し要求を表す数値を書き、受信用レジスタ0x1304Cから届いた値を読む。CPUはこの値をDDR3の保存先へ書く。受信用レジスタのアドレスは同じまま、DDR3の保存先を1バイトずつ進める。下部のdstはDDR3の保存先、iはバイト位置を示す概念表現である。実機のSPI初期化、待ち、受信の下位8ビットの取り出し、ファイルやOSの処理は集約する。最初の起動処理はBoot ROM側から始まり、空のDDR3の命令を読み始める説明ではない。SDからDDRへ直接転送する専用DMAを新規追加したという主張ではない。\nCPUが実行するswという命令と、描画回路へ送るデータとしての命令語は別のものである。OpenGL互換ライブラリが描画命令の列を作り、CPUが対応する窓口へ書き込む。OpenGLの呼出し一回がsw一回になるとは限らない。0x10080000は通常の命令語の窓口で、末尾通知、待ち、OS上のアドレス対応付けは省略する。\n\n画像の保存と表示\nRasterIXの描画回路は内部作業領域で描画し、結果をDDRメモリ制御を通して外部DDR3へ保存する。表示回路は画像を読み、映像タイミングに合わせてHDMI端子へ出す。描画・表示本体はいずれも公式RasterIXリポジトリから取得し、表示本体は同梱dvi_framebufferを利用する。共有DDRの仲裁や表示先切替、クロック変換は集約する。図の画像の双方向線は、保存・読出しに用いる複数の要求と応答をまとめたものである。画像とプログラムの領域を重ねる意味ではない。');
  drawMergedDatapath(s,api);

  s.hidden=true;outline.at(-1).backup=true;
}
