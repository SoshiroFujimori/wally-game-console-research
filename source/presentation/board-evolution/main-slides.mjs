import fs from 'node:fs/promises';
import path from 'node:path';
import {drawStableBoard} from './stable-board.mjs';
import {drawCoreBoard} from './core-board.mjs';
import {loadFpgaUtilization,drawCurrentUtilization,STANDARD_UTILIZATION_SOURCE} from './fpga-utilization.mjs';

// A bounded integration result and its functional evidence form the main talk.
// Detailed architecture and OpenGL API material remain in the answer slides.
export async function addMainSlides(ctx) {
  const {slide,api,cover,root,DDCA,RVSOC,PRODUCT,BASIC,POSTER,VIDEO}=ctx;
  const {text,wire,box,C}=api;
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

  s=slide('教科書で学ぶCPUをゲーム機へ拡張する',30,
    'DDCAは、論理回路からCPUの仕組みまでを学ぶ教科書で、国内でも授業に使われています。その学習を発展させるRVSOCでは、回路コードが公開されたCPU、Wallyの設計を学べます。本研究の目的は、このWallyに描画機能を加え、学習者が参照できる2Dゲーム機への拡張例を示すことです。',
    'DDCA textbook adoption: https://momiji.hiroshima-u.ac.jp/syllabusHtml/2026_12_K6406020.html . RVSOC textbook adoption: https://pages.hmc.edu/harris/class/e154/ . Learning path: https://github.com/riscv/learn#-learning-paths . Official books: https://pages.hmc.edu/harris/ddca/ddcarv.html ; https://pages.hmc.edu/harris/ddca/rvsocd.html . Checked 2026-11-10.',
    'DDCAの正式名称はDigital Design and Computer Architectureである。広島大学の2026年度「コンピューターアーキテクチャ」はRISC-V版を教科書に指定している。RVSOCはRISC-V System-on-Chip Designで、Harvey Mudd Collegeの2026年春E154で教科書として掲載されている。RISC-Vの学習資料集riscv/learnにも、DDCAから基礎を学び、RVSOCとWallyで発展させる学習経路が示されている。図は教材間の内容のつながりと、本研究が提供する拡張例を示す。各校の全学生がこの順番で学習するという意味ではない。国内でのDDCAの教科書指定は、CPU設計を学ぶ人がいることを示す背景である。本研究の利用を想定するのは、その先でWallyの拡張を学ぶ人であり、教材の採用だけで本研究の教育効果が実証されたとはしない。教育効果や利用者数は測定していない。');
  lead(s,'CPU設計の学習を、動作するゲーム機の実装例につなげる');
  const stages=[
    {x:64,title:'DDCA',body:'論理回路から\nCPUの仕組みを学ぶ',example:'教科書の指定例\n広島大学\n2026年度'},
    {x:470,title:'RVSOC',body:'CPU「Wally」の設計を学ぶ\n回路コードも公開',example:'教科書の指定例\nHarvey Mudd College\n2026年春'},
    {x:876,title:'本研究',body:'Wallyに描画機能を追加\n2Dゲーム機を実装',example:'回路とプログラムを公開\n拡張の方法を参照できる'}
  ];
  for(const item of stages){
    box(s,'',item.x,235,340,166,C.pale,25,C.ink,1.8);
    text(s,item.title,item.x+12,245,316,44,33,true,C.heading,'center');
    text(s,item.body,item.x+12,303,316,78,25,false,C.ink,'center');
    text(s,item.example,item.x,424,340,105,23,false,C.ink,'center');
  }
  wire(s,404,318,460,318,C.ink,true,2.6);
  wire(s,810,318,866,318,C.ink,true,2.6);
  line(s,'目的：Wallyの学習者に、2Dゲーム機への拡張例を示す',584,true,28);
  line(s,'CPUと周辺回路をつなぐ方法を、設計と動作例で示す',634,false,27);

  s=slide('既存回路と本研究で追加した部分',30,
    'CPUとSD制御にはWallyリポジトリの回路を使います。メモリ制御にはAMD製の回路を使います。描画と表示にはRasterIXに含まれる回路を使います。本研究では、これらの接続部分と、動作確認に使うブロック崩しのプログラムを作成しました。青い枠が、描画命令を受け渡す接続部分です。',
    `${PRODUCT} console/examples/rasterix/Breakout.hpp; console/examples/rasterix/BreakoutRenderer.hpp; console/examples/rasterix/WallyBusConnector.hpp; console/fpga/src/rasterixdisplay.sv.`,
    '主な既存回路はCPU、SD制御、DDR制御IP、RasterIXの描画・表示本体である。本研究ではNexys Videoへの対応、バス接続、クロック間の受渡しの構成、メモリ接続、表示の制御などを追加した。青枠は命令経路の代表的な接続部分を示す。その中にはAMD製のIPも含む。ゲームプログラムはCPU上で動くソフトウェアなので、回路の提供元を示す破線枠には含めていない。');
  lead(s,'既存のCPU・描画回路を利用し、接続部分とゲームを追加');
  drawCoreBoard(s,api,{mode:'overview'});
  line(s,'既存回路：CPU、SD制御、DDR制御、描画・表示本体',585,false,26);
  line(s,'本研究：回路間の接続と、ブロック崩しのプログラム',631,true,28);

  s=slide('SDカードからプログラムを読み込む',30,
    'まず、SDカードに保存したゲームプログラムを読み込みます。CPUがSD制御に読出しを要求すると、SD制御がカードと通信し、データをCPUへ返します。CPUは受け取ったデータをDDR制御へ渡し、メモリに保存します。この繰返しで、プログラムを実行に使うメモリへ用意します。',
    'console/fpga/zsbl/spi.h; console/fpga/zsbl/boot.c; console/src/uncore/spi_apb.sv; console/examples/rasterix/README.md.',
    'SDカードは電源を切ってもプログラムを保存できる媒体である。DDR3は実行中のプログラムやデータを置くメモリである。図はCPUが制御回路を介してSDの内容を受け取り、DDR3へ保存する役割を示す。実機ではブートローダーやOSが読み込みと配置を担う。ゲームが直接SD制御の物理アドレスを参照するという説明ではない。矢印は要求やデータをまとめた機能的な経路であり、一本の実配線を意味しない。');
  lead(s,'SD制御がカードから読み出し、CPUがDDR3へ保存する');
  drawCoreBoard(s,api,{mode:'copy'});
  line(s,'SDカード：プログラムの保存場所',583,true,28);
  line(s,'DDR3：読み込んだプログラムを実行するときの置き場所',630,false,27);

  s=slide('CPUがゲームプログラムを実行する',30,
    'CPUは、DDR3に読み込んだプログラムを実行します。ブロック崩しでは、ボールやパドルの位置を計算し、壁やブロックに当たったかを調べます。当たったら進む向きや得点を変えます。ゲームをどう進めるかはCPUが計算し、次に、その結果を画面に描かせます。',
    'console/examples/rasterix/Breakout.hpp: Game::step(), scene(); console/examples/rasterix/breakout.cpp.',
    'ゲームのルールと状態更新はCPUで実行するプログラムの仕事である。描画回路はゲームの当たり判定や得点の規則を決めない。DDR3へのアクセスはDDR制御を介する。CPU内部のキャッシュや仮想アドレスなどは機能図では省略している。パドルは現在、自動操作のプログラムが動かしている。');
  lead(s,'CPUが、ボールの位置・衝突・得点を計算する');
  drawCoreBoard(s,api,{mode:'execute'});
  line(s,'位置を更新し、壁・パドル・ブロックとの衝突を調べる',584,false,27);
  line(s,'計算した結果を、次のゲーム画面に反映する',631,true,28);

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
    '描画回路は、命令に従って、ブロックやボールなどの画素を作ります。画素の色をDDR制御へ渡し、DDR3に画像として保存します。DDR3には、CPUが実行するプログラムに加え、この表示する画像も置いています。',
    `${PRODUCT} console/fpga/src/rasterix.sv; console/fpga/generator/rasterixmem.tcl; ${BASIC}`,
    'RasterIX_IFは内部の作業領域で描画を進め、画像のデータを外部メモリへ転送する。図ではその細部を省き、DDR制御を介して画像をDDR3へ保存する経路を示す。プログラムと画像はDDR3内の異なるアドレス領域を使う。図中の一本の矢印は転送の役割をまとめたものであり、実装の各信号を表してはいない。');
  lead(s,'図形の位置や色から画素を作り、DDR3に画像として保存');
  drawCoreBoard(s,api,{mode:'image-write'});
  line(s,'描画回路が、ブロック・ボール・文字などの画素を作る',585,false,27);
  line(s,'DDR3には、プログラムと表示する画像を置く',631,true,28);

  s=slide('表示回路が画像を読み出して映像を出す',25,
    '表示回路は、DDR制御に画像の読出しを要求します。返ってきた画素を順に映像信号へ変え、HDMI端子へ出力します。ゲームが作る画像を、表示回路が繰り返し読み出すことで画面に映ります。描画と表示の本体は、どちらもRasterIXリポジトリに含まれる回路を使っています。',
    `${PRODUCT} console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl; ${BASIC}`,
    '表示本体はRasterIXに同梱されたdvi_framebufferである。画像データはDDR3からDDR制御を経て表示回路へ戻る。青い矢印は画像データが進む向きで、読出し要求は逆方向へ送る。表示タイミングに合わせて画素を信号へ変える回路も表示本体に含まれる。表示本体へ渡す制御や画面切替などの接続部分を本研究で追加している。HDMIはボード上の端子名として用いている。');
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

  const utilization=await loadFpgaUtilization(root);
  s=slide('FPGAの使用量',25,
    'ゲーム機を実装したときの、FPGA内部の使用量です。論理回路に使うLUTは約50%、チップ内メモリは約59%を使っています。CPUやメモリ制御を含む回路全体が、Nexys Videoの一つのFPGAに収まり、この構成で先ほどのゲームが動きました。',
    `${STANDARD_UTILIZATION_SOURCE}; experiments/standard-display-resources-20261110/utilization.rpt; ${BASIC}`,
    '標準表示構成の配置配線後の使用量である。2026年10月8日に保存された実装レポートを使用し、回路設定データのSHA-256が11月9日の実機動画で使ったものと一致することを確認した。LUTは67166/134600で49.90%、Slice Registersは50890/269200で18.90%、Block RAM Tileは215/365で58.90%、DSPは61/740で8.24%。CPU、バス、DDR制御、描画・表示などをすべて含む。LUT、レジスタ、Block RAM、DSPはそれぞれ異なる種類の資源なので、割合は合算しない。Block RAMはFPGAチップ内のメモリを指し、ボード上のDDR3を含めない。使用率は各資源の使用数を搭載数で割った値である。未使用の資源があっても、任意の回路を追加できる保証にはならない。比較用の回答スライド18には、以前保存したCPU構成の値も示す。');
  lead(s,'CPUと描画・表示を組み込んだ、回路全体の使用率');
  drawCurrentUtilization(s,api,utilization);
  line(s,'CPU・メモリ制御・描画・表示を、1個のFPGAに実装できた',631,true,27);

  s=slide('結論と今後の展望',20,
    'WallyとRasterIXの接続を設計し、ブロック崩しの画面が更新されることを実機で確認しました。CPUに描画機能を追加する拡張例として、設計コードと動作記録を公開しています。今後は、ゲームコントローラによる操作や、ホーム画面などのGUIを追加したいと考えています。',
    `${PRODUCT} ${BASIC}`,
    '結論は、接続を実装した構成で、ブロック崩しの自動操作によるゲーム進行と映像出力を確認したことである。今回の組合せを他のCPUやボードにもそのまま適用できるという結論ではない。今後の候補はゲームコントローラへの対応とホーム画面などのGUIであり、実装する項目は今後選択する。');
  lead(s,'Wallyに描画機能を追加し、ブロック崩しの動作を確認した');
  drawCoreBoard(s,api,{mode:'overview'});
  line(s,'成果：ゲーム機への拡張例を、設計コードと動作記録で公開',585,true,27);
  line(s,'今後：ゲームコントローラによる操作や、ホーム画面を追加',634,false,27);
}
