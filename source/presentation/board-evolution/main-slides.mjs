import fs from 'node:fs/promises';
import path from 'node:path';
import {drawStableBoard} from './stable-board.mjs';
import {drawCoreBoard,drawCoreTable} from './core-board.mjs';

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

  s=slide('拡張元のWallyと研究の目的',30,
    'Wallyは、回路の設計を教科書で学べるCPUです。CPUと周辺回路のコードが公開されています。本研究では、この構成に描画機能を追加し、2Dゲームが動くようにします。Wallyの学習者が、CPUに周辺回路を加えるときに参照できる拡張例を示すことが目的です。',
    `${RVSOC} console/README.md; ${PRODUCT}`,
    '対象は、Wallyを使ってCPU設計を学び、周辺回路の接続へ進む人である。目的は、CPU・描画・表示の動作する接続例を設計と実機記録で示すこと。学習者の理解度が向上したという教育効果の測定は行っていない。本資料ではCPUをWallyと呼び、CPUと周辺回路の設計コードの提供元をWallyリポジトリと呼ぶ。');
  lead(s,'Wally：回路の設計を教科書で学べるCPU');
  drawStableBoard(s,api,{mode:'purpose'});
  line(s,'CPUと周辺回路の設計コードが公開されている',582,false,26);
  line(s,'目的：Wallyの学習者に、2Dゲーム機への拡張例を示す',627,true,28);

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

  s=slide('作った画像をHDMI端子から出力する',25,
    '描画回路は画像を作り、DDR制御を通してDDR3へ保存します。表示回路はそこから画像を読み出し、HDMI端子へ映像を出します。描画と表示の本体は、どちらもRasterIXリポジトリに含まれる回路を使っています。',
    `${PRODUCT} console/fpga/src/rasterixdisplay.sv; console/fpga/generator/rasterixmem.tcl; ${BASIC}`,
    'CPUが使うプログラムの領域と、描画・表示が使う画像の領域は同じDDR3の中にある。描画と表示の要求は、接続した回路を経由してDDR制御へ届く。表示本体はRasterIXに同梱されたdvi_framebufferであり、表示本体へ渡す制御や画面切替などの接続部分を本研究で加えている。HDMIはボード上の端子名として用いている。');
  lead(s,'描画回路が画像を保存し、表示回路が画像を読み出す');
  drawCoreBoard(s,api,{mode:'image'});
  line(s,'DDR3には、実行するプログラムと、表示する画像を置く',585,false,27);
  line(s,'描画・表示の本体には、RasterIXの既存回路を利用する',631,true,27);

  s=slide('実機で確認する動作',25,
    '動作確認には、ブロック崩しを使いました。表示された図形が正しいか、ボールやパドルが動くか、ブロックへの衝突で画面と得点が変わるかを確認します。これにより、CPUのゲーム処理から描画と表示までがつながって動いていることを確かめます。次の30秒の映像をご覧ください。',
    BASIC,
    '対象はNexys Video上の標準表示構成と、最新の文字配置のブロック崩しである。次の動画で、図形の表示、位置の変化、ブロック消去、得点更新を観察できる。現在はパドルをプログラムで自動操作する。30秒は提示する記録の長さであり、ゲームの描画FPSや長時間の故障率を表す値ではない。映像だけで個々のバス転送の全条件を検証したとは主張しない。');
  lead(s,'Nexys Video上でブロック崩しを実行し、画面の変化を確認');
  drawCoreTable(s,api,[
    ['確認するもの','映像で見る動作'],
    ['ゲーム画面','壁・ブロック・ボール・文字が表示される'],
    ['位置の更新','ボールとパドルの位置が変わる'],
    ['ゲームの進行','衝突でブロックが消え、得点が増える']
  ],{top:218,height:338,widths:[330,822]});
  line(s,'CPUのゲーム処理・描画・表示が連携して動くかを確かめる',588,true,27);
  line(s,'次の動画：30秒の実機映像、パドルはプログラムで自動操作',635,false,25);

  s=slide('ブロック崩しの実機動画',30,
    'こちらが実機の映像です。ボールとパドルが動き、当たったブロックが消え、得点が増えています。既存のCPUと描画・表示回路を接続した構成で、このゲームの処理と画面の更新ができることを確認しました。パドルはプログラムが自動で動かしています。',
    `${BASIC} Video: ${VIDEO}`,
    '2026年11月9日に取得した標準表示構成の30秒の記録。ゲーム画面は640×480画素。埋込み動画は同じ記録をH.264 Highへ再符号化した配布用ファイルで、映像内容と時間を保持している。RasterIX_IFと同梱dvi_framebufferを使う標準回路で取得した。自動操作であり、ゲームコントローラはまだ実装していない。録画のフレームレートをゲームの描画FPSとして扱わない。');
  text(s,'640×480画素のゲーム画面を出力し、プログラムで自動操作',64,126,1152,38,27,true,C.blue);
  s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'標準表示構成で動くブロック崩しの実機動画',fit:'contain',position:{left:200,top:173,width:880,height:495}});
  text(s,'ボールの移動・ブロックの消去・得点の変化を確認',64,681,1080,29,22,true,C.blue,'center');

  s=slide('Wallyの学習者が参照できる拡張例',25,
    '得られた成果は、この接続方法を使って実際にゲームが動く設計例です。回路のコード、ゲームのプログラム、実行手順と動作記録を公開しています。Wallyの学習者が描画回路などを追加するときに、必要な接続や確認方法を調べるための参考として使うことを想定しています。',
    'README.md; console/README.md; console/examples/rasterix/README.md; docs/thesis/技術付録.md; experiments/dvi-recovery-20261109/README.md; https://github.com/SoshiroFujimori/wally-game-console ; https://github.com/SoshiroFujimori/wally-game-console-research',
    '有用性の対象は、Wallyに周辺回路を追加したい学習者や開発者である。公開物は設計の選択と接続箇所を確認する手掛かりになり、対象構成での動作結果も確認できる。誰でも簡単に再現できることや、学習時間を短縮することを実験で示したわけではない。研究の貢献は、既存IPを組み合わせる接続の具体例と、その構成で確認した機能を、コードと記録に対応させて提示することに置く。世界初の組合せとは断定しない。');
  lead(s,'対象：Wallyに周辺回路を追加したい学習者');
  drawCoreTable(s,api,[
    ['公開したもの','参照できる内容'],
    ['回路のコード','CPU・描画回路・メモリをつなぐ構成'],
    ['ゲームプログラム','CPUから描画回路を使う実行例'],
    ['説明・手順・動画','接続の理由、実行方法、確認できた動作']
  ],{top:218,height:338,widths:[330,822]});
  line(s,'動作する接続例を、設計コードと実機の記録で示した',588,true,29);
  line(s,'実装と研究資料をGitHubで公開',635,false,27);

  s=slide('結論と今後の展望',20,
    'WallyとRasterIXの接続を設計し、ブロック崩しの画面が更新されることを実機で確認しました。CPUに描画機能を追加する、具体的な拡張例を示せました。今後は、ゲームコントローラによる操作や、ホーム画面などのGUIを追加したいと考えています。',
    `${PRODUCT} ${BASIC}`,
    '結論は、接続を実装した構成で、ブロック崩しの自動操作によるゲーム進行と映像出力を確認したことである。今回の組合せを他のCPUやボードにもそのまま適用できるという結論ではない。今後の候補はゲームコントローラへの対応とホーム画面などのGUIであり、実装する項目は今後選択する。');
  lead(s,'Wallyに描画機能を追加し、ブロック崩しの動作を確認した');
  drawCoreBoard(s,api,{mode:'overview'});
  line(s,'成果：接続の設計と実機動作を示す、Wallyの拡張例',585,true,28);
  line(s,'今後：ゲームコントローラによる操作や、ホーム画面を追加',634,false,27);
}
