import { addOpenGLSlides } from './opengl-functions.mjs';
import {addMergedDatapath} from './merged-datapath.mjs';
import { addMainSlides } from './main-slides.mjs';
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
    // Keep a fixed footer box and right edge for one- and two-digit numbers.
    const page=text(s,String(n),1200,686,56,22,16,false,C.old,'right');
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
const RECORDING='experiments/dvi-recovery-20261109/media/latest-standard-dvi-30s.mp4';
const VIDEO='source/presentation/assets/breakout-standard-dvi-compatible.mp4';
const POSTER='experiments/dvi-recovery-20261109/media/latest-start.png';
const BASIC='experiments/dvi-recovery-20261109/README.md; results.json; media-review.json. Captured 2026-11-09. Standard bitstream SHA-256: 16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf. Latest game executable SHA-256: 5c360babde59c6d9fc72fe58edc5729da2b2b8480c2f3a5208980d2f7d2c558b. Video: '+RECORDING;
const PROVENANCE_DETAIL='CPU・バス・SD制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDR制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。';
const PROVENANCE_SOURCE='Wally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.';


await addMainSlides({slide,api,cover,root,DDCA,RVSOC,PRODUCT,BASIC,POSTER,VIDEO});

let s=slide('目次：発表・回答用スライド',0,
  '質問に関係する項目をクリックすると、そのスライドへ移動します。移動した後は右下のスライド番号をクリックすると、この目次へ戻れます。',
  '',
  '表紙1枚と発表用12枚の後に置く操作用の目次である。発表用スライドと回答用スライドの両方へ移動できる。回答用スライドは、教科書の採用例、FPGAの構成要素と使用量、命令の実行から周辺回路へつながる統合図、回路の詳細、ゲームの描画の順にまとめる。回答用の16枚は通常の順送りでは表示しないが、目次から選んで開ける。本編の説明時間には目次の操作時間を含めない。');
drawContents(s,api);outline[outline.length-1].navigation=true;

const ddcaDataRoot=process.env.PRESENTATION_DDCA_ASSET_DIRECTORY||path.join(root,'source/presentation/ddca-adoption');
const ddcaData=JSON.parse(await fs.readFile(path.join(ddcaDataRoot,'records.json'),'utf8'));
const ddcaGeography=JSON.parse(await fs.readFile(path.join(ddcaDataRoot,'prefectures.json'),'utf8'));
const ddcaSummary=summarizeDdca(ddcaData);
const ddcaSources=ddcaData.records.map(r=>`${r.id} ${r.institution}、${r.academic_year===null?'年度不明':r.academic_year+'年度'}「${r.course}」、${r.book_role}。${r.source_url}`).join('\n');
s=slide('回答用：DDCAを教材に挙げる授業の広がり',0,
  `DDCAは、高専・大学の学部・大学院の授業で、教科書や参考書として挙げられています。過去の指定も含めて、公式の公開資料から${ddcaSummary.institutions}機関・${ddcaSummary.prefectures}都道府県で確認できました。1枚の地図にまとめ、同じ県で複数の区分を確認した場合は、それらの色の縞模様にしています。すべての採用校を調べたものではありません。`,
  '学校別の出典：docs/presentation/DDCA授業利用の出典.md。確認日：2026-10-26。\n'+ddcaSources+'\n地図：lalamalink, https://github.com/lalamalink/japan-map-svg (CC0 1.0)。',
  `図は、DDCAを公式シラバス・授業資料の教科書・教材・参考書欄で確認した例を示す。日本語版と英語版、MIPS版・ARM版・RISC-V版などを含む。区分別では${ddcaSummary.categories.map(c=>c.label+c.institutions+'機関').join('、')}である。東京大学と広島大学は学部・大学院の両方に例があるが、全体ではそれぞれ1機関と数える。重複を除いた合計は${ddcaSummary.institutions}機関・${ddcaSummary.prefectures}都道府県である。区分は学校名ではなく授業の対象課程を表す。所在地は授業のキャンパスや開催地を使い、大学本部の住所でまとめない。教科書と参考書は出典一覧で区別する。参考書欄への掲載だけから、授業で毎回使うことや全学生の購入までは分からない。年度が分かる資料は${ddcaSummary.firstYear}〜${ddcaSummary.lastYear}年度である。開志専門職大学と長崎大学は授業年度不明、京都大学は2026年度授業ページからリンクされている資料である。現在も同じ指定が続くことや、同一年度の全国分布を示すものではない。縞模様は同じ県に複数の区分があることを示し、各色の面積は機関数に比例しない。灰色はこの一覧で未確認という意味で、使う学校がないという意味ではない。全国の全校・全年度を網羅していないため、色の面積や県数を採用率・市場シェアとして解釈しない。図書館の蔵書だけや書店の取扱いだけは根拠にしない。高知大学の資料は授業名とシラバス掲載図書を対応づけた公式一覧である。長崎大学は公式学部サイトの個別授業紹介を根拠とする。DDCAの掲載例は、RVSOCの採用実績や本研究の教育効果を直接示さない。授業・年度・版・確認箇所はDDCA授業利用の出典.mdを参照。地図の着色と集計はsource/presentation/ddca-adoption/records.jsonから生成する。地図は都道府県の形を簡略化した比較用の図である。`);
