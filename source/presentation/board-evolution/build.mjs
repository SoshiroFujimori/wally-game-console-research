import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { drawWallyOverview } from './wally-overview.mjs';
import { drawDdcaMap, summarizeDdca } from './ddca-map.mjs';
import { drawBoard, drawImplementationFlow, drawResearchPurpose } from './board-circuit.mjs';

const [root, workspace] = process.argv.slice(2);
if (!root || !workspace) throw new Error('Usage: build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(process.env.RUNTIME_NODE_MODULES, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(process.env.PRESENTATION_SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
await fs.mkdir(path.join(workspace, 'final'), { recursive: true });
await fs.mkdir(path.join(workspace, 'slides'), { recursive: true });
const P = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { ink:'#231F20', blue:'#1572C3', pale:'#E5EBF8', chip:'#CCD9F1', ip:'#77A3DC', old:'#777777', heading:'#0078BA', white:'#FFFFFF' };
const font='Yu Gothic', latinFont='Arial', codeFont='Consolas'; let serial=0; const outline=[];
function text(s,value,x,y,w,h,size=28,bold=false,color=C.ink,align='left') {
  const sh=s.shapes.add({geometry:'textbox',name:'text-'+(++serial),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  sh.text=value; sh.text.style={typeface:/^[\x00-\x7f\s]+$/.test(value)?latinFont:font,fontSize:size,bold,color,alignment:align,verticalAlignment:'middle',wrap:'square'}; sh.text.insets=0; return sh;
}
function box(s,label,x,y,w,h,fill=C.white,size=27,stroke=C.ink,thick=2.2) {
  const sh=s.shapes.add({geometry:'rect',name:'block-'+(++serial),position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:thick}});
  if(label) text(s,label,x+8,y+6,w-16,h-12,size,true,stroke,'center'); return sh;
}
function polygon(s,pts,fill=C.white,stroke=C.ink,width=2.2) {
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),l=Math.min(...xs),t=Math.min(...ys),w=Math.max(1,Math.max(...xs)-l),h=Math.max(1,Math.max(...ys)-t);
  return s.shapes.add({geometry:'custom',name:'circuit-'+(++serial),position:{left:l,top:t,width:w,height:h},fill,line:{fill:stroke,width},customPaths:[{width:w,height:h,commands:[{moveTo:{x:pts[0][0]-l,y:pts[0][1]-t}},...pts.slice(1).map(p=>({lineTo:{x:p[0]-l,y:p[1]-t}})),{close:{}}]}]});
}
function wire(s,x1,y1,x2,y2,color=C.ink,arrow=false,width=3.0) {
  const l=Math.min(x1,x2),t=Math.min(y1,y2),w=Math.max(1,Math.abs(x2-x1)),h=Math.max(1,Math.abs(y2-y1));
  s.shapes.add({geometry:'custom',name:'wire-'+(++serial),position:{left:l,top:t,width:w,height:h},fill:'none',line:{fill:color,width},customPaths:[{width:w,height:h,commands:[{moveTo:{x:x1-l,y:y1-t}},{lineTo:{x:x2-l,y:y2-t}}]}]});
  if(arrow) {const len=Math.hypot(x2-x1,y2-y1),dx=(x2-x1)/len,dy=(y2-y1)/len;polygon(s,[[x2,y2],[x2-8*dx+3.3*dy,y2-8*dy-3.3*dx],[x2-8*dx-3.3*dy,y2-8*dy+3.3*dx]],color,color,1);}
}
function route(s,pts,color=C.ink,arrow=true,width=3.0) {pts.slice(1).forEach((p,i)=>wire(s,...pts[i],...p,color,arrow&&i===pts.length-2,width));}
function foot(s,value) {
  const n=P.slides.items.length;
  if(n===1||n===11){text(s,value,64,665,1110,30,16,false,C.old);return;}
  const captionY=684;
  text(s,'図 '+n,64,captionY,63,30,17,true,C.heading);
  text(s,value,131,captionY,1028,30,16,false,C.ink);
}
function slide(title,seconds,narration,source,detail,diagramOnly=false) {
  const s=P.slides.add();s.background.fill=C.white;
  const n=P.slides.items.length;
  if(n===1){
    text(s,title,105,185,1070,150,48,true,C.ink,'center');
  }else if(!diagramOnly){
    text(s,String(n),64,33,59,82,38,true,C.ink);
    text(s,title,132,33,1084,82,38,true,C.heading);
  }
  if(n!==1&&!diagramOnly)text(s,String(n),1184,684,32,26,18,false,C.old,'right');
  s.speakerNotes.text=`説明時間の目安：${seconds}秒\n\n${narration}\n\n出典：${source}\n\n補足説明：${detail}`;
  outline.push({title,seconds,narration,source,detail});return s;
}
const api={text,box,polygon,route,wire,C};
const audience=process.env.PRESENTATION_AUDIENCE||'public';
if(!['public','private'].includes(audience))throw new Error('Invalid audience');
const cover=audience==='private'?JSON.parse(await fs.readFile(process.env.PRESENTATION_PRIVATE_COVER_JSON,'utf8')):{student:'発表者：非公開',supervisor:'指導教員：非公開'};

const DDCA='Harris, S. L. and Harris, D., Digital Design and Computer Architecture: RISC-V Edition (2021), Chapter 7. Official figure source: https://pages.hmc.edu/harris/ddca/ddcarv.html (DDCArv_Figures.zip).';
const RVSOC='Harris et al., RISC-V System-on-Chip Design, Chapters 7–13, 20, 22–23. Official figure source: https://pages.hmc.edu/harris/ddca/rvsocd.html (RVSoCD_figs.zip).';
const PRODUCT='Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl.';
const VIDEO='docs/thesis/再現資料/実験記録/E6/report/results/video/breakout-latest-30s.mp4';
const POSTER='docs/thesis/再現資料/実験記録/E6/report/results/video/verified-frame-01.png';
const E6='docs/thesis/再現資料/実験記録/E6/fresh-product/qualification/qualification.json; docs/thesis/再現資料/実験記録/E6/report/results/video/validation.json. Video: '+VIDEO;


let s=slide('FPGAを用いた2Dゲーム機の製作',5,
  'この題目で発表します。',
  '',
  '表紙は題目と発表者・指導教員の情報のみを示す。公開版は個人情報を伏せる。');
wire(s,190,371,1090,371,C.heading,false,1.7);
text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');

s=slide('FPGAチップで周囲の部品を制御する',20,
  'FPGAボードには、チップの周囲にSDカードスロットやDDR3メモリ、HDMI端子が実物として付いています。これらを制御する論理回路を、チップの中に実装できます。回路はコードで記述します。左のコードと、右のAND回路が対応する例です。',
  DDCA+' Chapters 2 and 4, combinational logic and HDL. '+RVSOC+' Chapter 23. Nexys Video Reference Manual (2020), pp.3–4: https://digilent.com/reference/_media/reference/programmable-logic/nexys-video/nexys-video_rm.pdf .',
  '外側の薄い青の枠はFPGAボード、内側の青い枠はFPGAチップを表す。SDカードスロット、DDR3メモリ、HDMI端子はボード上に実物として取り付けられた部品であり、コードでチップ内に作る回路とは区別する。チップ内に、それらの部品を制御する論理回路を実装できる。模式図の配置は実物の物理配置ではない。左のSystemVerilogコードとチップ内のAND回路は同じ組合せ回路の例であり、aとbが両方1のときにyが1となる。AND回路だけでSDカードやDDR3を制御できるという意味ではない。周辺部品には、それぞれの信号規約に合う制御回路を用意する。回路の構成を書き込むとは、HDLから設計ツールで生成した構成データをFPGAに設定することを指す。CPUがHDLをプログラムとして実行するという意味ではない。設計ツールと構成データの図示は省略する。チップから周辺部品へ延びる線は部品間の物理的な接続をまとめている。');
text(s,'SDカードスロットなどは、FPGAボード上に実物として存在する\nそれらを制御する回路を、FPGAチップ内に実装できる',64,119,1152,78,29,true,C.blue);
drawImplementationFlow(s,api);
text(s,'チップ内に実装する回路を、コードで記述する',64,599,1152,46,28,true);
foot(s,'AND回路はコードと回路の対応を示す小さな例。部品ごとに必要な制御回路は異なる');

s=slide('教育用CPUに描画機能を追加する',15,
  '本研究では、既存の教育用CPUに、ゲーム画面を作って出力する機能を追加します。この回路をFPGAチップに実装し、ボードをゲーム機として使います。教育用CPUをゲーム機へ拡張する例を示すことが目的です。',
  `${RVSOC} ${PRODUCT}`,
  '前の図と同じFPGAボード、FPGAチップ、SDカードスロット、DDR3メモリ、HDMI端子を、同じ位置と大きさで示す。チップ内部を、説明用のAND回路から研究で使う機能の概要へ置き換える。教育用CPUはWally、描画機能には既存の描画回路と表示回路、それらを利用するための接続を含む。CPUと描画回路本体を新たに設計したという主張ではない。図中のCPUと描画機能の線は機能間の接続をまとめたものであり、実際のバスや制御信号を網羅しない。SDカードやDDR3の制御回路などは、この目的説明の図では省略する。実装にはそれらの回路も含まれる。既存の教育用CPUに描画機能を追加し、ボードをゲーム機として使う拡張例を示すことが研究の目的である。教育効果を学習実験で測定したという主張ではない。');
text(s,'拡張した回路をFPGAチップに実装し、\nFPGAボードをゲーム機として使う',64,119,1152,78,29,true,C.blue);
drawResearchPurpose(s,api);
text(s,'描画機能：ゲーム画面を作り、映像として出力する',64,599,1152,46,28,true);
foot(s,'既存のCPU・描画回路を利用。チップ内は機能をまとめた図');


s=slide('lw：命令を読み、指定した値をレジスタへ入れる',60,
  'ここからはFPGAチップの中を拡大します。CPUと二つのメモリをFPGA内に置いた構成で説明します。PCから現在の命令の番地が出ます。ここでは0とすると、命令メモリは0番地のlw x1, 8(x0)を出します。これは、常に0であるx0の値に8を足し、その番地の値をx1へ読む命令です。実際の命令は上の32ビットです。19から15ビットの00000がA1に入り、レジスタ群はx0の値0を出します。31から20ビットの000000001000は8で、これもALUへ入ります。ALUは0足す8で番地8を作ります。そこに3があれば、メモリから3が戻ります。11から7ビットの00001は書込み先x1を選び、3を保存します。',
  DDCA+' Chapter 7, single-cycle load datapath. RISC-V unprivileged ISA, RV32I load instruction format.',
  'CPUの動きを説明するため、命令メモリとデータメモリをFPGA内部に置いた単純な構成を示す。外付けDDR3はここでは使わない。この構成を実機で試作・測定したという主張ではなく、現在のWally全体を表す図でもない。命令メモリの0番地には32ビット命令lw x1,8(x0)、データメモリの8番地には32ビット値3があるとする。命令メモリとデータメモリは別の記憶領域である。命令の格納先0とデータの読出し先8を区別する。命令の機械語は0x00802083。I形式の[31:20]=000000001000（即値8）、[19:15]=00000（rs1=x0）、[14:12]=010、[11:7]=00001（rd=x1）、[6:0]=0000011。A1は読出しレジスタ番号、RD1はそのレジスタの値であり、番号0と値0は役割が異なる。x0は読出すと常に0になる。A3は書込み先番号、WD3は書く値、WE3は書込許可を表す。lwではメモリへの書込みは行わず、読んだ値をレジスタへ書く。今回は正の即値8だけを使うため、即値の幅を広げる回路、命令を解読して許可信号を作る回路、PCの次の値を作る回路は図示しない。線が交差しても接続点として示していない場所ではつながらない。灰色の経路はこの命令で使用しない。');
text(s,'lw x1, 8(x0)　：　データの8番地の値を、x1へ読む',64,129,1030,46,28,true,C.blue);
drawBoard(s,api,3);
text(s,'x0の0 ＋ 命令中の8 ＝ 番地8 → 読んだ3をx1へ',64,645,1030,32,24,true);
foot(s,'命令メモリもデータメモリもFPGA内に置く説明用の構成。灰色の線はlwでは使わない');

s=slide('sw：レジスタの値を指定した番地へ書く',45,
  '次は、レジスタの値をメモリへ書くsw命令です。前のlwでx1には3が入りました。ここでは、命令を順に実行するため、PCに4を足して戻す回路を加えます。lwが終わるとPCは0から4へ進み、命令メモリの4番地からsw x1, 12(x0)を読みます。これは、x0の値に12を足した番地へ、x1の値を書く命令です。命令から取り出した番号0がA1に、番号1がA2に入り、レジスタ群から0と3が出ます。ALUは0足す12で書く番地12を作ります。一方、書く値3はALUを通らない線で、データメモリのWDへ届きます。こうして12番地に3を書きます。lwはメモリからレジスタへ、swはレジスタからメモリへ値を移します。',
  DDCA+' Chapter 7, sequential PC update and store datapath.',
  '前のlwと同じく、命令メモリとデータメモリをFPGA内部に置いた説明用の構成である。バスや外付けDDR3はまだ使わない。命令メモリの0番地にlw x1,8(x0)、4番地にsw x1,12(x0)があるとする。lwで読んだ値3がx1に残っており、swがそれをデータメモリの12番地へ保存する。二つのメモリは別の記憶領域である。図はPC=4でswを実行している状態を示し、PC+4の加算器は次の番地8を用意する。PCを0から4へ進める操作は前のlwの終了時に行われる。32ビットで分岐しない命令だけを例にする。上段は命令から取り出す意味上の内容を並べた表示で、実際の32ビット内の配置ではない。即値12を一つの数として示し、ビット位置や取り出し方は省略する。A1には基準値を読む番号0、A2には保存する値を読む番号1が入る。ALUが作る番地12と、RD2からWDへ届く値3は別々の経路である。データメモリ内の3は書込みの結果を示す。swではデータメモリへの書込みを許可し、レジスタ群への書込みは許可しない。灰色の経路はswで使用しない。命令の解読、書込み許可信号の生成、即値の幅を広げる回路は省略する。メモリの書込みがどのクロックで確定するかを示す波形ではない。PC、命令メモリ、レジスタ群、ALU、データメモリの位置と大きさは前のlwの図と同じに保つ。');
text(s,'sw x1, 12(x0)　：　x1の値を、データの12番地へ書く',64,129,1140,46,28,true,C.blue);
drawBoard(s,api,4);
text(s,'番地は x0の0 ＋ 12 ＝ 12　／　書く値は x1の3',64,645,1140,32,24,true);
foot(s,'二つのメモリはFPGA内。上段は命令から取り出す内容で、ビット配置は省略');

s=slide('バスと外付けDDR3メモリ',45,
  '次に、ボード全体の図へ戻り、命令とデータの置き場所を外付けのDDR3へ広げます。CPUの命令読出し側とデータの読み書き側を、共通の経路であるバスへつなぎます。ただし、DDR3には専用の信号で読み書きする必要があります。そこでAMDが提供するDDRコントローラーを利用します。これはDDR3とのやり取りを担当する既存の回路です。CPU側から番地と読み書きの要求を渡し、必要なデータをやり取りします。PCの番地で命令を読むと、これまでと同じレジスタ群とALUで処理できます。先ほどのswでは、ALUで作った番地12と、x1からの値3をバスへ渡します。DDRコントローラーがこの要求を処理し、DDR3の12番地へ3を書き込みます。',
  RVSOC+' Chapters 9 and 23. '+PRODUCT+' console/fpga/generator/ddr3-nexysvideo.tcl; console/config/rv64gc/config.vh.',
  'ここで初めてバスとAMD提供のDDRコントローラーを加える。前の図でFPGA内に置いた二つのメモリに代わり、命令とデータを外付けDDR3内の別の領域に置く構成を説明する。チップ内の図を縮めてボード全体を示す。PC、レジスタ群、ALUの相対的な位置と主要経路、PC+4の経路を保つ。前の図と同じsw x1,12(x0)を例にし、書込み先がFPGA内のデータメモリから外付けDDR3へ変わることを示す。「命令メモリ」の箱は「命令読出し」へ変更し、バスへ要求を出して応答を受け取る機能をまとめた箱とする。独立した命令ROMが実機にあるという意味ではない。命令の要求と戻りを別々の線でバスにつなぐ。DDRコントローラーはFPGA内、DDR3メモリチップはFPGA外にある。製品の生成スクリプトはAMD（旧Xilinx）のmig_7seriesを生成する。MIGはMemory Interface Generatorの略で、図の箱はそれで生成したメモリ制御回路を指す。既存の回路を利用するため、DDR3のコマンド、信号のタイミング、初期化やリフレッシュを内部でどう実現するかは、この発表では展開しない。接続にはメモリ種類、ピン、クロック、リセット、CPU側との信号規約などを合わせる必要がある。「内部を作り直さず利用する」ことと「接続条件を知らなくてよい」ことは異なる。バス側の変換と仲裁は図ではまとめる。実機の構成はIROM_SUPPORTED=0、DTIM_SUPPORTED=0、ICACHE_SUPPORTED=1、DCACHE_SUPPORTED=1であり、全命令が毎回DDR3への読出しを起こすわけではない。キャッシュ、番地変換や応答待ちの内部は省略する。図中の番地は説明用で、実機のDDR3領域は0x80000000から始まる。バスの線は複数の信号をまとめており、異なる信号を電気的に短絡する意味ではない。');
text(s,'命令とデータの保存先を、FPGA内のメモリからDDR3へ広げる',64,129,1140,46,27,true,C.blue);
drawBoard(s,api,5);
text(s,'DDR3との信号のやり取りは、AMD提供の回路に任せる',64,645,1120,32,24,true);
foot(s,'CPU側は番地・読み書きの要求・データを渡す。DDRコントローラーの内部は省略');


s=slide('SDカードのプログラムを、CPUがDDR3へ移す',55,
  'このバスに、SDカードの制御回路もつなぎます。電源を切っても残したいゲームプログラムはSDカードに保存しておきます。実行前に、CPUが読込み用のプログラムを動かします。まずSD制御回路の決められた番地へ書き込み、カードからの読み出しを指示します。制御回路がカードと通信し、データを受け取ります。次にCPUが受取り用の番地を読むと、そのデータがバスを通ってCPUのレジスタへ戻ります。続いて、その値をDDR3の番地へ書きます。この書込みもDDRコントローラーが処理します。これを繰り返すと、プログラムがDDR3へコピーされます。準備ができたら、実行する命令の番地をPCに入れます。以後は前のスライドの経路で、DDR3上の命令を読んで実行します。',
  RVSOC+' Chapters 20 and 23. '+PRODUCT+' console/src/uncore/spi_apb.sv; console/fpga/zsbl.',
  '読み出しを指示する書込み、受信した値の読出し、DDR3への保存をCPUの仕事として説明する。SDカードからDDR3へ直接転送する専用回路を新たに設けたという図ではない。製品のSPI制御回路では受信データの読出しレジスタを介してCPUが値を受け取る。カードとの通信、ブロック単位の処理、ファイルの解釈、バッファ間のコピーなどの詳細は省略する。受信した1バイトに対して実際に必ずlwを1回、swを1回使うという実装の断定ではなく、CPUの読出しと書込みによる移動をまとめている。最初の読込みを始める処理は起動用のプログラムが担い、CPUが空のDDR3からゲームを読み始めるという説明ではない。ゲームの開始番地へ制御を移す細部は省略し、準備とゲームの実行を分けて説明する。');
text(s,'① 読出しを指示　② CPUが受け取る　③ DDR3へ書く',64,129,1140,46,28,true,C.blue);
drawBoard(s,api,6);
text(s,'コピーした命令を、前の図と同じ経路で読み、実行する',64,645,1120,32,24,true);
foot(s,'CPUが制御回路を操作して読み書きする。SDカードとDDR3を直接つなぐ線はない');

s=slide('描画回路を追加し、swで描画命令を渡す',40,
  'ここへ、本研究で描画用の接続回路と描画回路を加えました。描画用の窓口にも番地を割り当てるので、先ほどのswで操作できます。例えばx2に窓口の番地B、x1に送りたい数値Dを用意します。sw x1, 0(x2)では、ALUがB足す0で番地Bを作り、x1のDを別の線で送ります。番地Bの相手はDDR3ではなく描画用の窓口なので、Dを描画回路へ渡します。描画用ソフトウェアが用意した数値列をこのように送ります。CPUが実行するsw命令と、データとして送る描画命令は別のものです。',
  PRODUCT+' console/examples/rasterix/WallyBusConnector.hpp; console/fpga/src/rasterix_apb.sv.',
  '既存CPUと既存の描画回路を利用し、その間の接続を設計した。上部には即値0、基準値を読む番号2、書く値を読む番号1を、取り出した内容として並べる。実際の機械語のビット配置は示さない。x2とx1への値の準備は省略し、レジスタ割当ては説明用とする。BはCPUから見た窓口の番地で、物理アドレスと必ず同じ値とは限らない。Dは描画命令の数値列の一語であり、RISC-V命令のswの機械語ではない。OpenGLの1回の呼出しがそのまま1回のswに対応するという意味でもない。接続回路の内部の規約や時刻合わせは一つの箱にまとめる。前の図のCPUとバスの位置を保ち、描画回路を加える。描画回路による画像の保存と表示回路を次の図で加える。描画命令の送信用アダプタは描画回路の箱にまとめる。');
text(s,'sw x1, 0(x2)　：　描画用の番地Bへ、数値Dを書く',64,129,1140,46,28,true,C.blue);
drawBoard(s,api,7);
text(s,'x2のB ＋ 即値0 ＝ 番地B　／　x1から送る値はD',64,645,1120,32,24,true);
foot(s,'CPUのsw命令と送る描画データDは別のもの。送信用の接続回路は描画回路の箱に含む');

s=slide('画像をDDR3へ保存し、HDMI端子へ出力する',30,
  '描画回路は描画命令に従って、画面の各点の色を求めます。この一つひとつの点が画素です。作った画像は、DDRコントローラーを通して、DDR3の画像用の領域へ保存します。表示回路もこのコントローラーを通して画素の色を順に読み、画面に表示するためのタイミングに合わせてHDMI端子へ出します。CPUはゲームの処理と描画命令の送信、描画回路は画像の作成、表示回路は画像の出力を担当します。',
  PRODUCT+' console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl; console/addins/rasterix/rtl/RasterIX/RasterIX_IF.v.',
  '同じボード図の中で、描画回路のメモリへの書込み経路と、表示回路による読出し経路を詳しく示す。描画回路は内部の作業領域で描画し、結果を外部メモリへ転送する。内部作業領域、テクスチャ読出し、表示画像の切替、メモリ仲裁や映像符号化の内部は省略する。画像用とプログラム用にはDDR3内の別の範囲を確保する。描画回路による書込みと表示回路への読出しの線は、いずれもDDRコントローラーへ接続する。DDR3へ直接つないだ線ではない。実装の共有インターコネクトや仲裁は線にまとめており、別々の出力を電気的に短絡するという意味ではない。表示回路は表示タイミングに従って読み出す。CPUの書込み1回ごとに画面全体を一回表示するものではない。');
text(s,'描画回路が画像を作り、表示回路がその画像を出す',64,129,1030,46,28,true,C.blue);
drawBoard(s,api,8);
text(s,'CPU：ゲームの処理　描画回路：描画　表示回路：映像出力',64,645,1140,32,24,true);
foot(s,'描画と表示のメモリアクセスもDDRコントローラーを通る。画素は画面を作る点');

s=slide('接続した構成で、ブロック崩しを動かした',30,
  'こちらは、FPGAボードのHDMI端子から出た映像を記録した30秒の動画です。ブロック崩しの画面が映り、ボールが動くことを確認しました。また、別に5分間ゲームを実行し、その間もゲームの計算と画面の更新処理が続いたことを実行記録で確認しました。現在は、プログラムがパドルを自動で動かしています。人がゲームコントローラで操作する機能は、これから追加します。',
  `${E6} ${PRODUCT}`,
  '映像の確認では、HDMI端子から出力された30秒の動画を調べ、ゲーム画面とボールの動きを確認した。継続動作の確認では、別の試行で300.011秒間の自動操作を行い、実行記録に残った経過時間と処理回数を確認した。この記録はゲームの計算と画面の更新処理が続いたことを示すもので、5分間すべての映像を確認したものではない。動画のフレーム数をゲームFPSとして用いていない。パドルはプログラムが自動で動かしており、ゲームコントローラの接続は未実装である。映像を受信できない場合の原因は未解明で、全ての表示機器での互換性を確認したわけではない。動画はPowerPoint内へ埋め込み、スライドショー中に動画の領域をクリックして再生する。再生中に結果を説明する。音声はない。再生前は同じ試行の静止フレームを表示する。出典は保存済みの実験E6である。');
s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'実機で取得した30秒の自動プレイ動画の開始画面',fit:'contain',position:{left:64,top:151,width:676,height:380.25}});
text(s,'30秒の実機動画（クリックで再生）',64,539,676,31,23,true,C.blue,'center');
text(s,'映像の確認',791,158,425,40,28,true,C.heading);
text(s,'ゲーム画面が映り、\nボールが動いた',791,212,425,90,29,true);
text(s,'継続動作の確認',791,341,425,40,28,true,C.heading);
text(s,'5分間、ゲームの処理が\n続いた',791,395,425,90,29,true);
text(s,'実行記録で確認',791,493,425,34,23);
text(s,'現在は自動操作：プログラムがパドルを動かす',64,575,1152,45,29,true);
text(s,'残る課題：映像を受信できない場合の原因調査',64,630,1152,35,24);
foot(s,'実験記録 E6。5分間の実行記録と30秒の動画は別の試行');


