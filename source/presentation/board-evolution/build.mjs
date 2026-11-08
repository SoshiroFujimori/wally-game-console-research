import { drawAbstractSystem, drawAbstractAccess, drawConceptCode } from './abstract-flow.mjs';
import { CONTENTS_SLIDE, drawContents, linkToSlide, contentsMarkdown, navigationTargets } from './navigation.mjs';
import { drawRasterixPipeline, RASTERIX_PIPELINE_SOURCE, RASTERIX_PIPELINE_NARRATION, RASTERIX_PIPELINE_DETAIL } from './rasterix-pipeline.mjs';
import { createCircuitWiring } from './circuit-wiring.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadRvsocAdoption, drawRvsocAdoption, RVSOC_ADOPTION_NARRATION, RVSOC_ADOPTION_DETAIL } from './rvsoc-adoption.mjs';
import { loadFpgaUtilization, drawFpgaUtilization, FPGA_UTILIZATION_SOURCE, FPGA_UTILIZATION_NARRATION, FPGA_UTILIZATION_DETAIL } from './fpga-utilization.mjs';
import { drawFpgaResources, FPGA_RESOURCE_SOURCES, FPGA_RESOURCE_NARRATION, FPGA_RESOURCE_DETAIL } from './fpga-resources.mjs';
import { drawWallyOverview } from './wally-overview.mjs';
import { drawDdcaMap, summarizeDdca } from './ddca-map.mjs';
import { drawImplementationFlow } from './board-circuit.mjs';

const [root, workspace] = process.argv.slice(2);
if (!root || !workspace) throw new Error('Usage: build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(process.env.RUNTIME_NODE_MODULES, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(process.env.PRESENTATION_SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
await fs.mkdir(path.join(workspace, 'final'), { recursive: true });
await fs.mkdir(path.join(workspace, 'slides'), { recursive: true });
const P = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { ink:'#231F20', blue:'#1572C3', pale:'#E5EBF8', chip:'#CCD9F1', ip:'#77A3DC', old:'#777777', heading:'#0078BA', white:'#FFFFFF' };
const font='Yu Gothic', latinFont='Arial', codeFont='Consolas'; let serial=0; const outline=[]; const pageNumbers=[];
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
const wiring=createCircuitWiring();
const {wire,route,junction}=wiring;
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
  if(!diagramOnly){
    const page=text(s,String(n),1184,684,32,26,18,false,C.old,'right');
    page.name=`contents-return-${n}`;pageNumbers.push({page,number:n});
  }
  s.speakerNotes.text=`説明時間の目安：${seconds}秒\n\n${narration}\n\n出典：${source}\n\n補足説明：${detail}`;
  outline.push({title,seconds,narration,source,detail});return s;
}
const api={text,box,polygon,route,wire,junction,C};
const audience=process.env.PRESENTATION_AUDIENCE||'public';
if(!['public','private'].includes(audience))throw new Error('Invalid audience');
const cover=audience==='private'?JSON.parse(await fs.readFile(process.env.PRESENTATION_PRIVATE_COVER_JSON,'utf8')):{student:'発表者：非公開',supervisor:'指導教員：非公開'};

const DDCA='Harris, S. L. and Harris, D., Digital Design and Computer Architecture: RISC-V Edition (2021), Chapter 7. Official figure source: https://pages.hmc.edu/harris/ddca/ddcarv.html (DDCArv_Figures.zip).';
const RVSOC='Harris et al., RISC-V System-on-Chip Design, Chapters 7–13, 20, 22–23. Official figure source: https://pages.hmc.edu/harris/ddca/rvsocd.html (RVSoCD_figs.zip).';
const PRODUCT='Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl.';
const VIDEO='experiments/breakout-title-top-20261108/video/breakout-30s.mp4';
const POSTER='experiments/breakout-title-top-20261108/video/playing.png';
const BASIC='experiments/basic-operation-20261108/README.md; results.json and hdmi/source-manifest.json. Captured 2026-11-08. Later title-layout recording: experiments/breakout-title-top-20261108/README.md and results.json. Video: '+VIDEO;
const PROVENANCE_DETAIL='CPU・バス・SD制御はWally（CVW）の既存RTLを利用する。DDR制御はWally側の生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。動作確認動画のE8構成では、表示本体を研究用の読出し回路とhdl-util/hdmiへ置き換えているため、標準構成の提供元とは区別する。';
const PROVENANCE_SOURCE='Wally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. E8: experiments/basic-operation-20261108/hdmi/source-manifest.json.';


let s=slide('FPGAを用いた2Dゲーム機の製作',5,
  'この題目で発表します。',
  '',
  '表紙は題目と発表者・指導教員の情報のみを示す。公開版は個人情報を伏せる。');
wire(s,190,371,1090,371,C.heading,false,1.7);
text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');

