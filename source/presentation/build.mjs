import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { drawWallyCircuit } from './wally-circuit.mjs';

const [root, workspace] = process.argv.slice(2);
if (!root || !workspace) throw new Error('Usage: build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(process.env.RUNTIME_NODE_MODULES, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(process.env.PRESENTATION_SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
await fs.mkdir(path.join(workspace, 'final'), { recursive: true });
await fs.mkdir(path.join(workspace, 'slides'), { recursive: true });
const P = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { ink:'#231F20', blue:'#1572C3', pale:'#E5EBF8', chip:'#CCD9F1', ip:'#77A3DC', old:'#777777', heading:'#0078BA', white:'#FFFFFF' };
const font='Yu Gothic', latinFont='Arial'; let serial=0; const outline=[];
function text(s,value,x,y,w,h,size=28,bold=false,color=C.ink,align='left') {
  const sh=s.shapes.add({geometry:'textbox',name:'text-'+(++serial),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  sh.text=value; sh.text.style={typeface:/^[\x00-\x7f\s]+$/.test(value)?latinFont:font,fontSize:size,bold,color,alignment:align,verticalAlignment:'middle',wrap:'square'}; sh.text.insets=0; return sh;
}
function box(s,label,x,y,w,h,fill=C.white,size=27,stroke=C.ink,thick=1.7) {
  const sh=s.shapes.add({geometry:'rect',name:'block-'+(++serial),position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:thick}});
  if(label) text(s,label,x+8,y+6,w-16,h-12,size,true,stroke,'center'); return sh;
}
function polygon(s,pts,fill=C.white,stroke=C.ink,width=1.7) {
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),l=Math.min(...xs),t=Math.min(...ys),w=Math.max(1,Math.max(...xs)-l),h=Math.max(1,Math.max(...ys)-t);
  return s.shapes.add({geometry:'custom',name:'circuit-'+(++serial),position:{left:l,top:t,width:w,height:h},fill,line:{fill:stroke,width},customPaths:[{width:w,height:h,commands:[{moveTo:{x:pts[0][0]-l,y:pts[0][1]-t}},...pts.slice(1).map(p=>({lineTo:{x:p[0]-l,y:p[1]-t}})),{close:{}}]}]});
}
function wire(s,x1,y1,x2,y2,color=C.ink,arrow=false,width=2.4) {
  const l=Math.min(x1,x2),t=Math.min(y1,y2),w=Math.max(1,Math.abs(x2-x1)),h=Math.max(1,Math.abs(y2-y1));
  s.shapes.add({geometry:'custom',name:'wire-'+(++serial),position:{left:l,top:t,width:w,height:h},fill:'none',line:{fill:color,width},customPaths:[{width:w,height:h,commands:[{moveTo:{x:x1-l,y:y1-t}},{lineTo:{x:x2-l,y:y2-t}}]}]});
  if(arrow) {const len=Math.hypot(x2-x1,y2-y1),dx=(x2-x1)/len,dy=(y2-y1)/len;polygon(s,[[x2,y2],[x2-10*dx+4*dy,y2-10*dy-4*dx],[x2-10*dx-4*dy,y2-10*dy+4*dx]],color,color,1);}
}
function route(s,pts,color=C.ink,arrow=true,width=2.4) {pts.slice(1).forEach((p,i)=>wire(s,...pts[i],...p,color,arrow&&i===pts.length-2,width));}
function foot(s,value) {
  const n=P.slides.items.length;
  if(n===1||n===12){text(s,value,64,665,1110,30,16,false,C.old);return;}
  const captionY=n===9?187:665;
  text(s,(n===9?'表 ':'図 ')+n,64,captionY,63,30,17,true,C.heading);
  text(s,value,131,captionY,1028,30,16,false,C.ink);
}
function slide(title,seconds,narration,source,detail) {
  const s=P.slides.add();s.background.fill=C.white;
  const n=P.slides.items.length;
  if(n===1){
    text(s,title,64,40,1038,78,38,true);
    text(s,'1',1109,20,106,118,106,true,C.heading,'right');
  }else{
    text(s,String(n),64,33,59,82,38,true,C.ink);
    text(s,title,132,33,1084,82,38,true,C.heading);
  }
  text(s,String(P.slides.items.length),1184,665,32,30,18,false,C.old,'right');
  s.speakerNotes.text=`説明時間の目安：${seconds}秒\n\n${narration}\n\n出典：${source}\n\n補足説明：${detail}`;
  outline.push({title,seconds,narration,source,detail});return s;
}
function table(s,values,x,y,widths,rowHeights,size=27) {
  const t=s.tables.add({rows:values.length,columns:widths.length,left:x,top:y,width:widths.reduce((a,b)=>a+b,0),height:rowHeights.reduce((a,b)=>a+b,0),columnWidths:widths,values});
  t.styleOptions={headerRow:false,bandedRows:false};t.borders.assign({style:'solid',fill:'none',width:0});
  values.forEach((row,r)=>{t.rows[r].height=rowHeights[r];row.forEach((v,c)=>{const cell=t.getCell(r,c);cell.fill=r===0?C.heading:r%2===0?C.pale:C.white;cell.text.style={typeface:font,fontSize:r===0?size-1:size,bold:r===0,color:r===0?C.white:C.ink,verticalAlignment:'middle',alignment:c===0?'center':'left',wrap:'square'};});});
  const right=x+widths.reduce((a,b)=>a+b,0);
  let ruleY=y;wire(s,x,ruleY,right,ruleY,C.ink,false,1.8);
  rowHeights.forEach((height)=>{ruleY+=height;wire(s,x,ruleY,right,ruleY,C.ink,false,1.2);});
  wire(s,x+widths[0],y,x+widths[0],ruleY,C.ink,false,1.8);
  return t;
}

// Keep register, ALU and data-port positions fixed on slides 2 through 5.
function datapath(s, mode) {
  const load=mode==='load', bus=mode==='bus'||mode==='peripherals', peripherals=mode==='peripherals';
  const active=C.blue, inactive='#B9BEC6';
  box(s,'',128,298,176,234,C.white);
  text(s,'Register\nFile',175,364,114,45,20,true,C.ink,'center');
  [['A1',138,330],['A2',138,404],['A3',138,450],['WD3',138,494],['RD1',252,330],['RD2',252,404],['WE3',202,300]].forEach(([v,x,y])=>text(s,v,x,y,48,27,18,false,(v==='A2'||v==='RD2')&&load?inactive:(!load&&(v==='A3'||v==='WD3'||v==='WE3'))?inactive:C.ink));
  text(s,'レジスタ',128,207,176,34,25,true,C.ink,'center');
  text(s,'RegWrite = '+(load?'1':'0'),128,241,205,28,21,false,load?active:inactive);
  wire(s,224,272,224,298,load?active:inactive,true,1);
  const input=(port,y,value,on=true)=>{wire(s,103,y,128,y,on?C.ink:inactive,true,1.6);text(s,value,58,y-17,43,34,23,false,on?C.ink:inactive,'center');};
  input('A1',344,bus?'2':'0');input('A2',418,load?'—':'1',!load);input('A3',464,load?'1':'—',load);
  wire(s,304,344,390,344,C.ink,true);text(s,bus?'B':'0',322,310,47,31,23,true,active,'center');
  polygon(s,[[390,320],[480,343],[480,418],[390,440],[390,397],[418,381],[390,365]],C.white);
  text(s,'＋',425,350,48,56,37,false,C.ink,'center');
  text(s,'ALU（加算）',349,273,166,35,23,true,C.ink,'center');
  box(s,load?'0':bus?'0':'4',380,520,120,52,C.white,28);
  text(s,'即値',380,482,120,32,23,false,C.ink,'center');
  route(s,[[380,546],[350,546],[350,418],[390,418]],C.ink,true);
  text(s,'命令の指定',376,574,132,26,18,false,C.old,'center');
  wire(s,480,380,580,380,C.ink,true);
  text(s,bus?'番地':'番地 '+(load?'0':'4'),484,342,92,34,21,true,active,'center');
  if(load){wire(s,304,418,328,418,inactive);wire(s,553,470,580,470,inactive);}
  else{
    route(s,[[304,418],[326,418],[326,602],[550,602],[550,470],[580,470]],active,true);
    text(s,bus?'書く値 D':'書く値 3',352,608,178,32,24,true,active,'center');
  }
  if(!bus){
    box(s,'',580,298,174,234,C.white);
    text(s,'データ\nメモリ',607,325,127,65,25,true,C.ink,'center');
    text(s,'A',590,365,30,29,20);text(s,'WD',590,454,42,31,20,false,load?inactive:C.ink);text(s,'RD',711,423,39,29,20,false,load?C.ink:inactive);text(s,'WE',663,300,39,27,18);
    text(s,'MemWrite = '+(load?'0':'1'),580,241,230,28,21,false,load?inactive:active);
    wire(s,679,272,679,298,load?inactive:active,true,1);
    route(s,[[754,438],[786,438],[786,646],[74,646],[74,508],[128,508]],load?active:inactive,true);
    text(s,load?'読んだ値 3':'この命令では保存しない',load?324:365,load?607:646,load?235:380,load?33:20,load?24:17,false,load?active:inactive,'center');
  }else{
    box(s,'',580,298,174,234,C.pale);
    text(s,'データ側の\nバス接続',598,308,140,60,24,true,C.ink,'center');
    text(s,'番地',590,369,55,30,20);text(s,'値',590,457,40,30,20);text(s,'完了',701,493,49,28,18,false,active);
    text(s,'書込みを指定',580,241,190,28,21);wire(s,679,272,679,298,C.ink,true,1);
    wire(s,103,508,128,508,inactive);wire(s,754,438,773,438,inactive);

    if(!peripherals){
      [[344,'番地 A（HADDR）'],[418,'書く値 D（HWDATA）'],[470,'書込み（HWRITE）']].forEach(([y,v])=>{
        wire(s,754,y,1015,y,C.ink,true,y===470?1:y===344?1.6:2.4);text(s,v,761,y-36,247,30,22,false,C.ink,'center');
      });
      wire(s,1015,508,754,508,active,true,1);
      box(s,'',1015,298,200,234,C.white);
      text(s,'DDR3\nコントローラ\n＋メモリ',1032,327,167,136,25,true,C.ink,'center');
      text(s,'完了 HREADY',1019,490,192,34,21,false,active,'center');
      text(s,'相手から完了が返るまで待つ',782,567,434,58,27,true);
    }else{
      text(s,'番地に応じて接続先を選ぶ',786,190,430,41,26,true);
      box(s,'AXI変換\nDDR3制御',805,256,180,73,C.white,25);
      box(s,'DDR3',1041,266,175,53,C.white,28);
      bundle(s,[[754,344],[782,344],[782,293],[805,293]]);
      bundle(s,[[985,293],[1041,293]]);
      text(s,'実行中の命令・データ',804,345,412,37,23,false,C.ink,'center');
      box(s,'APB変換\nSPI制御',805,416,180,73,C.pale,25);
      box(s,'SDカード',1041,426,175,53,C.white,25);
      bundle(s,[[754,418],[782,418],[782,453],[805,453]],active);
      bundle(s,[[985,453],[1041,453]],active);
      text(s,'保存してあるプログラム',804,506,412,37,23,false,C.ink,'center');
      text(s,'SDからDDR3へ読み込み、実行する',617,565,599,48,26,true);
    }
  }
}

// Source-derived functional diagram. Native slide objects stay editable.
function dot(s,x,y,color=C.ink) {
  s.shapes.add({geometry:'ellipse',name:'junction-'+(++serial),position:{left:x-2.8,top:y-2.8,width:5.6,height:5.6},fill:color,line:{fill:color,width:0}});
}
function bundle(s,pts,color=C.ink) {
  route(s,pts,color,true);
  wire(s,...pts[1],...pts[0],color,true);
}
function mux(s,x,y,w,h,label='',color=C.ink) {
  polygon(s,[[x,y],[x+w,y+6],[x+w,y+h-6],[x,y+h]],C.white,color,1.5);
  if(label)text(s,label,x-14,y+h+3,w+28,22,14,false,color,'center');
}
async function wallyboard(s,expanded=false) {
  text(s,expanded?'APBの追加位置に、描画回路を接続する':'本研究では、このAPB接続へ描画回路を追加する',64,126,1152,42,29,true,C.blue);
  text(s,'Nexys Video',45,193,265,35,25,true,C.ink,'center');
  const photo=process.env.PRESENTATION_BOARD_PHOTO||path.join(root,'source/presentation/assets/nexys-video.png');
  s.images.add({blob:await fs.readFile(photo),contentType:'image/png',alt:'Digilent Nexys Video。中央の放熱器の下がFPGA',fit:'contain',position:{left:45,top:231,width:265,height:229}});
  box(s,'',158,307,46,44,'none',16,C.blue,2);
  route(s,[[204,329],[294,329],[294,407],[326,407]],C.blue,true,1.7);
  text(s,'FPGA',45,475,265,34,27,true,C.blue,'center');
  text(s,'放熱器の下にあるチップ',45,511,265,30,19,false,C.ink,'center');
  text(s,'HDLで回路を記述し、\n論理素子と配線へ実装',45,563,265,63,23,true,C.ink,'center');
  text(s,'写真：Digilent',45,641,265,24,15,false,C.old,'center');
  drawWallyCircuit(s,{text,box,polygon,route,wire,dot,C},expanded);
}

const DDCA='Harris, S. L. and Harris, D., Digital Design and Computer Architecture: RISC-V Edition (2021), Chapter 7. Official figure source: https://pages.hmc.edu/harris/ddca/ddcarv.html (DDCArv_Figures.zip).';
const RVSOC='Harris et al., RISC-V System-on-Chip Design, Chapters 7–13, 20, 22–23. Official figure source: https://pages.hmc.edu/harris/ddca/rvsocd.html (RVSoCD_figs.zip).';
const PHOTO='Digilent, Nexys Video product photograph: https://digilent.com/shop/nexys-video-amd-artix-7-fpga-trainer-board-for-multimedia-applications/ . Board identification: Nexys Video Reference Manual (2020), pp.3-4. Image copyright Digilent.';
const PRODUCT='Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl.';
const E6='docs/thesis/再現資料/実験記録/E6/fresh-product/qualification/qualification.json; docs/thesis/再現資料/実験記録/E6/report/results/video/validation.json. Photograph: docs/thesis/figs/fifo-study-game.png.';

let s=slide('FPGAを用いた二次元ゲーム機の設計と実装',10,
  '公開CPUのWallyへ描画回路をつなぎ、ブロック崩しを動かしました。今日はCPUの1回の書込みを追い、描画命令をどう届けるかを説明します。',
  `${DDCA} ${RVSOC} ${PRODUCT}`,
  '目的は、Wallyを拡張する学習者が参照できる接続設計と実機の確認例を示すこと。学習効果の実験は行っていない。DDCAからWallyまでのCPUを本研究で新たに設計した、という意味ではない。');
text(s,'CPUの1回の書込みを、\n描画回路へ届ける',64,155,1140,156,50,true);
text(s,'Wallyを拡張する学習者に向けた、ゲーム機の設計例',64,345,1152,53,29);
const labels=['メモリへの書込み','番地で相手を選ぶ','受渡しを変換','実機で画面を確認'];
labels.forEach((label,i)=>{const x=64+i*299;box(s,label,x,477,248,65,i===3?C.pale:C.white,26);if(i<3)wire(s,x+248,509,x+287,509,C.ink,true);});
text(s,'既存の教科書・公開設計',64,562,547,44,26,false,C.old,'center');
text(s,'本研究で接続を設計・検証',662,562,554,44,26,true,C.ink,'center');
foot(s,'DDCA：Digital Design and Computer Architecture　　RVSOC：RISC-V System-on-Chip Design');

s=slide('lw：メモリの値をレジスタへ読む',30,
  'まずCPUの読み書きだけを取り出します。x0は常に0を読むレジスタで、データメモリの0番地に3があるとします。ALUが0足す0で番地を作り、メモリから3が返ります。下の青い線で戻し、CPU内のx1へ保存します。次もこの図を使います。',
  DDCA+' Figure 7.8, redrawn as an editable reduced datapath.',
  'DDCA図7.8に対応する主要な読み書きのブロックを位置と配線で示す。A1は読出すレジスタ番号0、A3は書込むレジスタ番号1、RD1はx0から読んだ値0、WD3はx1へ保存する値3。Aはデータメモリの番地、RDは読出し値。即値ブロックは命令のフィールドから即値を作り符号拡張する処理をまとめたもの。命令からA1・A3・即値・制御を作る配線、PC、命令メモリ、PC+4、クロック線は省略。MemWrite=0なのでデータメモリは書き換えない。薄い灰色は今回使わないポート。32ビットの値の線を1本で表している。これはDDCAの単一サイクルlwの説明で、Wally全体のRTL配線図ではない。');
text(s,'lw x1, 0(x0)　：　番地 0 + 0 の値を、x1へ読む',64,136,1152,49,29,true,C.blue);
datapath(s,'load');
text(s,'x0：常に0\nx1：CPU内の保存場所',850,227,365,86,25);
text(s,'① 0 + 0で番地を作る\n\n② 0番地の3を読む\n\n③ x1へ3を保存する',850,340,365,248,26);
text(s,'初期状態：0番地に3',850,600,365,39,25,true);
foot(s,'DDCA 図7.8を簡略化して描き直し。A：番地／番号　RD：読出し値　WD：書込み値　WE：書込許可');

s=slide('sw：レジスタの値をメモリへ書く',30,
  '次は同じ図でswを見ます。x0の0に即値4を足すので、メモリへ渡す番地は4です。一方、x1から読んだ3は新しい青い線を通って、メモリの書込み値へ届きます。MemWriteを1にして保存します。今度はレジスタへ値を戻す必要がないので、RegWriteは0です。',
  DDCA+' Figure 7.12 and the store datapath in §7.3.2.',
  'sw x1,4(x0)でrs1=0、rs2=1、S形式の即値=4。Register FileのA1=0、A2=1、RD1=0、RD2=3となる。ALUはRD1+即値で4を作る。RD2はALUへ加える値ではなくデータメモリのWDへ渡す。RegWrite=0でA3とWD3は保存に使われない。swの命令ビット[11:7]はrdではなく即値の一部なので、A3を宛先レジスタ番号として解釈しない。A3は図で未使用を示すダッシュにしている。MemWrite=1でメモリへ書く。クロック立上りで保存する。図は今回必要な経路のみで、バイト許可・取消し等の条件を一般のRAM実装にそのまま置換できるという意味ではない。');
text(s,'sw x1, 4(x0)　：　番地 0 + 4 へ、x1の3を書く',64,136,1152,49,29,true,C.blue);
datapath(s,'store');
text(s,'番地を作る線は同じ\n0 + 4 = 4',850,253,365,89,28,true);
text(s,'追加する経路\nx1の値 → メモリのWD',850,388,365,89,26,true,C.blue);
text(s,'メモリへ保存：許可1\nレジスタへ保存：許可0',850,527,365,91,25);
foot(s,'DDCA 図7.12のsw経路を抜粋。青線が今回書く値の経路。薄い灰色の帰り道は使わない');

s=slide('メモリへの読み書きを、外部バスへ延ばす',30,
  '左のレジスタとALUを残し、メモリだった位置へバス接続を置きます。番地、書く値、書込みの指定を外へ出せば、外部メモリを操作できます。相手の準備ができていなければ待ち、完了が返ると、この転送を終えます。',
  'RVSOC Chapter 9, §9.5.1–9.5.4. '+PRODUCT+' console/src/lsu/lsu.sv; console/src/ebu/ebu.sv; console/fpga/src/fpgaTopNexysVideo.sv.',
  '読み書きの外部接続だけを説明する模式図。命令読出し経路、EBU、段間レジスタ、キャッシュ、MMUは簡略図では省略する。これらは実機に存在し、6枚目の詳細図で主要な位置を示す。sw x1,0(x2)で基準番地B、書く値Dを使う例で、ALUの仮想番地とバス上の物理番地Aは異なり得る。バス側はHADDR、HWDATA、HWRITEおよびHREADYを代表として示すが、これらの信号がすべて同じ相で有効という意味ではない。実機のDDR3経路はAHBからAXIへの変換とクロック領域間の接続も含む。これを右の箱にまとめた。ここでの完了はCPUの転送完了であり、ゲーム画面の生成完了ではない。');
text(s,'sw x1, 0(x2)　：　基準番地B + 0 へ、値Dを書く',64,136,1152,44,28,true,C.blue);
datapath(s,'bus');
foot(s,'読み書きの経路だけを表示。バス上のAは物理番地。キャッシュ・番地変換・仲裁等は省略');

s=slide('DDR3とSDカードを、別の接続先として扱う',35,
  '同じバスへ、用途の異なる機器をつなぎます。DDR3側は、実行中の命令やデータを読み書きする経路です。SDカード側は、APBからSPI制御回路を操作する経路で、プログラムを保存してあります。Linuxは必要な内容をSDカードからDDR3へ読み込み、CPUが実行します。このAPBへのつなぎ方を、描画回路の追加にも使います。',
  'RVSOC Chapter 9 and §23.2.1. '+PRODUCT+' console/src/uncore/uncore.sv; console/linux/devicetree/wally-nexysvideo.dts; console/config/derivlist.txt.',
  '簡略図ではEBUと命令読出しを省く。右の各線は要求、データ、応答などの信号群をまとめた接続であり、一本の電線ではない。範囲比較による接続先の選択は既存uncoreのアドレスデコードとAHB/APBブリッジが行う。DDR3は0x80000000から512 MiB。SDカード制御はspi_apbの2個目のインスタンスで、SDC_BASE=0x00013000。カード自体をRAMのように直接ロード／ストアするのではなく、制御回路のレジスタを操作してSPI転送を進める。デバイスツリーのspi@13000配下にmmc-spi-slotを定義している。FPGA派生設定でSDCを有効にする。ユーザープログラムのコードやデータはOSが必要に応じてDDR3へ読み込む。すべてのファイルを一度にコピーすることや、CPUがSDカードから直接命令フェッチすることを意味しない。SDカードとDDR3はNexys Video基板上でFPGAチップの外にあり、制御回路はFPGA内。');
text(s,'用途に合った制御回路を、CPUのバスにつなぐ',64,136,1152,44,29,true,C.blue);
datapath(s,'peripherals');
foot(s,'SDカードにはSPIで接続。図の線は信号群。DDR3・SD制御回路は既存実装を利用');

s=slide('FPGA内の回路と、本研究で追加する位置',45,
  '本研究では、この右側のAPB接続へ描画回路を追加します。ここまでの簡略図を、実際のWallyに対応させた図です。青く塗ったレジスタ、ALU、バス接続が、先ほど説明した部分です。その間には、値を選ぶMUXや、途中の値を保存するレジスタが入ります。MMUやキャッシュもあります。左の写真の放熱器の下がFPGAです。右の回路をHDLというコードで記述し、このチップの論理素子と配線で実現します。DDR3とSDカードはチップの外です。',
  'RVSOC Chapters 7–11 and 23; DDCA Chapter 7. '+PHOTO+' '+PRODUCT+' console/src/ieu/datapath.sv; console/src/ifu/ifu.sv; console/src/lsu/lsu.sv; console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv.',
  '固定した製品RTLに基づく主要経路の回路図。RVSOC図7.11の信号線・MUX・段間レジスタの表現、図9.20のHDL階層、図23.2のFPGAと外部部品の区別を参考にした。全ゲートの回路図でも、配置配線後の物理配置図でもない。外枠fpgaTopはFPGA内に実装する回路を示す。wallypipelinedsocの中をuncoreとwallypipelinedcoreに分け、CPU内にifu、ieu/datapath、lsu、ebuを置く。青く塗ったregfile、extend、alu、ahbcacheinterface、adrdecs、ahbapbbridge、spi_apbとDDR3側の接続は、前の簡略図で説明した機能に対応する。命令の実行状態やクロック領域を表す配色ではない。追加予定のEXT_IOはWallyの外部APBポートであり、既存のuncore内部にRasterIX本体を置く意味ではない。\n\n小さい台形は値を選ぶMUX。細長い白い箱はクロックで値を保存するレジスタ。datapath.svのregfile、extend、RD1EReg、RD2EReg、ImmExtEReg、faemux、fbemux、srcamux、srcbmux、comparator、alu、IEUResultMReg、WriteDataMReg、IFResultWReg、resultmuxWに対応する主要経路を示す。MMUとキャッシュは機能名の箱にまとめ、その内部のTLB・タグ比較・状態機械は展開しない。ALUのIEUAdrEはlsu.svのAddressMRegを通り、MMUで番地変換される。MMIOはD-cacheを通らずahbcacheinterfaceへ進む。図のPCE入力は命令側の段間経路から来るが、その配線は省略。ALU結果の選択、浮動小数点結果との選択、サブワードの抽出、例外・分岐予測、HPTW、全制御線なども省略している。resultmuxWの5入力のうち整数計算とロードの経路を描き、その他は省略記号にまとめた。転送MUXは本来3入力で、IFResultMからの経路を省略した。レジスタの保持・取消しはhazardからの信号群にまとめ、全てのレジスタのen・clearを同じ1本へつないだという意味ではない。\n\nuncoreでは番地をadrdecsで判定し、AHB/APBブリッジと対象の周辺回路を選ぶ。SDカードのSPI制御回路はspi_apbのsdcインスタンス。外部DDR3の制御やAHB/AXI変換・クロック接続はfpgaTop側にある。機器間の双方向線は要求・データ・応答をまとめた接続。前の簡略図で説明した機能と複数のHDLモジュールは、必ずしも一対一に対応しない。\n\n写真はDigilentのNexys Video製品写真。写真の青枠は放熱器の位置で、その下にArtix-7 FPGAがある。写真から右図への線は拡大対象の対応を示し、電気的な配線ではない。メーカー写真を本研究で撮影した実機写真として扱わない。HDLをゲームプログラムとしてCPUで逐次実行するのではなく、合成・配置配線を経てFPGAのLUT・フリップフロップ・BRAM等へ回路を実装する。');
await wallyboard(s,false);
foot(s,'青い塗り：前の簡略図に対応する回路。白い細長い箱：レジスタ。内部の物理配置は表さない');

s=slide('同じWallyの構成へ、RasterIXを追加する',30,
  '同じ図の右側へ、描画用の接続回路とRasterIXを加えます。CPUの書込みはAPBを通ってFIFOへ入り、RasterIXが受け取ります。作った画素は共有するDDR3へ保存し、表示回路が読み出して映像を送ります。CPUを作り替えるのでなく、周辺回路とメモリの接続を追加した構成です。',
  PHOTO+' '+PRODUCT+' console/fpga/src/rasterix_apb.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl; console/linux/devicetree/wally-nexysvideo-rasterix.dts.',
  '6枚目と同じWally主要回路を同じ位置に保ち、APBコマンド接続、非同期FIFO、RasterIX、表示回路とDDR3の共有接続を加える。CPU20 MHz、RasterIX100 MHz。APBのEXT_IO領域0x10080000〜0x100800ffを使用し、通常CMD窓口はオフセット0。CPUにはコマンドを送るソフトウェアも必要である。RasterIX本体は公式サブモジュールを変更せず用いる。FIFOの保存と受渡しの内部は8・9枚目で拡大する。GPUと表示のAXI要求は共有接続で仲裁され、単に複数出力を短絡する配線ではない。図の双方向線は要求・データ・応答を含む信号群を表す。DDR3へ向かうGPU側の命令・テクスチャ経路、IFのフレームバッファ書込み、表示の読出し等のポート詳細はまとめている。実装はRasterIX_IFで、内部の作業領域を経てDDR3へ画像を転送する。表示はHDMI端子からDVI形式の信号を出す。上流コードの変更ではなく外側の接続回路を設計した。CPUコア・基本uncoreは既存設計で、本研究の新規CPU設計と誤解しないよう区別する。');
await wallyboard(s,true);
foot(s,'右側へ追加した回路と共有メモリ接続を表示。双方向の線は複数の信号をまとめた接続');

s=slide('APBの書込みを、FIFOの入力へ変換する',30,
  '追加した接続回路の中を見ます。正しい窓口への32ビット書込みかを確認し、書く値DをFIFOのデータ入力へつなぎます。同時に、このデータが有効だと知らせます。FIFOから受取可能の信号が返ってきたら、それをAPBの完了信号へ返します。番地の付いた書込みを、値と受取条件へ変換しています。',
  PRODUCT+' console/fpga/src/rasterix_apb.sv, assignments to WordWrite, CommandWrite, CmdValid, CmdData and PREADY; console/fpga/src/rasterix.sv, commandfifo.',
  '図は通常のCMD窓口0x00へのアラインされた32ビット書込みに限定する。この場合、RV64ではCmdData=PWDATA[31:0]、WordWrite=&PSTRB[3:0]。一般式はCommandWrite=PSEL & PENABLE & PWRITE & WordWrite & (PADDR[7:3]==0)、CmdValid=CommandWrite、CmdData=WriteData。CmdLast=PADDR[2]もFIFOへ送るが、この例は0である。コマンド書込み中はPREADY=CmdReadyで、他のレジスタアクセスではPREADYの意味や選び方が異なる。この接続は主に組合せの条件判定と信号接続で、rasterix_apb内に命令語を保存する独立のレジスタを追加したという説明ではない。命令の保存はFIFOが行う。FIFOはAMDのAXI4-Stream Data FIFO IPで、RasterIX本体も既存実装を利用した。CPUが実行するswという命令と、Dというデータとして送る描画命令の1語は別である。');
text(s,'右側へ加えたAPB接続回路を拡大：窓口0x00への書込み',64,139,1152,48,27);
box(s,'CPU側\nAPBバス',64,226,204,323,C.white,29);
box(s,'追加した接続回路\n\n窓口・幅・制御を確認\n有効な書込みなら\nCmdValid = 1',486,226,295,323,C.pale,25);
box(s,'FIFO\n一時保存',1006,226,210,323,C.white,29);
wire(s,268,278,486,278,C.ink,true,2);text(s,'書く値 D',290,237,172,34,24,false,C.ink,'center');
wire(s,781,278,1006,278,C.ink,true,2);text(s,'CmdData = D',795,237,198,34,24,false,C.ink,'center');
wire(s,268,389,486,389,C.ink,true);text(s,'番地と制御',275,333,204,43,24,false,C.ink,'center');
wire(s,781,389,1006,389,C.ink,true,1);text(s,'有効 CmdValid',789,340,210,39,23,false,C.ink,'center');
wire(s,1006,490,781,490,C.blue,true,1);text(s,'受取可 CmdReady',789,500,210,36,21,false,C.blue,'center');
wire(s,486,490,268,490,C.blue,true,1);text(s,'完了 PREADY',285,500,185,36,24,false,C.blue,'center');
text(s,'この書込みでは、PREADY = CmdReady',64,595,1152,53,32,true);
foot(s,'制御の正確な条件と32ビットの選び方はノートに記載。値の保存はFIFOで行う');

s=slide('受け取れるまで、同じ値を保って待つ',30,
  '受取可能が0の間は、値Dと有効信号を保ちます。この間、FIFOには保存されません。有効と受取可能が両方1になったクロックの立上りで、初めて1語を保存します。同じ立上りでAPBの書込みも完了します。何周期待っても、同じ語を何度も保存する仕組みではありません。',
  PRODUCT+' console/fpga/src/rasterix_apb.sv; console/src/uncore/ahbapbbridge.sv; console/fpga/src/rasterix.sv; console/fpga/generator/axiscdc.tcl.',
  '表はCPU側クロックの連続する立上り直前の値を示す説明用の例であり、実測波形ではない。CMD書込みのアクセス相でPSEL=PENABLE=PWRITE=1、対象窓口と32ビットのストローブが正しいことを前提にする。準備相と前後の転送は表に含めない。CmdValidとCmdReadyがともに1の立上りだけ、FIFO入力のハンドシェイクが成立する。この間のPREADYはCmdReadyと等しく、同じ立上りでAPB書込みが完了する。待ちの間はPADDR、PWDATA、制御を安定に保つ。完了後はPENABLEを落とすため、同じAPB転送を次の立上りで再び受け付けない。CmdReadyはFIFO入力が安全に受け取れることを示す信号であり、空き数の単純な組合せ比較と同一とは限らない。100MHz側での読出しやRasterIXによる描画完了は、この20MHz側の受入れより後の別の出来事である。有限の説明例は全実機状況の検証結果ではない。');
text(s,'CPU側の各クロック立上りで、条件を確認する',64,139,1152,47,30);
table(s,[
  ['立上り直前の状態','① 待ち','② 待ち','③ 受入れ'],
  ['書く値 CmdData','D','D','D'],
  ['有効 CmdValid','1','1','1'],
  ['受取可 CmdReady','0','0','1'],
  ['その立上りで行うこと','保存しない','保存しない','1語を保存']
],64,222,[420,244,244,244],[54,61,61,61,72],26);
text(s,'保存する条件：有効 = 1 かつ 受取可 = 1',64,564,1152,48,31,true);
text(s,'この受入れでAPB書込みが完了する。描画完了は後。',64,618,1152,39,26);
foot(s,'20 MHz側の受渡しの説明例。実測波形ではない。準備相・前後の転送は省略');

s=slide('受け取った命令列から、画面を作る',20,
  'FIFOはCPU側で語を保存し、100MHzのRasterIX側へ順に渡します。RasterIXは命令列を処理して画素の色を作り、DDR3へ保存します。表示回路がその画素を読み、HDMI端子へ送ります。FIFOへ1語を渡せたことと、描画が終わったことは別です。',
  PRODUCT+' console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl; console/linux/devicetree/wally-nexysvideo-rasterix.dts.',
  '非同期FIFOは、20MHz側と100MHz側がそれぞれのクロックで語を受け渡すための接続。書込みから読出しまでの固定サイクル数はこの図から主張しない。二つのクロックを同じ周波数に変える回路ではない。安全なクロック領域間転送を行う方法はFIFOだけとは限らず、この発表は方式間の性能比較を扱わない。RasterIXにはCPUがソフトウェアで用意した複数語の描画命令列を送る。1語ごとに図形が完成するとは限らない。図は画素データの主な流れを示し、DDR3へのAXI要求・仲裁・戻り値やテクスチャの読出しなどを省く。DDR3には画像2枚を用意し、描画後に表示先を切り替えているが、今回は切替手順の内部を説明対象から外した。画像用領域はLinuxの通常の割当てから予約する。表示回路はRasterIXに含まれるdvi_framebufferを利用し、HDMI端子からDVI形式の映像を出す。');
box(s,'非同期FIFO',64,166,261,67,C.pale,29);
wire(s,194,233,194,307,C.ink,true);text(s,'100 MHz側へ\n1語ずつ渡す',228,250,215,48,20,false,C.blue,'center');
box(s,'RasterIX\n画素を作る',64,307,261,110,C.white,29);
box(s,'',455,232,356,294,C.pale);
text(s,'DDR3メモリ',477,247,312,54,33,true,C.ink,'center');
box(s,'最初の画素の色',488,312,289,48,C.white,25);
box(s,'次の画素の色',488,370,289,48,C.white,25);
text(s,'…',488,425,289,34,27,false,C.ink,'center');
text(s,'画像として保存',478,468,310,44,29,true,C.ink,'center');
wire(s,325,362,455,362,C.ink,true);text(s,'書く',344,310,96,38,25,false,C.ink,'center');
box(s,'表示回路\n画素を順に送る',959,307,257,110,C.white,29);
wire(s,811,362,959,362,C.ink,true);text(s,'読む',838,310,94,38,25,false,C.ink,'center');
wire(s,1087,417,1087,516,C.ink,true);
box(s,'HDMI端子',959,516,257,62,C.white,28);
text(s,'FIFOへ語を渡せたことと、描画が終わったことは別',64,599,1152,52,29,true);
foot(s,'画素は画面を作る一つひとつの点。命令列の処理・メモリ共有・表示切替の内部は省略');

s=slide('接続した構成で、ブロック崩しを動かした',25,
  'この構成で640掛ける480画素のブロック崩しが動きました。四つの条件で期待画像との一致を確認しました。さらに5分間の自動プレイを記録し、別の試行では30秒の映像を確認しました。現在は自動操作で、専用コントローラーの接続はこれからです。',
  `${E6} ${PRODUCT}`,
  '4条件は3種類の描画条件と再起動後の1条件。これらの条件で全画面を期待画像と比較した。5分の記録は300.011秒の自動プレイで、30秒の取得映像とは別試行。動画のフレーム数をゲームFPSとして用いていない。ゲームには描画負荷を軽減する実装を含むが、この案はその最適化の優劣を主張しない。録画の取得経路は実験環境であり、ゲーム機の公開構成と分けている。映像を受信できない場合の条件の特定は残っており、全ての表示機器での互換性を確認したわけではない。専用コントローラーは将来項目で未検証。資料は既存実験E6の結果を示し、新たな実機計測を行ったという意味ではない。');
s.images.add({blob:await fs.readFile(path.join(root,'docs/thesis/figs/fifo-study-game.png')),contentType:'image/png',alt:'実機の自動プレイで得たブロック崩しの画面',fit:'contain',position:{left:64,top:151,width:676,height:402}});
text(s,'640 × 480 画素\n4条件で期待画像と一致',791,161,425,110,28,true);
text(s,'5分間の自動プレイ\n別に30秒の映像を確認',791,306,425,100,27);
text(s,'現在は自動操作\n画像・継続実行・映像を確認',791,452,425,90,26);
text(s,'CPU・描画・メモリ・表示をつなぎ、ゲーム画面を生成',64,568,1152,48,30,true);
text(s,'残る課題：映像を受信できない場合の条件の特定',64,626,1152,35,24);
foot(s,'実験記録 E6。継続実行・画像比較・映像取得は別々の記録。現在は自動操作');


s=slide('Wallyをゲーム機へ拡張する設計例を示した',15,
  '既存の読み書きの仕組みに接続回路を加え、描画命令を渡せるようにしました。Wallyを拡張する学習者に向けた設計例です。次は専用コントローラーで操作できることを確認します。',
  `${PRODUCT} ${E6}`,
  '学習者向けの拡張例としての利用を想定しているが、教育効果を学習実験で評価したわけではない。CPUやRasterIX本体を新たに設計したという主張ではなく、既存回路間をつなぐアダプタ、メモリ接続、切替制御とソフトウェア側の接続を実装した。専用コントローラーは未実装・未検証であり今後の項目。実機の結果は実験E6に基づく。');
text(s,'本研究で設計・確認した接続',64,156,1152,54,33,true);
const summaryItems=[['番地の割当て','番地の比較で\n描画用の窓口を選ぶ'],['受渡しの条件','書込みをFIFOの\nデータ・有効へ変換'],['実機での確認','ゲーム画面の生成と\n継続動作を確認']];
summaryItems.forEach(([title,body],i)=>{const y=236+i*64;text(s,'▸',70,y,25,40,27,true,C.heading);text(s,title,110,y,275,40,28,true);text(s,body.replaceAll('\n',''),410,y,795,40,26);});
text(s,'Wallyの拡張を学ぶ人が参照できる、\n接続設計と実機での動作確認の例',64,465,1152,100,33,true);
text(s,'次の段階：コントローラーを加え、手で操作する',64,595,1152,48,29);
foot(s,'CPU・RasterIXは既存回路を利用。学習効果そのものを実験したという主張ではない');

const total=outline.reduce((n,s)=>n+s.seconds,0);
if(outline.length!==12||total!==330)throw new Error(`Unexpected allocation ${outline.length} slides, ${total} seconds`);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2)+'\n');
const md=[
  '# 中間発表のスライドと発表原稿',
  'FPGAを用いた二次元ゲーム機の設計と実装を、12枚で説明します。前半6枚ではCPUの読み書きから周辺機器への接続、Wallyの主要回路とFPGAへの実装を扱います。後半6枚ではRasterIXとの接続と、実機で確認した動作を説明します。専用コントローラーによる操作の検証は最終発表で扱います。',
  '[PowerPoint版](中間発表_主要事項.pptx) / [アブスト](../abstract/アブスト_主要事項.md) / [論文本文](../thesis/本文.md) / [技術付録](../thesis/技術付録.md) / [図の出典・再生成](../../source/presentation/README.md)',
  '## 図の見方',
  '簡略図の2〜5枚目では、EBUと命令読出しを省き、値の読み書きだけを追います。6枚目では、FPGAボードの写真とRTLに対応する回路図を並べ、青い塗りで前の簡略図との対応を示します。7枚目で同じ配置にRasterIXを追加します。全信号や物理配置を示した図ではありません。',
  '配色と回路記号はRVSOCを参考にしています。白い箱は個々の回路、淡い青の背景は回路のまとまり、明るい青は注目する回路や信号です。簡略図の灰色のポートは、その命令で使わない部分です。6・7枚目の青い塗りは前の簡略図に出た機能、右側の青い枠は追加する描画接続を示します。1ビットの制御線はデータ線より細く描きます。機器間の接続線には複数の信号をまとめたものもあります。',
  '## 発表時間',
  '6分のうち、前半6枚に180秒、後半6枚に150秒を配分し、30秒を図示と切替の余裕とします。これは練習による実測ではありません。6・7枚目では全ラベルを説明せず、前の図のレジスタとALU、既存の周辺回路、新しく接続する位置を指して説明します。',
  '## 目次',
  outline.map((o,i)=>'- ['+(i+1)+'. '+o.title+'](#slide-'+(i+1)+')').join('\n')
];
outline.forEach((o,i)=>md.push('<a id="slide-'+(i+1)+'"></a>\n## '+(i+1)+'. '+o.title,
  '説明時間の配分：'+o.seconds+'秒',
  '!['+o.title+'](slides/slide-'+String(i+1).padStart(2,'0')+'.png)',
  '### 発表原稿',o.narration,
  '<details>\n<summary>補足説明と出典</summary>\n',o.detail,'出典：'+o.source,'\n</details>'));
