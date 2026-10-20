import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { drawWallyCircuit } from './wally-circuit.mjs';
import { drawFetch, drawLoadStore, drawConsole } from './simple-circuit.mjs';

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
  if(n===1||n===13){text(s,value,64,665,1110,30,16,false,C.old);return;}
  const captionY=n===9?187:665;
  text(s,(n===9?'表 ':'図 ')+n,64,captionY,63,30,17,true,C.heading);
  text(s,value,131,captionY,1028,30,16,false,C.ink);
}
function slide(title,seconds,narration,source,detail) {
  const s=P.slides.add();s.background.fill=C.white;
  const n=P.slides.items.length;
  if(n===1){
    text(s,title,105,185,1070,150,48,true,C.ink,'center');
  }else{
    text(s,String(n),64,33,59,82,38,true,C.ink);
    text(s,title,132,33,1084,82,38,true,C.heading);
  }
  if(n!==1)text(s,String(n),1184,665,32,30,18,false,C.old,'right');
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


const api={text,box,polygon,route,wire,C};
const audience=process.env.PRESENTATION_AUDIENCE||'public';
if(!['public','private'].includes(audience))throw new Error('Invalid audience');
const cover=audience==='private'?JSON.parse(await fs.readFile(process.env.PRESENTATION_PRIVATE_COVER_JSON,'utf8')):{student:'発表者：非公開',supervisor:'指導教員：非公開'};

const DDCA='Harris, S. L. and Harris, D., Digital Design and Computer Architecture: RISC-V Edition (2021), Chapter 7. Official figure source: https://pages.hmc.edu/harris/ddca/ddcarv.html (DDCArv_Figures.zip).';
const RVSOC='Harris et al., RISC-V System-on-Chip Design, Chapters 7–13, 20, 22–23. Official figure source: https://pages.hmc.edu/harris/ddca/rvsocd.html (RVSoCD_figs.zip).';
const PHOTO='Digilent, Nexys Video product photograph: https://digilent.com/shop/nexys-video-amd-artix-7-fpga-trainer-board-for-multimedia-applications/ . Board identification: Nexys Video Reference Manual (2020), pp.3-4. Image copyright Digilent.';
const PRODUCT='Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl.';
const E6='docs/thesis/再現資料/実験記録/E6/fresh-product/qualification/qualification.json; docs/thesis/再現資料/実験記録/E6/report/results/video/validation.json. Photograph: docs/thesis/figs/fifo-study-game.png.';


let s=slide('FPGAを用いた二次元ゲーム機の\n設計と実装',5,
  'この題目で発表します。',
  '',
  '表紙は題目と発表者・指導教員の情報のみを示す。公開版は個人情報を伏せる。');
wire(s,190,371,1090,371,C.heading,false,1.7);
text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');

s=slide('命令メモリから、実行する命令を読む',25,
  'CPUは、まず実行する命令をメモリから読みます。PCはその番地を保存するレジスタです。0番地からlwを読むと、解読回路が、使うレジスタや読み書きの種類を決めます。この例では次の命令は4番地です。命令メモリとデータメモリを分けた簡単なCPUから説明します。',
  DDCA+' Chapter 7, single-cycle processor instruction fetch; RVSOC Figure 7.11.',
  'DDCAの単一サイクルCPUの主要な命令読出し経路を描き直した。PC、命令メモリ、命令の解読、PC+4を示す。メモリの箱内のlwとswは機械語の読みやすい表記であり、CPUが文字列を解釈するという意味ではない。例の二命令はいずれも32ビット、分岐しない場合なので番地を4ずつ増やす。圧縮命令、分岐、例外、リセットと待機制御は省略する。PCの三角はクロック入力。次のlwとswで示す0番地・4番地はデータメモリの番地で、この命令メモリの番地とは区別する。Wallyでは命令とデータが同じDDR3に置かれる場合があるが、それは後のバス接続の図で説明する。');
drawFetch(s,api);
foot(s,'PCと命令メモリを含む簡略図。命令の番地と、命令が読み書きするデータの番地は別');

s=slide('lw：データメモリから値を読む',30,
  '読み出したlwの動きを見ます。x0は常に0なので、ALUで0足す0を計算し、データの番地0を作ります。その場所にある3を読み、青い帰り道でx1へ保存します。命令は、どの番地を読み、どのレジスタに保存するかを指定しています。',
  DDCA+' Figures 7.8 and 7.12, reduced load datapath.',
  '命令lw x1,0(x0)を読み出し、解読した後のデータ経路を拡大している。A1=0、A3=1、即値=0、RegWrite=1、MemWrite=0。x0の読出し値は常に0。データメモリ0番地に3が格納済みの説明例である。命令フィールドからレジスタ番号・即値・制御信号への配線は省略する。extendは即値の生成・符号拡張を表す組合せ回路で、保存用レジスタではない。Register Fileはレジスタ群であり単一のフリップフロップとは異なる。三角記号は書込みの基準となるクロック入力を示す。PCと命令読出しは前の図で説明済みのためこの拡大図では表示しない。これはWallyの完全なRTLではない。');
text(s,'lw x1, 0(x0)　：　データの0番地から、x1へ読む',64,136,1152,49,29,true,C.blue);
drawLoadStore(s,api,true);
foot(s,'A：番地／レジスタ番号　RD：読出し値　WD：書込み値　WE：書込許可。灰色は不使用');

s=slide('sw：レジスタの値をメモリへ書く',30,
  '続くswでは、同じALUで0足す4を計算し、データの番地4を作ります。保存する3はx1から、別の青い線を通してメモリへ送ります。書込みを許可すると4番地へ保存されます。この、番地と値を渡す動作を、後で描画回路にも使います。',
  DDCA+' Chapter 7, store datapath.',
  'sw x1,4(x0)でrs1=0、rs2=1、S形式の即値=4。RD1=0をALUへ、RD2=3をData MemoryのWDへ渡す。RegWrite=0、MemWrite=1。A3とWD3は保存に使わない。swの[11:7]はrdではなく即値の一部なのでA3を未使用として示す。データメモリのクロックとバイト許可信号は省略する。RegWriteとMemWriteを図では各ブロックのWE3、WEに対応させている。');
text(s,'sw x1, 4(x0)　：　x1の3を、データの4番地へ書く',64,136,1152,49,29,true,C.blue);
drawLoadStore(s,api,false);
foot(s,'番地を作る線と、書く値を運ぶ線を分ける。青い線がswで追加して使う経路');

s=slide('命令とデータを、バス経由で読む',25,
  '実際の構成では、命令やデータを大きなDDR3メモリに置きます。CPU内のレジスタやALUを残し、メモリとの間をバスでつなぎます。命令の番地はPCから、データの番地はALUから出ます。バス接続が要求を送り、相手の応答を待ちます。',
  RVSOC+' Chapters 9–11 and 23. '+PRODUCT,
  '単一サイクルの説明を、外部メモリへ接続した機能図へ進める。左のCPU箱は命令読出し、整数演算、バス接続をまとめており、Wallyのパイプライン、MMU、キャッシュ、EBUは展開しない。PCとALUからの要求を同時に一本へ短絡するものではなく、実際には命令側・データ側の経路、調停、アドレス変換等を経る。「バス接続」は関連回路をまとめた説明名で、単一のHDLモジュール名ではない。DDR3制御にはAHB/AXI変換、クロック接続、MIG等を含める。青い読出し線はバス側から解読回路へ命令が戻ることを示す。データの読出しの戻り線は複雑化を避けて省略する。DDR3はFPGA外部。全ての命令・データアクセスが必ずバスへ出るという意味ではなく、キャッシュ等の動作をこの説明では省く。');
text(s,'CPUの演算回路を残し、メモリとの間にバス接続を置く',64,136,1152,45,29,true,C.blue);
drawConsole(s,api,'bus');
foot(s,'機能をまとめた接続図。命令・データのキャッシュ、番地変換、パイプライン、仲裁は省略');

s=slide('SDカードからDDR3へ読み込み、実行する',35,
  'SDカードにはゲームと描画用のソフトウェアを保存します。Linuxが必要な内容を、SD制御回路を通してDDR3へ読み込みます。その後、CPUはDDR3側から命令を読み出して実行します。RasterIXを操作するソフトウェアも、このCPU上で動くプログラムの一部です。',
  RVSOC+' Chapter 23. '+PRODUCT+' console/linux/devicetree/wally-nexysvideo-rasterix.dts; console/src/uncore/uncore.sv; console/examples/rasterix/',
  'SDカードのプログラムがCPUから直接実行される図ではない。OSとドライバーがSD制御回路を操作し、必要なファイル内容をRAMへ読み込む。右の青い上向き矢印はこの論理的な読み込みを表し、SDとDDR3を直結したDMAの配線ではない。全実行ファイルを必ず最初に一括転送するという意味でもない。ユーザープログラムの実行では、CPUがDDR3内の命令を命令読出し経路から取得する。物理番地はDDR3が0x80000000から512 MiB、SD制御レジスタが0x00013000。SDはspi_apbのsdcインスタンスを用いたSPI接続で、カードをRAMと同じ方法で直接ロード／ストアするのではない。ソフトウェアにはゲームとRasterIX用ライブラリ・接続処理を含む。RasterIXのハードウェア自体はFPGAの構成データに含まれ、ゲーム用のSDファイルからCPUが実行するプログラムではない。');
text(s,'保存場所はSDカード、実行時の置き場所はDDR3',64,136,1152,45,29,true,C.blue);
drawConsole(s,api,'software');
foot(s,'青い上向き矢印はOSによる読み込みを表す。SDカードとDDR3を直接結ぶ配線ではない');

s=slide('同じバスへ、RasterIXの窓口を追加する',35,
  'この簡略図に、描画用の接続回路とRasterIXを加えます。実行中の描画ソフトウェアは、描画命令の数値列を作ります。その1語を、CPUのswで描画用の番地へ書きます。番地によってDDR3やSD制御とは別の窓口が選ばれ、APBを通って接続回路へ届きます。',
  PRODUCT+' console/fpga/src/rasterix_apb.sv; console/fpga/src/rasterix.sv; console/src/uncore/ahbapbbridge.sv; console/linux/devicetree/wally-nexysvideo-rasterix.dts.',
  '通常CMD窓口の物理番地は0x10080000で、EXT_IO領域0x10080000〜0x100800ffにある。図のBはCPUがアクセスする仮想番地であり、Linuxではmmap等で得た仮想アドレスを用いる。Bを物理定数そのものとして使うとは限らない。簡略図では番地変換を省略する。Dは描画命令列の一つの32ビット語であり、CPUが実行するRISC-V命令swの機械語とは別の内容。接続回路内にAPBアダプターと非同期FIFOがあり、次の図で拡大する。SD制御と描画用の窓口は、同じAHB/APBブリッジの先にある。図でも一つのAPB変換回路から二つへ分岐させている。RasterIX本体は公式コードを変更せず使う。図はCPUから描画命令を送る経路に限定し、RasterIXのDDR3アクセスと表示経路は10枚目で示す。');
text(s,'本研究では、CPUから描画命令を渡す接続を加える',64,136,1152,45,29,true,C.blue);
drawConsole(s,api,'graphics');
foot(s,'Dは描画命令の1語。CPUが実行するsw命令とは別。0x10080000は窓口の物理番地');

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

s=slide('受け取れるまで、同じ値を保って待つ',25,
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


s=slide('回路をHDLで記述し、FPGAへ実装する',35,
  'ここまでの簡略図に対し、実際のWallyには、途中の値を保存するレジスタや、値を選ぶMUXなども入ります。図と同じ回路を、右のようなHDLのコードで記述しています。例えばこのコードは、クロックに合わせて値を保存する回路です。設計ツールが回路をFPGA用の構成データへ変換し、写真のチップに設定します。',
  RVSOC+' Figure 7.11, Figure 9.20 and Chapter 23. '+PRODUCT+' console/src/ieu/datapath.sv; console/src/generic/flop/flopenrc.sv; console/src/lsu/lsu.sv. '+PHOTO,
  'Wallyの主要データパスを示す。内部の回路記号と構成はRVSOC図7.3（基本ALU）、7.6（比較器）、7.7（命令解読）、7.19（ハザード）、9.14（AHB/APB）、9.25（EBU）、10.13・10.24（キャッシュ）、11.15（MMU）、20.4（GPIO）、20.11（UART）および製品RTLを基に再構成した。メモリは配列、白い細長い箱はレジスタ、台形は値を選ぶMUXである。MMUはTLBの結果と変換しない番地を選び、物理番地をPMP/PMAで検査する。キャッシュはタグを照合してデータを選ぶ。I-cacheの図にはCPUによる書込みを描いていない。ALUは加減算、シフト、論理演算などの結果を選ぶ。レジスタファイルは記憶配列と書込み先の解読、二つの読出し選択を示し、x0は0として扱う。EBUは命令側とデータ側の要求を選ぶ。AHB/APBブリッジは番地と制御の保存、書込みデータの転送、読出し応答の選択を示す。UARTは送信経路、GPIOは出力経路の代表部分を示す。hazardにはStallD=StallDCause|StallEとFlushE=(~StallE&StallD)|FlushECauseを例示する。複数の信号をまとめた接続線や省略した制御経路がある。全HDL信号、全機能、配置配線後の物理形状を網羅した図ではない。青い塗りは簡略図で説明した機能、青い枠は追加した描画接続を表す。\n\n右のコードはflopenrc.svのalways_ff本文で、同期リセットを最優先し、enが1のときだけclearまたはデータdを取り込む。enが0のときは保持する。clearは常時有効な非同期リセットではない。左のRD1EReg、RD2EReg、ImmExtEReg等の段間レジスタに使われている。コード内の0は幅に応じた全ビット0。図からコードを自動生成したという実験ではなく、図とHDLが同じ回路の構造・動作を表す関係を説明している。\n\nHDLはCPUでゲームのように逐次実行するものではない。合成と配置配線でLUT、フリップフロップ、BRAM、配線等の構成を決め、ビットストリームをFPGAへ設定する。写真の中央の放熱器の下にArtix-7 FPGAがある。写真はDigilentの製品写真で、本研究で撮影したものではない。ゲーム用ソフトウェアのSD→DDR→CPU実行と、HDL→構成データ→FPGA設定は異なる経路である。');
text(s,'回路図（HDLの構造を示す）',55,137,740,39,27,true);
await drawWallyCircuit(s,{...api,dot:()=>{}},true,{x:55,y:190,scale:0.67});
// Show one real RTL behavior next to the corresponding circuit family.
text(s,'HDL：レジスタの記述例',868,137,347,39,27,true);
wire(s,820,304,853,304,C.blue,true,2.8);
text(s,'flopenrc.sv',872,185,339,31,23,true,C.blue);
const code=`always_ff @(posedge clk)
  if (reset)   q <= '0;
  else if (en)
    if (clear) q <= '0;
    else       q <= d;`;
const codeShape=text(s,code,871,227,346,154,20,false,C.ink);
codeShape.text.style={typeface:codeFont,fontSize:20,bold:false,color:C.ink,alignment:'left',verticalAlignment:'middle',wrap:'square'};
text(s,'設計ツールで合成・配置配線',854,391,371,34,23,true,C.blue,'center');
wire(s,1040,429,1040,459,C.blue,true,2.8);
const photo=process.env.PRESENTATION_BOARD_PHOTO||path.join(root,'source/presentation/assets/nexys-video.png');
s.images.add({blob:await fs.readFile(photo),contentType:'image/png',alt:'Nexys Videoの中央の放熱器の下にFPGAがある。Digilent製品写真',fit:'contain',position:{left:928,top:464,width:243,height:181}});
box(s,'',1030,523,37,35,'none',18,C.blue,2.4);
route(s,[[1200,603],[1200,541],[1067,541]],C.blue,false,1.8);
text(s,'構成データを\nFPGAに設定',840,588,200,59,22,true,C.blue,'center');
text(s,'FPGA',1163,594,74,28,20,true,C.blue,'center');
text(s,'写真：Digilent',1024,646,192,23,14,false,C.old,'center');
text(s,'白い細長い箱：レジスタ　　台形：MUX（値の選択）',64,607,754,36,22);
foot(s,'内部構成は RVSOC と製品RTLを基に再構成。主要な回路と接続を示す');

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


s=slide('Wallyをゲーム機へ拡張する設計例を示した',10,
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
if(outline.length!==13||total!==330)throw new Error(`Unexpected allocation ${outline.length} slides, ${total} seconds`);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2)+'\n');
const md=[
  '# 中間発表のスライドと発表原稿',
  'FPGAを用いた二次元ゲーム機の設計と実装を13枚で説明します。命令メモリ、データの読み書き、バス、SDカードとDDR3を順に説明し、同じ簡略図にRasterIXを追加します。詳細なWallyの回路とHDL・FPGAの対応は11枚目にまとめています。',
  '[PowerPoint版](中間発表_主要事項.pptx) / [アブスト](../abstract/アブスト_主要事項.md) / [論文本文](../thesis/本文.md) / [技術付録](../thesis/技術付録.md) / [図の出典・再生成](../../source/presentation/README.md)',
  '## 図の見方',
  '2枚目のPCは命令の番地を保存し、命令メモリから次に実行する命令を読み出します。3・4枚目は、その命令で値を読み書きする部分の拡大図です。命令メモリの番地と、データメモリの番地を区別してください。5〜7枚目では、CPU内の位置を保ったまま外部メモリ、SDカード、描画回路へ接続を広げます。',
  '白い箱は回路、淡い青は回路のまとまりを示します。三角記号を付けたレジスタの端子はクロック入力です。太い線は複数ビットの値、細い線は制御を表します。機器間の接続線には複数の信号をまとめたものもあります。青はその図で注目する経路や機能です。11枚目の内部構成はRVSOCと製品RTLを基に再構成しています。主要な回路と接続を示し、全てのHDLの信号や物理配置を表してはいません。',
  '6枚目のSD→DDR3の矢印はOSによる読み込みを表し、直結した電線や新設DMAを示すものではありません。CPUが実行するのはゲームと描画用ソフトウェアです。RasterIXのハードウェアは、11枚目のFPGA設定によって実装します。',
  '## 発表時間',
  '6分のうち説明に330秒を配分し、30秒を図示と切替の余裕とします。表紙は題目を述べるだけです。11枚目は全ラベルを読み上げず、レジスタ・MUXと、HDLからFPGAへ実装する関係を説明します。この時間配分は練習による実測ではありません。',
  '## 目次',
  outline.map((o,i)=>'- ['+(i+1)+'. '+o.title.replaceAll('\n','')+'](#slide-'+(i+1)+')').join('\n')
];
outline.forEach((o,i)=>md.push('<a id="slide-'+(i+1)+'"></a>\n## '+(i+1)+'. '+o.title.replaceAll('\n',''),
  '説明時間の配分：'+o.seconds+'秒',
  '!['+o.title.replaceAll('\n','')+'](slides/slide-'+String(i+1).padStart(2,'0')+'.png)',
  '### 発表原稿',o.narration,
  '<details>\n<summary>補足説明と出典</summary>\n',o.detail,o.source?'出典：'+o.source:'','\n</details>'));
md.push('## 動作確認と詳しい実装',
  '実機の結果は既存のE6に基づきます。製品版は261832d48832dd6e26c4971ab8893ce61200688bで、4条件の画像比較、300.011秒の自動プレイ、別試行の30秒映像を区別しています。[実験記録E6](../thesis/再現資料/実験記録/E6/README.md)から条件と結果を参照できます。9枚目は受渡し規則の説明例で、実測波形ではありません。専用コントローラーによる操作の検証は最終発表で扱います。',
  'ゲームの描画処理の工夫、接続方式の比較、再現手順は[技術付録](../thesis/技術付録.md)にまとめています。今回の発表では、その最適化の優劣や教育効果を結論として主張しません。',
  '## 図と書式の出典',
  '簡略化したCPUの図はDDCA第7章、回路記号・線幅・書式はRVSOC図7.11などを参考にしています。詳細図は製品RTLに基づいて描き直したもので、公式図そのものではありません。表紙は題目と発表者・指導教員の情報を置く形式ですが、公開版では個人情報を伏せています。[デザインと出典](../../source/presentation/README.md)に再生成方法と省略範囲を記載しています。');
await fs.writeFile(path.join(workspace,'中間発表_主要事項.md'),md.join('\n\n')+'\n');
const raw=path.join(workspace,'raw-candidate.pptx'),candidate=path.join(workspace,'candidate.pptx');
await(await PresentationFile.exportPptx(P)).save(raw);
if(audience==='public'){
  const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,candidate,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
  if(scrub.status!==0)throw new Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
}else await fs.copyFile(raw,candidate);
const final=path.join(workspace,'final','中間発表_主要事項.pptx');
await finalizePresentation({workspaceDir:workspace,candidatePath:candidate,finalPath:final,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','9'],explicitTotalSlideCount:13,requiredNativeTableOwnerSlides:[9],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font,latinFont,codeFont]},verifyArtifactToolImport:true,receiptPath:path.join(workspace,'validation.json')});
const imported=await PresentationFile.importPptx(await FileBlob.load(final));
for(const[i,s]of imported.slides.items.entries()){
  const png=await imported.export({slide:s,format:'png',scale:i===10?2:1});
  await fs.writeFile(path.join(workspace,'slides',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({final,audience,slides:outline.length,seconds:total,narrationCharacters:outline.reduce((n,s)=>n+s.narration.length,0)}));