s=slide('FPGAチップで周囲の部品を制御する',25,
  'FPGAボードには、SDカードスロット、DDR3メモリ、HDMI端子が付いています。中央のFPGAチップには、それらを制御する回路を実装できます。回路はコードで記述します。例えば左のコードは、右のAND回路を表します。本研究では、このチップにCPUや描画回路を実装します。',
  DDCA+' Chapters 2 and 4. '+RVSOC+' Chapter 23. Nexys Video Reference Manual.',
  'AND回路はHDLと論理回路の対応例であり、周辺部品を制御する回路の全体ではない。外部部品はボード上に実物として存在する。FPGA内の配線や回路は設定データによって構成される。図の配置は物理配置の再現ではない。');
text(s,'SDカードやメモリを制御する回路を、チップ内に実装できる',64,129,1152,52,29,true,C.blue);
drawImplementationFlow(s,api);
text(s,'回路をHDLコードで記述し、FPGAチップ内に実装する',64,645,1152,32,28,true);
foot(s,'HDLの例とAND回路の対応');

s=slide('教育用CPUをゲーム機へ拡張する',30,
  '教育用CPUのWallyを基に、描画回路をつなぎ、ゲーム機を製作しました。CPU、SD制御、メモリ制御の接続にはWally側の仕組みを使います。描画回路には既存のRasterIXを使い、その間をつなぐ回路を追加しました。目的は、Wallyの学習者に、ゲーム機として利用する拡張例を示すことです。',
  RVSOC+' '+PRODUCT+' source/abstract/content.json; source/abstract/README.md.',
  '機能の配置とデータの経路を示す全体図。CPUや描画回路の内部を新規に設計したという主張ではない。接続回路にはバス側の受付、クロック間転送、描画命令の受渡しなどが含まれる。主図では表示回路をその機能で表し、特定の出力方式や提供元を割り当てない。実機記録の構成と標準構成の差分は再現資料に記録する。');
text(s,'既存のCPU・描画回路と、本研究で追加した接続回路',64,129,1152,44,29,true,C.blue);
drawAbstractSystem(s,api,'all');
text(s,'目的：Wallyの学習者に、ゲーム機への拡張例を示す',64,603,1152,56,31,true);
foot(s,'線はデータの通り道を表す。CPUによる読書きの信号を次に示す');

s=slide('アドレスで相手を選び、値を書く',50,
  'CPUと周辺回路の読書き部分を拡大します。CPUから出すのは、相手を指定するアドレスAD、書込みデータWD、書込みイネーブルWEです。アドレスデコーダがADを見て、相手を一つ選びます。この例では、DDR3の先頭を表すアドレスなので、DDR制御を選ぶS1だけが1になります。CPUがWDに7を出し、WEを1にすると、選ばれたDDR制御がその値を受け取り、メモリへ保存します。SD制御や描画側への書込みも、この考え方で行います。',
  PRODUCT+' console/src/uncore/uncore.sv; console/src/mmu/adrdecs.sv; console/config/derivlist.txt. '+RVSOC+' Figure 9.28.',
  '読書きの役割を示す概念図。S0〜S2は機能を説明するための選択信号名で、RTLのビット番号ではない。アドレス範囲で回路を選び、その中のアドレスで位置やレジスタを指定する。実機ではバス変換、転送幅、待ち、クロック変換、アドレス相とデータ相の関係があるが、主図では省略する。0x80000000は構成のDDR3先頭アドレスであり、安全なアプリケーション用バッファを指定する例ではない。');
text(s,'例：DDR3の 0x80000000 番地へ、値7を書く',64,119,1152,38,28,true,C.blue);
drawAbstractAccess(s,api,false);
text(s,'ADで相手を選び、WDの値をWE＝1で書く',64,647,1152,34,29,true);

s=slide('選んだ相手の値を、CPUへ戻す',40,
  '次は、同じアドレスから値を読みます。アドレスによってDDR制御が選ばれるところは同じです。読む場合は、書込みイネーブルWEを0にします。各回路からCPUへ戻る値は、下の選択回路に集まります。ここでも同じS1を使って、DDR制御からの値だけを選びます。先ほど保存した7が、読出しデータRDとして青い経路を通ってCPUへ戻ります。このように、CPUは指定した一つの回路と読書きできます。',
  PRODUCT+' console/src/uncore/uncore.sv. '+RVSOC+' Figure 9.28.',
  'WEは1ビットの書込みイネーブルである。概念図では書込みをWE=1、読出しをWE=0で表す。有効な転送が行われると仮定し、選択信号の保持、応答タイミング、待ち状態、エラー応答などを省略する。選択回路のS0〜S2は、上のアドレスデコーダが生成する選択と対応する。線を長く引かず同名の信号で接続を表す。');
text(s,'例：同じ番地から値7を読み、CPUへ返す',64,119,1152,38,28,true,C.blue);
drawAbstractAccess(s,api,true);
text(s,'アドレスで相手を選び、その相手の値だけを返す',64,647,1152,34,29,true);

