import fs from 'node:fs/promises';
import path from 'node:path';
import {drawStableBoard} from './stable-board.mjs';
import {drawCoreBoard} from './core-board.mjs';
import {drawPriorImplementations,drawAddressDecode} from './research-context.mjs';
import {loadFpgaUtilization,drawCurrentUtilization,FPGA_UTILIZATION_SOURCE,STANDARD_UTILIZATION_SOURCE,FPGA_UTILIZATION_DETAIL} from './fpga-utilization.mjs';

// The nine content slides follow the research outline in presentation order.
export async function addMainSlides(ctx) {
  const {slide:baseSlide,api,cover,root,DDCA,RVSOC,PRODUCT,BASIC,POSTER,VIDEO}=ctx;
  const {text,wire,box,junction,C}=api;
  const lead=(s,v)=>text(s,v,64,119,1152,38,27,true,C.blue);
  const line=(s,v,y,bold=false,size=27)=>text(s,v,64,y,1152,38,size,bold,bold?C.heading:C.ink);
  let section='';
  const slide=(...args)=>{
    const page=baseSlide(...args);
    if(section){
      text(page,section,64,7,1152,23,18,true,C.heading,'right').name=`section-label-${ctx.outline.length}`;
      ctx.outline.at(-1).section=section;
    }
    return page;
  };
  let s=slide('FPGAを用いた2Dゲーム機の製作',5,
    'この題目で発表します。','',
    '教育用CPUに描画・表示機能を追加したゲーム機の製作について報告する。');
  wire(s,190,371,1090,371,C.heading,false,1.7);
  text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
  text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');


  section="背景";
  s=slide("FPGAとは",40,
    "まず背景です。FPGAボードは、SDカードスロットやDDRメモリなどを載せた基板です。基板上にはFPGAチップもあります。このチップ内に、周囲の部品を制御するデジタル回路を実装できます。図は、チップ内に実装できる論理回路の一例です。",
    "Harris, S. L. and Harris, D., Digital Design and Computer Architecture: RISC-V Edition (2021), Chapter 7. Official figure source: https://pages.hmc.edu/harris/ddca/ddcarv.html (DDCArv_Figures.zip). Chapters 2 and 4. Harris et al., RISC-V System-on-Chip Design, Chapters 7–13, 20, 22–23. Official figure source: https://pages.hmc.edu/harris/ddca/rvsocd.html (RVSoCD_figs.zip). Chapter 23. Nexys Video Reference Manual.",
    "FPGAは、コードで記述したデジタル回路をチップ内に実装できるデバイスである。CPUも、その方法で実装する回路の一つである。SDカードなどを実際に制御するにはそれぞれの制御回路が必要であり、図のAND回路は、チップ内に実装できる論理回路の一例を示す。");
  lead(s,'ボード上の部品を制御する回路を、FPGAチップ内に実装できる');
  drawStableBoard(s,api,{mode:'implementation'});
  line(s,'基板上に、FPGAチップ・SDカードスロット・DDRメモリなどがある',603,true,26);

  section="背景";
  s=slide("先行研究と教育現状",35,
    "FPGAにCPUや描画回路を実装する先行研究があります。CPUの例がWally、描画回路の例がRasterIXです。また、Wallyの設計を学ぶ教科書RVSOCは、ハーベイ・マッド大学、オクラホマ州立大学、ダルムシュタット工科大学で採用されています。こうした授業での採用から、CPUや周辺回路の設計を学ぶ一定の需要があると考えます。",
    "Wally: Thompson et al., RISC-V System-on-Chip Design Textbook and Course (2025), Section 4, https://doi.org/10.18260/1-2--57147 ; https://nemo.asee.org/public/conferences/365/papers/48675/download . Official CPU implementation: https://github.com/openhwgroup/cvw . Official RasterIX implementation: https://github.com/ToNi3141/RasterIX . RVSOC textbook adoption: docs/presentation/RVSOC教科書採用の出典.md; source/presentation/rvsoc-adoption/records.json . Harvey Mudd College E154, Spring 2026: https://pages.hmc.edu/harris/class/e154/ . Oklahoma State University, 2023–2024 manuscript use: Thompson et al. (2025), Section 4. TU Darmstadt, Winter 2026/27: https://www.esa.informatik.tu-darmstadt.de/lehre/202627/cai . Official textbook: https://pages.hmc.edu/harris/ddca/rvsocd.html .",
    "左右はFPGAへの既存回路の実装例であり、互いに独立した図である。本研究での組合せは次のスライドで示す。WallyはCPU・SoCの設計とFPGA実装を扱う教材・公開回路の例、RasterIXは公開された描画回路と表示回路の実装例として挙げる。RasterIXの査読付き論文の存在を主張するものではない。\n\n『RISC-V SoC設計』は英語書名RISC-V System-on-Chip Designの説明用の日本語表記である。Harvey Mudd Collegeは2026年春の授業で教科書指定、Oklahoma State Universityは2023〜2024年に出版前の原稿版を授業で使用、ダルムシュタット工科大学は2026/27年冬の授業で主教科書に指定している。過去の使用を含む確認例であり、同一年度の採用校一覧ではない。ダルムシュタットの実習はASIC設計を扱うため、3校すべてがFPGAでゲーム機を作る授業をしているという意味ではない。\n\n教材採用という事実から、CPUや周辺回路の設計を学ぶ需要があると解釈する。本研究のゲーム機の利用希望者数や教育効果を測定した結果ではない。");
  lead(s,'FPGAにCPUや描画回路を実装する先行研究がある');
  drawPriorImplementations(s,api);
  line(s,'教科書『RISC-V SoC設計』（RVSOC）の採用例',493,true,26);
  const adoptionExamples=[
    ['ハーベイ・マッド大学','米国・2026年春'],
    ['オクラホマ州立大学','米国・2023〜2024年（原稿版）'],
    ['ダルムシュタット工科大学','ドイツ・2026/27年冬']
  ];
  adoptionExamples.forEach(([name,term],i)=>{
    const x=64+i*384;
    text(s,name,x,546,368,35,24,true,C.ink);
    text(s,term,x,586,368,28,19,false,C.ink);
  });
  line(s,'教材採用から、CPUや周辺回路の設計を学ぶ需要がうかがえる',632,true,25);

  section="本研究の概要";
  s=slide("本研究の概要",45,
    "次に、本研究の概要です。既存の教育用CPUであるWallyと、既存の描画回路であるRasterIXを組み合わせ、ゲーム機の回路を構成しました。この組合せを、教育用CPUの拡張例として示します。両回路の間には、描画回路を接続するための回路を用意しました。また、Wallyを含む既存の構成には、SDカードからプログラムを読み込んで実行する仕組みがあります。この組合せで動く、ブロック崩しのプログラムも用意しました。",
    "Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl. console/examples/rasterix/Breakout.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/examples/rasterix/WallyBusConnector.hpp; console/fpga/src/rasterixdisplay.sv.\nWally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.",
    "主な既存回路はCPU、SDカード制御、DDRメモリ制御IP、RasterIXの描画・表示本体である。本研究ではNexys Videoへの対応、バス接続、クロック間の受渡しの構成、メモリ接続、表示の制御などを追加した。青枠は命令経路の代表的な接続部分を示す。その中にはAMD製のIPも含む。ゲームプログラムはCPU上で動くソフトウェアなので、回路の提供元を示す破線枠には含めていない。\n\nCPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。");
  lead(s,'既存の教育用CPUと描画回路を組み合わせ、ゲーム機を作る');
  drawCoreBoard(s,api,{mode:'abstract'});
  line(s,'既存の機能：SDカードからプログラムを読み込み、CPUで実行',585,false,27);
  line(s,'本研究で用意：両回路をつなぐ接続回路と、ゲームプログラム',631,true,27);

  section="ソフトウェアの概要";
  s=slide("ソフトウェアの概要",45,
    "次に、ソフトウェアの概要です。Wallyを含む既存の構成では、回路ごとにアドレスを割り当て、プログラムからアクセスできます。今回の描画回路にも、アクセスするためのアドレスを割り当てました。そこに、描画の指示を意味する数値を書き込みます。図の例では、0x10080000というアドレスへの書込みです。この数値を接続回路が描画回路へ渡すことで、画像を描画し、HDMI端子から映像を出力できます。",
    "Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl. console/examples/rasterix/WallyBusConnector.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/addins/rasterix/lib.\nWally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.",
    "C言語による書込みの概念例である。commandはCPU上のライブラリが用意した描画命令列の1語を表す。実際には、命令列の複数の語を順に送り、転送完了や表示切替の制御も行う。実行可能な完全な送信プログラムではなく、アドレスへの書込みと回路の操作の対応を示す。実装はvolatile付きの入出力アクセスを使う。接続回路のコマンド送信口は0x10080000である。描画・表示回路がDDR3上の画像を介して映像を出力するため、一度の書込みだけで画面全体が完成するという意味ではない。\n\n主な既存回路はCPU、SDカード制御、DDRメモリ制御IP、RasterIXの描画・表示本体である。本研究ではNexys Videoへの対応、バス接続、クロック間の受渡しの構成、メモリ接続、表示の制御などを追加した。青枠は命令経路の代表的な接続部分を示す。その中にはAMD製のIPも含む。ゲームプログラムはCPU上で動くソフトウェアなので、回路の提供元を示す破線枠には含めていない。\n\nCPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。");
  lead(s,'回路ごとに割り当てたアドレスに、プログラムからアクセスする');
  drawCoreBoard(s,api,{mode:'command'});
  const code=text(s,'*(unsigned int *)0x10080000 = command;',64,585,1152,40,31,false,C.blue);
  code.text.style={typeface:'Consolas',fontSize:31,color:C.blue,alignment:'left',verticalAlignment:'middle',wrap:'none'};
  line(s,'command：描画の指示を表す数値 → 描画回路へ送信',635,true,27);

  section="ハードウェアの概要";
  s=slide("ハードウェア：アドレスの割当て",40,
    "次に、ハードウェアの概要です。Wallyの周辺回路には、アドレスデコーダがあります。これは、CPUからのアドレスを調べ、そのアドレスに対応する回路のイネーブル信号を出す回路です。本研究では、この既存の仕組みの設定を変更し、描画回路用のアドレス領域を割り当てました。例えば0x10080000に書き込むと接続回路が選ばれ、描画命令の数値が渡ります。",
    "console/config/rv64gc/config.vh: EXT_IO_BASE=0x10080000, EXT_IO_RANGE=0xFF; console/config/derivlist.txt: fpganexysvideo_rasterix; console/src/mmu/adrdecs.sv; console/src/uncore/uncore.sv: PSELEXT; console/fpga/src/rasterix_apb.sv: command port.\nWally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.",
    "Wallyの既存の外部APB領域を有効にし、描画接続回路へ接続している。アドレスデコーダのRTLを一から書いたという意味ではなく、その既存の領域選択機能と構成パラメータを利用した。図はCPUの書込みを、アドレス、書込みデータ、書込みイネーブル、接続先の選択に分けた概念図である。実際にはAHBからAPBへの変換や転送の段階があるが、この図では省略している。有効なアクセスでWE=1が書込み、WE=0が読出しを示す。読み出しデータの戻り経路は、書込みだけを説明するこの図では省略した。0x10080000〜0x100800FFは接続回路用の領域で、その中の0x10080000が描画命令の送信口である。アドレス下位のビットが、接続回路内でアクセスするレジスタを指定する。\n\nCPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。");
  lead(s,'アドレスデコーダが、アクセス先のイネーブル信号を出す');
  drawAddressDecode(s,api);
  line(s,'既存の設定を変更し、描画回路用のアドレス領域を割り当てた',585,true,26);
  line(s,'割り当てた範囲：0x10080000〜0x100800FF',631,false,28);

  section="ハードウェアの概要";
  s=slide("ハードウェア：接続回路",40,
    "CPUと描画回路の間には、通信方式とクロック周波数の違いがあります。そのため、両回路の間に用意した接続回路で、この違いに対応しました。CPU側の書込みを、描画回路側で受け取れる信号のやり取りに合わせます。また、異なるクロックの間でデータを渡すために、AMD製の回路を組み込みました。これによって、CPUから描画回路へ命令を渡せるようにしました。",
    "Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl. console/fpga/src/rasterix_apb.sv; console/fpga/src/rasterix.sv; console/fpga/generator/axiscdc.tcl. AMD PG085: https://docs.amd.com/r/en-US/pg085-axi4stream-infrastructure/Overview-of-Features\nWally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.",
    "CPU側のAPB書込みを、RasterIX側のAXI4-Streamに対応させる部分は本研究で追加したRTLである。描画命令そのものを別の命令に変える処理ではなく、データと受渡しの制御信号を対応させる。クロック間にはAMD製AXI4-Stream Data FIFOを非同期設定で使う。標準構成はCPU側20 MHz、描画側100 MHzである。FIFOの内部回路を独自に発明した、またはこの方式が最速だという主張はしない。形式に合わせる部分は追加したRTL、クロック間の受渡しはAMD製IPである。\n\nCPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。");
  lead(s,'CPU側と描画回路側の、通信方式とクロック周波数の違いに対応');
  drawCoreBoard(s,api,{mode:'adapter'});
  line(s,'両回路の間に、それぞれの違いに対応する接続回路を用意',579,true,27);
  box(s,'CPU',64,628,130,49,C.white,25,C.ink,2.2);
  wire(s,194,652,254,652,C.blue,true,3);
  box(s,'',254,628,320,49,C.white,25,C.blue,2.5);
  text(s,'受渡しの形式を合わせる',262,631,304,27,24,true,C.blue,'center');
  text(s,'本研究で追加した回路',262,659,304,16,14,false,C.old,'center');
  wire(s,574,652,634,652,C.blue,true,3);
  box(s,'',634,628,330,49,C.pale,25,C.blue,2.5);
  text(s,'異なるクロック間で渡す',642,631,314,27,24,true,C.blue,'center');
  text(s,'AMD製の回路',642,659,314,16,14,false,C.old,'center');
  wire(s,964,652,1024,652,C.blue,true,3);
  box(s,'描画回路',1024,628,192,49,C.white,25,C.ink,2.2);

  section="実行結果";
  s=slide("実行結果：FPGAの使用量",25,
    "次に、実行結果です。まず、FPGA内部のリソースの使用量を示します。FPGAには、論理回路やメモリなど、実装に使える資源の数に上限があります。表は、Wallyの基本構成と、今回のゲーム機構成の使用率です。ゲーム機では、LUTが約50%、チップ内のBlock RAMが約59%でした。CPUや周辺制御、描画・表示を含む回路を、一つのFPGAに実装できました。",
    "Before: experiments/fpga-resource-comparison-20261108/comparison.json; After: experiments/standard-display-resources-20261110/implementation.json; experiments/dvi-recovery-20261109/README.md; results.json; media-review.json. Captured 2026-11-09. Standard bitstream SHA-256: 16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf. Latest game executable SHA-256: 5c360babde59c6d9fc72fe58edc5729da2b2b8480c2f3a5208980d2f7d2c558b. Video: experiments/dvi-recovery-20261109/media/latest-standard-dvi-30s.mp4",
    "比較する構成\nBeforeは2026年9月8日に保存したNexys Video対応時のCPUと周辺回路、Afterは2026年10月8日に保存した標準表示のゲーム機構成である。どちらもArtix-7 XC7A200T（xc7a200tsbg484-1）、Vivado 2025.2による配置配線後の記録を使う。Afterはスライド12の実機動画と同じ回路設定データで、スライド11もこの値を示す。\n\nBeforeの根拠\nexperiments/fpga-resource-comparison-20261108/before-utilization.rptを使う。日付は2026年9月8日13:16:56、DesignはfpgaTop、Design StateはRoutedである。Nexys Video対応時の描画機能がない構成として保存された記録である。レポートにGitリビジョンや回路設定データのハッシュは記載されておらず、特定のコミットから完全に再生成した結果とは主張しない。元ファイルと公開用コピーのハッシュはcomparison.jsonに区別して記録した。\n\nAfterの根拠\nexperiments/standard-display-resources-20261110/implementation.jsonとutilization.rptを使う。製品RTLは261832d48832dd6e26c4971ab8893ce61200688b、公式RasterIXは9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0。回路設定データのSHA-256は16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acfで、11月9日の映像記録に一致する。レポートは11月10日に保存済みの検証ディレクトリから取り出して確認し、再配置配線や新たな実機試験は行っていない。公開コピーはホスト名や個人用パスを除去した。\n\n比較の範囲\n開発前後に保存した実装全体を参考比較する。CPUのRTLなどの版や各種設定を固定して描画機能だけを追加した比較ではない。したがって、差をRasterIX単体の使用量と解釈しない。動作するゲーム機全体が対象FPGAに収まることは、Afterの実装記録と対応する実機動画から確認できる。\n\n掲載値\nLUT、Slice Registers、Block RAM Tile、DSPの四種類を示す。それぞれの搭載数に対する使用数の割合で、異なる資源の割合は合算しない。Block RAMはFPGA内のメモリで、ボード上のDDR3は含まれない。未使用資源の数だけから任意の拡張が可能とは判断できず、回路を追加する場合は配置配線とタイミングを再確認する。");
  lead(s,'Wallyの基本構成と、製作したゲーム機の使用率');
  const utilization=await loadFpgaUtilization(root);
  drawCurrentUtilization(s,api,utilization);
  line(s,'CPU・周辺制御・描画・表示を、1個のFPGAに実装できた',631,true,27);

  section="実行結果";
  s=slide("実行結果：ブロック崩しの動画",30,
    "こちらが、自動プレイの実機映像です。ボールがブロックに衝突すると、そのブロックが消え、ボールが跳ね返ることを確認しました。また、下のバーに当たって跳ね返ることも確認しました。バーはプログラムで自動操作しています。",
    "experiments/dvi-recovery-20261109/README.md; results.json; media-review.json. Captured 2026-11-09. Standard bitstream SHA-256: 16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf. Latest game executable SHA-256: 5c360babde59c6d9fc72fe58edc5729da2b2b8480c2f3a5208980d2f7d2c558b. Video: experiments/dvi-recovery-20261109/media/latest-standard-dvi-30s.mp4 Video: source/presentation/assets/breakout-standard-dvi-compatible.mp4\nWally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.",
    "2026年11月9日に取得した標準表示構成の30秒の記録。ゲーム画面は640×480画素。埋込み動画は同じ記録をH.264 Highへ再符号化した配布用ファイルで、映像内容と時間を保持している。RasterIX_IFと同梱dvi_framebufferを使う標準回路で取得した。自動操作であり、ゲームコントローラはまだ実装していない。録画のフレームレートをゲームの描画FPSとして扱わない。\n\nCPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。");
  lead(s,'自動プレイで、ブロックとバーに対するボールの動作を確認');
  s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'標準表示構成で動くブロック崩しの実機動画',fit:'contain',position:{left:200,top:173,width:880,height:495}});
  text(s,'ブロックの消去と、ブロック・バーでのボールの反射を確認',64,681,1080,29,22,true,C.blue,'center');

  section="まとめ";
  s=slide("まとめと今後の展望",25,
    "まとめです。既存の教育用CPUに、既存の描画回路を接続しました。両回路の間の接続回路とゲームプログラムを用意し、ブロック崩しが動作することを確認しました。今後は、ホーム画面などのGUI、またはゲームコントローラによる操作の実装に取り組みます。",
    "Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl. experiments/dvi-recovery-20261109/README.md; results.json; media-review.json. Captured 2026-11-09. Standard bitstream SHA-256: 16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf. Latest game executable SHA-256: 5c360babde59c6d9fc72fe58edc5729da2b2b8480c2f3a5208980d2f7d2c558b. Video: experiments/dvi-recovery-20261109/media/latest-standard-dvi-30s.mp4\nWally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.",
    "結論は、接続を実装した構成で、ブロック崩しの自動操作によるゲーム進行と映像出力を確認したことである。今回の組合せを他のCPUやボードにもそのまま適用できるという結論ではない。今後の候補はゲームコントローラへの対応とホーム画面などのGUIであり、実装する項目は今後選択する。図の実線の入れ子は、ボードの上にチップがあり、その内側に回路を実装したという階層を示す。SDカードスロットやDDR3メモリはチップ外で、同じボード上にある。破線は既存回路の提供元を示し、物理的なチップの境界ではない。\n\nCPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。");
  lead(s,'既存の教育用CPUに描画回路を接続し、ゲーム機を製作した');
  drawCoreBoard(s,api,{mode:'hierarchy'});
  line(s,'成果：教育用CPUの拡張例として、ブロック崩しの動作を確認',585,true,27);
  line(s,'今後：ホーム画面などのGUI、またはゲームコントローラを実装',634,false,27);
}