md.push('## 動作確認と詳しい実装',
  '動作確認は既存のE6によるものです。製品版は261832d48832dd6e26c4971ab8893ce61200688bで、4条件の画像比較、300.011秒の自動プレイ、別試行の30秒映像を区別しています。[実験記録E6](../thesis/再現資料/実験記録/E6/README.md)から条件と結果を参照できます。9枚目は受渡し規則を説明する表で、実測波形ではありません。',
  'ゲームの描画処理の工夫、接続方式の比較、再現手順は[技術付録](../thesis/技術付録.md)にまとめています。今回の発表では、その最適化の優劣や教育効果を結論として主張しません。',
  '## 図と書式の出典',
  '簡略化した読み書きの図はDDCA図7.8・7.12、Wallyの回路とバスはRVSOC第7〜11章、FPGAと外部部品の区別は第23章を参考にしています。詳細図は固定した製品RTLに基づいて描き直したもので、公式図そのものではありません。使用した配色、線幅、書体と、日本語への置換は[デザインと出典](../../source/presentation/README.md)に記載しています。');
await fs.writeFile(path.join(workspace,'中間発表_主要事項.md'),md.join('\n\n')+'\n');

const raw=path.join(workspace,'raw-candidate.pptx'),candidate=path.join(workspace,'candidate.pptx');
await(await PresentationFile.exportPptx(P)).save(raw);
const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,candidate,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
if(scrub.status!==0)throw new Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
const final=path.join(workspace,'final','中間発表_主要事項.pptx');
await finalizePresentation({workspaceDir:workspace,candidatePath:candidate,finalPath:final,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','9'],explicitTotalSlideCount:12,requiredNativeTableOwnerSlides:[9],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font,latinFont]},verifyArtifactToolImport:true,receiptPath:path.join(workspace,'validation.json')});
const imported=await PresentationFile.importPptx(await FileBlob.load(final));
for(const[i,s]of imported.slides.items.entries()){
  const png=await imported.export({slide:s,format:'png',scale:(i===5||i===6)?2:1});
  await fs.writeFile(path.join(workspace,'slides',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({final,slides:outline.length,seconds:total,narrationCharacters:outline.reduce((n,s)=>n+s.narration.length,0)}));
