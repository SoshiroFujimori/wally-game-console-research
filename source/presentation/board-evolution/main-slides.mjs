import fs from 'node:fs/promises';
import path from 'node:path';
import {drawStableBoard} from './stable-board.mjs';
import {drawConceptCode} from './abstract-flow.mjs';

// Main talk: one board layout expands the same circuit explanation.
export async function addMainSlides(ctx) {
  const {slide, api, foot, cover, root, DDCA, RVSOC, PRODUCT, BASIC, POSTER, VIDEO} = ctx;
  const {text, wire, C} = api;
  let s = slide('FPGAを用いた2Dゲーム機の製作',5,
    'この題目で発表します。', '',
    '教育用CPUに描画・表示機能を追加したゲーム機の製作について報告する。');
  wire(s,190,371,1090,371,C.heading,false,1.7);
  text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
  text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');

  s=slide('FPGAチップで周囲の部品を制御する',25,
    'FPGAボードには、SDカードスロット、DDR3メモリ、HDMI端子が付いています。中央のFPGAチップには、これらを制御する回路を実装できます。回路はコードで記述します。例えば、左のコードは右のAND回路を表します。このように回路を記述して、チップ内に実装します。',
    `${DDCA} Chapters 2 and 4. ${RVSOC} Chapter 23. Nexys Video Reference Manual.`,
    'AND回路はHDL記述と論理回路の対応例である。外側の部品すべてを一つのAND回路で制御する意味ではない。ボード上の部品は物理的に実装済みであり、図はその配置を簡略化している。');
  text(s,'SDカードやメモリを制御する回路を、チップ内に実装できる',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'implementation'});
  text(s,'回路をHDLコードで記述し、FPGAチップ内に実装する',64,603,1152,40,28,true);
  foot(s,'HDLの例とAND回路の対応');

  s=slide('拡張元のWallyと研究の目的',35,
    'Wallyは、教科書で設計を学べるCPUです。RISC-Vという命令の規則に従ってプログラムを実行します。CPUと周辺回路のHDLコードが公開されており、回路を変更したり、機能を追加したりできます。教科書RISC-V System-on-Chip Designが、その設計を説明しています。本研究ではWallyにRasterIXの描画・表示回路を接続し、学習者が参考にできるゲーム機への拡張例を示します。',
    `${RVSOC} console/README.md; ${PRODUCT} source/abstract/content.json.`,
    'WallyをCPUと周辺制御を含む一つのまとまりとして示す。SD制御やDDR制御を含む範囲を一つの箱にまとめる。次の図では、その範囲をCPU、アドレスデコーダ、SD制御、DDR制御に展開する。FPGAボードとチップの境界、チップ外の部品、描画側の回路は同じ位置を保つ。WallyのリポジトリにはCPUと周辺回路のRTLが含まれる。DDRコントローラー本体はAMD製IPである。Wallyの教育効果を測定したという主張ではない。');
  text(s,'Wally：教科書で設計を学べるRISC-V CPU',64,119,1152,38,27,true,C.blue);
  text(s,'CPUと周辺回路のHDLコードが公開されている',64,582,1152,30,25);
  text(s,'『RISC-V System-on-Chip Design』が設計を解説',64,616,1152,30,25);
  drawStableBoard(s,api,{mode:'purpose'});
  text(s,'目的：Wallyの学習者に、ゲーム機への拡張例を示す',64,650,1152,31,26,true);
  foot(s,'WallyとRasterIXを利用したゲーム機への拡張');

  s=slide('SDカードへ読出しを要求する',45,
    'まず、SDカードからゲームプログラムを読み込みます。CPUはアドレスADに0x13048、書込みデータWDに読出し要求を表す数値、書込みイネーブルWEに1を出します。デコーダは、アドレスがSD制御の範囲に入るため、S0を1にします。SD制御は、選ばれた送信用レジスタにWDを取り込み、カードへ送ります。下のコードのrequestは要求を表す数値の配列です。同じアドレスへ順に書いて、カードに読出しを要求します。',
    'source/abstract/content.json; console/fpga/zsbl/spi.h; console/src/uncore/spi_apb.sv; console/src/mmu/adrdecs.sv; console/src/uncore/uncore.sv.',
    'AD/WD/WE/RD、S0〜S2は説明用の信号名である。有効な読書きが行われる場面を示し、転送の有効性、バス変換、待ち、クロック変換、アクセス幅などは省略する。SD制御の範囲は0x13000〜0x13FFF。requestは読出し要求を構成する数値の配列、iは順番を示し、アブストのCMD18の配列に対応する。Cは物理アドレスを直接参照する概念コードであり、初期化や応答確認などを含む実行可能なドライバ全体ではない。');
  text(s,'CPUが読出し要求を、SD制御の送信用レジスタへ書く',64,119,1152,38,28,true,C.blue);
  drawStableBoard(s,api,{mode:'request'});
  text(s,'AD：アドレス　WD：書込みデータ　RD：読出しデータ',64,582,1152,25,21,false,'#66758A');
  text(s,'WE：書込みイネーブル（1 bit）　1で書込み、0で読出し',64,610,1152,25,21,false,'#66758A');
  drawConceptCode(s,api,[['*(uint32_t *)0x13048 = request[i];','要求の数値を順に送る']],638);

  s=slide('SDカードから届いた値をCPUへ戻す',35,
    'カードから届いたデータは、SD制御の受信用レジスタに入ります。CPUはそのアドレス0x1304Cを出し、今度はWEを0にします。デコーダは同じSD制御を選ぶS0を1にします。下の選択回路にもS0からS2が入り、S0が1なので、SD制御の受信値だけを選びます。その値がRDとしてCPUへ戻ります。アドレスを変えることで、同じSD制御の送信用と受信用を使い分けています。',
    'source/abstract/content.json; console/fpga/zsbl/spi.h; console/src/uncore/spi_apb.sv; console/src/uncore/uncore.sv.',
    '受信用レジスタは0x1304C。受信値の下位8ビットをvalueに格納する。有効な転送中のWE=0を読出しとして示しており、WE=0だけで転送が始まる意味ではない。戻り値を選ぶS0〜S2は同じ選択信号を表す。図の同名ラベルは接続を表し、実バスでは応答まで選択を保持する。受信可能性の確認と通信クロックの発生は概念コードから省略している。');
  text(s,'受信用レジスタ 0x1304C の値を、RDとしてCPUへ返す',64,119,1152,38,28,true,C.blue);
  drawStableBoard(s,api,{mode:'receive'});
  text(s,'AD：アドレス　WD：書込みデータ　RD：読出しデータ',64,582,1152,25,21,false,'#66758A');
  text(s,'WE：書込みイネーブル（1 bit）　1で書込み、0で読出し',64,610,1152,25,21,false,'#66758A');
  drawConceptCode(s,api,[['uint8_t value = *(uint32_t *)0x1304C;','受信した1バイトを読む']],638);

  s=slide('受け取った値をDDR3へ保存する',30,
    '受け取ったプログラムを置くメモリがDDR3です。CPUは、ADに保存先の0x80000000、WDに受信値、WEに1を出します。今度はアドレスがDDR3の範囲なので、S1が1になります。選ばれたDDRコントローラーが、ADで指定された場所に受信値を書き込みます。このDDRコントローラーにはAMD製の回路を使っています。',
    'source/abstract/content.json; console/fpga/zsbl/boot.c; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/src/uncore/uncore.sv.',
    'DDR3の範囲は0x80000000〜0x9FFFFFFF。図は1バイトの保存先指定を示し、バスの転送幅、書込みストローブ、キャッシュ、クロック変換、メモリ仲裁は省略する。コントローラー本体はAMD MIG IPであり、生成と接続にはWally側の仕組みを利用する。DDR3への画像保存は後の描画・表示の説明で扱う。');
  text(s,'DDR3の 0x80000000 番地へ、SDカードからの受信値を書く',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'write'});
  text(s,'AD：アドレス　WD：書込みデータ　RD：読出しデータ',64,582,1152,25,21,false,'#66758A');
  text(s,'WE：書込みイネーブル（1 bit）　1で書込み、0で読出し',64,610,1152,25,21,false,'#66758A');
  drawConceptCode(s,api,[['*(uint8_t *)0x80000000 = value;','DDR3へ1バイトを保存']],638);

  s=slide('SDカードからDDR3へコピーする',35,
    '返ってきたデータは、受信用レジスタ0x1304Cから読みます。CPUはそれを、DDR3の0x80000000から順に保存します。次のデータも同じ受信用レジスタから読みますが、保存先は1バイトずつ進めます。こうしてSDカードの内容をDDR3へコピーします。',
    'source/abstract/content.json; console/fpga/zsbl/spi.h; console/fpga/zsbl/boot.c; console/examples/rasterix/WallyBusConnector.hpp.',
    'sizeはコピーするバイト数、dstは保存先の先頭、iは先頭からのバイト位置を表す。受信用レジスタの下位8ビットを保存する。CPUはSD制御からの読出しとDDR3への書込みを交互に行う。S0とS1を同時に1にする意味ではない。図では二つの処理に使う経路を青で示す。物理アドレスを直接使う概念例であり、実機のブートローダーやOSを含む起動手順の全体を置き換えるものではない。Linuxで動く実際のゲームがそのまま物理アドレスを参照するわけではなく、入出力には対応付けた領域を使う。');
  text(s,'受信する番地は固定し、DDR3の保存先を1バイトずつ進める',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'copy'});
  drawConceptCode(s,api,[
    ['uint8_t *dst = (uint8_t *)0x80000000;','DDR3の保存先'],
    ['for (int i = 0; i < size; i++)','sizeバイトをコピー'],
    ['  dst[i] = *(uint32_t *)0x1304C;','SDから読み、DDR3へ保存']
  ],580,{step:29,codeSize:21,commentSize:19});
  foot(s,'受信用レジスタから繰り返し読み、DDR3へ順番に保存する概念コード');

  s=slide('DDR3に置いたプログラムを実行する',20,
    'コピーが終わったら、ゲームの実行を始めます。startにプログラムの先頭アドレスを入れ、startを呼びます。CPUの実行位置がそのアドレスへ移り、DDR制御を通して命令を読みながら、DDR3に置いたゲームプログラムを実行します。',
    'source/abstract/content.json; console/fpga/zsbl/boot.c; console/fpga/zsbl/riscv.S.',
    'startは開始アドレスを保持する関数ポインタで、start()はそこへの呼出しとなる。コピー後の実行開始を説明する概念コードであり、実機のブート段階やOSによるプロセス起動、実行時の仮想アドレス、命令キャッシュは省略している。DDR3には既に実行できるプログラムが配置されていると仮定する。');
  text(s,'CPUの実行位置を、DDR3にコピーしたプログラムの先頭へ移す',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'execute'});
  drawConceptCode(s,api,[
    ['void (*start)(void) = (void (*)(void))0x80000000;','実行を始めるアドレス'],
    ['start();','そのアドレスへ分岐する']
  ],583);
  foot(s,'プログラムの先頭へ実行位置を移す概念コード');

  s=slide('描画回路へ命令を送る',25,
    'ゲームは、RasterIX付属のOpenGL互換ライブラリへ、図形の位置や色を渡します。ライブラリもCPU上で動き、描画命令を数値の列にします。CPUが0x10080000へ値を書くと、S2で選ばれた接続回路が受け取り、RasterIXへ渡します。',
    `${PRODUCT} console/examples/rasterix/WallyBusConnector.hpp; console/addins/rasterix/lib; ${BASIC}`,
    'OpenGL互換ライブラリ本体はRasterIXのソフトウェアで、CPUが実行する。Wally用の接続部分は数値列を描画用レジスタへ書き込む。0x10080000は通常の命令語を送るポートであり、cmdはその1語。末尾通知や待ち、バッファ切替などの制御は図から省略する。公式RasterIX本体は変更していない。');
  text(s,'CPU上のライブラリが、図形の位置や色を命令の数値列にする',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'command'});
  drawConceptCode(s,api,[['*(uint32_t *)0x10080000 = cmd;','描画命令の値を一つ送る']],584);
  text(s,'AD＝0x10080000、WD＝cmd、WE＝1 → S2で接続回路を選ぶ',64,635,1152,38,25,true);
  foot(s,'CPUから接続回路を介して描画命令を送る概念コード');

  s=slide('接続回路が描画命令を受け渡す',25,
    '接続回路は、S2が1で選ばれ、WEが1の書込みなら、ADが命令の書込み先かを調べます。そのときWDの数値を一時保存します。保存した値は、描画回路が受け取れるときに、書かれた順に渡します。この仕組みで、CPUの書込みを描画回路への命令送信につなげました。',
    `${PRODUCT} console/fpga/src/rasterix_apb.sv: CommandWrite, CmdData, CmdValid, PREADY; console/fpga/src/rasterix.sv: commandfifo, gpu.`,
    '通常の命令語を0x10080000へ書く場合を説明する。図のS2はPSEL、WEはPWRITE、ADはPADDR、WDはPWDATAに対応する概念名である。実装はPSEL・PENABLE・PWRITE、32 bit書込みの条件、および命令ポートのアドレス条件からCommandWriteを生成する。CmdValid=CommandWrite、CmdData=WriteDataであり、接続回路が図形の意味を解析したり数値を別の描画命令へ翻訳したりするわけではない。一時保存はrasterix.svのaxiscdc commandfifoが行う。CPU側ではCmdValidとCmdReadyがともに1のときに受け取り、描画側ではGPUCmdValidとGPUCmdReadyがともに1のときに渡す。FIFOの入力が受取れない間はPREADYを下げ、CPU側の書込み完了を待たせる。本文の「そのとき取り込む」は書込みが完了したときの働きを示し、毎クロック無条件で取り込むという意味ではない。末尾用アドレス0x10080004、応答、クロック境界の実装、転送幅の選択は本図では省略する。これらを含む正確な信号条件は上記RTLに対応する。');
  text(s,'CPUが書いた数値を受け取り、描画回路へ順に渡す',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'command'});
  text(s,'S2＝1、WE＝1、AD＝0x10080000のとき、WDの値を取り込む',64,582,1152,34,25,true);
  text(s,'WD＝cmd',80,625,190,48,25,true,C.blue,'center');
  wire(s,270,650,342,650,C.blue,true,3);
  api.box(s,'値を一時保存',342,625,310,48,C.white,25,C.blue,2.2);
  text(s,'描画回路が受け取れるとき',675,617,316,28,22,true,C.blue,'center');
  wire(s,652,650,1008,650,C.blue,true,3);
  api.box(s,'描画回路',1008,625,208,48,C.white,25,C.blue,2.2);
  foot(s,'接続回路による描画命令の受取りと受渡し');

  s=slide('画像をDDR3へ保存し、映像を出す',20,
    'RasterIXは、描画命令に従って画像を作り、DDR制御を通してDDR3へ保存します。表示回路がその画像を読み、HDMI端子から映像を出します。描画と表示は、どちらもRasterIXに含まれる回路を流用しています。',
    `${PRODUCT} console/fpga/generator/rasterixmem.tcl; console/fpga/src/rasterixdisplay.sv; ${BASIC}`,
    'DDR3への画像の保存と読出しはRasterIX側の回路が要求し、DDRコントローラーが処理する。描画と表示は内部ではそれぞれの回路が担当するが、提供元が同じため主図では一つの箱にまとめている。画像の切替やメモリ仲裁、画素データの形式、映像の符号化は省略している。標準表示構成の実機記録を根拠とする。');
  text(s,'RasterIXが画像を作り、DDR3に保存した画像を表示する',64,119,1152,38,27,true,C.blue);
  drawStableBoard(s,api,{mode:'image'});
  text(s,'描画：画像をDDR3へ保存する',64,585,1152,38,29,true);
  text(s,'表示：DDR3の画像を読み、HDMI端子から映像を出す',64,633,1152,38,29,true);
  foot(s,'描画・表示回路とDDR3の間で画像をやり取りする経路');

  s=slide('ブロック崩しの実機動画',30,
    'こちらが実機の映像です。640かける480画素のゲーム画面をHDMI端子から出しています。ボールの移動、壁やパドルでの反射、当たったブロックの消去を確認しました。現在はプログラムがパドルを自動で動かしています。',
    `${BASIC} Video: ${VIDEO}`,
    '2026年11月9日の標準表示構成による30秒の記録。RasterIX_IFと同梱dvi_framebufferを利用している。動画領域をクリックすると再生する。パドルは自動操作であり、コントローラによるプレイではない。録画の保存フレームレートからゲームの描画FPSを求めていない。確認した取得条件と機器の範囲は再現資料を参照。');
  text(s,'640×480画素のゲーム画面を出力し、プログラムで自動操作',64,126,1152,38,27,true,C.blue);
  s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'標準表示構成で動くブロック崩しの実機動画',fit:'contain',position:{left:200,top:173,width:880,height:495}});
  text(s,'ボールの移動・反射と、当たったブロックの消去を確認',64,681,1080,29,22,true,C.blue,'center');

  s=slide('結論と今後の展望',25,
    'Wallyに描画・表示機能を追加し、ブロック崩しの実行と映像出力を実現しました。回路の接続方法とゲームの実行手順を公開し、Wallyの学習者が参考にできる拡張例を示しました。今後は、ゲームコントローラによる操作や、ホーム画面などのGUIの追加を検討します。',
    `${PRODUCT} ${BASIC} source/abstract/content.json.`,
    '既存CPUと描画・表示回路を利用し、回路・ソフトウェアの接続を実装した。教育効果を学習実験で測定したという主張ではない。現在は自動操作であり、ゲームコントローラによる操作とホーム画面などのGUIは今後の候補である。実装と動作確認を終えた範囲を最終発表で報告する。');
  text(s,'製作したもの',64,155,1152,42,31,true,C.heading);
  text(s,'教育用CPUに描画・表示機能を追加したゲーム機',64,213,1152,52,34,true);
  text(s,'ブロック崩しの実行と、HDMI端子からの映像出力を確認',64,279,1152,48,29);
  text(s,'Wallyの学習者が参考にできる拡張例',64,378,1152,42,31,true,C.heading);
  text(s,'回路の接続方法と、ゲームの実行手順を公開',64,435,1152,50,32,true);
  text(s,'今後：ゲームコントローラによる操作機能や、\n　　　ホーム画面などのGUIを追加',64,559,1152,85,29);
  foot(s,'GUI：ホーム画面やメニューなどの操作画面');
}