s=slide('SDカードからゲームを読み込む',45,
  'この読書きを使って、ゲームプログラムを読み込みます。まずCPUがSD制御の送信先アドレスへ指示を書きます。SD制御がカードと通信し、CPUは受信先アドレスからデータを読みます。次に、そのデータをDDR3の保存先アドレスへ書きます。これを繰り返してプログラムを読み込みます。CPUは、DDR3に置かれたプログラムの命令を読んで実行します。下のコードは、この三つの操作を抜き出したものです。',
  'source/abstract/content.json; source/abstract/README.md; console/fpga/zsbl/spi.h; console/src/uncore/spi_apb.sv; console/config/rv64gc/config.vh.',
  'Cの概念コードはアドレスを直接参照できる環境を仮定し、宣言、初期化、SDの通信手順、通信待ち、volatile指定、OSのアドレス対応付けを省略する。requestは送信する1バイトであり、一回の代入だけでSDコマンド全体が完了するという意味ではない。dataの下位8ビットをDDR3へ保存する。プログラムを読み込む部分と、読み込んだゲームが動く部分を時間順に説明する。SDからDDR3へ直接DMA転送する図ではない。');
text(s,'CPUが「SD制御から読む」「DDR3へ書く」を繰り返す',64,129,1152,44,28,true,C.blue);
drawAbstractSystem(s,api,'sd');
drawConceptCode(s,api,[
 ['*(uint32_t *)0x13048 = request;','① SDへ読出しを指示する'],
 ['data = *(uint32_t *)0x1304C;','② SDからデータを読む'],
 ['*(uint8_t *)0x80000000 = data;','③ 読んだ値をDDR3へ保存する']
],578);
foot(s,'アドレスを直接使う概念コード。初期化や通信待ちなどは省略');

s=slide('描画回路へ命令を送る',45,
  'ゲームを実行すると、画面を描く処理が必要になります。ゲームは、OpenGL互換ライブラリに図形の位置や色を渡します。このライブラリもCPU上で動き、描かせる内容を数値の列に変えます。CPUが描画専用のアドレスへ値を書くと、追加した接続回路が受け取り、描画回路へ渡します。0x10080000は送信先の番地、cmdは準備した数値列の一つの値です。これが、プログラムから描画回路を使う入口です。',
  'source/abstract/content.json; console/examples/rasterix/WallyBusConnector.hpp; console/fpga/src/rasterix_apb.sv; console/addins/rasterix/lib.',
  'cmdは準備した描画命令列の途中の32ビット値を表す。スライドには通常の値を送る書込みを一つ示す。末尾の値を0x10080004へ書く処理は省略している。実装では末尾用ポートへの書込みでTLASTを付けるため、この一行だけで転送全体が完了するという意味ではない。図は命令を渡す方向を表し、命令FIFO、応答経路、クロック領域、ポーリング、転送待ちは省略する。OpenGL互換ライブラリ本体はRasterIXが提供し、Wally側でアドレスと入出力の接続部分を実装する。');
text(s,'CPU上のライブラリが、図形の位置や色を命令の数値列にする',64,129,1152,44,27,true,C.blue);
drawAbstractSystem(s,api,'command');
drawConceptCode(s,api,[
 ['*(uint32_t *)0x10080000 = cmd;','描画回路へ命令を送る']
],587);
text(s,'0x10080000：送信先の番地　　cmd：送る命令の値',78,637,1120,32,25,true);
foot(s,'描画命令の送信を抜き出した概念コード');

s=slide('画像を保存し、HDMI端子へ出力する',40,
  '描画回路は、受け取った命令に従って画像を作ります。画像は、小さな点である画素の色を並べたデータです。描画回路は、そのデータをDDRコントローラー経由でDDR3へ保存します。表示回路は、保存された画像を同じコントローラーから読み、画面表示のタイミングに合わせてHDMI端子へ出します。CPUはゲームの処理と命令の送信、描画回路は画像の作成、表示回路は映像の出力を担当します。',
  PRODUCT+' console/fpga/generator/rasterixmem.tcl; console/fpga/src/rasterixdisplay.sv. '+BASIC,
  '描画回路は内部作業領域で処理し、結果をDDR3のフレームバッファへ転送する。図はDDR制御を共有する機能上の経路を表す。メモリ仲裁、バッファ切替、画像の配置、映像の符号化方式を省略する。表示回路という箱は機能のまとまりであり、標準構成と録画用構成の内部実装が同一という主張ではない。実機映像に用いた回路の版と差分はE8の再現資料に保存している。');
text(s,'描画回路が画像を作り、表示回路がその画像を出す',64,129,1152,44,29,true,C.blue);
drawAbstractSystem(s,api,'image');
text(s,'CPU：ゲームの処理　　描画回路：画像の作成',64,596,1152,38,29,true);
text(s,'表示回路：画像を順に読み、HDMI端子へ出力',64,638,1152,38,29,true);

s=slide('実機での動作確認',30,
  'FPGAに回路を設定してゲームを起動する手順を、三回繰り返しました。毎回、HDMI端子から出した三十秒の映像を記録しました。三回とも、ボールが動くこと、壁やパドルで跳ね返ること、当たったブロックが消えることを確認しました。次に示す動画では、その動きを見ていただきます。現在は、プログラムがパドルを自動で動かしています。',
  BASIC,
  '三回はFPGAの再設定とOS起動を伴う動作確認であり、三回の電源投入試験ではない。E8の保存済み映像とイベント抽出に基づく。次のスライドに示す動画は文字配置変更後の別の30秒記録で、三回の起動確認の映像そのものではない。映像の保存レートからゲームFPSを主張しない。コントローラによる入力は未実装で、自動プレイを確認した。構成と記録の詳細は出典から参照できる。');