s=slide('教育用CPUを拡張し、ブロック崩しを動かした',10,
  'CPUに描画回路をつなぎ、ブロック崩しを動かしました。CPUを拡張したい人が、つなぎ方と動かし方を参照できる例です。次はゲームコントローラで操作できるようにします。',
  `${PRODUCT} ${E6}`,
  '既存の教育用CPUと描画回路を利用し、それらをつなぐ回路とソフトウェア側の接続を実装した。CPUや描画回路本体を新たに設計したという主張ではない。FPGAボード上でブロック崩しのゲーム画面を生成し、HDMI端子から出力した。現在は自動プレイであり、ゲームコントローラの接続は未実装・未検証である。実機の結果は既存の実験E6に基づく。5分間の実行記録で処理の継続を、別試行の30秒映像でゲーム画面とボールの動きを確認している。回路をどう接続し、プログラムをどう動かすかを、公開したソースと資料で参照できる拡張例としてまとめた。学習者向けの利用を想定するが、教育効果を学習実験で測定したわけではない。次の段階ではゲームコントローラを接続し、入力によってゲームを操作できることを確認する。');
text(s,'今回できたこと',64,151,1152,43,31,true,C.heading);
text(s,'① 教育用CPUに描画回路をつなぎ、FPGAボードに実装した',64,214,1152,54,31,true);
text(s,'② ブロック崩しが動き、ゲーム画面を出力できた',64,284,1152,54,31,true);
text(s,'現在は自動プレイ',110,341,1060,35,25,false,C.ink);

