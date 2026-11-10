import fs from 'node:fs/promises';
import path from 'node:path';
import {drawStableBoard} from './stable-board.mjs';
import {drawCoreBoard} from './core-board.mjs';
import {drawPriorImplementations,drawAddressDecode} from './research-context.mjs';
import {loadFpgaUtilization,drawCurrentUtilization,FPGA_UTILIZATION_SOURCE,STANDARD_UTILIZATION_SOURCE,FPGA_UTILIZATION_DETAIL} from './fpga-utilization.mjs';
import {drawGameProgram,drawCodeQuote,C_PROGRAM_DETAIL} from './game-program.mjs';

// A bounded integration result and its functional evidence form the main talk.
// Detailed architecture and OpenGL API material remain in the answer slides.
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

  section='背景';
  s=slide('FPGAチップで周囲の部品を制御する',25,
    'FPGAボードは、SDカードスロットやDDRメモリなどを載せた基板です。基板上にはFPGAチップがあり、その内部に、周囲の部品を制御するデジタル回路を実装できます。左のコードが右のAND回路を表すように、回路をコードで記述します。',
    `${DDCA} Chapters 2 and 4. ${RVSOC} Chapter 23. Nexys Video Reference Manual.`,
    'FPGAは、コードで記述したデジタル回路をチップ内に実装できるデバイスである。CPUも、その方法で実装する回路の一つである。SDカードなどを実際に制御するにはそれぞれの制御回路が必要であり、AND回路はコードと回路の対応だけを示す。回路を記述するHDLと、CPUが実行するゲームのプログラムは、それぞれ作る対象が異なる。');
  lead(s,'SDカードやメモリを制御する回路を、チップ内に実装できる');
  drawStableBoard(s,api,{mode:'implementation'});
  line(s,'回路をHDLコードで記述し、FPGAチップ内に実装する',603,true,28);

  s=slide('CPUや描画回路を実装する先行研究',20,
    'FPGAにCPUや描画回路を実装する先行研究があります。CPUの例がWallyです。描画回路の例がRasterIXで、表示用の回路も含まれています。このような既存の回路を用いて、プログラムの実行や、HDMI端子からの映像出力を行えます。',
    'Wally: Thompson et al., RISC-V System-on-Chip Design Textbook and Course (2025), https://doi.org/10.18260/1-2--57147 ; https://peer.asee.org/57147.pdf . Official CPU implementation: https://github.com/openhwgroup/cvw . Official RasterIX implementation: https://github.com/ToNi3141/RasterIX ; rtl/3rdParty/core_dvi_framebuffer/README.md .',
    'CPUの先行研究には、WallyのCPU・SoC、FPGA実装と教材を扱うASEE論文を挙げる。RasterIXについては公式の研究・開発成果として公開された回路・ソフトウェアと実装例を参照する。RasterIXに査読付き論文があるという主張ではない。図はFPGAに実装できる既存回路を例示したもので、同じボードにWallyとRasterIXを接続した先行研究を示すものではない。描画・表示の出典と本研究の接続部分は5枚目で区別する。');
  lead(s,'FPGA上にCPUや描画回路を実装する研究・開発がある');
  drawPriorImplementations(s,api);
  line(s,'既存の設計コードを利用して、CPUや描画・表示回路を実装できる',603,true,27);

  s=slide('CPU設計を学ぶ授業と教科書',30,
    'CPUや論理回路の設計を扱う授業もあります。例えば、久留米高専や広島大学では、『ディジタル回路設計とコンピュータアーキテクチャ』が教科書に挙げられています。この本では、論理回路を組み合わせてCPUを作ります。続く『RISC-V SoC設計』では、CPUのWallyや、メモリ・周辺回路への接続を学べます。本研究は、こうしたCPUの拡張例を示します。',
    `${DDCA} Chapters 3, 5 and 7. ${RVSOC} Chapters 7, 9, 20 and 23. School records: docs/presentation/DDCA授業利用の出典.md (U07, U05, K02, K04); docs/presentation/RVSOC教科書採用の出典.md. Tokyo: https://catalog.he.u-tokyo.ac.jp/detail?code=0510019&year=2022 ; Hiroshima: https://momiji.hiroshima-u.ac.jp/syllabusHtml/2026_12_K6406020.html ; Toyota: https://syllabus.kosen-k.go.jp/Pages/PublicSyllabus?department_id=13&lang=ja&school_id=23&subject_code=34234&year=2022 ; Kurume: https://syllabus.kosen-k.go.jp/Pages/PublicSyllabus?department_id=03&from=curriculum&lang=ja&school_id=43&subject_code=4S18&year=2023 ; HMC: https://pages.hmc.edu/harris/class/e154/ ; OSU: Thompson et al., RISC-V System-on-Chip Design Textbook and Course (2025), Section 4, https://doi.org/10.18260/1-2--57147 ; TU Darmstadt: https://www.esa.informatik.tu-darmstadt.de/lehre/202627/cai . Official books: https://pages.hmc.edu/harris/ddca/ddcarv.html ; https://pages.hmc.edu/harris/ddca/rvsocd.html .`,
    '左の教科書は、日本語版の書名を表示した。略称はDDCA、英語の書名はDigital Design and Computer Architectureである。第3章の順序回路、第5章の演算回路などの基礎を使い、第7章で命令を実行するプロセッサを組み立てる。図の「値を保存」はレジスタ、「計算する」は演算回路、「命令に応じて指示」は制御回路の役割を表す。CPUを構成する役割の例であり、命令メモリやフィードバックなどをすべて描いた配線図ではない。中央の「RISC-V SoC設計」は、RISC-V System-on-Chip Designという英語書名を説明用に日本語で表したもので、日本語版の刊行を意味しない。略称はRVSOC。第7章のCPUを基礎に、第9章で外部メモリへのバス接続、第20章で周辺回路、第23章でFPGA実装を扱う。図はそのうち本研究につながる部分を示す。授業の例は、東京大学の2022年度、広島大学の2026年度、豊田高専の2025年度、久留米高専の2026年度に、DDCAを教科書・教材欄で確認したもの。版は同一ではなく、久留米高専はARM版である。RVSOCはHarvey Mudd Collegeの2026年春、ダルムシュタット工科大学の2026/27年冬に教科書指定があり、Oklahoma State Universityの2023〜2024年の原稿版の授業使用はASEE論文に報告されている。学校名は過去の例を含み、同じ年度の全採用校の一覧ではない。教材間の矢印は内容の発展を示し、各校の全学生がこの順番で学ぶという意味ではない。本研究は回路とプログラムの拡張例を公開する。教科書の採用だけで教育効果が実証されたとはせず、教育効果や利用者数は測定していない。');
  lead(s,'高専・大学の授業で、回路・CPU設計の教科書が使われている');
  const stages=[
    {x:64,title:'ディジタル回路設計と\nコンピュータアーキテクチャ',body:'論理回路を組み合わせ、\n命令を実行するCPUを作る'},
    {x:470,title:'RISC-V SoC設計',body:'CPUを拡張し、メモリや\n周辺回路をつなぐ'},
    {x:876,title:'本研究',body:'Wallyに描画・表示を追加し、\n2Dゲームを動かす'}
  ];
  for(const item of stages){
    text(s,item.title,item.x,186,340,66,item.x===64?24:30,true,C.heading,'center');
    text(s,item.body,item.x,262,340,65,24,false,C.ink,'center');
  }
  // Three conceptual diagrams show the expansion of the design scope.
  // Their internal arrows illustrate roles, not a complete implementation.
  box(s,'',64,343,340,144,C.pale,22,C.ink,1.8);
  text(s,'CPU',78,347,312,29,23,true,C.ink,'center');
  box(s,'値を保存',82,384,128,42,C.white,20,C.ink,1.8);
  box(s,'計算する',258,384,128,42,C.white,20,C.ink,1.8);
  wire(s,210,405,258,405,C.ink,true,2);
  box(s,'命令に応じて指示',138,448,192,30,C.white,18,C.ink,1.8);
  wire(s,178,448,178,426,C.ink,true,1.8);
  wire(s,290,448,290,426,C.ink,true,1.8);

  box(s,'',470,343,340,144,C.pale,22,C.ink,1.8);
  text(s,'SoC',484,347,312,29,23,true,C.ink,'center');
  box(s,'CPU\nWally',488,391,100,75,C.white,21,C.ink,1.8);
  box(s,'メモリ',634,384,158,42,C.white,21,C.ink,1.8);
  box(s,'周辺回路',634,440,158,38,C.white,21,C.ink,1.8);
  wire(s,588,428,610,428,C.ink,false,2);
  wire(s,610,405,610,459,C.ink,false,2);
  wire(s,610,405,634,405,C.ink,true,2);
  wire(s,610,459,634,459,C.ink,true,2);
  junction(s,610,428,C.ink,4.4);

  box(s,'',876,343,340,144,C.pale,22,C.ink,1.8);
  text(s,'2Dゲーム機',890,347,312,29,23,true,C.ink,'center');
  box(s,'Wallyと\n周辺回路',892,392,144,75,C.white,21,C.ink,1.8);
  box(s,'描画・表示',1066,392,132,75,C.chip,21,C.blue,2.2);
  wire(s,1036,430,1066,430,C.blue,true,2.2);
  wire(s,404,414,460,414,C.ink,true,2.6);
  wire(s,810,414,866,414,C.ink,true,2.6);

  text(s,'教科書の指定・使用例（過去を含む）',64,501,746,29,21,true,C.ink,'center');
  text(s,'東京大学・広島大学\n豊田高専・久留米高専',64,539,340,58,23,false,C.ink,'center');
  text(s,'Harvey Mudd College\nOklahoma State University\nダルムシュタット工科大学',470,531,340,76,21,false,C.ink,'center');
  text(s,'回路とプログラムを公開\n拡張の方法を参照できる',876,539,340,58,23,false,C.ink,'center');
  line(s,'目的：Wallyの学習者に、2Dゲーム機への拡張例を示す',634,true,28);

  section='本研究の概要';
  s=slide('既存回路と本研究で追加した部分',30,
    '本研究では、既存の教育用CPUであるWallyと、描画回路であるRasterIXを組み合わせ、ゲーム機の回路を構成しました。両者の間には、描画命令を受け渡す接続回路を用意しました。Wallyを含む既存の構成には、SDカードからプログラムを読み込んで実行する仕組みがあります。この構成で動くブロック崩しのプログラムも用意しました。',
    `${PRODUCT} console/examples/rasterix/Breakout.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/examples/rasterix/WallyBusConnector.hpp; console/fpga/src/rasterixdisplay.sv.`,
    '主な既存回路はCPU、SDカード制御、DDRメモリ制御IP、RasterIXの描画・表示本体である。本研究ではNexys Videoへの対応、バス接続、クロック間の受渡しの構成、メモリ接続、表示の制御などを追加した。青枠は命令経路の代表的な接続部分を示す。その中にはAMD製のIPも含む。ゲームプログラムはCPU上で動くソフトウェアなので、回路の提供元を示す破線枠には含めていない。');
  lead(s,'教育用CPU Wallyに、描画回路 RasterIXを組み合わせる');
  drawCoreBoard(s,api,{mode:'abstract'});
  line(s,'既存の仕組み：SDカードからプログラムを読み込み、CPUで実行',585,false,27);
  line(s,'本研究：回路間の接続と、ブロック崩しのプログラム',631,true,28);

  section='ソフトウェアの概要';
  s=slide('プログラムの読込みと描画命令の送信',40,
    'CPUで行う処理を、C言語で示します。左は、SDカードから受信したゲームプログラムをDDRメモリへコピーする処理です。6行目で1バイトずつ読み書きし、7行目でコピー先のゲームを呼び出します。右は、元はSDカードに保存されていたゲームの処理です。位置や得点を更新して描画命令を用意し、13〜14行目で描画回路の送信口へ書きます。次に、13〜14行目の書込みと、回路の動きの対応を説明します。',
    'console/fpga/zsbl/spi.h: SPI_RXDATA, spi_readbyte(); console/fpga/zsbl/boot.c: disk_read() received-byte loop; console/examples/rasterix/WallyBusConnector.hpp: writeData(); console/examples/rasterix/Breakout.hpp: Game::step(); console/examples/rasterix/BreakoutRenderer.hpp; console/fpga/src/rasterix_apb.sv: CMD register. Product revision ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17.',
    C_PROGRAM_DETAIL);
  lead(s,'SDカードのゲームをDDRメモリへコピーし、CPUで実行する');
  drawGameProgram(s,api);
  line(s,'6行目：コピー → 7行目：ゲームを開始 → 13〜14行目：描画命令を送信',658,true,25);

  s=slide('アドレスへの書込みで描画命令を送る',25,
    '既存の構成では、回路ごとにアクセス用のアドレスが割り当てられています。このような操作をMMIOと呼びます。本研究では、描画命令の送信口を0x10080000としました。6枚目の13〜14行目で、このアドレスに描画の指示を表す数値を書きます。接続回路が受け取り、描画回路に渡すことで、ゲームの画像を作る処理が進みます。',
    `${PRODUCT} console/examples/rasterix/WallyBusConnector.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/addins/rasterix/lib.`,
    '引用は6枚目13〜14行目を一行にまとめたもの。commandsは描画命令の配列、iはその中の位置、countは語数を表す。付属ライブラリはOpenGL互換の描画指定をCPU上で処理し、描画回路に渡す数値列を用意する。Wally用のソフトウェア接続部分が、その値を決められた入出力アドレスへ書く。接続回路は値を受け取り、RasterIXへ渡す。ブロック、壁、パドル、ボールは四角形で、文字は画像を貼った四角形で表す。関数名やテクスチャ座標の具体例は回答用21〜29枚目にある。');
  lead(s,'MMIO：回路に割り当てたアドレスを読み書きして操作する');
  drawCoreBoard(s,api,{mode:'command'});
  drawCodeQuote(s,api,'command');
  line(s,'0x10080000 への書込みを、接続回路が描画命令として受け取る',631,true,25);

  section='ハードウェアの概要';
  s=slide('アドレスデコーダに接続先を追加する',30,
    'ハードウェア側では、アドレスデコーダが、CPUから出たアドレスを調べます。これは、アクセス先の回路を選ぶイネーブル信号を出す回路です。本研究では、既存のアドレス割当てに描画回路用の領域を追加しました。例えば0x10080000への書込みでは、接続回路が選ばれ、描画命令の数値を受け取ります。',
    'console/config/rv64gc/config.vh: EXT_IO_BASE=0x10080000, EXT_IO_RANGE=0xFF; console/config/derivlist.txt: fpganexysvideo_rasterix; console/src/mmu/adrdecs.sv; console/src/uncore/uncore.sv: PSELEXT; console/fpga/src/rasterix_apb.sv: command port.',
    'Wallyの既存の外部APB領域を有効にし、描画接続回路へ接続している。アドレスデコーダのRTLを一から書いたという意味ではなく、その既存の領域選択機能と構成パラメータを利用した。図はCPUの書込みを、アドレス、書込みデータ、書込みイネーブル、接続先の選択に分けた概念図である。実際にはAHBからAPBへの変換や転送の段階があるが、この図では省略している。有効なアクセスでWE=1が書込み、WE=0が読出しを示す。読み出しデータの戻り経路は、書込みだけを説明するこの図では省略した。0x10080000〜0x100800FFは接続回路用の領域で、その中の0x10080000が描画命令の送信口である。アドレス下位のビットが、接続回路内でアクセスするレジスタを指定する。');
  lead(s,'アドレスから、アクセス先を選ぶイネーブル信号を出す');
  drawAddressDecode(s,api);
  line(s,'描画用の領域：0x10080000〜0x100800FF',585,true,27);
  line(s,'0x10080000への書込みで、接続回路を選択する',631,false,28);

  s=slide('接続回路で受渡しの違いに対応する',40,
    '独自に用意した接続部分では、通信方式と、クロック周波数の違いに対応しました。CPU側の書込みと、描画回路側の命令の受取りでは、使う信号のやり取りが異なります。そこで、書込みを受けて、描画回路側へデータを渡す回路を追加しました。また、CPU側と描画側は異なるクロックで動くため、その間の受渡しにはAMD製の回路を使いました。この二つを組み合わせて、命令が届く経路を作りました。',
    `${PRODUCT} console/fpga/src/rasterix_apb.sv; console/fpga/src/rasterix.sv; console/fpga/generator/axiscdc.tcl. AMD PG085: https://docs.amd.com/r/en-US/pg085-axi4stream-infrastructure/Overview-of-Features`,
    'CPU側のAPB書込みを、RasterIX側のAXI4-Streamに対応させる部分は本研究で追加したRTLである。描画命令そのものを別の命令に変える処理ではなく、データと受渡しの制御信号を対応させる。クロック間にはAMD製AXI4-Stream Data FIFOを非同期設定で使う。標準構成はCPU側20 MHz、描画側100 MHzである。FIFOの内部回路を独自に発明した、またはこの方式が最速だという主張はしない。形式に合わせる部分は追加したRTL、クロック間の受渡しはAMD製IPである。');
  lead(s,'CPU側と描画回路側では、通信方式とクロック周波数が異なる');
  drawCoreBoard(s,api,{mode:'adapter'});
  line(s,'対応：形式を合わせる回路と、クロック間で渡す回路を接続',579,true,26);
  box(s,'CPU',64,628,130,49,C.white,25,C.ink,2.2);
  wire(s,194,652,244,652,C.blue,true,3);
  box(s,'',244,622,330,60,C.white,25,C.blue,2.2);
  text(s,'受渡しの形式を合わせる',254,624,310,29,23,true,C.blue,'center');
  text(s,'本研究で追加した回路',254,654,310,25,20,false,C.ink,'center');
  wire(s,574,652,634,652,C.blue,true,3);
  box(s,'',634,622,330,60,C.pale,25,C.blue,2.2);
  text(s,'異なるクロック間で渡す',644,624,310,29,23,true,C.blue,'center');
  text(s,'AMD製の回路',644,654,310,25,20,false,C.ink,'center');
  wire(s,964,652,1024,652,C.blue,true,3);
  box(s,'描画回路',1024,628,192,49,C.white,25,C.ink,2.2);

  s=slide('描画命令から映像を出力する',25,
    '描画回路は、受け取った命令に従って、ブロックやボールなどの画素を作ります。その画像を、DDRメモリ制御を通してメモリへ保存します。表示の回路が画像を読み出し、画素を順に映像信号へ変えて、HDMI端子から出力します。描画と表示の本体には、どちらもRasterIXに含まれる既存回路を使っています。',
    `${PRODUCT} console/fpga/src/rasterix.sv; console/fpga/generator/rasterixmem.tcl; ${BASIC}`,
    'RasterIX_IFは内部の作業領域で描画を進め、画像のデータを外部メモリへ転送する。図ではその細部を省き、DDRメモリ制御を介して画像をDDR3へ保存する経路を示す。表示本体はRasterIXに同梱されたdvi_framebufferである。プログラムと画像はDDR3内の異なるアドレス領域を使う。図中の一本の矢印は転送の役割をまとめたものであり、実装の各信号を表してはいない。');
  lead(s,'描画回路が画像を作り、表示の回路がHDMI端子へ出力する');
  drawCoreBoard(s,api,{mode:'image'});
  line(s,'画像をDDR3へ保存し、表示の回路が繰り返し読み出す',585,false,27);
  line(s,'描画・表示の本体には、RasterIXの既存回路を利用する',631,true,28);

  section='実行結果';
  const utilization=await loadFpgaUtilization(root);
  s=slide('FPGA内部のリソース使用量',25,
    'FPGAのチップには、実装できる論理回路やメモリなどの量に上限があります。こちらは、保存していたWallyの基本構成と、今回のゲーム機構成の使用率です。ゲーム機では、論理演算に使うLUTが約50%、内部メモリのBlock RAMが約59%です。CPUやメモリ制御、描画・表示を含む回路全体を、一つのFPGAに実装できました。',
    `Before: ${FPGA_UTILIZATION_SOURCE}; After: ${STANDARD_UTILIZATION_SOURCE}; ${BASIC}`,
    FPGA_UTILIZATION_DETAIL);
  lead(s,'Wallyの基本構成と、製作したゲーム機の使用率');
  drawCurrentUtilization(s,api,utilization);
  line(s,'CPU・周辺制御・描画・表示を、1個のFPGAに実装できた',631,true,27);

  s=slide('ブロック崩しの実機動画',30,
    'こちらが実機の映像です。自動プレイで、ボールがブロックに当たると、そのブロックが消え、ボールが跳ね返ることを確認しました。また、下のバーに当たって跳ね返る様子も確認しました。既存のCPUと描画・表示回路を接続した構成で、ゲームの処理と画面の更新ができています。',
    `${BASIC} Video: ${VIDEO}`,
    '2026年11月9日に取得した標準表示構成の30秒の記録。ゲーム画面は640×480画素。埋込み動画は同じ記録をH.264 Highへ再符号化した配布用ファイルで、映像内容と時間を保持している。RasterIX_IFと同梱dvi_framebufferを使う標準回路で取得した。自動操作であり、ゲームコントローラはまだ実装していない。録画のフレームレートをゲームの描画FPSとして扱わない。');
  text(s,'640×480画素のゲーム画面を出力し、プログラムで自動操作',64,126,1152,38,27,true,C.blue);
  s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'標準表示構成で動くブロック崩しの実機動画',fit:'contain',position:{left:200,top:173,width:880,height:495}});
  text(s,'ブロックの消去と、ブロック・バーでのボールの反射を確認',64,681,1080,29,22,true,C.blue,'center');

  section='まとめ';
  s=slide('結論と今後の展望',20,
    '既存の教育用CPU Wallyに、既存の描画回路RasterIXを接続しました。接続回路とゲームプログラムを用意し、FPGA上でブロック崩しが動くことを確認しました。今後は、ホーム画面などのGUI、またはゲームコントローラによる操作の実装に取り組みます。',
    `${PRODUCT} ${BASIC}`,
    '結論は、接続を実装した構成で、ブロック崩しの自動操作によるゲーム進行と映像出力を確認したことである。今回の組合せを他のCPUやボードにもそのまま適用できるという結論ではない。今後の候補はゲームコントローラへの対応とホーム画面などのGUIであり、実装する項目は今後選択する。図の実線の入れ子は、ボードの上にチップがあり、その内側に回路を実装したという階層を示す。SDカードスロットやDDR3メモリはチップ外で、同じボード上にある。破線は既存回路の提供元を示し、物理的なチップの境界ではない。');
  lead(s,'Wallyに描画機能を追加し、ブロック崩しの動作を確認した');
  drawCoreBoard(s,api,{mode:'hierarchy'});
  line(s,'成果：ゲーム機への拡張例を、設計コードと動作記録で公開',585,true,27);
  line(s,'今後：ホーム画面などのGUI、またはゲームコントローラを実装',634,false,27);
}