text(s,'FPGAに回路を設定し、ゲームを起動する手順を3回確認',64,134,1152,60,30,true,C.blue);
const steps=[['回路を設定','FPGAへ書き込む'],['ゲームを起動','SDから読み込む'],['動きを確認','各30秒の映像を記録']];
steps.forEach(([a,b],i)=>{
 const x=64+i*398;
 box(s,'',x,224,355,142,C.pale,28,C.ink,2);
 text(s,a,x+14,240,327,49,31,true,C.ink,'center');
 text(s,b,x+14,299,327,42,25,false,C.ink,'center');
 if(i<2)wire(s,x+355,295,x+388,295,C.ink,true,2.6);
});
text(s,'3回とも確認できた動作',64,415,1152,44,31,true,C.heading);
text(s,'ボールの移動　／　壁・パドルでの反射　／　ブロックの消去',64,485,1152,70,29,true);
text(s,'現在は、プログラムがパドルを動かす自動プレイ',64,594,1152,48,28,true);

s=slide('接続した構成で、ブロック崩しを動かした',30,
  'こちらは、FPGAボードのHDMI端子から記録した30秒の動画です。ボールが動き、パドルや壁に当たると跳ね返ります。また、当たったブロックが消えることも確認しました。現在は、プログラムがパドルを自動で動かしています。ゲームコントローラによる操作は未実装です。',
  `${BASIC} ${PRODUCT}`,
  '2026年11月8日に、タイトルWALLY BREAKOUTを上部中央へ移した製品ed6a1c09で取得した30秒の実機映像。SCOREは左寄せ、LIVESは右寄せである。ゲームの文字配置を更新した実行ファイルをSDカードから読み込み、30秒の自動プレイと正常終了を確認した。この録画の版・ハッシュ・文字検査はexperiments/breakout-title-top-20261108/に保存している。回路には実験E8と同じ研究用HDMI表示構成の設定データを使い、公式RasterIX 9269a01は変更していない。基本動作を3回のFPGA設定・起動と各30秒の録画で確認した記録、および300秒の継続実行は、文字配置変更前の実験E8である。表示中の動画を、その3回や300秒の記録として扱わない。パドルは自動操作。録画の保存レートをゲームFPSとして扱わない。動画領域をクリックして再生する。音声はない。');
s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'タイトルを上部へ移した実機の自動プレイ動画の一場面',fit:'contain',position:{left:64,top:151,width:676,height:380.25}});
text(s,'30秒の実機動画（クリックで再生）',64,539,676,31,23,true,C.blue,'center');
text(s,'映像で確かめたこと',791,158,425,40,28,true,C.heading);
text(s,'① ボールが動く',791,227,425,54,29,true);
text(s,'② 壁やパドルで\n　 跳ね返る',791,307,425,88,29,true);
text(s,'③ 当たったブロックが\n　 消える',791,421,425,88,29,true);
text(s,'現在は自動操作：プログラムがパドルを動かす',64,575,1152,45,29,true);


s=slide('教育用CPUを拡張し、ブロック崩しを動かした',15,
  'CPUに描画回路をつなぎ、ブロック崩しが動く拡張例を示しました。今後は、ゲームコントローラへの対応やホーム画面などのGUIの充実を検討します。',
  `${PRODUCT} ${BASIC}`,
  '既存の教育用CPUと描画回路を利用し、それらをつなぐ回路とソフトウェア側の接続を実装した。CPUや描画回路本体を新たに設計したという主張ではない。実験E8の研究用HDMI表示構成で、FPGAの設定から起動する手順を3回繰り返し、各30秒の映像で基本動作を確認した。表示差分と確認した版はE8に保存した。現在は自動操作で、ゲームコントローラによる操作は未実装である。今後の拡充候補は、ゲームコントローラへの対応と、ホーム画面などのGUIの充実である。いずれか一方または両方について、実装と動作確認ができた範囲を最終発表で報告する。回路のつなぎ方とプログラムの動かし方を公開し、Wallyの拡張例として示した。教育効果そのものを学習実験で測定したものではない。');
text(s,'今回できたこと',64,151,1152,43,31,true,C.heading);
text(s,'① 教育用CPUに描画回路をつなぎ、FPGAボードに実装した',64,214,1152,54,31,true);
text(s,'② ブロック崩しが動き、ゲーム画面を出力できた',64,284,1152,54,31,true);
text(s,'現在は自動プレイ',110,341,1060,35,25,false,C.ink);

text(s,'CPUを拡張したい人が参考にできる',64,414,1152,43,30,true,C.heading);
text(s,'回路のつなぎ方と、ゲームを動かす方法を\nソースコードと資料で示した',64,467,1152,88,31,true);

text(s,'今後：ゲームコントローラへの対応や、\n　　　ホーム画面などのGUIの充実を検討',64,574,1152,78,29);
foot(s,'GUI（Graphical User Interface）：ホーム画面やメニューなどの操作画面');