text(s,'CPUを拡張したい人が参考にできる',64,414,1152,43,30,true,C.heading);
text(s,'回路のつなぎ方と、ゲームを動かす方法を\nソースコードと資料で示した',64,467,1152,88,31,true);

text(s,'今後：ゲームコントローラを接続し、手で操作できるようにする',64,597,1152,46,29);
foot(s,'既存のCPU・描画回路を利用。ゲームコントローラの接続はこれから');


s=slide('質問用：詳細な全体のブロック図',0,
  'RVSOCのパイプライン図を基にした全体図です。PC、レジスタ群、ALU、段間レジスタ、書戻しの経路を保ち、実機のメモリ接続と本研究の描画接続を付け加えています。質問に応じて関係する経路をたどります。',
  RVSOC+' Figure 7.11 (pipeline datapath), Figures 9.20 and 9.28 (uncore, decoding and return selection), Chapters 10–13 and 23. '+PRODUCT+' console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/ieu/datapath.sv; console/src/ifu/ifu.sv; console/src/lsu/lsu.sv. console/src/mmu/adrdecs.sv; console/src/uncore/ahbapbbridge.sv; console/src/ebu/ebu.sv; console/src/ieu/regfile.sv; console/config/derivlist.txt; console/fpga/generator/rasterixmem.tcl; console/fpga/src/rasterixdisplay.sv.',
  "図の範囲\nRVSOC図7.11のパイプライン配置、図9.20のSoC階層、図9.28のアドレス判定と応答選択を基に、実機構成の主要な接続を示す。対象は製品リビジョン261832d48832dd6e26c4971ab8893ce61200688b、構成fpganexysvideo_rasterixである。PC、レジスタ群、ALU、段間レジスタ、書戻しの位置関係を保つ。図は機能を追うためのブロック図であり、全RTLと等価な回路図や、物理配置図ではない。細長い箱はレジスタ、台形はMUX、切欠きのある記号はALUを表す。接続点の丸がない交差は接続を意味しない。同名のHRDATAとFlagsEは、線を引き回さず同じ信号への接続を示している。\n\nアドレス判定と応答選択\nebuは命令側IFUとデータ側LSUの要求を仲裁して、HADDRや読み書きの要求を出す。HADDRは接続先にもadrdecsにも渡る。adrdecsはアドレスとアクセス幅を調べ、各領域を選ぶHSEL信号を出す。読み書きするデータを保存したり、中継したりする回路ではない。図のHSELの線は複数の選択信号をまとめた線で、Boot ROM、RAM、APB周辺回路、外部DDRメモリを同じ1ビットで一斉に選ぶ意味ではない。RTLではadrdecsのSelRegionsをHSELRegionsとして受け、HSELBootRom、HSELRam、HSELEXTなどに分ける。HSIZE[1:0]もadrdecsへ入力する。\n読み書きには要求を受け付けてから応答するまで時間がかかるため、uncoreには選択情報を保持するレジスタと、返ってきた応答を選ぶ論理がある。図の「選択保持」と「応答選択」はこれらをまとめた表記である。HRDATAは選択された読み出しデータで、wallypipelinedcore内のIFUとLSUへ直接配られる。HRDATA自体はebuを通らない。HREADYとHRESPはebuへ戻る。HREADYは要求の進行に使われる。この版のebuはHRESPを入力端子として受けるが、内部では参照していない。HREADYは接続先や選択保持レジスタにも戻るが、その配線は省略する。AHBの要求線はアドレス、書込みデータ、制御の束であり、一つの電気信号ではない。\n\nメモリと周辺回路\nuncoreにはrom_ahbによるBoot ROMとram_ahbによるRAMがある。外付けDDR3への要求はHSELEXTで選び、ahbaxibridge、clkconverter、共有メモリ接続、MIGを通す。APB接続ではahbapbbridgeが周辺回路ごとの選択をPSELへ引き継ぎ、PRDATAとPREADYから応答を選ぶ。\nSDカードにつながるのはsdcというインスタンスで、使うモジュールはspi_apbである。PSEL[5]で選択し、SDCCmd、SDCIn、SDCCLK、SDCCSをカードへつなぐ。別のspiインスタンスとは区別する。描画用の外部APB窓口はPSEL[7]をPSELEXTとして取り出し、rasterix_apbへつなぐ。UART、GPIO、通常のSPI、CLINT、PLIC、PWMは図では一つの箱にまとめる。IROMとDTIMは実機構成では無効なので、命令側とデータ側にはキャッシュとバス接続を示す。\n\nCPU内部\nレジスタ群から読み出した二つの値は段間レジスタを通り、3入力MUXで、その値、Writeback段のResultW、Memory段のIFResultMから選ぶ。その後の2入力MUXがPCや即値との選択を行う。比較器compのFlagsEはcontrollerへ渡る。ALUのアドレス出力と演算結果は別の経路である。演算結果側の「結果選択」はaltresultmuxとieuresultmuxをまとめており、「他」の入力には即値またはPCLinkEを使う経路を含む。Memory段ではFIntResMとの選択がある。これらを経た結果はM/Wレジスタを通って書戻し側へ進む。制御信号ResultSrcWと、演算結果のデータ線は別々である。\nWriteDataMは、キャッシュを使う書込みではD-cacheへ、使わない書込みではahbcacheinterfaceへ届く。図では書込み値の整形、バイト選択、アトミック処理などをまとめる。読み出し値はキャッシュ側と非キャッシュ側から選ばれ、値の整形と保持処理を経てReadDataWになる。IFUの非キャッシュ命令の選択、圧縮命令の展開、予測、例外、MMU・キャッシュ内部は省略する。regfileのクロック入力の丸は立下りでの書込みを示す。段間レジスタは立上りで状態を更新する。レジスタ書込み先RdW、RegWriteW、MUXの選択信号、ハザードの入力など、すべての制御配線は描いていない。FPU・MDU・CSRの内部や、書戻し前の追加の結果選択も省略する。\n\n描画と表示\n描画接続回路はrasterix_apb、描画回路はRasterIX_IF、表示回路はrasterixdisplayに対応する。命令と応答の二つのaxiscdcは、20 MHzのCPU側と100 MHzの描画側をつなぐ。矢印はデータの進む向きを示し、逆向きのreadyなどは省略する。表示先の通知と切替完了は、描画回路と表示回路の間の制御情報である。画素をこの線で直接渡すわけではない。\nCPUと描画回路は読出し・書込み、表示回路は読出し要求と画素の応答を、共有DDR3接続でやり取りする。図のSmartConnectと、描画回路の横のAXI FIFOはrasterixmem_wrapperに含まれる。後者はgpubufferであり、命令・応答のaxiscdcとは別のFIFOである。表示用AXIは25.2 MHzで、SmartConnect側が100 MHz側との接続も扱う。描画接続回路、二つのaxiscdc、RasterIX_IF、rasterixdisplay、rasterixmem_wrapperはrasterixラッパーの内部にあるが、この外枠は省略する。映像は表示回路と差動出力を経てHDMI OUT端子から出る。状態通知の同期回路、映像クロック生成、リセット配線、割込み配線は省略する。\n\n色の意味\n青い線・枠・文字は、本編で説明した機能とデータの移動に対応する。4〜5枚目のPC・PC+4・レジスタ群・ALU・読み書き、6枚目のバスとDDR3接続、7枚目のSDカード制御、8〜9枚目の描画用窓口・画像の保存と表示を青で示す。途中にある黒枠の回路の内部まで説明済みという意味ではない。「+2 / +4」のうち本編で説明した「+4」だけを青字にする。濃い塗りはAMD提供IP、薄い青の背景はFPGAや機能単位のまとまりを示し、説明範囲とは区別する。");