text(s,'教科書・参考書への掲載例（過去の指定を含む）',64,118,1152,38,26,true,C.ink);
drawDdcaMap(s,api,ddcaData,ddcaGeography);

s.hidden=true;outline[outline.length-1].backup=true;

const adoption = await loadRvsocAdoption(root);
s=slide('回答用：RVSOCの教科書採用例',0,
  RVSOC_ADOPTION_NARRATION,
  adoption.sources.map(r => `[${r.number}] ${r.title}. ${r.url} (${r.locator})`).join('\n'),
  RVSOC_ADOPTION_DETAIL);
drawRvsocAdoption(s,api,adoption,P.slides.items.length);
s.hidden=true;outline[outline.length-1].backup=true;

s=slide('回答用：FPGAチップの構成要素',0,
  FPGA_RESOURCE_NARRATION, FPGA_RESOURCE_SOURCES, FPGA_RESOURCE_DETAIL);
drawFpgaResources(s,api);

s.hidden=true;outline[outline.length-1].backup=true;

const utilization = await loadFpgaUtilization(root);
s=slide('回答用：FPGAの使用量',0,
  FPGA_UTILIZATION_NARRATION,
  `${FPGA_UTILIZATION_SOURCE} (historical whole-design comparison); publication/console-source.json. After bitstream SHA-256: ${utilization.bitstreamSha256}.`,
  FPGA_UTILIZATION_DETAIL);
drawFpgaUtilization(s,api,utilization,P.slides.items.length);
s.hidden=true;outline[outline.length-1].backup=true;

addMergedDatapath({slide,api,outline,DDCA,RVSOC,PRODUCT});