s=slide('目次：発表・質問用スライド',0,
  '質問に関係する項目をクリックすると、そのスライドへ移動します。移動した後は右下のスライド番号をクリックすると、この目次へ戻れます。',
  '',
  '本編11枚の後に置く操作用の目次である。発表スライドと質問用スライドの両方へ移動できる。質問用スライドは、教科書の採用例、FPGAの構成要素と使用量、回路の詳細の順にまとめる。質問用の6枚は通常の順送りでは表示しないが、目次から選んで開ける。本編の説明時間には目次の操作時間を含めない。');
drawContents(s,api);outline[outline.length-1].navigation=true;

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

const adoption = await loadRvsocAdoption(root);
s=slide('質問用：RVSOCの教科書採用例',0,
  RVSOC_ADOPTION_NARRATION,
  adoption.sources.map(r => `[${r.number}] ${r.title}. ${r.url} (${r.locator})`).join('\n'),
  RVSOC_ADOPTION_DETAIL);
drawRvsocAdoption(s,api,adoption,P.slides.items.length);
s.hidden=true;outline[outline.length-1].backup=true;

s=slide('質問用：FPGAチップの構成要素',0,
  FPGA_RESOURCE_NARRATION, FPGA_RESOURCE_SOURCES, FPGA_RESOURCE_DETAIL);
drawFpgaResources(s,api);
foot(s,'FPro（Chu, 2018）§2.1・図2.1。セル内部と配線は概念図（実際の個数・配置は省略）');
s.hidden=true;outline[outline.length-1].backup=true;

const utilization = await loadFpgaUtilization(root);
s=slide('質問用：FPGAの使用量',0,
  FPGA_UTILIZATION_NARRATION,
  `${FPGA_UTILIZATION_SOURCE} (historical whole-design comparison); publication/console-source.json. After bitstream SHA-256: ${utilization.bitstreamSha256}.`,
  FPGA_UTILIZATION_DETAIL);
drawFpgaUtilization(s,api,utilization,P.slides.items.length);
s.hidden=true;outline[outline.length-1].backup=true;