drawWallyOverview(s,api);

s.hidden=true; outline[outline.length-1].backup=true;

const ddcaDataRoot=process.env.PRESENTATION_DDCA_ASSET_DIRECTORY||path.join(root,'source/presentation/ddca-adoption');
const ddcaData=JSON.parse(await fs.readFile(path.join(ddcaDataRoot,'records.json'),'utf8'));
const ddcaGeography=JSON.parse(await fs.readFile(path.join(ddcaDataRoot,'prefectures.json'),'utf8'));
const ddcaSummary=summarizeDdca(ddcaData);
const ddcaSources=ddcaData.records.map(r=>`${r.id} ${r.institution}、${r.academic_year===null?'年度不明':r.academic_year+'年度'}「${r.course}」、${r.book_role}。${r.source_url}`).join('\n');
s=slide('質問用：DDCAを教材に挙げる授業の広がり',0,
  `DDCAは、高専・大学の学部・大学院の授業で、教科書や参考書として挙げられています。過去の指定も含めて、公式の公開資料から${ddcaSummary.institutions}機関・${ddcaSummary.prefectures}都道府県で確認できました。1枚の地図にまとめ、同じ県で複数の区分を確認した場合は、それらの色の縞模様にしています。すべての採用校を調べたものではありません。`,
  '学校別の出典：docs/presentation/DDCA授業利用の出典.md。確認日：2026-10-26。\n'+ddcaSources+'\n地図：lalamalink, https://github.com/lalamalink/japan-map-svg (CC0 1.0)。',
  `図は、DDCAを公式シラバス・授業資料の教科書・教材・参考書欄で確認した例を示す。日本語版と英語版、MIPS版・ARM版・RISC-V版などを含む。区分別では${ddcaSummary.categories.map(c=>c.label+c.institutions+'機関').join('、')}である。東京大学と広島大学は学部・大学院の両方に例があるが、全体ではそれぞれ1機関と数える。重複を除いた合計は${ddcaSummary.institutions}機関・${ddcaSummary.prefectures}都道府県である。区分は学校名ではなく授業の対象課程を表す。所在地は授業のキャンパスや開催地を使い、大学本部の住所でまとめない。教科書と参考書は出典一覧で区別する。参考書欄への掲載だけから、授業で毎回使うことや全学生の購入までは分からない。年度が分かる資料は${ddcaSummary.firstYear}〜${ddcaSummary.lastYear}年度である。開志専門職大学と長崎大学は授業年度不明、京都大学は2026年度授業ページからリンクされている資料である。現在も同じ指定が続くことや、同一年度の全国分布を示すものではない。縞模様は同じ県に複数の区分があることを示し、各色の面積は機関数に比例しない。灰色はこの一覧で未確認という意味で、使う学校がないという意味ではない。全国の全校・全年度を網羅していないため、色の面積や県数を採用率・市場シェアとして解釈しない。図書館の蔵書だけや書店の取扱いだけは根拠にしない。高知大学の資料は授業名とシラバス掲載図書を対応づけた公式一覧である。長崎大学は公式学部サイトの個別授業紹介を根拠とする。DDCAの掲載例は、RVSOCの採用実績や本研究の教育効果を直接示さない。授業・年度・版・確認箇所はDDCA授業利用の出典.mdを参照。地図の着色と集計はsource/presentation/ddca-adoption/records.jsonから生成する。地図は都道府県の形を簡略化した比較用の図である。`);