s=slide('回答用：詳細な全体のブロック図',0,
  'RVSOCのパイプライン図を基にした全体図です。PC、レジスタ群、ALU、段間レジスタ、書戻しの経路を保ち、実機のメモリ接続と本研究の描画接続を付け加えています。質問に応じて関係する経路をたどります。',
  RVSOC+' Figure 7.11 (pipeline datapath), Figures 9.20 and 9.28 (uncore, decoding and return selection), Chapters 10–13 and 23. '+PRODUCT+' console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/ieu/datapath.sv; console/src/ifu/ifu.sv; console/src/lsu/lsu.sv. console/src/mmu/adrdecs.sv; console/src/uncore/ahbapbbridge.sv; console/src/ebu/ebu.sv; console/src/ieu/regfile.sv; console/config/derivlist.txt; console/fpga/generator/rasterixmem.tcl; console/fpga/src/rasterixdisplay.sv.',
  "図の範囲\nRVSOC図7.11のパイプライン配置、図9.20のSoC階層、図9.28のアドレス判定と応答選択を基に、実機構成の主要な接続を示す。CPU・描画側の接続は製品リビジョン261832d48832dd6e26c4971ab8893ce61200688b、構成fpganexysvideo_rasterixを基にする。表示回路はRasterIXに同梱されたdvi_framebufferと、本研究の接続・制御ラッパーをまとめて示す。PC、レジスタ群、ALU、段間レジスタ、書戻しの位置関係を保つ。図は機能を追うためのブロック図であり、全RTLと等価な回路図や、物理配置図ではない。細長い箱はレジスタ、台形はMUX、切欠きのある記号はALUを表す。接続点の丸がない交差は接続を意味しない。同名のHRDATAとFlagsEは、線を引き回さず同じ信号への接続を示している。\n\nアドレス判定と応答選択\nebuは命令側IFUとデータ側LSUの要求を仲裁して、HADDRや読み書きの要求を出す。HADDRは接続先にもadrdecsにも渡る。adrdecsはアドレスとアクセス幅を調べ、各領域を選ぶHSEL信号を出す。読み書きするデータを保存したり、中継したりする回路ではない。図のHSELの線は複数の選択信号をまとめた線で、Boot ROM、RAM、APB周辺回路、外部DDRメモリを同じ1ビットで一斉に選ぶ意味ではない。RTLではadrdecsのSelRegionsをHSELRegionsとして受け、HSELBootRom、HSELRam、HSELEXTなどに分ける。HSIZE[1:0]もadrdecsへ入力する。\n読み書きには要求を受け付けてから応答するまで時間がかかるため、uncoreには選択情報を保持するレジスタと、返ってきた応答を選ぶ論理がある。図の「選択保持」と「応答選択」はこれらをまとめた表記である。HRDATAは選択された読み出しデータで、wallypipelinedcore内のIFUとLSUへ直接配られる。HRDATA自体はebuを通らない。HREADYとHRESPはebuへ戻る。HREADYは要求の進行に使われる。この版のebuはHRESPを入力端子として受けるが、内部では参照していない。HREADYは接続先や選択保持レジスタにも戻るが、その配線は省略する。AHBの要求線はアドレス、書込みデータ、制御の束であり、一つの電気信号ではない。\n\nメモリと周辺回路\nuncoreにはrom_ahbによるBoot ROMとram_ahbによるRAMがある。外付けDDR3への要求はHSELEXTで選び、ahbaxibridge、clkconverter、共有メモリ接続、MIGを通す。APB接続ではahbapbbridgeが周辺回路ごとの選択をPSELへ引き継ぎ、PRDATAとPREADYから応答を選ぶ。\nSDカードにつながるのはsdcというインスタンスで、使うモジュールはspi_apbである。PSEL[5]で選択し、SDCCmd、SDCIn、SDCCLK、SDCCSをカードへつなぐ。別のspiインスタンスとは区別する。描画用の外部APB窓口はPSEL[7]をPSELEXTとして取り出し、rasterix_apbへつなぐ。UART、GPIO、通常のSPI、CLINT、PLIC、PWMは図では一つの箱にまとめる。IROMとDTIMは実機構成では無効なので、命令側とデータ側にはキャッシュとバス接続を示す。\n\nCPU内部\nレジスタ群から読み出した二つの値は段間レジスタを通り、3入力MUXで、その値、Writeback段のResultW、Memory段のIFResultMから選ぶ。その後の2入力MUXがPCや即値との選択を行う。比較器compのFlagsEはcontrollerへ渡る。ALUのアドレス出力と演算結果は別の経路である。演算結果側の「結果選択」はaltresultmuxとieuresultmuxをまとめており、「他」の入力には即値またはPCLinkEを使う経路を含む。Memory段ではFIntResMとの選択がある。これらを経た結果はM/Wレジスタを通って書戻し側へ進む。制御信号ResultSrcWと、演算結果のデータ線は別々である。\nWriteDataMは、キャッシュを使う書込みではD-cacheへ、使わない書込みではahbcacheinterfaceへ届く。図では書込み値の整形、バイト選択、アトミック処理などをまとめる。読み出し値はキャッシュ側と非キャッシュ側から選ばれ、値の整形と保持処理を経てReadDataWになる。IFUの非キャッシュ命令の選択、圧縮命令の展開、予測、例外、MMU・キャッシュ内部は省略する。regfileのクロック入力の丸は立下りでの書込みを示す。段間レジスタは立上りで状態を更新する。レジスタ書込み先RdW、RegWriteW、MUXの選択信号、ハザードの入力など、すべての制御配線は描いていない。FPU・MDU・CSRの内部や、書戻し前の追加の結果選択も省略する。\n\n描画と表示\n描画接続回路はrasterix_apb、描画回路はRasterIX_IF、表示回路はrasterixdisplayに対応する。命令と応答の二つのaxiscdcは、20 MHzのCPU側と100 MHzの描画側をつなぐ。矢印はデータの進む向きを示し、逆向きのreadyなどは省略する。表示先の通知と切替完了は、描画回路と表示回路の間の制御情報である。画素をこの線で直接渡すわけではない。\nCPUと描画回路は読出し・書込み、表示回路は読出し要求と画素の応答を、共有DDR3接続でやり取りする。図のSmartConnectと、描画回路の横のAXI FIFOはrasterixmem_wrapperに含まれる。後者はgpubufferであり、命令・応答のaxiscdcとは別のFIFOである。表示用AXIは、今回の標準構成では25.2 MHzである。SmartConnect側が100 MHz側との接続も扱う。描画接続回路、二つのaxiscdc、RasterIX_IF、rasterixdisplay、rasterixmem_wrapperはrasterixラッパーの内部にあるが、この外枠は省略する。映像は表示回路と差動出力を経てHDMI OUT端子から出る。状態通知の同期回路、映像クロック生成、リセット配線、割込み配線は省略する。\n\n色の意味\n詳細図の信号線と枠は黒で示す。CPU内部の各部分を本編で説明済みとして色分けしない。濃い塗りはAMD提供IP、薄い青の背景はFPGAや機能単位のまとまりを示す。");
