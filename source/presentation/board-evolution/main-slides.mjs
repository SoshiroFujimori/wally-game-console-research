import fs from 'node:fs/promises';
import path from 'node:path';
import {drawStableBoard} from './stable-board.mjs';
import {drawCoreBoard} from './core-board.mjs';
import {drawGameProgram} from './game-program.mjs';

// A bounded integration result and its functional evidence form the main talk.
// Detailed architecture and OpenGL API material remain in the answer slides.
export async function addMainSlides(ctx) {
  const {slide,api,cover,root,DDCA,RVSOC,PRODUCT,BASIC,POSTER,VIDEO}=ctx;
  const {text,wire,box,junction,C}=api;
  const lead=(s,v)=>text(s,v,64,119,1152,38,27,true,C.blue);
  const line=(s,v,y,bold=false,size=27)=>text(s,v,64,y,1152,38,size,bold,bold?C.heading:C.ink);
  let s=slide('FPGAを用いた2Dゲーム機の製作',5,
    'この題目で発表します。','',
    '教育用CPUに描画・表示機能を追加したゲーム機の製作について報告する。');
  wire(s,190,371,1090,371,C.heading,false,1.7);
  text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
  text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');

  s=slide('FPGAチップで周囲の部品を制御する',20,
    'FPGAボードには、SDカードスロット、メモリ、HDMI端子が付いています。中央のチップには、これらを制御する回路を実装できます。左のコードが右のAND回路を表すように、回路をコードで記述して実装します。',
    `${DDCA} Chapters 2 and 4. ${RVSOC} Chapter 23. Nexys Video Reference Manual.`,
    'FPGAは、コードで記述したデジタル回路をチップ内に実装できるデバイスである。CPUも、その方法で実装する回路の一つである。SDカードなどを実際に制御するにはそれぞれの制御回路が必要であり、AND回路はコードと回路の対応だけを示す。回路を記述するHDLと、CPUが実行するゲームのプログラムは、それぞれ作る対象が異なる。');
  lead(s,'SDカードやメモリを制御する回路を、チップ内に実装できる');
  drawStableBoard(s,api,{mode:'implementation'});
  line(s,'回路をHDLコードで記述し、FPGAチップ内に実装する',603,true,28);

  s=slide('教科書で学ぶCPUをゲーム機へ拡張する',35,
    '左の教科書では、値を保存する回路、計算する回路、それらを指示する回路を組み合わせ、命令を実行するCPUを作ります。中央の『RISC-V SoC設計』では、その基礎を発展させ、CPUのWallyや、メモリ・周辺回路への接続を学びます。下に示す大学や高専で、これらの教科書の指定や使用例があります。本研究は、さらに描画・表示を追加し、学習者が参照できるゲーム機への拡張例を示します。',
    `${DDCA} Chapters 3, 5 and 7. ${RVSOC} Chapters 7, 9, 20 and 23. School records: docs/presentation/DDCA授業利用の出典.md (U07, U05, K02, K04); docs/presentation/RVSOC教科書採用の出典.md. Tokyo: https://catalog.he.u-tokyo.ac.jp/detail?code=0510019&year=2022 ; Hiroshima: https://momiji.hiroshima-u.ac.jp/syllabusHtml/2026_12_K6406020.html ; Toyota: https://syllabus.kosen-k.go.jp/Pages/PublicSyllabus?department_id=13&lang=ja&school_id=23&subject_code=34234&year=2022 ; Kurume: https://syllabus.kosen-k.go.jp/Pages/PublicSyllabus?department_id=03&from=curriculum&lang=ja&school_id=43&subject_code=4S18&year=2023 ; HMC: https://pages.hmc.edu/harris/class/e154/ ; OSU: Thompson et al., RISC-V System-on-Chip Design Textbook and Course (2025), Section 4, https://doi.org/10.18260/1-2--57147 ; TU Darmstadt: https://www.esa.informatik.tu-darmstadt.de/lehre/202627/cai . Official books: https://pages.hmc.edu/harris/ddca/ddcarv.html ; https://pages.hmc.edu/harris/ddca/rvsocd.html .`,
    '左の教科書は、日本語版の書名を表示した。略称はDDCA、英語の書名はDigital Design and Computer Architectureである。第3章の順序回路、第5章の演算回路などの基礎を使い、第7章で命令を実行するプロセッサを組み立てる。図の「値を保存」はレジスタ、「計算する」は演算回路、「命令に応じて指示」は制御回路の役割を表す。CPUを構成する役割の例であり、命令メモリやフィードバックなどをすべて描いた配線図ではない。中央の「RISC-V SoC設計」は、RISC-V System-on-Chip Designという英語書名を説明用に日本語で表したもので、日本語版の刊行を意味しない。略称はRVSOC。第7章のCPUを基礎に、第9章で外部メモリへのバス接続、第20章で周辺回路、第23章でFPGA実装を扱う。図はそのうち本研究につながる部分を示す。授業の例は、東京大学の2022年度、広島大学の2026年度、豊田高専の2025年度、久留米高専の2026年度に、DDCAを教科書・教材欄で確認したもの。版は同一ではなく、久留米高専はARM版である。RVSOCはHarvey Mudd Collegeの2026年春、ダルムシュタット工科大学の2026/27年冬に教科書指定があり、Oklahoma State Universityの2023〜2024年の原稿版の授業使用はASEE論文に報告されている。学校名は過去の例を含み、同じ年度の全採用校の一覧ではない。教材間の矢印は内容の発展を示し、各校の全学生がこの順番で学ぶという意味ではない。本研究は回路とプログラムの拡張例を公開する。教科書の採用だけで教育効果が実証されたとはせず、教育効果や利用者数は測定していない。');
  lead(s,'論理回路を組み合わせたCPUを、ゲーム機へ発展させる');
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

  s=slide('既存回路と本研究で追加した部分',25,
    '左は、CPUのWallyと周辺部品を制御する回路をまとめたものです。右の描画・表示には、RasterIXに含まれる回路を使います。本研究では、これらをつなぐ接続部分と、ブロック崩しのプログラムを追加しました。次に、プログラムからこうした回路を操作する方法を説明します。',
    `${PRODUCT} console/examples/rasterix/Breakout.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/examples/rasterix/WallyBusConnector.hpp; console/fpga/src/rasterixdisplay.sv.`,
    '主な既存回路はCPU、SDカード制御、DDRメモリ制御IP、RasterIXの描画・表示本体である。本研究ではNexys Videoへの対応、バス接続、クロック間の受渡しの構成、メモリ接続、表示の制御などを追加した。青枠は命令経路の代表的な接続部分を示す。その中にはAMD製のIPも含む。ゲームプログラムはCPU上で動くソフトウェアなので、回路の提供元を示す破線枠には含めていない。');
  lead(s,'既存のCPU・描画回路を利用し、接続部分とゲームを追加');
  drawCoreBoard(s,api,{mode:'abstract'});
  line(s,'既存回路：CPUと周辺制御回路、描画・表示回路',585,false,27);
  line(s,'本研究：回路間の接続と、ブロック崩しのプログラム',631,true,28);

  s=slide('プログラムの読込みと描画命令の送信',40,
    '左は、SDカードからゲームの機械語をDDR3へ移す処理です。受信した1バイトを読み、DDR3に書いて、保存先のアドレスを進めます。全体を移したら、jr命令でDDR3上の開始位置へジャンプします。すると右の、元はSDカードにあったゲームの命令がCPUで実行されます。ゲームは描画命令の数値列を用意し、その値を0x10080000へ書いて描画回路に送ります。左はプログラムを読み込む処理、右は読み込まれたプログラムです。',
    'console/fpga/zsbl/spi.h: SPI_RXDATA, spi_readbyte(); console/fpga/zsbl/boot.c: disk_read() received-byte loop; console/examples/rasterix/WallyBusConnector.hpp: writeData(); console/examples/rasterix/breakout.cpp; console/fpga/src/rasterix_apb.sv: CMD register; console/config/rv64gc/config.vh: EXT_MEM_BASE, EXT_IO_BASE. Product revision ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17.',
    '概念例の範囲\n左と右は、CPU上で役割の異なるプログラムが順に動くことを示す。左の処理がSDカードからゲームをDDR3へコピーし、開始位置へ分岐した後、右のゲームの命令をCPUが実行する。CPUがSDカード内の機械語をその場で直接実行するという意味ではない。図中のコードはRISC-Vの実在する命令・疑似命令を用いた概念的な断片で、実機ソフトウェアの逆アセンブルではない。SDカードには機械語が保存され、読みやすくアセンブリ表記で示している。読込み側は既存の起動・読込み処理の役割をまとめたもので、このローダーを新たに製作したという主張ではない。実際にはブートローダーとOSが初期化、ファイル読込み、プログラム配置、実行環境の準備を行う。\n\nコピーと分岐\ns0はSDカード制御の受信レジスタ0x1304C、s1はDDR3の書込み先、s2は読込み終端を保持する。lbuで受信済みの1バイトを読み、sbでDDR3へ保存する。addiで保存先を1バイト進め、bltuで終端未満ならcopyへ戻る。例では0x80000000から0x80000FFFまで4096バイトをコピーするが、実際のゲームのサイズや開始アドレスを測定・指定した値ではない。最後のliでt0へ0x80000000を置き、jr t0でPCをそのアドレスに変更する。jrはjalr x0,0(t0)の疑似命令である。liも定数の大きさにより複数の実命令になる。SDの初期化、読出し要求、転送を進めるための送信、受信待ち、領域やファイルの選択、エラー確認、コピー後の命令フェッチの同期などは概念例では省略する。受信レジスタを読むだけでSD通信が自動的に進むと主張するものではない。\n\n読み込まれたゲーム\ngameは、この概念例ではDDR3の開始位置0x80000000に置いたゲームの入口を示す。省略記号の部分でゲームの状態を更新し、既存のOpenGL互換ライブラリを使って描画命令列を準備する。a0はその命令列の先頭アドレスを表す。lw t1,0(a0)で命令列から32ビットの1語を読み、sw t1,0(t0)で0x10080000の命令ポートに書く。ここでいう描画命令は描画回路用の数値であり、CPUが実行するRISC-V命令とは異なる。実際のWally用接続プログラムは、対応づけた仮想アドレスをvolatileポインタでアクセスし、最後の1語は0x10080004へ送って終端を知らせ、fenceで順序を制御する。これらと残りの命令列の送信、画面切替・待ち処理は省略記号に含む。コード中の...は説明上の省略であり、アセンブラの命令ではない。青い折れ線は実行先の移動、右向きの矢印は描画命令の転送を示す機能図で、物理的な一本の信号線ではない。');
  lead(s,'SDカードのゲームをDDR3へコピーし、その命令をCPUで実行');
  drawGameProgram(s,api);
  line(s,'jrで実行先をDDR3へ移し、swで描画命令を送る',658,true,27);

  s=slide('SDカードからプログラムを読み込む',30,
    'まず、SDカードに保存したゲームプログラムを読み込みます。CPUがSDカード制御に読出しを要求すると、SDカード制御がカードと通信し、データをCPUへ返します。CPUは受け取ったデータをDDRメモリ制御へ渡し、メモリに保存します。この繰返しで、プログラムを実行に使うメモリへ用意します。',
    'console/fpga/zsbl/spi.h; console/fpga/zsbl/boot.c; console/src/uncore/spi_apb.sv; console/examples/rasterix/README.md.',
    'SDカードは電源を切ってもプログラムを保存できる媒体である。DDR3は実行中のプログラムやデータを置くメモリである。図はCPUが制御回路を介してSDの内容を受け取り、DDR3へ保存する役割を示す。実機ではブートローダーやOSが読み込みと配置を担う。ゲームが直接SDカード制御の物理アドレスを参照するという説明ではない。矢印は要求やデータをまとめた機能的な経路であり、一本の実配線を意味しない。');
  lead(s,'SDカード制御がカードから読み出し、CPUがDDR3へ保存する');
  drawCoreBoard(s,api,{mode:'copy'});
  line(s,'SDカード：プログラムの保存場所',583,true,28);
  line(s,'DDR3：読み込んだプログラムを実行するときの置き場所',630,false,27);

  s=slide('CPUがゲームプログラムを実行する',25,
    '読み込んだプログラムは、CPUが実行する命令の列です。CPUは、DDRメモリ制御を通してメモリ上の命令を読み出し、その指示に従って計算を進めます。ボールの位置や得点の更新も、この命令の実行によって行われます。',
    'console/examples/rasterix/Breakout.hpp: Game::step(), scene(); console/examples/rasterix/breakout.cpp.',
    'ゲームのルールと状態更新はCPUで実行するプログラムの仕事である。描画回路はゲームの当たり判定や得点の規則を決めない。DDR3へのアクセスはDDRメモリ制御を介する。CPU内部のキャッシュや仮想アドレスなどは機能図では省略している。パドルは現在、自動操作のプログラムが動かしている。');
  lead(s,'DDR3上の命令を読み出し、ゲームの計算を進める');
  drawCoreBoard(s,api,{mode:'execute'});
  line(s,'CPUはメモリから命令を読み出して実行する',584,false,27);
  line(s,'命令に従い、位置や得点などのデータを更新する',631,true,28);

  s=slide('ゲームから描画命令を送る',25,
    'CPUは、描く図形の位置や色を、RasterIX付属のライブラリへ渡します。ライブラリが描画回路用の命令を作り、CPUが接続回路へ送ります。描画回路は受け取った命令に従って、ブロックやボールなどの画素を塗ります。',
    `${PRODUCT} console/examples/rasterix/WallyBusConnector.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/addins/rasterix/lib.`,
    '付属ライブラリはOpenGL互換の描画指定をCPU上で処理し、描画回路に渡す数値列を用意する。Wally用のソフトウェア接続部分が、その値を決められた入出力アドレスへ書く。接続回路は値を受け取り、RasterIXへ渡す。ブロック、壁、パドル、ボールは四角形で、文字は画像を貼った四角形で表す。関数名やテクスチャ座標の具体例は回答用22〜30枚目にある。');
  lead(s,'図形の位置や色を、ライブラリが描画命令にする');
  drawCoreBoard(s,api,{mode:'command'});
  line(s,'CPU：ゲームの計算と、描画命令の送信',584,true,28);
  line(s,'描画回路：命令に従って画像の画素を塗る',631,false,27);

  s=slide('接続回路で受渡しの違いに対応する',40,
    '接続で対応したのは、受渡しの形式と、動作周波数の違いです。CPU側の書込みと、描画回路側の命令の受取りでは、使う信号のやり取りが異なります。そこで、書込みを受けて、描画回路側へデータを渡す回路を追加しました。また、CPU側と描画側は異なるクロックで動くため、その間の受渡しにはAMD製の回路を使いました。この二つを組み合わせて、命令が届く経路を作りました。',
    `${PRODUCT} console/fpga/src/rasterix_apb.sv; console/fpga/src/rasterix.sv; console/fpga/generator/axiscdc.tcl. AMD PG085: https://docs.amd.com/r/en-US/pg085-axi4stream-infrastructure/Overview-of-Features`,
    'CPU側のAPB書込みを、RasterIX側のAXI4-Streamに対応させる部分は本研究で追加したRTLである。描画命令そのものを別の命令に変える処理ではなく、データと受渡しの制御信号を対応させる。クロック間にはAMD製AXI4-Stream Data FIFOを非同期設定で使う。標準構成はCPU側20 MHz、描画側100 MHzである。FIFOの内部回路を独自に発明した、またはこの方式が最速だという主張はしない。形式に合わせる部分は追加したRTL、クロック間の受渡しはAMD製IPである。');
  lead(s,'課題：データの受渡しの形式と、動作するクロックが異なる');
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

  s=slide('描画回路が画像をメモリに保存する',25,
    '描画回路は、命令に従って、ブロックやボールなどの画素を作ります。画素の色をDDRメモリ制御へ渡し、DDR3に画像として保存します。DDR3には、CPUが実行するプログラムに加え、この表示する画像も置いています。',
    `${PRODUCT} console/fpga/src/rasterix.sv; console/fpga/generator/rasterixmem.tcl; ${BASIC}`,
    'RasterIX_IFは内部の作業領域で描画を進め、画像のデータを外部メモリへ転送する。図ではその細部を省き、DDRメモリ制御を介して画像をDDR3へ保存する経路を示す。プログラムと画像はDDR3内の異なるアドレス領域を使う。図中の一本の矢印は転送の役割をまとめたものであり、実装の各信号を表してはいない。');
  lead(s,'図形の位置や色から画素を作り、DDR3に画像として保存');
  drawCoreBoard(s,api,{mode:'image-write'});
  line(s,'描画回路が、ブロック・ボール・文字などの画素を作る',585,false,27);
  line(s,'DDR3には、プログラムと表示する画像を置く',631,true,28);

  s=slide('表示回路が画像を読み出して映像を出す',25,
    '表示回路は、DDRメモリ制御に画像の読出しを要求します。返ってきた画素を順に映像信号へ変え、HDMI端子へ出力します。ゲームが作る画像を、表示回路が繰り返し読み出すことで画面に映ります。描画と表示の本体は、どちらもRasterIXリポジトリに含まれる回路を使っています。',
    `${PRODUCT} console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl; ${BASIC}`,
    '表示本体はRasterIXに同梱されたdvi_framebufferである。画像データはDDR3からDDRメモリ制御を経て表示回路へ戻る。青い矢印は画像データが進む向きで、読出し要求は逆方向へ送る。表示タイミングに合わせて画素を信号へ変える回路も表示本体に含まれる。表示本体へ渡す制御や画面切替などの接続部分を本研究で追加している。HDMIはボード上の端子名として用いている。');
  lead(s,'DDR3から画素を読み出し、HDMI端子へ映像を出力');
  drawCoreBoard(s,api,{mode:'image-read'});
  line(s,'表示回路が画像を繰り返し読み出し、画素を順に出力する',585,false,27);
  line(s,'描画・表示の本体には、RasterIXの既存回路を利用する',631,true,27);

  s=slide('ブロック崩しの実機動画',30,
    'こちらが実機の映像です。ボールとパドルが動き、当たったブロックが消え、得点が増えています。既存のCPUと描画・表示回路を接続した構成で、このゲームの処理と画面の更新ができることを確認しました。パドルはプログラムが自動で動かしています。',
    `${BASIC} Video: ${VIDEO}`,
    '2026年11月9日に取得した標準表示構成の30秒の記録。ゲーム画面は640×480画素。埋込み動画は同じ記録をH.264 Highへ再符号化した配布用ファイルで、映像内容と時間を保持している。RasterIX_IFと同梱dvi_framebufferを使う標準回路で取得した。自動操作であり、ゲームコントローラはまだ実装していない。録画のフレームレートをゲームの描画FPSとして扱わない。');
  text(s,'640×480画素のゲーム画面を出力し、プログラムで自動操作',64,126,1152,38,27,true,C.blue);
  s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'標準表示構成で動くブロック崩しの実機動画',fit:'contain',position:{left:200,top:173,width:880,height:495}});
  text(s,'ボールの移動・ブロックの消去・得点の変化を確認',64,681,1080,29,22,true,C.blue,'center');

  s=slide('結論と今後の展望',20,
    'WallyとRasterIXの接続を設計し、ブロック崩しの画面が更新されることを実機で確認しました。CPUに描画機能を追加する拡張例として、設計コードと動作記録を公開しています。今後は、ゲームコントローラによる操作や、ホーム画面などのGUIを追加したいと考えています。',
    `${PRODUCT} ${BASIC}`,
    '結論は、接続を実装した構成で、ブロック崩しの自動操作によるゲーム進行と映像出力を確認したことである。今回の組合せを他のCPUやボードにもそのまま適用できるという結論ではない。今後の候補はゲームコントローラへの対応とホーム画面などのGUIであり、実装する項目は今後選択する。図の実線の入れ子は、ボードの上にチップがあり、その内側に回路を実装したという階層を示す。SDカードスロットやDDR3メモリはチップ外で、同じボード上にある。破線は既存回路の提供元を示し、物理的なチップの境界ではない。');
  lead(s,'Wallyに描画機能を追加し、ブロック崩しの動作を確認した');
  drawCoreBoard(s,api,{mode:'hierarchy'});
  line(s,'成果：ゲーム機への拡張例を、設計コードと動作記録で公開',585,true,27);
  line(s,'今後：ゲームコントローラによる操作や、ホーム画面を追加',634,false,27);
}