s=slide('質問用：詳細な全体のブロック図',0,
  'RVSOCのパイプライン図を基にした全体図です。PC、レジスタ群、ALU、段間レジスタ、書戻しの経路を保ち、実機のメモリ接続と本研究の描画接続を付け加えています。質問に応じて関係する経路をたどります。',
  RVSOC+' Figure 7.11 (pipeline datapath), Figures 9.20 and 9.28 (uncore, decoding and return selection), Chapters 10–13 and 23. '+PRODUCT+' console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/ieu/datapath.sv; console/src/ifu/ifu.sv; console/src/lsu/lsu.sv. console/src/mmu/adrdecs.sv; console/src/uncore/ahbapbbridge.sv; console/src/ebu/ebu.sv; console/src/ieu/regfile.sv; console/config/derivlist.txt; console/fpga/generator/rasterixmem.tcl; console/fpga/src/rasterixdisplay.sv.',
  "図の範囲\nRVSOC図7.11のパイプライン配置、図9.20のSoC階層、図9.28のアドレス判定と応答選択を基に、実機構成の主要な接続を示す。CPU・描画側の接続は製品リビジョン261832d48832dd6e26c4971ab8893ce61200688b、構成fpganexysvideo_rasterixを基にする。表示回路の箱はE8の実機構成にも共通する機能を示す。PC、レジスタ群、ALU、段間レジスタ、書戻しの位置関係を保つ。図は機能を追うためのブロック図であり、全RTLと等価な回路図や、物理配置図ではない。細長い箱はレジスタ、台形はMUX、切欠きのある記号はALUを表す。接続点の丸がない交差は接続を意味しない。同名のHRDATAとFlagsEは、線を引き回さず同じ信号への接続を示している。\n\nアドレス判定と応答選択\nebuは命令側IFUとデータ側LSUの要求を仲裁して、HADDRや読み書きの要求を出す。HADDRは接続先にもadrdecsにも渡る。adrdecsはアドレスとアクセス幅を調べ、各領域を選ぶHSEL信号を出す。読み書きするデータを保存したり、中継したりする回路ではない。図のHSELの線は複数の選択信号をまとめた線で、Boot ROM、RAM、APB周辺回路、外部DDRメモリを同じ1ビットで一斉に選ぶ意味ではない。RTLではadrdecsのSelRegionsをHSELRegionsとして受け、HSELBootRom、HSELRam、HSELEXTなどに分ける。HSIZE[1:0]もadrdecsへ入力する。\n読み書きには要求を受け付けてから応答するまで時間がかかるため、uncoreには選択情報を保持するレジスタと、返ってきた応答を選ぶ論理がある。図の「選択保持」と「応答選択」はこれらをまとめた表記である。HRDATAは選択された読み出しデータで、wallypipelinedcore内のIFUとLSUへ直接配られる。HRDATA自体はebuを通らない。HREADYとHRESPはebuへ戻る。HREADYは要求の進行に使われる。この版のebuはHRESPを入力端子として受けるが、内部では参照していない。HREADYは接続先や選択保持レジスタにも戻るが、その配線は省略する。AHBの要求線はアドレス、書込みデータ、制御の束であり、一つの電気信号ではない。\n\nメモリと周辺回路\nuncoreにはrom_ahbによるBoot ROMとram_ahbによるRAMがある。外付けDDR3への要求はHSELEXTで選び、ahbaxibridge、clkconverter、共有メモリ接続、MIGを通す。APB接続ではahbapbbridgeが周辺回路ごとの選択をPSELへ引き継ぎ、PRDATAとPREADYから応答を選ぶ。\nSDカードにつながるのはsdcというインスタンスで、使うモジュールはspi_apbである。PSEL[5]で選択し、SDCCmd、SDCIn、SDCCLK、SDCCSをカードへつなぐ。別のspiインスタンスとは区別する。描画用の外部APB窓口はPSEL[7]をPSELEXTとして取り出し、rasterix_apbへつなぐ。UART、GPIO、通常のSPI、CLINT、PLIC、PWMは図では一つの箱にまとめる。IROMとDTIMは実機構成では無効なので、命令側とデータ側にはキャッシュとバス接続を示す。\n\nCPU内部\nレジスタ群から読み出した二つの値は段間レジスタを通り、3入力MUXで、その値、Writeback段のResultW、Memory段のIFResultMから選ぶ。その後の2入力MUXがPCや即値との選択を行う。比較器compのFlagsEはcontrollerへ渡る。ALUのアドレス出力と演算結果は別の経路である。演算結果側の「結果選択」はaltresultmuxとieuresultmuxをまとめており、「他」の入力には即値またはPCLinkEを使う経路を含む。Memory段ではFIntResMとの選択がある。これらを経た結果はM/Wレジスタを通って書戻し側へ進む。制御信号ResultSrcWと、演算結果のデータ線は別々である。\nWriteDataMは、キャッシュを使う書込みではD-cacheへ、使わない書込みではahbcacheinterfaceへ届く。図では書込み値の整形、バイト選択、アトミック処理などをまとめる。読み出し値はキャッシュ側と非キャッシュ側から選ばれ、値の整形と保持処理を経てReadDataWになる。IFUの非キャッシュ命令の選択、圧縮命令の展開、予測、例外、MMU・キャッシュ内部は省略する。regfileのクロック入力の丸は立下りでの書込みを示す。段間レジスタは立上りで状態を更新する。レジスタ書込み先RdW、RegWriteW、MUXの選択信号、ハザードの入力など、すべての制御配線は描いていない。FPU・MDU・CSRの内部や、書戻し前の追加の結果選択も省略する。\n\n描画と表示\n描画接続回路はrasterix_apb、描画回路はRasterIX_IF、表示回路はrasterixdisplayに対応する。命令と応答の二つのaxiscdcは、20 MHzのCPU側と100 MHzの描画側をつなぐ。矢印はデータの進む向きを示し、逆向きのreadyなどは省略する。表示先の通知と切替完了は、描画回路と表示回路の間の制御情報である。画素をこの線で直接渡すわけではない。\nCPUと描画回路は読出し・書込み、表示回路は読出し要求と画素の応答を、共有DDR3接続でやり取りする。図のSmartConnectと、描画回路の横のAXI FIFOはrasterixmem_wrapperに含まれる。後者はgpubufferであり、命令・応答のaxiscdcとは別のFIFOである。表示用AXIは製品既定のDVI構成では25.2 MHz、記録映像に使ったE8構成では74.25 MHzである。SmartConnect側が100 MHz側との接続も扱う。描画接続回路、二つのaxiscdc、RasterIX_IF、rasterixdisplay、rasterixmem_wrapperはrasterixラッパーの内部にあるが、この外枠は省略する。映像は表示回路と差動出力を経てHDMI OUT端子から出る。状態通知の同期回路、映像クロック生成、リセット配線、割込み配線は省略する。\n\n色の意味\n詳細図の信号線と枠は黒で示す。CPU内部の各部分を本編で説明済みとして色分けしない。濃い塗りはAMD提供IP、薄い青の背景はFPGAや機能単位のまとまりを示す。");
drawWallyOverview(s,api);

s.hidden=true; outline[outline.length-1].backup=true;

s=slide('質問用：描画回路のFPGAパイプライン',0,
  RASTERIX_PIPELINE_NARRATION,RASTERIX_PIPELINE_SOURCE,RASTERIX_PIPELINE_DETAIL);
const pipelineGraph=drawRasterixPipeline(s,api);
foot(s,'ToNi3141, RasterIX “FPGA pipeline”, main 3e2ee5aa（2026-11-08確認）を再構成');
s.hidden=true;outline[outline.length-1].backup=true;
await fs.writeFile(path.join(workspace,'rasterix-pipeline-graph.json'),JSON.stringify(pipelineGraph,null,2)+'\n');