text(s,'教科書・参考書への掲載例（過去の指定を含む）',64,118,1152,38,26,true,C.ink);
drawDdcaMap(s,api,ddcaData,ddcaGeography);
foot(s,'出典：各校の公式資料と出典一覧。地図：lalamalink（CC0 1.0）。確認日：2026-10-26');
s.hidden=true;outline[outline.length-1].backup=true;

const total=outline.reduce((n,s)=>n+s.seconds,0);
if(outline.length!==13||total!==355)throw new Error(`Unexpected allocation ${outline.length} slides, ${total} seconds`);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2)+'\n');
const md=[
  '# 中間発表：FPGAを用いた2Dゲーム機の製作',
  '本編11枚と質問用2枚です。2枚目でFPGAの仕組み、3枚目で研究の目的を説明します。4枚目でlw、5枚目でswを、FPGA内のメモリを使って説明します。6枚目では同じ図にバスと外付けDDR3への接続を加えます。その後、SDカード、描画と表示を順に加えます。',
  '[PowerPoint版](中間発表_主要事項.pptx) / [アブスト](../abstract/アブスト_主要事項.md) / [論文本文](../thesis/本文.md) / [技術付録](../thesis/技術付録.md) / [再生成方法](../../source/presentation/board-evolution/README.md) / [DDCA授業利用の出典](DDCA授業利用の出典.md)',
  '## 図の見方',
  '2〜3枚目の外側の枠はFPGAボード、内側の青い枠はFPGAチップです。SDカードスロット、DDR3メモリ、HDMI端子は、チップの外に実物として取り付けられた部品です。2枚目では左のHDLコードをチップ内のAND回路と対応づけ、回路を記述して実装することを説明します。AND回路だけで周辺部品を制御するという意味ではありません。3枚目では、同じボード図のチップ内を教育用CPUと描画機能に置き換え、本研究で作るゲーム機の概要を示します。',
  '4〜5枚目はFPGAチップの囲いだけを大きく表示し、外側のボードや周辺部品を省きます。4枚目は命令メモリとデータメモリをFPGA内に置いた構成でlwを説明します。5枚目では同じ大きさと配置の図にPC+4の経路を加え、swによってx1の値3をデータメモリの12番地へ書く流れを追います。6枚目ではその図を縮めてボード全体を示し、バスとAMD提供のDDRコントローラーを加えます。命令とデータの保存先を外付けDDR3へ広げ、「命令メモリ」の箱をバス経由の「命令読出し」の箱へ替えます。swが番地と書く値を渡す仕組みは同じです。',
  '6〜9枚目はボード外周、青いFPGAチップの枠、右側の外付け部品を同じ位置に保ちます。SD制御回路は7枚目、描画回路は8枚目、表示回路は9枚目で接続を詳しく示します。CPU、描画回路、表示回路のメモリアクセスはDDRコントローラーを通ります。送信用アダプタは描画回路の箱に含めます。線は機能上の経路をまとめており、電気的に異なる信号を短絡する図ではありません。模式図の部品配置は、実物の配置をそのまま示すものではありません。',
  '4〜5枚目のFPGA内メモリの構成は命令を説明するためのモデルであり、現在の実機構成を示したものではありません。0・4・8・12などの番地も説明例です。AMD提供のメモリ制御回路は、接続する端子と役割を示し、内部の作り方は展開しません。キャッシュ、番地変換、仲裁などの詳細は技術付録に記載します。',
  '## 発表時間と質問用スライド',
  '本編の配分は動画の再生30秒を含め355秒です。2枚目は20秒、3枚目は15秒を割り当てています。動画を再生しながら結果を説明します。6分まで5秒の余裕を置きます。これは練習を実測した時間ではありません。12〜13枚目は非表示の質問用スライドです。13枚目はDDCAの授業利用例を示す日本地図です。通常のスライドショーでは本編11枚を表示します。',
  '## 目次',
  outline.map((o,i)=>'- ['+(i+1)+'. '+o.title.replaceAll('\n','')+'](#slide-'+(i+1)+')'+(o.backup?'（質問用）':'')).join('\n')
];
outline.forEach((o,i)=>md.push('<a id="slide-'+(i+1)+'"></a>\n## '+(i+1)+'. '+o.title.replaceAll('\n',''),
  o.backup?'質問時に参照する資料。本編の発表時間には含めません。':'説明時間の配分：'+o.seconds+'秒',
  '!['+o.title.replaceAll('\n','')+'](slides/slide-'+String(i+1).padStart(2,'0')+'.png)',
  ...(i===12?['[教育機関・授業・年度・指定の種類・出典の一覧](DDCA授業利用の出典.md)',
    'スライドに示した学校名の例：'+ddcaSummary.categories.map(c=>c.label+'は'+c.examples.join('・')).join('、')+'。']:[]),
  ...(i===9?['[30秒の実機動画を開く](../thesis/再現資料/実験記録/E6/report/results/video/breakout-latest-30s.mp4)','PowerPointには動画を埋め込んでいます。スライドショー中に動画の領域をクリックして再生します。']:[]),
  o.backup?'### 質問時の使い方':'### 発表原稿',o.narration,
  '<details>\n<summary>補足説明と出典</summary>\n',o.detail,o.source?'出典：'+o.source:'','\n</details>'));