drawWallyOverview(s,api);

s.hidden=true; outline[outline.length-1].backup=true;

s=slide('回答用：描画回路のFPGAパイプライン',0,
  RASTERIX_PIPELINE_NARRATION,RASTERIX_PIPELINE_SOURCE,RASTERIX_PIPELINE_DETAIL);
const pipelineGraph=drawRasterixPipeline(s,api);

s.hidden=true;outline[outline.length-1].backup=true;
await fs.writeFile(path.join(workspace,'rasterix-pipeline-graph.json'),JSON.stringify(pipelineGraph,null,2)+'\n');

await addOpenGLSlides({slide,api,root,outline});

// Keep provenance in the notes and the GitHub-readable counterpart.
for (const number of [3,4,7,8,9,11,13,19,20]) {
  const o=outline[number-1];
  o.detail += '\n\n' + PROVENANCE_DETAIL;
  o.source += '\n' + PROVENANCE_SOURCE;
  P.slides.items[number-1].speakerNotes.text=`説明時間の目安：${o.seconds}秒\n\n${o.narration}\n\n出典：${o.source}\n\n補足説明：${o.detail}`;
}
for(const {page,number} of pageNumbers)if(number!==CONTENTS_SLIDE)linkToSlide(page,CONTENTS_SLIDE);
await fs.writeFile(path.join(workspace,'wire-audit.json'),JSON.stringify(wiring.finalize(),null,2)+'\n');
const total=outline.reduce((n,s)=>n+s.seconds,0);
if(outline.length!==30||total!==335)throw new Error(`Unexpected allocation ${outline.length} slides, ${total} seconds`);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2)+'\n');
const md=[
  '# 中間発表：FPGAを用いた2Dゲーム機の製作',
  '表紙1枚、発表用12枚、移動用の目次1枚、回答用16枚で構成します。Wallyへの描画機能の追加を、目的、既存回路との分担、接続の設計、実機での動作確認、公開した拡張例の順に説明します。ゲームの動きは30秒の実機動画で示します。',
  '[PowerPoint版](中間発表_主要事項.pptx) / [アブスト](../abstract/アブスト_主要事項.md) / [論文本文](../thesis/本文.md) / [技術付録](../thesis/技術付録.md) / [再生成方法](../../source/presentation/board-evolution/README.md) / [DDCA授業利用の出典](DDCA授業利用の出典.md) / [RVSOC教科書採用の出典](RVSOC教科書採用の出典.md)',
  '[発表の要点を読む](発表の要点.md) / [OpenGLの説明と想定質問](OpenGLの説明と想定質問.md)',
  '## 図の見方',
  '2〜9枚目と13枚目の図は、FPGAボードとチップ外の部品を同じ位置に置いています。3枚目のCPUと周辺回路のまとまりを、4枚目でCPU・SD制御・DDR制御へ展開します。4枚目以降は回路の配置をそろえ、説明する経路を青で強調します。矢印は要求やデータの経路を機能ごとにまとめたもので、一本の信号線を表すものではありません。破線の枠は回路コードの主な提供元です。「Wally」はCPU、「Wallyリポジトリ」はCPUと周辺回路の設計コードの提供元として使います。',
  '回答用19枚目では、信号を詳しく示しています。ADはアドレス、WDは書込みデータ、WEは1ビットの書込みイネーブル、RDは読出しデータです。有効な読書きの際のWE=1を書込み、WE=0を読出しとして示します。アドレスデコーダが接続先を選び、読出し値も対応する選択信号で選びます。分岐の黒丸は接続を表し、接続しない線の交差には隙間があります。転送の細かなタイミングや待ち処理は省略しています。',
  '## 回路の提供元',
  PROVENANCE_DETAIL,
  '対応するソースは[回路の提供元一覧](../../source/presentation/board-evolution/README.md#component-provenance)にまとめています。主図では、同じRasterIXリポジトリに含まれる描画と表示を一つの箱にまとめています。実機動画も、この標準表示構成で取得しています。',
  '## 発表時間と回答用スライド',
  '表紙と発表用12枚の配分は動画30秒を含め335秒です。動画の再生中に結果を説明します。これは練習を実測した時間ではありません。14枚目の目次から本編と回答用の両方へ移動できます。各スライドの右下の番号から目次に戻れます。回答用の15〜30枚目は、通常の順送りでは表示しません。',
  '## 目次',
  outline.map((o,i)=>'- ['+(i+1)+'. '+o.title.replaceAll('\n','')+'](#slide-'+(i+1)+')'+(o.backup?'（回答用）':'')).join('\n')
];
outline.forEach((o,i)=>md.push('<a id="slide-'+(i+1)+'"></a>\n## '+(i+1)+'. '+o.title.replaceAll('\n',''),
  o.navigation?'項目名から移動できます。PowerPointでは右下の番号から、この目次へ戻れます。':o.backup?'質問時に参照する資料。本編の発表時間には含めません。':'説明時間の配分：'+o.seconds+'秒',
  '!['+o.title.replaceAll('\n','')+'](slides/slide-'+String(i+1).padStart(2,'0')+'.png)',
  ...(i===14?['[教育機関・授業・年度・指定の種類・出典の一覧](DDCA授業利用の出典.md)',
    'スライドに示した学校名の例：'+ddcaSummary.categories.map(c=>c.label+'は'+c.examples.join('・')).join('、')+'。']:[]),
  ...(i===15?['[教育機関・時期・採用根拠の一覧](RVSOC教科書採用の出典.md)']:[]),
  ...(i===17?['[Before／Afterの比較資料と元レポート](../../experiments/fpga-resource-comparison-20261108/README.md)']:[]),
  ...(i===10?['[30秒の実機動画を開く](../../source/presentation/assets/breakout-standard-dvi-compatible.mp4)','PowerPointには動画を埋め込んでいます。スライドショーで11枚目に進むと自動再生します。']:[]),
  ...(o.navigation?[contentsMarkdown()]:[]),
  o.navigation?'### 目次の使い方':o.backup?'### 質問時の使い方':'### 発表原稿',o.narration,
  '<details>\n<summary>補足説明と出典</summary>\n',o.detail,o.source?'出典：'+o.source:'','\n</details>',...(o.navigation?[]:['[移動用の目次へ戻る](#slide-14)'])));