// Keep provenance in the notes and the GitHub-readable counterpart.
for (const number of [3,6,7,8,9,10,17]) {
  const o=outline[number-1];
  o.detail += '\n\n' + PROVENANCE_DETAIL;
  o.source += '\n' + PROVENANCE_SOURCE;
  P.slides.items[number-1].speakerNotes.text=`説明時間の目安：${o.seconds}秒\n\n${o.narration}\n\n出典：${o.source}\n\n補足説明：${o.detail}`;
}
for(const {page,number} of pageNumbers)if(number!==CONTENTS_SLIDE)linkToSlide(page,CONTENTS_SLIDE);
await fs.writeFile(path.join(workspace,'wire-audit.json'),JSON.stringify(wiring.finalize(),null,2)+'\n');
const total=outline.reduce((n,s)=>n+s.seconds,0);
if(outline.length!==18||total!==355)throw new Error(`Unexpected allocation ${outline.length} slides, ${total} seconds`);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2)+'\n');
const md=[
  '# 中間発表：FPGAを用いた2Dゲーム機の製作',
  'アブストの説明に沿った発表です。本編11枚、移動用の目次1枚、質問用6枚で構成します。FPGAボードとゲーム機の全体像を示し、アドレス・データ・書込み指示を使ったCPUの読書き、SDからの読み込み、描画命令の送信、映像出力を順に説明します。',
  '[PowerPoint版](中間発表_主要事項.pptx) / [アブスト](../abstract/アブスト_主要事項.md) / [論文本文](../thesis/本文.md) / [技術付録](../thesis/技術付録.md) / [再生成方法](../../source/presentation/board-evolution/README.md) / [DDCA授業利用の出典](DDCA授業利用の出典.md) / [RVSOC教科書採用の出典](RVSOC教科書採用の出典.md)',
  '## 図の見方',
  '外側の薄い枠はFPGAボード、内側の青い枠はFPGAチップです。SDカードスロット、DDR3メモリ、HDMI端子はチップの外にある部品です。CPUや周辺制御の回路はチップ内に実装します。3・6〜8枚目は同じ配置を使い、説明中の経路を青で示します。4〜5枚目はCPUと周辺回路の読書き部分を拡大した概念図です。',
  'Aはアドレス、Dは書込みデータ、Wは書込み指示です。アドレスデコーダが接続先を選び、読出し値も対応する選択信号で選びます。分岐の黒丸は接続を表し、接続しない線の交差には隙間があります。転送の細かなタイミングや待ち処理は省略します。Cのコードは、物理アドレスを直接使うと仮定した概念コードです。完全なSDドライバやゲームプログラムではありません。',
  '## 回路の提供元',
  PROVENANCE_DETAIL,
  '対応するソースは[回路の提供元一覧](../../source/presentation/board-evolution/README.md#component-provenance)にまとめています。主図の表示回路は画像を読み出して映像を出す役割を示し、内部の出力方式や提供元を限定しません。実機記録に使用した構成は、動作確認の再現資料で特定しています。',
  '## 発表時間と質問用スライド',
  '本編の配分は動画30秒を含め355秒です。動画の再生中に結果を説明します。これは練習を実測した時間ではありません。12枚目の目次から本編と質問用の両方へ移動できます。各スライドの右下の番号から目次に戻れます。質問用の13〜18枚目は、通常の順送りでは表示しません。',
  '## 目次',
  outline.map((o,i)=>'- ['+(i+1)+'. '+o.title.replaceAll('\n','')+'](#slide-'+(i+1)+')'+(o.backup?'（質問用）':'')).join('\n')
];
outline.forEach((o,i)=>md.push('<a id="slide-'+(i+1)+'"></a>\n## '+(i+1)+'. '+o.title.replaceAll('\n',''),
  o.navigation?'項目名から移動できます。PowerPointでは右下の番号から、この目次へ戻れます。':o.backup?'質問時に参照する資料。本編の発表時間には含めません。':'説明時間の配分：'+o.seconds+'秒',
  '!['+o.title.replaceAll('\n','')+'](slides/slide-'+String(i+1).padStart(2,'0')+'.png)',
  ...(i===12?['[教育機関・授業・年度・指定の種類・出典の一覧](DDCA授業利用の出典.md)',
    'スライドに示した学校名の例：'+ddcaSummary.categories.map(c=>c.label+'は'+c.examples.join('・')).join('、')+'。']:[]),
  ...(i===13?['[教育機関・時期・採用根拠の一覧](RVSOC教科書採用の出典.md)']:[]),
  ...(i===15?['[Before／Afterの比較資料と元レポート](../../experiments/fpga-resource-comparison-20261108/README.md)']:[]),
  ...(i===9?['[30秒の実機動画を開く](../../experiments/breakout-title-top-20261108/video/breakout-30s.mp4)','PowerPointには動画を埋め込んでいます。スライドショー中に動画の領域をクリックして再生します。']:[]),
  ...(o.navigation?[contentsMarkdown()]:[]),
  o.navigation?'### 目次の使い方':o.backup?'### 質問時の使い方':'### 発表原稿',o.narration,
  '<details>\n<summary>補足説明と出典</summary>\n',o.detail,o.source?'出典：'+o.source:'','\n</details>',...(o.navigation?[]:['[移動用の目次へ戻る](#slide-12)'])));