md.push('## 動作確認と詳しい実装',
  '実機の結果は既存のE6に基づきます。製品版は261832d48832dd6e26c4971ab8893ce61200688bです。5分間の実行記録でゲームの処理が続いたことを、別試行の30秒映像でゲーム画面とボールの動きを確認しています。[実験記録E6](../thesis/再現資料/実験記録/E6/README.md)から記録を参照できます。4〜6・8枚目の命令と値は経路の説明例で、実測波形ではありません。ゲームコントローラは今後の項目です。',
  '詳しい実装と再現手順は[技術付録](../thesis/技術付録.md)にまとめています。',
  '## 図と書式の出典',
  'CPU内部の簡略図はDDCA第7章、回路記号や書式はRVSOC図7.11などを参考にしています。チップ内の拡大図からボード全体へ視野を広げ、6〜9枚目では外付け部品の位置を固定して説明します。12枚目はRVSOCと製品RTLを基にした機能単位のブロック図で、個々の論理回路や全HDL信号、物理配置を網羅するものではありません。13枚目の地図は各校の公開シラバスなどと、lalamalinkのCC0地図データを基にしています。公開版の表紙では個人情報を伏せています。[デザインと出典](../../source/presentation/board-evolution/README.md)に省略範囲と再生成方法を記載しています。');