md.push('## 動作確認と詳しい実装',
  '11枚目の動画は、[標準表示構成の30秒の実機記録](../../experiments/dvi-recovery-20261109/README.md)です。最新の文字配置のゲームを実行し、ボールの移動・反射とブロック消去を確認しました。これは自動プレイであり、コントローラによる操作ではありません。取得条件と構成の版は再現資料に保存しています。',
  '詳しい実装と再現手順は[技術付録](../thesis/技術付録.md)にまとめています。コントローラへの対応やホーム画面などのGUIの充実は今後の拡充候補です。',
  '## 図と書式の出典',
  '主図は製品RTLの役割をまとめた機能図です。書式はRVSOCの図7.11・9.28・23.2を参考にしています。回答用の詳細な回路図、教科書の採用例、FPGAの構成要素・使用量、描画回路の内部については、それぞれのスライドの出典と補足を参照してください。[デザインと再生成方法](../../source/presentation/board-evolution/README.md)に実装箇所をまとめています。',
  '## 以前の発表資料',
  '信号名とアドレスを詳しく示した版は、[変更前のコミットcbec749](https://github.com/SoshiroFujimori/wally-game-console-research/tree/cbec7498c75ca0e17876c7ea99760ed144367732/docs/presentation)に保存されています。',
  '命令の実行から順に説明した版は、[変更前のコミット40d8a51](https://github.com/SoshiroFujimori/wally-game-console-research/tree/40d8a51bd1ab0d9c9a469146c349cd31b173bdce/docs/presentation)に保存されています。命令の実行から周辺回路へつながる図は、現在の回答用19枚目に統合しています。外部メモリへの接続は、二つのメモリの箱を接続口として残し、AD・WD・WE・RDとアドレスデコーダで示します。');
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
const validationOptions={workspaceDir:workspace,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','10','--require-native-table-slide','12','--require-native-table-slide','16','--require-native-table-slide','18'],explicitTotalSlideCount:30,requiredNativeTableOwnerSlides:[10,12,16,18],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font,latinFont,codeFont]}};
await finalizePresentation({...validationOptions,candidatePath:poster,finalPath:posterFinal,verifyArtifactToolImport:false,receiptPath:path.join(workspace,'poster-validation.json')});
// Import authored content in five contiguous batches to bound the runtime's
// XML construction size, then inspect the full
// final package and its native PowerPoint rendering/navigation separately.
const importChecks=[];
for(const [batchNumber,first,count] of [[1,0,7],[2,7,7],[3,14,5],[4,19,5],[5,24,6]]){
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
await fs.writeFile(path.join(workspace,'content-import-checks.json'),JSON.stringify({wholeDeckImport:'validated_in_contiguous_batches',batches:importChecks},null,2)+'\n');
// Slide jumps are internal OOXML relationships; no external file is opened.
const linked=path.join(workspace,'linked-candidate.pptx');
const linking=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'source/presentation/board-evolution/link_slides.py'),posterFinal,linked,path.join(workspace,'navigation-targets.json')],{encoding:'utf8'});
if(linking.status!==0)throw new Error(linking.stderr||linking.stdout||'Slide linking failed');
await fs.writeFile(path.join(workspace,'navigation-links.json'),linking.stdout);
const embedding=spawnSync(process.env.RUNTIME_PYTHON,[path.join(import.meta.dirname,'embed_video.py'),linked,candidate,path.join(root,VIDEO),'--review',path.join(root,'publication/media-review.json'),'--slide','11','--autoplay'],{encoding:'utf8'});
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