md.push('## 動作確認と詳しい実装',
  '9枚目の3回の起動・動作確認は[実験E8](../../experiments/basic-operation-20261108/README.md)の記録です。10枚目の動画は、文字配置を更新した製品ed6a1c09の[別の30秒記録](../../experiments/breakout-title-top-20261108/README.md)です。両記録の回路設定には同じE8表示構成を使っています。起動試験の回数と、この後の動画を混同しないよう、取得条件と版を各記録に保存しています。',
  '詳しい実装と再現手順は[技術付録](../thesis/技術付録.md)にまとめています。コントローラへの対応やホーム画面などのGUIの充実は今後の拡充候補です。',
  '## 図と書式の出典',
  '主図はアブストと製品RTLを基にした機能図です。書式はRVSOCの図7.11・9.28・23.2を参考にしています。質問用の詳細な回路図、教科書の採用例、FPGAの構成要素・使用量、描画回路の内部については、それぞれのスライドの出典と補足を参照してください。[デザインと再生成方法](../../source/presentation/board-evolution/README.md)に実装箇所をまとめています。',
  '## 以前の発表資料',
  '命令の実行から順に説明した版は、[変更前のコミット40d8a51](https://github.com/SoshiroFujimori/wally-game-console-research/tree/40d8a51bd1ab0d9c9a469146c349cd31b173bdce/docs/presentation)に保存されています。現在の資料と混ざらないよう、同じディレクトリに別版を並べてはいません。');
await fs.writeFile(path.join(workspace,'中間発表_主要事項.md'),md.join('\n\n')+'\n');
const raw=path.join(workspace,'raw-candidate.pptx'),poster=path.join(workspace,'poster-candidate.pptx'),candidate=path.join(workspace,'candidate.pptx');
await(await PresentationFile.exportPptx(P)).save(raw);
await fs.writeFile(path.join(workspace,'navigation-targets.json'),JSON.stringify(navigationTargets(P),null,2)+'\n');
if(audience==='public'){
  const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,poster,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
  if(scrub.status!==0)throw new Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
}else await fs.copyFile(raw,poster);
// Validate the still-frame package before adding the reviewed video.
// Content import checks below use batches within the runtime XML limit.
// Artifact Tool's importer counts video bytes against its picture construction
// limit; the unchanged recording exceeds that limit even in the previous deck.
// Final package integrity/layout and video relationships are checked separately.
await fs.mkdir(path.join(workspace,'poster-review'), { recursive: true });
const posterFinal=path.join(workspace,'poster-review','poster-validated.pptx');
const validationOptions={workspaceDir:workspace,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','14','--require-native-table-slide','16'],explicitTotalSlideCount:18,requiredNativeTableOwnerSlides:[14,16],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font,latinFont,codeFont]}};
await finalizePresentation({...validationOptions,candidatePath:poster,finalPath:posterFinal,verifyArtifactToolImport:false,receiptPath:path.join(workspace,'poster-validation.json')});
// The 18-slide poster exceeds the runtime's aggregate XML construction limit.
// Import all authored content in two contiguous batches, then inspect the full
// final package and its native PowerPoint rendering/navigation separately.
const importChecks=[];
for(const [batchNumber,first,count] of [[1,0,11],[2,11,7]]){
  const batch=await Presentation.load(structuredClone(P.toProto()));
  batch.slides.keep(Array.from({length:count},(_,i)=>first+i));
  const batchPath=path.join(workspace,`content-batch-${batchNumber}.pptx`);
  await(await PresentationFile.exportPptx(batch)).save(batchPath);
  const imported=await PresentationFile.importPptx(await FileBlob.load(batchPath));
  if(imported.slides.items.length!==count)throw new Error('Content import lost slides');
  importChecks.push({firstSlide:first+1,lastSlide:first+count,importedSlides:count});
  for(const [i,item] of imported.slides.items.entries()){
    const png=await imported.export({slide:item,format:'png',scale:outline[first+i].backup?2:1});
    await fs.writeFile(path.join(workspace,'slides',`slide-${String(first+i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
  }
}
await fs.writeFile(path.join(workspace,'content-import-checks.json'),JSON.stringify({wholeDeckImport:'exceeds_default_construction_limit',batches:importChecks},null,2)+'\n');
// Slide jumps are internal OOXML relationships; no external file is opened.
const linked=path.join(workspace,'linked-candidate.pptx');
const linking=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'source/presentation/board-evolution/link_slides.py'),posterFinal,linked,path.join(workspace,'navigation-targets.json')],{encoding:'utf8'});
if(linking.status!==0)throw new Error(linking.stderr||linking.stdout||'Slide linking failed');
await fs.writeFile(path.join(workspace,'navigation-links.json'),linking.stdout);
const embedding=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'source/presentation/board-evolution/embed_video.py'),linked,candidate,path.join(root,VIDEO),'--review',path.join(root,'publication/media-review.json'),'--slide','10'],{encoding:'utf8'});
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
await finalizePresentation({...validationOptions,candidatePath:candidate,finalPath:final,verifyArtifactToolImport:false,receiptPath:path.join(workspace,'validation.json')});
console.log(JSON.stringify({final,audience,slides:outline.length,seconds:total,narrationCharacters:outline.reduce((n,s)=>n+s.narration.length,0)}));