await fs.writeFile(path.join(workspace,'中間発表_主要事項.md'),md.join('\n\n')+'\n');
const raw=path.join(workspace,'raw-candidate.pptx'),poster=path.join(workspace,'poster-candidate.pptx'),candidate=path.join(workspace,'candidate.pptx');
await(await PresentationFile.exportPptx(P)).save(raw);
if(audience==='public'){
  const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,poster,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
  if(scrub.status!==0)throw new Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
}else await fs.copyFile(raw,poster);
const embedding=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'source/presentation/board-evolution/embed_video.py'),poster,candidate,path.join(root,VIDEO),'--review',path.join(root,'publication/media-review.json'),'--slide','10'],{encoding:'utf8'});
if(embedding.status!==0)throw new Error(embedding.stderr||embedding.stdout||'Video embedding failed');
await fs.writeFile(path.join(workspace,'video-embedding.json'),embedding.stdout);
if(process.env.PRESENTATION_PREVIEW_ONLY==='1'){
  for(const i of P.slides.items.keys()){
    const png=await P.export({slide:P.slides.items[i],format:'png',scale:1});
    await fs.writeFile(path.join(workspace,'slides',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
  }
  console.log('Preview complete');process.exit(0);
}
const final=path.join(workspace,'final','中間発表_主要事項.pptx');
await finalizePresentation({workspaceDir:workspace,candidatePath:candidate,finalPath:final,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:13,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font,latinFont,codeFont]},verifyArtifactToolImport:true,receiptPath:path.join(workspace,'validation.json')});
const imported=await PresentationFile.importPptx(await FileBlob.load(final));
for(const[i,s]of imported.slides.items.entries()){
  const png=await imported.export({slide:s,format:'png',scale:outline[i].backup?2:1});
  await fs.writeFile(path.join(workspace,'slides',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({final,audience,slides:outline.length,seconds:total,narrationCharacters:outline.reduce((n,s)=>n+s.narration.length,0)}));
